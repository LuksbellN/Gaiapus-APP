// Estado do campo ilustrativo e alternativa 2D. Fica fora de Field3D.tsx para que o simulador
// não puxe o Three.js antes de a cena 3D ser realmente montada.
export type FieldState = { land: string; stage: string; progress: number; awf: number; rain: number; covered: boolean };
const DEV: Record<string, [number, number]> = { establishment: [0.03, 0.18], vegetative: [0.18, 0.75], reproductive: [0.75, 1], maturation: [1, 1], off_season_cover: [0.45, 0.6], off_season_bare: [0, 0] };
export const development = (s: FieldState) => { const [a, b] = DEV[s.stage] ?? [0, 0]; return a + (b - a) * s.progress; };
export function webglAvailable() { try { if (new URLSearchParams(location.hash.split('?')[1] ?? '').has('semwebgl')) return false; const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }

// Alternativa 2D quando o WebGL não está disponível: mesma informação, em corte lateral.
export function Field2D({ state, label }: { state: FieldState; label: string }) {
  const dev = development(state); const maize = state.land.startsWith('maize2'); const crop = state.land === 'soy' || maize; const h = crop ? dev * (maize ? 110 : 60) : 0; const bra = state.land.includes('brachiaria') ? (state.land === 'brachiaria' ? 30 : 8 + dev * 14) : 0;
  return <svg viewBox="0 0 600 260" role="img" aria-label={label} style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMax meet">
    <rect x="0" y="200" width="600" height="60" fill={`color-mix(in srgb, #4a3a2a ${Math.round(state.awf * 100)}%, #a98a63)`} />
    {Array.from({ length: 16 }, (_, i) => <g key={i}>{h > 0 && <path d={`M${30 + i * 36},200 l-${6 + dev * 10},-${h} l${12 + dev * 20},0 z`} fill={state.stage === 'maturation' ? '#b9a24f' : '#4f9a4d'} />}{bra > 0 && <path d={`M${48 + i * 36},200 l-7,-${bra} l14,0 z`} fill="#7fa45a" />}</g>)}
    <text x="12" y="250" fill="#EAF2EB" fontSize="13">Vista 2D (sem WebGL) · solo {Math.round(state.awf * 100)}% da reserva</text>
  </svg>;
}
