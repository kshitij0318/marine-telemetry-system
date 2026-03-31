import React, { useEffect, useRef } from 'react';

interface ArcGaugeProps {
  value: number;
  min: number;
  max: number;
  label: string;
  unit: string;
  size?: number;
  color?: string;
}

export function ArcGauge({ value, min, max, label, unit, size = 200, color = '#00d9ff' }: ArcGaugeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const currentValueRef = useRef<number>(min);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 20;
    const startAngle = 0.75 * Math.PI;
    const endAngle = 2.25 * Math.PI;

    const animate = () => {
      // Smooth animation towards target value
      const diff = value - currentValueRef.current;
      currentValueRef.current += diff * 0.1;

      ctx.clearRect(0, 0, size, size);

      // Background arc
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.lineWidth = 12;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.stroke();

      // Value arc
      const valueAngle = startAngle + ((currentValueRef.current - min) / (max - min)) * (endAngle - startAngle);
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, valueAngle);
      ctx.lineWidth = 12;
      ctx.strokeStyle = color;
      ctx.shadowBlur = 20;
      ctx.shadowColor = color;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Needle
      const needleAngle = valueAngle;
      const needleLength = radius - 10;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(needleAngle) * needleLength,
        centerY + Math.sin(needleAngle) * needleLength
      );
      ctx.lineWidth = 3;
      ctx.strokeStyle = color;
      ctx.stroke();

      // Center circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, 6, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      if (Math.abs(diff) > 0.01) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, min, max, size, color]);

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} width={size} height={size} />
      <div className="mt-2 text-center">
        <div className="text-2xl font-bold text-marine-accent">
          {value.toFixed(1)} {unit}
        </div>
        <div className="text-sm text-marine-text-secondary">{label}</div>
      </div>
    </div>
  );
}
