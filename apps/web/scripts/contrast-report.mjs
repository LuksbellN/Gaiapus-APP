// Prints the contrast of the token pairs in use, read from src/teammate/styles.css and src/teammate/map/palette.ts
// (the same pairs asserted by src/teammate/theme-tokens.test.ts). Usage (from apps/web): node scripts/contrast-report.mjs
// A ratio measures one pair of colours; it is not a statement about the whole interface.
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', 'src', 'teammate');
const css = readFileSync(path.join(root, 'styles.css'), 'utf8');
const tokens = (selector) => { const start = css.indexOf(`${selector} {`); const body = css.slice(start, css.indexOf('\n}', start)); return Object.fromEntries([...body.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()])); };
const parse = (c) => { const h = /^#([0-9a-f]{6})$/i.exec(c); if (h) return { rgb: [0, 2, 4].map((i) => parseInt(h[1].slice(i, i + 2), 16)), a: 1 }; const p = /^rgba?\(([^)]+)\)$/.exec(c)[1].split(/[\s,/]+/).filter(Boolean).map(Number); return { rgb: p.slice(0, 3), a: p[3] ?? 1 }; };
const over = (fg, bg) => { const f = parse(fg), b = parse(bg); return f.rgb.map((v, i) => v * f.a + b.rgb[i] * (1 - f.a)); };
const lum = (c) => { const [r, g, b] = (typeof c === 'string' ? parse(c).rgb : c).map((v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
const palette = readFileSync(path.join(root, 'map', 'palette.ts'), 'utf8');
const map = (theme) => { const body = palette.slice(palette.indexOf(`  ${theme}: {`), palette.indexOf('  },', palette.indexOf(`  ${theme}: {`))); const pick = (k) => new RegExp(`\\b${k}: (?:\\{ color: )?'(#[0-9A-Fa-f]{6})'`).exec(body)[1]; return new Proxy({}, { get: (_, k) => pick(String(k)) }); };

const rows = [];
for (const [name, t, m] of [['claro', tokens("[data-theme='light']"), map('light')], ['escuro', tokens(":root, [data-theme='dark']"), map('dark')]]) {
  const add = (label, fg, bg, target) => rows.push([name, label, fg, bg, contrast(over(fg, t['--surface']), over(bg, t['--surface'])), target]);
  add('texto / fundo', t['--text'], t['--bg'], 4.5); add('texto / painel', t['--text'], t['--surface'], 4.5); add('texto / superfície 2', t['--text'], t['--surface-2'], 4.5);
  add('texto auxiliar / fundo', t['--text-2'], t['--bg'], 4.5); add('texto auxiliar / painel', t['--text-2'], t['--surface'], 4.5); add('texto auxiliar / superfície 2', t['--text-2'], t['--surface-2'], 4.5);
  add('botão principal', t['--on-action'], t['--action'], 4.5); add('botão principal hover', t['--on-action'], t['--action-hover'], 4.5); add('botão principal pressionado (Pausar)', t['--on-action'], t['--action-active'], 4.5);
  add('seleção secundária: texto', t['--on-selected'], t['--selected'], 4.5); add('seleção secundária: texto auxiliar', t['--text-2'], t['--selected'], 4.5); add('seleção secundária: borda de ação', t['--action'], t['--selected'], 3);
  add('água / painel', t['--water'], t['--surface'], 4.5); add('atenção / painel', t['--warn'], t['--surface'], 4.5); add('risco / painel', t['--risk'], t['--surface'], 4.5); add('solo / painel', t['--soil'], t['--surface'], 4.5);
  for (const k of ['action', 'water', 'warn', 'risk', 'soil']) { add(`texto / tint-${k}`, t['--text'], t[`--tint-${k}`], 4.5); add(`texto auxiliar / tint-${k}`, t['--text-2'], t[`--tint-${k}`], 4.5); }
  add('borda de controle / painel', t['--border-strong'], t['--surface'], 3); add('borda de controle / fundo', t['--border-strong'], t['--bg'], 3); add('borda de controle / superfície 2', t['--border-strong'], t['--surface-2'], 3);
  add('foco / painel', t['--focus'], t['--surface'], 3); add('foco / fundo', t['--focus'], t['--bg'], 3); add('foco / seleção', t['--focus'], t['--selected'], 3); add('foco / halo (mapa e cena)', t['--focus'], t['--focus-halo'], 3);
  add('legenda da cena / placa', t['--scene-label-text'], t['--scene-label-bg'], 4.5);
  add('gráfico: chuva / painel', t['--water'], t['--surface'], 3); add('gráfico: halo / chuva', t['--chart-halo'], t['--water'], 3); add('gráfico: reserva A / halo', t['--text'], t['--chart-halo'], 3); add('gráfico: reserva B / halo', t['--warn'], t['--chart-halo'], 3); add('gráfico: cursor / halo', t['--action'], t['--chart-halo'], 3);
  add('mapa: costa / oceano', m.landLine, m.ocean, 3); add('mapa: costa / terra', m.landLine, m.land, 3); add('mapa: divisa estadual / país', m.stateLine, m.brazil, 3); add('mapa: limite municipal / com análise', m.munLine, m.covered, 3);
  add('mapa: contorno da seleção / área selecionada', m.selection, name === 'claro' ? m.selectedFill : m.brazil, 3); add('mapa: rótulo / halo', m.label, m.labelHalo, 4.5); add('mapa: rascunho de talhão / terra', m.draft, m.land, 3);
}
console.log('| Tema | Par | Frente | Fundo | Razão | Alvo | |\n| --- | --- | --- | --- | ---: | ---: | --- |');
for (const [theme, label, fg, bg, r, target] of rows) console.log(`| ${theme} | ${label} | ${fg} | ${bg} | ${r.toFixed(2)}:1 | ${target} | ${r >= target ? 'atinge' : 'abaixo'} |`);
console.log(`\n${rows.length} pares; abaixo do alvo: ${rows.filter((r) => r[4] < r[5]).length}`);
