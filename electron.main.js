const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const mkdirp = require('mkdirp');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const { DataSource } = require('typeorm');
const AnimeEntry = require(path.join(__dirname, 'database', 'entity', 'AnimeEntry'));

const isDev = !app.isPackaged;
let mainWindow = null;

// =============================================
// 1. TypeORM 数据源初始化
// =============================================
const AppDataSource = new DataSource({
  type: 'sqlite',
  database: path.join(app.getPath('userData'), 'db.sqlite'),
  entities: [AnimeEntry],
  synchronize: true, // 开发阶段使用，生产环境建议关闭并改用迁移
});

async function createWindow() {
  try {
    await AppDataSource.initialize();

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
        allowRunningInsecureContent: true
      }
    });

    mainWindow.setFullScreen(true);

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

app.whenReady().then(() => {
  createWindow();

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
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});


// =============================================
// 2. IPC: 在资源管理器中显示并选中文件 (.spacerval)
// =============================================
ipcMain.handle('show-in-folder', async (event, filePath) => {
  try {
    await shell.showItemInFolder(filePath);
    return { success: true };
  } catch (err) {
    console.error('在文件管理器中显示失败：', err);
    return { success: false, message: err.message };
  }
});


// =============================================
// 3. IPC: 导出数据（可选是否包含封面与音乐）
//    接收参数 { includeImages: boolean, includeMusic: boolean }
// =============================================
ipcMain.handle('export-anime-data', async (event, options) => {
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
    const selectedDir = filePaths[0];

    // 3.2 将选项合并，若无传参则默认都导出
    const { includeImages = true, includeMusic = true } = options || {};

    // 3.3 调用 doExport(exportDir, includeImages, includeMusic)
    const archivePath = await doExport(selectedDir, includeImages, includeMusic);
    return { success: true, message: '导出并压缩成功', archivePath };
  } catch (err) {
    console.error('导出失败：', err);
    return { success: false, message: '导出失败：' + err.message };
  }
});


