import React, { createContext, useContext, useState, useEffect } from 'react';

export type SensorStatus = 'active' | 'delayed' | 'offline';

export interface SensorData {
  gnss: {
    latitude: number;
    longitude: number;
    heading: number;
    speed: number;
    course: number;
    satellites: number;
    hdop: number;
    fixType?: string;
    signalQuality?: number;
    status: SensorStatus;
  };
  ctd: {
    depth: number;
    temperature: number;
    salinity: number;
    conductivity: number;
    pressure: number;
    density?: number;
    soundVelocity?: number;
    turbidity?: number;
    dissolvedOxygen?: number;
    fluorescence?: number;
    pH?: number;
    status: SensorStatus;
  };
  currentMeter: {
    speed: number;
    direction: number;
    eastward: number;
    northward: number;
    upward: number;
    waterTemperature: number;
    salinity: number;
    turbidity: number;
    status: SensorStatus;
  };
  thruster: {
    rpm: number;
    power: number;
    temperature: number;
    thrust: number;
    voltage: number;
    current?: number;
    torque?: number;
    currentDraw: number;
    powerConsumption: number;
    efficiency: number;
    vibration: number;
    fuelFlow: number;
    runtimeHours: number;
    runtimeMinutes: number;
    maxRpm?: number;
    tempWarningThreshold?: number;
    status: SensorStatus;
  };
  radar: {
    rotationAngle: number;
    targets: Array<{ id: string; type: string; worldLat: number; worldLng: number; absoluteBearingDeg: number; bearingDeg: number; rangem: number; speedMps: number; courseDeg: number; cpa: number; tcpa: number; cri: number; threat: 'low' | 'medium' | 'high' | 'critical' }>;
    detections: Array<{ id: string; angle: number; distance: number; threat: 'low' | 'medium' | 'high'; worldLat: number; worldLng: number }>; // Legacy Phase 1 support
    oasSensors: any[];
    suggestedManeuver: { action: string; reason: string } | null;
    range: number;
    config?: { operatingRange: number; frequency: number; beamWidth: number; pulseLength: number; mode: string };
    performance?: { pingRate: number; signalStrength: number; noiseFloor: number; targetStrength: number };
    statistics?: { totalDetections: number; threatCounts: { high: number; medium: number; low: number }; maxRange: number };
    status: SensorStatus;
  };
}

