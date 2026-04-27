import { useState, useEffect, useCallback } from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';
import { useMission } from '../contexts/MissionContext';

export interface Notification {
  id: string;
  timestamp: number;
  message: string;
  severity: 'low' | 'medium' | 'high';
  source: 'system' | 'gnss' | 'ctd' | 'thruster' | 'radar' | 'mission';
  read: boolean;
}

// Global variable to persist notifications across remounts within the session
let globalNotifications: Notification[] = [];

export function useNotifications() {
  const { sensorData } = useTelemetry();
  const { activeMission } = useMission();
  const [notifications, setNotifications] = useState<Notification[]>(globalNotifications);

  const addNotification = useCallback((message: string, severity: 'low' | 'medium' | 'high', source: Notification['source']) => {
    // Deduplicate identical active alerts within the last 30 seconds
    const recentDuplicate = globalNotifications.find(n => n.message === message && (Date.now() - n.timestamp) < 30000);
    if (recentDuplicate) return;

    const newNotif: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      message,
      severity,
      source,
      read: false
    };
    globalNotifications = [newNotif, ...globalNotifications].slice(0, 100);
    setNotifications([...globalNotifications]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    globalNotifications = globalNotifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications([...globalNotifications]);
  }, []);

  const markAllAsRead = useCallback(() => {
    // Mark every notification as read in the global store
    globalNotifications = globalNotifications.map(n => ({ ...n, read: true }));
    // Force React to pick up the new reference
    setNotifications([...globalNotifications]);
  }, []);


  useEffect(() => {
    if (!sensorData) return;

    // Thruster Checks
    const thrusters = sensorData.thruster.thrusters || [sensorData.thruster];
    thrusters.forEach((t: any) => {
      const name = t.name || 'Main';
      const maxRpm = t.maxRpm ?? 2000;
      if (t.rpm > maxRpm * 0.9) {
        addNotification(`${name} Thruster RPM at critical level (${t.rpm.toFixed(0)} rpm)`, 'high', 'thruster');
      }
      
      const maxTemp = t.tempWarningThreshold ?? 80;
      if (t.temperature > maxTemp) {
        addNotification(`${name} Thruster temperature critical: ${t.temperature.toFixed(1)}°C`, 'high', 'thruster');
      } else if (t.temperature > maxTemp * 0.8) {
        addNotification(`${name} Thruster temperature elevated: ${t.temperature.toFixed(1)}°C`, 'medium', 'thruster');
      }
      
      if (t.status === 'inactive' || t.status === 'idle') {
        // addNotification(`${name} Thruster is ${t.status}`, 'low', 'thruster');
      }
      
      if (t.vibration > 0.06) {
        addNotification(`${name} Thruster high vibration: ${t.vibration.toFixed(3)}g`, 'medium', 'thruster');
      }
      
      if (t.efficiency < 75 && t.rpm > 500) {
        addNotification(`${name} Thruster efficiency low: ${t.efficiency.toFixed(1)}%`, 'medium', 'thruster');
      }
    });

    // GNSS Checks
    if ((sensorData.gnss.hdop ?? 0) > 3) {
      addNotification(`GNSS Signal lost or heavily degraded (HDOP: ${sensorData.gnss.hdop})`, 'high', 'gnss');
    }

    // Radar Checks
    if (sensorData.radar.detections && sensorData.radar.detections.length > 0) {
      const highThreats = sensorData.radar.detections.filter(d => d.threat === 'high');
      if (highThreats.length > 0) {
         addNotification(`Radar: Immediate collision risk. ${highThreats.length} high-threat object(s) detected.`, 'high', 'radar');
      }
    }

    // Mission Checks
    if (activeMission?.active && (sensorData.gnss.speed === 0)) {
       addNotification(`Active mission stalled. Vessel speed is 0.`, 'medium', 'mission');
    }

  }, [sensorData, activeMission, addNotification]);

  return {
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
    markAsRead,
    markAllAsRead
  };
}
