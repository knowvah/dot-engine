// T8: the port against the fixture, under the Set's insertion order and under two other block
// walks, to show this case depends on the order (so the fixture's test can fail on it).
// usage: npx tsx plans/post-16-1-followups-9/harness/T8/port-order.mts (from the repo root)
import { DIR1_N40 as c } from '../../../../src/layout/neato/__fixtures__/quad-prog-vpsc-dir1-n40.ts';
import { graphOf, optionsOf } from '../../../../src/layout/neato/__fixtures__/quad-prog-vpsc.ts';
import {
  constrainedMajorizationVpsc, deleteCMajEnvVPSC, initCMajVPSC, type CMajEnvVPSC,
} from '../../../../src/layout/neato/quad-prog-vpsc.ts';
import { Blocks } from '../../../../src/vpsc/Blocks.ts';

const insertion = Blocks.prototype[Symbol.iterator];

function run(tag: string): void {
  let e: CMajEnvVPSC | null = null;
  const out: string[] = [];
  const packed = Float32Array.from(c.packed!);
  for (const op of c.ops) {
    if (op.op === 'INIT') e = initCMajVPSC(c.n, packed, graphOf(c), optionsOf(c), 1);
    else if (op.op === 'DEL') { deleteCMajEnvVPSC(e!); e = null; }
    else if (op.op === 'CMV') {
      const place = Float32Array.from(op.place);
      const ret = constrainedMajorizationVpsc(e!, Float32Array.from(op.b), place, op.iters);
      let max = 0;
      for (let i = 0; i < c.n; i++) max = Math.max(max, Math.abs(place[i]! - op.expect.place[i]!));
      out.push(`ret ${ret} vs ${op.expect.ret} maxdiff ${max.toPrecision(3)}`);
    }
  }
  console.log(tag, out.join(' | '));
}

run('insertion');
Blocks.prototype[Symbol.iterator] = function (this: Blocks) {
  return [...insertion.call(this)].reverse()[Symbol.iterator]();
} as typeof insertion;
run('reversed-snapshot');
Blocks.prototype[Symbol.iterator] = function (this: Blocks) {
  return [...insertion.call(this)][Symbol.iterator]();
} as typeof insertion;
run('forward-snapshot');
