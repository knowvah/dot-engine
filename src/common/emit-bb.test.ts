// SPDX-License-Identifier: EPL-2.0
//
// arrow_bb and init_splines_bb against native: harness/T7b/emit-bb.c runs
// emit.c's static bezier_bb/init_splines_bb (copied) with libgvc's arrow_bb on
// the inputs below and prints each box at %.17g (emit-bb.out).
// @see lib/common/arrows.c:1107 arrow_bb · lib/common/emit.c:4101 init_splines_bb
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../parser/index.js';
import type { Bezier, Box, Point, Spline } from '../model/geom.js';
import { arrowBb, initBb, initSplinesBb } from './emit-bb.js';

const OUT = new URL('../../plans/post-16-1-followups-11/harness/T7b/emit-bb.out', import.meta.url);
const NATIVE = new Map(
  readFileSync(OUT, 'utf8').trim().split('\n').map((l) => {
    const f = l.split(' ');
    const n = f.slice(1).map(Number);
    return [f[0]!, { ll: { x: n[0]!, y: n[1]! }, ur: { x: n[2]!, y: n[3]! } }] as [string, Box];
  }),
);

const P = (x: number, y: number): Point => ({ x, y });
const bezier = (list: Point[], ends: Partial<Bezier> = {}): Bezier => ({
  list, size: list.length, sflag: 0, eflag: 0, sp: P(0, 0), ep: P(0, 0), ...ends,
});
const ZERO: Box = { ll: P(0, 0), ur: P(0, 0) };
const spline = (list: Bezier[]): Spline => ({ list, size: list.length, bb: ZERO });
const B1 = bezier([P(0, 0), P(10, 40), P(30, -20), P(50, 10)], { sflag: 1, sp: P(-3, -4) });
const B2 = bezier(
  [P(50, 10), P(60, 12), P(70, 30), P(80, 31), P(81, 33), P(90, 50), P(100, 60)],
  { eflag: 1, ep: P(104, 66) },
);

describe('arrowBb', () => {
  it.each<[string, Point, Point, number]>([
    ['arrow_bb(p=(10,20),u=(13,24),1)', P(10, 20), P(13, 24), 1],
    ['arrow_bb(p=(5,5),u=(5,5),2)', P(5, 5), P(5, 5), 2],
    ['arrow_bb(p=(0,0),u=(-7,0.5),0.5)', P(0, 0), P(-7, 0.5), 0.5],
    // fmax/fmin return the non-NaN operand
    ['arrow_bb(p=(nan,0),u=(1,1),1)', P(NaN, 0), P(1, 1), 1],
  ])('%s equals native', (name, p, u, size) => {
    expect(arrowBb(p, u, size)).toEqual(NATIVE.get(name));
  });
});

describe('initSplinesBb', () => {
  it('one bezier with a start arrow equals native', () => {
    const spl = spline([B1]);
    initSplinesBb(spl);
    expect(spl.bb).toEqual(NATIVE.get('spl1'));
  });

  it('a second bezier with an end arrow widens the box as native does', () => {
    const spl = spline([B1, B2]);
    initSplinesBb(spl);
    expect(spl.bb).toEqual(NATIVE.get('spl2'));
  });
});

describe('initBb', () => {
  it('boxes the out-edges of the rendered graph only', () => {
    const g = parse('digraph { a -> b; subgraph s { c -> d } }');
    const s = g.subgraphs.get('s')!;
    const [ab, cd] = [g.edges.find((e) => e.tail.name === 'a')!, g.edges.find((e) => e.tail.name === 'c')!];
    ab.info.spl = spline([B1]);
    cd.info.spl = spline([B2]);
    initBb(s);
    expect(ab.info.spl.bb).toEqual(ZERO);
    expect(cd.info.spl.bb).toEqual(NATIVE.get('spl3'));
  });
});
