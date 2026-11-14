import { useEffect, useRef, useState } from 'react';
import { setDraft, useStore } from '../store';
// Formulário com rascunho recuperável: cada alteração é guardada neste aparelho até salvar.
export function useDraftForm(key: string, initial: Record<string, string>) {
  const saved = useStore((s) => s.drafts[key]); const [v, setV] = useState<Record<string, string>>(() => ({ ...initial, ...(saved ?? {}) })); const [restored] = useState(() => !!saved); const k = useRef(key);
  useEffect(() => { if (k.current !== key) { k.current = key; setV({ ...initial }); } }, [key]); // eslint-disable-line
  const set = (name: string, value: string) => setV((p) => { const n = { ...p, [name]: value }; setDraft(key, n); return n; });
  const bind = (name: string) => ({ value: v[name] ?? '', onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set(name, e.target.value) });
  return { v, set, bind, restored, clear: () => { setDraft(key, null); setV({ ...initial }); }, load: (d: Record<string, string>) => setV({ ...initial, ...d }) };
}
export const num = (s: string | undefined) => { if (s == null || s.trim() === '') return null; const n = Number(s.replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
// Converte quantidade para kg conservando a unidade original no registro. Saca exige peso declarado.
export function toKg(q: number | null, unit: string, sackKg: number | null) { if (q == null) return null; if (unit === 'kg') return q; if (unit === 't') return q * 1000; if (unit === 'saca') return sackKg ? q * sackKg : null; return null; }
