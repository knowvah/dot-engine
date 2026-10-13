// SPDX-License-Identifier: EPL-2.0
//
// circpos.c arithmetic as the native arm64 oracle computes it (objdump of
// libgvplugin_neato_layout `_doBlock` / `_applyDelta`): `x += a + b` adds the
// parenthesised right-hand side first, and clang's -ffp-contract=on fuses
// setInfo's numerator, positionChildren's leftover arc and applyDelta's
// rotation into fmadd/fnmsub. Each case asserts the C-order result AND that
// the naive left-to-right / unfused form differs for the chosen values, so a
// regression to the old order fails.
// @see lib/circogen/circpos.c

import { describe, it, expect } from 'vitest';
import type { Node } from '../../model/node.js';
import { fma } from '../../common/fma.js';
import { libmHypot } from '../../common/libm-hypot.js';
import type { Block } from './blocks.js';
import { advanceAngleLN, nextChildAngle, setInfo, leftoverArc, type PosInfo } from './position.js';
import { applyDelta, rotFromParentPos, rotGeneral, closestNode } from './position-helpers.js';

function info(diameter: number, minRadius: number): PosInfo {
  return { n: {} as Node, theta: 0, minRadius, maxRadius: 0, diameter, scale: 1, childCount: 1 };
}

function node(x: number, y: number, psi = 0): Node {
  return { info: { pos: [x, y], alg: { psi } } } as unknown as Node;
}

function block(nodes: Node[], extra: Partial<Block> = {}): Block {
  return {
    subGraph: { nodes: nodes.map((orig) => ({ orig })) } as unknown as Block['subGraph'],
    radius: 0, rad0: 0, circleList: nodes, children: [], parentPos: -1, flags: 0,
    child: nodes[0] ?? null, ...extra,
  };
}

describe('circpos.c evaluation order', () => {
  it('childAngle += incidentAngle + mindistAngle adds the sum last', () => {
    const [ca, inc, mda] = [0.1, 0.1, 1.1];
    expect((ca + inc) + mda).not.toBe(ca + (inc + mda));
    expect(nextChildAngle(ca, inc, mda, 1)).toBe(ca + (inc + mda));
    expect(nextChildAngle(ca, inc, 2 * mda, 3)).toBe(ca + (inc + mda));
    expect(advanceAngleLN(ca, inc, 2 * mda, 3, 0)).toBe(ca + (inc + mda));
  });

  it('getRotation parent_pos branch: theta += M_PI - parent_pos', () => {
    const theta = 0.1;
    const sn = block([], { parentPos: 0.7 });
    expect((theta + Math.PI) - 0.7).not.toBe(theta + (Math.PI - 0.7));
    expect(rotFromParentPos(sn, theta)).toBe(theta + (Math.PI - 0.7));
  });

  it('getRotation general branch: theta += M_PI - phi - PSI, wrapped past 2*M_PI', () => {
    // neighbor (1,1) is not the closest node after translating by (-3,-1).
    const nbr = node(1, 1, 2.9);
    const sn = block([nbr, node(3, 1)]);
    const theta = 0.1;
    const phi = Math.atan2(1, 1);
    expect(((theta + Math.PI) - phi) - 2.9).not.toBe(theta + ((Math.PI - phi) - 2.9));
    expect(rotGeneral(sn, -3, -1, nbr, theta)).toBe(theta + ((Math.PI - phi) - 2.9));
  });

  it('getRotation coalesced block with -r >= n_x takes the wrapped general branch', () => {
    // C: `if (COALESCED(sn) && -r < n_x) ... else { ...; if (theta > 2*M_PI) theta -= 2*M_PI; }`
    const nbr = node(-5, 0.5, -3);
    const sn = block([nbr, node(-1, 0)], { radius: 2, rad0: 1, flags: 1 });
    const theta = 6.2;
    const phi = Math.atan2(0.5, -5);
    const raw = theta + ((Math.PI - phi) - -3);
    expect(raw).toBeGreaterThan(2 * Math.PI);
    expect(((theta + Math.PI) - phi) - -3).not.toBe(raw);
    expect(rotGeneral(sn, 0, 0, nbr, theta)).toBe(raw - 2 * Math.PI);
  });

  it('closest-node search uses the C library hypot', () => {
    // macOS hypot(0.1, 0.4) rounds to exactly h = 0.4123105625617661 (V8's
    // Math.hypot gives one ulp less), so the other node is NOT strictly closer.
    const h = 0.4123105625617661;
    expect(libmHypot(0.1, 0.4)).toBe(h);
    expect(Math.hypot(0.1, 0.4)).toBeLessThan(h);
    const nbr = node(h, 0);
    const sn = block([nbr, node(0.1, 0.4)]);
    expect(closestNode(sn, 0, 0, nbr)).toBe(nbr);
  });
});

describe('circpos.c fma contraction', () => {
  it('setInfo numerator is fmadd(p0.diameter, p1.minRadius, p1.diameter*p0.minRadius)', () => {
    const p0 = info(0.1, 1.1);
    const p1 = info(0.1, 0.1);
    const den = 2 * 0.01 * 1.1 * 0.1;
    const t = Math.max(fma(0.1, 0.1, 0.1 * 1.1) / den, 1);
    expect(t).not.toBe(Math.max((0.1 * 0.1 + 0.1 * 1.1) / den, 1));
    setInfo(p0, p1, 0.01);
    expect(p0.scale).toBe(t);
    expect(p1.scale).toBe(p0.scale);
  });

  it('positionChildren leftover arc is fnmsub(childRadius, 2*M_PI, diameter)', () => {
    const [cr, diameter] = [0.1, 0.2];
    expect(fma(2 * Math.PI, cr, -diameter)).not.toBe(2 * Math.PI * cr - diameter);
    expect(leftoverArc(cr, diameter)).toBe(fma(2 * Math.PI, cr, -diameter));
  });

  it('applyDelta rotates with fmadd: X = x*cos + (-sin*y), Y = x*sin + cos*y', () => {
    const n = node(0.1, 0.1);
    const rot = 0.7;
    const [c, s] = [Math.cos(rot), Math.sin(rot)];
    const X = fma(0.1, c, -s * 0.1);
    const Y = fma(0.1, s, c * 0.1);
    expect(X).not.toBe(0.1 * c - 0.1 * s);
    expect(Y).not.toBe(0.1 * s + 0.1 * c);
    applyDelta(block([n]), 0, 0, rot);
    expect(n.info.pos).toEqual([X, Y]);
  });
});
