import React from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';
import { Card } from '../app/components/ui/card';
import { RadarDisplay } from '../app/components/RadarDisplay';
import { Radio, AlertTriangle, CheckCircle } from 'lucide-react';
import { SensorBar } from '../app/components/SensorBar';
import { Badge } from '../app/components/ui/badge';
import { useRingBuffer } from '../hooks/useRingBuffer';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function OASDashboard() {
  const { sensorData } = useTelemetry();
  
  const [stats, setStats] = React.useState({ total: 0, maxRange: 0, threatCounts: {low:0, medium:0, high:0} });

  const detectionCountData = useRingBuffer(sensorData.oas.detections.length, 60, 1000);
  const signalData = useRingBuffer(sensorData.oas.performance?.signalStrength ?? 0, 60, 1000);

  React.useEffect(() => {
    if (sensorData.oas.detections.length > 0) {
      setStats(prev => ({
        total: prev.total + sensorData.oas.detections.length,
        maxRange: Math.max(prev.maxRange, ...sensorData.oas.detections.map(d => d.distance)),
        threatCounts: {
          low: prev.threatCounts.low + sensorData.oas.detections.filter(d => d.threat === 'low').length,
          medium: prev.threatCounts.medium + sensorData.oas.detections.filter(d => d.threat === 'medium').length,
          high: prev.threatCounts.high + sensorData.oas.detections.filter(d => d.threat === 'high').length,
        }
      }));
    }
  }, [sensorData.oas.detections]);

  const getThreatLevel = () => {
    if (sensorData.oas.detections.length === 0) return 'none';
    const hasHigh = sensorData.oas.detections.some(d => d.threat === 'high');
    if (hasHigh) return 'high';
    const hasMed = sensorData.oas.detections.some(d => d.threat === 'medium');
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
    }
  };

  const getThreatBg = () => {
    switch (threatLevel) {
      case 'none': return 'bg-green-500/10 border-green-500/50';
      case 'low': return 'bg-green-500/10 border-green-500/50';
      case 'medium': return 'bg-amber-500/10 border-amber-500/50';
      case 'high': return 'bg-red-500/10 border-red-500/50';
    }
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
            <div className="text-2xl font-bold text-marine-accent">{sensorData.oas.range}m</div>
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-marine-accent" />
              <span className="text-xs text-marine-text-secondary">Detections</span>
            </div>
            <div className="text-2xl font-bold text-marine-accent">{sensorData.oas.detections.length}</div>
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
                sensorData.oas.status === 'active' ? 'bg-green-500' : 
                sensorData.oas.status === 'delayed' ? 'bg-amber-500' : 'bg-red-500'
              }`} />
              <span className="text-xs text-marine-text-secondary">Status</span>
            </div>
            <div className="text-sm font-medium text-marine-text capitalize">{sensorData.oas.status}</div>
          </Card>
        </div>

        {/* Main Radar Display */}
        <div className="grid grid-cols-3 gap-6">
          <Card className="col-span-2 bg-marine-surface border-marine-border p-6 flex flex-col items-center justify-center">
            <h3 className="text-lg font-semibold text-marine-text mb-4">Sonar Display</h3>
            <RadarDisplay
              detections={sensorData.oas.detections}
              range={sensorData.oas.range}
              size={500}
            />
          </Card>
          
          <div className="space-y-6">
            <Card className="bg-marine-surface border-marine-border p-6">
              <h3 className="text-lg font-semibold text-marine-text mb-4">Detection List</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {sensorData.oas.detections.length === 0 ? (
                  <div className="text-center text-marine-text-secondary text-sm py-8">
                    No obstacles detected
                  </div>
                ) : (
                  sensorData.oas.detections.map((detection, index) => (
                    <div
                      key={index}
                      className="p-3 bg-marine-dark rounded-lg border border-marine-border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-marine-text">
                          Object {index + 1}
                        </span>
                        <Badge
                          variant={detection.threat === 'high' ? 'destructive' : 'default'}
                          className={
                            detection.threat === 'medium' ? 'bg-amber-500 hover:bg-amber-600 border-none' :
                            detection.threat === 'low' ? 'bg-green-500 hover:bg-green-600 border-none' : ''
                          }
                        >
                          {detection.threat}
                        </Badge>
                      </div>
                      <div className="text-xs text-marine-text-secondary font-mono space-y-1">
                        <div>Distance: {(detection.distance ?? 0).toFixed(1)}m</div>
                        <div>Bearing: {(detection.angle ?? 0).toFixed(0)}°</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
            
            {threatLevel !== 'none' && (
              <Card className={`${getThreatBg()} p-4`}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className={`w-5 h-5 ${getThreatColor()} flex-shrink-0 mt-0.5`} />
                  <div>
                    <div className={`font-semibold ${getThreatColor()}`}>
                      {threatLevel === 'high' ? 'HIGH THREAT' :
                       threatLevel === 'medium' ? 'MODERATE THREAT' :
                       'LOW THREAT'}
                    </div>
                    <div className="text-sm text-marine-text-secondary mt-1">
                      {threatLevel === 'high' ? 'Immediate obstacle avoidance required' :
                       threatLevel === 'medium' ? 'Monitor situation closely' :
                       'Obstacle detected, maintain awareness'}
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

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
        </div>

        {/* Sonar Settings */}
        <div className="grid grid-cols-3 gap-6">
          <Card className="bg-marine-surface border-marine-border p-6">
            <h3 className="text-lg font-semibold text-marine-text mb-4">Configuration</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-marine-text-secondary">Operating Range</span>
                <span className="text-sm font-mono text-marine-accent">{sensorData.oas.config?.range ?? sensorData.oas.range}m</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-marine-text-secondary">Frequency</span>
                <span className="text-sm font-mono text-marine-accent">{sensorData.oas.config?.frequency ?? "N/A"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-marine-text-secondary">Beam Width</span>
                <span className="text-sm font-mono text-marine-accent">{sensorData.oas.config?.beamWidth ?? "N/A"}°</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-marine-text-secondary">Pulse Length</span>
                <span className="text-sm font-mono text-marine-accent">{sensorData.oas.config?.pulseLength ?? "N/A"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-marine-text-secondary">Mode</span>
                <span className="text-sm font-mono text-marine-accent">{sensorData.oas.config?.mode ?? "N/A"}</span>
              </div>
            </div>
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-6">
            <h3 className="text-lg font-semibold text-marine-text mb-4">Performance</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-marine-text-secondary">Ping Rate</span>
                <span className="text-sm font-mono text-marine-accent">{(sensorData.oas.performance?.pingRate ?? 0).toFixed(1)} Hz</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-marine-text-secondary">Signal Strength</span>
                <span className="text-sm font-mono text-marine-accent">{(sensorData.oas.performance?.signalStrength ?? 0).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-marine-text-secondary">Noise Floor</span>
                <span className="text-sm font-mono text-marine-accent">{(sensorData.oas.performance?.noiseFloor ?? 0).toFixed(1)} dB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-marine-text-secondary">Target Strength</span>
                <span className="text-sm font-mono text-marine-accent">{(sensorData.oas.performance?.targetStrength ?? 0).toFixed(1)} dB</span>
              </div>
            </div>
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-6">
            <h3 className="text-lg font-semibold text-marine-text mb-4">Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-marine-text-secondary">Total Detections</span>
                <span className="text-sm font-mono text-marine-accent">{stats.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-marine-text-secondary">Max Range</span>
                <span className="text-sm font-mono text-marine-accent">{stats.maxRange.toFixed(1)}m</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-marine-text-secondary">Threat Profile</span>
                <span className="text-sm font-mono text-marine-accent text-xs">
                  H:{stats.threatCounts.high} | M:{stats.threatCounts.medium} | L:{stats.threatCounts.low}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
