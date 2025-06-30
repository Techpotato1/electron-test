// Worker thread for calculating directory sizes
const { parentPort, workerData } = require('worker_threads')
const fs = require('fs')
const path = require('path')
const os = require('os')

// Function to get directory size recursively (same as main.js)
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
        continue
      }
    }
  } catch (error) {
    return 0
  }
  
  return totalSize
}

// Calculate size for a specific cleanup category
function calculateCategorySize(category) {
  const userProfile = os.homedir()
  const tempDir = os.tmpdir()
  
  switch (category) {
    case 'temp-files':
      const userTempSize = getDirectorySize(path.join(userProfile, 'AppData\\Local\\Temp'))
      const systemTempSize = getDirectorySize(tempDir)
      const windowsTempSize = getDirectorySize('C:\\Windows\\Temp')
      return userTempSize + systemTempSize + windowsTempSize
    
    case 'recycle-bin':
      const drives = ['C:', 'D:', 'E:', 'F:']
      let totalSize = 0
      for (const drive of drives) {
        const recycleBinPath = path.join(drive, '\\', '$Recycle.Bin')
        totalSize += getDirectorySize(recycleBinPath)
      }
      return totalSize
    
    case 'thumbnails':
      const thumbPaths = [
        path.join(userProfile, 'AppData\\Local\\Microsoft\\Windows\\Explorer'),
        path.join(userProfile, 'AppData\\Local\\IconCache.db'),
        'C:\\Users\\All Users\\Microsoft\\Windows\\Caches'
      ]
      let thumbSize = 0
      for (const thumbPath of thumbPaths) {
        thumbSize += getDirectorySize(thumbPath)
      }
      return thumbSize
    
    // Add other categories...
    default:
      return 0
  }
}

// Listen for messages from main thread
parentPort.on('message', ({ category, id }) => {
  try {
    const size = calculateCategorySize(category)
    parentPort.postMessage({ id, category, size, success: true })
  } catch (error) {
    parentPort.postMessage({ id, category, error: error.message, success: false })
  }
})
