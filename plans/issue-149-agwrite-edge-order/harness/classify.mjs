// SPDX-License-Identifier: EPL-2.0
// Issue #149, gates 5 and 6: what is left of a row that compare.mjs calls `toward`.
//   node classify.mjs <base.mjs> <head.mjs> <corpus-id[:engine]...>
// One row per id, engine and format:
//   struct    yes when head and native are byte-equal once every attribute VALUE is
//             masked (`key="..."`, `key=<...>`, `key=token` become `key=`): the same
//             statements, in the same order, with the same attribute names. What
//             differs is then values only.
//   pureMove  yes when every head line is a base line (as a multiset): the mission
//             moved or removed lines and changed no value.
//   nat/head  lines only native has / only head has (multiset difference)
//   fields    eqBase/eqHead/lost/changed over every (object, attribute) pair of the
//             three outputs, each re-parsed with the head bundle's parser. An object
//             is a graph or subgraph (by path), a node (by name), an edge (by tail,
//             head and its ordinal among parallel edges), or a membership of one in
//             a subgraph. eqBase, eqHead: pairs whose value is native's. lost: pairs
//             that were native's on the base and are not on the head. changed: pairs
//             whose value differs between base and head. A bare re-declaration that
//             the base wrote re-parses as one more edge, so `changed` counts it.
//   registry  what the corpus registries say about the id on this engine
// struct=yes and pureMove=yes together: the head's statement order is native's, and
// every remaining difference is a value the base already had. lost=0 says the same
// per statement, where a line count cannot: two statements may share a line's text
// (a mirrored layout gives edge `4 -> 3` the `pos` line native gives `1 -> 2`).
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
const CORPUS = resolve(import.meta.dirname, '../../../test/corpus');
const COMPARE = join(import.meta.dirname, 'compare.mjs');
const load = (name) => JSON.parse(readFileSync(join(CORPUS, name), 'utf8'));

function runPort(bundle, fmt, file, engine) {
  const r = spawnSync(process.execPath, [COMPARE, '--child', bundle, fmt, file, engine], {
    encoding: 'utf8', maxBuffer: MAX_BUFFER,
  });
  return r.status === 0 ? JSON.parse(r.stdout).out : `PORT FAILED: ${r.stderr}`;
}

/** Index just past the quoted string that opens at `i`. */
function skipQuoted(s, i) {
  let j = i + 1;
  while (j < s.length && s[j] !== '"') j += s[j] === '\\' ? 2 : 1;
  return j + 1;
}

/** Index just past the html string that opens at `i`. */
function skipHtml(s, i) {
  let depth = 0;
  let j = i;
  do {
    if (s[j] === '<') depth++;
    else if (s[j] === '>') depth--;
    j++;
  } while (j < s.length && depth > 0);
  return j;
}

/** `s` with every attribute value removed. */
function mask(s) {
  let out = '';
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c !== '=') { out += c; i++; continue; }
    out += '=';
    i++;
    if (s[i] === '"') i = skipQuoted(s, i);
    else if (s[i] === '<') i = skipHtml(s, i);
    else while (i < s.length && /[^\s,;\]]/.test(s[i])) i++;
  }
  return out;
}

/** Lines of `a` that `b` lacks, counting repeats. */
function minus(a, b) {
  const n = new Map();
  for (const l of b.split('\n')) n.set(l, (n.get(l) ?? 0) + 1);
  return a.split('\n').filter((l) => {
    const k = n.get(l) ?? 0;
    if (k > 0) n.set(l, k - 1);
    return k === 0;
  });
}

/** Every (object, attribute) pair of a parsed graph, as key -> value. */
function flatten(root) {
  const out = new Map();
  const put = (obj, attrs) => { for (const [k, v] of attrs) out.set(`${obj}|${k}`, v); };
  const pairCount = new Map();
  const edgeKey = new Map();
  for (const e of root.edges) {
    const pair = `${e.tail.name}->${e.head.name}`;
    const k = pairCount.get(pair) ?? 0;
    pairCount.set(pair, k + 1);
    edgeKey.set(e, `E:${pair}#${k}`);
    put(edgeKey.get(e), e.attrs);
    out.set(`${edgeKey.get(e)}|`, 'declared');
  }
  for (const n of root.nodes.values()) {
    put(`N:${n.name}`, n.attrs);
    out.set(`N:${n.name}|`, 'declared');
  }
  const walk = (g, path) => {
    put(`G:${path}`, g.attrs);
    put(`ND:${path}`, g.nodeDefaults);
    put(`ED:${path}`, g.edgeDefaults);
    if (g !== root) {
      for (const n of g.nodes.values()) out.set(`M:${path}|${n.name}`, 'member');
      for (const e of g.edges) out.set(`M:${path}|${edgeKey.get(e)}`, 'member');
    }
    for (const sub of g.subgraphs.values()) walk(sub, `${path}/${sub.name}`);
  };
  walk(root, '');
  return out;
}