// =============================================
// 4. doExport：导出数据库条目 + 可选媒体，并打包 .spacerval
//
// 参数说明：
//   selectedDir   - 用户选中的导出目录（绝对路径）
//   includeImages - 是否拷贝封面（true/false）
//   includeMusic  - 是否拷贝音乐（true/false）
// =============================================
async function doExport(selectedDir, includeImages, includeMusic) {
  // 4.1 本地数据库检查
  const dbFilename = 'db.sqlite';
  const dbPath = path.join(app.getPath('userData'), dbFilename);
  if (!fs.existsSync(dbPath)) {
    throw new Error(`本地数据库不存在：${dbPath}`);
  }

  // 4.2 在 selectedDir 下创建以 timestamp 命名的子文件夹 workDir
  const timestamp = new Date().toISOString().replace(/[:\-T.Z]/g, '');
  const workDir = path.join(selectedDir, timestamp);
  mkdirp.sync(workDir);

  // 4.3 在 workDir 下创建 media/covers 与 media/music 子目录
  const mediaDir = path.join(workDir, 'media');
  const coverDir = path.join(mediaDir, 'covers');
  const musicDir = path.join(mediaDir, 'music');
  if (includeImages && !fs.existsSync(coverDir)) mkdirp.sync(coverDir);
  if (includeMusic && !fs.existsSync(musicDir)) mkdirp.sync(musicDir);

  // 4.4 读取所有条目
  const repo = AppDataSource.getRepository('AnimeEntry');
  const rows = await repo.find();

  // 4.5 辅助：计算文件哈希
  function hashFile(filepath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const rs = fs.createReadStream(filepath);
      rs.on('error', reject);
      rs.on('data', chunk => hash.update(chunk));
      rs.on('end', () => {
        const fullHex = hash.digest('hex');
        resolve(fullHex.slice(0, 16));
      });
    });
  }

  // 4.6 辅助：拷贝媒体到目标目录并返回相对路径
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
    return path.join('media', path.basename(dstDir), filename).replace(/\\/g, '/');
  }

  // 4.7 遍历条目、拷贝封面/音乐（如果勾选），收集 metadata
  const entriesMeta = [];
  for (const row of rows) {
    // 4.7.1 处理封面
    let coverRel = null;
    if (includeImages && row.coverPath && row.coverPath.trim()) {
      const cp = row.coverPath.trim();
      if (fs.existsSync(cp)) {
        coverRel = await copyMediaFile(cp, coverDir);
        console.log(`→ 封面复制成功：${coverRel}`);
      } else {
        console.warn(`→ 封面文件不存在，跳过：${cp}`);
      }
    }

    // 4.7.2 处理音乐
    let musicRel = null;
    if (includeMusic && row.music && row.music.trim()) {
      const mp = row.music.trim();
      if (fs.existsSync(mp)) {
        musicRel = await copyMediaFile(mp, musicDir);
        console.log(`→ 音乐复制成功：${musicRel}`);
      } else {
        console.warn(`→ 音乐文件不存在，跳过：${mp}`);
      }
    }

    // 4.7.3 解析 JSON 字段：altTitles/tags/links
    let altArr = [], tagsArr = [], linksArr = [];
    try { altArr = JSON.parse(row.altTitles || '[]'); } catch { altArr = []; }
    try { tagsArr = JSON.parse(row.tags || '[]'); } catch { tagsArr = []; }
    try { linksArr = JSON.parse(row.links || '[]'); } catch { linksArr = []; }

    // 4.7.4 组装 metadata
    entriesMeta.push({
      oldId: row.id,
      title: row.title,
      altTitles: altArr,
      coverRelativePath: coverRel,   // 如果未勾选 或 文件不存在，则为 null
      tags: tagsArr,
      links: linksArr,
      musicRelativePath: musicRel,   // 如果未勾选 或 文件不存在，则为 null
      description: row.description || ''
    });
  }

  // 4.8 写入 entries.json
  const entriesJsonPath = path.join(workDir, 'entries.json');
  fs.writeFileSync(entriesJsonPath, JSON.stringify(entriesMeta, null, 2), 'utf-8');

  // 4.9 写入 manifest.json
  const manifest = {
    exportTime: new Date().toISOString(),
    appVersion: app.getVersion(),
    sourceDatabase: dbFilename,
    totalEntries: entriesMeta.length,
    totalCoverFiles: includeImages && fs.existsSync(coverDir) ? fs.readdirSync(coverDir).length : 0,
    totalMusicFiles: includeMusic && fs.existsSync(musicDir) ? fs.readdirSync(musicDir).length : 0,
    hashAlgorithm: "SHA256-16hex",
    notes: "导入时会自动为冲突 ID 指派新 ID，媒体文件会复制到应用数据目录。"
  };
  const manifestJsonPath = path.join(workDir, 'manifest.json');
  fs.writeFileSync(manifestJsonPath, JSON.stringify(manifest, null, 2), 'utf-8');

  // 4.10 写入 README.txt
  const readmeContent = `
导出包说明
===========
1. 目录结构：
   ├── manifest.json       # 导出元信息
   ├── entries.json        # 所有 anime_entries 条目的元数据
   ├── media/
   ${includeImages ? '  │   ├── covers/         # 封面图片 (如有导出)' : ''}
   ${includeMusic  ? '  │   └── music/          # 音频文件 (如有导出)' : ''}
   └── README.txt          # 本说明

2. 导入方式：
   使用本应用的“导入”功能，选择此目录中的 .spacerval 文件即可自动导入。
  `.trim();
  fs.writeFileSync(path.join(workDir, 'README.txt'), readmeContent, 'utf-8');

  // 4.11 压缩 workDir 子文件夹为 [selectedDir]/[timestamp].spacerval
  const archiveFilename = `${timestamp}.spacerval`;
  const archivePath = path.join(selectedDir, archiveFilename);
  await zipDirectory(workDir, archivePath);
  console.log(`→ 已生成压缩包：${archivePath}`);

  // 4.12 删除 workDir 文件夹（及其内容），只保留压缩包
  fs.rmdirSync(workDir, { recursive: true });

  return archivePath;
}


