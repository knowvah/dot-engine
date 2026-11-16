// Lists applicable corpus inputs that use a compass port, with their rankdir.
// Run from the repo root: node plans/issue-153-compass-theta-quarter-pi/harness/scan-compass.mjs
// Columns: id, engine, rankdir (- if unset), 'e' if an east port appears, bytes.
import fs from 'node:fs'; import path from 'node:path';
import { ORACLE_CORPUS_ROOT } from '../../../test/corpus/oracle-paths.mjs';
const m = JSON.parse(fs.readFileSync('test/corpus/corpus-manifest.json','utf8'));
const compassRe = /(?::\s*"?(?:n|ne|e|se|s|sw|w|nw)"?(?=[\s;,\]\-}]|$))|(?:(?:tail|head)port\s*=\s*"?(?:n|ne|e|se|s|sw|w|nw)"?\b)/m;
const eRe = /(?::\s*"?e"?(?=[\s;,\]\-}]|$))|(?:(?:tail|head)port\s*=\s*"?e"?\b)/m;
for (const ent of m) {
  if (ent.status !== 'applicable') continue;
  let t; try { t = fs.readFileSync(path.resolve(ORACLE_CORPUS_ROOT, ent.path), 'latin1'); } catch { continue; }
  const rd = (t.match(/rankdir\s*=\s*"?(\w+)"?/i)||[])[1];
  if (!compassRe.test(t)) continue;
  console.log([ent.id, ent.engine, rd ?? '-', eRe.test(t) ? 'e' : '', t.length].join('\t'));
}
