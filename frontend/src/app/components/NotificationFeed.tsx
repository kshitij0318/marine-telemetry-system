import React from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { Bell, CheckCircle, AlertTriangle, AlertCircle, Info, Trash2 } from 'lucide-react';
import { Button } from './ui/button';

export function NotificationFeed() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className="h-[400px] flex flex-col bg-marine-surface border border-marine-border rounded-xl overflow-hidden shadow-xl">
      <div className="flex items-center justify-between p-4 border-b border-marine-border bg-marine-dark/50">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-marine-text" />
          <h3 className="font-semibold text-marine-text">System Alerts</h3>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-1 animate-pulse">
              {unreadCount} NEW
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="ghost" onClick={markAllAsRead} className="h-7 text-xs text-marine-text-secondary hover:text-marine-text">
            <CheckCircle className="w-3 h-3 mr-1" /> Mark All Read
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center text-marine-text-secondary text-sm mt-10">
            No system notifications.
          </div>
        ) : (
          notifications.map(notif => (
            <div 
              key={notif.id} 
              className={`p-3 rounded-lg border transition-colors ${
                notif.read ? 'bg-marine-dark/30 border-marine-border/50 opacity-70' : 
                notif.severity === 'high' ? 'bg-red-500/10 border-red-500/50' :
                notif.severity === 'medium' ? 'bg-amber-500/10 border-amber-500/50' :
                'bg-marine-dark border-marine-border'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {notif.severity === 'high' && <AlertCircle className="w-4 h-4 text-red-400" />}
                  {notif.severity === 'medium' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                  {notif.severity === 'low' && <Info className="w-4 h-4 text-marine-accent" />}
                </div>
                <div className="flex-1">
                  <div className={`text-sm ${
                    notif.read ? 'text-marine-text-secondary' : 
                    notif.severity === 'high' ? 'text-red-100 font-medium' :
                    notif.severity === 'medium' ? 'text-amber-100 font-medium' :
                    'text-marine-text font-medium'
                  }`}>
                    {notif.message}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] uppercase font-mono text-marine-text-secondary bg-marine-dark px-1.5 py-0.5 rounded">
                      {notif.source}
                    </span>
                    <span className="text-[10px] text-marine-text-secondary">
                      {new Date(notif.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                {!notif.read && (
                  <button onClick={() => markAsRead(notif.id)} className="p-1 hover:bg-white/10 rounded-full transition-colors shrink-0">
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
