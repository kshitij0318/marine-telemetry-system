const turf = require("@turf/turf");
const coastline = require("./data/coastline-simplified.json");

const ORS_API_KEY = process.env.ORS_API_KEY || "";

async function computeWaterRoute(fromLat, fromLng, toPoints) {
  if (!ORS_API_KEY) {
    return fallbackWaterRoute(fromLat, fromLng, toPoints);
  }

  const coords = [
    [fromLng, fromLat],
    ...toPoints.map(p => [p.lng, p.lat])
  ];
  
  try {
    const res = await fetch('https://api.openrouteservice.org/v2/directions/driving-hgv/geojson', {
      method: 'POST',
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ coordinates: coords })
    });
    
    if (!res.ok) {
        console.warn("ORS routing failed, falling back to Turf.js");
        return fallbackWaterRoute(fromLat, fromLng, toPoints);
    }
    
    const geojson = await res.json();
    return geojson.features[0].geometry.coordinates.map(
      ([lng, lat]) => ({ lat, lng })
    );
  } catch (err) {
    console.error("Routing error:", err);
    return fallbackWaterRoute(fromLat, fromLng, toPoints);
  }
}

function fallbackWaterRoute(fromLat, fromLng, toPoints) {
  const allPoints = [{lat: fromLat, lng: fromLng}, ...toPoints];
  const route = [];
  
  for (let i = 0; i < allPoints.length - 1; i++) {
    const segment = computeSegmentAroundLand(allPoints[i], allPoints[i+1]);
    route.push(...segment);
  }
  return route.length ? route : allPoints;
}

function computeSegmentAroundLand(from, to) {
  if (!coastline || !coastline.features || coastline.features.length === 0) {
      return interpolatePoints(from, to, 20);
  }

  const line = turf.lineString([[from.lng, from.lat], [to.lng, to.lat]]);
  let intersects = false;
  
  for (const feature of coastline.features) {
     const iPoint = turf.lineIntersect(line, feature);
     if (iPoint.features.length > 0) {
         intersects = true;
         break;
     }
  }

  if (!intersects) {
    return interpolatePoints(from, to, 20); // 20 intermediate points
  }
  
  const midLat = (from.lat + to.lat) / 2;
  const midLng = (from.lng + to.lng) / 2;
  
  const bearingDeg = Math.atan2(to.lng - from.lng, to.lat - from.lat) * 180 / Math.PI;
  const perpBearing = (bearingDeg + 90) % 360;
  const offsetDist = 0.15; // degrees — enough to clear coast
  
  const bypassLat = midLat + offsetDist * Math.cos(perpBearing * Math.PI / 180);
  const bypassLng = midLng + offsetDist * Math.sin(perpBearing * Math.PI / 180);
  
  return [
    ...interpolatePoints(from, {lat: bypassLat, lng: bypassLng}, 10),
    ...interpolatePoints({lat: bypassLat, lng: bypassLng}, to, 10),
  ];
}

function interpolatePoints(from, to, n) {
  return Array.from({length: n}, (_, i) => ({
    lat: from.lat + (to.lat - from.lat) * (i / n),
    lng: from.lng + (to.lng - from.lng) * (i / n),
  }));
}

function isPointInWater(lat, lng) {
  if (!coastline || Math.abs(lat) > 90 || Math.abs(lng) > 180 || coastline.features.length === 0) return true;
  const point = turf.point([lng, lat]);
  for (const feature of coastline.features) {
    if (turf.booleanPointInPolygon(point, feature)) return false;
  }
  return true;
}

module.exports = {
    computeWaterRoute,
    isPointInWater
};
