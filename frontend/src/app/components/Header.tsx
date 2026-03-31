import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useTelemetry } from '../../contexts/TelemetryContext';
import { Sun, Moon, Target, Wifi, WifiOff } from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { ParticleButton } from './ParticleButton';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { connectionMode, setConnectionMode, isConnected } = useTelemetry();

  const cycleTheme = () => {
    const themes = ['marine-dark', 'light', 'tactical'] as const;
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'marine-dark':
        return <Moon className="w-4 h-4" />;
      case 'light':
        return <Sun className="w-4 h-4" />;
      case 'tactical':
        return <Target className="w-4 h-4" />;
    }
  };

  return (
    <header className="sticky top-0 h-16 bg-marine-surface border-b border-marine-border flex items-center justify-between px-6 z-50">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold text-marine-text">Marine Telemetry System</h1>
        <div className="flex items-center space-x-2 text-sm">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500 animate-pulse" />
          )}
          <span className="text-marine-text-secondary">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Connection Mode Toggle */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-marine-text-secondary">Simulation</span>
          <Switch
            checked={connectionMode === 'live'}
            onCheckedChange={(checked) => setConnectionMode(checked ? 'live' : 'simulation')}
          />
          <span className="text-sm text-marine-text-secondary">Live</span>
        </div>

        {/* Theme Toggle with Particles */}
        <ParticleButton onClick={cycleTheme} className="text-marine-text-secondary hover:text-marine-text">
          {getThemeIcon()}
          <span className="ml-2 text-sm capitalize">{theme.replace('-', ' ')}</span>
        </ParticleButton>
      </div>
    </header>
  );
}
