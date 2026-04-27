import React, { useRef, useEffect } from 'react';

interface Target {
  id: string;
  threat: string;
  relativeAngleInFov: number; // -1 to 1
  distance: number;
}

interface CameraFeedProps {
  sensorId: string;
  label: string;
  imagePath: string;
  targets: Target[];
  isActive?: boolean;
}

export function CameraFeed({ sensorId, label, imagePath, targets, isActive = true }: CameraFeedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = imagePath;
    img.onload = () => {
      // Draw background image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw targets
      targets.forEach(t => {
        // Map relativeAngleInFov (-1 to 1) to x coordinate (0 to width)
        const x = (t.relativeAngleInFov + 1) / 2 * canvas.width;
        // Mock a y-coordinate based on distance (closer = lower on screen)
        const y = canvas.height / 2 + (1000 / t.distance) * 20;
        
        const boxWidth = Math.max(20, 2000 / t.distance);
        const boxHeight = boxWidth * 0.6;

        ctx.strokeStyle = t.threat === 'critical' ? '#ff0000' : t.threat === 'high' ? '#ffaa00' : '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight);

        // Label
        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillText(`${t.id} (${t.distance.toFixed(0)}m)`, x - boxWidth / 2, y - boxHeight / 2 - 5);
      });

      // UI Overlays
      ctx.strokeStyle = 'rgba(0, 217, 255, 0.3)';
      ctx.lineWidth = 1;
      // Crosshair
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - 20, canvas.height / 2);
      ctx.lineTo(canvas.width / 2 + 20, canvas.height / 2);
      ctx.moveTo(canvas.width / 2, canvas.height / 2 - 20);
      ctx.lineTo(canvas.width / 2, canvas.height / 2 + 20);
      ctx.stroke();

      // Corners
      const l = 15;
      ctx.beginPath();
      ctx.moveTo(10, 10+l); ctx.lineTo(10, 10); ctx.lineTo(10+l, 10);
      ctx.moveTo(canvas.width-10-l, 10); ctx.lineTo(canvas.width-10, 10); ctx.lineTo(canvas.width-10, 10+l);
      ctx.moveTo(canvas.width-10, canvas.height-10-l); ctx.lineTo(canvas.width-10, canvas.height-10); ctx.lineTo(canvas.width-10-l, canvas.height-10);
      ctx.moveTo(10+l, canvas.height-10); ctx.lineTo(10, canvas.height-10); ctx.lineTo(10, canvas.height-10-l);
      ctx.stroke();
    };
  }, [imagePath, targets]);

  return (
    <div className="relative group overflow-hidden rounded-xl border border-marine-border bg-black aspect-video shadow-2xl">
      <canvas 
        ref={canvasRef} 
        width={640} 
        height={360} 
        className="w-full h-full object-cover"
      />
      <div className="absolute top-3 left-3 flex items-center gap-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
        <span className="text-[10px] font-black text-white uppercase tracking-widest">{label}</span>
      </div>
    </div>
  );
}
