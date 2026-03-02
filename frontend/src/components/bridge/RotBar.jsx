// function RotBar({ value = 0 }) {
//   const normalized = Math.max(-40, Math.min(40, value));

//   return (
//     <div className="rot-container">
//       <div className="rot-scale">
//         {Array.from({ length: 9 }).map((_, i) => (
//           <div key={i} className="rot-tick" />
//         ))}
//       </div>

//       <div
//         className="rot-indicator"
//         style={{ left: `${50 + normalized}%` }}
//       />

//       <div className="rot-label">
//         ROT {value?.toFixed(1) || 0} °/min
//       </div>
//     </div>
//   );
// }

// export default RotBar;