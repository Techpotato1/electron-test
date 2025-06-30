const information = document.getElementById('info')

const func = async () => {
    const response = await window.versions.ping()
    console.log(response)
}

func()

// Function to update file sizes for cleanup categories
async function updateFileSizes() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]')
    
    for (const checkbox of checkboxes) {
        try {
            const size = await window.versions.getCleanupSize(checkbox.value)
            const rawSize = await window.versions.getCleanupRawSize(checkbox.value)
            const label = document.querySelector(`label[for="${checkbox.id}"]`)
            const cleanupItem = checkbox.closest('.cleanup-item')
            
            // Hide items with 0 bytes
            if (rawSize === 0 || size === '0 B') {
                cleanupItem.style.display = 'none'
                checkbox.checked = false // Uncheck hidden items
                continue
            } else {
                cleanupItem.style.display = 'flex'
            }
            
            const existingSize = label.querySelector('.file-size')
            
            if (existingSize) {
                existingSize.textContent = `(${size})`
            } else {
                const sizeSpan = document.createElement('span')
                sizeSpan.className = 'file-size'
                sizeSpan.textContent = `(${size})`
                label.appendChild(sizeSpan)
            }
            
            // Store the raw size for tally calculation
            checkbox.dataset.rawSize = rawSize
        } catch (error) {
            console.error(`Error getting size for ${checkbox.value}:`, error)
            // Hide items that error out
            const cleanupItem = checkbox.closest('.cleanup-item')
            cleanupItem.style.display = 'none'
        }
    }
    
    // Initial tally update
    updateTally()
}

// Function to convert size string back to bytes for calculation
function parseSize(sizeString) {
    if (!sizeString) return 0
    
    const units = { 'B': 1, 'KB': 1024, 'MB': 1024*1024, 'GB': 1024*1024*1024, 'TB': 1024*1024*1024*1024 }
    const match = sizeString.match(/^([\d.]+)\s*([A-Z]+)$/)
    
    if (!match) return 0
    
    const value = parseFloat(match[1])
    const unit = match[2]
    
    return Math.round(value * (units[unit] || 1))
}

// Function to format bytes to human readable format
function formatBytes(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Function to update the total tally
function updateTally() {
    const checkedBoxes = document.querySelectorAll('input[type="checkbox"]:checked')
    let totalBytes = 0
    
    checkedBoxes.forEach(checkbox => {
        const rawSize = parseInt(checkbox.dataset.rawSize) || 0
        totalBytes += rawSize
    })
    
    document.getElementById('totalSize').textContent = formatBytes(totalBytes)
}

// Load file sizes when page loads
updateFileSizes()

// Variable to track space saved
let totalSpaceSaved = 0

// Light/Dark mode toggle functionality
const darkModeToggle = document.getElementById('darkModeToggle')
const darkModeIcon = darkModeToggle.querySelector('.material-icons')
const body = document.body

// Check for saved light mode preference (default is dark mode)
const isLightMode = localStorage.getItem('lightMode') === 'true'
if (isLightMode) {
    body.classList.add('light-mode')
    darkModeIcon.textContent = 'dark_mode'
} else {
    darkModeIcon.textContent = 'light_mode'
}

darkModeToggle.addEventListener('click', () => {
    // Add spinning animation
    darkModeToggle.classList.add('spinning')
    
    // Change the icon immediately when spinning starts
    body.classList.toggle('light-mode')
    const isNowLight = body.classList.contains('light-mode')
    
    // Save preference
    localStorage.setItem('lightMode', isNowLight)
    
    // Update icon while spinning
    darkModeIcon.textContent = isNowLight ? 'dark_mode' : 'light_mode'
    
    // Remove spinning class and add completion class for smooth transition after animation
    setTimeout(() => {
        darkModeToggle.classList.remove('spinning')
        darkModeToggle.classList.add('spin-complete')
        
        // Reset transform after the transition completes
        setTimeout(() => {
            darkModeToggle.classList.remove('spin-complete')
            darkModeIcon.style.transform = 'rotate(0deg)'
        }, 300)
    }, 500) // Full duration of the spin animation
})

// Show version info at bottom
information.innerHTML = `
    <div class="version-info">
        <strong>System Information:</strong><br>
        Chrome: v${versions.chrome()}<br>
        Node.js: v${versions.node()}<br>
        Electron: v${versions.electron()}
    </div>
`

// Handle checkbox interactions
document.getElementById('rescanSizes').addEventListener('click', async () => {
    const rescanButton = document.getElementById('rescanSizes')
    rescanButton.textContent = 'Rescanning...'
    rescanButton.disabled = true
    
    // Clear all checkboxes during rescan
    const checkboxes = document.querySelectorAll('input[type="checkbox"]')
    checkboxes.forEach(checkbox => checkbox.checked = false)
    
    // Update tally to 0
    updateTally()
    
    // Re-scan all file sizes
    await updateFileSizes()
    
    rescanButton.textContent = 'Rescan Sizes'
    rescanButton.disabled = false
})

document.getElementById('selectAll').addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]')
    checkboxes.forEach(checkbox => checkbox.checked = true)
    updateTally()
})

