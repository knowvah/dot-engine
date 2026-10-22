// SPDX-License-Identifier: EPL-2.0
/**
 * HTML-like label parser.
 * Ported from lib/common/htmllex.c + lib/common/htmlparse.y
 *
 * @see lib/common/htmllex.c:startElement
 * @see lib/common/htmlparse.y
 */

import type {
  HtmlCell,
  HtmlCellContent,
  HtmlImage,
  HtmlLabel,
  HtmlRow,
  HtmlTable,
  HtmlText,
  HtmlTextItem,
  Token,
  OpenToken,
} from './htmltable-types.js';
import { HtmlParseError } from './htmltable-types.js';
import { StderrLines } from './htmltable-attr-warn.js';
import type { ParseState } from './htmltable-parse-state.js';
import { consume, emitEof, emitWarnings, peek } from './htmltable-parse-state.js';
import { htmlErrorAtToken, tokenizeDeferred } from './htmltable-lex.js';
import type { FontState } from './htmltable-parse-font.js';
import {
  fontItemProps, inlineFontState, isInlineTag, mergeFontState, tableFont, wrapperFont,
} from './htmltable-parse-font.js';
import {
  buildCell,
  buildTable,
  num,
  parseAlign,
  parseColumns,
  parseRows,
} from './htmltable-parse-attrs.js';

/** bison's default message for an unexpected token. @see lib/common/htmlparse.y */
const MSG_SYNTAX_ERROR = 'syntax error';
/** @see lib/common/htmlparse.y:288 (table rule) */
const MSG_TEXT_BEFORE_TABLE = 'Syntax error: non-space string used before <TABLE>';
/** @see lib/common/htmlparse.y:298 (table rule) */
const MSG_TEXT_AFTER_TABLE = 'Syntax error: non-space string used after </TABLE>';

/** Any character other than a space (the lexer already dropped control characters). @see lib/common/htmlparse.y:nonSpace */
const nonSpace = (text: string): boolean => /[^ ]/.test(text);

/** Text in `ctx->xb` that no token carried, which the table rule's nonSpace also reads. */
const heldNonSpace = (tbl: Token | undefined): boolean => tbl?.type === 'open' && nonSpace(tbl.heldText ?? '');

/**
 * The parse failure C reports through `htmlerror` when the lexer last returned
 * `tok`. At end of input the deferred lexical error is what C would hit next.
 * A token without a recorded chunk yields a plain, silent HtmlParseError.
 * @see lib/common/htmllex.c:htmlerror
 */
const parseError = (s: ParseState, tok: Token | undefined, message: string): HtmlParseError => {
  // The lexer already ran for the token the error is reported at.
  if (tok !== undefined) emitWarnings(s, tok);
  else emitEof(s);
  return (tok === undefined ? s.pending : htmlErrorAtToken(message, tok)) ?? new HtmlParseError(message);
};

// ---------------------------------------------------------------------------
// Inline-tag helpers — mirrors htmlparse.y fonttext / inline rules
// ---------------------------------------------------------------------------

/**
 * `br: T_br T_end_br`, likewise image, HR and VR: the open tag must be
 * followed at once by its close (`<BR/>` yields both); anything else is a
 * syntax error at that token.
 * @see lib/common/htmlparse.y:br, image
 */
const consumeClose = (s: ParseState, tag: string): void => {
  const nxt = peek(s);
  if (nxt === undefined) return;
  if (nxt.type === 'close' && nxt.tag === tag) {
    consume(s);
    return;
  }
  throw parseError(s, nxt, MSG_SYNTAX_ERROR);
};

const applyBrTag = (
  s: ParseState, t: OpenToken, fontStack: FontState[], items: HtmlTextItem[],
): void => {
  consume(s);
  const font = fontStack[fontStack.length - 1] ?? {};
  items.push({ br: true, brAlign: parseAlign(t.attrs['align'] ?? ''), ...fontItemProps(font) });
  consumeClose(s, 'BR');
};

/**
 * `font text n_font` and the other font-style rules: `text` is one or more
 * text items, and the matching close tag must follow it. Anything else, an
 * empty element included, is a syntax error at the token found instead.
 * @see lib/common/htmlparse.y:textitem
 */
