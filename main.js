const { app, BrowserWindow, ipcMain} = require('electron')
const path = require('node:path')
const fs = require('fs')
const os = require('os')
const { spawn } = require('child_process')

// Function to format bytes to human readable format
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Function to get directory size recursively
function getDirectorySize(dirPath) {
  let totalSize = 0
  
  try {
    if (!fs.existsSync(dirPath)) return 0
    
    const items = fs.readdirSync(dirPath)
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item)
      try {
        const stats = fs.statSync(itemPath)
        
        if (stats.isDirectory()) {
          totalSize += getDirectorySize(itemPath)
        } else {
          totalSize += stats.size
        }
      } catch (error) {
        // Skip files/folders that can't be accessed
        continue
      }
    }
  } catch (error) {
    return 0
  }
  
  return totalSize
}

// Function to get recycle bin size
function getRecycleBinSize() {
  const drives = ['C:', 'D:', 'E:', 'F:'] // Check common drives
  let totalSize = 0
  
  for (const drive of drives) {
    const recycleBinPath = path.join(drive, '\\', '$Recycle.Bin')
    totalSize += getDirectorySize(recycleBinPath)
  }
  
  return totalSize
}

// Function to get thumbnail cache size
function getThumbnailCacheSize() {
  const userProfile = os.homedir()
  let totalSize = 0
  
  // Thumbnail cache locations
  const thumbPaths = [
    path.join(userProfile, 'AppData\\Local\\Microsoft\\Windows\\Explorer'),
    path.join(userProfile, 'AppData\\Local\\IconCache.db'),
    'C:\\Users\\All Users\\Microsoft\\Windows\\Caches'
  ]
  
  for (const thumbPath of thumbPaths) {
    totalSize += getDirectorySize(thumbPath)
  }
  
  return totalSize
}

