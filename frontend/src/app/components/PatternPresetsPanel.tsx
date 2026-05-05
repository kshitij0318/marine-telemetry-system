import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { 
  Grid3X3, RefreshCw, Maximize2, Target, LayoutGrid, 
  ChevronDown, MapPin, MousePointer2, Settings2 
} from 'lucide-react';
import { 
  generateLawnmower, 
  generateSpiral, 
  generateExpandingSquare, 
  generateRadial, 
  generateCrosshatch 
} from '../../utils/surveyPatterns';

interface PatternPresetsPanelProps {
  vesselPos: { lat: number; lng: number };
  onApplyPattern: (waypoints: Array<{ lat: number; lng: number; name: string }>) => void;
  onWaitClick: (patternKey: string, params: any) => void;
}

type PatternType = 'LAWNMOWER' | 'SPIRAL' | 'EXPANDING_SQUARE' | 'RADIAL' | 'CROSSHATCH';

export default function PatternPresetsPanel({ 
  vesselPos, 
  onApplyPattern,
  onWaitClick 
}: PatternPresetsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<PatternType | null>(null);
  
  const [params, setParams] = useState<any>({
    LAWNMOWER: { widthM: 500, heightM: 300, spacingM: 50, headingDeg: 0, turnRadiusM: 20 },
    SPIRAL: { maxRadiusM: 300, spacingM: 40, clockwise: true },
    EXPANDING_SQUARE: { stepM: 50, maxExtentM: 300 },
    RADIAL: { maxRadiusM: 300, angleStepDeg: 30 },
    CROSSHATCH: { widthM: 500, heightM: 300, spacingM: 60, headingDeg: 0, turnRadiusM: 20 }
  });

  const updateParam = (pattern: PatternType, key: string, value: any) => {
    setParams((prev: any) => ({
      ...prev,
      [pattern]: { ...prev[pattern], [key]: value }
    }));
  };

  const handleApply = (center: { lat: number; lng: number }) => {
    if (!selectedPattern) return;
    
    let wps: { lat: number; lng: number }[] = [];
    const p = params[selectedPattern];
    let code = '';

    switch (selectedPattern) {
      case 'LAWNMOWER':
        wps = generateLawnmower({ center, ...p });
        code = 'LM';
        break;
      case 'SPIRAL':
        wps = generateSpiral({ center, ...p });
        code = 'SP';
        break;
      case 'EXPANDING_SQUARE':
        wps = generateExpandingSquare({ center, ...p });
        code = 'ES';
        break;
      case 'RADIAL':
        wps = generateRadial({ center, ...p });
        code = 'RD';
        break;
      case 'CROSSHATCH':
        wps = generateCrosshatch({ center, ...p });
        code = 'CH';
        break;
    }

    const namedWps = wps.map((wp, i) => ({
      ...wp,
      name: `${code}-${i + 1}`
    }));

    onApplyPattern(namedWps);
    setSelectedPattern(null);
    setIsOpen(false);
  };

  const patterns = [
    { id: 'LAWNMOWER', name: 'Lawnmower', icon: Grid3X3 },
    { id: 'SPIRAL', name: 'Spiral', icon: RefreshCw },
    { id: 'EXPANDING_SQUARE', name: 'Expanding Square', icon: Maximize2 },
    { id: 'RADIAL', name: 'Radial', icon: Target },
    { id: 'CROSSHATCH', name: 'Crosshatch', icon: LayoutGrid },
  ];

  return (
    <Card className="bg-black/40 backdrop-blur-xl border-white/10 p-3 shadow-2xl rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-bold text-white/80 uppercase tracking-widest flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-marine-accent animate-pulse"></div>
          Survey Patterns
        </h3>
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={() => setIsOpen(!isOpen)}
          className="h-6 text-[9px] px-2 font-bold uppercase rounded-full bg-white/5 hover:bg-white/10 text-white"
        >
          {isOpen ? 'Close' : 'Choose'}
          <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </div>

      {isOpen && (
        <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
          {!selectedPattern ? (
            <div className="grid grid-cols-1 gap-1">
              {patterns.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPattern(p.id as PatternType)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 text-white/90 text-left transition-colors group"
                >
                  <div className="bg-marine-accent/20 p-1.5 rounded text-marine-accent group-hover:scale-110 transition-transform">
                    <p.icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-semibold tracking-wide">{p.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-marine-border">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setSelectedPattern(null)}>
                  <ChevronDown className="rotate-90 w-4 h-4" />
                </Button>
                <span className="text-xs font-bold text-marine-accent uppercase italic">
                  {patterns.find(p => p.id === selectedPattern)?.name}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {Object.entries(params[selectedPattern]).map(([key, val]) => (
                  <div key={key} className="flex flex-col gap-1">
                    <label className="text-[9px] uppercase text-white/50 font-mono tracking-tighter">
                      {key.replace('M', ' (m)').replace('Deg', ' (°)')}
                    </label>
                    <input
                      type="number"
                      value={val as any}
                      onChange={(e) => updateParam(selectedPattern, key, parseFloat(e.target.value))}
                      className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[11px] text-white focus:border-marine-accent focus:bg-white/5 outline-none font-mono"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  className="flex-1 text-[10px] bg-marine-accent/20 hover:bg-marine-accent/30 text-marine-accent border border-marine-accent/30 h-8 rounded-full"
                  onClick={() => handleApply(vesselPos)}
                >
                  <MapPin className="w-3 h-3 mr-1.5" /> At Vessel
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="flex-1 text-[10px] h-8 border border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-full"
                  onClick={() => onWaitClick(selectedPattern, params[selectedPattern])}
                >
                  <MousePointer2 className="w-3 h-3 mr-1.5 text-white/60" /> Map
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
