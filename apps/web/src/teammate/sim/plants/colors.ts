// Albedo colours of the illustrative plants. They are scene colours, deliberately separate from the UI tokens:
// a leaf is not `--action`, straw is not `--warn`. Roughness is high everywhere (no plastic shine).
export const LEAF = { deep: '#2E6A33', mid: '#3D8440', light: '#5C9C48', young: '#82B55A', yellow: '#C6B24E', straw: '#C4AA6A', tan: '#A88A58' } as const;
export const STEM = { green: '#58803F', pale: '#7E9A58', dry: '#9B7C4E', wood: '#6B4E36', woodPale: '#8A6A4A' } as const;
export const POD = { green: '#6F9642', dry: '#A9864F' } as const;
export const BEAN_POD = { green: '#7FA650', dry: '#D2BE86' } as const;
export const FLOWER = { soy: '#B69AD2', bean: '#F1E9EE', coffee: '#FBFAF4' } as const;
export const MAIZE = { tassel: '#CFC07E', tasselDry: '#B8A16A', husk: '#A9C96C', huskDry: '#DCCB92', silk: '#E6D79C', silkDry: '#6E4A2B' } as const;
export const GRAIN = { green: '#8FAE55', gold: '#D2B25A', straw: '#CDB273' } as const;
export const COFFEE = { leaf: '#24602F', leafNew: '#4F8F45', green: '#6E9A3F', yellow: '#D9B13C', ripe: '#B3261E' } as const;
export const STRAW = ['#C9B27A', '#B59A63', '#A88752', '#D6C293', '#9C7B4B'] as const;
