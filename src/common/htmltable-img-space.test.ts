// SPDX-License-Identifier: EPL-2.0
/**
 * White space around `<IMG>` in a cell, end to end. A label whose strings
 * around the image are blank is drawn silently. A non-space string prints
 * htmlerror's two lines and make_label's continuation, and the label is still
 * drawn with its image, because the image rule reports without YYABORT.
 * Expected stderr is native dot 16.1.1's, byte for byte: with the image found
 * where a sizer is set, and from a directory without it where none is.
 *
 * @see lib/common/htmlparse.y:338-356
 * @see lib/common/htmllex.c:52-59
 * @see lib/common/htmltable.c:make_html_label
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderSvg, setImageSizer } from '../index.js';

const IMG = '<IMG SRC="2821.png"/>';
const node = (row: string): string =>
  `digraph G { Q [shape=plain label=<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0"><TR>${row}</TR></TABLE>>]; }`;

const BEFORE = 'Error: Syntax error: non-space string used before <IMG> in line 1 ';
const AFTER = 'Error: Syntax error: non-space string used after <IMG> in line 1 ';
const IN_LABEL = 'in label of node Q';
const MISSING = ['Warning: No such file or directory while opening 2821.png', 'Error: No or improper image file="2821.png"'];

interface Drawn {
  stderr: string[];
  /** `<image>` elements in the SVG. */
  images: number;
}

function draw(dot: string): Drawn {
  const stderr: string[] = [];
  const sink = (...a: unknown[]): void => { stderr.push(a.map(String).join(' ')); };
  vi.spyOn(console, 'error').mockImplementation(sink);
  vi.spyOn(console, 'warn').mockImplementation(sink);
  const svg = renderSvg(dot, 'dot');
  return { stderr, images: svg.match(/<image /g)?.length ?? 0 };
}

afterEach(() => {
  setImageSizer(null);
  vi.restoreAllMocks();
});

describe('white space around <IMG>, image found', () => {
  const found = (dot: string): Drawn => {
    setImageSizer(() => ({ w: 1, h: 1 }));
    return draw(dot);
  };

  it.each([
    ['after (2821_1)', `<TD>${IMG} </TD>`],
    ['before', `<TD> ${IMG}</TD>`],
    ['on both sides', `<TD>  ${IMG}  </TD>`],
  ])('draws the image silently with blanks %s', (_name, row) => {
    expect(found(node(row))).toEqual({ stderr: [], images: 1 });
  });

  it('draws 2821_1, whose edge label has a blank after the IMG', () => {
    const dot = `digraph G { B -> C [shape=plain label=<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0"> <TR><TD>${IMG} </TD></TR></TABLE>>]; }`;
    expect(found(dot)).toEqual({ stderr: [], images: 1 });
  });

  it('reports text before the IMG and still draws the image', () => {
    expect(found(node(`<TD>x ${IMG}</TD>`))).toEqual({
      stderr: [BEFORE, `... x ${IMG} ...`, IN_LABEL], images: 1,
    });
  });

  it('reports text after the IMG and still draws the image', () => {
    expect(found(node(`<TD>${IMG} y</TD>`))).toEqual({
      stderr: [AFTER, '...  y</TD> ...', IN_LABEL], images: 1,
    });
  });

  it('reports the first of two image-rule errors and draws both images', () => {
    expect(found(node(`<TD>x ${IMG}</TD><TD>${IMG} y</TD>`))).toEqual({
      stderr: [BEFORE, `... x ${IMG} ...`, IN_LABEL], images: 2,
    });
  });

  it('prints only the image-rule error when a syntax error follows, and the label is empty', () => {
    expect(found(node(`<TD>x ${IMG}</TD><TD>${IMG} <BR/></TD>`))).toEqual({
      stderr: [BEFORE, `... x ${IMG} ...`, IN_LABEL], images: 0,
    });
  });

  it('drops the label for a second IMG in the cell', () => {
    expect(found(node(`<TD>${IMG} ${IMG}</TD>`))).toEqual({
      stderr: ['Error: syntax error in line 1 ', `...  ${IMG} ...`, IN_LABEL], images: 0,
    });
  });
});

describe('white space around <IMG>, image missing', () => {
  it('sizes the image after a blank string and reports it missing', () => {
    expect(draw(node(`<TD>${IMG} </TD>`)).stderr).toEqual([...MISSING, IN_LABEL]);
  });

  it('prints the image-rule error before the sizing messages', () => {
    expect(draw(node(`<TD>${IMG} y</TD>`)).stderr).toEqual([AFTER, '...  y</TD> ...', ...MISSING, IN_LABEL]);
  });

  it('prints a later cell\'s lexer warning between the error and the sizing messages', () => {
    const dot = `digraph G { Q [shape=plain label=<<TABLE><TR><TD>x ${IMG}</TD><TD BOGUS="1">z</TD></TR></TABLE>>]; }`;
    expect(draw(dot).stderr).toEqual([
      BEFORE, `... x ${IMG} ...`, 'Warning: Illegal attribute BOGUS in <TD> - ignored', ...MISSING, IN_LABEL,
    ]);
  });
});
