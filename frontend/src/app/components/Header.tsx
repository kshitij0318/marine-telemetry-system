import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useTelemetry } from '../../contexts/TelemetryContext';
import { Sun, Moon, Target, Wifi, WifiOff, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from './ui/button';
import { ParticleButton } from './ParticleButton';
import { useFullscreen } from '../../hooks/useFullscreen';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { isConnected } = useTelemetry();
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

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
        {/* Theme Toggle with Particles */}
        <ParticleButton onClick={cycleTheme} className="text-marine-text-secondary hover:text-marine-text">
          {getThemeIcon()}
          <span className="ml-2 text-sm capitalize">{theme.replace('-', ' ')}</span>
        </ParticleButton>

        {/* Fullscreen Toggle */}
        <Button
          size="icon"
          variant="ghost"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen'}
          className="w-9 h-9 text-marine-text-secondary hover:text-marine-accent border border-marine-border hover:border-marine-accent transition-colors"
        >
          {isFullscreen
            ? <Minimize2 className="w-4 h-4" />
            : <Maximize2 className="w-4 h-4" />
          }
        </Button>
      </div>
    </header>
  );
}
