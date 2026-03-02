import { useMemo } from "react";

function OASRadar({ obstacles = [], heading = 0 }) {

  const radarObjects = useMemo(() => {
    return obstacles.map((obj, i) => {
      const rad = (obj.angle * Math.PI) / 180;
      const r = obj.distance; // percentage 0–40
      const x = 50 + r * Math.cos(rad);
      const y = 50 + r * Math.sin(rad);

      return { ...obj, x, y, id: i };
    });
  }, [obstacles]);

  return (
    <div className="radar-container">
      <div className="radar-circle">

        {/* RANGE RINGS */}
        <div className="radar-ring ring-1" />
        <div className="radar-ring ring-2" />
        <div className="radar-ring ring-3" />

        {/* BEARING MARKS */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="radar-bearing"
            style={{
              transform: `rotate(${i * 30}deg)`
            }}
          >
            <span>{i * 30}</span>
          </div>
        ))}

        {/* SWEEP */}
        <div className="radar-sweep" />

        {/* OBSTACLES */}
        {radarObjects.map(obj => (
          <div
            key={obj.id}
            className={`radar-object ${
              obj.distance < 15 ? "danger" :
              obj.distance < 25 ? "warning" : ""
            }`}
            style={{
              left: `${obj.x}%`,
              top: `${obj.y}%`
            }}
          />
        ))}

      </div>
    </div>
  );
}

export default OASRadar;