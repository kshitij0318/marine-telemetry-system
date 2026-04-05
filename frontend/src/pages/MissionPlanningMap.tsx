import React from 'react';
import { MapRendererProps } from './NavigationMap';

export interface AvoidanceZone {
  id: string;
  points: Array<{ lat: number; lng: number }>;
  area: number;
  visible: boolean;
}

export interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  name: string;
}

export interface RerouteAnimation {
  active: boolean;
  status: 'rerouting' | 'complete';
  deltaDistance: number;
  modifiedWaypoints: number;
}

export interface MissionMapProps extends MapRendererProps {
  mapMode: string;
  avoidanceZones: AvoidanceZone[];
  currentZonePoints: Array<{ lat: number; lng: number }>;
  isDrawingZone: boolean;
  isMissionActive: boolean;
  breadcrumbTrail: Array<{ lat: number; lng: number }>;
  waypoints: Waypoint[];
  rerouteAnimation: RerouteAnimation;
}

export function renderMissionPlanningMap({
  ctx,
  width,
  height,
  vesselPosition,
  latLngToCanvas,
  mapMode,
  avoidanceZones,
  currentZonePoints,
  isDrawingZone,
  isMissionActive,
  breadcrumbTrail,
  waypoints,
  rerouteAnimation
}: MissionMapProps) {
  
  // Avoidance zones (all modes actually, according to original source it draws in all modes if visible)
  avoidanceZones.forEach(zone => {
    if (zone.visible && zone.points.length > 2) {
      ctx.beginPath();
      const firstPoint = latLngToCanvas(zone.points[0].lat, zone.points[0].lng, width, height);
      ctx.moveTo(firstPoint.x, firstPoint.y);
      zone.points.forEach(point => {
        const pos = latLngToCanvas(point.lat, point.lng, width, height);
        ctx.lineTo(pos.x, pos.y);
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 59, 59, 0.25)';
      ctx.fill();
      ctx.strokeStyle = '#ff3b3b';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Warning icon in center
      const centerX = zone.points.reduce((sum, p) => sum + latLngToCanvas(p.lat, p.lng, width, height).x, 0) / zone.points.length;
      const centerY = zone.points.reduce((sum, p) => sum + latLngToCanvas(p.lat, p.lng, width, height).y, 0) / zone.points.length;
      
      ctx.font = '20px monospace';
      ctx.fillStyle = '#ff3b3b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚠', centerX, centerY);
    }
  });

  // Current zone being drawn
  if (isDrawingZone && currentZonePoints.length > 0) {
    ctx.beginPath();
    const firstPoint = latLngToCanvas(currentZonePoints[0].lat, currentZonePoints[0].lng, width, height);
    ctx.moveTo(firstPoint.x, firstPoint.y);
    currentZonePoints.forEach(point => {
      const pos = latLngToCanvas(point.lat, point.lng, width, height);
      ctx.lineTo(pos.x, pos.y);
    });
    ctx.strokeStyle = '#ff3b3b';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw points
    currentZonePoints.forEach(point => {
      const pos = latLngToCanvas(point.lat, point.lng, width, height);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#ff3b3b';
      ctx.fill();
    });
  }

  // Breadcrumb trail (Mission mode)
  if (isMissionActive && breadcrumbTrail.length > 0) {
    breadcrumbTrail.forEach((point, index) => {
      const pos = latLngToCanvas(point.lat, point.lng, width, height);
      const opacity = index / breadcrumbTrail.length;
      
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 2, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(0, 212, 255, ${opacity * 0.6})`;
      ctx.fill();
    });
  }

  // Route line with rerouting animation
  if (waypoints.length > 0) {
    const routeColor = mapMode === 'tactical' ? '#00ff41' : '#00d4ff';
    
    // Original route (faded if rerouting)
    ctx.strokeStyle = rerouteAnimation.status === 'rerouting' ? 'rgba(148, 163, 184, 0.3)' : routeColor;
    ctx.lineWidth = 3;
    ctx.setLineDash(rerouteAnimation.status === 'rerouting' ? [5, 5] : []);
    
    ctx.beginPath();
    const vesselPosRoute = latLngToCanvas(vesselPosition.lat, vesselPosition.lng, width, height);
    ctx.moveTo(vesselPosRoute.x, vesselPosRoute.y);
    
    waypoints.forEach(wp => {
      const pos = latLngToCanvas(wp.lat, wp.lng, width, height);
      ctx.lineTo(pos.x, pos.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Rerouted path (if active)
    if (rerouteAnimation.status === 'rerouting' && waypoints.length > 0 && avoidanceZones.length > 0) {
      ctx.strokeStyle = routeColor;
      ctx.lineWidth = 3;
      
      ctx.beginPath();
      ctx.moveTo(vesselPosRoute.x, vesselPosRoute.y);
      
      // Draw bezier curve around first avoidance zone
      const firstZone = avoidanceZones[avoidanceZones.length - 1];
      if (firstZone && firstZone.points.length > 0) {
        const zoneCenter = {
          x: firstZone.points.reduce((sum, p) => sum + latLngToCanvas(p.lat, p.lng, width, height).x, 0) / firstZone.points.length,
          y: firstZone.points.reduce((sum, p) => sum + latLngToCanvas(p.lat, p.lng, width, height).y, 0) / firstZone.points.length,
        };
        
        const firstWp = latLngToCanvas(waypoints[0].lat, waypoints[0].lng, width, height);
        
        // Control points for bezier curve
        const cp1x = vesselPosRoute.x + (zoneCenter.x - vesselPosRoute.x) * 0.5 - 50;
        const cp1y = vesselPosRoute.y + (zoneCenter.y - vesselPosRoute.y) * 0.5 - 50;
        const cp2x = firstWp.x - (firstWp.x - zoneCenter.x) * 0.5 + 50;
        const cp2y = firstWp.y - (firstWp.y - zoneCenter.y) * 0.5 - 50;
        
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, firstWp.x, firstWp.y);
        
        waypoints.slice(1).forEach(wp => {
          const pos = latLngToCanvas(wp.lat, wp.lng, width, height);
          ctx.lineTo(pos.x, pos.y);
        });
      }
      
      ctx.stroke();
    }
  }

  // Waypoints
  waypoints.forEach((wp) => {
    const pos = latLngToCanvas(wp.lat, wp.lng, width, height);
    
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 8, 0, 2 * Math.PI);
    ctx.fillStyle = mapMode === 'tactical' ? '#00ff41' : '#00d4ff';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(wp.name, pos.x + 12, pos.y + 4);
  });
}

// MapCommandCenter will render the Mission Planning HUD natively as part of its side panel.
export default function MissionPlanningMap() {
  return null;
}
