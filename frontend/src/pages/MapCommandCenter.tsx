import React, { useState, useRef, useEffect } from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';
import { Button } from '../app/components/ui/button';
import { Card } from '../app/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '../app/components/ui/tabs';
import { Navigation, Radar, Route, MapPin, Play, Square, Trash2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { TacticalMapHUD } from './TacticalMap';
import { SonarDisplay } from './SonarOverlayMap';
import { RerouteAnimation } from './MissionPlanningMap';
import { MapContainer, TileLayer, Marker, Polyline, Polygon, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapCanvasOverlay } from './MapCanvasOverlay';
import { isOnWater } from '../utils/waterCheck';
import { useAnimatedVesselPosition } from '../hooks/useAnimatedVesselPosition';
import { 
  Waypoint, 
  AvoidanceZone, 
  calculateDistance, 
  computeReroutedPath 
} from '../utils/routeUtils';


// Add CSS for the vessel marker
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    .vessel-marker-wrapper { background: none; border: none; }
    .vessel-marker-wrapper .svg-wrapper { transition: transform 0.1s linear; }
    .avoidance-zone-polygon { stroke: #ef4444; stroke-width: 2; fill: #ef4444; fill-opacity: 0.2; }
    .route-line { stroke: #00d4ff; stroke-width: 3; stroke-dasharray: 10, 10; animation: dash 20s linear infinite; }
    .reroute-line { stroke: #00ff41; stroke-width: 3; stroke-dasharray: 10, 10; animation: dash 20s linear infinite; }
    @keyframes dash { to { stroke-dashoffset: -1000; } }
  `;
  document.head.appendChild(style);
}

// Moved helpers to src/utils/routeUtils.ts for testability


function MapInteractionHandler({ mapMode, isDrawingZone, onMapClick, onMapDoubleClick }: any) {
  useMapEvents({
    click: (e) => onMapClick(e.latlng),
    dblclick: (e) => onMapDoubleClick(e.latlng)
  });
  return null;
}

function RecenterControl({ targetLat, targetLng }: { targetLat: number, targetLng: number }) {
  const map = useMap();
  return (
    <Button 
      size="sm" 
      variant="secondary"
      onClick={() => map.panTo([targetLat, targetLng], { animate: true, duration: 1.0 })}
      className="absolute top-4 right-4 bg-marine-dark/80 backdrop-blur-sm z-[1000] border border-marine-border hover:bg-marine-accent hover:text-marine-dark transition-colors"
    >
      <MapPin className="w-4 h-4 mr-2 text-marine-accent group-hover:text-marine-dark" />
      Re-center Map
    </Button>
  );
}

const VesselMarker = ({ followVessel, animatedPos }: { followVessel: boolean, animatedPos: any }) => {
  const markerRef = useRef<L.Marker | null>(null);
  const map = useMap();

  // Create marker once on mount
  useEffect(() => {
    const icon = L.divIcon({
      className: 'vessel-marker-wrapper',
      html: `<div id="vessel-icon" class="svg-wrapper" style="
        width: 0; height: 0;
        border-left: 9px solid transparent;
        border-right: 9px solid transparent;
        border-bottom: 26px solid #ff6b00;
        filter: drop-shadow(0 0 4px #000) drop-shadow(0 0 8px #ff6b00);
        transform-origin: 50% 66%;
        position: absolute;
        top: -13px;
        left: -9px;
      "></div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    const marker = L.marker([animatedPos.lat, animatedPos.lng], { icon, zIndexOffset: 1000 });
    marker.addTo(map);
    markerRef.current = marker;

    return () => { marker.remove(); };
  }, [map]);

  // Update position and rotation on every animation frame (from hook)
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    marker.setLatLng([animatedPos.lat, animatedPos.lng]);

    const el = marker.getElement()?.querySelector('#vessel-icon') as HTMLElement;
    if (el) {
      el.style.transform = `rotate(${animatedPos.heading}deg) translateX(-50%)`;
    }

    if (followVessel) {
      map.panTo([animatedPos.lat, animatedPos.lng], { animate: false });
    }
  }, [animatedPos.lat, animatedPos.lng, animatedPos.heading, followVessel, map]);

  return null;
};

