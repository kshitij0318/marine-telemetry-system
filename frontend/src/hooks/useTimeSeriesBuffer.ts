import { useState, useRef, useEffect } from 'react';

export function useTimeSeriesBuffer(
  value: number,
  maxPoints: number = 120,
  intervalMs: number = 500
) {
  const [history, setHistory] = useState<{time: number, value: number}[]>([]);
  const lastUpdate = useRef(0);
  
  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdate.current < intervalMs) return;
    lastUpdate.current = now;
    
    setHistory(prev => [
      ...prev.slice(-(maxPoints - 1)),
      { time: now, value: Number.isFinite(value) ? value : 0 }
    ]);
  }, [value, maxPoints, intervalMs]);
  
  return history;
}
