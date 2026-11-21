// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import {
  buildRegistry,
  countUnparsedSee,
  join,
  mergeRows,
  normalizeCFile,
  parseRegistry,
  scanC,
  scanPort,
  seeTags,
  stripNonCode,
  type CSite,
  type FailureSiteRow,
} from './scan.js';

const brief = (sites: CSite[]): string[] => sites.map((s) => `${s.function}:${s.kind}`);
const portBrief = (text: string): string[] =>
  scanPort('src/p.ts', text).map((s) => `${s.symbol}:${s.kind}`);
const cSite = (p: Partial<CSite>): CSite => ({
  file: 'lib/x/x.c',
  function: 'fn',
  kind: 'exit',
  line: 1,
  message: null,
  ...p,
});
const row = (p: Partial<FailureSiteRow>): FailureSiteRow => ({
  id: 'id',
  c: null,
  port: null,
  class: 'unclassified',
  status: 'none',
  links: {},
  note: '',
  ...p,
});

describe('stripNonCode', () => {
  it('blanks comments and string bodies but keeps offsets and newlines', () => {
    const src = 'a /* x\ny */ "s;" // t\nb';
    const out = stripNonCode(src);
    expect(out.length).toBe(src.length);
    expect(out).toBe('a     \n     "  "     \nb');
  });
});

describe('scanC', () => {
  it('finds exit, graphviz_exit, UNREACHABLE and agerrorf, and skips assert', () => {
    const src = [
      '#include <stdlib.h>',
      'static int foo(int x)',
      '{',
      '    if (x) {',
      '        exit(1);',
      '    }',
      '    assert(x > 0);',
      '    UNREACHABLE();',
      '    return 0;',
      '}',
      'void bar(void) { graphviz_exit(2); }',
      'int baz(void) { agerrorf("bad thing\\n"); return -1; }',
    ].join('\n');
    const sites = scanC('lib/x/x.c', src);
    expect(brief(sites)).toEqual([
      'foo:exit',
      'foo:UNREACHABLE',
      'bar:graphviz_exit',
      'baz:agerrorf',
    ]);
    expect(sites.map((s) => s.line)).toEqual([5, 8, 11, 12]);
    expect(sites[3]?.message).toBe('bad thing\\n');
    expect(sites[0]?.message).toBeNull();
    expect(sites[0]?.file).toBe('lib/x/x.c');
  });

  it('matches abort() and respects word boundaries', () => {
    const src =
      'void f(void) { _exit(1); atexit(g); exit_code(1); o.exit(2); my_abort(); p->exit(3); abort(); }';
    expect(brief(scanC('a.c', src))).toEqual(['f:abort']);
  });

  it('ignores sites inside comments and string literals', () => {
    const src = [
      'void f(void) {',
      '  // exit(1);',
      '  /* abort() */',
      '  puts("exit(1) UNREACHABLE()");',
      "  c = '\"'; ",
      '}',
    ].join('\n');
    expect(scanC('a.c', src)).toEqual([]);
  });

  it('keeps agerr(AGERR) only when a failure return follows in the block', () => {
    const cases: [string, boolean][] = [
      ['agerr(AGERR, "no mem"); return NULL;', true],
      ['agerr (AGERR, "x"); return -1;', true],
      ['agerr(AGERR, "x"); return (NULL);', true],
      ['agerr(AGWARN, "w"); return -1;', false],
      ['agerr(AGERR, "x"); return 0;', false],
      ['agerr(AGERR, "x"); if (a) { return -1; } return 1;', false],
      ['if (c) { agerr(AGERR, "x"); } return -1;', false],
      ['agerr(AGERR, "x");', false],
    ];
    for (const [body, expected] of cases) {
      const sites = scanC('a.c', `int f(int c, int a) { ${body} }`);
      expect(sites.length, body).toBe(expected ? 1 : 0);
    }
    const [site] = scanC('a.c', 'int f(void) { agerr(AGERR, "no mem"); return NULL; }');
    expect(site).toMatchObject({ kind: 'agerr-return', function: 'f', message: 'no mem' });
  });

  it('names the enclosing function for static, pointer, multi-line and K&R signatures', () => {
    const src = [
      'static char *',
      'multi_line(int a,',
      '           int b)',
      '{',
      '  exit(1);',
      '}',
      'const struct foo *ptr_fn(void) { abort(); }',
      'void kr(a, b)',
      'int a;',
      'char *b;',
      '{',
      '  abort();',
      '}',
      'int proto(size_t);',
      'int g(void) { for (int i = 0; i < 2; i++) { if (i) { while (1) {',
      '  switch (i) { default: exit(3); } } } } return 0; }',
    ].join('\n');
    expect(brief(scanC('a.c', src))).toEqual([
      'multi_line:exit',
      'ptr_fn:abort',
      'kr:abort',
      'g:exit',
    ]);
  });

  it('ignores preprocessor lines including continued macro bodies', () => {
    const src = [
      '#define FAIL(x) do { \\',
      '    exit(x); \\',
      '  } while (0)',
      '#define DIE() abort()',
      'int f(void) { abort(); }',
    ].join('\n');
    expect(brief(scanC('a.c', src))).toEqual(['f:abort']);
  });

  it('descends into extern "C" blocks and ignores top-level sites', () => {
    const src = 'UNREACHABLE();\nextern "C" {\nvoid h(void) { abort(); }\n}\nstruct s { int a; };\nint x = 1;';
    expect(brief(scanC('a.c', src))).toEqual(['h:abort']);
  });

  it('survives unbalanced braces and initializer blocks', () => {
    const src = 'int tbl[] = { 1, 2 };\n}\nvoid f(void) { exit(1); }';
    expect(brief(scanC('a.c', src))).toEqual(['f:exit']);
  });

  it('does not treat an initializer with a call as a function', () => {
    const src = 'static int v = f(1) + (int[]){ 1 }[0];\nvoid g(void) { exit(1); }';
    expect(brief(scanC('a.c', src))).toEqual(['g:exit']);
  });
});

