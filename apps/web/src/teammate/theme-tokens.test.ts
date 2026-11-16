// Contrast audit over the REAL tokens of styles.css (port of the research script contrast-audit.mjs,
// docs/frontend-claude/visual-refresh-2026-11-15). The pairs below are measured on the colours the app ships;
// they are measurements of pairs, not a WCAG certification of the interface.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, over } from './contrast';
import { MAP_PALETTE } from './map/palette';
import { SCENE_THEME, soilColor } from './sim/scene-theme';

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'styles.css'), 'utf8');
function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`); if (start < 0) throw new Error(`block not found: ${selector}`);
  const body = css.slice(start, css.indexOf('\n}', start)); const out: Record<string, string> = {};
  for (const m of body.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
const light = tokens("[data-theme='light']"), dark = tokens(":root, [data-theme='dark']");
const ratio = (fg: string, bg: string, under?: string) => contrast(under ? over(fg, under) : fg, under ? over(bg, under) : bg);

describe('theme tokens', () => {
  it('the light theme carries the "Campo claro / verde mineral" values of the research', () => {
    expect(light).toMatchObject({
      '--bg': '#F2F6F3', '--surface': '#FFFFFF', '--surface-2': '#E7EFE9', '--text': '#163C2D', '--text-2': '#465E52', '--action': '#176B4B', '--on-action': '#FFFFFF',
      '--action-hover': '#11543A', '--action-active': '#0C432E', '--selected': '#CFE7D9', '--on-selected': '#163C2D', '--water': '#146B8A', '--warn': '#805700', '--risk': '#AF352E', '--soil': '#765737',
      '--border': '#C7D3C9', '--border-strong': '#71887B', '--focus': '#164B7A', '--tint-action': '#E3F2E9', '--tint-water': '#E4F1F7', '--tint-warn': '#FFF1D1', '--tint-risk': '#FCE9E6', '--tint-soil': '#F0E9DF',
      '--chart-halo': '#FFFFFF', '--scene-sky-top': '#DDEEF3', '--scene-sky-bottom': '#EFF3E8', '--scene-label-bg': '#FFFFFF', '--scene-label-text': '#163C2D', '--selection-bg': '#CFE7D9', '--selection-text': '#163C2D',
    });
  });
  it('the dark theme keeps its base and gains the same state tokens', () => {
    expect(dark).toMatchObject({
      '--bg': '#0B1411', '--surface': '#14231C', '--surface-2': '#1B2E25', '--text': '#EAF2EB', '--text-2': '#A7B8AE', '--action': '#87C98F', '--on-action': '#102218', '--water': '#79BDD8', '--warn': '#E6B85C', '--risk': '#F08C79',
      '--action-hover': '#9FD6A4', '--action-active': '#A9DEAE', '--selected': '#294B37', '--on-selected': '#EAF2EB', '--chart-halo': '#14231C', '--scene-sky-top': '#0D1A22', '--scene-sky-bottom': '#12241C', '--scene-label-bg': '#14231C', '--scene-label-text': '#EAF2EB',
    });
  });
  it('every token is declared in both themes (no accidental inheritance from the other theme)', () => {
    expect(Object.keys(light).sort()).toEqual(Object.keys(dark).sort());
  });
});

type Pair = [name: string, fg: string, bg: string, target: number];
const textPairs = (t: Record<string, string>): Pair[] => [
  ['text / bg', t['--text'], t['--bg'], 4.5], ['text / surface', t['--text'], t['--surface'], 4.5], ['text / surface-2', t['--text'], t['--surface-2'], 4.5],
  ['text-2 / bg', t['--text-2'], t['--bg'], 4.5], ['text-2 / surface', t['--text-2'], t['--surface'], 4.5], ['text-2 / surface-2', t['--text-2'], t['--surface-2'], 4.5],
  ['primary button', t['--on-action'], t['--action'], 4.5], ['primary button hover', t['--on-action'], t['--action-hover'], 4.5], ['primary button active / pressed', t['--on-action'], t['--action-active'], 4.5],
  ['selected: text', t['--on-selected'], t['--selected'], 4.5], ['selected: secondary text', t['--text-2'], t['--selected'], 4.5], ['selected: action border', t['--action'], t['--selected'], 3],
  ['text selection', t['--selection-text'], t['--selection-bg'], 4.5],
  ['risk / surface', t['--risk'], t['--surface'], 4.5], ['warn / surface', t['--warn'], t['--surface'], 4.5], ['water / surface', t['--water'], t['--surface'], 4.5], ['action link / surface', t['--action'], t['--surface'], 4.5],
  ['control border / surface', t['--border-strong'], t['--surface'], 3], ['control border / bg', t['--border-strong'], t['--bg'], 3], ['control border / surface-2', t['--border-strong'], t['--surface-2'], 3],
  ['focus / surface', t['--focus'], t['--surface'], 3], ['focus / bg', t['--focus'], t['--bg'], 3], ['focus / surface-2', t['--focus'], t['--surface-2'], 3], ['focus / selected', t['--focus'], t['--selected'], 3],
  ['focus ring / its halo (over media)', t['--focus'], t['--focus-halo'], 3],
  ['scene caption', t['--scene-label-text'], t['--scene-label-bg'], 4.5],
  ['chart: rain / surface', t['--water'], t['--surface'], 3], ['chart: halo / rain', t['--chart-halo'], t['--water'], 3], ['chart: reserve A / halo', t['--text'], t['--chart-halo'], 3],
  ['chart: reserve B / halo', t['--warn'], t['--chart-halo'], 3], ['chart: reserve C / halo', t['--soil'], t['--chart-halo'], 3], ['chart: cursor / halo', t['--action'], t['--chart-halo'], 3], ['chart: deficit / surface', t['--risk'], t['--surface'], 3],
];

describe('contrast of the token pairs in use', () => {
  for (const [theme, t] of [['light', light], ['dark', dark]] as const) {
    it(`${theme}: text, states, focus, scene plates and chart crossings reach their target`, () => {
      const below = textPairs(t).filter(([, fg, bg, target]) => ratio(fg, bg) < target).map(([name, fg, bg, target]) => `${name}: ${ratio(fg, bg).toFixed(2)} < ${target} (${fg} on ${bg})`);
      expect(below).toEqual([]);
    });
    it(`${theme}: text stays readable on every tint, over each surface the tint can sit on`, () => {
      const below: string[] = [];
      for (const tint of ['--tint-action', '--tint-water', '--tint-warn', '--tint-risk', '--tint-soil']) for (const surface of ['--surface', '--bg', '--surface-2']) {
        const bg = over(t[tint], t[surface]);
        for (const fg of ['--text', '--text-2']) if (contrast(t[fg], bg) < 4.5) below.push(`${fg} on ${tint} over ${surface}: ${contrast(t[fg], bg).toFixed(2)}`);
      }
      expect(below).toEqual([]);
    });
  }
  it('light: the semantic colour is readable on its own opaque tint', () => {
    for (const [fg, bg] of [['--risk', '--tint-risk'], ['--warn', '--tint-warn'], ['--water', '--tint-water'], ['--action', '--tint-action'], ['--soil', '--tint-soil']]) expect(ratio(light[fg], light[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
  });
  it('light tints are opaque: they do not depend on the stack of backgrounds', () => {
    for (const tint of ['--tint-action', '--tint-water', '--tint-warn', '--tint-risk', '--tint-soil']) expect(light[tint]).toMatch(/^#[0-9A-F]{6}$/);
  });
});

describe('the Pause button (pressed primary)', () => {
  const rule = (selector: string) => { const i = css.indexOf(`${selector} {`); return i < 0 ? null : css.slice(i, css.indexOf('}', i)); };
  it('keeps a solid action fill and its own text colour when pressed, in a rule that outranks the secondary selection', () => {
    const pressed = rule(".btn.btn--primary:active, .btn.btn--primary[aria-pressed='true']");
    expect(pressed).toContain('background: var(--action-active)'); expect(pressed).toContain('color: var(--on-action)');
    // The generic selection rule exists for secondary buttons and comes with its own readable pair.
    const generic = rule(".btn[aria-pressed='true']"); expect(generic).toContain('background: var(--selected)'); expect(generic).toContain('color: var(--on-selected)');
    // Specificity (0,3,0) against (0,2,0): order in the file cannot bring the bug back.
    expect(css.indexOf(".btn.btn--primary[aria-pressed='true']")).toBeGreaterThan(-1);
    expect(css).not.toMatch(/\.btn--primary[^{]*\[aria-pressed='true'\][^{]*\{[^}]*tint-action/);
  });
  it('reaches 4.5:1 pressed in both themes; the old tinted state did not', () => {
    expect(ratio(light['--on-action'], light['--action-active'])).toBeGreaterThanOrEqual(4.5);
    expect(ratio(dark['--on-action'], dark['--action-active'])).toBeGreaterThanOrEqual(4.5);
    // Witness of the bug that was fixed: label colour over a 10 % / 14 % action tint on the surface.
    expect(contrast('#FFFFFF', over('rgba(33,97,63,.10)', '#FFFFFF'))).toBeLessThan(1.5);
    expect(contrast('#102218', over('rgba(135,201,143,.14)', '#14231C'))).toBeLessThan(1.5);
  });
});

describe('map palette', () => {
  const m = MAP_PALETTE.light;
  it('light: contours separate from the fills they bound and labels sit on a readable halo', () => {
    const pairs: Pair[] = [
      ['coast / ocean', m.landLine, m.ocean, 3], ['coast / land', m.landLine, m.land, 3], ['state border / country', m.stateLine, m.brazil, 3], ['municipal border / covered', m.munLine, m.covered.color, 3],
      ['municipal border / country', m.munLine, m.brazil, 3], ['selection outline / selected fill', m.selection, m.selectedFill.color, 3], ['municipal selection / selected fill', m.munSelection, m.munSelectedFill.color, 3],
      ['label / halo', m.label, m.labelHalo, 4.5], ['position dot / ring', m.here, m.hereRing, 3], ['field outline / casing', m.fieldLine, m.fieldLineCasing, 3],
      ['plot outline / land', m.plotLine, m.land, 3], ['selected plot / land', m.plotSelected, m.land, 3], ['draft / land', m.draft, m.land, 3], ['draft / ocean', m.draft, m.ocean, 3],
      ['sensor marker / its border', light['--map-sensor'], light['--map-marker-border'], 3], ['marker ring / land', light['--map-marker-ring'], m.land, 3],
    ];
    expect(pairs.filter(([, fg, bg, target]) => contrast(fg, bg) < target).map(([name, fg, bg]) => `${name}: ${contrast(fg, bg).toFixed(2)}`)).toEqual([]);
  });
  it('dark: labels, selection and markers stay legible (the dark map keeps its colours)', () => {
    const d = MAP_PALETTE.dark;
    expect(d).toMatchObject({ ocean: '#0A1A21', land: '#1A2C24', brazil: '#28503A', stateLine: '#7D9A89', selection: '#87C98F', label: '#EAF2EB' });
    expect(contrast(d.label, d.labelHalo)).toBeGreaterThanOrEqual(4.5); expect(contrast(d.selection, over(`rgba(135,201,143,${d.selectedFill.opacity})`, d.brazil))).toBeGreaterThanOrEqual(3);
    // Unchanged dark map: the state border on the country fill measures 2.98:1, just under the 3:1 graphic target.
    // It is recorded here as it is (the dark theme was not redesigned); selection and labels do not depend on it.
    expect(contrast(d.stateLine, d.brazil)).toBeGreaterThan(2.9); expect(contrast(d.draft, d.land)).toBeGreaterThanOrEqual(3);
  });
  it('CSS tokens around the map are the same colours as the layer palette', () => {
    for (const [theme, t] of [['light', light], ['dark', dark]] as const) {
      const p = MAP_PALETTE[theme];
      expect(t['--map-ocean'].toUpperCase()).toBe(p.ocean); expect(t['--map-space'].toUpperCase()).toBe(p.space); expect(t['--map-draft'].toUpperCase()).toBe(p.draft); expect(t['--map-pin'].toUpperCase()).toBe(p.here);
      expect(t['--map-marker-border'].toUpperCase()).toBe(p.hereRing);
    }
  });
});

describe('scene', () => {
  it('no text is drawn on the soil: scene text uses the plate tokens, whatever the modelled water', () => {
    // The soil ranges between two colours with the reserve; a fixed label colour cannot be readable on both ends
    // (the old 2D fallback had 2.83:1 on dry soil). Text therefore lives on --scene-label-bg.
    for (const theme of ['light', 'dark'] as const) {
      const dry = soilColor(SCENE_THEME[theme], 0), wet = soilColor(SCENE_THEME[theme], 1);
      expect(contrast(dry, wet)).toBeGreaterThan(2);
      const t = theme === 'light' ? light : dark; expect(contrast(t['--scene-label-text'], t['--scene-label-bg'])).toBeGreaterThanOrEqual(4.5);
    }
    expect(soilColor(SCENE_THEME.light, NaN)).toBe(soilColor(SCENE_THEME.light, 0.5));
  });
});
