import React, { createContext, useContext, useState, useEffect } from 'react';

interface ConfigState {
  notificationsEnabled: boolean;
  soundAlerts: boolean;
  radarAlerts: boolean;
  sessionTimeout: string;
  apiKey: string;
}

interface SettingsContextType {
  config: ConfigState;
  updateConfig: (updates: Partial<ConfigState>) => void;
  generateNewApiKey: () => void;
}

const DEFAULT_CONFIG: ConfigState = {
  notificationsEnabled: true,
  soundAlerts: true,
  radarAlerts: true,
  sessionTimeout: '30',
  apiKey: 'MTS-DEV-' + Math.random().toString(36).substring(2, 10).toUpperCase()
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ConfigState>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadInitialConfig = async () => {
      if (window.electronAPI) {
        const res = await window.electronAPI.loadConfig();
        if (res.success && res.data) {
          setConfig({ ...DEFAULT_CONFIG, ...res.data });
        }
      } else {
        const saved = localStorage.getItem('marine_settings_config');
        if (saved) {
          setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(saved) });
        }
      }
      setIsLoaded(true);
    };
    loadInitialConfig();
  }, []);

  const updateConfig = (updates: Partial<ConfigState>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      if (window.electronAPI) {
        window.electronAPI.saveConfig(newConfig);
      } else {
        localStorage.setItem('marine_settings_config', JSON.stringify(newConfig));
      }
      return newConfig;
    });
  };

  const generateNewApiKey = () => {
    const newKey = 'MTS-' + Math.random().toString(36).substring(2, 12).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
    updateConfig({ apiKey: newKey });
  };

  if (!isLoaded) return null;

  return (
    <SettingsContext.Provider value={{ config, updateConfig, generateNewApiKey }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
}
