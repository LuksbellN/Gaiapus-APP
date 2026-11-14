import { Link } from 'react-router-dom';
import { ChevronRight, CircleUserRound, Palette } from 'lucide-react';
import { NAV_GROUPS } from '../App';
import { EDITION } from '../config';
import { useI18n } from '../i18n';
import { Pill } from '../ui';
import { LanguageSelect } from '../ui/LanguageSelect';

// Every destination, grouped by task, including the ones already in the bottom bar (D-15).
const EXTRA = { ajuda: [{ to: '/conta', key: 'conta' as const, icon: CircleUserRound }, { to: '/design-preview', key: 'linguagem' as const, icon: Palette }] } as const;
export function More() {
  const { t } = useI18n();
  return <div className="page"><h1>{t('nav.more')}</h1>
    {NAV_GROUPS.map((g) => <section key={g.id} className="stack-2" aria-labelledby={`mais-${g.id}`}><h2 id={`mais-${g.id}`} className="meta" style={{ fontSize: 14, fontWeight: 600 }}>{t(`nav.group.${g.id}`)}</h2>
      <ul className="list">{[...g.items, ...(g.id === 'ajuda' ? EXTRA.ajuda : [])].map((n) => <li key={n.to}><Link className="btn" style={{ width: '100%', justifyContent: 'space-between' }} to={n.to}><span className="row"><n.icon size={20} aria-hidden />{n.key === 'propriedades' ? t('nav.propertiesLong') : t(`nav.item.${n.key}`)}</span><ChevronRight size={18} aria-hidden /></Link></li>)}
        {g.id === 'ajuda' && <li className="row-between" style={{ padding: '4px 0' }}><span>{t('lang.label')}</span><LanguageSelect id="idioma-mais" /></li>}</ul></section>)}
    <section className="card card--flat" aria-labelledby="mais-edicao"><h2 id="mais-edicao">{t('nav.edition.title')}</h2><div className="row"><Pill>{t('common.edition', { year: EDITION.year })}</Pill><Pill tone="warn">{t('nav.mode')}</Pill></div><p className="meta-13">{t('nav.edition.text', { challenge: EDITION.challenge })}</p></section>
  </div>;
}
