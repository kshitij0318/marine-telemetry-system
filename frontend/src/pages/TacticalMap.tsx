import React, { useEffect, useState } from 'react';
import { SensorData } from '../contexts/TelemetryContext';
import { MapRendererProps } from './NavigationMap';

export function renderTacticalMap({
  ctx,
  width,
  height,
  vesselPosition,
  sensorData,
  latLngToCanvas
}: MapRendererProps) {
  const vesselPos = latLngToCanvas(vesselPosition.lat, vesselPosition.lng, width, height);

  // Threat radius circles
  // Feature 7: Aligned threat colors with RadarDisplay.tsx marine-dark theme
  sensorData.oas.detections.forEach((detection: any) => {
    const threatRadii: Record<string, number> = { low: 50, medium: 100, high: 150 };
    const radius = threatRadii[detection.threat] || 50;
    
    const pixelsPerMeter = 10000 / 111320;
    const obstacleAngle = ((sensorData.gnss.heading + detection.angle) - 90) * Math.PI / 180;
    const px = vesselPos.x + Math.cos(obstacleAngle) * (detection.distance * pixelsPerMeter);
    const py = vesselPos.y + Math.sin(obstacleAngle) * (detection.distance * pixelsPerMeter);
    
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, 2 * Math.PI);
    
    // Feature 7 standardized hex codes
    if (detection.threat === 'high') ctx.strokeStyle = '#f87171';
    else if (detection.threat === 'medium') ctx.strokeStyle = '#fbbf24';
    else ctx.strokeStyle = '#4ade80';

    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // Current drift vector
  const currentSpeed = sensorData.currentMeter.speed;
  const currentDirection = ((sensorData.currentMeter.direction - 90) * Math.PI) / 180;
  const driftLength = currentSpeed * 30;
  
  ctx.save();
  ctx.translate(vesselPos.x, vesselPos.y);
  ctx.rotate(currentDirection);
  
  // Animated dashed line
  const dashOffset = (Date.now() / 50) % 15;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(driftLength, 0);
  ctx.strokeStyle = '#00ff41';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 10]);
  ctx.lineDashOffset = dashOffset;
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Arrow head
  ctx.beginPath();
  ctx.moveTo(driftLength, 0);
  ctx.lineTo(driftLength - 8, -5);
  ctx.lineTo(driftLength - 8, 5);
  ctx.closePath();
  ctx.fillStyle = '#00ff41';
  ctx.fill();
  
  ctx.restore();
  
  // Current vector label
  ctx.fillStyle = '#00ff41';
  ctx.font = '11px monospace';
  ctx.fillText(`${currentSpeed.toFixed(1)} m/s`, vesselPos.x + driftLength * Math.cos(currentDirection) + 10, vesselPos.y + driftLength * Math.sin(currentDirection));
}

interface TacticalHUDProps {
  sensorData: SensorData;
}

export function TacticalMapHUD({ sensorData }: TacticalHUDProps) {
  const [gnssLastFixTime, setGnssLastFixTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      if (sensorData.gnss.status === 'active') {
        setGnssLastFixTime(Date.now());
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [sensorData.gnss.status]);

  const getTimeSinceLastFix = () => {
    const seconds = Math.floor((Date.now() - gnssLastFixTime) / 1000);
    return `${seconds}s`;
  };

  return (
    <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm p-3 rounded-lg border border-green-500/30 space-y-2">
      <div className="text-xs uppercase tracking-wider text-green-400 mb-2">SENSOR STATUS</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${sensorData.gnss.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
          <span className="text-green-400 text-xs font-mono">GNSS</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${sensorData.ctd.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
          <span className="text-green-400 text-xs font-mono">CTD</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${sensorData.currentMeter.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
          <span className="text-green-400 text-xs font-mono">CURRENT</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${sensorData.oas.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
          <span className="text-green-400 text-xs font-mono">OAS</span>
        </div>
      </div>
      <div className="border-t border-green-500/30 mt-2 pt-2">
        <div className="text-xs text-green-500">GNSS LAST FIX</div>
        <div className="text-green-400 font-mono text-sm">{getTimeSinceLastFix()} ago</div>
      </div>
    </div>
  );
}

export default function TacticalMap() {
  return null;
}
