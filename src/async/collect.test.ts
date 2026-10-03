// SPDX-License-Identifier: EPL-2.0
import { afterEach, describe, expect, it } from 'vitest';

import { collectResources, type FontRequest } from './collect.js';
import { renderSvg } from '../index.js';
import { parse } from '../parser/index.js';
import { setTextMeasurer } from '../common/textmeasure-factory.js';
import { canvasFont } from '../common/css-font.js';
import type { TextMeasurer, TextSize, TextVariantFlags } from '../common/textmeasure.js';
import type { EngineName } from '../gvc/context.js';

const NO_IMAGES = { inlineImages: false } as const;
const WITH_IMAGES = { inlineImages: true } as const;
const DEFAULT_FACE = 'Times,serif';
const DEFAULT_SIZE = 14;
const BOLD = { bold: true, italic: false } as const;

const collect = (src: string, inlineImages = false): ReturnType<typeof collectResources> =>
  collectResources(parse(src), { inlineImages });

const keyOf = (f: FontRequest): string => canvasFont(f.fontname, f.fontsize, f.flags);
const keysOf = (fonts: readonly FontRequest[]): string[] => fonts.map(keyOf);

/** Records every measure() request, delegating to a fixed-size answer. */
class RecordingMeasurer implements TextMeasurer {
  readonly seen = new Map<string, string>();
  measure(text: string, fontname: string, fontsize: number, flags?: TextVariantFlags): TextSize {
    this.seen.set(canvasFont(fontname, fontsize, flags), `${fontname}|${fontsize}`);
    return { w: text.length * 7, h: fontsize * 1.2 };
  }
}

afterEach(() => setTextMeasurer(undefined));

describe('collectResources: fonts', () => {
  it('collects node fonts and Graphviz defaults for an unstyled edge, deduped', () => {
    const r = collect('digraph { a [fontname=Helvetica fontsize=12]; b [fontname=Helvetica fontsize=12]; a -> b [label=x] }');
    expect(r.fonts).toEqual([
      { fontname: 'Helvetica', fontsize: 12 },
      { fontname: DEFAULT_FACE, fontsize: DEFAULT_SIZE },
    ]);
  });

  it('honours node defaults, root and cluster label inheritance', () => {
    const r = collect(`digraph { fontname=Courier; fontsize=20; label=Root;
      node [fontname=Arial fontsize=9];
      subgraph cluster_a { label=C; fontsize=11; a } }`);
    const keys = keysOf(r.fonts);
    expect(keys).toContain(canvasFont('Courier', 20));
    expect(keys).toContain(canvasFont('Courier', 11));
    expect(keys).toContain(canvasFont('Arial', 9));
  });

  it('applies the labelfont fallback chain to head and tail labels', () => {
    const r = collect('digraph { a -> b [fontname=Helvetica fontsize=10 headlabel=h taillabel=t labelfontsize=7] }');
    expect(keysOf(r.fonts)).toEqual([canvasFont(DEFAULT_FACE, DEFAULT_SIZE), canvasFont('Helvetica', 7)]);
  });

  it('collects xlabel fonts for nodes and edges', () => {
    const r = collect('digraph { a [xlabel=x fontname=Verdana fontsize=8]; a -> b [xlabel=y fontname=Georgia] }');
    expect(keysOf(r.fonts)).toEqual(expect.arrayContaining([
      canvasFont('Verdana', 8), canvasFont('Georgia', DEFAULT_SIZE),
    ]));
  });

  it('collects HTML FONT/B/I variants with label font inheritance', () => {
    const r = collect('digraph { a [fontname=Helvetica fontsize=12 label=<<FONT FACE="Arial" POINT-SIZE="9"><B>x</B></FONT><I>y</I>>] }');
    expect(r.fonts).toContainEqual({ fontname: 'Arial', fontsize: 9, flags: BOLD });
    expect(r.fonts).toContainEqual({
      fontname: 'Helvetica', fontsize: 12, flags: { bold: false, italic: true },
    });
    expect(r.fonts).toHaveLength(2);
  });

  it('walks nested tables and cells', () => {
    const r = collect('digraph { a [shape=none label=<<TABLE><TR><TD><TABLE><TR><TD><FONT FACE="Mono" POINT-SIZE="6">z</FONT></TD></TR></TABLE></TD></TR></TABLE>>] }');
    expect(r.fonts).toEqual([{ fontname: 'Mono', fontsize: 6 }]);
  });

  it('does not throw on a malformed HTML label and falls back to the label font', () => {
    const r = collect('digraph { a [fontname=Helvetica label=<text<TABLE><TR><TD>a</TD></TR></TABLE>>] }');
    expect(keysOf(r.fonts)).toEqual([canvasFont('Helvetica', DEFAULT_SIZE)]);
  });

  it('skips empty labels', () => {
    expect(collect('digraph { a [label=""] }').fonts).toEqual([]);
  });
});

