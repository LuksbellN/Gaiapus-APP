import { describe, expect, it } from 'vitest';
import { collapseFromContent, sheetHeights, snapSheet, stepSheet } from './bottom-sheet';

describe('bottom sheet positions', () => {
  it('has three heights that fit the container, the expanded one leaving the search bar visible', () => {
    expect(sheetHeights(719)).toEqual({ recolhida: 132, media: 331, expandida: 647 });
    const small = sheetHeights(300); // landscape phone
    expect(small.expandida).toBe(228);
    expect(small.recolhida).toBeLessThanOrEqual(small.media);
    expect(small.media).toBeLessThanOrEqual(small.expandida);
    expect(sheetHeights(0).expandida).toBeGreaterThan(0);
  });
  it('snaps to the nearest position, and a deliberate fling moves one step in its direction', () => {
    const h = sheetHeights(719);
    expect(snapSheet(140, 0, h)).toBe('recolhida');
    expect(snapSheet(300, 0, h)).toBe('media');
    expect(snapSheet(600, 0, h)).toBe('expandida');
    expect(snapSheet(340, 0.8, h)).toBe('expandida'); // fast upwards from the middle
    expect(snapSheet(320, -0.8, h)).toBe('recolhida'); // fast downwards from the middle
    expect(snapSheet(640, -0.8, h)).toBe('media');
    expect(snapSheet(9999, 0, h)).toBe('expandida');
    expect(snapSheet(-50, 0, h)).toBe('recolhida');
  });
  it('steps one position at a time and stops at the ends', () => {
    expect(stepSheet('recolhida', 1)).toBe('media'); expect(stepSheet('media', 1)).toBe('expandida'); expect(stepSheet('expandida', 1)).toBe('expandida');
    expect(stepSheet('expandida', -1)).toBe('media'); expect(stepSheet('recolhida', -1)).toBe('recolhida');
  });
  it('collapses from the content only at the top, with a deliberate vertical pull, away from controls', () => {
    const base = { startScrollTop: 0, endScrollTop: 0, dx: 4, dy: 120, onControl: false };
    expect(collapseFromContent(base)).toBe(true);
    expect(collapseFromContent({ ...base, startScrollTop: 30 })).toBe(false); // the list was scrolled: the gesture scrolls it
    expect(collapseFromContent({ ...base, endScrollTop: 12 })).toBe(false);
    expect(collapseFromContent({ ...base, dy: 40 })).toBe(false); // not deliberate
    expect(collapseFromContent({ ...base, dy: -120 })).toBe(false); // upwards scrolls the content
    expect(collapseFromContent({ ...base, dx: 90 })).toBe(false); // sideways
    expect(collapseFromContent({ ...base, onControl: true })).toBe(false); // inputs, buttons and links keep their gesture
  });
});
