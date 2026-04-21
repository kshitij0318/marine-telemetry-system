import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { 
  X, Check, AlertCircle, Move, Waves, Settings2, 
  Clock, Navigation, Anchor, Info
} from 'lucide-react';
import { 
  WaypointActionConfig, 
  MovementAction, 
  DepthAction, 
  AddonAction,
  validateActions 
} from '../../types/waypointActions';

interface WaypointActionEditorProps {
  waypoint: { id: string; name: string; actions?: WaypointActionConfig };
  onSave: (config: WaypointActionConfig) => void;
  onClose: () => void;
}

export default function WaypointActionEditor({ 
  waypoint, 
  onSave, 
  onClose 
}: WaypointActionEditorProps) {
  const [config, setConfig] = useState<WaypointActionConfig>(
    waypoint.actions || {
      movement: 'TRANSIT',
      depth: 'NEUTRAL',
      addons: [],
      params: {}
    }
  );

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { valid, error } = validateActions(config);
    setError(valid ? null : error || 'Invalid configuration');
  }, [config]);

  const toggleAddon = (addon: AddonAction) => {
    setConfig(prev => {
      const isSelected = prev.addons.includes(addon);
      const newAddons = isSelected 
        ? prev.addons.filter(a => a !== addon)
        : [...prev.addons, addon];
      return { ...prev, addons: newAddons };
    });
  };

  const updateParam = (key: string, val: any) => {
    setConfig(prev => ({
      ...prev,
      params: { ...prev.params, [key]: val }
    }));
  };

  const handleApply = () => {
    const { valid } = validateActions(config);
    if (valid) {
      onSave(config);
    }
  };

  const movementModes: MovementAction[] = ['TRANSIT', 'HOLD', 'LOITER', 'FOLLOW_PATH', 'RETURN_TO_HOME'];
  const depthModes: DepthAction[] = ['NEUTRAL', 'DIVE', 'SURFACE'];
  const addons: { id: AddonAction; label: string }[] = [
    { id: 'SONAR_SCAN', label: 'Sonar Scan' },
    { id: 'SURVEY', label: 'Survey' },
    { id: 'CHANGE_SPEED', label: 'Speed Change' },
    { id: 'CHANGE_HEADING', label: 'Heading Change' },
    { id: 'WAIT', label: 'Wait' },
    { id: 'DEPLOY_PAYLOAD', label: 'Deploy Payload' },
  ];

  return (
    <div className="absolute inset-y-0 right-0 w-80 bg-marine-dark/95 backdrop-blur-xl border-l border-marine-border z-[2000] shadow-[-10px_0_30px_rgba(0,0,0,0.5)] flex flex-col animate-in slide-in-from-right-full duration-300">
      <div className="p-4 border-b border-marine-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-marine-text uppercase tracking-tight">Configure Waypoint</h3>
          <p className="text-[10px] text-marine-accent font-mono">{waypoint.name} — ID: {waypoint.id}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors">
          <X className="w-5 h-5 text-marine-text-secondary" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {/* Section 1: Movement */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-bold text-marine-text-secondary uppercase tracking-widest">
            <Move className="w-3 h-3" /> Movement Mode
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {movementModes.map(mode => (
              <button
                key={mode}
                onClick={() => setConfig(prev => ({ ...prev, movement: mode }))}
                className={`flex items-center justify-between p-2.5 rounded border text-xs transition-all ${
                  config.movement === mode 
                    ? 'bg-marine-accent/10 border-marine-accent text-marine-text' 
                    : 'bg-marine-surface border-marine-border text-marine-text-secondary hover:border-marine-text-secondary/50'
                }`}
              >
                <span>{mode.replace('_', ' ')}</span>
                {config.movement === mode && <Check className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Depth */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-bold text-marine-text-secondary uppercase tracking-widest">
            <Waves className="w-3 h-3" /> Depth Control
          </div>
          <div className="flex gap-1.5">
            {depthModes.map(mode => (
              <button
                key={mode}
                onClick={() => setConfig(prev => ({ ...prev, depth: mode }))}
                className={`flex-1 py-2 rounded border text-[10px] font-bold transition-all ${
                  config.depth === mode 
                    ? 'bg-marine-accent/10 border-marine-accent text-marine-text' 
                    : 'bg-marine-surface border-marine-border text-marine-text-secondary'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Section 3: Add-ons */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-bold text-marine-text-secondary uppercase tracking-widest">
            <Settings2 className="w-3 h-3" /> Add-on Actions
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {addons.map(addon => {
              const isSelected = config.addons.includes(addon.id);
              return (
                <button
                  key={addon.id}
                  onClick={() => toggleAddon(addon.id)}
                  className={`flex items-center justify-between p-2.5 rounded border text-xs transition-all ${
                    isSelected 
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-100' 
                      : 'bg-marine-surface border-marine-border text-marine-text-secondary hover:border-marine-text-secondary/50'
                  }`}
                >
                  <span>{addon.label}</span>
                  {isSelected && <Check className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4: Parameters */}
        {config.addons.length > 0 || config.movement === 'LOITER' || config.depth === 'DIVE' ? (
          <div className="space-y-3 pt-4 border-t border-marine-border">
            <div className="text-[10px] font-bold text-marine-text-secondary uppercase tracking-widest">Parameters</div>
            
            <div className="grid grid-cols-1 gap-4">
              {config.addons.includes('CHANGE_SPEED') && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase text-marine-text-secondary font-mono">Target Speed (kts)</label>
                  <input
                    type="number"
                    value={config.params.targetSpeed || ''}
                    onChange={(e) => updateParam('targetSpeed', parseFloat(e.target.value))}
                    className="w-full bg-marine-surface border border-marine-border rounded px-3 py-2 text-sm text-marine-text focus:border-marine-accent outline-none"
                    placeholder="e.g. 8.5"
                  />
                </div>
              )}

              {config.addons.includes('WAIT') && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase text-marine-text-secondary font-mono">Wait Duration (s)</label>
                  <input
                    type="number"
                    value={config.params.waitDuration || ''}
                    onChange={(e) => updateParam('waitDuration', parseFloat(e.target.value))}
                    className="w-full bg-marine-surface border border-marine-border rounded px-3 py-2 text-sm text-marine-text focus:border-marine-accent outline-none"
                    placeholder="e.g. 60"
                  />
                </div>
              )}

              {config.movement === 'LOITER' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase text-marine-text-secondary font-mono">Radius (m)</label>
                    <input
                      type="number"
                      value={config.params.loiterRadius || ''}
                      onChange={(e) => updateParam('loiterRadius', parseFloat(e.target.value))}
                      className="w-full bg-marine-surface border border-marine-border rounded px-3 py-2 text-sm text-marine-text focus:border-marine-accent outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase text-marine-text-secondary font-mono">Direction</label>
                    <select
                      value={config.params.loiterDirection || 'cw'}
                      onChange={(e) => updateParam('loiterDirection', e.target.value)}
                      className="w-full bg-marine-surface border border-marine-border rounded px-3 py-2 text-sm text-marine-text focus:border-marine-accent outline-none"
                    >
                      <option value="cw">CW</option>
                      <option value="ccw">CCW</option>
                    </select>
                  </div>
                </div>
              )}

              {config.depth === 'DIVE' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase text-marine-text-secondary font-mono">Dive Depth (m)</label>
                  <input
                    type="number"
                    value={config.params.diveDepth || ''}
                    onChange={(e) => updateParam('diveDepth', parseFloat(e.target.value))}
                    className="w-full bg-marine-surface border border-marine-border rounded px-3 py-2 text-sm text-marine-text focus:border-marine-accent outline-none"
                  />
                </div>
              )}

              {config.addons.includes('SURVEY') && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase text-marine-text-secondary font-mono">Survey Duration (s)</label>
                  <input
                    type="number"
                    value={config.params.surveyDuration || ''}
                    onChange={(e) => updateParam('surveyDuration', parseFloat(e.target.value))}
                    className="w-full bg-marine-surface border border-marine-border rounded px-3 py-2 text-sm text-marine-text focus:border-marine-accent outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 opacity-30 gap-2">
            <Info className="w-8 h-8" />
            <p className="text-[10px] text-center px-4">Select add-on actions to configure dynamic parameters</p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-marine-border space-y-4">
        {error && (
          <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded flex items-start gap-2 animate-pulse">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span className="text-[11px] text-red-400 font-medium">{error}</span>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 border-marine-border" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            className="flex-1 bg-marine-accent hover:bg-marine-accent/80 text-marine-dark font-bold" 
            disabled={!!error}
            onClick={handleApply}
          >
            Apply Actions
          </Button>
        </div>
      </div>
    </div>
  );
}