describe('collectResources: images', () => {
  const SRC = 'digraph { a [image="b.png"]; c [label=<<TABLE><TR><TD><IMG SRC="a.png"/></TD></TR></TABLE>>] }';

  it('lists HTML IMG sources for sizing and nothing for bytes without inlineImages', () => {
    const r = collectResources(parse(SRC), NO_IMAGES);
    expect(r.sizeSrcs).toEqual(['a.png']);
    expect(r.bytesSrcs).toEqual([]);
  });

  it('adds image= and IMG sources to bytesSrcs with inlineImages', () => {
    const r = collectResources(parse(SRC), WITH_IMAGES);
    expect(r.sizeSrcs).toEqual(['a.png']);
    expect([...r.bytesSrcs].sort()).toEqual(['a.png', 'b.png']);
  });

  it('dedupes repeated sources', () => {
    const r = collect('digraph { a [image="x.png"]; b [image="x.png"] }', true);
    expect(r.bytesSrcs).toEqual(['x.png']);
  });
});

const SWEEP_GRAPHS: readonly string[] = [
  'digraph { a -> b }',
  `digraph { label="Root" fontname=Helvetica; node [fontname="Times-Roman" fontsize=11];
    subgraph cluster_x { label="Cl" fontsize=9 fontname="Courier New"; a; b }
    a -> b [label=e headlabel=h taillabel=t xlabel=ex labelfontname=Arial labelfontsize=8];
    c [xlabel=nx fontname="Helvetica-Bold"] }`,
  `digraph { node [shape=none];
    a [label=<<TABLE><TR><TD><FONT FACE="Arial" POINT-SIZE="9"><B>bo<I>ld</I></B></FONT></TD>
      <TD><U>u</U><BR/>second<BR/><BR/>third</TD></TR></TABLE>>];
    a -> b [label=<<I>it</I> <FONT POINT-SIZE="20">big</FONT>> headlabel=<<B>H</B>>] }`,
  'digraph { r [shape=record label="{a|b}|c" fontname=Courier fontsize=10]; r -> p }',
  'graph { a -- b [label="two\\nlines\\lleft"]; subgraph cluster_n { subgraph cluster_m { label=in; z } } }',
];
const ENGINES: readonly EngineName[] = ['dot', 'neato', 'fdp', 'circo', 'twopi', 'osage'];

describe('collectResources: parity with the measurer', () => {
  for (const [i, src] of SWEEP_GRAPHS.entries()) {
    for (const engine of ENGINES) {
      it(`covers every face measured by the sync pipeline (graph ${i}, ${engine})`, () => {
        const rec = new RecordingMeasurer();
        setTextMeasurer(rec);
        renderSvg(src, engine);
        const wanted = new Set(keysOf(collectResources(parse(src), NO_IMAGES).fonts));
        expect(rec.seen.size).toBeGreaterThan(0);
        expect([...rec.seen.keys()].filter((k) => !wanted.has(k))).toEqual([]);
      });
    }
  }
});
