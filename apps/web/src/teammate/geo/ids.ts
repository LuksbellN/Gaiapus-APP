// Geographic identity (Docs/ux-preservacao/06, section 4). URLs keep their current shape (pais, uf, mun);
// this module validates them and says which identifiers may be sent to the API. Nothing is derived from a display name.
import type { Selection } from '../map/types';
import { US_STATE_CODES } from './usStateCodes';
import { stateOfCounty } from './usFips';

const IBGE_MUN = /^\d{7}$/; const IBGE_UF = /^\d{2}$/; const COUNTRY = /^[A-Z]{2,3}$/;

/** Reads pais/uf/mun from the link. Old links stay valid: pais=BRA means Brazil, mun alone implies its state. */
export function parseSelection(params: URLSearchParams): Selection {
  const country = (params.get('pais') ?? '').toUpperCase();
  if (country === 'US' || country === 'USA') {
    const state = params.get('uf')?.toUpperCase() ?? '';
    const uf = US_STATE_CODES.has(state) ? state : null;
    // Counties use namespaced FIPS (US:fips:19169); a county must belong to the selected state, or implies it.
    const raw = params.get('mun'); const countyState = raw && /^US:fips:\d{5}$/.test(raw) ? stateOfCounty(raw) : null;
    const mun = countyState && (!uf || uf === countyState) ? raw : null;
    return { pais: 'USA', uf: uf ?? (mun ? countyState : null), mun };
  }
  const munRaw = params.get('mun'); const mun = munRaw && IBGE_MUN.test(munRaw) ? munRaw : null;
  const ufRaw = params.get('uf'); const uf = ufRaw && IBGE_UF.test(ufRaw) ? ufRaw : mun ? mun.slice(0, 2) : null; // prefix only for IBGE municipalities
  const raw = (params.get('pais') ?? '').toUpperCase();
  const pais = uf || mun ? 'BR' : raw === 'BRA' ? 'BR' : COUNTRY.test(raw) ? raw : null;
  return { pais, uf: pais === 'BR' ? uf : null, mun: pais === 'BR' ? mun : null };
}

/** Identifier accepted by the API for a selection, or null. Foreign countries are never sent to IBGE-based endpoints. */
export function toApiAreaId(sel: Selection): string | null {
  if (sel.pais !== 'BR') return null;
  if (sel.mun) return sel.mun;
  return sel.uf ? null : 'BR'; // states are BR-XX in the catalogue; the UI does not query them by IBGE code
}
