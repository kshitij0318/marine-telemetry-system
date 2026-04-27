import React, { useState, useEffect } from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';
import { Card } from '../app/components/ui/card';
import { Badge } from '../app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../app/components/ui/tabs';
import { 
  Radio, Target, ShieldAlert, AlertTriangle, 
  Activity, CheckCircle, Crosshair, Navigation, 
  Settings, BarChart3, Camera, Play, Square,
  Zap, Info, MapPin, Search, Eye, X
} from 'lucide-react';
import { RadarDisplay } from '../app/components/RadarDisplay';
import { CameraFeed } from '../app/components/CameraFeed';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useRingBuffer } from '../hooks/useRingBuffer';
import { motion, AnimatePresence } from 'framer-motion';

function Sparkline({ data, color }: { data: any[], color: string }) {
  return (
    <div className="h-8 w-24">
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

const CAM_CONFIG = [
  { id: 'OAS-CAM-1', name: 'Bow View', position: 'bow', path: '/oas-cams/bow.png' },
  { id: 'OAS-CAM-2', name: 'Stbd Bow', position: 'starboard-bow', path: '/oas-cams/side.png' },
  { id: 'OAS-CAM-3', name: 'Stbd Qtr', position: 'starboard-quarter', path: '/oas-cams/side.png' },
  { id: 'OAS-CAM-4', name: 'Stern View', position: 'stern', path: '/oas-cams/stern.png' },
  { id: 'OAS-CAM-5', name: 'Port Qtr', position: 'port-quarter', path: '/oas-cams/side.png' },
  { id: 'OAS-CAM-6', name: 'Port Bow', position: 'port-bow', path: '/oas-cams/side.png' },
];

export default function RadarDashboard() {
  const { sensorData } = useTelemetry();
  const [fullscreenCam, setFullscreenCam] = useState<any>(null);
  const signalData = useRingBuffer(sensorData.radar.performance?.signalStrength ?? 0, 60, 1000);
  
  const getThreatColor = () => {
    const level = sensorData.radar.suggestedManeuver?.threatLevel || 'none';
    switch (level) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-amber-500';
      default: return 'text-green-500';
    }
  };

  const getThreatBg = () => {
    const level = sensorData.radar.suggestedManeuver?.threatLevel || 'none';
    switch (level) {
      case 'critical': return 'bg-red-500/10 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]';
      case 'high': return 'bg-orange-500/10 border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.2)]';
      case 'medium': return 'bg-amber-500/10 border-amber-500/50';
      default: return 'bg-marine-surface border-marine-border';
    }
  };

  return (
    <div className="p-4 space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-marine-text tracking-tighter uppercase italic">OAS & Collision Avoidance</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
            <span className="text-[10px] text-marine-text-secondary font-black uppercase tracking-[0.3em]">X-Band Radar + Optical Intelligence</span>
          </div>
        </div>
        <div className="flex bg-marine-dark/50 p-1 rounded-xl border border-marine-border/50 backdrop-blur-md shadow-inner">
           <div className="flex items-center gap-6 px-4 py-2">
              <div className="text-center">
                <div className="text-[8px] text-marine-text-secondary uppercase font-black mb-1">Targets Detected</div>
                <div className="text-xl font-mono font-black text-marine-accent">{sensorData.radar.targets.length}</div>
              </div>
              <div className="w-px h-6 bg-marine-border" />
              <div className="text-center">
                <div className="text-[8px] text-marine-text-secondary uppercase font-black mb-1">Signal Strength</div>
                <div className="text-xl font-mono font-black text-marine-accent">{(sensorData.radar.performance?.signalStrength ?? 98).toFixed(1)} <span className="text-[8px]">%</span></div>
              </div>
           </div>
        </div>
      </div>

      {/* Suggestion Banner */}
      {sensorData.radar.suggestedManeuver && (
        <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center relative overflow-hidden shadow-2xl transition-all duration-500 ${getThreatBg()}`}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          <div className="flex items-center gap-6 z-10">
            <div className={`p-3 rounded-full bg-marine-surface border-2 ${getThreatColor()} animate-pulse`}>
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="text-center">
              <div className={`text-[10px] font-black uppercase tracking-[0.4em] mb-1 ${getThreatColor()}`}>
                CRITICAL COLREGS ADVISORY
              </div>
              <div className="text-2xl font-mono font-black text-marine-text tracking-tighter uppercase">
                {sensorData.radar.suggestedManeuver.action}
              </div>
              <div className="text-xs text-marine-text-secondary font-bold italic opacity-80 mt-1">
                {sensorData.radar.suggestedManeuver.reason}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Interface Tabs */}
      <Tabs defaultValue="targets" className="w-full">
        <TabsList className="bg-marine-surface/50 border border-marine-border/50 p-1 h-12 rounded-xl backdrop-blur-md">
          <TabsTrigger value="targets" className="text-[10px] font-black uppercase tracking-[0.2em] px-8 py-2.5 data-[state=active]:bg-marine-accent data-[state=active]:text-marine-dark transition-all">Tactical Radar</TabsTrigger>
          <TabsTrigger value="cameras" className="text-[10px] font-black uppercase tracking-[0.2em] px-8 py-2.5 data-[state=active]:bg-marine-accent data-[state=active]:text-marine-dark transition-all">OAS Cameras</TabsTrigger>
          <TabsTrigger value="diagnostics" className="text-[10px] font-black uppercase tracking-[0.2em] px-8 py-2.5 data-[state=active]:bg-marine-accent data-[state=active]:text-marine-dark transition-all">System Health</TabsTrigger>
          <TabsTrigger value="performance" className="text-[10px] font-black uppercase tracking-[0.2em] px-8 py-2.5 data-[state=active]:bg-marine-accent data-[state=active]:text-marine-dark transition-all">Signal Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="targets" className="mt-6 space-y-6">
          <div className="grid grid-cols-12 gap-6">
            <Card className="col-span-8 bg-gradient-to-br from-marine-surface to-marine-dark border-marine-border/50 p-6 h-[420px] flex items-center justify-center relative shadow-2xl overflow-hidden group">
              <div className="absolute inset-0 bg-marine-accent/5 opacity-30 group-hover:opacity-50 transition-opacity" />
              <RadarDisplay 
                targets={sensorData.radar.targets} 
                range={sensorData.radar.range} 
                rotationAngle={sensorData.radar.rotationAngle}
                size={380}
              />
            </Card>
            
            <Card className="col-span-4 bg-marine-surface/80 border-marine-border p-5 flex flex-col h-[420px] shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-marine-border/50">
                <h3 className="text-[10px] font-black text-marine-text uppercase tracking-[0.2em] flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-marine-accent" />
                  Live Tracking List
                </h3>
                <span className="text-[10px] font-mono font-bold text-marine-text-secondary">{sensorData.radar.targets.length} Nodes</span>
              </div>
              <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-1">
                {sensorData.radar.targets.map((t: any) => (
                  <div key={t.id} className="p-3 bg-marine-dark/50 rounded-xl border border-marine-border/30 hover:border-marine-accent/50 transition-all duration-300 group">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                         <div className={`w-1.5 h-1.5 rounded-full ${t.threat === 'critical' ? 'bg-red-500 animate-pulse' : t.threat === 'high' ? 'bg-orange-500' : 'bg-green-500'}`} />
                         <span className="text-[10px] font-black text-marine-accent font-mono tracking-tighter">ID: {t.id}</span>
                      </div>
                      <Badge variant="outline" className={`text-[8px] font-black px-1.5 h-4 uppercase tracking-widest ${
                        t.threat === 'critical' ? 'bg-red-500/10 border-red-500/50 text-red-500' :
                        t.threat === 'high' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : 'bg-marine-accent/10 border-marine-accent/30 text-marine-accent'
                      }`}>{t.threat}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-mono">
                      <div className="flex justify-between border-b border-marine-border/20 pb-0.5">
                        <span className="text-marine-text-secondary uppercase text-[8px]">Range</span>
                        <span className="text-marine-text font-bold">{t.rangem?.toFixed(0)}m</span>
                      </div>
                      <div className="flex justify-between border-b border-marine-border/20 pb-0.5">
                        <span className="text-marine-text-secondary uppercase text-[8px]">Bearing</span>
                        <span className="text-marine-text font-bold">{t.bearingDeg?.toFixed(1)}°</span>
                      </div>
                      <div className="flex justify-between border-b border-marine-border/20 pb-0.5">
                        <span className="text-marine-text-secondary uppercase text-[8px]">CPA</span>
                        <span className={`font-bold ${t.cpa < 200 ? 'text-red-400' : 'text-marine-text'}`}>{t.cpa?.toFixed(0)}m</span>
                      </div>
                      <div className="flex justify-between border-b border-marine-border/20 pb-0.5">
                        <span className="text-marine-text-secondary uppercase text-[8px]">TCPA</span>
                        <span className="text-marine-text font-bold">{t.tcpa?.toFixed(0)}s</span>
                      </div>
                    </div>
                  </div>
                ))}
                {sensorData.radar.targets.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-marine-text-secondary text-[10px] opacity-40 py-12">
                    <Search className="w-10 h-10 mb-4 animate-pulse" />
                    <span className="font-black uppercase tracking-[0.2em]">Scanning for surface threats...</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cameras" className="mt-6">
          <div className="grid grid-cols-3 gap-6">
            {CAM_CONFIG.map(cam => {
              const sensorDataObj = (sensorData.radar.oasSensors || []).find((s: any) => s.sensorId === cam.id);
              const targets = sensorDataObj?.visibleTargets || [];
              
              return (
                <div key={cam.id} className="relative group">
                  <CameraFeed 
                    sensorId={cam.id} 
                    label={cam.name} 
                    imagePath={cam.path} 
                    targets={targets} 
                  />
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-20">
                    <button 
                      onClick={() => setFullscreenCam({ ...cam, targets })}
                      className="flex items-center gap-2 px-3 py-1.5 bg-marine-accent text-marine-dark rounded-full shadow-2xl font-black text-[9px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform"
                    >
                      <Eye className="w-3.5 h-3.5" /> Full Feed
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="diagnostics" className="mt-6">
          <div className="grid grid-cols-3 gap-6">
            <Card className="bg-marine-surface/80 border-marine-border p-5 shadow-2xl backdrop-blur-md">
              <h3 className="text-[10px] font-black text-marine-text mb-6 uppercase tracking-[0.3em] flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-marine-accent" />
                Quadrant Coverage
              </h3>
              <div className="relative w-40 h-40 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-marine-border/50 border-dotted animate-spin-slow" />
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-2">
                    {['F-L', 'F-R', 'B-L', 'B-R'].map(q => (
                      <div key={q} className="bg-marine-accent/10 border-2 border-marine-accent/20 rounded-xl flex items-center justify-center text-[10px] font-black text-marine-accent shadow-inner">
                        {q}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {['Bow Sector', 'Stbd Bow', 'Stbd Quarter', 'Stern Sector', 'Port Quarter', 'Port Bow'].map(pos => (
                  <div key={pos} className="flex justify-between items-center text-[10px] py-1.5 border-b border-marine-border/20 last:border-0">
                    <span className="text-marine-text-secondary font-bold uppercase tracking-widest">{pos}</span>
                    <div className="flex items-center gap-2 text-green-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      <span className="font-black uppercase tracking-tighter">Nominal</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            
            <Card className="bg-marine-surface/80 border-marine-border p-5 shadow-2xl backdrop-blur-md">
              <h3 className="text-[10px] font-black text-marine-text mb-6 uppercase tracking-[0.3em] flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-marine-accent" />
                Threat Detection Logic
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-marine-dark/50 rounded-xl border border-marine-border/30">
                  <span className="text-[10px] text-marine-text-secondary font-black uppercase tracking-widest">Logic Engine</span>
                  <span className="text-[10px] font-mono text-green-400 font-black tracking-widest">STABLE-V2</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-marine-dark/50 rounded-xl border border-marine-border/30">
                  <span className="text-[10px] text-marine-text-secondary font-black uppercase tracking-widest">CPA Predictor</span>
                  <span className="text-[10px] font-mono text-green-400 font-black tracking-widest">ACTIVE</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-marine-dark/50 rounded-xl border border-marine-border/30">
                  <span className="text-[10px] text-marine-text-secondary font-black uppercase tracking-widest">COLREGS Filter</span>
                  <span className="text-[10px] font-mono text-green-400 font-black tracking-widest">PASSED</span>
                </div>
                <div className="pt-4 border-t border-marine-border/50">
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] text-marine-text-secondary font-black uppercase tracking-widest">Confidence Score</span>
                    <span className="text-[10px] font-mono font-black text-marine-accent">98.4%</span>
                  </div>
                  <div className="h-2 bg-marine-dark rounded-full overflow-hidden border border-marine-border/50">
                    <div className="h-full bg-marine-accent shadow-[0_0_10px_rgba(0,168,204,0.5)]" style={{ width: '98.4%' }} />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-marine-surface/80 border-marine-border p-5 shadow-2xl backdrop-blur-md flex flex-col justify-between">
              <h3 className="text-[10px] font-black text-marine-text mb-6 uppercase tracking-[0.3em] flex items-center gap-2">
                <Settings className="w-3.5 h-3.5 text-marine-accent" />
                Hardware Diagnostics
              </h3>
              <div className="space-y-2 font-mono text-[10px]">
                {[
                  { label: "Uptime", val: "14:22:05", color: "text-marine-accent" },
                  { label: "Build Ref", val: "ST-0427-A", color: "text-marine-accent" },
                  { label: "Frequency", val: "9.41 GHz", color: "text-marine-accent" },
                  { label: "PRF Mode", val: "Fixed 2.5kHz", color: "text-marine-accent" },
                  { label: "Peak Power", val: "4.2 kW", color: "text-amber-400" },
                  { label: "Node Temp", val: "42.5°C", color: "text-green-400" }
                ].map(diag => (
                  <div key={diag.label} className="flex justify-between py-2 border-b border-marine-border/20">
                    <span className="text-marine-text-secondary uppercase font-bold tracking-widest">{diag.label}</span>
                    <span className={`font-black ${diag.color}`}>{diag.val}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <div className="grid grid-cols-2 gap-6">
            <Card className="bg-marine-surface/80 border-marine-border p-6 shadow-2xl">
              <h3 className="text-[10px] font-black text-marine-text mb-6 uppercase tracking-[0.3em]">Signal Quality Over Time</h3>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={signalData}>
                    <defs>
                      <linearGradient id="sigGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00a8cc" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#00a8cc" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2d47" />
                    <XAxis dataKey="t" hide />
                    <YAxis stroke="#8ba7be" fontSize={10} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f1e33', border: '1px solid #1a2d47', fontSize: '10px' }} />
                    <Area type="monotone" dataKey="v" stroke="#00a8cc" fillOpacity={1} fill="url(#sigGradient)" isAnimationActive={false} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="bg-marine-surface/80 border-marine-border p-6 shadow-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-[10px] font-black text-marine-text mb-6 uppercase tracking-[0.3em]">Noise Floor Statistics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-marine-border/50">
                    <span className="text-[10px] text-marine-text-secondary font-black uppercase tracking-widest">Base Noise</span>
                    <span className="text-xl font-mono font-black text-marine-accent">-92.4 dB</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-marine-border/50">
                    <span className="text-[10px] text-marine-text-secondary font-black uppercase tracking-widest">Peak Interference</span>
                    <span className="text-xl font-mono font-black text-amber-400">-84.2 dB</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-marine-text-secondary font-black uppercase tracking-widest">Target Resolution</span>
                    <span className="text-xl font-mono font-black text-green-400">0.85 m</span>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-marine-accent/10 border border-marine-accent/30 rounded-2xl">
                 <div className="flex items-center gap-3 mb-2">
                    <Zap className="w-4 h-4 text-marine-accent" />
                    <span className="text-[10px] font-black text-marine-accent uppercase tracking-[0.2em]">DSP Optimization</span>
                 </div>
                 <p className="text-[10px] text-marine-text leading-relaxed font-bold italic opacity-80">
                    Adaptive pulse compression is active. Signal-to-noise ratio is optimized for small-vessel detection in heavy sea clutter.
                 </p>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Fullscreen Feed Modal */}
      <AnimatePresence>
        {fullscreenCam && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-8"
          >
            <div className="absolute top-8 right-8 flex items-center gap-4">
              <span className="text-[10px] font-black text-marine-text-secondary uppercase tracking-[0.4em]">ESC to close</span>
              <button 
                onClick={() => setFullscreenCam(null)}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="w-full max-w-6xl aspect-video rounded-3xl border-4 border-white/5 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden relative">
               <CameraFeed 
                  sensorId={fullscreenCam.id} 
                  label={fullscreenCam.name} 
                  imagePath={fullscreenCam.path} 
                  targets={(sensorData.radar.oasSensors || []).find((s: any) => s.sensorId === fullscreenCam.id)?.visibleTargets || []} 
               />
               
               {/* Advanced Overlays only for Fullscreen */}
               <div className="absolute bottom-8 left-8 p-6 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 space-y-2">
                 <div className="text-[10px] font-black text-marine-accent uppercase tracking-[0.3em]">AI Perception Analysis</div>
                 <div className="flex items-center gap-4">
                    <div className="text-2xl font-mono font-black text-white">{(sensorData.radar.oasSensors || []).find((s: any) => s.sensorId === fullscreenCam.id)?.visibleTargets.length || 0}</div>
                    <div className="text-[10px] text-marine-text-secondary uppercase leading-none">Active<br/>Detections</div>
                 </div>
               </div>

               <div className="absolute top-8 right-8 flex flex-col gap-2">
                 <div className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-black rounded flex items-center gap-2 animate-pulse">
                   <div className="w-2 h-2 bg-white rounded-full" /> REC 00:24:12
                 </div>
                 <div className="px-3 py-1.5 bg-black/60 text-white text-[10px] font-mono rounded border border-white/10">
                   4K | 60FPS | HEVC
                 </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
