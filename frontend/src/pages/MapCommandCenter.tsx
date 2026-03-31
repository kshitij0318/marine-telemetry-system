import React, { useState, useRef, useEffect } from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';
import { Button } from '../app/components/ui/button';
import { Card } from '../app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../app/components/ui/tabs';
import { Navigation, Radar, Route, MapPin, Play, Square, Trash2, Plus } from 'lucide-react';
import { Input } from '../app/components/ui/input';
import { ParticleButton } from '../app/components/ParticleButton';
import { WelcomeBanner } from '../app/components/WelcomeBanner';

interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  name: string;
}

interface AvoidanceZone {
  id: string;
  points: Array<{ lat: number; lng: number }>;
}

export default function MapCommandCenter() {
  const { sensorData } = useTelemetry();
  const [mapMode, setMapMode] = useState<'navigation' | 'tactical' | 'sonar' | 'mission'>('navigation');
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [avoidanceZones, setAvoidanceZones] = useState<AvoidanceZone[]>([]);
  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [isMissionActive, setIsMissionActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const vesselPosition = {
    lat: sensorData.gnss.latitude,
    lng: sensorData.gnss.longitude,
  };

  // Convert lat/lng to canvas coordinates
  const latLngToCanvas = (lat: number, lng: number, width: number, height: number) => {
    const centerLat = vesselPosition.lat;
    const centerLng = vesselPosition.lng;
    const scale = 10000; // Adjust for zoom level
    
    const x = width / 2 + (lng - centerLng) * scale;
    const y = height / 2 - (lat - centerLat) * scale;
    
    return { x, y };
  };

  const canvasToLatLng = (x: number, y: number, width: number, height: number) => {
    const centerLat = vesselPosition.lat;
    const centerLng = vesselPosition.lng;
    const scale = 10000;
    
    const lng = centerLng + (x - width / 2) / scale;
    const lat = centerLat - (y - height / 2) / scale;
    
    return { lat, lng };
  };

  useEffect(() => {
    // Initial sync of mission state
    fetch('http://localhost:5000/api/missions')
      .then(r => r.json())
      .then(data => {
        setWaypoints(data.waypoints || []);
        setIsMissionActive(data.isActive || false);
      })
      .catch(err => console.error('Failed to sync mission state:', err));
  }, []);

  const syncWaypointsToBackend = async (newWaypoints: Waypoint[]) => {
    setWaypoints(newWaypoints);
    try {
      await fetch('http://localhost:5000/api/missions/waypoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waypoints: newWaypoints })
      });
    } catch (err) {
      console.error('Failed to sync waypoints to server:', err);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mapMode !== 'mission') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const { lat, lng } = canvasToLatLng(x, y, canvas.width, canvas.height);
    
    const newWaypoint: Waypoint = {
      id: `wp-${Date.now()}`,
      lat,
      lng,
      name: `WP${waypoints.length + 1}`,
    };
    
    syncWaypointsToBackend([...waypoints, newWaypoint]);
  };

  const removeWaypoint = (id: string) => {
    syncWaypointsToBackend(waypoints.filter(wp => wp.id !== id));
  };

  const clearWaypoints = async () => {
    setWaypoints([]);
    setIsMissionActive(false);
    try {
      await fetch('http://localhost:5000/api/missions/waypoints', { method: 'DELETE' });
    } catch (err) {
      console.error(err);
    }
  };

  const toggleMission = async () => {
    const newState = !isMissionActive;
    try {
      if (newState && waypoints.length === 0) return; // Prevent start if no waypoints
      await fetch(`http://localhost:5000/api/missions/${newState ? 'start' : 'stop'}`, { method: 'POST' });
      setIsMissionActive(newState);
    } catch (err) {
      console.error(err);
    }
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const getTotalDistance = () => {
    if (waypoints.length < 2) return 0;
    let total = calculateDistance(vesselPosition.lat, vesselPosition.lng, waypoints[0].lat, waypoints[0].lng);
    for (let i = 0; i < waypoints.length - 1; i++) {
      total += calculateDistance(waypoints[i].lat, waypoints[i].lng, waypoints[i + 1].lat, waypoints[i + 1].lng);
    }
    return total;
  };

  const getETA = () => {
    const distance = getTotalDistance();
    const speed = sensorData.gnss.speed * 0.514444; // Convert knots to m/s
    if (speed === 0) return 'N/A';
    const seconds = distance / speed;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = mapMode === 'tactical' ? '#000000' : '#0a1628';
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = mapMode === 'tactical' ? 'rgba(0, 255, 65, 0.1)' : 'rgba(0, 217, 255, 0.1)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Avoidance zones
    avoidanceZones.forEach(zone => {
      if (zone.points.length > 2) {
        ctx.beginPath();
        const firstPoint = latLngToCanvas(zone.points[0].lat, zone.points[0].lng, width, height);
        ctx.moveTo(firstPoint.x, firstPoint.y);
        zone.points.forEach(point => {
          const pos = latLngToCanvas(point.lat, point.lng, width, height);
          ctx.lineTo(pos.x, pos.y);
        });
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    // Route line
    if (waypoints.length > 0) {
      ctx.strokeStyle = mapMode === 'tactical' ? '#00ff41' : '#00d9ff';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      
      ctx.beginPath();
      const vesselPos = latLngToCanvas(vesselPosition.lat, vesselPosition.lng, width, height);
      ctx.moveTo(vesselPos.x, vesselPos.y);
      
      waypoints.forEach(wp => {
        const pos = latLngToCanvas(wp.lat, wp.lng, width, height);
        ctx.lineTo(pos.x, pos.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Waypoints
    waypoints.forEach((wp, index) => {
      const pos = latLngToCanvas(wp.lat, wp.lng, width, height);
      
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = mapMode === 'tactical' ? '#00ff41' : '#00d9ff';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px monospace';
      ctx.fillText(wp.name, pos.x + 12, pos.y + 4);
    });

    // Vessel
    const vesselPos = latLngToCanvas(vesselPosition.lat, vesselPosition.lng, width, height);
    const heading = (sensorData.gnss.heading * Math.PI) / 180;
    
    ctx.save();
    ctx.translate(vesselPos.x, vesselPos.y);
    ctx.rotate(heading);
    
    // Vessel triangle
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(-8, 10);
    ctx.lineTo(8, 10);
    ctx.closePath();
    ctx.fillStyle = mapMode === 'tactical' ? '#00ff41' : '#00d9ff';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();

    // OAS Detection Arc (Sonar mode)
    if (mapMode === 'sonar' && sensorData.oas.detections.length > 0) {
      sensorData.oas.detections.forEach(detection => {
        const detectionAngle = (detection.angle * Math.PI) / 180;
        const detectionDist = (detection.distance / sensorData.oas.range) * 200;
        const detectionX = vesselPos.x + Math.cos(detectionAngle) * detectionDist;
        const detectionY = vesselPos.y + Math.sin(detectionAngle) * detectionDist;
        
        const colors = {
          low: '#00ff00',
          medium: '#ffaa00',
          high: '#ff0000',
        };
        
        ctx.beginPath();
        ctx.arc(detectionX, detectionY, 6, 0, 2 * Math.PI);
        ctx.fillStyle = colors[detection.threat];
        ctx.shadowBlur = 15;
        ctx.shadowColor = colors[detection.threat];
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    }

  }, [vesselPosition, waypoints, avoidanceZones, mapMode, sensorData]);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Map Area */}
      <div className="flex-1 p-4">
        <Card className="h-full bg-marine-surface border-marine-border overflow-hidden">
          <Tabs value={mapMode} onValueChange={(v) => setMapMode(v as any)} className="h-full flex flex-col">
            <TabsList className="bg-marine-dark border-b border-marine-border rounded-none">
              <TabsTrigger value="navigation" className="flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                Navigation
              </TabsTrigger>
              <TabsTrigger value="tactical" className="flex items-center gap-2">
                <Radar className="w-4 h-4" />
                Tactical
              </TabsTrigger>
              <TabsTrigger value="sonar" className="flex items-center gap-2">
                <Radar className="w-4 h-4" />
                Sonar Overlay
              </TabsTrigger>
              <TabsTrigger value="mission" className="flex items-center gap-2">
                <Route className="w-4 h-4" />
                Mission Planning
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 relative">
              <canvas
                ref={canvasRef}
                width={1200}
                height={700}
                className="w-full h-full cursor-crosshair"
                onClick={handleCanvasClick}
              />
              
              {mapMode === 'mission' && (
                <div className="absolute top-4 left-4 bg-marine-dark/80 backdrop-blur-sm p-3 rounded-lg border border-marine-border">
                  <div className="text-xs text-marine-text-secondary mb-2">Click map to add waypoints</div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={isMissionActive ? "destructive" : "default"}
                      onClick={toggleMission}
                      className="flex items-center gap-2"
                    >
                      {isMissionActive ? (
                        <>
                          <Square className="w-3 h-3" />
                          Stop Mission
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3" />
                          Start Mission
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={clearWaypoints}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              {/* Status Display */}
              <div className="absolute bottom-4 left-4 bg-marine-dark/80 backdrop-blur-sm p-3 rounded-lg border border-marine-border">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-marine-text-secondary">Position</div>
                    <div className="text-marine-accent font-mono">
                      {vesselPosition.lat.toFixed(6)}°, {vesselPosition.lng.toFixed(6)}°
                    </div>
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
            </div>
          </Tabs>
        </Card>
      </div>

      {/* Waypoint Panel */}
      {mapMode === 'mission' && (
        <div className="w-80 p-4 pl-0">
          <Card className="h-full bg-marine-surface border-marine-border p-4">
            <h3 className="text-lg font-semibold text-marine-text mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-marine-accent" />
              Waypoints
            </h3>

            <div className="mb-4 p-3 bg-marine-dark rounded-lg border border-marine-border">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-marine-text-secondary">Total Distance:</span>
                  <span className="text-marine-accent font-mono">
                    {(getTotalDistance() / 1000).toFixed(2)} km
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-marine-text-secondary">ETA:</span>
                  <span className="text-marine-accent font-mono">{getETA()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-marine-text-secondary">Waypoints:</span>
                  <span className="text-marine-accent font-mono">{waypoints.length}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[calc(100%-200px)]">
              {waypoints.map((wp, index) => (
                <div
                  key={wp.id}
                  className="p-3 bg-marine-dark rounded-lg border border-marine-border hover:border-marine-accent transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-marine-accent font-semibold">{wp.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeWaypoint(wp.id)}
                      className="h-6 w-6 p-0 hover:bg-red-500/20"
                    >
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
              {waypoints.length === 0 && (
                <div className="text-center text-marine-text-secondary text-sm py-8">
                  Click on the map to add waypoints
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