// Function to calculate cleanup sizes
function getCleanupSize(category) {
  const userProfile = os.homedir()
  const tempDir = os.tmpdir()
  
  switch (category) {
    case 'temp-files':
      // User temp + system temp + Windows temp
      const userTempSize = getDirectorySize(path.join(userProfile, 'AppData\\Local\\Temp'))
      const systemTempSize = getDirectorySize(tempDir)
      const windowsTempSize = getDirectorySize('C:\\Windows\\Temp')
      return formatBytes(userTempSize + systemTempSize + windowsTempSize)
    
    case 'temp-internet':
      // Internet Explorer cache
      const ieCachePath = path.join(userProfile, 'AppData\\Local\\Microsoft\\Windows\\INetCache')
      const ieHistoryPath = path.join(userProfile, 'AppData\\Local\\Microsoft\\Windows\\History')
      return formatBytes(getDirectorySize(ieCachePath) + getDirectorySize(ieHistoryPath))
    
    case 'recycle-bin':
      return formatBytes(getRecycleBinSize())
    
    case 'downloaded-program-files':
      const downloadedFilesPath = 'C:\\Windows\\Downloaded Program Files'
      return formatBytes(getDirectorySize(downloadedFilesPath))
    
    case 'thumbnails':
      return formatBytes(getThumbnailCacheSize())
    
    case 'offline-webpages':
      const offlineWebPath = path.join(userProfile, 'Favorites\\Offline')
      return formatBytes(getDirectorySize(offlineWebPath))
    
    case 'system-error-memory-dump':
      const memoryDumpPath = 'C:\\Windows\\MEMORY.DMP'
      try {
        const stats = fs.statSync(memoryDumpPath)
        return formatBytes(stats.size)
      } catch {
        return '0 B'
      }
    
    case 'system-error-minidump':
      return formatBytes(getDirectorySize('C:\\Windows\\Minidump'))
    
    case 'temporary-sync-files':
      const syncPath = path.join(userProfile, 'AppData\\Local\\Microsoft\\Windows\\SettingSync')
      return formatBytes(getDirectorySize(syncPath))
    
    case 'setup-log-files':
      const setupLogPaths = [
        'C:\\Windows\\Logs',
        'C:\\Windows\\Panther',
        'C:\\Windows\\inf\\setupapi.log'
      ]
      let setupLogSize = 0
      for (const logPath of setupLogPaths) {
        setupLogSize += getDirectorySize(logPath)
      }
      return formatBytes(setupLogSize)
    
    case 'old-chkdsk-files':
      // Check for FOUND.* folders on drives
      const drives = ['C:', 'D:', 'E:', 'F:']
      let chkdskSize = 0
      for (const drive of drives) {
        const foundPath = path.join(drive, '\\', 'FOUND.000')
        chkdskSize += getDirectorySize(foundPath)
      }
      return formatBytes(chkdskSize)
    
    case 'user-file-history':
      const fileHistoryPath = path.join(userProfile, 'AppData\\Local\\Microsoft\\Windows\\FileHistory')
      return formatBytes(getDirectorySize(fileHistoryPath))
    
    case 'previous-windows-installations':
      const windowsOldPaths = [
        'C:\\Windows.old',
        'C:\\$Windows.~BT',
        'C:\\$Windows.~WS'
      ]
      let previousInstallSize = 0
      for (const oldPath of windowsOldPaths) {
        previousInstallSize += getDirectorySize(oldPath)
      }
      return formatBytes(previousInstallSize)
    
    case 'windows-update-cleanup':
      const updatePaths = [
        'C:\\Windows\\SoftwareDistribution\\Download',
        'C:\\Windows\\SoftwareDistribution\\DataStore\\Logs'
      ]
      let updateSize = 0
      for (const updatePath of updatePaths) {
        updateSize += getDirectorySize(updatePath)
      }
      return formatBytes(updateSize)
    
    case 'windows-upgrade-log-files':
      const upgradeLogPaths = [
        'C:\\Windows\\Panther',
        'C:\\$WINDOWS.~BT\\Sources\\Panther',
        path.join(userProfile, 'AppData\\Local\\Microsoft\\Windows\\UsrClass.dat.LOG1')
      ]
      let upgradeLogSize = 0
      for (const logPath of upgradeLogPaths) {
        upgradeLogSize += getDirectorySize(logPath)
      }
      return formatBytes(upgradeLogSize)
    
    default:
      return '0 B'
  }
}
// Function to calculate cleanup sizes (returns raw bytes)
function getCleanupRawSize(category) {
  const userProfile = os.homedir()
  const tempDir = os.tmpdir()
  
  switch (category) {
    case 'temp-files':
      // User temp + system temp + Windows temp
      const userTempSize = getDirectorySize(path.join(userProfile, 'AppData\\Local\\Temp'))
      const systemTempSize = getDirectorySize(tempDir)
      const windowsTempSize = getDirectorySize('C:\\Windows\\Temp')
      return userTempSize + systemTempSize + windowsTempSize
    
    case 'temp-internet':
      // Internet Explorer cache
      const ieCachePath = path.join(userProfile, 'AppData\\Local\\Microsoft\\Windows\\INetCache')
      const ieHistoryPath = path.join(userProfile, 'AppData\\Local\\Microsoft\\Windows\\History')
      return getDirectorySize(ieCachePath) + getDirectorySize(ieHistoryPath)
    
    case 'recycle-bin':
      return getRecycleBinSize()
    
    case 'downloaded-program-files':
      const downloadedFilesPath = 'C:\\Windows\\Downloaded Program Files'
      return getDirectorySize(downloadedFilesPath)
    
    case 'thumbnails':
      return getThumbnailCacheSize()
    
    case 'offline-webpages':
      const offlineWebPath = path.join(userProfile, 'Favorites\\Offline')
      return getDirectorySize(offlineWebPath)
    
    case 'system-error-memory-dump':
      const memoryDumpPath = 'C:\\Windows\\MEMORY.DMP'
      try {
        const stats = fs.statSync(memoryDumpPath)
        return stats.size
      } catch {
        return 0
      }
    
    case 'system-error-minidump':
      return getDirectorySize('C:\\Windows\\Minidump')
    
    case 'temporary-sync-files':
      const syncPath = path.join(userProfile, 'AppData\\Local\\Microsoft\\Windows\\SettingSync')
      return getDirectorySize(syncPath)
    
    case 'setup-log-files':
      const setupLogPaths = [
        'C:\\Windows\\Logs',
        'C:\\Windows\\Panther',
        'C:\\Windows\\inf\\setupapi.log'
      ]
      let setupLogSize = 0
      for (const logPath of setupLogPaths) {
        setupLogSize += getDirectorySize(logPath)
      }
      return setupLogSize
    
    case 'old-chkdsk-files':
      // Check for FOUND.* folders on drives
      const drives = ['C:', 'D:', 'E:', 'F:']
      let chkdskSize = 0
      for (const drive of drives) {
        const foundPath = path.join(drive, '\\', 'FOUND.000')
        chkdskSize += getDirectorySize(foundPath)
      }
      return chkdskSize
    
    case 'user-file-history':
      const fileHistoryPath = path.join(userProfile, 'AppData\\Local\\Microsoft\\Windows\\FileHistory')
      return getDirectorySize(fileHistoryPath)
    
    case 'previous-windows-installations':
      const windowsOldPaths = [
        'C:\\Windows.old',
        'C:\\$Windows.~BT',
        'C:\\$Windows.~WS'
      ]
      let previousInstallSize = 0
      for (const oldPath of windowsOldPaths) {
        previousInstallSize += getDirectorySize(oldPath)
      }
      return previousInstallSize
    
    case 'windows-update-cleanup':
      const updatePaths = [
        'C:\\Windows\\SoftwareDistribution\\Download',
        'C:\\Windows\\SoftwareDistribution\\DataStore\\Logs'
      ]
      let updateSize = 0
      for (const updatePath of updatePaths) {
        updateSize += getDirectorySize(updatePath)
      }
      return updateSize
    
    case 'windows-upgrade-log-files':
      const upgradeLogPaths = [
        'C:\\Windows\\Panther',
        'C:\\$WINDOWS.~BT\\Sources\\Panther',
        path.join(userProfile, 'AppData\\Local\\Microsoft\\Windows\\UsrClass.dat.LOG1')
      ]
      let upgradeLogSize = 0
      for (const logPath of upgradeLogPaths) {
        upgradeLogSize += getDirectorySize(logPath)
      }
      return upgradeLogSize
    
    default:
      return 0
  }
}

