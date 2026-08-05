const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

// Configure autoUpdater to only notify (not download) to bypass macOS code-signing issues
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

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

  // Check for updates
  autoUpdater.checkForUpdates().catch(err => console.error("Update check failed:", err));

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `A new version of Anki Vocab Gen (${info.version}) is available!`,
      detail: 'Would you like to download it now?',
      buttons: ['Download', 'Later'],
      defaultId: 0
    }).then((result) => {
      if (result.response === 0) {
        shell.openExternal('https://github.com/adamliewehr/anki-vocab-cli/releases/latest');
      }
    });
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
