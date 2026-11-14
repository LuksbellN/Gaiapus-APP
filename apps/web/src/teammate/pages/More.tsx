import { Link } from 'react-router-dom';
import { ChevronRight, CircleUserRound, Palette } from 'lucide-react';
import { NAV_GROUPS } from '../App';
import { EDITION, MODE } from '../config';
import { Pill } from '../ui';

// Every destination, grouped by task, including the ones already in the bottom bar (D-15).
const EXTRA: Record<string, { to: string; label: string; icon: typeof Palette }[]> = {
  ajuda: [{ to: '/conta', label: 'Conta', icon: CircleUserRound }, { to: '/design-preview', label: 'Linguagem visual', icon: Palette }],
};
export function More() {
  return <div className="page"><h1>Mais</h1>
    {NAV_GROUPS.map((g) => <section key={g.id} className="stack-2" aria-labelledby={`mais-${g.id}`}><h2 id={`mais-${g.id}`} className="meta" style={{ fontSize: 14, fontWeight: 600 }}>{g.label}</h2>
      <ul className="list">{[...g.items, ...(EXTRA[g.id] ?? [])].map((n) => <li key={n.to}><Link className="btn" style={{ width: '100%', justifyContent: 'space-between' }} to={n.to}><span className="row"><n.icon size={20} aria-hidden />{n.label === 'Propriedades' ? 'Propriedades e talhões' : n.label}</span><ChevronRight size={18} aria-hidden /></Link></li>)}</ul></section>)}
    <section className="card card--flat" aria-labelledby="mais-edicao"><h2 id="mais-edicao">Sobre esta edição</h2><div className="row"><Pill>Edição {EDITION.year}</Pill><Pill tone="warn">{MODE.label}</Pill></div><p className="meta-13">{EDITION.challenge}. Os resultados científicos são exemplos publicados e retrospectivos; nada está liberado para decisão operacional.</p></section>
  </div>;
}
