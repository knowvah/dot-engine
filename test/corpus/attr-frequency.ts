// SPDX-License-Identifier: EPL-2.0
//
// Corpus ATTRIBUTE-FREQUENCY scanner — action 1 of the "corpus attribute-
// coverage blind spots" TODO in plans/port-catalog/README.md.
//
// WHY THIS EXISTS. An upstream forum thread reported that the graphviz test
// corpus exercises attributes very unevenly (node/label in 516 files,
// edge/weight in 18, and zero coverage for graph/sep, graph/overlap_shrink,
// edge/fillcolor). Our sweep universe IS that corpus, so any attribute it never
// exercises is a blind spot every PARITY track is structurally unable to see:
// "0 unaccepted tracked gaps" means zero gaps *in what the corpus exercises*.
//
// The TODO's first action is to reproduce that count against OUR OWN tree
// rather than inherit the numbers on trust. This does that, and adds the part
// that actually drives work: the cross-reference against attributes the PORT
// reads. An attribute the port implements but the corpus never declares is
// UNMEASURED — not passing.
//
// This is deliberately NOT blind-spots.ts. That scanner asks which feature
// CO-OCCURRENCES are dark (a curated matrix, syntactic on purpose). This one
// asks which attributes are exercised at all, and discovers the attribute set
// instead of curating it.
//
//   npx tsx test/corpus/attr-frequency.ts            # summary + blind spots
//   npx tsx test/corpus/attr-frequency.ts --all      # full frequency table
//   npx tsx test/corpus/attr-frequency.ts --json     # machine-readable
//
// Node-only dev/test infra — never imported by src/index.ts.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { homedir } from 'node:os';
import { parse } from '../../src/index.js';
import type { Graph } from '../../src/model/graph.js';

const CORPUS = join(homedir(), 'git/graphviz/tests');
const GOLDEN = new URL('../golden/inputs', import.meta.url).pathname;
const SRC = new URL('../../src', import.meta.url).pathname;

const WANT_ALL = process.argv.includes('--all');
const WANT_JSON = process.argv.includes('--json');

/** Scope-qualified attribute name, e.g. `graph/sep`. */
type Scoped = string;

// ---------------------------------------------------------------------------
// Corpus side — what the graphs actually declare
// ---------------------------------------------------------------------------

/** Every `.dot`/`.gv` file under `dir`, recursively. */
function inputsUnder(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    let ents: string[];
    try {
      ents = readdirSync(d);
    } catch {
      return;
    }
    for (const e of ents) {
      const p = join(d, e);
      let st;
      try {
        st = statSync(p);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(p);
      else if (extname(p) === '.dot' || extname(p) === '.gv') out.push(p);
    }
  };
  walk(dir);
  return out;
}

/**
 * Scope-qualified attribute names one graph DECLARES, recursively.
 *
 * Read off the built model rather than by regex so the scope is right: the
 * builder has already resolved which of `graph [x=1]` / `node [x=1]` /
 * `a [x=1]` a name came from, which a text scan cannot do without
 * reimplementing the grammar.
 */
function declaredIn(g: Graph, into: Set<Scoped>): void {
  for (const k of g.attrs.keys()) into.add('graph/' + k);
  for (const k of g.nodeDefaults.keys()) into.add('node/' + k);
  for (const k of g.edgeDefaults.keys()) into.add('edge/' + k);
  for (const n of g.nodes.values()) for (const k of n.attrs.keys()) into.add('node/' + k);
  for (const e of g.edges) for (const k of e.attrs.keys()) into.add('edge/' + k);
  for (const sub of g.subgraphs.values()) declaredIn(sub, into);
}

// ---------------------------------------------------------------------------
// Port side — what our code reads
// ---------------------------------------------------------------------------

/**
 * Attribute names the port reads, discovered from the source rather than
 * curated, so the list cannot silently go stale as the port grows.
 *
 * Unscoped: the read sites (`attrs.get('rankdir')`, `aggetGraph(g, 'sep')`)
 * name the attribute but not always the object kind, and inferring the kind
 * from the call site is not reliable. Comparison against the corpus is
 * therefore on the bare name — an attribute is "exercised" if ANY scope
 * declares it. That is the conservative direction: it under-reports blind
 * spots rather than inventing them.
 */
function portAttrNames(): Set<string> {
  const names = new Set<string>();
  const re = /(?:attrs\.get|aggetGraph|getAttrInt|agget)\s*\(\s*(?:[A-Za-z_.]+\s*,\s*)?'([a-zA-Z_][a-zA-Z0-9_]*)'/g;
  for (const f of filesUnder(SRC, '.ts')) {
    if (f.endsWith('.test.ts')) continue;
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(re)) names.add(m[1]!);
  }
  return names;
}

function filesUnder(dir: string, ext: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (extname(p) === ext) out.push(p);
    }
  };
  walk(dir);
  return out;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function main(): void {
  const files = [...inputsUnder(CORPUS), ...inputsUnder(GOLDEN)];
  const perAttr = new Map<Scoped, number>();
  const bareSeen = new Set<string>();
  let parsed = 0;
  let failed = 0;

  for (const f of files) {
    let declared: Set<Scoped>;
    try {
      const g = parse(readFileSync(f, 'utf8'));
      declared = new Set<Scoped>();
      declaredIn(g, declared);
      parsed++;
    } catch {
      // A file our parser rejects contributes nothing. Counted and reported so
      // an inflated blind-spot list cannot be blamed on silent parse loss.
      failed++;
      continue;
    }
    for (const a of declared) {
      perAttr.set(a, (perAttr.get(a) ?? 0) + 1);
      bareSeen.add(a.slice(a.indexOf('/') + 1));
    }
  }

  const portNames = portAttrNames();
  const unmeasured = [...portNames].filter(n => !bareSeen.has(n)).sort();
  const rows = [...perAttr.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));

  if (WANT_JSON) {
    process.stdout.write(JSON.stringify({
      files: files.length, parsed, failed,
      attributes: Object.fromEntries(rows),
      portReads: [...portNames].sort(),
      unmeasured,
    }, null, 2) + '\n');
    return;
  }

  process.stdout.write(
    `corpus: ${files.length} files (${parsed} parsed, ${failed} unparsed)\n` +
    `distinct scoped attributes declared: ${perAttr.size}\n` +
    `attribute names the port reads: ${portNames.size}\n\n`,
  );

  process.stdout.write('UNMEASURED — port reads it, no corpus graph declares it:\n');
  if (unmeasured.length === 0) process.stdout.write('  (none)\n');
  for (const n of unmeasured) process.stdout.write('  ' + n + '\n');

  process.stdout.write('\nRAREST 25 declared attributes (file counts):\n');
  for (const [a, c] of rows.slice(0, 25)) {
    process.stdout.write('  ' + String(c).padStart(4) + '  ' + a + '\n');
  }

  if (WANT_ALL) {
    process.stdout.write('\nFULL TABLE (ascending):\n');
    for (const [a, c] of rows) {
      process.stdout.write('  ' + String(c).padStart(4) + '  ' + a + '\n');
    }
  } else {
    process.stdout.write('\nMOST-USED 10:\n');
    for (const [a, c] of rows.slice(-10).reverse()) {
      process.stdout.write('  ' + String(c).padStart(4) + '  ' + a + '\n');
    }
    process.stdout.write('\n(--all for the full table, --json for machine output)\n');
  }
}

main();
