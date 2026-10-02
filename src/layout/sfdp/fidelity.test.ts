// SPDX-License-Identifier: EPL-2.0

/**
 * Loud failure for sfdp control surfaces the port does not implement
 * (v2-fidelity T5, ADR-1/3/4). The conditions mirror C exactly: an edge-label
 * scheme only reaches unported code when sfdp removes overlap itself
 * (ctrl.overlap >= 0) AND the graph holds a "|edgelabel|" node.
 *
 * @see lib/sfdpgen/sfdpinit.c:sfdpLayout (getSizes with elabels)
 * @see lib/sfdpgen/spring_electrical.c:multilevel_spring_electrical_embedding
 * @see lib/neatogen/overlap.c:remove_overlap (`if (!ntry) return`)
 */

import { describe, it, expect } from 'vitest';
import { parse, render } from '../../index.js';
import { RenderError } from '../../errors.js';

const ELABEL_NODES =
  '"|edgelabel|1"--a; "|edgelabel|1"--b; "|edgelabel|2"--b; "|edgelabel|2"--c;';

/** Triangle plus edge-label nodes, with the given graph attributes. */
function elabelGraph(attrs: string): string {
  return `graph{${attrs}; a--b; a--c; b--c; ${ELABEL_NODES}}`;
}

function layout(src: string): string {
  return render(parse(src), 'plain', { engine: 'sfdp' });
}

function expectUnsupported(src: string, attrValue: string): void {
  let err: unknown;
  try { layout(src); } catch (e) { err = e; }
  expect(err).toBeInstanceOf(RenderError);
  expect((err as RenderError).code).toBe('UNSUPPORTED_FEATURE');
  expect((err as RenderError).message).toContain(attrValue);
  expect((err as RenderError).message).toContain('is not supported yet');
}

describe('sfdp label_scheme loud check', () => {
  it.each([3, 4])('label_scheme=%i with edge-label nodes is loud (default prism0)', (s) => {
    expectUnsupported(elabelGraph(`label_scheme=${s}`), `label_scheme=${s}`);
  });

  it.each([1, 2])('label_scheme=%i is loud when overlap=prism (ntry > 0)', (s) => {
    expectUnsupported(elabelGraph(`label_scheme=${s};overlap=prism`), `label_scheme=${s}`);
  });

  it.each([1, 2])('label_scheme=%i is ignored at prism0 (C returns on ntry == 0)', (s) => {
    expect(layout(elabelGraph(`label_scheme=${s}`))).toBe(layout(elabelGraph('label_scheme=0')));
  });

  it('is ignored when sfdp does not remove overlap itself (overlap=true)', () => {
    const src = elabelGraph('label_scheme=3;overlap=true');
    expect(layout(src)).toBe(layout(elabelGraph('label_scheme=0;overlap=true')));
  });

  it('is ignored without edge-label nodes, even with real edge labels', () => {
    const plain = 'graph{label_scheme=3; a--b[label=x]; b--c[label=y]; c--a}';
    expect(layout(plain)).toBe(layout(plain.replace('label_scheme=3;', '')));
  });

  it('label_scheme above 4 is clamped to 0 and never loud', () => {
    expect(layout(elabelGraph('label_scheme=7'))).toBe(layout(elabelGraph('label_scheme=0')));
  });
});

/** 60-node graph: native none/fast differ from normal by 2.8/4.5 here. */
function bigGraph(attrs: string): string {
  const edges: string[] = [];
  for (let i = 0; i < 60; i++) edges.push(`n${i}--n${(i * 7 + 3) % 60}`);
  for (let i = 0; i < 59; i++) edges.push(`n${i}--n${i + 1}`);
  return `graph{${attrs}${edges.join(';')}}`;
}

describe('sfdp quadtree loud check', () => {
  it.each([
    ['none', 'none', 'slow'], ['0', 'none', 'slow'], ['false', 'none', 'slow'],
    ['fast', 'fast', 'fast'], ['2', 'fast', 'fast'], ['FAST', 'fast', 'fast'],
  ])('quadtree=%s is loud as quadtree=%s (%s)', (value, scheme, kind) => {
    let err: unknown;
    try { layout(bigGraph(`quadtree=${value};`)); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(RenderError);
    expect((err as RenderError).code).toBe('UNSUPPORTED_FEATURE');
    expect((err as RenderError).message).toBe(
      `quadtree=${scheme}: spring_electrical_embedding_${kind} is not supported yet`);
  });

  it('is loud on the issue example and on a single node', () => {
    expectUnsupported('graph{quadtree=none; a--b--c}', 'quadtree=none');
    expectUnsupported('graph{quadtree=fast; a--b--c}', 'quadtree=fast');
    expectUnsupported('graph{quadtree=none; a}', 'quadtree=none');
  });

  it.each(['normal', 'true', 'yes', '1', 'bogus', '3', '99'])(
    'quadtree=%s is unchanged from the default', (value) => {
      expect(layout(bigGraph(`quadtree=${value};`))).toBe(layout(bigGraph('')));
    });

  it('an empty graph never reaches the dispatch', () => {
    expect(() => layout('graph{quadtree=none}')).not.toThrow();
  });
});
