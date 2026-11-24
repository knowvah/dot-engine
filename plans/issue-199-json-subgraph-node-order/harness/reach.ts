// SPDX-License-Identifier: EPL-2.0
// Issue #199 reach: the applicable corpus ids where some subgraph lists its
// nodes in an order other than sequence order (so json's member lists or a
// subgraph render's gids can change). Parses each file with the port; a file
// the port cannot parse is listed with `parse-error`.
//   npx tsx reach.ts > survey-ids.tsv
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ORACLE_CORPUS_ROOT } from '../../../test/corpus/oracle-paths.mjs';
import { parse } from '../../../src/parser/index.js';
import type { Graph } from '../../../src/model/graph.js';

interface Entry { id: string; path: string; status: string }
const manifest = JSON.parse(readFileSync(new URL('../../../test/corpus/corpus-manifest.json', import.meta.url), 'utf8')) as Entry[];
/** Subgraphs (any depth) whose node map order differs from id order. */
function outOfSeq(g: Graph, acc: string[]): void {
  for (const [, sg] of g.subgraphs) {
    const ids = [...sg.nodes.values()].map((n) => n.id);
    if (ids.some((v, i) => i > 0 && v < ids[i - 1])) acc.push(sg.name);
    outOfSeq(sg, acc);
  }
}
console.log('id\tpath\tsubgraphs');
for (const e of manifest.filter((x) => x.status === 'applicable')) {
  const file = join(ORACLE_CORPUS_ROOT, e.path);
  if (!existsSync(file)) continue;
  let acc: string[] = [];
  try { outOfSeq(parse(readFileSync(file, 'latin1')), acc); } catch { acc = ['parse-error']; }
  if (acc.length > 0) console.log(`${e.id}\t${e.path}\t${acc.length}`);
}
