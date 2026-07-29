// SPDX-License-Identifier: EPL-2.0
/**
 * Branch-coverage tests for src/common/htmltable-parse.ts (T4c).
 *
 * Targets parseVAlign's bottom/middle branches, num()'s NaN guard, the
 * font-stack push/pop default-vs-active branches for BR/FONT/inline tags,
 * self-closing-vs-open-only tag consumption (BR/FONT/inline/IMG/HR/VR/TR/
 * TABLE), the TH cell-open branch, empty-cell-content ([] vs [txt]),
 * malformed-token early exits (missing closing tags), and the leading
 * non-space-before-TABLE and whitespace-only top-level-text branches.
 *
 * @see lib/common/htmlparse.y
 * @see lib/common/htmllex.c
 */
import { describe, expect, it } from 'vitest';
import { parseHtmlLabel, parseTable, parseText } from './htmltable-parse.js';
import { tokenize } from './htmltable-lex.js';
import { HtmlParseError } from './htmltable-types.js';
import type { HtmlTable, HtmlCell, HtmlText } from './htmltable-types.js';

function firstTable(src: string): HtmlTable {
  const lbl = parseHtmlLabel(src);
  if (lbl.kind !== 'table') throw new Error('expected table label');
  return lbl.table;
}

function firstCell(src: string): HtmlCell {
  const tbl = firstTable(src);
  const cell = tbl.rows[0].cells[0];
  if (!cell || cell.kind !== 'cell') throw new Error('expected cell');
  return cell;
}

// ---------------------------------------------------------------------------
// parseVAlign — bottom/middle branches
// ---------------------------------------------------------------------------

