import { useEffect, useRef, type ReactNode } from 'react';
import { NavLink, Navigate, Route, Routes, Link, useLocation } from 'react-router-dom';
import { Bell, CalendarDays, CircleUserRound, CloudRain, Droplets, Globe, Layers, Menu, Moon, SlidersHorizontal, Sprout, Sun, Tractor } from 'lucide-react';
import { EDITION, MODE } from './config';
import { useStore } from './store';
import { setPrefs, usePrefs } from './prefs';
import { Pill } from './ui';
import { lazyPage, preloadLightPages, preloadRoute } from './lazyPage';
import { More } from './pages/More';

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
const Devices = lazyPage('/dispositivos', () => import('./pages/Devices'), 'Devices');
const Alerts = lazyPage('/alertas', () => import('./pages/Devices'), 'Alerts');
const DesignPreview = lazyPage(null, () => import('./pages/DesignPreview'), 'DesignPreview');

export const NAV = [
  { to: '/explorar', label: 'Explorar', icon: Globe, mobile: true },
  { to: '/visao-geral', label: 'Visão geral', icon: Sprout, mobile: true },
  { to: '/municipio', label: 'Município', icon: CloudRain },
  { to: '/planejar', label: 'Planejar', icon: CalendarDays },
  { to: '/simulador', label: 'Simulador', icon: SlidersHorizontal, mobile: true },
  { to: '/field-shift', label: 'Field Shift', icon: Layers },
  { to: '/registros', label: 'Registros', icon: Tractor, mobile: true, sep: true },
  { to: '/dispositivos', label: 'Sondas', icon: Droplets },
  { to: '/alertas', label: 'Alertas', icon: Bell },
] as const;

export function useActiveContext() {
  const plots = useStore((s) => s.plots); const props = useStore((s) => s.properties); const active = useStore((s) => s.activePlotId); const records = useStore((s) => s.records);
  const plot = plots.find((p) => p.id === active) ?? null; const property = plot ? props.find((p) => p.id === plot.propertyId) ?? null : null;
  const planting = plot ? [...records].filter((r) => r.plotId === plot.id && r.kind === 'plantio').sort((a, b) => b.event_at.localeCompare(a.event_at))[0] : undefined;
  return { plot, property, planting };
}

export function App({ authPage }: { authPage?: ReactNode } = {}) {
  const theme = usePrefs((p) => p.theme); const session = useStore((s) => s.session); const loc = useLocation(); const ctx = useActiveContext();
  useEffect(() => { document.documentElement.dataset.theme = theme; document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'dark' ? '#0B1411' : '#F5F7F2'); }, [theme]);
  useEffect(() => { document.getElementById('conteudo')?.scrollTo?.(0, 0); }, [loc.pathname]);
  // Document title follows the visible h1 (and the section when they differ), so tabs and history are distinguishable (D-12).
  useEffect(() => {
    const main = document.getElementById('conteudo'); if (!main) return;
    const section = NAV.find((n) => loc.pathname.startsWith(n.to))?.label;
    const apply = () => { const h = main.querySelector('h1')?.textContent?.trim(); document.title = [h, section && h && !h.startsWith(section) ? section : null, 'Gaiapus'].filter(Boolean).join(' · '); };
    apply(); const mo = new MutationObserver(apply); mo.observe(main, { subtree: true, childList: true, characterData: true }); return () => mo.disconnect();
  }, [loc.pathname]);
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
      <a className="skip" href="#conteudo" onClick={(e) => { e.preventDefault(); document.getElementById('conteudo')?.focus(); }}>Pular para o conteúdo</a>
      <header className="header">
        <Link to="/explorar" className="brand" aria-label="Gaiapus — início" translate="no"><Sprout size={26} aria-hidden /><span>Gaiapus</span></Link>
        <div className="header__ctx">
          <Link to="/registros" className="ctx-btn" title="Abrir registros"><span className="sr-only">Contexto atual: </span>
            <Tractor size={18} aria-hidden />
            {ctx.plot ? <span><b>{ctx.property?.name}</b> · {ctx.plot.name}{ctx.planting ? ` · ${ctx.planting.data.cultura} · safra ${ctx.planting.cycleId.split(':')[1]}` : ' · sem plantio registrado'}</span> : <span><b>Demonstração</b><span className="hide-sm"> · Sorriso, MT · soja · sem propriedade cadastrada</span></span>}<span className="sr-only"> — abrir registros</span>
          </Link>
        </div>
        <div className="header__end">
          <span className="hide-sm"><Pill>Edição {EDITION.year}</Pill></span>
          <span className="hide-sm"><Pill tone="warn">{MODE.label}</Pill></span>
          <button className="icon-btn" aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'} onClick={() => setPrefs({ theme: theme === 'dark' ? 'light' : 'dark' })}>{theme === 'dark' ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}</button>
          <Link to="/conta" className="ctx-btn" aria-label={session ? `Conta de ${session.name}` : 'Entrar ou criar conta'}><CircleUserRound size={20} aria-hidden /><span className="hide-sm">{session ? session.name : 'Entrar'}</span></Link>
        </div>
      </header>
      <nav className="rail" aria-label="Principal">
        {NAV.map((n) => <span key={n.to} style={{ display: 'contents' }}>{'sep' in n && <hr />}<NavLink to={n.to} className={'mobile' in n ? '' : 'more-only'} onPointerEnter={() => preloadRoute(n.to)} onFocus={() => preloadRoute(n.to)} onTouchStart={() => preloadRoute(n.to)}><n.icon size={22} aria-hidden />{n.label}</NavLink></span>)}
        <NavLink to="/mais" className="only-mobile"><Menu size={22} aria-hidden />Mais</NavLink>
      </nav>
      <main key={session?.userId ?? 'guest'} className="main" id="conteudo" tabIndex={-1}>
        {authPage ?? <Routes>
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
          <Route path="/alertas" element={<Alerts />} />
          <Route path="/conta/*" element={<AccountPage />} />
          <Route path="/mais" element={<More />} />
          <Route path="/design-preview" element={<DesignPreview />} />
          <Route path="*" element={<div className="page"><h1>Página não encontrada</h1><p><Link to="/explorar">Voltar ao explorador</Link></p></div>} />
        </Routes>}
      </main>
    </div>
  );
}
