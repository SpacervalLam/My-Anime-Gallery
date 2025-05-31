const { app, BrowserWindow, ipcMain, dialog, globalShortcut, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const mkdirp = require('mkdirp');
const archiver = require('archiver');        // 用于压缩
const AdmZip = require('adm-zip');            // 用于解压
const { DataSource } = require('typeorm');
const AnimeEntry = require(path.join(__dirname, 'database', 'entity', 'AnimeEntry'));

const isDev = !app.isPackaged;
let mainWindow = null;

// =============================================
// 1. TypeORM 数据源初始化
// =============================================
const AppDataSource = new DataSource({
  type: 'sqlite',
  // 数据库文件放在 用户数据 目录下，例如：C:\Users\<User>\AppData\Roaming\<AppName>\db.sqlite
  database: path.join(app.getPath('userData'), 'db.sqlite'),
  entities: [AnimeEntry],
  synchronize: true, // 开发阶段自动同步表结构；上线前建议改为 false 并使用迁移
});

async function createWindow() {
  try {
    // 初始化数据库连接，并同步表结构
    await AppDataSource.initialize();

    // 创建主窗口
    mainWindow = new BrowserWindow({
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
        webSecurity: false,
        sandbox: true,
        scrollBounce: false,
        allowRunningInsecureContent: true,
      }
    });

    // 一旦打开就全屏
    mainWindow.setFullScreen(true);

    // 设置 CSP
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [`
            default-src 'self';
            script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:;
            style-src 'self' 'unsafe-inline' blob:;
            img-src 'self' data: blob: file:;
            media-src 'self' data: blob: file:;
            font-src 'self' data: blob:;
            connect-src 'self' ws: blob: file:;
            frame-src 'self' blob:;
          `.replace(/\s+/g, ' ')]
        }
      });
    });

    // 根据开发/生产环境加载 URL
    if (isDev) {
      await mainWindow.loadURL('http://localhost:3000');
    } else {
      await mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    }
  } catch (error) {
    console.error('Failed to create window:', error);
    throw error;
  }
}


// =============================================
// 2. App 启动 & 注册快捷键
// =============================================
app.whenReady().then(() => {
  createWindow();

  // 在开发模式下用 Ctrl+Shift+D 切换 DevTools
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

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// =============================================
// 3. IPC 处理：导出数据（.spacerval）
// =============================================
ipcMain.handle('export-anime-data', async () => {
  try {
    // 3.1 弹出“选择导出目录”对话框
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: '选择导出目录',
      buttonLabel: '导出到此处',
      properties: ['openDirectory', 'createDirectory']
    });
    if (canceled || filePaths.length === 0) {
      return { success: false, message: '用户取消导出操作' };
    }
    const targetDir = filePaths[0];

    // 3.2 调用 doExport，获取生成的 .spacerval 路径
    const archivePath = await doExport(targetDir);
    return { success: true, message: '导出并压缩成功', archivePath };
  } catch (err) {
    console.error('导出失败：', err);
    return { success: false, message: '导出失败：' + err.message };
  }
});

// =============================================
// 4. IPC 处理：导入数据（支持 目录 / .zip / .spacerval）
// =============================================
ipcMain.handle('import-anime-data', async () => {
  try {
    // 1. 只允许选文件，不允许选文件夹
    // 2. 过滤器只显示后缀 .spacerval
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: '请选择要导入的 .spacerval 文件',
      buttonLabel: '导入',
      properties: ['openFile'],               // 仅能选文件
      filters: [
        { name: 'Spacerval 压缩包', extensions: ['spacerval'] }
      ]
    });
    if (canceled || filePaths.length === 0) {
      return { success: false, message: '用户取消导入操作' };
    }

    const selected = filePaths[0];
    // 将其解压到临时目录并调用 doImport()
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'anime-import-'));
    try {
      const zip = new AdmZip(selected);
      zip.extractAllTo(tmpRoot, /* overwrite */ true);
    } catch (zipErr) {
      console.error('解压失败：', zipErr);
      fs.rmdirSync(tmpRoot, { recursive: true });
      return { success: false, message: '解压失败：' + zipErr.message };
    }

    // 调用 doImport 并在完成后删除临时目录
    await doImport(tmpRoot);
    fs.rmdirSync(tmpRoot, { recursive: true });

    return { success: true, message: '导入成功' };
  } catch (err) {
    console.error('导入失败：', err);
    return { success: false, message: '导入失败：' + err.message };
  }
});

