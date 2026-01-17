const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch')
const AbortController = require('abort-controller')
const { ProxyAgent } = require('proxy-agent');
const os = require('os');
const crypto = require('crypto');
const mkdirp = require('mkdirp');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const { DataSource } = require('typeorm');
const AnimeEntry = require(path.join(__dirname, 'database', 'entity', 'AnimeEntry'));

// AI配置加密相关 - 移除加密功能，使用明文存储
// 加密会导致配置无法正确读取，暂时移除

// 移除加密功能，直接返回原始配置
function encryptSensitiveInfo(config) {
  return config;
}

// 移除解密功能，直接返回原始配置
function decryptSensitiveInfo(config) {
  return config;
}

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
            connect-src 'self' http: https: ws: blob: file:;
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
    // 3.1 弹出"选择导出目录"对话框
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
   使用本应用的"导入"功能，选择此目录中的 .spacerval 文件即可自动导入。
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
  
  // 通知渲染进程数据已更新
  if (mainWindow) {
    mainWindow.webContents.send('data-updated');
  }

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
// 8. 其余 IPC：图片裁剪、音乐导入、CRUD 操作等
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
    // 参数验证
    if (!dataURL || typeof dataURL !== 'string') {
      throw new Error('无效的dataURL参数');
    }
    if (!filename || typeof filename !== 'string') {
      throw new Error('无效的filename参数');
    }
    
    // 验证并提取图片数据
    const dataUrlRegex = /^data:image\/([a-z]+);(base64|utf8),/;
    const match = dataURL.match(dataUrlRegex);
    if (!match) {
      throw new Error('dataURL格式无效，必须是有效的图片格式');
    }
    
    const imageType = match[1];
    const encoding = match[2];
    const imageData = dataURL.replace(dataUrlRegex, '');
    if (!imageData || imageData.length === 0) {
      throw new Error('图片数据为空');
    }
    
    // 处理不同编码格式的数据
    let binaryData;
    if (encoding === 'base64') {
      // 验证base64数据的有效性
      try {
        binaryData = Buffer.from(imageData, 'base64');
      } catch (base64Error) {
        throw new Error('无效的base64数据：' + base64Error.message);
      }
    } else if (encoding === 'utf8') {
      // UTF8编码直接转换为Buffer
      binaryData = Buffer.from(imageData);
    } else {
      throw new Error('不支持的编码格式：' + encoding);
    }
    
    // 确保保存目录存在
    const savePath = path.join(app.getPath('userData'), 'covers');
    try {
      if (!fs.existsSync(savePath)) {
        fs.mkdirSync(savePath, { recursive: true });
      }
    } catch (mkdirError) {
      throw new Error('无法创建保存目录：' + mkdirError.message);
    }
    
    // 构建完整文件路径
    const filePath = path.join(savePath, filename);
    
    // 写入文件，使用try-catch处理写入错误
    try {
      fs.writeFileSync(filePath, binaryData);
    } catch (writeError) {
      let errorMessage = '文件写入失败：';
      if (writeError.code === 'EACCES') {
        errorMessage += '权限不足，请检查目录权限';
      } else if (writeError.code === 'ENOSPC') {
        errorMessage += '磁盘空间不足';
      } else {
        errorMessage += writeError.message;
      }
      throw new Error(errorMessage);
    }
    
    // 验证文件是否成功创建
    if (!fs.existsSync(filePath)) {
      throw new Error('文件保存失败，无法验证文件存在');
    }
    
    // 验证文件大小
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      fs.unlinkSync(filePath); // 删除空文件
      throw new Error('文件保存失败，生成的文件为空');
    }
    
    return filePath;
  } catch (error) {
    console.error('保存图片失败：', error);
    console.error('错误堆栈：', error.stack);
    
    // 重新抛出更详细的错误信息，便于调试
    throw new Error(`图片保存失败：${error.message}`);
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

// 查询共现标签
ipcMain.handle('db:getRecommendedTags', async (event, tag) => {
  const repo = AppDataSource.getRepository('AnimeEntry');
  const entries = await repo.find();

  // 统计共现标签频率
  const tagFrequency = {};
  entries.forEach(entry => {
    if (entry.tags) {
      const tags = JSON.parse(entry.tags);
      if (tags.includes(tag)) {
        tags.forEach(otherTag => {
          if (otherTag !== tag) {
            tagFrequency[otherTag] = (tagFrequency[otherTag] || 0) + 1;
          }
        });
      }
    }
  });

  // 按频率排序并返回前 5 个推荐标签
  const recommendedTags = Object.entries(tagFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  return recommendedTags;
});

// 关闭应用
ipcMain.handle('app:close', () => {
  app.quit();
});

// 测试代理连接
ipcMain.handle('ai:testProxyConnection', async (event, proxyConfig) => {
  try {
    // 构建代理URL
    let proxyUrl;
    if (proxyConfig.proxyAuth) {
      proxyUrl = `${proxyConfig.proxyType}://${proxyConfig.proxyUsername}:${proxyConfig.proxyPassword}@${proxyConfig.proxyHost}:${proxyConfig.proxyPort}`;
    } else {
      proxyUrl = `${proxyConfig.proxyType}://${proxyConfig.proxyHost}:${proxyConfig.proxyPort}`;
    }
    
    // 创建代理agent
    const agent = new ProxyAgent(proxyUrl);
    
    // 使用AbortController实现超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 5000);
    
    // 测试连接到一个可靠的网站
    const response = await fetch('https://www.baidu.com', {
      method: 'GET',
      agent,
      signal: controller.signal
    });
    
    // 清除超时定时器
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`代理测试失败，响应状态: ${response.status}`);
    }
    
    return { success: true };
  } catch (error) {
    throw error;
  }
});

