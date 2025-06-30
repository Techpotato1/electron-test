const { contextBridge, ipcRenderer} = require('electron')

contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  ping: () => ipcRenderer.invoke('ping'),
  getCleanupSize: (category) => ipcRenderer.invoke('get-cleanup-size', category),
  getCleanupRawSize: (category) => ipcRenderer.invoke('get-cleanup-raw-size', category),
  runDiskCleanup: (categories) => ipcRenderer.invoke('run-disk-cleanup', categories),
  // we can also expose variables, not just functions
})