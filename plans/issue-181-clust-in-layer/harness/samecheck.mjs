// SPDX-License-Identifier: EPL-2.0
// Issue #181: base-vs-head identity over the cluster-bearing corpus inputs. The
// xdot writer's cluster test moves from "endCluster ran" to GD_clust membership;
// without `layers` the two sets are equal, so no output may change.
//   [FORMATS=xdot,dot,json] [PORT_TIMEOUT_MS=60000] \
//     node samecheck.mjs <base.mjs> <head.mjs> <survey-clusters.txt>
// survey-clusters.txt: id<TAB>engine<TAB>path (relative to the oracle's tests/).
// Columns: id, engine, format, verdict (same | CHANGED | port-timeout | port-failed).
// A CHANGED row is then judged against native with rowcheck.mjs.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ORACLE_CORPUS_ROOT } from '../../../test/corpus/oracle-paths.mjs';
const [base, head, list] = process.argv.slice(2);
const ROWCHECK = fileURLToPath(new URL('./rowcheck.mjs', import.meta.url));
const FORMATS = (process.env.FORMATS ?? 'xdot,dot,json').split(',');
const T = Number(process.env.PORT_TIMEOUT_MS ?? 60000);
const run = (b, e, f, p) => spawnSync(process.execPath, [ROWCHECK, '--child', b, e, f, p],
  { encoding: 'latin1', maxBuffer: 1 << 28, timeout: T });
const tally = {};
console.log('id\tengine\tformat\tverdict');
for (const line of readFileSync(list, 'utf8').split('\n').filter(Boolean)) {
  const [id, engine, path] = line.split('\t');
  for (const f of FORMATS) {
    const a = run(base, engine, f, `${ORACLE_CORPUS_ROOT}/${path}`);
    const b = run(head, engine, f, `${ORACLE_CORPUS_ROOT}/${path}`);
    const v = a.error || b.error ? 'port-timeout'
      : a.status !== 0 || b.status !== 0 ? (a.status === b.status && a.stdout === b.stdout ? 'same' : 'port-failed')
      : a.stdout === b.stdout ? 'same' : 'CHANGED';
    tally[v] = (tally[v] ?? 0) + 1;
    console.log([id, engine, f, v].join('\t'));
  }
}
console.log(Object.entries(tally).map(([k, v]) => `${k}=${v}`).join(' '));
