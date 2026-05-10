import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTelemetry } from '../../../contexts/TelemetryContext';

export const VesselMarker = React.memo(() => {
  const markerRef = useRef<L.Marker | null>(null);
  const map = useMap();
  const { sensorData } = useTelemetry();
  const dataRef = useRef(sensorData);
  
  useEffect(() => { dataRef.current = sensorData; }, [sensorData]);
  
  useEffect(() => {
    const icon = L.divIcon({
      className: '',
      html: `<svg width="20" height="28" viewBox="0 0 20 28" style="transform-origin:50% 60%">
        <polygon points="10,0 0,24 10,18 20,24" fill="#00d4ff" 
          filter="drop-shadow(0 0 4px #00d4ff)"/>
      </svg>`,
      iconSize: [20, 28],
      iconAnchor: [10, 17],
    });
    
    markerRef.current = L.marker([18.9220, 72.8347], {icon, zIndexOffset: 1000}).addTo(map);
    return () => { 
        if (markerRef.current) markerRef.current.remove(); 
    };
  }, [map]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const {latitude, longitude, heading} = dataRef.current.gnss || {};
      if (!markerRef.current || latitude === undefined || !isFinite(latitude)) return;
      
      markerRef.current.setLatLng([latitude, longitude]);
      
      const el = markerRef.current.getElement();
      if (el) {
          const currentTransform = el.style.transform;
          const rotateMatch = currentTransform.match(/rotate\([^)]+\)/);
          const newTransform = currentTransform.replace(/rotate\([^)]+\)/, '') + ` rotate(${Math.round(heading - 90)}deg)`;
          
          if (!rotateMatch) {
              el.style.transform = currentTransform + ` rotate(${Math.round(heading - 90)}deg)`;
          } else {
              el.style.transform = newTransform;
          }
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);
  
  return null;
});
