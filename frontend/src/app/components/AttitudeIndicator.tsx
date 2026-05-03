import React from 'react';

interface AttitudeIndicatorProps {
  pitch: number;
  roll: number;
  yaw?: number; // Optional, can be used for a heading ribbon if needed
  size?: number;
}

export function AttitudeIndicator({ pitch, roll, yaw, size = 160 }: AttitudeIndicatorProps) {
  // Clamp values for display limits
  const displayPitch = Math.max(-45, Math.min(45, pitch));
  
  // Scale factor: how many pixels per degree of pitch
  // Let's say 45 degrees covers half the gauge radius
  const pitchScale = (size / 2) / 45; 
  const yOffset = displayPitch * pitchScale;

  return (
    <div 
      className="relative rounded-full overflow-hidden border-4 border-marine-dark shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]"
      style={{ width: size, height: size, backgroundColor: '#1a3a5c' /* Deep sea blue fallback */ }}
    >
      {/* ── Rotating / Translating Drum (Sky/Sea) ── */}
      <div 
        className="absolute inset-[-50%] transition-transform duration-100 ease-linear"
        style={{ 
          transform: `rotate(${roll}deg) translateY(${yOffset}px)`
        }}
      >
        {/* Sky */}
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-[#2a5a8c] to-[#4080bf]" />
        
        {/* Horizon Line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] z-10" />
        
        {/* Sea (Ground) */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[#061a2a] to-[#0a2a44]" />

        {/* Pitch Ladder */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-full flex flex-col items-center justify-center pointer-events-none">
          {[-40, -30, -20, -10, 10, 20, 30, 40].map(deg => {
            const isMajor = Math.abs(deg) % 20 === 0;
            const width = isMajor ? '40%' : '20%';
            const yPos = `calc(50% - ${deg * pitchScale}px)`;
            return (
              <div 
                key={deg} 
                className="absolute flex items-center justify-between"
                style={{ top: yPos, width, left: `calc(50% - ${width}/2)` }}
              >
                <div className="w-full h-[1px] bg-white/70 shadow-sm" />
                {isMajor && (
                  <>
                    <span className="absolute -left-5 text-[8px] font-mono text-white/90 font-bold">{Math.abs(deg)}</span>
                    <span className="absolute -right-5 text-[8px] font-mono text-white/90 font-bold">{Math.abs(deg)}</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Fixed Overlay ── */}
      
      {/* Bank Angle Ticks (Top Arc) */}
      <div className="absolute inset-0 pointer-events-none">
        {[-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60].map(deg => {
          const isZero = deg === 0;
          return (
            <div 
              key={`bank-${deg}`}
              className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2"
              style={{ transform: `rotate(${deg}deg)` }}
            >
              <div className={`w-[2px] bg-white ${isZero ? 'h-3' : 'h-2'} mt-1`} />
            </div>
          );
        })}
      </div>

      {/* Fixed Central Reticle (Vessel Symbol) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1 flex items-center justify-between pointer-events-none z-20">
        <div className="w-[35%] h-[2px] bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,1)]" />
        <div className="w-[10%] h-[2px] bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,1)] rounded-full relative">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-500" />
        </div>
        <div className="w-[35%] h-[2px] bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,1)]" />
      </div>

      {/* Glossy Glass Reflection */}
      <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-white/10 to-transparent rounded-t-full pointer-events-none" />
    </div>
  );
}
