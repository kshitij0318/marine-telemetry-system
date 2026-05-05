import React from 'react';
import { SensorData } from '../contexts/TelemetryContext';

export interface MapRendererProps {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  vesselPosition: { lat: number; lng: number };
  sensorData: SensorData;
  latLngToCanvas: (lat: number, lng: number) => { x: number; y: number };
}

export function renderNavigationMap({
  ctx,
  width,
  height,
  vesselPosition,
  sensorData,
  latLngToCanvas
}: MapRendererProps) {
  const vesselPos = latLngToCanvas(vesselPosition.lat, vesselPosition.lng);

  const depthContours = [10, 20, 30, 40, 50];
  depthContours.forEach((depth, index) => {
    const offset = index * 80;
    ctx.beginPath();
    for (let angle = 0; angle < 360; angle += 10) {
      const rad = (angle * Math.PI) / 180;
      const x = vesselPos.x + Math.cos(rad) * (150 + offset + Math.sin(angle / 10) * 20);
      const y = vesselPos.y + Math.sin(rad) * (150 + offset + Math.sin(angle / 10) * 20);
      if (angle === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.fillStyle = 'rgba(0, 212, 255, 0.5)';
    ctx.font = '10px monospace';
    ctx.fillText(`${depth}m`, vesselPos.x + 150 + offset, vesselPos.y);
  });

  for (let x = 100; x < width; x += 150) {
    for (let y = 100; y < height; y += 150) {
      const angle = ((sensorData.currentMeter.direction - 90) * Math.PI) / 180;
      const length = 20 + sensorData.currentMeter.speed * 5;
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(length, 0);
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(length, 0);
      ctx.lineTo(length - 5, -3);
      ctx.lineTo(length - 5, 3);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 212, 255, 0.4)';
      ctx.fill();
      
      ctx.restore();
    }
  }

  const scaleX = width - 150;
  const scaleY = height - 30;
  const scaleLength = 100;
  
  ctx.beginPath();
  ctx.moveTo(scaleX, scaleY);
  ctx.lineTo(scaleX + scaleLength, scaleY);
  ctx.lineTo(scaleX + scaleLength, scaleY - 5);
  ctx.moveTo(scaleX + scaleLength, scaleY);
  ctx.lineTo(scaleX + scaleLength, scaleY + 5);
  ctx.moveTo(scaleX, scaleY);
  ctx.lineTo(scaleX, scaleY - 5);
  ctx.moveTo(scaleX, scaleY);
  ctx.lineTo(scaleX, scaleY + 5);
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  ctx.fillStyle = '#00d4ff';
  ctx.font = '11px monospace';
  ctx.fillText('100m', scaleX + scaleLength / 2 - 20, scaleY + 20);

  const compassX = width - 60;
  const compassY = 60;
  const compassRadius = 40;
  
  ctx.save();
  ctx.translate(compassX, compassY);
  
  ctx.beginPath();
  ctx.arc(0, 0, compassRadius, 0, 2 * Math.PI);
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  ctx.font = '12px monospace';
  ctx.fillStyle = '#00d4ff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', 0, -compassRadius - 15);
  ctx.fillText('S', 0, compassRadius + 15);
  ctx.fillText('E', compassRadius + 15, 0);
  ctx.fillText('W', -compassRadius - 15, 0);
  
  ctx.rotate(((sensorData.gnss.heading - 90) * Math.PI) / 180);
  ctx.beginPath();
  ctx.moveTo(0, -compassRadius + 5);
  ctx.lineTo(-5, -compassRadius + 15);
  ctx.lineTo(5, -compassRadius + 15);
  ctx.closePath();
  ctx.fillStyle = '#ff3b3b';
  ctx.fill();
  
  ctx.restore();
}

export default function NavigationMap() {
  return null;
}
