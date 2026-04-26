import React, { useState } from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';
import { Card } from '../app/components/ui/card';
import { RadarDisplay } from '../app/components/RadarDisplay';
import { Radio, AlertTriangle, CheckCircle, Camera, ShieldAlert } from 'lucide-react';
import { Badge } from '../app/components/ui/badge';
import { useRingBuffer } from '../hooks/useRingBuffer';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../app/components/ui/tabs';
import { ShipDiagram } from '../app/components/ShipDiagram';
import { OASCameraFeed } from '../app/components/OASCameraFeed';
import { OASSensorPosition } from '../types/oasSensors';

export default function RadarDashboard() {
  const { sensorData } = useTelemetry();
  const [selectedCamera, setSelectedCamera] = useState<OASSensorPosition>('bow');
  
  // Statistics now come from backend — no local accumulation needed
  const detectionCountData = useRingBuffer(sensorData.radar.targets.length, 60, 1000);
  const signalData = useRingBuffer(sensorData.radar.performance?.signalStrength ?? 0, 60, 1000);

  // Keep local stats only as fallback when backend statistics haven't arrived
  const backendStats = sensorData.radar.statistics;

  const getThreatLevel = () => {
    if (sensorData.radar.targets.length === 0) return 'none';
    const hasCritical = sensorData.radar.targets.some(d => d.threat === 'critical');
    if (hasCritical) return 'critical';
    const hasHigh = sensorData.radar.targets.some(d => d.threat === 'high');
    if (hasHigh) return 'high';
    const hasMed = sensorData.radar.targets.some(d => d.threat === 'medium');
    if (hasMed) return 'medium';
    return 'low';
  };

  const threatLevel = getThreatLevel();

  const getThreatColor = () => {
    switch (threatLevel) {
      case 'none': return 'text-green-400';
      case 'low': return 'text-green-400';
      case 'medium': return 'text-amber-400';
      case 'high': return 'text-red-400';
      case 'critical': return 'text-red-600 animate-pulse';
    }
  };

  const getThreatBg = () => {
    switch (threatLevel) {
      case 'none': return 'bg-green-500/10 border-green-500/50';
      case 'low': return 'bg-green-500/10 border-green-500/50';
      case 'medium': return 'bg-amber-500/10 border-amber-500/50';
      case 'high': return 'bg-red-500/10 border-red-500/50';
      case 'critical': return 'bg-red-900/40 border-red-500/80';
    }
  };

  const activeSensorPayload = sensorData.radar.oasSensors?.find((s: any) => s.position === selectedCamera) || null;

  const getThreatsByPosition = () => {
    const threats: Record<OASSensorPosition, string> = {
      'bow': 'low', 'starboard-bow': 'low', 'starboard-quarter': 'low',
      'stern': 'low', 'port-quarter': 'low', 'port-bow': 'low'
    };
    
    sensorData.radar.oasSensors?.forEach((sensor: any) => {
      let highestThreat = 'low';
      if (sensor.visibleTargets.some((t: any) => t.threat === 'critical')) highestThreat = 'critical';
      else if (sensor.visibleTargets.some((t: any) => t.threat === 'high')) highestThreat = 'high';
      else if (sensor.visibleTargets.some((t: any) => t.threat === 'medium')) highestThreat = 'medium';
      threats[sensor.position as OASSensorPosition] = highestThreat;
    });
    
    return threats;
  };

  return (
    <div>
      <div className="p-6 space-y-6">
        {/* Summary Strip */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-marine-surface border-marine-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Radio className="w-4 h-4 text-marine-accent" />
              <span className="text-xs text-marine-text-secondary">Range</span>
            </div>
            <div className="text-2xl font-bold text-marine-accent">{sensorData.radar.range}m</div>
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-marine-accent" />
              <span className="text-xs text-marine-text-secondary">Targets</span>
            </div>
            <div className="text-2xl font-bold text-marine-accent">{sensorData.radar.targets.length}</div>
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-marine-accent" />
              <span className="text-xs text-marine-text-secondary">Threat Level</span>
            </div>
            <div className={`text-xl font-bold capitalize ${getThreatColor()}`}>{threatLevel}</div>
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                sensorData.radar.status === 'active' ? 'bg-green-500' : 
                sensorData.radar.status === 'delayed' ? 'bg-amber-500' : 'bg-red-500'
              }`} />
              <span className="text-xs text-marine-text-secondary">Status</span>
            </div>
            <div className="text-sm font-medium text-marine-text capitalize">{sensorData.radar.status}</div>
          </Card>
        </div>

        {threatLevel !== 'none' && threatLevel !== 'low' && (
          <Card className={`${getThreatBg()} p-4 flex justify-between items-center`}>
            <div className="flex items-start gap-3">
              <ShieldAlert className={`w-8 h-8 ${getThreatColor()} flex-shrink-0`} />
              <div>
                <div className={`text-lg font-bold ${getThreatColor()}`}>
                  {threatLevel === 'critical' ? 'CRITICAL COLLISION RISK' :
                   threatLevel === 'high' ? 'HIGH THREAT' :
                   'MODERATE THREAT'}
                </div>
                <div className="text-sm text-marine-text-secondary mt-1">
                  {threatLevel === 'critical' ? 'Immediate evasive action required.' :
                   threatLevel === 'high' ? 'Stand by for maneuvering.' :
                   'Monitor situation closely.'}
                </div>
              </div>
            </div>
            {sensorData.radar.suggestedManeuver && (
              <div className="bg-black/50 p-3 rounded border border-marine-border text-right">
                <div className="text-xs text-marine-text-secondary uppercase">Suggested Maneuver (COLREGs)</div>
                <div className="text-green-400 font-bold font-mono text-lg">{sensorData.radar.suggestedManeuver.action}</div>
                <div className="text-xs text-marine-text-secondary">{sensorData.radar.suggestedManeuver.reason}</div>
              </div>
            )}
          </Card>
        )}

        {/* Main Interface Tabs */}
        <Tabs defaultValue="cameras" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-marine-surface border border-marine-border h-12">
            <TabsTrigger value="cameras" className="data-[state=active]:bg-marine-accent/20 data-[state=active]:text-marine-accent">OAS Cameras</TabsTrigger>
            <TabsTrigger value="radar" className="data-[state=active]:bg-marine-accent/20 data-[state=active]:text-marine-accent">Radar & Targets ({sensorData.radar.targets.length})</TabsTrigger>
            <TabsTrigger value="config" className="data-[state=active]:bg-marine-accent/20 data-[state=active]:text-marine-accent">Config</TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-marine-accent/20 data-[state=active]:text-marine-accent">Performance</TabsTrigger>
            <TabsTrigger value="statistics" className="data-[state=active]:bg-marine-accent/20 data-[state=active]:text-marine-accent">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="cameras" className="mt-6">
            <div className="grid grid-cols-3 gap-6">
              <Card className="col-span-1 bg-marine-surface border-marine-border p-6">
                <h3 className="text-lg font-semibold text-marine-text mb-4 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-marine-accent" />
                  Camera Selection
                </h3>
                <ShipDiagram 
                  selectedCamera={selectedCamera} 
                  onSelectCamera={setSelectedCamera} 
                  threatsByPosition={getThreatsByPosition()} 
                />
                <div className="mt-6 text-center text-sm text-marine-text-secondary">
                  Click a camera zone to view its live optical feed.
                </div>
              </Card>
              <div className="col-span-2">
                <OASCameraFeed 
                  payload={activeSensorPayload} 
                  sensorId={activeSensorPayload?.sensorId || 'OAS-CAM-1'} 
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="radar" className="mt-6">
            <div className="grid grid-cols-3 gap-6">
              <Card className="col-span-2 bg-marine-surface border-marine-border p-6 flex flex-col items-center justify-center">
                <h3 className="text-lg font-semibold text-marine-text mb-4">Radar Sweep</h3>
                <RadarDisplay
                  detections={sensorData.radar.detections}
                  range={sensorData.radar.range}
                  size={500}
                />
              </Card>

              <div className="col-span-1 flex flex-col gap-6">
                <Card className="bg-marine-surface border-marine-border p-6 flex-1 flex flex-col">
                  <h3 className="text-lg font-semibold text-marine-text mb-4 flex-shrink-0">Target List</h3>
                  <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1" style={{ maxHeight: '500px' }}>
                    {sensorData.radar.targets.length === 0 ? (
                      <div className="text-center text-marine-text-secondary text-sm py-8">
                        No targets detected
                      </div>
                    ) : (
                      <table className="w-full text-left text-sm">
                        <thead className="bg-marine-dark text-marine-text-secondary border-b border-marine-border sticky top-0">
                          <tr>
                            <th className="p-2 font-medium">ID</th>
                            <th className="p-2 font-medium">RNG/BRG</th>
                            <th className="p-2 font-medium">CPA/TCPA</th>
                            <th className="p-2 font-medium">CRI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sensorData.radar.targets.sort((a, b) => b.cri - a.cri).map((t, idx) => (
                            <tr key={idx} className="border-b border-marine-border/50 hover:bg-marine-accent/5 transition-colors font-mono">
                              <td className="p-2 text-marine-text font-bold">
                                <div>{t.id}</div>
                                <div className="text-[9px] text-marine-text-secondary uppercase">{t.type}</div>
                              </td>
                              <td className="p-2 text-xs">
                                <div>{t.rangem.toFixed(0)}m</div>
                                <div className="text-marine-text-secondary">{t.absoluteBearingDeg.toFixed(1)}°</div>
                              </td>
                              <td className="p-2 text-xs">
                                <div>{t.cpa.toFixed(0)}m</div>
                                <div className="text-marine-text-secondary">{t.tcpa.toFixed(0)}s</div>
                              </td>
                              <td className="p-2">
                                <Badge
                                  variant={t.threat === 'high' || t.threat === 'critical' ? 'destructive' : 'default'}
                                  className={
                                    t.threat === 'critical' ? 'bg-red-600 hover:bg-red-700 border-none animate-pulse text-[10px]' :
                                    t.threat === 'medium' ? 'bg-amber-500 hover:bg-amber-600 border-none text-[10px]' :
                                    t.threat === 'low' ? 'bg-green-500 hover:bg-green-600 border-none text-[10px]' : 'text-[10px]'
                                  }
                                >
                                  {t.cri.toFixed(2)}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="config" className="mt-6">
            <Card className="bg-marine-surface border-marine-border p-6">
              <h3 className="text-lg font-semibold text-marine-text mb-4">Configuration</h3>
              <div className="space-y-3 max-w-md">
                <div className="flex justify-between items-center border-b border-marine-border pb-2">
                  <span className="text-sm text-marine-text-secondary">Operating Range</span>
                  <span className="text-sm font-mono text-marine-accent">{sensorData.radar.config?.operatingRange ?? sensorData.radar.range}m</span>
                </div>
                <div className="flex justify-between items-center border-b border-marine-border pb-2">
                  <span className="text-sm text-marine-text-secondary">Frequency</span>
                  <span className="text-sm font-mono text-marine-accent">{sensorData.radar.config?.frequency != null ? `${sensorData.radar.config.frequency.toFixed(1)} GHz` : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-marine-border pb-2">
                  <span className="text-sm text-marine-text-secondary">Beam Width</span>
                  <span className="text-sm font-mono text-marine-accent">{sensorData.radar.config?.beamWidth ?? 'N/A'}°</span>
                </div>
                <div className="flex justify-between items-center border-b border-marine-border pb-2">
                  <span className="text-sm text-marine-text-secondary">Pulse Length</span>
                  <span className="text-sm font-mono text-marine-accent">{sensorData.radar.config?.pulseLength != null ? `${sensorData.radar.config.pulseLength.toFixed(3)} ms` : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-marine-border pb-2">
                  <span className="text-sm text-marine-text-secondary">Mode</span>
                  <span className="text-sm font-mono text-marine-accent">{sensorData.radar.config?.mode ?? 'N/A'}</span>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="mt-6">
             <div className="grid grid-cols-2 gap-6">
                <Card className="bg-marine-surface border-marine-border p-6">
                  <h3 className="text-lg font-semibold text-marine-text mb-4">Signal Strength Over Time</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={signalData}>
                      <defs>
                        <linearGradient id="signalGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00d9ff" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#00d9ff" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a2d47" />
                      <XAxis dataKey="t" stroke="#8ba7be" fontSize={12} tickFormatter={t => new Date(t).toLocaleTimeString()} hide />
                      <YAxis stroke="#8ba7be" fontSize={12} domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f1e33', border: '1px solid #1a2d47', borderRadius: '8px', color: '#e8f4f8' }}
                        labelFormatter={t => new Date(t).toLocaleTimeString()}
                      />
                      <Area type="monotone" dataKey="v" stroke="#00d9ff" fillOpacity={1} fill="url(#signalGradient)" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="bg-marine-surface border-marine-border p-6">
                  <h3 className="text-lg font-semibold text-marine-text mb-4">Performance Metrics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-marine-border pb-2">
                      <span className="text-sm text-marine-text-secondary">Ping Rate</span>
                      <span className="text-sm font-mono text-marine-accent">{(sensorData.radar.performance?.pingRate ?? 0).toFixed(1)} Hz</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-marine-border pb-2">
                      <span className="text-sm text-marine-text-secondary">Signal Strength</span>
                      <span className="text-sm font-mono text-marine-accent">{(sensorData.radar.performance?.signalStrength ?? 0).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-marine-border pb-2">
                      <span className="text-sm text-marine-text-secondary">Noise Floor</span>
                      <span className="text-sm font-mono text-marine-accent">{(sensorData.radar.performance?.noiseFloor ?? 0).toFixed(1)} dB</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-marine-border pb-2">
                      <span className="text-sm text-marine-text-secondary">Target Strength</span>
                      <span className="text-sm font-mono text-marine-accent">{(sensorData.radar.performance?.targetStrength ?? 0).toFixed(1)} dB</span>
                    </div>
                  </div>
                </Card>
             </div>
          </TabsContent>

          <TabsContent value="statistics" className="mt-6">
            <div className="grid grid-cols-2 gap-6">
              <Card className="bg-marine-surface border-marine-border p-6">
                <h3 className="text-lg font-semibold text-marine-text mb-4">Detection Count Over Time</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={detectionCountData}>
                    <defs>
                      <linearGradient id="detectGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2d47" />
                    <XAxis dataKey="t" stroke="#8ba7be" fontSize={12} tickFormatter={t => new Date(t).toLocaleTimeString()} hide />
                    <YAxis stroke="#8ba7be" fontSize={12} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f1e33', border: '1px solid #1a2d47', borderRadius: '8px', color: '#e8f4f8' }}
                      labelFormatter={t => new Date(t).toLocaleTimeString()}
                    />
                    <Area type="monotone" dataKey="v" stroke="#ef4444" fillOpacity={1} fill="url(#detectGradient)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              <Card className="bg-marine-surface border-marine-border p-6">
                <h3 className="text-lg font-semibold text-marine-text mb-4">Cumulative Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-marine-border pb-2">
                    <span className="text-sm text-marine-text-secondary">Total Detections</span>
                    <span className="text-sm font-mono text-marine-accent">{backendStats?.totalDetections ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-marine-border pb-2">
                    <span className="text-sm text-marine-text-secondary">Max Range Observed</span>
                    <span className="text-sm font-mono text-marine-accent">{(backendStats?.maxRange ?? 0).toFixed(1)}m</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-marine-border pb-2">
                    <span className="text-sm text-marine-text-secondary">High/Critical Threats</span>
                    <span className="text-sm font-mono text-red-400">{backendStats?.threatCounts?.high ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-marine-border pb-2">
                    <span className="text-sm text-marine-text-secondary">Medium Threats</span>
                    <span className="text-sm font-mono text-amber-400">{backendStats?.threatCounts?.medium ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-marine-border pb-2">
                    <span className="text-sm text-marine-text-secondary">Low Threats</span>
                    <span className="text-sm font-mono text-green-400">{backendStats?.threatCounts?.low ?? 0}</span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
