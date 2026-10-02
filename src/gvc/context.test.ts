// SPDX-License-Identifier: EPL-2.0

/**
 * Acceptance tests for GvcContext plugin capability negotiation (T25).
 *
 * AC1: bestRenderer returns highest-quality plugin for a format
 * AC2: equal-quality tie: last-registered wins
 * AC3: unknown format throws with format name in message
 * AC4: alpha ordering — "dot" entries precede "svg" entries in registry
 * AC5: layout() dispatches to the registered engine; throws if absent
 */

import { describe, it, expect } from 'vitest';
import { GvcContext } from './context.js';
import type { RendererPlugin, LayoutEngine } from './context.js';
import type { TextMeasurer } from '../common/textmeasure.js';
import type { Graph } from '../model/graph.js';
import { RenderError } from '../errors.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const stubMeasurer: TextMeasurer = { measure: () => ({ w: 0, h: 0 }) };

// Class-based stub avoids spread/cast patterns that confuse Lizard's TS parser.
class StubPlugin implements RendererPlugin {
  constructor(readonly type: string, readonly quality: number) {}
  beginGraph() {}
  endGraph() {}
  beginNode() {}
  endNode() {}
  beginEdge() {}
  endEdge() {}
  textspan() {}
  ellipse() {}
  polygon() {}
  bezier() {}
  polyline() {}
}

// Inline intersection types in function return annotations confuse Lizard.
type TestEngine = LayoutEngine & { calls: string[] };

function makeEngine(type: string): TestEngine {
  const calls: string[] = [];
  return {
    type,
    layout(_g: Graph) { calls.push('layout'); },
    cleanup(_g: Graph) { calls.push('cleanup'); },
    calls,
  };
}

// ---------------------------------------------------------------------------
// AC1: bestRenderer quality selection
// ---------------------------------------------------------------------------

describe('AC1: bestRenderer — quality wins', () => {
  it('returns higher-quality plugin when two svg plugins registered', () => {
    const ctx = new GvcContext(stubMeasurer);
    const low = new StubPlugin('svg', 5);
    const high = new StubPlugin('svg', 10);
    ctx.register(low);
    ctx.register(high);
    expect(ctx.bestRenderer('svg')).toBe(high);
  });
});

// ---------------------------------------------------------------------------
// AC2: last-registered wins on equal quality
// ---------------------------------------------------------------------------

describe('AC2: bestRenderer — last-registered wins on tie', () => {
  it('returns second plugin when both have equal quality', () => {
    const ctx = new GvcContext(stubMeasurer);
    const first = new StubPlugin('svg', 5);
    const second = new StubPlugin('svg', 5);
    ctx.register(first);
    ctx.register(second);
    expect(ctx.bestRenderer('svg')).toBe(second);
  });
});

// ---------------------------------------------------------------------------
// AC3: unknown format throws
// ---------------------------------------------------------------------------

describe('AC3: bestRenderer — unknown format throws', () => {
  it('throws an error with the format name in the message', () => {
    const ctx = new GvcContext(stubMeasurer);
    expect(() => ctx.bestRenderer('png')).toThrow('png');
  });
});

// ---------------------------------------------------------------------------
// AC4: alpha ordering
// ---------------------------------------------------------------------------

describe('AC4: registry alpha ordering', () => {
  it('finds dot and svg regardless of registration order', () => {
    const ctx = new GvcContext(stubMeasurer);
    const svg = new StubPlugin('svg', 0);
    const dot = new StubPlugin('dot', 0);
    ctx.register(svg);  // register svg first (reverse alpha order)
    ctx.register(dot);
    expect(ctx.bestRenderer('dot')).toBe(dot);
    expect(ctx.bestRenderer('svg')).toBe(svg);
  });
});

// ---------------------------------------------------------------------------
// AC5: layout engine dispatch
// ---------------------------------------------------------------------------

describe('AC5: layout() engine dispatch', () => {
  it('layout() runs layout only; freeLayout() runs cleanup (C: gvLayoutJobs/gvFreeLayout)', () => {
    const ctx = new GvcContext(stubMeasurer);
    const engine = makeEngine('dot');
    ctx.register(engine);
    const g = {} as unknown as Graph;
    ctx.layout(g, 'dot');
    expect(engine.calls).toEqual(['layout']);
    ctx.freeLayout(g, 'dot');
    expect(engine.calls).toEqual(['layout', 'cleanup']);
  });

  it('throws when engine is not registered', () => {
    const ctx = new GvcContext(stubMeasurer);
    const g = {} as unknown as Graph;
    expect(() => ctx.layout(g, 'neato')).toThrow('neato');
  });
});

// ---------------------------------------------------------------------------
// Registry error classification (ADR-3, ADR-4, ADR-5)
// ---------------------------------------------------------------------------

