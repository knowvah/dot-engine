// SPDX-License-Identifier: EPL-2.0

/**
 * Branch-coverage tests for compass-port.ts: rankdir-dependent rotation
 * (cwrotatepf/invflipSide/invflipAngle) under BT and RL, unrecognized
 * compass strings, and the htmlPort/polyPort fallback paths.
 *
 * compass-port.test.ts already covers the TB/LR identity cases and the
 * IS_BOX / insidefn ray-cast paths; this file fills the rankdir=BT/RL
 * branches and the compassDirection/htmlPort/polyPort edges the batch-3
 * coverage digest (plans/coverage-90/batch-3/T3d.md) flagged as missing.
 *
 * @see lib/common/shapes.c:compassPort (line 2698)
 * @see lib/common/shapes.c:invflip_side (line 2548)
 * @see lib/common/shapes.c:invflip_angle (line 2606)
 * @see lib/common/htmltable.c:html_port (line 916)
 */

import { describe, it, expect } from 'vitest';
import { compassPort, polyPort } from './compass-port.js';
import { makePort } from '../model/edgeInfo.js';
import { makeNodeInfo } from '../model/nodeInfo.js';
import { BOTTOM, RIGHT, TOP, LEFT } from './splines-constants.js';
import { RANKDIR_BT, RANKDIR_RL } from '../layout/dot/init.js';
import type { Node } from '../model/node.js';
import type { Port } from '../model/geom.js';

const ALL_SIDES = BOTTOM | RIGHT | TOP | LEFT;

/** A 54×36 node centered at the origin, with a configurable rankdir. */
function originNode(rankdir = 0): Node {
  const info = makeNodeInfo();
  info.coord = { x: 0, y: 0 };
  info.lw = 27; info.rw = 27; info.ht = 36;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { info, root: { info: { rankdir } } } as any;
}

function resolve(compass: string, rankdir = 0): Port {
  const pp = makePort();
  compassPort(originNode(rankdir), { bp: null, compass, sides: ALL_SIDES }, pp);
  return pp;
}

// ---------------------------------------------------------------------------
// cwrotatepf — 180°/270° cases (rankdir BT/RL)
// ---------------------------------------------------------------------------

describe('compassPort — point rotation under rankdir BT (180°) / RL (270°)', () => {
  it('rankdir=BT rotates the north point to the south position', () => {
    expect(resolve('n', RANKDIR_BT).p).toEqual({ x: 0, y: -18 });
  });

  it('rankdir=RL rotates the north point to the east position', () => {
    // Under RL, gdFlip(n) is true so compassBbox uses the flipped bbox
    // (ur = {ht/2, lw} = {18, 27}); dirN('') then aims at {0, 27}, which
    // cwrotatepf(270°) sends to {27, 0}.
    expect(resolve('n', RANKDIR_RL).p).toEqual({ x: 27, y: 0 });
  });
});

// ---------------------------------------------------------------------------
// invflipSide — BT and RL
// ---------------------------------------------------------------------------

describe('compassPort — invflipSide under rankdir=BT', () => {
  it('"n" → side BOTTOM (TOP flips to BOTTOM)', () => {
    const p = resolve('n', RANKDIR_BT);
    expect(p.side & BOTTOM).toBe(BOTTOM);
    expect(p.side & TOP).toBe(0);
  });

  it('"s" → side TOP (BOTTOM flips to TOP)', () => {
    expect(resolve('s', RANKDIR_BT).side & TOP).toBe(TOP);
  });

  it('"e" → side RIGHT unchanged (fallback path, side is not TOP/BOTTOM)', () => {
    expect(resolve('e', RANKDIR_BT).side & RIGHT).toBe(RIGHT);
  });
});

