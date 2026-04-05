import React from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';
import { Card } from '../app/components/ui/card';
import { ArcGauge } from '../app/components/ArcGauge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Fan, Zap, Thermometer, Activity } from 'lucide-react';
import { SensorBar } from '../app/components/SensorBar';
import { Progress } from '../app/components/ui/progress';
import { useRingBuffer } from '../hooks/useRingBuffer';

export default function ThrusterDashboard() {
  const { sensorData } = useTelemetry();
  
  const rpmData = useRingBuffer(sensorData.thruster.rpm, 120, 200);
  const powerData = useRingBuffer(sensorData.thruster.power, 120, 200);

  return (
    <div>
      <div className="p-6 space-y-6">
        {/* Summary Strip */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-marine-surface border-marine-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Fan className="w-4 h-4 text-marine-accent" />
              <span className="text-xs text-marine-text-secondary">RPM</span>
            </div>
            <div className="text-2xl font-bold text-marine-accent">{(sensorData.thruster.rpm ?? 0).toFixed(0)}</div>
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-marine-accent" />
              <span className="text-xs text-marine-text-secondary">Power</span>
            </div>
            <div className="text-2xl font-bold text-marine-accent">{(sensorData.thruster.power ?? 0).toFixed(0)}%</div>
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Thermometer className="w-4 h-4 text-marine-accent" />
              <span className="text-xs text-marine-text-secondary">Temperature</span>
            </div>
            <div className="text-2xl font-bold text-marine-accent">{(sensorData.thruster.temperature ?? 0).toFixed(1)}°C</div>
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                sensorData.thruster.status === 'active' ? 'bg-green-500' : 
                sensorData.thruster.status === 'delayed' ? 'bg-amber-500' : 'bg-red-500'
              }`} />
              <span className="text-xs text-marine-text-secondary">Status</span>
            </div>
            <div className="text-sm font-medium text-marine-text capitalize">{sensorData.thruster.status}</div>
          </Card>
        </div>

        {/* Main Gauges */}
        <div className="grid grid-cols-2 gap-6">
          <Card className="bg-marine-surface border-marine-border p-6 flex justify-center">
            <ArcGauge
              value={sensorData.thruster.rpm}
              min={0}
              max={2000}
              label="RPM"
              unit="rpm"
              size={280}
            />
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-6 flex justify-center">
            <ArcGauge
              value={sensorData.thruster.power}
              min={0}
              max={100}
              label="Power Output"
              unit="%"
              size={280}
              color="#00a8cc"
            />
          </Card>
        </div>

        {/* Performance Chart */}
        <div className="grid grid-cols-2 gap-6">
          <Card className="bg-marine-surface border-marine-border p-6">
            <h3 className="text-lg font-semibold text-marine-text mb-4">RPM Over Time</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={rpmData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2d47" />
                <XAxis dataKey="t" stroke="#8ba7be" fontSize={12} tickFormatter={t => new Date(t).toLocaleTimeString()} hide />
                <YAxis domain={['auto', 'auto']} stroke="#8ba7be" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f1e33', border: '1px solid #1a2d47', borderRadius: '8px', color: '#e8f4f8' }}
                  labelFormatter={t => new Date(t).toLocaleTimeString()}
                />
                <Line type="monotone" dataKey="v" stroke="#00d9ff" strokeWidth={2} dot={false} name="RPM" isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="bg-marine-surface border-marine-border p-6">
            <h3 className="text-lg font-semibold text-marine-text mb-4">Power Over Time</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={powerData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2d47" />
                <XAxis dataKey="t" stroke="#8ba7be" fontSize={12} tickFormatter={t => new Date(t).toLocaleTimeString()} hide />
                <YAxis domain={['auto', 'auto']} stroke="#8ba7be" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f1e33', border: '1px solid #1a2d47', borderRadius: '8px', color: '#e8f4f8' }}
                  labelFormatter={t => new Date(t).toLocaleTimeString()}
                />
                <Line type="monotone" dataKey="v" stroke="#00a8cc" strokeWidth={2} dot={false} name="Power %" isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Status Bars */}
        <div className="grid grid-cols-2 gap-6">
          <Card className="bg-marine-surface border-marine-border p-6">
            <h3 className="text-lg font-semibold text-marine-text mb-6">System Health</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-marine-text-secondary">Power Output</span>
                  <span className="text-marine-accent font-mono">{(sensorData.thruster.power ?? 0).toFixed(0)}%</span>
                </div>
                <Progress value={sensorData.thruster.power} className="h-3" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-marine-text-secondary">Temperature</span>
                  <span className={`font-mono ${
                    sensorData.thruster.temperature > 60 ? 'text-red-400' :
                    sensorData.thruster.temperature > 50 ? 'text-amber-400' :
                    'text-marine-accent'
                  }`}>{(sensorData.thruster.temperature ?? 0).toFixed(1)}°C</span>
                </div>
                <Progress 
                  value={(sensorData.thruster.temperature / 80) * 100} 
                  className="h-3 bg-marine-dark [&>div]:bg-amber-500"
                />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-marine-text-secondary">Voltage</span>
                  <span className="text-marine-accent font-mono">{(sensorData.thruster.voltage ?? 0).toFixed(1)}V</span>
                </div>
                <Progress value={(sensorData.thruster.voltage / 60) * 100} className="h-3" />
              </div>
            </div>
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-6">
            <h3 className="text-lg font-semibold text-marine-text mb-6">Detailed Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-marine-dark rounded-lg">
                <span className="text-sm text-marine-text-secondary">Current Draw</span>
                <span className="text-lg font-mono text-marine-accent">
                  {(sensorData.thruster.currentDraw ?? 0).toFixed(1)} A
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-marine-dark rounded-lg">
                <span className="text-sm text-marine-text-secondary">Power Consumption</span>
                <span className="text-lg font-mono text-marine-accent">
                  {(sensorData.thruster.powerConsumption ?? 0).toFixed(2)} kW
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-marine-dark rounded-lg">
                <span className="text-sm text-marine-text-secondary">Efficiency</span>
                <span className="text-lg font-mono text-marine-accent">
                  {(sensorData.thruster.efficiency ?? 0).toFixed(1)}%
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-marine-dark rounded-lg">
                <span className="text-sm text-marine-text-secondary">Torque</span>
                <span className="text-lg font-mono text-marine-accent">
                  {(sensorData.thruster.torque ?? 0).toFixed(2)} Nm
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-marine-dark rounded-lg">
                <span className="text-sm text-marine-text-secondary">Vibration</span>
                <span className="text-lg font-mono text-marine-accent">
                  {(sensorData.thruster.vibration ?? 0).toFixed(2)} g
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-marine-dark rounded-lg">
                <span className="text-sm text-marine-text-secondary">Fuel Flow</span>
                <span className="text-lg font-mono text-marine-accent">
                  {(sensorData.thruster.fuelFlow ?? 0).toFixed(2)} L/h
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-marine-dark rounded-lg">
                <span className="text-sm text-marine-text-secondary">Runtime</span>
                <span className="text-lg font-mono text-marine-accent">
                  {sensorData.thruster.runtimeHours}h {sensorData.thruster.runtimeMinutes}m
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Alerts */}
        {sensorData.thruster.temperature > 50 && (
          <Card className="bg-amber-500/10 border-amber-500/50 p-4">
            <div className="flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-amber-400" />
              <div>
                <div className="font-semibold text-amber-400">Temperature Warning</div>
                <div className="text-sm text-marine-text-secondary">
                  Thruster temperature is elevated at {(sensorData.thruster.temperature ?? 0).toFixed(1)}°C
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
