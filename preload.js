const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveCropped: (data) => ipcRenderer.invoke('image:saveCropped', data),
  saveEntry: (entry) => ipcRenderer.invoke('db:saveEntry', entry),
  openMusic: () => ipcRenderer.invoke('dialog:openMusic'),
  importMusic: (srcPath) => ipcRenderer.invoke('music:import', srcPath),
  getEntries: () => ipcRenderer.invoke('db:getEntries'),
  getEntryById: (id) => ipcRenderer.invoke('get-entry-by-id', id),
  deleteEntry: (id) => ipcRenderer.invoke('db:deleteEntry', id),
  updateEntry: (entry) => ipcRenderer.invoke('db:updateEntry', entry),
  getAllTags: () => ipcRenderer.invoke('db:getAllTags'),
  deleteFile: (filePath) => ipcRenderer.invoke('file:delete', filePath),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});