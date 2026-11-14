// Configuração central. A edição do desafio é separada de qualquer período histórico dos dados.
export const EDITION = { year: 2026, challenge: 'NASA Space Apps · Field Shift' } as const;
export const MODE = { auth: 'supabase', label: 'Dados de exemplo' } as const; // autenticação real depende do backend
export const MOTION = { hover: 140, tab: 300, panel: 260, panelShift: 16, fly: 1000, number: 200 } as const;
// Curva medida na referência ForgeUI (ver .reanimate/gaiapus-tabs). Fallback: cubic-bezier.
export const TAB_EASING = 'linear(0, 0.011 3.3%, 0.061 7.3%, 0.164 12.9%, 0.324 18.4%, 0.501 24.1%, 0.663 29.5%, 0.791 35.6%, 0.902 40.7%, 0.968 46.8%, 1.022 51.8%, 1.045 58.3%, 1.058 63%, 1.058 68.5%, 1.052 74.1%, 1.043 79.6%, 1.033 85.2%, 1.023 90.7%, 1.015 96.2%, 1)';
export const PRESETS = { sorriso: { uf: '51', mun: '5107925', name: 'Sorriso' }, uberlandia: { uf: '31', mun: '3170206', name: 'Uberlândia' } } as const;
