// WCAG 2.x contrast of two colours (relative luminance in sRGB). Used by the token tests and by the design preview,
// so the numbers shown on screen are computed from the colours in use, not typed by hand.
// A ratio is the measure of one pair; it says nothing about size, shape, occlusion or the rest of the interface.
export type Rgb = readonly [number, number, number];

export function parseColor(input: string): { rgb: Rgb; alpha: number } | null {
  const s = input.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(s);
  if (hex) { const h = hex[1].length === 3 ? hex[1].split('').map((c) => c + c).join('') : hex[1]; return { rgb: [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)], alpha: 1 }; }
  const fn = /^rgba?\(([^)]+)\)$/.exec(s);
  if (fn) { const p = fn[1].split(/[\s,/]+/).filter(Boolean).map(Number); if (p.length >= 3 && p.every(Number.isFinite)) return { rgb: [p[0], p[1], p[2]], alpha: p.length > 3 ? p[3] : 1 }; }
  return null;
}
/** Colour as it is seen over an opaque background (alpha compositing in sRGB, as browsers do). */
export function over(fg: string, bg: string): Rgb {
  const f = parseColor(fg), b = parseColor(bg);
  if (!f || !b) throw new Error(`cannot parse colour: ${!f ? fg : bg}`);
  return [0, 1, 2].map((i) => f.rgb[i] * f.alpha + b.rgb[i] * (1 - f.alpha)) as unknown as Rgb;
}
const opaque = (c: string | Rgb): Rgb => { if (typeof c !== 'string') return c; const p = parseColor(c); if (!p) throw new Error(`cannot parse colour: ${c}`); return p.rgb; };
export function luminance(c: string | Rgb): number {
  const [r, g, b] = opaque(c).map((v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** Contrast ratio, 1–21. Not rounded: thresholds are decided on the exact value. */
export function contrast(a: string | Rgb, b: string | Rgb): number {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
