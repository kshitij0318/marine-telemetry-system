import { useMemo } from "react";

function OASRadar({ obstacles = [], heading = 0 }) {

const radarObjects = useMemo(() => {

return obstacles.map((obj, i) => {

const rad = (obj.angle * Math.PI) / 180;

const r = obj.distance;

const x = 50 + r * Math.cos(rad);
const y = 50 + r * Math.sin(rad);

const size = Math.max(4, 14 - (obj.distance / 2));

return {
...obj,
x,
y,
size,
id: i
};

});

}, [obstacles]);

return (

<div className="radar-container">

<div className="radar-circle">
<div className="radar-ring ring-1" />
<div className="radar-ring ring-2" />
<div className="radar-ring ring-3" />
{Array.from({ length: 12 }).map((_, i) => (

<div
key={i}
className="radar-bearing"
style={{
transform: `rotate(${i * 30}deg)`
}}
>

<span>{i * 30}</span>

</div>

))}

<div className="radar-sweep" />

{radarObjects.map(obj => (

<div
key={obj.id}
className={`radar-object ${
obj.distance < 15 ? "danger" :
obj.distance < 25 ? "warning" : ""
}`}
style={{
left: `${obj.x}%`,
top: `${obj.y}%`,
width: `${obj.size}px`,
height: `${obj.size}px`
}}
/>

))}

</div>

</div>

);

}

export default OASRadar;