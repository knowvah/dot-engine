// SPDX-License-Identifier: EPL-2.0
// The port side of partition-1611.c: same cases, same output format. Run from
// this directory with `npx tsx port-cases.ts`; diff against partition-1611.out.
import { partition } from "../../../src/ortho/partition.ts";
import { crand, csrand, gvPermutation } from "../../../src/common/crand.ts";
const mk = (a: number, b: number, c: number, d: number) => ({ flags: 0, nedges: 0, edges: [], nsides: 0, sides: [], bb: { LL: { x: a, y: b }, UR: { x: c, y: d } } });
const BB = (a: number, b: number, c: number, d: number) => ({ LL: { x: a, y: b }, UR: { x: c, y: d } });
const fmt = (v: number) => (Number.isInteger(v) ? String(v) : String(v));
function run(name: string, cs: any[], bb: any) {
  const n = 4 * (cs.length + 1);
  csrand(1);
  console.log(`${name} hperm: ${gvPermutation(n).map((x) => x + 1).join(" ")}`);
  console.log(`${name} vperm: ${gvPermutation(n).map((x) => x + 1).join(" ")}`);
  csrand(1);
  const r = partition(cs, bb);
  const k = r ? r.length : 0;
  console.log(`${name} rects=${k} null=${r === null || k === 0 ? 1 : 0} next-rand=${crand()}`);
  const v = (r ?? []).slice().sort((a, b) => a.LL.x - b.LL.x || a.LL.y - b.LL.y || a.UR.x - b.UR.x || a.UR.y - b.UR.y);
  for (const b of v) console.log(`  box(${fmt(b.LL.x)}, ${fmt(b.LL.y)}, ${fmt(b.UR.x)}, ${fmt(b.UR.y)})`);
}
console.error = (m: string) => console.log(m);
run("f2pair", [mk(-27,72,27,108), mk(-27,0,27,36)], BB(-63,-36,63,144));
run("f3chain", [mk(-27,144,27,180), mk(-27,72,27,108), mk(-27,0,27,36)], BB(-63,-36,63,216));
run("f3branch", [mk(-27,72,27,108), mk(-63,0,-9,36), mk(9,0,63,36)], BB(-99,-36,99,144));
{ const Y = 1080000000000000000; const X = [0,72,144,216,288,360];
  run("c2784", X.map((x, i) => i === 3 ? mk(x-27, 0, x+27, 2*Y) : mk(x-27, Y, x+27, Y)), BB(-63,-36,423,2*Y)); }
run("point", [mk(0,10,0,10)], BB(-36,-26,36,46));
run("vertonly", [mk(0,0,0,30), mk(0,0,10,10)], BB(-36,-36,46,66));
run("emptyrects", [mk(10,20,10,30)], BB(-26,-16,46,66));
run("wellformed", [mk(0,0,10,10)], BB(-36,-36,46,46));
run("silentA", [mk(10,40,20,60), mk(40,0,40,10)], BB(-26,-36,76,96));
run("silentB", [mk(0,30,10,40), mk(10,20,10,40)], BB(-36,-16,46,76));
