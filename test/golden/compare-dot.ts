// SPDX-License-Identifier: EPL-2.0
/// <reference types="vitest/importMeta" />
//
// Semantic `-Tdot` (agwrite) comparator.
//
// WHY THIS EXISTS, given `-Txdot` is already swept: the xdot comparator keys
// objects by identity and then compares a *whitelist* — POSITIONAL_ATTRS (11
// names) plus the `_draw_` family. It never compares the *set* of attributes an
// object declares, nor the subgraph tree those declarations hang off. So a
// clean xdot track says nothing about agwrite's structural output. `-Tdot` is
// the surface where that shows: in C both FORMAT_DOT and FORMAT_XDOT end in
// `agwrite(g, job)` and differ only in the attach step
// (`attach_attrs` vs `attach_attrs_and_arrows` + xdot draw attrs).
// @see plugin/core/gvrender_core_dot.c:404,418,475,482
//
// This comparator therefore compares, per object (root graph / subgraph /
// node / edge):
//   - the subgraph TREE shape (nesting + names), and
//   - the declared attribute NAME SET, and
//   - each attribute's value — numerically at 0.01 tolerance when both sides
//     parse as numbers or coordinate lists, exactly otherwise.
//
// Formatting noise is normalized away deliberately, matching the other
// comparators: `.75` vs `0.75`, attribute order within a bracket list,
// whitespace/newline layout inside `[...]`, and quoting of values that need no
// quotes. A reported diff is a real structural or value difference.
//
// One C behavior worth naming, because it looks like a bug and is not: a
// subgraph created BEFORE a graph attribute is first declared gets that
// attribute installed locally by `agapply(root, addattr, rsym, true)` with the
// pre-declaration default, so agwrite emits e.g. `rankdir=""` on that subgraph
// but not on siblings declared afterwards. @see lib/cgraph/attr.c:287
//
// Node-only dev/test infra — never imported by src/index.ts.

import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';

export const DOT_TOLERANCE = 0.01;

/** Classification of a single `-Tdot` divergence. */
export type DotDiffKind =
  | 'structure' // subgraph tree shape: missing/extra/renamed scope
  | 'attr-set' // an object declares an attribute the other side does not
  | 'numeric' // same attr, values differ beyond tolerance
  | 'value' // same attr, non-numeric values differ
  | 'missing' // object absent on the port side
  | 'extra' // object present only on the port side
  | 'parse';

/** One semantic difference between the port's `-Tdot` and the oracle's. */
export interface DotDiff {
  kind: DotDiffKind;
  /** Object identity: `[graph]`, `subgraph:cluster_0`, `node:a`, `edge:a->b#0`. */
  object: string;
  /** Attribute the diff is in, or `<tree>` for structural diffs. */
  attr: string;
  /** Stable dot-path key the dashboard buckets on, e.g. `subgraph:cluster_0/rankdir`. */
  path: string;
  port: string;
  native: string;
  /** Magnitude for numeric diffs (max |port − native| across the value). */
  delta?: number;
}

export interface DotCompareResult {
  verdict: 'pass' | 'diverged';
  diffs: DotDiff[];
}

export interface DotCompareOptions {
  /**
   * AD-4: skip numeric comparison for the iterative engines (neato/fdp/sfdp),
   * whose coordinates are not bit-reproducible. Structure and attribute-set
   * comparison still applies — those are engine-independent.
   */
  iterative: boolean;
}

// ---------------------------------------------------------------------------
// Parsed shape
// ---------------------------------------------------------------------------

/** An attribute list, name → raw (unquoted) value. */
type Attrs = Map<string, string>;

interface DotObj {
  /** `[graph]` | `subgraph:<name>` | `node:<name>` | `edge:<tail>-><head>#<n>` */
  id: string;
  attrs: Attrs;
}

interface DotScope {
  /** Scope identity; the root is `[graph]`. */
  id: string;
  /** `graph [...]` attributes declared in this scope. */
  attrs: Attrs;
  /** `node [...]` / `edge [...]` default statements in this scope. */
  nodeDefaults: Attrs;
  edgeDefaults: Attrs;
  /** Nodes and edges declared *in this scope*, in declaration order. */
  objs: DotObj[];
  /** Nested scopes, in declaration order. */
  subs: DotScope[];
}

