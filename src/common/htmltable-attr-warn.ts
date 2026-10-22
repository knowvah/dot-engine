// SPDX-License-Identifier: EPL-2.0
/**
 * The attribute tables and value handlers of htmllex.c's `doAttrs`: which
 * attributes each element accepts, which values a handler takes or ignores,
 * and the warnings C prints for the rest.
 *
 * `checkAttrs` is pure. It returns the attributes C would have applied plus
 * the stderr text C would have written; the parser prints that text when it
 * consumes the token (see {@link StderrLines}).
 *
 * @see lib/common/htmllex.c:doAttrs
 */

/** An attribute as startElement gets it: name in source case, value decoded by expat. */
export type AttrEntry = readonly [name: string, value: string];

export interface CheckedAttrs {
  /** Accepted attributes, names lower-cased, in document order (later wins). */
  attrs: Record<string, string>;
  /** Exact C stderr text per write, trailing newline kept where C has one. */
  warnings: string[];
  /** `ctx->warn`: the label's `rv` becomes 1. */
  warn: boolean;
}

/** What one handler did: `keep` is the value applied, undefined when ignored. */
interface Outcome {
  keep: string | undefined;
  text: string[];
  warn: boolean;
}

type Handler = (v: string) => Outcome;

const accepted = (v: string): Outcome => ({ keep: v, text: [], warn: false });
const ignored = (text: string): Outcome => ({ keep: undefined, text: [text], warn: true });
const warning = (msg: string): string => `Warning: ${msg}`;

/** ASCII-only lower-casing: `strcasecmp` does not fold other letters. */
const lower = (s: string): string => s.replace(/[A-Z]/g, (c) => c.toLowerCase());

const accept: Handler = accepted;

// ---------------------------------------------------------------------------
// Numeric handlers
// ---------------------------------------------------------------------------

/** `strtol(v, &ep, 10)`: leading blanks, a sign, digits; `ep == v` otherwise. */
const STRTOL = /^[ \t\n\v\f\r]*([+-]?\d+)/;

/**
 * Scan v for an integral value in [min, max]; the message carries no newline.
 * @see lib/common/htmllex.c:doInt
 */
function doInt(v: string, s: string, min: number, max: number): Outcome {
  const m = STRTOL.exec(v);
  if (m === null) return ignored(warning(`Improper ${s} value ${v} - ignored`));
  const b = Number(m[1]);
  if (b > max) return ignored(warning(`${s} value ${v} > ${max} - too large - ignored`));
  if (b < min) return ignored(warning(`${s} value ${v} < ${min} - too small - ignored`));
  return accepted(v);
}

const intHandler = (s: string, min: number, max: number): Handler => (v) => doInt(v, s, min, max);

const UCHAR_MAX = 255;
const SCHAR_MIN = -128;
const SCHAR_MAX = 127;
const INT8_MAX = 127;
const USHRT_MAX = 65535;
const GRADIENT_MAX = 360;

/** ROWSPAN and COLSPAN: an integer in [0, 65535] that is not 0. */
const spanHandler = (s: string): Handler => (v) => {
  const r = doInt(v, s, 0, USHRT_MAX);
  if (r.keep === undefined || Number(STRTOL.exec(v)?.[1]) !== 0) return r;
  return ignored(warning(`${s} value cannot be 0 - ignored\n`));
};

// ---------------------------------------------------------------------------
// Enumerated handlers
// ---------------------------------------------------------------------------

/**
 * Accept the listed words (any case); anything else is ignored with
 * `Illegal value %s for <what> - ignored\n`.
 */
const wordsHandler = (words: readonly string[], what: string): Handler => (v) =>
  words.includes(lower(v)) ? accepted(v) : ignored(warning(`Illegal value ${v} for ${what} - ignored\n`));

/** COLUMNS and ROWS look at the first character only. */
const starHandler = (what: string): Handler => (v) =>
  v.startsWith('*') ? accepted(v) : ignored(warning(`Unknown value ${v} for ${what} - ignored\n`));

