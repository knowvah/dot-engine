// SPDX-License-Identifier: EPL-2.0
//
// agwrite prints attribute values, and the xdot writer stores a draw string only
// when its buffer is non-empty, so an object this render does not draw prints
// what an earlier render, or the input, stored. A subgraph that was a render
// root keeps its own _draw_ and xdotversion. Native refs:
// plans/post-16-1-followups-11/harness/T7b (regen.sh).
// @see plugin/core/gvrender_core_dot.c:237 xdot_end_node, :251 xdot_end_edge
// @see plugin/core/gvrender_core_dot.c:280 xdot_end_cluster, :427 xdot_end_graph
// @see lib/cgraph/write.c:write_dict, write_nondefault_attrs
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../../parser/index.js';
import { render } from '../../index.js';
import type { EngineName } from '../../gvc/context.js';
import { nativeSubgRenders, portSubgRenders } from '../../gvc/__fixtures__/subg-renders/subg-renders.js';

const HARNESS = new URL('../../../plans/post-16-1-followups-11/harness/T7b/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, HARNESS), 'latin1');

describe('first render of input draw attributes', () => {
  // An invisible node and edge keep their input strings; subgraph s keeps its
  // _draw_ and xdotversion; a laid-out cluster's _draw_ is recomputed (dot), a
  // cluster circo does not lay out keeps its input one.
  it.each<[EngineName, 'xdot' | 'dot']>([
    ['dot', 'xdot'], ['dot', 'dot'], ['circo', 'xdot'], ['circo', 'dot'],
  ])('%s -T%s equals native', (engine, fmt) => {
    const out = render(parse(read('stored-draws.gv')), fmt, { engine });
    expect(out).toBe(read(`stored-draws.${engine}.${fmt}`));
  });
});

describe('a root render after a subgraph render', () => {
  // r2 rendered the subgraph as the root; r3 prints what r2 stored on it.
  it.each<[EngineName, string]>([['fdp', 's'], ['osage', 's'], ['osage', 'cluster_k']])(
    '%s %s: render 3 equals native',
    (engine, sub) => {
      const native = nativeSubgRenders(engine, sub, 'root', 'xdot')[2];
      expect(portSubgRenders(engine, sub, 'root', 'xdot')[2]).toBe(native);
    },
  );

  it('fdp cluster_k: render 3 keeps the xdotversion render 2 stored', () => {
    const r3 = portSubgRenders('fdp', 'cluster_k', 'root', 'xdot')[2]!;
    const block = r3.slice(r3.indexOf('subgraph cluster_k'));
    expect(block.slice(0, block.indexOf('];'))).toMatch(/,\n\t+xdotversion=1\.7\n\t+$/);
  });
});
