import { useCallback } from 'react';

export function useMapCanvas(mapCenter: { lat: number; lng: number }) {
  const latLngToCanvas = useCallback((lat: number, lng: number, width: number, height: number) => {
    const centerLat = mapCenter.lat;
    const centerLng = mapCenter.lng;
    const scale = 10000;
    
    const x = width / 2 + (lng - centerLng) * scale;
    const y = height / 2 - (lat - centerLat) * scale;
    
    return { x, y };
  }, [mapCenter]);

  const canvasToLatLng = useCallback((x: number, y: number, width: number, height: number) => {
    const centerLat = mapCenter.lat;
    const centerLng = mapCenter.lng;
    const scale = 10000;
    
    const lng = centerLng + (x - width / 2) / scale;
    const lat = centerLat - (y - height / 2) / scale;
    
    return { lat, lng };
  }, [mapCenter]);

  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }, []);

  return { latLngToCanvas, canvasToLatLng, calculateDistance };
}
