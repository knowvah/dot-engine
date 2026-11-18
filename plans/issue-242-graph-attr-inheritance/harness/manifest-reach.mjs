// SPDX-License-Identifier: EPL-2.0
// Issue #242 reach: parse every applicable corpus-manifest input with two
// bundles and print the ids whose parsed graph-attribute model differs (each
// graph's attrs and seeded keys, recursively). The change seeds inherited
// graph attributes into subgraphs, so an id whose model is equal cannot render
// differently through that path; the printed ids are the bytediff selection.
//   node manifest-reach.mjs <base.mjs> <head.mjs> > ids.txt
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ORACLE_CORPUS_ROOT } from '../../../test/corpus/oracle-paths.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const [baseB, headB] = process.argv.slice(2);
const base = await import(pathToFileURL(baseB).href);
const head = await import(pathToFileURL(headB).href);
const manifest = JSON.parse(readFileSync(join(REPO, 'test/corpus/corpus-manifest.json'), 'utf8'))
  .filter((m) => m.status === 'applicable');

/** UTF-8, else latin1, as test/tools/probe.ts decodes. */
function decode(buf) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return Buffer.from(buf).toString('latin1');
  }
}

const model = (g) => ({
  attrs: [...g.attrs], seeded: [...(g.seededAttrs ?? [])].sort(),
  subs: [...g.subgraphs.values()].map(model),
});

function parsed(mod, src) {
  mod.agseterrf(() => 0);
  try {
    return JSON.stringify(model(mod.parse(src)));
  } catch (err) {
    return `THROW ${err?.message}`;
  }
}

let reached = 0;
for (const m of manifest) {
  const src = decode(readFileSync(join(ORACLE_CORPUS_ROOT, m.path)));
  if (parsed(base, src) !== parsed(head, src)) {
    reached++;
    console.log(m.id);
  }
}
console.error(`# manifest ${manifest.length}, reached ${reached}`);