// =============================================
// 5. doExport(targetDir)：将数据库及媒体导出并压缩为 .spacerval
// =============================================
async function doExport(selectedDir) {
  // 1. 确保本地数据库存在
  const dbFilename = 'db.sqlite';
  const dbPath = path.join(app.getPath('userData'), dbFilename);
  if (!fs.existsSync(dbPath)) {
    throw new Error(`本地数据库不存在：${dbPath}`);
  }

  // 2. 在 selectedDir 下创建一个以 timestamp 命名的子文件夹
  //    例如，如果 selectedDir="C:/Export/a"，假设 timestamp="20230531123456789"
  //    那么 workDir="C:/Export/a/20230531123456789"
  const timestamp = new Date().toISOString().replace(/[:\-T.Z]/g, '');
  const workDir = path.join(selectedDir, timestamp);
  mkdirp.sync(workDir);

  // 3. 在 workDir 下创建 media/covers 与 media/music 子目录
  const mediaDir = path.join(workDir, 'media');
  const coverDir = path.join(mediaDir, 'covers');
  const musicDir = path.join(mediaDir, 'music');
  [mediaDir, coverDir, musicDir].forEach(dir => {
    if (!fs.existsSync(dir)) mkdirp.sync(dir);
  });

  // 4. 通过 TypeORM 读取所有条目
  const repo = AppDataSource.getRepository('AnimeEntry');
  const rows = await repo.find();

  // 5. 计算文件哈希的辅助函数（用于文件去重并生成固定命名）
  function hashFile(filepath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const rs = fs.createReadStream(filepath);
      rs.on('error', reject);
      rs.on('data', chunk => hash.update(chunk));
      rs.on('end', () => {
        const fullHex = hash.digest('hex');
        resolve(fullHex.slice(0, 16)); // 取前16位
      });
    });
  }

  // 6. 拷贝媒体文件并返回相对路径（相对 workDir）
  async function copyMediaFile(srcFile, dstDir) {
    if (!srcFile) return null;
    const trimmed = srcFile.trim();
    if (!fs.existsSync(trimmed)) {
      console.warn(`警告：找不到媒体文件，忽略：${trimmed}`);
      return null;
    }
    const ext = path.extname(trimmed).toLowerCase();
    const hash = await hashFile(trimmed);
    const filename = `${hash}${ext}`;
    const dstFile = path.join(dstDir, filename);
    if (!fs.existsSync(dstFile)) {
      fs.copyFileSync(trimmed, dstFile);
    }
    // 返回 workDir 下的相对路径，比如 "media/music/abcdef1234.mp3"
    return path.join('media', path.basename(dstDir), filename).replace(/\\/g, '/');
  }

  // 7. 遍历所有数据库记录，拷贝封面与音乐，收集到 entriesMeta 数组
  const entriesMeta = [];
  for (const row of rows) {
    // 7.1 拷贝封面
    let coverRel = null;
    if (row.coverPath && row.coverPath.trim()) {
      const cp = row.coverPath.trim();
      if (fs.existsSync(cp)) {
        coverRel = await copyMediaFile(cp, coverDir);
        console.log(`→ 封面复制成功，相对路径：${coverRel}`);
      } else {
        console.warn(`→ 封面文件不存在，跳过：${cp}`);
      }
    }

    // 7.2 拷贝音乐
    let musicRel = null;
    if (row.music && row.music.trim()) {
      const mp = row.music.trim();
      if (fs.existsSync(mp)) {
        musicRel = await copyMediaFile(mp, musicDir);
        console.log(`→ 音乐复制成功，相对路径：${musicRel}`);
      } else {
        console.warn(`→ 音乐文件不存在，跳过：${mp}`);
      }
    }

    // 7.3 解析 JSON 字段：altTitles、tags、links
    let altArr = [], tagsArr = [], linksArr = [];
    try { altArr = JSON.parse(row.altTitles || '[]'); } catch { altArr = []; }
    try { tagsArr = JSON.parse(row.tags || '[]'); } catch { tagsArr = []; }
    try { linksArr = JSON.parse(row.links || '[]'); } catch { linksArr = []; }

    // 7.4 将本条数据收集到 entriesMeta
    entriesMeta.push({
      oldId: row.id,
      title: row.title,
      altTitles: altArr,
      coverRelativePath: coverRel,  // 可能为 null 或 "media/covers/xxxx.png"
      tags: tagsArr,
      links: linksArr,
      musicRelativePath: musicRel,  // 可能为 null 或 "media/music/xxxx.mp3"
      description: row.description || ''
    });
  }

  // 8. 在 workDir 下写入 entries.json
  const entriesJsonPath = path.join(workDir, 'entries.json');
  fs.writeFileSync(entriesJsonPath, JSON.stringify(entriesMeta, null, 2), 'utf-8');

  // 9. 在 workDir 下写入 manifest.json
  const manifest = {
    exportTime: new Date().toISOString(),
    appVersion: app.getVersion(),
    sourceDatabase: dbFilename,
    totalEntries: entriesMeta.length,
    totalCoverFiles: fs.existsSync(coverDir) ? fs.readdirSync(coverDir).length : 0,
    totalMusicFiles: fs.existsSync(musicDir) ? fs.readdirSync(musicDir).length : 0,
    hashAlgorithm: "SHA256-16hex",
    notes: "导入时会自动为冲突 ID 指派新 ID，媒体文件会复制到应用数据目录。"
  };
  const manifestJsonPath = path.join(workDir, 'manifest.json');
  fs.writeFileSync(manifestJsonPath, JSON.stringify(manifest, null, 2), 'utf-8');

  // 10. 在 workDir 下写入 README.txt
  const readmeContent = `
导出包说明
===========
1. 目录结构：
   ├── manifest.json       # 导出元信息
   ├── entries.json        # 所有 anime_entries 条目的元数据
   ├── media/
   │   ├── covers/         # 封面图片 (哈希命名)
   │   └── music/          # 音频文件 (哈希命名)
   └── README.txt          # 本说明

2. 导入方式：
   使用本应用的“导入”功能，选择此目录中的 .spacerval 文件即可自动导入。
  `.trim();
  fs.writeFileSync(path.join(workDir, 'README.txt'), readmeContent, 'utf-8');

  // 11. 准备把 workDir 子文件夹压缩成 [selectedDir]/[timestamp].spacerval
  const archiveFilename = `${timestamp}.spacerval`;
  const archivePath = path.join(selectedDir, archiveFilename);

  // 12. 调用 ZIP 工具，将 workDir 整个目录压缩到 archivePath
  await zipDirectory(workDir, archivePath);
  console.log(`→ 已生成压缩包：${archivePath}`);

  // 13. 压缩完成后，删除 workDir 文件夹（及其内容），只保留 archivePath
  //    fs.rmdirSync 可以递归删除整个目录
  fs.rmdirSync(workDir, { recursive: true });

  // 14. 返回压缩包的绝对路径，供前端调用方使用
  return archivePath;
}