interface TelemetryContextType {
  sensorData: SensorData;
  missionState: any | null;
  navigationDestination: any | null;
  alerts: any[];
  isConnected: boolean;
  sendCommand: (cmd: any) => void;
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

export function useLiveTelemetry() {
  const DEFAULT_SENSOR_DATA: SensorData = {
    gnss: {
      latitude: 0,
      longitude: 0,
      heading: 0,
      speed: 0,
      course: 0,
      satellites: 0,
      hdop: 0,
      fixType: 'N/A',
      signalQuality: 0,
      status: 'offline',
    },
    ctd: {
      depth: 0,
      temperature: 0,
      salinity: 0,
      conductivity: 0,
      pressure: 0,
      density: 0,
      soundVelocity: 0,
      turbidity: 0,
      dissolvedOxygen: 0,
      fluorescence: 0,
      pH: 0,
      status: 'offline',
    },
    currentMeter: {
      speed: 0,
      direction: 0,
      eastward: 0,
      northward: 0,
      upward: 0,
      waterTemperature: 0,
      salinity: 0,
      turbidity: 0,
      status: 'offline',
    },
    thruster: {
      rpm: 0,
      power: 0,
      temperature: 0,
      thrust: 0,
      voltage: 0,
      current: 0,
      torque: 0,
      currentDraw: 0,
      powerConsumption: 0,
      efficiency: 0,
      vibration: 0,
      fuelFlow: 0,
      runtimeHours: 0,
      runtimeMinutes: 0,
      status: 'offline',
    },
    radar: {
      rotationAngle: 0,
      targets: [],
      detections: [],
      oasSensors: [],
      suggestedManeuver: null,
      range: 200,
      status: 'offline',
    },
  };

  const sensorDataRef = React.useRef<SensorData>(DEFAULT_SENSOR_DATA);
  const [sensorData, setSensorData] = useState<SensorData>(DEFAULT_SENSOR_DATA);
  const [missionState, setMissionState] = useState<any | null>(null);
  const [navigationDestination, setNavigationDestination] = useState<any | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const lastUIUpdate = React.useRef<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = React.useRef<WebSocket | null>(null);

  const sendCommand = React.useCallback((cmd: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(cmd));
    }
  }, []);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: NodeJS.Timeout;
    let closedExplicitly = false;

    const connect = () => {
      // Prevent multiple concurrent connection attempts
      if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
        return;
      }

      ws = new WebSocket('ws://localhost:5001');
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'parent-update' && payload.data) {
            const state = payload.data;
            const shortestAngleDelta = (current: number, target: number) => ((target - current + 540) % 360) - 180;
            const prev = sensorDataRef.current;
            
            sensorDataRef.current = {
              ...prev,
              gnss: {
                ...prev.gnss,
                latitude: state.gnss?.latitude !== undefined ? prev.gnss.latitude + (state.gnss.latitude - prev.gnss.latitude) * 0.15 : prev.gnss.latitude,
                longitude: state.gnss?.longitude !== undefined ? prev.gnss.longitude + (state.gnss.longitude - prev.gnss.longitude) * 0.15 : prev.gnss.longitude,
                heading: state.gnss?.heading !== undefined ? (prev.gnss.heading + shortestAngleDelta(prev.gnss.heading, state.gnss.heading) * 0.08 + 360) % 360 : prev.gnss.heading,
                speed: state.gnss?.speed !== undefined ? prev.gnss.speed + (state.gnss.speed - prev.gnss.speed) * 0.08 : prev.gnss.speed,
                course: state.gnss?.course ?? prev.gnss.course,
                satellites: state.gnss?.satellites ?? prev.gnss.satellites,
                hdop: state.gnss?.hdop ?? prev.gnss.hdop,
                fixType: state.gnss?.fixType ?? prev.gnss.fixType,
                signalQuality: state.gnss?.signalQuality ?? prev.gnss.signalQuality,
                status: state.gnss?.status?.toLowerCase() as any ?? (state.gnss?.latitude !== undefined ? 'active' : prev.gnss.status),
              },
              ctd: {
                ...prev.ctd,
                depth: state.ctd?.depth !== undefined ? prev.ctd.depth + (state.ctd.depth - prev.ctd.depth) * 0.015 : prev.ctd.depth,
                temperature: state.ctd?.temperature ?? prev.ctd.temperature,
                salinity: state.ctd?.salinity ?? prev.ctd.salinity,
                conductivity: state.ctd?.conductivity ?? prev.ctd.conductivity,
                pressure: state.ctd?.pressure ?? prev.ctd.pressure,
                density: state.ctd?.density ?? prev.ctd.density,
                soundVelocity: state.ctd?.soundVelocity ?? prev.ctd.soundVelocity,
                turbidity: state.ctd?.turbidity ?? prev.ctd.turbidity,
                dissolvedOxygen: state.ctd?.dissolvedOxygen ?? prev.ctd.dissolvedOxygen,
                fluorescence: state.ctd?.fluorescence ?? prev.ctd.fluorescence,
                pH: state.ctd?.pH ?? prev.ctd.pH,
                status: state.ctd?.status?.toLowerCase() as any ?? (state.ctd?.depth !== undefined ? 'active' : prev.ctd.status),
              },
              currentMeter: {
                ...prev.currentMeter,
                show: !!state.currentMeter,
                speed: state.currentMeter?.speed !== undefined ? prev.currentMeter.speed + (state.currentMeter.speed - prev.currentMeter.speed) * 0.06 : prev.currentMeter.speed,
                direction: state.currentMeter?.direction ?? prev.currentMeter.direction,
                eastward: state.currentMeter?.eastward ?? prev.currentMeter.eastward,
                northward: state.currentMeter?.northward ?? prev.currentMeter.northward,
                upward: state.currentMeter?.upward ?? prev.currentMeter.upward,
                waterTemperature: state.currentMeter?.waterTemperature ?? prev.currentMeter.waterTemperature,
                salinity: state.currentMeter?.salinity ?? prev.currentMeter.salinity,
                turbidity: state.currentMeter?.turbidity ?? prev.currentMeter.turbidity,
                status: state.currentMeter?.status?.toLowerCase() as any ?? (state.currentMeter?.speed !== undefined ? 'active' : prev.currentMeter.status),
              },
              thruster: {
                ...prev.thruster,
                rpm: state.thruster?.rpm !== undefined ? prev.thruster.rpm + (state.thruster.rpm - prev.thruster.rpm) * 0.07 : prev.thruster.rpm,
                power: state.thruster?.power ?? prev.thruster.power,
                temperature: state.thruster?.temperature ?? prev.thruster.temperature,
                thrust: state.thruster?.thrust ?? prev.thruster.thrust,
                voltage: state.thruster?.voltage ?? prev.thruster.voltage,
                current: state.thruster?.current ?? prev.thruster.current,
                currentDraw: state.thruster?.currentDraw ?? state.thruster?.current ?? prev.thruster.currentDraw,
                vibration: state.thruster?.vibration ?? prev.thruster.vibration,
                fuelFlow: state.thruster?.fuelFlow ?? prev.thruster.fuelFlow,
                torque: state.thruster?.torque ?? prev.thruster.torque,
                powerConsumption: state.thruster?.powerConsumption ?? state.thruster?.power ?? prev.thruster.powerConsumption,
                efficiency: state.thruster?.efficiency ?? prev.thruster.efficiency,
                runtimeHours: state.thruster?.runtimeHours ?? prev.thruster.runtimeHours,
                runtimeMinutes: state.thruster?.runtimeMinutes ?? prev.thruster.runtimeMinutes,
                maxRpm: state.thruster?.maxRpm ?? prev.thruster.maxRpm,
                tempWarningThreshold: state.thruster?.tempWarningThreshold ?? prev.thruster.tempWarningThreshold,
                status: state.thruster?.status?.toLowerCase() as any ?? (state.thruster?.rpm !== undefined ? 'active' : prev.thruster.status),
              },
              radar: {
                ...prev.radar,
                rotationAngle: state.radar?.rotationAngle ?? prev.radar.rotationAngle,
                targets: state.radar?.targets || prev.radar.targets,
                oasSensors: state.radar?.oasSensors || prev.radar.oasSensors,
                suggestedManeuver: state.radar?.suggestedManeuver !== undefined ? state.radar.suggestedManeuver : prev.radar.suggestedManeuver,
                range: state.radar?.range ?? prev.radar.range,
                config: state.radar?.config ?? prev.radar.config,
                performance: state.radar?.performance ?? prev.radar.performance,
                statistics: state.radar?.statistics ?? prev.radar.statistics,
                detections: state.radar?.detections || prev.radar.detections,
                status: state.radar?.status === 'SCANNING' ? 'active' : (state.radar?.status?.toLowerCase() as any || prev.radar.status),
              }
            };
            
            const nowTime = Date.now();
            if (nowTime - lastUIUpdate.current > 100) {
              lastUIUpdate.current = nowTime;
              setSensorData({ ...sensorDataRef.current });
              setMissionState(payload.missionState || null);
              setNavigationDestination(payload.navigationDestination || null);
              if (payload.alerts?.length > 0) {
                setAlerts(prev => [...payload.alerts, ...prev].slice(0, 100));
              }
            }
          }
        } catch (err) {
          console.error('Failed to parse telemetry socket message:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        if (!closedExplicitly) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };

      ws.onerror = (err) => {
        console.error('Telemetry WebSocket Error:', err);
        ws.close();
      };
    };

    connect();

    return () => {
      closedExplicitly = true;
      clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnect on explicit cleanup
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return { sensorData, missionState, navigationDestination, alerts, isConnected, sendCommand };
}

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const liveTelemetry = useLiveTelemetry();

  return (
    <TelemetryContext.Provider value={{ sensorData: liveTelemetry.sensorData, missionState: liveTelemetry.missionState, navigationDestination: liveTelemetry.navigationDestination, alerts: liveTelemetry.alerts, isConnected: liveTelemetry.isConnected, sendCommand: liveTelemetry.sendCommand }}>
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetry() {
  const context = useContext(TelemetryContext);
  if (context === undefined) {
    throw new Error('useTelemetry must be used within a TelemetryProvider');
  }
  return context;
}


