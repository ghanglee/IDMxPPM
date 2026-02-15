const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 파일 다이얼로그
  openProject: () => ipcRenderer.invoke('dialog:openProject'),
  openBPMN: () => ipcRenderer.invoke('dialog:openBPMN'),
  importER: () => ipcRenderer.invoke('dialog:importER'),
  saveProject: (data) => ipcRenderer.invoke('dialog:saveProject', data),
  saveFile: (data) => ipcRenderer.invoke('dialog:saveFile', data),
  exportBPMN: (data) => ipcRenderer.invoke('dialog:exportBPMN', data),
  exportSVG: (data) => ipcRenderer.invoke('dialog:exportSVG', data),
  exportER: (data) => ipcRenderer.invoke('dialog:exportER', data),
  exportIdmXML: (data) => ipcRenderer.invoke('dialog:exportIdmXML', data),
  showSaveLocation: (data) => ipcRenderer.invoke('dialog:showSaveLocation', data),
  saveToPath: (data) => ipcRenderer.invoke('dialog:saveToPath', data),

  // 메뉴 이벤트 리스너
  onMenuNew: (callback) => ipcRenderer.on('menu-new', callback),
  onMenuSave: (callback) => ipcRenderer.on('menu-save', callback),
  onMenuSaveAs: (callback) => ipcRenderer.on('menu-save-as', callback),
  onMenuUndo: (callback) => ipcRenderer.on('menu-undo', callback),
  onMenuRedo: (callback) => ipcRenderer.on('menu-redo', callback),
  onMenuZoomIn: (callback) => ipcRenderer.on('menu-zoom-in', callback),
  onMenuZoomOut: (callback) => ipcRenderer.on('menu-zoom-out', callback),
  onMenuZoomFit: (callback) => ipcRenderer.on('menu-zoom-fit', callback),
  onMenuExportBPMN: (callback) => ipcRenderer.on('menu-export-bpmn', callback),
  onMenuExportIdmXML: (callback) => ipcRenderer.on('menu-export-idmxml', callback),
  onMenuServerConnect: (callback) => ipcRenderer.on('menu-server-connect', callback),
  onFileOpened: (callback) => ipcRenderer.on('file-opened', (event, data) => callback(data)),
  onERImported: (callback) => ipcRenderer.on('er-imported', (event, data) => callback(data)),
  
  // 리스너 제거
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  
  // File system (for reading relative files during import)
  readRelativeFile: (basePath, relativePath) => ipcRenderer.invoke('fs:readRelativeFile', { basePath, relativePath }),
  readRelativeFileBase64: (basePath, relativePath) => ipcRenderer.invoke('fs:readRelativeFileBase64', { basePath, relativePath }),

  // 플랫폼 정보
  platform: process.platform
});

contextBridge.exposeInMainWorld('isElectron', true);
