// SPDX-License-Identifier: EPL-2.0
//
// Issue #148, T3: targeted survey of the inputs graphviz 16.1.1's tests/ adds
// or changes. For every (id, engine, format) it renders
//   - native 16.1.1 (the oracle, ADR-0002),
//   - native 16.1.0 (attribution only: did a 16.1.1 change move native?),
//   - the port (test/corpus/render-one*.ts),
// all with cwd = the 16.1.1 tests dir (inputs name images relatively), and
// compares them with the survey's own comparators: survey.ts `diffVerdict`
// (compareSvg, deterministic) for SVG, compare-xdot.ts `compareXdot` for xdot
// and compare-dot.ts `compareDot` for `-Tdot`. The xdot comparison is semantic
// and cannot see statement order, so the ids that carry #149's upstream
// numbers (write_body's edge order) also get a `-Tdot` pass, plus a byte
// comparison of the body. Validity follows the walkers: a native render is a reference when it
// is complete (`</svg>` / closing `}`), whatever its exit code.
//
//   npx tsx plans/issue-148-corpus-1611-inputs/harness/classify.mjs <outDir> [id ...]
//
// Env: OLD_DOT_BIN / OLD_GVBINDIR / OLD_GVBINDIR_ALL (the 16.1.0 build),
//      CLASSIFY_POOL (default 4), CLASSIFY_CWD (default: the tests dir; set it
//      to the repo root to see what survey.ts sees, which passes absolute
//      input paths from there, so relative image names do not resolve). Writes <outDir>/<id>.<engine>.<fmt>.<who>.{out,err}
//      and <outDir>/classify.json. Reads only; never writes a registry.

import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { diffVerdict, isWellFormedSvg } from '../../../test/corpus/survey.ts';
import { compareDot } from '../../../test/golden/compare-dot.ts';
import { compareXdot } from '../../../test/golden/compare-xdot.ts';
import { oraclePreflight } from '../../../test/corpus/oracle-env.ts';
import {
  defaultGvbindir,
  ORACLE_CORPUS_ROOT,
  ORACLE_DOT_BIN,
} from '../../../test/corpus/oracle-paths.mjs';

const REPO = fileURLToPath(new URL('../../../', import.meta.url));
const OUT = process.argv[2];
if (!OUT) {
  process.stderr.write('usage: classify.mjs <outDir> [id ...]\n');
  process.exit(2);
}
mkdirSync(OUT, { recursive: true });

const OLD_DOT_BIN = process.env.OLD_DOT_BIN ?? join(homedir(), 'git/graphviz/build/cmd/dot/dot');
const OLD_GVBINDIR = process.env.OLD_GVBINDIR ?? '/tmp/ghl';
const OLD_GVBINDIR_ALL = process.env.OLD_GVBINDIR_ALL ?? OLD_GVBINDIR;
const POOL = Number(process.env.CLASSIFY_POOL ?? 4);
const CWD = process.env.CLASSIFY_CWD ?? ORACLE_CORPUS_ROOT;
const NATIVE_TIMEOUT_MS = 60_000;
const PORT_TIMEOUT_MS = 180_000;
const TSX = join(REPO, 'node_modules/.bin/tsx');
const RENDER_ONE = {
  svg: 'test/corpus/render-one.ts',
  xdot: 'test/corpus/render-one-xdot.ts',
  dot: 'test/corpus/render-one-dot.ts',
};

