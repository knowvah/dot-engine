// SPDX-License-Identifier: EPL-2.0
// Issue #188 planning: which corpus and golden inputs make the native oracle
// lose an edge (routesplines failure, `Error: lost ... edge`). Those are the
// only inputs on which a `lost` writer can fire, so they are gate 6's reach set.
//   node plans/issue-188-edgeinfo-lost/harness/native-scan.mjs > <out>.tsv
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  ORACLE_CORPUS_ROOT, ORACLE_DOT_BIN, ORACLE_GVBINDIR,
} from '../../../test/corpus/oracle-paths.mjs';

const REPO = process.cwd();
const LANES = Number(process.env.LANES ?? 6);
const CAP_MS = 60_000;
const FAIL = /Pshortestpath failed|Error: lost .* edge|routesplines/;

function targets() {
  const seen = new Set();
  const out = [];
  const man = JSON.parse(fs.readFileSync(path.join(REPO, 'test/corpus/corpus-manifest.json'), 'utf8'));
  for (const m of man) {
    if (m.status !== 'applicable' || m.engine !== 'dot') continue;
    const file = path.resolve(ORACLE_CORPUS_ROOT, m.path);
    if (seen.has(file) || !fs.existsSync(file)) continue;
    seen.add(file);
    out.push({ id: m.id, file });
  }
  const gold = JSON.parse(fs.readFileSync(path.join(REPO, 'test/golden/manifest.json'), 'utf8'));
  for (const g of gold) {
    const file = path.resolve(REPO, g.input);
    if (seen.has(file) || !fs.existsSync(file)) continue;
    seen.add(file);
    out.push({ id: 'golden:' + g.id, file });
  }
  return out;
}

function run(file) {
  return new Promise((resolve) => {
    const child = spawn(ORACLE_DOT_BIN, ['-Kdot', '-Tdot', file], {
      env: { ...process.env, GVBINDIR: ORACLE_GVBINDIR }, stdio: ['ignore', 'ignore', 'pipe'],
    });
    let err = '';
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, CAP_MS);
    child.stderr.on('data', (d) => { if (err.length < 200_000) err += d.toString(); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, err, timedOut }); });
  });
}

const tg = targets();
let next = 0;
const rows = [];
async function lane() {
  while (next < tg.length) {
    const t = tg[next++];
    const r = await run(t.file);
    const hits = r.err.split('\n').filter((l) => FAIL.test(l));
    if (r.timedOut) rows.push([t.id, t.file, 'TIMEOUT', 0, 0]);
    else if (hits.length > 0) {
      const lost = hits.filter((l) => /Error: lost/.test(l)).length;
      rows.push([t.id, t.file, `exit${r.code}`, hits.length - lost, lost]);
    }
  }
}
await Promise.all(Array.from({ length: LANES }, lane));
rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
console.log(['id', 'file', 'status', 'routeFailLines', 'lostLines'].join('\t'));
for (const r of rows) console.log(r.join('\t'));
console.error(`scanned ${tg.length}, rows ${rows.length}`);
