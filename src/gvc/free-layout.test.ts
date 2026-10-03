// SPDX-License-Identifier: EPL-2.0
//
// freeLayout cleans up with the engine that actually ran layout, as recorded
// on the graph (plans/v2-fidelity ADR-5).
// @see lib/gvc/gvlayout.c:gvLayoutJobs (GD_cleanup(g) = gvle->cleanup)
// @see lib/gvc/gvlayout.c:gvFreeLayout
import { describe, expect, it } from 'vitest';
import { GvcContext } from './context.js';
import type { LayoutEngine } from './context.js';
import type { TextMeasurer } from '../common/textmeasure.js';
import type { Graph } from '../model/graph.js';

const measurer: TextMeasurer = { measure: () => ({ w: 0, h: 0 }) };

function makeEngine(type: string, calls: string[]): LayoutEngine {
  return {
    type,
    layout: () => { calls.push(`${type}:layout`); },
    cleanup: () => { calls.push(`${type}:cleanup`); },
  };
}

function makeGraph(layoutAttr?: string): Graph {
  const attrs = new Map<string, string>();
  if (layoutAttr !== undefined) attrs.set('layout', layoutAttr);
  return { attrs, info: {} } as unknown as Graph;
}

function setup(): { ctx: GvcContext; calls: string[] } {
  const calls: string[] = [];
  const ctx = new GvcContext(measurer);
  ctx.register(makeEngine('a', calls));
  ctx.register(makeEngine('b', calls));
  return { ctx, calls };
}

describe('freeLayout uses the cleanup recorded at layout time', () => {
  it('calls the layout= attribute engine cleanup, never the argument engine', () => {
    const { ctx, calls } = setup();
    const g = makeGraph('b');
    ctx.layout(g, 'a');
    ctx.freeLayout(g, 'a');
    expect(calls).toEqual(['b:layout', 'b:cleanup']);
  });

  it('clears g.info.cleanup and a second freeLayout calls nothing', () => {
    const { ctx, calls } = setup();
    const g = makeGraph();
    ctx.layout(g, 'a');
    expect(typeof g.info.cleanup).toBe('function');
    ctx.freeLayout(g, 'a');
    expect(g.info.cleanup).toBeUndefined();
    ctx.freeLayout(g, 'a');
    expect(calls).toEqual(['a:layout', 'a:cleanup']);
  });

  it('does nothing for a graph that was never laid out', () => {
    const { ctx, calls } = setup();
    const g = makeGraph();
    ctx.freeLayout(g, 'a');
    expect(calls).toEqual([]);
  });

  it('still validates arguments on a never-laid-out graph', () => {
    const { ctx } = setup();
    expect(() => ctx.freeLayout(makeGraph(), 'nope')).toThrow('nope');
    expect(() => ctx.freeLayout(null as never, 'a')).toThrow(TypeError);
  });

  it('does not record cleanup when the engine layout throws', () => {
    const calls: string[] = [];
    const ctx = new GvcContext(measurer);
    ctx.register({
      type: 'bad',
      layout: () => { throw new Error('boom'); },
      cleanup: () => { calls.push('cleanup'); },
    });
    const g = makeGraph();
    expect(() => ctx.layout(g, 'bad')).toThrow('boom');
    expect(g.info.cleanup).toBeUndefined();
    ctx.freeLayout(g, 'bad');
    expect(calls).toEqual([]);
  });
});
