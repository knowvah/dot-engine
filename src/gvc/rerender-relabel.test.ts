// SPDX-License-Identifier: EPL-2.0
//
// Issue #190: a layout with no gvFreeLayout before it makes every node's label
// again, as common_init_node does, so it follows an attribute set between the
// layouts and repeats the label's sizing warnings. A render does not: C has no
// render-time make_label. Fixtures and expected lines are the carried oracle's
// (graphviz 16.1.1 plus test/corpus/oracle-patches), captured 2026-11-21 in one
// process by plans/issue-190-node-relabel/harness/relabel.c
// (harness/recapture.sh writes the relabel.* fixtures).
// @see lib/common/utils.c:common_init_node
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse } from '../parser/index.js';
import { createDefaultContext } from './default-context.js';
import { render as deviceRender } from './device.js';
import type { EngineName } from './context.js';

const FIXTURES = new URL('./__fixtures__/rerender/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, FIXTURES), 'utf8');

const LONGER_LABEL = 'a much longer label than before';
const CELL_SMALL_SRC = 'digraph { a [shape=plaintext label=<<TABLE><TR>'
  + '<TD FIXEDSIZE="TRUE" WIDTH="10" HEIGHT="10">much too long</TD></TR></TABLE>>]; a -> b }';
/** What native prints for one make_label of CELL_SMALL_SRC's node a. */
const CELL_SMALL_LINES = ['Warning: cell size too small for content', 'in label of node a'];
const LAYOUTS = 3;
const RENDERS = 3;

afterEach(() => { vi.restoreAllMocks(); });

/** Runs `body`, returning what it printed on console.warn and console.error. */
function captureMessages(body: () => void): string[] {
  const msgs: string[] = [];
  for (const ch of ['warn', 'error'] as const) {
    vi.spyOn(console, ch).mockImplementation((m: unknown) => { msgs.push(String(m)); });
  }
  body();
  vi.restoreAllMocks();
  return msgs;
}

describe('a no-free relayout makes the node label again (issue #190)', () => {
  it.each<EngineName>(['dot', 'neato'])('%s follows a label set between two layouts', (engine) => {
    const ctx = createDefaultContext();
    const g = parse(read('relabel.gv'));
    ctx.layout(g, engine);
    expect(deviceRender(ctx, g, 'plain')).toBe(read(`relabel.${engine}.plain.relabel.1`));
    const a = g.nodes.get('a');
    if (a === undefined) throw new Error('relabel.gv has no node a');
    a.attrs.set('label', LONGER_LABEL);
    ctx.layout(g, engine);
    expect(deviceRender(ctx, g, 'plain')).toBe(read(`relabel.${engine}.plain.relabel.2`));
  });

  it('repeats an HTML label sizing warning on every layout', () => {
    const ctx = createDefaultContext();
    const g = parse(CELL_SMALL_SRC);
    const msgs = captureMessages(() => {
      for (let i = 0; i < LAYOUTS; i++) {
        ctx.layout(g, 'dot');
        deviceRender(ctx, g, 'plain');
      }
    });
    expect(msgs).toEqual(Array.from({ length: LAYOUTS }, () => CELL_SMALL_LINES).flat());
  });

  it('warns once for one layout rendered three times', () => {
    const ctx = createDefaultContext();
    const g = parse(CELL_SMALL_SRC);
    const msgs = captureMessages(() => {
      ctx.layout(g, 'dot');
      for (let i = 0; i < RENDERS; i++) deviceRender(ctx, g, 'plain');
    });
    expect(msgs).toEqual(CELL_SMALL_LINES);
  });
});
