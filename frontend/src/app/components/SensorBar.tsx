import React from 'react';
import { Link, useLocation } from 'react-router';
import { useTelemetry } from '../../contexts/TelemetryContext';
import type { SensorStatus } from '../../contexts/TelemetryContext';

interface SensorBarItem {
  name: string;
  path: string;
  statusKey: 'gnss' | 'ctd' | 'currentMeter' | 'thruster' | 'radar';
}

const sensorItems: SensorBarItem[] = [
  { name: 'GNSS', path: '/gnss', statusKey: 'gnss' },
  { name: 'CTD', path: '/ctd', statusKey: 'ctd' },
  { name: 'Current Meter', path: '/current-meter', statusKey: 'currentMeter' },
  { name: 'Thruster', path: '/thruster', statusKey: 'thruster' },
  { name: 'RADAR', path: '/radar', statusKey: 'radar' },
];

function getStatusColor(status: SensorStatus): string {
  switch (status) {
    case 'active':
      return 'bg-green-500';
    case 'delayed':
      return 'bg-amber-500';
    case 'offline':
      return 'bg-red-500';
  }
}

export function SensorBar() {
  const location = useLocation();
  const { sensorData } = useTelemetry();

  return (
    <div className="sticky top-0 bg-marine-surface border-b border-marine-border z-40">
      <div className="flex items-center h-14 px-4 space-x-2 overflow-x-auto">
        {sensorItems.map((item) => {
          const isActive = location.pathname === item.path;
          const status = sensorData[item.statusKey].status;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-marine-accent/10 text-marine-accent border border-marine-accent/30'
                  : 'text-marine-text-secondary hover:bg-marine-accent/5 hover:text-marine-text'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${getStatusColor(status)} animate-pulse`} />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
