// SPDX-License-Identifier: EPL-2.0
//
// Issue #191: C's `static int anchorId` is never reset in a process, so every
// render after one layout continues the HTML anchor count, whatever the
// format. The port restarts its twin only through the registered reset: at
// each public entry (one call is one native process) and at each layout.
// Expected ids are the carried oracle's (graphviz 16.1.1 plus
// test/corpus/oracle-patches), captured 2026-11-21 in one process by
// plans/issue-191-anchor-id-renders/harness/twice.c (harness/native/).
// @see lib/common/htmltable.c:initAnchor
import { describe, expect, it } from 'vitest';
import { parse } from '../parser/index.js';
import { render as publicRender } from '../render/public.js';
import { createDefaultContext } from './default-context.js';
import { render as deviceRender } from './device.js';

/** harness/probes/anchor.gv: two TDs with an href and no id on node a. */
const ANCHOR_SRC = 'digraph { a [label=<<table><tr><td href="x">1</td>'
  + '<td href="y">2</td></tr></table>>]; a -> b }';
/** harness/probes/anchor-mixed.gv: a title, an explicit id, and a table href. */
const ANCHOR_MIXED_SRC = 'digraph { a [label=<<table><tr><td title="t">1</td>'
  + '<td href="y" id="mine">2</td></tr></table>>]; b [shape=none label=<<table href="z">'
  + '<tr><td href="w">3</td></tr></table>>]; a -> b }';

const LAYOUT = 'l';
const FIRST_IDS = ['a_node1_0', 'a_node1_1'];
const SECOND_IDS = ['a_node1_2', 'a_node1_3'];

/** The generated anchor ids (`<obj>_<n>`) in one output, in document order. */
function anchorIds(out: string): string[] {
  return Array.from(out.matchAll(/"([a-z]*_?node\d+_\d+)"/g), (m) => m[1]);
}

/**
 * Runs `ops` on one context and one parsed graph: `l` is a layout, anything
 * else a render in that format. Returns the anchor ids of each render.
 */
function run(src: string, ops: string[]): string[][] {
  const ctx = createDefaultContext();
  const g = parse(src);
  const ids: string[][] = [];
  for (const op of ops) {
    if (op === LAYOUT) ctx.layout(g, 'dot');
    else ids.push(anchorIds(deviceRender(ctx, g, op)));
  }
  return ids;
}

describe('renders on one layout continue the anchor count (issue #191)', () => {
  it('counts on from the first svg render to the second', () => {
    expect(run(ANCHOR_SRC, [LAYOUT, 'svg', 'svg'])).toEqual([FIRST_IDS, SECOND_IDS]);
  });

  it('counts on from a cmapx render to an svg render', () => {
    expect(run(ANCHOR_SRC, [LAYOUT, 'cmapx', 'svg'])).toEqual([['node1_0', 'node1_1'], SECOND_IDS]);
  });

  it('counts the ids an xdot render takes without printing them', () => {
    expect(run(ANCHOR_SRC, [LAYOUT, 'xdot', 'svg'])).toEqual([[], SECOND_IDS]);
  });

  it('counts a json render twice: native emits it through xdot too', () => {
    expect(run(ANCHOR_SRC, [LAYOUT, 'json', 'svg'])).toEqual([[], ['a_node1_4', 'a_node1_5']]);
  });

  it('counts on across nodes, past a TD with its own id', () => {
    expect(run(ANCHOR_MIXED_SRC, [LAYOUT, 'svg', 'svg'])).toEqual([
      ['a_node1_0', 'a_node2_1', 'a_node2_2'],
      ['a_node1_3', 'a_node2_4', 'a_node2_5'],
    ]);
  });
});

describe('a layout and a public entry restart the anchor count', () => {
  // Native gives _2 _3 for the second svg: its counter outlives a layout too.
  // The port restarts here on purpose (part 4 AD-8, docs/process-statics.md
  // verdict N): the counter is registered render state, so that no public
  // render depends on the renders before it.
  it('restarts at every layout on one context', () => {
    expect(run(ANCHOR_SRC, [LAYOUT, 'svg', LAYOUT, 'svg'])).toEqual([FIRST_IDS, FIRST_IDS]);
  });

  it('restarts at every public render call', () => {
    const first = anchorIds(publicRender(parse(ANCHOR_SRC), 'svg'));
    const second = anchorIds(publicRender(parse(ANCHOR_SRC), 'svg'));
    expect([first, second]).toEqual([FIRST_IDS, FIRST_IDS]);
  });
});