// ---------------------------------------------------------------------------
// Tokenizer / parser
//
// A deliberately small DOT reader: agwrite output is a narrow, machine-written
// subset (no HTML strings in attribute *names*, no comments, no line
// continuations), so a hand parser is both sufficient and easier to reason
// about than reusing the port's peggy grammar — and crucially it stays
// independent of the port's own parser, so a parser bug cannot make the port
// and oracle agree spuriously.
// ---------------------------------------------------------------------------

interface Cursor {
  s: string;
  i: number;
}

function isIdChar(c: string): boolean {
  // Non-ASCII bytes are id characters in C's scanner, so a Latin-1/UTF-8 node
  // name like `ÿ` is a bare ID. Stopping at ASCII splits the statement and the
  // node's attributes get mis-attributed to the enclosing graph scope.
  // @see lib/cgraph/write.c:_agstrcanon (non-ascii bytes are id chars)
  return /[A-Za-z0-9_.\-+]/.test(c) || c.charCodeAt(0) >= 0x80;
}

function skipWs(cur: Cursor): void {
  while (cur.i < cur.s.length && /\s/.test(cur.s[cur.i]!)) cur.i++;
}

/** Read one DOT ID: quoted string (with `\"` escapes), HTML `<...>`, or bare. */
function readId(cur: Cursor): string {
  skipWs(cur);
  const c = cur.s[cur.i];
  if (c === undefined) return '';
  if (c === '"') {
    cur.i++;
    let out = '';
    while (cur.i < cur.s.length) {
      const ch = cur.s[cur.i]!;
      if (ch === '\\' && cur.s[cur.i + 1] === '"') {
        out += '"';
        cur.i += 2;
        continue;
      }
      // agwrite breaks long values with a `\`+newline continuation at ~128
      // bytes; unfold it, or a long spline `pos` reads as truncated at the
      // break and every long edge false-diverges. @see lib/cgraph/write.c:113
      if (ch === '\\' && (cur.s[cur.i + 1] === '\n' || cur.s[cur.i + 1] === '\r')) {
        cur.i += 2;
        if (cur.s[cur.i] === '\n') cur.i++; // CRLF
        continue;
      }
      if (ch === '"') {
        cur.i++;
        break;
      }
      out += ch;
      cur.i++;
    }
    return out;
  }
  if (c === '<') {
    // HTML-like string: track angle-bracket depth.
    let depth = 0;
    let out = '';
    while (cur.i < cur.s.length) {
      const ch = cur.s[cur.i]!;
      if (ch === '<') depth++;
      else if (ch === '>') depth--;
      out += ch;
      cur.i++;
      if (depth === 0) break;
    }
    return out;
  }
  let out = '';
  while (cur.i < cur.s.length && isIdChar(cur.s[cur.i]!)) {
    out += cur.s[cur.i]!;
    cur.i++;
  }
  return out;
}

/** Read a bracketed attribute list `[a=b, c=d]`. Cursor must be at `[`. */
function readAttrList(cur: Cursor): Attrs {
  const attrs: Attrs = new Map();
  skipWs(cur);
  if (cur.s[cur.i] !== '[') return attrs;
  cur.i++; // consume '['
  for (;;) {
    skipWs(cur);
    if (cur.i >= cur.s.length) break;
    if (cur.s[cur.i] === ']') {
      cur.i++;
      break;
    }
    if (cur.s[cur.i] === ',' || cur.s[cur.i] === ';') {
      cur.i++;
      continue;
    }
    const name = readId(cur);
    if (name === '') {
      cur.i++; // don't spin on an unexpected byte
      continue;
    }
    skipWs(cur);
    let value = '';
    if (cur.s[cur.i] === '=') {
      cur.i++;
      value = readId(cur);
    }
    attrs.set(name, value);
  }
  return attrs;
}

/**
 * Parse agwrite output into a scope tree. Unknown/unexpected constructs are
 * skipped rather than thrown on — a `parse` diff is reported by the caller only
 * when a side yields no root scope at all, so a malformed emitter still gets a
 * meaningful verdict instead of an exception.
 */
export function parseDotOutput(text: string): DotScope | undefined {
  const cur: Cursor = { s: text, i: 0 };
  skipWs(cur);
  // Optional `strict`, then `graph`/`digraph`, then optional name, then `{`.
  let kw = readId(cur);
  if (kw === 'strict') kw = readId(cur);
  if (kw !== 'graph' && kw !== 'digraph') return undefined;
  readId(cur); // graph name (identity is `[graph]`; name diffs are cosmetic here)
  skipWs(cur);
  if (cur.s[cur.i] !== '{') return undefined;
  cur.i++;
  return readScopeBody(cur, '[graph]');
}

