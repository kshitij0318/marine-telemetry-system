import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface Detection {
  distance: number;
  angle: number;
  threat: 'low' | 'medium' | 'high' | 'critical';
}

interface RadarDisplayProps {
  detections?: Detection[];
  targets?: any[];
  range: number;
  size?: number;
  rotationAngle?: number;
}

export const RadarDisplay: React.FC<RadarDisplayProps> = ({ 
  detections = [], 
  targets = [],
  range, 
  size = 300,
  rotationAngle = 0
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  
  const dataRef = useRef({ detections, targets, range, size, theme, rotationAngle });
  
  useEffect(() => {
    dataRef.current = { detections, targets, range, size, theme, rotationAngle };
  }, [detections, targets, range, size, theme, rotationAngle]);
  
  const getThemeColors = (currentTheme: string) => {
    switch (currentTheme) {
      case 'tactical':
        return {
          bg: '#0a0a0a',
          grid: '#1a3d1a',
          sweep: '#00ff41',
          threatLow: '#00ff41',
          threatMedium: '#ffff00',
          threatHigh: '#ff0000',
          threatCritical: '#ff00ff',
        };
      case 'light':
        return {
          bg: '#f5f7fa',
          grid: '#e0e6ed',
          sweep: '#0066cc',
          threatLow: '#22c55e',
          threatMedium: '#f59e0b',
          threatHigh: '#ef4444',
          threatCritical: '#b91c1c',
        };
      case 'marine-dark':
      default:
        return {
          bg: '#0a1628',
          grid: '#1a2d47',
          sweep: '#00d9ff',
          threatLow: '#4ade80',
          threatMedium: '#fbbf24',
          threatHigh: '#f87171',
          threatCritical: '#ef4444',
        };
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    // Internal sweep state for the visual effect
    let internalSweepAngle = 0;

    const drawRadar = () => {
      const { detections, targets, range, size, theme: currentTheme } = dataRef.current;
      const colors = getThemeColors(currentTheme);
      const center = size / 2;
      const radius = size / 2 - 20;

      ctx.clearRect(0, 0, size, size);

      // Draw background
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.fillStyle = colors.bg;
      ctx.fill();

      // Draw Grid Rings
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(center, center, radius * (i / 4), 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw Crosshairs
      ctx.beginPath();
      ctx.moveTo(center, center - radius);
      ctx.lineTo(center, center + radius);
      ctx.moveTo(center - radius, center);
      ctx.lineTo(center + radius, center);
      ctx.stroke();

      // Combine detections and targets for rendering
      const targetMap = new Map();
      
      (detections || []).forEach(d => {
        if (d.distance !== undefined && d.angle !== undefined) {
          targetMap.set(d.id || Math.random(), { dist: d.distance, angle: d.angle, threat: d.threat });
        }
      });
      
      (targets || []).forEach(t => {
        if (t.id) {
          targetMap.set(t.id, { dist: t.rangem ?? t.distance, angle: t.bearingDeg ?? t.angle, threat: t.threat });
        }
      });

      const renderList = Array.from(targetMap.values());

      renderList.forEach(obj => {
        const dRadius = (obj.dist / range) * radius;
        // North is 0, degrees increase clockwise. 
        // Math.cos/sin starts at East (3 o'clock), so subtract 90 deg.
        const dAngle = (obj.angle - 90) * (Math.PI / 180);

        const x = center + dRadius * Math.cos(dAngle);
        const y = center + dRadius * Math.sin(dAngle);

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        
        switch (obj.threat) {
          case 'critical': ctx.fillStyle = colors.threatCritical; break;
          case 'high': ctx.fillStyle = colors.threatHigh; break;
          case 'medium': ctx.fillStyle = colors.threatMedium; break;
          default: ctx.fillStyle = colors.threatLow;
        }
        
        ctx.fill();
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw Sweep
      ctx.save();
      ctx.translate(center, center);
      
      ctx.rotate(internalSweepAngle);
      
      const gradient = ctx.createConicGradient(0, 0, 0);
      gradient.addColorStop(0, `${colors.sweep}00`);
      gradient.addColorStop(0.1, `${colors.sweep}80`);
      gradient.addColorStop(0.1, 'transparent');
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw sweeping line
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(radius, 0);
      ctx.strokeStyle = colors.sweep;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();

      // Update sweep angle with smoothing
      internalSweepAngle += 0.02;

      animationFrameId = requestAnimationFrame(drawRadar);
    };

    drawRadar();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div style={{ width: size, height: size, flexShrink: 0 }} className="relative mx-auto">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="rounded-full shadow-2xl border-4"
        style={{
          display: 'block',
          width: size,
          height: size,
          borderColor: getThemeColors(theme).grid,
          backgroundColor: getThemeColors(theme).bg,
        }}
      />
      {/* Center Vessel Icon */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-4 h-6 border-2 border-marine-accent rounded-sm relative">
           <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 border-t-2 border-l-2 border-marine-accent rotate-45" />
        </div>
      </div>
    </div>
  );
};
