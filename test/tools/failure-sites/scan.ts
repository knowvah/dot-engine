// SPDX-License-Identifier: EPL-2.0
// Failure-site inventory (graceful-failure D5): where graphviz's C code fails,
// joined to the port symbols that carry an `@see` tag naming that C function.
//
// Pure functions only; test/tools/failure-sites/cli.ts does the file IO.
//
// C file naming: `cFile` is always `lib/<dir>/<file>.c` (or `plugin/<dir>/...`),
// relative to the graphviz source root. Bare names in `@see` tags (`emit.c`)
// are resolved by unique basename against the scanned C files.
//
// Scope notes: the lexer does not understand TS regex literals, K&R is handled
// for plain identifier lists only, and only .c files are scanned (no C++).

import { ORACLE_VERSION } from '../../corpus/oracle-paths.mjs';

export type CKind =
  | 'exit'
  | 'graphviz_exit'
  | 'abort'
  | 'UNREACHABLE'
  | 'agerrorf'
  | 'agerr-return'
  | 'native-crash';
export type PortBehaviour =
  | 'throws-internal'
  | 'throws-render'
  | 'throws-error'
  | 'agerr'
  | 'agerr-recover'
  | 'renders'
  | 'absent';
export type SiteClass =
  | 'mirror'
  | 'graceful'
  | 'upstream-fix'
  | 'port-bug'
  | 'not-ported'
  | 'port-only'
  | 'unclassified';
export interface FailureSiteRow {
  id: string;
  c: { file: string; function: string; kind: CKind; line: number; message: string | null } | null;
  port: { file: string; symbol: string; behaviour: PortBehaviour } | null;
  class: SiteClass;
  status: 'none' | 'proposed' | 'filed' | 'merged';
  links: {
    forkIssue?: string;
    forkBranch?: string;
    upstreamMr?: string;
    dotEngineIssue?: string;
    divergence?: string;
  };
  note: string;
}
export interface FailureSiteRegistry {
  generatedFrom: { cRoot: string; oracle: string };
  rows: FailureSiteRow[];
}

export interface CSite {
  file: string;
  function: string;
  kind: CKind;
  line: number;
  message: string | null;
}
type ThrowKind = 'throws-internal' | 'throws-render' | 'throws-error' | 'agerr';
export type PortSiteKind = ThrowKind | 'see';
export interface PortSite {
  file: string;
  symbol: string;
  kind: PortSiteKind;
  line: number;
  /** `see` sites only: the C file as written in the tag. */
  cFile: string | null;
  /** `see` sites only: C functions named by the tag (may be empty). */
  cFunctions: string[];
}
export interface SeeTag {
  offset: number;
  cFile: string;
  cFunctions: string[];
}

const ORACLE: string = ORACLE_VERSION;
const MODULE_SYMBOL = '<module>';

// ---------------------------------------------------------------- lexing

const LEX_RE =
  /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\[\s\S]|[^"\\\n])*"|'(?:\\[\s\S]|[^'\\\n])*'|`(?:\\[\s\S]|[^`\\])*`/g;
const PP_RE = /^[ \t]*#(?:[^\n\\]|\\[\s\S])*/gm;
const blank = (s: string): string => s.replace(/[^\n]/g, ' ');

function blankToken(tok: string): string {
  if (tok.startsWith('//') || tok.startsWith('/*')) return blank(tok);
  return tok.slice(0, 1) + blank(tok.slice(1, -1)) + tok.slice(-1);
}

/** Blank comments and string bodies, keeping quotes, newlines and offsets. */
export function stripNonCode(text: string): string {
  return text.replace(LEX_RE, blankToken);
}

const stripC = (text: string): string => stripNonCode(text).replace(PP_RE, blank);

