// SPDX-License-Identifier: EPL-2.0
import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseHtmlLabel, sizeHtmlLabel } from './htmltable.js';
import type { TextMeasurer } from './htmltable.js';
import type { HtmlLabel, HtmlTable } from './htmltable-types.js';

const measurer: TextMeasurer = {
  measure: (text, _font, fontSize) => ({ w: text.length * fontSize * 0.6, h: fontSize }),
};

const CELL_SMALL = 'Warning: cell size too small for content';
const CELL_UNSPEC = 'Warning: fixed cell size with unspecified width or height';
const TBL_SMALL = 'Warning: table size too small for content';
const TBL_UNSPEC = 'Warning: fixed table size with unspecified width or height';

const sizeAndCollect = (label: HtmlLabel): string[] => {
  const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  sizeHtmlLabel(label, measurer);
  return spy.mock.calls.map(c => String(c[0]));
};

const fromSource = (src: string): string[] => sizeAndCollect(parseHtmlLabel(src));

afterEach(() => { vi.restoreAllMocks(); });

describe('HTML size warnings (htmltable.c size_html_cell / size_html_tbl)', () => {
  it('warns once per FIXEDSIZE cell smaller than its content', () => {
    expect(fromSource(
      '<TABLE><TR><TD FIXEDSIZE="TRUE" WIDTH="5" HEIGHT="5">hello</TD></TR></TABLE>',
    )).toEqual([CELL_SMALL]);
  });

  it('does not warn for a FIXEDSIZE cell large enough', () => {
    expect(fromSource(
      '<TABLE><TR><TD FIXEDSIZE="TRUE" WIDTH="200" HEIGHT="100">a</TD></TR></TABLE>',
    )).toEqual([]);
  });

  it('does not warn "too small" for a FIXEDSIZE cell holding only an image', () => {
    const msgs = fromSource(
      '<TABLE><TR><TD FIXEDSIZE="TRUE" WIDTH="1" HEIGHT="1"><IMG SRC="none.png"/></TD></TR></TABLE>',
    );
    expect(msgs.filter(m => m === CELL_SMALL)).toEqual([]);
  });

  it('warns about a FIXEDSIZE cell with unspecified height', () => {
    expect(fromSource(
      '<TABLE><TR><TD FIXEDSIZE="TRUE" WIDTH="50">a</TD></TR></TABLE>',
    )).toEqual([CELL_UNSPEC]);
  });

  it('warns for a FIXEDSIZE table smaller than its content', () => {
    expect(fromSource(
      '<TABLE FIXEDSIZE="TRUE" WIDTH="5" HEIGHT="5"><TR><TD>hello</TD></TR></TABLE>',
    )).toEqual([TBL_SMALL]);
  });

  it('warns cell first, then table, in C order', () => {
    expect(fromSource(
      '<TABLE FIXEDSIZE="TRUE" WIDTH="5" HEIGHT="5"><TR><TD FIXEDSIZE="TRUE" WIDTH="5" HEIGHT="5">hello</TD></TR></TABLE>',
    )).toEqual([CELL_SMALL, TBL_SMALL]);
  });

  it('warns for an empty FIXEDSIZE table whose spacing/border exceed its size', () => {
    const table = {
      kind: 'table', rows: [], fixedsize: true, width: 1, height: 1,
    } as unknown as HtmlTable;
    expect(sizeAndCollect({ kind: 'table', table } as unknown as HtmlLabel)).toEqual([TBL_SMALL]);
  });

  it('warns about a FIXEDSIZE table with unspecified width', () => {
    expect(fromSource(
      '<TABLE FIXEDSIZE="TRUE" HEIGHT="50"><TR><TD>a</TD></TR></TABLE>',
    )).toEqual([TBL_UNSPEC]);
  });

  it('warns once per object even when a nested table is sized again', () => {
    const lbl = parseHtmlLabel(
      '<TABLE><TR><TD><TABLE FIXEDSIZE="TRUE" WIDTH="5" HEIGHT="5"><TR><TD>hello</TD></TR></TABLE></TD></TR></TABLE>',
    );
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    sizeHtmlLabel(lbl, measurer);
    sizeHtmlLabel(lbl, measurer);
    expect(spy.mock.calls.map(c => String(c[0]))).toEqual([TBL_SMALL]);
  });
});
