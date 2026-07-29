// SPDX-License-Identifier: EPL-2.0

/**
 * Branch coverage for makeMultiSpline (the HAVE_GTS multiplicity/
 * boundary-port router). Only `makeMultiSpline` and `mkRouter` are
 * exported from multispline.ts — every internal helper (mkCtrlPts,
 * mkPoly, genroute, tweakEnd, routeMember, chainOf, ...) is reached only
 * by driving the full neato render pipeline through splines.ts, so these
 * scenarios are crafted dot sources (pinned positions, deterministic
 * headless text measurement, so output is stable) rather than unit
 * calls. Assertions pin the exact `d` path strings, per the project's
 * no-vacuous-test policy (D1) — output is deterministic given pinned
 * `pos=...!` coordinates and the headless Estimate text measurer.
 *
 * IMPORTANT routing-entry subtlety (verified by direct function-hit
 * instrumentation, not assumed): splines.ts's withVconfig only calls
 * makeMultiSpline when `(count > 1 || boundaryPort)` AND the coarse
 * edgePath is not itself a 2-point clear line (`route.length===2 &&
 * !boundaryPort` shortcuts to makeStraightEdges in splines.ts,
 * *without* ever entering this module). A plain multi-edge with no
 * intervening obstacle (e.g. two isolated nodes 4 units apart) never
 * touches makeMultiSpline at all — only a `boundaryPort` (compass
 * port) or a real coarse-level obstruction routes into it. Every
 * scenario below was confirmed via `f` (function-hit) coverage data to
 * actually enter genroute, not merely to produce a plausible-looking
 * multi-edge render.
 *
 * @see lib/neatogen/multispline.c
 */

import { describe, test, expect } from 'vitest';
import { renderSvg } from '../../index.js';

function paths(svg: string): string[] {
  return (svg.match(/\sd="([^"]+)"/g) ?? []).map((m) => m.trim());
}

// ---------------------------------------------------------------------------
// A single boundary-port edge with a real intervening obstacle: the ONLY way
// to force entry into makeMultiSpline for a non-multiplicity edge, and the
// corridor is non-trivial (pl.length > 2), so this exercises genroute's
// `mult === 1 || concentrate` fast path (routeMember on the whole corridor)
// for real — confirmed via function-hit data (routeMember, finishEdge,
// tweakPath, polyEdges all fire exactly once).
// ---------------------------------------------------------------------------

