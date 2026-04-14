import React, { useState, useEffect, useMemo } from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';
import { useMission } from '../contexts/MissionContext';
import { Card } from '../app/components/ui/card';
import { Button } from '../app/components/ui/button';
import { 
  Play, Square, MapPin, Navigation, Navigation2, 
  Settings, Layers, Trash2, AlertTriangle, Eye, EyeOff, Info,
  Search, Crosshair, ChevronRight, Activity, Zap, X
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Polygon, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { NavigationDestinationPanel } from '../app/components/NavigationDestinationPanel';
import { computeReroutedPath, calculateDistance } from '../utils/routeUtils';
import { isOnWater } from '../utils/waterCheck';
import { useAnimatedVesselPosition } from '../hooks/useAnimatedVesselPosition';

// ── Types ──────────────────────────────────────────────────────────────
interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  name: string;
}

interface AvoidanceZone {
  id: string;
  points: { lat: number; lng: number }[];
  area: number;
  visible: boolean;
}

interface RerouteAnimation {
  active: boolean;
  status: 'rerouting' | 'complete';
  deltaDistance: number;
  modifiedWaypoints: number;
}

// ── Map Helpers ─────────────────────────────────────────────────────────
function ChangeView({ center, zoom, follow }: { center: [number, number], zoom: number, follow: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (follow) {
      map.setView(center, map.getZoom(), { animate: true, duration: 0.5 });
    }
  }, [center, follow, map]);
  return null;
}

function MapEvents({ onClick, onDblClick }: { onClick: (latlng: any) => void, onDblClick: (latlng: any) => void }) {
  useMapEvents({
    click: (e) => onClick(e.latlng),
    dblclick: (e) => onDblClick(e.latlng),
  });
  return null;
}

const StatRow = ({ label, value, color = "text-marine-text" }: { label: string, value: string, color?: string }) => (
  <div className="flex flex-col gap-0.5">
    <div className="text-[10px] uppercase font-mono text-marine-text-secondary">{label}</div>
    <div className={`text-sm font-bold truncate ${color}`}>{value}</div>
  </div>
);