// =============================================
// 5. IPC: 导入数据（只选 .spacerval 文件）
// =============================================
ipcMain.handle('import-anime-data', async () => {
  try {
    // 5.1 弹出对话框，只能选 .spacerval 文件
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: '请选择要导入的 .spacerval 文件',
      buttonLabel: '导入',
      properties: ['openFile'],
      filters: [
        { name: 'Spacerval 压缩包', extensions: ['spacerval'] }
      ]
    });
    if (canceled || filePaths.length === 0) {
      return { success: false, message: '用户取消导入操作' };
    }

    const selected = filePaths[0];
    // 5.2 解压到临时目录
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'anime-import-'));
    try {
      const zip = new AdmZip(selected);
      zip.extractAllTo(tmpRoot, /* overwrite */ true);
    } catch (zipErr) {
      console.error('解压失败：', zipErr);
      fs.rmdirSync(tmpRoot, { recursive: true });
      return { success: false, message: '解压失败：' + zipErr.message };
    }

    // 5.3 调用 doImport(tmpRoot) 并返回结果
    const importResult = await doImport(tmpRoot);

    // 5.4 删除临时目录
    fs.rmdirSync(tmpRoot, { recursive: true });

    return importResult;
  } catch (err) {
    console.error('导入失败：', err);
    return { success: false, message: '导入失败：' + err.message };
  }
});


// =============================================
// 6. doImport(importDir)：将解压后的目录导入数据库
// =============================================
async function doImport(importDir) {
  // 6.1 检查 entries.json & manifest.json
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

  // 6.1.1 检查标题冲突
  const title = AppDataSource.getRepository('AnimeEntry');
  const existingTitles = (await title.find()).map(entry => entry.title);
  const conflictTitles = [];

  // 6.2 确定本地媒体存储目录（%APPDATA%/anime-favorites 或 ~/.config/anime-favorites）
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

  // 6.3 获取 TypeORM Repository
  const repo = AppDataSource.getRepository('AnimeEntry');
  const idMap = {}; // oldId -> newId

  // 6.4 辅助：复制媒体文件
  function importMediaFile(relPath, dstDir) {
    if (!relPath) return null;
    const srcFile = path.join(importDir, relPath);
    if (!fs.existsSync(srcFile)) {
      console.warn(`警告：导入包中缺少媒体：${srcFile}`);
      return null;
    }
    const filename = path.basename(relPath);
    const dstFile = path.join(dstDir, filename);
    if (!fs.existsSync(dstFile)) {
      fs.copyFileSync(srcFile, dstFile);
    }
    return dstFile;
  }

  // 6.5 依次插入每条记录
  for (const entry of entries) {
    // 6.5.0 检查标题冲突
    if (existingTitles.includes(entry.title)) {
      conflictTitles.push(entry.title);
      console.log(`跳过冲突标题: ${entry.title}`);
      continue;
    }

    // 6.5.1 复制封面
    const coverAbs = importMediaFile(entry.coverRelativePath, coverDirLocal);
    // 6.5.2 复制音乐
    const musicAbs = importMediaFile(entry.musicRelativePath, musicDirLocal);

    // 6.5.3 生成插入对象
    const toInsert = {
      title: entry.title,
      altTitles: JSON.stringify(entry.altTitles || []),
      coverPath: coverAbs || '',
      tags: JSON.stringify(entry.tags || []),
      links: JSON.stringify(entry.links || []),
      music: musicAbs || '',
      description: entry.description || ''
    };

    // 6.5.4 保存到数据库并记录映射
    const saved = await repo.save(toInsert);
    idMap[entry.oldId] = saved.id;
    console.log(`已导入 ID=${entry.oldId} → 新 ID=${saved.id}`);
  }

  console.log('全部导入完成，oldId→newId 映射：', idMap);
  
  // 6.6 返回导入结果
  return {
    success: true,
    importedCount: Object.keys(idMap).length, // 实际导入数量
    conflictTitles,
    message: conflictTitles.length > 0 
      ? `导入完成，跳过 ${conflictTitles.length} 个冲突条目`
      : '导入成功'
  };
}