describe('makeMultiSpline — single boundary-port edge through a real corridor', () => {
  test('a compass-port edge with an intervening obstacle routes via routeMember', () => {
    const dot = `
      graph G {
        layout=neato
        splines=true
        node [shape=box width=0.5 height=0.35]
        a [pos="-2,0!"]
        b [pos="4,0!"]
        o [pos="1,0!"]
        a -- b [tailport=e, headport=w]
      }
    `;
    const svg = renderSvg(dot, 'neato');
    const ds = paths(svg);
    expect(ds).toEqual([
      'd="M36,-20.81C36,-20.81 133.69,-8.14 212.3,-4.51 310.11,0 432,-20.81 432,-20.81"',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Multiplicity edges through a corridor engineered to match the accepted
// golden fixture's shape (test/golden/inputs/neato-multispline.dot):
// near-collinear "in the way" nodes (m1/m2, offset a few hundredths of a
// unit off the direct line) force the OUTER edgePath visibility graph to
// see a real obstruction, so the coarse `route.length !== 2` and
// makeMultiSpline is genuinely entered with mult > 1.
// ---------------------------------------------------------------------------

const corridorGraph = (extra: string, edgeCount: number): string => `
  graph G {
    layout=neato
    splines=true
    ${extra}
    node [shape=ellipse width=0.5 height=0.35]
    o1 [pos="-1,0!"]
    o2 [pos="5,0!"]
    o3 [pos="2,-1.2!"]
    a  [pos="0,0!"]
    b  [pos="4,0!"]
    m1 [pos="1.3,0.05!"]
    m2 [pos="2.7,-0.05!"]
    ${'a -- b\n    '.repeat(edgeCount)}
  }
`;

describe('makeMultiSpline — concentrate collapses a real multi-edge corridor', () => {
  test('concentrate=true routes the 3x edge as one full spline through the corridor', () => {
    const svg = renderSvg(corridorGraph('concentrate=true', 3), 'neato');
    const ds = paths(svg);
    // `mult === 1 || concentrate` takes the single routeMember call on the
    // whole corridor polygon; tweakPath nudges BOTH endpoints (confirmed via
    // function-hit data: tweakEnd fires twice for this one genroute call).
    expect(ds).toEqual([
      'd="M111.08,-99.78C145.21,-92.26 222.14,-77.33 287.61,-79.08 322.64,-80.02 334.26,-73.72 365.83,-88.91 366.9,-89.42 367.95,-90.04 368.95,-90.73"',
    ]);
  });

  test('concentrate=true + splines=polyline dispatches routeMember to makePolyline', () => {
    const svg = renderSvg(corridorGraph('concentrate=true\n    splines=polyline', 3), 'neato');
    const ds = paths(svg);
    // Same corridor, but routeMember's `doPolyline` branch calls
    // makePolyline instead of routeSpline — the coordinates differ from the
    // splines=true case above even though the corridor geometry is identical.
    expect(ds).toEqual([
      'd="M111.26,-100.53C138.46,-95.4 186.81,-86.28 186.81,-86.28 186.81,-86.28 287.61,-79.08 287.61,-79.08 287.61,-79.08 365.83,-88.91 365.83,-88.91 365.83,-88.91 366.79,-89.85 368.23,-91.26"',
    ]);
  });
});

describe('makeMultiSpline — multiplicity fan through the corridor (no concentrate)', () => {
  test('a 4x parallel edge enters the mkCtrlPts bisector-fan path', () => {
    const svg = renderSvg(corridorGraph('', 4), 'neato');
    const ds = paths(svg);
    // Every member of the fan resolves to the same drawn path in this
    // corridor (mirroring the accepted 3x-multiplicity golden fixture,
    // which exhibits the same coincident-path shape for its own group) —
    // still real coverage of mkCtrlPts/raySeg/raySegIntersect/triPoint
    // (confirmed via function-hit data: bisect, raySeg, raySegIntersect,
    // triPoint, ctrlPtIdx, and mkCtrlPts each fire on this call).
    expect(ds).toEqual([
      'd="M110.49,-110.37C129.04,-116.84 159.53,-126.21 186.81,-128.79 252.19,-134.96 329.48,-117.7 363.57,-108.83"',
      'd="M110.49,-110.37C129.04,-116.84 159.53,-126.21 186.81,-128.79 252.19,-134.96 329.48,-117.7 363.57,-108.83"',
      'd="M110.49,-110.37C129.04,-116.84 159.53,-126.21 186.81,-128.79 252.19,-134.96 329.48,-117.7 363.57,-108.83"',
      'd="M110.49,-110.37C129.04,-116.84 159.53,-126.21 186.81,-128.79 252.19,-134.96 329.48,-117.7 363.57,-108.83"',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Boundary-port multiplicity with a clear direct line: boundaryPort forces
// entry into makeMultiSpline even though the coarse edgePath is a 2-point
// straight line (the `!boundaryPort` guard in splines.ts is what normally
// shortcuts a clear line around makeMultiSpline entirely). This is a
// distinct entry combination from both cases above.
// ---------------------------------------------------------------------------

describe('makeMultiSpline — boundary port forces entry despite a clear direct line', () => {
  test('3x boundary-port edges on isolated nodes still enter genroute', () => {
    const dot = `
      graph G {
        layout=neato
        splines=true
        node [shape=ellipse width=0.5 height=0.35]
        a [pos="0,0!"]
        b [pos="4,0!"]
        a -- b [tailport=e, headport=w]
        a -- b [tailport=e, headport=w]
        a -- b [tailport=e, headport=w]
      }
    `;
    const svg = renderSvg(dot, 'neato');
    const ds = paths(svg);
    expect(ds).toEqual([
      'd="M36.17,-17.54C36.17,-17.54 287.83,-17.54 287.83,-17.54"',
      'd="M36.17,-17.54C36.17,-17.54 287.83,-17.54 287.83,-17.54"',
      'd="M36.17,-17.54C36.17,-17.54 287.83,-17.54 287.83,-17.54"',
    ]);
  });

  test('splines=polyline with 3x boundary-port edges on isolated nodes', () => {
    const dot = `
      graph G {
        layout=neato
        splines=polyline
        node [shape=ellipse width=0.5 height=0.35]
        a [pos="0,0!"]
        b [pos="4,0!"]
        a -- b [tailport=e, headport=w]
        a -- b [tailport=e, headport=w]
        a -- b [tailport=e, headport=w]
      }
    `;
    const svg = renderSvg(dot, 'neato');
    const ds = paths(svg);
    expect(ds).toEqual([
      'd="M36.17,-17.54C36.17,-17.54 287.83,-17.54 287.83,-17.54"',
      'd="M36.17,-17.54C36.17,-17.54 287.83,-17.54 287.83,-17.54"',
      'd="M36.17,-17.54C36.17,-17.54 287.83,-17.54 287.83,-17.54"',
    ]);
  });
});