document.getElementById('clearAll').addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]')
    checkboxes.forEach(checkbox => checkbox.checked = false)
    updateTally()
})

// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners to all checkboxes for tally updates
    const checkboxes = document.querySelectorAll('input[type="checkbox"]')
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateTally)
    })
    
    // Make cleanup items clickable
    const cleanupItems = document.querySelectorAll('.cleanup-item')
    
    cleanupItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Don't trigger if clicking directly on checkbox or label (they handle it themselves)
            if (e.target.type === 'checkbox' || e.target.tagName === 'LABEL') {
                return
            }
            
            const checkbox = item.querySelector('input[type="checkbox"]')
            if (checkbox && item.style.display !== 'none') {
                checkbox.checked = !checkbox.checked
                updateTally()
            }
        })
    })
})

document.getElementById('runCleanup').addEventListener('click', async () => {
    const checkedItems = []
    const checkedCategories = []
    const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked')
    let totalSizeToClean = 0
    
    checkboxes.forEach(checkbox => {
        // Only process visible items
        const cleanupItem = checkbox.closest('.cleanup-item')
        if (cleanupItem.style.display !== 'none') {
            const label = document.querySelector(`label[for="${checkbox.id}"]`)
            checkedItems.push(label.textContent)
            checkedCategories.push(checkbox.value)
            totalSizeToClean += parseInt(checkbox.dataset.rawSize) || 0
        }
    })
    
    if (checkedItems.length === 0) {
        information.textContent = 'Please select at least one item to clean.'
        return
    }
    
    // Show progress bar and hide info
    const progressContainer = document.getElementById('progressContainer')
    const progressFill = document.getElementById('progressFill')
    const progressText = document.getElementById('progressText')
    
    information.style.display = 'none'
    progressContainer.style.display = 'block'
    
    // Simulate progress for each category
    let completedCategories = 0
    const totalCategories = checkedCategories.length
    
    // Update progress function
    const updateProgress = (completed, total, currentCategory = '') => {
        const percentage = Math.round((completed / total) * 100)
        progressFill.style.width = `${percentage}%`
        progressText.textContent = `${percentage}%`
        
        if (currentCategory) {
            document.querySelector('.progress-label').textContent = `Cleaning ${currentCategory}...`
        }
    }
    
    try {
        // Show initial progress
        updateProgress(0, totalCategories, checkedItems[0])
        
        // Call the actual cleanup with progress simulation
        const cleanupPromise = window.versions.runDiskCleanup(checkedCategories)
        
        // Simulate progress while cleanup is running
        const progressInterval = setInterval(() => {
            if (completedCategories < totalCategories) {
                completedCategories += 0.1 // Slow progress simulation
                updateProgress(completedCategories, totalCategories)
            }
        }, 200)
        
        const result = await cleanupPromise
        
        // Complete the progress
        clearInterval(progressInterval)
        updateProgress(totalCategories, totalCategories)
        document.querySelector('.progress-label').textContent = 'Cleanup completed!'
        
        // Wait a moment to show completion
        setTimeout(() => {
            progressContainer.style.display = 'none'
            information.style.display = 'block'
            
            // Extract actual space freed from the result message
            let actualSpaceFreed = 0
            const freedMatch = result.match(/(\d+(?:\.\d+)?)\s*([KMGT]?B)\s*freed/)
            if (freedMatch) {
                const value = parseFloat(freedMatch[1])
                const unit = freedMatch[2]
                const units = { 'B': 1, 'KB': 1024, 'MB': 1024*1024, 'GB': 1024*1024*1024, 'TB': 1024*1024*1024*1024 }
                actualSpaceFreed = Math.round(value * (units[unit] || 1))
            } else {
                // Fallback to estimated size if no actual size in result
                actualSpaceFreed = totalSizeToClean
            }
            
            // Add actual space freed to total
            totalSpaceSaved += actualSpaceFreed
            
            information.innerHTML = `
                <strong>Cleanup completed!</strong><br>
                ${checkedItems.map(item => `• ${item}`).join('<br>')}
                <br><br>
                <strong>Space freed:</strong> ${formatBytes(actualSpaceFreed)}<br>
                <strong>Total space saved this session:</strong> ${formatBytes(totalSpaceSaved)}<br>
                <br>
                <em>${result}</em>
            `
            
            // Clear the checkboxes after successful cleanup
            checkboxes.forEach(checkbox => checkbox.checked = false)
            updateTally()
        }, 1000)
        
    } catch (error) {
        // Hide progress bar and show error
        progressContainer.style.display = 'none'
        information.style.display = 'block'
        
        information.innerHTML = `
            <strong>Cleanup failed:</strong><br>
            <em>${error}</em>
            <br><br>
            <strong>Total space saved this session:</strong> ${formatBytes(totalSpaceSaved)}
        `
    }
})