// =============================================
// 6. zipDirectory(sourceDir, outPath)：打包成 ZIP
// =============================================
function zipDirectory(sourceDir, outPath) {
  return new Promise((resolve, reject) => {
    // 创建写入流，将压缩数据写入指定文件
    const output = fs.createWriteStream(outPath);
    // archiver 模块，使用 zip 格式，并设置压缩级别
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    // 监听完成事件
    output.on('close', () => {
      console.log(`压缩完成，总大小：${archive.pointer()} 字节`);
      resolve();
    });

    // 监听错误事件
    archive.on('error', err => reject(err));

    // 管道：把 archive 数据写入 output
    archive.pipe(output);
    // 将 sourceDir 的内容全部添加到压缩包
    archive.directory(sourceDir, false);
    // 告诉 archiver 完成
    archive.finalize();
  });
}


// —— show-in-folder ——
// 渲染进程可以调用此 IPC，让 Electron 在文件管理器（资源管理器）里显示并选中指定的文件
ipcMain.handle('show-in-folder', async (event, filePath) => {
  try {
    // 这里使用 Electron 提供的 shell.showItemInFolder 方法
    // 它会打开文件所在的文件夹，自动选中该文件
    await shell.showItemInFolder(filePath);
    return { success: true };
  } catch (err) {
    console.error('在文件管理器中显示文件失败：', err);
    return { success: false, message: err.message };
  }
});


