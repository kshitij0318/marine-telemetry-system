import React, { createContext, useContext, useState, useEffect } from 'react';

export type SensorStatus = 'active' | 'delayed' | 'offline';

export interface SensorData {
  gnss: {
    latitude: number;
    longitude: number;
    speed: number;
    heading: number;
    altitude: number;
    satellites: number;
    status: SensorStatus;
  };
  ctd: {
    conductivity: number;
    temperature: number;
    depth: number;
    salinity: number;
    pressure: number;
    soundVelocity: number;
    depthProfile: Array<{ depth: number; temperature: number; salinity: number }>;
    status: SensorStatus;
  };
  currentMeter: {
    speed: number;
    direction: number;
    temperature: number;
    eastwardComponent: number;
    northwardComponent: number;
    status: SensorStatus;
  };
  thruster: {
    rpm: number;
    power: number;
    temperature: number;
    voltage: number;
    currentDraw: number;
    powerConsumption: number;
    efficiency: number;
    runtimeHours: number;
    runtimeMinutes: number;
    status: SensorStatus;
  };
  oas: {
    range: number;
    scanRate: number;
    beamAngle: number;
    resolution: number;
    detectionAccuracy: number;
    falsePositiveRate: number;
    processingLatency: number;
    uptime: number;
    signalQuality: string;
    totalScans: number;
    objectsTracked: number;
    avgDistance: number;
    detections: Array<{ angle: number; distance: number; threat: 'low' | 'medium' | 'high' }>;
    status: SensorStatus;
  };
}

interface TelemetryContextType {
  sensorData: SensorData;
  isConnected: boolean;
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

export function useLiveTelemetry() {
  const [sensorData, setSensorData] = useState<SensorData>({
    gnss: {
      latitude: 0,
      longitude: 0,
      speed: 0,
      heading: 0,
      altitude: 0,
      satellites: 0,
      status: 'offline',
    },
    ctd: {
      conductivity: 0,
      temperature: 0,
      depth: 0,
      salinity: 0,
      pressure: 0,
      soundVelocity: 0,
      depthProfile: [],
      status: 'offline',
    },
    currentMeter: {
      speed: 0,
      direction: 0,
      temperature: 0,
      eastwardComponent: 0,
      northwardComponent: 0,
      status: 'offline',
    },
    thruster: {
      rpm: 0,
      power: 0,
      temperature: 0,
      voltage: 0,
      currentDraw: 0,
      powerConsumption: 0,
      efficiency: 0,
      runtimeHours: 0,
      runtimeMinutes: 0,
      status: 'offline',
    },
    oas: {
      range: 0,
      scanRate: 0,
      beamAngle: 0,
      resolution: 0,
      detectionAccuracy: 0,
      falsePositiveRate: 0,
      processingLatency: 0,
      uptime: 0,
      signalQuality: 'Unknown',
      totalScans: 0,
      objectsTracked: 0,
      avgDistance: 0,
      detections: [],
      status: 'offline',
    },
  });

  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: NodeJS.Timeout;

    const connect = () => {
      ws = new WebSocket('ws://localhost:5000');

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.type === 'parent-update' && payload.data) {
            const data = payload.data;
            setSensorData(prev => ({
              ...prev,
              gnss: {
                ...prev.gnss,
                latitude: data.latitude ?? prev.gnss.latitude,
                longitude: data.longitude ?? prev.gnss.longitude,
                speed: data.speed ?? prev.gnss.speed,
                heading: data.heading ?? prev.gnss.heading,
                altitude: data.altitude ?? prev.gnss.altitude,
                satellites: data.satellites ?? prev.gnss.satellites,
                status: (data.latitude || data.longitude) ? 'active' : 'offline'
              },
              ctd: {
                ...prev.ctd,
                temperature: data.waterTemperature ?? prev.ctd.temperature,
                depth: data.depth ?? prev.ctd.depth,
                salinity: data.salinity ?? prev.ctd.salinity,
                pressure: data.pressure ?? prev.ctd.pressure,
                conductivity: data.conductivity ?? prev.ctd.conductivity,
                soundVelocity: data.soundVelocity ?? prev.ctd.soundVelocity,
                depthProfile: data.depthProfile ?? prev.ctd.depthProfile,
                status: data.depth !== undefined ? 'active' : 'offline'
              },
              currentMeter: {
                ...prev.currentMeter,
                speed: data.currentSpeed ?? prev.currentMeter.speed,
                direction: data.currentDirection ?? prev.currentMeter.direction,
                temperature: data.currentMeterTemperature ?? prev.currentMeter.temperature,
                eastwardComponent: data.eastwardComponent ?? prev.currentMeter.eastwardComponent,
                northwardComponent: data.northwardComponent ?? prev.currentMeter.northwardComponent,
                status: data.currentSpeed !== undefined ? 'active' : 'offline'
              },
              thruster: {
                ...prev.thruster,
                rpm: data.rpm ?? prev.thruster.rpm,
                power: data.thrustPower ?? prev.thruster.power,
                temperature: data.thrusterTemperature ?? prev.thruster.temperature,
                voltage: data.voltage ?? prev.thruster.voltage,
                currentDraw: data.currentDraw ?? prev.thruster.currentDraw,
                powerConsumption: data.powerConsumption ?? prev.thruster.powerConsumption,
                efficiency: data.efficiency ?? prev.thruster.efficiency,
                runtimeHours: data.runtimeHours ?? prev.thruster.runtimeHours,
                runtimeMinutes: data.runtimeMinutes ?? prev.thruster.runtimeMinutes,
                status: data.rpm !== undefined ? 'active' : 'offline'
              },
              oas: {
                ...prev.oas,
                range: data.range ?? prev.oas.range,
                scanRate: data.scanRate ?? prev.oas.scanRate,
                beamAngle: data.beamAngle ?? prev.oas.beamAngle,
                resolution: data.resolution ?? prev.oas.resolution,
                detectionAccuracy: data.detectionAccuracy ?? prev.oas.detectionAccuracy,
                falsePositiveRate: data.falsePositiveRate ?? prev.oas.falsePositiveRate,
                processingLatency: data.processingLatency ?? prev.oas.processingLatency,
                uptime: data.uptime ?? prev.oas.uptime,
                signalQuality: data.signalQuality ?? prev.oas.signalQuality,
                detections: data.detections ?? prev.oas.detections,
                totalScans: data.totalScans ?? prev.oas.totalScans,
                objectsTracked: data.objectsTracked ?? prev.oas.objectsTracked,
                avgDistance: data.avgDistance ?? prev.oas.avgDistance,
                status: data.range !== undefined ? 'active' : 'offline'
              }
            }));
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

  return { sensorData, isConnected };
}

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const liveTelemetry = useLiveTelemetry();

  return (
    <TelemetryContext.Provider value={{ sensorData: liveTelemetry.sensorData, isConnected: liveTelemetry.isConnected }}>
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


