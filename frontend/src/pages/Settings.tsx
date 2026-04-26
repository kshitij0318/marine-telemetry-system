import React from 'react';
import { Card } from '../app/components/ui/card';
import { useTheme } from '../contexts/ThemeContext';
import { useTelemetry } from '../contexts/TelemetryContext';
import { Settings as SettingsIcon, Monitor, Bell, Database, Shield } from 'lucide-react';
import { Switch } from '../app/components/ui/switch';
import { Button } from '../app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../app/components/ui/select';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  // Connection is strictly live now
  const [notifications, setNotifications] = React.useState(true);
  const [autoReconnect, setAutoReconnect] = React.useState(true);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-marine-text">Settings</h2>
        <p className="text-marine-text-secondary mt-1">Configure your telemetry system</p>
      </div>

      {/* Theme Settings */}
      <Card className="bg-marine-surface border-marine-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Monitor className="w-5 h-5 text-marine-accent" />
          <h3 className="text-lg font-semibold text-marine-text">Appearance</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-marine-text-secondary mb-2 block">Theme</label>
            <Select value={theme} onValueChange={(value: any) => setTheme(value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="marine-dark">Marine Dark</SelectItem>
                <SelectItem value="light">Light Mode</SelectItem>
                <SelectItem value="tactical">Tactical Mode</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div
              className="p-4 rounded-lg border-2 cursor-pointer transition-all"
              style={{
                backgroundColor: '#0a1628',
                borderColor: theme === 'marine-dark' ? '#00d9ff' : '#1a2d47',
              }}
              onClick={() => setTheme('marine-dark')}
            >
              <div className="text-xs text-center" style={{ color: '#e8f4f8' }}>Marine Dark</div>
              <div className="mt-2 h-8 rounded" style={{ backgroundColor: '#0f1e33' }} />
            </div>
            <div
              className="p-4 rounded-lg border-2 cursor-pointer transition-all"
              style={{
                backgroundColor: '#f5f7fa',
                borderColor: theme === 'light' ? '#0066cc' : '#e0e6ed',
              }}
              onClick={() => setTheme('light')}
            >
              <div className="text-xs text-center" style={{ color: '#1a2d47' }}>Light Mode</div>
              <div className="mt-2 h-8 rounded" style={{ backgroundColor: '#ffffff' }} />
            </div>
            <div
              className="p-4 rounded-lg border-2 cursor-pointer transition-all"
              style={{
                backgroundColor: '#000000',
                borderColor: theme === 'tactical' ? '#00ff41' : '#1a3d1a',
              }}
              onClick={() => setTheme('tactical')}
            >
              <div className="text-xs text-center" style={{ color: '#00ff41' }}>Tactical Mode</div>
              <div className="mt-2 h-8 rounded" style={{ backgroundColor: '#0a0a0a' }} />
            </div>
          </div>
        </div>
      </Card>

      {/* Connection Settings */}
      <Card className="bg-marine-surface border-marine-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-5 h-5 text-marine-accent" />
          <h3 className="text-lg font-semibold text-marine-text">Connection</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-marine-text">Connection Mode</div>
              <div className="text-xs text-marine-text-secondary">
                Connected to live hardware WebSocket stream
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-green-400 font-medium">LIVE</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-marine-border">
            <div>
              <div className="text-sm font-medium text-marine-text">Auto Reconnect</div>
              <div className="text-xs text-marine-text-secondary">Automatically reconnect on connection loss</div>
            </div>
            <Switch checked={autoReconnect} onCheckedChange={setAutoReconnect} />
          </div>
          <div className="pt-4 border-t border-marine-border">
            <div className="text-sm font-medium text-marine-text mb-2">WebSocket Server</div>
            <div className="p-3 bg-marine-dark rounded-lg border border-marine-border font-mono text-sm text-marine-accent">
              ws://localhost:8080/telemetry
            </div>
          </div>
        </div>
      </Card>

      {/* Notifications */}
      <Card className="bg-marine-surface border-marine-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-marine-accent" />
          <h3 className="text-lg font-semibold text-marine-text">Notifications</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-marine-text">Enable Notifications</div>
              <div className="text-xs text-marine-text-secondary">Receive alerts for sensor events</div>
            </div>
            <Switch checked={notifications} onCheckedChange={setNotifications} />
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-marine-border">
            <div>
              <div className="text-sm font-medium text-marine-text">Sound Alerts</div>
              <div className="text-xs text-marine-text-secondary">Play sound for critical alerts</div>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-marine-border">
            <div>
              <div className="text-sm font-medium text-marine-text">Radar Threat Alerts</div>
              <div className="text-xs text-marine-text-secondary">Alert on obstacle detection</div>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </Card>

      {/* Security */}
      <Card className="bg-marine-surface border-marine-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-marine-accent" />
          <h3 className="text-lg font-semibold text-marine-text">Security</h3>
        </div>
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-marine-text mb-2">API Key</div>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-marine-dark rounded-lg border border-marine-border font-mono text-sm text-marine-text-secondary">
                ••••••••••••••••••••••••••••
              </div>
              <Button variant="outline">Regenerate</Button>
            </div>
          </div>
          <div className="pt-4 border-t border-marine-border">
            <div className="text-sm font-medium text-marine-text mb-2">Session Timeout</div>
            <Select defaultValue="30">
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* System Info */}
      <Card className="bg-marine-surface border-marine-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <SettingsIcon className="w-5 h-5 text-marine-accent" />
          <h3 className="text-lg font-semibold text-marine-text">System Information</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-marine-text-secondary mb-1">Version</div>
            <div className="text-sm font-mono text-marine-text">v2.5.1</div>
          </div>
          <div>
            <div className="text-xs text-marine-text-secondary mb-1">Build</div>
            <div className="text-sm font-mono text-marine-text">2026.03.06</div>
          </div>
          <div>
            <div className="text-xs text-marine-text-secondary mb-1">Environment</div>
            <div className="text-sm font-mono text-marine-text">Development</div>
          </div>
          <div>
            <div className="text-xs text-marine-text-secondary mb-1">Uptime</div>
            <div className="text-sm font-mono text-marine-text">12h 34m</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
