import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";

function Sidebar() {

const [sensors, setSensors] = useState({
GNSS:false,
CTD:false,
CURRENTMETER:false,
THRUSTER:false,
OAS:false
});

useEffect(()=>{

const ws = new WebSocket("ws://localhost:5000");

ws.onmessage = (event)=>{

const message = JSON.parse(event.data);

if(message.type === "parent-update"){

const v = message.data;

setSensors({
GNSS: v.latitude !== null && v.latitude !== undefined,
CTD: v.waterTemperature !== null && v.waterTemperature !== undefined,
CURRENTMETER: v.currentSpeed !== null && v.currentSpeed !== undefined,
THRUSTER: v.rpm !== null && v.rpm !== undefined,
OAS: v.forwardDistance !== null && v.forwardDistance !== undefined
});

}

};

return ()=>ws.close();

},[]);

const linkStyle = ({ isActive }) => ({
padding:"12px 16px",
display:"flex",
alignItems:"center",
gap:10,
color:isActive ? "#00eaff" : "#8aa4c8",
textDecoration:"none",
background:isActive ? "rgba(0,180,255,0.08)" : "transparent",
borderRadius:10,
marginBottom:8,
border:isActive
? "1px solid rgba(0,180,255,0.4)"
: "1px solid transparent",
transition:"0.2s"
});

return (

<div className="sidebar">

<div className="sidebar-title">
Marine Telemetry
</div>

<div className="sidebar-section">
SYSTEM STATUS
</div>

<SensorStatus label="GNSS" active={sensors.GNSS}/>
<SensorStatus label="CTD" active={sensors.CTD}/>
<SensorStatus label="Current Meter" active={sensors.CURRENTMETER}/>
<SensorStatus label="Thruster" active={sensors.THRUSTER}/>
<SensorStatus label="OAS" active={sensors.OAS}/>

<div className="sidebar-section">
NAVIGATION
</div>

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
function SensorStatus({ label, active }){

return(

<div className="sensor-row">

<div className={`sensor-led ${active ? "active" : "inactive"}`} />

<span>{label}</span>

</div>

);

}

export default Sidebar;