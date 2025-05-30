const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { DataSource } = require('typeorm');
const AnimeEntry = require(path.join(__dirname, 'database', 'entity', 'AnimeEntry'));

// SQLite 数据源
const AppDataSource = new DataSource({
  type: 'sqlite',
  database: path.join(app.getPath('userData'), 'db.sqlite'),
  entities: [AnimeEntry],
  synchronize: true,
});

async function createWindow() {
  await AppDataSource.initialize();
  const win = new BrowserWindow({
    fullscreen: true,
    fullscreenable: true,
    autoHideMenuBar: true,
    resizable: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      scrollBounce: false,
      webSecurity: false,
      allowRunningInsecureContent: true
    }
  });
  win.setFullScreen(true);

  // 设置安全的内容安全策略
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [`
        default-src   'self' 'unsafe-inline' data: file: blob:;
        script-src    'self' 'unsafe-inline';
        connect-src   'self' http://localhost:3000 ws://localhost:3000 file: blob: data:;
        style-src     'self' 'unsafe-inline';
        img-src       'self' data: file: blob:;
        media-src     'self' data: file: blob:;
      `.replace(/\s+/g, ' ')]
      }
    });
  });

  // 开发模式下
  win.loadURL(
    process.env.NODE_ENV === 'production'
      ? `file://${path.join(__dirname, 'dist', 'index.html')}`
      : 'http://localhost:3000'
  );

}

app.whenReady().then(() => {
  createWindow();

  // 只在开发环境下注册快捷键
  if (!app.isPackaged) {
    globalShortcut.register('CommandOrControl+Shift+D', () => {
      const win = BrowserWindow.getFocusedWindow();
      if (win) {
        if (win.webContents.isDevToolsOpened()) {
          win.webContents.closeDevTools();
        } else {
          win.webContents.openDevTools();
        }
      }
    });
  }
});

// 文件对话框：选择本地封面图片
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: '选择封面图片',
    filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg'] }],
    properties: ['openFile']
  });
  if (canceled) return null;
  return filePaths[0];
});

// 接收渲染进程裁剪后的 base64 数据，保存到本地
ipcMain.handle('image:saveCropped', async (event, { dataURL, filename }) => {
  try {
    const base64Data = dataURL.replace(/^data:image\/[a-z]+;base64,/, '');
    const savePath = path.join(app.getPath('userData'), 'covers');

    // 确保目录存在
    if (!fs.existsSync(savePath)) {
      fs.mkdirSync(savePath, { recursive: true });
    }

    const filePath = path.join(savePath, filename);
    console.log('保存图片到:', filePath);

    // 写入文件
    fs.writeFileSync(filePath, base64Data, 'base64');

    // 验证文件是否写入成功
    if (!fs.existsSync(filePath)) {
      throw new Error('文件保存失败');
    }

    console.log('图片保存成功:', filePath);
    return filePath;
  } catch (error) {
    console.error('保存图片失败:', error);
    throw error;
  }
});

// === 1. 选择本地音乐文件 ===
ipcMain.handle('dialog:openMusic', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: '选择背景音乐',
    filters: [
      { name: '音频文件', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac'] }
    ],
    properties: ['openFile']
  });
  if (canceled) return null;
  return filePaths[0];
});

// === 2. 将选中的音乐文件拷贝到用户数据目录 ===
ipcMain.handle('music:import', async (event, srcPath) => {
  try {
    const musicDir = path.join(app.getPath('userData'), 'music');
    // 确保目录存在
    if (!fs.existsSync(musicDir)) {
      fs.mkdirSync(musicDir, { recursive: true });
    }
    // 用时间戳+原文件名避免冲突
    const fileName = `${Date.now()}_${path.basename(srcPath)}`;
    const destPath = path.join(musicDir, fileName);
    await fs.promises.copyFile(srcPath, destPath);
    console.log('音乐导入成功:', destPath);
    return destPath;
  } catch (err) {
    console.error('音乐导入失败:', err);
    throw err;
  }
});


// 保存新条目
ipcMain.handle('db:saveEntry', async (event, entry) => {
  const repo = AppDataSource.getRepository('AnimeEntry');
  const newEntry = repo.create(entry);
  await repo.save(newEntry);
  console.log('保存条目成功:', newEntry);
  return newEntry;
});


// 获取所有条目
ipcMain.handle('db:getEntries', async () => {
  const repo = AppDataSource.getRepository('AnimeEntry');
  return await repo.find({ order: { id: 'DESC' } });
});

// 获取特定条目 - 修改为使用 AppDataSource
ipcMain.handle('get-entry-by-id', async (event, id) => {
  try {
    // 使用 AppDataSource 而不是 getConnection()
    const repo = AppDataSource.getRepository('AnimeEntry');
    const entry = await repo.findOne({ where: { id } });

    if (entry) {
      console.log('获取条目成功:', {
        id: entry.id,
        title: entry.title,
        coverPath: entry.coverPath
      });
    } else {
      console.log('未找到条目，ID:', id);
    }

    return entry;
  } catch (error) {
    console.error('获取条目详情错误:', {
      id,
      errorMessage: error.message,
      stack: error.stack
    });
    return null;
  }
});

// 删除条目
ipcMain.handle('db:deleteEntry', async (event, id) => {
  const repo = AppDataSource.getRepository('AnimeEntry');
  // 先获取条目信息以获取图片路径
  const entry = await repo.findOne({ where: { id } });
  if (entry && entry.coverPath) {
    try {
      // 删除图片文件
      await fs.promises.unlink(entry.coverPath);
    } catch (err) {
      console.error('删除图片失败:', err);
    }
  }
  await repo.delete(id);
  console.log('删除条目成功 id:', id);
  return true;
});

// 更新条目
ipcMain.handle('db:updateEntry', async (event, entry) => {
  const repo = AppDataSource.getRepository('AnimeEntry');
  await repo.update(entry.id, entry);
  console.log('更新条目成功 id:', entry.id);
  return await repo.findOneBy({ id: entry.id });
});

// 删除指定文件
ipcMain.handle('file:delete', async (event, filePath) => {
  try {
    // 只在文件存在时尝试删除
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      console.log('已删除文件:', filePath);
    }
    return true;
  } catch (err) {
    console.error('删除文件失败:', filePath, err);
    // 返回 false 表示失败，但不阻塞渲染进程
    return false;
  }
});

// 获取所有标签
ipcMain.handle('db:getAllTags', async () => {
  const repo = AppDataSource.getRepository('AnimeEntry');
  const entries = await repo.find();
  const allTags = entries.reduce((acc, entry) => {
    if (entry.tags) {
      const tags = JSON.parse(entry.tags);
      tags.forEach(tag => {
        if (!acc.includes(tag)) acc.push(tag);
      });
    }
    return acc;
  }, []);
  return allTags.sort();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});