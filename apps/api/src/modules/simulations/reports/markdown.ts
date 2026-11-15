// Markdown export of a report document. Text from data is escaped so it cannot become markup: no raw HTML, no
// link, no image and no automatic link. Charts are exported as their title, description and equivalent table.
import type { ReportBlock, ReportDocument, ReportTable } from '@gaiapus/contracts';
import type { Span } from './messages/index.js';

/** Escape inline Markdown, raw HTML and autolinks in a piece of text (one line). */
export function escapeMarkdown(value: string): string {
  return value.replace(/\s+/g, ' ')
    .replace(/&/g, '&amp;')
    .replace(/[\\`*_[\]<>|~]/g, c => `\\${c}`)
    // Autolink extensions recognise bare URLs and www. prefixes: break both without changing what is read.
    .replace(/:\/\//g, ':\\/\\/').replace(/\bwww\./gi, m => `${m.slice(0, 3)}\\.`)
    .replace(/\b(javascript|data|vbscript|mailto|tel|file):/gi, (_, scheme: string) => `${scheme}\\:`)
    .replace(/@/g, '\\@');
}
/** Characters that would start a block (heading, list, quote, rule) at the beginning of a line. */
const lineStart = (line: string) => line.replace(/^(\s*)([#>+\-=])/, '$1\\$2').replace(/^(\s*\d+)([.)])/, '$1\\$2');

export function spansToMarkdown(spans: readonly Span[]): string {
  return spans.map(span => {
    // Identifiers are shown as code; anything that is not identifier-like is escaped text instead, so no markup hides in a code span.
    if (span.style === 'code' && /^[A-Za-z0-9_.:>/+ -]+$/.test(span.text)) return `\`${span.text}\``;
    const text = escapeMarkdown(span.text);
    if (!text.trim()) return text;
    const [, lead = '', body = '', trail = ''] = /^(\s*)(.*?)(\s*)$/s.exec(text) ?? [];
    return span.style === 'strong' ? `${lead}**${body}**${trail}` : span.style === 'em' ? `${lead}_${body}_${trail}` : text;
  }).join('');
}

function tableMarkdown(table: ReportTable): string {
  const row = (cells: string[]) => `| ${cells.join(' | ')} |`;
  const lines = [`**${escapeMarkdown(table.caption)}**`, '', row(table.columns.map(c => escapeMarkdown(c.header))), row(table.columns.map(c => (c.numeric ? '---:' : ':---'))),
    ...table.rows.map(r => row(r.cells.map(spansToMarkdown)))];
  if (table.notes.length) lines.push('', ...table.notes.map(n => `- ${spansToMarkdown(n)}`));
  return lines.join('\n');
}
function blockMarkdown(block: ReportBlock): string {
  switch (block.type) {
    case 'paragraph': return lineStart(spansToMarkdown(block.content));
    case 'heading': return `### ${escapeMarkdown(block.text)}`;
    case 'list': return block.items.map((item, i) => `${block.ordered ? `${i + 1}.` : '-'} ${spansToMarkdown(item)}`).join('\n');
    case 'definitions': return block.items.map(item => `- **${escapeMarkdown(item.term)}:** ${spansToMarkdown(item.content)}`).join('\n');
    case 'quote': return `> ${escapeMarkdown(block.label)}\n>\n> ${spansToMarkdown(block.content)}`;
    case 'table': return tableMarkdown(block);
    case 'chart': return `**${escapeMarkdown(block.title)}**\n\n${lineStart(escapeMarkdown(block.description))}\n\n${tableMarkdown(block.table)}`;
  }
}

export function documentToMarkdown(document: ReportDocument): string {
  const parts = [`# ${escapeMarkdown(document.title)}`, `_${escapeMarkdown(document.subtitle)}_`];
  for (const section of document.sections) parts.push(`## ${escapeMarkdown(section.title)}`, ...section.blocks.map(blockMarkdown));
  parts.push('---', lineStart(spansToMarkdown(document.footer)));
  return `${parts.join('\n\n')}\n`;
}
