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

const shipIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/60/60727.png",
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

function RecenterMap({ lat, lon }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lon) {
      map.setView([lat, lon], map.getZoom(), {
        animate: true
      });
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
          background: "#1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8"
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
      style={{
        height,
        width: "100%",
        borderRadius: 12
      }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <RecenterMap lat={latitude} lon={longitude} />
      {trail.length > 1 && (
        <Polyline
          positions={trail}
          pathOptions={{
            color: "#3b82f6",
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