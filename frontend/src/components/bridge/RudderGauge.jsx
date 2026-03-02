function RudderGauge({ angle = 0 }) {
  const rotation = Math.max(-35, Math.min(35, angle));

  return (
    <div className="rudder-wrapper">
      <div className="rudder-arc">
        <div
          className="rudder-needle"
          style={{ transform: `rotate(${rotation}deg)` }}
        />
      </div>
      <div className="rudder-value">
        {angle?.toFixed(1) || 0}°
      </div>
    </div>
  );
}

export default RudderGauge;