/** The 36 inputs 16.1.1 adds (2746, 2761, 2761_1 crash the oracle: still run, to record it). */
const NEW_IDS = [
  '2746', '2756', '2756_1', '2758', '2759', '2759_1', '2761', '2761_1', '2765', '2765_1',
  '2768', '2768_1', '2768_2', '2769', '2769_1', '2769_2', '2773', '2773_1', '2774', '2774_1',
  '2776', '2776_1', '2780', '2781', '2781_1', '2783', '2821_0', '2821_1', '2821_2', '2841',
  '2860', '2860_1', '2866', '2870_0', '2870_1', '2870_2',
];
/** The 7 inputs whose content changed at 16.1.1 (ids unchanged). */
const CHANGED_IDS = [
  'linux.i386-radius_dot', 'linux.x86-radius_dot', 'linux.x86-shapes_dot', 'macosx-radius_dot',
  'nshare-radius_dot', 'nshare-shapes_dot', 'windows-radius_dot',
];
/** Extra engines the issue's claims name. `2841` is `layout=fdp`: fdp only. */
const EXTRA_ENGINES = { 2866: ['circo'], 2841: ['fdp'] };
const ONLY_ENGINES = { 2841: ['fdp'] };
/** Ids that carry #149's upstream numbers: `-Tdot` too (statement order). */
const DOT_FORMAT_IDS = new Set(['2860', '2860_1', ...CHANGED_IDS]);

const manifest = JSON.parse(readFileSync(join(REPO, 'test/corpus/corpus-manifest.json'), 'utf8'));
const pathOf = new Map(manifest.map((e) => [e.id, e.path]));

function spawnCapture(cmd, args, env, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { env, cwd: CWD, detached: true });
    const chunks = [];
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        // already gone
      }
    }, timeoutMs);
    child.stdout.on('data', (d) => chunks.push(d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (e) => (stderr += e.message));
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ stdout: Buffer.concat(chunks).toString('utf8'), stderr, code, signal, timedOut });
    });
  });
}

function complete(fmt, text) {
  return fmt === 'svg' ? text.includes('</svg>') : text.trimEnd().endsWith('}');
}

/** One render's status: `ok`, or why it is not a usable output. */
function status(fmt, r) {
  if (r.timedOut) return 'timeout';
  if (r.signal) return `signal ${r.signal}`;
  if (!complete(fmt, r.stdout)) return `incomplete (exit ${r.code})`;
  return 'ok';
}

/** The survey's verdict for `a` scored against reference `b`. */
function compare(fmt, a, b) {
  if (fmt === 'svg') {
    if (!isWellFormedSvg(b)) return { verdict: 'ref-not-well-formed' };
    const v = diffVerdict(a, b);
    return { verdict: v.verdict, maxDelta: v.maxDelta, firstDiff: v.firstDiffPath ?? v.maxDeltaPath, errMsg: v.errMsg };
  }
  if (fmt === 'dot') {
    const { verdict, diffs } = compareDot(a, b, { iterative: false });
    const bytesEqual = a === b;
    if (verdict === 'pass') return { verdict: 'conformant', bytesEqual };
    return { verdict: 'diverged', diffCount: diffs.length, firstDiff: diffs[0]?.path, bytesEqual };
  }
  const { pass, diffs } = compareXdot(a, b);
  if (pass) return { verdict: 'conformant' };
  const first = diffs.find((d) => d.kind !== 'numeric') ?? diffs[0];
  const maxDelta = diffs.reduce((m, d) => Math.max(m, d.delta ?? 0), 0);
  return { verdict: 'diverged', diffCount: diffs.length, firstDiff: first?.path, maxDelta };
}

/** stderr with the input's path forms and stack frames removed, for comparison. */
function normErr(stderr, absInput, relInput) {
  return stderr
    .split('\n')
    .filter((l) => l.trim() !== '' && !/^\s+at /.test(l))
    .map((l) => l.split(absInput).join('<input>').split(relInput).join('<input>').replace(/\bof input\b/, 'of <input>'))
    .join('\n');
}

function portError(stderr) {
  const line = stderr.split('\n').find((l) => l.startsWith('__RENDER_ERROR__'));
  return line ? line.slice('__RENDER_ERROR__'.length).trim() : undefined;
}

