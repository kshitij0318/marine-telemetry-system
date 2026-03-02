function EngineColumns({ rpm = 0, thrust = 0 }) {
  return (
    <div className="engine-wrapper">
      <div className="engine-column">
        <div
          className="engine-fill"
          style={{ height: `${Math.min(100, rpm / 20)}%` }}
        />
        <div className="engine-label">RPM</div>
        <div className="engine-value">{rpm}</div>
      </div>

      <div className="engine-column">
        <div
          className="engine-fill"
          style={{ height: `${thrust}%` }}
        />
        <div className="engine-label">Thrust %</div>
        <div className="engine-value">{thrust}</div>
      </div>
    </div>
  );
}

export default EngineColumns;