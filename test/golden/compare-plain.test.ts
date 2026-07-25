// SPDX-License-Identifier: EPL-2.0
//
// Tests for the semantic `plain`/`plain-ext` comparator (mission:
// format-parity-matrix, T1). Fixtures are hand-written `plain` text built
// from the grammar in lib/common/output.c `write_plain`:
//
//   graph <scale> <width> <height>
//   node <name> <x> <y> <width> <height> <label> <style> <shape> <color> <fillcolor>
//   edge <tail> <head> <n> <x1> <y1> .. <xn> <yn> [<label> <lx> <ly>] <style> <color>
//   stop

import { describe, test, expect } from 'vitest';
import { comparePlain, PLAIN_TOLERANCE, type PlainDiff } from './compare-plain.js';

// ---------------------------------------------------------------------------
// Fixture builders (DRY per testing.md — no repeated hand-typed lines)
// ---------------------------------------------------------------------------

function graphLine(scale: number, width: number, height: number): string {
  return `graph ${scale} ${width} ${height}`;
}

function nodeLine(
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  label = name,
  style = 'solid',
  shape = 'ellipse',
  color = 'black',
  fillcolor = 'lightgrey',
): string {
  return `node ${name} ${x} ${y} ${width} ${height} ${label} ${style} ${shape} ${color} ${fillcolor}`;
}

interface EdgeOpts {
  label?: string;
  lx?: number;
  ly?: number;
  style?: string;
  color?: string;
}

function edgeLine(tail: string, head: string, pts: Array<[number, number]>, opts: EdgeOpts = {}): string {
  const { label, lx, ly, style = 'solid', color = 'black' } = opts;
  const ptsStr = pts.map(([x, y]) => `${x} ${y}`).join(' ');
  const labelStr = label !== undefined ? ` ${label} ${lx} ${ly}` : '';
  return `edge ${tail} ${head} ${pts.length} ${ptsStr}${labelStr} ${style} ${color}`;
}

function plainDoc(lines: string[]): string {
  return [...lines, 'stop', ''].join('\n');
}

const BASE_PTS: Array<[number, number]> = [
  [0.75, 1.222],
  [0.75, 0.9718],
  [0.75, 0.7182],
  [0.75, 0.5],
];

/** A minimal two-node, one-edge graph — the shared baseline for most tests. */
function baseDoc(): string {
  return plainDoc([
    graphLine(1, 2.5, 1.9722),
    nodeLine('a', 0.75, 1.4722, 0.75, 0.5),
    nodeLine('b', 0.75, 0.25, 0.75, 0.5),
    edgeLine('a', 'b', BASE_PTS),
  ]);
}

function findDiff(diffs: PlainDiff[], id: string, field: string): PlainDiff | undefined {
  return diffs.find((d) => d.id === id && d.field === field);
}