/** Child: parse the three outputs and print the `fields` column. */
async function fieldsChild(bundle, natFile, baseFile, headFile) {
  const mod = await import(pathToFileURL(bundle).href);
  mod.agseterrf(() => 0);
  const [nat, b, h] = [natFile, baseFile, headFile].map((f) => flatten(mod.parse(readFileSync(f, 'utf8'))));
  let eqBase = 0;
  let eqHead = 0;
  let lost = 0;
  let changed = 0;
  for (const k of new Set([...nat.keys(), ...b.keys(), ...h.keys()])) {
    const [vn, vb, vh] = [nat.get(k), b.get(k), h.get(k)];
    if (vb === vn) eqBase++;
    if (vh === vn) eqHead++;
    if (vb === vn && vh !== vn) lost++;
    if (vb !== vh) changed++;
  }
  process.stdout.write(`${eqBase}/${eqHead}/${lost}/${changed}`);
}

const scratch = mkdtempSync(join(tmpdir(), 'i149-cls-'));

function fields(bundle, nat, b, h) {
  const files = [nat, b, h].map((text, i) => {
    const f = join(scratch, `f${i}`);
    writeFileSync(f, text);
    return f;
  });
  const r = spawnSync(process.execPath, [process.argv[1], '--fields', bundle, ...files], {
    encoding: 'utf8', maxBuffer: MAX_BUFFER,
  });
  return r.status === 0 ? r.stdout : `FAILED ${r.stderr.split('\n')[0]}`;
}

const cache = new Map();
const reg = (name) => cache.get(name) ?? cache.set(name, load(name)).get(name);

/** The registries' word on `id` under `engine`. */
function registry(id, engine) {
  const notes = [];
  if (engine === 'dot') {
    for (const f of ['parity.json', 'xdot-parity.json', 'dot-parity-dot.json']) {
      const r = reg(f).results.find((x) => x.id === id);
      if (r) notes.push(`${f.replace('.json', '')}=${r.verdict}`);
    }
  } else {
    const r = reg(`parity-${engine}.json`).results.find((x) => x.id === id);
    if (r) notes.push(`parity-${engine}=${r.status}${r.nDiffs ? `(${r.nDiffs})` : ''}`);
    if (reg('accepted-divergences-engines.json')[engine]?.[id]) notes.push('accepted-engines');
    try {
      const a = reg(`attribution-${engine}.json`).results.find((x) => x.id === id);
      if (a) notes.push(`attribution=${a.verdict}`);
    } catch { /* no attribution file for this engine */ }
  }
  const acc = reg('accepted-divergences.json').entries.filter((e) => e.match.id === id &&
    (!e.match.engineIn || e.match.engineIn.includes(engine)));
  for (const e of acc) notes.push(`accepted:${e.class}`);
  for (const f of ['accepted-divergences-dot.json', 'accepted-divergences-xdot.json']) {
    const list = Object.values(reg(f)).find(Array.isArray) ?? [];
    if (list.some((e) => e.id === id && (e.engine ?? engine) === engine)) notes.push(f.replace('.json', ''));
  }
  return notes.join(' ') || '-';
}

if (process.argv[2] === '--fields') {
  await fieldsChild(...process.argv.slice(3));
  process.exit(0);
}
const [base, head, ...ids] = process.argv.slice(2);
const manifest = load('corpus-manifest.json');
/** `golden:<id>[:engine]` names a test/golden/manifest.json input. */
const GOLDEN = 'golden:';
const goldens = load('../golden/manifest.json');
console.log('id\tengine\tformat\tstruct\tpureMove\tnat\thead\tfields\tregistry');
for (const arg of ids) {
  const golden = arg.startsWith(GOLDEN);
  const [name, engine = 'dot'] = (golden ? arg.slice(GOLDEN.length) : arg).split(':');
  const id = golden ? GOLDEN + name : name;
  const env = { ...process.env, GVBINDIR: engine === 'dot' ? ORACLE_GVBINDIR : ORACLE_GVBINDIR_ALL };
  const file = golden
    ? resolve(CORPUS, '../..', goldens.find((m) => m.id === name).input)
    : join(ORACLE_CORPUS_ROOT, manifest.find((m) => m.id === name).path);
  for (const fmt of FORMATS) {
    const nat = spawnSync(ORACLE_DOT_BIN, [`-K${engine}`, `-T${fmt}`, file], {
      encoding: 'utf8', maxBuffer: MAX_BUFFER, env,
    }).stdout;
    const b = runPort(base, fmt, file, engine);
    const h = runPort(head, fmt, file, engine);
    console.log([
      id, engine, fmt, mask(h) === mask(nat) ? 'yes' : 'NO',
      minus(h, b).length === 0 ? 'yes' : 'NO', minus(nat, h).length, minus(h, nat).length,
      fields(head, nat, b, h), registry(id, engine),
    ].join('\t'));
  }
}