// ── Main Component ──────────────────────────────────────────────────────
export default function MapCommandCenter() {
  const { sensorData, sendCommand, missionState, navigationDestination } = useTelemetry();
  const { startMission: contextStartMission, stopMission: contextStopMission } = useMission();
  const animatedPos = useAnimatedVesselPosition();
  
  const [mapMode, setMapMode] = useState<'navigation' | 'tactical' | 'sonar' | 'mission'>('navigation');
  const [originalWaypoints, setOriginalWaypoints] = useState<Waypoint[]>([]);
  const [reroutedWaypoints, setReroutedWaypoints] = useState<Waypoint[]>([]);
  const [avoidanceZones, setAvoidanceZones] = useState<AvoidanceZone[]>([]);
  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [currentZonePoints, setCurrentZonePoints] = useState<Array<{ lat: number; lng: number }>>([]);
  const [followVessel, setFollowVessel] = useState(false);
  
  const [rerouteAnimation, setRerouteAnimation] = useState<RerouteAnimation>({
    active: false, status: 'complete', deltaDistance: 0, modifiedWaypoints: 0,
  });
  
  const [checkingWater, setCheckingWater] = useState(false);
  const [landError, setLandError] = useState('');

  // ── Dynamic Icons ─────────────────────────────────────────────────────
  // We re-create the vessel icon to apply rotation directly to the arrow
  const vesselIcon = useMemo(() => L.divIcon({
    className: 'custom-vessel-icon',
    html: `<div class="vessel-marker">
            <div class="vessel-arrow" style="transform: rotate(${animatedPos.heading}deg)"></div>
           </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  }), [animatedPos.heading]);

  const waypointIcon = (name: string, active: boolean) => L.divIcon({
    className: 'custom-waypoint-icon',
    html: `<div class="wp-marker ${active ? 'animate-pulse scale-110' : 'opacity-80'}">
            <div class="wp-dot"></div>
            <div class="wp-label">${name}</div>
          </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  // Rerouting logic (Frontend specific to planning phase)
  useEffect(() => {
    if (avoidanceZones.length > 0) {
      const { newPath, modifiedWPsCount } = computeReroutedPath(originalWaypoints, avoidanceZones);
      if (modifiedWPsCount > 0) {
        const getDist = (pts: Waypoint[]) => pts.reduce((sum, pt, i) => i === 0 ? 0 : sum + calculateDistance(pts[i-1].lat, pts[i-1].lng, pt.lat, pt.lng), 0);
        const oldDist = getDist(originalWaypoints);
        const newDist = getDist(newPath);
        const delta = Math.round(newDist - oldDist);

        setRerouteAnimation({ active: true, status: 'rerouting', deltaDistance: delta, modifiedWaypoints: modifiedWPsCount });
        setTimeout(() => {
          setReroutedWaypoints(newPath);
          setRerouteAnimation({ active: true, status: 'complete', deltaDistance: delta, modifiedWaypoints: modifiedWPsCount });
          setTimeout(() => setRerouteAnimation(p => ({ ...p, active: false })), 2000);
        }, 300);
      } else {
        setReroutedWaypoints(originalWaypoints);
      }
    } else {
      setReroutedWaypoints(originalWaypoints);
    }
  }, [avoidanceZones, originalWaypoints]);

  // SINGLE SOURCE OF TRUTH: If mission is active, use backend waypoints. Otherwise planning ones.
  const activeWaypoints = (missionState?.active && missionState.waypoints) ? missionState.waypoints : (reroutedWaypoints.length > 0 ? reroutedWaypoints : originalWaypoints);

  const startMission = () => {
    const planningWaypoints = reroutedWaypoints.length > 0 ? reroutedWaypoints : originalWaypoints;
    if (planningWaypoints.length < 2) return;
    
    // MUTUAL EXCLUSION: Mission overrides Navigation
    sendCommand({ type: 'CLEAR_NAVIGATION_DESTINATION', vesselId: 'V001' });

    contextStartMission({
      type: 'mission_planning',
      ownerPage: 'mission',
      waypoints: planningWaypoints.map(wp => ({ id: wp.id, lat: wp.lat, lng: wp.lng, name: wp.name })),
      avoidanceZones,
      reroutedWaypoints: reroutedWaypoints.length > 0 ? reroutedWaypoints.map(wp => ({ lat: wp.lat, lng: wp.lng })) : [],
      active: true,
      estimatedDistance: 0,
      estimatedDuration: 0
    });
    
    setFollowVessel(true);
  };

  // Reactive State Handoff: Only clear planning path when backend confirms mission is active
  useEffect(() => {
    if (missionState?.active) {
      setOriginalWaypoints([]);
      setReroutedWaypoints([]);
    }
  }, [missionState?.active]);

  const handleMapClick = async (latlng: any) => {
    if (checkingWater) return;
    if (isDrawingZone || mapMode === 'mission') {
      setCheckingWater(true);
      try {
        const water = await isOnWater(latlng.lat, latlng.lng);
        if (!water) {
          setLandError('⚓ Invalid location — vessels cannot operate on land. Place waypoints in open water.');
          setTimeout(() => setLandError(''), 4000);
          return;
        }
      } catch { /* fail open */ } finally { setCheckingWater(false); }
    }

    if (isDrawingZone) {
      setCurrentZonePoints([...currentZonePoints, { lat: latlng.lat, lng: latlng.lng }]);
    } else if (mapMode === 'mission' && !missionState?.active && !navigationDestination?.set) {
      const newWaypoint: Waypoint = {
        id: `wp-${Date.now()}`,
        lat: latlng.lat,
        lng: latlng.lng,
        name: `WP${originalWaypoints.length + 1}`,
      };
      setOriginalWaypoints([...originalWaypoints, newWaypoint]);
    }
  };

  const handleMapDblClick = (latlng: any) => {
    if (isDrawingZone && currentZonePoints.length >= 2) {
      const finalPoints = [...currentZonePoints, { lat: latlng.lat, lng: latlng.lng }];
      const newZone: AvoidanceZone = {
        id: `zone-${Date.now()}`,
        points: finalPoints,
        area: 0,
        visible: true,
      };
      setAvoidanceZones([...avoidanceZones, newZone]);
      setCurrentZonePoints([]);
      setIsDrawingZone(false);
    }
  };

  const removeWaypoint = (id: string) => {
    const updated = originalWaypoints.filter(wp => wp.id !== id);
    setOriginalWaypoints(updated);
  };

  const getETA = () => {
    if (!missionState?.eta || missionState.eta === Infinity) return 'N/A';
    return new Date(Date.now() + missionState.eta * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  const getDuration = () => {
    const s = missionState?.eta;
    if (!s || s === Infinity) return 'N/A';
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="relative h-screen bg-marine-dark overflow-hidden flex flex-col">
      <div className="flex-1 relative">
        <MapContainer 
          center={[animatedPos.lat, animatedPos.lng]} 
          zoom={14} 
          className="h-full w-full z-0"
          zoomControl={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <ChangeView center={[animatedPos.lat, animatedPos.lng]} zoom={14} follow={followVessel} />
          <MapEvents onClick={handleMapClick} onDblClick={handleMapDblClick} />

          {/* Vessel */}
          <Marker position={[animatedPos.lat, animatedPos.lng]} icon={vesselIcon} />

          {/* Navigation Destination Line & Marker */}
          {navigationDestination?.set && (
            <>
              <Marker position={[navigationDestination.lat, navigationDestination.lng]} 
                icon={L.divIcon({
                  className: 'nav-dest-marker',
                  html: `<div class="bg-marine-accent p-1 rounded-full animate-bounce shadow-lg shadow-marine-accent/50"><div class="w-2 h-2 bg-white rounded-full"></div></div>`,
                  iconSize: [20, 20],
                  iconAnchor: [10, 20]
                })} 
              />
              <Polyline 
                positions={[[animatedPos.lat, animatedPos.lng], [navigationDestination.lat, navigationDestination.lng]]}
                pathOptions={{ color: '#00a8cc', weight: 2, dashArray: '8, 8', opacity: 0.6 }}
              />
            </>
          )}

          {/* Mission Waypoints & Path */}
          <Polyline 
            positions={activeWaypoints.map(wp => [wp.lat, wp.lng])} 
            pathOptions={{ color: missionState?.active ? '#00ff9d' : '#00a8cc', weight: 3, lineJoin: 'round', opacity: 0.8 }} 
          />
          {activeWaypoints.map((wp, i) => (
            <Marker key={wp.id} position={[wp.lat, wp.lng]} icon={waypointIcon(wp.name, i === missionState?.currentWaypointIndex)} />
          ))}

          {/* Avoidance Zones */}
          {avoidanceZones.filter(z => z.visible).map(zone => (
            <Polygon key={zone.id} positions={zone.points.map(p => [p.lat, p.lng])} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.3, weight: 2 }} />
          ))}
          {currentZonePoints.length > 0 && (
            <Polyline positions={currentZonePoints.map(p => [p.lat, p.lng])} pathOptions={{ color: '#ef4444', weight: 2, dashArray: '5, 5' }} />
          )}
        </MapContainer>

        {/* Floating Controls */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          <Card className="bg-marine-dark/90 backdrop-blur-md border-marine-border p-2 flex flex-col gap-1 shadow-2xl">
            <Button size="icon" variant={mapMode === 'navigation' ? 'default' : 'ghost'} onClick={() => setMapMode('navigation')} className="w-10 h-10">
              <Navigation2 className="w-5 h-5" title="Navigation Mode" />
            </Button>
            <Button size="icon" variant={mapMode === 'mission' ? 'default' : 'ghost'} onClick={() => setMapMode('mission')} className="w-10 h-10">
              <Play className="w-5 h-5" title="Mission Planning" />
            </Button>
            <Button size="icon" variant={mapMode === 'tactical' ? 'default' : 'ghost'} onClick={() => setMapMode('tactical')} className="w-10 h-10">
              <Layers className="w-5 h-5" title="Tactical Layers" />
            </Button>
            <div className="h-px bg-marine-border my-1" />
            <Button size="icon" variant={followVessel ? 'default' : 'ghost'} onClick={() => setFollowVessel(!followVessel)} className={`w-10 h-10 ${followVessel ? 'text-marine-accent' : ''}`}>
              <Crosshair className="w-5 h-5" title="Follow Vessel" />
            </Button>
          </Card>
        </div>

        {/* Mission Planning Panel */}
        {mapMode === 'mission' && (
          <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-3 w-80 max-h-[calc(100vh-8rem)]">
            <Card className="bg-marine-dark/90 backdrop-blur-md border-marine-border p-4 shadow-2xl flex flex-col gap-4 overflow-hidden">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-marine-text tracking-tight uppercase">Mission Control</h3>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${missionState?.active ? 'bg-green-500 animate-pulse' : 'bg-marine-text-secondary'}`} />
                  <span className="text-[10px] font-mono text-marine-text-secondary">{missionState?.active ? 'ACTIVE' : 'IDLE'}</span>
                </div>
              </div>

              <div className="flex gap-2">
                {!missionState?.active ? (
                  <Button onClick={startMission} className="flex-1 bg-marine-accent hover:bg-marine-accent/80 text-white font-bold h-9" disabled={originalWaypoints.length < 2}>
                    <Play className="w-4 h-4 mr-2" /> Start Mission
                  </Button>
                ) : (
                  <Button onClick={() => contextStopMission('mission')} variant="destructive" className="flex-1 font-bold h-9">
                    <Square className="w-4 h-4 mr-2" /> Stop Mission
                  </Button>
                )}
                <Button size="icon" variant="outline" onClick={() => { setOriginalWaypoints([]); setReroutedWaypoints([]); setAvoidanceZones([]); }} className="w-9 h-9 border-marine-border">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {landError && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded text-[11px] text-red-400 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{landError}</span>
                </div>
              )}

              {/* Waypoint List with Scrolling */}
              <div className="flex flex-col gap-2 overflow-y-auto pr-1 custom-scrollbar min-h-0 flex-1">
                {activeWaypoints.map((wp, i) => (
                  <div key={wp.id} className={`group p-2.5 rounded border transition-all ${
                    i === missionState?.currentWaypointIndex ? 'bg-marine-accent/10 border-marine-accent' : 
                    missionState?.completedWaypoints.includes(wp.id) ? 'bg-green-500/5 border-green-500/20 opacity-60' :
                    'bg-marine-surface border-marine-border hover:border-marine-text-secondary'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center ${
                          i === missionState?.currentWaypointIndex ? 'bg-marine-accent text-white' : 'bg-marine-border text-marine-text-secondary'
                        }`}>{i + 1}</span>
                        <span className="text-xs font-semibold text-marine-text">{wp.name}</span>
                      </div>
                      {!missionState?.active && (
                        <button onClick={() => removeWaypoint(wp.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-400 hover:bg-red-500/10 rounded">
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-marine-text-secondary flex justify-between">
                      <span>{wp.lat.toFixed(5)}°N</span>
                      <span>{wp.lng.toFixed(5)}°E</span>
                    </div>
                  </div>
                ))}
                
                {activeWaypoints.length === 0 && (
                  <div className="py-8 flex flex-col items-center justify-center text-center gap-2 border border-dashed border-marine-border rounded-lg">
                    <MapPin className="w-6 h-6 text-marine-text-secondary/30" />
                    <p className="text-[11px] text-marine-text-secondary px-4">Click locations on map to create mission waypoints</p>
                  </div>
                )}
              </div>

              {/* Shared Live Stats */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-marine-border">
                <StatRow label="Remaining" value={`${((missionState?.distanceRemaining || 0)/1000).toFixed(2)} km`} color="text-marine-accent" />
                <StatRow label="ETA" value={getETA()} color="text-marine-accent" />
                <StatRow label="Duration" value={getDuration()} />
                <StatRow label="Status" value={missionState?.active ? 'En Route' : 'Standing By'} />
              </div>
            </Card>

            {/* Avoidance Tool */}
            <Card className="bg-marine-dark/90 backdrop-blur-md border-marine-border p-4 shadow-2xl">
               <div className="flex items-center justify-between mb-3">
                 <h3 className="text-[10px] font-bold text-marine-text uppercase tracking-widest">Zone Management</h3>
                 <Button size="sm" variant={isDrawingZone ? 'destructive' : 'outline'} onClick={() => {
                   if(isDrawingZone) setCurrentZonePoints([]);
                   setIsDrawingZone(!isDrawingZone);
                 }} className="h-7 text-[10px] px-2 font-bold uppercase">
                   {isDrawingZone ? 'Cancel' : '+ Def Zone'}
                 </Button>
               </div>
               
               {isDrawingZone && (
                 <div className="text-[10px] text-amber-400 bg-amber-400/5 p-2 rounded border border-amber-400/20 mb-2 font-mono">
                   Click map to add corners. Double-click to close zone.
                 </div>
               )}

               <div className="flex flex-wrap gap-1.5">
                 {avoidanceZones.map((zone, idx) => (
                   <div key={zone.id} className="flex items-center gap-1 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full">
                     <span className="text-[9px] font-bold text-red-100">Z-{idx+1}</span>
                     <button onClick={() => setAvoidanceZones(p => p.filter(z => z.id !== zone.id))} className="text-red-400 hover:text-red-200">
                       <Trash2 size={10} />
                     </button>
                   </div>
                 ))}
               </div>
            </Card>
          </div>
        )}

        {/* Navigation Mode Panel */}
        {mapMode === 'navigation' && <NavigationDestinationPanel />}

        {/* Global HUD Bottom Left */}
        <div className="absolute bottom-6 left-6 z-[1000] flex flex-col gap-3">
          <Card className="bg-marine-dark/90 backdrop-blur-md border-marine-border p-3 shadow-2xl overflow-hidden min-w-[220px]">
            <div className="flex items-center gap-3 mb-3 border-b border-marine-border pb-2">
              <div className="p-1.5 bg-marine-accent/10 rounded">
                <Activity className="w-4 h-4 text-marine-accent" />
              </div>
              <div>
                <div className="text-[9px] font-bold text-marine-text-secondary uppercase">Vessel Telemetry</div>
                <div className="text-xs font-bold text-marine-text tracking-wide">{(sensorData.gnss.speed || 0).toFixed(1)} kts @ {(sensorData.gnss.heading || 0).toFixed(0)}°</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-y-3 gap-x-4">
              <StatRow label="Lat" value={animatedPos.lat.toFixed(6)} />
              <StatRow label="Lng" value={animatedPos.lng.toFixed(6)} />
              <StatRow label="Depth" value={`${sensorData.ctd.depth.toFixed(1)}m`} />
              <StatRow label="Status" value={sensorData.gnss.status.toUpperCase()} color={sensorData.gnss.status === 'active' ? 'text-green-400' : 'text-red-400'} />
            </div>
          </Card>
        </div>

        {/* Navigation Indicator (Bottom Center) - Only if nav set */}
        {navigationDestination?.set && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000]">
             <Card className="bg-marine-accent/90 backdrop-blur-md border-white/20 px-6 py-2.5 shadow-2xl flex items-center gap-8 rounded-full">
               <div className="flex flex-col items-center">
                 <div className="text-[9px] uppercase font-bold text-white/60">Dist Remaining</div>
                 <div className="text-lg font-bold text-white leading-none">{(navigationDestination.distanceRemaining / 1000).toFixed(2)} km</div>
               </div>
               <div className="w-px h-6 bg-white/20" />
               <div className="flex flex-col items-center">
                 <div className="text-[9px] uppercase font-bold text-white/60">Arriv. ETA</div>
                 <div className="text-lg font-bold text-white leading-none">
                   {new Date(Date.now() + navigationDestination.eta * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 </div>
               </div>
             </Card>
          </div>
        )}
      </div>
      
      {/* Reroute Overlay */}
      {rerouteAnimation.active && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[2000] animate-in slide-in-from-top-4 duration-300">
           <div className={`px-4 py-2 rounded-full border shadow-xl flex items-center gap-3 backdrop-blur-md ${
             rerouteAnimation.status === 'rerouting' ? 'bg-amber-500/20 border-amber-500/50' : 'bg-green-500/20 border-green-500/50'
           }`}>
             <Zap className={`w-4 h-4 ${rerouteAnimation.status === 'rerouting' ? 'text-amber-400 animate-spin' : 'text-green-400'}`} />
             <div className="flex flex-col">
               <span className="text-[10px] font-bold text-white uppercase tracking-tighter">
                 {rerouteAnimation.status === 'rerouting' ? 'Computing Tactical Reroute...' : 'Reroute Optimized'}
               </span>
               <span className="text-[10px] text-white/60 font-mono">
                 {rerouteAnimation.status === 'rerouting' ? 'Analyzing zones...' : `+${rerouteAnimation.deltaDistance}m delta / ${rerouteAnimation.modifiedWaypoints} points`}
               </span>
             </div>
           </div>
        </div>
      )}

      {/* Command Authority Overlay (New Logic) */}
      {(missionState?.active || navigationDestination?.set) && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[2000] animate-in fade-in duration-500">
          <div className={`flex items-center gap-4 px-6 py-2.5 rounded-full border backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.4)] ${
            missionState?.active ? 'bg-green-500/10 border-green-500/40 text-green-400' : 'bg-marine-accent/10 border-marine-accent/40 text-marine-accent'
          }`}>
            <div className={`flex items-center gap-2 font-bold tracking-widest text-[11px] uppercase`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${missionState?.active ? 'bg-green-500' : 'bg-marine-accent'}`} />
              {missionState?.active ? 'Mission Command Active' : 'Navigation Authority Active'}
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="text-[10px] font-mono text-white/70">
              {missionState?.active ? `Executing WP ${missionState.currentWaypointIndex + 1}/${missionState.waypoints.length}` : `Transit to: ${navigationDestination.name}`}
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-6 px-2 text-[10px] hover:bg-white/10 text-white/50"
              onClick={() => {
                if (missionState?.active) contextStopMission('mission');
                else sendCommand({ type: 'CLEAR_NAVIGATION_DESTINATION', vesselId: 'V001' });
              }}
            >
              <X className="w-3 h-3 mr-1" /> Terminate
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
