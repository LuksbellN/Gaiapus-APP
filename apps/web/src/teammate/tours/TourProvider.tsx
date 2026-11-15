// Optional tutorials (Docs/ux-preservacao/04). Never start by themselves: a discreet invite on first visit and
// a "How to use this screen" button afterwards. The panel itself is loaded only when a tour starts.
import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CircleHelp } from 'lucide-react';
import { useI18n } from '../i18n';
import { tourById, tourForPath, TOURS } from './scripts';
import { setTour, tourRecord, useTourRecords, type TourState } from './storage';

const TourPopover = lazy(() => import('./TourPopover'));

type Active = { id: string; step: number; opener: HTMLElement | null };
type Ctx = { start: (id: string, opener?: HTMLElement | null) => void; active: string | null };
const TourCtx = createContext<Ctx>({ start: () => {}, active: null });
export const useTours = () => useContext(TourCtx);

export function TourProvider({ children }: { children: ReactNode }) {
  const loc = useLocation(); const nav = useNavigate();
  const [active, setActive] = useState<Active | null>(null);
  // Screen the tour itself is opening: that route change must not close it.
  const internal = useRef<string | null>(null);
  const prevPath = useRef(loc.pathname);

  useEffect(() => {
    if (loc.pathname === prevPath.current) return;
    prevPath.current = loc.pathname;
    if (!active) return;
    if (internal.current === loc.pathname) { internal.current = null; return; }
    // The user went elsewhere: close and keep the progress; the new screen's tour is not opened.
    setTour(active.id, 'in_progress', active.step); setActive(null);
  }, [loc.pathname, active]);

  const go = useCallback((to: string) => { internal.current = to.split('?')[0]; nav(to); }, [nav]);

  const start = useCallback((id: string, opener: HTMLElement | null = null) => {
    const tour = tourById(id); if (!tour) return;
    const rec = tourRecord(id);
    const step = rec.state === 'in_progress' && rec.step !== undefined && rec.step < tour.steps.length ? rec.step : 0;
    const here = tour.steps[step].path ?? tour.path;
    if (here !== loc.pathname) go(here);
    setTour(id, 'in_progress', step); setActive({ id, step, opener });
  }, [go, loc.pathname]);

  // Side effects (storage, focus) stay out of state updaters.
  const current = useRef<Active | null>(null); current.current = active;
  const close = useCallback((state: TourState) => {
    const a = current.current; if (!a) return;
    setTour(a.id, state, state === 'in_progress' ? a.step : undefined);
    setActive(null);
    const back = a.opener?.isConnected ? a.opener : document.querySelector<HTMLElement>('main h1');
    requestAnimationFrame(() => back?.focus({ preventScroll: true }));
  }, []);

  const onStep = useCallback((step: number) => {
    const a = current.current; if (!a) return;
    setTour(a.id, 'in_progress', step); setActive({ ...a, step });
  }, []);
  const value = useMemo(() => ({ start, active: active?.id ?? null }), [start, active]);
  const tour = active ? tourById(active.id) : undefined;

  return <TourCtx.Provider value={value}>
    {children}
    {tour && active && <Suspense fallback={null}><TourPopover key={tour.id} tour={tour} step={active.step} onStep={onStep} onClose={close} go={go} /></Suspense>}
  </TourCtx.Provider>;
}

/** Invite on first visit, then a "How to use this screen" button. Shown only on screens with a tour. */
export function TourBar() {
  const { t } = useI18n(); const loc = useLocation(); const { start, active } = useTours(); useTourRecords();
  const offered = TOURS.find((x) => x.path === loc.pathname && x.id !== 'simulator-unavailable@1');
  if (!offered || active) return null;
  const open = (e: React.MouseEvent<HTMLButtonElement>) => { const tour = tourForPath(loc.pathname); if (tour) start(tour.id, e.currentTarget); };
  const rec = tourRecord(offered.id);
  if (rec.state === 'new') return <div className={`tour-bar${loc.pathname === '/explorar' ? ' tour-bar--float' : ''}`} data-testid="tour-bar">
    <CircleHelp size={18} aria-hidden /><button type="button" className="btn btn--sm" onClick={open}>{t('tour.invite')}</button>
    <button type="button" className="btn btn--sm btn--quiet" onClick={() => setTour(offered.id, 'dismissed')}>{t('tour.notNow')}</button>
  </div>;
  return <div className={`tour-bar${loc.pathname === '/explorar' ? ' tour-bar--float' : ''}`} data-testid="tour-bar"><button type="button" className="btn btn--sm btn--quiet" onClick={open}><CircleHelp size={18} aria-hidden />{t('tour.howTo')}</button></div>;
}
