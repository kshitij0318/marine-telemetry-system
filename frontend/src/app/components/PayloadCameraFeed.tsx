// ── PayloadCameraFeed.tsx ─────────────────────────────────────────────────────
// Original sky/horizon/camera aesthetic — used for payload verification feeds.
// Same props as OASEchoView, same OAS data source, different visual style.
// Purpose: Operators verify payload drop targets via "real-world" camera perspective.

import React, { useRef, useEffect } from 'react';

interface Detection {
  id: string;
  threat: string;
  relativeAngleInFov: number; // -1 to 1
  distance: number;           // meters
}

interface SensorConfig {
  id: string;
  label: string;
  fovDeg: number;
  maxRangeM: number;
  bearingCenter: number;
}

interface PayloadCameraFeedProps {
  sensor: SensorConfig;
  detections: Detection[];
  vesselHeading?: number;
  isActive?: boolean;
}

export function PayloadCameraFeed({
  sensor,
  detections,
  vesselHeading = 0,
  isActive = true,
}: PayloadCameraFeedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const dets = detections || [];

    const draw = () => {
      // ── Background: sky gradient ──────────────────────────────────────────
      const skyGrd = ctx.createLinearGradient(0, 0, 0, H * 0.65);
      skyGrd.addColorStop(0, '#0a1a2e');
      skyGrd.addColorStop(0.5, '#1a3a5c');
      skyGrd.addColorStop(1, '#2a5a8c');
      ctx.fillStyle = skyGrd;
      ctx.fillRect(0, 0, W, H * 0.65);

      // ── Sea / water surface ───────────────────────────────────────────────
      const seaGrd = ctx.createLinearGradient(0, H * 0.65, 0, H);
      seaGrd.addColorStop(0, '#0d3b5e');
      seaGrd.addColorStop(0.5, '#0a2a44');
      seaGrd.addColorStop(1, '#061a2a');
      ctx.fillStyle = seaGrd;
      ctx.fillRect(0, H * 0.65, W, H * 0.35);

      // ── Wave shimmer ──────────────────────────────────────────────────────
      const t = performance.now() / 1000;
      for (let i = 0; i < 5; i++) {
        const y = H * 0.65 + i * 8 + Math.sin(t * 0.7 + i) * 3;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x < W; x += 2) {
          ctx.lineTo(x, y + Math.sin(x / 40 + t + i) * 2);
        }
        ctx.strokeStyle = `rgba(0,168,204,${0.08 + i * 0.02})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // ── Horizon line ──────────────────────────────────────────────────────
      ctx.beginPath();
      ctx.moveTo(0, H * 0.65);
      ctx.lineTo(W, H * 0.65);
      ctx.strokeStyle = 'rgba(0,168,204,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // ── Camera HUD frame: corner brackets ────────────────────────────────
      const l = 16;
      ctx.strokeStyle = 'rgba(0,212,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Top-left
      ctx.moveTo(8, 8 + l); ctx.lineTo(8, 8); ctx.lineTo(8 + l, 8);
      // Top-right
      ctx.moveTo(W - 8 - l, 8); ctx.lineTo(W - 8, 8); ctx.lineTo(W - 8, 8 + l);
      // Bottom-right
      ctx.moveTo(W - 8, H - 8 - l); ctx.lineTo(W - 8, H - 8); ctx.lineTo(W - 8 - l, H - 8);
      // Bottom-left
      ctx.moveTo(8 + l, H - 8); ctx.lineTo(8, H - 8); ctx.lineTo(8, H - 8 - l);
      ctx.stroke();

      // ── Crosshair ─────────────────────────────────────────────────────────
      ctx.strokeStyle = 'rgba(0,212,255,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 12, H / 2); ctx.lineTo(W / 2 + 12, H / 2);
      ctx.moveTo(W / 2, H / 2 - 12); ctx.lineTo(W / 2, H / 2 + 12);
      ctx.stroke();

      // ── Detection markers ─────────────────────────────────────────────────
      dets.forEach(det => {
        if (det.distance == null || det.relativeAngleInFov == null) return;

        const THREAT_COLORS: Record<string, string> = {
          critical: '#ff3b3b',
          high: '#ff6b00',
          medium: '#ffb800',
          low: '#00ff9d',
        };
        const color = THREAT_COLORS[det.threat] ?? '#00d4ff';

        // X: bearing in FOV
        const x = W / 2 + det.relativeAngleInFov * (W / 2 - 24);

        // Y: project distance on screen (horizon = max range, camera bottom = close)
        const horizonY = H * 0.65;
        const maxDistOnScreen = horizonY - H * 0.05;
        const rangeFrac = Math.min(det.distance / sensor.maxRangeM, 1);
        const y = horizonY - rangeFrac * maxDistOnScreen;

        // Box sizing (larger = closer)
        const boxW = Math.max(14, 60 * (1 - rangeFrac * 0.7));
        const boxH = boxW * 0.55;

        // Bounding box
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - boxW / 2, y - boxH / 2, boxW, boxH);

        // Corner accents
        const c = 5;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - boxW / 2, y - boxH / 2 + c); ctx.lineTo(x - boxW / 2, y - boxH / 2); ctx.lineTo(x - boxW / 2 + c, y - boxH / 2);
        ctx.moveTo(x + boxW / 2 - c, y - boxH / 2); ctx.lineTo(x + boxW / 2, y - boxH / 2); ctx.lineTo(x + boxW / 2, y - boxH / 2 + c);
        ctx.moveTo(x + boxW / 2, y + boxH / 2 - c); ctx.lineTo(x + boxW / 2, y + boxH / 2); ctx.lineTo(x + boxW / 2 - c, y + boxH / 2);
        ctx.moveTo(x - boxW / 2 + c, y + boxH / 2); ctx.lineTo(x - boxW / 2, y + boxH / 2); ctx.lineTo(x - boxW / 2, y + boxH / 2 - c);
        ctx.strokeStyle = color;
        ctx.stroke();

        // Label chip
        ctx.fillStyle = color + 'cc';
        ctx.fillRect(x - boxW / 2, y - boxH / 2 - 14, boxW, 12);
        ctx.fillStyle = '#000';
        ctx.font = `bold 7px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`${det.id} | ${det.distance.toFixed(0)}m`, x, y - boxH / 2 - 5);
        ctx.textAlign = 'left';
      });

      // ── Heading indicator bar at bottom ───────────────────────────────────
      const absBearing = ((vesselHeading + sensor.bearingCenter) % 360 + 360) % 360;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, H - 18, W, 18);
      ctx.fillStyle = '#00d4ff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${sensor.label.toUpperCase()}  ·  HDG ${absBearing.toFixed(0)}°  ·  FOV ${sensor.fovDeg}°  ·  RANGE ${sensor.maxRangeM}m`,
        W / 2, H - 5
      );
      ctx.textAlign = 'left';

      // ── Status dot ────────────────────────────────────────────────────────
      const statusColor = isActive ? '#00ff9d' : '#666';
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
  }, [sensor, detections, vesselHeading, isActive]);

  return (
    <div className="relative w-full h-full bg-black rounded-xl overflow-hidden border border-marine-border/30 shadow-2xl">
      <canvas
        ref={canvasRef}
        width={640}
        height={360}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
