const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const RELEASE_DIR = path.join(__dirname, '../release');
const CONFIG_FILE = path.join(RELEASE_DIR, 'settings.json');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load the Vite dev server for local development
  // In a real production build, this would load the static index.html
  win.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173');
}

app.whenReady().then(() => {
  // Ensure release directory exists
  if (!fs.existsSync(RELEASE_DIR)) {
    fs.mkdirSync(RELEASE_DIR, { recursive: true });
  }

  // --- IPC Handlers for Mission Files ---

  ipcMain.handle('save-mission', async (event, fileName, csvData) => {
    try {
      // Security: ensure no path traversal in filename
      const safeName = path.basename(fileName);
      const targetPath = path.join(RELEASE_DIR, safeName);
      
      fs.writeFileSync(targetPath, csvData, 'utf-8');
      return { success: true, path: targetPath };
    } catch (error) {
      console.error('Failed to save mission:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('load-mission', async (event) => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Load Mission CSV',
        defaultPath: RELEASE_DIR,
        filters: [
          { name: 'CSV Files', extensions: ['csv'] }
        ],
        properties: ['openFile']
      });

      if (canceled || filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const csvData = fs.readFileSync(filePaths[0], 'utf-8');
      return { success: true, data: csvData, fileName: path.basename(filePaths[0]) };
    } catch (error) {
      console.error('Failed to load mission:', error);
      return { success: false, error: error.message };
    }
  });

  // --- IPC Handlers for Settings Persistence ---

  ipcMain.handle('load-config', async () => {
    try {
      if (!fs.existsSync(CONFIG_FILE)) {
        return { success: true, data: null };
      }
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return { success: true, data: JSON.parse(data) };
    } catch (error) {
      console.error('Failed to load config:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('save-config', async (event, configData) => {
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(configData, null, 2), 'utf-8');
      return { success: true };
    } catch (error) {
      console.error('Failed to save config:', error);
      return { success: false, error: error.message };
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
