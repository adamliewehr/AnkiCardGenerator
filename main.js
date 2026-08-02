const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Initialize electron-store
const Store = require('electron-store');
const store = new Store();

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  if (!app.isPackaged) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, 'client', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  // IPC Handlers for electron-store
  ipcMain.handle('get-store-value', (event, key) => {
    return store.get(key);
  });
  
  ipcMain.handle('set-store-value', (event, key, value) => {
    store.set(key, value);
    return true;
  });

  // Start the Express backend
  require('./server/app.js');

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
