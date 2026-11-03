// T7: runs the native drivers under the eight environments of part 8's T0 runs.mjs (environment
// size and MallocNanoZone) and reports the distinct hashes of the sorted events, of the
// constraints, and of the std::sort permutations, then writes one dump of each into <out>.
// usage: node runs.mjs <bin dir> <out dir>
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const [BIN, OUT] = process.argv.slice(2);
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
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);
const run = (bin, env) => {
  const r = spawnSync(path.join(BIN, bin), { env: { ...process.env, ...env }, encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`${bin} ${JSON.stringify(Object.keys(env))} rc ${r.status}`);
  return r.stdout;
};
/** Lines of a dump, keyed by their CASE. */
function byCase(out) {
  const m = new Map();
  let k = '';
  for (const l of out.split('\n')) {
    if (l.startsWith('CASE ')) { k = l.slice(5); m.set(k, {}); }
    else if (l.startsWith('EVENTS')) m.get(k).events = l.split(': ')[1] ?? l.slice(9);
    else if (l.startsWith('CONS:')) m.get(k).cons = l.slice(5).trim();
  }
  return m;
}

fs.mkdirSync(OUT, { recursive: true });
const dumps = ENVS.map((e) => byCase(run('native-dump', { ...e.add, T7_DUMP: '1' })));
const pristines = ENVS.map((e) => byCase(run('native-pristine', e.add)));
const sorts = ENVS.map((e) => run('native-sort', e.add));
const summary = { environments: ENVS.map((e) => e.tag), sortDistinct: new Set(sorts.map(sha)).size, cases: {} };
const first = dumps[0];
for (const k of first.keys()) {
  const ev = new Set(dumps.map((d) => d.get(k).events));
  const cons = new Set(dumps.map((d) => d.get(k).cons));
  const pristine = new Set(pristines.map((d) => d.get(k).cons));
  summary.cases[k] = {
    eventsDistinct: ev.size,
    consDistinct: cons.size,
    pristineDistinct: pristine.size,
    consEqualsPristine: [...cons].every((c) => pristine.has(c)) && [...pristine].every((c) => cons.has(c)),
    eventsSha: sha([...ev].join('|')),
  };
}
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 1) + '\n');
// The fixture: X events (mode 1) and Y events (mode 2) of each case, and the constraints of the
// cases whose centres are distinct in the pass: no Node* address tie in the scanline, so the
// constraints depend on the event order alone. They come from the unpatched oracle library.
const ADDRESS_FREE = { row: [0, 1], touch: [0, 1], overlap: [0, 1], point: [0, 1], col: [2] };
const events = {};
const constraints = {};
for (const [k, v] of first) {
  const [kind, n, mode] = k.split(' ');
  if (mode !== '0') events[`${kind} ${n} ${mode === '1' ? 'X' : 'Y'}`] = v.events;
  if (ADDRESS_FREE[kind]?.includes(Number(mode))) {
    if (summary.cases[k].pristineDistinct !== 1 || !summary.cases[k].consEqualsPristine) throw new Error(`unstable ${k}`);
    constraints[k] = pristines[0].get(k).cons;
  }
}
fs.writeFileSync(path.join(OUT, 'events.json'), JSON.stringify(events, null, 0) + '\n');
fs.writeFileSync(path.join(OUT, 'constraints.json'), JSON.stringify(constraints, null, 0) + '\n');
fs.writeFileSync(path.join(OUT, 'sort.txt'), sorts[0]);
const vals = Object.values(summary.cases);
console.log('sort distinct', summary.sortDistinct);
console.log('cases', vals.length, 'events distinct>1:', vals.filter((c) => c.eventsDistinct > 1).length,
  'dump cons distinct>1:', vals.filter((c) => c.consDistinct > 1).length,
  'pristine cons distinct>1:', vals.filter((c) => c.pristineDistinct > 1).length,
  'cons != pristine:', vals.filter((c) => !c.consEqualsPristine).length);
for (const [k, c] of Object.entries(summary.cases)) if (c.consDistinct > 1 || c.pristineDistinct > 1 || !c.consEqualsPristine) console.log(' ', k, JSON.stringify(c));
