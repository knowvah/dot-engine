// Orchestrator's check of T14 and T15 on the landed bundle, separate from the agent's.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';

const S = '/private/tmp/claude-501/-Users-scottseely-git-knowvah-dot-engine/651ef5af-dfcd-42a8-846b-e2b51864f3ea/scratchpad';
const REPO = '/Users/scottseely/git/knowvah/dot-engine';
const G = `${homedir()}/git/graphviz`;
const B = `${G}/build`;
const STOCK = '/private/tmp/claude-501/-Users-scottseely-git-knowvah-dot-engine/dfc80e32-d4b2-43d1-a20b-4d2c1be89946/scratchpad/ghl16-all';
const TWICE = `${S}/sc/orch/twice-native`;
const m = await import(`${S}/followups10-baseline/T15.mjs`);

execFileSync('clang', ['-O1', '-w', '-o', TWICE, `${REPO}/plans/post-16-1-followups-9/harness/T11/twice.c`,
  `-I${G}/lib/gvc`, `-I${G}/lib/cgraph`, `-I${G}/lib/common`, `-I${G}/lib/pathplan`, `-I${G}/lib/cdt`, `-I${G}/lib`,
  `-I${B}`, `-I${B}/lib/common`, `-I${B}/lib/gvc`, `-L${B}/lib/gvc`, `-L${B}/lib/cgraph`, `-L${B}/lib/cdt`,
  '-lgvc', '-lcgraph', '-lcdt', `-Wl,-rpath,${B}/lib/gvc`, `-Wl,-rpath,${B}/lib/cgraph`, `-Wl,-rpath,${B}/lib/cdt`,
  `-Wl,-rpath,${B}/lib/pathplan`, `-Wl,-rpath,${B}/lib/xdot`]);

const render2 = (out) => {
  const parts = out.split(/^== render \d$\n/m);
  return parts[2] ?? '';
};
const nums = (s) => s.match(/-?\d+\.?\d*(?:e-?\d+)?/g)?.map(Number) ?? [];
const maxd = (a, b) => {
  const x = nums(a); const y = nums(b);
  if (x.length !== y.length) return `len ${x.length} vs ${y.length}`;
  let d = 0;
  for (let i = 0; i < x.length; i++) d = Math.max(d, Math.abs(x[i] - y[i]));
  return d;
};

function classes(file, engine, fmt, runs) {
  const seen = new Map();
  let crashed = 0;
  for (let i = 0; i < runs; i++) {
    const r = spawnSync(TWICE, [file, engine, fmt, '2'], { encoding: 'utf8', maxBuffer: 1 << 28, timeout: 300000, env: { ...process.env, GVBINDIR: STOCK } });
    if (r.status !== 0) { crashed++; continue; }
    const k = render2(r.stdout);
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  return { seen, crashed };
}

const FIX = `${REPO}/src/gvc/__fixtures__/rerender/`;
const CORPUS = `${G}/graphs/undirected/`;
const CASES = [
  ['graphs-fdp', `${G}/tests/graphs/fdp.gv`, 'dot'],
  ['graphs-fdp', `${G}/tests/graphs/fdp.gv`, 'xdot'],
  ['graphs-fdp', `${G}/tests/graphs/fdp.gv`, 'plain'],
  ['fdp-1581', `${G}/tests/1581.dot`, 'dot'],
  ['cluster-edges', `${FIX}cluster-edges.gv`, 'dot'],
  ['cluster-edges', `${FIX}cluster-edges.gv`, 'xdot'],
];
for (const [id, file, fmt] of CASES) {
  let src;
  try { src = readFileSync(file, 'utf8'); } catch { console.log(id, fmt, 'no input at', file); continue; }
  const { seen, crashed } = classes(file, 'fdp', fmt, 12);
  const g = m.parse(src);
  m.render(g, fmt, { engine: 'fdp' });
  const second = m.render(g, fmt, { engine: 'fdp' });
  const rows = [...seen.entries()].map(([k, c]) => `${c} runs: maxd ${maxd(second, k)}${second === k ? ' bytes-equal' : ''}`);
  console.log(id, fmt, `classes ${seen.size}, crashed ${crashed}`, '|', rows.join(' ; '));
}
console.log('corpus dir note', CORPUS);
