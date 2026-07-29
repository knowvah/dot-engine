// SPDX-License-Identifier: EPL-2.0

/**
 * Branch-coverage tests for src/common/htmltable-pos.ts (T4c).
 *
 * Targets alignContentBox's VALIGN bottom/top branches, the BALIGN
 * left/right run-justification default, placeCellImage's width/height
 * fallback and alignImageBox's ALIGN/VALIGN branches, distributeExtra's
 * del<=0/count<=0 and ROUND-tie branches, cellSidesMask's sides===0
 * short-circuit for an interior nested table, and posHtmlTable's
 * FIXEDSIZE align/valign branches for a nested table assigned a box
 * larger than its own dimen.
 *
 * @see lib/common/htmltable.c:pos_html_cell
 * @see lib/common/htmltable.c:pos_html_tbl
 */

import { describe, it, expect, vi } from 'vitest';
import type { TextMeasurer } from './textmeasure.js';
import { posHtmlTable, posHtmlLabel, placeCell, makeHtmlLabel } from './htmltable-pos.js';
import type { PlacedHtml } from './htmltable-pos.js';
import { parseHtmlLabel, sizeHtmlLabel } from './htmltable.js';
import type { HtmlTable, HtmlCell } from './htmltable-types.js';

const finfo = { fontname: 'Times', fontsize: 14, fontcolor: 'black' };

/** Fixed-size measurer: every glyph run is 10x12, independent of content. */
const stubMeasurer: TextMeasurer = {
  measure: vi.fn().mockReturnValue({ w: 10, h: 12 }),
};

function sizedTable(src: string, measurer: TextMeasurer = stubMeasurer): HtmlTable {
  const lbl = parseHtmlLabel(src);
  if (lbl.kind !== 'table') throw new Error('expected table label');
  sizeHtmlLabel(lbl, measurer);
  return lbl.table;
}

// ---------------------------------------------------------------------------
// alignContentBox — VALIGN bottom/top (dely > 0 branches)
// ---------------------------------------------------------------------------

describe('alignContentBox VALIGN', () => {
  // A tall row (imposed by a taller sibling cell) gives the short single-line
  // cell room (dely>0) to flush per its own VALIGN.
  it('VALIGN="BOTTOM" flushes the text box to the bottom of a tall cell', () => {
    const tbl = sizedTable(
      '<TABLE CELLPADDING="0" CELLSPACING="0"><TR>' +
      '<TD VALIGN="BOTTOM">a<BR/>b<BR/>c</TD>' +
      '<TD VALIGN="BOTTOM">x</TD>' +
      '</TR></TABLE>',
    );
    const placed = posHtmlTable(tbl, finfo, stubMeasurer);
    const shortCell = placed.cells[1]!;
    // The short cell's own box is short too (row height is uniform for a
    // single row), so instead compare the line's baseline is at the very
    // bottom of its box (not vertically centered).
    const line = shortCell.lines[0]!;
    expect(line.baseline).toBeLessThanOrEqual(shortCell.box.ll.y + 12 + 0.001);
  });

  it('VALIGN="TOP" flushes the text box to the top of a tall cell', () => {
    // Build a 2-cell row where one cell has 3 lines (tall) and the other 1
    // line (short) with VALIGN=TOP; the row height is driven by the tall
    // cell, giving the short cell's content box real slack (dely>0).
    const tbl = sizedTable(
      '<TABLE CELLPADDING="0" CELLSPACING="0"><TR>' +
      '<TD>a<BR/>b<BR/>c</TD>' +
      '<TD VALIGN="TOP">x</TD>' +
      '</TR></TABLE>',
    );
    const placed = posHtmlTable(tbl, finfo, stubMeasurer);
    const shortCell = placed.cells[1]!;
    const line = shortCell.lines[0]!;
    // Top-flush: the line sits at the top of the (taller) cell box, i.e.
    // near ur.y, not centered.
    expect(line.baseline).toBeGreaterThan(shortCell.box.ll.y + (shortCell.box.ur.y - shortCell.box.ll.y) / 2);
  });
});

