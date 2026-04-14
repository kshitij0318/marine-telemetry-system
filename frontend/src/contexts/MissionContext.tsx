import React, { createContext, useContext } from 'react';
import { useTelemetry } from './TelemetryContext';

export interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  name: string;
}

export interface AvoidanceZone {
  id: string;
  points: { lat: number; lng: number }[];
  area: number;
  visible: boolean;
}

export interface ActiveMission {
  type: 'navigation' | 'mission_planning';
  ownerPage: 'navigation' | 'mission';
  waypoints: Waypoint[];
  avoidanceZones: AvoidanceZone[];
  reroutedWaypoints: { lat: number; lng: number }[];
  active: boolean;
  startTime: number;
  estimatedDistance: number;
  estimatedDuration: number;
  currentWaypointIndex: number;
  completedWaypoints: string[];
}

interface MissionContextType {
  startMission: (m: Omit<ActiveMission, 'startTime' | 'currentWaypointIndex' | 'completedWaypoints'>) => void;
  stopMission: (requestingPage: string) => void;
}

const MissionContext = createContext<MissionContextType | undefined>(undefined);

/**
 * MissionProvider - Refactored for Backend Authority
 * 
 * Removed local 'activeMission' state. The UI now relies 100% on the backend-streamed
 * 'missionState' from TelemetryContext. This ensures zero 'split-brain' states.
 */
export function MissionProvider({ children }: { children: React.ReactNode }) {
  const { sendCommand } = useTelemetry();

  const startMission = (m: Omit<ActiveMission, 'startTime' | 'currentWaypointIndex' | 'completedWaypoints'>) => {
    // We send the handoff to the backend immediately. 
    // The UI will update when the backend confirms 'active: true' in the broadcast.
    sendCommand({
      type: 'START_MISSION',
      vesselId: 'V001',
      ...m,
      startTime: Date.now(),
      currentWaypointIndex: 0,
      completedWaypoints: []
    });
  };

  const stopMission = (requestingPage: string) => {
    // Optimization: Standardize Stop call for V001
    sendCommand({ 
      type: 'STOP_MISSION', 
      vesselId: 'V001',
      requestingPage 
    });
  };

  return (
    <MissionContext.Provider value={{ startMission, stopMission }}>
      {children}
    </MissionContext.Provider>
  );
}

export function useMission() {
  const context = useContext(MissionContext);
  if (context === undefined) {
    throw new Error('useMission must be used within a MissionProvider');
  }
  return context;
}
