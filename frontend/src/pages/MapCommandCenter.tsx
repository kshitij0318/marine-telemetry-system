import React, { useState, useRef, useEffect } from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';
import { Button } from '../app/components/ui/button';
import { Card } from '../app/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '../app/components/ui/tabs';
import { Navigation, Radar, Route, MapPin, Play, Square, Trash2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { TacticalMapHUD } from './TacticalMap';
import { SonarDisplay } from './SonarOverlayMap';
import { AvoidanceZone, Waypoint, RerouteAnimation } from './MissionPlanningMap';
import { MapContainer, TileLayer, Marker, Polyline, Polygon, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapCanvasOverlay } from './MapCanvasOverlay';
import { isOnWater } from '../utils/waterCheck';

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

// Distance helper
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// Segment intersection
function getIntersection(p1: any, p2: any, p3: any, p4: any) {
  const d = (p2.lng - p1.lng) * (p4.lat - p3.lat) - (p2.lat - p1.lat) * (p4.lng - p3.lng);
  if (d === 0) return null;
  const u = ((p3.lng - p1.lng) * (p4.lat - p3.lat) - (p3.lat - p1.lat) * (p4.lng - p3.lng)) / d;
  const v = ((p3.lng - p1.lng) * (p2.lat - p1.lat) - (p3.lat - p1.lat) * (p2.lng - p1.lng)) / d;
  if (u < 0 || u > 1 || v < 0 || v > 1) return null;
  return { lat: p1.lat + u * (p2.lat - p1.lat), lng: p1.lng + u * (p2.lng - p1.lng) };
}

function intersectsPolygon(p1: any, p2: any, poly: any[]) {
  for (let i = 0; i < poly.length; i++) {
    const p3 = poly[i];
    const p4 = poly[(i + 1) % poly.length];
    if (getIntersection(p1, p2, p3, p4)) return true;
  }
  return false;
}

const applyBuffer = (pt: {lat: number, lng: number}, center: {lat: number, lng: number}) => {
  const latDiff = pt.lat - center.lat;
  const lngDiff = pt.lng - center.lng;
  const dist = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  const bufferDeg = 0.0001; 
  return {
    lat: pt.lat + (latDiff / dist) * bufferDeg,
    lng: pt.lng + (lngDiff / dist) * bufferDeg,
  };
};

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
      onClick={() => map.setView([targetLat, targetLng], map.getZoom())}
      className="absolute top-4 right-4 bg-marine-dark/80 backdrop-blur-sm z-[1000] border border-marine-border"
    >
      <MapPin className="w-4 h-4 mr-2 text-marine-accent" />
      Re-center Map
    </Button>
  );
}

const VesselMarker = ({ followVessel }: { followVessel: boolean }) => {
  const { sensorData } = useTelemetry();
  const markerRef = useRef<L.Marker | null>(null);
  const map = useMap();

  // Create marker once on mount
  useEffect(() => {
    const icon = L.divIcon({
      className: '',
      html: `<div id="vessel-icon" style="
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

    const marker = L.marker([18.9000, 72.6500], { icon, zIndexOffset: 1000 });
    marker.addTo(map);
    markerRef.current = marker;

    return () => { marker.remove(); };
  }, [map]); // only on mount

  // Update position and rotation on every sensor update
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const { latitude, longitude, heading } = sensorData.gnss;
    if (!isFinite(latitude) || !isFinite(longitude)) return;

    // Move marker
    marker.setLatLng([latitude, longitude]);

    // Rotate the icon element
    const el = marker.getElement()?.querySelector('#vessel-icon') as HTMLElement;
    if (el) {
      el.style.transform = `rotate(${heading}deg) translateX(-50%)`;
    }
  }, [sensorData.gnss.latitude, sensorData.gnss.longitude, sensorData.gnss.heading]);

  // Handle map following
  useEffect(() => {
    if (followVessel && markerRef.current) {
      if (isFinite(sensorData.gnss.latitude) && isFinite(sensorData.gnss.longitude)) {
        map.panTo([sensorData.gnss.latitude, sensorData.gnss.longitude], { animate: true, duration: 0.5 });
      }
    }
  }, [sensorData.gnss.latitude, sensorData.gnss.longitude, followVessel, map]);

  return null;
};

export default function MapCommandCenter() {
  const { sensorData, sendCommand } = useTelemetry();
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

  const vesselPosition = { 
    lat: sensorData.gnss.latitude, 
    lng: sensorData.gnss.longitude 
  };

  const computeReroutedPath = (wps: Waypoint[], zones: AvoidanceZone[]): { newPath: Waypoint[]; modifiedWPsCount: number } => {
    if (wps.length < 2 || zones.length === 0) return { newPath: wps, modifiedWPsCount: 0 };
    let newPath: Waypoint[] = [wps[0]];
    let modifiedWPsCount = 0;

    for (let i = 0; i < wps.length - 1; i++) {
        const start = newPath[newPath.length - 1];
        const end = wps[i + 1];
        let collisionZone = null;
        for (const zone of zones) {
            if (!zone.visible) continue;
            if (intersectsPolygon(start, end, zone.points)) {
                collisionZone = zone; break;
            }
        }

        if (collisionZone) {
            let cy = 0, cx = 0;
            collisionZone.points.forEach((p: any) => { cy += p.lat; cx += p.lng; });
            cy /= collisionZone.points.length;
            cx /= collisionZone.points.length;
            const center = { lat: cy, lng: cx };

            let sortedByDistToStart = [...collisionZone.points].sort((a,b) => calculateDistance(start.lat, start.lng, a.lat, a.lng) - calculateDistance(start.lat, start.lng, b.lat, b.lng));
            let v1 = applyBuffer(sortedByDistToStart[0], center);
            let v2 = applyBuffer(sortedByDistToStart[1], center);

            newPath.push({ ...v1, id: `detour-A-${Date.now()}`, name: `REROUTE_A` });
            newPath.push({ ...v2, id: `detour-B-${Date.now()}`, name: `REROUTE_B` });
            modifiedWPsCount += 2;
        }
        newPath.push(end);
    }
    return { newPath, modifiedWPsCount };
  };

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

  // Radar sweep animation
  useEffect(() => {
    let frameId: number;
    let angle = radarSweepAngle;
    const sweep = () => {
      angle = (angle + 2) % 360;
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
          center={[18.9000, 72.6500]} 
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
          <RecenterControl targetLat={vesselPosition.lat} targetLng={vesselPosition.lng} />

          {/* Overlays dynamically rendering Tact, Radar */}
          <MapCanvasOverlay 
            mapMode={mapMode} 
            sensorData={sensorData} 
            radarSweepAngle={radarSweepAngle} 
            sonarEchoTrail={sonarEchoTrail} 
          />

          <VesselMarker followVessel={followVessel} />

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
                        Distance: {(calculateDistance(vesselPosition.lat, vesselPosition.lng, wp.lat, wp.lng) / 1000).toFixed(2)} km
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
              <div className="text-marine-accent font-mono">{vesselPosition.lat.toFixed(6)}°, {vesselPosition.lng.toFixed(6)}°</div>
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
