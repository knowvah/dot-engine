// SPDX-License-Identifier: EPL-2.0
/**
 * The json root `name` is `agnameof(g)`: C's write_hdr prints it for every
 * graph object, and agnameof returns `%<AGID>` for an anonymous graph, which
 * is `%1` for a root opened with no name (issue #185). A root named `""` is
 * not anonymous and prints `""`.
 *
 * The native column is graphviz 16.1.1's own root name, captured 2026-11-17
 * by `plans/issue-185-json-anon-root-name/harness/root-name-survey.ts`:
 * `~/git/graphviz-16.1.1/build/cmd/dot/dot -K<engine> -T<format>
 * probes/<probe>`, `GVBINDIR=/tmp/ghl1611` for dot and `/tmp/ghl1611-all`
 * for the other engines.
 * @see plugin/core/gvrender_core_json.c:write_hdr
 * @see lib/cgraph/id.c:agnameof
 */
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderFormat } from '../../test/helpers/render-format.js';
import { createGraph } from '../api/builder.js';
import { agseterrf } from '../common/agerr.js';
import type { EngineName } from '../gvc/context.js';
import type { Graph } from '../model/graph.js';
import { parse } from '../parser/index.js';

const HARNESS_185 = new URL('../../plans/issue-185-json-anon-root-name/harness/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, HARNESS_185), 'utf8');

const JSON_FORMATS = ['json', 'json0'] as const;
const COMMENT_PREFIX = '#';
const ANONYMOUS_ROOT_NAME = '%1';

interface Row {
  readonly probe: string;
  readonly engine: EngineName;
  readonly format: string;
  /** Native's root name, JSON-quoted as the TSV holds it. */
  readonly native: string;
}

const ROWS: readonly Row[] = read('native-root-names.tsv')
  .split('\n')
  .filter((line) => line !== '' && !line.startsWith(COMMENT_PREFIX))
  .map((line) => {
    const [probe = '', engine = '', format = '', native = ''] = line.split('\t');
    return { probe, engine: engine as EngineName, format, native };
  });

/** The root `name` of a json output, JSON-quoted. */
const rootName = (g: Graph, format: string, engine: EngineName = 'dot'): string =>
  JSON.stringify((JSON.parse(renderFormat(g, format, engine)) as { name: unknown }).name);

// The empty and single-node probes warn under some engines; the name is the subject.
beforeEach(() => { agseterrf(() => 0); });
afterEach(() => { agseterrf(null); });

describe('the json root name equals native 16.1.1', () => {
  it('reads all 80 native rows (5 probes x 8 engines x 2 formats)', () => {
    expect(ROWS).toHaveLength(80);
  });

  it.each(ROWS)('$probe under $engine as $format', ({ probe, engine, format, native }) => {
    expect(rootName(parse(read(`probes/${probe}`)), format, engine)).toBe(native);
  });
});

describe('the json root name of a built graph', () => {
  it.each(JSON_FORMATS)('createGraph() is anonymous and prints the anonymous root name as %s', (format) => {
    const b = createGraph();
    b.addEdge('a', 'b');
    expect(rootName(b.graph, format)).toBe(JSON.stringify(ANONYMOUS_ROOT_NAME));
  });

  it.each(JSON_FORMATS)('createGraph({ name: "" }) is named and prints "" as %s', (format) => {
    const b = createGraph({ name: '' });
    b.addEdge('a', 'b');
    expect(rootName(b.graph, format)).toBe(JSON.stringify(''));
  });
});

describe('the json names of the issue repro under dot', () => {
  interface Doc { name: string; _subgraph_cnt: number; objects: Array<{ name: string }> }

  it.each(JSON_FORMATS)('the anonymous root and the anonymous subgraph keep their ids as %s', (format) => {
    const doc = JSON.parse(renderFormat(parse(read('probes/repro.gv')), format, 'dot')) as Doc;
    expect(doc.name).toBe(ANONYMOUS_ROOT_NAME);
    expect(doc.objects.slice(0, doc._subgraph_cnt).map((s) => s.name)).toEqual(['%3', 'cluster_x']);
  });
});
