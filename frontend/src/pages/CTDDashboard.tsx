import React from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';
import { Card } from '../app/components/ui/card';
import { ArcGauge } from '../app/components/ArcGauge';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Droplet, Thermometer, Gauge } from 'lucide-react';
import { useRingBuffer } from '../hooks/useRingBuffer';

export default function CTDDashboard() {
  const { sensorData } = useTelemetry();
  
  const tempData = useRingBuffer(sensorData.ctd.temperature, 120, 500);
  const depthData = useRingBuffer(sensorData.ctd.depth, 120, 500);
  const salinityData = useRingBuffer(sensorData.ctd.salinity, 120, 500);
  const pressureData = useRingBuffer(sensorData.ctd.pressure, 120, 500);
  const conductivityData = useRingBuffer(sensorData.ctd.conductivity, 120, 500);
  
  const [profile, setProfile] = React.useState<{x: number, y: number}[]>([]);
  React.useEffect(() => {
    setProfile(p => [...p.slice(-300), {
      x: +(sensorData.ctd.temperature ?? 0).toFixed(2),
      y: +(sensorData.ctd.depth ?? 0).toFixed(2)
    }]);
  }, [sensorData.ctd.temperature, sensorData.ctd.depth]);

  return (
    <div>
      <div className="p-6 space-y-6">
        {/* Summary Strip */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-marine-surface border-marine-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Thermometer className="w-4 h-4 text-marine-accent" />
              <span className="text-xs text-marine-text-secondary">Temperature</span>
            </div>
            <div className="text-2xl font-bold text-marine-accent">{(sensorData.ctd.temperature ?? 0).toFixed(1)}°C</div>
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Droplet className="w-4 h-4 text-marine-accent" />
              <span className="text-xs text-marine-text-secondary">Salinity</span>
            </div>
            <div className="text-2xl font-bold text-marine-accent">{(sensorData.ctd.salinity ?? 0).toFixed(1)} PSU</div>
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="w-4 h-4 text-marine-accent" />
              <span className="text-xs text-marine-text-secondary">Pressure</span>
            </div>
            <div className="text-2xl font-bold text-marine-accent">{(sensorData.ctd.pressure ?? 0).toFixed(2)} bar</div>
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                sensorData.ctd.status === 'active' ? 'bg-green-500' : 
                sensorData.ctd.status === 'delayed' ? 'bg-amber-500' : 'bg-red-500'
              }`} />
              <span className="text-xs text-marine-text-secondary">Status</span>
            </div>
            <div className="text-sm font-medium text-marine-text capitalize">{sensorData.ctd.status}</div>
          </Card>
        </div>

        {/* Main Gauges */}
        <div className="grid grid-cols-3 gap-6">
          <Card className="bg-marine-surface border-marine-border p-6 flex justify-center">
            <ArcGauge
              value={sensorData.ctd.depth}
              min={0}
              max={100}
              label="Depth"
              unit="m"
              size={240}
            />
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-6 flex justify-center">
            <ArcGauge
              value={sensorData.ctd.conductivity}
              min={0}
              max={100}
              label="Conductivity"
              unit="mS/cm"
              size={240}
              color="#00a8cc"
            />
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-6 flex justify-center">
            <ArcGauge
              value={sensorData.ctd.temperature}
              min={0}
              max={30}
              label="Temperature"
              unit="°C"
              size={240}
              color="#ff8c42"
            />
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-2 gap-6">
          <Card className="bg-marine-surface border-marine-border p-6">
            <h3 className="text-lg font-semibold text-marine-text mb-4">Temperature Over Time</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={tempData}>
                <defs>
                  <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff8c42" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ff8c42" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2d47" />
                <XAxis dataKey="t" stroke="#8ba7be" fontSize={12} tickFormatter={t => new Date(t).toLocaleTimeString()} hide />
                <YAxis domain={['auto', 'auto']} stroke="#8ba7be" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f1e33',
                    border: '1px solid #1a2d47',
                    borderRadius: '8px',
                    color: '#e8f4f8'
                  }}
                  labelFormatter={t => new Date(t).toLocaleTimeString()}
                />
                <Area type="monotone" dataKey="v" stroke="#ff8c42" fillOpacity={1} fill="url(#tempGradient)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-6">
            <h3 className="text-lg font-semibold text-marine-text mb-4">Depth Profile</h3>
            <ResponsiveContainer width="100%" height={250}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2d47" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Temperature"
                  unit="°C"
                  stroke="#8ba7be"
                  fontSize={12}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Depth"
                  unit="m"
                  stroke="#8ba7be"
                  fontSize={12}
                  reversed
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{
                    backgroundColor: '#0f1e33',
                    border: '1px solid #1a2d47',
                    borderRadius: '8px',
                    color: '#e8f4f8'
                  }}
                />
                <Scatter name="Profile" data={profile} fill="#00d9ff" isAnimationActive={false} />
              </ScatterChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Data Table */}
        <Card className="bg-marine-surface border-marine-border p-6">
          <h3 className="text-lg font-semibold text-marine-text mb-4">Detailed Readings</h3>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-3">
              <div>
                <div className="text-sm text-marine-text-secondary">Conductivity</div>
                <div className="text-xl font-mono text-marine-accent">{(sensorData.ctd.conductivity ?? 0).toFixed(2)} mS/cm</div>
              </div>
              <div>
                <div className="text-sm text-marine-text-secondary">Temperature</div>
                <div className="text-xl font-mono text-marine-accent">{(sensorData.ctd.temperature ?? 0).toFixed(2)} °C</div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-marine-text-secondary">Depth</div>
                <div className="text-xl font-mono text-marine-accent">{(sensorData.ctd.depth ?? 0).toFixed(2)} m</div>
              </div>
              <div>
                <div className="text-sm text-marine-text-secondary">Pressure</div>
                <div className="text-xl font-mono text-marine-accent">{(sensorData.ctd.pressure ?? 0).toFixed(3)} bar</div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-marine-text-secondary">Salinity</div>
                <div className="text-xl font-mono text-marine-accent">{(sensorData.ctd.salinity ?? 0).toFixed(2)} PSU</div>
              </div>
              <div>
                <div className="text-sm text-marine-text-secondary">Sound Velocity</div>
                <div className="text-xl font-mono text-marine-accent">{(sensorData.ctd.soundVelocity ?? 0).toFixed(1)} m/s</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
