import React, { useState } from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';
import { Card } from '../app/components/ui/card';
import { ArcGauge } from '../app/components/ArcGauge';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { Fan, Zap, Thermometer, Activity, CheckCircle, AlertTriangle, Cpu, Gauge } from 'lucide-react';
import { Progress } from '../app/components/ui/progress';
import { useRingBuffer } from '../hooks/useRingBuffer';

function Sparkline({ data, color }: { data: any[], color: string }) {
  return (
    <div className="h-8 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <YAxis hide domain={['auto', 'auto']} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatCard({ label, value, unit, icon: Icon, colorClass }: { label: string, value: any, unit?: string, icon: any, colorClass: string }) {
  return (
    <div className="bg-marine-dark/40 border border-marine-border/30 rounded-lg p-2.5 flex items-center justify-between group hover:border-marine-accent/30 transition-colors">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-md bg-marine-surface border border-marine-border/50 ${colorClass}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-[10px] uppercase font-bold tracking-tighter text-marine-text-secondary">{label}</span>
      </div>
      <div className="text-right">
        <span className={`text-sm font-mono font-bold ${colorClass}`}>{value}</span>
        {unit && <span className="text-[8px] text-marine-text-secondary ml-0.5 uppercase">{unit}</span>}
      </div>
    </div>
  );
}

function ThrusterDetailPanel({ thruster }: { thruster: any }) {
  const rpmData = useRingBuffer(thruster.rpm, 40, 1000);
  const powerData = useRingBuffer(thruster.power, 40, 1000);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-marine-surface to-marine-dark border-marine-border/50 p-6 flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-marine-accent/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-marine-accent/10 transition-colors" />
          <ArcGauge
            value={thruster.rpm}
            min={0}
            max={thruster.maxRpm ?? 3000}
            label="ROTATION"
            unit="RPM"
            size={180}
          />
          <div className="mt-4 flex items-center gap-4">
            <Sparkline data={rpmData} color="#00d9ff" />
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-marine-surface to-marine-dark border-marine-border/50 p-6 flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-marine-accent/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-marine-accent/10 transition-colors" />
          <ArcGauge
            value={thruster.power}
            min={0}
            max={100}
            label="LOAD"
            unit="%"
            size={180}
            color="#00a8cc"
          />
          <div className="mt-4 flex items-center gap-4">
            <Sparkline data={powerData} color="#00a8cc" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-3">
           <StatCard label="Temperature" value={thruster.temperature?.toFixed(1)} unit="°C" icon={Thermometer} colorClass={thruster.temperature > 80 ? 'text-red-400' : 'text-marine-accent'} />
           <StatCard label="Voltage" value={thruster.voltage?.toFixed(1)} unit="V" icon={Zap} colorClass="text-marine-accent" />
           <StatCard label="Current" value={thruster.current?.toFixed(1)} unit="A" icon={Activity} colorClass="text-marine-accent" />
        </div>

        <Card className="bg-marine-surface/80 border-marine-border p-4 flex flex-col justify-between shadow-xl">
          <div>
            <h3 className="text-[10px] font-black text-marine-text-secondary uppercase tracking-[0.2em] mb-4">Health Metrics</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] mb-1.5 font-bold">
                  <span className="text-marine-text-secondary uppercase">Efficiency</span>
                  <span className="text-green-400 font-mono">{(thruster.efficiency ?? 94).toFixed(1)}%</span>
                </div>
                <Progress value={thruster.efficiency ?? 94} className="h-1.5 bg-green-900/20" />
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1.5 font-bold">
                  <span className="text-marine-text-secondary uppercase">Vibration</span>
                  <span className="text-marine-accent font-mono">NORMAL</span>
                </div>
                <Progress value={85} className="h-1.5 bg-marine-accent/10" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-marine-surface/80 border-marine-border p-4 flex flex-col justify-between shadow-xl">
           <h3 className="text-[10px] font-black text-marine-text-secondary uppercase tracking-[0.2em] mb-2">Usage Data</h3>
           <div className="space-y-2">
             <div className="p-2 bg-marine-dark/50 rounded border border-marine-border/30 flex justify-between items-center">
               <span className="text-[9px] text-marine-text-secondary uppercase">Fuel Flow</span>
               <span className="text-xs font-mono font-bold text-amber-400">{thruster.fuelFlow?.toFixed(2)} L/h</span>
             </div>
             <div className="p-2 bg-marine-dark/50 rounded border border-marine-border/30 flex justify-between items-center">
               <span className="text-[9px] text-marine-text-secondary uppercase">Total Runtime</span>
               <span className="text-xs font-mono font-bold text-marine-text">{thruster.runtimeHours}h {thruster.runtimeMinutes}m</span>
             </div>
             <div className="p-2 bg-marine-dark/50 rounded border border-marine-border/30 flex justify-between items-center">
               <span className="text-[9px] text-marine-text-secondary uppercase">Status</span>
               <span className="text-[9px] font-bold text-green-400 uppercase tracking-widest flex items-center gap-1">
                 <CheckCircle className="w-2.5 h-2.5" /> NOMINAL
               </span>
             </div>
           </div>
        </Card>
      </div>
    </div>
  );
}

