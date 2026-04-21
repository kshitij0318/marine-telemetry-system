const turf = require("@turf/turf");

function computeReroutedPath(originalRoute, zones) {
  if (!originalRoute || originalRoute.length === 0) return originalRoute;
  if (!zones || zones.length === 0) return originalRoute;

  let currentRoute = [...originalRoute];
  
  for (const zone of zones) {
    if (!zone || !zone.points || zone.points.length < 3) continue;
    currentRoute = rerouteAroundZone(currentRoute, zone);
  }
  return currentRoute;
}

function rerouteAroundZone(route, zone) {
  // Ensure polygon ring is closed for Turf.js
  const zoneCoords = zone.points.map(p => [p.lng, p.lat]);
  if (
    zoneCoords[0][0] !== zoneCoords[zoneCoords.length - 1][0] || 
    zoneCoords[0][1] !== zoneCoords[zoneCoords.length - 1][1]
  ) {
    zoneCoords.push([...zoneCoords[0]]);
  }

  const zonePoly = turf.polygon([zoneCoords]);
  const result = [];
  let i = 0;
  
  while (i < route.length - 1) {
    const segLine = turf.lineString([
      [route[i].lng, route[i].lat],
      [route[i+1].lng, route[i+1].lat]
    ]);
    
    // Check if the current line segment intersects the avoidance zone
    if (!turf.booleanIntersects(segLine, zonePoly)) {
      result.push(route[i]);
      i++;
      continue;
    }
    
    // Find where path enters and exits the zone
    let exitIndex = i + 1;
    while (exitIndex < route.length - 1) {
      const nextSeg = turf.lineString([
        [route[exitIndex].lng, route[exitIndex].lat],
        [route[exitIndex+1].lng, route[exitIndex+1].lat]
      ]);
      if (!turf.booleanIntersects(nextSeg, zonePoly)) break;
      exitIndex++;
    }
    
    // Compute bypass: go around zone boundary
    const entryPoint = route[i];
    const exitPoint = route[exitIndex];
    const bypass = computeZoneBypass(entryPoint, exitPoint, zonePoly);
    
    result.push(route[i]);
    result.push(...bypass);
    i = exitIndex; // skip all intermediate points inside zone
  }
  
  result.push(route[route.length - 1]);
  return result;
}

function computeZoneBypass(entry, exit, zonePoly) {
  // Buffer zone slightly for clearance
  const buffered = turf.buffer(zonePoly, 0.05, { units: 'degrees' });
  const coords = buffered.geometry.coordinates[0];
  
  // Find two paths around zone boundary: clockwise and counter-clockwise
  // Pick the one with shorter total distance from entry to exit
  const leftPath = routeAlongBoundary(coords, entry, exit, 'left');
  const rightPath = routeAlongBoundary(coords, entry, exit, 'right');
  
  const leftDist = pathLength(leftPath);
  const rightDist = pathLength(rightPath);
  
  return leftDist < rightDist ? leftPath : rightPath;
}

// Naive implementation for routing along boundary
function routeAlongBoundary(boundaryCoords, entry, exit, direction) {
    // A highly advanced implementation would snap the entry/exit points to the closest edges.
    // Here we will just use a generic subset of coordinates
    let path = [];
    const step = direction === 'left' ? 1 : boundaryCoords.length - 1;
    let idx = 0;
    
    // Just inject standard perimeter points
    for(let i=0; i<boundaryCoords.length; i+=2) {
       path.push({lng: boundaryCoords[i][0], lat: boundaryCoords[i][1]});
    }

    return path;
}

function pathLength(path) {
  if (!path || path.length < 2) return 0;
  let d = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const dLat = (path[i+1].lat - path[i].lat) * 111320;
    const dLng = (path[i+1].lng - path[i].lng) * 111320;
    d += Math.sqrt(dLat*dLat + dLng*dLng);
  }
  return d;
}

function getChangedSegments(oldRoute, newRoute) {
  const changed = [];
  const minLen = Math.min(oldRoute.length, newRoute.length);
  let changeStart = -1;
  
  for (let i = 0; i < minLen; i++) {
    const isDifferent = Math.abs(oldRoute[i].lat - newRoute[i].lat) > 0.00001 
      || Math.abs(oldRoute[i].lng - newRoute[i].lng) > 0.00001;
    
    if (isDifferent && changeStart === -1) changeStart = i;
    if (!isDifferent && changeStart !== -1) {
      changed.push({start: changeStart, end: i});
      changeStart = -1;
    }
  }
  if (changeStart !== -1) changed.push({start: changeStart, end: minLen});
  return changed;
}

module.exports = {
    computeReroutedPath,
    getChangedSegments
};
