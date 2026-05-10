import React from 'react';

export interface FinControlDisplayProps {
  fins: { fore: number; aft: number; port: number; stbd: number };
  vesselHeading: number;
}

export function FinControlDisplay({ fins, vesselHeading }: FinControlDisplayProps) {
  const getFinColor  = (a: number) => Math.abs(a) > 20 ? '#ffb800' : Math.abs(a) > 2 ? '#00d4ff' : '#475569';
  const getFinFill   = (a: number) => Math.abs(a) > 20 ? '#ffb80022' : Math.abs(a) > 2 ? '#00d4ff22' : '#0d1428';
  const getFinStroke = getFinColor;

  return (
    <div className="w-full flex flex-col items-center">
      <svg viewBox="0 0 400 400" className="w-full max-w-xs mx-auto">
        {/* FORE fin */}
        <g transform={`translate(200, 110) rotate(${fins.fore})`}>
          <rect x="-20" y="-4" width="40" height="8" rx="2"
            fill={getFinFill(fins.fore)} stroke={getFinStroke(fins.fore)} strokeWidth="1.5"/>
        </g>
        <text x="240" y="114" fontSize="9" fill={getFinColor(fins.fore)} fontFamily="monospace">
          {fins.fore >= 0 ? '+' : ''}{fins.fore.toFixed(1)}°
        </text>

        {/* AFT fin */}
        <g transform={`translate(200, 290) rotate(${fins.aft})`}>
          <rect x="-20" y="-4" width="40" height="8" rx="2"
            fill={getFinFill(fins.aft)} stroke={getFinStroke(fins.aft)} strokeWidth="1.5"/>
        </g>
        <text x="240" y="294" fontSize="9" fill={getFinColor(fins.aft)} fontFamily="monospace">
          {fins.aft >= 0 ? '+' : ''}{fins.aft.toFixed(1)}°
        </text>

        {/* PORT fin */}
        <g transform={`translate(158, 200) rotate(${fins.port})`}>
          <rect x="-4" y="-20" width="8" height="40" rx="2"
            fill={getFinFill(fins.port)} stroke={getFinStroke(fins.port)} strokeWidth="1.5"/>
        </g>
        <text x="138" y="174" fontSize="9" fill={getFinColor(fins.port)} fontFamily="monospace" textAnchor="end">
          {fins.port >= 0 ? '+' : ''}{fins.port.toFixed(1)}°
        </text>

        {/* STBD fin */}
        <g transform={`translate(242, 200) rotate(${fins.stbd})`}>
          <rect x="-4" y="-20" width="8" height="40" rx="2"
            fill={getFinFill(fins.stbd)} stroke={getFinStroke(fins.stbd)} strokeWidth="1.5"/>
        </g>
        <text x="262" y="174" fontSize="9" fill={getFinColor(fins.stbd)} fontFamily="monospace" textAnchor="start">
          {fins.stbd >= 0 ? '+' : ''}{fins.stbd.toFixed(1)}°
        </text>

        {/* Vessel body */}
        <ellipse cx="200" cy="200" rx="40" ry="90" fill="#0d1428" stroke="#1e3a5f" strokeWidth="2"/>
        <rect x="188" y="168" width="24" height="32" rx="4" fill="#111827" stroke="#1e3a5f" strokeWidth="1.5"/>
        <circle cx="200" cy="295" r="12" fill="none" stroke="#00d4ff" strokeWidth="2"/>

        {/* Direction arrow on vessel */}
        <polygon points="200,120 195,138 200,133 205,138" fill="#00d4ff" opacity="0.8"/>

        {/* Cardinal direction labels */}
        <text x="197" y="90" fontSize="10" fill="#94a3b8" fontFamily="monospace" textAnchor="middle">BOW</text>
        <text x="197" y="322" fontSize="10" fill="#94a3b8" fontFamily="monospace" textAnchor="middle">STERN</text>
        <text x="130" y="204" fontSize="9" fill="#94a3b8" fontFamily="monospace" textAnchor="middle">PORT</text>
        <text x="270" y="204" fontSize="9" fill="#94a3b8" fontFamily="monospace" textAnchor="middle">STBD</text>
      </svg>

      <div className="grid grid-cols-2 gap-2 mt-3 w-full">
        {[
          { label: 'FORE',  value: fins.fore  },
          { label: 'AFT',   value: fins.aft   },
          { label: 'PORT',  value: fins.port  },
          { label: 'STBD',  value: fins.stbd  },
        ].map(f => (
          <div key={f.label} className="bg-marine-dark border border-marine-border rounded p-2 text-center">
            <div className="text-[9px] uppercase font-mono text-marine-text-secondary">{f.label}</div>
            <div className={`text-sm font-bold font-mono ${Math.abs(f.value) > 20 ? 'text-amber-400' : Math.abs(f.value) > 2 ? 'text-marine-accent' : 'text-marine-text-secondary'}`}>
              {f.value >= 0 ? '+' : ''}{f.value.toFixed(1)}°
            </div>
            {/* Simple deflection bar */}
            <div className="relative h-1.5 bg-marine-border rounded-full mt-1 mx-1">
              <div className="absolute top-0 h-full rounded-full transition-all"
                style={{
                  width: `${Math.abs(f.value) / 30 * 50}%`,
                  left: f.value >= 0 ? '50%' : `${50 - Math.abs(f.value)/30*50}%`,
                  backgroundColor: Math.abs(f.value) > 20 ? '#ffb800' : '#00d4ff',
                }} />
              <div className="absolute top-0 left-1/2 h-full w-px bg-marine-text-secondary/30" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
