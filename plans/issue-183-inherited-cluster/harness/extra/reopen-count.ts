// SPDX-License-Identifier: EPL-2.0
// How many inputs re-open a named subgraph (`subgraph p {..} .. subgraph p {..}`
// in one parent)? The builder replaces a re-opened subgraph with a new Graph
// and a fresh snapshot, so these are the inputs on which issue #183's seeding
// can differ from cgraph. Prints one line per input: re-opens, of which the
// re-opened subgraph or a child of it has a seeded `cluster`.
//   npx tsx reopen-count.ts <root...>
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { agseterrf } from '../../../../src/common/agerr.js';
import type { Graph } from '../../../../src/model/graph.js';
import { StmtProcessor } from '../../../../src/parser/builder.js';
import { parse } from '../../../../src/parser/index.js';

const INPUT_RE = /\.(gv|dot)$/;

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (INPUT_RE.test(name)) yield p;
  }
}

function seededBelow(g: Graph): boolean {
  if (g.seededAttrs?.has('cluster') === true) return true;
  return [...g.subgraphs.values()].some(seededBelow);
}

let reopens = 0;
let seededReopens = 0;
const original = StmtProcessor.prototype.processSubgraph;
StmtProcessor.prototype.processSubgraph = function patched(stmt, graph, root, directed) {
  const reopened = stmt.id !== null && graph.subgraphs.has(stmt.id);
  const sg = original.call(this, stmt, graph, root, directed);
  if (reopened) {
    reopens++;
    if (seededBelow(sg)) seededReopens++;
  }
  return sg;
};

function decode(buf: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return Buffer.from(buf).toString('latin1');
  }
}

agseterrf(() => 0);
let files = 0;
let withReopen = 0;
for (const root of process.argv.slice(2)) {
  for (const file of walk(root)) {
    files++;
    reopens = 0;
    seededReopens = 0;
    try {
      parse(decode(readFileSync(file)));
    } catch {
      continue;
    }
    if (reopens > 0) {
      withReopen++;
      console.log(`${reopens}\t${seededReopens}\t${file}`);
    }
  }
}
console.log(`# files ${files}, with a re-opened subgraph ${withReopen}`);
