// The stake guide of "Adicionar sensor": a small rotatable model that shows where the QR label is.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { StakeGuide } from './StakeGuide';
import { clampPose, GUIDE_VIEWS, QR_NODE, rotatePose, viewPose } from './stake-view';

describe('stake model facts the guide relies on', () => {
  it('the shipped model still has the QR label node (the optimiser must not drop or merge it)', () => {
    const glb = readFileSync(join(process.cwd(), 'src', 'teammate', 'assets', 'gaiapus-stake-revG.glb'));
    const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8')) as { nodes: { name?: string }[] };
    expect(json.nodes.some((n) => n.name === 'QR label')).toBe(true);
    expect(QR_NODE).toBe('QR_label'); // the loader replaces the space
  });
});

describe('camera poses', () => {
  const qr = { center: [0.202, -0.005, 0.131] as const, normal: [1, 0, 0] as const };
  const whole = { center: [0.1, -0.22, 0.11] as const, height: 0.66 };
  it('the QR view looks at the label from its own side; the whole view fits the stake', () => {
    const q = viewPose('qr', qr, whole), w = viewPose('whole', qr, whole);
    expect(q.target).toEqual([0.202, -0.005, 0.131]);
    expect(q.position[0]).toBeGreaterThan(0.202 + 0.15);                    // in front of the label, on +X
    expect(w.target).toEqual([0.1, -0.22, 0.11]);
    const dist = (p: typeof q) => Math.hypot(p.position[0] - p.target[0], p.position[1] - p.target[1], p.position[2] - p.target[2]);
    expect(dist(w)).toBeGreaterThan(dist(q) * 2);
    expect(GUIDE_VIEWS).toEqual(['qr', 'whole']);
  });
  it('keyboard rotation changes the angle step by step and never flips over the poles or leaves the zoom range', () => {
    const start = { azimuth: 0, polar: 1.2, distance: 0.3 };
    expect(rotatePose(start, 'ArrowRight')!.azimuth).toBeCloseTo(0.2, 6);
    expect(rotatePose(start, 'ArrowLeft')!.azimuth).toBeCloseTo(-0.2, 6);
    expect(rotatePose(start, 'ArrowUp')!.polar).toBeCloseTo(1.05, 6);
    expect(rotatePose(start, '+')!.distance).toBeLessThan(0.3);
    expect(rotatePose(start, '-')!.distance).toBeGreaterThan(0.3);
    expect(rotatePose(start, 'a')).toBeNull();                               // other keys are not handled (not prevented)
    let p = start; for (let i = 0; i < 40; i++) p = rotatePose(p, 'ArrowUp')!;
    expect(p.polar).toBeGreaterThanOrEqual(0.15);
    for (let i = 0; i < 80; i++) p = rotatePose(p, 'ArrowDown')!;
    expect(p.polar).toBeLessThanOrEqual(Math.PI - 0.15);
    for (let i = 0; i < 80; i++) p = rotatePose(p, '+')!;
    expect(p.distance).toBeGreaterThanOrEqual(0.12);
    expect(clampPose({ azimuth: 1, polar: 9, distance: 99 })).toEqual({ azimuth: 1, polar: Math.PI - 0.15, distance: 1.8 });
  });
});

describe('guide without WebGL (this test environment has none)', () => {
  it('says in words where the QR is, with no canvas and no dead controls', () => {
    render(<StakeGuide />);
    const guide = screen.getByTestId('stake-guide');
    expect(guide).toHaveAttribute('data-state', 'unavailable');
    expect(guide).toHaveTextContent('O QR fica numa etiqueta na lateral da caixa, do lado oposto ao pluviômetro');
    expect(guide).toHaveTextContent('Modelo 3D indisponível neste aparelho');
    expect(guide.querySelector('canvas')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Mostrar o QR' })).toBeNull();
  });
  it('is a labelled figure and does not take focus or open anything by itself', async () => {
    render(<><button>antes</button><StakeGuide /></>);
    expect(screen.getByRole('figure', { name: 'Onde fica o QR na estaca' })).toBeInTheDocument();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'antes' })).toHaveFocus();
  });
});
