// SPDX-License-Identifier: EPL-2.0
/**
 * json walks a graph's nodes in agfstnode/agnxtnode (AGSEQ) order (issue
 * #199): write_nodes lists a subgraph's `nodes` that way, and write_graph's
 * top pass numbers the nodes (ND_gid) and edges (ED_gid) that way. A
 * subgraph's node map holds its nodes in the order the subgraph first named
 * them, so `subgraph s { b; a }` after `a; b` must still list a before b.
 *
 * Every native ref is the carried oracle's own output (ADR-0003): root renders
 * from the harness's `recapture.sh`, under dot and neato; the render of
 * subgraph `s` alone from `subrender/build.sh` (part 10 T15's program).
 * @see plugin/core/gvrender_core_json.c:write_nodes
 * @see plugin/core/gvrender_core_json.c:write_graph
 */
import { readdirSync, readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { renderFormat } from '../../test/helpers/render-format.js';
import { agseterrf } from '../common/agerr.js';
import type { EngineName } from '../gvc/context.js';
import { createDefaultContext } from '../gvc/default-context.js';
import { render as deviceRender } from '../gvc/device.js';
import { parse } from '../parser/index.js';

const HARNESS_199 = new URL('../../plans/issue-199-json-subgraph-node-order/harness/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, HARNESS_199), 'utf8');
const PROBE_COUNT = 10;
const ENGINES: readonly EngineName[] = ['dot', 'neato'];
const FORMATS = ['json', 'json0'] as const;
const PROBES = readdirSync(new URL('probes/', HARNESS_199))
  .filter((f) => f.endsWith('.gv'))
  .map((f) => f.replace(/\.gv$/, ''))
  .sort();

interface JsonObject { _gvid: number; name: string; subgraphs?: number[]; nodes?: number[]; edges?: number[] }
interface JsonDoc {
  _subgraph_cnt: number;
  objects?: JsonObject[];
  edges?: Array<{ _gvid: number; tail: number; head: number }>;
}

/** Every id json prints, in printed order: the count, each object's gid, name and member lists, each edge's ends. */
function ids(text: string): unknown {
  const doc = JSON.parse(text) as JsonDoc;
  return {
    sgcnt: doc._subgraph_cnt,
    objects: (doc.objects ?? []).map((o) => [o._gvid, o.name, o.subgraphs ?? [], o.nodes ?? [], o.edges ?? []]),
    edges: (doc.edges ?? []).map((e) => [e._gvid, e.tail, e.head]),
  };
}

/** The port's output and everything it reported through agerr. */
function port(probe: string, format: string, engine: EngineName): { out: string; err: string } {
  const errs: string[] = [];
  agseterrf((m) => { errs.push(m); return 0; });
  const out = renderFormat(parse(read(`probes/${probe}.gv`)), format, engine);
  return { out, err: errs.join('') };
}

/** The port's render of `file`'s subgraph `s` alone (the root is never laid out). */
function portSubgraph(file: string, format: string): string {
  const sg = parse(read(file)).subgraphs.get('s')!;
  const ctx = createDefaultContext();
  ctx.layout(sg, 'dot');
  const out = deviceRender(ctx, sg, format);
  ctx.freeLayout(sg, 'dot');
  return out;
}

afterEach(() => { agseterrf(null); });

describe('json lists and numbers nodes in sequence order, as native (#199)', () => {
  it('reads every probe', () => {
    expect(PROBES).toHaveLength(PROBE_COUNT);
  });

  it('the issue repro lists subgraph s as [1, 2]', () => {
    const doc = JSON.parse(port('repro', 'json', 'dot').out) as JsonDoc;
    expect(doc.objects?.[0]).toMatchObject({ name: 's', nodes: [1, 2] });
  });

  for (const probe of PROBES) {
    for (const engine of ENGINES) {
      for (const format of FORMATS) {
        it(`${probe} -K${engine} -T${format}`, () => {
          const got = port(probe, format, engine);
          expect(ids(got.out)).toEqual(ids(read(`native/${probe}.${engine}.${format}`)));
          if (format === 'json') expect(got.err).toBe(read(`native/${probe}.${engine}.err`));
        });
      }
    }
  }

  for (const format of FORMATS) {
    it(`a render of subgraph s alone numbers its nodes and edges in sequence order (-T${format})`, () => {
      const out = portSubgraph('subrender/subrev.gv', format);
      expect(ids(out)).toEqual(ids(read(`subrender/native/subrev.s.${format}`)));
    });
  }
});