function newScope(id: string): DotScope {
  return {
    id,
    attrs: new Map(),
    nodeDefaults: new Map(),
    edgeDefaults: new Map(),
    objs: [],
    subs: [],
  };
}

/** Read statements until the matching `}`. Cursor is just past the opening `{`. */
function readScopeBody(cur: Cursor, id: string): DotScope {
  const scope = newScope(id);
  /** Per-scope edge occurrence counter, so parallel edges get stable ids. */
  const edgeSeen = new Map<string, number>();

  for (;;) {
    skipWs(cur);
    if (cur.i >= cur.s.length) break;
    const c = cur.s[cur.i]!;
    if (c === '}') {
      cur.i++;
      break;
    }
    if (c === ';' || c === ',') {
      cur.i++;
      continue;
    }
    if (c === '{') {
      // Anonymous scope.
      cur.i++;
      scope.subs.push(readScopeBody(cur, 'subgraph:<anon>'));
      continue;
    }

    const word = readId(cur);
    if (word === '') {
      cur.i++;
      continue;
    }

    if (word === 'subgraph') {
      const name = readId(cur);
      skipWs(cur);
      if (cur.s[cur.i] === '{') {
        cur.i++;
        scope.subs.push(readScopeBody(cur, `subgraph:${name === '' ? '<anon>' : name}`));
      }
      continue;
    }

    if (word === 'graph' || word === 'node' || word === 'edge') {
      const attrs = readAttrList(cur);
      const target =
        word === 'graph' ? scope.attrs : word === 'node' ? scope.nodeDefaults : scope.edgeDefaults;
      for (const [k, v] of attrs) target.set(k, v);
      continue;
    }

    // Either a bare `k=v` graph attribute, a node statement, or an edge chain.
    skipWs(cur);
    if (cur.s[cur.i] === '=') {
      cur.i++;
      scope.attrs.set(word, readId(cur));
      continue;
    }

    // Node or edge. Strip any `:port:compass` suffix for identity purposes.
    let tail = word;
    if (cur.s[cur.i] === ':') {
      while (cur.s[cur.i] === ':') {
        cur.i++;
        readId(cur);
      }
    }
    skipWs(cur);

    // Edge chain: `a -> b -> c [attrs]`.
    let isEdge = false;
    while (cur.s[cur.i] === '-' && (cur.s[cur.i + 1] === '>' || cur.s[cur.i + 1] === '-')) {
      isEdge = true;
      cur.i += 2;
      skipWs(cur);
      let head: string;
      if (cur.s[cur.i] === '{') {
        // Edge to an anonymous group — record the scope, identity is not
        // comparable object-wise, so skip the endpoint.
        cur.i++;
        scope.subs.push(readScopeBody(cur, 'subgraph:<anon>'));
        head = '';
      } else if (cur.s[cur.i] === 's' && /^subgraph\b/.test(cur.s.slice(cur.i))) {
        readId(cur);
        const nm = readId(cur);
        skipWs(cur);
        if (cur.s[cur.i] === '{') {
          cur.i++;
          scope.subs.push(readScopeBody(cur, `subgraph:${nm === '' ? '<anon>' : nm}`));
        }
        head = '';
      } else {
        head = readId(cur);
        if (cur.s[cur.i] === ':') {
          while (cur.s[cur.i] === ':') {
            cur.i++;
            readId(cur);
          }
        }
      }
      skipWs(cur);
      const attrs = cur.s[cur.i] === '[' ? readAttrList(cur) : new Map<string, string>();
      if (head !== '' && tail !== '') {
        const key = `${tail}->${head}`;
        const n = edgeSeen.get(key) ?? 0;
        edgeSeen.set(key, n + 1);
        scope.objs.push({ id: `edge:${key}#${n}`, attrs });
      }
      tail = head;
      skipWs(cur);
    }

    if (!isEdge) {
      const attrs = cur.s[cur.i] === '[' ? readAttrList(cur) : new Map<string, string>();
      scope.objs.push({ id: `node:${tail}`, attrs });
    }
  }
  return scope;
}

