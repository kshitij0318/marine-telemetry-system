import { describe, it, expect } from 'vitest';
import { computeReroutedPath, Waypoint, AvoidanceZone } from '../utils/routeUtils';

describe('computeReroutedPath', () => {
  const waypoints: Waypoint[] = [
    { id: '1', lat: 0, lng: 0, name: 'WP1' },
    { id: '2', lat: 2, lng: 2, name: 'WP2' },
  ];

  const zone: AvoidanceZone = {
    id: 'z1',
    points: [
      { lat: 0.5, lng: 1.5 },
      { lat: 1.5, lng: 1.5 },
      { lat: 1.5, lng: 0.5 },
      { lat: 0.5, lng: 0.5 },
    ],
    area: 100,
    visible: true,
  };

  it('should insert exactly 2 waypoints when a segment crosses a zone (Feature 2)', () => {
    const result = computeReroutedPath(waypoints, [zone]);
    
    expect(result.newPath.length).toBe(4);
    expect(result.modifiedWPsCount).toBe(2);
    expect(result.newPath[1].name).toBe('REROUTE_A');
    expect(result.newPath[2].name).toBe('REROUTE_B');
    expect(result.newPath[3].id).toBe('2'); // Original end
  });

  it('should not insert waypoints if the zone is not visible', () => {
    const hiddenZone = { ...zone, visible: false };
    const result = computeReroutedPath(waypoints, [hiddenZone]);
    expect(result.newPath.length).toBe(2);
    expect(result.modifiedWPsCount).toBe(0);
  });

  it('should handle multiple zones without double-insertion (Feature 2)', () => {
    const zone2: AvoidanceZone = {
      id: 'z2',
      points: [
        { lat: 1.6, lng: 1.9 },
        { lat: 1.9, lng: 1.9 },
        { lat: 1.9, lng: 1.6 },
        { lat: 1.6, lng: 1.6 },
      ],
      area: 50,
      visible: true,
    };

    const result = computeReroutedPath(waypoints, [zone, zone2]);
    
    expect(result.newPath.length).toBe(4); 
  });

  it('should work when adding zone before waypoints (Feature 3)', () => {
    const zones = [zone];
    let wps: Waypoint[] = [waypoints[0]];
    let result = computeReroutedPath(wps, zones);
    expect(result.newPath.length).toBe(1);

    wps = [...waypoints];
    result = computeReroutedPath(wps, zones);
    expect(result.newPath.length).toBe(4); // Rerouted!
  });
});
