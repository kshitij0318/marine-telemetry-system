import React from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';
import { Card } from '../app/components/ui/card';
import { ArcGauge } from '../app/components/ArcGauge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Fan, Zap, Thermometer, Activity } from 'lucide-react';
import { SensorBar } from '../app/components/SensorBar';
import { Progress } from '../app/components/ui/progress';

export default function ThrusterDashboard() {
  const { sensorData } = useTelemetry();
  const [rpmHistory, setRpmHistory] = React.useState<Array<{ time: string; rpm: number; power: number }>>([]);

  React.useEffect(() => {
    // Only update history when live telemetry updates, don't generate mock updates
    const time = new Date().toLocaleTimeString();
    setRpmHistory(prev => {
      // Avoid duplicate entries if timestamp/data hasn't changed
      if (prev.length > 0 && prev[prev.length - 1].rpm === sensorData.thruster.rpm && prev[prev.length - 1].power === sensorData.thruster.power) {
        return prev;
      }
      const newData = [...prev, {
        time,
        rpm: sensorData.thruster.rpm,
        power: sensorData.thruster.power
      }];
      return newData.slice(-20);
    });
  }, [sensorData.thruster.rpm, sensorData.thruster.power]);

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
            <div className="text-2xl font-bold text-marine-accent">{sensorData.thruster.rpm.toFixed(0)}</div>
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-marine-accent" />
              <span className="text-xs text-marine-text-secondary">Power</span>
            </div>
            <div className="text-2xl font-bold text-marine-accent">{sensorData.thruster.power.toFixed(0)}%</div>
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Thermometer className="w-4 h-4 text-marine-accent" />
              <span className="text-xs text-marine-text-secondary">Temperature</span>
            </div>
            <div className="text-2xl font-bold text-marine-accent">{sensorData.thruster.temperature.toFixed(1)}°C</div>
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
        <Card className="bg-marine-surface border-marine-border p-6">
          <h3 className="text-lg font-semibold text-marine-text mb-4">Performance Over Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={rpmHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2d47" />
              <XAxis dataKey="time" stroke="#8ba7be" fontSize={12} />
              <YAxis yAxisId="left" stroke="#8ba7be" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="#8ba7be" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f1e33',
                  border: '1px solid #1a2d47',
                  borderRadius: '8px',
                  color: '#e8f4f8'
                }}
              />
              <Line yAxisId="left" type="monotone" dataKey="rpm" stroke="#00d9ff" strokeWidth={2} dot={false} name="RPM" />
              <Line yAxisId="right" type="monotone" dataKey="power" stroke="#00a8cc" strokeWidth={2} dot={false} name="Power %" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Status Bars */}
        <div className="grid grid-cols-2 gap-6">
          <Card className="bg-marine-surface border-marine-border p-6">
            <h3 className="text-lg font-semibold text-marine-text mb-6">System Health</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-marine-text-secondary">Power Output</span>
                  <span className="text-marine-accent font-mono">{sensorData.thruster.power.toFixed(0)}%</span>
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
                  }`}>{sensorData.thruster.temperature.toFixed(1)}°C</span>
                </div>
                <Progress 
                  value={(sensorData.thruster.temperature / 80) * 100} 
                  className="h-3 bg-marine-dark [&>div]:bg-amber-500"
                />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-marine-text-secondary">Voltage</span>
                  <span className="text-marine-accent font-mono">{sensorData.thruster.voltage.toFixed(1)}V</span>
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
                  {sensorData.thruster.currentDraw.toFixed(1)} A
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-marine-dark rounded-lg">
                <span className="text-sm text-marine-text-secondary">Power Consumption</span>
                <span className="text-lg font-mono text-marine-accent">
                  {sensorData.thruster.powerConsumption.toFixed(2)} kW
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-marine-dark rounded-lg">
                <span className="text-sm text-marine-text-secondary">Efficiency</span>
                <span className="text-lg font-mono text-marine-accent">
                  {sensorData.thruster.efficiency.toFixed(1)}%
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
                  Thruster temperature is elevated at {sensorData.thruster.temperature.toFixed(1)}°C
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
