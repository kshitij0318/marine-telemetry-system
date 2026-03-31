import React from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';
import { Card } from '../app/components/ui/card';
import { Ship, Activity, MapPin, AlertCircle } from 'lucide-react';
import { Badge } from '../app/components/ui/badge';

export default function FleetOverview() {
  const { sensorData } = useTelemetry();
  const [vessels, setVessels] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Poll the backend REST API for fleet overview mapping
    const fetchFleet = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/fleet');
        if (!response.ok) throw new Error('Failed to fetch fleet data');
        const data = await response.json();
        setVessels(data);
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-marine-text">Fleet Overview</h2>
          <p className="text-marine-text-secondary mt-1">Monitor all vessels in your fleet</p>
        </div>
        <div className="flex items-center gap-4">
          <Card className="bg-marine-surface border-marine-border p-4">
            <div className="flex items-center gap-2">
              <Ship className="w-5 h-5 text-marine-accent" />
              <div>
                <div className="text-2xl font-bold text-marine-accent">{vessels.length}</div>
                <div className="text-xs text-marine-text-secondary">Total Vessels</div>
              </div>
            </div>
          </Card>
          <Card className="bg-marine-surface border-marine-border p-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              <div>
                <div className="text-2xl font-bold text-green-400">
                  {vessels.filter(v => v.status === 'active').length}
                </div>
                <div className="text-xs text-marine-text-secondary">Active</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Vessel Cards */}
      <div className="grid grid-cols-1 gap-6">
        {vessels.map((vessel) => (
          <Card key={vessel.id} className="bg-marine-surface border-marine-border p-6 hover:border-marine-accent transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-marine-accent/10 rounded-lg flex items-center justify-center">
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

            {vessel.id === 'MV-001' && (
              <div className="mt-4 pt-4 border-t border-marine-border">
                <div className="grid grid-cols-5 gap-4">
                  <div>
                    <div className="text-xs text-marine-text-secondary mb-1">GNSS</div>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full animate-pulse ${
                        sensorData.gnss.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className="text-xs text-marine-text capitalize">{sensorData.gnss.status}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-marine-text-secondary mb-1">CTD</div>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full animate-pulse ${
                        sensorData.ctd.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className="text-xs text-marine-text capitalize">{sensorData.ctd.status}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-marine-text-secondary mb-1">Current Meter</div>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full animate-pulse ${
                        sensorData.currentMeter.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className="text-xs text-marine-text capitalize">{sensorData.currentMeter.status}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-marine-text-secondary mb-1">Thruster</div>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full animate-pulse ${
                        sensorData.thruster.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className="text-xs text-marine-text capitalize">{sensorData.thruster.status}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-marine-text-secondary mb-1">OAS</div>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full animate-pulse ${
                        sensorData.oas.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className="text-xs text-marine-text capitalize">{sensorData.oas.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* System Alerts */}
      <Card className="bg-marine-surface border-marine-border p-6">
        <h3 className="text-lg font-semibold text-marine-text mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-marine-accent" />
          Recent Alerts
        </h3>
        <div className="space-y-3">
          <div className="p-3 bg-marine-dark rounded-lg border border-marine-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <div>
                  <div className="text-sm font-medium text-marine-text">MV-002 delayed signal</div>
                  <div className="text-xs text-marine-text-secondary">2 minutes ago</div>
                </div>
              </div>
              <Badge variant="secondary" className="bg-amber-500 border-none">Warning</Badge>
            </div>
          </div>
          <div className="p-3 bg-marine-dark rounded-lg border border-marine-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <div>
                  <div className="text-sm font-medium text-marine-text">All systems operational</div>
                  <div className="text-xs text-marine-text-secondary">5 minutes ago</div>
                </div>
              </div>
              <Badge className="bg-green-500">Info</Badge>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
