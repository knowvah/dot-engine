// SPDX-License-Identifier: EPL-2.0
// Issue #149: native 16.1.1, base and head per corpus id and format.
//   node compare.mjs <base.mjs> <head.mjs> <corpus-id[:engine]...>
// One row per id and format (engine defaults to dot): native's line count, the
// number of native lines missing from base and from head (`diff | grep -c '^<'`),
// whether base and head stderr equal native's, and a verdict:
//   eq      head is byte-equal to native
//   toward  head is not equal, but every native line head misses base misses too
//           (as a multiset), so the head moved toward native or stood still
//   AWAY    head misses a native line base had: a gate failure
// Also `sortEq`: base's sorted lines equal native's (order-only difference). A
// row with sortEq=yes must be eq on the head.
// Each port render runs in its own process: module statics carry across
// renders. The oracle comes from test/corpus/oracle-paths.mjs (ADR-0002).
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  ORACLE_CORPUS_ROOT, ORACLE_DOT_BIN, ORACLE_GVBINDIR, ORACLE_GVBINDIR_ALL,
} from '../../../test/corpus/oracle-paths.mjs';

const FORMATS = ['dot', 'xdot'];
const MAX_BUFFER = 1 << 28;
const REPO = resolve(import.meta.dirname, '../../..');
const MANIFEST = resolve(REPO, 'test/corpus/corpus-manifest.json');
/** `golden:<id>[:engine]` names a test/golden/manifest.json input (added at execution, gate 6). */
const GOLDEN = 'golden:';
const GOLDEN_MANIFEST = resolve(REPO, 'test/golden/manifest.json');

/** UTF-8, else latin1, as test/tools/probe.ts decodes. */
function decode(buf) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return Buffer.from(buf).toString('latin1');
  }
}

async function renderChild(bundle, fmt, file, engine) {
  const mod = await import(pathToFileURL(bundle).href);
  const errs = [];
  mod.agseterrf((s) => { errs.push(s); return 0; });
  const out = mod.render(mod.parse(decode(readFileSync(file))), fmt, { engine });
  process.stdout.write(JSON.stringify({ out, err: errs.join('') }));
}

function runPort(bundle, fmt, file, engine) {
  const r = spawnSync(process.execPath, [process.argv[1], '--child', bundle, fmt, file, engine], {
    encoding: 'utf8', maxBuffer: MAX_BUFFER,
  });
  if (r.status !== 0) return { out: `PORT FAILED: ${r.stderr}`, err: '' };
  return JSON.parse(r.stdout);
}

/** Lines of `a` that `diff a b` reports as removed. */
function missing(dir, a, b) {
  const fa = join(dir, 'a');
  const fb = join(dir, 'b');
  writeFileSync(fa, a);
  writeFileSync(fb, b);
  const r = spawnSync('diff', [fa, fb], { encoding: 'utf8', maxBuffer: MAX_BUFFER });
  return r.stdout.split('\n').filter((l) => l.startsWith('<')).map((l) => l.slice(2));
}

/** Every line of `sub` is in `sup`, counting repeats. */
function subMultiset(sub, sup) {
  const n = new Map();
  for (const l of sup) n.set(l, (n.get(l) ?? 0) + 1);
  for (const l of sub) {
    const k = n.get(l) ?? 0;
    if (k === 0) return false;
    n.set(l, k - 1);
  }
  return true;
}

const sorted = (s) => s.split('\n').sort().join('\n');

const args = process.argv.slice(2);
if (args[0] === '--child') {
  await renderChild(args[1], args[2], args[3], args[4]);
} else {
  const [base, head, ...ids] = args;
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const goldens = JSON.parse(readFileSync(GOLDEN_MANIFEST, 'utf8'));
  const dir = mkdtempSync(join(tmpdir(), 'i149-cmp-'));
  console.log('id\tengine\tformat\tlines\tbase\thead\tsortEq\tverdict\tbaseErr\theadErr');
  for (const arg of ids) {
    const golden = arg.startsWith(GOLDEN);
    const [name, engine = 'dot'] = (golden ? arg.slice(GOLDEN.length) : arg).split(':');
    const id = golden ? GOLDEN + name : name;
    const env = { ...process.env, GVBINDIR: engine === 'dot' ? ORACLE_GVBINDIR : ORACLE_GVBINDIR_ALL };
    const entry = (golden ? goldens : manifest).find((m) => m.id === name);
    if (!entry) { console.log(`${id}\tNOT IN MANIFEST`); continue; }
    const file = golden ? resolve(REPO, entry.input) : join(ORACLE_CORPUS_ROOT, entry.path);
    for (const fmt of FORMATS) {
      const nat = spawnSync(ORACLE_DOT_BIN, [`-K${engine}`, `-T${fmt}`, file], {
        encoding: 'utf8', maxBuffer: MAX_BUFFER, env,
      });
      const b = runPort(base, fmt, file, engine);
      const h = runPort(head, fmt, file, engine);
      const mb = missing(dir, nat.stdout, b.out);
      const mh = missing(dir, nat.stdout, h.out);
      const verdict = h.out === nat.stdout ? 'eq' : subMultiset(mh, mb) ? 'toward' : 'AWAY';
      console.log([
        id, engine, fmt, nat.stdout.split('\n').length - 1, mb.length, mh.length,
        sorted(b.out) === sorted(nat.stdout) ? 'yes' : 'no', verdict,
        b.err === nat.stderr ? 'same' : 'DIFF', h.err === nat.stderr ? 'same' : 'DIFF',
      ].join('\t'));
    }
  }
}
