import { useEffect, useRef, type ReactNode } from 'react';
import { NavLink, Navigate, Route, Routes, Link, useLocation } from 'react-router-dom';
import { Bell, CalendarDays, CircleHelp, CircleUserRound, CloudRain, Droplets, Globe, Layers, MapPin, Menu, Moon, Radio, SlidersHorizontal, Sprout, Sun, Tractor } from 'lucide-react';
import { EDITION } from './config';
import { useI18n, type Messages } from './i18n';
import { LanguageSelect } from './ui/LanguageSelect';
import { cropOptionLabel } from './catalog';
import { useStore } from './store';
import { setPrefs, usePrefs } from './prefs';
import { Pill } from './ui';
import { lazyPage, preloadLightPages, preloadRoute } from './lazyPage';
import { More } from './pages/More';
import { TourBar, TourProvider } from './tours/TourProvider';

// Cada rota é um módulo carregado sob demanda: no build para hospedagem (dist-web) o mapa (MapLibre) e o
// campo 3D (Three.js) só são baixados quando a tela que os usa é aberta. No build de arquivo único (dist) tudo fica embutido.
const Explore = lazyPage('/explorar', () => import('./pages/Explore'), 'Explore');
const Overview = lazyPage('/visao-geral', () => import('./pages/Overview'), 'Overview');
const Municipality = lazyPage('/municipio', () => import('./pages/Municipality'), 'Municipality');
const Simulator = lazyPage('/simulador', () => import('./pages/Simulator'), 'Simulator');
const FieldShiftPage = lazyPage('/field-shift', () => import('./pages/FieldShift'), 'FieldShiftPage');
const PlanPage = lazyPage('/planejar', () => import('./pages/Plan'), 'PlanPage');
const AccountPage = lazyPage('/conta', () => import('./pages/Account'), 'AccountPage');
const Records = lazyPage('/registros', () => import('./pages/Records'), 'Records');
const Properties = lazyPage('/propriedades', () => import('./pages/Records'), 'Properties');
const MyArea = lazyPage('/minha-area', () => import('./pages/MyArea'), 'MyArea');
const Devices = lazyPage('/dispositivos', () => import('./pages/Devices'), 'Devices');
const Alerts = lazyPage('/alertas', () => import('./pages/Devices'), 'Alerts');
const DesignPreview = lazyPage(null, () => import('./pages/DesignPreview'), 'DesignPreview');
const Help = lazyPage('/ajuda', () => import('./pages/Help'), 'Help');
const LocationPage = lazyPage('/local', () => import('./pages/Location'), 'LocationPage');
const SimulationReport = lazyPage('/relatorio', () => import('./pages/SimulationReport'), 'SimulationReport');

// Destinations grouped by the farmer's task (Docs/ux-preservacao/03, section 3). Routes are unchanged.
// `mobile` items form the bottom bar; every item is also listed, by group, in "Mais".
// Labels are message keys (nav.item.*, nav.group.*), translated at render time.
type NavItem = { to: string; key: keyof Messages['nav']['item']; icon: typeof Globe; mobile?: boolean };
export const NAV_GROUPS: { id: keyof Messages['nav']['group']; items: NavItem[] }[] = [
  { id: 'explorar', items: [{ to: '/explorar', key: 'explorar', icon: Globe, mobile: true }, { to: '/municipio', key: 'municipio', icon: CloudRain }] },
  { id: 'acompanhar', items: [{ to: '/visao-geral', key: 'visaoGeral', icon: Sprout, mobile: true }, { to: '/alertas', key: 'alertas', icon: Bell }, { to: '/dispositivos', key: 'sondas', icon: Droplets }] },
  { id: 'planejar', items: [{ to: '/planejar', key: 'planejar', icon: CalendarDays }, { to: '/simulador', key: 'simulador', icon: SlidersHorizontal, mobile: true }, { to: '/field-shift', key: 'fieldShift', icon: Layers }] },
  { id: 'lavoura', items: [{ to: '/propriedades', key: 'propriedades', icon: MapPin }, { to: '/minha-area', key: 'minhaArea', icon: Radio }, { to: '/registros', key: 'registros', icon: Tractor, mobile: true }] },
  { id: 'ajuda', items: [{ to: '/ajuda', key: 'ajuda', icon: CircleHelp }] },
];
export const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function useActiveContext() {
  const plots = useStore((s) => s.plots); const props = useStore((s) => s.properties); const active = useStore((s) => s.activePlotId); const records = useStore((s) => s.records);
  const plot = plots.find((p) => p.id === active) ?? null; const property = plot ? props.find((p) => p.id === plot.propertyId) ?? null : null;
  const planting = plot ? [...records].filter((r) => r.plotId === plot.id && r.kind === 'plantio').sort((a, b) => b.event_at.localeCompare(a.event_at))[0] : undefined;
  return { plot, property, planting };
}

