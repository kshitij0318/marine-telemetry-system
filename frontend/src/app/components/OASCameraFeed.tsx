import React, { useRef, useEffect } from 'react';
import { OASCamFeedPayload, OAS_SENSORS } from '../../types/oasSensors';

interface OASCameraFeedProps {
  payload: OASCamFeedPayload | null;
  sensorId: string;
}

export function OASCameraFeed({ payload, sensorId }: OASCameraFeedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;

    const renderFeed = () => {
      const W = canvas.width;
      const H = canvas.height;
      
      // Clear
      ctx.fillStyle = '#0a0f1e';
      ctx.fillRect(0, 0, W, H);

      // Add scanlines/noise for realism
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      for (let y = 0; y < H; y += 4) {
        ctx.fillRect(0, y, W, 1);
      }

      // Draw horizon
      const horizonY = H * 0.45;
      
      // Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
      skyGrad.addColorStop(0, '#0f1e33');
      skyGrad.addColorStop(1, '#1a2d47');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, horizonY);

      // Water grid
      const waterGrad = ctx.createLinearGradient(0, horizonY, 0, H);
      waterGrad.addColorStop(0, '#0a1628');
      waterGrad.addColorStop(1, '#001a33');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, horizonY, W, H - horizonY);

      ctx.strokeStyle = 'rgba(0, 217, 255, 0.1)';
      ctx.lineWidth = 1;
      
      // Perspective grid
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) {
        const x = (W / 10) * i;
        ctx.moveTo(W / 2, horizonY);
        ctx.lineTo(x, H);
      }
      ctx.stroke();

      // Horizon line
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(W, horizonY);
      ctx.strokeStyle = '#00d9ff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.moveTo(W / 2 - 20, H / 2);
      ctx.lineTo(W / 2 + 20, H / 2);
      ctx.strokeStyle = 'rgba(0, 217, 255, 0.5)';
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw UI overlay
      ctx.fillStyle = '#00d9ff';
      ctx.font = '12px monospace';
      ctx.fillText(`CAM: ${sensorId}`, 10, 20);
      const sensorInfo = Object.values(OAS_SENSORS).find(s => s.id === sensorId);
      if (sensorInfo) {
        ctx.fillText(`POS: ${sensorInfo.label.toUpperCase()}`, 10, 38);
        ctx.fillText(`FOV: ${sensorInfo.fov}°`, 10, 56);
      }

      if (!payload) {
        ctx.fillStyle = '#f87171';
        ctx.fillText('NO SIGNAL', W / 2 - 30, H / 2 + 20);
        frameId = requestAnimationFrame(renderFeed);
        return;
      }

      if (payload.status === 'offline') {
        ctx.fillStyle = '#f87171';
        ctx.fillText('OFFLINE', W / 2 - 25, H / 2 + 20);
        frameId = requestAnimationFrame(renderFeed);
        return;
      }

      // Draw Targets
      if (payload.visibleTargets && payload.visibleTargets.length > 0) {
        // Sort by distance (back to front)
        const sortedTargets = [...payload.visibleTargets].sort((a, b) => b.distance - a.distance);
        
        sortedTargets.forEach(target => {
          // Map relative angle (-1 to 1) to screen X
          const targetX = (W / 2) + (target.relativeAngleInFov * (W / 2));
          
          // Map distance to Y (closer = lower on screen)
          // Let's say 3000m is horizon, 0m is bottom
          const maxDist = 3000;
          const distRatio = Math.max(0, Math.min(1, target.distance / maxDist));
          // Logarithmic scaling for perspective
          const perspectiveY = horizonY + (H - horizonY) * Math.pow(1 - distRatio, 2);
          
          // Size scales with distance
          const baseSize = Math.max(10, 60 * (1 - distRatio));

          const isHigh = target.threat === 'high' || target.threat === 'critical';
          const color = isHigh ? '#f87171' : target.threat === 'medium' ? '#fbbf24' : '#4ade80';

          // Draw target bounding box
          ctx.strokeStyle = color;
          ctx.lineWidth = isHigh ? 2 : 1;
          ctx.beginPath();
          ctx.rect(targetX - baseSize / 2, perspectiveY - baseSize, baseSize, baseSize);
          ctx.stroke();
          
          if (isHigh) {
            // Fill high threat targets slightly
            ctx.fillStyle = `${color}33`;
            ctx.fill();
            
            // Add threat cross
            ctx.beginPath();
            ctx.moveTo(targetX - baseSize / 2, perspectiveY - baseSize / 2);
            ctx.lineTo(targetX + baseSize / 2, perspectiveY - baseSize / 2);
            ctx.moveTo(targetX, perspectiveY - baseSize);
            ctx.lineTo(targetX, perspectiveY);
            ctx.stroke();
          }

          // Label
          ctx.fillStyle = color;
          ctx.font = '10px monospace';
          ctx.fillText(`${target.distance.toFixed(0)}m`, targetX - 10, perspectiveY - baseSize - 5);
        });
      }

      frameId = requestAnimationFrame(renderFeed);
    };

    frameId = requestAnimationFrame(renderFeed);
    return () => cancelAnimationFrame(frameId);
  }, [payload, sensorId]);

  return (
    <div className="w-full bg-marine-dark border border-marine-border rounded-lg overflow-hidden relative">
      <canvas
        ref={canvasRef}
        width={800}
        height={450}
        className="w-full h-full object-cover"
        style={{ imageRendering: 'pixelated' }}
      />
      {(!payload || payload.status === 'offline') && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none">
          <div className="text-red-500 font-mono tracking-widest text-lg animate-pulse">NO SIGNAL</div>
        </div>
      )}
    </div>
  );
}