describe('seeTags', () => {
  it('parses the tag forms used in src/', () => {
    const text = [
      '/** @see emit.c:pop_obj_state (assert(obj) at emit.c:135) */',
      '/** @see lib/xdot/xdot.c: sprintXDot, jsonXDot */',
      '/** @see lib/common/const.h */',
      '/** @see plugin/core/gvrender_core_dot.c:775, gvrender_core_map.c:273-276 */',
      '/** @see lib/common/emit.c:emit_clusters:3835-3840, 3907-3917 */',
      '/** @see lib/gvc/gvloadimage.c:gvloadimage (44-64), gvloadimage_select */',
      '/** @see lib/vpsc/x.cpp: NodeSet::insert (std::set, so no duplicates) */',
      '/** @see expat */',
    ].join('\n');
    expect(seeTags(text).map((t) => [t.cFile, t.cFunctions])).toEqual([
      ['emit.c', ['pop_obj_state']],
      ['lib/xdot/xdot.c', ['sprintXDot', 'jsonXDot']],
      ['lib/common/const.h', []],
      ['plugin/core/gvrender_core_dot.c', []],
      ['lib/common/emit.c', ['emit_clusters']],
      ['lib/gvc/gvloadimage.c', ['gvloadimage', 'gvloadimage_select']],
      ['lib/vpsc/x.cpp', ['NodeSet']],
    ]);
    expect(countUnparsedSee(text)).toBe(1);
  });
});

