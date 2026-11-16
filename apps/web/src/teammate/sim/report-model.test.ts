// Address and identity of a technical report on the screen: explicit scope, never the daily cursor, zoom or theme.
import { describe, expect, it } from 'vitest';
import { reportHref, reportPath, reportRequestKey, reportRunOf, reportScopeOf, reportSeasonOf, simulationHref } from './report-model';

const RUN = 'sim_fd61ab4118a4e32398a12156';
const params = (query: string) => new URLSearchParams(query);

describe('report address', () => {
  it('the default scope is the whole run; a season is an explicit choice with a valid crop and harvest year', () => {
    expect(reportScopeOf(params(`run=${RUN}`))).toEqual({ kind: 'run' });
    expect(reportScopeOf(params(`run=${RUN}&cultura=soy&safra=2027`))).toEqual({ kind: 'run' });
    expect(reportScopeOf(params(`run=${RUN}&escopo=safra&cultura=soy&safra=2027`))).toEqual({ kind: 'season', crop_id: 'soy', harvest_year: 2027 });
    for (const bad of ['escopo=safra', 'escopo=safra&cultura=soy', 'escopo=safra&cultura=SOY!&safra=2027', 'escopo=safra&cultura=soy&safra=27', 'escopo=tudo&cultura=soy&safra=2027']) expect(reportScopeOf(params(bad)), bad).toEqual({ kind: 'run' });
    expect(reportSeasonOf(params('cultura=maize2&safra=2028'))).toEqual({ crop_id: 'maize2', harvest_year: 2028 });
    expect(reportSeasonOf(params('cultura=maize2'))).toBeNull();
  });

  it('only a well-formed run id is accepted from the address', () => {
    expect(reportRunOf(params(`run=${RUN}`))).toBe(RUN);
    for (const bad of ['', 'run=', 'run=sim_123', 'run=../../etc', `run=${RUN}%20`, 'run=<script>']) expect(reportRunOf(params(bad)), bad).toBeNull();
  });

  it('links carry the run and the season on screen, never the day, the trajectory, the camera or the theme', () => {
    const season = { crop_id: 'soy', harvest_year: 2027 };
    expect(reportHref({ run: RUN })).toBe(`#/relatorio?run=${RUN}`);
    expect(reportHref({ run: RUN, season, local: 'BR:ibge:3170206' })).toBe(`#/relatorio?run=${RUN}&local=BR:ibge:3170206&cultura=soy&safra=2027`);
    expect(reportPath({ run: RUN, season, scope: 'season' })).toBe(`/relatorio?run=${RUN}&cultura=soy&safra=2027&escopo=safra`);
    expect(reportHref({ run: RUN, scope: 'season' })).toBe(`#/relatorio?run=${RUN}`);
    expect(reportHref({ run: RUN, reportId: `rep_${'a'.repeat(32)}` })).toBe(`#/relatorio?run=${RUN}&rel=rep_${'a'.repeat(32)}`);
    // The way back opens the same place, crop and harvest year; a malformed place is ignored.
    expect(simulationHref(params(`run=${RUN}&local=BR:ibge:3170206&cultura=soy&safra=2027`))).toBe('#/simulador?modo=planejamento&local=BR:ibge:3170206&cultura=soy&safra=2027');
    expect(simulationHref(params(`run=${RUN}&local=javascript:alert(1)&cultura=soy&safra=2027`))).toBe('#/simulador?modo=planejamento');
  });

  it('a request is identified by run, scope and language', () => {
    const run = reportRequestKey(RUN, { kind: 'run' }, 'pt-BR');
    expect(run).toBe(`${RUN}|run|pt-BR`);
    expect(reportRequestKey(RUN, { kind: 'season', crop_id: 'soy', harvest_year: 2027 }, 'en')).toBe(`${RUN}|season:soy:2027|en`);
    expect(reportRequestKey(RUN, { kind: 'run' }, 'en')).not.toBe(run);
  });
});
