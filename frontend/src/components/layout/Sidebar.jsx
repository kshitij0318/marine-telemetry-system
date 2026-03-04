import { NavLink } from "react-router-dom";

function Sidebar() {

  const linkStyle = ({ isActive }) => ({
    padding: "12px 16px",
    display: "block",
    color: isActive ? "#00b4ff" : "#8aa4c8",
    textDecoration: "none",
    background: isActive ? "rgba(0,180,255,0.08)" : "transparent",
    borderRadius: 10,
    marginBottom: 10,
    border: isActive
      ? "1px solid rgba(0,180,255,0.4)"
      : "1px solid transparent",
    transition: "0.2s"
  });

  return (
    <div
      style={{
        width: 240,
        padding: 25,
        background: "#071021",
        borderRight: "1px solid rgba(0,180,255,0.1)"
      }}
    >
      <h3 style={{ color: "#00b4ff", marginBottom: 20 }}>
        Navigation
      </h3>

      <NavLink to="/" end style={linkStyle}>
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