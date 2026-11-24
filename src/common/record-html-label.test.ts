// SPDX-License-Identifier: EPL-2.0
/**
 * A record or Mrecord node with an HTML-like label (issue #195). make_label's
 * is_record branch keeps the raw text, sets `html` and measures nothing;
 * parse_reclbl then treats `<` and `>` as text and builds every field label
 * with `lbl->html`, so each field is an HTML label sized by the HTML layout.
 * The same branch is why a record label is never measured whole (#218).
 *
 * Every native ref is the carried oracle's own output (ADR-0003), written by
 * the harness's `recapture.sh`: `-Kdot -Txdot`, `-Kosage -Txdot` and
 * `-Kdot -Tplain` stdout, and `-Kdot -Tdot` stderr, per in-scope probe. What
 * each probe reaches is in the harness's `survey.md`.
 * @see lib/common/labels.c:make_label
 * @see lib/common/shapes.c:parse_reclbl
 * @see lib/common/shapes.c:record_init
 * @see lib/common/shapes.c:gen_fields
 * @see lib/common/output.c:write_plain
 */
import { readdirSync, readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { renderFormat } from '../../test/helpers/render-format.js';
import { agseterrf } from './agerr.js';
import type { EngineName } from '../gvc/context.js';
import { parse } from '../parser/index.js';
import { HTML_STRING_MARK } from './html-string.js';
import { makeRecordLabel } from './make-label.js';
import { parseReclbl } from './record.js';
import type { TextMeasurer } from './textmeasure.js';

const HARNESS_195 = new URL('../../plans/issue-195-record-html-label/harness/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, HARNESS_195), 'utf8');
const source = (name: string): string => read(`probes/${name}.gv`);
const native = (name: string, suffix: string): string => read(`native/${name}.${suffix}`);

/** Out of scope: #269, and the follow-ups filed at planning (survey.md). */
const OUT_OF_SCOPE_PREFIX = 'oos-';
const PROBE_COUNT = 14;
const PROBES = readdirSync(new URL('probes/', HARNESS_195))
  .filter((f) => f.endsWith('.gv') && !f.startsWith(OUT_OF_SCOPE_PREFIX))
  .map((f) => f.replace(/\.gv$/, ''))
  .sort();

const FONT = { fontname: 'Times-Roman', fontsize: 14, fontcolor: 'black' };

/** Render `name` and return the output with every message the engine raised. */
const renderWithMessages = (
  name: string, format: string, engine: EngineName,
): { out: string; err: string } => {
  const messages: string[] = [];
  agseterrf((s) => { messages.push(s); return 0; });
  const out = renderFormat(parse(source(name)), format, engine);
  return { out, err: messages.join('') };
};

afterEach(() => { agseterrf(null); });

describe('a record node with an html-like label is laid out as native lays it out', () => {
  it('reads every in-scope probe of the harness', () => {
    expect(PROBES).toHaveLength(PROBE_COUNT);
  });

  it('repro: native sizes the node from its two tables', () => {
    const want = native('repro', 'dot.xdot');
    expect(want).toContain('bb="0,0,81.304,66.6"');
    expect(want).toContain('height=0.925');
    expect(want).toContain('width=1.1292');
  });

  it.each(PROBES)('%s: -Kdot -Txdot', (name) => {
    expect(renderWithMessages(name, 'xdot', 'dot').out).toBe(native(name, 'dot.xdot'));
  });

  it.each(PROBES)('%s: -Kosage -Txdot', (name) => {
    expect(renderWithMessages(name, 'xdot', 'osage').out).toBe(native(name, 'osage.xdot'));
  });

  it.each(PROBES)('%s: -Kdot -Tplain', (name) => {
    expect(renderWithMessages(name, 'plain', 'dot').out).toBe(native(name, 'dot.plain'));
  });

  it.each(PROBES)('%s: stderr', (name) => {
    expect(renderWithMessages(name, 'dot', 'dot').err).toBe(native(name, 'dot.err'));
  });
});

describe('makeRecordLabel ports make_label\'s is_record branch', () => {
  const html = (s: string): string => HTML_STRING_MARK + s;

  it('keeps an html value\'s markup as the text and sets html', () => {
    const lp = makeRecordLabel(html('<B>a</B>|b'), FONT);
    expect(lp.text).toBe('<B>a</B>|b');
    expect(lp.html).toBe(true);
  });

  it('drops html intent for an empty html value (labels.c:119)', () => {
    const lp = makeRecordLabel(html(''), FONT);
    expect(lp.text).toBe('');
    expect(lp.html).toBe(false);
  });

  it('measures nothing: dimen is zero and there are no spans', () => {
    const lp = makeRecordLabel('x\ty|z', FONT);
    expect(lp.text).toBe('x\ty|z');
    expect(lp.html).toBe(false);
    expect(lp.dimen).toEqual({ x: 0, y: 0 });
    expect(lp.u).toEqual({ kind: 'txt', span: [], nspans: 0 });
  });
});

describe('parse_reclbl builds each field label with lbl->html', () => {
  const measurer: TextMeasurer = { measure: () => ({ w: 10, h: 10 }) };

  it('a field of an html record is an html label', () => {
    const lbl = makeRecordLabel(HTML_STRING_MARK + '<B>a</B>|b', FONT);
    const info = parseReclbl({ s: lbl.text, i: 0, lbl, measurer }, 1, true)!;
    expect(info.n_flds).toBe(2);
    expect(info.fld![0]!.id).toBeNull();
    expect(info.fld![0]!.lp!.html).toBe(true);
    expect(info.fld![0]!.lp!.u.kind).toBe('html');
  });
});
