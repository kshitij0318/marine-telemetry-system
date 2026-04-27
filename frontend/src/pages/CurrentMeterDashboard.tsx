import React from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';
import { Card } from '../app/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Wind, Navigation, Compass, Activity, Zap, Droplets, Gauge, AlertCircle } from 'lucide-react';
import { useRingBuffer } from '../hooks/useRingBuffer';

function Sparkline({ data, color }: { data: any[], color: string }) {
  return (
    <div className="h-10 w-32">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} fill={`url(#grad-${color})`} strokeWidth={2} dot={false} isAnimationActive={false} />
          <YAxis hide domain={['auto', 'auto']} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatCard({ label, value, unit, icon: Icon, colorClass }: { label: string, value: any, unit?: string, icon: any, colorClass: string }) {
  return (
    <div className="bg-marine-dark/40 border border-marine-border/30 rounded-xl p-3 flex flex-col justify-between group hover:border-marine-accent/30 transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-1.5 rounded-lg bg-marine-surface border border-marine-border/50 ${colorClass}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="text-[10px] font-black text-marine-text-secondary uppercase tracking-[0.2em]">{label}</div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-mono font-black ${colorClass}`}>{value}</span>
        {unit && <span className="text-[10px] text-marine-text-secondary font-bold">{unit}</span>}
      </div>
    </div>
  );
}

export default function CurrentMeterDashboard() {
  const { sensorData } = useTelemetry();
  
  const speedHistory = useRingBuffer(sensorData.currentMeter.speed, 60, 1000);
  const directionHistory = useRingBuffer(sensorData.currentMeter.direction, 60, 1000);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-marine-text tracking-tighter uppercase italic">Hydrodynamic Flow</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
            <span className="text-[10px] text-marine-text-secondary font-black uppercase tracking-[0.3em]">Acoustic Doppler Velocity</span>
          </div>
        </div>
        <div className="flex bg-marine-dark/50 px-4 py-2 rounded-xl border border-marine-border/50 backdrop-blur-md">
           <div className="flex items-center gap-6">
              <div className="flex flex-col items-center">
                <span className="text-[8px] text-marine-text-secondary uppercase font-black">Turbidity</span>
                <span className="text-sm font-mono font-bold text-marine-accent">{(sensorData.currentMeter.turbidity ?? 1.2).toFixed(2)} NTU</span>
              </div>
              <div className="w-px h-6 bg-marine-border" />
              <div className="flex flex-col items-center">
                <span className="text-[8px] text-marine-text-secondary uppercase font-black">Water Temp</span>
                <span className="text-sm font-mono font-bold text-amber-400">{(sensorData.currentMeter.waterTemperature ?? 24.5).toFixed(1)}°C</span>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-marine-surface to-marine-dark border-marine-border/50 p-6 flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-marine-accent/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-marine-accent/10 transition-colors" />
          <div className="text-[10px] font-black text-marine-text-secondary uppercase tracking-[0.3em] mb-4">Current Speed</div>
          <div className="text-6xl font-mono font-black text-marine-text tracking-tighter mb-2">{(sensorData.currentMeter.speed ?? 0).toFixed(2)}</div>
          <div className="text-xs text-marine-accent font-black uppercase tracking-widest mb-6">METERS PER SECOND</div>
          <Sparkline data={speedHistory} color="#00d9ff" />
        </Card>

        <Card className="bg-gradient-to-br from-marine-surface to-marine-dark border-marine-border/50 p-6 flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-marine-accent/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-marine-accent/10 transition-colors" />
          <div className="text-[10px] font-black text-marine-text-secondary uppercase tracking-[0.3em] mb-4">Flow Direction</div>
          <div className="text-6xl font-mono font-black text-marine-text tracking-tighter mb-2">{(sensorData.currentMeter.direction ?? 0).toFixed(0)}°</div>
          <div className="text-xs text-marine-accent font-black uppercase tracking-widest mb-6">COMPASS RELATIVE</div>
          <Sparkline data={directionHistory} color="#00a8cc" />
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
           <StatCard label="Eastward Vector" value={(sensorData.currentMeter.eastward ?? 0).toFixed(2)} unit="m/s" icon={Compass} colorClass="text-marine-accent" />
           <StatCard label="Northward Vector" value={(sensorData.currentMeter.northward ?? 0).toFixed(2)} unit="m/s" icon={Compass} colorClass="text-marine-accent" />
           <StatCard label="Upward Vector" value={(sensorData.currentMeter.upward ?? 0).toFixed(2)} unit="m/s" icon={Activity} colorClass="text-marine-accent" />
        </div>

        <Card className="col-span-2 bg-marine-surface/80 border-marine-border p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-marine-accent/5 rounded-full -mr-24 -mt-24 blur-3xl" />
          <h3 className="text-[10px] font-black text-marine-text-secondary uppercase tracking-[0.3em] mb-6">Vector Analysis (ADCP 3D)</h3>
          <div className="h-[200px] flex items-center justify-center">
             <div className="relative w-40 h-40">
                {/* Visual compass/vector representation */}
                <div className="absolute inset-0 rounded-full border border-marine-border border-dashed" />
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-1 h-1 bg-marine-accent rounded-full" />
                   <div 
                      className="absolute w-20 h-0.5 bg-marine-accent origin-left transition-all duration-700" 
                      style={{ 
                         left: '50%', 
                         transform: `rotate(${sensorData.currentMeter.direction - 90}deg)`,
                         boxShadow: '0 0 10px rgba(0, 168, 204, 0.5)'
                      }} 
                   >
                      <div className="absolute right-0 -top-1 w-2 h-2 border-t-2 border-r-2 border-marine-accent rotate-45" />
                   </div>
                </div>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-marine-text-secondary uppercase tracking-widest">North</div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-marine-text-secondary uppercase tracking-widest">South</div>
             </div>
          </div>
          <div className="mt-8 flex justify-around">
             <div className="text-center">
                <div className="text-[8px] text-marine-text-secondary uppercase font-black mb-1">Horizontal Speed</div>
                <div className="text-xl font-mono font-black text-marine-text">{Math.sqrt(Math.pow(sensorData.currentMeter.eastward || 0, 2) + Math.pow(sensorData.currentMeter.northward || 0, 2)).toFixed(2)} <span className="text-[8px]">m/s</span></div>
             </div>
             <div className="text-center">
                <div className="text-[8px] text-marine-text-secondary uppercase font-black mb-1">Tilt Compensation</div>
                <div className="text-xl font-mono font-black text-green-400">ACTIVE</div>
             </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
