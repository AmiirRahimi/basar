'use client';

import { useEffect, useRef } from 'react';

/** Poll `fn` while `enabled`. Interval is `activeMs` when active, else `idleMs`. */
export function useChatPolling(
  fn: () => void | Promise<void>,
  {
    enabled = true,
    active = false,
    activeMs = 3000,
    idleMs = 15000,
  }: {
    enabled?: boolean;
    active?: boolean;
    activeMs?: number;
    idleMs?: number;
  } = {},
) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      try {
        await fnRef.current();
      } catch {
        // ignore poll errors
      }
      if (cancelled) return;
      timer = setTimeout(tick, active ? activeMs : idleMs);
    }

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, active, activeMs, idleMs]);
}
