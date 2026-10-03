// SPDX-License-Identifier: EPL-2.0

import { describe, it, expect } from 'vitest';
import { DotEngineError } from '../errors.js';
import { createGraph } from './builder.js';
import { getLayout } from './geometry.js';
import { addEdge } from './edge-ops.js';
import { parse } from '../parser/index.js';

const INVALID_TYPE = 'ERR_INVALID_ARG_TYPE';
const INVALID_VALUE = 'ERR_INVALID_ARG_VALUE';
const INVALID_STATE = 'ERR_INVALID_STATE';

function catchErr(fn: () => unknown): unknown {
  try {
    fn();
  } catch (e) {
    return e;
  }
  throw new Error('expected function to throw');
}

function expectTypeErr(fn: () => unknown, code: string, msg?: RegExp): void {
  const e = catchErr(fn);
  expect(e).toBeInstanceOf(TypeError);
  expect((e as { code?: string }).code).toBe(code);
  if (msg !== undefined) expect((e as Error).message).toMatch(msg);
}

const bad = (v: unknown): never => v as never;

describe('getLayout argument checks', () => {
  it('rejects null graph', () => {
    expectTypeErr(() => getLayout(bad(null)), INVALID_TYPE, /"g"/);
  });
  it('rejects non-object graph', () => {
    expectTypeErr(() => getLayout(bad('x')), INVALID_TYPE);
  });
  it('rejects bad opts type', () => {
    const g = parse('digraph { a }');
    expectTypeErr(() => getLayout(g, bad(5)), INVALID_TYPE, /"opts"/);
  });
  it('rejects unknown yAxis', () => {
    const g = parse('digraph { a }');
    expectTypeErr(
      () => getLayout(g, { yAxis: bad('sideways') }),
      INVALID_VALUE,
      /yAxis/,
    );
  });
  it('rejects not-laid-out graph with ERR_INVALID_STATE', () => {
    const e = catchErr(() => getLayout(parse('digraph { a }')));
    expect(e).toBeInstanceOf(Error);
    expect(e).not.toBeInstanceOf(DotEngineError);
    expect((e as { code?: string }).code).toBe(INVALID_STATE);
    expect((e as Error).message).toContain('getLayout requires a laid-out graph');
  });
});

describe('addEdge argument checks', () => {
  const g = parse('digraph { a; b }');
  const a = g.nodes.get('a')!;
  const b = g.nodes.get('b')!;
  it('rejects null graph', () => {
    expectTypeErr(() => addEdge(bad(null), a, b), INVALID_TYPE, /"g"/);
  });
  it('rejects null tail', () => {
    expectTypeErr(() => addEdge(g, bad(null), b), INVALID_TYPE, /"tail"/);
  });
  it('rejects non-object head', () => {
    expectTypeErr(() => addEdge(g, a, bad('b')), INVALID_TYPE, /"head"/);
  });
  it('rejects non-string name', () => {
    expectTypeErr(() => addEdge(g, a, b, bad(3)), INVALID_TYPE, /"name"/);
  });
  it('accepts undefined and string names', () => {
    expect(addEdge(g, a, b).name).toBe('');
    expect(addEdge(g, a, b, 'k').name).toBe('k');
  });
});

describe('createGraph argument checks', () => {
  it('accepts undefined and valid options', () => {
    expect(createGraph().graph.kind).toBe('directed');
    const b = createGraph({ directed: false, strict: true, name: 'G' });
    expect(b.graph.kind).toBe('strict-undirected');
  });
  it('rejects non-object opts', () => {
    expectTypeErr(() => createGraph(bad(null)), INVALID_TYPE, /"opts"/);
    expectTypeErr(() => createGraph(bad('x')), INVALID_TYPE, /"opts"/);
  });
  it('rejects mistyped fields', () => {
    expectTypeErr(() => createGraph(bad({ directed: 'yes' })), INVALID_TYPE, /directed/);
    expectTypeErr(() => createGraph(bad({ strict: 1 })), INVALID_TYPE, /strict/);
    expectTypeErr(() => createGraph(bad({ name: 1 })), INVALID_TYPE, /name/);
  });
});

