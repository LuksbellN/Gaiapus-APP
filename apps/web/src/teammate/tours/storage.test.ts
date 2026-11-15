import { beforeEach, describe, expect, it } from 'vitest';
import { clearTours, reloadToursForTest, setTour, tourRecord, TOURS_KEY } from './storage';
import { resetAll } from '../store';
import { TOURS, tourForPath } from './scripts';
import { catalogFor } from '../i18n';

describe('tour storage', () => {
  beforeEach(() => { localStorage.clear(); reloadToursForTest(); });

  it('starts as new and keeps state and step under its own key', () => {
    expect(tourRecord('plan@1').state).toBe('new');
    setTour('plan@1', 'in_progress', 2);
    reloadToursForTest();
    expect(tourRecord('plan@1')).toMatchObject({ state: 'in_progress', step: 2 });
    expect(JSON.parse(localStorage.getItem(TOURS_KEY)!).v).toBe(1);
    expect(Object.keys(localStorage).filter((k) => k.startsWith('gaiapus.v1'))).toEqual([]);
  });

  it('ignores corrupted storage', () => {
    localStorage.setItem(TOURS_KEY, '{not json');
    expect(tourRecord('plan@1').state).toBe('new');
  });

  it('"delete all data on this device" also clears tutorial progress', () => {
    setTour('overview@1', 'done');
    resetAll();
    reloadToursForTest();
    expect(localStorage.getItem(TOURS_KEY)).toBeNull();
    expect(tourRecord('overview@1').state).toBe('new');
    clearTours();
  });
});

describe('tour scripts', () => {
  it('have 1 to 5 steps and texts in every language', () => {
    for (const tour of TOURS) {
      expect(tour.steps.length).toBeGreaterThan(0); expect(tour.steps.length).toBeLessThanOrEqual(5);
      for (const l of ['pt-BR', 'en'] as const) {
        const c = catalogFor(l) as unknown as { tour: Record<string, Record<string, { title: string; body: string }>> };
        tour.steps.forEach((_, i) => { expect(c.tour[tour.name][`s${i + 1}`].title).toBeTruthy(); expect(c.tour[tour.name][`s${i + 1}`].body).toBeTruthy(); });
      }
    }
  });

  it('the simulator offers the one-step tour when there is no compatible series', () => {
    document.body.innerHTML = '<div data-tour="sim-missing"></div>';
    expect(tourForPath('/simulador')?.id).toBe('simulator-unavailable@1');
    document.body.innerHTML = '';
    expect(tourForPath('/simulador')?.id).toBe('simulator@1');
    expect(tourForPath('/mais')).toBeUndefined();
  });
});
