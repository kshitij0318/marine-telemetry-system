export interface ElectronAPI {
  saveMission: (fileName: string, csvData: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  loadMission: () => Promise<{ success: boolean; data?: string; fileName?: string; canceled?: boolean; error?: string }>;
  loadConfig: () => Promise<{ success: boolean; data?: any; error?: string }>;
  saveConfig: (configData: any) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
