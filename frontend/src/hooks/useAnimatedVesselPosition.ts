import { useState, useEffect, useRef } from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';

/**
 * Feature 1 — Ship Movement Animation Hook
 * Smoothes jittery telemetry updates by interpolating position and heading at 60fps.
 * Implement distance-based speed scaling: speed = base + k * distance.
 */
export function useAnimatedVesselPosition() {
  const { sensorData } = useTelemetry();
  
  // Internal state for the smoothly moving position
  const [animatedPos, setAnimatedPos] = useState({
    lat: sensorData.gnss.latitude,
    lng: sensorData.gnss.longitude,
    heading: sensorData.gnss.heading
  });

  // Target values from telemetry
  const targetRef = useRef({
    lat: sensorData.gnss.latitude,
    lng: sensorData.gnss.longitude,
    heading: sensorData.gnss.heading
  });

  // Current animation state refs to avoid re-render cycles
  const currentRef = useRef({
    lat: sensorData.gnss.latitude,
    lng: sensorData.gnss.longitude,
    heading: sensorData.gnss.heading
  });

  // Update targets when sensor data arrives
  useEffect(() => {
    if (isFinite(sensorData.gnss.latitude) && isFinite(sensorData.gnss.longitude)) {
      targetRef.current = {
        lat: sensorData.gnss.latitude,
        lng: sensorData.gnss.longitude,
        heading: sensorData.gnss.heading
      };
    }
  }, [sensorData.gnss.latitude, sensorData.gnss.longitude, sensorData.gnss.heading]);

  useEffect(() => {
    let frameId: number;
    
    // Animation constants
    const BASE_LERP = 0.05;
    const SPEED_K = 0.2; // k factor for distance scaling
    const DECEL_RADIUS = 0.0001; // Lat/Lng units approx

    const animate = () => {
      const target = targetRef.current;
      const current = currentRef.current;

      const dLat = target.lat - current.lat;
      const dLng = target.lng - current.lng;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);

      if (dist > 0.000001) {
        // Feature 1: distance-based speed scaling
        let lerpFactor = BASE_LERP + (SPEED_K * dist);
        
        // Deceleration near target
        if (dist < DECEL_RADIUS) {
          lerpFactor = (dist / DECEL_RADIUS) * BASE_LERP;
        }

        // Clamp lerp factor
        lerpFactor = Math.min(Math.max(lerpFactor, 0.01), 1.0);

        current.lat += dLat * lerpFactor;
        current.lng += dLng * lerpFactor;

        // Smoothly rotate toward heading
        let hDiff = ((target.heading - current.heading + 540) % 360) - 180;
        current.heading += hDiff * 0.15;
        current.heading = (current.heading + 360) % 360;

        setAnimatedPos({ 
          lat: current.lat, 
          lng: current.lng, 
          heading: current.heading 
        });
      }

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return animatedPos;
}
