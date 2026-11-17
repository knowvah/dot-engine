// SPDX-License-Identifier: EPL-2.0
// The port's splineIntersectsLine on sil-cases.c's cases. RouteHelper is not
// exported, so this loads a copy of the route.ts named by argv[2] with
// `export` added (run.sh writes it next to this file).
const mod = await import(process.argv[2]);
const RH = mod.RouteHelper;
type P = { x: number; y: number };
const pt = (x: number, y: number): P => ({ x, y });
function sil(name: string, s: P[], l: P[]): void {
  const roots = [0, 0, 0, 0];
  const n = RH.splineIntersectsLine(s, l, roots);
  let out = `${name} n=${n}`;
  for (let i = 0; i < n && i < 4; i++) out += ` ${roots[i].toPrecision(17)}`;
  console.log(out);
}
for (const k of [1.7, 2, 0.3, 3.1, 1.1]) {
  const b = pt(3, 3 * k);
  sil(`P[k=${k}]`, [pt(0, 0), pt(2, 2 * k), pt(7, 7 * k), pt(10, 10 * k)], [b, b]);
}
const ds: [number, string][] = [[0, '0'], [1e-15, '1e-15'], [-1e-15, '-1e-15'], [1e-9, '1e-09'], [9e-8, '9e-08'], [2e-7, '2e-07']];
const spl = [pt(0, 0), pt(0, 4), pt(10, 4), pt(10, 0)];
for (const [d, ds_] of ds) {
  sil(`Qv[dx=${ds_}]`, spl, [pt(5, 1), pt(5 + d, 100)]);
  sil(`Qp[d=${ds_}]`, spl, [pt(5, 3), pt(5 + d, 3 + d)]);
}