function graphWithLayoutAttr(value: string): Graph {
  return { attrs: new Map([['layout', value]]) } as unknown as Graph;
}

function catchError(fn: () => unknown): unknown {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return undefined;
}

describe('registry errors: unknown engine argument', () => {
  it('layout() throws TypeError ERR_INVALID_ARG_VALUE listing engines', () => {
    const ctx = new GvcContext(stubMeasurer);
    ctx.register(makeEngine('dot'));
    ctx.register(makeEngine('neato'));
    const e = catchError(() => ctx.layout({} as unknown as Graph, 'nope'));
    expect(e).toBeInstanceOf(TypeError);
    expect((e as { code: string }).code).toBe('ERR_INVALID_ARG_VALUE');
    expect((e as Error).message).toContain('"nope"');
    expect((e as Error).message).toContain('dot, neato');
  });

  it('fails even when the layout= attribute names a valid engine', () => {
    const ctx = new GvcContext(stubMeasurer);
    ctx.register(makeEngine('dot'));
    const e = catchError(() => ctx.layout(graphWithLayoutAttr('dot'), 'nope'));
    expect((e as { code: string }).code).toBe('ERR_INVALID_ARG_VALUE');
  });

  it('freeLayout() throws TypeError ERR_INVALID_ARG_VALUE', () => {
    const ctx = new GvcContext(stubMeasurer);
    ctx.register(makeEngine('dot'));
    const e = catchError(() => ctx.freeLayout({} as unknown as Graph, 'nope'));
    expect(e).toBeInstanceOf(TypeError);
    expect((e as { code: string }).code).toBe('ERR_INVALID_ARG_VALUE');
    expect((e as Error).message).toContain('dot');
  });
});

describe('registry errors: layout= attribute', () => {
  it('unknown attribute throws RenderError UNKNOWN_LAYOUT (semantic)', () => {
    const ctx = new GvcContext(stubMeasurer);
    ctx.register(makeEngine('dot'));
    const e = catchError(() => ctx.layout(graphWithLayoutAttr('nope'), 'dot'));
    expect(e).toBeInstanceOf(RenderError);
    expect((e as RenderError).code).toBe('UNKNOWN_LAYOUT');
    expect((e as RenderError).type).toBe('semantic');
    expect((e as RenderError).message).toBe('Layout type: "nope" not recognized');
  });

  it('a valid attribute still overrides the selected engine', () => {
    const ctx = new GvcContext(stubMeasurer);
    const dot = makeEngine('dot');
    const neato = makeEngine('neato');
    ctx.register(dot);
    ctx.register(neato);
    ctx.layout(graphWithLayoutAttr('neato'), 'dot');
    expect(neato.calls).toEqual(['layout']);
    expect(dot.calls).toEqual([]);
  });

  it('an empty attribute is ignored', () => {
    const ctx = new GvcContext(stubMeasurer);
    const dot = makeEngine('dot');
    ctx.register(dot);
    ctx.layout(graphWithLayoutAttr(''), 'dot');
    expect(dot.calls).toEqual(['layout']);
  });
});

describe('registry errors: bestRenderer unknown format', () => {
  it('throws TypeError ERR_INVALID_ARG_VALUE listing format prefixes', () => {
    const ctx = new GvcContext(stubMeasurer);
    ctx.register(new StubPlugin('svg', 1));
    ctx.register(new StubPlugin('dot:core', 1));
    const e = catchError(() => ctx.bestRenderer('pdf'));
    expect(e).toBeInstanceOf(TypeError);
    expect((e as { code: string }).code).toBe('ERR_INVALID_ARG_VALUE');
    expect((e as Error).message).toContain('"pdf"');
    expect((e as Error).message).toContain('dot, svg');
  });
});

describe('registry errors: argument type checks', () => {
  const ctx = new GvcContext(stubMeasurer);
  ctx.register(makeEngine('dot'));
  const bad: [string, () => unknown][] = [
    ['layout g null', () => ctx.layout(null as unknown as Graph, 'dot')],
    ['layout g string', () => ctx.layout('x' as unknown as Graph, 'dot')],
    ['layout name number', () => ctx.layout({} as Graph, 1 as unknown as string)],
    ['freeLayout g null', () => ctx.freeLayout(null as unknown as Graph, 'dot')],
    ['freeLayout name undefined', () =>
      ctx.freeLayout({} as Graph, undefined as unknown as string)],
    ['bestRenderer number', () => ctx.bestRenderer(5 as unknown as string)],
  ];
  it.each(bad)('%s -> TypeError ERR_INVALID_ARG_TYPE', (_label, fn) => {
    const e = catchError(fn);
    expect(e).toBeInstanceOf(TypeError);
    expect((e as { code: string }).code).toBe('ERR_INVALID_ARG_TYPE');
  });
});