// 保存AI配置
ipcMain.handle('ai:saveConfig', async (event, config) => {
  try {
    const aiConfigPath = path.join(app.getPath('userData'), 'ai-config.json');
    
    // 加密敏感信息
    const encryptedConfig = encryptSensitiveInfo(config);
    
    // 添加配置版本控制和元数据
    const configWithMeta = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      data: encryptedConfig
    };
    
    await fs.promises.writeFile(aiConfigPath, JSON.stringify(configWithMeta, null, 2));
    return { success: true };
  } catch (error) {
    console.error('保存AI配置失败:', error);
    throw error;
  }
});

// 读取AI配置
ipcMain.handle('ai:loadConfig', async () => {
  try {
    const aiConfigPath = path.join(app.getPath('userData'), 'ai-config.json');
    await fs.promises.access(aiConfigPath);
    
    const fileContent = await fs.promises.readFile(aiConfigPath, 'utf8');
    const configWithMeta = JSON.parse(fileContent);
    
    let configData;
    if (configWithMeta.version === '1.0.0') {
      configData = configWithMeta.data;
    } else if (configWithMeta.version) {
      // 未来可以添加版本迁移逻辑
      console.warn(`未知的配置版本: ${configWithMeta.version}`);
      configData = configWithMeta.data;
    } else {
      // 兼容旧版本配置（没有版本信息的）
      configData = configWithMeta;
    }
    
    // 解密敏感信息
    return decryptSensitiveInfo(configData);
  } catch (error) {
    // 文件不存在时返回null，其他错误打印日志并返回null
    if (error.code !== 'ENOENT') {
      console.error('读取AI配置失败:', error);
    }
    return null;
  }
});

// 删除AI配置
ipcMain.handle('ai:deleteConfig', async () => {
  try {
    const aiConfigPath = path.join(app.getPath('userData'), 'ai-config.json');
    await fs.promises.access(aiConfigPath);
    await fs.promises.unlink(aiConfigPath);
    return { success: true };
  } catch (error) {
    // 文件不存在时仍返回成功，其他错误抛出
    if (error.code !== 'ENOENT') {
      console.error('删除AI配置失败:', error);
      throw error;
    }
    return { success: true };
  }
});