const parseStyledText = (s: ParseState, tag: string, fontStack: FontState[], items: HtmlTextItem[]): void => {
  const inner = parseText(s, fontStack);
  fontStack.pop();
  const nxt = peek(s);
  if (inner.items.length === 0 || nxt?.type !== 'close' || nxt.tag !== tag) {
    throw parseError(s, nxt, MSG_SYNTAX_ERROR);
  }
  items.push(...inner.items);
  consume(s);
};

/** `font text n_font` / `bold text n_bold` / ...: push the tag's font, parse its text, pop. */
const applyStyleTag = (
  s: ParseState, t: OpenToken, fontStack: FontState[], items: HtmlTextItem[],
): void => {
  consume(s);
  const own = t.tag === 'FONT'
    ? { fontColor: t.attrs['color'], fontFace: t.attrs['face'], fontSize: num(t.attrs['point-size']) }
    : inlineFontState(t.tag, t.attrs);
  fontStack.push(mergeFontState(fontStack[fontStack.length - 1] ?? {}, own));
  parseStyledText(s, t.tag, fontStack, items);
};

const applyOpenTag = (
  s: ParseState, t: OpenToken, fontStack: FontState[], items: HtmlTextItem[],
): boolean => {
  if (t.tag === 'BR') { applyBrTag(s, t, fontStack, items); return true; }
  if (t.tag === 'FONT' || isInlineTag(t.tag)) { applyStyleTag(s, t, fontStack, items); return true; }
  return false;
};

// ---------------------------------------------------------------------------
// parseText — parses inline text/font content
// ---------------------------------------------------------------------------

/** @see lib/common/htmlparse.y:fonttext / text rules */
export const parseText = (s: ParseState, fontStack: FontState[]): HtmlText => {
  const items: HtmlTextItem[] = [];
  while (s.pos < s.tokens.length) {
    const t = peek(s);
    if (!t) break;
    if (t.type === 'text') {
      consume(s);
      items.push({ text: t.value, ...fontItemProps(fontStack[fontStack.length - 1] ?? {}) });
      continue;
    }
    if (t.type === 'close') break;
    if (t.type === 'open' && applyOpenTag(s, t, fontStack, items)) continue;
    break;
  }
  return { kind: 'text', items };
};

// ---------------------------------------------------------------------------
// fonttable — a <TABLE> wrapped in one font-like tag
// ---------------------------------------------------------------------------

/** Tags of `fonttable : font table n_font | italic ... | bold ...`. @see lib/common/htmlparse.y:307 */
const FONTTABLE_TAGS: readonly string[] = ['FONT', 'B', 'I', 'U', 'O'];

/**
 * The wrapper tag when the tokens at the cursor open a `fonttable`: one of
 * FONTTABLE_TAGS, then only strings (the table rule's opt_space), then TABLE.
 */
const fontTableWrapper = (s: ParseState): OpenToken | undefined => {
  const open = peek(s);
  if (open?.type !== 'open' || !FONTTABLE_TAGS.includes(open.tag)) return undefined;
  let i = s.pos + 1;
  while (s.tokens[i]?.type === 'text') i++;
  const next = s.tokens[i];
  return next?.type === 'open' && next.tag === 'TABLE' ? open : undefined;
};

/** Consume strings; true when any is non-space (the table rule's nonSpace check). */
const skipStrings = (s: ParseState): boolean => {
  let found = false;
  for (let t = peek(s); t?.type === 'text'; t = peek(s)) {
    consume(s);
    if (nonSpace(t.value)) found = true;
  }
  return found;
};

/**
 * `font table n_font` (and the I/U/O/B forms): the wrapper's font sits on the
 * fontstack while the table parses, then pops at the closing tag.
 * @see lib/common/htmlparse.y:fonttable
 */
const parseFontTable = (s: ParseState, open: OpenToken, fontStack: FontState[]): HtmlTable => {
  consume(s);
  fontStack.push(wrapperFont(open, fontStack));
  const textBefore = skipStrings(s);
  const tblTok = peek(s);
  if ((textBefore || heldNonSpace(tblTok)) && tblTok !== undefined) throw parseError(s, tblTok, MSG_TEXT_BEFORE_TABLE);
  const table = parseTable(s, fontStack);
  const textAfter = skipStrings(s);
  const close = peek(s);
  if (close !== undefined && textAfter) throw parseError(s, close, MSG_TEXT_AFTER_TABLE);
  if (close?.type !== 'close' || close.tag !== open.tag) throw parseError(s, close, MSG_SYNTAX_ERROR);
  consume(s);
  fontStack.pop();
  return table;
};

