import { useRef, useState, useEffect } from 'react';

export function useRingBuffer(value: number | undefined | null, size = 120, intervalMs = 500) {
  const buf = useRef<{t: number, v: number}[]>([]);
  const last = useRef(0);
  const [snapshot, setSnapshot] = useState<{t: number, v: number}[]>([]);

  useEffect(() => {
    if (value === undefined || value === null) return;
    const now = Date.now();
    if (now - last.current < intervalMs) return;
    last.current = now;
    const point = { t: now, v: isFinite(value) ? +value.toFixed(3) : 0 };
    buf.current = [...buf.current.slice(-(size - 1)), point];
    setSnapshot([...buf.current]);
  }, [value, size, intervalMs]);

  return snapshot;
}
