// T8: runs a harness on one input under part 8's T0 environments (each `rounds` times), then under
// part 8's T3 sampling (env pad of (i*37)%9000, MallocNanoZone alternating), and writes one output
// per distinct stdout hash into <out dir>, plus a summary.
// usage: node runs.mjs <harness> <input> <out dir> <rounds> <samples>
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const [HARNESS, INPUT, OUT, ROUNDS, SAMPLES] = process.argv.slice(2);
const script = fs.readFileSync(INPUT, 'utf8');
const pad = (n) => 'x'.repeat(n);
const ENVS = [
  { tag: 'default', add: {} },
  { tag: 'X=1', add: { X: '1' } },
  { tag: 'pad1k', add: { PAD: pad(1024) } },
  { tag: 'pad8k', add: { PAD: pad(8192) } },
  { tag: 'nano0', add: { MallocNanoZone: '0' } },
  { tag: 'nano0-X=1', add: { MallocNanoZone: '0', X: '1' } },
  { tag: 'nano0-pad1k', add: { MallocNanoZone: '0', PAD: pad(1024) } },
  { tag: 'nano1', add: { MallocNanoZone: '1' } },
];
fs.mkdirSync(OUT, { recursive: true });
const distinct = new Map();
const failures = [];
function run(tag, add) {
  const r = spawnSync(HARNESS, { input: script, env: { ...process.env, ...add }, encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) failures.push({ tag, rc: r.status });
  const h = createHash('sha256').update(r.stdout).digest('hex').slice(0, 12);
  if (!distinct.has(h)) { distinct.set(h, { count: 0, firstEnv: tag }); fs.writeFileSync(path.join(OUT, `${h}.out`), r.stdout); }
  distinct.get(h).count++;
  return h;
}
const perEnv = {};
for (const e of ENVS) {
  perEnv[e.tag] = [];
  for (let k = 0; k < +ROUNDS; k++) perEnv[e.tag].push(run(e.tag, e.add));
}
for (let i = 0; i < +SAMPLES; i++) {
  const add = { PAD: pad((i * 37) % 9000) };
  if (i % 2 === 1) add.MallocNanoZone = '0';
  if (i % 5 === 2) add.MallocNanoZone = '1';
  run(`sample${i}`, add);
}
const summary = {
  harness: path.basename(HARNESS), input: path.basename(INPUT), environments: ENVS.map((e) => e.tag),
  roundsPerEnvironment: +ROUNDS, samples: +SAMPLES, failures,
  distinct: Object.fromEntries(distinct), distinctCount: distinct.size,
  perEnvironmentDistinct: Object.fromEntries(Object.entries(perEnv).map(([k, v]) => [k, new Set(v).size])),
};
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 1) + '\n');
console.log(path.basename(HARNESS), 'distinct', distinct.size, 'failures', failures.length, JSON.stringify(Object.fromEntries(distinct)).slice(0, 400));