// ---------------------------------------------------------------------------
// Value normalization
// ---------------------------------------------------------------------------

/**
 * Split a value into numeric fields when it is a number or a coordinate list
 * (`"1,2"`, `"0,0,176,166"`, `"e,105.62,34 70.4,34 ..."`). Returns undefined
 * when the value is not wholly numeric, in which case it is compared exactly.
 *
 * The `s,`/`e,` markers of a spline `pos` (start-arrow / end-arrow) are flags,
 * not coordinates; they are collected into a prefix so a marker difference
 * reads as a `value` diff rather than a silent numeric shift. An edge can carry
 * BOTH — `pos="s,X,Y e,X,Y p1 p2 ..."` — so strip them in a loop; stripping
 * only the first leaves `e,` embedded, fails the numeric test, and silently
 * downgrades real coordinate drift to an exact-compare `value` diff.
 * @see lib/common/output.c (attach_attrs spline pos)
 */
function numericFields(v: string): { prefix: string; nums: number[] } | undefined {
  const t = v.trim();
  if (t === '') return undefined;
  const toks = t.split(/[\s,]+/).filter(s => s !== '');
  if (toks.length === 0) return undefined;
  // Markers are NOT all leading: the format is `s,X,Y e,X,Y p1 p2 ...`, so `e`
  // appears after the first coordinate pair. Collect marker tokens wherever they
  // occur (order preserved) and require every other token to be numeric.
  let prefix = '';
  const nums: number[] = [];
  for (const tok of toks) {
    if (tok === 's' || tok === 'e') {
      prefix += tok;
      continue;
    }
    // Reject bare `.`/`-` and anything with trailing junk; Number('') is 0.
    if (!/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(tok)) return undefined;
    nums.push(Number(tok));
  }
  if (nums.length === 0) return undefined;
  return { prefix, nums };
}