/**
 * A <TABLE> that follows a consumed tag can only be a syntax error: the table
 * rule's opt_space admits strings alone.
 * @see lib/common/htmlparse.y:287
 */
const rejectTableAfterTag = (s: ParseState, start: number): void => {
  const nxt = peek(s);
  if (nxt?.type !== 'open' || nxt.tag !== 'TABLE') return;
  if (s.tokens.slice(start, s.pos).some((t) => t.type !== 'text')) {
    throw parseError(s, nxt, MSG_SYNTAX_ERROR);
  }
};

// ---------------------------------------------------------------------------
// Cell content helpers — mirrors htmlparse.y cell rule
// ---------------------------------------------------------------------------

const parseImgContent = (s: ParseState, t: OpenToken): HtmlImage => {
  consume(s);
  const img: HtmlImage = {
    kind: 'image',
    src: t.attrs['src'] ?? '',
    scale: t.attrs['scale'],
  };
  consumeClose(s, 'IMG');
  return img;
};

/** What a cell holds so far: C's cell has exactly one child. */
interface CellScan {
  kind: 'none' | 'text' | 'table' | 'fonttable' | 'image';
  /** Non-space text before the nested table (checked when the table opens). */
  textNonSpace: boolean;
  /** Non-space text after the nested table (checked when the run ends). */
  afterNonSpace: boolean;
}

/** `table: opt_space T_table ... T_end_table opt_space` inside a cell. */
const scanCellTable = (
  s: ParseState, t: Token, fontStack: FontState[], st: CellScan,
): HtmlCellContent[] => {
  if (st.kind === 'image' || st.kind === 'table') throw parseError(s, t, MSG_SYNTAX_ERROR);
  if (st.textNonSpace || heldNonSpace(t)) throw parseError(s, t, MSG_TEXT_BEFORE_TABLE);
  const tbl = parseTable(s, fontStack);
  st.kind = 'table';
  return [tbl];
};

/** Text run (strings and inline tags) of a cell holding text so far. */
const scanCellText = (s: ParseState, t: Token, fontStack: FontState[], st: CellScan): HtmlCellContent[] => {
  const start = s.pos;
  const txt = parseText(s, fontStack);
  if (s.pos === start) throw parseError(s, t, MSG_SYNTAX_ERROR);
  rejectTableAfterTag(s, start);
  if (txt.items.some((i) => i.text !== undefined && nonSpace(i.text))) st.textNonSpace = true;
  st.kind = 'text';
  return txt.items.length > 0 ? [txt] : [];
};

/** Only the blanks of the table rule's trailing opt_space may follow a nested table. */
const scanAfterTable = (s: ParseState, t: Token, st: CellScan): HtmlCellContent[] => {
  if (t.type !== 'text') throw parseError(s, t, st.afterNonSpace ? MSG_TEXT_AFTER_TABLE : MSG_SYNTAX_ERROR);
  consume(s);
  if (nonSpace(t.value)) st.afterNonSpace = true;
  return [];
};

/** `image` as the cell's only child. */
const scanCellImage = (s: ParseState, t: OpenToken, st: CellScan): HtmlCellContent[] => {
  if (st.kind !== 'none') throw parseError(s, t, MSG_SYNTAX_ERROR);
  st.kind = 'image';
  return [parseImgContent(s, t)];
};

/** One step of `cell: T_cell (fonttable | fonttext | image) T_end_cell`. */
const scanCellItem = (
  s: ParseState, t: Token, fontStack: FontState[], st: CellScan,
): HtmlCellContent[] => {
  if (st.kind === 'fonttable') throw parseError(s, t, MSG_SYNTAX_ERROR);
  if (st.kind === 'table') return scanAfterTable(s, t, st);
  const wrapper = st.kind === 'none' ? fontTableWrapper(s) : undefined;
  if (wrapper !== undefined) {
    st.kind = 'fonttable';
    return [parseFontTable(s, wrapper, fontStack)];
  }
  if (t.type === 'open' && t.tag === 'TABLE') return scanCellTable(s, t, fontStack, st);
  if (t.type === 'open' && t.tag === 'IMG') return scanCellImage(s, t, st);
  if (st.kind === 'image') throw parseError(s, t, MSG_SYNTAX_ERROR);
  return scanCellText(s, t, fontStack, st);
};

