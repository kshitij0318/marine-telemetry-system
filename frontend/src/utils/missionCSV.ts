import { WaypointActionConfig } from '../types/waypointActions';

interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  name: string;
  actions?: WaypointActionConfig;
}

interface AvoidanceZone {
  id: string;
  points: { lat: number; lng: number }[];
  area: number;
  visible: boolean;
}

export function exportMissionToCSV(
  waypoints: Waypoint[],
  zones: AvoidanceZone[]
): string {
  let csv = 'SECTION,TYPE,DATA1,DATA2,DATA3,DATA4,DATA5\n';
  
  // Section 1: Info
  csv += `INFO,VERSION,1.0,,,,\n`;
  csv += `INFO,EXPORT_DATE,${new Date().toISOString()},,,,\n`;
  
  // Section 2: Zones
  zones.forEach(z => {
    csv += `ZONE,${z.id},${z.area},${z.visible},${JSON.stringify(z.points).replace(/,/g, ';')},,\n`;
  });
  
  // Section 3: Waypoints
  waypoints.forEach(w => {
    const actionsJson = w.actions ? JSON.stringify(w.actions).replace(/,/g, ';') : '';
    csv += `WAYPOINT,${w.id},${w.name},${w.lat},${w.lng},${actionsJson},\n`;
  });
  
  return csv;
}

export function importMissionFromCSV(csvText: string): { 
  waypoints: Waypoint[], 
  zones: AvoidanceZone[] 
} {
  const lines = csvText.split('\n');
  const waypoints: Waypoint[] = [];
  const zones: AvoidanceZone[] = [];
  
  lines.forEach(line => {
    const parts = line.split(',');
    if (parts[0] === 'WAYPOINT') {
      const actionsRaw = parts[5]?.replace(/;/g, ',');
      waypoints.push({
        id: parts[1],
        name: parts[2],
        lat: parseFloat(parts[3]),
        lng: parseFloat(parts[4]),
        actions: actionsRaw ? JSON.parse(actionsRaw) : undefined
      });
    } else if (parts[0] === 'ZONE') {
      const pointsRaw = parts[4]?.replace(/;/g, ',');
      zones.push({
        id: parts[1],
        area: parseFloat(parts[2]),
        visible: parts[3] === 'true',
        points: pointsRaw ? JSON.parse(pointsRaw) : []
      });
    }
  });
  
  return { waypoints, zones };
}
