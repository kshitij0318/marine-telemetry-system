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
    status: SensorStatus;
  };
  oas: {
    detections: Array<{ id: string; angle: number; distance: number; threat: 'low' | 'medium' | 'high'; worldLat: number; worldLng: number }>;
    range: number;
    config?: { range: number; frequency: string; beamWidth: number; pulseLength: string; mode: string };
    performance?: { pingRate: number; signalStrength: number; noiseFloor: number; targetStrength: number };
    status: SensorStatus;
  };
}

interface TelemetryContextType {
  sensorData: SensorData;
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
    oas: {
      detections: [],
      range: 200,
      status: 'offline',
    },
  };

  const sensorDataRef = React.useRef<SensorData>(DEFAULT_SENSOR_DATA);
  const [sensorData, setSensorData] = useState<SensorData>(DEFAULT_SENSOR_DATA);
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

    const connect = () => {
      ws = new WebSocket('ws://localhost:5000');
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.type === 'parent-update' && payload.data) {
            const data = payload.data;
            
            const shortestAngleDelta = (current: number, target: number) => {
              return ((target - current + 540) % 360) - 180;
            };
            
            const prev = sensorDataRef.current;
            
            sensorDataRef.current = {
              ...prev,
              gnss: {
                ...prev.gnss,
                latitude: data.latitude ?? prev.gnss.latitude,
                longitude: data.longitude ?? prev.gnss.longitude,
                heading: data.heading !== undefined ? (prev.gnss.heading + shortestAngleDelta(prev.gnss.heading, data.heading) * 0.06 + 360) % 360 : prev.gnss.heading,
                speed: data.speed !== undefined ? prev.gnss.speed + (data.speed - prev.gnss.speed) * 0.08 : prev.gnss.speed,
                course: data.course ?? prev.gnss.course,
                satellites: data.satellites ?? prev.gnss.satellites,
                hdop: data.hdop ?? prev.gnss.hdop,
                status: (data.latitude || data.longitude) ? 'active' : 'offline'
              },
              ctd: {
                ...prev.ctd,
                depth: data.depth !== undefined ? prev.ctd.depth + (data.depth - prev.ctd.depth) * 0.015 : prev.ctd.depth,
                temperature: data.temperature !== undefined ? prev.ctd.temperature + (data.temperature - prev.ctd.temperature) * 0.008 : prev.ctd.temperature,
                salinity: data.salinity !== undefined ? prev.ctd.salinity + (data.salinity - prev.ctd.salinity) * 0.004 : prev.ctd.salinity,
                conductivity: data.conductivity ?? prev.ctd.conductivity,
                pressure: data.pressure ?? prev.ctd.pressure,
                density: data.density ?? prev.ctd.density,
                soundVelocity: data.soundVelocity ?? prev.ctd.soundVelocity,
                turbidity: data.turbidity ?? prev.ctd.turbidity,
                dissolvedOxygen: data.dissolvedOxygen ?? prev.ctd.dissolvedOxygen,
                fluorescence: data.fluorescence ?? prev.ctd.fluorescence,
                pH: data.pH ?? prev.ctd.pH,
                status: data.depth !== undefined ? 'active' : 'offline'
              },
              currentMeter: {
                ...prev.currentMeter,
                speed: data.speed !== undefined && data.eastward !== undefined ? prev.currentMeter.speed + (data.speed - prev.currentMeter.speed) * 0.04 : prev.currentMeter.speed,
                direction: data.direction !== undefined ? (prev.currentMeter.direction + shortestAngleDelta(prev.currentMeter.direction, data.direction) * 0.03 + 360) % 360 : prev.currentMeter.direction,
                eastward: data.eastward ?? prev.currentMeter.eastward,
                northward: data.northward ?? prev.currentMeter.northward,
                upward: data.upward ?? prev.currentMeter.upward,
                waterTemperature: data.waterTemperature ?? prev.currentMeter.waterTemperature,
                status: data.direction !== undefined ? 'active' : 'offline'
              },
              thruster: {
                ...prev.thruster,
                rpm: data.rpm !== undefined ? prev.thruster.rpm + (data.rpm - prev.thruster.rpm) * 0.07 : prev.thruster.rpm,
                power: data.power ?? prev.thruster.power,
                temperature: data.temperature !== undefined && data.rpm !== undefined ? prev.thruster.temperature + (data.temperature - prev.thruster.temperature) * 0.012 : prev.thruster.temperature,
                thrust: data.thrust ?? prev.thruster.thrust,
                voltage: data.voltage ?? prev.thruster.voltage,
                current: data.current ?? prev.thruster.current,
                torque: data.torque ?? prev.thruster.torque,
                currentDraw: data.currentDraw ?? prev.thruster.currentDraw,
                powerConsumption: data.powerConsumption ?? prev.thruster.powerConsumption,
                efficiency: data.efficiency ?? prev.thruster.efficiency,
                vibration: data.vibration ?? prev.thruster.vibration,
                fuelFlow: data.fuelFlow ?? prev.thruster.fuelFlow,
                runtimeHours: data.runtimeHours ?? prev.thruster.runtimeHours,
                runtimeMinutes: data.runtimeMinutes ?? prev.thruster.runtimeMinutes,
                status: data.rpm !== undefined ? 'active' : 'offline'
              },
              oas: {
                ...prev.oas,
                detections: data.detections ? (() => {
                  const now = Date.now();
                  const newDetections = data.detections.map((d: any) => {
                    const existing = prev.oas.detections.find((e: any) => e.id === d.id);
                    return {
                      ...d,
                      distance: existing ? existing.distance + (d.distance - existing.distance) * 0.12 : d.distance,
                      lastUpdated: now
                    };
                  });
                  
                  prev.oas.detections.forEach((e: any) => {
                    if (!newDetections.find((d: any) => d.id === e.id) && now - (e.lastUpdated || now) < 4000) {
                      newDetections.push(e);
                    }
                  });
                  return newDetections;
                })() : prev.oas.detections,
                range: data.range ?? prev.oas.range,
                config: data.config ?? prev.oas.config,
                performance: data.performance ?? prev.oas.performance,
                status: data.range !== undefined ? 'active' : 'offline'
              }
            };
            
            const nowTime = Date.now();
            if (nowTime - lastUIUpdate.current > 100) {
              lastUIUpdate.current = nowTime;
              setSensorData({ ...sensorDataRef.current });
            }
          }
        } catch (err) {
          console.error('Failed to parse telemetry socket message:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimer = setTimeout(connect, 3000); // Auto reconnect in 3s
      };

      ws.onerror = (err) => {
        console.error('Telemetry WebSocket Error:', err);
        ws.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) {
        ws.close();
      }
    };
  }, []);

  return { sensorData, isConnected, sendCommand };
}

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const liveTelemetry = useLiveTelemetry();

  return (
    <TelemetryContext.Provider value={liveTelemetry}>
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


