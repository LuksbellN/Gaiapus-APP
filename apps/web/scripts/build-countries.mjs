// Adds names in the five interface languages and search aliases to src/teammate/data/geo/countries.json.
// Codes stay the base-map ADM0_A3 ('BR' for Brazil); names are presentation only and never used as identifiers.
// ISO alpha-2 is recovered by matching the existing Portuguese name with Intl.DisplayNames('pt-BR'); territories
// without an alpha-2 code get manual names. Usage (from apps/web): node scripts/build-countries.mjs
import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(import.meta.dirname, '../src/teammate/data/geo/countries.json');
const src = JSON.parse(fs.readFileSync(file, 'utf8'));
const LOCALES = ['pt-BR', 'en', 'es', 'fr', 'de'];
const dn = Object.fromEntries(LOCALES.map((l) => [l, new Intl.DisplayNames(l, { type: 'region' })]));
const A2_BY_PT = {};
for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) { const c = String.fromCharCode(a, b); try { const n = dn['pt-BR'].of(c); if (n && n !== c) A2_BY_PT[n] = c; } catch { /* invalid code */ } }
const MANUAL = {
  'Chipre do Norte': { 'pt-BR': 'Chipre do Norte', en: 'Northern Cyprus', es: 'Chipre del Norte', fr: 'Chypre du Nord', de: 'Nordzypern' },
  'Somalilândia': { 'pt-BR': 'Somalilândia', en: 'Somaliland', es: 'Somalilandia', fr: 'Somaliland', de: 'Somaliland' },
  'República Democrática do Congo': { 'pt-BR': 'República Democrática do Congo', en: 'Democratic Republic of the Congo', es: 'República Democrática del Congo', fr: 'République démocratique du Congo', de: 'Demokratische Republik Kongo' },
  'República do Congo': { 'pt-BR': 'República do Congo', en: 'Republic of the Congo', es: 'República del Congo', fr: 'République du Congo', de: 'Republik Kongo' },
};
const A2_FIX = { 'República Democrática do Congo': 'CD', 'República do Congo': 'CG', Kosovo: 'XK' };
const CONTINENT = { 'África': 'africa', 'Antártida': 'antarctica', 'Ásia': 'asia', Europa: 'europe', 'América do Norte': 'north_america', 'América do Sul': 'south_america', Oceania: 'oceania', Oceanos: 'seven_seas' };
const EXTRA_ALIASES = { USA: ['EUA', 'USA', 'US'], GBR: ['UK', 'Reino Unido', 'Great Britain'], BR: ['BRA'] };

const unmatched = [];
const countries = src.countries.map((c) => {
  const ptName = c.name ?? c.names?.['pt-BR'];
  const a2 = A2_FIX[ptName] ?? A2_BY_PT[ptName] ?? null;
  let names;
  if (MANUAL[ptName]) names = MANUAL[ptName];
  else if (a2) names = Object.fromEntries(LOCALES.map((l) => [l, dn[l].of(a2)]));
  else { unmatched.push(ptName); names = Object.fromEntries(LOCALES.map((l) => [l, ptName])); }
  const aliases = [...new Set([c.code, ...(a2 ? [a2] : []), ...Object.values(names), ...(EXTRA_ALIASES[c.code] ?? [])])];
  return { code: c.code, a2, names, aliases, continent: CONTINENT[c.continent] ?? c.continent, bbox: c.bbox };
});
fs.writeFileSync(file, JSON.stringify({ source: 'MapLibre demotiles (Natural Earth), tile 0/0/0; names: Intl.DisplayNames (CLDR)', countries }));
console.log(countries.length, 'countries; without alpha-2 (names kept):', unmatched.join(', ') || 'none');
console.log(countries.filter((c) => ['DEU', 'USA', 'JPN', 'CIV', 'BR'].includes(c.code)).map((c) => `${c.code} ${JSON.stringify(c.names)}`).join('\n'));
