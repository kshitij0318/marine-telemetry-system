import { useRef, useState, useEffect } from 'react';

/**
 * useRingBuffer - High-performance telemetry buffer
 * 
 * Performance Fix: Instead of updating snapshot on every telemetry value (which can be 10Hz+),
 * we push to a ref-based buffer immediately but only update the React state (snapshot)
 * at a fixed interval (e.g. 500ms). This prevents React rendering lag.
 */
export function useRingBuffer(value: number | undefined | null, size = 120, intervalMs = 500) {
  const buf = useRef<{time: number, value: number}[]>([]);
  const lastWrite = useRef(0);
  const [snapshot, setSnapshot] = useState<{time: number, value: number}[]>([]);

  useEffect(() => {
    if (value === undefined || value === null || !isFinite(value)) return;
    
    const now = Date.now();
    const point = { t: now, v: +value.toFixed(3) };
    
    if (buf.current.length >= size) {
      buf.current.shift();
    }
    buf.current.push(point);
  }, [value, size]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (buf.current.length > 0) {
        setSnapshot([...buf.current]);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return snapshot;
}