async function unit(id, engine, fmt) {
  const rel = pathOf.get(id);
  const abs = join(ORACLE_CORPUS_ROOT, rel);
  const args = [`-K${engine}`, `-T${fmt}`, abs];
  const n11 = await spawnCapture(ORACLE_DOT_BIN, args, { ...process.env, GVBINDIR: defaultGvbindir(engine) }, NATIVE_TIMEOUT_MS);
  const oldDir = engine === 'dot' ? OLD_GVBINDIR : OLD_GVBINDIR_ALL;
  const n10 = await spawnCapture(OLD_DOT_BIN, args, { ...process.env, GVBINDIR: oldDir }, NATIVE_TIMEOUT_MS);
  const port = await spawnCapture(TSX, [join(REPO, RENDER_ONE[fmt]), abs, engine], process.env, PORT_TIMEOUT_MS);
  const base = join(OUT, `${id}.${engine}.${fmt}`);
  for (const [who, r] of [['n1611', n11], ['n1610', n10], ['port', port]]) {
    writeFileSync(`${base}.${who}.out`, r.stdout);
    writeFileSync(`${base}.${who}.err`, r.stderr);
  }
  const s11 = status(fmt, n11);
  const s10 = status(fmt, n10);
  const sPort = port.timedOut ? 'timeout' : port.code !== 0 || port.stdout.length === 0 ? `errored: ${portError(port.stderr) ?? `exit ${port.code}`}` : 'ok';
  const e11 = normErr(n11.stderr, abs, rel);
  const ePort = normErr(port.stderr, abs, rel);
  return {
    id,
    engine,
    fmt,
    native1611: { status: s11, code: n11.code, signal: n11.signal },
    native1610: { status: s10, code: n10.code, signal: n10.signal },
    port: { status: sPort, code: port.code },
    portVs1611: s11 === 'ok' && sPort === 'ok' ? compare(fmt, port.stdout, n11.stdout) : null,
    portVs1610: s10 === 'ok' && sPort === 'ok' ? compare(fmt, port.stdout, n10.stdout) : null,
    n1610Vs1611: s11 === 'ok' && s10 === 'ok' ? compare(fmt, n10.stdout, n11.stdout) : null,
    stderrEqual: e11 === ePort,
    stderr1611: e11.split('\n').slice(0, 6),
    stderrPort: ePort.split('\n').slice(0, 6),
    stderr1610Equal1611: normErr(n10.stderr, abs, rel) === e11,
  };
}

function plan(ids) {
  const units = [];
  for (const id of ids) {
    if (!pathOf.has(id)) throw new Error(`${id} is not in the manifest`);
    const engines = ONLY_ENGINES[id] ?? ['dot', ...(EXTRA_ENGINES[id] ?? [])];
    const formats = DOT_FORMAT_IDS.has(id) ? ['svg', 'xdot', 'dot'] : ['svg', 'xdot'];
    for (const engine of engines) for (const fmt of formats) units.push([id, engine, fmt]);
  }
  return units;
}

async function runPool(units) {
  const results = new Array(units.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= units.length) return;
      results[i] = await unit(...units[i]);
      const r = results[i];
      process.stderr.write(
        `${r.id} ${r.engine} ${r.fmt}: n1611=${r.native1611.status}/${r.native1611.code} port=${r.port.status} ` +
          `vs1611=${r.portVs1611?.verdict ?? '-'} vs1610=${r.portVs1610?.verdict ?? '-'} nativeMoved=${r.n1610Vs1611 ? r.n1610Vs1611.verdict !== 'conformant' : '-'} stderrEq=${r.stderrEqual}\n`,
      );
    }
  }
  await Promise.all(Array.from({ length: POOL }, worker));
  return results;
}

const ids = process.argv.length > 3 ? process.argv.slice(3) : [...NEW_IDS, ...CHANGED_IDS];
const units = plan(ids);
for (const engine of new Set(units.map((u) => u[1]))) {
  oraclePreflight(ORACLE_DOT_BIN, defaultGvbindir(engine), engine);
}
const results = await runPool(units);
writeFileSync(join(OUT, 'classify.json'), `${JSON.stringify(results, null, 2)}\n`);
process.stderr.write(`wrote ${join(OUT, 'classify.json')} (${results.length} units)\n`);
