import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface Detection {
  distance: number;
  angle: number;
  threat: 'low' | 'medium' | 'high';
}

interface RadarDisplayProps {
  detections: Detection[];
  range: number;
  size?: number;
}

export const RadarDisplay: React.FC<RadarDisplayProps> = ({ 
  detections, 
  range, 
  size = 300 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  
  const getThemeColors = () => {
    switch (theme) {
      case 'tactical':
        return {
          bg: '#0a0a0a',
          grid: '#1a3d1a',
          sweep: '#00ff41',
          threatLow: '#00ff41',
          threatMedium: '#ffff00',
          threatHigh: '#ff0000',
        };
      case 'light':
        return {
          bg: '#f5f7fa',
          grid: '#e0e6ed',
          sweep: '#0066cc',
          threatLow: '#22c55e',
          threatMedium: '#f59e0b',
          threatHigh: '#ef4444',
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
        };
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let sweepAngle = 0;
    const colors = getThemeColors();
    const center = size / 2;
    const radius = size / 2 - 20; // 20px padding

    const drawRadar = () => {
      // Clear canvas
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

      // Draw Detections
      detections.forEach(detection => {
        // Convert distance to pixel radius (scale 0-range to 0-radius)
        const dRadius = (detection.distance / range) * radius;
        // Adjust angle so 0 is North (top) and degrees increase clockwise
        const dAngle = (detection.angle - 90) * (Math.PI / 180);

        const x = center + dRadius * Math.cos(dAngle);
        const y = center + dRadius * Math.sin(dAngle);

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        
        switch (detection.threat) {
          case 'high':
            ctx.fillStyle = colors.threatHigh;
            break;
          case 'medium':
            ctx.fillStyle = colors.threatMedium;
            break;
          case 'low':
          default:
            ctx.fillStyle = colors.threatLow;
        }
        
        ctx.fill();
        
        // Add a glow effect
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      });

      // Draw Sweep
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(sweepAngle);
      
      const gradient = ctx.createConicGradient(0, 0, 0);
      gradient.addColorStop(0, `${colors.sweep}00`); // transparent
      gradient.addColorStop(0.1, `${colors.sweep}80`); // semi-transparent
      gradient.addColorStop(0.1, 'transparent'); // sharp cut-off
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

      // Update sweep angle
      sweepAngle += 0.02;

      animationFrameId = requestAnimationFrame(drawRadar);
    };

    drawRadar();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [detections, range, size, theme]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-full overflow-hidden shadow-lg border-2"
      style={{
        borderColor: getThemeColors().grid,
        backgroundColor: getThemeColors().bg
      }}
    />
  );
};
