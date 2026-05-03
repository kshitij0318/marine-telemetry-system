import React, { useState, useCallback, useRef } from 'react';
import { Search, MapPin, CheckCircle, Loader, X, Navigation, Home, Anchor, Square } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useTelemetry } from '../../contexts/TelemetryContext';
import { useMission } from '../../contexts/MissionContext';

const portKeywords = ['port', 'harbor', 'harbour', 'marina', 'dock', 'bay', 'gulf', 'sea', 'coast', 'jetty', 'wharf', 'anchorage', 'terminal', 'shipyard', 'basin', 'lighthouse', 'quay', 'pier'];

export function NavigationDestinationPanel() {
  const { sensorData, sendCommand, navigationDestination } = useTelemetry();
  const { stopMission } = useMission();
  const [mode, setMode] = useState<'text' | 'coords'>('text');
  const [query, setQuery] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [navTab, setNavTab] = useState<'text' | 'coords' | 'home'>('text');
  const [homeLocation, setHomeLocation] = useState<{
    lat: number;
    lng: number;
    name: string;
    set: boolean;
  } | null>(() => {
    const saved = localStorage.getItem('marineTelemetry_homeLocation');
    return saved ? JSON.parse(saved) : null;
  });
  const [homeInputMode, setHomeInputMode] = useState<'text' | 'coords'>('text');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDestination = () => {
    sendCommand({ type: 'CLEAR_NAVIGATION_DESTINATION' });
    setConfirmed(false);
    setQuery('');
    setLat('');
    setLng('');
    setResults([]);
  };

  const handleSearch = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    setResults([]);
    setConfirmed(false);

    try {
      if (mode === 'text') {
        if (query.trim().length < 3) throw new Error('Search query too short');
        
        // Serialized search to respect Nominatim 1-req/sec rate limits
        const searchTerms = [query];
        if (!portKeywords.some(k => query.toLowerCase().includes(k))) {
          searchTerms.push(`${query} port`);
        }

        const consolidated: any[] = [];
        for (const term of searchTerms) {
          try {
            const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(term)}&format=json&limit=5&extratags=1`)
              .then(res => res.json());
            if (Array.isArray(r)) consolidated.push(...r);
            // Small delay to ensure we are not rate-limited
            if (searchTerms.length > 1) await new Promise(resolve => setTimeout(resolve, 300));
          } catch (e) {
            console.error('Port search partial failure:', e);
          }
        }
        
        // Remove duplicates based on lat/lng
        const unique = consolidated.filter((v, i, a) => a.findIndex(t => t.lat === v.lat && t.lon === v.lon) === i);

        const filtered = unique.filter((res: any) => {
          const content = (res.display_name + (res.type || '') + (res.class || '')).toLowerCase();
          return portKeywords.some(k => content.includes(k)) ||
                 res.class === 'waterway' || res.type === 'port' || res.type === 'dock' || res.type === 'bay' || res.type === 'coast';
        });

        if (filtered.length === 0) throw new Error('No coastal or port locations found.');
        setResults(filtered);
      } else {
        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lng);
        if (isNaN(parsedLat) || isNaN(parsedLng)) throw new Error('Invalid coordinates');

        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${parsedLat}&lon=${parsedLng}&format=json`
        ).then(res => res.json());

        let valid = false;
        if (!r.address || r.error) {
          valid = true; // Open ocean assumption
        } else {
          valid = portKeywords.some(k => (r.display_name ?? '').toLowerCase().includes(k)) || r.type === 'bay' || r.type === 'water';
        }

        if (!valid) throw new Error('Coordinates are not in water or port.');

        setResults([{
          display_name: 'Custom Coordinates',
          lat: parsedLat.toString(),
          lon: parsedLng.toString()
        }]);
      }
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [loading, mode, query, lat, lng]);

  // Debounced search trigger for text mode
  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length >= 3) {
      debounceRef.current = setTimeout(() => handleSearch(), 400);
    }
  };

  const handleSelect = (result: any) => {
    const destLat = parseFloat(result.lat);
    const destLng = parseFloat(result.lon);
    const name = mode === 'text' ? result.display_name.split(',')[0] : 'Nav Destination';

    sendCommand({
      type: 'SET_NAVIGATION_DESTINATION',
      vesselId: 'V001',
      payload: { lat: destLat, lng: destLng, name }
    });

    // MUTUAL EXCLUSION: Nav overrides Mission
    stopMission('mission');

    setResults([]);
    setConfirmed(true);
    setQuery(name); // Show destination name in input
  };

  const handleSetHome = (result: any) => {
    const loc = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      name: result.display_name.split(',')[0],
      set: true
    };
    setHomeLocation(loc);
    localStorage.setItem('marineTelemetry_homeLocation', JSON.stringify(loc));
    setResults([]);
  };

  const startNavigationTo = (lat: number, lng: number, name: string) => {
    sendCommand({
      type: 'SET_NAVIGATION_DESTINATION',
      vesselId: 'V001',
      payload: { lat, lng, name }
    });
    stopMission('mission');
    setConfirmed(true);
    setQuery(name);
  };

  // If destination is active, show the confirmed state
  if (navigationDestination?.set) {
    return (
      <Card className="w-80 bg-marine-dark/90 backdrop-blur-md border-marine-border p-4 shadow-2xl flex flex-col gap-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-marine-text tracking-tight uppercase">Navigation Control</h3>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-marine-accent animate-pulse" />
            <span className="text-[10px] font-mono text-marine-accent">LINK ACTIVE</span>
          </div>
        </div>

        <div className="space-y-4">
          <Button 
            variant="destructive"
            className="w-full font-bold py-6 text-base tracking-widest uppercase shadow-lg shadow-red-500/10 transition-all active:scale-[0.98]"
            onClick={clearDestination}
          >
            <Square className="w-5 h-5 mr-2" /> Terminate Nav
          </Button>

          <div className="p-3 bg-marine-surface/50 border border-marine-accent/20 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-marine-accent/10 rounded">
                <Anchor className="w-4 h-4 text-marine-accent" />
              </div>
              <div>
                <div className="text-[9px] font-bold text-marine-text-secondary uppercase">Target Destination</div>
                <div className="text-sm font-bold text-marine-text truncate">{navigationDestination.name}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 font-mono text-[10px]">
              <div className="text-marine-text-secondary">{navigationDestination.lat.toFixed(6)}°N</div>
              <div className="text-marine-text-secondary text-right">{navigationDestination.lng.toFixed(6)}°E</div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-80 bg-marine-dark/90 backdrop-blur-md border-marine-border p-4 shadow-2xl flex flex-col gap-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-marine-text tracking-tight uppercase">Navigation Control</h3>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-marine-text-secondary" />
          <span className="text-[10px] font-mono text-marine-text-secondary">READY</span>
        </div>
      </div>

      <div className="flex bg-marine-surface/50 p-1 rounded-lg border border-marine-border">
        <button 
          className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${navTab === 'text' ? 'bg-marine-accent text-marine-dark shadow-lg' : 'text-marine-text-secondary hover:text-marine-text'}`} 
          onClick={() => setNavTab('text')}
        >
          Location
        </button>
        <button 
          className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${navTab === 'coords' ? 'bg-marine-accent text-marine-dark shadow-lg' : 'text-marine-text-secondary hover:text-marine-text'}`} 
          onClick={() => setNavTab('coords')}
        >
          Coords
        </button>
        <button 
          className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${navTab === 'home' ? 'bg-marine-accent text-marine-dark shadow-lg' : 'text-marine-text-secondary hover:text-marine-text'}`} 
          onClick={() => setNavTab('home')}
        >
          Home
        </button>
      </div>

      <div className="space-y-3">
        {navTab === 'home' ? (
          <div className="space-y-3">
            {homeLocation?.set ? (
              <div className="p-3 bg-marine-surface border border-marine-accent/30 rounded-lg group transition-all hover:border-marine-accent">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-marine-accent" />
                    <span className="text-xs font-bold text-marine-text">Home Port</span>
                  </div>
                  <button onClick={() => { setHomeLocation(null); localStorage.removeItem('marineTelemetry_homeLocation'); }}
                    className="text-[9px] text-red-400 hover:text-red-300 font-bold uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                    Reset
                  </button>
                </div>
                <div className="text-xs text-marine-accent font-mono font-bold truncate mb-1">{homeLocation.name}</div>
                <div className="text-[10px] text-marine-text-secondary font-mono">
                  {homeLocation.lat.toFixed(4)}°N  {homeLocation.lng.toFixed(4)}°E
                </div>
                <Button
                  onClick={() => startNavigationTo(homeLocation.lat, homeLocation.lng, homeLocation.name)}
                  className="w-full mt-3 bg-marine-accent/20 border border-marine-accent/30 hover:bg-marine-accent/30 text-marine-accent font-bold text-[11px] uppercase tracking-widest h-10"
                >
                  Return to Home
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-[9px] text-marine-text-secondary font-bold uppercase tracking-widest">
                  Configure Home Station
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setHomeInputMode('text')}
                    className={`flex-1 py-1 rounded text-[9px] font-bold border transition-colors uppercase
                      ${homeInputMode === 'text' ? 'bg-marine-accent/20 border-marine-accent text-marine-accent' : 'border-marine-border text-marine-text-secondary hover:border-white/20'}`}>
                    Name
                  </button>
                  <button onClick={() => setHomeInputMode('coords')}
                    className={`flex-1 py-1 rounded text-[9px] font-bold border transition-colors uppercase
                      ${homeInputMode === 'coords' ? 'bg-marine-accent/20 border-marine-accent text-marine-accent' : 'border-marine-border text-marine-text-secondary hover:border-white/20'}`}>
                    Coords
                  </button>
                </div>

                <div className="flex gap-2">
                  {homeInputMode === 'text' ? (
                    <input
                      type="text"
                      className="flex-1 bg-marine-surface border border-marine-border rounded px-3 py-2 text-xs text-marine-text outline-none focus:border-marine-accent/50 transition-all"
                      placeholder="Search port name..."
                      value={query}
                      onChange={e => handleQueryChange(e.target.value)}
                    />
                  ) : (
                    <div className="flex gap-1 flex-1">
                      <input type="number" placeholder="LAT" className="w-1/2 bg-marine-surface border border-marine-border rounded px-2 py-2 text-[10px] text-marine-text outline-none focus:border-marine-accent/50" value={lat} onChange={e => setLat(e.target.value)} />
                      <input type="number" placeholder="LNG" className="w-1/2 bg-marine-surface border border-marine-border rounded px-2 py-2 text-[10px] text-marine-text outline-none focus:border-marine-accent/50" value={lng} onChange={e => setLng(e.target.value)} />
                    </div>
                  )}
                  <Button size="icon" onClick={handleSearch} disabled={loading} className="w-10 h-10 shrink-0">
                    {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
             <div className="text-[9px] text-marine-text-secondary font-bold uppercase tracking-widest">
               Search Navigational Target
             </div>
             <div className="flex gap-2">
              {navTab === 'text' ? (
                <input
                  type="text"
                  className="flex-1 bg-marine-surface border border-marine-border rounded px-3 py-2 text-xs text-marine-text outline-none focus:border-marine-accent/50 transition-all"
                  placeholder="e.g. Mumbai Port..."
                  value={query}
                  onChange={e => handleQueryChange(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
              ) : (
                <div className="flex gap-1 flex-1">
                  <input type="number" placeholder="LAT" className="w-1/2 bg-marine-surface border border-marine-border rounded px-2 py-2 text-[10px] text-marine-text outline-none focus:border-marine-accent/50" value={lat} onChange={e => setLat(e.target.value)} />
                  <input type="number" placeholder="LNG" className="w-1/2 bg-marine-surface border border-marine-border rounded px-2 py-2 text-[10px] text-marine-text outline-none focus:border-marine-accent/50" value={lng} onChange={e => setLng(e.target.value)} />
                </div>
              )}
              <Button size="icon" onClick={handleSearch} disabled={loading} className="w-10 h-10 shrink-0">
                {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-[10px] text-red-400 font-mono animate-in fade-in slide-in-from-top-1">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="max-h-48 overflow-y-auto border border-marine-border rounded-lg bg-marine-surface/30 custom-scrollbar mt-1">
          {results.map((r, i) => (
            <div key={i} className="p-2.5 border-b border-marine-border/50 hover:bg-marine-accent/5 cursor-pointer flex items-center justify-between transition-all group" onClick={() => navTab === 'home' ? handleSetHome(r) : handleSelect(r)}>
              <div className="flex items-center gap-3 truncate">
                <div className="p-1.5 bg-white/5 rounded transition-colors group-hover:bg-marine-accent/20">
                  <MapPin className="w-3.5 h-3.5 text-marine-text-secondary group-hover:text-marine-accent" />
                </div>
                <div className="text-[11px] text-marine-text truncate font-medium" title={r.display_name}>{r.display_name.split(',')[0]}</div>
              </div>
              {navTab === 'home' && (
                <button className="text-[8px] font-black bg-marine-accent/20 text-marine-accent px-1.5 py-0.5 rounded border border-marine-accent/30 opacity-0 group-hover:opacity-100 transition-opacity">SET</button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
