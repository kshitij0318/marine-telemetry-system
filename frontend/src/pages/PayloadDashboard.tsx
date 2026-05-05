import React, { useState, useCallback, useMemo } from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';
import { OASCameraFeed } from '../app/components/OASCameraFeed';
import { 
  Package, Camera, Activity, AlertTriangle, 
  ChevronRight, Eye, Download, Clock, Crosshair,
  Shield, Zap, Target, ArrowRight, Layers
} from 'lucide-react';
import { Card } from '../app/components/ui/card';
import { OAS_SENSORS } from '../types/oasSensors';

function ShipDiagram({
  activeSensorId,
  onSensorClick,
  detectionCounts,
}: {
  activeSensorId: string;
  onSensorClick: (id: string) => void;
  detectionCounts: Record<string, number>;
}) {
  const CAM_POS: Record<string, { x: number; y: number }> = {
    'OAS-CAM-1': { x: 0.5, y: 0.05 },   // Bow (top)
    'OAS-CAM-2': { x: 0.85, y: 0.25 },  // Stbd Bow
    'OAS-CAM-3': { x: 0.85, y: 0.72 },  // Stbd Quarter
    'OAS-CAM-4': { x: 0.5,  y: 0.92 },  // Stern (bottom)
    'OAS-CAM-5': { x: 0.15, y: 0.72 },  // Port Quarter
    'OAS-CAM-6': { x: 0.15, y: 0.25 },  // Port Bow
  };

  return (
    <div className="relative w-full" style={{ paddingBottom: '160%' }}>
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Ship silhouette */}
        <svg viewBox="0 0 80 160" className="absolute w-1/2 opacity-20" fill="#00d4ff" stroke="none">
          <ellipse cx="40" cy="80" rx="18" ry="60" />
          <polygon points="40,8 24,30 56,30" />
        </svg>

        {/* Camera buttons */}
        {Object.values(OAS_SENSORS).map(sensor => {
          const pos = CAM_POS[sensor.id];
          const isActive = activeSensorId === sensor.id;
          const count = detectionCounts[sensor.id] ?? 0;
          return (
            <button
              key={sensor.id}
              onClick={() => onSensorClick(sensor.id)}
              title={sensor.label}
              style={{
                position: 'absolute',
                left: `${pos.x * 100}%`,
                top: `${pos.y * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-200 z-10
                ${isActive
                  ? 'bg-marine-accent border-marine-accent shadow-[0_0_14px_rgba(0,212,255,0.6)] scale-110'
                  : count > 0
                    ? 'bg-amber-500/20 border-amber-500 hover:bg-amber-500/30'
                    : 'bg-marine-surface/60 border-marine-border hover:border-marine-accent/60'
                }`}
            >
              <Camera className={`w-3.5 h-3.5 ${isActive ? 'text-marine-dark' : count > 0 ? 'text-amber-400' : 'text-marine-text-secondary'}`} />
              {count > 0 && !isActive && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-black text-[7px] font-bold rounded-full flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface LogEntry {
  id: string;
  time: string;
  cam: string;
  note: string;
}

export default function PayloadDashboard() {
  const { sensorData } = useTelemetry();
  const [activeCamId, setActiveCamId] = useState<string>('OAS-CAM-1');
  const [deployLog, setDeployLog] = useState<LogEntry[]>([]);

  const oasSensorData: any[] = sensorData.radar?.oasSensors ?? [];

  const detectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    oasSensorData.forEach((s: any) => {
      counts[s.sensorId] = s.visibleTargets?.length ?? 0;
    });
    return counts;
  }, [oasSensorData]);

  const activeSensorData = useMemo(() => 
    oasSensorData.find((s: any) => s.sensorId === activeCamId),
    [oasSensorData, activeCamId]
  );

  const activeDetections = activeSensorData?.visibleTargets ?? [];
  const nearestObstacle = useMemo(() => {
    if (!activeDetections.length) return null;
    return [...activeDetections].sort((a, b) => a.distance - b.distance)[0];
  }, [activeDetections]);

  const handleLogDeploy = useCallback(() => {
    const sensor = Object.values(OAS_SENSORS).find(s => s.id === activeCamId);
    const now = new Date().toLocaleTimeString();
    setDeployLog(prev => [{
      id: `log-${Date.now()}`,
      time: now,
      cam: sensor?.label ?? 'Unknown',
      note: `${activeDetections.length} obstacle(s) detected. Nearest: ${nearestObstacle ? `${nearestObstacle.distance.toFixed(0)}m` : 'N/A'}`,
    }, ...prev.slice(0, 9)]);
  }, [activeCamId, activeDetections, nearestObstacle]);

  const thumbnailSensors = Object.values(OAS_SENSORS).filter(s => s.id !== activeCamId);

  return (
    <div className="flex flex-col h-full bg-marine-dark p-4 gap-4 overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-marine-accent/10 rounded-2xl border border-marine-accent/20">
            <Package className="w-8 h-8 text-marine-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-marine-text tracking-tighter uppercase italic leading-none">Payload Deployment</h2>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
              <span className="text-[10px] text-marine-text-secondary font-black uppercase tracking-[0.3em]">
                OAS Visualizer · {Object.values(detectionCounts).reduce((a, b) => a + b, 0)} Targets Identified
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleLogDeploy}
            className="flex items-center gap-2 px-6 py-3 bg-marine-accent hover:bg-marine-accent/80 text-marine-dark font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-marine-accent/20 active:scale-95"
          >
            <Download className="w-4 h-4" /> Log Deployment Site
          </button>
        </div>
      </div>

      {/* ── Main Tactical View ──────────────────────────────────────────────── */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Sensor Array & Analysis */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-4">
          <Card className="bg-marine-surface border-marine-border p-5 flex-shrink-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <Shield className="w-12 h-12 text-marine-accent" />
            </div>
            <h3 className="text-[10px] font-black text-marine-text-secondary uppercase tracking-[0.3em] mb-4">
              Tactical Sensor Array
            </h3>
            <ShipDiagram
              activeSensorId={activeCamId}
              onSensorClick={setActiveCamId}
              detectionCounts={detectionCounts}
            />
          </Card>

          {/* Tactical Analysis Panel */}
          <Card className="bg-marine-surface border-marine-border p-4 flex-1 flex flex-col gap-4 overflow-hidden">
            <h3 className="text-[10px] font-black text-marine-text-secondary uppercase tracking-[0.3em] flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-marine-accent" />
              Tactical Analysis
            </h3>
            
            <div className="space-y-4">
              <div className="p-3 bg-marine-dark/50 border border-marine-border rounded-xl">
                <div className="text-[9px] font-bold text-marine-text-secondary uppercase mb-2">Nearest Hazard</div>
                {nearestObstacle ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-4 h-4 ${nearestObstacle.threat === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
                      <span className="text-xl font-mono font-bold text-white">{nearestObstacle.distance.toFixed(0)}m</span>
                    </div>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${
                      nearestObstacle.threat === 'critical' ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-amber-500/10 border-amber-500 text-amber-500'
                    } uppercase`}>
                      {nearestObstacle.threat}
                    </span>
                  </div>
                ) : (
                  <div className="text-xs font-mono text-green-400 font-bold">CLEAR SECTOR</div>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-[9px] font-bold text-marine-text-secondary uppercase">Sector Health</div>
                <div className="flex flex-col gap-1.5">
                  {Object.values(OAS_SENSORS).map(s => (
                    <div key={s.id} className="flex items-center justify-between text-[10px]">
                      <span className="text-marine-text-secondary">{s.label}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1 bg-marine-border rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${detectionCounts[s.id] > 0 ? 'bg-amber-500' : 'bg-green-500'}`}
                            style={{ width: `${detectionCounts[s.id] > 0 ? '70%' : '100%'}` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-marine-text-secondary">{detectionCounts[s.id] > 0 ? 'WARN' : 'OK'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-marine-border">
              <div className="p-3 bg-marine-accent/5 border border-marine-accent/20 rounded-xl flex items-center gap-3">
                <Target className="w-5 h-5 text-marine-accent" />
                <div className="text-[9px] font-bold text-marine-accent uppercase leading-tight">
                  Verification Mode Active<br/>
                  <span className="text-white opacity-60">Obstacle Overlays Loaded</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Center: Tactical OAS Feed */}
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          <Card className="flex-1 bg-black border-marine-border overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.7)] group">
            <OASCameraFeed
              payload={activeSensorData}
              sensorId={activeCamId}
            />
            
            {/* Visual Assistance Overlays */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
              <div className="px-3 py-2 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">LIVE FEED · {activeCamId}</span>
                  <span className="text-[8px] font-bold text-marine-accent uppercase opacity-80">Tactical Overlay Enabled</span>
                </div>
              </div>
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
              <div className="px-4 py-2 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-white/40 uppercase">Bearing</span>
                  <span className="text-xs font-mono font-bold text-marine-accent">000.00°</span>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-white/40 uppercase">Altitude</span>
                  <span className="text-xs font-mono font-bold text-marine-accent">-2.4m</span>
                </div>
              </div>
              
              <div className="px-4 py-2 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Horizon Lock</span>
                  <div className="w-8 h-4 bg-marine-accent/20 rounded-full relative">
                    <div className="absolute right-1 top-1 w-2 h-2 bg-marine-accent rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Peripheral Awareness Thumbnails */}
          <div className="grid grid-cols-5 gap-3 h-32 flex-shrink-0">
            {thumbnailSensors.map(sensor => {
              const sd = oasSensorData.find((d: any) => d.sensorId === sensor.id);
              const dets = sd?.visibleTargets ?? [];
              return (
                <button
                  key={sensor.id}
                  onClick={() => setActiveCamId(sensor.id)}
                  className={`relative rounded-xl overflow-hidden border transition-all duration-300 bg-black group
                    ${dets.length > 0 ? 'border-amber-500/50 hover:border-amber-500' : 'border-marine-border hover:border-marine-accent'}
                  `}
                >
                  <OASCameraFeed
                    payload={sd}
                    sensorId={sensor.id}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                    <span className="text-[9px] font-black text-white uppercase tracking-tighter group-hover:text-marine-accent transition-colors">{sensor.label}</span>
                  </div>
                  {dets.length > 0 && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-500/20 border border-amber-500/40 rounded px-1.5 py-0.5">
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
                      <span className="text-[9px] font-black text-amber-500">{dets.length}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-marine-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Deployment Archive ─────────────────────────────────────────────── */}
      <Card className="bg-marine-surface border-marine-border p-4 flex-shrink-0 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-marine-accent/30" />
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-black text-marine-text-secondary uppercase tracking-[0.3em] flex items-center gap-2">
            <Clock className="w-4 h-4 text-marine-accent" />
            Deployment & Verification Log
          </h3>
          <div className="flex gap-4">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[9px] font-bold text-marine-text-secondary uppercase">Site Verified</span>
             </div>
             {deployLog.length > 0 && (
              <button onClick={() => setDeployLog([])} className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase transition-colors tracking-widest">
                Purge Archive
              </button>
            )}
          </div>
        </div>
        
        <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
          {deployLog.length === 0 ? (
            <div className="w-full flex items-center justify-center py-4 border-2 border-dashed border-marine-border rounded-xl">
              <span className="text-[10px] font-mono text-marine-text-secondary uppercase tracking-widest">No site verifications archived in current session</span>
            </div>
          ) : (
            deployLog.map(entry => (
              <div key={entry.id} className="flex-shrink-0 bg-marine-dark/50 border border-marine-border rounded-xl p-4 min-w-[220px] transition-all hover:border-marine-accent/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-mono text-marine-text-secondary">{entry.time}</span>
                  <div className="p-1 bg-marine-accent/10 rounded">
                    <Camera className="w-3 h-3 text-marine-accent" />
                  </div>
                </div>
                <div className="text-[11px] font-black text-white uppercase mb-1">{entry.cam} SECTOR LOG</div>
                <div className="text-[10px] text-marine-text-secondary font-mono leading-relaxed">{entry.note}</div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
