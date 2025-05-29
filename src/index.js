const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const { Database } = require('sqlite3')

let db

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../../preload.js'),
      contextIsolation: true,
      sandbox: false
    }
  })

  win.loadFile(path.join(__dirname, '../../src/renderer/index.html'))
}

app.whenReady().then(() => {
  // Initialize database
  db = new Database(path.join(app.getPath('userData'), 'anime-entries.db'))
  
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      altTitles TEXT,
      coverPath TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Database IPC handlers
ipcMain.handle('db:getEntries', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM entries ORDER BY createdAt DESC', (err, rows) => {
      if (err) reject(err)
      else resolve(rows)
    })
  })
})

ipcMain.handle('db:saveEntry', async (event, entry) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO entries (title, altTitles, coverPath) VALUES (?, ?, ?)',
      [entry.title, JSON.stringify(entry.altTitles), entry.coverPath],
      function(err) {
        if (err) reject(err)
        else resolve(this.lastID)
      }
    )
  })
})

ipcMain.handle('db:deleteEntry', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM entries WHERE id = ?', [id], function(err) {
      if (err) reject(err)
      else resolve(this.changes)
    })
  })
})

ipcMain.handle('db:updateEntry', async (event, entry) => {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE entries SET title = ?, altTitles = ?, coverPath = ? WHERE id = ?',
      [entry.title, JSON.stringify(entry.altTitles), entry.coverPath, entry.id],
      function(err) {
        if (err) reject(err)
        else resolve(this.changes)
      }
    )
  })
})

// File dialog handlers
ipcMain.handle('dialog:openFile', async () => {
  const { filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg'] }]
  })
  return filePaths[0]
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
