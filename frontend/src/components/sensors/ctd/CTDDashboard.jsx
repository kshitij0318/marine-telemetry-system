import {
Chart as ChartJS,
LineElement,
CategoryScale,
LinearScale,
PointElement,
Legend,
Tooltip,
ArcElement
} from "chart.js";

import { Line, Doughnut, Scatter } from "react-chartjs-2";
import { useEffect, useState } from "react";

ChartJS.register(
LineElement,
CategoryScale,
LinearScale,
PointElement,
Legend,
Tooltip,
ArcElement
);

function CTDDashboard(){

const [data,setData] = useState([]);

useEffect(()=>{

const ws = new WebSocket("ws://localhost:5000");

ws.onmessage = (event)=>{

const message = JSON.parse(event.data);

if(message.type==="parent-update"){

const vessel = message.data;

setData(prev=>[...prev.slice(-60),vessel]);

}

};

return ()=>ws.close();

},[]);

const latest = data[data.length-1];

if(!latest){
return <div style={{padding:30}}>Waiting for CTD data...</div>;
}
const labels = data.map(d =>
new Date(d.lastUpdated).toLocaleTimeString()
);

const buildChart = (datasets)=>({
labels,
datasets
});
const depthProfileData = {

datasets:[

{
label:"Temperature",
data:data.map(d=>({x:d.waterTemperature,y:d.depth})),
borderColor:"#ef4444",
backgroundColor:"#ef4444"
},

{
label:"Salinity",
data:data.map(d=>({x:d.salinity,y:d.depth})),
borderColor:"#10b981",
backgroundColor:"#10b981"
}

]

};
const GaugeCard = ({label,value,min,max,unit,color})=>{

const normalized = Math.min(
Math.max((value-min)/(max-min),0),
1
);

const gaugeData={
datasets:[
{
data:[normalized,1-normalized],
backgroundColor:[color,"#1e293b"],
borderWidth:0,
circumference:180,
rotation:270
}
]
};

return(

<div className="ctd-gauge-card">

<Doughnut
data={gaugeData}
options={{
cutout:"75%",
plugins:{
legend:{display:false},
tooltip:{enabled:false}
}
}}
/>

<div className="ctd-gauge-value">
{value?.toFixed(2)} {unit}
</div>

<div className="ctd-gauge-label">
{label}
</div>

</div>

);

};

return(

<div className="ctd-container">

<h2 className="ctd-title">CTD Telemetry</h2>
<div className="ctd-gauge-grid">

<GaugeCard
label="Depth"
value={latest.depth}
min={0}
max={500}
unit="m"
color="#3b82f6"
/>

<GaugeCard
label="Temperature"
value={latest.waterTemperature}
min={0}
max={40}
unit="°C"
color="#ef4444"
/>

<GaugeCard
label="Salinity"
value={latest.salinity}
min={20}
max={40}
unit="PSU"
color="#10b981"
/>

<GaugeCard
label="Sound Velocity"
value={latest.soundVelocity}
min={1400}
max={1600}
unit="m/s"
color="#f59e0b"
/>

</div>
<div className="ctd-chart-grid">

<div className="ctd-chart-panel">

<h3>Physical Parameters</h3>

<Line
data={buildChart([
{label:"Depth",data:data.map(d=>d.depth),borderColor:"#3b82f6"},
{label:"Pressure",data:data.map(d=>d.pressure),borderColor:"#f97316"},
{label:"Altimeter",data:data.map(d=>d.altimeter),borderColor:"#94a3b8"}
])}
options={{
maintainAspectRatio:false,
plugins:{legend:{labels:{color:"#9dc7e0"}}},
scales:{
y:{reverse:true,ticks:{color:"#8aa4c8"}},
x:{ticks:{color:"#8aa4c8"}}
}
}}
/>

</div>

<div className="ctd-chart-panel">

<h3>Water Properties</h3>

<Line
data={buildChart([
{label:"Temperature",data:data.map(d=>d.waterTemperature),borderColor:"#ef4444"},
{label:"Salinity",data:data.map(d=>d.salinity),borderColor:"#10b981"},
{label:"Conductivity",data:data.map(d=>d.conductivity),borderColor:"#6366f1"}
])}
options={{
maintainAspectRatio:false,
plugins:{legend:{labels:{color:"#9dc7e0"}}},
scales:{
y:{min:20,max:40,ticks:{color:"#8aa4c8"}},
x:{ticks:{color:"#8aa4c8"}}
}
}}
/>

</div>

</div>
<div className="ctd-chart-grid">

<div className="ctd-chart-panel">

<h3>Ocean Depth Profile</h3>

<Scatter
data={depthProfileData}
options={{
maintainAspectRatio:false,
plugins:{legend:{labels:{color:"#9dc7e0"}}},
scales:{
y:{
reverse:true,
title:{display:true,text:"Depth (m)"},
ticks:{color:"#8aa4c8"}
},
x:{
title:{display:true,text:"Temperature / Salinity"},
ticks:{color:"#8aa4c8"}
}
}
}}
/>

</div>

<div className="ctd-chart-panel">

<h3>Current Snapshot</h3>

<div className="ctd-snapshot">

<div>Depth: <strong>{latest.depth?.toFixed(2)} m</strong></div>
<div>Temperature: <strong>{latest.waterTemperature?.toFixed(2)} °C</strong></div>
<div>Salinity: <strong>{latest.salinity?.toFixed(2)} PSU</strong></div>
<div>Sound Velocity: <strong>{latest.soundVelocity?.toFixed(2)} m/s</strong></div>
<div>Water Density: <strong>{latest.waterDensity?.toFixed(2)}</strong></div>

</div>

</div>

</div>

</div>

);

}

export default CTDDashboard;