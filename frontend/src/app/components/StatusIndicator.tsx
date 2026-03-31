import React from 'react';

interface StatusIndicatorProps {
  status: 'active' | 'delayed' | 'offline';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusIndicator({ status, label, size = 'md' }: StatusIndicatorProps) {
  const getColor = () => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'delayed':
        return 'bg-amber-500';
      case 'offline':
        return 'bg-red-500';
    }
  };

  const getSize = () => {
    switch (size) {
      case 'sm':
        return 'w-1.5 h-1.5';
      case 'md':
        return 'w-2 h-2';
      case 'lg':
        return 'w-3 h-3';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`${getSize()} rounded-full ${getColor()} animate-pulse`} />
      {label && <span className="text-sm text-marine-text-secondary capitalize">{label || status}</span>}
    </div>
  );
}