/** True at the cell's own `</TD>`; any other close tag is a syntax error. */
const endsCell = (s: ParseState, t: Token, st: CellScan): boolean => {
  if (t.type !== 'close') return false;
  const afterText = st.kind === 'table' && st.afterNonSpace;
  if (t.tag === 'TD' && !afterText) return true;
  throw parseError(s, t, afterText ? MSG_TEXT_AFTER_TABLE : MSG_SYNTAX_ERROR);
};

const parseCellContent = (s: ParseState, fontStack: FontState[]): HtmlCellContent[] => {
  const content: HtmlCellContent[] = [];
  const st: CellScan = { kind: 'none', textNonSpace: false, afterNonSpace: false };
  for (let t = peek(s); t !== undefined; t = peek(s)) {
    if (endsCell(s, t, st)) break;
    content.push(...scanCellItem(s, t, fontStack, st));
  }
  const nxt = peek(s);
  if (nxt?.type === 'close' && nxt.tag === 'TD') consume(s);
  // C models a cell child as a single object; the `TD table TD` rule discards
  // whitespace around a nested table, so a table IS the cell's sole content.
  // @see lib/common/htmltable.h:htmlcell_t.child
  const tbl = content.find((c) => c.kind === 'table');
  if (tbl !== undefined) return [tbl];
  return content;
};

/** @see lib/common/htmlparse.y:cell rule / lib/common/htmllex.c:mkCell */
const parseCell = (
  s: ParseState, attrs: Record<string, string>, fontStack: FontState[],
): HtmlCell => buildCell(parseCellContent(s, fontStack), attrs);

// ---------------------------------------------------------------------------
// parseRow — parses <TR>...</TR>
// ---------------------------------------------------------------------------

/**
 * `cells : cell | cells cell | cells VR cell`: VR marks the PRECEDING cell
 * as vertically ruled and must sit between two cells.
 * @see lib/common/htmlparse.y:329
 */
const parseRowVr = (s: ParseState, t: Token, cells: HtmlCell[]): void => {
  const prev = cells[cells.length - 1];
  if (prev === undefined) throw parseError(s, t, MSG_SYNTAX_ERROR);
  consume(s);
  consumeClose(s, 'VR');
  prev.vruled = true;
};

interface RowScan {
  cells: HtmlCell[];
  /** A VR was seen: the next cell is required. */
  needCell: boolean;
}

/** A TD, or a VR between cells. */
const scanRowCell = (s: ParseState, t: Token, fontStack: FontState[], rs: RowScan): void => {
  if (t.type === 'open' && t.tag === 'TD') {
    consume(s);
    rs.cells.push(parseCell(s, t.attrs, fontStack));
    rs.needCell = false;
  } else if (t.type === 'open' && t.tag === 'VR' && !rs.needCell) {
    parseRowVr(s, t, rs.cells);
    rs.needCell = true;
  } else {
    throw parseError(s, t, MSG_SYNTAX_ERROR);
  }
};

/** One token of `row: T_row cells T_end_row`; true at the row's `</TR>`. */
const scanRowToken = (s: ParseState, t: Token, fontStack: FontState[], rs: RowScan): boolean => {
  if (t.type === 'text') { consume(s); return false; } // not in a cell: ignored
  if (t.type !== 'close' || t.tag !== 'TR') {
    scanRowCell(s, t, fontStack, rs);
    return false;
  }
  if (rs.cells.length === 0 || rs.needCell) throw parseError(s, t, MSG_SYNTAX_ERROR);
  return true;
};

/** @see lib/common/htmlparse.y:row + cells rules */
const parseRow = (s: ParseState, fontStack: FontState[]): HtmlRow => {
  const rs: RowScan = { cells: [], needCell: false };
  for (let t = peek(s); t !== undefined; t = peek(s)) {
    if (scanRowToken(s, t, fontStack, rs)) break;
  }
  const nxt = peek(s);
  if (nxt?.type === 'close' && nxt.tag === 'TR') consume(s);
  return { cells: rs.cells };
};

// ---------------------------------------------------------------------------
// parseTable — parses <TABLE>...</TABLE>
// ---------------------------------------------------------------------------

interface TableScan {
  rows: HtmlRow[];
  /** An HR was seen: the next row is required. */
  needRow: boolean;
  hrule: boolean;
  vrule: boolean;
}

