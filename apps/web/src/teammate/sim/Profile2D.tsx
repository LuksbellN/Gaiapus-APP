// 2D soil-profile view: the WebGL-free alternative of SoilProfile3D, drawn from the same ProfileLayers.
// Static (no animation), so it also serves reduced-motion users.
import { useMemo } from 'react';
import { DRAINAGE_COLOR, IRRIGATION_COLOR, mulberry32, LED_COLORS, PROFILE_DEPTH_M, RAIN_COLOR, RUNOFF_COLOR, SOIL_BELOW, type ProfileLayers } from './profile-model';
import type { CropSceneState } from './scene-adapter';
import { STAKE_MODEL } from './stake-model';
import { RootSystem2D, type RootText } from './RootSystem2D';
import { brachiariaPlan } from './plants/grass';
import { maizePlan } from './plants/maize';
import { Plant2D } from './plants/Plant2D';
import { soyPlan } from './plants/soy';
import { SvgLabel } from './SvgLabel';

const W = 600, GROUND = 120, SOIL_H = 165, PX_PER_M = SOIL_H / PROFILE_DEPTH_M, STAKE_X = W - 46;
/** Head case height above the ground (model: case top at 0.134 m above the soil line). The LED dot above it is a legend of the simulated code, not a part at scale. */
const HEAD_H = 0.134 * PX_PER_M;
/** Scale of the plants above the ground (maize with its tassel must fit the band above the soil line). */
const PLANT_PX_PER_M = 44;

export type DeviceText = { electrode: (depthCm: number) => string; led: string; roots: RootText };

