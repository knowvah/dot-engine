// SPDX-License-Identifier: EPL-2.0
// HTML warning dedupe state is per render (AD-7): sizing the same label
// objects in a second render warns again, as a second native `dot` run would.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseHtmlLabel, sizeHtmlLabel } from './htmltable.js';
import type { TextMeasurer } from './textmeasure.js';
import { resetRenderState } from './render-state.js';

const CELL_SMALL = 'Warning: cell size too small for content';
const NO_IMAGE = 'Error: No or improper image file="nope.png"';
const measurer: TextMeasurer = {
  measure: (text, _font, fontSize) => ({ w: text.length * fontSize * 0.6, h: fontSize }),
};
const SRC = '<TABLE><TR><TD FIXEDSIZE="TRUE" WIDTH="5" HEIGHT="5">hello</TD>'
  + '<TD><IMG SRC="nope.png"/></TD></TR></TABLE>';

afterEach(() => { vi.restoreAllMocks(); });

const sizeOnce = (label: ReturnType<typeof parseHtmlLabel>): { msgs: string[]; rv: number } => {
  const msgs: string[] = [];
  const spies = (['warn', 'error'] as const).map(ch =>
    vi.spyOn(console, ch).mockImplementation((m: unknown) => { msgs.push(String(m)); }));
  const rv = sizeHtmlLabel(label, measurer);
  for (const s of spies) s.mockRestore();
  return { msgs, rv };
};

describe('HTML warning dedupe is reset per render', () => {
  it('warns cell-too-small and missing-image once within a render', () => {
    const label = parseHtmlLabel(SRC);
    resetRenderState();
    const first = sizeOnce(label);
    expect(first.msgs).toEqual([CELL_SMALL, NO_IMAGE]);
    expect(sizeOnce(label).msgs).toEqual([]);
  });

  it('warns the cell-too-small again after a render-state reset', () => {
    const label = parseHtmlLabel(SRC);
    resetRenderState();
    sizeOnce(label);
    resetRenderState();
    expect(sizeOnce(label).msgs).toEqual([CELL_SMALL]);
  });
});
