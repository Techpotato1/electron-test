const { app, BrowserWindow, ipcMain} = require('electron')
const path = require('node:path')
const fs = require('fs')
const os = require('os')
const { spawn } = require('child_process')
const { Worker } = require('worker_threads')

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
    
    case 'old-chkdsk-files':
      // Check for FOUND.* folders on drives
      const drives = ['C:', 'D:', 'E:', 'F:']
      let chkdskSize = 0
      for (const drive of drives) {
        const foundPath = path.join(drive, '\\', 'FOUND.000')
        chkdskSize += getDirectorySize(foundPath)
      }
      return formatBytes(chkdskSize)
    
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
    
    case 'debug-dump-files':
      return formatBytes(getDirectorySize('C:\\Windows\\debug'))
    
    case 'per-user-temp-files':
      const perUserWerPath = path.join(userProfile, 'AppData\\Local\\Microsoft\\Windows\\WER\\ReportArchive')
      return formatBytes(getDirectorySize(perUserWerPath))
    
    case 'system-archived-error-reporting':
      return formatBytes(getDirectorySize('C:\\ProgramData\\Microsoft\\Windows\\WER\\ReportArchive'))
    
    case 'per-user-queued-error-reporting':
      const perUserQueuedPath = path.join(userProfile, 'AppData\\Local\\Microsoft\\Windows\\WER\\ReportQueue')
      return formatBytes(getDirectorySize(perUserQueuedPath))
    
    case 'system-queued-error-reporting':
      return formatBytes(getDirectorySize('C:\\ProgramData\\Microsoft\\Windows\\WER\\ReportQueue'))
    
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
    
    case 'old-chkdsk-files':
      // Check for FOUND.* folders on drives
      const drives = ['C:', 'D:', 'E:', 'F:']
      let chkdskSize = 0
      for (const drive of drives) {
        const foundPath = path.join(drive, '\\', 'FOUND.000')
        chkdskSize += getDirectorySize(foundPath)
      }
      return chkdskSize
    
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
    
    case 'debug-dump-files':
      return getDirectorySize('C:\\Windows\\debug')
    
    case 'per-user-temp-files':
      return getDirectorySize('C:\\ProgramData\\Microsoft\\Windows\\WER\\ReportArchive')
    
    case 'system-archived-error-reporting':
      return getDirectorySize('C:\\ProgramData\\Microsoft\\Windows\\WER\\ReportArchive')
    
    case 'per-user-queued-error-reporting':
      const perUserQueuedPath = path.join(userProfile, 'AppData\\Local\\Microsoft\\Windows\\WER\\ReportQueue')
      return getDirectorySize(perUserQueuedPath)
    
    case 'system-queued-error-reporting':
      return getDirectorySize('C:\\ProgramData\\Microsoft\\Windows\\WER\\ReportQueue')
    
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

// Function to check if running as administrator
function isRunningAsAdmin() {
  try {
    // Try to access a Windows system file that requires admin privileges
    fs.accessSync('C:\\Windows\\System32\\config\\system', fs.constants.R_OK)
    return true
  } catch (error) {
    return false
  }
}

// Function to check if a path requires admin privileges
function requiresAdminPrivileges(filePath) {
  const adminPaths = [
    'C:\\Windows\\Temp',
    'C:\\Windows\\Downloaded Program Files', 
    'C:\\Windows\\MEMORY.DMP',
    'C:\\Windows\\Minidump',
    'C:\\Windows\\Logs',
    'C:\\Windows\\Panther',
    'C:\\Windows\\inf',
    'C:\\Windows\\SoftwareDistribution',
    'C:\\Windows.old',
    'C:\\$Windows.~BT',
    'C:\\$Windows.~WS',
  ]
  
  return adminPaths.some(adminPath => filePath.startsWith(adminPath))
}

