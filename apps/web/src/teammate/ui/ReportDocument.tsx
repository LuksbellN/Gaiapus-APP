// Renders the document model of a technical report exactly as the API produced it: text, tables and chart
// geometry arrive ready, so this file formats no number and computes nothing. Everything is rendered as React
// text nodes and attributes (no HTML injection). Charts are plain SVG, so the page prints without canvas or WebGL.
import { useId, useState, type ReactNode } from 'react';
import type { ReportBlock, ReportChart, ReportDocument as ReportDocumentModel, ReportSection, ReportTable } from '@gaiapus/contracts';

type Span = ReportTable['notes'][number][number];
const LANG = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

function Spans({ spans }: { spans: readonly Span[] }) {
  return <>{spans.map((span, i) => {
    const lang = span.lang && LANG.test(span.lang) ? span.lang : undefined;
    if (span.style === 'strong') return <strong key={i} lang={lang}>{span.text}</strong>;
    if (span.style === 'em') return <em key={i} lang={lang}>{span.text}</em>;
    if (span.style === 'code') return <code key={i} translate="no">{span.text}</code>;
    return lang ? <span key={i} lang={lang}>{span.text}</span> : <span key={i}>{span.text}</span>;
  })}</>;
}

function Table({ table }: { table: ReportTable }) {
  return (
    <div className="report__table">
      <div className="table-wrap" tabIndex={0} role="group" aria-label={table.caption}>
        <table>
          <caption>{table.caption}</caption>
          <thead><tr>{table.columns.map((c, i) => <th key={i} scope="col" className={c.numeric ? 'num' : undefined}>{c.header}</th>)}</tr></thead>
          <tbody>{table.rows.map((row, r) => <tr key={r}>{row.cells.map((cell, i) => (i === 0
            ? <th key={i} scope="row"><Spans spans={cell} /></th>
            : <td key={i} className={table.columns[i]?.numeric ? 'num' : undefined}><Spans spans={cell} /></td>))}</tr>)}</tbody>
        </table>
      </div>
      {table.notes.length > 0 && <ul className="report__notes">{table.notes.map((note, i) => <li key={i}><Spans spans={note} /></li>)}</ul>}
    </div>
  );
}

/** Only path data made of move/line commands and numbers is ever drawn. */
const safePath = (d: string) => (/^[MLZ0-9.,\s-]*$/.test(d) ? d : '');
function Chart({ chart }: { chart: ReportChart }) {
  const id = useId();
  const { plot } = chart, bottom = plot.y + plot.height;
  return (
    <figure className="report__chart">
      <figcaption id={`${id}t`}>{chart.title}</figcaption>
      <p id={`${id}d`} className="meta">{chart.description}</p>
      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-labelledby={`${id}t`} aria-describedby={`${id}d`} focusable="false">
        <rect className="report-chart__frame" x={plot.x} y={plot.y} width={plot.width} height={plot.height} />
        {chart.y_ticks.map((t, i) => <g key={`y${i}`}><line className="report-chart__grid" x1={plot.x} x2={plot.x + plot.width} y1={t.y} y2={t.y} /><text className="report-chart__label" x={plot.x - 6} y={t.y + 4} textAnchor="end">{t.label}</text></g>)}
        {chart.x_ticks.map((t, i) => <g key={`x${i}`}><line className="report-chart__tick" x1={t.x} x2={t.x} y1={bottom} y2={bottom + 5} /><text className="report-chart__label" x={t.x} y={bottom + 18} textAnchor="middle">{t.label}</text></g>)}
        {chart.regions.map((r, i) => <g key={`r${i}`}>{r.index > 0 && <line className="report-chart__phase" x1={r.x} x2={r.x} y1={plot.y} y2={bottom} />}<text className="report-chart__label" x={r.x + r.width / 2} y={plot.y - 8} textAnchor="middle">{r.label}</text></g>)}
        <text className="report-chart__label" x={12} y={plot.y + plot.height / 2} textAnchor="middle" transform={`rotate(-90 12 ${plot.y + plot.height / 2})`}>{chart.y_label}</text>
        {chart.shapes.map((s, i) => <path key={i} className={`report-chart__${s.kind} report-chart__${s.kind}--${s.role}`} d={safePath(s.d)} />)}
      </svg>
      {/* Lines differ by pattern and weight as well as colour; the legend repeats each one with its name. */}
      <ul className="report__legend">{chart.shapes.map((s, i) => <li key={i}>
        <svg viewBox="0 0 40 14" aria-hidden focusable="false">{s.kind === 'area' ? <rect className={`report-chart__area report-chart__area--${s.role}`} x={0} y={2} width={40} height={10} /> : <path className={`report-chart__line report-chart__line--${s.role}`} d="M0,7L40,7" />}</svg>
        <span>{s.label}</span></li>)}</ul>
      <Table table={chart.table} />
    </figure>
  );
}

function Block({ block }: { block: ReportBlock }) {
  switch (block.type) {
    case 'paragraph': return <p className={block.tone ? `report__${block.tone}` : undefined}><Spans spans={block.content} /></p>;
    case 'heading': return <h3 className="h3">{block.text}</h3>;
    case 'list': { const items = block.items.map((item, i) => <li key={i}><Spans spans={item} /></li>); return block.ordered ? <ol className="report__list">{items}</ol> : <ul className="report__list">{items}</ul>; }
    case 'definitions': return <dl className="report__facts">{block.items.map((item, i) => <div key={i}><dt>{item.term}</dt><dd><Spans spans={item.content} /></dd></div>)}</dl>;
    case 'quote': return <figure className="report__quote"><figcaption className="meta-13">{block.label}</figcaption><blockquote><p><Spans spans={block.content} /></p></blockquote></figure>;
    case 'table': return <Table table={block} />;
    case 'chart': return <Chart chart={block} />;
  }
}

function Section({ section, status }: { section: ReportSection; status: (section: ReportSection) => ReactNode }) {
  // Technical sections start closed on screen; the print style always shows them (see SimulationReport.css).
  const [open, setOpen] = useState(!section.technical);
  const id = useId();
  return (
    <section className="report__section" data-testid={`report-section-${section.id}`} data-status={section.status} aria-labelledby={`${id}h`}>
      <div className="report__head">
        <h2 id={`${id}h`} className="report__heading">
          {section.technical
            ? <button type="button" className="report__toggle" aria-expanded={open} aria-controls={`${id}b`} onClick={() => setOpen(!open)}>{section.title}</button>
            : section.title}
        </h2>
        {status(section)}
      </div>
      <div id={`${id}b`} className="report__body" hidden={!open}>{section.blocks.map((block, i) => <Block key={i} block={block} />)}</div>
    </section>
  );
}

export function ReportDocument({ document, status }: { document: ReportDocumentModel; status: (section: ReportSection) => ReactNode }) {
  return (
    <article className="report__document" lang={document.lang} data-testid="report-document">
      {document.sections.map((section) => <Section key={section.id} section={section} status={status} />)}
      <footer className="report__footer meta-13"><Spans spans={document.footer} /></footer>
    </article>
  );
}
