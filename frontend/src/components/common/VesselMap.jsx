import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap
} from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet-rotatedmarker";

/* Neon SVG Ship Icon */
const shipSVG = `
<svg width="60" height="60" viewBox="0 0 60 60">
  <polygon points="30,5 40,55 30,48 20,55"
           fill="#00eaff"
           stroke="#00b4ff"
           stroke-width="2"/>
</svg>
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
      map.setView([lat, lon], map.getZoom(), { animate: true });
    }
  }, [lat, lon]);
  return null;
}

function VesselMap({
  latitude,
  longitude,
  heading = 0,
  trail = [],
  height = 300
}) {
  if (!latitude || !longitude) {
    return (
      <div
        style={{
          height,
          background: "#0c1a2b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#8aa4c8"
        }}
      >
        No GNSS Data
      </div>
    );
  }

  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={13}
      style={{ height, width: "100%", borderRadius: 16 }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution="© OpenStreetMap contributors © CARTO"
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      <RecenterMap lat={latitude} lon={longitude} />

      {trail.length > 1 && (
        <Polyline
          positions={trail}
          pathOptions={{
            color: "#00eaff",
            weight: 3
          }}
        />
      )}

      <Marker
        position={[latitude, longitude]}
        icon={shipIcon}
        rotationAngle={heading}
        rotationOrigin="center"
      />
    </MapContainer>
  );
}

export default VesselMap;