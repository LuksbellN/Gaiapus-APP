import { describe, expect, it } from 'vitest';
import { ELECTRODES_M } from './profile-model';
import { LED_MATERIALS, litLedMaterial, STAKE_MODEL, stakePlacement } from './stake-model';

describe('Gaiapus stake model placement (rev G assembly)', () => {
  it('is drawn at true scale: one model metre is one scene metre', () => {
    expect(stakePlacement([1.65, 0, 1.28]).scale).toBe(1);
  });

  it('anchors the model soil line on the scene ground and the tube axis on the installation point', () => {
    const p = stakePlacement([1.65, 0, 1.28]);
    // Model soil line -> scene y = 0; tube axis -> anchor x/z.
    expect(p.position[1] + STAKE_MODEL.soilLineY).toBeCloseTo(0, 6);
    expect(p.position[0] + STAKE_MODEL.tubeAxis.x).toBeCloseTo(1.65, 6);
    expect(p.position[2] + STAKE_MODEL.tubeAxis.z).toBeCloseTo(1.28, 6);
  });

  it('keeps the probe in the soil and the head above it', () => {
    expect(STAKE_MODEL.depthBelowSoilM).toBeGreaterThan(0.4);
    expect(STAKE_MODEL.heightAboveSoilM).toBeGreaterThan(0.1);
    expect(STAKE_MODEL.heightAboveSoilM).toBeLessThan(0.2);
  });

  it('the 15 and 40 cm electrode depths fall inside the probe board of the model', () => {
    for (const d of ELECTRODES_M) {
      expect(d).toBeGreaterThan(STAKE_MODEL.probeBoard.topDepthM);
      expect(d).toBeLessThan(STAKE_MODEL.probeBoard.bottomDepthM);
    }
  });

  it('lights at most one LED lens, chosen by the simulated code, and none when the code is 0', () => {
    expect(litLedMaterial(0)).toBeNull();
    expect(litLedMaterial(1)).toBe(LED_MATERIALS[0]);
    expect(litLedMaterial(2)).toBe(LED_MATERIALS[1]);
    expect(litLedMaterial(3)).toBe(LED_MATERIALS[2]);
  });
});
