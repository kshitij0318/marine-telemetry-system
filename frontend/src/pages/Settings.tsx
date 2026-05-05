import React from 'react';
import { Card } from '../app/components/ui/card';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import { Settings as SettingsIcon, Monitor, Bell, Shield, Key } from 'lucide-react';
import { Switch } from '../app/components/ui/switch';
import { Button } from '../app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../app/components/ui/select';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { config, updateConfig, generateNewApiKey } = useSettings();
  const [showApiKey, setShowApiKey] = React.useState(false);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-marine-text">System Configuration</h2>
        <p className="text-marine-text-secondary mt-1">Manage global preferences and application settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appearance Settings */}
        <Card className="bg-marine-surface border-marine-border p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <Monitor className="w-5 h-5 text-marine-accent" />
            <h3 className="text-lg font-semibold text-marine-text">Appearance</h3>
          </div>
          <div className="space-y-6 flex-1">
            <div>
              <label className="text-sm font-medium text-marine-text mb-2 block">Application Theme</label>
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
          </div>
        </Card>

        {/* Notifications */}
        <Card className="bg-marine-surface border-marine-border p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-marine-accent" />
            <h3 className="text-lg font-semibold text-marine-text">Alerts & Notifications</h3>
          </div>
          <div className="space-y-6 flex-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-marine-text">Global Notifications</div>
                <div className="text-xs text-marine-text-secondary mt-1">Enable toast messages for system events</div>
              </div>
              <Switch 
                checked={config.notificationsEnabled} 
                onCheckedChange={(v) => updateConfig({ notificationsEnabled: v })} 
              />
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-marine-border">
              <div>
                <div className="text-sm font-medium text-marine-text">Sound Alerts</div>
                <div className="text-xs text-marine-text-secondary mt-1">Play audio cues for critical warnings</div>
              </div>
              <Switch 
                checked={config.soundAlerts} 
                onCheckedChange={(v) => updateConfig({ soundAlerts: v })} 
              />
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-marine-border">
              <div>
                <div className="text-sm font-medium text-marine-text">Radar Threat Tracking</div>
                <div className="text-xs text-marine-text-secondary mt-1">Highlight nearby obstacles automatically</div>
              </div>
              <Switch 
                checked={config.radarAlerts} 
                onCheckedChange={(v) => updateConfig({ radarAlerts: v })} 
              />
            </div>
          </div>
        </Card>

        {/* Security */}
        <Card className="bg-marine-surface border-marine-border p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-marine-accent" />
            <h3 className="text-lg font-semibold text-marine-text">Security & Access</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-marine-text-secondary" />
                <span className="text-sm font-medium text-marine-text">API Key Authorization</span>
              </div>
              <p className="text-xs text-marine-text-secondary mb-4">Used to authenticate with external services.</p>
              
              <div className="flex gap-2">
                <div className="flex-1 px-4 py-2 bg-marine-dark/50 rounded-lg border border-marine-border font-mono text-sm text-marine-accent flex items-center justify-between">
                  <span>{showApiKey ? config.apiKey : '••••••••••••••••••••••••••••'}</span>
                </div>
                <Button variant="outline" onClick={() => setShowApiKey(!showApiKey)}>
                  {showApiKey ? 'Hide' : 'Reveal'}
                </Button>
                <Button onClick={generateNewApiKey} className="bg-marine-accent hover:bg-marine-accent/80 text-black">
                  Rotate Key
                </Button>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-marine-text mb-2">Idle Session Timeout</div>
              <p className="text-xs text-marine-text-secondary mb-4">Automatically lock the dashboard after inactivity.</p>
              <Select 
                value={config.sessionTimeout} 
                onValueChange={(v) => updateConfig({ sessionTimeout: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 Minutes</SelectItem>
                  <SelectItem value="30">30 Minutes</SelectItem>
                  <SelectItem value="60">1 Hour</SelectItem>
                  <SelectItem value="never">Never Timeout</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
