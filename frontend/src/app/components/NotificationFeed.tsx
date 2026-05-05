import React, { useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { useTelemetry } from '../../contexts/TelemetryContext';
import { Bell, CheckCircle, AlertTriangle, AlertCircle, Info, Shield } from 'lucide-react';
import { Button } from './ui/button';

function mapBackendSeverity(sev: string): 'high' | 'medium' | 'low' {
  if (sev === 'critical') return 'high';
  if (sev === 'warning') return 'medium';
  return 'low';
}

export function NotificationFeed() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { alerts: backendAlerts } = useTelemetry();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const backendMapped = backendAlerts
    .filter(a => !dismissedIds.has(a.id))
    .map(a => ({
      id: a.id,
      timestamp: a.timestamp,
      title: a.title,
      message: a.message,
      severity: mapBackendSeverity(a.severity),
      source: a.category || 'system',
      read: a.acknowledged,
      fromBackend: true,
    }));

  const allNotifications = [
    ...backendMapped,
    ...notifications.map(n => ({ ...n, title: null, fromBackend: false })),
  ].sort((a, b) => b.timestamp - a.timestamp);

  const totalUnread = unreadCount + backendMapped.filter(a => !a.read).length;

  const getSeverityIcon = (sev: string) => {
    if (sev === 'high') return <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />;
    if (sev === 'medium') return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
    return <Info className="w-4 h-4 text-marine-accent shrink-0" />;
  };

  const getSeverityClass = (sev: string, read: boolean) => {
    if (read) return 'bg-marine-dark/30 border-marine-border/50 opacity-60';
    if (sev === 'high') return 'bg-red-500/10 border-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.1)]';
    if (sev === 'medium') return 'bg-amber-500/10 border-amber-500/50';
    return 'bg-marine-dark border-marine-border';
  };

  return (
    <div className="h-[400px] flex flex-col bg-marine-surface border border-marine-border rounded-xl overflow-hidden shadow-xl">
      <div className="flex items-center justify-between p-4 border-b border-marine-border bg-marine-dark/50">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-marine-text" />
          <h3 className="font-semibold text-marine-text">System Alerts</h3>
          {totalUnread > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-1 animate-pulse">
              {totalUnread} NEW
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-marine-text-secondary font-mono">{allNotifications.length} events</span>
          {totalUnread > 0 && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => {
                markAllAsRead();
                const unreadBackendIds = backendMapped.filter(a => !a.read).map(a => a.id);
                if (unreadBackendIds.length > 0) {
                  setDismissedIds(prev => {
                    const next = new Set(prev);
                    unreadBackendIds.forEach(id => next.add(id));
                    return next;
                  });
                }
              }} 
              className="h-7 text-xs text-marine-text-secondary hover:text-marine-text transition-colors"
            >
              <CheckCircle className="w-3 h-3 mr-1" /> Mark All Read
            </Button>
          )}
        </div>

      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {allNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-marine-text-secondary">
            <Shield className="w-8 h-8 opacity-20" />
            <span className="text-sm">All systems nominal</span>
          </div>
        ) : (
          allNotifications.map(notif => (
            <div 
              key={notif.id} 
              className={`p-3 rounded-lg border transition-all duration-300 ${getSeverityClass(notif.severity, notif.read)}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getSeverityIcon(notif.severity)}</div>
                <div className="flex-1 min-w-0">
                  {notif.title && (
                    <div className={`text-xs font-bold mb-0.5 ${notif.severity === 'high' ? 'text-red-300' : notif.severity === 'medium' ? 'text-amber-300' : 'text-marine-text'}`}>
                      {notif.title}
                    </div>
                  )}
                  <div className={`text-sm leading-tight ${
                    notif.read ? 'text-marine-text-secondary' : 
                    notif.severity === 'high' ? 'text-red-100' :
                    notif.severity === 'medium' ? 'text-amber-100' :
                    'text-marine-text'
                  }`}>
                    {notif.message}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded ${
                      notif.fromBackend ? 'bg-marine-accent/20 text-marine-accent' : 'bg-marine-dark text-marine-text-secondary'
                    }`}>
                      {notif.source}
                    </span>
                    <span className="text-[10px] text-marine-text-secondary">
                      {new Date(notif.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                {!notif.read && (
                  <button 
                    onClick={() => notif.fromBackend ? setDismissedIds(p => new Set([...p, notif.id])) : markAsRead(notif.id)} 
                    className="p-1 hover:bg-white/10 rounded-full transition-colors shrink-0 mt-0.5"
                  >
                    <div className="w-2 h-2 rounded-full bg-marine-accent" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