// =============================================
// 7. doImport(importDir)：将解压或文件夹内容导入数据库
// =============================================
async function doImport(importDir) {
  // 7.1 本地 SQLite 数据库路径
  const dbFilename = 'db.sqlite';
  const dbPath = path.join(app.getPath('userData'), dbFilename);
  // 假设 AppDataSource 已经初始化并同步过一次表结构

  // 7.2 读取 manifest.json 和 entries.json
  const manifestPath = path.join(importDir, 'manifest.json');
  const entriesJsonPath = path.join(importDir, 'entries.json');
  if (!fs.existsSync(manifestPath) || !fs.existsSync(entriesJsonPath)) {
    throw new Error('导入包结构不完整，请确保存在 manifest.json 和 entries.json');
  }
  let entries;
  try {
    entries = JSON.parse(fs.readFileSync(entriesJsonPath, 'utf-8'));
  } catch (e) {
    throw new Error('无法解析 entries.json：' + e.message);
  }

  // 7.3 确定本地媒体存储目录：%APPDATA%/anime-favorites/ 或 ~/.config/anime-favorites/
  let baseMediaDir;
  if (process.platform === 'win32') {
    baseMediaDir = path.join(app.getPath('appData'), 'anime-favorites');
  } else if (process.platform === 'darwin') {
    baseMediaDir = path.join(app.getPath('home'), 'Library', 'Application Support', 'anime-favorites');
  } else {
    const xdg = process.env.XDG_CONFIG_HOME || path.join(app.getPath('home'), '.config');
    baseMediaDir = path.join(xdg, 'anime-favorites');
  }
  const coverDirLocal = path.join(baseMediaDir, 'covers');
  const musicDirLocal = path.join(baseMediaDir, 'music');
  [baseMediaDir, coverDirLocal, musicDirLocal].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  // 7.4 TypeORM repository
  const repo = AppDataSource.getRepository('AnimeEntry');
  const idMap = {}; // oldId → newId

  // 7.5 辅助：复制媒体文件
  function importMediaFile(relPath, dstDir) {
    if (!relPath) return null;
    const srcFile = path.join(importDir, relPath);
    if (!fs.existsSync(srcFile)) {
      console.warn(`警告：导入包中缺少媒体：${srcFile}`);
      return null;
    }
    // 直接用源文件名（哈希 + ext），确保不冲突
    const filename = path.basename(relPath);
    const dstFile = path.join(dstDir, filename);
    if (!fs.existsSync(dstFile)) {
      fs.copyFileSync(srcFile, dstFile);
    }
    return dstFile; // 返回绝对路径
  }

  // 7.6 遍历每条记录，插入到数据库
  for (const entry of entries) {
    // 7.6.1 复制封面
    const coverAbs = importMediaFile(entry.coverRelativePath, coverDirLocal);

    // 7.6.2 复制音乐
    const musicAbs = importMediaFile(entry.musicRelativePath, musicDirLocal);

    // 7.6.3 准备要插入的对象
    const toInsert = {
      title: entry.title,
      // altTitles、tags、links 都存为 JSON 字符串
      altTitles: JSON.stringify(entry.altTitles || []),
      coverPath: coverAbs || '',
      tags: JSON.stringify(entry.tags || []),
      links: JSON.stringify(entry.links || []),
      music: musicAbs || '',
      description: entry.description || ''
    };

    // 7.6.4 保存并记录新旧 ID 对应
    const saved = await repo.save(toInsert);
    idMap[entry.oldId] = saved.id;
    console.log(`已导入 ID=${entry.oldId} → 新 ID=${saved.id}`);
  }

  console.log('全部导入完成，oldId→newId 映射：', idMap);
}

