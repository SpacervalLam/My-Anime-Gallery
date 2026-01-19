const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 选择本地封面图片
  openFile: () => ipcRenderer.invoke('dialog:openFile'),

  // 保存渲染进程裁剪后的 base64 数据
  saveCropped: (data) => ipcRenderer.invoke('image:saveCropped', data),

  // 保存新条目到数据库
  saveEntry: (entry) => ipcRenderer.invoke('db:saveEntry', entry),

  // 选择本地音乐文件
  openMusic: () => ipcRenderer.invoke('dialog:openMusic'),

  // 将选中的音乐文件拷贝到用户数据目录
  importMusic: (srcPath) => ipcRenderer.invoke('music:import', srcPath),

  // 获取所有条目
  getEntries: () => ipcRenderer.invoke('db:getEntries'),

  // 根据 ID 获取特定条目
  getEntryById: (id) => ipcRenderer.invoke('get-entry-by-id', id),

  // 删除条目
  deleteEntry: (id) => ipcRenderer.invoke('db:deleteEntry', id),

  // 更新条目
  updateEntry: (entry) => ipcRenderer.invoke('db:updateEntry', entry),

  // 获取所有标签
  getAllTags: () => ipcRenderer.invoke('db:getAllTags'),

  // 删除指定文件
  deleteFile: (filePath) => ipcRenderer.invoke('file:delete', filePath),

  // 打开外部链接或文件
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // 发起“导出”请求：弹出目录选择对话框并导出数据库与媒体
  exportData: (options) => ipcRenderer.invoke('export-anime-data', options),

  // 发起“导入”请求：弹出目录选择对话框并导入已解压的导出包
  importData: () => ipcRenderer.invoke('import-anime-data'),

  // 在文件管理器中显示并选中文件
  showInFolder: (filePath) => ipcRenderer.invoke('show-in-folder', filePath),

  // 获取推荐标签
  getRecommendedTags: (tag) => ipcRenderer.invoke('db:getRecommendedTags', tag),

  // 监听数据更新事件
  onDataUpdated: (callback) => {
    ipcRenderer.on('data-updated', callback);
    return () => ipcRenderer.removeListener('data-updated', callback);
  },

  // 关闭应用
  closeApp: () => ipcRenderer.invoke('app:close'),

  // 发送AI API请求
  sendAIRequest: (aiConfig, prompt, timeout) => ipcRenderer.invoke('ai:sendRequest', aiConfig, prompt, timeout),
  
  // 测试代理连接
  testProxyConnection: (proxyConfig) => ipcRenderer.invoke('ai:testProxyConnection', proxyConfig),
  
  // 保存AI配置
  saveAIConfig: (config) => ipcRenderer.invoke('ai:saveConfig', config),
  
  // 加载AI配置
  loadAIConfig: () => ipcRenderer.invoke('ai:loadConfig')
});