describe('VALIGN branches', () => {
  it('BOTTOM on cell', () => {
    const c = firstCell('<TABLE><TR><TD VALIGN="BOTTOM">x</TD></TR></TABLE>');
    expect(c.valign).toBe('bottom');
  });
  it('MIDDLE on cell', () => {
    const c = firstCell('<TABLE><TR><TD VALIGN="MIDDLE">x</TD></TR></TABLE>');
    expect(c.valign).toBe('middle');
  });
  it('unrecognised value yields undefined', () => {
    const c = firstCell('<TABLE><TR><TD VALIGN="BOGUS">x</TD></TR></TABLE>');
    expect(c.valign).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// num() — NaN guard
// ---------------------------------------------------------------------------

describe('num() NaN guard', () => {
  it('non-numeric BORDER yields undefined', () => {
    const c = firstCell('<TABLE><TR><TD BORDER="xyz">x</TD></TR></TABLE>');
    expect(c.border).toBeUndefined();
  });
  it('numeric BORDER parses', () => {
    const c = firstCell('<TABLE><TR><TD BORDER="3">x</TD></TR></TABLE>');
    expect(c.border).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Font stack — bold/italic/underline/overline/strikethrough/sub/sup + face
// ---------------------------------------------------------------------------

describe('inline font tags', () => {
  it('U sets underline', () => {
    const t = parseText({ tokens: tokenize('<U>hi</U>'), pos: 0 }, [{}]);
    expect(t.items[0]).toMatchObject({ text: 'hi', underline: true });
  });
  it('O sets overline', () => {
    const t = parseText({ tokens: tokenize('<O>hi</O>'), pos: 0 }, [{}]);
    expect(t.items[0]).toMatchObject({ text: 'hi', overline: true });
  });
  it('S sets strikethrough', () => {
    const t = parseText({ tokens: tokenize('<S>hi</S>'), pos: 0 }, [{}]);
    expect(t.items[0]).toMatchObject({ text: 'hi', strikethrough: true });
  });
  it('SUB sets subscript', () => {
    const t = parseText({ tokens: tokenize('<SUB>hi</SUB>'), pos: 0 }, [{}]);
    expect(t.items[0]).toMatchObject({ text: 'hi', subscript: true });
  });
  it('SUP sets superscript', () => {
    const t = parseText({ tokens: tokenize('<SUP>hi</SUP>'), pos: 0 }, [{}]);
    expect(t.items[0]).toMatchObject({ text: 'hi', superscript: true });
  });
  it('inline tag without a matching close tag: no close-token consumption', () => {
    // No </B> — applyInlineTag's `nxt?.type === 'close'` branch is false.
    const t = parseText({ tokens: tokenize('<B>hi'), pos: 0 }, [{}]);
    expect(t.items[0]).toMatchObject({ text: 'hi', bold: true });
  });
});

describe('FONT tag', () => {
  it('sets face/color/point-size and restores parent state after pop', () => {
    const t = parseText(
      { tokens: tokenize('<FONT FACE="Arial" COLOR="red" POINT-SIZE="12">hi</FONT>after'), pos: 0 },
      [{}],
    );
    expect(t.items[0]).toMatchObject({ text: 'hi', fontFace: 'Arial', fontColor: 'red', fontSize: 12 });
    // Popped back to the empty root font: no face/color/size on "after".
    expect(t.items[1]).toEqual({ text: 'after' });
  });
  it('FONT without a matching close tag: no close-token consumption', () => {
    const t = parseText({ tokens: tokenize('<FONT COLOR="blue">hi'), pos: 0 }, [{}]);
    expect(t.items[0]).toMatchObject({ text: 'hi', fontColor: 'blue' });
  });
  it('nested FONT merges onto the active (non-empty) parent font', () => {
    const t = parseText(
      { tokens: tokenize('<FONT COLOR="red"><FONT FACE="Arial">hi</FONT></FONT>'), pos: 0 },
      [{}],
    );
    expect(t.items[0]).toMatchObject({ text: 'hi', fontColor: 'red', fontFace: 'Arial' });
  });
});

describe('BR tag', () => {
  it('self-closing BR (with close-token) consumes the close token', () => {
    const t = parseText({ tokens: tokenize('a<BR ALIGN="LEFT"/>b'), pos: 0 }, [{}]);
    expect(t.items[1]).toMatchObject({ br: true, brAlign: 'left' });
    expect(t.items[2]).toEqual({ text: 'b' });
  });
  it('bare BR (no close token) does not consume', () => {
    const t = parseText({ tokens: tokenize('a<BR>b'), pos: 0 }, [{}]);
    expect(t.items[1]).toMatchObject({ br: true });
    expect(t.items[2]).toEqual({ text: 'b' });
  });
  it('BR inside an active font carries the font state', () => {
    const t = parseText(
      { tokens: tokenize('<B>a<BR/>b</B>'), pos: 0 },
      [{}],
    );
    expect(t.items[1]).toMatchObject({ br: true, bold: true });
  });
});

// ---------------------------------------------------------------------------
// IMG / HR — self-closing vs bare
// ---------------------------------------------------------------------------

describe('IMG cell content', () => {
  it('self-closing IMG with SRC on the tag', () => {
    const c = firstCell('<TABLE><TR><TD><IMG SRC="a.png"/></TD></TR></TABLE>');
    expect(c.content[0]).toMatchObject({ kind: 'image', src: 'a.png' });
  });
  it('bare IMG (no close) still parses; cell SRC falls back when tag omits it', () => {
    const c = firstCell('<TABLE><TR><TD SRC="cell.png"><IMG></TD></TR></TABLE>');
    expect(c.content[0]).toMatchObject({ kind: 'image', src: 'cell.png' });
  });
});

describe('HR cell content and inter-row HR', () => {
  it('self-closing HR in a cell', () => {
    const c = firstCell('<TABLE><TR><TD><HR/></TD></TR></TABLE>');
    expect(c.content[0]).toEqual({ kind: 'hr' });
  });
  it('bare HR (no close) in a cell', () => {
    const c = firstCell('<TABLE><TR><TD><HR></TD></TR></TABLE>');
    expect(c.content[0]).toEqual({ kind: 'hr' });
  });
  it('bare inter-row HR (no close) marks the preceding row ruled', () => {
    const tbl = firstTable('<TABLE><TR><TD>a</TD></TR><HR><TR><TD>b</TD></TR></TABLE>');
    expect(tbl.rows[0].ruled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// VR — self-closing vs bare
// ---------------------------------------------------------------------------

describe('VR between cells', () => {
  it('bare VR (no close) marks the preceding cell vruled', () => {
    const tbl = firstTable('<TABLE><TR><TD>a</TD><VR><TD>b</TD></TR></TABLE>');
    expect(tbl.rows[0].cells[0].vruled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TH cells and empty cell content
// ---------------------------------------------------------------------------

describe('TH cells', () => {
  // TH is a row-boundary synonym for TR, never a cell tag.
  // @see lib/common/htmllex.c:614,669 (startElement/endElement T_row dispatch)
  it('<TH> delimits a row exactly like <TR> and terminates', () => {
    const tbl = firstTable('<TABLE><TH><TD>x</TD></TH></TABLE>');
    expect(tbl.rows).toHaveLength(1);
    expect(tbl.rows[0].cells).toHaveLength(1);
    expect(tbl.rows[0].cells[0].content).toEqual([
      { kind: 'text', items: [{ text: 'x' }] },
    ]);
  }, 2000);

  it('<TH>...<TD>...<TD>...</TH> is structurally identical to the <TR> form', () => {
    const th = firstTable('<TABLE><TH><TD>a</TD><TD>b</TD></TH></TABLE>');
    const tr = firstTable('<TABLE><TR><TD>a</TD><TD>b</TD></TR></TABLE>');
    expect(th).toEqual(tr);
  }, 2000);

  // Direct hang repro (pre-fix): before D3, processRowToken (htmltable-
  // parse.ts:365) treated a nested `<TH>` as a TD-cell alias, but
  // parseCellContent's close-tag matcher only recognised `close TD` — the
  // cell's content loop never observed its own (TH) closing tag and spun
  // forever. Confirmed via a 5s subprocess timeout against the pre-fix
  // source (exit 124). Post-fix, TH lexes as TR, so a <TH> nested inside
  // an already-open <TR> is a malformed nested row (no grammar rule for
  // it): the outer parseRow's own `close TR` check (normalized from the
  // inner TH's close tag) ends the row early, discarding the "x" text and
  // the real </TR> as unrecognised trailing tokens — one row, zero cells.
  it('terminates on a <TH> nested inside <TR> instead of looping forever', () => {
    const tbl = firstTable('<TABLE><TR><TH>x</TH></TR></TABLE>');
    expect(tbl.rows).toEqual([{ cells: [] }]);
  }, 2000);
});

describe('empty cell content', () => {
  it('a cell with no text items has empty content', () => {
    const c = firstCell('<TABLE><TR><TD></TD></TR></TABLE>');
    expect(c.content).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// buildTable — align/valign undefined-attr branches
// ---------------------------------------------------------------------------

describe('table-level ALIGN/VALIGN absent', () => {
  it('no ALIGN/VALIGN attrs on TABLE yields undefined for both', () => {
    const tbl = firstTable('<TABLE><TR><TD>x</TD></TR></TABLE>');
    expect(tbl.align).toBeUndefined();
    expect(tbl.valign).toBeUndefined();
  });
  it('ALIGN/VALIGN present on TABLE are parsed', () => {
    const tbl = firstTable('<TABLE ALIGN="RIGHT" VALIGN="TOP"><TR><TD>x</TD></TR></TABLE>');
    expect(tbl.align).toBe('right');
    expect(tbl.valign).toBe('top');
  });
});

// ---------------------------------------------------------------------------
// Malformed token streams — missing closing tags (early `!t` exits)
// ---------------------------------------------------------------------------

describe('malformed streams without closing tags', () => {
  it('parseTable with no closing TABLE token still returns the parsed rows', () => {
    const tokens = tokenize('<TABLE><TR><TD>x</TD></TR>');
    const table = parseTable({ tokens, pos: 0 }, [{}]);
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0].cells[0]).toMatchObject({ kind: 'cell' });
  });

  it('a row with no closing TR token still returns the parsed cells', () => {
    const tbl = firstTable('<TABLE><TR><TD>x</TD>');
    expect(tbl.rows[0].cells).toHaveLength(1);
  });

  it('parseTable throws when the leading token is not <TABLE>', () => {
    const tokens = tokenize('<TR><TD>x</TD></TR>');
    expect(() => parseTable({ tokens, pos: 0 }, [{}])).toThrow(HtmlParseError);
  });
});

// ---------------------------------------------------------------------------
// parseHtmlLabel — non-space-before-TABLE and whitespace-only text branches
// ---------------------------------------------------------------------------

describe('parseHtmlLabel top-level dispatch', () => {
  it('throws on non-space text preceding a top-level TABLE', () => {
    expect(() => parseHtmlLabel('text<TABLE><TR><TD>x</TD></TR></TABLE>')).toThrow(HtmlParseError);
  });

  it('leading whitespace before TABLE is skipped, not an error', () => {
    const lbl = parseHtmlLabel('   <TABLE><TR><TD>x</TD></TR></TABLE>');
    expect(lbl.kind).toBe('table');
  });

  it('plain text label (no table) parses as text items', () => {
    const lbl = parseHtmlLabel('hello');
    expect(lbl.kind).toBe('text');
    if (lbl.kind === 'text') {
      expect(lbl.texts[0]?.items[0]).toEqual({ text: 'hello' });
    }
  });

  it('whitespace-only label still yields one whitespace text item (not filtered)', () => {
    const lbl = parseHtmlLabel('   ');
    expect(lbl.kind).toBe('text');
    if (lbl.kind === 'text') {
      expect(lbl.texts).toEqual([{ kind: 'text', items: [{ text: '   ' }] }]);
    }
  });
});

// ---------------------------------------------------------------------------
// nested table content and TD-child single-object collapsing
// ---------------------------------------------------------------------------

describe('parseText re-exported for direct token-level checks', () => {
  it('produces an empty item list for an empty token stream', () => {
    const t: HtmlText = parseText({ tokens: [], pos: 0 }, [{}]);
    expect(t.items).toEqual([]);
  });
});