describe('scanPort', () => {
  const FIXTURE = [
    '/** @see lib/x.c:fn */',
    'export function portFn(): void {',
    "  throw new InternalError('boom');",
    '}',
    'export class Box {',
    '  /** @see lib/y.c:other */',
    '  method(opts: { a: number }): void {',
    "    throw new RenderError('r');",
    '  }',
    "  static make = (): void => { throw new Error('e'); };",
    '}',
    'export const arrow = async (a: number): Promise<{ x: number }> => {',
    "  agerr(AGERR, 'x');",
    '  return { x: a };',
    '};',
    "const lit = [1].map(() => { throw new Error('nested'); });",
    "throw new Error('top');",
    'const msg = "throw new Error(x)"; // throw new Error(y)',
    'function agerr(a: number): void {}',
  ].join('\n');

  it('attributes throws, agerr calls and tags to the enclosing symbol', () => {
    expect(portBrief(FIXTURE)).toEqual([
      'portFn:see',
      'portFn:throws-internal',
      'Box.method:see',
      'Box.method:throws-render',
      'Box.make:throws-error',
      'arrow:agerr',
      'lit:throws-error',
      '<module>:throws-error',
    ]);
  });

  it('records the tag target and lines', () => {
    const sites = scanPort('src/p.ts', FIXTURE);
    expect(sites[0]).toMatchObject({
      file: 'src/p.ts',
      kind: 'see',
      cFile: 'lib/x.c',
      cFunctions: ['fn'],
      line: 1,
    });
    expect(sites[1]).toMatchObject({ kind: 'throws-internal', line: 3, cFile: null });
  });

  it('attaches an in-body tag to the enclosing symbol and a class tag to the class', () => {
    const text = [
      '/** @see lib/c.c:cls */',
      'export class K {',
      '  go(): void {',
      '    // @see lib/c.c:inner',
      "    throw new InternalError('x');",
      '  }',
      '  /** @see lib/c.c:tail */',
      '}',
    ].join('\n');
    expect(portBrief(text)).toEqual(['K:see', 'K.go:see', 'K.go:throws-internal', 'K:see']);
  });

  it('handles return-type literals and declarations ended by a semicolon', () => {
    const text = [
      'export function f(): { a: number } {',
      "  throw new Error('x');",
      '}',
      'const g = (x: number) =>',
      "  x > 0 ? x : (() => { throw new Error('y'); })();",
      'export function over(a: number): void;',
    ].join('\n');
    expect(portBrief(text)).toEqual(['f:throws-error', 'g:throws-error']);
  });

  it('treats a tag separated from the next symbol by other code as module-level', () => {
    const text = "/** @see lib/c.c:hdr */\nimport { a } from './a.js';\nexport function f(): void {}\n";
    expect(portBrief(text)).toEqual(['<module>:see']);
  });

  it('prefers a real symbol over the module when picking a port', () => {
    const text = '/** @see lib/x.c:fn */\nimport a from "a";\n/** @see lib/x.c:fn */\nexport function f(): void {}\n';
    const [r] = join([cSite({ file: 'lib/x.c' })], scanPort('src/m.ts', text));
    expect(r?.port?.symbol).toBe('f');
  });

  it('ignores control-flow blocks at the top level', () => {
    const text = "for (const q of [1]) {\n  throw new Error('x');\n}\nconst z = 1;";
    expect(portBrief(text)).toEqual(['<module>:throws-error']);
  });
});

describe('normalizeCFile', () => {
  it('uses the lib/<dir>/<file> form', () => {
    expect(normalizeCFile('lib/common/emit.c')).toBe('lib/common/emit.c');
    expect(normalizeCFile('common/emit.c')).toBe('lib/common/emit.c');
    expect(normalizeCFile('./common/emit.c')).toBe('lib/common/emit.c');
    expect(normalizeCFile('plugin/core/a.c')).toBe('plugin/core/a.c');
    expect(normalizeCFile('emit.c')).toBe('emit.c');
  });
});