describe('builder argument checks', () => {
  it('addNode rejects bad name and attrs', () => {
    const b = createGraph();
    expectTypeErr(() => b.addNode(bad(42)), INVALID_TYPE, /"name"/);
    expectTypeErr(() => b.addNode('a', bad(null)), INVALID_TYPE, /"attrs"/);
    expectTypeErr(() => b.addNode('a', bad([])), INVALID_TYPE, /"attrs"/);
    expectTypeErr(() => b.addNode('a', bad({ k: 1 })), INVALID_TYPE, /attrs/);
  });
  it('addNode accepts plain attrs', () => {
    const n = createGraph().addNode('a', { color: 'red' });
    expect(n.getAttr('color')).toBe('red');
  });
  it('addEdge rejects bad refs and attrs', () => {
    const b = createGraph();
    const a = b.addNode('a');
    expectTypeErr(() => b.addEdge(bad(1), 'b'), INVALID_TYPE, /"tail"/);
    expectTypeErr(() => b.addEdge('a', bad(null)), INVALID_TYPE, /"head"/);
    expectTypeErr(() => b.addEdge(bad({}), 'b'), INVALID_TYPE, /"tail"/);
    expectTypeErr(() => b.addEdge(a, 'b', bad('x')), INVALID_TYPE, /"attrs"/);
  });
  it('addEdge accepts handles and names', () => {
    const b = createGraph();
    const a = b.addNode('a');
    const e = b.addEdge(a, 'b');
    expect([e.tail, e.head]).toEqual(['a', 'b']);
  });
  it('addSubgraph rejects bad name and attrs', () => {
    const b = createGraph();
    expectTypeErr(() => b.addSubgraph(bad(1)), INVALID_TYPE, /"name"/);
    expectTypeErr(() => b.addSubgraph('s', bad(1)), INVALID_TYPE, /"attrs"/);
  });
  it('graph-level setAttr/setHtmlAttr/getAttr reject bad args', () => {
    const b = createGraph();
    expectTypeErr(() => b.setAttr(bad(1), 'v'), INVALID_TYPE, /"k"/);
    expectTypeErr(() => b.setAttr('k', bad(1)), INVALID_TYPE, /"v"/);
    expectTypeErr(() => b.setHtmlAttr(bad(1), 'v'), INVALID_TYPE, /"k"/);
    expectTypeErr(() => b.setHtmlAttr('k', bad(null)), INVALID_TYPE, /"v"/);
    expectTypeErr(() => b.getAttr(bad(1)), INVALID_TYPE, /"k"/);
  });
  it('node handle methods reject bad args', () => {
    const n = createGraph().addNode('a');
    expectTypeErr(() => n.setAttr(bad(1), 'v'), INVALID_TYPE, /"k"/);
    expectTypeErr(() => n.setAttr('k', bad(1)), INVALID_TYPE, /"v"/);
    expectTypeErr(() => n.setHtmlAttr(bad(1), 'v'), INVALID_TYPE, /"k"/);
    expectTypeErr(() => n.setHtmlAttr('k', bad(1)), INVALID_TYPE, /"v"/);
    expectTypeErr(() => n.getAttr(bad(1)), INVALID_TYPE, /"k"/);
  });
  it('edge handle methods reject bad args', () => {
    const e = createGraph().addEdge('a', 'b');
    expectTypeErr(() => e.setAttr(bad(1), 'v'), INVALID_TYPE, /"k"/);
    expectTypeErr(() => e.setAttr('k', bad(1)), INVALID_TYPE, /"v"/);
    expectTypeErr(() => e.setHtmlAttr(bad(1), 'v'), INVALID_TYPE, /"k"/);
    expectTypeErr(() => e.setHtmlAttr('k', bad(1)), INVALID_TYPE, /"v"/);
    expectTypeErr(() => e.getAttr(bad(1)), INVALID_TYPE, /"k"/);
  });
  it('valid attribute round-trips are unchanged', () => {
    const b = createGraph();
    b.setAttr('rankdir', 'LR');
    expect(b.getAttr('rankdir')).toBe('LR');
    const n = b.addNode('a');
    n.setHtmlAttr('label', '<b>x</b>');
    expect(n.getAttr('label')).toBe('\u0001<b>x</b>');
  });
});