// Function to safely delete directory contents
function deleteDirectoryContents(dirPath) {
  let deletedSize = 0
  
  try {
    if (!fs.existsSync(dirPath)) return 0
    
    const items = fs.readdirSync(dirPath)
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item)
      try {
        const stats = fs.statSync(itemPath)
        
        if (stats.isDirectory()) {
          deletedSize += deleteDirectoryContents(itemPath)
          fs.rmdirSync(itemPath)
        } else {
          deletedSize += stats.size
          fs.unlinkSync(itemPath)
        }
      } catch (error) {
        // Skip files/folders that can't be deleted (in use, permissions, etc.)
        continue
      }
    }
  } catch (error) {
    // Skip directories that can't be accessed
  }
  
  return deletedSize
}

// Function to delete specific file
function deleteFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return 0
    
    const stats = fs.statSync(filePath)
    const size = stats.size
    fs.unlinkSync(filePath)
    return size
  } catch (error) {
    return 0
  }
}

// Function to get free disk space for a drive
function getFreeDiskSpace(drivePath) {
  try {
    const stats = fs.statSync(drivePath)
    // For Windows, we'll use a workaround since Node.js doesn't have native disk space API
    // We'll estimate based on common drive (C:) - this is a simplified approach
    // In a production app, you might want to use a native module for accurate disk space
    return fs.statSync('C:\\').free || 0
  } catch (error) {
    return 0
  }
}

// Function to get actual free disk space using Windows command
function getActualFreeSpace() {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process')
    exec('wmic logicaldisk get size,freespace,caption /format:table', (error, stdout) => {
      if (error) {
        reject(new Error('Failed to get disk space'))
        return
      }
      
      try {
        // Parse the table output to get total free space across all drives
        const lines = stdout.split('\n')
        let totalFreeSpace = 0
        
        for (const line of lines) {
          // Skip header line and empty lines
          if (line.includes('Caption') || !line.trim()) continue
          
          const parts = line.trim().split(/\s+/)
          if (parts.length >= 3) {
            const freeSpace = parseInt(parts[1]) // FreeSpace is the second column
            if (!isNaN(freeSpace)) {
              totalFreeSpace += freeSpace
            }
          }
        }
        
        if (totalFreeSpace > 0) {
          resolve(totalFreeSpace)
        } else {
          reject(new Error('Could not parse disk space output'))
        }
      } catch (parseError) {
        reject(parseError)
      }
    })
  })
}

