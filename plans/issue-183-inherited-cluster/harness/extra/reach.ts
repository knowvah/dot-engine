// SPDX-License-Identifier: EPL-2.0
// Gate 6 selection check for issue #183: parse every input under the given
// roots with the head source and list those in which the builder seeded
// `cluster` into at least one subgraph. Only those inputs can change output.
//   npx tsx reach.ts <root...>
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { agseterrf } from '../../../../src/common/agerr.js';
import type { Graph } from '../../../../src/model/graph.js';
import { parse } from '../../../../src/parser/index.js';

const INPUT_RE = /\.(gv|dot)$/;

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (INPUT_RE.test(name)) yield p;
  }
}

function seededCount(g: Graph): number {
  let n = g.seededAttrs?.has('cluster') === true ? 1 : 0;
  for (const sg of g.subgraphs.values()) n += seededCount(sg);
  return n;
}

function decode(buf: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return Buffer.from(buf).toString('latin1');
  }
}

agseterrf(() => 0);
let files = 0;
let failed = 0;
for (const root of process.argv.slice(2)) {
  for (const file of walk(root)) {
    files++;
    try {
      const n = seededCount(parse(decode(readFileSync(file))));
      if (n > 0) console.log(`${n}\t${file}`);
    } catch {
      failed++;
    }
  }
}
console.log(`# files ${files}, parse failures ${failed}`);
