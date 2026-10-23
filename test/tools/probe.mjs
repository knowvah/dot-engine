// SPDX-License-Identifier: EPL-2.0
// Native vs port on DOT cases: node probe.mjs <bundle> <engine> <case...>
// A case is a path to a DOT file or literal DOT source. Prints SAME/DIFF per case for
// SVG text spans, node polygon points and stderr lines (native stderr decoded UTF-8,
// port console captured). Each case runs in its own process. PROBE_VERBOSE=1 prints both
// sides on DIFF.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import { pathToFileURL } from 'node:url';

const ORACLE = `${os.homedir()}/git/graphviz/build/cmd/dot/dot`;
// GV_PLUGINS_DOT: dot-only plugin dir (default /tmp/ghl); GV_PLUGINS_ALL: full plugin dir (required
// for non-dot engines).
const DOTDIR = process.env.GV_PLUGINS_DOT ?? '/tmp/ghl';
const FULL = process.env.GV_PLUGINS_ALL;
const [bundle, engine, ...cases] = process.argv.slice(2);
if (cases.length > 1) {
  // One process per case: port module statics carry across renders (follow-up 42).
  let same = 0;
  for (const c of cases) {
    const r = spawnSync(process.execPath, [process.argv[1], bundle, engine, c], { encoding: 'utf8', maxBuffer: 1 << 28 });
    const out = r.stdout.split('\n').filter((l) => l && !/^\d+\/\d+ SAME$/.test(l));
    process.stdout.write(`${out.join('\n')}\n`);
    if (out[0]?.startsWith('SAME')) same++;
  }
  console.log(`${same}/${cases.length} SAME`);
  process.exit(0);
}
const DE = await import(pathToFileURL(bundle).href);
const GVBINDIR = engine === 'dot' ? DOTDIR : FULL;
if (!GVBINDIR) throw new Error('set GV_PLUGINS_ALL to the full 16.1 plugin dir for non-dot engines');

function decode(buf) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { return Buffer.from(buf).toString('latin1'); }
}
const texts = (x) => [...x.matchAll(/<text[^>]*>([^<]*)</g)].map((m) => m[1]);
const polys = (x) => [...x.matchAll(/<g id="node\d+" class="node">[\s\S]*?<(?:polygon|ellipse|path)[^>]*?(?:points|d|cx)="([^"]*)"/g)].map((m) => m[1]);
const lines = (s) => s.split('\n').filter((l) => l.length > 0);

let diffs = 0;
for (const c of cases) {
  const src = fs.existsSync(c) ? decode(fs.readFileSync(c)) : c;
  const r = spawnSync(ORACLE, [`-K${engine}`, '-Tsvg'], { input: src, env: { ...process.env, GVBINDIR }, maxBuffer: 1 << 28 });
  const nat = r.stdout ?? Buffer.alloc(0);
  const nerr = decode(r.stderr ?? Buffer.alloc(0));
  const ns = decode(nat);
  const w = [];
  const saved = {};
  for (const k of ['log', 'warn', 'error', 'info']) { saved[k] = console[k]; console[k] = (...a) => w.push(a.join(' ')); }
  let ps = '';
  try { ps = DE.renderSvg(src, engine); } catch (e) { ps = `THROW ${e.message}`; } finally { Object.assign(console, saved); }
  const pe = w.join('\n');
  const tSame = JSON.stringify(texts(ns)) === JSON.stringify(texts(ps));
  const pSame = JSON.stringify(polys(ns)) === JSON.stringify(polys(ps));
  const eSame = JSON.stringify(lines(nerr)) === JSON.stringify(lines(pe));
  const same = tSame && pSame && eSame;
  if (!same) diffs++;
  const label = c.length > 70 ? `${c.slice(0, 67)}...` : c;
  console.log(`${same ? 'SAME' : 'DIFF'} text:${tSame ? 'ok' : 'X'} poly:${pSame ? 'ok' : 'X'} stderr:${eSame ? 'ok' : 'X'} | ${label}`);
  if (!same && process.env.PROBE_VERBOSE) {
    if (!tSame) console.log('  text native', JSON.stringify(texts(ns)), '\n  text port  ', JSON.stringify(texts(ps)));
    if (!pSame) console.log('  poly native', JSON.stringify(polys(ns)), '\n  poly port  ', JSON.stringify(polys(ps)));
    if (!eSame) console.log('  err native', JSON.stringify(lines(nerr)), '\n  err port  ', JSON.stringify(lines(pe)));
  }
}
console.log(`${cases.length - diffs}/${cases.length} SAME`);
