// SPDX-License-Identifier: EPL-2.0
/**
 * `Duplicate cluster name "<name>"`: the json writer's label_subgs maps each
 * cluster's name to its gid, and insert warns when a later cluster reuses a
 * name. Every stderr expectation is native dot 16.1.0's own stderr
 * (`plans/issue-135-json-dup-cluster-warn/harness/regen.sh`).
 * @see plugin/core/gvrender_core_json.c:insert
 * @see plugin/core/gvrender_core_json.c:label_subgs
 * @see plugin/core/gvrender_core_json.c:lookup
 */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { compareJson } from '../../test/golden/compare-json.js';
import { renderFormat } from '../../test/helpers/render-format.js';
import type { EngineName } from '../gvc/context.js';
import { createDefaultContext } from '../gvc/default-context.js';
import { render as deviceRender } from '../gvc/device.js';
import { parse } from '../parser/index.js';
import { insertCluster, lookupCluster } from './json-cluster-edge.js';

const HARNESS_135 = new URL('../../plans/issue-135-json-dup-cluster-warn/harness/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, HARNESS_135), 'utf8');

const JSON_FORMATS = ['json', 'json0'] as const;
const DOT_FIXTURES = ['dup', 'dup3', 'attr', 'lay'] as const;
/** The neato plugin's engines whose stderr is the json writer's alone. */
const OTHER_ENGINES: readonly EngineName[] = ['neato', 'circo', 'twopi', 'osage', 'patchwork', 'sfdp'];
const DUPLICATE = (name: string): string => `Warning: Duplicate cluster name "${name}"`;
/** fillMap's warning, which the port does not print yet (issue #182). */
const FILLMAP_PREFIX = 'Warning: Two clusters named ';

/** Native's stderr lines for one harness case (trailing empty line dropped). */
function nativeLines(fixture: string, engine: string, format: string): string[] {
  const lines = read(`out/${fixture}.${engine}.${format}.stderr`).split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/** Lines the port prints on console.warn/error while rendering `fixture`. */
function stderrOf(fixture: string, format: string, engine: EngineName): { lines: string[]; out: string } {
  const lines: string[] = [];
  const sink = (...a: unknown[]): void => { lines.push(a.map(String).join(' ')); };
  vi.spyOn(console, 'error').mockImplementation(sink);
  vi.spyOn(console, 'warn').mockImplementation(sink);
  const out = renderFormat(parse(read(`${fixture}.gv`)), format, engine);
  return { lines, out };
}

/** As `stderrOf`, for a render of `fixture`'s subgraph `sub` alone (the root is never laid out). */
function subgraphStderrOf(fixture: string, sub: string, format: string): { lines: string[]; out: string } {
  const lines: string[] = [];
  const sink = (...a: unknown[]): void => { lines.push(a.map(String).join(' ')); };
  vi.spyOn(console, 'error').mockImplementation(sink);
  vi.spyOn(console, 'warn').mockImplementation(sink);
  const sg = parse(read(`${fixture}.gv`)).subgraphs.get(sub)!;
  const ctx = createDefaultContext();
  ctx.layout(sg, 'dot');
  const out = deviceRender(ctx, sg, format);
  ctx.freeLayout(sg, 'dot');
  return { lines, out };
}

afterEach(() => { vi.restoreAllMocks(); });

describe('json duplicate cluster name warning (dot)', () => {
  const cases = DOT_FIXTURES.flatMap((f) => JSON_FORMATS.map((fmt) => [f, fmt] as const));

  it.each(cases)('%s -T%s prints native\'s stderr', (fixture, format) => {
    const native = nativeLines(fixture, 'dot', format);
    expect(native.length).toBeGreaterThan(0);
    expect(stderrOf(fixture, format, 'dot').lines).toEqual(native);
  });

  it.each(DOT_FIXTURES.filter((f) => f !== 'lay'))('%s -Tsvg prints nothing, as native', (fixture) => {
    expect(nativeLines(fixture, 'dot', 'svg')).toEqual([]);
    expect(stderrOf(fixture, 'svg', 'dot').lines).toEqual([]);
  });

  it('lay -Tsvg prints native\'s stderr (svg does layers and has no cluster map)', () => {
    expect(stderrOf('lay', 'svg', 'dot').lines).toEqual(nativeLines('lay', 'dot', 'svg'));
  });

  it.each(JSON_FORMATS)('dup3 -T%s: one warning per repeat, in DFS order', (format) => {
    expect(stderrOf('dup3', format, 'dot').lines).toEqual([
      DUPLICATE('cluster_x'), DUPLICATE('cluster_x'), DUPLICATE('cluster_x2'), DUPLICATE('cluster_a'),
    ]);
  });

  it.each(JSON_FORMATS)('lay -T%s: the duplicate warning follows the layers warnings', (format) => {
    const { lines } = stderrOf('lay', format, 'dot');
    expect(lines[lines.length - 1]).toBe(DUPLICATE('cluster_x'));
    expect(lines.slice(0, -1).every((l) => l.includes('layers not supported'))).toBe(true);
    expect(lines.length).toBeGreaterThan(1);
  });
});

describe('json duplicate cluster name warning (other engines)', () => {
  const cases = OTHER_ENGINES.flatMap((e) => JSON_FORMATS.map((fmt) => [e, fmt] as const));

  it.each(cases)('dup -K%s -T%s prints native\'s stderr', (engine, format) => {
    const native = nativeLines('dup', engine, format);
    expect(native).toEqual([DUPLICATE('cluster_x')]);
    expect(stderrOf('dup', format, engine).lines).toEqual(native);
  });

  it.each(JSON_FORMATS)('dup -Kfdp -T%s prints native\'s stderr minus the fillMap line', (format) => {
    // Native's fdp layout first prints fillMap's `Two clusters named cluster_x -
    // the second will be ignored`; the port lacks that warning (issue #182).
    const native = nativeLines('dup', 'fdp', format);
    expect(native[0]!.startsWith(FILLMAP_PREFIX)).toBe(true);
    expect(stderrOf('dup', format, 'fdp').lines).toEqual(native.slice(1));
  });
});

describe('insertCluster / lookupCluster', () => {
  const warnings = (): string[] => {
    const lines: string[] = [];
    vi.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => { lines.push(a.map(String).join(' ')); });
    return lines;
  };

  it('the same name with the same value warns nothing', () => {
    const lines = warnings();
    const map = new Map<string, number>();
    insertCluster(map, 'cluster_x', 3);
    insertCluster(map, 'cluster_x', 3);
    expect(lines).toEqual([]);
    expect(lookupCluster(map, 'cluster_x')).toBe(3);
  });

  it('a second value warns once and keeps the first', () => {
    const lines = warnings();
    const map = new Map<string, number>();
    insertCluster(map, 'cluster_x', 1);
    insertCluster(map, 'cluster_x', 5);
    expect(lines).toEqual([DUPLICATE('cluster_x')]);
    expect(lookupCluster(map, 'cluster_x')).toBe(1);
  });

  it('an unmapped name looks up as -1', () => {
    expect(lookupCluster(new Map<string, number>(), 'cluster_y')).toBe(-1);
  });
});

describe('subgraph gids with repeated cluster names', () => {
  interface JsonDoc { _subgraph_cnt: number; objects: Array<{ _gvid: number; name: string }> }
  /** Native 16.1.0 `-Kdot -Tjson dup3.gv`: `_subgraph_cnt` and the subgraph objects' names. */
  const NATIVE_SGCNT = 11;
  const NATIVE_SUBGRAPH_NAMES = [
    'cluster_a', 'cluster_x', 's', 'cluster_x2', 'cluster_b', 'cluster_x',
    'cluster_c', 'cluster_x', 'cluster_x2', 'x', 'cluster_a',
  ];

  it.each(JSON_FORMATS)('dup3 -T%s numbers subgraphs 0..sgcnt-1 in DFS order, as native', (format) => {
    const doc = JSON.parse(stderrOf('dup3', format, 'dot').out) as JsonDoc;
    expect(doc._subgraph_cnt).toBe(NATIVE_SGCNT);
    const subs = doc.objects.slice(0, NATIVE_SGCNT);
    expect(subs.map((o) => o._gvid)).toEqual(NATIVE_SUBGRAPH_NAMES.map((_, i) => i));
    expect(subs.map((o) => o.name)).toEqual(NATIVE_SUBGRAPH_NAMES);
  });
});

describe('a subgraph render numbers the rendered subgraph too', () => {
  // label_subgs tests `g != agroot(g)`, not "g is the graph being written": a
  // render of subgraph s gives s gid 0, so `_subgraph_cnt` counts it and the
  // subgraphs below it start at 1, though s itself is not among the objects.
  // Native refs: harness/out/sub.s.<fmt> (regen.sh, part 10 T15's program).
  interface JsonObject { _gvid: number; name: string; subgraphs?: number[]; nodes?: number[]; edges?: number[] }
  interface JsonDoc {
    _subgraph_cnt: number;
    objects: JsonObject[];
    edges: Array<{ _gvid: number; tail: number; head: number }>;
  }
  /** Every id json prints: the count, each object's gid and member lists, each edge's ends. */
  const ids = (text: string): unknown => {
    const doc = JSON.parse(text) as JsonDoc;
    return {
      sgcnt: doc._subgraph_cnt,
      objects: doc.objects.map((o) => [o._gvid, o.name, o.subgraphs ?? [], o.nodes ?? [], o.edges ?? []]),
      edges: doc.edges.map((e) => [e._gvid, e.tail, e.head]),
    };
  };
  const NATIVE_SUB_OBJECTS = [[1, 'cluster_x'], [2, 't'], [3, 'cluster_x'], [4, 'c'], [5, 'd']];

  it.each(JSON_FORMATS)('sub -T%s of subgraph s: ids and stderr are native\'s', (format) => {
    const { lines, out } = subgraphStderrOf('sub', 's', format);
    const native = read(`out/sub.s.${format}`);
    expect(ids(out)).toEqual(ids(native));
    const doc = JSON.parse(out) as JsonDoc;
    expect(doc._subgraph_cnt).toBe(4);
    expect(doc.objects.map((o) => [o._gvid, o.name])).toEqual(NATIVE_SUB_OBJECTS);
    expect(lines).toEqual(nativeLines('sub', 's', format));
    expect(lines).toEqual([DUPLICATE('cluster_x')]);
  });

  it('sub -Tjson of subgraph s equals native (json0 lacks bb and pos there: issue #184)', () => {
    const { out } = subgraphStderrOf('sub', 's', 'json');
    expect(compareJson(out, read('out/sub.s.json')).diffs).toEqual([]);
  });
});
