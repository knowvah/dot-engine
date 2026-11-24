// SPDX-License-Identifier: EPL-2.0
// Issue #187: native, base and head per probe and format (dot engine only:
// make_flat_adj_edges is dot's).
//   [FORMATS=dot,xdot,svg] node compare.mjs <base.mjs> <head.mjs> <in.gv...>
// Columns, one row per input and format:
//   native     `ok`, `exitN` (non-zero exit, output still written) or `SEGV`
//   lines      native stdout line count
//   baseMiss / headMiss  native lines missing from base / head (LCS)
//   baseExtra / headExtra  port lines native lacks (LCS)
//   baseErr / headErr  stderr equal to native's: `same` or `DIFF`
//   headErrNum `same` when head's stderr equals native's once every
//              `Edge length <n>` number is masked (the make_edge_pairs
//              saturation follow-up), else `DIFF`
//   headEqBase / headEqNative  byte equality of stdout
// Each port render runs in its own process, because module statics carry
// across renders. The oracle comes from test/corpus/oracle-paths.mjs
// (ADR-0003: the carried build).
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { ORACLE_DOT_BIN, ORACLE_GVBINDIR } from '../../../test/corpus/oracle-paths.mjs';

const FORMATS = (process.env.FORMATS ?? 'dot,xdot,svg').split(',');
const MAX_BUFFER = 1 << 28;
const NATIVE_TIMEOUT_MS = 120_000;
const EDGE_LENGTH = /Edge length [0-9.]+/g;

async function renderChild(bundle, fmt, file) {
  const mod = await import(pathToFileURL(bundle).href);
  const errs = [];
  mod.agseterrf((s) => { errs.push(s); return 0; });
  const out = mod.render(mod.parse(readFileSync(file, 'utf8')), fmt, { engine: 'dot' });
  process.stdout.write(JSON.stringify({ out, err: errs.join('') }));
}

function runPort(bundle, fmt, file) {
  const r = spawnSync(
    process.execPath, [process.argv[1], '--child', bundle, fmt, file],
    { encoding: 'utf8', maxBuffer: MAX_BUFFER },
  );
  if (r.status !== 0) return { out: `PORT FAILED: ${r.stderr}`, err: '' };
  return JSON.parse(r.stdout);
}

function runNative(fmt, file) {
  const r = spawnSync(ORACLE_DOT_BIN, ['-Kdot', `-T${fmt}`, file], {
    encoding: 'utf8', maxBuffer: MAX_BUFFER, timeout: NATIVE_TIMEOUT_MS,
    env: { ...process.env, GVBINDIR: ORACLE_GVBINDIR },
  });
  const status = r.signal === 'SIGSEGV' ? 'SEGV' : r.status === 0 ? 'ok' : `exit${r.status}`;
  return { out: r.stdout, err: r.stderr, status };
}

/** Lines of `a` not in an LCS with `b`. Probe outputs are short. */
function missing(a, b) {
  const al = a.split('\n');
  const bl = b.split('\n');
  const dp = Array.from({ length: al.length + 1 }, () => new Int32Array(bl.length + 1));
  for (let i = al.length - 1; i >= 0; i--) {
    for (let j = bl.length - 1; j >= 0; j--) {
      dp[i][j] = al[i] === bl[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  return al.length - dp[0][0];
}

const same = (a, b) => (a === b ? 'same' : 'DIFF');
const args = process.argv.slice(2);
if (args[0] === '--child') {
  await renderChild(args[1], args[2], args[3]);
} else {
  const [base, head, ...files] = args;
  console.log(['input', 'format', 'native', 'lines', 'baseMiss', 'headMiss', 'baseExtra',
    'headExtra', 'baseErr', 'headErr', 'headErrNum', 'headEqBase', 'headEqNative'].join('\t'));
  for (const file of files) {
    for (const fmt of FORMATS) {
      const nat = runNative(fmt, file);
      const b = runPort(base, fmt, file);
      const h = runPort(head, fmt, file);
      console.log([
        file.split('/').pop(), fmt, nat.status, nat.out.split('\n').length - 1,
        missing(nat.out, b.out), missing(nat.out, h.out),
        missing(b.out, nat.out), missing(h.out, nat.out),
        same(b.err, nat.err), same(h.err, nat.err),
        same(h.err.replace(EDGE_LENGTH, 'Edge length N'), nat.err.replace(EDGE_LENGTH, 'Edge length N')),
        h.out === b.out ? 'yes' : 'no', h.out === nat.out ? 'yes' : 'no',
      ].join('\t'));
    }
  }
}
