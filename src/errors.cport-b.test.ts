// SPDX-License-Identifier: EPL-2.0
import { describe, it, expect } from 'vitest';
import { renderSvg } from './index.js';
import { InternalError, RenderError } from './errors.js';
import { rectArea } from './label/rectangle.js';
import { rTreeInsert, rTreeOpen } from './label/index.js';
import { drawSpecialShape, type ShapeCtx } from './common/poly-shapes.js';
import { gvXmlEscape } from './util/xml.js';
import { RenderJob } from './gvc/job.js';
import { EstimateTextMeasurer } from './common/textmeasure.js';

const NO_FLAGS = { raw: false, dash: false, nbsp: false, utf8: true };
const UNPORTED_SHAPE = 999_999;

function caught(fn: () => unknown): unknown {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return undefined;
}

describe('C-port throw sites (group B): end to end via renderSvg', () => {
  it('sfdp rotation=45 -> UNSUPPORTED_FEATURE', () => {
    const e = caught(() =>
      renderSvg('graph G { rotation=45; a -- b; b -- c; c -- a }', 'sfdp'),
    );
    expect(e).toBeInstanceOf(RenderError);
    expect((e as RenderError).code).toBe('UNSUPPORTED_FEATURE');
    expect((e as RenderError).type).toBe('semantic');
    expect((e as RenderError).message).toContain('sfdp rotation="45"');
  });

  it('sfdp smoothing=spring -> UNSUPPORTED_FEATURE', () => {
    const e = caught(() =>
      renderSvg('graph G { smoothing=spring; a -- b; b -- c }', 'sfdp'),
    );
    expect(e).toBeInstanceOf(RenderError);
    expect((e as RenderError).code).toBe('UNSUPPORTED_FEATURE');
    expect((e as RenderError).message).toContain('sfdp smoothing="spring"');
  });

  it('fdp overlap=voronoi -> UNSUPPORTED_FEATURE', () => {
    const e = caught(() =>
      renderSvg('graph G { overlap=voronoi; a -- b; b -- c }', 'fdp'),
    );
    expect(e).toBeInstanceOf(RenderError);
    expect((e as RenderError).code).toBe('UNSUPPORTED_FEATURE');
    expect((e as RenderError).message).toContain(
      'removeOverlapAs mode "voronoi"',
    );
  });
});

describe('C-port throw sites (group B): direct calls', () => {
  it('drawSpecialShape with an unported shape -> UNSUPPORTED_FEATURE', () => {
    // The throw happens before ctx is read; a placeholder ctx is enough.
    const ctx = {} as unknown as ShapeCtx;
    const e = caught(() =>
      drawSpecialShape(UNPORTED_SHAPE, [], { x: 0, y: 0 }, false, ctx),
    );
    expect(e).toBeInstanceOf(RenderError);
    expect((e as RenderError).code).toBe('UNSUPPORTED_FEATURE');
    expect((e as RenderError).message).toBe(
      `special shape ${UNPORTED_SHAPE} not yet ported`,
    );
  });

  it('rectArea overflow -> RENDER_ERROR (C agerrorf + graphviz_exit)', () => {
    const e = caught(() => rectArea({ boundary: [0, 0, 1e10, 1e10] }));
    expect(e).toBeInstanceOf(RenderError);
    expect((e as RenderError).code).toBe('RENDER_ERROR');
    expect((e as RenderError).message).toBe('label: area too large for rtree');
  });

  it('rTreeInsert with low > high -> INTERNAL_ERROR (C assert)', () => {
    const e = caught(() =>
      rTreeInsert(rTreeOpen(), { boundary: [5, 0, 1, 1] }, null),
    );
    expect(e).toBeInstanceOf(InternalError);
    expect((e as InternalError).code).toBe('INTERNAL_ERROR');
    expect((e as InternalError).message).toBe('rTreeInsert: rect low > high');
  });

  it('gvXmlEscape malformed UTF-8 -> RENDER_ERROR (C exit)', () => {
    const e = caught(() => gvXmlEscape('\ud800', NO_FLAGS)); // lone surrogate
    expect(e).toBeInstanceOf(RenderError);
    expect((e as RenderError).code).toBe('RENDER_ERROR');
    expect((e as RenderError).message).toBe(
      'gvXmlEscape: malformed UTF-8 at position 0',
    );
  });

  it('RenderJob.popObj on an empty stack -> INTERNAL_ERROR (C assert)', () => {
    const job = new RenderJob('svg', new EstimateTextMeasurer());
    const e = caught(() => job.popObj());
    expect(e).toBeInstanceOf(InternalError);
    expect((e as InternalError).message).toBe(
      'RenderJob.popObj: stack is empty',
    );
  });
});
