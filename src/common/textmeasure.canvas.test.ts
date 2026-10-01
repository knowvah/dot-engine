// SPDX-License-Identifier: EPL-2.0
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as cssFont from './css-font.js';
import { CanvasTextMeasurer } from './textmeasure.js';

vi.mock('./css-font.js', async (importOriginal) => {
  const orig = await importOriginal<typeof import('./css-font.js')>();
  return { canvasFont: vi.fn(orig.canvasFont) };
});

const { canvasFont } = await vi.importActual<typeof import('./css-font.js')>('./css-font.js');

/** Minimal CanvasRenderingContext2D stand-in: a font accessor + measureText. */
class FakeContext {
  readonly assigned: string[] = [];
  private current = '10px sans-serif';
  constructor(private readonly rejects: ReadonlySet<string> = new Set()) {}
  get font(): string { return this.current; }
  set font(f: string) {
    this.assigned.push(f);
    if (!this.rejects.has(f)) this.current = f; // browsers ignore unparseable fonts
  }
  measureText(text: string): { width: number } {
    return { width: text.length * 7 };
  }
}

function measurer(ctx: FakeContext): CanvasTextMeasurer {
  return new CanvasTextMeasurer(ctx as unknown as CanvasRenderingContext2D);
}

describe('CanvasTextMeasurer', () => {
  beforeEach(() => {
    vi.mocked(cssFont.canvasFont).mockClear();
  });

  it('measures with the svg-emitted font for Times-Roman', () => {
    const ctx = new FakeContext();
    const size = measurer(ctx).measure('Hello', 'Times-Roman', 14);
    expect(ctx.font).toBe(canvasFont('Times-Roman', 14));
    expect(size).toEqual({ w: 35, h: 14 });
  });

  it('falls back to the default family at the requested size on rejection', () => {
    const bad = canvasFont('Helvetica-Narrow', 20);
    const ctx = new FakeContext(new Set([bad]));
    const m = measurer(ctx);
    m.measure('x', 'Arial', 9);
    m.measure('x', 'Helvetica-Narrow', 20);
    expect(ctx.font).toBe(canvasFont(null, 20));
  });

  it('builds the font string once per distinct font', () => {
    const ctx = new FakeContext();
    const m = measurer(ctx);
    m.measure('a', 'Courier', 12, { bold: true });
    m.measure('b', 'Courier', 12, { bold: true });
    expect(vi.mocked(cssFont.canvasFont)).toHaveBeenCalledTimes(1);
    expect(ctx.font).toBe(canvasFont('Courier', 12, { bold: true }));
    m.measure('c', 'Courier', 12, { italic: true });
    expect(vi.mocked(cssFont.canvasFont)).toHaveBeenCalledTimes(2);
  });

  it('passes the bold flag through for a non-alias name', () => {
    const ctx = new FakeContext();
    measurer(ctx).measure('a', 'Arial', 11, { bold: true });
    expect(ctx.font).toBe('bold 11px "Arial"');
  });

  it('accepts a font that serializes like the first probe', () => {
    const ctx = new FakeContext();
    const m = measurer(ctx);
    m.measure('a', 'Arial', 11);
    const probeLike = ctx.assigned[0];
    vi.mocked(cssFont.canvasFont).mockReturnValueOnce(probeLike);
    m.measure('a', 'Other', 3);
    expect(ctx.font).toBe(probeLike);
  });
});