function lineAt(text: string, idx: number): number {
  let n = 1;
  for (let i = 0; i < idx; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

function balancedClose(code: string, open: number): number {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    const ch = code[i];
    if (ch === '(') depth++;
    else if (ch === ')' && --depth === 0) return i;
  }
  return code.length;
}

interface Span {
  name: string;
  start: number;
  end: number;
}

// ------------------------------------------------------------- C parsing

type CFrameKind = 'fn' | 'block' | 'extern';
interface CFrame {
  kind: CFrameKind;
  name: string;
  start: number;
}
interface CWalk {
  frames: CFrame[];
  headerStart: number;
  spans: Span[];
}

const NOT_FN = new Set(['if', 'for', 'while', 'switch', 'return', 'sizeof', 'else', 'do']);
const EXTERN_RE = /^extern\s*"\s*"$/;
const KR_RE = /^[^=;()]*\b\w+\s*\(\s*\w+(?:\s*,\s*\w+)*\s*\)\s*[^()=]+$/;
const VOID_PARAMS_RE = /\(\s*void\s*\)/;

/** The function a C declarator header names, or null when it is not one. */
export function fnName(header: string): string | null {
  const h = header.trim();
  const open = h.indexOf('(');
  if (open < 0) return null;
  const before = h.slice(0, open);
  if (before.includes('=')) return null;
  const name = /(\w+)\s*$/.exec(before)?.[1];
  return name === undefined || NOT_FN.has(name) ? null : name;
}

const atTopLevel = (w: CWalk): boolean => w.frames.every((f) => f.kind === 'extern');

function openBrace(w: CWalk, code: string, i: number): void {
  const header = code.slice(w.headerStart, i);
  let kind: CFrameKind = 'block';
  let name = '';
  if (atTopLevel(w)) {
    const fn = fnName(header);
    if (EXTERN_RE.test(header.trim())) kind = 'extern';
    else if (fn !== null) {
      kind = 'fn';
      name = fn;
    }
  }
  w.frames.push({ kind, name, start: i });
  if (kind === 'extern') w.headerStart = i + 1;
}

function closeBrace(w: CWalk, i: number): void {
  const frame = w.frames.pop();
  if (frame?.kind === 'fn') w.spans.push({ name: frame.name, start: frame.start, end: i });
  w.headerStart = i + 1;
}

function semicolon(w: CWalk, code: string, i: number): void {
  if (!atTopLevel(w)) return;
  const header = code.slice(w.headerStart, i).trim();
  const krDecl = KR_RE.test(header) && !VOID_PARAMS_RE.test(header);
  if (!krDecl) w.headerStart = i + 1;
}

/** Spans of the top-level function bodies in preprocessed, stripped C. */
export function cFunctions(code: string): Span[] {
  const w: CWalk = { frames: [], headerStart: 0, spans: [] };
  for (const m of code.matchAll(/[{};]/g)) {
    if (m[0] === '{') openBrace(w, code, m.index);
    else if (m[0] === '}') closeBrace(w, m.index);
    else semicolon(w, code, m.index);
  }
  return w.spans;
}

// ------------------------------------------------------------- C sites

const SITE_SPECS: readonly (readonly [CKind, RegExp])[] = [
  ['exit', /(?<![\w.>])exit\s*\(/g],
  ['graphviz_exit', /(?<![\w.>])graphviz_exit\s*\(/g],
  ['abort', /(?<![\w.>])abort\s*\(\s*\)/g],
  ['UNREACHABLE', /(?<![\w.>])UNREACHABLE\s*\(\s*\)/g],
  ['agerrorf', /(?<![\w.>])agerrorf\s*\(/g],
  ['agerr-return', /(?<![\w.>])agerr\s*\(\s*AGERR\b/g],
];
const RET_SCAN = /[{}]|\breturn\b[^;]*;/g;
const FAIL_RET = /^return\s*\(?\s*(?:-|NULL\b)/;

interface CCtx {
  path: string;
  text: string;
  code: string;
  fns: Span[];
}

/** True when the first same-block `return` after the call returns -N or NULL. */
function returnsFailure(code: string, idx: number): boolean {
  const start = balancedClose(code, code.indexOf('(', idx)) + 1;
  let depth = 0;
  for (const m of code.slice(start).matchAll(RET_SCAN)) {
    const tok = m[0];
    if (tok === '{') depth++;
    else if (tok === '}') {
      if (--depth < 0) return false;
    } else if (depth === 0) return FAIL_RET.test(tok);
  }
  return false;
}

function callMessage(ctx: CCtx, idx: number): string | null {
  const open = ctx.code.indexOf('(', idx);
  const close = balancedClose(ctx.code, open);
  const q = ctx.code.indexOf('"', open);
  if (q < 0 || q > close) return null;
  return ctx.text.slice(q + 1, ctx.code.indexOf('"', q + 1));
}

function toCSite(ctx: CCtx, kind: CKind, idx: number): CSite | null {
  const fn = ctx.fns.find((s) => idx > s.start && idx < s.end);
  if (fn === undefined) return null;
  if (kind === 'agerr-return' && !returnsFailure(ctx.code, idx)) return null;
  return {
    file: ctx.path,
    function: fn.name,
    kind,
    line: lineAt(ctx.text, idx),
    message: callMessage(ctx, idx),
  };
}

/** Failure sites in one C file, in source order. `path` becomes `CSite.file`. */
export function scanC(path: string, text: string): CSite[] {
  const code = stripC(text);
  const ctx: CCtx = { path, text, code, fns: cFunctions(code) };
  const hits = SITE_SPECS.flatMap(([kind, re]) =>
    [...code.matchAll(re)].map((m) => ({ kind, idx: m.index })),
  );
  hits.sort((a, b) => a.idx - b.idx);
  return hits.flatMap((h) => toCSite(ctx, h.kind, h.idx) ?? []);
}

// ------------------------------------------------------- port: @see tags

const SEE_RE = /@see\s+([^\s:]+\.(?:c|cpp|h|hpp|y|l)\b)(?:\s*:([^\n]*))?/g;
const FIRST_FN_RE = /^\s*([A-Za-z_]\w*)(?=[\s:(]|$)/;
const NEXT_FN_RE = /^\s*([A-Za-z_]\w*)\s*(?::[\d-]*)?\s*$/;

function parseFunctions(rest: string): string[] {
  const [first = '', ...more] = rest.replace(/\*\/.*$/, '').split(',');
  const head = FIRST_FN_RE.exec(first)?.[1];
  if (head === undefined) return [];
  return [head, ...more.flatMap((p) => NEXT_FN_RE.exec(p)?.[1] ?? [])];
}

/** Every parsable `@see <c-file>[:fn[, fn]]` tag in a TS source text. */
export function seeTags(text: string): SeeTag[] {
  return [...text.matchAll(SEE_RE)].map((m) => ({
    offset: m.index,
    cFile: m[1] ?? '',
    cFunctions: parseFunctions(m[2] ?? ''),
  }));
}

export function countUnparsedSee(text: string): number {
  return (text.match(/@see\b/g) ?? []).length - seeTags(text).length;
}

// ------------------------------------------------------ port: symbols

type PFrameKind = 'class' | 'sym' | 'block' | 'type';
interface PFrame {
  kind: PFrameKind;
  name: string;
  start: number;
  inType: boolean;
}
interface PSpan extends Span {
  kind: 'class' | 'sym';
}
interface PWalk {
  frames: PFrame[];
  paren: number;
  headerStart: number;
  spans: PSpan[];
}
interface Decl {
  kind: 'class' | 'sym';
  name: string;
}

const DECL_PREFIX_RE = /^(?:(?:export|default|declare|abstract|async)\s+)+/;
const TOP_DECLS: readonly (readonly [RegExp, Decl['kind']])[] = [
  [/^class\s+(\w+)/, 'class'],
  [/^function\s*\*?\s*(\w+)/, 'sym'],
  [/^(?:const|let|var)\s+(\w+)/, 'sym'],
];
const VAR_DECL_RE = /^(?:const|let|var)\s+(\w+)/;
const MEMBER_RE =
  /^(?:(?:public|private|protected|static|async|abstract|override|readonly|get|set|declare)\s+)*\*?\s*(\w+)\s*(?:<[^()]*>)?\s*[(=:?!]/;
const TYPE_OPEN_RE = /[:<|&]\s*$/;

function topDecl(header: string): Decl | null {
  const h = header.trim().replace(DECL_PREFIX_RE, '');
  for (const [re, kind] of TOP_DECLS) {
    const name = re.exec(h)?.[1];
    if (name !== undefined) return { kind, name };
  }
  return null;
}

function memberDecl(cls: string, header: string): Decl | null {
  const name = MEMBER_RE.exec(header.trim())?.[1];
  return name === undefined ? null : { kind: 'sym', name: `${cls}.${name}` };
}

function classifyOpen(top: PFrame | undefined, header: string): Decl | 'type' | null {
  if (top?.inType === true) return null;
  if (TYPE_OPEN_RE.test(header)) return 'type';
  if (top === undefined) return topDecl(header);
  return top.kind === 'class' ? memberDecl(top.name, header) : null;
}

function openP(w: PWalk, code: string, i: number): void {
  const header = code.slice(w.headerStart, i);
  const top = w.frames.at(-1);
  const decl = classifyOpen(top, header);
  const inType = top?.inType === true || decl === 'type';
  const start = w.headerStart + header.length - header.trimStart().length;
  const isDecl = decl !== null && decl !== 'type';
  const kind: PFrameKind = decl === 'type' ? 'type' : isDecl ? decl.kind : 'block';
  w.frames.push({ kind, name: isDecl ? decl.name : '', start, inType });
  if (!inType) w.headerStart = i + 1;
}

function closeP(w: PWalk, i: number): void {
  const f = w.frames.pop();
  if (f !== undefined && (f.kind === 'class' || f.kind === 'sym')) {
    w.spans.push({ kind: f.kind, name: f.name, start: f.start, end: i });
  }
  if (f?.inType !== true) w.headerStart = i + 1;
}

function semiP(w: PWalk, code: string, i: number): void {
  if (w.frames.at(-1)?.inType === true) return;
  if (w.frames.length === 0) {
    const header = code.slice(w.headerStart, i);
    const name = VAR_DECL_RE.exec(header.trim().replace(DECL_PREFIX_RE, ''))?.[1];
    const start = w.headerStart + header.length - header.trimStart().length;
    if (name !== undefined) w.spans.push({ kind: 'sym', name, start, end: i });
  }
  w.headerStart = i + 1;
}

function portSymbols(code: string): PSpan[] {
  const w: PWalk = { frames: [], paren: 0, headerStart: 0, spans: [] };
  for (const m of code.matchAll(/[{}();]/g)) {
    const ch = m[0];
    if (ch === '(') w.paren++;
    else if (ch === ')') w.paren = Math.max(0, w.paren - 1);
    else if (w.paren > 0) continue;
    else if (ch === '{') openP(w, code, m.index);
    else if (ch === '}') closeP(w, m.index);
    else semiP(w, code, m.index);
  }
  return w.spans;
}

function innermost(spans: readonly PSpan[], at: number): PSpan | undefined {
  let best: PSpan | undefined;
  for (const s of spans) {
    if (s.start < at && at < s.end && (best === undefined || s.start > best.start)) best = s;
  }
  return best;
}

const enclosingSymbol = (spans: readonly PSpan[], at: number): string =>
  innermost(spans, at)?.name ?? MODULE_SYMBOL;

/**
 * A tag inside a function belongs to it; elsewhere it documents the next
 * symbol, unless other code (imports, statements) sits in between, in which
 * case it is a module-level tag.
 */
function tagSymbol(spans: readonly PSpan[], code: string, at: number): string {
  const inside = innermost(spans, at);
  if (inside?.kind === 'sym') return inside.name;
  const limit = inside?.end ?? Infinity;
  let next: PSpan | undefined;
  for (const s of spans) {
    if (s.start >= at && s.start < limit && (next === undefined || s.start < next.start)) next = s;
  }
  if (next !== undefined && code.slice(at, next.start).trim() === '') return next.name;
  return next === undefined ? (inside?.name ?? MODULE_SYMBOL) : MODULE_SYMBOL;
}

// --------------------------------------------------------- port: sites

const THROW_KINDS: Readonly<Record<string, ThrowKind>> = {
  InternalError: 'throws-internal',
  RenderError: 'throws-render',
  Error: 'throws-error',
};
const THROW_RE = /\bthrow\s+new\s+(InternalError|RenderError|Error)\s*\(/g;
const AGERR_RE = /(?<!\w)(?<!function\s+)agerr\w*\s*\(/g;

interface Located {
  at: number;
  site: PortSite;
}

function portSite(path: string, text: string, symbol: string, kind: PortSiteKind, at: number): PortSite {
  return { file: path, symbol, kind, line: lineAt(text, at), cFile: null, cFunctions: [] };
}

function throwSites(path: string, text: string, code: string, spans: readonly PSpan[]): Located[] {
  const throws = [...code.matchAll(THROW_RE)].map((m): [number, ThrowKind] => [
    m.index,
    THROW_KINDS[m[1] ?? 'Error'] ?? 'throws-error',
  ]);
  const agerrs = [...code.matchAll(AGERR_RE)].map((m): [number, ThrowKind] => [m.index, 'agerr']);
  return [...throws, ...agerrs].map(([at, kind]) => ({
    at,
    site: portSite(path, text, enclosingSymbol(spans, at), kind, at),
  }));
}

function seeSites(path: string, text: string, code: string, spans: readonly PSpan[]): Located[] {
  return seeTags(text).map((t) => ({
    at: t.offset,
    site: {
      ...portSite(path, text, tagSymbol(spans, code, t.offset), 'see', t.offset),
      cFile: t.cFile,
      cFunctions: t.cFunctions,
    },
  }));
}

/** Throw/agerr sites and `@see` tags in one TS file, in source order. */
export function scanPort(path: string, text: string): PortSite[] {
  const code = stripNonCode(text);
  const spans = portSymbols(code);
  const all = [...throwSites(path, text, code, spans), ...seeSites(path, text, code, spans)];
  return all.sort((a, b) => a.at - b.at).map((l) => l.site);
}

// ---------------------------------------------------------------- join

export function normalizeCFile(p: string): string {
  const s = p.replace(/^\.\//, '');
  if (s.startsWith('lib/') || s.startsWith('plugin/')) return s;
  return s.includes('/') ? `lib/${s}` : s;
}

function resolveCFile(raw: string, cFiles: ReadonlySet<string>): string {
  const n = normalizeCFile(raw);
  if (n.includes('/')) return n;
  const hits = [...cFiles].filter((f) => f.endsWith(`/${n}`));
  return hits.length === 1 ? (hits[0] ?? n) : n;
}

interface SymInfo {
  file: string;
  symbol: string;
  kinds: Set<PortSiteKind>;
  sees: PortSite[];
}

const symKey = (file: string, symbol: string): string => `${file}#${symbol}`;
const THROW_ORDER: readonly ThrowKind[] = ['throws-internal', 'throws-render', 'throws-error', 'agerr'];

function indexSymbols(sites: readonly PortSite[]): Map<string, SymInfo> {
  const syms = new Map<string, SymInfo>();
  for (const s of sites) {
    const key = symKey(s.file, s.symbol);
    const info = syms.get(key) ?? { file: s.file, symbol: s.symbol, kinds: new Set(), sees: [] };
    info.kinds.add(s.kind);
    if (s.kind === 'see') info.sees.push(s);
    syms.set(key, info);
  }
  return syms;
}

const behaviourOf = (info: SymInfo): PortBehaviour =>
  THROW_ORDER.find((k) => info.kinds.has(k)) ?? 'renders';

/** Members inherit the tags of their class (`Class.method` inherits `Class`). */
function inheritedSees(syms: ReadonlyMap<string, SymInfo>, info: SymInfo): PortSite[] {
  const dot = info.symbol.indexOf('.');
  const parent = dot < 0 ? undefined : syms.get(symKey(info.file, info.symbol.slice(0, dot)));
  return [...info.sees, ...(parent?.sees ?? [])];
}

function linkIndex(syms: ReadonlyMap<string, SymInfo>, cFiles: ReadonlySet<string>): Map<string, SymInfo[]> {
  const links = new Map<string, SymInfo[]>();
  for (const info of syms.values()) {
    for (const see of inheritedSees(syms, info)) {
      const file = resolveCFile(see.cFile ?? '', cFiles);
      for (const fn of see.cFunctions) {
        const list = links.get(`${file}#${fn}`) ?? [];
        if (!list.includes(info)) list.push(info);
        links.set(`${file}#${fn}`, list);
      }
    }
  }
  return links;
}

const pickPort = (linked: readonly SymInfo[] | undefined): SymInfo | undefined =>
  linked?.find((i) => behaviourOf(i) !== 'renders') ??
  linked?.find((i) => i.symbol !== MODULE_SYMBOL) ??
  linked?.[0];

const newRow = (p: Pick<FailureSiteRow, 'id' | 'c' | 'port' | 'class'>): FailureSiteRow => ({
  ...p,
  status: 'none',
  links: {},
  note: '',
});

function cRows(
  cSites: readonly CSite[],
  links: ReadonlyMap<string, SymInfo[]>,
  covered: Set<string>,
): FailureSiteRow[] {
  const counts = new Map<string, number>();
  return cSites.map((s) => {
    const base = `${s.file}#${s.function}#${s.kind}`;
    const n = (counts.get(base) ?? 0) + 1;
    counts.set(base, n);
    const info = pickPort(links.get(`${s.file}#${s.function}`));
    if (info !== undefined) covered.add(symKey(info.file, info.symbol));
    const c = { file: s.file, function: s.function, kind: s.kind, line: s.line, message: s.message };
    const port = info && { file: info.file, symbol: info.symbol, behaviour: behaviourOf(info) };
    return newRow({
      id: `${base}#${n}`,
      c,
      port: port ?? null,
      class: port ? 'unclassified' : 'not-ported',
    });
  });
}

function portOnlyRows(sites: readonly PortSite[], covered: ReadonlySet<string>): FailureSiteRow[] {
  const counts = new Map<string, number>();
  return sites.flatMap((s) => {
    const key = symKey(s.file, s.symbol);
    if (s.kind === 'see' || covered.has(key)) return [];
    const n = (counts.get(key) ?? 0) + 1;
    counts.set(key, n);
    const port = { file: s.file, symbol: s.symbol, behaviour: s.kind };
    return [newRow({ id: `port#${key}#${n}`, c: null, port, class: 'port-only' })];
  });
}

/**
 * Link C sites to port symbols through `@see` tags. A C site takes the port
 * symbol linked to its function (preferring one that throws). Throws inside a
 * symbol that backs at least one C row are covered by that row; every other
 * throw gets its own `port-only` row, so each throw is covered by a row naming
 * its port file and symbol.
 */
export function join(cSites: readonly CSite[], portSites: readonly PortSite[]): FailureSiteRow[] {
  const cFiles = new Set(cSites.map((s) => s.file));
  const links = linkIndex(indexSymbols(portSites), cFiles);
  const covered = new Set<string>();
  const rows = cRows(cSites, links, covered);
  return [...rows, ...portOnlyRows(portSites, covered)];
}

// --------------------------------------------------------------- merge

const AUTO_CLASSES: ReadonlySet<SiteClass> = new Set(['unclassified', 'not-ported', 'port-only']);
const SITE_CLASSES: ReadonlySet<string> = new Set([
  ...AUTO_CLASSES,
  'mirror',
  'graceful',
  'upstream-fix',
  'port-bug',
]);
const STATUSES: ReadonlySet<string> = new Set(['none', 'proposed', 'filed', 'merged']);

function applyHand(fresh: FailureSiteRow, old: FailureSiteRow | undefined): FailureSiteRow {
  if (old === undefined) return fresh;
  const cls = AUTO_CLASSES.has(old.class) ? fresh.class : old.class;
  return { ...fresh, class: cls, status: old.status, links: old.links, note: old.note };
}

function isHandSeeded(r: FailureSiteRow): boolean {
  return (
    r.c?.kind === 'native-crash' ||
    !AUTO_CLASSES.has(r.class) ||
    r.status !== 'none' ||
    Object.keys(r.links).length > 0 ||
    r.note !== ''
  );
}

const byId = (a: FailureSiteRow, b: FailureSiteRow): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Merge a fresh scan into an existing registry. Hand-edited fields (`class`
 * unless automatic, `status`, `links`, `note`) are carried over by id. Existing
 * rows the scan no longer produces survive only when hand-seeded or edited
 * (e.g. `native-crash`); pristine stale rows are dropped. Sorted by id.
 */
export function mergeRows(
  existing: readonly FailureSiteRow[],
  scanned: readonly FailureSiteRow[],
): FailureSiteRow[] {
  const old = new Map(existing.map((r) => [r.id, r]));
  const scannedIds = new Set(scanned.map((r) => r.id));
  const merged = scanned.map((r) => applyHand(r, old.get(r.id)));
  const kept = existing.filter((r) => !scannedIds.has(r.id) && isHandSeeded(r));
  return [...merged, ...kept].sort(byId);
}

export function buildRegistry(
  existing: FailureSiteRegistry | null,
  cRoot: string,
  scanned: readonly FailureSiteRow[],
): FailureSiteRegistry {
  return {
    generatedFrom: { cRoot, oracle: ORACLE },
    rows: mergeRows(existing?.rows ?? [], scanned),
  };
}

// ------------------------------------------------------------ validate

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isObjOrNull = (v: unknown): boolean => v === null || isRecord(v);

function isRow(v: unknown): v is FailureSiteRow {
  return (
    isRecord(v) &&
    typeof v['id'] === 'string' &&
    typeof v['class'] === 'string' &&
    SITE_CLASSES.has(v['class']) &&
    typeof v['status'] === 'string' &&
    STATUSES.has(v['status']) &&
    isRecord(v['links']) &&
    typeof v['note'] === 'string' &&
    isObjOrNull(v['c']) &&
    isObjOrNull(v['port'])
  );
}

/** Narrow parsed JSON (read from disk) to a registry, or throw naming the problem. */
export function parseRegistry(json: unknown): FailureSiteRegistry {
  if (!isRecord(json)) throw new Error('registry must be a JSON object');
  const rows = json['rows'];
  if (!Array.isArray(rows)) throw new Error('registry rows must be an array');
  const bad = rows.findIndex((r) => !isRow(r));
  if (bad >= 0) throw new Error(`registry row ${bad} is malformed`);
  const from = json['generatedFrom'];
  const cRoot = isRecord(from) && typeof from['cRoot'] === 'string' ? from['cRoot'] : '';
  return { generatedFrom: { cRoot, oracle: ORACLE }, rows: rows as FailureSiteRow[] };
}
