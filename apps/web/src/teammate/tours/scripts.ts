// Declarative tutorial scripts (Docs/ux-preservacao/04, section 6). Anchors are data-tour attributes, never
// translated text or CSS selectors. Texts live in the catalogues under tour.<name>.s<n>.
export type TourName = 'explore' | 'overview' | 'municipality' | 'plan' | 'planning' | 'sim' | 'simUnavailable' | 'fs' | 'farm' | 'mon' | 'acc';
export type TourStep = {
  /** First anchor found is highlighted (e.g. map, or the country list without WebGL). */
  targets: string[];
  /** Another screen this step lives on; the tour opens it itself. */
  path?: string;
  /** Query the step needs on the same screen (e.g. a tab). Never changes the selected place. */
  query?: Record<string, string>;
  /** Steps on closed forms or signed-in blocks are skipped, not shown as missing (section 8). */
  skipWhenMissing?: boolean;
};
export type Tour = { id: string; name: TourName; path: string; steps: TourStep[] };

const s = (targets: string | string[], extra: Omit<TourStep, 'targets'> = {}): TourStep => ({ targets: Array.isArray(targets) ? targets : [targets], ...extra });

export const TOURS: Tour[] = [
  { id: 'explore@1', name: 'explore', path: '/explorar', steps: [s('explore-search'), s(['explore-map', 'explore-country-list']), s('explore-coverage'), s('explore-with-data'), s('explore-lists')] },
  { id: 'overview@1', name: 'overview', path: '/visao-geral', steps: [s('scope-strip'), s('overview-alert'), s('overview-days'), s('overview-actions')] },
  { id: 'municipality@1', name: 'municipality', path: '/municipio', steps: [s('mun-tabs'), s('mun-crop', { query: { aba: 'safra' } }), s('yield-card', { query: { aba: 'safra' } }), s('ndvi-chart', { query: { aba: 'imagem' } })] },
  { id: 'plan@1', name: 'plan', path: '/planejar', steps: [s('plan-place'), s('plan-form'), s('plan-dates'), s('plan-eco'), s('plan-save')] },
  { id: 'planning@1', name: 'planning', path: '/simulador', steps: [s('plan-where'), s('plan-member', { skipWhenMissing: true }), s('plan-timeline', { skipWhenMissing: true }), s('plan-compare', { skipWhenMissing: true })] },
  { id: 'simulator@1', name: 'sim', path: '/simulador', steps: [s('sim-mode'), s('sim-year', { skipWhenMissing: true }), s('sim-timeline'), s('sim-ab'), s('sim-limits')] },
  { id: 'simulator-unavailable@1', name: 'simUnavailable', path: '/simulador', steps: [s('sim-missing')] },
  { id: 'fieldShift@1', name: 'fs', path: '/field-shift', steps: [s('fs-question'), s('fs-year'), s('fs-table'), s('fs-limits')] },
  { id: 'farm@1', name: 'farm', path: '/propriedades', steps: [s('farm-local'), s('farm-property-form'), s('records-kinds', { path: '/registros' }), s('record-draft', { path: '/registros', skipWhenMissing: true }), s('record-save', { path: '/registros', skipWhenMissing: true })] },
  { id: 'monitoring@1', name: 'mon', path: '/dispositivos', steps: [s('devices-synthetic'), s('device-card'), s('alert-card', { path: '/alertas' })] },
  { id: 'account@1', name: 'acc', path: '/conta', steps: [s(['account-local', 'account-sign']), s('account-export', { skipWhenMissing: true }), s('account-consent', { skipWhenMissing: true })] },
];

export const tourById = (id: string) => TOURS.find((t) => t.id === id);

/** Tour offered on a screen. The simulator has a one-step tour for the "no compatible series" state. */
export function tourForPath(pathname: string, doc: Document = document): Tour | undefined {
  if (pathname === '/simulador') return tourById(doc.querySelector('[data-tour="plan-where"]') ? 'planning@1' : doc.querySelector('[data-tour="sim-missing"]') ? 'simulator-unavailable@1' : 'simulator@1');
  return TOURS.find((t) => t.path === pathname && t.id !== 'simulator-unavailable@1' && t.id !== 'planning@1');
}