describe('join', () => {
  const portText = (name: string, tag: string, body: string): PortSrc => ({
    file: `src/${name}.ts`,
    text: `/** ${tag} */\nexport function ${name}(): void {\n  ${body}\n}\n`,
  });
  interface PortSrc {
    file: string;
    text: string;
  }
  const ports = (...srcs: PortSrc[]): ReturnType<typeof scanPort> =>
    srcs.flatMap((s) => scanPort(s.file, s.text));

  it('links a C site to the port symbol and takes its behaviour', () => {
    const rows = join(
      [cSite({ file: 'lib/x.c', function: 'fn' })],
      ports(portText('f', '@see lib/x.c:fn', "throw new InternalError('x');")),
    );
    expect(rows).toEqual([
      row({
        id: 'lib/x.c#fn#exit#1',
        c: { file: 'lib/x.c', function: 'fn', kind: 'exit', line: 1, message: null },
        port: { file: 'src/f.ts', symbol: 'f', behaviour: 'throws-internal' },
      }),
    ]);
  });

  it('maps each throw type and agerr to a behaviour, and plain tags to renders', () => {
    const cases: [string, string][] = [
      ["throw new RenderError('x');", 'throws-render'],
      ["throw new Error('x');", 'throws-error'],
      ["agerr(AGERR, 'x');", 'agerr'],
      ['return;', 'renders'],
      ["throw new Error('a'); throw new RenderError('b');", 'throws-render'],
    ];
    for (const [body, behaviour] of cases) {
      const [r] = join([cSite({ file: 'lib/x.c' })], ports(portText('f', '@see lib/x.c:fn', body)));
      expect(r?.port?.behaviour, body).toBe(behaviour);
    }
  });

  it('marks a C site with no @see as not-ported', () => {
    const [r] = join([cSite({ function: 'lonely' })], []);
    expect(r).toMatchObject({ port: null, class: 'not-ported', id: 'lib/x/x.c#lonely#exit#1' });
    expect(r?.c?.function).toBe('lonely');
  });

  it('emits port-only rows for uncovered throws with per-symbol ordinals', () => {
    const rows = join(
      [],
      ports(portText('g', '', "throw new Error('a'); throw new RenderError('b');")),
    );
    expect(rows.map((r) => [r.id, r.class, r.c, r.port?.behaviour])).toEqual([
      ['port#src/g.ts#g#1', 'port-only', null, 'throws-error'],
      ['port#src/g.ts#g#2', 'port-only', null, 'throws-render'],
    ]);
  });

  it('does not emit port-only rows for a symbol that already backs a C row', () => {
    const rows = join(
      [cSite({ file: 'lib/x.c' })],
      ports(portText('f', '@see lib/x.c:fn', "throw new Error('a'); throw new Error('b');")),
    );
    expect(rows.map((r) => r.id)).toEqual(['lib/x.c#fn#exit#1']);
  });

  it('numbers repeated sites per function and kind', () => {
    const rows = join(
      [
        cSite({ kind: 'exit' }),
        cSite({ kind: 'exit' }),
        cSite({ kind: 'abort' }),
        cSite({ function: 'other', kind: 'exit' }),
      ],
      [],
    );
    expect(rows.map((r) => r.id)).toEqual([
      'lib/x/x.c#fn#exit#1',
      'lib/x/x.c#fn#exit#2',
      'lib/x/x.c#fn#abort#1',
      'lib/x/x.c#other#exit#1',
    ]);
  });

  it('normalizes the lib/ prefix and resolves bare file names by basename', () => {
    const c = [cSite({ file: 'lib/dir/x.c', function: 'fn' })];
    for (const tag of ['@see dir/x.c:fn', '@see lib/dir/x.c:fn', '@see x.c:fn']) {
      const [r] = join(c, ports(portText('f', tag, 'return;')));
      expect(r?.port?.symbol, tag).toBe('f');
    }
    const ambiguous = [cSite({ file: 'lib/a/x.c' }), cSite({ file: 'lib/b/x.c' })];
    const rows = join(ambiguous, ports(portText('f', '@see x.c:fn', 'return;')));
    expect(rows.map((r) => r.class)).toEqual(['not-ported', 'not-ported']);
  });

  it('lets class members inherit the class tag and prefers a throwing member', () => {
    const text = [
      '/** @see lib/x.c:fn */',
      'export class K {',
      '  quiet(): void {}',
      "  loud(): void { throw new RenderError('r'); }",
      "  other(): void { throw new Error('o'); }",
      '}',
    ].join('\n');
    const rows = join([cSite({ file: 'lib/x.c' })], scanPort('src/k.ts', text));
    expect(rows.map((r) => [r.id, r.port?.symbol, r.port?.behaviour])).toEqual([
      ['lib/x.c#fn#exit#1', 'K.loud', 'throws-render'],
      ['port#src/k.ts#K.other#1', 'K.other', 'throws-error'],
    ]);
  });

  it('covers every port throw with a row naming its file and symbol', () => {
    const portSites = ports(
      portText('f', '@see lib/x.c:fn', "throw new Error('a');"),
      portText('g', '', "throw new Error('b');"),
    );
    const rows = join([cSite({ file: 'lib/x.c' })], portSites);
    const covered = new Set(rows.map((r) => `${r.port?.file}#${r.port?.symbol}`));
    for (const s of portSites.filter((p) => p.kind !== 'see')) {
      expect(covered.has(`${s.file}#${s.symbol}`)).toBe(true);
    }
  });
});

