import { useEffect, useState, useRef } from "react";
import VesselMap from "../components/common/VesselMap";
import OASRadar from "../components/bridge/OASRadar";

function ParentDashboard() {

const [vessels, setVessels] = useState({});
const [selectedVessel, setSelectedVessel] = useState(null);
const [mapExpanded, setMapExpanded] = useState(false);

/* AIS Trail */
const [trail, setTrail] = useState([]);

const selectedRef = useRef(null);

useEffect(() => {
selectedRef.current = selectedVessel;
}, [selectedVessel]);

/* ===============================
INITIAL FETCH
================================ */

useEffect(() => {

fetch("http://localhost:5000/api/parent")
.then(res => res.json())
.then(data => {

setVessels(data);

const ids = Object.keys(data);

if (ids.length > 0) setSelectedVessel(ids[0]);

});

}, []);

/* ===============================
WEBSOCKET LIVE DATA
================================ */

useEffect(() => {

const ws = new WebSocket("ws://localhost:5000");

ws.onmessage = (event) => {

const message = JSON.parse(event.data);

if (message.type === "parent-update") {

setVessels(prev => ({
...prev,
[message.vesselId]: message.data
}));

const vessel = message.data;

if (vessel.latitude && vessel.longitude) {

setTrail(prev => {

const newTrail = [
...prev,
[vessel.latitude, vessel.longitude]
];

return newTrail.slice(-60);

});

}

}

};

return () => ws.close();

}, []);

/* ===============================
DATA
================================ */

const data = vessels[selectedVessel];
if (!data) return null;

/* ===============================
SAFE FORMATTERS
================================ */

const safe = (v, digits = 2) =>
v !== undefined && v !== null ? Number(v).toFixed(digits) : "--";

/* ===============================
RADAR OBSTACLE CALCULATION
================================ */

const obstacles = [
{
distance: Math.min(40, ((data.forwardDistance ?? 0) / 5)),
angle: 0
},
{
distance: Math.min(40, ((data.portDistance ?? 0) / 5)),
angle: 270
},
{
distance: Math.min(40, ((data.starboardDistance ?? 0) / 5)),
angle: 90
}
];

/* ===============================
UI
================================ */

return (

<div className="bridge-container">

{/* TOP SECTION */}

<div className="bridge-top-grid">

{/* VEHICLE STATUS PANEL */}

<div className="vehicle-status-panel">

<h3 className="panel-title">Vehicle Status</h3>

<div className="status-grid">

<StatusTile label="Latitude" value={safe(data.latitude,5)} />
<StatusTile label="Longitude" value={safe(data.longitude,5)} />

<StatusTile label="Speed" value={`${safe(data.speed)} kn`} />
<StatusTile label="Depth" value={`${safe(data.depth)} m`} />

<StatusTile label="Current Speed" value={`${safe(data.currentSpeed)} m/s`} />
<StatusTile label="Current Dir" value={`${safe(data.currentDirection,1)}°`} />

<StatusTile label="Water Temp" value={`${safe(data.waterTemperature)} °C`} />
<StatusTile label="Salinity" value={`${safe(data.salinity)} PSU`} />

</div>

<div className={`risk-badge ${data.riskLevel?.toLowerCase()}`}>
{data.riskLevel}
</div>

</div>

{/* NAVIGATION DIAL */}

<div className="navigation-dial-panel">

<MultiAxisDial
heading={data.heading}
roll={data.roll}
pitch={data.pitch}
yaw={data.yaw}
/>

</div>

{/* PROPULSION */}

<div className="propulsion-panel">

<h3 className="panel-title">Propulsion Control</h3>

<div className="propulsion-visual">

<div className="ship-orientation">

<div className="ship-body" />

<div
className="ship-heading-line"
style={{ transform: `rotate(${data.heading ?? 0}deg)` }}
/>

</div>

</div>

<div className="propulsion-gauges">

<EngineBar
label="RPM"
value={`${safe(data.rpm)} rpm`}
percentage={Math.min(100,(data.rpm ?? 0)/40)}
/>

<EngineBar
label="Thrust"
value={`${data.thrustPower ?? 0}%`}
percentage={data.thrustPower ?? 0}
/>

</div>

<div className="propulsion-metrics">

<div className="propulsion-metric">
<span>Engine Status</span>
<strong>{data.thrusterStatus || "Active"}</strong>
</div>

<div className="propulsion-metric">
<span>Temperature</span>
<strong>{safe(data.thrusterTemperature)} °C</strong>
</div>

</div>

</div>

</div>

{/* BOTTOM SECTION */}

<div className="bridge-bottom-split">

{/* MAP PANEL */}

<div className="bottom-panel">

<div
className="bridge-map"
onClick={() => setMapExpanded(true)}
>

<VesselMap
latitude={data.latitude}
longitude={data.longitude}
heading={data.heading}
speed={data.speed}
depth={data.depth}
trail={trail}
height={350}
/>

</div>

</div>

{/* RADAR PANEL */}

<div className="bottom-panel radar-panel">

<h3>Obstacle Radar</h3>

<OASRadar
heading={data.heading}
obstacles={obstacles}
/>

</div>

</div>

{/* FULLSCREEN MAP */}

{mapExpanded && (

<div
className="fullscreen-map-container"
onClick={() => setMapExpanded(false)}
>

<div
className="fullscreen-map"
onClick={(e)=>e.stopPropagation()}
>

<VesselMap
latitude={data.latitude}
longitude={data.longitude}
heading={data.heading}
speed={data.speed}
depth={data.depth}
trail={trail}
height="100%"
/>

</div>

<div className="fullscreen-close">✕</div>

</div>

)}

</div>

);

}

/* ===============================
NAVIGATION DIAL
================================ */

function MultiAxisDial({ heading = 0, roll, pitch, yaw }) {

const safe = (v)=>v!==undefined&&v!==null?Number(v).toFixed(1):"--";

return (

<div className="nav-instrument">

<div className="nav-dial">

{Array.from({ length: 36 }).map((_, i) => {

const angle = i * 10;
const major = angle % 30 === 0;

return (
<div
key={i}
className={`tick ${major ? "major" : ""}`}
style={{ transform: `rotate(${angle}deg)` }}
>
{major && <span>{angle}</span>}
</div>
);

})}

<div
className="dial-needle"
style={{ transform: `rotate(${heading}deg)` }}
/>

<div className="dial-center">

<div className="dial-heading-value">
{safe(heading)}°
</div>

<div className="dial-heading-label">
Heading
</div>

</div>

</div>

<div className="nav-telemetry">

<div>
<span>Roll</span>
<strong>{safe(roll)}°</strong>
</div>

<div>
<span>Pitch</span>
<strong>{safe(pitch)}°</strong>
</div>

<div>
<span>Yaw</span>
<strong>{safe(yaw)}°</strong>
</div>

</div>

</div>

);

}

/* ===============================
STATUS TILE
================================ */

function StatusTile({ label, value }) {

return (
<div className="status-tile">
<span>{label}</span>
<strong>{value ?? "--"}</strong>
</div>
);

}

/* ===============================
ENGINE GAUGE
================================ */

function EngineBar({ label, value, percentage }) {

return (

<div className="engine-gauge">

<div className="engine-track">

<div
className="engine-fill"
style={{ height: `${percentage}%` }}
/>

</div>

<div className="engine-label">

<div className="engine-name">
{label}
</div>

<div className="engine-value">
{value}
</div>

</div>

</div>

);

}

export default ParentDashboard;