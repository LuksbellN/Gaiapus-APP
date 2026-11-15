// Which countries of the world list have data, and in which states — derived from the published catalogues, never a
// hard-coded country. Brazil: municipalities in the coverage catalogue; elsewhere: published location cores (e.g. US counties).
type Abroad = { country: string; admin1_code: string };

/** Map ISO alpha-2 → sorted state/admin1 short codes with data. */
export function countriesWithData({ brStates, abroad }: { brStates: string[]; abroad: Abroad[] }): Map<string, string[]> {
  const out = new Map<string, Set<string>>();
  if (brStates.length) out.set('BR', new Set(brStates));
  for (const l of abroad) {
    const short = l.admin1_code.replace(/^[A-Z]{2}-/, '');
    if (!out.has(l.country)) out.set(l.country, new Set());
    out.get(l.country)!.add(short);
  }
  return new Map([...out].map(([k, v]) => [k, [...v].sort()]));
}

/** Countries with data first (Brazil first among them), then the rest; each group by name. */
export function orderCountries<T extends { code: string; a2: string | null }>(list: T[], withData: Map<string, string[]>, nameOf: (c: T) => string,
  compare: (a: string, b: string) => number = (a, b) => a.localeCompare(b, 'pt-BR')): T[] {
  const rank = (c: T) => (c.a2 === 'BR' && withData.has('BR') ? 0 : c.a2 && withData.has(c.a2) ? 1 : 2);
  return [...list].sort((a, b) => rank(a) - rank(b) || compare(nameOf(a), nameOf(b)));
}