export default function ThrusterDashboard() {
  const { sensorData } = useTelemetry();
  const [selectedThruster, setSelectedThruster] = useState<string>('all');
  
  const thrusters = sensorData.thruster.thrusters ?? [];
  const displayed = selectedThruster === 'all' ? thrusters : thrusters.filter((t: any) => t.id === selectedThruster);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-marine-text tracking-tighter uppercase italic">Propulsion Management</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
            <span className="text-[10px] text-marine-text-secondary font-black uppercase tracking-[0.3em]">System Authoritative Source</span>
          </div>
        </div>
        <div className="flex bg-marine-dark/50 p-1 rounded-xl border border-marine-border/50 backdrop-blur-md shadow-inner">
          <button
            onClick={() => setSelectedThruster('all')}
            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
              selectedThruster === 'all' 
              ? 'bg-marine-accent text-marine-dark shadow-[0_0_20px_rgba(0,168,204,0.4)]' 
              : 'text-marine-text-secondary hover:text-marine-text'
            }`}
          >
            All Units
          </button>
          {thrusters.map((t: any) => (
            <button
              key={t.id}
              onClick={() => setSelectedThruster(t.id)}
              className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
                selectedThruster === t.id 
                ? 'bg-marine-accent text-marine-dark shadow-[0_0_20px_rgba(0,168,204,0.4)]' 
                : 'text-marine-text-secondary hover:text-marine-text'
              }`}
            >
              {t.name?.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {selectedThruster === 'all' && (
        <div className="space-y-6 animate-in fade-in duration-700">
          <div className="grid grid-cols-3 gap-6">
            {thrusters.map((t: any) => (
              <Card key={t.id} className="group relative bg-marine-surface border border-marine-border p-5 shadow-2xl hover:border-marine-accent/50 transition-all duration-500 overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-marine-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-marine-dark border border-marine-border group-hover:border-marine-accent/30 transition-colors">
                        <Fan className={`w-4 h-4 text-marine-accent ${t.status === 'active' ? 'animate-spin-slow' : ''}`} />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-marine-accent tracking-widest uppercase">{t.name}</div>
                        <div className="text-[8px] text-marine-text-secondary uppercase tracking-[0.2em]">Node ID: {t.id.slice(-4)}</div>
                      </div>
                   </div>
                   <div className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${
                     t.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                   }`}>{t.status}</div>
                </div>

                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-4xl font-mono font-black text-marine-text tracking-tighter">{t.rpm}</span>
                  <span className="text-xs text-marine-text-secondary uppercase font-bold tracking-widest">RPM</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-marine-dark/50 p-2 rounded border border-marine-border/30">
                    <div className="text-[8px] text-marine-text-secondary uppercase mb-1">Load Factor</div>
                    <div className="text-xs font-mono font-bold text-marine-accent">{t.power?.toFixed(1)}%</div>
                  </div>
                  <div className="bg-marine-dark/50 p-2 rounded border border-marine-border/30">
                    <div className="text-[8px] text-marine-text-secondary uppercase mb-1">Core Temp</div>
                    <div className={`text-xs font-mono font-bold ${t.temperature > 80 ? 'text-red-400' : 'text-marine-text'}`}>{t.temperature?.toFixed(1)}°C</div>
                  </div>
                </div>
                
                <div className="h-1 w-full bg-marine-dark rounded-full overflow-hidden">
                   <div className="h-full bg-marine-accent transition-all duration-500" style={{ width: `${t.power}%` }} />
                </div>
              </Card>
            ))}
          </div>
          
          <Card className="bg-gradient-to-r from-marine-surface to-marine-dark border border-marine-border/50 p-4 rounded-2xl shadow-inner backdrop-blur-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-marine-accent/5 opacity-50" />
            <div className="grid grid-cols-4 gap-4 relative z-10">
              <StatRow label="System Power" value={`${thrusters.reduce((s: number, t: any) => s + (t.power || 0), 0).toFixed(1)} kW`} icon={Zap} color="text-marine-accent" />
              <StatRow label="Avg Efficiency" value={`${(thrusters.reduce((s: number, t: any) => s + (t.efficiency || 0), 0) / thrusters.length).toFixed(1)}%`} icon={Gauge} color="text-green-400" />
              <StatRow label="Fuel Flow" value={`${thrusters.reduce((s: number, t: any) => s + (t.fuelFlow || 0), 0).toFixed(2)} L/h`} icon={Activity} color="text-amber-400" />
              <StatRow label="Active Nodes" value={`${thrusters.filter((t: any) => t.status === 'active').length}/${thrusters.length}`} icon={Cpu} color="text-marine-accent" />
            </div>
          </Card>
        </div>
      )}

      {selectedThruster !== 'all' && displayed.map((t: any) => (
        <ThrusterDetailPanel key={t.id} thruster={t} />
      ))}
    </div>
  );
}

function StatRow({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-xl hover:bg-marine-accent/5 transition-colors group">
      <Icon className={`w-5 h-5 mb-2 opacity-50 group-hover:opacity-100 transition-opacity ${color}`} />
      <span className="text-[10px] font-black text-marine-text-secondary uppercase tracking-[0.2em] mb-1">{label}</span>
      <span className={`text-lg font-mono font-black ${color}`}>{value}</span>
    </div>
  );
}
