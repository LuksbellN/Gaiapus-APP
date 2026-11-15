// Bottom sheet for phones: three positions, dragged by its grip, with content that scrolls on its own.
// The grip takes the drag (touch-action: none there only); the content keeps native scrolling and collapses the
// sheet only from the top with a deliberate pull. Nothing is prevented globally and the page scroll is never disabled.
import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject, type TouchEvent } from 'react';

export type SheetPos = 'recolhida' | 'media' | 'expandida';
export const SHEET_ORDER: SheetPos[] = ['recolhida', 'media', 'expandida'];
export type SheetHeights = Record<SheetPos, number>;
const TOP_GAP = 72;       // room kept for the search bar above the expanded sheet
const FLING = 0.5;        // px per ms
const CONTROL = 'input, select, textarea, button, a, label, [role="slider"], [contenteditable="true"]';

/** Heights in px for a container (the area between the header and the bottom navigation). */
export function sheetHeights(container: number): SheetHeights {
  const expandida = Math.max(120, Math.round(container) - TOP_GAP);
  return { recolhida: Math.min(132, expandida), media: Math.min(Math.round(container * 0.46), expandida), expandida };
}
/** Where a released drag settles: one step in the direction of a fling, else the nearest position. */
export function snapSheet(height: number, velocity: number, h: SheetHeights): SheetPos {
  if (velocity > FLING) return SHEET_ORDER.find((p) => h[p] > height) ?? 'expandida';
  if (velocity < -FLING) return [...SHEET_ORDER].reverse().find((p) => h[p] < height) ?? 'recolhida';
  return SHEET_ORDER.reduce((best, p) => (Math.abs(h[p] - height) < Math.abs(h[best] - height) ? p : best), 'recolhida' as SheetPos);
}
export const stepSheet = (pos: SheetPos, dir: 1 | -1): SheetPos => SHEET_ORDER[Math.max(0, Math.min(SHEET_ORDER.length - 1, SHEET_ORDER.indexOf(pos) + dir))];
/** A touch on the content collapses the sheet only when the content was and stayed at its top, the pull is deliberate, vertical and downwards, and it did not start on a control. */
export function collapseFromContent(g: { startScrollTop: number; endScrollTop: number; dx: number; dy: number; onControl: boolean }): boolean {
  return !g.onControl && g.startScrollTop <= 0 && g.endScrollTop <= 0 && g.dy > 72 && Math.abs(g.dx) < g.dy / 2;
}

export function useBottomSheet({ enabled, pos, onPos, container }: { enabled: boolean; pos: SheetPos; onPos: (p: SheetPos) => void; container: RefObject<HTMLElement | null> }) {
  const [size, setSize] = useState(() => (typeof innerHeight === 'number' ? innerHeight - 120 : 600));
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef<{ y: number; h: number; t: number; lastY: number; lastT: number; moved: boolean } | null>(null);
  const touch = useRef<{ x: number; y: number; top: number; onControl: boolean } | null>(null);
  const justDragged = useRef(false);
  // The container changes height with the browser bars, the keyboard and the orientation: follow it.
  useEffect(() => {
    const el = container.current; if (!enabled || !el) return;
    const read = () => setSize(el.clientHeight);
    read();
    const ro = new ResizeObserver(read); ro.observe(el);
    return () => ro.disconnect();
  }, [enabled, container]);
  const heights = sheetHeights(size);
  const height = drag ?? heights[pos];

  const onPointerDown = useCallback((e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if ((e.target as Element).closest?.('button, a, input, select')) return; // the buttons of the grip are pressed, not dragged
    e.currentTarget.setPointerCapture?.(e.pointerId); // from the first touch: a quick pull leaves the grip before it moves 6 px
    start.current = { y: e.clientY, h: heights[pos], t: e.timeStamp, lastY: e.clientY, lastT: e.timeStamp, moved: false };
  }, [heights, pos]);
  const onPointerMove = useCallback((e: PointerEvent<HTMLElement>) => {
    const s = start.current; if (!s) return;
    const dy = s.y - e.clientY;
    if (!s.moved && Math.abs(dy) < 6) return; // a tap is not a drag
    s.moved = true;
    s.lastY = e.clientY; s.lastT = e.timeStamp;
    setDrag(Math.max(heights.recolhida - 24, Math.min(heights.expandida, s.h + dy)));
  }, [heights]);
  const end = useCallback((e: PointerEvent<HTMLElement>) => {
    const s = start.current; start.current = null; if (!s || !s.moved) return;
    const elapsed = Math.max(1, e.timeStamp - s.t); const velocity = (s.y - e.clientY) / elapsed;
    justDragged.current = true; setTimeout(() => { justDragged.current = false; }, 0);
    setDrag(null); onPos(snapSheet(s.h + (s.y - e.clientY), velocity, heights));
  }, [heights, onPos]);
  // After a drag, the click that follows the release must not also press a button under the finger.
  const onClickCapture = useCallback((e: { stopPropagation: () => void; preventDefault: () => void }) => { if (justDragged.current) { e.stopPropagation(); e.preventDefault(); } }, []);

  const onTouchStart = useCallback((e: TouchEvent<HTMLElement>) => {
    const t = e.touches[0]; if (!t || e.touches.length > 1) { touch.current = null; return; }
    touch.current = { x: t.clientX, y: t.clientY, top: e.currentTarget.scrollTop, onControl: !!(e.target as Element).closest?.(CONTROL) };
  }, []);
  const onTouchEnd = useCallback((e: TouchEvent<HTMLElement>) => {
    const s = touch.current; touch.current = null; const t = e.changedTouches[0]; if (!s || !t) return;
    if (collapseFromContent({ startScrollTop: s.top, endScrollTop: e.currentTarget.scrollTop, dx: t.clientX - s.x, dy: t.clientY - s.y, onControl: s.onControl })) onPos(stepSheet(pos, -1));
  }, [onPos, pos]);

  return { height, heights, dragging: drag != null,
    grip: { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end, onClickCapture },
    content: { onTouchStart, onTouchEnd, onTouchCancel: () => { touch.current = null; } } };
}
