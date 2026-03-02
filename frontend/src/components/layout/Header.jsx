function Header() {
  const now = new Date();

  return (
    <div
      style={{
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 25px",
        background: "linear-gradient(90deg, #071021, #0c1f35)",
        borderBottom: "1px solid rgba(0,180,255,0.15)"
      }}
    >
      <h3 style={{ color: "#00b4ff" }}>Marine Telemetry Control Center</h3>

      <div style={{ color: "#8aa4c8", fontSize: 14 }}>
        UTC {now.toUTCString()}
      </div>
    </div>
  );
}

export default Header;