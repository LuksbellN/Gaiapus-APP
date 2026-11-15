// RT-21: every language has every key of the pt-BR source, with the same placeholders and plural shape.
import { describe, expect, it } from 'vitest';
import ptBR from './messages/pt-BR';
import en from './messages/en';
import es from './messages/es';
import fr from './messages/fr';
import de from './messages/de';

type Node = string | { [k: string]: Node };
function leaves(tree: Node, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof tree === 'string') { out.set(prefix, tree); return out; }
  for (const [k, v] of Object.entries(tree)) for (const [kk, vv] of leaves(v as Node, prefix ? `${prefix}.${k}` : k)) out.set(kk, vv);
  return out;
}
const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

const source = leaves(ptBR as unknown as Node);
const TARGETS = { en, es, fr, de } as Record<string, unknown>;

describe.each(Object.keys(TARGETS))('catalog %s', (lang) => {
  const target = leaves(TARGETS[lang] as Node);
  it('has every source key and no extra key', () => {
    expect([...source.keys()].filter((k) => !target.has(k))).toEqual([]);
    expect([...target.keys()].filter((k) => !source.has(k))).toEqual([]);
  });
  it('keeps the placeholders of each message', () => {
    const wrong = [...source].filter(([k, v]) => target.has(k) && vars(target.get(k)!) !== vars(v)).map(([k]) => `${k}: ${vars(source.get(k)!)} ≠ ${vars(target.get(k)!)}`);
    expect(wrong).toEqual([]);
  });
  it('has no empty message and no untranslated long sentence', () => {
    expect([...target].filter(([, v]) => !v.trim()).map(([k]) => k)).toEqual([]);
    // Long sentences identical to the Portuguese source were not translated.
    // Formulas such as "{yield} kg/ha × {area} ha" have no words to translate.
    const hasWords = (v: string) => /[a-zà-ú]{4,}/i.test(v.replace(/\{\w+\}/g, ''));
    const same = [...source].filter(([k, v]) => v.length > 40 && hasWords(v) && target.get(k) === v).map(([k]) => k);
    expect(same).toEqual([]);
  });
});

it('French uses narrow no-break spaces before ; ? !', () => {
  const bad = [...leaves(fr as unknown as Node)].filter(([, v]) => / [;?!]/.test(v)).map(([k]) => k);
  expect(bad).toEqual([]);
});