export function Profile2D({ scene, layers, label, zoneLabel, deviceText }: { scene: CropSceneState; layers: ProfileLayers; label: string; zoneLabel: string; deviceText: DeviceText }) {
  const drops = useMemo(() => { const r = mulberry32(17); return Array.from({ length: 60 }, () => ({ x: 20 + r() * (W - 40), y: 8 + r() * (GROUND - 24) })); }, []);
  const zoneBottom = layers.roots ? GROUND + layers.roots.depthM * PX_PER_M : GROUND + SOIL_H;
  const plants = 14; const gid = `pg-${scene.date}`; const plantKey = layers.plant?.key, coverKey = layers.cover?.key;
  // Above the ground the drawing is not to the soil's scale: plants are fitted to the sky band (same organs as the 3D view).
  const crop = useMemo(() => { const p = layers.plant; return p ? (p.family === 'maize' ? maizePlan(p.pose, 0, 'far') : soyPlan(p.pose, 0, 'far')) : null; }, [plantKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const cover = useMemo(() => (layers.cover ? brachiariaPlan(layers.cover.pose, 0, 'far') : null), [coverKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <svg viewBox={`0 0 ${W} 300`} role="img" aria-label={label} data-testid="profile-2d" data-date={scene.date} data-water={scene.waterFraction ?? ''} style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid meet">
      <defs>
        {/* Without a root depth the zone's lower limit is unknown: fade to the neutral colour instead of drawing a boundary. */}
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={layers.soilColor} /><stop offset="0.55" stopColor={layers.soilColor} /><stop offset="1" stopColor={SOIL_BELOW} /></linearGradient>
        {crop && <g id={`${gid}-crop`}><Plant2D plan={crop} scale={PLANT_PX_PER_M} /></g>}
        {cover && <g id={`${gid}-cover`}><Plant2D plan={cover} scale={PLANT_PX_PER_M} /></g>}
      </defs>
      {layers.roots
        ? <><rect x="0" y={GROUND} width={W} height={zoneBottom - GROUND} fill={layers.soilColor} /><rect x="0" y={zoneBottom} width={W} height={GROUND + SOIL_H - zoneBottom} fill={SOIL_BELOW} /><line x1="0" x2={W} y1={zoneBottom} y2={zoneBottom} stroke="#f5efe0" strokeWidth="1.5" strokeDasharray="6 4" /></>
        : <rect x="0" y={GROUND} width={W} height={SOIL_H} fill={layers.zone === 'root_zone_mean' ? `url(#${gid})` : layers.soilColor} />}
      {layers.rootSystem && <RootSystem2D layer={layers.rootSystem} groundY={GROUND} pxPerM={PX_PER_M} centerX={W / 2} text={deviceText.roots} />}
      {layers.rulerTicksM.map((d) => <g key={d} data-testid="ruler-tick"><line x1="4" x2="16" y1={GROUND + d * PX_PER_M} y2={GROUND + d * PX_PER_M} stroke="var(--scene-label-bg)" strokeWidth="3" /><line x1="4" x2="16" y1={GROUND + d * PX_PER_M} y2={GROUND + d * PX_PER_M} stroke="var(--scene-label-text)" /><SvgLabel x={22} y={GROUND + d * PX_PER_M + 4}>{`${Math.round(d * 100)} cm`}</SvgLabel></g>)}
      {layers.probesM.map((d) => <circle key={d} data-testid="probe" cx={W - 40} cy={GROUND + d * PX_PER_M} r="5" fill="#b98d2c" />)}
      {cover && Array.from({ length: plants }, (_, i) => <use key={`c${i}`} href={`#${gid}-cover`} x={50 + i * 41} y={GROUND} />)}
      {crop && Array.from({ length: plants }, (_, i) => <use key={i} href={`#${gid}-crop`} x={30 + i * 41} y={GROUND} data-testid="profile-plant" />)}
      {/* Water stress of the model (ks) as a band at the soil line: the plants themselves are not recoloured. */}
      {(crop || cover) && <rect data-testid="stress-band" x="0" y={GROUND - 2} width={W} height="4" fill={layers.leafColor} />}
      {drops.slice(0, Math.min(60, Math.round(layers.rainCount / 5))).map((d, i) => <line key={i} x1={d.x} x2={d.x - 2} y1={d.y} y2={d.y + 9} stroke={RAIN_COLOR} strokeWidth="2" strokeLinecap="round" />)}
      {layers.irrigationCount > 0 && Array.from({ length: Math.min(30, Math.round(layers.irrigationCount / 5)) }, (_, i) => <circle key={i} cx={24 + i * 19} cy={GROUND - 4} r="2.5" fill={IRRIGATION_COLOR} />)}
      {layers.drainage && <g data-testid="drainage-arrow" fill={DRAINAGE_COLOR} stroke={DRAINAGE_COLOR}><line x1={W / 2} x2={W / 2} y1={zoneBottom - 40} y2={zoneBottom - 40 + layers.drainage.length * 90} strokeWidth={layers.drainage.width * 220} /><path d={`M${W / 2 - 8},${zoneBottom - 40 + layers.drainage.length * 90} l8,12 l8,-12 z`} /></g>}
      {layers.runoff && <g data-testid="runoff-arrow" fill={RUNOFF_COLOR} stroke={RUNOFF_COLOR}><line x1={60} x2={60 + layers.runoff.length * 400} y1={GROUND - 3} y2={GROUND - 3} strokeWidth={layers.runoff.width * 220} /><path d={`M${60 + layers.runoff.length * 400},${GROUND - 11} l12,8 l-12,8 z`} /></g>}
      {layers.device && <g data-testid="device">
        {/* Schematic of the rev G stake at its measured size (stake-model.ts): tube and tip in the soil, head case resting on the ground, antenna above; electrodes at 15/40 cm. */}
        <rect x={STAKE_X - 2} y={GROUND} width="4" height={STAKE_MODEL.depthBelowSoilM * PX_PER_M} fill="#8a9482" />
        <rect x={STAKE_X - 7} y={GROUND - HEAD_H} width="14" height={HEAD_H} rx="2" fill="#8a9482" stroke="#0d1a22" />
        <rect x={STAKE_X + 4} y={GROUND - STAKE_MODEL.heightAboveSoilM * PX_PER_M} width="1.5" height={STAKE_MODEL.heightAboveSoilM * PX_PER_M - HEAD_H} fill="#0d0d0d" />
        {layers.device.electrodesM.map((d) => <g key={d} data-testid="electrode"><rect x={STAKE_X - 6} y={GROUND + d * PX_PER_M - 3} width="12" height="6" rx="1" fill="#b98d2c" /><SvgLabel x={STAKE_X - 14} y={GROUND + d * PX_PER_M + 4} anchor="end">{deviceText.electrode(Math.round(d * 100))}</SvgLabel></g>)}
        <circle data-testid="led" data-led={layers.device.led} cx={STAKE_X} cy={GROUND - HEAD_H - 9} r="5" fill={LED_COLORS[layers.device.led]} stroke="#0d1a22" />
        <SvgLabel x={STAKE_X - 14} y={GROUND - HEAD_H - 5} anchor="end">{deviceText.led}</SvgLabel>
      </g>}
      <SvgLabel x={W / 2} y={GROUND + 22} anchor="middle" size={13}>{zoneLabel}</SvgLabel>
    </svg>
  );
}