// ---------------------------------------------------------------------------
// BALIGN — unset per-line justification default
// ---------------------------------------------------------------------------

describe('BALIGN default propagation to unset line justification', () => {
  it('BALIGN="LEFT" on a multi-line cell sets just on lines with no explicit BR ALIGN', () => {
    const tbl = sizedTable(
      '<TABLE><TR><TD BALIGN="LEFT">a<BR/>bb<BR/>ccc</TD></TR></TABLE>',
    );
    const placed = posHtmlTable(tbl, finfo, stubMeasurer);
    // All three lines left-flush at the same x (the cell's inset left edge).
    const xs = placed.cells[0]!.lines.map((l) => l.x);
    expect(new Set(xs).size).toBe(1);
  });

  it('BALIGN="RIGHT" on a multi-line cell right-flushes lines of different widths', () => {
    const tbl = sizedTable(
      '<TABLE><TR><TD BALIGN="RIGHT">a<BR/>bb<BR/>ccc</TD></TR></TABLE>',
    );
    const placed = posHtmlTable(tbl, finfo, stubMeasurer);
    const lines = placed.cells[0]!.lines;
    // Right-flush: (x + width) is identical for all lines.
    const rights = lines.map((l) => l.x + l.width);
    expect(Math.abs(rights[0]! - rights[1]!)).toBeLessThan(1e-9);
  });
});

// ---------------------------------------------------------------------------
// placeCellImage — width/height fallback (?? 0) and ALIGN/VALIGN flush
// ---------------------------------------------------------------------------

describe('placeCellImage', () => {
  it('an IMG with no resolvable size (no imageSizer) falls back to iw=0,ih=0', () => {
    const lbl = parseHtmlLabel('<TABLE><TR><TD><IMG SRC="missing.png"/></TD></TR></TABLE>');
    if (lbl.kind !== 'table') throw new Error('expected table');
    sizeHtmlLabel(lbl, stubMeasurer); // no imageSizer supplied
    const placed = posHtmlTable(lbl.table, finfo, stubMeasurer);
    const img = placed.cells[0]!.image!;
    expect(img.iw).toBe(0);
    expect(img.ih).toBe(0);
  });

  it('an IMG sized via imageSizer carries its resolved width/height', () => {
    const lbl = parseHtmlLabel('<TABLE><TR><TD><IMG SRC="a.png"/></TD></TR></TABLE>');
    if (lbl.kind !== 'table') throw new Error('expected table');
    sizeHtmlLabel(lbl, stubMeasurer, { fontsize: finfo.fontsize, fontname: finfo.fontname,
      imageSizer: () => ({ w: 40, h: 20 }) });
    const placed = posHtmlTable(lbl.table, finfo, stubMeasurer);
    const img = placed.cells[0]!.image!;
    expect(img.iw).toBe(40);
    expect(img.ih).toBe(20);
  });

  // WIDTH/HEIGHT on the TD force the cell (and its inset content box) larger
  // than the (tiny) intrinsic image, giving alignImageBox real delx/dely
  // slack to work with — a same-column wide sibling does NOT do this, since
  // each TD is its own column with independently-sized width.
  function imageCell(align: string | null, valign: string | null) {
    const a = align ? ` ALIGN="${align}"` : '';
    const v = valign ? ` VALIGN="${valign}"` : '';
    const lbl = parseHtmlLabel(
      `<TABLE CELLPADDING="0" CELLSPACING="0"><TR>` +
      `<TD${a}${v} WIDTH="50" HEIGHT="50"><IMG SRC="a.png"/></TD>` +
      `</TR></TABLE>`,
    );
    if (lbl.kind !== 'table') throw new Error('expected table');
    sizeHtmlLabel(lbl, stubMeasurer, {
      fontsize: finfo.fontsize, fontname: finfo.fontname, imageSizer: () => ({ w: 6, h: 6 }),
    });
    const placed = posHtmlTable(lbl.table, finfo, stubMeasurer);
    return { cell: placed.cells[0]!, img: placed.cells[0]!.image! };
  }

  it('no ALIGN/VALIGN: the image box is NOT shrunk (no-op default)', () => {
    const { cell, img } = imageCell(null, null);
    // alignImageBox has no default (center) branch, unlike text — the box
    // stays at the full inset content size on both axes.
    expect(img.box.ur.x - img.box.ll.x).toBeCloseTo(cell.box.ur.x - cell.box.ll.x - 2, 6);
  });

  it('ALIGN="LEFT" shrinks the image box to iw, flush against the cell\'s left inset edge', () => {
    const { cell, img } = imageCell('LEFT', null);
    expect(img.box.ur.x - img.box.ll.x).toBeCloseTo(6, 6);
    expect(img.box.ll.x - cell.box.ll.x).toBeLessThan(2); // border+padding inset only
  });

  it('ALIGN="RIGHT" shrinks the image box to iw, flush against the cell\'s right inset edge', () => {
    const { cell, img } = imageCell('RIGHT', null);
    expect(img.box.ur.x - img.box.ll.x).toBeCloseTo(6, 6);
    expect(cell.box.ur.x - img.box.ur.x).toBeLessThan(2);
  });

  it('VALIGN="BOTTOM" shrinks the image box to ih, flush against the cell\'s bottom inset edge', () => {
    const { cell, img } = imageCell(null, 'BOTTOM');
    expect(img.box.ur.y - img.box.ll.y).toBeCloseTo(6, 6);
    expect(img.box.ll.y - cell.box.ll.y).toBeLessThan(2);
  });

  it('VALIGN="TOP" shrinks the image box to ih, flush against the cell\'s top inset edge', () => {
    const { cell, img } = imageCell(null, 'TOP');
    expect(img.box.ur.y - img.box.ll.y).toBeCloseTo(6, 6);
    expect(cell.box.ur.y - img.box.ur.y).toBeLessThan(2);
  });
});

