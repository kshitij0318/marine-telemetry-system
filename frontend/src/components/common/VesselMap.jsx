import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  CircleMarker,
  Tooltip,
  useMap
} from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-rotatedmarker";
const shipSVG = `
<div style="width:60px;height:60px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0px 0px 10px #00eaff);">
<svg width="40" height="40" viewBox="0 0 60 60">
<polygon points="30,5 42,50 30,42 18,50" fill="#00eaff" stroke="#00b4ff" stroke-width="3"/>
</svg>
</div>
`;

const shipIcon = new L.DivIcon({
  html: shipSVG,
  className: "",
  iconSize: [60, 60],
  iconAnchor: [30, 30]
});
function RecenterMap({ lat, lon }) {
  const map = useMap();

  useEffect(() => {
    if (lat && lon) {
      map.flyTo([lat, lon], map.getZoom(), { duration: 1.2 });
    }
  }, [lat, lon, map]);

  return null;
}
function VesselMap({
  latitude,
  longitude,
  heading = 0,
  speed = 0,
  depth = 0,
  trail = [],
  height = 320
}) {

  if (!latitude || !longitude) {
    return (
      <div
        style={{
          height,
          background: "#0c1a2b",
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#8aa4c8",
          fontSize: 14
        }}
      >
        Waiting for GNSS Signal
      </div>
    );
  }
  const trailSegments = [];

  for (let i = 1; i < trail.length; i++) {
    const opacity = i / trail.length;

    trailSegments.push(
      <Polyline
        key={i}
        positions={[trail[i - 1], trail[i]]}
        pathOptions={{
          color: "#00eaff",
          weight: 4,
          opacity: opacity
        }}
      />
    );
  }

  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={13}
      style={{
        height,
        width: "100%",
        borderRadius: 16
      }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution="© OpenStreetMap © CARTO"
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      <RecenterMap lat={latitude} lon={longitude} />
      <CircleMarker
        center={[latitude, longitude]}
        radius={18}
        pathOptions={{
          color: "#00eaff",
          weight: 2,
          fillOpacity: 0.15
        }}
      />
      {trailSegments}
      <Marker
        position={[latitude, longitude]}
        icon={shipIcon}
        rotationAngle={heading}
        rotationOrigin="center"
      >
        <Tooltip
          direction="top"
          offset={[0, -20]}
          opacity={1}
          permanent
          className="vessel-hud"
        >
          <div
            style={{
              background: "#071021",
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid rgba(0,180,255,0.4)",
              fontSize: "12px",
              color: "#00eaff",
              boxShadow: "0 0 8px rgba(0,180,255,0.3)"
            }}
          >
            <div>Speed: {speed?.toFixed(2)} kn</div>
            <div>Heading: {heading?.toFixed(1)}°</div>
            <div>Depth: {depth?.toFixed(2)} m</div>
          </div>
        </Tooltip>
      </Marker>
    </MapContainer>
  );
}

export default VesselMap;