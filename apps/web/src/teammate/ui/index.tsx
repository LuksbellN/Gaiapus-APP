import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CircleAlert, Database, Info, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Meta } from '../adapters/core';

export const KIND_LABEL: Record<string, string> = { fixture: 'Dado de exemplo do pacote', mock: 'Dado ilustrativo', local: 'Salvo neste aparelho', sintetico: 'Dado sintético' };
export function Pill({ tone, children }: { tone?: 'water' | 'warn' | 'risk' | 'ok' | 'soil'; children: ReactNode }) { return <span className={`pill${tone ? ` pill--${tone}` : ''}`}>{children}</span>; }
export function Source({ meta, extra }: { meta: Meta; extra?: ReactNode }) {
  return <p className="source"><Database size={14} aria-hidden /><span><b>{KIND_LABEL[meta.kind]}</b> · Fonte: {meta.source}{meta.note ? ` · ${meta.note}` : ''}{extra ? <> · {extra}</> : null}</span></p>;
}
export function Notice({ tone = 'info', title, children }: { tone?: 'info' | 'warn' | 'risk' | 'water'; title?: string; children: ReactNode }) {
  const Icon = tone === 'risk' ? CircleAlert : tone === 'warn' ? AlertTriangle : Info;
  return <div className={`notice${tone !== 'info' ? ` notice--${tone}` : ''}`} role={tone === 'risk' ? 'alert' : 'note'}><Icon size={18} aria-hidden /><div>{title && <strong>{title} </strong>}{children}</div></div>;
}
export function Stat({ label, value, unit, note }: { label: string; value: ReactNode; unit?: string; note?: ReactNode }) {
  return <div className="stat"><span className="stat__label">{label}</span><span className="stat__value">{value}{unit && <small>{unit}</small>}</span>{note && <span className="meta-13">{note}</span>}</div>;
}
export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) { return <div className="empty"><strong>{title}</strong>{children && <p>{children}</p>}{action}</div>; }
export function Loading({ label = 'Carregando…', rows = 3 }: { label?: string; rows?: number }) { return <div className="stack-2" role="status" aria-live="polite"><span className="sr-only">{label}</span>{Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton" style={{ height: i === 0 ? 28 : 20, width: `${90 - i * 14}%` }} />)}</div>; }
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const code = (error as any)?.code as string | undefined;
  const offline = code === 'network';
  const msg: Record<string, string> = { network: 'Sem conexão. Os dados já carregados continuam na tela; tente de novo quando a rede voltar.', municipality_not_covered: 'Este município é válido, mas ainda não tem análise publicada.', invalid_municipality_code: 'Código de município inválido.', invalid_crop: 'Cultura não reconhecida.' };
  return <div className="notice notice--risk" role="alert">{offline ? <WifiOff size={18} aria-hidden /> : <CircleAlert size={18} aria-hidden />}<div className="stack-2"><span><strong>{offline ? 'Sem conexão. ' : 'Não foi possível carregar. '}</strong>{msg[code ?? ''] ?? 'Algo falhou ao buscar os dados.'}{code && !offline ? <span className="meta-13"> (código: {code})</span> : null}</span>{onRetry && <div><button className="btn btn--sm" onClick={onRetry}>Tentar de novo</button></div>}</div></div>;
}
export function Field({ label, hint, error, children, optional }: { label: string; hint?: string; error?: string; optional?: boolean; children: (p: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode }) {
  const id = useId(); const d = hint || error ? id + 'd' : undefined;
  return <div className="field"><label htmlFor={id}>{label}{optional && <span className="meta-13" style={{ fontWeight: 400 }}> (opcional)</span>}</label>{children({ id, 'aria-describedby': d, 'aria-invalid': error ? true : undefined })}{error ? <span className="err" id={d}><CircleAlert size={14} aria-hidden />{error}</span> : hint ? <span className="hint" id={d}>{hint}</span> : null}</div>;
}
export function Seg<T extends string>({ legend, name, value, onChange, options }: { legend: string; name: string; value: T; onChange: (v: T) => void; options: { value: T; label: string; disabled?: boolean; note?: string }[] }) {
  return <fieldset><legend>{legend}</legend><div className="seg">{options.map((o) => <label key={o.value} title={o.note}><input type="radio" name={name} value={o.value} checked={value === o.value} disabled={o.disabled} onChange={() => onChange(o.value)} />{o.label}</label>)}</div>{options.filter((o) => o.disabled && o.note).map((o) => <span key={o.value} className="hint meta-13">{o.label}: {o.note}</span>)}</fieldset>;
}
// Abas com indicador animado. Movimento medido na referência ForgeUI (ver .reanimate/gaiapus-tabs).
export function Tabs<T extends string>({ label, tabs, value, onChange }: { label: string; tabs: { id: T; label: string; icon?: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  const ref = useRef<HTMLDivElement>(null); const [ind, setInd] = useState<{ x: number; w: number } | null>(null);
  useLayoutEffect(() => {
    const measure = () => { const el = ref.current?.querySelector<HTMLElement>('[aria-selected="true"]'); if (el) setInd({ x: el.offsetLeft + 14, w: el.offsetWidth - 28 }); };
    measure(); const ro = new ResizeObserver(measure); if (ref.current) ro.observe(ref.current); document.fonts?.ready.then(measure); return () => ro.disconnect();
  }, [value, tabs.length]);
  const onKey = (e: React.KeyboardEvent) => { const i = tabs.findIndex((t) => t.id === value); const n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1; if (n < 0 || n >= tabs.length) return; e.preventDefault(); onChange(tabs[n].id); requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus()); };
  return <div className="tabs" role="tablist" aria-label={label} ref={ref} onKeyDown={onKey}>{tabs.map((t) => <button key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={value === t.id} aria-controls={`panel-${t.id}`} tabIndex={value === t.id ? 0 : -1} onClick={() => onChange(t.id)}>{t.icon}{t.label}</button>)}{ind && <span className="tabs__indicator" aria-hidden style={{ transform: `translateX(${ind.x}px)`, width: ind.w }} />}</div>;
}
export function TabPanel({ id, children }: { id: string; children: ReactNode }) { return <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} tabIndex={0} className="stack">{children}</div>; }
export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null); const id = useId();
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);
  return <dialog ref={ref} aria-labelledby={id} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}><div className="stack"><div className="row-between"><h2 id={id}>{title}</h2><button className="btn btn--sm" onClick={onClose}>Fechar</button></div>{children}</div></dialog>;
}
export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>, deps: unknown[]) {
  const [s, set] = useState<{ status: 'loading' | 'ok' | 'error'; data?: T; error?: unknown }>({ status: 'loading' }); const [tick, setTick] = useState(0);
  useEffect(() => { const c = new AbortController(); set((p) => ({ status: 'loading', data: p.data })); fn(c.signal).then((data) => { if (!c.signal.aborted) set({ status: 'ok', data }); }).catch((error) => { if (!c.signal.aborted && error?.name !== 'AbortError') set({ status: 'error', error }); }); return () => c.abort(); }, [...deps, tick]); // eslint-disable-line
  return { ...s, retry: () => setTick((t) => t + 1) };
}
export function useWidth<T extends HTMLElement>() { const ref = useRef<T>(null); const [w, setW] = useState(0); useLayoutEffect(() => { if (!ref.current) return; const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width))); ro.observe(ref.current); return () => ro.disconnect(); }, []); return [ref, w] as const; }
export function useMedia(q: string) { const [m, set] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches); useEffect(() => { const mq = matchMedia(q); const f = () => set(mq.matches); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f); }, [q]); return m; }
export const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export function LinkBtn({ to, primary, children, sm }: { to: string; primary?: boolean; sm?: boolean; children: ReactNode }) { return <Link className={`btn${primary ? ' btn--primary' : ''}${sm ? ' btn--sm' : ''}`} to={to}>{children}</Link>; }
