import React from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';
import { Card } from '../app/components/ui/card';
import { ArcGauge } from '../app/components/ArcGauge';
import { LineChart, Line, ResponsiveContainer, YAxis, Area, AreaChart } from 'recharts';
import { Satellite, Navigation, Compass, Signal, MapPin, Activity, Globe, Zap } from 'lucide-react';
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

export default function GNSSDashboard() {
  const { sensorData } = useTelemetry();
  
  const speedHistory = useRingBuffer(sensorData.gnss.speed, 60, 1000);
  const headingHistory = useRingBuffer(sensorData.gnss.heading, 60, 1000);
  const satelliteHistory = useRingBuffer(sensorData.gnss.satellites, 60, 1000);

  const quality = sensorData.gnss.signalQuality ?? 0;
  const hdop = sensorData.gnss.hdop ?? 0;

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-marine-text tracking-tighter uppercase italic">Geospatial Fix</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
            <span className="text-[10px] text-marine-text-secondary font-black uppercase tracking-[0.3em]">Precision PNT Engine</span>
          </div>
        </div>
        <div className="flex gap-3">
           <div className="bg-marine-dark/50 border border-marine-border/50 px-4 py-2 rounded-xl backdrop-blur-md flex items-center gap-3">
             <Signal className="w-4 h-4 text-marine-accent" />
             <div className="flex items-end gap-1 h-4">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={`w-1.5 rounded-sm transition-all ${i <= quality ? 'bg-marine-accent shadow-[0_0_5px_rgba(0,168,204,0.3)]' : 'bg-marine-border'}`}
                    style={{height: `${i*3+3}px`}} />
                ))}
             </div>
             <span className="text-[10px] font-mono font-bold text-marine-accent ml-1">HDOP {hdop.toFixed(2)}</span>
           </div>
        </div>
      </div>

      {/* Primary Gauges */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-marine-surface to-marine-dark border-marine-border/50 p-6 flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-marine-accent/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-marine-accent/10 transition-colors" />
          <ArcGauge
            value={sensorData.gnss.speed}
            min={0}
            max={20}
            label="VELOCITY"
            unit="KTS"
            size={180}
          />
          <div className="mt-4 flex flex-col items-center gap-1">
            <span className="text-[10px] font-black text-marine-text-secondary uppercase tracking-[0.2em]">Live Trend</span>
            <Sparkline data={speedHistory} color="#00d9ff" />
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-marine-surface to-marine-dark border-marine-border/50 p-6 flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-marine-accent/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-marine-accent/10 transition-colors" />
          <ArcGauge
            value={sensorData.gnss.heading}
            min={0}
            max={360}
            label="TRUE HEADING"
            unit="°"
            size={180}
            color="#00a8cc"
          />
          <div className="mt-4 flex flex-col items-center gap-1">
            <span className="text-[10px] font-black text-marine-text-secondary uppercase tracking-[0.2em]">Angular Stability</span>
            <Sparkline data={headingHistory} color="#00a8cc" />
          </div>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard label="Satellites" value={sensorData.gnss.satellites} icon={Satellite} colorClass="text-marine-accent" />
        <StatCard label="Fix Type" value={sensorData.gnss.fixType ?? 'N/A'} icon={Globe} colorClass="text-green-400" />
        <StatCard label="Course" value={(sensorData.gnss.course ?? 0).toFixed(1)} unit="°" icon={Compass} colorClass="text-marine-accent" />
        <StatCard label="Voltage" value="12.4" unit="V" icon={Zap} colorClass="text-amber-400" />
        <StatCard label="Accuracy" value="0.8" unit="m" icon={Activity} colorClass="text-marine-accent" />
      </div>

      {/* Position Card */}
      <Card className="bg-gradient-to-r from-marine-surface to-marine-dark border border-marine-border/50 p-6 rounded-2xl shadow-inner backdrop-blur-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-marine-accent/5 opacity-30" />
        <div className="flex items-center gap-6 relative z-10">
          <div className="p-4 rounded-2xl bg-marine-dark border border-marine-border shadow-2xl">
             <MapPin className="w-8 h-8 text-marine-accent" />
          </div>
          <div className="grid grid-cols-2 gap-12 flex-1">
            <div className="space-y-1">
              <div className="text-[10px] font-black text-marine-text-secondary uppercase tracking-[0.3em]">Latitude Coordinate</div>
              <div className="text-4xl font-mono font-black text-marine-text tracking-tighter">{(sensorData.gnss.latitude ?? 0).toFixed(7)}° N</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-black text-marine-text-secondary uppercase tracking-[0.3em]">Longitude Coordinate</div>
              <div className="text-4xl font-mono font-black text-marine-text tracking-tighter">{(sensorData.gnss.longitude ?? 0).toFixed(7)}° E</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black text-marine-text-secondary uppercase tracking-[0.2em] mb-1">Time Sync (UTC)</div>
            <div className="text-xl font-mono font-bold text-marine-accent">{new Date().toISOString().slice(11, 19)}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
