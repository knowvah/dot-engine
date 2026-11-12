// SPDX-License-Identifier: EPL-2.0
//
// Node, edge-endpoint and graph/subgraph names print through agstrcanon as agwrite does
// (issue #167): wrapped at Max_outputline (128, or the root's `linelength`), quoted only when
// needed, keywords quoted, html names angle-bracketed. The refs under
// plans/issue-167-name-canon/harness are native 16.1.0's (regen.sh). Fixtures and refs are read as
// UTF-8: agstrcanon counts bytes, and names.gv carries a long Cyrillic name.
// @see lib/cgraph/write.c:write_nodename
// @see lib/cgraph/write.c:write_hdr
// @see lib/cgraph/write.c:write_canonstr
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../../parser/index.js';
import { createDefaultContext } from '../../gvc/default-context.js';
import { render as deviceRender } from '../../gvc/device.js';
import { HTML_STRING_MARK } from '../../common/html-string.js';

const HARNESS_167 = new URL('../../../plans/issue-167-name-canon/harness/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, HARNESS_167), 'utf8');
const CONTINUATION = '\\\n';
const FORMATS = ['dot', 'xdot'] as const;
type Fmt = (typeof FORMATS)[number];

const ref = (name: string, fmt: Fmt): string => read(`out/${name}.${fmt}`);

/** Lay out the harness source `name` with dot and render it in `fmt` on a fresh context. */
const renderRef = (name: string, fmt: Fmt): string => {
  const ctx = createDefaultContext();
  const g = parse(read(`${name}.gv`));
  ctx.layout(g, 'dot');
  return deviceRender(ctx, g, fmt);
};

describe('names longer than Max_outputline wrap as native does', () => {
  it.each(FORMATS)('default linelength, %s', (fmt) => {
    const out = renderRef('names', fmt);
    expect(out).toBe(ref('names', fmt));
    expect(out).toContain(CONTINUATION);
  });

  it.each(FORMATS)('linelength=70, %s', (fmt) => {
    expect(renderRef('names-ll', fmt)).toBe(ref('names-ll', fmt));
  });

  it.each(FORMATS)('linelength=0 never wraps, %s', (fmt) => {
    const out = renderRef('names-ll0', fmt);
    expect(out).toBe(ref('names-ll0', fmt));
    expect(out).not.toContain(CONTINUATION);
  });
});

describe('keyword, numeral, escaped, non-ascii and html names equal native', () => {
  it.each(FORMATS)('node, endpoint and subgraph names, %s', (fmt) => {
    const out = renderRef('odd', fmt);
    expect(out).toBe(ref('odd', fmt));
    expect(out).not.toContain(HTML_STRING_MARK);
  });
});

describe('root graph names equal native', () => {
  it.each(FORMATS)('a keyword is quoted, %s', (fmt) => {
    expect(renderRef('root-keyword', fmt)).toBe(ref('root-keyword', fmt));
  });

  // The root's name is interned before the graph exists, so it is plain text. @see scan.l:233
  it.each(FORMATS)('an html-like name prints as plain text, %s', (fmt) => {
    const out = renderRef('root-html', fmt);
    expect(out).toBe(ref('root-html', fmt));
    expect(out).not.toContain(HTML_STRING_MARK);
  });

  it.each(FORMATS)('a non-ascii name is bare, %s', (fmt) => {
    expect(renderRef('root-nonascii', fmt)).toBe(ref('root-nonascii', fmt));
  });
});
