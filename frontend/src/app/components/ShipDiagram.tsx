import React from 'react';
import { OAS_SENSORS, OASSensorPosition } from '../../types/oasSensors';

interface ShipDiagramProps {
  selectedCamera: OASSensorPosition | null;
  onSelectCamera: (position: OASSensorPosition) => void;
  threatsByPosition: Record<OASSensorPosition, string>; // 'low' | 'medium' | 'high' | 'critical'
}

export function ShipDiagram({ selectedCamera, onSelectCamera, threatsByPosition }: ShipDiagramProps) {
  const getCameraColor = (position: OASSensorPosition) => {
    if (selectedCamera === position) return '#00d9ff';
    const threat = threatsByPosition[position];
    if (threat === 'critical' || threat === 'high') return '#f87171'; // red
    if (threat === 'medium') return '#fbbf24'; // yellow
    return '#4ade80'; // green
  };

  const getFovFill = (position: OASSensorPosition) => {
    if (selectedCamera === position) return 'rgba(0, 217, 255, 0.2)';
    const threat = threatsByPosition[position];
    if (threat === 'critical' || threat === 'high') return 'rgba(248, 113, 113, 0.2)';
    if (threat === 'medium') return 'rgba(251, 191, 36, 0.2)';
    return 'rgba(74, 222, 128, 0.05)';
  };

  const drawFovArc = (centerAngle: number, fov: number, radius: number = 80) => {
    const startAngle = (centerAngle - fov / 2 - 90) * Math.PI / 180;
    const endAngle = (centerAngle + fov / 2 - 90) * Math.PI / 180;

    const startX = 100 + Math.cos(startAngle) * radius;
    const startY = 100 + Math.sin(startAngle) * radius;
    const endX = 100 + Math.cos(endAngle) * radius;
    const endY = 100 + Math.sin(endAngle) * radius;

    return `M 100 100 L ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY} Z`;
  };

  const getButtonPosition = (centerAngle: number, distance: number = 20) => {
    const angle = (centerAngle - 90) * Math.PI / 180;
    return {
      x: 100 + Math.cos(angle) * distance,
      y: 100 + Math.sin(angle) * distance
    };
  };

  return (
    <div className="relative w-full aspect-square max-w-[300px] mx-auto select-none">
      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xl">
        {/* Render FOV Cones First */}
        {Object.values(OAS_SENSORS).map((sensor) => (
          <path
            key={`fov-${sensor.position}`}
            d={drawFovArc(sensor.centerAngle, sensor.fov, 95)}
            fill={getFovFill(sensor.position)}
            className="transition-colors duration-300 cursor-pointer"
            onClick={() => onSelectCamera(sensor.position)}
          />
        ))}

        {/* Ship Hull (Top-Down Outline) */}
        <path
          d="M 100 20 C 120 20 130 50 130 100 C 130 160 125 180 100 180 C 75 180 70 160 70 100 C 70 50 80 20 100 20 Z"
          fill="#0a1628"
          stroke="#1a2d47"
          strokeWidth="3"
        />

        {/* Deck details */}
        <rect x="85" y="70" width="30" height="40" rx="4" fill="#0f1e33" stroke="#1a2d47" />

        {/* Cameras */}
        {Object.values(OAS_SENSORS).map((sensor) => {
          let r = 30; // approx distance from center
          if (sensor.position === 'bow') r = 80;
          else if (sensor.position === 'stern') r = 80;
          else if (sensor.position.includes('bow')) r = 60;
          else if (sensor.position.includes('quarter')) r = 60;

          const pos = getButtonPosition(sensor.centerAngle, r);
          const isSelected = selectedCamera === sensor.position;

          return (
            <g
              key={sensor.position}
              className="cursor-pointer group"
              onClick={() => onSelectCamera(sensor.position)}
            >
              {isSelected && (
                <circle cx={pos.x} cy={pos.y} r="12" fill={getCameraColor(sensor.position)} opacity="0.3" className="animate-ping" />
              )}
              <circle
                cx={pos.x}
                cy={pos.y}
                r="6"
                fill="#0f1e33"
                stroke={getCameraColor(sensor.position)}
                strokeWidth={isSelected ? "3" : "2"}
                className="transition-all duration-300 group-hover:scale-125"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