const valign = wordsHandler(['bottom', 'top', 'middle'], 'VALIGN');
const fixedsize = wordsHandler(['true', 'false'], 'FIXEDSIZE');
const tableAlign = wordsHandler(['left', 'right', 'center'], 'ALIGN');
const brAlign = tableAlign;
const cellAlign = wordsHandler(['left', 'right', 'text', 'center'], 'ALIGN in TD');
const balign = wordsHandler(['left', 'right', 'center'], 'BALIGN in TD');

const SIDES_LETTERS = 'ltrb';

/**
 * Every byte of v that is not l, t, r or b (either case) gets a warning,
 * `%c` and the signed `%d` of the C `char`; the handler still returns 0.
 * @see lib/common/htmllex.c:sidesfn
 */
const sides: Handler = (v) => {
  const text: string[] = [];
  for (const b of new TextEncoder().encode(v)) {
    if (SIDES_LETTERS.includes(lower(String.fromCharCode(b)))) continue;
    const code = b > SCHAR_MAX ? b - 256 : b;
    text.push(warning(`Unrecognized character '${String.fromCharCode(b)}' (${code}) in sides attribute\n`));
  }
  return { keep: v, text, warn: false };
};

const STYLE_WORDS: readonly string[] = ['rounded', 'radial', 'solid', 'invisible', 'invis', 'dotted', 'dashed'];
const STYLE_DELIM = ' ,';

/**
 * `tok(v, " ,")`: the first token may be empty; after a token the string ends
 * the scan, otherwise the separators are skipped and the next token (possibly
 * empty, after a trailing separator) follows.
 * @see lib/util/tokenize.h:tok_next
 */
function styleTokens(v: string): string[] {
  const out: string[] = [];
  const span = (from: number, member: boolean): number => {
    let i = from;
    while (i < v.length && STYLE_DELIM.includes(v[i]!) === member) i++;
    return i;
  };
  let end = span(0, false);
  out.push(v.slice(0, end));
  while (end < v.length) {
    const start = span(end, true);
    end = span(start, false);
    out.push(v.slice(start, end));
  }
  return out;
}

/**
 * Each illegal token warns and sets rv; the legal ones apply.
 * @see lib/common/htmllex.c:stylefn
 */
const style: Handler = (v) => {
  const legal: string[] = [];
  const text: string[] = [];
  for (const tk of styleTokens(v)) {
    if (STYLE_WORDS.includes(lower(tk))) legal.push(tk);
    else text.push(warning(`Illegal value ${tk} for STYLE - ignored\n`));
  }
  return { keep: legal.length > 0 ? legal.join(' ') : undefined, text, warn: text.length > 0 };
};

// ---------------------------------------------------------------------------
// Tables (alphabetical, as in C)
// ---------------------------------------------------------------------------

const border = intHandler('BORDER', 0, UCHAR_MAX);
const cellpadding = intHandler('CELLPADDING', 0, UCHAR_MAX);
const cellspacing = intHandler('CELLSPACING', SCHAR_MIN, SCHAR_MAX);
const gradientangle = intHandler('GRADIENTANGLE', 0, GRADIENT_MAX);
const height = intHandler('HEIGHT', 0, USHRT_MAX);
const width = intHandler('WIDTH', 0, USHRT_MAX);

type ItemTable = ReadonlyMap<string, Handler>;

/** @see lib/common/htmllex.c:tbl_items */
const TBL_ITEMS: ItemTable = new Map<string, Handler>([
  ['align', tableAlign], ['bgcolor', accept], ['border', border],
  ['cellborder', intHandler('CELLBORDER', 0, INT8_MAX)], ['cellpadding', cellpadding],
  ['cellspacing', cellspacing], ['color', accept], ['columns', starHandler('COLUMNS')],
  ['fixedsize', fixedsize], ['gradientangle', gradientangle], ['height', height],
  ['href', accept], ['id', accept], ['port', accept], ['rows', starHandler('ROWS')],
  ['sides', sides], ['style', style], ['target', accept], ['title', accept],
  ['tooltip', accept], ['valign', valign], ['width', width],
]);

