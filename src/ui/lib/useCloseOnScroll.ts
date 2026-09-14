import { useEffect, useRef, type RefObject } from 'react';

export function useCloseOnScroll(
  enabled: boolean,
  onClose: () => void,
  ignoreRefs: Array<RefObject<HTMLElement | null | undefined>> = [],
  isIgnored?: (target: EventTarget | null) => boolean
) {
  const onCloseRef = useRef(onClose);
  const ignoreRefsRef = useRef(ignoreRefs);
  const isIgnoredRef = useRef(isIgnored);
  onCloseRef.current = onClose;
  ignoreRefsRef.current = ignoreRefs;
  isIgnoredRef.current = isIgnored;

  useEffect(() => {
    if (!enabled) return;

    const handleScroll = (event: Event) => {
      const target = event.target;
      if (isIgnoredRef.current?.(target)) return;
      if (target instanceof Node) {
        for (const ref of ignoreRefsRef.current) {
          if (ref.current?.contains(target)) return;
        }
      }
      onCloseRef.current();
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [enabled]);
}