/** Canonical form for exact (non-numeric) comparison. */
function canonValue(v: string): string {
  return v.trim().replace(/\s+/g, ' ');
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

function compareAttrs(
  objectId: string,
  label: string,
  port: Attrs,
  native: Attrs,
  iterative: boolean,
  diffs: DotDiff[],
): void {
  const names = new Set<string>([...port.keys(), ...native.keys()]);
  for (const name of [...names].sort()) {
    const pv = port.get(name);
    const nv = native.get(name);
    const path = `${objectId}/${label}${name}`;
    if (pv === undefined || nv === undefined) {
      diffs.push({
        kind: 'attr-set',
        object: objectId,
        attr: name,
        path,
        port: pv ?? '<absent>',
        native: nv ?? '<absent>',
      });
      continue;
    }
    const pn = numericFields(pv);
    const nn = numericFields(nv);
    if (pn && nn) {
      if (iterative) continue; // AD-4: coordinates not comparable
      if (pn.prefix !== nn.prefix || pn.nums.length !== nn.nums.length) {
        diffs.push({ kind: 'value', object: objectId, attr: name, path, port: pv, native: nv });
        continue;
      }
      let worst = 0;
      for (let i = 0; i < pn.nums.length; i++) {
        worst = Math.max(worst, Math.abs(pn.nums[i]! - nn.nums[i]!));
      }
      if (worst > DOT_TOLERANCE) {
        diffs.push({
          kind: 'numeric',
          object: objectId,
          attr: name,
          path,
          port: pv,
          native: nv,
          delta: worst,
        });
      }
      continue;
    }
    if (canonValue(pv) !== canonValue(nv)) {
      diffs.push({ kind: 'value', object: objectId, attr: name, path, port: pv, native: nv });
    }
  }
}

/**
 * Compare two scopes. Subgraph children are matched by NAME where both sides
 * name them, and positionally among the anonymous remainder — agwrite emits
 * anonymous scopes (`{ rank=same; ... }`) whose only stable identity is
 * declaration order.
 */
function compareScope(
  port: DotScope,
  native: DotScope,
  iterative: boolean,
  diffs: DotDiff[],
): void {
  compareAttrs(port.id, '', port.attrs, native.attrs, iterative, diffs);
  compareAttrs(port.id, 'node/', port.nodeDefaults, native.nodeDefaults, iterative, diffs);
  compareAttrs(port.id, 'edge/', port.edgeDefaults, native.edgeDefaults, iterative, diffs);

  // Objects, keyed by identity within this scope.
  const pObjs = new Map(port.objs.map(o => [o.id, o]));
  const nObjs = new Map(native.objs.map(o => [o.id, o]));
  for (const id of [...new Set([...pObjs.keys(), ...nObjs.keys()])].sort()) {
    const p = pObjs.get(id);
    const n = nObjs.get(id);
    if (!p) {
      diffs.push({
        kind: 'missing',
        object: id,
        attr: '<tree>',
        path: `${port.id}/${id}`,
        port: '<absent>',
        native: 'declared',
      });
      continue;
    }
    if (!n) {
      diffs.push({
        kind: 'extra',
        object: id,
        attr: '<tree>',
        path: `${port.id}/${id}`,
        port: 'declared',
        native: '<absent>',
      });
      continue;
    }
    compareAttrs(id, '', p.attrs, n.attrs, iterative, diffs);
  }

  // Subgraphs: named by name, anonymous by order.
  const named = (s: DotScope[]) => s.filter(x => !x.id.endsWith('<anon>'));
  const anon = (s: DotScope[]) => s.filter(x => x.id.endsWith('<anon>'));
  const pNamed = new Map(named(port.subs).map(s => [s.id, s]));
  const nNamed = new Map(named(native.subs).map(s => [s.id, s]));
  for (const id of [...new Set([...pNamed.keys(), ...nNamed.keys()])].sort()) {
    const p = pNamed.get(id);
    const n = nNamed.get(id);
    if (!p || !n) {
      diffs.push({
        kind: 'structure',
        object: id,
        attr: '<tree>',
        path: `${port.id}/${id}`,
        port: p ? 'declared' : '<absent>',
        native: n ? 'declared' : '<absent>',
      });
      continue;
    }
    compareScope(p, n, iterative, diffs);
  }
  const pAnon = anon(port.subs);
  const nAnon = anon(native.subs);
  if (pAnon.length !== nAnon.length) {
    diffs.push({
      kind: 'structure',
      object: `${port.id}/<anon>`,
      attr: '<tree>',
      path: `${port.id}/<anon>[count]`,
      port: String(pAnon.length),
      native: String(nAnon.length),
    });
  }
  for (let i = 0; i < Math.min(pAnon.length, nAnon.length); i++) {
    compareScope(pAnon[i]!, nAnon[i]!, iterative, diffs);
  }
}

/**
 * Compare the port's `-Tdot` output against native graphviz's.
 *
 * @param portOut   full `-Tdot` text from the port
 * @param nativeOut full `-Tdot` text from native graphviz
 * @param opts      `{ iterative }` — see AD-4
 */
export function compareDot(
  portOut: string,
  nativeOut: string,
  opts: DotCompareOptions,
): DotCompareResult {
  const port = parseDotOutput(portOut);
  const native = parseDotOutput(nativeOut);
  if (!port || !native) {
    return {
      verdict: 'diverged',
      diffs: [
        {
          kind: 'parse',
          object: '[graph]',
          attr: '<tree>',
          path: '[graph]/<parse>',
          port: port ? 'parsed' : 'unparseable',
          native: native ? 'parsed' : 'unparseable',
        },
      ],
    };
  }
  const diffs: DotDiff[] = [];
  compareScope(port, native, opts.iterative, diffs);
  return { verdict: diffs.length === 0 ? 'pass' : 'diverged', diffs };
}

// ---------------------------------------------------------------------------
// CLI entry point — compare two dot files (port vs native)
// ---------------------------------------------------------------------------

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [, , portPath, nativePath, mode] = process.argv;
  if (!portPath || !nativePath) {
    process.stderr.write('usage: compare-dot <portDot> <nativeDot> [iterative]\n');
    process.exit(2);
  }
  const res = compareDot(readFileSync(portPath, 'utf8'), readFileSync(nativePath, 'utf8'), {
    iterative: mode === 'iterative',
  });
  process.stdout.write(`${res.verdict} (${res.diffs.length} diffs)\n`);
  for (const d of res.diffs.slice(0, 40)) {
    process.stdout.write(
      `  ${d.kind.padEnd(9)} ${d.path}\n    port=${d.port}\n    native=${d.native}\n`,
    );
  }
  if (res.diffs.length > 40) {
    process.stdout.write(`  ... ${res.diffs.length - 40} more\n`);
  }
  process.exit(res.verdict === 'pass' ? 0 : 1);
}
