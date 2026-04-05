import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { renderNavigationMap } from './NavigationMap';
import { renderTacticalMap } from './TacticalMap';
import { SensorData } from '../contexts/TelemetryContext';

interface OverlayProps {
  mapMode: string;
  sensorData: SensorData;
  radarSweepAngle: number;
  sonarEchoTrail: any[];
}

export function MapCanvasOverlay({
  mapMode,
  sensorData,
  radarSweepAngle,
  sonarEchoTrail
}: OverlayProps) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Store latest props in refs to decouple drawing at 60fps from 10fps React state updates
  const stateRef = useRef({ mapMode, sensorData, radarSweepAngle, sonarEchoTrail });
  useEffect(() => {
    stateRef.current = { mapMode, sensorData, radarSweepAngle, sonarEchoTrail };
  }, [mapMode, sensorData, radarSweepAngle, sonarEchoTrail]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Position the canvas over the leafet map container natively
    L.DomUtil.addClass(canvas, 'leaflet-zoom-animated');
    canvas.style.position = 'absolute';
    canvas.style.zIndex = '400'; // above tiles, below popups
    canvas.style.pointerEvents = 'none';

    let frameId: number;

    const draw = () => {
      const { mapMode, sensorData, radarSweepAngle, sonarEchoTrail } = stateRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = map.getSize();
      if (canvas.width !== size.x || canvas.height !== size.y) {
        canvas.width = size.x;
        canvas.height = size.y;
      }

      // Keep it aligned with map panning
      const topLeft = map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(canvas, topLeft);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Wrapper to cast Lat/Lng to local canvas pixel space relative to TopLeft
      const latLngToCanvas = (lat: number, lng: number) => {
        const pt = map.latLngToContainerPoint([lat, lng]);
        return { x: pt.x, y: pt.y };
      };

      const vesselPosition = { 
        lat: sensorData.gnss.latitude, 
        lng: sensorData.gnss.longitude 
      };

      const baseProps = { 
        ctx, 
        width: canvas.width, 
        height: canvas.height, 
        vesselPosition, 
        sensorData, 
        latLngToCanvas 
      };

      if (mapMode === 'navigation') renderNavigationMap(baseProps);
      if (mapMode === 'tactical') {
        // Neon green grid based on world coordinates
        ctx.strokeStyle = 'rgba(0, 255, 65, 0.15)';
        ctx.lineWidth = 1;
        // Simple pixel grid spanning bounds
        for (let x = (topLeft.x % 50); x < canvas.width; x += 50) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = (topLeft.y % 50); y < canvas.height; y += 50) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }
        renderTacticalMap(baseProps);
      }
      if (mapMode === 'sonar') {
        // Sonar mode is rendered by <SonarDisplay> canvas overlay in MapCommandCenter — nothing to draw here.
      }

      frameId = requestAnimationFrame(draw);
    };

    draw();

    // Map events
    map.on('move', draw);
    map.on('zoom', draw);

    return () => {
      cancelAnimationFrame(frameId);
      map.off('move', draw);
      map.off('zoom', draw);
    };
  }, [map]);

  return <canvas ref={canvasRef} />;
}