describe('mergeRows / buildRegistry', () => {
  const scanned = [
    row({ id: 'a', class: 'unclassified' }),
    row({ id: 'b', class: 'not-ported' }),
    row({ id: 'c', class: 'unclassified' }),
  ];

  it('preserves hand-edited class, status, links and note, keeping ids', () => {
    const hand = row({
      id: 'a',
      class: 'mirror',
      status: 'filed',
      links: { forkIssue: 'sseely/graphviz#1', divergence: 'd' },
      note: 'hand',
    });
    const merged = mergeRows([hand], scanned);
    expect(merged.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(merged[0]).toEqual(hand);
  });

  it('lets the scan reclassify rows whose old class was automatic', () => {
    const old = [row({ id: 'a', class: 'not-ported', note: 'n' }), row({ id: 'b', class: 'port-only' })];
    const merged = mergeRows(old, [
      row({ id: 'a', class: 'unclassified' }),
      row({ id: 'b', class: 'not-ported' }),
    ]);
    expect(merged.map((r) => [r.class, r.note])).toEqual([
      ['unclassified', 'n'],
      ['not-ported', ''],
    ]);
  });

  it('keeps hand-seeded rows the scan does not produce and drops stale pristine ones', () => {
    const crash = row({
      id: 'seed#crash',
      c: { file: 'f', function: 'g', kind: 'native-crash', line: 0, message: null },
    });
    const classified = row({ id: 'seed#cls', class: 'graceful' });
    const noted = row({ id: 'seed#note', note: 'x' });
    const linked = row({ id: 'seed#link', links: { upstreamMr: 'u' } });
    const statused = row({ id: 'seed#st', status: 'proposed' });
    const stale = row({ id: 'stale', class: 'not-ported' });
    const merged = mergeRows([crash, classified, noted, linked, statused, stale], scanned);
    expect(merged.map((r) => r.id)).toEqual([
      'a',
      'b',
      'c',
      'seed#cls',
      'seed#crash',
      'seed#link',
      'seed#note',
      'seed#st',
    ]);
  });

  it('wraps rows in a machine-independent registry header', () => {
    const reg = buildRegistry(null, 'graphviz-16.1.1/lib', scanned);
    expect(reg.generatedFrom).toEqual({ cRoot: 'graphviz-16.1.1/lib', oracle: '16.1.1' });
    expect(reg.rows.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    const again = buildRegistry(reg, 'graphviz-16.1.1/lib', scanned);
    expect(again).toEqual(reg);
  });
});

describe('parseRegistry', () => {
  const valid = {
    generatedFrom: { cRoot: 'r', oracle: '16.1.1' },
    rows: [row({ id: 'a' })],
  };

  it('round-trips a valid registry', () => {
    expect(parseRegistry(JSON.parse(JSON.stringify(valid)))).toEqual(valid);
  });

  it('rejects malformed input with a message naming the problem', () => {
    expect(() => parseRegistry(null)).toThrow(/registry/);
    expect(() => parseRegistry({ rows: 1 })).toThrow(/rows/);
    expect(() => parseRegistry({ rows: [{ ...row({}), class: 'nope' }] })).toThrow(/row 0/);
    expect(() => parseRegistry({ rows: [{ ...row({}), links: null }] })).toThrow(/row 0/);
    expect(() => parseRegistry({ rows: [5] })).toThrow(/row 0/);
  });
});
