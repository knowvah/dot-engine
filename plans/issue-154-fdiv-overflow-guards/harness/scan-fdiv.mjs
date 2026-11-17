// Lists applicable corpus inputs that can reach the three #154 sites.
// Run from the repo root: node plans/issue-154-fdiv-overflow-guards/harness/scan-fdiv.mjs
// Columns: id, manifest engine, reason (curved | ipsep | hier | fixedshape | zerosize), bytes.
//  curved     splines=curved: makeStraightEdges' bend (routespl.c:bend)
//  ipsep/hier neato mode: constrained_majorization_vpsc's alpha/beta
//  fixedshape fixedsize=shape: poly_inside's polyBB scale branch
//  zerosize   width/height 0: poly_inside's xsize/ysize near or at zero
import fs from 'node:fs'; import path from 'node:path';
import { ORACLE_CORPUS_ROOT } from '../../../test/corpus/oracle-paths.mjs';
const m = JSON.parse(fs.readFileSync('test/corpus/corpus-manifest.json', 'utf8'));
const tests = [
  ['curved', /splines\s*=\s*"?curved"?/i],
  ['ipsep', /\bmode\s*=\s*"?ipsep"?/i],
  ['hier', /\bmode\s*=\s*"?hier"?/i],
  ['fixedshape', /fixedsize\s*=\s*"?shape"?/i],
  ['zerosize', /\b(?:width|height)\s*=\s*"?0*\.?0+"?(?=[\s;,\]])/i],
];
for (const ent of m) {
  if (ent.status !== 'applicable') continue;
  let t; try { t = fs.readFileSync(path.resolve(ORACLE_CORPUS_ROOT, ent.path), 'latin1'); } catch { continue; }
  const why = tests.filter(([, re]) => re.test(t)).map(([k]) => k);
  if (why.length) console.log([ent.id, ent.engine, why.join(','), t.length].join('\t'));
}
