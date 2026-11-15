// US Census state FIPS → ISO 3166-2 (50 states and DC). County FIPS = state FIPS (2) + county (3); leading zeros matter.
export const US_STATE_FIPS: Record<string, string> = {
  '01': 'US-AL', '02': 'US-AK', '04': 'US-AZ', '05': 'US-AR', '06': 'US-CA', '08': 'US-CO', '09': 'US-CT', '10': 'US-DE', '11': 'US-DC', '12': 'US-FL',
  '13': 'US-GA', '15': 'US-HI', '16': 'US-ID', '17': 'US-IL', '18': 'US-IN', '19': 'US-IA', '20': 'US-KS', '21': 'US-KY', '22': 'US-LA', '23': 'US-ME',
  '24': 'US-MD', '25': 'US-MA', '26': 'US-MI', '27': 'US-MN', '28': 'US-MS', '29': 'US-MO', '30': 'US-MT', '31': 'US-NE', '32': 'US-NV', '33': 'US-NH',
  '34': 'US-NJ', '35': 'US-NM', '36': 'US-NY', '37': 'US-NC', '38': 'US-ND', '39': 'US-OH', '40': 'US-OK', '41': 'US-OR', '42': 'US-PA', '44': 'US-RI',
  '45': 'US-SC', '46': 'US-SD', '47': 'US-TN', '48': 'US-TX', '49': 'US-UT', '50': 'US-VT', '51': 'US-VA', '53': 'US-WA', '54': 'US-WV', '55': 'US-WI',
  '56': 'US-WY',
};

/** ISO state code of a county location id (US:fips:19169 → US-IA), or null. */
export function stateOfCounty(locationId: string): string | null {
  const m = /^US:fips:(\d{2})\d{3}$/.exec(locationId);
  return m ? US_STATE_FIPS[m[1]] ?? null : null;
}
