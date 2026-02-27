import { NavLink } from "react-router-dom";

function Sidebar() {
  const linkStyle = ({ isActive }) => ({
    padding: "10px 15px",
    display: "block",
    color: "white",
    textDecoration: "none",
    background: isActive ? "#3b82f6" : "transparent",
    borderRadius: 6,
    marginBottom: 8
  });

  return (
    <div style={{ width: 220, padding: 20, background: "#0f172a" }}>
      <h3 style={{ color: "#94a3b8" }}>Navigation</h3>

      <NavLink to="/" style={linkStyle}>
        Fleet Overview
      </NavLink>

      <NavLink to="/gnss" style={linkStyle}>
        GNSS
      </NavLink>

      <NavLink to="/ctd" style={linkStyle}>
        CTD
      </NavLink>

      <NavLink to="/current-meter" style={linkStyle}>
        Current Meter
      </NavLink>

      <NavLink to="/thruster" style={linkStyle}>
        Thruster
      </NavLink>

      <NavLink to="/oas" style={linkStyle}>
        OAS
      </NavLink>
    </div>
  );
}

export default Sidebar;