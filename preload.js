const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveCropped: (data) => ipcRenderer.invoke('image:saveCropped', data),
  saveEntry: (entry) => ipcRenderer.invoke('db:saveEntry', entry),
  getEntries: () => ipcRenderer.invoke('db:getEntries'),
  getEntryById: (id) => ipcRenderer.invoke('get-entry-by-id', id),
  deleteEntry: (id) => ipcRenderer.invoke('db:deleteEntry', id),
  updateEntry: (entry) => ipcRenderer.invoke('db:updateEntry', entry),
  getAllTags: () => ipcRenderer.invoke('db:getAllTags')
});