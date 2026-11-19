// SPDX-License-Identifier: EPL-2.0
// Issue #175: the queue's changed-output rule, per input, engine and map format.
//   [ENGINES=..] [FORMATS=..] [VERBOSE=1] node rowcheck.mjs <base.mjs> <head.mjs> <in.gv...>
// Verdicts: `unchanged` (head stdout equals base's), `native` (head equals
// native), `toward` (every line that changed now equals native's line and no
// line that equalled native on the base differs), `AWAY` (anything else),
// `timeout` (native hit the 120 s cap or died on a signal). Lines are compared by index; a row whose
// line counts differ between native, base and head is `AWAY`. `toward` and
// `AWAY` rows print the lines that still differ from native (VERBOSE=1: all).
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import {
  ORACLE_DOT_BIN, ORACLE_GVBINDIR, ORACLE_GVBINDIR_ALL,
} from '../../../../test/corpus/oracle-paths.mjs';

const ENGINES = (process.env.ENGINES ?? 'dot,neato,fdp').split(',');
const FORMATS = (process.env.FORMATS ?? 'cmapx,cmapx_np,imap,imap_np').split(',');
const MAX_BUFFER = 1 << 28;
const NATIVE_TIMEOUT_MS = 120_000;
const SHOW = 160;

/** UTF-8, else latin1, as test/tools/probe.ts decodes. */
function decode(buf) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return Buffer.from(buf).toString('latin1');
  }
}

async function renderChild(bundle, engine, fmt, file) {
  const mod = await import(pathToFileURL(bundle).href);
  mod.agseterrf(() => 0);
  process.stdout.write(mod.render(mod.parse(decode(readFileSync(file))), fmt, { engine }));
}

function runPort(bundle, engine, fmt, file) {
  const r = spawnSync(
    process.execPath,
    [process.argv[1], '--child', bundle, engine, fmt.replace('_np', '-np'), file],
    { encoding: 'utf8', maxBuffer: MAX_BUFFER },
  );
  return r.status === 0 ? r.stdout : `PORT FAILED: ${r.stderr}`;
}

function runNative(engine, fmt, file) {
  const gvbindir = engine === 'dot' ? ORACLE_GVBINDIR : ORACLE_GVBINDIR_ALL;
  return spawnSync(ORACLE_DOT_BIN, [`-K${engine}`, `-T${fmt}`, file], {
    encoding: 'utf8', maxBuffer: MAX_BUFFER, timeout: NATIVE_TIMEOUT_MS,
    env: { ...process.env, GVBINDIR: gvbindir },
  });
}

/** Index-wise verdict and the counts of lines differing from native. */
function judge(nat, base, head) {
  const n = nat.split('\n');
  const b = base.split('\n');
  const h = head.split('\n');
  const count = (x) => (x.length === n.length ? x.filter((l, i) => l !== n[i]).length : -1);
  const counts = { base: count(b), head: count(h) };
  if (head === base) return { verdict: 'unchanged', counts, left: [] };
  if (head === nat) return { verdict: 'native', counts, left: [] };
  if (counts.base < 0 || counts.head < 0) return { verdict: 'AWAY', counts, left: [] };
  const bad = h.some((l, i) => l !== n[i] && (l !== b[i] || b[i] === n[i]));
  const left = h.flatMap((l, i) => (l === n[i] ? [] : [`  port   ${l}`, `  native ${n[i]}`]));
  return { verdict: bad ? 'AWAY' : 'toward', counts, left };
}

const args = process.argv.slice(2);
if (args[0] === '--child') {
  await renderChild(args[1], args[2], args[3], args[4]);
} else {
  const [base, head, ...files] = args;
  const tally = {};
  console.log('input\tengine\tformat\tbaseDiff\theadDiff\tverdict');
  for (const file of files) {
    const name = file.split('/').pop();
    for (const engine of ENGINES) {
      for (const fmt of FORMATS) {
        const nat = runNative(engine, fmt, file);
        // A native exit status of 1 with stdout is a render with errors, not a timeout.
        const timedOut = nat.error !== undefined || nat.status === null;
        const r = timedOut
          ? { verdict: 'timeout', counts: { base: '-', head: '-' }, left: [] }
          : judge(nat.stdout, runPort(base, engine, fmt, file), runPort(head, engine, fmt, file));
        tally[r.verdict] = (tally[r.verdict] ?? 0) + 1;
        if (r.verdict === 'unchanged' && !process.env.VERBOSE && r.counts.base === 0) continue;
        console.log([name, engine, fmt, r.counts.base, r.counts.head, r.verdict].join('\t'));
        const shown = r.verdict === 'toward' || r.verdict === 'AWAY' || process.env.VERBOSE;
        if (shown) for (const l of r.left) console.log(l.slice(0, SHOW));
      }
    }
  }
  console.log(Object.entries(tally).map(([k, v]) => `${k}=${v}`).join(' '));
}
