// Report catalogues of the five languages and an explicit-locale translator. The translator never reads a global
// language: a report being rendered keeps the locale it was requested with.
import { createHash } from 'node:crypto';
import { canonicalJson, type ReportLocale } from '@gaiapus/contracts';
import en, { type ReportMessages } from './en.js';
import ptBR from './pt-BR.js';
import es from './es.js';
import fr from './fr.js';
import de from './de.js';

export type { ReportMessages } from './en.js';
export const REPORT_CATALOGS: Readonly<Record<ReportLocale, ReportMessages>> = { en, 'pt-BR': ptBR, es, fr, de };
/** Changes with any wording change in any language, so a new text never hides behind an old report id. */
export const REPORT_TRANSLATION_VERSION = `1.${createHash('sha256').update(canonicalJson(REPORT_CATALOGS)).digest('hex').slice(0, 12)}`;

type Plural = { one: string; other: string };
type Leaves<T, P extends string = ''> = { [K in keyof T & string]: T[K] extends string ? `${P}${K}` : T[K] extends Plural ? `${P}${K}` : Leaves<T[K], `${P}${K}.`> }[keyof T & string];
export type ReportMessageKey = Leaves<ReportMessages>;
export type MessageVars = Record<string, string | number>;
export type Span = { text: string; style?: 'strong' | 'em' | 'code'; lang?: string };
/** Values of a rich message: plain values, or spans (a quoted source text, an identifier shown as code). */
export type RichVars = Record<string, string | number | Span[]>;
type Node = string | Plural | { [k: string]: Node };

function find(tree: Node, key: string): string | Plural | undefined {
  let node: Node | undefined = tree;
  for (const part of key.split('.')) { if (!node || typeof node !== 'object' || 'other' in node && typeof node.other === 'string') return undefined; node = (node as { [k: string]: Node })[part]; }
  return typeof node === 'string' || (!!node && typeof node === 'object' && typeof (node as Plural).other === 'string') ? (node as string | Plural) : undefined;
}
const fill = (template: string, vars?: MessageVars) => (vars ? template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match)) : template);

export interface Translator {
  readonly locale: ReportLocale;
  /** A message of the catalogue. `count` selects the plural form. */
  text(key: ReportMessageKey, vars?: MessageVars): string;
  /** The same message as spans: **emphasis** in the template becomes strong text; values are inserted afterwards. */
  rich(key: ReportMessageKey, vars?: RichVars): Span[];
  /** A message addressed by a data identifier (crop, metric, code…); null when the registry has no entry for it. */
  lookup(group: string, id: string, vars?: MessageVars): string | null;
}

export function createTranslator(locale: ReportLocale): Translator {
  const catalog = REPORT_CATALOGS[locale] as unknown as Node;
  const rules = new Intl.PluralRules(locale);
  const template = (key: string, vars?: MessageVars): string | null => {
    const message = find(catalog, key);
    if (message === undefined) return null;
    if (typeof message === 'string') return message;
    return rules.select(Number(vars?.count ?? 0)) === 'one' ? message.one : message.other;
  };
  return {
    locale,
    text: (key, vars) => fill(template(key, vars) ?? key, vars),
    rich: (key, vars) => {
      const count = typeof vars?.count === 'number' ? { count: vars.count } : undefined;
      const out: Span[] = [];
      const push = (span: Span) => { const last = out.at(-1); if (last && last.style === span.style && last.lang === span.lang) last.text += span.text; else if (span.text !== '') out.push({ ...span }); };
      (template(key, count) ?? key).split('**').forEach((part, i) => {
        const strong = i % 2 === 1;
        for (const piece of part.split(/(\{\w+\})/)) {
          const name = /^\{(\w+)\}$/.exec(piece)?.[1];
          const value = name !== undefined && vars && name in vars ? vars[name] : undefined;
          if (Array.isArray(value)) for (const span of value) push(strong && !span.style ? { ...span, style: 'strong' } : span);
          else push(strong ? { text: value === undefined ? piece : String(value), style: 'strong' } : { text: value === undefined ? piece : String(value) });
        }
      });
      return out;
    },
    lookup: (group, id, vars) => { const found = /^[A-Za-z0-9_-]+$/.test(id) ? template(`${group}.${id}`, vars) : null; return found === null ? null : fill(found, vars); },
  };
}