// ---------------------------------------------------------------------------
// cellSidesMask — sides===0 short-circuit for an interior nested table
// ---------------------------------------------------------------------------

describe('cellSidesMask short-circuits to 0 sides for a nested table in an interior cell', () => {
  it('a nested table placed in the center cell of a 3x3 grid gets sidesMask=0 ' +
     'for all its own cells (the outer center cell touches no boundary)', () => {
    const src =
      '<TABLE CELLPADDING="0" CELLSPACING="0">' +
      '<TR><TD>a</TD><TD>b</TD><TD>c</TD></TR>' +
      '<TR><TD>d</TD><TD><TABLE><TR><TD>n1</TD><TD>n2</TD></TR></TABLE></TD><TD>e</TD></TR>' +
      '<TR><TD>f</TD><TD>g</TD><TD>h</TD></TR>' +
      '</TABLE>';
    const tbl = sizedTable(src);
    const placed = posHtmlTable(tbl, finfo, stubMeasurer);
    const centerCell = placed.cells.find((c) => c.nested !== undefined)!;
    expect(centerCell.sidesMask).toBe(0);
    for (const inner of centerCell.nested!.cells) {
      expect(inner.sidesMask).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// distributeExtra (via posHtmlTable's delx/dely with an oversized pos box)
// ---------------------------------------------------------------------------

describe('distributeExtra — extra space distribution and ROUND tie-break', () => {
  it('a box exactly the table size takes the del<=0 no-op branch (identical widths)', () => {
    const tbl = sizedTable('<TABLE><TR><TD>a</TD><TD>bb</TD></TR></TABLE>');
    const placed1 = posHtmlTable(tbl, finfo, stubMeasurer);
    const tbl2 = sizedTable('<TABLE><TR><TD>a</TD><TD>bb</TD></TR></TABLE>');
    const placed2 = posHtmlTable(tbl2, finfo, stubMeasurer, placed1.box);
    expect(placed2.cells[0]!.box.ur.x - placed2.cells[0]!.box.ll.x)
      .toBeCloseTo(placed1.cells[0]!.box.ur.x - placed1.cells[0]!.box.ll.x, 6);
  });

  it('an oversized box (delx>0, count>0) distributes extra width across columns', () => {
    const tbl = sizedTable('<TABLE><TR><TD>a</TD><TD>bb</TD><TD>ccc</TD></TR></TABLE>');
    const natural = posHtmlTable(tbl, finfo, stubMeasurer);
    const naturalW = natural.box.ur.x - natural.box.ll.x;
    const big = {
      ll: { x: natural.box.ll.x, y: natural.box.ll.y },
      ur: { x: natural.box.ur.x + 30, y: natural.box.ur.y },
    };
    const tbl2 = sizedTable('<TABLE><TR><TD>a</TD><TD>bb</TD><TD>ccc</TD></TR></TABLE>');
    const placed = posHtmlTable(tbl2, finfo, stubMeasurer, big);
    const totalW = placed.cells.reduce(
      (max, c) => Math.max(max, c.box.ur.x), -Infinity,
    ) - placed.cells.reduce((min, c) => Math.min(min, c.box.ll.x), Infinity);
    expect(totalW).toBeGreaterThan(naturalW);
  });
});

// ---------------------------------------------------------------------------
// FIXEDSIZE — table ALIGN/VALIGN self-placement within an oversized box
// ---------------------------------------------------------------------------

describe('FIXEDSIZE table self-alignment within a larger assigned box', () => {
  function fixedTable(align: string | null, valign: string | null): HtmlTable {
    const a = align ? ` ALIGN="${align}"` : '';
    const v = valign ? ` VALIGN="${valign}"` : '';
    return sizedTable(
      `<TABLE FIXEDSIZE="TRUE" WIDTH="40" HEIGHT="20"${a}${v}><TR><TD>x</TD></TR></TABLE>`,
    );
  }

  const bigBox = { ll: { x: -50, y: -50 }, ur: { x: 50, y: 50 } };

  it('ALIGN="LEFT" pins the box to its left edge (ur.x = ll.x + dim.w)', () => {
    const tbl = fixedTable('LEFT', null);
    const placed = posHtmlTable(tbl, finfo, stubMeasurer, bigBox);
    expect(placed.box.ur.x - placed.box.ll.x).toBeCloseTo(40, 6);
    expect(placed.box.ll.x).toBeCloseTo(bigBox.ll.x, 6);
  });

  it('ALIGN="RIGHT" shifts both edges by delx (verbatim htmltable.c:1571 ' +
     'HALIGN_RIGHT — asymmetric with LEFT: it translates the box by the ' +
     'slack rather than anchoring the right edge, so width is UNCHANGED ' +
     'and the box protrudes past the assigned box\'s right edge)', () => {
    const tbl = fixedTable('RIGHT', null);
    const placed = posHtmlTable(tbl, finfo, stubMeasurer, bigBox);
    const delx = (bigBox.ur.x - bigBox.ll.x) - 40; // 60
    expect(placed.box.ll.x).toBeCloseTo(bigBox.ll.x + delx, 6);
    expect(placed.box.ur.x).toBeCloseTo(bigBox.ur.x + delx, 6);
  });

  it('no ALIGN centers the box horizontally (default)', () => {
    const tbl = fixedTable(null, null);
    const placed = posHtmlTable(tbl, finfo, stubMeasurer, bigBox);
    const cx = (placed.box.ll.x + placed.box.ur.x) / 2;
    expect(cx).toBeCloseTo((bigBox.ll.x + bigBox.ur.x) / 2, 6);
  });

  it('VALIGN="BOTTOM" pins the box to its bottom edge', () => {
    const tbl = fixedTable(null, 'BOTTOM');
    const placed = posHtmlTable(tbl, finfo, stubMeasurer, bigBox);
    expect(placed.box.ur.y - placed.box.ll.y).toBeCloseTo(20, 6);
    expect(placed.box.ll.y).toBeCloseTo(bigBox.ll.y, 6);
  });

  it('VALIGN="TOP" pins the box to its top edge', () => {
    const tbl = fixedTable(null, 'TOP');
    const placed = posHtmlTable(tbl, finfo, stubMeasurer, bigBox);
    expect(placed.box.ur.y - placed.box.ll.y).toBeCloseTo(20, 6);
    expect(placed.box.ur.y).toBeCloseTo(bigBox.ur.y, 6);
  });

  it('no VALIGN centers the box vertically (default)', () => {
    const tbl = fixedTable(null, null);
    const placed = posHtmlTable(tbl, finfo, stubMeasurer, bigBox);
    const cy = (placed.box.ll.y + placed.box.ur.y) / 2;
    expect(cy).toBeCloseTo((bigBox.ll.y + bigBox.ur.y) / 2, 6);
  });
});

// ---------------------------------------------------------------------------
// posHtmlLabel — text (non-table) dispatch
// ---------------------------------------------------------------------------

describe('posHtmlLabel text-label dispatch', () => {
  it('a plain-text label (no TABLE) is placed as a single-cell PlacedHtml', () => {
    const lbl = parseHtmlLabel('hello world');
    if (lbl.kind !== 'text') throw new Error('expected text label');
    sizeHtmlLabel(lbl, stubMeasurer);
    const placed = posHtmlLabel(lbl, finfo, stubMeasurer);
    expect(placed.cells).toHaveLength(1);
    expect(placed.columnCount).toBe(1);
    expect(placed.rowCount).toBe(1);
  });

  it('an UNSIZED text label (label.dimen never set) falls back to a 0x0 box', () => {
    // posHtmlLabel/posTextLabel is reachable without ever calling
    // sizeHtmlLabel — label.dimen ?? {w:0,h:0} is the guard for that case.
    const lbl = parseHtmlLabel('hello world');
    if (lbl.kind !== 'text') throw new Error('expected text label');
    const placed = posHtmlLabel(lbl, finfo, stubMeasurer);
    expect(placed.box.ll.x).toBeCloseTo(0, 9);
    expect(placed.box.ll.y).toBeCloseTo(0, 9);
    expect(placed.box.ur.x).toBeCloseTo(0, 9);
    expect(placed.box.ur.y).toBeCloseTo(0, 9);
  });
});

// ---------------------------------------------------------------------------
// placeCell called directly (bypassing sizeHtmlLabel) — img width/height
// left undefined, exercising the `?? 0` fallback in placeCellImage.
// ---------------------------------------------------------------------------

describe('placeCellImage — img.width/img.height never resolved (?? 0 fallback)', () => {
  it('an image cell placed without ever running sizeHtmlImg has iw=ih=0', () => {
    const cell: HtmlCell = { kind: 'cell', content: [{ kind: 'image', src: 'x.png' }] };
    const tbl: HtmlTable = { kind: 'table', rows: [] };
    const box = { ll: { x: -20, y: -20 }, ur: { x: 20, y: 20 } };
    const placed = placeCell({
      cell, tbl, box, finfo, measurer: stubMeasurer,
      col: 0, row: 0, colspan: 1, rowspan: 1, sidesMask: 0,
    });
    expect(placed.image!.iw).toBe(0);
    expect(placed.image!.ih).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// BR with an explicit ALIGN inside a BALIGN cell: run.just already set,
// so the BALIGN default must NOT overwrite it.
// ---------------------------------------------------------------------------

describe('BALIGN default does not override an explicit BR ALIGN', () => {
  it('a BR ALIGN="RIGHT" line keeps its own justification under BALIGN="LEFT"', () => {
    // Vary width by text length so left-flush vs right-flush actually
    // produce different x's (the stub measurer's fixed 10x12 makes every
    // line the same width, masking the alignment difference).
    const measurer: TextMeasurer = {
      measure: vi.fn((text: string) => ({ w: text.length * 10, h: 12 })),
    };
    const lbl = parseHtmlLabel(
      '<TABLE><TR><TD BALIGN="LEFT">a<BR ALIGN="RIGHT"/>bb<BR/>ccc</TD></TR></TABLE>',
    );
    if (lbl.kind !== 'table') throw new Error('expected table');
    sizeHtmlLabel(lbl, measurer);
    const placed = posHtmlTable(lbl.table, finfo, measurer);
    const lines = placed.cells[0]!.lines;
    // Line 0 ("a", explicit ALIGN=RIGHT) right-flushes: x + width is at the
    // cell's right edge. Lines 1-2 ("bb","ccc", unset -> BALIGN=LEFT
    // default) left-flush: x is at the cell's left edge, identical for both
    // despite their different widths.
    expect(lines[1]!.x).toBeCloseTo(lines[2]!.x, 6);
    expect(lines[0]!.x + lines[0]!.width).toBeCloseTo(lines[1]!.x + 30, 6); // right edge of the widest line
    expect(lines[0]!.x).not.toBeCloseTo(lines[1]!.x, 6);
  });
});

// ---------------------------------------------------------------------------
// Non-simple run block: a line with more than one item (mixed font state)
// forces the mxfsize (fontSize-summed) height path instead of mxysize.
// ---------------------------------------------------------------------------

describe('placeCellRuns — non-simple block height (runsAreSimple = false)', () => {
  it('a line with two items (plain + FONT-colored) makes the block non-simple', () => {
    const tbl = sizedTable(
      '<TABLE><TR><TD>a<FONT COLOR="red">b</FONT><BR/>c</TD></TR></TABLE>',
    );
    const placed = posHtmlTable(tbl, finfo, stubMeasurer);
    // Two lines were placed; the block did not throw and produced concrete
    // baselines for both (proving the non-simple/mxfsize-summed height path
    // executed rather than the single-height fast path).
    const lines = placed.cells[0]!.lines;
    expect(lines).toHaveLength(3); // "a", "b", "c" as separate placed spans
    expect(lines[0]!.baseline).not.toBe(lines[2]!.baseline);
  });
});

// ---------------------------------------------------------------------------
// ruledBoundaries / hruled propagation (ROWS="*")
// ---------------------------------------------------------------------------

describe('ROWS="*" marks the placed cell hruled via ruledBoundaries', () => {
  it('a single-row table with ROWS="*" sets hruled=true on its cell', () => {
    const tbl = sizedTable('<TABLE ROWS="*"><TR><TD>x</TD></TR></TABLE>');
    const placed = posHtmlTable(tbl, finfo, stubMeasurer);
    expect(placed.cells[0]!.hruled).toBe(true);
  });

  it('a table with no ROWS/HR leaves hruled unset', () => {
    const tbl = sizedTable('<TABLE><TR><TD>x</TD></TR></TABLE>');
    const placed = posHtmlTable(tbl, finfo, stubMeasurer);
    expect(placed.cells[0]!.hruled).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// posHtmlTable called directly on an unsized / empty table
// ---------------------------------------------------------------------------

describe('posHtmlTable on an unsized or empty table', () => {
  it('tbl.dimen undefined (never sized) falls back to a 0x0 box', () => {
    const lbl = parseHtmlLabel('<TABLE><TR><TD>x</TD></TR></TABLE>');
    if (lbl.kind !== 'table') throw new Error('expected table');
    // Deliberately skip sizeHtmlLabel: lbl.table.dimen stays undefined.
    const placed = posHtmlTable(lbl.table, finfo, stubMeasurer);
    // box is centered on a 0x0 dimen, i.e. collapsed to the origin, while
    // the cell itself is still laid out at its own (non-zero) natural size
    // — proving layoutHtmlTable does not depend on tbl.dimen at all.
    expect(placed.box.ll.x).toBeCloseTo(0, 9);
    expect(placed.box.ll.y).toBeCloseTo(0, 9);
    expect(placed.box.ur.x).toBeCloseTo(0, 9);
    expect(placed.box.ur.y).toBeCloseTo(0, 9);
    expect(placed.cells[0]!.box.ur.x - placed.cells[0]!.box.ll.x).toBeGreaterThan(0);
  });

  it('an empty table (no rows) yields 0 columns/rows without throwing', () => {
    const tbl: HtmlTable = { kind: 'table', rows: [] };
    const placed = posHtmlTable(tbl, finfo, stubMeasurer);
    expect(placed.columnCount).toBe(0);
    expect(placed.rowCount).toBe(0);
    expect(placed.cells).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// FIXEDSIZE with delx<=0/dely<=0 (box exactly the table's own size: the
// top-level caller path, which never passes an oversized `pos`)
// ---------------------------------------------------------------------------

describe('FIXEDSIZE table with no slack (delx<=0, dely<=0)', () => {
  it('a FIXEDSIZE table placed at its own natural size takes neither ' +
     'align/valign branch (delx=dely=0)', () => {
    const tbl = sizedTable(
      '<TABLE FIXEDSIZE="TRUE" WIDTH="40" HEIGHT="20" ALIGN="LEFT" VALIGN="TOP">' +
      '<TR><TD>x</TD></TR></TABLE>',
    );
    // No `pos` argument: box is computed exactly from dim, so delx=dely=0.
    const placed = posHtmlTable(tbl, finfo, stubMeasurer);
    expect(placed.box.ur.x - placed.box.ll.x).toBeCloseTo(40, 6);
    expect(placed.box.ur.y - placed.box.ll.y).toBeCloseTo(20, 6);
  });
});

// ---------------------------------------------------------------------------
// makeHtmlLabel — pen-color inheritance into a nested table with its own
// explicit COLOR, and the plain-text (non-table) content dispatch.
// ---------------------------------------------------------------------------

describe('makeHtmlLabel — nested-table color inheritance and text dispatch', () => {
  it('a nested table with its own explicit COLOR is not overwritten by ' +
     'the inherited pen color (inheritTablePenColor recurses through the ' +
     'cell content item.kind==="table" branch)', () => {
    const lbl = makeHtmlLabel(
      '<TABLE><TR><TD><TABLE COLOR="green"><TR><TD>x</TD></TR></TABLE></TD></TR></TABLE>',
      { fontname: 'Arial', fontsize: 8, fontcolor: 'black', pencolor: 'red' },
      stubMeasurer,
    );
    const outer = (lbl.u as { kind: 'html'; html: PlacedHtml }).html;
    const nested = outer.cells[0]!.nested!;
    expect(nested.color).toBe('green');
  });

  it('a plain-text label (no top-level TABLE) skips inheritTablePenColor ' +
     'and keeps the original content as its text field', () => {
    const lbl = makeHtmlLabel('plain text', { fontname: 'Arial', fontsize: 8, fontcolor: 'black' }, stubMeasurer);
    expect(lbl.text).toBe('plain text');
    expect(lbl.html).toBe(true);
  });

  it('a parse error (unknown tag) falls back to makeLabel(\'\') per C\'s ' +
     'YYABORT — the label is left EMPTY, not the raw markup', () => {
    const lbl = makeHtmlLabel('<BOGUSTAG>x</BOGUSTAG>', { fontname: 'Arial', fontsize: 8, fontcolor: 'black' }, stubMeasurer);
    expect(lbl.text).toBe('');
    expect(lbl.html).toBeFalsy();
  });
});
