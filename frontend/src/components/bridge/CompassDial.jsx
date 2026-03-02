import { useMemo } from "react";

function CompassDial({ heading = 0 }) {
  const rotation = useMemo(() => heading || 0, [heading]);

  return (
    <div className="compass-wrapper">
      <div className="compass-dial">
        <div
          className="compass-rotating"
          style={{ transform: `rotate(-${rotation}deg)` }}
        >
          {Array.from({ length: 36 }).map((_, i) => (
            <div
              key={i}
              className="compass-tick"
              style={{ transform: `rotate(${i * 10}deg)` }}
            />
          ))}
        </div>

        <div
          className="compass-ship"
          style={{ transform: `rotate(${rotation}deg)` }}
        />
      </div>

      <div className="compass-heading">
        {heading?.toFixed(1) || "--"}°
      </div>
    </div>
  );
}

export default CompassDial;