import React, { useState, useCallback, useRef } from 'react';
import { Search, MapPin, CheckCircle, Loader, X, Navigation } from 'lucide-react';
import { Button } from './ui/button';
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

  // If destination is active, show the confirmed state
  if (navigationDestination?.set) {
    return (
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-marine-dark/90 backdrop-blur-md p-4 rounded-xl border border-marine-accent z-[1000] shadow-lg flex items-center gap-4">
        <CheckCircle className="w-5 h-5 text-marine-accent animate-pulse" />
        <div>
          <div className="text-xs text-marine-text-secondary">Destination Set</div>
          <div className="text-sm text-marine-text font-semibold">{navigationDestination.name}</div>
          <div className="text-xs text-marine-text-secondary font-mono">
            {navigationDestination.lat.toFixed(4)}°, {navigationDestination.lng.toFixed(4)}°
          </div>
        </div>
        <Button size="sm" variant="destructive" onClick={clearDestination} className="ml-4 h-8">
          <X className="w-4 h-4 mr-1" /> Clear
        </Button>
      </div>
    );
  }

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-96 bg-marine-dark/90 backdrop-blur-md rounded-xl border border-marine-border z-[1000] shadow-lg overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-marine-border">
        <Navigation className="w-4 h-4 text-marine-accent" />
        <span className="text-xs font-semibold text-marine-text-secondary uppercase tracking-wider">Set Navigation Destination</span>
      </div>

      <div className="flex bg-marine-surface border-b border-marine-border">
        <button className={`flex-1 p-2 text-xs font-semibold ${mode === 'text' ? 'text-marine-accent bg-marine-dark' : 'text-marine-text-secondary'}`} onClick={() => setMode('text')}>Location</button>
        <button className={`flex-1 p-2 text-xs font-semibold ${mode === 'coords' ? 'text-marine-accent bg-marine-dark' : 'text-marine-text-secondary'}`} onClick={() => setMode('coords')}>Coordinates</button>
      </div>

      <div className="p-3 flex gap-2">
        {mode === 'text' ? (
          <input
            type="text"
            className="flex-1 bg-marine-surface border border-marine-border rounded px-3 py-1.5 text-sm text-marine-text outline-none focus:border-marine-accent"
            placeholder="e.g. Port of Long Beach"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
        ) : (
          <div className="flex gap-2 flex-1">
            <input type="number" placeholder="Lat" className="w-1/2 bg-marine-surface border border-marine-border rounded px-2 py-1.5 text-sm text-marine-text outline-none focus:border-marine-accent" value={lat} onChange={e => setLat(e.target.value)} />
            <input type="number" placeholder="Lng" className="w-1/2 bg-marine-surface border border-marine-border rounded px-2 py-1.5 text-sm text-marine-text outline-none focus:border-marine-accent" value={lng} onChange={e => setLng(e.target.value)} />
          </div>
        )}
        <Button size="icon" onClick={handleSearch} disabled={loading} className="w-9 h-9">
          {loading ? <Loader className="w-4 h-4 animate-spin text-white" /> : <Search className="w-4 h-4" />}
        </Button>
      </div>

      {error && (
        <div className="px-3 pb-3 text-xs text-red-400 font-mono">{error}</div>
      )}

      {results.length > 0 && (
        <div className="max-h-48 overflow-y-auto border-t border-marine-border bg-marine-dark">
          {results.map((r, i) => (
            <div key={i} className="p-2 border-b border-marine-border/50 hover:bg-marine-surface cursor-pointer flex items-center gap-3 transition-colors" onClick={() => handleSelect(r)}>
              <MapPin className="w-4 h-4 text-marine-accent flex-shrink-0" />
              <div className="text-xs text-marine-text truncate" title={r.display_name}>{r.display_name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