/** @see lib/common/htmllex.c:cell_items */
const CELL_ITEMS: ItemTable = new Map<string, Handler>([
  ['align', cellAlign], ['balign', balign], ['bgcolor', accept], ['border', border],
  ['cellpadding', cellpadding], ['cellspacing', cellspacing], ['color', accept],
  ['colspan', spanHandler('COLSPAN')], ['fixedsize', fixedsize],
  ['gradientangle', gradientangle], ['height', height], ['href', accept], ['id', accept],
  ['port', accept], ['rowspan', spanHandler('ROWSPAN')], ['sides', sides], ['style', style],
  ['target', accept], ['title', accept], ['tooltip', accept], ['valign', valign],
  ['width', width],
]);

/** @see lib/common/htmllex.c:font_items */
const FONT_ITEMS: ItemTable = new Map<string, Handler>([
  ['color', accept], ['face', accept], ['point-size', intHandler('POINT-SIZE', 0, UCHAR_MAX)],
]);

/** @see lib/common/htmllex.c:img_items */
const IMG_ITEMS: ItemTable = new Map<string, Handler>([['scale', accept], ['src', accept]]);

/** @see lib/common/htmllex.c:br_items */
const BR_ITEMS: ItemTable = new Map<string, Handler>([['align', brAlign]]);

/** Element tag to its item table and the name `doAttrs` prints for it. */
const ELEMENTS: ReadonlyMap<string, { items: ItemTable; name: string }> = new Map([
  ['TABLE', { items: TBL_ITEMS, name: '<TABLE>' }],
  ['TD', { items: CELL_ITEMS, name: '<TD>' }],
  ['FONT', { items: FONT_ITEMS, name: '<FONT>' }],
  ['IMG', { items: IMG_ITEMS, name: '<IMG>' }],
  ['BR', { items: BR_ITEMS, name: '<BR>' }],
]);

/**
 * `doAttrs` for one element: run each attribute through its handler in
 * document order. Elements without a table (TR, B, I, ..., HR, VR, HTML) take
 * their attributes untouched, as C never looks at them.
 * @see lib/common/htmllex.c:doAttrs
 */
export function checkAttrs(tag: string, pairs: readonly AttrEntry[]): CheckedAttrs {
  const el = ELEMENTS.get(tag);
  const attrs: Record<string, string> = {};
  const warnings: string[] = [];
  let warn = false;
  for (const [name, value] of pairs) {
    const key = lower(name);
    if (el === undefined) {
      attrs[key] = value;
      continue;
    }
    const handler = el.items.get(key);
    if (handler === undefined) {
      warnings.push(warning(`Illegal attribute ${name} in ${el.name} - ignored\n`));
      warn = true;
      continue;
    }
    const r = handler(value);
    warnings.push(...r.text);
    warn ||= r.warn;
    if (r.keep !== undefined) attrs[key] = r.keep;
  }
  return { attrs, warnings, warn };
}

// ---------------------------------------------------------------------------
// stderr emulation
// ---------------------------------------------------------------------------

/**
 * C's stderr as messages: a write ending in a newline goes to `writeLine`
 * (newline dropped, embedded newlines kept), while a message without one stays
 * pending so the next write continues it. `flush` emits a pending message.
 */
export class StderrLines {
  private pending = '';

  constructor(private readonly writeLine: (line: string) => void) {}

  write(text: string): void {
    this.pending += text;
    if (!this.pending.endsWith('\n')) return;
    const line = this.pending.slice(0, -1);
    this.pending = '';
    this.writeLine(line);
  }

  flush(): void {
    if (this.pending === '') return;
    this.writeLine(this.pending);
    this.pending = '';
  }
}

/** A finished stderr line on the console channel the port uses for it. */
export const consoleLine = (line: string): void => {
  if (line.startsWith('Warning')) console.warn(line);
  else console.error(line);
};

/** One label's stderr: what make_html_label and make_label print, in order. */
export const labelStderr = (): StderrLines => new StderrLines(consoleLine);

/** agerr of one newline-terminated message: to `out`, or the console when there is none. */
export const agerrLine = (out: StderrLines | undefined, msg: string): void => {
  if (out === undefined) consoleLine(msg);
  else out.write(`${msg}\n`);
};