describe('compassPort — invflipSide under rankdir=RL', () => {
  it('"n" → RIGHT', () => { expect(resolve('n', RANKDIR_RL).side & RIGHT).toBe(RIGHT); });
  it('"s" → LEFT', () => { expect(resolve('s', RANKDIR_RL).side & LEFT).toBe(LEFT); });
  it('"w" → BOTTOM', () => { expect(resolve('w', RANKDIR_RL).side & BOTTOM).toBe(BOTTOM); });
  it('"e" → TOP', () => { expect(resolve('e', RANKDIR_RL).side & TOP).toBe(TOP); });

  it('"c" (side=0) falls through every check unchanged', () => {
    expect(resolve('c', RANKDIR_RL).side).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// invflipAngle — RL 8-direction table
// ---------------------------------------------------------------------------

describe('compassPort — invflipAngle under rankdir=RL', () => {
  const cases: Array<[string, number]> = [
    ['n', 0],
    ['ne', Math.PI * 0.25],   // unmatched angle → returned unchanged (fallback)
    ['nw', -Math.PI * 0.25],
    ['s', Math.PI],
    ['se', Math.PI * 0.75],
    ['sw', -Math.PI * 0.75],  // unmatched angle → returned unchanged (fallback)
    ['e', Math.PI * 0.5],
    ['w', -Math.PI * 0.5],
  ];

  it.each(cases)('compass %s → theta %f', (compass, expected) => {
    expect(resolve(compass, RANKDIR_RL).theta).toBeCloseTo(expected, 5);
  });
});

// ---------------------------------------------------------------------------
// dirN / dirS / dirE / dirW — unrecognized suffix
// ---------------------------------------------------------------------------

describe('compassPort — dirN/dirS reject an unrecognized suffix', () => {
  it('"nx" → unrecognized (center point, not defined)', () => {
    const p = resolve('nx');
    expect(p.p).toEqual({ x: 0, y: 0 });
    expect(p.defined).toBe(false);
  });

  it('"sx" → unrecognized', () => {
    expect(resolve('sx').defined).toBe(false);
  });
});

describe('compassPort — dirE/dirW reject any suffix', () => {
  it('"ex" → unrecognized', () => {
    expect(resolve('ex').defined).toBe(false);
  });

  it('"wx" → unrecognized', () => {
    expect(resolve('wx').defined).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// compassDirection — explicit "c" and an unrecognized first character
// ---------------------------------------------------------------------------

describe('compassDirection — "c" is recognized; an unknown letter is not', () => {
  it('"c" → compassPort returns 0 (recognized)', () => {
    const pp = makePort();
    const rv = compassPort(originNode(), { bp: null, compass: 'c', sides: ALL_SIDES }, pp);
    expect(rv).toBe(0);
    expect(pp.p).toEqual({ x: 0, y: 0 });
  });

  it('"q" (unknown first char) → compassPort returns 1 (unrecognized)', () => {
    const pp = makePort();
    const rv = compassPort(originNode(), { bp: null, compass: 'q', sides: ALL_SIDES }, pp);
    expect(rv).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// compassPort — defFinal uses defBp (not dir.defined) when rv===1
// ---------------------------------------------------------------------------

describe('compassPort — defFinal ternary when the compass is unrecognized', () => {
  it('bp=null (defBp=false) + unrecognized compass → pp.defined=false', () => {
    const pp = makePort();
    compassPort(originNode(), { bp: null, compass: 'q', sides: ALL_SIDES }, pp);
    expect(pp.defined).toBe(false);
  });

  it('bp provided (defBp=true) + unrecognized compass → pp.defined=true', () => {
    const pp = makePort();
    const bp = { ll: { x: -5, y: -5 }, ur: { x: 5, y: 5 } };
    compassPort(originNode(), { bp, compass: 'q', sides: ALL_SIDES }, pp);
    // dir.defined is false (unrecognized), but rv===1 forces defFinal=defBp.
    expect(pp.defined).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// polyPort — htmlPort fallback and compassStr branches
// ---------------------------------------------------------------------------

describe('polyPort', () => {
  it('empty portname → default Center port', () => {
    const port = polyPort(originNode(), '', 'n');
    expect(port.defined).toBe(false);
    expect(port.p).toEqual({ x: 0, y: 0 });
  });

  it('label.u.kind !== "html" → htmlPort returns null, falls back to compassPort(portname)', () => {
    const n = originNode();
    n.info.label = { html: true, u: { kind: 'txt' } };
    const port = polyPort(n, 'n', 'ignored');
    expect(port.p).toEqual({ x: 0, y: 18 });
    expect(port.bp).toBeNull();
  });

  it('a PlacedHtml table with no matching port → htmlPort returns null, falls back', () => {
    const n = originNode();
    n.info.label = {
      html: true,
      u: {
        kind: 'html',
        html: { box: { ll: { x: -5, y: -5 }, ur: { x: 5, y: 5 } }, border: 0, cells: [] },
      },
    };
    const port = polyPort(n, 'n', 'ignored');
    expect(port.p).toEqual({ x: 0, y: 18 });
  });

  it('found html port + empty compass → compassStr falls back to "_" (dyna port)', () => {
    const n = originNode();
    n.info.label = {
      html: true,
      u: {
        kind: 'html',
        html: {
          box: { ll: { x: -27, y: -18 }, ur: { x: 27, y: 18 } }, border: 0,
          cells: [{ port: 'p1', box: { ll: { x: -10, y: -10 }, ur: { x: 10, y: 10 } }, border: 0, lines: [] }],
        },
      },
    };
    const port = polyPort(n, 'p1', '');
    expect(port.dyna).toBe(true);
    expect(port.bp).toEqual({ ll: { x: -10, y: -10 }, ur: { x: 10, y: 10 } });
  });

  it('found html port + explicit compass → uses it directly against the cell box', () => {
    const n = originNode();
    n.info.label = {
      html: true,
      u: {
        kind: 'html',
        html: {
          box: { ll: { x: -27, y: -18 }, ur: { x: 27, y: 18 } }, border: 0,
          cells: [{ port: 'p1', box: { ll: { x: -10, y: -10 }, ur: { x: 10, y: 10 } }, border: 0, lines: [] }],
        },
      },
    };
    const port = polyPort(n, 'p1', 'n');
    expect(port.p).toEqual({ x: 0, y: 10 });
    expect(port.name).toBeNull();
  });
});
