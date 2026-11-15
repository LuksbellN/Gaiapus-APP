// Help without animation: glossary in the farmer's words and short answers. Tutorials (H1) are listed here too.
import { Link } from 'react-router-dom';
import { useI18n, type MessageKey } from '../i18n';

export const GLOSSARY_IDS = ['et0', 'reserva', 'deficit', 'ndvi', 'escala-municipal', 'cenario', 'retrospectivo', 'mae', 'climatologia', 'nao-liberado'] as const;
const key = (id: string) => id.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());

export function Help() {
  const { t, tn: tNodes } = useI18n();
  const faq: { q: MessageKey; a: React.ReactNode }[] = [
    { q: 'help.faq.sorriso.q', a: t('help.faq.sorriso.a') },
    { q: 'help.faq.data.q', a: tNodes('help.faq.data.a', { link: <Link to="/conta">{t('help.faq.data.link')}</Link> }) },
    { q: 'help.faq.country.q', a: tNodes('help.faq.country.a', { link: <Link to="/explorar">{t('help.faq.country.link')}</Link> }) },
    { q: 'help.faq.pending.q', a: t('help.faq.pending.a') },
  ];
  return <div className="page" style={{ maxWidth: 860 }}>
    <div className="page-head"><div className="stack-2"><h1>{t('help.title')}</h1><p>{t('help.subtitle')}</p></div></div>
    <section className="card" aria-labelledby="h-faq"><h2 id="h-faq">{t('help.faqTitle')}</h2>{faq.map((f) => <div key={f.q} className="stack-2"><h3>{t(f.q)}</h3><p>{f.a}</p></div>)}</section>
    <section className="card" aria-labelledby="h-glossario"><h2 id="h-glossario">{t('help.glossaryTitle')}</h2><dl className="stack-2">{GLOSSARY_IDS.map((id) => <div key={id} id={id}><dt><b>{t(`help.glossary.${key(id)}.term` as MessageKey)}</b></dt><dd style={{ margin: 0 }} className="meta">{t(`help.glossary.${key(id)}.text` as MessageKey)}</dd></div>)}</dl></section>
  </div>;
}