// Function to run disk cleanup
async function runDiskCleanup(categories) {
  return new Promise(async (resolve, reject) => {
    try {
      const userProfile = os.homedir()
      const tempDir = os.tmpdir()
      let totalDeleted = 0
      const deletedCategories = []
      
      // Get disk space before cleanup
      let freeSpaceBefore = 0
      try {
        freeSpaceBefore = await getActualFreeSpace()
      } catch (error) {
        console.error('Failed to measure disk space before cleanup:', error)
      }
      
      for (const category of categories) {
        let categoryDeleted = 0
        
        switch (category) {
          case 'temp-files':
            // Clean user temp folder
            const userTempPath = path.join(userProfile, 'AppData\\Local\\Temp')
            categoryDeleted += deleteDirectoryContents(userTempPath)
            
            // Clean system temp folder
            categoryDeleted += deleteDirectoryContents(tempDir)
            
            // Clean Windows temp folder
            categoryDeleted += deleteDirectoryContents('C:\\Windows\\Temp')
            
            if (categoryDeleted > 0) deletedCategories.push('Temporary Files')
            break
            
          case 'temp-internet':
            // Clean IE cache
            const ieCachePath = path.join(userProfile, 'AppData\\Local\\Microsoft\\Windows\\INetCache')
            categoryDeleted += deleteDirectoryContents(ieCachePath)
            
            // Clean IE history
            const ieHistoryPath = path.join(userProfile, 'AppData\\Local\\Microsoft\\Windows\\History')
            categoryDeleted += deleteDirectoryContents(ieHistoryPath)
            
            if (categoryDeleted > 0) deletedCategories.push('Temporary Internet Files')
            break
            
          case 'recycle-bin':
            // Empty recycle bin on all drives
            const drives = ['C:', 'D:', 'E:', 'F:']
            for (const drive of drives) {
              const recycleBinPath = path.join(drive, '\\', '$Recycle.Bin')
              categoryDeleted += deleteDirectoryContents(recycleBinPath)
            }
            
            if (categoryDeleted > 0) deletedCategories.push('Recycle Bin')
            break
            
          case 'downloaded-program-files':
            const downloadedFilesPath = 'C:\\Windows\\Downloaded Program Files'
            categoryDeleted += deleteDirectoryContents(downloadedFilesPath)
            
            if (categoryDeleted > 0) deletedCategories.push('Downloaded Program Files')
            break
            
          case 'thumbnails':
            // Clean thumbnail cache
            const thumbPaths = [
              path.join(userProfile, 'AppData\\Local\\Microsoft\\Windows\\Explorer'),
              path.join(userProfile, 'AppData\\Local\\IconCache.db')
            ]
            
            for (const thumbPath of thumbPaths) {
              if (thumbPath.endsWith('.db')) {
                categoryDeleted += deleteFile(thumbPath)
              } else {
                categoryDeleted += deleteDirectoryContents(thumbPath)
              }
            }
            
            if (categoryDeleted > 0) deletedCategories.push('Thumbnails')
            break
            
          case 'offline-webpages':
            const offlineWebPath = path.join(userProfile, 'Favorites\\Offline')
            categoryDeleted += deleteDirectoryContents(offlineWebPath)
            
            if (categoryDeleted > 0) deletedCategories.push('Offline webpages')
            break
            
          case 'system-error-memory-dump':
            const memoryDumpPath = 'C:\\Windows\\MEMORY.DMP'
            categoryDeleted += deleteFile(memoryDumpPath)
            
            if (categoryDeleted > 0) deletedCategories.push('System error memory dump files')
            break
            
          case 'system-error-minidump':
            categoryDeleted += deleteDirectoryContents('C:\\Windows\\Minidump')
            
            if (categoryDeleted > 0) deletedCategories.push('System error minidump files')
            break
            
          case 'temporary-sync-files':
            const syncPath = path.join(userProfile, 'AppData\\Local\\Microsoft\\Windows\\SettingSync')
            categoryDeleted += deleteDirectoryContents(syncPath)
            
            if (categoryDeleted > 0) deletedCategories.push('Temporary Sync Files')
            break
            
          case 'setup-log-files':
            const setupLogPaths = [
              'C:\\Windows\\Logs',
              'C:\\Windows\\Panther'
            ]
            
            for (const logPath of setupLogPaths) {
              categoryDeleted += deleteDirectoryContents(logPath)
            }
            
            // Delete specific log file
            categoryDeleted += deleteFile('C:\\Windows\\inf\\setupapi.log')
            
            if (categoryDeleted > 0) deletedCategories.push('Setup Log Files')
            break
            
          case 'old-chkdsk-files':
            // Delete FOUND.* folders on drives
            const chkdskDrives = ['C:', 'D:', 'E:', 'F:']
            for (const drive of chkdskDrives) {
              const foundPath = path.join(drive, '\\', 'FOUND.000')
              categoryDeleted += deleteDirectoryContents(foundPath)
            }
            
            if (categoryDeleted > 0) deletedCategories.push('Old Chkdsk files')
            break
            
          case 'user-file-history':
            const fileHistoryPath = path.join(userProfile, 'AppData\\Local\\Microsoft\\Windows\\FileHistory')
            categoryDeleted += deleteDirectoryContents(fileHistoryPath)
            
            if (categoryDeleted > 0) deletedCategories.push('User File History')
            break
            
          case 'previous-windows-installations':
            const windowsOldPaths = [
              'C:\\Windows.old',
              'C:\\$Windows.~BT',
              'C:\\$Windows.~WS'
            ]
            
            for (const oldPath of windowsOldPaths) {
              categoryDeleted += deleteDirectoryContents(oldPath)
            }
            
            if (categoryDeleted > 0) deletedCategories.push('Previous Windows installation(s)')
            break
            
          case 'windows-update-cleanup':
            const updatePaths = [
              'C:\\Windows\\SoftwareDistribution\\Download',
              'C:\\Windows\\SoftwareDistribution\\DataStore\\Logs'
            ]
            
            for (const updatePath of updatePaths) {
              categoryDeleted += deleteDirectoryContents(updatePath)
            }
            
            if (categoryDeleted > 0) deletedCategories.push('Windows Update Cleanup')
            break
            
          case 'windows-upgrade-log-files':
            const upgradeLogPaths = [
              'C:\\Windows\\Panther',
              'C:\\$WINDOWS.~BT\\Sources\\Panther'
            ]
            
            for (const logPath of upgradeLogPaths) {
              categoryDeleted += deleteDirectoryContents(logPath)
            }
            
            // Delete specific log file
            const usrClassLog = path.join(userProfile, 'AppData\\Local\\Microsoft\\Windows\\UsrClass.dat.LOG1')
            categoryDeleted += deleteFile(usrClassLog)
            
            if (categoryDeleted > 0) deletedCategories.push('Windows Upgrade log files')
            break
        }
        
        totalDeleted += categoryDeleted
      }
      
      // Get disk space after cleanup
      let freeSpaceAfter = 0
      let actualSpaceFreed = 0 // Default to 0 if measurement fails
      
      try {
        freeSpaceAfter = await getActualFreeSpace()
        actualSpaceFreed = freeSpaceAfter - freeSpaceBefore
        
        console.log(`Disk space before cleanup: ${formatBytes(freeSpaceBefore)}`)
        console.log(`Disk space after cleanup: ${formatBytes(freeSpaceAfter)}`)
        console.log(`Space difference: ${formatBytes(actualSpaceFreed)}`)
        console.log(`Sum of deleted files: ${formatBytes(totalDeleted)}`)
        
        // Always use the actual space difference, even if it's 0 or negative
        console.log(`Using actual disk space difference: ${formatBytes(actualSpaceFreed)}`)
        
        // Ensure we don't show negative space freed
        if (actualSpaceFreed < 0) {
          actualSpaceFreed = 0
          console.log(`Space difference was negative, using 0`)
        }
      } catch (error) {
        console.error('Failed to measure disk space after cleanup:', error)
        actualSpaceFreed = 0
        console.log(`Disk measurement failed, using 0`)
      }

      if (deletedCategories.length > 0) {
        resolve({
          success: true,
          message: `Successfully cleaned: ${deletedCategories.join(', ')}.`,
          actualSpaceFreed: actualSpaceFreed,
          formattedSize: formatBytes(actualSpaceFreed)
        })
      } else {
        resolve({
          success: false,
          message: 'No files were deleted. Selected categories may be empty or inaccessible.',
          actualSpaceFreed: 0,
          formattedSize: '0 B'
        })
      }
      
    } catch (error) {
      reject({
        success: false,
        message: `Cleanup failed: ${error.message}`,
        actualSpaceFreed: 0,
        formattedSize: '0 B'
      })
    }
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    title: 'Windows Disk Cleanup',
    show: false
  })

  win.setMenuBarVisibility(false)
  win.loadFile('index.html')
  
  // Show window when ready to prevent visual flash
  win.once('ready-to-show', () => {
    win.show()
  })
}

app.whenReady().then(() => {
  ipcMain.handle('ping', () => 'pong')
  ipcMain.handle('get-cleanup-size', (event, category) => {
    return getCleanupSize(category)
  })
  ipcMain.handle('get-cleanup-raw-size', (event, category) => {
    return getCleanupRawSize(category)
  })
  ipcMain.handle('run-disk-cleanup', async (event, categories) => {
    return await runDiskCleanup(categories)
  })
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})