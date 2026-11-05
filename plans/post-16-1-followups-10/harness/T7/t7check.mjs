// Orchestrator's check of T7, independent of the agent's sweep: every committed
// neato dim fixture on the landed bundle, then graphs the agent never saw.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const S = '/private/tmp/claude-501/-Users-scottseely-git-knowvah-dot-engine/651ef5af-dfcd-42a8-846b-e2b51864f3ea/scratchpad';
const BUNDLE = `${S}/followups10-baseline/T7.mjs`;
const FIX = '/Users/scottseely/git/knowvah/dot-engine/src/layout/neato/__fixtures__/dim/';
const DOT = '/Users/scottseely/git/graphviz/build/cmd/dot/dot';
const GVBINDIR = '/private/tmp/claude-501/-Users-scottseely-git-knowvah-dot-engine/dfc80e32-d4b2-43d1-a20b-4d2c1be89946/scratchpad/ghl16-all';
const OUT = `${S}/sc/orch/t7-fresh`;
mkdirSync(OUT, { recursive: true });

const ONE = `${OUT}/one.mjs`;
writeFileSync(ONE, `import { readFileSync } from 'node:fs';
const m = await import(${JSON.stringify(BUNDLE)});
const [file, fmt] = process.argv.slice(2);
process.stdout.write(m.render(m.parse(readFileSync(file, 'utf8')), fmt, { engine: 'neato' }));
`);

function port(file, fmt) {
  const r = spawnSync('node', [ONE, file, fmt], { encoding: 'utf8', timeout: 120000, maxBuffer: 1 << 28 });
  return { rc: r.status, out: r.stdout, err: r.stderr, timedOut: r.error?.code === 'ETIMEDOUT' };
}
function native(file, fmt) {
  const r = spawnSync(DOT, ['-Kneato', `-T${fmt}`, file], {
    encoding: 'utf8', timeout: 60000, maxBuffer: 1 << 28, env: { ...process.env, GVBINDIR },
  });
  return { rc: r.status, out: r.stdout, err: r.stderr, timedOut: r.error?.code === 'ETIMEDOUT' };
}
const unwrap = (s) => s.replaceAll('\\\n', '');
function firstDiff(a, b) {
  const x = a.split('\n'); const y = b.split('\n');
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i] !== y[i]) return `line ${i}: port ${JSON.stringify(x[i])} native ${JSON.stringify(y[i])}`;
  }
  return '';
}
function classify(p, n) {
  if (p === n) return 'equal';
  if (unwrap(p) === unwrap(n)) return 'equal-after-unwrap';
  return 'DIFF';
}

// 1. Every committed fixture.
const tally = {};
const bump = (k) => { tally[k] = (tally[k] ?? 0) + 1; };
for (const f of readdirSync(FIX).filter((x) => x.endsWith('.gv')).sort()) {
  const id = f.slice(0, -3);
  for (const fmt of ['xdot', 'dot']) {
    const p = port(FIX + f, fmt);
    const c = p.rc === 0 ? classify(p.out, readFileSync(`${FIX}${id}.${fmt}`, 'utf8')) : `port-rc-${p.rc}`;
    bump(`fixture:${c}`);
    if (c !== 'equal') console.log('FIXTURE', id, fmt, c, firstDiff(p.out, readFileSync(`${FIX}${id}.${fmt}`, 'utf8')).slice(0, 200), p.err.slice(0, 200));
  }
}

// 2. Fresh graphs from a seed the agent did not use.
let seed = 86421;
const rnd = (n) => { seed = (seed * 1664525 + 1013904223) % 4294967296; return Math.floor((seed / 4294967296) * n); };
function edges(n, extra) {
  const es = [];
  const seen = new Set();
  for (let i = 1; i < n; i++) { const a = rnd(i); es.push([a, i]); seen.add(`${a},${i}`); }
  for (let k = 0; k < extra; k++) {
    const a = rnd(n); const b = rnd(n);
    if (a !== b && !seen.has(`${a},${b}`) && !seen.has(`${b},${a}`)) { seen.add(`${a},${b}`); es.push([a, b]); }
  }
  return es;
}
const VARIANTS = [
  ['digraph', '->', 'mode=hier; dim=3; dimen=3', ''],
  ['digraph', '->', 'mode=hier; dim=4; dimen=4', ''],
  ['digraph', '->', 'mode=hier; dim=3; dimen=3; model=subset', ''],
  ['digraph', '->', 'mode=hier', ''],
  ['graph', '--', 'mode=hier; dim=3; dimen=3', ' [dir=none]'],
  ['digraph', '->', 'mode=hier', ' [len=0.001]'],
  ['digraph', '->', 'mode=hier; dim=3; dimen=3', ' [len=0.001]'],
  ['digraph', '->', 'mode=sgd; dim=3; dimen=3', ''],
  ['graph', '--', 'mode=ipsep; dim=3; dimen=3', ''],
  ['graph', '--', 'start=regular; dim=3; dimen=3', ''],
  ['graph', '--', 'mode=KK; dim=3; dimen=3', ''],
  ['graph', '--', 'model=circuit; dim=3; dimen=3', ''],
];
const SIZES = [3, 6, 11, 19, 27, 38, 43, 58];
const misses = [];
for (const n of SIZES) {
  VARIANTS.forEach(([kw, op, attrs, ea], v) => {
    const es = edges(n, rnd(Math.ceil(n / 2) + 1));
    const file = `${OUT}/f${n}-${v}.gv`;
    const body = es.map(([a, b]) => `  n${a} ${op} n${b}${ea};`).join('\n');
    writeFileSync(file, `${kw} G {\n  ${attrs};\n${body}\n}\n`);
    for (const fmt of ['xdot', 'dot']) {
      const nat = native(file, fmt);
      if (nat.timedOut || nat.rc !== 0) { bump(`fresh:native-${nat.timedOut ? 'timeout' : `rc${nat.rc}`}`); misses.push([file, fmt, 'native', nat.rc]); continue; }
      const p = port(file, fmt);
      if (p.rc !== 0 || p.timedOut) { bump('fresh:PORT-FAILED'); misses.push([file, fmt, 'port', p.rc, p.err.slice(0, 200)]); continue; }
      const c = classify(p.out, nat.out);
      const key = `v${v}`;
      bump(`fresh:${c}`);
      bump(`${key}:${c}`);
      if (c === 'DIFF') misses.push([file, fmt, firstDiff(p.out, nat.out).slice(0, 220)]);
    }
  });
}
console.log(JSON.stringify(tally, null, 1));
writeFileSync(`${OUT}/misses.json`, JSON.stringify(misses, null, 1));
console.log('misses', misses.length);
for (const m of misses.slice(0, 25)) console.log(m.join(' | '));
