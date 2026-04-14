import { useState, useEffect, useCallback } from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';
import { useMission } from '../contexts/MissionContext';

export interface Notification {
  id: string;
  timestamp: number;
  message: string;
  severity: 'low' | 'medium' | 'high';
  source: 'system' | 'gnss' | 'ctd' | 'thruster' | 'oas' | 'mission';
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
    globalNotifications = globalNotifications.map(n => ({ ...n, read: true }));
    setNotifications([...globalNotifications]);
  }, []);

  useEffect(() => {
    if (!sensorData) return;

    // Thruster Checks
    const maxRpm = sensorData.thruster.maxRpm ?? 2000;
    if (sensorData.thruster.rpm > maxRpm * 0.9) {
      addNotification(`Thruster RPM at critical level (${sensorData.thruster.rpm.toFixed(0)} rpm)`, 'high', 'thruster');
    }
    
    const maxTemp = sensorData.thruster.tempWarningThreshold ?? 80;
    if (sensorData.thruster.temperature > maxTemp) {
      addNotification(`Thruster temperature critical: ${sensorData.thruster.temperature.toFixed(1)}°C`, 'high', 'thruster');
    } else if (sensorData.thruster.temperature > maxTemp * 0.8) {
      addNotification(`Thruster temperature elevated: ${sensorData.thruster.temperature.toFixed(1)}°C`, 'medium', 'thruster');
    }

    // GNSS Checks
    if ((sensorData.gnss.hdop ?? 0) > 3) {
      addNotification(`GNSS Signal lost or heavily degraded (HDOP: ${sensorData.gnss.hdop})`, 'high', 'gnss');
    }

    // OAS Checks
    if (sensorData.oas.detections && sensorData.oas.detections.length > 0) {
      const highThreats = sensorData.oas.detections.filter(d => d.threat === 'high');
      if (highThreats.length > 0) {
         addNotification(`OAS: Immediate collision risk. ${highThreats.length} high-threat object(s) detected.`, 'high', 'oas');
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
