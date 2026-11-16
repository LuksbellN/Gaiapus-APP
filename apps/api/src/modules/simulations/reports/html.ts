// Standalone HTML export of a report document: one self-contained, printable file. Everything that comes from data
// is escaped; there is no script, no link, no remote resource and no inline style attribute, so the document can be
// served under a strict Content-Security-Policy. Charts are inline SVG and every chart has its table.
import { createHash } from 'node:crypto';
import type { ReportBlock, ReportChart, ReportDocument, ReportTable } from '@gaiapus/contracts';
import type { Span } from './messages/index.js';

const ENTITIES: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ENTITIES[c]!);
const LANG = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

// System colours only (Canvas, CanvasText): readable in light and dark, and plain black on white when printed.
export const REPORT_CSS = `:root{color-scheme:light dark}
body{margin:0;background:Canvas;color:CanvasText;font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:62rem;margin:0 auto;padding:1.5rem 1rem 3rem}
h1{font-size:1.6rem;line-height:1.25;margin:0 0 .25rem}h2{font-size:1.25rem;margin:2rem 0 .75rem;padding-top:.75rem;border-top:2px solid}h3{font-size:1.05rem;margin:1.5rem 0 .5rem}
p{margin:.5rem 0}.subtitle{margin:0 0 1rem;font-weight:600}.note,.warning{padding:.5rem .75rem;border-inline-start:4px solid}.warning{border-inline-start-style:double;border-inline-start-width:6px;font-weight:600}
dl{margin:.5rem 0}dl>div{display:grid;grid-template-columns:minmax(10rem,18rem) 1fr;gap:.25rem 1rem;padding:.3rem 0;border-bottom:1px solid;border-color:GrayText}dt{font-weight:600}dd{margin:0;overflow-wrap:anywhere}
.table-wrap{overflow-x:auto;margin:1rem 0}table{border-collapse:collapse;width:100%}caption{text-align:start;font-weight:600;padding:.25rem 0}
th,td{border:1px solid GrayText;padding:.3rem .5rem;text-align:start;vertical-align:top}td.num,th.num{text-align:end;font-variant-numeric:tabular-nums;white-space:nowrap}thead th{border-bottom-width:2px}
.table-notes{margin:.5rem 0 0;padding-inline-start:1.25rem;font-size:.92rem}code{font-family:ui-monospace,Consolas,monospace;font-size:.92em;overflow-wrap:anywhere}
figure{margin:1rem 0}figcaption{font-weight:600;margin-bottom:.25rem}svg{display:block;width:100%;height:auto;max-width:56rem}
.legend{list-style:none;display:flex;flex-wrap:wrap;gap:.25rem 1.25rem;margin:.25rem 0;padding:0;font-size:.92rem}.legend li{display:flex;align-items:center;gap:.4rem}.legend svg{width:2.5rem;height:.9rem;flex:none}
blockquote{margin:.25rem 0;padding:.25rem .75rem;border-inline-start:4px solid GrayText}footer{margin-top:2.5rem;padding-top:.75rem;border-top:1px solid;font-size:.92rem}
@media (max-width:40rem){dl>div{grid-template-columns:1fr}}
@media print{@page{margin:16mm}body{font-size:11pt}main{max-width:none;padding:0}h2,h3,figcaption,caption{break-after:avoid}tr,figure,dl>div,blockquote,.note,.warning{break-inside:avoid}thead{display:table-header-group}.table-wrap{overflow:visible}}`;
/** Hash of the embedded stylesheet, for a Content-Security-Policy without 'unsafe-inline'. */
export const REPORT_CSS_SHA256 = createHash('sha256').update(REPORT_CSS).digest('base64');

export function spansToHtml(spans: readonly Span[]): string {
  return spans.map(span => {
    let html = escapeHtml(span.text);
    if (span.style === 'strong') html = `<strong>${html}</strong>`;
    else if (span.style === 'em') html = `<em>${html}</em>`;
    else if (span.style === 'code') html = `<code translate="no">${html}</code>`;
    return span.lang && LANG.test(span.lang) ? `<span lang="${escapeHtml(span.lang)}">${html}</span>` : html;
  }).join('');
}

