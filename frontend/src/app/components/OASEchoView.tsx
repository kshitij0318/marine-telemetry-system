// ── OASEchoView.tsx ────────────────────────────────────────────────────────────
// Echo sounder / sonar-style OAS camera renderer.
// Replaces the sky/horizon camera aesthetic with a dark green sonar display.
// Detection logic, sensor positions, and props interface are UNCHANGED from CameraFeed.
// Only the canvas draw function changes style.

import React, { useRef, useEffect } from 'react';

interface Detection {
  id: string;
  threat: string;
  relativeAngleInFov: number; // -1 to 1 (left to right in sensor FOV)
  distance: number;           // meters
}

interface SensorConfig {
  id: string;
  label: string;
  fovDeg: number;
  maxRangeM: number;
  bearingCenter: number; // degrees from vessel heading
}

interface OASEchoViewProps {
  sensor: SensorConfig;
  detections: Detection[];
  isActive?: boolean;
}

const THREAT_COLORS: Record<string, string> = {
  critical: '#ff3b3b',
  high: '#ff6b00',
  medium: '#ffb800',
  low: '#00ff64',
};

export function OASEchoView({ sensor, detections, isActive = true }: OASEchoViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const scanLineRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const dets = detections || [];

    const draw = () => {
      // ── Background: dark sonar screen ─────────────────────────────────────
      ctx.fillStyle = '#000a0a';
      ctx.fillRect(0, 0, W, H);

      // Subtle radial glow from center-bottom (sonar emitter)
      const bgGrd = ctx.createRadialGradient(W / 2, H, 0, W / 2, H, H * 1.2);
      bgGrd.addColorStop(0, 'rgba(0,40,20,0.3)');
      bgGrd.addColorStop(1, 'transparent');
      ctx.fillStyle = bgGrd;
      ctx.fillRect(0, 0, W, H);

      // ── Horizontal scan lines (echo sounder aesthetic) ───────────────────
      for (let y = 0; y < H; y += 4) {
        const alpha = 0.015 + (y / H) * 0.025;
        ctx.fillStyle = `rgba(0, 255, 100, ${alpha})`;
        ctx.fillRect(0, y, W, 1);
      }

      // ── Range grid (horizontal bands = distance rings) ───────────────────
      const rangeSteps = 5;
      for (let i = 1; i <= rangeSteps; i++) {
        const y = (i / rangeSteps) * H;
        const rangeM = sensor.maxRangeM * (i / rangeSteps);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.strokeStyle = 'rgba(0, 255, 100, 0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = 'rgba(0, 255, 100, 0.45)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${rangeM.toFixed(0)}m`, 4, y - 3);
      }

      // ── FOV bearing lines (vertical azimuth guides) ───────────────────────
      const bearingSteps = 4;
      for (let step = 0; step <= bearingSteps; step++) {
        const frac = step / bearingSteps;
        const deg = -sensor.fovDeg / 2 + frac * sensor.fovDeg;
        const x = frac * W;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.strokeStyle = 'rgba(0, 255, 100, 0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = 'rgba(0, 255, 100, 0.35)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${deg > 0 ? '+' : ''}${deg.toFixed(0)}°`, x, H - 4);
      }
      ctx.textAlign = 'left';

      // ── Vertical center boresight line ────────────────────────────────────
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.strokeStyle = 'rgba(0, 255, 100, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // ── Animated scan sweep line ──────────────────────────────────────────
      scanLineRef.current = (scanLineRef.current + 1) % H;
      const sweepY = scanLineRef.current;
      const sweepGrd = ctx.createLinearGradient(0, sweepY - 20, 0, sweepY + 4);
      sweepGrd.addColorStop(0, 'rgba(0,255,100,0)');
      sweepGrd.addColorStop(0.8, 'rgba(0,255,100,0.08)');
      sweepGrd.addColorStop(1, 'rgba(0,255,100,0.35)');
      ctx.fillStyle = sweepGrd;
      ctx.fillRect(0, sweepY - 20, W, 24);

      // ── Echo return blobs ─────────────────────────────────────────────────
      dets.forEach(det => {
        if (det.distance == null || det.relativeAngleInFov == null) return;
        const color = THREAT_COLORS[det.threat] ?? '#00ff64';

        // X: bearing left/right (-1=left, +1=right)
        const blobX = W / 2 + det.relativeAngleInFov * (W / 2 - 16);

        // Y: range — top=far, bottom=close (sonar convention: emitter at bottom)
        const rangeFrac = Math.min(det.distance / sensor.maxRangeM, 1);
        const blobY = (1 - rangeFrac) * H * 0.9 + H * 0.05;

        const blobR = Math.max(4, 14 * (1 - rangeFrac * 0.7));

        // Outer glow
        const grd = ctx.createRadialGradient(blobX, blobY, 0, blobX, blobY, blobR * 3);
        grd.addColorStop(0, color + 'cc');
        grd.addColorStop(0.4, color + '44');
        grd.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(blobX, blobY, blobR * 3, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Bright core
        ctx.beginPath();
        ctx.arc(blobX, blobY, blobR, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = color;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Range label
        ctx.fillStyle = color;
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${det.distance.toFixed(0)}m`, blobX, blobY - blobR - 4);

        // ID label
        ctx.font = '7px monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText(det.id, blobX, blobY - blobR - 13);

        // Trailing echo streaks (simulate sonar persistence)
        for (let trail = 1; trail <= 3; trail++) {
          const alpha = Math.floor((1 - trail * 0.3) * 40).toString(16).padStart(2, '0');
          ctx.beginPath();
          ctx.arc(blobX, blobY + trail * 5, blobR * (1 - trail * 0.22), 0, Math.PI * 2);
          ctx.fillStyle = color + alpha;
          ctx.fill();
        }
        ctx.textAlign = 'left';
      });

      // ── No contacts ───────────────────────────────────────────────────────
      if (dets.length === 0) {
        ctx.fillStyle = 'rgba(0,255,100,0.15)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NO ECHO RETURNS', W / 2, H / 2 - 8);
        ctx.fillText('SECTOR CLEAR', W / 2, H / 2 + 8);
        ctx.textAlign = 'left';
      }

      // ── Sensor label ──────────────────────────────────────────────────────
      ctx.fillStyle = '#00ff64';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(
        `ECHO: ${sensor.label.toUpperCase()} | ${sensor.fovDeg}° FOV | ${sensor.maxRangeM}m`,
        6, 14
      );

      // ── Active/Inactive indicator ─────────────────────────────────────────
      const statusColor = isActive ? '#00ff64' : '#666';
      ctx.beginPath();
      ctx.arc(W - 10, 10, 4, 0, Math.PI * 2);
      ctx.fillStyle = statusColor;
      ctx.shadowBlur = isActive ? 8 : 0;
      ctx.shadowColor = statusColor;
      ctx.fill();
      ctx.shadowBlur = 0;

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [sensor, detections, isActive]);

  return (
    <div className="relative w-full h-full bg-black rounded-xl overflow-hidden border border-[#00ff64]/20 shadow-[0_0_20px_rgba(0,255,100,0.05)]">
      <canvas
        ref={canvasRef}
        width={640}
        height={360}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

// Default sensor config for when sensor prop is not provided
OASEchoView.defaultSensor = {
  id: 'OAS-DEFAULT',
  label: 'SECTOR',
  fovDeg: 60,
  maxRangeM: 500,
  bearingCenter: 0,
};
