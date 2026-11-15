// Tipos do explorador, separados do componente para que o MapLibre só seja carregado com o mapa.
export type Selection = { pais: string | null; uf: string | null; mun: string | null };
export type MapLayers = { municipios: boolean; cobertura: boolean; imagem: boolean };
export type MapHandle = { zoom: (d: 1 | -1) => void; flyTo: (lon: number, lat: number) => void; /** ADM0_A3 of the base-map country drawn at this point, if visible. */ countryAt: (lon: number, lat: number) => string | null };
