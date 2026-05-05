import { useState, useEffect, useRef } from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';

/**
 * useAnimatedVesselPosition - 60fps smoothing for vessel position and heading.
 * 
 * Fix: Separated position animation from heading animation to ensure the arrow
 * rotates even when the ship is stationary. Added safety checks for initial null/undefined.
 */
export function useAnimatedVesselPosition() {
  const { sensorData } = useTelemetry();
  
  const [animatedPos, setAnimatedPos] = useState({
    lat: sensorData.gnss.latitude ?? 18.9000,
    lng: sensorData.gnss.longitude ?? 72.6500,
    heading: sensorData.gnss.heading ?? 0
  });

  const targetRef = useRef({
    lat: sensorData.gnss.latitude ?? 18.9000,
    lng: sensorData.gnss.longitude ?? 72.6500,
    heading: sensorData.gnss.heading ?? 0
  });

  const currentRef = useRef({
    lat: sensorData.gnss.latitude ?? 18.9000,
    lng: sensorData.gnss.longitude ?? 72.6500,
    heading: sensorData.gnss.heading ?? 0
  });

  useEffect(() => {
    const lat = sensorData.gnss.latitude;
    const lng = sensorData.gnss.longitude;
    const heading = sensorData.gnss.heading;

    if (isFinite(lat) && isFinite(lng)) {
      targetRef.current = { lat, lng, heading };
    }
  }, [sensorData.gnss.latitude, sensorData.gnss.longitude, sensorData.gnss.heading]);

  useEffect(() => {
    let frameId: number;
    const LERP_POS = 0.08;
    const LERP_HEADING = 0.15;

    const animate = () => {
      const target = targetRef.current;
      const current = currentRef.current;

      let changed = false;

      const dLat = target.lat - current.lat;
      const dLng = target.lng - current.lng;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);

      if (dist > 0.0000001) {
        current.lat += dLat * LERP_POS;
        current.lng += dLng * LERP_POS;
        changed = true;
      } else {
        current.lat = target.lat;
        current.lng = target.lng;
      }

      let hDiff = ((target.heading - current.heading + 540) % 360) - 180;
      if (Math.abs(hDiff) > 0.01) {
        current.heading += hDiff * LERP_HEADING;
        current.heading = (current.heading + 360) % 360;
        changed = true;
      } else {
        current.heading = target.heading;
      }

      setAnimatedPos({ 
        lat: current.lat, 
        lng: current.lng, 
        heading: current.heading 
      });

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return animatedPos;
}
