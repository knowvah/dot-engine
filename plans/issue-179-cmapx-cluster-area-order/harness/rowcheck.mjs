// SPDX-License-Identifier: EPL-2.0
// Issue #177 (copied for #178, #179): the queue's changed-output rule, per input, engine and format.
//   [ENGINES=dot,neato,fdp] [FORMATS=cmapx,cmapx_np,svg] [VERBOSE=1] \
//     node rowcheck.mjs <base.mjs> <head.mjs|-> <in.gv...>
// Columns: native line count; lines of base and of head missing from native
// (LCS, as `diff | grep -c '^>'`); verdict. Verdicts: `unchanged` (head stdout
// equals base's), `native` (head equals native), `toward` (every line head
// adds over base is a native line, and every line it drops is not one),
// `AWAY` (anything else), `timeout` (native hit the 120 s cap or died on a
// signal). LCS, not line index, because the port's svg header wraps lines
// native does not. Pass `-` as head to list base only. Formats are native
// names; the port spells `_np` as `-np`. Each render runs in its own process
// (module statics). Oracle paths: test/corpus/oracle-paths.mjs (ADR-0002).
// NATIVE_DIR=<dir> writes native stdout to <dir>/<input>.<engine>.<fmt>.
// PORT_TIMEOUT_MS=<n> (execution, #179) caps one port render; a capped base or
// head gives the verdict `port-timeout` and is never judged. Default: no cap.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import {
  ORACLE_DOT_BIN, ORACLE_GVBINDIR, ORACLE_GVBINDIR_ALL,
} from '../../../test/corpus/oracle-paths.mjs';

const ENGINES = (process.env.ENGINES ?? 'dot,neato,fdp').split(',');
const FORMATS = (process.env.FORMATS ?? 'cmapx,cmapx_np,svg').split(',');
const MAX_BUFFER = 1 << 28;
const NATIVE_TIMEOUT_MS = 120_000;
const SHOW = 160;
const PORT_TIMEOUT_MS = Number(process.env.PORT_TIMEOUT_MS ?? 0);
const PORT_TIMEOUT = 'PORT TIMEOUT';

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
    { encoding: 'utf8', maxBuffer: MAX_BUFFER, ...(PORT_TIMEOUT_MS > 0 ? { timeout: PORT_TIMEOUT_MS } : {}) },
  );
  if (r.error?.code === 'ETIMEDOUT') return PORT_TIMEOUT;
  return r.status === 0 ? r.stdout : `PORT FAILED: ${r.stderr}`;
}

function runNative(engine, fmt, file) {
  const gvbindir = engine === 'dot' ? ORACLE_GVBINDIR : ORACLE_GVBINDIR_ALL;
  return spawnSync(ORACLE_DOT_BIN, [`-K${engine}`, `-T${fmt}`, file], {
    encoding: 'utf8', maxBuffer: MAX_BUFFER, timeout: NATIVE_TIMEOUT_MS,
    env: { ...process.env, GVBINDIR: gvbindir },
  });
}

/** Lines of `a` outside an LCS with `b`. Inputs here are small. */
function extra(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Int32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out = [];
  let i = 0;
  let j = 0;
  while (i < a.length) {
    if (j < b.length && a[i] === b[j]) { i++; j++; } else if (j < b.length && dp[i][j + 1] >= dp[i + 1][j]) { j++; } else { out.push(a[i++]); }
  }
  return out;
}

function judge(nat, base, head) {
  if (base === PORT_TIMEOUT || head === PORT_TIMEOUT) {
    return { verdict: 'port-timeout', counts: { base: '-', head: '-' }, left: [] };
  }
  const n = nat.split('\n');
  const b = base.split('\n');
  const counts = { base: extra(b, n).length, head: head === null ? '-' : 0 };
  if (head === null) return { verdict: '-', counts, left: extra(b, n) };
  const h = head.split('\n');
  const left = extra(h, n);
  counts.head = left.length;
  if (head === base) return { verdict: 'unchanged', counts, left };
  if (head === nat) return { verdict: 'native', counts, left: [] };
  const natSet = new Set(n);
  const added = extra(h, b);
  const dropped = extra(b, h);
  const ok = added.every((l) => natSet.has(l)) && dropped.every((l) => !natSet.has(l));
  return { verdict: ok ? 'toward' : 'AWAY', counts, left };
}

const args = process.argv.slice(2);
if (args[0] === '--child') {
  await renderChild(args[1], args[2], args[3], args[4]);
} else {
  const [base, head, ...files] = args;
  const tally = {};
  console.log('input\tengine\tformat\tlines\tbaseDiff\theadDiff\tverdict');
  for (const file of files) {
    const name = file.split('/').pop();
    for (const engine of ENGINES) {
      for (const fmt of FORMATS) {
        const nat = runNative(engine, fmt, file);
        if (process.env.NATIVE_DIR) {
          writeFileSync(`${process.env.NATIVE_DIR}/${name}.${engine}.${fmt}`, nat.stdout);
        }
        const timedOut = nat.error !== undefined || nat.status === null;
        const r = timedOut
          ? { verdict: 'timeout', counts: { base: '-', head: '-' }, left: [] }
          : judge(nat.stdout, runPort(base, engine, fmt, file),
            head === '-' ? null : runPort(head, engine, fmt, file));
        tally[r.verdict] = (tally[r.verdict] ?? 0) + 1;
        const lines = nat.stdout.split('\n').length - 1;
        console.log([name, engine, fmt, lines, r.counts.base, r.counts.head, r.verdict].join('\t'));
        const shown = r.verdict === 'toward' || r.verdict === 'AWAY' || process.env.VERBOSE;
        if (shown) for (const l of r.left) console.log(`  port ${l.slice(0, SHOW)}`);
      }
    }
  }
  console.log(Object.entries(tally).map(([k, v]) => `${k}=${v}`).join(' '));
}
