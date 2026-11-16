// Living reference of the visual language. Colours and contrast are READ from the stylesheet in use (never typed
// here), for both themes at once: each sample block carries its own `data-theme`, so the tokens resolve per block
// whatever theme is active. The crop board at the end is a demonstration sheet (see ui/CropBoard.tsx).
import { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { CloudRain, Droplets, Pause, Play, Sprout } from 'lucide-react';
import { EDITION } from '../config';
import { contrast, over, parseColor } from '../contrast';
import { n2 } from '../format';
import { useI18n, type MessageKey } from '../i18n';
import type { Theme } from '../prefs';
import { Empty, Field, LinkBtn, Loading, Notice, Pill, Seg, Stat, TabPanel, Tabs } from '../ui';
import { CropBoard } from '../ui/CropBoard';

const SWATCHES: [string, string][] = [['bg', '--bg'], ['surface', '--surface'], ['text', '--text'], ['text2', '--text-2'], ['action', '--action'], ['water', '--water'], ['warn', '--warn'], ['risk', '--risk'], ['soil', '--soil']];
// [label key, foreground token, background token, target]
const PAIRS: [string, string, string, number][] = [
  ['textBg', '--text', '--bg', 4.5], ['textSurface', '--text', '--surface', 4.5], ['text2Bg', '--text-2', '--bg', 4.5], ['text2Surface', '--text-2', '--surface', 4.5],
  ['primary', '--on-action', '--action', 4.5], ['primaryHover', '--on-action', '--action-hover', 4.5], ['primaryPressed', '--on-action', '--action-active', 4.5], ['selected', '--on-selected', '--selected', 4.5],
  ['water', '--water', '--surface', 4.5], ['warn', '--warn', '--surface', 4.5], ['risk', '--risk', '--surface', 4.5], ['soil', '--soil', '--surface', 4.5],
  ['focus', '--focus', '--surface', 3], ['focusHalo', '--focus', '--focus-halo', 3], ['control', '--border-strong', '--surface', 3], ['caption', '--scene-label-text', '--scene-label-bg', 4.5],
];

/** One theme, self-contained: swatches, measured pairs and the states that used to break (pressed primary, selection). */
function ThemeSample({ theme }: { theme: Theme }) {
  const { t } = useI18n(); const ref = useRef<HTMLDivElement>(null); const [tokens, setTokens] = useState<Record<string, string>>({}); const [option, setOption] = useState<'a' | 'b'>('a');
  useLayoutEffect(() => { const el = ref.current; if (!el) return; const cs = getComputedStyle(el); const out: Record<string, string> = {}; for (const name of new Set([...SWATCHES.map((s) => s[1]), ...PAIRS.flatMap((p) => [p[1], p[2]])])) out[name] = cs.getPropertyValue(name).trim(); setTokens(out); }, [theme]);
  const ratio = (fg: string, bg: string) => { const f = tokens[fg], b = tokens[bg], s = tokens['--surface']; if (!f || !b || !s || !parseColor(f) || !parseColor(b) || !parseColor(s)) return null; return contrast(over(f, s), over(b, s)); };
  return <div ref={ref} data-theme={theme} className="theme-sample" data-testid={`theme-sample-${theme}`}>
    <h3>{t(theme === 'dark' ? 'designPreview.themeDark' : 'designPreview.themeLight')}</h3>
    <div className="theme-sample__swatches">{SWATCHES.map(([key, token]) => <span key={key} className="legend-item"><i className="swatch" style={{ background: `var(${token})`, border: '1px solid var(--border-strong)', width: 28, height: 18 }} /><span>{t(`designPreview.token.${key}` as MessageKey)} <span className="meta-13">{tokens[token]}</span></span></span>)}</div>
    <div className="row">
      <button type="button" className="btn btn--primary"><Play size={18} aria-hidden />{t('designPreview.statePlay')}</button>
      <button type="button" className="btn btn--primary" aria-pressed="true" data-testid={`pressed-${theme}`}><Pause size={18} aria-hidden />{t('designPreview.statePressed')}</button>
      <button type="button" className="btn">{t('designPreview.secondary')}</button>
      <button type="button" className="btn" aria-pressed="true">{t('designPreview.stateSelected')}</button>
      <button type="button" className="btn" disabled>{t('designPreview.disabled')}</button>
    </div>
    <Seg legend={t('designPreview.stateGroup')} name={`sample-${theme}`} value={option} onChange={setOption} options={[{ value: 'a', label: `${t('designPreview.stateOption')} A` }, { value: 'b', label: `${t('designPreview.stateOption')} B` }]} />
    <div className="row"><Pill tone="water">{t('kind.forecast')}</Pill><Pill tone="soil">{t('kind.historical')}</Pill><Pill tone="warn">{t('kind.historicalSim')}</Pill><Pill tone="ok">{t('designPreview.enoughWater')}</Pill><Pill tone="risk">{t('devices.fault')}</Pill></div>
    <div className="table-wrap" tabIndex={0} role="group" aria-label={t('common.tableScroll')}><table><thead><tr><th>{t('designPreview.pair')}</th><th className="num">{t('designPreview.ratio')}</th><th className="num">{t('designPreview.target')}</th></tr></thead>
      <tbody>{PAIRS.map(([key, fg, bg, target]) => { const r = ratio(fg, bg); return <tr key={key} data-pair={key} data-ratio={r == null ? '' : r.toFixed(2)}><td>{t(`designPreview.pairs.${key}` as MessageKey)}</td><td className="num">{r == null ? '—' : `${n2(r)}:1`}</td><td className="num">{`≥ ${target.toLocaleString(undefined, { maximumFractionDigits: 1 })}:1`}</td></tr>; })}</tbody></table></div>
  </div>;
}

export function DesignPreview() {
  const { t } = useI18n();
  const [tab, setTab] = useState<'clima' | 'agua' | 'safra'>('clima'); const [fonts, setFonts] = useState<string | null>(null);
  useEffect(() => { void document.fonts.ready.then(() => { const ok = (f: string) => (document.fonts.check(f) ? 'loaded' : 'missing'); setFonts(`${ok('600 20px "Bricolage Grotesque"')}|${ok('400 16px "Source Sans 3"')}`); }); }, []);
  const fontState = (s: string) => t(s === 'loaded' ? 'designPreview.fontLoaded' : 'designPreview.fontMissing');
  const [display, body] = fonts?.split('|') ?? [];
  return <div className="page"><div className="page-head"><div className="stack-2"><h1>{t('designPreview.title')}</h1><p>{t('designPreview.subtitle', { year: EDITION.year })}</p></div></div>
    <section className="card"><h2>{t('designPreview.screens')}</h2><div className="row"><LinkBtn primary to="/explorar?pais=BR&uf=31">{t('designPreview.screenExplore')}</LinkBtn><LinkBtn to="/visao-geral">{t('designPreview.screenOverview')}</LinkBtn><LinkBtn to="/simulador">{t('nav.item.simulador')}</LinkBtn></div></section>
    <section className="card"><h2>{t('designPreview.colors')}</h2><p className="meta">{t('designPreview.statesNote')}</p>
      <div className="grid-2"><ThemeSample theme="light" /><ThemeSample theme="dark" /></div>
      <p className="meta-13">{t('designPreview.contrastNote')}</p></section>
    <div className="grid-2"><section className="card"><h2>{t('designPreview.type')}</h2><p style={{ font: '600 28px var(--font-display)' }}>Sorriso, Mato Grosso</p><h2>{t('designPreview.token.waterReserve')}</h2><p>{t('designPreview.bodySample')}</p><p className="meta">{t('designPreview.metaSample')}</p><p className="num" style={{ textAlign: 'left' }}>1 234,5 mm · 3 554 kg/ha · 47%</p><p className="meta-13" data-testid="fonts">{fonts ? `Bricolage Grotesque 600: ${fontState(display)} · Source Sans 3 400: ${fontState(body)}` : t('designPreview.checking')}</p></section>
      <section className="card"><h2>{t('designPreview.controls')}</h2><div className="row"><button className="btn btn--primary"><Sprout size={18} aria-hidden />{t('designPreview.primary')}</button><button className="btn">{t('designPreview.secondary')}</button><button className="btn" disabled>{t('designPreview.disabled')}</button><button className="btn btn--danger">{t('records.delete')}</button></div><div className="row"><Pill tone="water">{t('kind.forecast')}</Pill><Pill tone="soil">{t('kind.historical')}</Pill><Pill tone="warn">{t('kind.historicalSim')}</Pill><Pill tone="ok">{t('designPreview.enoughWater')}</Pill><Pill tone="risk">{t('devices.fault')}</Pill><Pill>{t('source.fixture')}</Pill></div>
        <Field label={t('designPreview.areaLabel')} error={t('designPreview.areaError')}>{(a) => <input className="input" {...a} defaultValue="abc" />}</Field><Field label={t('designPreview.munLabel')} hint={t('designPreview.munHint')}>{(a) => <input className="input" {...a} placeholder="Sorriso" />}</Field></section></div>
    <section className="card"><h2>{t('designPreview.tabs')}</h2><Tabs label={t('designPreview.example')} value={tab} onChange={setTab} tabs={[{ id: 'clima', label: t('designPreview.tabClimate'), icon: <CloudRain size={18} aria-hidden /> }, { id: 'agua', label: t('designPreview.tabWater'), icon: <Droplets size={18} aria-hidden /> }, { id: 'safra', label: t('designPreview.tabSeason'), icon: <Sprout size={18} aria-hidden /> }]} /><TabPanel id={tab}><p className="meta">{t('designPreview.tabsNote')}</p></TabPanel></section>
    <div className="grid-3"><section className="card"><h3>{t('designPreview.loading')}</h3><Loading /></section><section className="card"><h3>{t('designPreview.empty')}</h3><Empty title={t('designPreview.emptyTitle')}>{t('designPreview.emptyText')}</Empty></section><section className="card"><h3>{t('designPreview.notices')}</h3><Notice>{t('designPreview.noticeInfo')}</Notice><Notice tone="warn" title={t('designPreview.noticeWarnTitle')}>{t('designPreview.noticeWarn')}</Notice><Notice tone="risk" title={t('designPreview.noticeRiskTitle')}>{t('errors.genericTitle')}</Notice></section></div>
    <section className="card"><h2>{t('designPreview.numbers')}</h2><div className="grid-3"><Stat label={t('designPreview.token.waterReserve')} value="47%" unit={t('designPreview.statReserveUnit')} /><Stat label={t('designPreview.statRain')} value="136" unit={t('designPreview.statRainUnit')} /><Stat label={t('designPreview.statCover')} value="+115" unit={t('fieldShift.stat.perYear')} note="235 → 350" /></div></section>
    <CropBoard /></div>;
}
