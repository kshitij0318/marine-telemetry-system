import React, { useRef, useEffect } from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';

export const SonarDisplay = () => {
  const { sensorData } = useTelemetry();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sweepRef = useRef(0);
  const dataRef = useRef(sensorData);
  useEffect(() => { dataRef.current = sensorData; }, [sensorData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let frame: number;

    const draw = () => {
      const ctx = canvas.getContext('2d')!;
      const W = canvas.width, H = canvas.height;
      const cx = W/2, cy = H/2;
      const R = Math.min(W, H) * 0.42;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0a0f1e';
      ctx.fillRect(0, 0, W, H);

      [0.25, 0.5, 0.75, 1.0].forEach(f => {
        ctx.beginPath();
        ctx.arc(cx, cy, R * f, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,212,255,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = 'rgba(0,212,255,0.5)';
        ctx.font = '10px monospace';
        ctx.fillText(`${(dataRef.current.radar.range * f).toFixed(0)}m`, cx + R*f + 4, cy);
      });

      ctx.strokeStyle = 'rgba(0,212,255,0.15)';
      ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(cx, cy-R); ctx.lineTo(cx, cy+R); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx-R, cy); ctx.lineTo(cx+R, cy); ctx.stroke();
      ctx.setLineDash([]);

      sweepRef.current = (sweepRef.current + 1.2) % 360;
      const sweepRad = (sweepRef.current - 90) * Math.PI / 180;
      const grad = ctx.createLinearGradient(cx, cy,
        cx + Math.cos(sweepRad) * R, cy + Math.sin(sweepRad) * R);
      grad.addColorStop(0, 'rgba(0,255,100,0.6)');
      grad.addColorStop(1, 'rgba(0,255,100,0)');
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, sweepRad - 0.4, sweepRad);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      const targets = dataRef.current.radar.targets ?? [];
      targets.forEach((target: any) => {
        const angle = (target.bearingDeg - 90) * Math.PI / 180;
        const r = (target.rangem / dataRef.current.radar.range) * R;
        const dx = cx + Math.cos(angle) * r;
        const dy = cy + Math.sin(angle) * r;
        const color = target.threat === 'high' || target.threat === 'critical' ? '#ff3b3b' : target.threat === 'medium' ? '#ffb800' : '#00ff9d';

        ctx.beginPath();
        ctx.arc(dx, dy, 6, 0, Math.PI * 2);
        ctx.fillStyle = color + '80';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(dx, dy, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = color;
        ctx.font = '9px monospace';
        ctx.fillText(`${target.rangem.toFixed(0)}m`, dx + 8, dy - 4);
      });

      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#00d4ff';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00d4ff';
      ctx.fill();
      ctx.shadowBlur = 0;

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []); // never restarts

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
};