// Enhanced directory deletion with admin privilege checking
function deleteDirectoryContentsWithPrivilegeCheck(dirPath) {
  let deletedSize = 0
  const requiresAdmin = requiresAdminPrivileges(dirPath)
  const hasAdmin = isRunningAsAdmin()
  
  // Skip admin-required paths if not running as admin
  if (requiresAdmin && !hasAdmin) {
    console.log(`Skipping ${dirPath} - requires administrator privileges`)
    return 0
  }
  
  try {
    if (!fs.existsSync(dirPath)) return 0
    
    const items = fs.readdirSync(dirPath)
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item)
      try {
        const stats = fs.statSync(itemPath)
        
        if (stats.isDirectory()) {
          deletedSize += deleteDirectoryContentsWithPrivilegeCheck(itemPath)
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
    console.log(`Access denied to ${dirPath}:`, error.message)
  }
  
  return deletedSize
}

// Enhanced file deletion with admin privilege checking  
function deleteFileWithPrivilegeCheck(filePath) {
  const requiresAdmin = requiresAdminPrivileges(filePath)
  const hasAdmin = isRunningAsAdmin()
  
  // Skip admin-required files if not running as admin
  if (requiresAdmin && !hasAdmin) {
    console.log(`Skipping ${filePath} - requires administrator privileges`)
    return 0
  }
  
  try {
    if (!fs.existsSync(filePath)) return 0
    
    const stats = fs.statSync(filePath)
    const size = stats.size
    fs.unlinkSync(filePath)
    return size
  } catch (error) {
    console.log(`Could not delete ${filePath}:`, error.message)
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

// Worker pool for parallel size calculations
class SizeCalculatorPool {
  constructor(maxWorkers = 4) {
    this.maxWorkers = maxWorkers
    this.workers = []
    this.queue = []
    this.activeJobs = new Map()
    this.jobId = 0
  }

  async calculateSizes(categories) {
    const promises = categories.map(category => this.calculateSize(category))
    return await Promise.all(promises)
  }

  calculateSize(category) {
    return new Promise((resolve, reject) => {
      const id = ++this.jobId
      const job = { id, category, resolve, reject }
      
      this.activeJobs.set(id, job)
      
      if (this.workers.length < this.maxWorkers) {
        this.createWorker(job)
      } else {
        this.queue.push(job)
      }
    })
  }

  createWorker(job) {
    const worker = new Worker(path.join(__dirname, 'size-worker.js'))
    
    worker.on('message', ({ id, category, size, error, success }) => {
      const job = this.activeJobs.get(id)
      if (job) {
        this.activeJobs.delete(id)
        if (success) {
          job.resolve({ category, size })
        } else {
          job.reject(new Error(error))
        }
      }
      
      // Process next job in queue
      if (this.queue.length > 0) {
        const nextJob = this.queue.shift()
        worker.postMessage({ category: nextJob.category, id: nextJob.id })
      } else {
        // Terminate worker if no more jobs
        worker.terminate()
        this.workers = this.workers.filter(w => w !== worker)
      }
    })

    worker.on('error', (error) => {
      const job = this.activeJobs.get(job.id)
      if (job) {
        this.activeJobs.delete(job.id)
        job.reject(error)
      }
    })

    this.workers.push(worker)
    worker.postMessage({ category: job.category, id: job.id })
  }

  terminate() {
    this.workers.forEach(worker => worker.terminate())
    this.workers = []
    this.queue = []
    this.activeJobs.clear()
  }
}

// Global worker pool instance
const sizeCalculatorPool = new SizeCalculatorPool(4)

// Enhanced function to get cleanup sizes in parallel
async function getCleanupSizesParallel(categories) {
  try {
    const results = await sizeCalculatorPool.calculateSizes(categories)
    return results.reduce((acc, { category, size }) => {
      acc[category] = size
      return acc
    }, {})
  } catch (error) {
    console.error('Error in parallel size calculation:', error)
    // Fallback to sequential calculation
    const results = {}
    for (const category of categories) {
      results[category] = getCleanupRawSize(category)
    }
    return results
  }
}

// Function to run disk cleanup
async function runDiskCleanup(categories) {
  return new Promise(async (resolve, reject) => {
    try {
      const userProfile = os.homedir()
      const tempDir = os.tmpdir()
      let totalDeleted = 0
      const deletedCategories = []
      const skippedCategories = []
      const hasAdmin = isRunningAsAdmin()
      
      // Warn user if not running as admin
      if (!hasAdmin) {
        console.log('⚠️ Not running as administrator - some system files may be skipped')
      }
      
      // Get disk space before cleanup
      let freeSpaceBefore = 0
      try {
        freeSpaceBefore = await getActualFreeSpace()
      } catch (error) {
        console.error('Failed to measure disk space before cleanup:', error)
      }
      
      for (const category of categories) {
        let categoryDeleted = 0
        let categorySkipped = false
        
        switch (category) {
          case 'temp-files':
            // Clean user temp folder (usually accessible)
            const userTempPath = path.join(userProfile, 'AppData\\Local\\Temp')
            categoryDeleted += deleteDirectoryContents(userTempPath)
            
            // Clean system temp folder (may require admin)
            categoryDeleted += deleteDirectoryContentsWithPrivilegeCheck(tempDir)
            
            // Clean Windows temp folder (requires admin)
            const windowsTempDeleted = deleteDirectoryContentsWithPrivilegeCheck('C:\\Windows\\Temp')
            categoryDeleted += windowsTempDeleted
            
            if (categoryDeleted > 0) deletedCategories.push('Temporary Files')
            else if (!hasAdmin) skippedCategories.push('Temporary Files (requires admin)')
            break
            
          case 'temp-internet':
            // Clean IE cache (user accessible)
            const ieCachePath = path.join(userProfile, 'AppData\\Local\\Microsoft\\Windows\\INetCache')
            categoryDeleted += deleteDirectoryContents(ieCachePath)
            
            // Clean IE history (user accessible)
            const ieHistoryPath = path.join(userProfile, 'AppData\\Local\\Microsoft\\Windows\\History')
            categoryDeleted += deleteDirectoryContents(ieHistoryPath)
            
            if (categoryDeleted > 0) deletedCategories.push('Temporary Internet Files')
            break
            
          case 'recycle-bin':
            // Empty recycle bin on all drives (may require admin)
            const drives = ['C:', 'D:', 'E:', 'F:']
            for (const drive of drives) {
              const recycleBinPath = path.join(drive, '\\', '$Recycle.Bin')
              categoryDeleted += deleteDirectoryContentsWithPrivilegeCheck(recycleBinPath)
            }
            
            if (categoryDeleted > 0) deletedCategories.push('Recycle Bin')
            else if (!hasAdmin) skippedCategories.push('Recycle Bin (requires admin)')
            break
            
          case 'downloaded-program-files':
            const downloadedFilesPath = 'C:\\Windows\\Downloaded Program Files'
            const downloadedDeleted = deleteDirectoryContentsWithPrivilegeCheck(downloadedFilesPath)
            categoryDeleted += downloadedDeleted
            
            if (categoryDeleted > 0) deletedCategories.push('Downloaded Program Files')
            else if (!hasAdmin) skippedCategories.push('Downloaded Program Files (requires admin)')
            break
            
          case 'thumbnails':
            // Clean thumbnail cache (user accessible)
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
            const memoryDumpDeleted = deleteFileWithPrivilegeCheck(memoryDumpPath)
            categoryDeleted += memoryDumpDeleted
            
            if (categoryDeleted > 0) deletedCategories.push('System error memory dump files')
            else if (!hasAdmin) skippedCategories.push('System error memory dump files (requires admin)')
            break
            
          case 'system-error-minidump':
            const minidumpDeleted = deleteDirectoryContentsWithPrivilegeCheck('C:\\Windows\\Minidump')
            categoryDeleted += minidumpDeleted
            
            if (categoryDeleted > 0) deletedCategories.push('System error minidump files')
            else if (!hasAdmin) skippedCategories.push('System error minidump files (requires admin)')
            break
            
          case 'old-chkdsk-files':
            // Delete FOUND.* folders on drives (may require admin)
            const chkdskDrives = ['C:', 'D:', 'E:', 'F:']
            for (const drive of chkdskDrives) {
              const foundPath = path.join(drive, '\\', 'FOUND.000')
              categoryDeleted += deleteDirectoryContentsWithPrivilegeCheck(foundPath)
            }
            
            if (categoryDeleted > 0) deletedCategories.push('Old Chkdsk files')
            else if (!hasAdmin) skippedCategories.push('Old Chkdsk files (requires admin)')
            break
            
          case 'previous-windows-installations':
            const windowsOldPaths = [
              'C:\\Windows.old',
              'C:\\$Windows.~BT',
              'C:\\$Windows.~WS'
            ]
            
            for (const oldPath of windowsOldPaths) {
              categoryDeleted += deleteDirectoryContentsWithPrivilegeCheck(oldPath)
            }
            
            if (categoryDeleted > 0) deletedCategories.push('Previous Windows installation(s)')
            else if (!hasAdmin) skippedCategories.push('Previous Windows installation(s) (requires admin)')
            break
            
          case 'windows-update-cleanup':
            const updatePaths = [
              'C:\\Windows\\SoftwareDistribution\\Download',
              'C:\\Windows\\SoftwareDistribution\\DataStore\\Logs'
            ]
            
            for (const updatePath of updatePaths) {
              categoryDeleted += deleteDirectoryContentsWithPrivilegeCheck(updatePath)
            }
            
            if (categoryDeleted > 0) deletedCategories.push('Windows Update Cleanup')
            else if (!hasAdmin) skippedCategories.push('Windows Update Cleanup (requires admin)')
            break
            
          case 'windows-upgrade-log-files':
            const upgradeLogPaths = [
              'C:\\Windows\\Panther',
              'C:\\$WINDOWS.~BT\\Sources\\Panther'
            ]
            
            for (const logPath of upgradeLogPaths) {
              categoryDeleted += deleteDirectoryContentsWithPrivilegeCheck(logPath)
            }
            
            // Delete specific log file (user accessible)
            const usrClassLog = path.join(userProfile, 'AppData\\Local\\Microsoft\\Windows\\UsrClass.dat.LOG1')
            categoryDeleted += deleteFile(usrClassLog)
            
            if (categoryDeleted > 0) deletedCategories.push('Windows Upgrade log files')
            else if (!hasAdmin) skippedCategories.push('Windows Upgrade log files (requires admin)')
            break
            
          case 'debug-dump-files':
            const debugDeleted = deleteDirectoryContentsWithPrivilegeCheck('C:\\Windows\\debug')
            categoryDeleted += debugDeleted
            
            if (categoryDeleted > 0) deletedCategories.push('Debug Dump Files')
            else if (!hasAdmin) skippedCategories.push('Debug Dump Files (requires admin)')
            break
            
          case 'per-user-temp-files':
            const perUserWerCleanupPath = path.join(userProfile, 'AppData\\Local\\Microsoft\\Windows\\WER\\ReportArchive')
            categoryDeleted += deleteDirectoryContents(perUserWerCleanupPath)
            
            if (categoryDeleted > 0) deletedCategories.push('Per user archived Windows Error Reporting')
            break
            
          case 'system-archived-error-reporting':
            const systemArchivedDeleted = deleteDirectoryContentsWithPrivilegeCheck('C:\\ProgramData\\Microsoft\\Windows\\WER\\ReportArchive')
            categoryDeleted += systemArchivedDeleted
            
            if (categoryDeleted > 0) deletedCategories.push('System archived Windows Error Reporting')
            else if (!hasAdmin) skippedCategories.push('System archived Windows Error Reporting (requires admin)')
            break
            
          case 'per-user-queued-error-reporting':
            const perUserQueuedCleanupPath = path.join(userProfile, 'AppData\\Local\\Microsoft\\Windows\\WER\\ReportQueue')
            categoryDeleted += deleteDirectoryContents(perUserQueuedCleanupPath)
            
            if (categoryDeleted > 0) deletedCategories.push('Per user queued Windows Error Reporting')
            break
            
          case 'system-queued-error-reporting':
            const systemQueuedDeleted = deleteDirectoryContentsWithPrivilegeCheck('C:\\ProgramData\\Microsoft\\Windows\\WER\\ReportQueue')
            categoryDeleted += systemQueuedDeleted
            
            if (categoryDeleted > 0) deletedCategories.push('System queued Windows Error Reporting')
            else if (!hasAdmin) skippedCategories.push('System queued Windows Error Reporting (requires admin)')
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

      // Build result message
      let resultMessage = ''
      let resultSuccess = false
      
      if (deletedCategories.length > 0) {
        resultMessage = `Successfully cleaned: ${deletedCategories.join(', ')}.`
        resultSuccess = true
        
        if (skippedCategories.length > 0) {
          resultMessage += `\n\nSkipped (requires administrator): ${skippedCategories.join(', ')}.`
          resultMessage += `\n\n💡 Run as administrator to clean all system files.`
        }
      } else {
        if (skippedCategories.length > 0) {
          resultMessage = `No files cleaned - all selected categories require administrator privileges.\n\n`
          resultMessage += `Skipped: ${skippedCategories.join(', ')}.`
          resultMessage += `\n\n🔐 Right-click the app and select "Run as administrator" to clean system files.`
        } else {
          resultMessage = 'No files were deleted. Selected categories may be empty or inaccessible.'
        }
        resultSuccess = false
      }

      resolve({
        success: resultSuccess,
        message: resultMessage,
        actualSpaceFreed: actualSpaceFreed,
        formattedSize: formatBytes(actualSpaceFreed),
        hasAdmin: hasAdmin,
        skippedCount: skippedCategories.length
      })
      
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
    show: true // Show immediately since we have a loading screen
  })

  win.setMenuBarVisibility(false)
  win.loadFile('index.html')
}

app.whenReady().then(() => {
  ipcMain.handle('ping', () => 'pong')
  ipcMain.handle('get-cleanup-size', (event, category) => {
    return getCleanupSize(category)
  })
  ipcMain.handle('get-cleanup-raw-size', (event, category) => {
    return getCleanupRawSize(category)
  })
  ipcMain.handle('check-admin-privileges', () => {
    return {
      hasAdmin: isRunningAsAdmin(),
      message: isRunningAsAdmin() ? 
        'Running as administrator - can clean all system files' : 
        'Running as standard user - some system files will be skipped'
    }
  })
  ipcMain.handle('run-disk-cleanup', async (event, categories) => {
    return await runDiskCleanup(categories)
  })
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})