describe('comparePlain', () => {
  test('AC1: identical output passes with no diffs', () => {
    const doc = baseDoc();
    const { verdict, diffs } = comparePlain(doc, doc, { iterative: false });
    expect(verdict).toBe('pass');
    expect(diffs).toEqual([]);
  });

  test('AC2: node coord off by 0.02 (deterministic) diverges, naming node/field/values', () => {
    const native = baseDoc();
    const port = plainDoc([
      graphLine(1, 2.5, 1.9722),
      nodeLine('a', 0.75, 1.4922, 0.75, 0.5), // y off by 0.02 > 0.01 tolerance
      nodeLine('b', 0.75, 0.25, 0.75, 0.5),
      edgeLine('a', 'b', BASE_PTS),
    ]);
    const { verdict, diffs } = comparePlain(port, native, { iterative: false });
    expect(verdict).toBe('diverged');
    const d = findDiff(diffs, 'a', 'y');
    expect(d).toBeDefined();
    expect(d?.kind).toBe('node');
    expect(d?.port).toBe('1.4922');
    expect(d?.native).toBe('1.4722');
  });

  test('AC3: iterative mode ignores coordinate-only differences', () => {
    const native = baseDoc();
    const port = plainDoc([
      graphLine(1, 2.5, 1.9722),
      nodeLine('a', 0.75, 5.0, 0.75, 0.5), // wildly different position
      nodeLine('b', 0.75, 0.25, 0.75, 0.5),
      edgeLine('a', 'b', [
        [0.75, 5.0],
        [0.75, 4.0],
        [0.75, 3.0],
        [0.75, 2.0],
      ]),
    ]);
    const { verdict, diffs } = comparePlain(port, native, { iterative: true });
    expect(verdict).toBe('pass');
    expect(diffs).toEqual([]);
  });

  test('iterative mode ignores differing spline point counts; deterministic diverges', () => {
    const native = baseDoc();
    const port = plainDoc([
      graphLine(1, 2.5, 1.9722),
      nodeLine('a', 0.75, 1.4722, 0.75, 0.5),
      nodeLine('b', 0.75, 0.25, 0.75, 0.5),
      edgeLine('a', 'b', [
        [0.75, 1.222],
        [0.75, 0.9],
        [0.75, 0.75],
        [0.75, 0.6],
        [0.75, 0.55],
        [0.75, 0.5],
        [0.75, 0.5],
      ]),
    ]);
    expect(comparePlain(port, native, { iterative: true }).verdict).toBe('pass');
    const det = comparePlain(port, native, { iterative: false });
    expect(det.verdict).toBe('diverged');
    expect(findDiff(det.diffs, 'a->b#0', 'pointCount')).toBeDefined();
  });

  test('AC4: differing node shape diverges in BOTH deterministic and iterative modes', () => {
    const native = baseDoc();
    const port = plainDoc([
      graphLine(1, 2.5, 1.9722),
      nodeLine('a', 0.75, 1.4722, 0.75, 0.5, 'a', 'solid', 'box'), // shape differs
      nodeLine('b', 0.75, 0.25, 0.75, 0.5),
      edgeLine('a', 'b', BASE_PTS),
    ]);

    for (const iterative of [false, true]) {
      const { verdict, diffs } = comparePlain(port, native, { iterative });
      expect(verdict).toBe('diverged');
      const d = findDiff(diffs, 'a', 'shape');
      expect(d).toBeDefined();
      expect(d?.port).toBe('box');
      expect(d?.native).toBe('ellipse');
    }
  });

  test('AC5: edge label position off by 0.005 (deterministic) passes (within tolerance)', () => {
    const withLabel = (lx: number): string =>
      plainDoc([
        graphLine(1, 3, 2),
        nodeLine('a', 1, 1.75, 0.75, 0.5),
        nodeLine('b', 1, 0.25, 0.75, 0.5),
        edgeLine(
          'a',
          'b',
          [
            [1, 1.5],
            [1, 1.2],
            [1, 0.9],
            [1, 0.6],
          ],
          { label: 'lbl', lx, ly: 1.05 },
        ),
      ]);
    const native = withLabel(1.4);
    const port = withLabel(1.405); // 0.005 < 0.01 tolerance
    const { verdict, diffs } = comparePlain(port, native, { iterative: false });
    expect(verdict).toBe('pass');
    expect(diffs).toEqual([]);
    // Sanity: the delta really is below the exported tolerance constant.
    expect(Math.abs(1.405 - 1.4)).toBeLessThan(PLAIN_TOLERANCE);
  });

  test('quoted node names with embedded spaces round-trip identically', () => {
    const doc = plainDoc([
      graphLine(1, 2, 1),
      nodeLine('"my node"', 0.5, 0.5, 0.75, 0.5, '"my label"'),
      edgeLine('"my node"', '"my node"', [
        [0.5, 0.5],
        [0.5, 0.5],
      ]),
    ]);
    const { verdict, diffs } = comparePlain(doc, doc, { iterative: false });
    expect(verdict).toBe('pass');
    expect(diffs).toEqual([]);
  });

  test('quoted label difference surfaces as a node label diff', () => {
    const native = plainDoc([
      graphLine(1, 2, 1),
      nodeLine('"my node"', 0.5, 0.5, 0.75, 0.5, '"hello world"'),
    ]);
    const port = plainDoc([
      graphLine(1, 2, 1),
      nodeLine('"my node"', 0.5, 0.5, 0.75, 0.5, '"goodbye world"'),
    ]);
    const { verdict, diffs } = comparePlain(port, native, { iterative: false });
    expect(verdict).toBe('diverged');
    const d = findDiff(diffs, 'my node', 'label');
    expect(d).toBeDefined();
    expect(d?.port).toBe('goodbye world');
    expect(d?.native).toBe('hello world');
  });

  test('plain-ext port suffixes parse and compare (identical passes)', () => {
    const doc = plainDoc([
      graphLine(1, 2.5, 1.9722),
      nodeLine('a', 0.75, 1.4722, 0.75, 0.5),
      nodeLine('b', 0.75, 0.25, 0.75, 0.5),
      `edge a:p1 b:p2 4 ${BASE_PTS.map(([x, y]) => `${x} ${y}`).join(' ')} solid black`,
    ]);
    const { verdict, diffs } = comparePlain(doc, doc, { iterative: false });
    expect(verdict).toBe('pass');
    expect(diffs).toEqual([]);
  });

  test('plain-ext differing port name diverges (non-numeric, both modes)', () => {
    const ptsStr = BASE_PTS.map(([x, y]) => `${x} ${y}`).join(' ');
    const native = plainDoc([
      graphLine(1, 2.5, 1.9722),
      nodeLine('a', 0.75, 1.4722, 0.75, 0.5),
      nodeLine('b', 0.75, 0.25, 0.75, 0.5),
      `edge a:p1 b:p2 4 ${ptsStr} solid black`,
    ]);
    const port = plainDoc([
      graphLine(1, 2.5, 1.9722),
      nodeLine('a', 0.75, 1.4722, 0.75, 0.5),
      nodeLine('b', 0.75, 0.25, 0.75, 0.5),
      `edge a:p1 b:p3 4 ${ptsStr} solid black`,
    ]);
    for (const iterative of [false, true]) {
      const { verdict, diffs } = comparePlain(port, native, { iterative });
      expect(verdict).toBe('diverged');
      const d = findDiff(diffs, 'a->b#0', 'headPort');
      expect(d).toBeDefined();
      expect(d?.port).toBe('p3');
      expect(d?.native).toBe('p2');
    }
  });

  test('missing node surfaces as a kind:"missing" diff keyed by node name', () => {
    const native = plainDoc([
      graphLine(1, 2.5, 1.9722),
      nodeLine('a', 0.75, 1.4722, 0.75, 0.5),
      nodeLine('b', 0.75, 0.25, 0.75, 0.5),
      edgeLine('a', 'b', BASE_PTS),
    ]);
    const port = plainDoc([
      graphLine(1, 2.5, 1.9722),
      nodeLine('a', 0.75, 1.4722, 0.75, 0.5),
      edgeLine('a', 'b', BASE_PTS),
    ]);
    const { verdict, diffs } = comparePlain(port, native, { iterative: false });
    expect(verdict).toBe('diverged');
    const d = diffs.find((x) => x.id === 'b' && x.kind === 'missing');
    expect(d).toBeDefined();
    expect(d?.field).toBe('node');
    expect(d?.port).toBe('<absent>');
    expect(d?.native).toBe('present');
  });

  test('extra edge surfaces as a kind:"extra" diff keyed by edge occurrence', () => {
    const native = plainDoc([
      graphLine(1, 2.5, 1.9722),
      nodeLine('a', 0.75, 1.4722, 0.75, 0.5),
      nodeLine('b', 0.75, 0.25, 0.75, 0.5),
    ]);
    const port = plainDoc([
      graphLine(1, 2.5, 1.9722),
      nodeLine('a', 0.75, 1.4722, 0.75, 0.5),
      nodeLine('b', 0.75, 0.25, 0.75, 0.5),
      edgeLine('a', 'b', BASE_PTS),
    ]);
    const { verdict, diffs } = comparePlain(port, native, { iterative: false });
    expect(verdict).toBe('diverged');
    const d = diffs.find((x) => x.id === 'a->b#0' && x.kind === 'extra');
    expect(d).toBeDefined();
    expect(d?.field).toBe('edge');
    expect(d?.port).toBe('present');
    expect(d?.native).toBe('<absent>');
  });

  test('differing edge spline point count diverges on field "pointCount"', () => {
    const native = plainDoc([
      graphLine(1, 2.5, 1.9722),
      nodeLine('a', 0.75, 1.4722, 0.75, 0.5),
      nodeLine('b', 0.75, 0.25, 0.75, 0.5),
      edgeLine('a', 'b', BASE_PTS), // 4 points
    ]);
    const port = plainDoc([
      graphLine(1, 2.5, 1.9722),
      nodeLine('a', 0.75, 1.4722, 0.75, 0.5),
      nodeLine('b', 0.75, 0.25, 0.75, 0.5),
      edgeLine('a', 'b', BASE_PTS.slice(0, 3)), // 3 points
    ]);
    const { verdict, diffs } = comparePlain(port, native, { iterative: false });
    expect(verdict).toBe('diverged');
    const d = findDiff(diffs, 'a->b#0', 'pointCount');
    expect(d).toBeDefined();
    expect(d?.port).toBe('3');
    expect(d?.native).toBe('4');
  });

  test('parallel edges disambiguated by occurrence index (#0, #1)', () => {
    const native = plainDoc([
      graphLine(1, 2.5, 1.9722),
      nodeLine('a', 0.75, 1.4722, 0.75, 0.5),
      nodeLine('b', 0.75, 0.25, 0.75, 0.5),
      edgeLine('a', 'b', BASE_PTS, { color: 'red' }),
      edgeLine('a', 'b', BASE_PTS, { color: 'blue' }),
    ]);
    const port = plainDoc([
      graphLine(1, 2.5, 1.9722),
      nodeLine('a', 0.75, 1.4722, 0.75, 0.5),
      nodeLine('b', 0.75, 0.25, 0.75, 0.5),
      edgeLine('a', 'b', BASE_PTS, { color: 'red' }),
      edgeLine('a', 'b', BASE_PTS, { color: 'green' }), // second edge's color differs
    ]);
    const { verdict, diffs } = comparePlain(port, native, { iterative: false });
    expect(verdict).toBe('diverged');
    expect(diffs).toHaveLength(1);
    expect(diffs[0]?.id).toBe('a->b#1');
    expect(diffs[0]?.field).toBe('color');
    expect(diffs[0]?.port).toBe('green');
    expect(diffs[0]?.native).toBe('blue');
  });

  test('missing graph line surfaces as a kind:"missing" diff on "[graph]"', () => {
    const native = baseDoc();
    const port = plainDoc([
      nodeLine('a', 0.75, 1.4722, 0.75, 0.5),
      nodeLine('b', 0.75, 0.25, 0.75, 0.5),
      edgeLine('a', 'b', BASE_PTS),
    ]);
    const { verdict, diffs } = comparePlain(port, native, { iterative: false });
    expect(verdict).toBe('diverged');
    const d = diffs.find((x) => x.id === '[graph]' && x.kind === 'missing');
    expect(d).toBeDefined();
  });

  test('within-tolerance graph dimension difference (deterministic) passes', () => {
    const native = baseDoc();
    const port = plainDoc([
      graphLine(1, 2.5, 1.9722 + 0.005),
      nodeLine('a', 0.75, 1.4722, 0.75, 0.5),
      nodeLine('b', 0.75, 0.25, 0.75, 0.5),
      edgeLine('a', 'b', BASE_PTS),
    ]);
    const { verdict, diffs } = comparePlain(port, native, { iterative: false });
    expect(verdict).toBe('pass');
    expect(diffs).toEqual([]);
  });
});