// =============================================
// 8. 其它已有 IPC 逻辑：裁剪图片、导入音乐、CRUD 操作等
// =============================================

// 8.1 选择本地封面图片
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: '选择封面图片',
    filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg'] }],
    properties: ['openFile']
  });
  if (canceled) return null;
  return filePaths[0];
});

// 8.2 保存裁剪后图片
ipcMain.handle('image:saveCropped', async (event, { dataURL, filename }) => {
  try {
    const base64Data = dataURL.replace(/^data:image\/[a-z]+;base64,/, '');
    const savePath = path.join(app.getPath('userData'), 'covers');
    if (!fs.existsSync(savePath)) {
      fs.mkdirSync(savePath, { recursive: true });
    }
    const filePath = path.join(savePath, filename);
    console.log('保存图片到:', filePath);
    fs.writeFileSync(filePath, base64Data, 'base64');
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

// 8.3 选择音乐文件并导入
ipcMain.handle('dialog:openMusic', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: '选择背景音乐',
    filters: [{ name: '音频文件', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac'] }],
    properties: ['openFile']
  });
  if (canceled) return null;
  return filePaths[0];
});

ipcMain.handle('music:import', async (event, srcPath) => {
  try {
    const musicDir = path.join(app.getPath('userData'), 'music');
    if (!fs.existsSync(musicDir)) {
      fs.mkdirSync(musicDir, { recursive: true });
    }
    // 用时间戳 + 原文件名避免冲突
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

// 8.4 数据库 CRUD 操作：saveEntry, getEntries, getEntryById, deleteEntry, updateEntry, getAllTags
ipcMain.handle('db:saveEntry', async (event, entry) => {
  const repo = AppDataSource.getRepository('AnimeEntry');
  const newEntry = repo.create(entry);
  await repo.save(newEntry);
  console.log('保存条目成功:', newEntry);
  return newEntry;
});

ipcMain.handle('db:getEntries', async () => {
  const repo = AppDataSource.getRepository('AnimeEntry');
  return await repo.find({ order: { id: 'DESC' } });
});

ipcMain.handle('get-entry-by-id', async (event, id) => {
  try {
    const repo = AppDataSource.getRepository('AnimeEntry');
    const entry = await repo.findOne({ where: { id } });
    if (entry) {
      console.log('获取条目成功:', { id: entry.id, title: entry.title, coverPath: entry.coverPath });
    } else {
      console.log('未找到条目，ID:', id);
    }
    return entry;
  } catch (error) {
    console.error('获取条目详情错误:', { id, errorMessage: error.message, stack: error.stack });
    return null;
  }
});

ipcMain.handle('db:deleteEntry', async (event, id) => {
  const repo = AppDataSource.getRepository('AnimeEntry');
  const entry = await repo.findOne({ where: { id } });
  if (entry && entry.coverPath) {
    try {
      await fs.promises.unlink(entry.coverPath);
    } catch (err) {
      console.error('删除图片失败:', err);
    }
  }
  await repo.delete(id);
  console.log('删除条目成功 id:', id);
  return true;
});

ipcMain.handle('db:updateEntry', async (event, entry) => {
  const repo = AppDataSource.getRepository('AnimeEntry');
  await repo.update(entry.id, entry);
  console.log('更新条目成功 id:', entry.id);
  return await repo.findOneBy({ id: entry.id });
});

ipcMain.handle('file:delete', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      console.log('已删除文件:', filePath);
    }
    return true;
  } catch (err) {
    console.error('删除文件失败:', filePath, err);
    return false;
  }
});

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

// 8.5 打开外部链接或文件
ipcMain.handle('open-external', async (event, url) => {
  try {
    if (url.startsWith('file://')) {
      const filePath = url.slice(7);
      if (fs.existsSync(filePath)) {
        await shell.openPath(filePath);
        return true;
      } else {
        console.error('文件不存在:', filePath);
        return false;
      }
    } else {
      await shell.openExternal(url);
      return true;
    }
  } catch (err) {
    console.error('打开链接失败:', url, err);
    return false;
  }
});

// =============================================
// 9. 应用关闭时退出
// =============================================
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