// 处理AI API请求
ipcMain.handle('ai:sendRequest', async (event, aiConfig, prompt, timeout = 30000) => {
  console.log('AI API请求处理开始:', aiConfig.provider, aiConfig.model);
  
  // 记录完整的AI配置，包括代理设置（隐藏敏感信息）
  console.log('完整AI配置:', JSON.stringify({
    provider: aiConfig.provider,
    endpoint: aiConfig.endpoint,
    useProxy: aiConfig.useProxy,
    proxyType: aiConfig.proxyType,
    proxyHost: aiConfig.proxyHost,
    proxyPort: aiConfig.proxyPort,
    proxyAuth: aiConfig.proxyAuth
  }, null, 2));
  
  try {
    const provider = aiConfig.provider || 'openai';
    
    // 构建基础请求配置
    const requestConfig = {
      url: aiConfig.endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    // 构建请求体
    let requestBody;
    
    switch (provider) {
      case 'gemini':
        // Google Gemini API格式
        requestConfig.headers['x-goog-api-key'] = aiConfig.apiKey;
        requestBody = {
          contents: [
            {
              parts: [
                {
                  text: (aiConfig.systemPrompt || '你是一个专业、严谨的动漫信息助手，必须提供真实、准确、可靠的信息，帮助用户填写动漫相关信息。你必须：1. 只提供经过验证的真实信息；2. 不虚构或猜测任何内容；3. 使用客观、准确的语言；4. 确保所有信息来源可靠；5. 避免产生幻觉或错误信息。') + '\n\n' + prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: aiConfig.temperature || 0.7,
            maxOutputTokens: aiConfig.maxTokens || 2000
          }
        };
        break;
        
      case 'baidu':
        // 百度千帆API格式
        requestConfig.headers['Authorization'] = `Bearer ${aiConfig.apiKey}`;
        requestBody = {
          model: aiConfig.model,
          messages: [
            {
              role: 'system',
              content: aiConfig.systemPrompt || '你是一个专业、严谨的动漫信息助手，必须提供真实、准确、可靠的信息，帮助用户填写动漫相关信息。你必须：1. 只提供经过验证的真实信息；2. 不虚构或猜测任何内容；3. 使用客观、准确的语言；4. 确保所有信息来源可靠；5. 避免产生幻觉或错误信息。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: aiConfig.temperature || 0.7,
          max_tokens: aiConfig.maxTokens || 2000
        };
        break;
        
      case 'doubao':
        // 火山引擎豆包API格式
        requestConfig.headers['Authorization'] = `Bearer ${aiConfig.apiKey}`;
        // 组合systemPrompt和prompt作为input
        const combinedInput = (aiConfig.systemPrompt || '你是一个专业、严谨的动漫信息助手，必须提供真实、准确、可靠的信息，帮助用户填写动漫相关信息。你必须：1. 只提供经过验证的真实信息；2. 不虚构或猜测任何内容；3. 使用客观、准确的语言；4. 确保所有信息来源可靠；5. 避免产生幻觉或错误信息。') + '\n\n' + prompt;
        requestBody = {
          model: aiConfig.model,
          input: combinedInput
        };
        break;
        
      default:
        // OpenAI/Anthropic标准格式
        requestConfig.headers['Authorization'] = `Bearer ${aiConfig.apiKey}`;
        requestBody = {
          model: aiConfig.model,
          messages: [
            {
              role: 'system',
              content: aiConfig.systemPrompt || '你是一个专业的动漫信息助手，帮助用户填写动漫相关信息'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: aiConfig.temperature || 0.7,
          max_tokens: aiConfig.maxTokens || 2000
        };
        break;
    }
    
    // 创建AbortController用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);
    
    // 记录请求配置（隐藏敏感信息）
    const logHeaders = { ...requestConfig.headers };
    for (const key in logHeaders) {
      if (key.toLowerCase().includes('key') || key.toLowerCase().includes('token') || key.toLowerCase().includes('authorization')) {
        logHeaders[key] = logHeaders[key].substring(0, 10) + '...';
      }
    }
    console.log('发送AI请求到:', requestConfig.url);
    console.log('请求头:', logHeaders);
    console.log('请求体:', JSON.stringify(requestBody, null, 2));
    
    // 构建fetch选项
    const fetchOptions = {
      method: requestConfig.method,
      headers: requestConfig.headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    };
    
    // 添加代理配置（如果启用）
    // 将proxyPort转换为字符串，处理null或undefined的情况
    const proxyPortStr = aiConfig.proxyPort !== null && aiConfig.proxyPort !== undefined ? String(aiConfig.proxyPort) : '';
    
    console.log('代理配置检查:', {
      useProxy: aiConfig.useProxy,
      proxyHost: aiConfig.proxyHost,
      proxyPort: aiConfig.proxyPort,
      proxyPortStr: proxyPortStr,
      meetsCriteria: aiConfig.useProxy && aiConfig.proxyHost && proxyPortStr
    });
    
    if (aiConfig.useProxy && aiConfig.proxyHost && proxyPortStr) {
      let proxyUrl;
      if (aiConfig.proxyAuth) {
        // 隐藏代理密码
        proxyUrl = `${aiConfig.proxyType}://${aiConfig.proxyUsername}:******@${aiConfig.proxyHost}:${proxyPortStr}`;
        // 实际使用的代理URL（包含密码）
        const actualProxyUrl = `${aiConfig.proxyType}://${aiConfig.proxyUsername}:${aiConfig.proxyPassword}@${aiConfig.proxyHost}:${proxyPortStr}`;
        const agent = new ProxyAgent(actualProxyUrl);
        fetchOptions.agent = agent;
      } else {
        proxyUrl = `${aiConfig.proxyType}://${aiConfig.proxyHost}:${proxyPortStr}`;
        const agent = new ProxyAgent(proxyUrl);
        fetchOptions.agent = agent;
      }
      
      console.log('构建代理URL:', proxyUrl);
      console.log('代理已添加到请求选项中');
    } else {
      console.log('未使用代理，条件不满足');
    }
    
    // 发送请求
    const response = await fetch(requestConfig.url, fetchOptions);
    
    // 清除超时定时器
    clearTimeout(timeoutId);
    
    console.log('AI请求响应状态:', response.status, response.statusText);
    
    // 检查响应状态
    if (!response.ok) {
      const responseText = await response.text();
      console.error('AI API错误响应:', responseText);
      throw new Error(`API请求失败: ${response.status} ${response.statusText}\n响应内容: ${responseText}`);
    }
    
    // 解析响应体
    const responseData = await response.json();
    console.log('AI API原始响应:', responseData);
    
    // 根据提供商解析响应
    let content = '';
    
    switch (provider) {
      case 'gemini':
        // 解析Google Gemini响应
        if (responseData.candidates && responseData.candidates.length > 0) {
          if (responseData.candidates[0].content && responseData.candidates[0].content.parts) {
            for (const part of responseData.candidates[0].content.parts) {
              if (part.text) {
                content += part.text;
              }
            }
          }
        }
        break;
        
      case 'baidu':
        // 解析百度千帆响应
        if (responseData.choices && responseData.choices.length > 0) {
          if (responseData.choices[0].message && responseData.choices[0].message.content) {
            content = responseData.choices[0].message.content;
          }
        }
        break;
        
      case 'doubao':
        // 解析火山引擎豆包响应
        if (responseData.output && responseData.output.length > 0) {
          // 找到assistant角色的message
          const assistantMessage = responseData.output.find(item => 
            item.type === 'message' && item.role === 'assistant'
          );
          if (assistantMessage && assistantMessage.content && assistantMessage.content.length > 0) {
            // 提取text内容
            const textContent = assistantMessage.content.find(contentItem => 
              contentItem.type === 'output_text'
            );
            if (textContent && textContent.text) {
              content = textContent.text;
            }
          }
        }
        break;
        
      default:
        // 解析OpenAI/Anthropic等响应
        if (responseData.choices && responseData.choices.length > 0) {
          if (responseData.choices[0].message && responseData.choices[0].message.content) {
            content = responseData.choices[0].message.content;
          }
        }
        break;
    }
    
    console.log('提取的AI响应内容:', content);
    
    // 解析JSON内容
    try {
      return JSON.parse(content);
    } catch (error) {
      console.error('JSON解析错误:', error, '响应内容:', content);
      throw new Error(`响应内容不是有效的JSON格式: ${content.substring(0, 100)}...`);
    }
    
  } catch (error) {
    console.error('AI API请求处理错误:', error);
    throw error;
  }
});
