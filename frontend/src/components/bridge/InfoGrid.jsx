function InfoGrid({ data }) {
  return (
    <div className="info-grid">
      {Object.entries(data).map(([label, value]) => (
        <div key={label} className="info-block">
          <div className="info-label">{label}</div>
          <div className="info-value">{value ?? "--"}</div>
        </div>
      ))}
    </div>
  );
}

export default InfoGrid;