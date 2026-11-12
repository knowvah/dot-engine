// SPDX-License-Identifier: EPL-2.0
// Gate 6 for issue #170: native, base and head per input and format.
//   GVBINDIR=<dir> node compare.mjs <base.mjs> <head.mjs> <input.gv...>
// One row per input and format: native's line count, the number of native
// lines missing from base and from head (LCS, as `diff | grep -c '^<'`), and
// whether base and head stderr equal native's. Each port render runs in its own
// process, because module statics carry across renders.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';

const DOT = `${homedir()}/git/graphviz/build/cmd/dot/dot`;
const FORMATS = ['dot', 'xdot', 'plain'];
const MAX_BUFFER = 1 << 28;

/** UTF-8, else latin1, as test/tools/probe.ts decodes. */
function decode(buf) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return Buffer.from(buf).toString('latin1');
  }
}

async function renderChild(bundle, fmt, file) {
  const mod = await import(pathToFileURL(bundle).href);
  const errs = [];
  mod.agseterrf((s) => { errs.push(s); return 0; });
  const out = mod.render(mod.parse(decode(readFileSync(file))), fmt, { engine: 'dot' });
  process.stdout.write(JSON.stringify({ out, err: errs.join('') }));
}

function runPort(bundle, fmt, file) {
  const r = spawnSync(process.execPath, [process.argv[1], '--child', bundle, fmt, file], {
    encoding: 'utf8', maxBuffer: MAX_BUFFER,
  });
  if (r.status !== 0) return { out: `PORT FAILED: ${r.stderr}`, err: '' };
  return JSON.parse(r.stdout);
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
  await renderChild(args[1], args[2], args[3]);
} else {
  const [base, head, ...files] = args;
  console.log('input\tformat\tlines\tbase\thead\tbaseErr\theadErr');
  for (const file of files) {
    for (const fmt of FORMATS) {
      const nat = spawnSync(DOT, [`-T${fmt}`, file], { encoding: 'utf8', maxBuffer: MAX_BUFFER });
      const b = runPort(base, fmt, file);
      const h = runPort(head, fmt, file);
      console.log([
        file.split('/').pop(), fmt, nat.stdout.split('\n').length - 1,
        missing(nat.stdout, b.out), missing(nat.stdout, h.out),
        b.err === nat.stderr ? 'same' : 'DIFF', h.err === nat.stderr ? 'same' : 'DIFF',
      ].join('\t'));
    }
  }
}
