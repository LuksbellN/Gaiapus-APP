// 2D drawing of a RootLayer (SVG). Geometry comes from root-model.ts; this file only maps metres to pixels.
import type { RootLayer } from './root-model';

export type RootText = { illustrative: string; depth: (cm: number, source: 'modelled' | 'observed') => string; continues: (cm: number) => string };

export function RootSystem2D({ layer, groundY, pxPerM, centerX, text }: { layer: RootLayer; groundY: number; pxPerM: number; centerX: number; text: RootText }) {
  const X = (x: number) => centerX + x * pxPerM, Y = (y: number) => groundY - y * pxPerM;
  const bottom = groundY + layer.drawDepthM * pxPerM;
  return (
    <g data-testid="roots" data-root-source={layer.source} data-root-architecture={layer.architecture} data-segments={layer.segments.length} strokeLinecap="round">
      {layer.segments.map((s, i) => (
        <line key={i} x1={X(s.from[0])} y1={Y(s.from[1])} x2={X(s.to[0])} y2={Y(s.to[1])} stroke={s.order === 0 ? '#efe3c4' : '#d9c9a3'}
              strokeWidth={Math.max(0.6, s.radius * 180)} strokeOpacity={layer.source === 'illustrative' ? 0.85 : 1} />
      ))}
      {layer.depthLabelM != null && layer.source !== 'illustrative'
        ? <text x={X(-1.9)} y={bottom - 4} fill="#efe3c4" fontSize="11">{text.depth(Math.round(layer.depthLabelM * 100), layer.source)}</text>
        : <text x={X(-1.9)} y={groundY + 34} fill="#efe3c4" fontSize="11">{text.illustrative}</text>}
      {layer.continuesBelow && layer.depthLabelM != null && (
        <g data-testid="roots-continue" fill="#efe3c4"><path d={`M${centerX - 7},${bottom - 2} l7,10 l7,-10 z`} /><text x={centerX + 12} y={bottom + 6} fontSize="11">{text.continues(Math.round(layer.drawDepthM * 100))}</text></g>
      )}
    </g>
  );
}
