// SPDX-License-Identifier: EPL-2.0
// Gate 6 for issue #182 (execution): compare.mjs's columns say how many native
// lines base and head miss, not whether head's stdout equals base's, which is
// this mission's stop condition 2. This runner reports that directly, plus the
// stderr verdicts and the count of fillMap lines on each side.
//   ENGINE=fdp [LANES=4] [FORMAT=dot] [NATIVE_TIMEOUT_MS=120000] [PORT_TIMEOUT_MS=300000] \
//     node survey-run.mjs <base> <head> <outdir> <in.gv...>
// One TSV row per input on stdout:
//   input  native  natWarn  baseWarn  headWarn  stdout  baseErr  headErr
// native: ok | SEGVxN (five crashed tries) | TIMEOUT | exit<N>; stdout: same | CHANGED
// (head against base); *Err: same | DIFF against native's stderr. For a headErr
// DIFF row, <outdir>/<n>.{native,head}.err hold the two stderrs.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ORACLE_DOT_BIN, ORACLE_GVBINDIR, ORACLE_GVBINDIR_ALL,
} from '../../../test/corpus/oracle-paths.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const COMPARE = join(HERE, 'compare.mjs');
const ENGINE = process.env.ENGINE ?? 'fdp';
const FORMAT = process.env.FORMAT ?? 'dot';
const LANES = Number(process.env.LANES ?? '4');
const NATIVE_TIMEOUT_MS = Number(process.env.NATIVE_TIMEOUT_MS ?? '120000');
const PORT_TIMEOUT_MS = Number(process.env.PORT_TIMEOUT_MS ?? '300000');
const NATIVE_TRIES = 5;
const FILLMAP_RE = /^Warning: Two clusters named .* - the second will be ignored$/gm;

function run(cmd, args, env, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    const out = [];
    const err = [];
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutMs);
    child.stdout.on('data', (d) => out.push(d));
    child.stderr.on('data', (d) => err.push(d));
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({
        code, signal, timedOut,
        stdout: Buffer.concat(out).toString('utf8'), stderr: Buffer.concat(err).toString('utf8'),
      });
    });
  });
}

async function runNative(file) {
  const gvbindir = ENGINE === 'dot' ? ORACLE_GVBINDIR : ORACLE_GVBINDIR_ALL;
  const env = { ...process.env, GVBINDIR: gvbindir };
  let r;
  let crashes = 0;
  for (let i = 0; i < NATIVE_TRIES; i++) {
    r = await run(ORACLE_DOT_BIN, [`-K${ENGINE}`, `-T${FORMAT}`, file], env, NATIVE_TIMEOUT_MS);
    if (r.timedOut || r.signal !== 'SIGSEGV') break;
    crashes++;
  }
  let status = 'ok';
  if (r.timedOut) status = 'TIMEOUT';
  else if (r.signal === 'SIGSEGV') status = `SEGVx${crashes}`;
  else if (r.code !== 0) status = `exit${r.code ?? r.signal}`;
  return { status, stderr: r.stderr };
}

async function runPort(bundle, file) {
  const r = await run(
    process.execPath, [COMPARE, '--child', bundle, ENGINE, FORMAT, file], process.env, PORT_TIMEOUT_MS,
  );
  if (r.timedOut) return { out: 'PORT TIMEOUT', err: '' };
  if (r.code !== 0) return { out: `PORT FAILED: ${r.stderr.split('\n').find((l) => /Error/.test(l)) ?? r.stderr.slice(0, 200)}`, err: '' };
  return JSON.parse(r.stdout);
}

const count = (s) => (s.match(FILLMAP_RE) ?? []).length;

const [base, head, outdir, ...files] = process.argv.slice(2);
mkdirSync(outdir, { recursive: true });
const rows = new Array(files.length);
let next = 0;
async function lane() {
  for (;;) {
    const i = next++;
    if (i >= files.length) return;
    const file = files[i];
    const nat = await runNative(file);
    const b = await runPort(base, file);
    const h = await runPort(head, file);
    const headErr = h.err === nat.stderr ? 'same' : 'DIFF';
    if (headErr === 'DIFF') {
      writeFileSync(join(outdir, `${i}.native.err`), nat.stderr);
      writeFileSync(join(outdir, `${i}.head.err`), h.err);
      writeFileSync(join(outdir, `${i}.base.err`), b.err);
    }
    let stdout = h.out === b.out ? 'same' : 'CHANGED';
    if (h.out.startsWith('PORT ')) stdout += `(${h.out.slice(0, 80).replace(/\s+/g, ' ')})`;
    rows[i] = [
      `${i}:${file}`, nat.status, count(nat.stderr), count(b.err), count(h.err), stdout,
      b.err === nat.stderr ? 'same' : 'DIFF', headErr,
    ].join('\t');
  }
}
await Promise.all(Array.from({ length: LANES }, lane));
console.log('input\tnative\tnatWarn\tbaseWarn\theadWarn\tstdout\tbaseErr\theadErr');
for (const row of rows) console.log(row);
