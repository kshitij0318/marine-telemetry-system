const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveMission: (fileName, csvData) => ipcRenderer.invoke('save-mission', fileName, csvData),
  loadMission: () => ipcRenderer.invoke('load-mission'),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (configData) => ipcRenderer.invoke('save-config', configData)
});
