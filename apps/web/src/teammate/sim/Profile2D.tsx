// 2D soil-profile view: the WebGL-free alternative of SoilProfile3D, drawn from the same ProfileLayers.
// Static (no animation), so it also serves reduced-motion users.
import { useMemo } from 'react';
import { DRAINAGE_COLOR, IRRIGATION_COLOR, PROFILE_DEPTH_M, RAIN_COLOR, RUNOFF_COLOR, SOIL_BELOW, type ProfileLayers } from './profile-model';
import type { CropSceneState } from './scene-adapter';

const W = 600, GROUND = 120, SOIL_H = 165, PX_PER_M = SOIL_H / PROFILE_DEPTH_M;
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function Profile2D({ scene, layers, label, zoneLabel }: { scene: CropSceneState; layers: ProfileLayers; label: string; zoneLabel: string }) {
  const drops = useMemo(() => { const r = mulberry32(17); return Array.from({ length: 60 }, () => ({ x: 20 + r() * (W - 40), y: 8 + r() * (GROUND - 24) })); }, []);
  const zoneBottom = layers.roots ? GROUND + layers.roots.depthM * PX_PER_M : GROUND + SOIL_H;
  const plants = 14; const h = layers.plantHeight * 70; const gid = `pg-${scene.date}`;
  return (
    <svg viewBox={`0 0 ${W} 300`} role="img" aria-label={label} data-testid="profile-2d" data-date={scene.date} data-water={scene.waterFraction ?? ''} style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid meet">
      <defs>
        {/* Without a root depth the zone's lower limit is unknown: fade to the neutral colour instead of drawing a boundary. */}
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={layers.soilColor} /><stop offset="0.55" stopColor={layers.soilColor} /><stop offset="1" stopColor={SOIL_BELOW} /></linearGradient>
      </defs>
      {layers.roots
        ? <><rect x="0" y={GROUND} width={W} height={zoneBottom - GROUND} fill={layers.soilColor} /><rect x="0" y={zoneBottom} width={W} height={GROUND + SOIL_H - zoneBottom} fill={SOIL_BELOW} /><line x1="0" x2={W} y1={zoneBottom} y2={zoneBottom} stroke="#f5efe0" strokeWidth="1.5" strokeDasharray="6 4" /></>
        : <rect x="0" y={GROUND} width={W} height={SOIL_H} fill={layers.zone === 'root_zone_mean' ? `url(#${gid})` : layers.soilColor} />}
      {layers.roots && <g data-testid="roots" stroke="#efe3c4" strokeWidth="1.4">{Array.from({ length: plants }, (_, i) => { const x = 30 + i * 41; return <path key={i} d={`M${x},${GROUND} l-6,${layers.roots!.depthM * PX_PER_M * 0.6} M${x},${GROUND} l0,${layers.roots!.depthM * PX_PER_M} M${x},${GROUND} l7,${layers.roots!.depthM * PX_PER_M * 0.7}`} fill="none" />; })}</g>}
      {layers.rulerTicksM.map((d) => <g key={d} data-testid="ruler-tick"><line x1="4" x2="16" y1={GROUND + d * PX_PER_M} y2={GROUND + d * PX_PER_M} stroke="#EAF2EB" /><text x="20" y={GROUND + d * PX_PER_M + 4} fill="#EAF2EB" fontSize="11">{Math.round(d * 100)} cm</text></g>)}
      {layers.probesM.map((d) => <circle key={d} data-testid="probe" cx={W - 40} cy={GROUND + d * PX_PER_M} r="5" fill="#b98d2c" />)}
      {Array.from({ length: plants }, (_, i) => { const x = 30 + i * 41; return h > 0 ? <path key={i} d={layers.maize ? `M${x},${GROUND} l-5,-${h} l10,0 z` : `M${x - 12},${GROUND} q12,-${h * 2} 24,0 z`} fill={layers.leafColor} /> : null; })}
      {drops.slice(0, Math.min(60, Math.round(layers.rainCount / 5))).map((d, i) => <line key={i} x1={d.x} x2={d.x - 2} y1={d.y} y2={d.y + 9} stroke={RAIN_COLOR} strokeWidth="2" strokeLinecap="round" />)}
      {layers.irrigationCount > 0 && Array.from({ length: Math.min(30, Math.round(layers.irrigationCount / 5)) }, (_, i) => <circle key={i} cx={24 + i * 19} cy={GROUND - 4} r="2.5" fill={IRRIGATION_COLOR} />)}
      {layers.drainage && <g data-testid="drainage-arrow" fill={DRAINAGE_COLOR} stroke={DRAINAGE_COLOR}><line x1={W / 2} x2={W / 2} y1={zoneBottom - 40} y2={zoneBottom - 40 + layers.drainage.length * 90} strokeWidth={layers.drainage.width * 220} /><path d={`M${W / 2 - 8},${zoneBottom - 40 + layers.drainage.length * 90} l8,12 l8,-12 z`} /></g>}
      {layers.runoff && <g data-testid="runoff-arrow" fill={RUNOFF_COLOR} stroke={RUNOFF_COLOR}><line x1={60} x2={60 + layers.runoff.length * 400} y1={GROUND - 3} y2={GROUND - 3} strokeWidth={layers.runoff.width * 220} /><path d={`M${60 + layers.runoff.length * 400},${GROUND - 11} l12,8 l-12,8 z`} /></g>}
      <text x={W - 12} y={GROUND + 18} textAnchor="end" fill="#EAF2EB" fontSize="13">{zoneLabel}</text>
    </svg>
  );
}
