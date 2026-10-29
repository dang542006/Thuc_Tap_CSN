import { useEffect, useRef, useState } from 'react';

// Match the drag/snap interaction in taschen-local/local.js.
export default function useHeroCarousel(count) {
  const stage = useRef(null);
  const gesture = useRef(null);
  const timer = useRef(null);
  const blocked = useRef(false);
  const suppressClickUntil = useRef(0);
  const lastManual = useRef(0);
  const paused = useRef(false);
  const [index, setIndex] = useState(0);
  const [motion, setMotion] = useState({ offset: 0, settling: false });
  const wrap = (value) => count ? (value + count) % count : 0;
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const select = (next) => {
    if (gesture.current || blocked.current) return;
    lastManual.current = Date.now();
    setIndex(wrap(next));
  };
  useEffect(() => {
    setIndex(0);
    setMotion({ offset: 0, settling: false });
    gesture.current = null; blocked.current = false;
    return () => clearTimeout(timer.current);
  }, [count]);
  useEffect(() => {
    const interval = setInterval(() => {
      if (count > 1 && !paused.current && !stage.current?.contains(document.activeElement) && !gesture.current && !blocked.current && !document.hidden && !reduced() && Date.now() - lastManual.current >= 3000) {
        blocked.current = true;
        setMotion({ offset: -100, settling: true });
        timer.current = setTimeout(() => {
          setIndex((value) => (value + 1) % count);
          setMotion({ offset: 0, settling: false });
          blocked.current = false;
        }, 320);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [count]);
  useEffect(() => {
    const element = stage.current;
    let total = 0, last = 0;
    function wheel(event) {
      if (count < 2 || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      if (gesture.current || blocked.current) return;
      const now = Date.now();
      if (now - last > 200) total = 0;
      last = now; total += event.deltaX;
      if (Math.abs(total) > 70 && now - lastManual.current > 650) {
        const direction = total > 0 ? 1 : -1;
        setIndex((value) => (value + direction + count) % count);
        lastManual.current = now; total = 0;
      }
    }
    element?.addEventListener('wheel', wheel, { passive: false });
    return () => element?.removeEventListener('wheel', wheel);
  }, [count]);
  function finish(cancel = false) {
    const g = gesture.current;
    if (!g) return;
    gesture.current = null;
    if (stage.current?.hasPointerCapture(g.id)) stage.current.releasePointerCapture(g.id);
    if (g.axis !== 'x') return;
    suppressClickUntil.current = Date.now() + 500;
    lastManual.current = Date.now(); blocked.current = true;
    const dx = Math.max(-g.width, Math.min(g.width, g.dx));
    const advance = !cancel && (Math.abs(dx) > Math.min(100, g.width * .18) || (Math.abs(dx) > 28 && Math.abs(dx) / Math.max(1, performance.now() - g.started) > .45));
    setMotion({ offset: advance ? (dx < 0 ? -100 : 100) : 0, settling: true });
    timer.current = setTimeout(() => {
      if (advance) setIndex((value) => (value + (dx < 0 ? 1 : -1) + count) % count);
      setMotion({ offset: 0, settling: false }); blocked.current = false;
    }, reduced() ? 0 : 320);
  }
  const handlers = {
    onPointerDown(event) {
      if (count < 2 || blocked.current || gesture.current || !event.isPrimary || event.button !== 0 || event.target.closest('button,input')) return;
      gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, width: stage.current.getBoundingClientRect().width, started: performance.now(), axis: null };
    },
    onPointerMove(event) {
      const g = gesture.current;
      if (!g || g.id !== event.pointerId) return;
      const dx = event.clientX - g.x, dy = event.clientY - g.y;
      if (!g.axis) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
        g.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (g.axis === 'x') stage.current.setPointerCapture(g.id);
      }
      if (g.axis !== 'x') return;
      event.preventDefault(); g.dx = dx;
      setMotion({ offset: Math.max(-100, Math.min(100, dx / g.width * 100)), settling: false });
    },
    onPointerUp: () => finish(), onPointerCancel: () => finish(true), onLostPointerCapture: () => finish(true),
    onPointerEnter: () => { paused.current = true; },
    onPointerLeave: () => { paused.current = false; if (gesture.current && !stage.current.hasPointerCapture(gesture.current.id)) finish(true); },
    onDragStart: (event) => event.preventDefault(),
    onClickCapture: (event) => { if (Date.now() < suppressClickUntil.current) { event.preventDefault(); event.stopPropagation(); } },
    onKeyDown: (event) => { if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); select(index + (event.key === 'ArrowRight' ? 1 : -1)); } },
  };
  function position(i) {
    if (i === index) return 0;
    if (count === 2) return motion.offset > 0 ? -1 : 1;
    if (i === wrap(index + 1)) return 1;
    if (i === wrap(index - 1)) return -1;
    return 2;
  }
  return { stage, index, motion, handlers, select, position };
}
