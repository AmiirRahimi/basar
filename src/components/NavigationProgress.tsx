'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const route = `${pathname}?${searchParams}`;
  const [active, setActive] = useState(false);
  const [width, setWidth] = useState(0);
  const trickle = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const firstRoute = useRef(true);

  function clearTrickle() {
    if (trickle.current != null) {
      window.clearInterval(trickle.current);
      trickle.current = null;
    }
  }

  function start() {
    if (trickle.current != null) return;
    if (hideTimer.current != null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setActive(true);
    setWidth(14);
    trickle.current = window.setInterval(() => {
      setWidth((current) => (current >= 90 ? current : current + Math.max(0.6, (90 - current) * 0.12)));
    }, 180);
  }

  function done() {
    clearTrickle();
    setWidth(100);
    hideTimer.current = window.setTimeout(() => {
      setActive(false);
      setWidth(0);
      hideTimer.current = null;
    }, 260);
  }

  useEffect(() => {
    function isInternalNav(url: URL) {
      return (
        url.origin === window.location.origin &&
        (url.pathname !== window.location.pathname || url.search !== window.location.search)
      );
    }

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest('a');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      try {
        const next = new URL(anchor.href, window.location.href);
        if (isInternalNav(next)) start();
      } catch {
        /* ignore invalid href */
      }
    }

    const push = history.pushState.bind(history);
    const replace = history.replaceState.bind(history);

    history.pushState = function (data, unused, url) {
      if (url) {
        try {
          if (isInternalNav(new URL(String(url), window.location.href))) start();
        } catch {
          /* ignore */
        }
      }
      return push(data, unused, url);
    };
    history.replaceState = function (data, unused, url) {
      if (url) {
        try {
          if (isInternalNav(new URL(String(url), window.location.href))) start();
        } catch {
          /* ignore */
        }
      }
      return replace(data, unused, url);
    };

    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', start);

    return () => {
      history.pushState = push;
      history.replaceState = replace;
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', start);
      clearTrickle();
      if (hideTimer.current != null) window.clearTimeout(hideTimer.current);
    };
  }, []);

  useEffect(() => {
    if (firstRoute.current) {
      firstRoute.current = false;
      return;
    }
    done();
  }, [route]);

  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[10100] h-[3px] overflow-hidden"
      role="progressbar"
      aria-hidden
    >
      <div
        className="h-full bg-primary shadow-[0_0_10px] shadow-primary/50 transition-[width] duration-200 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressBar />
    </Suspense>
  );
}
