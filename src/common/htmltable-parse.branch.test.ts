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
import { parseHtmlLabel, parseHtmlLabelRv, parseTable, parseText } from './htmltable-parse.js';
import { StderrLines } from './htmltable-attr-warn.js';
import { HtmlLexError, tokenize } from './htmltable-lex.js';
import { HtmlParseError } from './htmltable-types.js';
import type { HtmlTable, HtmlCell, HtmlText } from './htmltable-types.js';

function firstTable(src: string): HtmlTable {
  const lbl = parseHtmlLabel(src);
  if (lbl.kind !== 'table') throw new Error('expected table label');
  return lbl.table;
}

/** The diagnostics of the HtmlLexError that parsing `src` must raise. */
function diagnosticsOf(src: string): readonly string[] {
  try {
    parseHtmlLabel(src);
  } catch (e) {
    if (e instanceof HtmlLexError) return e.diagnostics;
    throw e;
  }
  throw new Error('parseHtmlLabel did not throw');
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
  it('inline tag without a matching close tag is a syntax error', () => {
    // `bold text n_bold`: the text must be followed by </B>. @see htmlparse.y:textitem
    expect(() => parseText({ tokens: tokenize('<B>hi'), pos: 0 }, [{}])).toThrow('syntax error');
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
  it('FONT without a matching close tag is a syntax error', () => {
    // `font text n_font`. @see htmlparse.y:textitem
    expect(() => parseText({ tokens: tokenize('<FONT COLOR="blue">hi'), pos: 0 }, [{}])).toThrow('syntax error');
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
  it('bare BR (no close token) is a syntax error at the next token', () => {
    // Expected values from native dot 16.1.0: f1 repro `<TD>x<BR>y</TD>`.
    expect(diagnosticsOf('x<BR>y')).toEqual(['Error: syntax error in line 1 ', '... <BR>y ...']);
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
  it('a SRC on the cell is an illegal TD attribute, so the IMG stays without one', () => {
    // cell_items has no "src" (htmllex.c:461): doAttrs warns and ignores it.
    const c = firstCell('<TABLE><TR><TD SRC="cell.png"><IMG/></TD></TR></TABLE>');
    expect(c.content[0]).toMatchObject({ kind: 'image', src: '' });
  });
  it('bare IMG reports the lexer error that follows it', () => {
    expect(diagnosticsOf('<TABLE><TR><TD><IMG></TD></TR></TABLE>')).toEqual([
      'Error: mismatched tag in line 1 ',
      '... <IMG></TD> ...',
    ]);
  });
  it('text after an IMG is reported and the cell keeps the image alone', () => {
    expect(imgParse('<TD><IMG SRC="n.png"/>xx</TD>')).toEqual({
      stderr: afterImg('xx</TD>'), error: true, cells: [[{ kind: 'image', src: 'n.png', scale: undefined }]],
    });
  });
});

// ---------------------------------------------------------------------------
// The 16.1.1 image rule: strings before and after <IMG> (htmlparse.y:338-356).
// Expected stderr is native dot 16.1.1's, byte for byte, without make_label's
// `in label of ...` line.
// ---------------------------------------------------------------------------

const IMG = '<IMG SRC="a.png"/>';
const IMAGE = { kind: 'image', src: 'a.png', scale: undefined };
const beforeImg = (context: string): string[] => [
  'Error: Syntax error: non-space string used before <IMG> in line 1 ', `... ${context} ...`,
];
const afterImg = (context: string): string[] => [
  'Error: Syntax error: non-space string used after <IMG> in line 1 ', `... ${context} ...`,
];
const syntaxErr = (context: string): string[] => ['Error: syntax error in line 1 ', `... ${context} ...`];

/**
 * Parse a one-row table of `cells` as make_html_label does: what it writes to
 * stderr, then either the content of each cell and `ctx->error`, or `dropped`
 * when the parse aborted (no label).
 */
function imgParse(cells: string, tail = '</TR></TABLE>'): Record<string, unknown> {
  const stderr: string[] = [];
  try {
    const r = parseHtmlLabelRv(`<TABLE><TR>${cells}${tail}`, new StderrLines((l) => stderr.push(l)));
    if (r.label.kind !== 'table') throw new Error('expected table label');
    return { stderr, error: r.error, cells: r.label.table.rows[0].cells.map((c) => c.content) };
  } catch (e) {
    if (!(e instanceof HtmlParseError)) throw e;
    if (e instanceof HtmlLexError) stderr.push(...e.diagnostics);
    return { stderr, dropped: true };
  }
}

describe('image rule: blank strings around <IMG> are ignored', () => {
  it.each([
    ['before', ` ${IMG}`],
    ['after', `${IMG} `],
    ['on both sides', `  ${IMG}  `],
    ['after <IMG></IMG>', '<IMG SRC="a.png"></IMG> '],
    ['around <IMG></IMG>', ' <IMG SRC="a.png"></IMG> '],
    ['as dropped control characters', `\t\n${IMG}`],
    ['inside CDATA', `<![CDATA[ ]]>${IMG}`],
  ])('%s', (_name, cell) => {
    expect(imgParse(`<TD>${cell}</TD>`)).toEqual({ stderr: [], error: false, cells: [[IMAGE]] });
  });
});

describe('image rule: a non-space string is reported and the image kept', () => {
  it.each([
    ['before, at the IMG token', `x ${IMG}`, beforeImg(`x ${IMG}`)],
    ['after, at </TD>', `${IMG} y`, afterImg(' y</TD>')],
    ['on both sides: only the first prints', `x${IMG}y`, beforeImg(`x${IMG}`)],
    ['a no-break space is non-space', `${IMG}&#160;`, afterImg('&#160;</TD>')],
    ['CDATA text before', `<![CDATA[x]]>${IMG}`, beforeImg(`<![CDATA[x]]>${IMG}`)],
    ['CDATA text after', `${IMG}<![CDATA[y]]>`, afterImg('<![CDATA[y]]></TD>')],
    ['a string split by a comment', `x<!-- c -->y ${IMG}`, beforeImg(`y ${IMG}`)],
    ['before <IMG></IMG>', 'x<IMG SRC="a.png"></IMG>y', beforeImg('x<IMG SRC="a.png">')],
  ])('%s', (_name, cell, stderr) => {
    expect(imgParse(`<TD>${cell}</TD>`)).toEqual({ stderr, error: true, cells: [[IMAGE]] });
  });
});

describe('image rule: anything but strings next to <IMG> drops the label', () => {
  it.each([
    ['a second IMG', `${IMG} ${IMG}`, syntaxErr(` ${IMG}`)],
    ['a BR after blanks', `${IMG} <BR/>`, syntaxErr(' <BR/>')],
    ['a tag before the IMG', `<B>x</B>${IMG}`, syntaxErr(`</B>${IMG}`)],
    ['a tag, then blanks, before the IMG', `x<BR/> ${IMG}`, syntaxErr(` ${IMG}`)],
    ['a string inside <IMG></IMG>', '<IMG SRC="a.png"> </IMG>', syntaxErr('<IMG SRC="a.png"> ')],
    // The trailing opt_space reduces at the token after it, so the check runs
    // there; the syntax error at that token then finds ctx->error set.
    ['text, then a BR: the after-IMG error alone', `${IMG} y<BR/>`, afterImg(' y<BR/>')],
    ['text, then an IMG: the after-IMG error alone', `${IMG} y${IMG}`, afterImg(` y${IMG}`)],
    ['text, then a nested cell', `${IMG} y<TD>z</TD>`, afterImg(' y<TD>')],
    ['text, then a tag with a bad attribute: its warning comes first', `${IMG} y<BR BOGUS="1"/>`, [
      'Warning: Illegal attribute BOGUS in <BR> - ignored', ...afterImg(' y<BR BOGUS="1"/>'),
    ]],
    // The lexer fails fetching the token after the string and sets ctx->error first.
    ['text, then an unknown element: the lexer error alone', `${IMG} y<BOGUS/>`, [
      'Error: Unknown HTML element <BOGUS> on line 1 ',
    ]],
    ['text, then a mismatched tag: the expat error alone', `${IMG} y</TR>`, [
      'Error: mismatched tag in line 1 ', '...  y</TR> ...',
    ]],
  ])('%s', (_name, cell, stderr) => {
    expect(imgParse(`<TD>${cell}</TD>`)).toEqual({ stderr, dropped: true });
  });
});

describe('after the image rule set ctx->error', () => {
  const SOFT = `<TD>x ${IMG}</TD>`;
  const first = beforeImg(`x ${IMG}`);

  it.each([
    ['a syntax error', `<TD>${IMG} <BR/></TD>`],
    ['an expat mismatched tag', '<TD><B>y</I></TD>'],
    ['an undefined entity', '<TD>&bogus;</TD>'],
    ['text before a nested <TABLE>', '<TD>y<TABLE><TR><TD>a</TD></TR></TABLE></TD>'],
    ['text after a nested </TABLE>', '<TD><TABLE><TR><TD>a</TD></TR></TABLE>y</TD>'],
  ])('%s prints nothing and drops the label', (_name, cell) => {
    expect(imgParse(`${SOFT}${cell}`)).toEqual({ stderr: first, dropped: true });
  });

  it('an unfinished table prints nothing and drops the label', () => {
    expect(imgParse(SOFT, '</TR>')).toEqual({ stderr: first, dropped: true });
  });

  it('a second image-rule error prints nothing and both images stay', () => {
    expect(imgParse(`${SOFT}<TD>${IMG} y</TD>`)).toEqual({ stderr: first, error: true, cells: [[IMAGE], [IMAGE]] });
  });

  it('an unknown element still prints (lexerror has no ctx->error guard)', () => {
    expect(imgParse(`${SOFT}<TD><BOGUS/></TD>`)).toEqual({
      stderr: [...first, 'Error: Unknown HTML element <BOGUS> on line 1 '], dropped: true,
    });
  });

  it('lexer warnings of later tokens still print', () => {
    const r = imgParse(`${SOFT}<TD BOGUS="1">z</TD>`);
    expect(r.stderr).toEqual([...first, 'Warning: Illegal attribute BOGUS in <TD> - ignored']);
    expect(r.error).toBe(true);
  });
});

describe('HR cell content and inter-row HR', () => {
  it('HR inside a cell is a syntax error', () => {
    expect(diagnosticsOf('<TABLE><TR><TD><HR/></TD></TR></TABLE>')).toEqual([
      'Error: syntax error in line 1 ',
      '... <TD><HR/> ...',
    ]);
  });
  it('inter-row HR marks the preceding row ruled', () => {
    const tbl = firstTable('<TABLE><TR><TD>a</TD></TR><HR/><TR><TD>b</TD></TR></TABLE>');
    expect(tbl.rows[0].ruled).toBe(true);
  });
  it('HR with no row after it is a syntax error', () => {
    expect(diagnosticsOf('<TABLE><TR><TD>x</TD></TR><HR/></TABLE>')).toEqual([
      'Error: syntax error in line 1 ',
      '... <HR/></TABLE> ...',
    ]);
  });
  it('bare inter-row HR is a syntax error at the next tag', () => {
    expect(diagnosticsOf('<TABLE><TR><TD>a</TD></TR><HR><TR><TD>b</TD></TR></TABLE>')).toEqual([
      'Error: syntax error in line 1 ',
      '... <HR><TR> ...',
    ]);
  });
});

// ---------------------------------------------------------------------------
// VR — self-closing vs bare
// ---------------------------------------------------------------------------

describe('VR between cells', () => {
  it('VR marks the preceding cell vruled', () => {
    const tbl = firstTable('<TABLE><TR><TD>a</TD><VR/><TD>b</TD></TR></TABLE>');
    expect(tbl.rows[0].cells[0].vruled).toBe(true);
  });
  it('VR before any cell is a syntax error', () => {
    expect(diagnosticsOf('<TABLE><TR><VR/><TD>x</TD></TR></TABLE>')).toEqual([
      'Error: syntax error in line 1 ',
      '... <TR><VR/> ...',
    ]);
  });
  it('VR with no cell after it is a syntax error', () => {
    expect(diagnosticsOf('<TABLE><TR><TD>x</TD><VR/></TR></TABLE>')).toEqual([
      'Error: syntax error in line 1 ',
      '... <VR/></TR> ...',
    ]);
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
  it('a <TH> nested inside <TR> is a syntax error, not an endless loop', () => {
    expect(diagnosticsOf('<TABLE><TR><TH>x</TH></TR></TABLE>')).toEqual([
      'Error: syntax error in line 1 ',
      '... <TR><TH> ...',
    ]);
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
    const tbl = parseTable({ tokens: tokenize('<TABLE><TR><TD>x</TD>'), pos: 0 }, [{}]);
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
