// SPDX-License-Identifier: EPL-2.0
//
// fdp's cluster-edge proxies in `json` output. Native's json renderer runs
// attach_attrs, which ends with undoClusterEdges, so the proxy node `__0:<cluster>`
// never prints and the edge points at the cluster. Fixtures are native 16.1.0's
// own output (T0 harness, 8 of 8 runs identical).
// @see plugin/core/gvrender_core_json.c:json_begin_graph
// @see lib/common/output.c:403 (if (HAS_CLUST_EDGE(g)) undoClusterEdges(g))
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compareJson } from '../../test/golden/compare-json.js';
import { renderFormat } from '../../test/helpers/render-format.js';
import { parse } from '../parser/index.js';

const HARNESS = new URL('../../plans/post-16-1-followups-11/harness/T0/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, HARNESS), 'utf8');

interface JsonEdge { tail: number; head: number }
interface JsonDoc { objects: Array<{ name: string }>; edges: JsonEdge[] }

describe('fdp json undoes cluster-edge proxies', () => {
  const source = read('cluster-edge.gv');

  it.each(['json', 'json0'])('%s prints no proxy and matches native', (format) => {
    const out = renderFormat(parse(source), format, 'fdp');
    expect(out).not.toContain('__0');
    expect(compareJson(out, read(`cluster-edge.${format}`)).diffs).toEqual([]);
  });

  it.each(['json', 'json0'])('%s edges and objects are native\'s', (format) => {
    const doc = JSON.parse(renderFormat(parse(source), format, 'fdp')) as JsonDoc;
    expect(doc.objects.map((o) => o.name)).toEqual(['clusterA', 'x', 'm', 'z', 'q', 'r']);
    expect(doc.edges.map((e) => [e.tail, e.head])).toEqual([[4, 5], [1, 3], [1, 0]]);
  });

  it('json equals native as data', () => {
    const out = renderFormat(parse(source), 'json', 'fdp');
    expect(JSON.parse(out)).toEqual(JSON.parse(read('cluster-edge.json')));
  });

  it('a second fdp layout and json render still prints no proxy', () => {
    // The first render's attach_attrs left pos on every node, so the second
    // layout starts from those (part-10 AD-11): its coordinates differ, its
    // structure does not.
    const g = parse(source);
    renderFormat(g, 'json', 'fdp');
    const doc = JSON.parse(renderFormat(g, 'json', 'fdp')) as JsonDoc;
    expect(doc.objects.map((o) => o.name)).toEqual(['clusterA', 'x', 'm', 'z', 'q', 'r']);
    expect(doc.edges.map((e) => [e.tail, e.head])).toEqual([[4, 5], [1, 3], [1, 0]]);
  });
});
