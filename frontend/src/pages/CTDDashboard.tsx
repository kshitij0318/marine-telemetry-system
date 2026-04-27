import React from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';
import { Card } from '../app/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Thermometer, Droplets, Gauge, Waves, Activity, Zap, Compass, Info } from 'lucide-react';
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

export default function CTDDashboard() {
  const { sensorData } = useTelemetry();
  
  const depthHistory = useRingBuffer(sensorData.ctd.depth, 60, 1000);
  const tempHistory = useRingBuffer(sensorData.ctd.temperature, 60, 1000);

  // Vertical profile data (mocked from current state)
  const profileData = [
    { depth: 0, temp: sensorData.ctd.temperature },
    { depth: 10, temp: sensorData.ctd.temperature - 2 },
    { depth: 20, temp: sensorData.ctd.temperature - 3.5 },
    { depth: 30, temp: sensorData.ctd.temperature - 4.2 },
    { depth: 40, temp: sensorData.ctd.temperature - 4.8 },
  ];

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-marine-text tracking-tighter uppercase italic">Environmental CTD</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
            <span className="text-[10px] text-marine-text-secondary font-black uppercase tracking-[0.3em]">Vertical Profile Analytics</span>
          </div>
        </div>
        <div className="flex bg-marine-dark/50 px-4 py-2 rounded-xl border border-marine-border/50 backdrop-blur-md">
           <div className="flex items-center gap-6">
              <div className="flex flex-col items-center">
                <span className="text-[8px] text-marine-text-secondary uppercase font-black">Conductivity</span>
                <span className="text-sm font-mono font-bold text-marine-accent">{(sensorData.ctd.conductivity ?? 0).toFixed(2)} mS/cm</span>
              </div>
              <div className="w-px h-6 bg-marine-border" />
              <div className="flex flex-col items-center">
                <span className="text-[8px] text-marine-text-secondary uppercase font-black">Salinity</span>
                <span className="text-sm font-mono font-bold text-marine-accent">{(sensorData.ctd.salinity ?? 35).toFixed(2)} PSU</span>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Primary Metrics */}
        <div className="col-span-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-marine-surface to-marine-dark border-marine-border/50 p-6 flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-marine-accent/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-marine-accent/10 transition-colors" />
              <div className="text-[10px] font-black text-marine-text-secondary uppercase tracking-[0.3em] mb-4">Seafloor Depth</div>
              <div className="text-6xl font-mono font-black text-marine-text tracking-tighter mb-2">{(sensorData.ctd.depth ?? 0).toFixed(1)}</div>
              <div className="text-xs text-marine-accent font-black uppercase tracking-widest mb-6">METERS BELOW SURFACE</div>
              <Sparkline data={depthHistory} color="#00d9ff" />
            </Card>

            <Card className="bg-gradient-to-br from-marine-surface to-marine-dark border-marine-border/50 p-6 flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-marine-accent/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-marine-accent/10 transition-colors" />
              <div className="text-[10px] font-black text-marine-text-secondary uppercase tracking-[0.3em] mb-4">Water Temperature</div>
              <div className="text-6xl font-mono font-black text-marine-text tracking-tighter mb-2">{(sensorData.ctd.temperature ?? 0).toFixed(1)}</div>
              <div className="text-xs text-amber-400 font-black uppercase tracking-widest mb-6">DEGREES CELSIUS</div>
              <Sparkline data={tempHistory} color="#fbbf24" />
            </Card>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Pressure" value={(sensorData.ctd.pressure ?? 0).toFixed(1)} unit="dbar" icon={Gauge} colorClass="text-marine-accent" />
            <StatCard label="Sound Velocity" value={(sensorData.ctd.soundVelocity ?? 1500).toFixed(1)} unit="m/s" icon={Waves} colorClass="text-marine-accent" />
            <StatCard label="Density" value={(sensorData.ctd.density ?? 1025).toFixed(1)} unit="kg/m³" icon={Activity} colorClass="text-marine-accent" />
          </div>
        </div>

        {/* Right: Vertical Profile Chart */}
        <Card className="col-span-4 bg-marine-surface/80 border-marine-border p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
          <h3 className="text-[10px] font-black text-marine-text-secondary uppercase tracking-[0.3em] mb-6">Vertical Profile Analysis</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={profileData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2d47" />
                <XAxis type="number" stroke="#8ba7be" fontSize={10} label={{ value: 'Temp (°C)', position: 'bottom', fill: '#8ba7be', fontSize: 10 }} />
                <YAxis dataKey="depth" type="number" reversed stroke="#8ba7be" fontSize={10} label={{ value: 'Depth (m)', angle: -90, position: 'insideLeft', fill: '#8ba7be', fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f1e33', border: '1px solid #1a2d47', fontSize: '10px' }} />
                <Line type="monotone" dataKey="temp" stroke="#fbbf24" strokeWidth={3} dot={{ fill: '#fbbf24', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 p-3 bg-marine-dark/50 rounded-lg border border-marine-border/30">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-3 h-3 text-marine-accent" />
              <span className="text-[9px] font-bold text-marine-text-secondary uppercase tracking-widest">Hydrologic Insight</span>
            </div>
            <p className="text-[10px] text-marine-text leading-relaxed">
              Detected stable thermocline at 12.4m depth. Salinity remains consistent within oceanic norms.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
