// SPDX-License-Identifier: EPL-2.0
// The port's routeSpline on route-cases.c's cases, printed as the C prints.
import { routeSpline, polyBarriers } from '../../../src/pathplan/index.js';
import type { Point, Edge } from '../../../src/pathplan/index.js';

const pt = (x: number, y: number): Point => ({ x, y });
const g = (v: number): string => {
  if (Number.isInteger(v)) return String(v);
  return Number(v.toPrecision(17)).toString() === v.toString() ? v.toPrecision(17).replace(/0+$/, '').replace(/\.$/, '') : v.toPrecision(17);
};
function run(name: string, bar: Edge[], rt: Point[], ev0: Point, ev1: Point): void {
  const out = routeSpline(bar, rt, [ev0, ev1]);
  console.log(`${name} rc=0 n=${out.length}` + out.map((p) => ` ${g(p.x)},${g(p.y)}`).join(''));
}
const ds = [0, 1e-15, 1e-12, 1e-9, 5e-8, 9e-8, 2e-7, -5e-8, -1e-15, 3e-16, 1e-14, 1e-13];
const gs = (d: number): string => (d === 0 ? '0' : d.toExponential().replace(/e([+-])(\d)$/, 'e$10$2'));
for (const d of ds) run(`A[dx=${gs(d)}]`, [{ a: pt(5, 1), b: pt(5 + d, 100) }], [pt(0, 0), pt(10, 0)], pt(0, 1), pt(0, -1));
for (const d of ds) run(`B[d=${gs(d)}]`, [{ a: pt(5, 2), b: pt(5 + d, 2 + d) }], [pt(0, 0), pt(10, 0)], pt(0, 1), pt(0, -1));
for (const d of ds) run(`C[dx=${gs(d)}]`, [{ a: pt(5, -100), b: pt(5 + d, -1) }], [pt(0, 0), pt(10, 0)], pt(0, -1), pt(0, 1));
for (const d of ds) {
  const bar = polyBarriers([{ ps: [pt(-1, -1), pt(11 + d, -1), pt(11, 30), pt(-1, 30)] }]);
  run(`D[dx=${gs(d)}]`, bar, [pt(0, 0), pt(10, 20), pt(0, 25)], pt(1, 0), pt(-1, 0));
}