/** `rows : row | rows row | rows HR row`: a TR, or an HR after a row. */
const scanTableRow = (s: ParseState, t: Token, fontStack: FontState[], ts: TableScan): void => {
  if (t.type === 'open' && t.tag === 'TR') {
    consume(s);
    ts.rows.push(parseTableRow(s, fontStack, ts));
    ts.needRow = false;
  } else if (t.type === 'open' && t.tag === 'HR' && ts.rows.length > 0 && !ts.needRow) {
    consumeRowHr(s, ts.rows);
    ts.needRow = true;
  } else {
    throw parseError(s, t, MSG_SYNTAX_ERROR);
  }
};

/** One token of a table body; true after the table's `</TABLE>`. */
const scanTableToken = (s: ParseState, t: Token, fontStack: FontState[], ts: TableScan): boolean => {
  if (t.type === 'text') { consume(s); return false; } // not in a cell: ignored
  if (t.type !== 'close' || t.tag !== 'TABLE') {
    scanTableRow(s, t, fontStack, ts);
    return false;
  }
  if (ts.rows.length === 0 || ts.needRow) throw parseError(s, t, MSG_SYNTAX_ERROR);
  consume(s);
  return true;
};

/** @see lib/common/htmlparse.y:table rule / lib/common/htmllex.c:mkTbl */
export const parseTable = (s: ParseState, fontStack: FontState[]): HtmlTable => {
  const open = consume(s); // consume <TABLE>
  if (open.type !== 'open' || open.tag !== 'TABLE') throw new HtmlParseError('TABLE');
  // C addRow: every row starts ruled when ROWS="*" (htmlparse.y addRow);
  // C setCell: every cell starts vruled when COLUMNS="*".
  const ts: TableScan = {
    rows: [],
    needRow: false,
    hrule: parseRows(open.attrs['rows']) === true,
    vrule: parseColumns(open.attrs['columns']) === true,
  };
  for (let t = peek(s); t !== undefined; t = peek(s)) {
    if (scanTableToken(s, t, fontStack, ts)) break;
  }
  const table = buildTable(ts.rows, open.attrs);
  const font = tableFont(fontStack);
  if (font !== undefined) table.font = font;
  return table;
};

/** Parse one row, applying table-level rule defaults. @see lib/common/htmlparse.y addRow/setCell */
const parseTableRow = (
  s: ParseState, fontStack: FontState[], opts: { hrule: boolean; vrule: boolean },
): HtmlRow => {
  const row = parseRow(s, fontStack);
  if (opts.hrule) row.ruled = true;
  if (opts.vrule) for (const c of row.cells) c.vruled = true;
  return row;
};

/**
 * <HR> between rows marks the PRECEDING row as ruled; HR before any
 * row is a syntax error in the C grammar.
 * @see lib/common/htmlparse.y:321 ("rows HR row")
 */
const consumeRowHr = (s: ParseState, rows: HtmlRow[]): void => {
  consume(s);
  consumeClose(s, 'HR');
  const prev = rows[rows.length - 1];
  if (prev !== undefined) prev.ruled = true;
};

// ---------------------------------------------------------------------------
// parseHtmlLabel — public entry point
// ---------------------------------------------------------------------------

const findFirstRealToken = (tokens: Token[], start: number): Token | undefined => {
  for (let i = start; i < tokens.length; i++) {
    const tk = tokens[i];
    if (tk.type !== 'text' || nonSpace(tk.value)) return tk;
  }
  return undefined;
};

const skipLeadingWs = (s: ParseState): void => {
  while (true) {
    const nxt = peek(s);
    if (!nxt || nxt.type !== 'text' || nonSpace(nxt.value)) break;
    consume(s);
  }
};

/** After the top-level `</TABLE>`: blanks, then `</HTML>`. */
const finishTableLabel = (s: ParseState): void => {
  let afterNonSpace = false;
  for (let t = peek(s); t?.type === 'text'; t = peek(s)) {
    consume(s);
    if (nonSpace(t.value)) afterNonSpace = true;
  }
  const nxt = peek(s);
  if (nxt === undefined) return;
  if (afterNonSpace) throw parseError(s, nxt, MSG_TEXT_AFTER_TABLE);
  if (nxt.type !== 'close' || nxt.tag !== 'HTML') throw parseError(s, nxt, MSG_SYNTAX_ERROR);
  consume(s);
};

