import React from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';
import { Card } from '../app/components/ui/card';
import { ArcGauge } from '../app/components/ArcGauge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Satellite, Navigation, MapPin } from 'lucide-react';
import { SensorBar } from '../app/components/SensorBar';
import { useTimeSeriesBuffer } from '../hooks/useTimeSeriesBuffer';

export default function GNSSDashboard() {
  const { sensorData } = useTelemetry();
  
  const speedHistory = useTimeSeriesBuffer(sensorData.gnss.speed, 120, 500);
  const headingHistory = useTimeSeriesBuffer(sensorData.gnss.heading, 120, 500);

  return (
    <div>
      <div className="p-6 space-y-6">
        {/* Summary Strip */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-marine-surface border-marine-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Satellite className="w-4 h-4 text-marine-accent" />
              <span className="text-xs text-marine-text-secondary">Satellites</span>
            </div>
            <div className="text-2xl font-bold text-marine-accent">{sensorData.gnss.satellites}</div>
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Navigation className="w-4 h-4 text-marine-accent" />
              <span className="text-xs text-marine-text-secondary">Heading</span>
            </div>
            <div className="text-2xl font-bold text-marine-accent">{(sensorData.gnss.heading ?? 0).toFixed(0)}°</div>
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-marine-accent" />
              <span className="text-xs text-marine-text-secondary">Altitude</span>
            </div>
            <div className="text-2xl font-bold text-marine-accent">{(sensorData.gnss.altitude ?? 0).toFixed(1)}m</div>
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                sensorData.gnss.status === 'active' ? 'bg-green-500' : 
                sensorData.gnss.status === 'delayed' ? 'bg-amber-500' : 'bg-red-500'
              }`} />
              <span className="text-xs text-marine-text-secondary">Status</span>
            </div>
            <div className="text-sm font-medium text-marine-text capitalize">{sensorData.gnss.status}</div>
          </Card>
        </div>

        {/* Main Gauges */}
        <div className="grid grid-cols-2 gap-6">
          <Card className="bg-marine-surface border-marine-border p-6 flex justify-center">
            <ArcGauge
              value={sensorData.gnss.speed}
              min={0}
              max={20}
              label="Speed"
              unit="kts"
              size={280}
            />
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-6 flex justify-center">
            <ArcGauge
              value={sensorData.gnss.heading}
              min={0}
              max={360}
              label="Heading"
              unit="°"
              size={280}
              color="#00a8cc"
            />
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-2 gap-6">
          <Card className="bg-marine-surface border-marine-border p-6">
            <h3 className="text-lg font-semibold text-marine-text mb-4">Speed Over Time</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={speedHistory}>
                <defs>
                  <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d9ff" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00d9ff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2d47" />
                <XAxis dataKey="time" stroke="#8ba7be" fontSize={12} tickFormatter={(t) => new Date(t).toLocaleTimeString()} />
                <YAxis stroke="#8ba7be" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f1e33',
                    border: '1px solid #1a2d47',
                    borderRadius: '8px',
                    color: '#e8f4f8'
                  }}
                  labelFormatter={(t) => new Date(t).toLocaleTimeString()}
                />
                <Area type="monotone" dataKey="value" stroke="#00d9ff" fillOpacity={1} fill="url(#speedGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-6">
            <h3 className="text-lg font-semibold text-marine-text mb-4">Heading Over Time</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={headingHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2d47" />
                <XAxis dataKey="time" stroke="#8ba7be" fontSize={12} tickFormatter={(t) => new Date(t).toLocaleTimeString()} />
                <YAxis stroke="#8ba7be" fontSize={12} domain={[0, 360]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f1e33',
                    border: '1px solid #1a2d47',
                    borderRadius: '8px',
                    color: '#e8f4f8'
                  }}
                  labelFormatter={(t) => new Date(t).toLocaleTimeString()}
                />
                <Line type="monotone" dataKey="value" stroke="#00a8cc" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Position Data */}
        <Card className="bg-marine-surface border-marine-border p-6">
          <h3 className="text-lg font-semibold text-marine-text mb-4">Position Data</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-marine-text-secondary mb-1">Latitude</div>
              <div className="text-2xl font-mono text-marine-accent">{(sensorData.gnss.latitude ?? 0).toFixed(7)}°</div>
            </div>
            <div>
              <div className="text-sm text-marine-text-secondary mb-1">Longitude</div>
              <div className="text-2xl font-mono text-marine-accent">{(sensorData.gnss.longitude ?? 0).toFixed(7)}°</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