// Line styles differ by pattern and weight, not by colour, so the chart reads in print and without colour vision.
const STROKE: Readonly<Record<string, string>> = {
  central: 'stroke-width="2.6"', dry: 'stroke-width="2" stroke-dasharray="9 5"', wet: 'stroke-width="2" stroke-dasharray="2 4" stroke-linecap="round"', capacity: 'stroke-width="1" stroke-dasharray="14 4 2 4"',
};
const num = (value: number) => String(Math.round(value * 10) / 10);
function shapeSvg(shape: ReportChart['shapes'][number]): string {
  const d = /^[MLZ0-9.,\s-]*$/.test(shape.d) ? shape.d : '';
  return shape.kind === 'area' ? `<path d="${d}" fill="currentColor" fill-opacity="0.16" stroke="none"/>` : `<path d="${d}" fill="none" stroke="currentColor" ${STROKE[shape.role] ?? STROKE.central}/>`;
}
function chartHtml(chart: ReportChart, id: string): string {
  const { plot } = chart, bottom = plot.y + plot.height;
  const grid = chart.y_ticks.map(t => `<line x1="${num(plot.x)}" x2="${num(plot.x + plot.width)}" y1="${num(t.y)}" y2="${num(t.y)}" stroke="currentColor" stroke-opacity="0.2"/><text x="${num(plot.x - 6)}" y="${num(t.y + 4)}" text-anchor="end" font-size="11" fill="currentColor">${escapeHtml(t.label)}</text>`).join('');
  const ticks = chart.x_ticks.map(t => `<line x1="${num(t.x)}" x2="${num(t.x)}" y1="${num(bottom)}" y2="${num(bottom + 5)}" stroke="currentColor"/><text x="${num(t.x)}" y="${num(bottom + 18)}" text-anchor="middle" font-size="11" fill="currentColor">${escapeHtml(t.label)}</text>`).join('');
  const regions = chart.regions.map(r => `${r.index ? `<line x1="${num(r.x)}" x2="${num(r.x)}" y1="${num(plot.y)}" y2="${num(bottom)}" stroke="currentColor" stroke-opacity="0.45" stroke-dasharray="3 3"/>` : ''}<text x="${num(r.x + r.width / 2)}" y="${num(plot.y - 8)}" text-anchor="middle" font-size="11" fill="currentColor">${escapeHtml(r.label)}</text>`).join('');
  const legend = chart.shapes.map(s => `<li><svg viewBox="0 0 40 14" aria-hidden="true" focusable="false">${s.kind === 'area' ? '<rect x="0" y="2" width="40" height="10" fill="currentColor" fill-opacity="0.16"/>' : `<path d="M0,7L40,7" fill="none" stroke="currentColor" ${STROKE[s.role] ?? STROKE.central}/>`}</svg><span>${escapeHtml(s.label)}</span></li>`).join('');
  return `<figure class="chart"><figcaption id="${id}-t">${escapeHtml(chart.title)}</figcaption><p id="${id}-d">${escapeHtml(chart.description)}</p>`
    + `<svg viewBox="0 0 ${chart.width} ${chart.height}" role="img" aria-labelledby="${id}-t ${id}-d" focusable="false">`
    + `<rect x="${num(plot.x)}" y="${num(plot.y)}" width="${num(plot.width)}" height="${num(plot.height)}" fill="none" stroke="currentColor" stroke-opacity="0.5"/>${grid}${ticks}${regions}`
    + `<text x="12" y="${num(plot.y + plot.height / 2)}" text-anchor="middle" font-size="11" fill="currentColor" transform="rotate(-90 12 ${num(plot.y + plot.height / 2)})">${escapeHtml(chart.y_label)}</text>`
    + `${chart.shapes.map(shapeSvg).join('')}</svg><ul class="legend">${legend}</ul></figure>${tableHtml(chart.table)}`;
}
function tableHtml(table: ReportTable): string {
  const head = table.columns.map(c => `<th scope="col"${c.numeric ? ' class="num"' : ''}>${escapeHtml(c.header)}</th>`).join('');
  const rows = table.rows.map(row => `<tr>${row.cells.map((cell, i) => (i === 0 ? `<th scope="row">${spansToHtml(cell)}</th>` : `<td${table.columns[i]?.numeric ? ' class="num"' : ''}>${spansToHtml(cell)}</td>`)).join('')}</tr>`).join('');
  const notes = table.notes.length ? `<ul class="table-notes">${table.notes.map(n => `<li>${spansToHtml(n)}</li>`).join('')}</ul>` : '';
  return `<div class="table-wrap"><table><caption>${escapeHtml(table.caption)}</caption><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>${notes}`;
}
function blockHtml(block: ReportBlock, id: string): string {
  switch (block.type) {
    case 'paragraph': return `<p${block.tone ? ` class="${block.tone}"` : ''}>${spansToHtml(block.content)}</p>`;
    case 'heading': return `<h3>${escapeHtml(block.text)}</h3>`;
    case 'list': { const tag = block.ordered ? 'ol' : 'ul'; return `<${tag}>${block.items.map(i => `<li>${spansToHtml(i)}</li>`).join('')}</${tag}>`; }
    case 'definitions': return `<dl>${block.items.map(i => `<div><dt>${escapeHtml(i.term)}</dt><dd>${spansToHtml(i.content)}</dd></div>`).join('')}</dl>`;
    case 'quote': return `<figure class="quote"><figcaption>${escapeHtml(block.label)}</figcaption><blockquote><p>${spansToHtml(block.content)}</p></blockquote></figure>`;
    case 'table': return tableHtml(block);
    case 'chart': return chartHtml(block, id);
  }
}

/** The complete document. Technical sections are plain sections here: a printed report never depends on a control. */
export function documentToHtml(document: ReportDocument): string {
  const sections = document.sections.map(section => `<section id="${section.id}" aria-labelledby="h-${section.id}" data-status="${section.status}"><h2 id="h-${section.id}">${escapeHtml(section.title)}</h2>`
    + `${section.blocks.map((block, i) => blockHtml(block, `${section.id}-${i}`)).join('\n')}</section>`).join('\n');
  return `<!doctype html>\n<html lang="${escapeHtml(document.lang)}" dir="ltr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="robots" content="noindex">\n`
    + `<title>${escapeHtml(document.title)}</title>\n<style>${REPORT_CSS}</style>\n</head>\n<body>\n<main>\n<header><h1>${escapeHtml(document.title)}</h1><p class="subtitle">${escapeHtml(document.subtitle)}</p></header>\n`
    + `${sections}\n<footer><p>${spansToHtml(document.footer)}</p></footer>\n</main>\n</body>\n</html>\n`;
}
