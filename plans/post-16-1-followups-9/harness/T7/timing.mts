// T7 step 4: the ported sort against Array.prototype.sort, the port's sort before T7, on the
// largest input (1000 rectangles, 2000 events). Median microseconds per sort over ROUNDS rounds,
// each sorting a fresh copy of the unsorted events. usage: npx tsx timing.mts (from the repo root)
import { buildXEvents, compareEvents } from '../../../../src/vpsc/SweepLine.ts';
import { Rectangle } from '../../../../src/vpsc/Solver.ts';
import { Variable } from '../../../../src/vpsc/Variable.ts';
import { libcxxSort } from '../../../../src/util/libcxx-sort.ts';
import { EvType, type SweepEvent } from '../../../../src/vpsc/sweepTypes.ts';

const N = 1000;
const ROUNDS = 400;
/** The numeric comparator SweepLine.ts had before T7. */
const numeric = (a: SweepEvent, b: SweepEvent): number => {
  if (a.node.r === b.node.r) return a.type === EvType.Open && b.type !== EvType.Open ? -1 : 1;
  if (a.pos < b.pos) return -1;
  if (a.pos > b.pos) return 1;
  return 0;
};
let seed = 0x7007;
const rnd = (): number => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const INPUTS: Record<string, (i: number) => Rectangle> = {
  'row (every event ties)': (i) => new Rectangle(i * 10, i * 10 + 8, 0, 4),
  'same (every event ties)': () => new Rectangle(0, 8, 0, 4),
  'grid (groups of ties)': (i) => {
    const c = (i % 32) * 10, r = Math.trunc(i / 32) * 10;
    return new Rectangle(c, c + 8, r, r + 8);
  },
  'random (no ties)': () => {
    const x = rnd() * 1000, y = rnd() * 1000;
    return new Rectangle(x, x + 8, y, y + 4);
  },
};
const median = (xs: number[]): number => xs.sort((a, b) => a - b)[xs.length >> 1]!;
for (const [name, make] of Object.entries(INPUTS)) {
  const rects = Array.from({ length: N }, (_, i) => make(i));
  const base = buildXEvents(rects, rects.map((_, i) => new Variable(i, 0, 1)));
  const old: number[] = [];
  const ported: number[] = [];
  for (let r = 0; r < ROUNDS; r++) {
    const a = base.slice();
    let t = performance.now();
    a.sort(numeric);
    old.push(performance.now() - t);
    const b = base.slice();
    t = performance.now();
    libcxxSort(b, compareEvents);
    ported.push(performance.now() - t);
  }
  const o = median(old) * 1000, p = median(ported) * 1000;
  console.log(`${name}: Array.sort ${o.toFixed(0)} us, libcxxSort ${p.toFixed(0)} us, ratio ${(p / o).toFixed(2)}`);
}
