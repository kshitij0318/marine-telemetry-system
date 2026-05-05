import React from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';
import { Card } from '../app/components/ui/card';
import { Ship, Activity, MapPin, AlertCircle } from 'lucide-react';
import { Badge } from '../app/components/ui/badge';
import { NotificationFeed } from '../app/components/NotificationFeed';
import { AttitudeIndicator } from '../app/components/AttitudeIndicator';

function SensorLED({ active, delayed, error, ping }: { active: boolean, delayed?: boolean, error?: boolean, ping?: boolean }) {
  const color = error ? 'bg-red-500' : delayed ? 'bg-amber-500' : active ? 'bg-green-500' : 'bg-marine-border';
  return (
    <div className="relative flex h-2 w-2">
      {(active || error || delayed) && ping && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${color}`}></span>
      )}
      <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`}></span>
    </div>
  );
}

export default function FleetOverview() {
  const { sensorData } = useTelemetry();
  const [vessels, setVessels] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchFleet = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/fleet');
        if (!response.ok) throw new Error('Failed to fetch fleet data');
        const data = await response.json();
        
        const enriched = data.map((v: any) => {
          if (v.id === 'V001' && sensorData) {
            return {
              ...v,
              status: 'active',
              latitude: sensorData.gnss.latitude,
              longitude: sensorData.gnss.longitude,
              speed: sensorData.gnss.speed,
              heading: sensorData.gnss.heading,
              pitch: sensorData.gnss.pitch || 0,
              roll: sensorData.gnss.roll || 0,
            };
          }
          return v;
        });

        setVessels(enriched);
        setError(null);
      } catch (err) {
        setError('Connection lost to fleet registry.');
      } finally {
        setLoading(false);
      }
    };

    fetchFleet();
    const int = setInterval(fetchFleet, 5000); // 5s polling for fleet state
    return () => clearInterval(int);
  }, []);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-marine-text tracking-tight">Fleet Overview</h2>
          <p className="text-xs text-marine-text-secondary">Monitor all vessels in your fleet</p>
        </div>
        <div className="flex items-center gap-3">
          <Card className="bg-marine-surface border-marine-border p-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-marine-accent/10 rounded-lg">
                <Ship className="w-4 h-4 text-marine-accent" />
              </div>
              <div>
                <div className="text-xl font-bold text-marine-accent leading-none">{vessels.length}</div>
                <div className="text-[10px] text-marine-text-secondary uppercase mt-1 tracking-wider">Total</div>
              </div>
            </div>
          </Card>
          <Card className="bg-marine-surface border-marine-border p-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Activity className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <div className="text-xl font-bold text-green-400 leading-none">
                  {vessels.filter(v => v.status === 'active').length}
                </div>
                <div className="text-[10px] text-marine-text-secondary uppercase mt-1 tracking-wider">Active</div>
              </div>
            </div>
          </Card>
        </div>
      </div>


      {/* Vessel Cards */}
      <div className="grid grid-cols-1 gap-4">
        {vessels.map((vessel) => (
          <Card key={vessel.id} className="bg-marine-surface border-marine-border p-4 hover:border-marine-accent transition-all duration-300">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-marine-accent/10 rounded-lg flex items-center justify-center border border-marine-accent/20">

                  <Ship className="w-6 h-6 text-marine-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-marine-text">{vessel.name}</h3>
                  <p className="text-sm text-marine-text-secondary font-mono">{vessel.id}</p>
                </div>
              </div>
              <Badge
                variant={vessel.status === 'active' ? 'default' : 'secondary'}
                className={vessel.status === 'active' ? 'bg-green-500 hover:bg-green-600' : 'bg-amber-500 hover:bg-amber-600 border-none'}
              >
                {vessel.status}
              </Badge>
            </div>

            <div className="grid grid-cols-4 gap-6">
              <div>
                <div className="text-xs text-marine-text-secondary mb-1">Position</div>
                <div className="text-sm font-mono text-marine-accent">
                  {(vessel.latitude || 0).toFixed(4)}°<br />
                  {(vessel.longitude || 0).toFixed(4)}°
                </div>
              </div>
              <div>
                <div className="text-xs text-marine-text-secondary mb-1">Speed</div>
                <div className="text-lg font-mono text-marine-accent">{(vessel.speed || 0).toFixed(1)} kts</div>
              </div>
              <div>
                <div className="text-xs text-marine-text-secondary mb-1">Heading</div>
                <div className="text-lg font-mono text-marine-accent">{(vessel.heading || 0).toFixed(0)}°</div>
              </div>
              <div>
                <div className="text-xs text-marine-text-secondary mb-1">Last Update</div>
                <div className="text-sm text-marine-text">{vessel.lastUpdated ? new Date(vessel.lastUpdated).toLocaleTimeString() : 'Unknown'}</div>
              </div>
            </div>

            {vessel.id === 'V001' && (
              <div className="mt-4 pt-4 border-t border-marine-border">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-marine-text-secondary mb-1">GNSS</span>
                    <SensorLED active={sensorData.gnss.status === 'ACTIVE' || sensorData.gnss.status === 'active'} ping />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-marine-text-secondary mb-1">CTD</span>
                    <SensorLED active={sensorData.ctd.status === 'ACTIVE' || sensorData.ctd.status === 'active'} ping />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-marine-text-secondary mb-1">METR</span>
                    <SensorLED active={sensorData.currentMeter.status === 'ACTIVE' || sensorData.currentMeter.status === 'active'} ping />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-marine-text-secondary mb-1">THR</span>
                    <SensorLED active={sensorData.thruster.status === 'ACTIVE' || sensorData.thruster.status === 'active'} ping />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-marine-text-secondary mb-1">RADAR</span>
                    <SensorLED active={sensorData.radar.status === 'ACTIVE' || sensorData.radar.status === 'active'} ping />
                  </div>
                </div>

                {/* Tactical Attitude Telemetry System */}
                <div className="mt-6 pt-6 border-t border-marine-border">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-marine-accent animate-pulse" />
                    <h4 className="text-[10px] font-black text-marine-text-secondary uppercase tracking-[0.2em]">Vessel Attitude & Stability</h4>
                  </div>
                  
                  <div className="flex flex-col items-center w-full max-w-4xl mx-auto mt-6">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-12 lg:gap-24 w-full">
                      {/* Left: Pitch Data */}
                      <div className="flex flex-col items-center md:items-end gap-1 text-center md:text-right">
                        <span className="text-[10px] font-bold text-marine-text-secondary uppercase tracking-widest">Pitch</span>
                        <span className="text-4xl font-mono font-black text-marine-accent drop-shadow-[0_0_8px_rgba(45,212,191,0.3)]">
                          {(sensorData.gnss.pitch || 0).toFixed(1)}°
                        </span>
                        <span className="text-[10px] text-marine-text-secondary uppercase font-semibold mt-1 bg-marine-dark/50 px-2 py-0.5 rounded-full border border-marine-border">
                          {(sensorData.gnss.pitch || 0) > 0 ? 'Bow Up' : 'Bow Down'}
                        </span>
                      </div>

                      {/* Center: Artificial Horizon */}
                      <div className="flex-shrink-0 relative">
                        <AttitudeIndicator pitch={sensorData.gnss.pitch || 0} roll={sensorData.gnss.roll || 0} size={220} />
                        
                        {/* Integrated Yaw (Heading) below dial */}
                        <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex flex-col items-center bg-marine-dark/80 backdrop-blur-sm border border-marine-border rounded-xl px-6 py-2 shadow-lg">
                           <span className="text-[9px] font-bold text-marine-text-secondary uppercase tracking-widest mb-0.5">Yaw (Heading)</span>
                           <span className="text-xl font-mono font-black text-marine-accent">{(sensorData.gnss.heading || 0).toFixed(1)}°</span>
                        </div>
                      </div>

                      {/* Right: Roll Data */}
                      <div className="flex flex-col items-center md:items-start gap-1 text-center md:text-left">
                        <span className="text-[10px] font-bold text-marine-text-secondary uppercase tracking-widest">Roll</span>
                        <span className="text-4xl font-mono font-black text-marine-accent drop-shadow-[0_0_8px_rgba(45,212,191,0.3)]">
                          {(sensorData.gnss.roll || 0).toFixed(1)}°
                        </span>
                        <span className="text-[10px] text-marine-text-secondary uppercase font-semibold mt-1 bg-marine-dark/50 px-2 py-0.5 rounded-full border border-marine-border">
                          {(sensorData.gnss.roll || 0) > 0 ? 'Stbd Heel' : 'Port Heel'}
                        </span>
                      </div>
                    </div>
                    {/* Extra spacing to account for the absolute positioned Yaw box */}
                    <div className="h-16 w-full"></div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <NotificationFeed />
      </div>
    </div>
  );
}
