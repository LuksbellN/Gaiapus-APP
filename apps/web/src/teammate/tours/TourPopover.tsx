// Non-modal tutorial panel: the highlighted control stays usable, there is no dark veil, and closing never
// undoes what the user did. Loaded on demand by TourProvider.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { useI18n, type MessageKey } from '../i18n';
import { reducedMotion } from '../ui';
import type { Tour } from './scripts';
import type { TourState } from './storage';

type Props = { tour: Tour; step: number; onStep: (n: number) => void; onClose: (s: TourState) => void; go: (to: string) => void };
const WAIT_MS = 3000;
const MOBILE = 760;
const PANEL_W = 360;

function findTarget(ids: string[]): HTMLElement | null {
  for (const id of ids) for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`)) if (el.getClientRects().length) return el;
  return null;
}

export default function TourPopover({ tour, step, onStep, onClose, go }: Props) {
  const { t } = useI18n(); const loc = useLocation(); const [params] = useSearchParams(); const nav = useNavigate();
  const cur = tour.steps[step]; const total = tour.steps.length; const last = step === total - 1;
  const [target, setTarget] = useState<HTMLElement | null | 'wait'>('wait');
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const dir = useRef(1); const panel = useRef<HTMLDivElement>(null); const title = useRef<HTMLHeadingElement>(null);
  const k = (part: 'title' | 'body') => t(`tour.${tour.name}.s${step + 1}.${part}` as MessageKey);

  const move = useCallback((d: number) => {
    dir.current = d; const n = step + d;
    if (n >= total) onClose('done'); else if (n >= 0) onStep(n); else onStep(0);
  }, [step, total, onClose, onStep]);

  // Bring the step's screen or tab. Never changes the selected place.
  useEffect(() => {
    if (cur.path && loc.pathname !== cur.path) { go(cur.path + (cur.query ? `?${new URLSearchParams(cur.query)}` : '')); return; }
    if (cur.query && Object.entries(cur.query).some(([q, v]) => params.get(q) !== v)) {
      const p = new URLSearchParams(params); for (const [q, v] of Object.entries(cur.query)) p.set(q, v);
      nav({ pathname: loc.pathname, search: p.toString() }, { replace: true });
    }
  }, [cur, loc.pathname, params, go, nav]);

  // Wait up to 3 s for the anchor; never block.
  useEffect(() => {
    setTarget('wait'); const t0 = Date.now();
    const id = window.setInterval(() => {
      const el = findTarget(cur.targets);
      if (el) { clearInterval(id); setTarget(el); return; }
      if (Date.now() - t0 < WAIT_MS) return;
      clearInterval(id);
      if (cur.skipWhenMissing && !(step === 0 && dir.current < 0)) move(dir.current); else setTarget(null);
    }, 100);
    return () => clearInterval(id);
  }, [cur, step, loc.pathname, loc.search, move]);

  // Highlight and keep the panel next to the target (bottom sheet on small screens).
  useLayoutEffect(() => {
    if (!target || target === 'wait') { setPos(null); return; }
    target.classList.add('tour-target');
    target.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
    const place = () => {
      if (innerWidth <= MOBILE) { setPos(null); return; }
      const r = target.getBoundingClientRect(); const h = panel.current?.offsetHeight ?? 200;
      const below = r.bottom + 12; const top = below + h < innerHeight - 12 ? below : Math.max(12, r.top - 12 - h);
      setPos({ top, left: Math.min(Math.max(12, r.left), innerWidth - PANEL_W - 12) });
    };
    place();
    addEventListener('scroll', place, true); addEventListener('resize', place);
    return () => { target.classList.remove('tour-target'); removeEventListener('scroll', place, true); removeEventListener('resize', place); };
  }, [target]);

  useEffect(() => { title.current?.focus({ preventScroll: true }); }, [step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose('in_progress'); }
      else if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); move(1); }
      else if (e.altKey && e.key === 'ArrowLeft' && step > 0) { e.preventDefault(); move(-1); }
    };
    addEventListener('keydown', onKey); return () => removeEventListener('keydown', onKey);
  }, [move, onClose, step]);

  return <div ref={panel} className={`tour-pop card${pos ? '' : ' tour-pop--sheet'}`} style={pos ?? undefined} role="dialog" aria-modal="false" aria-labelledby="tour-title" aria-describedby="tour-body" data-testid="tour-pop">
    <div className="row-between"><span className="meta-13">{t('tour.step', { n: step + 1, total })}</span><button type="button" className="btn btn--sm btn--quiet" aria-label={t('tour.close')} onClick={() => onClose('in_progress')}><X size={18} aria-hidden /></button></div>
    <h2 id="tour-title" ref={title} tabIndex={-1}>{k('title')}</h2>
    <p id="tour-body">{k('body')}</p>
    {target === null && <p className="meta-13" data-testid="tour-missing">{t('tour.targetMissing')}</p>}
    <div className="row">
      {step > 0 && <button type="button" className="btn btn--sm" onClick={() => move(-1)}>{t('tour.back')}</button>}
      <button type="button" className="btn btn--sm btn--primary" onClick={() => move(1)}>{last ? t('tour.done') : t('tour.next')}</button>
      {!last && <button type="button" className="btn btn--sm btn--quiet" onClick={() => onClose('dismissed')}>{t('tour.skip')}</button>}
    </div>
    <div className="sr-only" aria-live="polite">{t('tour.announce', { n: step + 1, total, title: k('title') })}</div>
  </div>;
}