/** `html : T_html fonttable T_end_html` with a font-like wrapper. */
const parseFontTableLabel = (s: ParseState, open: OpenToken, fontStack: FontState[]): HtmlLabel => {
  const table = parseFontTable(s, open, fontStack);
  const nxt = peek(s);
  if (nxt === undefined) return { kind: 'table', table };
  if (nxt.type !== 'close' || nxt.tag !== 'HTML') throw parseError(s, nxt, MSG_SYNTAX_ERROR);
  consume(s);
  return { kind: 'table', table };
};

const parseTableLabel = (s: ParseState, fontStack: FontState[]): HtmlLabel => {
  skipLeadingWs(s);
  if (heldNonSpace(peek(s))) throw parseError(s, peek(s), MSG_TEXT_BEFORE_TABLE);
  const table = parseTable(s, fontStack);
  finishTableLabel(s);
  return { kind: 'table', table };
};

/** `html : T_html fonttext T_end_html` (a textitem is required); a `<TABLE>` after text is the table rule's error. */
const parseTextLabel = (s: ParseState, fontStack: FontState[]): HtmlLabel => {
  const texts: HtmlText[] = [];
  const start = s.pos;
  const txt = parseText(s, fontStack);
  if (txt.items.length > 0) texts.push(txt);
  const nxt = peek(s);
  if (nxt === undefined) return { kind: 'text', texts };
  if (nxt.type === 'open' && nxt.tag === 'TABLE') {
    // C's `table` rule aborts the whole label when non-space text precedes a
    // top-level <TABLE>; after any tag it is a plain syntax error.
    // @see lib/common/htmlparse.y:288 (table rule nonSpace check)
    rejectTableAfterTag(s, start);
    throw parseError(s, nxt, MSG_TEXT_BEFORE_TABLE);
  }
  if (nxt.type !== 'close' || nxt.tag !== 'HTML' || s.pos === start) throw parseError(s, nxt, MSG_SYNTAX_ERROR);
  consume(s);
  return { kind: 'text', texts };
};

/** Parse the token stream; the deferred lexical error wins once input runs out. */
const parseTokens = (s: ParseState): HtmlLabel => {
  const fontStack: FontState[] = [{}];
  const htmlOpen = consume(s);
  if (htmlOpen.type !== 'open' || htmlOpen.tag !== 'HTML') throw new HtmlParseError('HTML');
  const wrapper = fontTableWrapper(s);
  if (wrapper !== undefined) return parseFontTableLabel(s, wrapper, fontStack);
  const firstReal = findFirstRealToken(s.tokens, s.pos);
  if (firstReal?.type === 'open' && firstReal.tag === 'TABLE') return parseTableLabel(s, fontStack);
  return parseTextLabel(s, fontStack);
};

/** A parsed label and `ctx->warn`, which `make_html_label` ORs into its rv. */
export interface ParsedHtmlLabel {
  label: HtmlLabel;
  warn: boolean;
}

/**
 * Parse an HTML-like label string, writing the lexer's warnings to `stderr` as
 * the parser reaches their tokens. The caller owns `stderr` and flushes it: a
 * warning without a newline continues into the caller's next write. Input is
 * the content between the outer `<` `>` delimiters (already stripped).
 *
 * @see lib/common/htmlparse.y:parseHTML
 */
export const parseHtmlLabelRv = (src: string, stderr: StderrLines): ParsedHtmlLabel => {
  const { tokens, error, eof } = tokenizeDeferred(`<HTML>${src}</HTML>`, { start: 6, end: 6 + src.length });
  const s: ParseState = { tokens, pos: 0, pending: error, stderr, emitted: new WeakSet(), warn: false, eof };
  try {
    const label = parseTokens(s);
    if (error !== undefined) throw error;
    return { label, warn: s.warn === true };
  } catch (e) {
    // Running off the truncated stream means C's lexer would have hit the error.
    if (error !== undefined && s.pos >= tokens.length) { emitEof(s); throw error; }
    throw e;
  }
};

/**
 * {@link parseHtmlLabelRv} without printing: callers that only inspect the
 * label (the async font/image collection pass) must not repeat the warnings
 * the sync pass prints.
 */
export const parseHtmlLabel = (src: string): HtmlLabel =>
  parseHtmlLabelRv(src, new StderrLines(() => undefined)).label;
