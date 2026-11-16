// A text label inside an SVG scene, on an opaque plate of the theme. Scene backgrounds (soil that darkens with the
// modelled water, a light or dark sky) vary, so no label is drawn straight on them.
export function SvgLabel({ x, y, anchor = 'start', size = 11, children }: { x: number; y: number; anchor?: 'start' | 'middle' | 'end'; size?: number; children: string }) {
  // Width estimated from the character count (SVG text cannot be measured before layout; a little slack is fine).
  const w = children.length * size * 0.56 + 10, h = size + 7; const x0 = anchor === 'end' ? x - w + 5 : anchor === 'middle' ? x - w / 2 : x - 5;
  return <g><rect x={x0} y={y - size - 1} width={w} height={h} rx={4} fill="var(--scene-label-bg)" stroke="var(--border)" strokeWidth={0.75} /><text x={x} y={y} textAnchor={anchor} fill="var(--scene-label-text)" fontSize={size}>{children}</text></g>;
}
