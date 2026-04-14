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

  // 1. Efficiently push new values into the ref-based buffer
  useEffect(() => {
    if (value === undefined || value === null || !isFinite(value)) return;
    
    const now = Date.now();
    const point = { time: now, value: +value.toFixed(3) };
    
    // Efficiently maintain ring buffer
    if (buf.current.length >= size) {
      buf.current.shift();
    }
    buf.current.push(point);
  }, [value, size]);

  // 2. interval-based snapshot update (The actual performance fix)
  useEffect(() => {
    const timer = setInterval(() => {
      // Only set state if the buffer actually has data
      if (buf.current.length > 0) {
        setSnapshot([...buf.current]);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return snapshot;
}
