import React from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';
import { Card } from '../app/components/ui/card';
import { ArcGauge } from '../app/components/ArcGauge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Waves, Thermometer } from 'lucide-react';

export default function CurrentMeterDashboard() {
  const { sensorData } = useTelemetry();
  const [currentHistory, setCurrentHistory] = React.useState<Array<{ time: string; speed: number; direction: number }>>([]);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const time = new Date().toLocaleTimeString();
    setCurrentHistory(prev => {
      if (prev.length > 0 && prev[prev.length - 1].speed === sensorData.currentMeter.speed && prev[prev.length - 1].direction === sensorData.currentMeter.direction) {
        return prev;
      }
      const newData = [...prev, {
        time,
        speed: sensorData.currentMeter.speed,
        direction: sensorData.currentMeter.direction
      }];
      return newData.slice(-20);
    });
  }, [sensorData.currentMeter.speed, sensorData.currentMeter.direction]);

  // Draw current direction compass
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 100;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Compass circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0, 217, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cardinal directions
    ctx.fillStyle = '#8ba7be';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', centerX, centerY - radius - 15);
    ctx.fillText('E', centerX + radius + 15, centerY);
    ctx.fillText('S', centerX, centerY + radius + 15);
    ctx.fillText('W', centerX - radius - 15, centerY);

    // Current arrow
    const direction = (sensorData.currentMeter.direction * Math.PI) / 180;
    const arrowLength = (sensorData.currentMeter.speed / 5) * radius * 0.8;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(direction);
    
    // Arrow shaft
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -arrowLength);
    ctx.strokeStyle = '#00d9ff';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00d9ff';
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(0, -arrowLength);
    ctx.lineTo(-8, -arrowLength + 15);
    ctx.lineTo(8, -arrowLength + 15);
    ctx.closePath();
    ctx.fillStyle = '#00d9ff';
    ctx.fill();
    
    ctx.restore();

  }, [sensorData.currentMeter]);

  return (
    <div>
      <div className="p-6 space-y-6">
        {/* Summary Strip */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-marine-surface border-marine-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Waves className="w-4 h-4 text-marine-accent" />
              <span className="text-xs text-marine-text-secondary">Current Speed</span>
            </div>
            <div className="text-2xl font-bold text-marine-accent">{sensorData.currentMeter.speed.toFixed(2)} m/s</div>
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Waves className="w-4 h-4 text-marine-accent" />
              <span className="text-xs text-marine-text-secondary">Direction</span>
            </div>
            <div className="text-2xl font-bold text-marine-accent">{sensorData.currentMeter.direction.toFixed(0)}°</div>
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Thermometer className="w-4 h-4 text-marine-accent" />
              <span className="text-xs text-marine-text-secondary">Water Temp</span>
            </div>
            <div className="text-2xl font-bold text-marine-accent">{sensorData.currentMeter.temperature.toFixed(1)}°C</div>
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                sensorData.currentMeter.status === 'active' ? 'bg-green-500' : 
                sensorData.currentMeter.status === 'delayed' ? 'bg-amber-500' : 'bg-red-500'
              }`} />
              <span className="text-xs text-marine-text-secondary">Status</span>
            </div>
            <div className="text-sm font-medium text-marine-text capitalize">{sensorData.currentMeter.status}</div>
          </Card>
        </div>

        {/* Main Display */}
        <div className="grid grid-cols-2 gap-6">
          <Card className="bg-marine-surface border-marine-border p-6 flex justify-center">
            <ArcGauge
              value={sensorData.currentMeter.speed}
              min={0}
              max={5}
              label="Current Speed"
              unit="m/s"
              size={280}
            />
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-6 flex flex-col items-center justify-center">
            <h3 className="text-lg font-semibold text-marine-text mb-4">Current Direction</h3>
            <canvas ref={canvasRef} width={250} height={250} />
            <div className="mt-4 text-center">
              <div className="text-2xl font-bold text-marine-accent">{sensorData.currentMeter.direction.toFixed(0)}°</div>
              <div className="text-sm text-marine-text-secondary">Direction</div>
            </div>
          </Card>
        </div>

        {/* Charts */}
        <Card className="bg-marine-surface border-marine-border p-6">
          <h3 className="text-lg font-semibold text-marine-text mb-4">Current Speed Over Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={currentHistory}>
              <defs>
                <linearGradient id="currentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d9ff" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#00d9ff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2d47" />
              <XAxis dataKey="time" stroke="#8ba7be" fontSize={12} />
              <YAxis stroke="#8ba7be" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f1e33',
                  border: '1px solid #1a2d47',
                  borderRadius: '8px',
                  color: '#e8f4f8'
                }}
              />
              <Area type="monotone" dataKey="speed" stroke="#00d9ff" fillOpacity={1} fill="url(#currentGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Additional Data */}
        <div className="grid grid-cols-3 gap-6">
          <Card className="bg-marine-surface border-marine-border p-6">
            <h4 className="text-sm text-marine-text-secondary mb-2">Eastward Component</h4>
            <div className="text-2xl font-mono text-marine-accent">
              {sensorData.currentMeter.eastwardComponent.toFixed(3)} m/s
            </div>
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-6">
            <h4 className="text-sm text-marine-text-secondary mb-2">Northward Component</h4>
            <div className="text-2xl font-mono text-marine-accent">
              {sensorData.currentMeter.northwardComponent.toFixed(3)} m/s
            </div>
          </Card>
          
          <Card className="bg-marine-surface border-marine-border p-6">
            <h4 className="text-sm text-marine-text-secondary mb-2">Water Temperature</h4>
            <div className="text-2xl font-mono text-marine-accent">{sensorData.currentMeter.temperature.toFixed(2)} °C</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