// =============================================
// 7. zipDirectory：将 sourceDir 目录打包成 ZIP (.spacerval)
// =============================================
function zipDirectory(sourceDir, outPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    output.on('close', () => {
      console.log(`压缩完成，总大小：${archive.pointer()} 字节`);
      resolve();
    });
    archive.on('error', err => reject(err));

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}


// =============================================
// 8. 其余 IPC：图片裁剪、音乐导入、CRUD 操作等（保持不变）
// =============================================
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: '选择封面图片',
    filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg'] }],
    properties: ['openFile']
  });
  if (canceled) return null;
  return filePaths[0];
});
ipcMain.handle('image:saveCropped', async (event, { dataURL, filename }) => {
  try {
    const base64Data = dataURL.replace(/^data:image\/[a-z]+;base64,/, '');
    const savePath = path.join(app.getPath('userData'), 'covers');
    if (!fs.existsSync(savePath)) fs.mkdirSync(savePath, { recursive: true });
    const filePath = path.join(savePath, filename);
    fs.writeFileSync(filePath, base64Data, 'base64');
    if (!fs.existsSync(filePath)) throw new Error('文件保存失败');
    return filePath;
  } catch (error) {
    console.error('保存图片失败：', error);
    throw error;
  }
});
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
    if (!fs.existsSync(musicDir)) fs.mkdirSync(musicDir, { recursive: true });
    const fileName = `${Date.now()}_${path.basename(srcPath)}`;
    const destPath = path.join(musicDir, fileName);
    await fs.promises.copyFile(srcPath, destPath);
    return destPath;
  } catch (err) {
    console.error('音乐导入失败：', err);
    throw err;
  }
});

ipcMain.handle('db:saveEntry', async (event, entry) => {
  const repo = AppDataSource.getRepository('AnimeEntry');
  const newEntry = repo.create(entry);
  await repo.save(newEntry);
  return newEntry;
});
ipcMain.handle('db:getEntries', async () => {
  const repo = AppDataSource.getRepository('AnimeEntry');
  return await repo.find({ order: { id: 'DESC' } });
});
ipcMain.handle('get-entry-by-id', async (event, id) => {
  const repo = AppDataSource.getRepository('AnimeEntry');
  return await repo.findOne({ where: { id } });
});
ipcMain.handle('db:deleteEntry', async (event, id) => {
  const repo = AppDataSource.getRepository('AnimeEntry');
  const entry = await repo.findOne({ where: { id } });
  if (entry && entry.coverPath) {
    try { await fs.promises.unlink(entry.coverPath); } catch {}
  }
  await repo.delete(id);
  return true;
});
ipcMain.handle('db:updateEntry', async (event, entry) => {
  const repo = AppDataSource.getRepository('AnimeEntry');
  await repo.update(entry.id, entry);
  return await repo.findOneBy({ id: entry.id });
});
ipcMain.handle('file:delete', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
    return true;
  } catch {
    return false;
  }
});
ipcMain.handle('db:getAllTags', async () => {
  const repo = AppDataSource.getRepository('AnimeEntry');
  const entries = await repo.find();
  const allTags = entries.reduce((acc, entry) => {
    if (entry.tags) {
      const tags = JSON.parse(entry.tags);
      tags.forEach(tag => { if (!acc.includes(tag)) acc.push(tag); });
    }
    return acc;
  }, []);
  return allTags.sort();
});
ipcMain.handle('open-external', async (event, url) => {
  try {
    if (url.startsWith('file://')) {
      const filePath = url.slice(7);
      if (fs.existsSync(filePath)) {
        await shell.openPath(filePath);
        return true;
      } else {
        return false;
      }
    } else {
      await shell.openExternal(url);
      return true;
    }
  } catch {
    return false;
  }
});

// =============================================
// 9. 应用关闭时退出
// =============================================
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
