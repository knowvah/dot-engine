// SPDX-License-Identifier: EPL-2.0
// Gate 6 for issue #175: native, base and head per input, engine and map format.
//   [ENGINES=dot,neato,fdp] [FORMATS=cmapx,cmapx_np,imap,imap_np] \
//     node compare.mjs <base.mjs> <head.mjs|-> <in.gv...>
// One row per input, engine and format: native's line count, the number of
// native lines missing from base and from head (LCS, as `diff | grep -c '^<'`),
// and whether base and head stdout are byte-equal to native. Pass `-` as head
// to compare base only. Formats are native names; the port spells `_np` as
// `-np`. Each port render runs in its own process (module statics). The oracle
// and its plugin dirs come from test/corpus/oracle-paths.mjs (ADR-0002).
// NATIVE_DIR=<dir> also writes native stdout to <dir>/<input>.<engine>.<fmt>.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import {
  ORACLE_DOT_BIN, ORACLE_GVBINDIR, ORACLE_GVBINDIR_ALL,
} from '../../../test/corpus/oracle-paths.mjs';

const ENGINES = (process.env.ENGINES ?? 'dot,neato,fdp').split(',');
const FORMATS = (process.env.FORMATS ?? 'cmapx,cmapx_np,imap,imap_np').split(',');
const MAX_BUFFER = 1 << 28;
const NATIVE_TIMEOUT_MS = 120_000;

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
  const errs = [];
  mod.agseterrf((s) => { errs.push(s); return 0; });
  const out = mod.render(mod.parse(decode(readFileSync(file))), fmt, { engine });
  process.stdout.write(JSON.stringify({ out, err: errs.join('') }));
}

function runPort(bundle, engine, fmt, file) {
  const r = spawnSync(
    process.execPath,
    [process.argv[1], '--child', bundle, engine, fmt.replace('_np', '-np'), file],
    { encoding: 'utf8', maxBuffer: MAX_BUFFER },
  );
  if (r.status !== 0) return { out: `PORT FAILED: ${r.stderr}`, err: '' };
  return JSON.parse(r.stdout);
}

function runNative(engine, fmt, file) {
  const gvbindir = engine === 'dot' ? ORACLE_GVBINDIR : ORACLE_GVBINDIR_ALL;
  return spawnSync(ORACLE_DOT_BIN, [`-K${engine}`, `-T${fmt}`, file], {
    encoding: 'utf8', maxBuffer: MAX_BUFFER, timeout: NATIVE_TIMEOUT_MS,
    env: { ...process.env, GVBINDIR: gvbindir },
  });
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

const args = process.argv.slice(2);
if (args[0] === '--child') {
  await renderChild(args[1], args[2], args[3], args[4]);
} else {
  const [base, head, ...files] = args;
  console.log('input\tengine\tformat\tlines\tbase\thead\tbaseEq\theadEq');
  for (const file of files) {
    const name = file.split('/').pop();
    for (const engine of ENGINES) {
      for (const fmt of FORMATS) {
        const nat = runNative(engine, fmt, file);
        if (process.env.NATIVE_DIR) {
          writeFileSync(`${process.env.NATIVE_DIR}/${name}.${engine}.${fmt}`, nat.stdout);
        }
        const b = runPort(base, engine, fmt, file);
        const h = head === '-' ? { out: '' } : runPort(head, engine, fmt, file);
        console.log([
          name, engine, fmt, nat.stdout.split('\n').length - 1,
          missing(nat.stdout, b.out), head === '-' ? '-' : missing(nat.stdout, h.out),
          b.out === nat.stdout ? 'same' : 'DIFF',
          head === '-' ? '-' : (h.out === nat.stdout ? 'same' : 'DIFF'),
        ].join('\t'));
      }
    }
  }
}
