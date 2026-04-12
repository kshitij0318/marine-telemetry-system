import { useEffect, useState, useRef } from "react";
import VesselMap from "../components/common/VesselMap";

function ParentDashboard() {

const [vessels, setVessels] = useState({});
const [selectedVessel, setSelectedVessel] = useState(null);
const [mapExpanded, setMapExpanded] = useState(false);
const [trail, setTrail] = useState([]);

const selectedRef = useRef(null);

useEffect(()=>{
selectedRef.current = selectedVessel;
},[selectedVessel]);
useEffect(()=>{

fetch("http://localhost:5001/api/parent")
.then(res=>res.json())
.then(data=>{

setVessels(data);

const ids = Object.keys(data);
if(ids.length>0) setSelectedVessel(ids[0]);

});

},[]);
useEffect(()=>{

const ws = new WebSocket("ws://localhost:5001");

ws.onmessage = (event)=>{

const message = JSON.parse(event.data);

if(message.type==="parent-update"){

setVessels(prev=>({
...prev,
[message.vesselId]:message.data
}));

const vessel = message.data;

if(vessel.latitude && vessel.longitude){

setTrail(prev=>{

const newTrail=[...prev,[vessel.latitude,vessel.longitude]];
return newTrail.slice(-60);

});

}

}

};

return ()=>ws.close();

},[]);

const data = vessels[selectedVessel];
if(!data) return null;
const safe=(v,d=2)=>v!==undefined&&v!==null?Number(v).toFixed(d):"--";
const obstacles=[
{
distance:Math.min(100,data.forwardDistance ?? 0),
angle:0,
label:`${data.forwardDistance ?? "--"}m`
},
{
distance:Math.min(100,data.portDistance ?? 0),
angle:270,
label:`${data.portDistance ?? "--"}m`
},
{
distance:Math.min(100,data.starboardDistance ?? 0),
angle:90,
label:`${data.starboardDistance ?? "--"}m`
}
];
return(

<div className="bridge-container">
<div className="bridge-top-grid">

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

<div className="navigation-dial-panel">

<MultiAxisDial
heading={data.heading}
roll={data.roll}
pitch={data.pitch}
yaw={data.yaw}
/>

</div>

<div className="propulsion-panel">

<h3 className="panel-title">Propulsion Control</h3>

<div className="propulsion-visual">

<div className="ship-orientation">

<div className="ship-body"/>

<div
className="ship-heading-line"
style={{transform:`rotate(${data.heading ?? 0}deg)`}}
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

<div className="bridge-bottom-split">


<div className="bottom-panel">

<div
className="bridge-map"
onClick={()=>setMapExpanded(true)}
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

<div className="bottom-panel radar-panel">

<h3>Obstacle Radar</h3>

<SonarRadar obstacles={obstacles}/>

</div>

</div>

{mapExpanded &&(

<div
className="fullscreen-map-container"
onClick={()=>setMapExpanded(false)}
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
function SonarRadar({obstacles}){

const size=320;
const center=size/2;
const maxRadius=140;

return(

<div className="sonar-wrapper">

<svg width={size} height={size}>

<circle cx={center} cy={center} r={140} className="sonar-circle"/>
<circle cx={center} cy={center} r={95} className="sonar-ring"/>
<circle cx={center} cy={center} r={50} className="sonar-ring"/>

<polygon
points={`${center},${center-18} ${center-8},${center+14} ${center+8},${center+14}`}
className="sonar-ship"
/>

<line
x1={center}
y1={center}
x2={center}
y2={center-140}
className="sonar-sweep"
/>

{obstacles.map((o,i)=>{

const angleRad=(o.angle-90)*(Math.PI/180);
const radius=(o.distance/200)*maxRadius;

const x=center+radius*Math.cos(angleRad);
const y=center+radius*Math.sin(angleRad);

const size=Math.max(4,14-(o.distance/10));

return(

<g key={i}>

<circle
cx={x}
cy={y}
r={size}
className="sonar-object"
/>

<text
x={x}
y={y-12}
textAnchor="middle"
className="sonar-label"
>
{o.label}
</text>

</g>

);

})}

</svg>

</div>

);

}
function MultiAxisDial({heading=0,roll,pitch,yaw}){

const safe=(v)=>v!==undefined&&v!==null?Number(v).toFixed(1):"--";

return(

<div className="nav-instrument">

<div className="nav-dial">

{Array.from({length:36}).map((_,i)=>{

const angle=i*10;
const major=angle%30===0;

return(
<div
key={i}
className={`tick ${major?"major":""}`}
style={{transform:`rotate(${angle}deg)`}}
>
{major && <span>{angle}</span>}
</div>
);

})}

<div
className="dial-needle"
style={{transform:`rotate(${heading}deg)`}}
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

<div><span>Roll</span><strong>{safe(roll)}°</strong></div>
<div><span>Pitch</span><strong>{safe(pitch)}°</strong></div>
<div><span>Yaw</span><strong>{safe(yaw)}°</strong></div>

</div>

</div>

);

}
function StatusTile({label,value}){

return(
<div className="status-tile">
<span>{label}</span>
<strong>{value ?? "--"}</strong>
</div>
);

}
function EngineBar({label,value,percentage}){

return(

<div className="engine-gauge">

<div className="engine-track">

<div
className="engine-fill"
style={{height:`${percentage}%`}}
/>

</div>

<div className="engine-label">

<div className="engine-name">{label}</div>
<div className="engine-value">{value}</div>

</div>

</div>

);

}

export default ParentDashboard;