export default function MapCommandCenter() {
  const { sensorData, sendCommand } = useTelemetry();
  const animatedPos = useAnimatedVesselPosition();
  const [mapMode, setMapMode] = useState<'navigation' | 'tactical' | 'sonar' | 'mission'>('navigation');

  
  const [originalWaypoints, setOriginalWaypoints] = useState<Waypoint[]>([]);
  const [reroutedWaypoints, setReroutedWaypoints] = useState<Waypoint[]>([]);
  const [avoidanceZones, setAvoidanceZones] = useState<AvoidanceZone[]>([]);
  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [currentZonePoints, setCurrentZonePoints] = useState<Array<{ lat: number; lng: number }>>([]);
  const [isMissionActive, setIsMissionActive] = useState(false);
  const [rerouteAnimation, setRerouteAnimation] = useState<RerouteAnimation>({
    active: false, status: 'complete', deltaDistance: 0, modifiedWaypoints: 0,
  });
  const [radarSweepAngle, setRadarSweepAngle] = useState(0);
  const [sonarEchoTrail, setSonarEchoTrail] = useState<Array<{ detections: any[], timestamp: number }>>([]);
  const [checkingWater, setCheckingWater] = useState(false);
  const [landError, setLandError] = useState('');

  // animatedPos is used for UI rendering (Feature 1)
  // sensorData is used for live telemetry math

// computeReroutedPath is now imported from src/utils/routeUtils.ts


  useEffect(() => {
    if (avoidanceZones.length > 0) {
      const { newPath, modifiedWPsCount } = computeReroutedPath(originalWaypoints, avoidanceZones);
      const getDist = (pts: Waypoint[]) => pts.reduce((sum, pt, i) => i === 0 ? 0 : sum + calculateDistance(pts[i-1].lat, pts[i-1].lng, pt.lat, pt.lng), 0);
      const oldDist = getDist(originalWaypoints);
      const newDist = getDist(newPath);
      const delta = Math.round(newDist - oldDist);

      if (modifiedWPsCount > 0) {
        setRerouteAnimation({ active: true, status: 'rerouting', deltaDistance: delta, modifiedWaypoints: modifiedWPsCount });
        setTimeout(() => {
          setReroutedWaypoints(newPath);
          setRerouteAnimation({ active: true, status: 'complete', deltaDistance: delta, modifiedWaypoints: modifiedWPsCount });
          setTimeout(() => {
            setRerouteAnimation({ active: false, status: 'complete', deltaDistance: delta, modifiedWaypoints: modifiedWPsCount });
          }, 2000);
        }, 300);
      } else {
        setReroutedWaypoints(originalWaypoints);
      }
    } else {
       setReroutedWaypoints(originalWaypoints);
    }
  }, [avoidanceZones, originalWaypoints]);

  const activeWaypoints = reroutedWaypoints.length > 0 ? reroutedWaypoints : originalWaypoints;

  const [followVessel, setFollowVessel] = useState(false);

  const startMission = () => {
    sendCommand({
      type: 'START_MISSION',
      waypoints: activeWaypoints.map(wp => ({ lat: wp.lat, lng: wp.lng }))
    });
    setIsMissionActive(true);
    setFollowVessel(true);
  };

  const stopMission = () => {
    sendCommand({ type: 'STOP_MISSION' });
    setIsMissionActive(false);
    setFollowVessel(false);
  };

  const handleMapClick = async (latlng: any) => {
    if (checkingWater) return; // Debounce during API check

    // Validate water before accepting any click in mission or zone drawing modes
    if (isDrawingZone || mapMode === 'mission') {
      setCheckingWater(true);
      try {
        const water = await isOnWater(latlng.lat, latlng.lng);
        if (!water) {
          setLandError('⚓ Invalid location — vessels cannot operate on land. Place waypoints in open water.');
          setTimeout(() => setLandError(''), 4000);
          return;
        }
      } catch {
        // API failed — allow placement (fail-open)
      } finally {
        setCheckingWater(false);
      }
    }

    if (isDrawingZone) {
      setCurrentZonePoints([...currentZonePoints, { lat: latlng.lat, lng: latlng.lng }]);
    } else if (mapMode === 'mission') {
      const newWaypoint: Waypoint = {
        id: `wp-${Date.now()}`,
        lat: latlng.lat,
        lng: latlng.lng,
        name: `WP${originalWaypoints.length + 1}`,
      };
      setOriginalWaypoints([...originalWaypoints, newWaypoint]);
    }
  };

  const handleMapDoubleClick = () => {
    if (isDrawingZone && currentZonePoints.length >= 3) {
      // Area approximation native math
      let area = 0;
      for (let i = 0; i < currentZonePoints.length; i++) {
        const j = (i + 1) % currentZonePoints.length;
        area += currentZonePoints[i].lng * currentZonePoints[j].lat;
        area -= currentZonePoints[j].lng * currentZonePoints[i].lat;
      }
      area = Math.abs(area / 2) * 111320 * 111320;

      const newZone: AvoidanceZone = {
        id: `zone-${Date.now()}`,
        points: currentZonePoints,
        area,
        visible: true,
      };
      setAvoidanceZones([...avoidanceZones, newZone]);
      setCurrentZonePoints([]);
      setIsDrawingZone(false);
    }
  };

  const toggleZoneVisibility = (id: string) => {
    setAvoidanceZones(zones => zones.map(zone => zone.id === id ? { ...zone, visible: !zone.visible } : zone));
  };
  const deleteZone = (id: string) => setAvoidanceZones(zones => zones.filter(zone => zone.id !== id));
  const removeWaypoint = (id: string) => setOriginalWaypoints(wps => wps.filter(wp => wp.id !== id));

  const getTotalDistance = () => {
    if (activeWaypoints.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < activeWaypoints.length - 1; i++) {
      total += calculateDistance(activeWaypoints[i].lat, activeWaypoints[i].lng, activeWaypoints[i + 1].lat, activeWaypoints[i + 1].lng);
    }
    return total;
  };
  const getETA = () => {
    const speed = sensorData.gnss.speed * 0.514444; 
    if (speed === 0) return 'N/A';
    const seconds = getTotalDistance() / speed;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  // Feature 7: Radar sweep animation (synchronized with RadarDisplay.tsx)
  useEffect(() => {
    let frameId: number;
    let angle = radarSweepAngle;
    const sweep = () => {
      // 1.5 degrees per frame at 60fps consistent with RadarDisplay
      angle = (angle + 1.5) % 360;
      setRadarSweepAngle(angle);
      frameId = requestAnimationFrame(sweep);
    };
    frameId = requestAnimationFrame(sweep);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Sonar trail maintenance
  useEffect(() => {
    if (mapMode === 'sonar' && sensorData.oas.detections && sensorData.oas.detections.length > 0) {
      setSonarEchoTrail(prev => {
        const newTrail = [{ detections: sensorData.oas.detections, timestamp: Date.now() }, ...prev.filter(item => Date.now() - item.timestamp < 5000)];
        return newTrail.slice(0, 10);
      });
    }
  }, [sensorData.oas.detections, mapMode]);

  // Dot icon for waypoints
  const dotIcon = L.divIcon({ html: '<div style="width:12px;height:12px;background:#00d4ff;border-radius:50%;border:2px solid #fff;box-shadow:0 0 10px #00d4ff;"></div>', className: 'wp-icon', iconSize: [12, 12], iconAnchor: [6, 6] });

  // Map Tiles
  const isDarkMap = mapMode === 'tactical' || mapMode === 'sonar';
  const tileUrl = isDarkMap ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-marine-surface overflow-hidden">
      
      {/* Land placement error banner */}
      {landError && (
        <div
          className="absolute left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm font-semibold text-white shadow-xl flex items-center gap-3 animate-fade-in"
          style={{ top: 72, zIndex: 1200, background: 'rgba(220,38,38,0.92)', backdropFilter: 'blur(8px)', border: '1px solid #ff3b3b' }}
        >
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {landError}
          <button onClick={() => setLandError('')} className="ml-2 opacity-70 hover:opacity-100 text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Water check loading indicator */}
      {checkingWater && (
        <div
          className="absolute left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-xs font-mono text-marine-accent bg-marine-dark/80 border border-marine-border backdrop-blur-sm"
          style={{ top: 72, zIndex: 1200 }}
        >
          Checking location…
        </div>
      )}

      {/* Map always mounted, never unmounts */}
      <div 
        className="absolute inset-0" 
        style={{ zIndex: 0, visibility: mapMode === 'sonar' ? 'hidden' : 'visible' }}
      >
        <MapContainer 
          center={[animatedPos.lat, animatedPos.lng]} 
          zoom={14} 
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
          doubleClickZoom={!isDrawingZone}
        >
          <TileLayer 
            key={isDarkMap ? 'dark' : 'light'} 
            url={tileUrl} 
            attribution="&copy; OpenStreetMap contributors" 
          />
          <MapInteractionHandler mapMode={mapMode} isDrawingZone={isDrawingZone} onMapClick={handleMapClick} onMapDoubleClick={handleMapDoubleClick} />
          <RecenterControl targetLat={animatedPos.lat} targetLng={animatedPos.lng} />


          {/* Overlays dynamically rendering Tact, Radar */}
          <MapCanvasOverlay 
            mapMode={mapMode} 
            sensorData={sensorData} 
            radarSweepAngle={radarSweepAngle} 
            sonarEchoTrail={sonarEchoTrail} 
          />

          <VesselMarker followVessel={followVessel} animatedPos={animatedPos} />


          {/* Mission Elements overlay inside Leaflet */}
          {mapMode === 'mission' && (
            <>
              {activeWaypoints.map(wp => (
                <Marker
                  key={wp.id}
                  position={[wp.lat, wp.lng] as [number,number]}
                  icon={dotIcon}
                  draggable
                  eventHandlers={{
                    dragend(e) {
                      const newPos = (e.target as L.Marker).getLatLng();
                      setOriginalWaypoints(wps => wps.map(w => w.id === wp.id ? { ...w, lat: newPos.lat, lng: newPos.lng } : w));
                    }
                  }}
                />
              ))}
              
              {originalWaypoints.length > 1 && (
                <Polyline positions={originalWaypoints.map(wp => [wp.lat, wp.lng] as [number,number])} pathOptions={{ color: '#00d4ff', weight: 2, dashArray: '6 4' }} />
              )}
              
              {reroutedWaypoints.length > 1 && reroutedWaypoints !== originalWaypoints && (
                <Polyline positions={reroutedWaypoints.map(wp => [wp.lat, wp.lng] as [number,number])} pathOptions={{ color: '#ff8c00', weight: 2, dashArray: '6 4' }} />
              )}

              {avoidanceZones.map(zone => zone.visible && (
                <Polygon key={zone.id} positions={zone.points.map(p => [p.lat, p.lng] as [number,number])} pathOptions={{ color: '#ff3b3b', fillColor: '#ff3b3b', fillOpacity: 0.15, weight: 2 }} />
              ))}

              {isDrawingZone && currentZonePoints.length > 0 && (
                <Polyline positions={currentZonePoints.map(p => [p.lat, p.lng] as [number,number])} pathOptions={{ color: '#ff3b3b', weight: 2, dashArray: '4 4' }} />
              )}
            </>
          )}
        </MapContainer>
      </div>

      {/* Tab bar floats above map */}
      <div className="absolute top-0 left-0 right-0" style={{ zIndex: 1000 }}>
        <Tabs value={mapMode} onValueChange={(v) => setMapMode(v as any)} className="w-full">
          <TabsList className="w-full bg-marine-dark/90 backdrop-blur-sm border-b border-marine-border rounded-none justify-start px-4">
            <TabsTrigger value="navigation" className="flex items-center gap-2"><Navigation className="w-4 h-4" />Navigation</TabsTrigger>
            <TabsTrigger value="tactical" className="flex items-center gap-2"><Radar className="w-4 h-4" />Tactical</TabsTrigger>
            <TabsTrigger value="sonar" className="flex items-center gap-2"><Radar className="w-4 h-4" />Sonar Overlay</TabsTrigger>
            <TabsTrigger value="mission" className="flex items-center gap-2"><Route className="w-4 h-4" />Mission Planning</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Mode-specific HUD panels */}
      {mapMode === 'sonar' && (
        <div className="absolute inset-0" style={{ zIndex: 500, backgroundColor: '#0a0f1e' }}>
          <SonarDisplay />
        </div>
      )}

      {mapMode === 'tactical' && (
        <div className="absolute top-16 left-4" style={{ zIndex: 1000 }}>
          <TacticalMapHUD sensorData={sensorData} />
        </div>
      )}

      {mapMode === 'mission' && (
        <>
          <div className="absolute top-16 left-4 bg-marine-dark/80 backdrop-blur-sm p-3 rounded-lg border border-marine-border z-[1000]">
            <div className="text-xs text-marine-text-secondary mb-2">{isDrawingZone ? 'Click to place vertices, double-click to finish' : 'Click map to add waypoints'}</div>
            <div className="flex gap-2">
              {!isDrawingZone && (
                <>
                  <Button size="sm" variant={isMissionActive ? "destructive" : "default"} onClick={isMissionActive ? stopMission : startMission} className="flex items-center gap-2">
                    {isMissionActive ? <><Square className="w-3 h-3" />Stop Mission</> : <><Play className="w-3 h-3" />Start Mission</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsDrawingZone(true)} className="flex items-center gap-2 border-red-500/50 hover:border-red-500 hover:bg-red-500/10">
                    <AlertTriangle className="w-3 h-3 text-red-400" />Draw Zone
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setOriginalWaypoints([]); setReroutedWaypoints([]); }} className="flex items-center gap-2">
                    <Trash2 className="w-3 h-3" />Clear
                  </Button>
                </>
              )}
              {isDrawingZone && (
                <Button size="sm" variant="destructive" onClick={() => { setIsDrawingZone(false); setCurrentZonePoints([]); }} className="flex items-center gap-2">
                  Cancel
                </Button>
              )}
            </div>
          </div>

          <div className="absolute top-16 right-4 w-80 bg-marine-dark/80 backdrop-blur-sm p-4 rounded-lg border border-marine-border z-[1000] flex flex-col gap-4 max-h-[calc(100vh-10rem)]">
            <h3 className="text-lg font-semibold text-marine-text flex items-center gap-2">
              <MapPin className="w-5 h-5 text-marine-accent" />
              Waypoints
            </h3>

            <div className="p-3 bg-marine-surface rounded-lg border border-marine-border text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-marine-text-secondary">Total Distance:</span>
                <span className="text-marine-accent font-mono">{(getTotalDistance() / 1000).toFixed(2)} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-marine-text-secondary">ETA:</span>
                <span className="text-marine-accent font-mono">{getETA()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-marine-text-secondary">Waypoints:</span>
                <span className="text-marine-accent font-mono">{activeWaypoints.length}</span>
              </div>
            </div>

            <div className="space-y-2 overflow-y-auto flex-1">
              {activeWaypoints.map((wp, index) => (
                <div key={wp.id} className="p-3 bg-marine-surface rounded-lg border border-marine-border hover:border-marine-accent transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-marine-accent font-semibold">{wp.name}</span>
                    <Button size="sm" variant="ghost" onClick={() => removeWaypoint(wp.id)} className="h-6 w-6 p-0 hover:bg-red-500/20">
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </Button>
                  </div>
                  <div className="text-xs text-marine-text-secondary font-mono space-y-1">
                    <div>Lat: {wp.lat.toFixed(6)}°</div>
                    <div>Lng: {wp.lng.toFixed(6)}°</div>
                    {index === 0 && (
                      <div className="text-marine-accent mt-1">
                        Distance: {(calculateDistance(animatedPos.lat, animatedPos.lng, wp.lat, wp.lng) / 1000).toFixed(2)} km

                      </div>
                    )}
                  </div>
                </div>
              ))}
              {activeWaypoints.length === 0 && <div className="text-center text-marine-text-secondary text-sm py-8">Click map to start route</div>}
            </div>

            {avoidanceZones.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4" />Avoidance Zones</h3>
                {avoidanceZones.map((zone, index) => (
                  <div key={zone.id} className="p-2 bg-marine-surface rounded-lg border border-red-500/30">
                    <div className="flex items-center justify-between">
                      <span className="text-red-400 font-mono text-xs">ZONE-{index + 1}</span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => toggleZoneVisibility(zone.id)} className="h-5 w-5 p-0">
                          {zone.visible ? <Eye className="w-3 h-3 text-marine-accent" /> : <EyeOff className="w-3 h-3 text-marine-text-secondary" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteZone(zone.id)} className="h-5 w-5 p-0">
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {rerouteAnimation.active && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 backdrop-blur-md p-3 rounded-lg border z-[1000]">
          {rerouteAnimation.status === 'rerouting' ? (
            <div className="flex items-center gap-2 bg-amber-900/40 border-amber-500/50 px-4 py-2 rounded-lg animate-pulse">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-ping"></div>
              <span className="text-amber-200 text-sm font-mono">Rerouting...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-green-900/40 border-green-500/50 px-4 py-2 rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-green-200 text-sm font-mono">Path Updated</span>
              <span className="text-marine-text-secondary text-xs">+{rerouteAnimation.deltaDistance}m</span>
            </div>
          )}
        </div>
      )}

      {/* Global Bottom HUD */}
      {mapMode !== 'sonar' && (
        <div className="absolute bottom-4 left-4 bg-marine-dark/80 backdrop-blur-sm p-3 rounded-lg border border-marine-border z-[1000]">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-marine-text-secondary">Position</div>
              <div className="text-marine-accent font-mono">{animatedPos.lat.toFixed(6)}°, {animatedPos.lng.toFixed(6)}°</div>

            </div>
            <div>
              <div className="text-marine-text-secondary">Speed</div>
              <div className="text-marine-accent font-mono">{sensorData.gnss.speed.toFixed(1)} kts</div>
            </div>
            <div>
              <div className="text-marine-text-secondary">Heading</div>
              <div className="text-marine-accent font-mono">{sensorData.gnss.heading.toFixed(0)}°</div>
            </div>
            <div>
              <div className="text-marine-text-secondary">Depth</div>
              <div className="text-marine-accent font-mono">{sensorData.ctd.depth.toFixed(1)} m</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