export function App({ authPage }: { authPage?: ReactNode } = {}) {
  const theme = usePrefs((p) => p.theme); const session = useStore((s) => s.session); const loc = useLocation(); const ctx = useActiveContext(); const { t, locale, failed, retry } = useI18n();
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  useEffect(() => { document.documentElement.dataset.theme = theme; document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'dark' ? '#0B1411' : '#F5F7F2'); }, [theme]);
  useEffect(() => { document.getElementById('conteudo')?.scrollTo?.(0, 0); }, [loc.pathname]);
  // Document title follows the visible h1 (and the section when they differ), so tabs and history are distinguishable (D-12).
  useEffect(() => {
    const main = document.getElementById('conteudo'); if (!main) return;
    const item = NAV.find((n) => loc.pathname.startsWith(n.to)); const section = item ? t(`nav.item.${item.key}`) : undefined;
    const apply = () => { const h = main.querySelector('h1')?.textContent?.trim(); document.title = [h, section && h && !h.startsWith(section) ? section : null, 'Gaiapus'].filter(Boolean).join(' · '); };
    apply(); const mo = new MutationObserver(apply); mo.observe(main, { subtree: true, childList: true, characterData: true }); return () => mo.disconnect();
  }, [loc.pathname, locale]); // eslint-disable-line
  // After a route change (not on first load, not on query-only changes) move focus to the new screen's h1 once it settles.
  const firstRoute = useRef(true);
  useEffect(() => {
    if (firstRoute.current) { firstRoute.current = false; return; }
    const main = document.getElementById('conteudo'); if (!main) return;
    let timer = 0; const focusH1 = () => { const h = main.querySelector<HTMLElement>('h1'); if (!h) return; h.tabIndex = -1; h.focus({ preventScroll: true }); };
    const settle = () => { clearTimeout(timer); timer = window.setTimeout(() => { mo.disconnect(); focusH1(); }, 150); };
    const mo = new MutationObserver(settle); mo.observe(main, { subtree: true, childList: true }); settle();
    const stop = setTimeout(() => mo.disconnect(), 5000); return () => { mo.disconnect(); clearTimeout(timer); clearTimeout(stop); };
  }, [loc.pathname]);
  useEffect(() => {
    // Navigation from a native email callback must leave the pathname auth page.
    if (authPage && window.location.hash.startsWith('#/')) window.location.replace('/' + window.location.hash);
  }, [authPage, loc.pathname, loc.search]);
  // Arquivos leves das telas em segundo plano (nunca o mapa nem o 3D); desligado com economia de dados.
  useEffect(() => { const w = window as any; let idle = 0; const t = setTimeout(() => { if (w.requestIdleCallback) idle = w.requestIdleCallback(preloadLightPages, { timeout: 4000 }); else preloadLightPages(); }, 3000); return () => { clearTimeout(t); if (idle) w.cancelIdleCallback?.(idle); }; }, []);
  return (
    <div className="app">
      <a className="skip" href="#conteudo" onClick={(e) => { e.preventDefault(); document.getElementById('conteudo')?.focus(); }}>{t('nav.skip')}</a>
      <header className="header">
        <Link to="/explorar" className="brand" aria-label={t('nav.home')} translate="no"><img className="brand__logo" src="/brand/gaiapus-logo-64.png" width={32} height={32} alt="" /><span>Gaiapus</span></Link>
        <div className="header__ctx">
          <Link to="/registros" className="ctx-btn" title={t('nav.ctx.openTitle')}><span className="sr-only">{t('nav.ctx.current')}</span>
            <Tractor size={18} aria-hidden />
            {ctx.plot ? <span><b>{ctx.property?.name}</b> · {ctx.plot.name}{ctx.planting ? ` · ${cropOptionLabel(ctx.planting.data.cultura ?? '')}${t('nav.ctx.season', { season: ctx.planting.cycleId.split(':')[1] })}` : t('nav.ctx.noPlanting')}</span> : <span><b>{t('nav.ctx.demo')}</b><span className="hide-sm">{t('nav.ctx.demoDetail')}</span></span>}<span className="sr-only">{t('nav.ctx.open')}</span>
          </Link>
        </div>
        <div className="header__end">
          <span className="hide-sm"><Pill>{t('common.edition', { year: EDITION.year })}</Pill></span>
          <span className="hide-sm"><Pill tone="warn">{t('nav.mode')}</Pill></span>
          <span className="hide-sm"><LanguageSelect /></span><span className="only-sm"><LanguageSelect compact id="idioma-curto" /></span>
          <button className="icon-btn" aria-label={theme === 'dark' ? t('nav.theme.toLight') : t('nav.theme.toDark')} onClick={() => setPrefs({ theme: theme === 'dark' ? 'light' : 'dark' })}>{theme === 'dark' ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}</button>
          <Link to="/conta" className="ctx-btn" aria-label={session ? t('nav.account.of', { name: session.name }) : t('nav.account.enterOrCreate')}><CircleUserRound size={20} aria-hidden /><span className="hide-sm">{session ? session.name : t('nav.account.enter')}</span></Link>
        </div>
      </header>
      {failed && <div className="explore__toast" role="status" style={{ position: 'fixed', zIndex: 60 }}>{t('lang.loadFailed')} <button className="btn btn--sm" onClick={() => void retry()}>{t('common.retry')}</button></div>}
      <nav className="rail" aria-label={t('nav.main')}>
        {NAV_GROUPS.map((g, i) => <div key={g.id} className="rail__group" role="group" aria-label={t(`nav.group.${g.id}`)}>{i > 0 && <hr />}{g.items.map((n) => <NavLink key={n.to} to={n.to} className={n.mobile ? '' : 'more-only'} onPointerEnter={() => preloadRoute(n.to)} onFocus={() => preloadRoute(n.to)} onTouchStart={() => preloadRoute(n.to)}><n.icon size={22} aria-hidden />{t(`nav.item.${n.key}`)}</NavLink>)}</div>)}
        <NavLink to="/mais" className="only-mobile"><Menu size={22} aria-hidden />{t('nav.more')}</NavLink>
      </nav>
      <main key={session?.userId ?? 'guest'} className="main" id="conteudo" tabIndex={-1}>
        <TourProvider auto={!authPage}>{authPage ?? <><TourBar /><Routes>
          <Route path="/" element={<Navigate to="/explorar" replace />} />
          <Route path="/explorar" element={<Explore />} />
          <Route path="/visao-geral" element={<Overview />} />
          <Route path="/municipio" element={<Municipality />} />
          <Route path="/planejar" element={<PlanPage />} />
          <Route path="/simulador" element={<Simulator />} />
          <Route path="/field-shift" element={<FieldShiftPage />} />
          <Route path="/registros" element={<Records />} />
          <Route path="/propriedades" element={<Properties />} />
          <Route path="/dispositivos" element={<Devices />} />
          <Route path="/minha-area" element={<MyArea />} />
          <Route path="/alertas" element={<Alerts />} />
          <Route path="/conta/*" element={<AccountPage />} />
          <Route path="/mais" element={<More />} />
          <Route path="/design-preview" element={<DesignPreview />} />
          <Route path="/ajuda" element={<Help />} />
          <Route path="/local" element={<LocationPage />} />
          <Route path="/relatorio" element={<SimulationReport />} />
          <Route path="*" element={<div className="page"><h1>{t('nav.notFound')}</h1><p><Link to="/explorar">{t('nav.backToExplorer')}</Link></p></div>} />
        </Routes></>}</TourProvider>
      </main>
    </div>
  );
}
