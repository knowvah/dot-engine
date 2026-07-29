// SPDX-License-Identifier: EPL-2.0

/**
 * Branch-coverage suite for src/render/map.ts (T2c).
 *
 * Complements map.test.ts/map-renderers.test.ts (happy-path API + direct
 * ObjState wiring). This file adds: printG5/agstrcanonText edge cases (pure
 * functions, hand-driven), plainNodeLabel/plainNodeAttrs HTML/record/shapefile
 * variants, and full parse()+layout()+render() pipeline tests for the
 * MapRendererBase methods (beginCluster, emitMapRect via HTML cell hotspots,
 * emitEdge whole-edge outline + head/tail/center/xlabel anchors) and the
 * cmapx/imap URL-attribute plumbing (mapGraphName, graphAttr, graphMapUrl,
 * buildMapCtx dpi variants).
 */

import { describe, it, expect } from 'vitest';
import {
  printG5,
  agstrcanon,
  agstrcanonText,
  plainNodeFill,
  plainNodeAttrs,
  writePlainEdge,
  writePlainEdgeHead,
  writePlain,
  writeCmapxGraphShape,
  mapCmapxAttrs,
  ImapRenderer,
  ImapNpRenderer,
  CmapxRenderer,
  CmapxNpRenderer,
  graphMapUrl,
  buildMapCtx,
} from './map.js';
import { parse } from '../parser/index.js';
import { createDefaultContext } from '../gvc/default-context.js';
import { renderFormat } from '../../test/helpers/render-format.js';
import { Graph } from '../model/graph.js';
import { Edge } from '../model/edge.js';
import type { Point } from '../model/geom.js';
import type { TextlabelT, ShapeDesc } from '../common/types.js';
import { ShapeKind } from '../common/types.js';
import { isHtmlValue, HTML_STRING_MARK } from '../common/html-string.js';
import { makeJob, makeObjState, makeGraph, makeNode } from './map-test-helpers.js';

// ---------------------------------------------------------------------------
// Avoid Lizard quote-tracker bug: never put " inside string literals.
// ---------------------------------------------------------------------------

const DQ = '\x22';

/** Parse and run a real layout — `plainNodeLabel`/`plainNodeAttrs` read
 * `n.info.label`/`n.info.shape`, which are populated during layout, not
 * parsing. */
function parseAndLayout(src: string): Graph {
  const g = parse(src);
  createDefaultContext().layout(g, 'dot');
  return g;
}

// ---------------------------------------------------------------------------
// printG5 — special values, subnormal/large-exponent expansion, rounding
// ---------------------------------------------------------------------------

describe('printG5 — special and edge-case values', () => {
  it('formats zero as "0"', () => {
    expect(printG5(0)).toBe('0');
  });

  it('formats -0 the same as 0 (v===0 branch, not the sign branch)', () => {
    expect(printG5(-0)).toBe('0');
  });

  it('formats +Infinity/-Infinity/NaN via String() fallback', () => {
    expect(printG5(Infinity)).toBe('Infinity');
    expect(printG5(-Infinity)).toBe('-Infinity');
    expect(printG5(NaN)).toBe('NaN');
  });

  it('formats a negative value with a leading minus sign', () => {
    expect(printG5(-1.5)).toBe('-1.5');
  });

  it('rounds an exact .x5 tie to EVEN, not away from zero (78498/72 = 1090.25)', () => {
    // 1090.25 -> 5 sig figs "10902"|"5" tie; last kept digit '2' is even -> stays.
    expect(printG5(1090.25)).toBe('1090.2');
  });

  it('rounds an exact .x5 tie UP when the kept digit is odd (1090.75 -> 1090.8)', () => {
    expect(printG5(1090.75)).toBe('1090.8');
  });

  it('rounds up when the digit after the 5th is > 5', () => {
    expect(printG5(1.23456)).toBe('1.2346');
  });

  it('the smallest representable subnormal double (expBits===0) formats without throwing', () => {
    // Number.MIN_VALUE (5e-324) is the one double whose exponent field is
    // literally all-zero (subnormal), exercising exactDecimalDigits' m/e
    // subnormal branch (mant without the implicit leading 1 bit).
    const out = printG5(Number.MIN_VALUE);
    expect(typeof out).toBe('string');
    expect(out).toContain('e-');
  });

  it('a value >= 1e5 (exp >= P) formats in exponential notation', () => {
    expect(printG5(123456)).toBe('1.2346e+05');
  });

  it('a value < 1e-4 (exp < -4) formats in exponential notation with negative exponent', () => {
    expect(printG5(0.0000123456)).toBe('1.2346e-05');
  });

  it('rounding up to a new leading digit increments the exponent (99999.6 -> 1e+05)', () => {
    expect(printG5(99999.6)).toBe('1e+05');
  });

  it('an exponent with 2+ digits omits the leading zero pad', () => {
    expect(printG5(1.5e120)).toBe('1.5e+120');
  });

  it('a whole-number result pads trailing zeros without a decimal point (exp >= sig.length-1)', () => {
    expect(printG5(100000000)).toBe('1e+08');
    expect(printG5(12000)).toBe('12000');
  });

  it('a fractional value with exp >= 0 places the decimal point mid-digits', () => {
    expect(printG5(12.345)).toBe('12.345');
  });

  it('a value < 1 with exp < 0 left-pads zeros after the decimal point', () => {
    expect(printG5(0.0012345)).toBe('0.0012345');
  });
});

// ---------------------------------------------------------------------------
// plainCoord parity check (already covered by map.test.ts; no new branches)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// agstrcanonText — quoting / escaping / numeral / line-break state machine
// ---------------------------------------------------------------------------

describe('agstrcanonText — quoting decisions', () => {
  it('empty string canonicalizes to an empty quoted pair', () => {
    expect(agstrcanonText('')).toBe(DQ + DQ);
  });

  it('a plain identifier needs no quotes (returned verbatim)', () => {
    expect(agstrcanonText('plainName')).toBe('plainName');
  });

  it('a name containing a space needs quotes', () => {
    expect(agstrcanonText('has space')).toBe(DQ + 'has space' + DQ);
  });

  it('a quote character is escaped and forces quoting', () => {
    expect(agstrcanonText('a' + DQ + 'b')).toBe(DQ + 'a\\' + DQ + 'b' + DQ);
  });

  it('a recognized escape sequence (\\n) is passed through and forces quoting', () => {
    // '\n' as the two literal characters backslash+n is a recognized escString
    // escape (isEscapeAt), distinct from an actual newline byte.
    expect(agstrcanonText('a\\nb')).toBe(DQ + 'a\\nb' + DQ);
  });

  it('a numeral string (digits only) needs no quotes', () => {
    expect(agstrcanonText('12345')).toBe('12345');
  });

  it('a numeral with one leading minus and one dot stays unquoted', () => {
    expect(agstrcanonText('-12.5')).toBe('-12.5');
  });

  it('a second dot breaks the numeral state and forces quoting', () => {
    expect(agstrcanonText('1.2.3')).toBe(DQ + '1.2.3' + DQ);
  });

  it('a minus after the first character breaks the numeral state and forces quoting', () => {
    expect(agstrcanonText('1-2')).toBe(DQ + '1-2' + DQ);
  });

  it('a non-digit after a numeral prefix breaks the numeral state and forces quoting', () => {
    expect(agstrcanonText('12a')).toBe(DQ + '12a' + DQ);
  });

  it('a lone "." is the single-char numeral special case and stays quoted', () => {
    expect(agstrcanonText('.')).toBe(DQ + '.' + DQ);
  });

  it('a lone "-" is the single-char numeral special case and stays quoted', () => {
    expect(agstrcanonText('-')).toBe(DQ + '-' + DQ);
  });

  it('underscore and non-ASCII bytes are id-chars and need no quotes', () => {
    expect(agstrcanonText('a_b')).toBe('a_b');
    expect(agstrcanonText('café')).toBe('café');
  });

  it('a DOT keyword (case-insensitive) is quoted for protection', () => {
    for (const kw of ['node', 'Edge', 'STRICT', 'graph', 'digraph', 'subgraph']) {
      expect(agstrcanonText(kw)).toBe(DQ + kw + DQ);
    }
  });

  it('a non-keyword identifier that merely contains a keyword substring stays unquoted', () => {
    expect(agstrcanonText('nodeX')).toBe('nodeX');
  });

  it('a long (>128 byte) id-char run inserts a line-break backslash after a non-id char', () => {
    // The break only fires right after a non-id-char output byte followed by
    // an id-char input byte (write.c:170-190) — an all-id-char run alone
    // never satisfies `canBreak`, so a space at the threshold is required.
    const long = 'a'.repeat(128) + ' ' + 'b'.repeat(5);
    const out = agstrcanonText(long);
    expect(out).toContain('\\\n');
  });
});

describe('agstrcanon — HTML value passthrough vs plain canonicalization', () => {
  it('an HTML-marked value is emitted angle-bracket delimited, unescaped', () => {
    const html = HTML_STRING_MARK + '<TABLE><TR><TD>x</TD></TR></TABLE>';
    expect(isHtmlValue(html)).toBe(true);
    expect(agstrcanon(html)).toBe('<<TABLE><TR><TD>x</TD></TR></TABLE>>');
  });

  it('a plain (non-HTML) value canonicalizes via agstrcanonText', () => {
    expect(agstrcanon('plain value')).toBe(DQ + 'plain value' + DQ);
  });
});

// ---------------------------------------------------------------------------
// plainNodeLabel (via plainNodeAttrs) — HTML label, HTML-parse-failure
// fallback, record shape, and plain default-to-name branches.
// ---------------------------------------------------------------------------

describe('plainNodeAttrs — label branch: HTML label re-wrapped in <...>', () => {
  it('a valid HTML label prints the raw markup delimited by angle brackets', () => {
    const g = parseAndLayout('digraph G { a [label=<<TABLE><TR><TD>hi</TD></TR></TABLE>>]; }');
    const a = g.nodes.get('a')!;
    expect((a.info.label as TextlabelT | undefined)?.u.kind).toBe('html');
    const attrs = plainNodeAttrs(a, g);
    expect(attrs.label).toBe('<<TABLE><TR><TD>hi</TD></TR></TABLE>>');
  });
});

describe('plainNodeAttrs — label branch: malformed HTML falls back to quoted raw markup', () => {
  it('malformed HTML markup prints the quoted raw source, not empty', () => {
    const g = parseAndLayout('digraph G { a [label=<<unclosed>>]; }');
    const a = g.nodes.get('a')!;
    expect((a.info.label as TextlabelT | undefined)?.u.kind).toBe('txt');
    const raw = a.attrs.get('label')!;
    expect(isHtmlValue(raw)).toBe(true);
    const attrs = plainNodeAttrs(a, g);
    expect(attrs.label).toBe(agstrcanonText('<unclosed>'));
  });
});

describe('plainNodeAttrs — label branch: record shape keeps unsubstituted source', () => {
  it('a record label prints the raw field-separator source, not the rendered text', () => {
    const g = parseAndLayout('digraph G { a [shape=record, label="f0|f1"]; }');
    const a = g.nodes.get('a')!;
    expect((a.info.shape as ShapeDesc | undefined)?.kind).toBe(ShapeKind.SH_RECORD);
    const attrs = plainNodeAttrs(a, g);
    expect(attrs.label).toBe(agstrcanonText('f0|f1'));
  });

  it('a record node with no explicit label defaults to \\N', () => {
    const g = parseAndLayout('digraph G { a [shape=record]; }');
    const a = g.nodes.get('a')!;
    const attrs = plainNodeAttrs(a, g);
    expect(attrs.label).toBe(agstrcanonText('\\N'));
  });
});

describe('plainNodeAttrs — shapefile forces shape name to "custom"', () => {
  it('a non-epsf shapefile overrides the shape name to custom', () => {
    const g = parseAndLayout('digraph G { a [shapefile="x.png"]; }');
    const a = g.nodes.get('a')!;
    const attrs = plainNodeAttrs(a, g);
    expect(attrs.shape).toBe('custom');
  });

  it('shape=epsf with a shapefile keeps the epsf shape name', () => {
    const g = parseAndLayout('digraph G { a [shape=epsf, shapefile="x.eps"]; }');
    const a = g.nodes.get('a')!;
    const attrs = plainNodeAttrs(a, g);
    expect(attrs.shape).toBe('epsf');
  });
});

// ---------------------------------------------------------------------------
// writePlainEdge — port suffixes and edge label position
// ---------------------------------------------------------------------------

describe('writePlainEdge — plain-ext ports and edge label', () => {
  it('extend=true reads tailport/headport attrs into the edge line', () => {
    const g = makeGraph();
    const a = makeNode(g, 'A');
    const b = makeNode(g, 'B');
    const e = new Edge(a, b, '');
    e.attrs.set('tailport', 'nw');
    e.attrs.set('headport', 'se');
    e.info.spl = {
      list: [{
        list: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
        size: 2, sflag: 0, eflag: 0, sp: { x: 0, y: 0 }, ep: { x: 0, y: 0 },
      }],
      size: 1, bb: { ll: { x: 0, y: 0 }, ur: { x: 10, y: 10 } },
    };
    const buf: string[] = [];
    writePlainEdge(e, true, buf);
    expect(buf.join('')).toContain('A:nw');
    expect(buf.join('')).toContain('B:se');
  });

  it('an edge label appends canonicalized text and position', () => {
    const g = makeGraph();
    const a = makeNode(g, 'A');
    const b = makeNode(g, 'B');
    const e = new Edge(a, b, '');
    e.info.label = {
      text: 'EL', pos: { x: 72, y: 36 },
    } as unknown as TextlabelT;
    const buf: string[] = [];
    writePlainEdge(e, false, buf);
    const out = buf.join('');
    expect(out).toContain(agstrcanonText('EL'));
    expect(out).toContain('1 0.5');
  });
});

describe('writePlainEdge — extend=true with no port attrs set falls back to empty ports', () => {
  it('tailport/headport default to empty string when absent', () => {
    const g = makeGraph();
    const a = makeNode(g, 'A');
    const b = makeNode(g, 'B');
    const e = new Edge(a, b, '');
    e.info.spl = {
      list: [{
        list: [{ x: 0, y: 0 }], size: 1, sflag: 0, eflag: 0,
        sp: { x: 0, y: 0 }, ep: { x: 0, y: 0 },
      }],
      size: 1, bb: { ll: { x: 0, y: 0 }, ur: { x: 0, y: 0 } },
    };
    const buf: string[] = [];
    writePlainEdge(e, true, buf);
    expect(buf.join('')).toContain('edge A B 1');
  });
});

// ---------------------------------------------------------------------------
// writeNodeAndPort (via writePlainEdgeHead) — clustnode proxy name rewriting
// ---------------------------------------------------------------------------

describe('writePlainEdgeHead — clustnode proxy endpoint name rewriting', () => {
  it('a clustnode name containing a colon prints only the cluster-name suffix', () => {
    const g = makeGraph();
    const proxy = makeNode(g, '__1:cluster_0');
    proxy.info.clustnode = true;
    const b = makeNode(g, 'B');
    const e = new Edge(proxy, b, '');
    const buf: string[] = [];
    writePlainEdgeHead(e, '', '', [{ x: 0, y: 0 }] as Point[], buf);
    expect(buf.join('')).toContain(' cluster_0 B');
  });

  it('a clustnode name with no colon prints the name unchanged', () => {
    const g = makeGraph();
    const proxy = makeNode(g, 'clustnodeNoColon');
    proxy.info.clustnode = true;
    const b = makeNode(g, 'B');
    const e = new Edge(proxy, b, '');
    const buf: string[] = [];
    writePlainEdgeHead(e, '', '', [{ x: 0, y: 0 }] as Point[], buf);
    expect(buf.join('')).toContain(' clustnodeNoColon B');
  });
});

// ---------------------------------------------------------------------------
// writePlain — clustnode skip
// ---------------------------------------------------------------------------

describe('writePlain — clustnode proxies get no node line', () => {
  it('a node flagged clustnode is skipped from the node-line pass', () => {
    const g = makeGraph();
    const n = makeNode(g, 'A');
    n.info.clustnode = true;
    const job = makeJob();
    writePlain(g, job, false);
    const out = job.output.join('');
    expect(out).not.toContain('node A');
  });
});

// ---------------------------------------------------------------------------
// writeCmapxGraphShape — obj with url and non-empty map points
// ---------------------------------------------------------------------------

describe('writeCmapxGraphShape — emits when obj has map points', () => {
  it('emits an <area> for the root graph hot spot', () => {
    const job = makeJob();
    const obj = makeObjState();
    obj.url = 'http://g.example';
    obj.urlMapPts = [{ x: 0, y: 80 }, { x: 152, y: 0 }] as Point[];
    job.pushObj(obj);
    const buf: string[] = [];
    writeCmapxGraphShape(job, buf);
    const out = buf.join('');
    expect(out).toContain('<area shape=' + DQ + 'rect' + DQ);
    expect(out).toContain('href=' + DQ + 'http://g.example' + DQ);
  });
});

// ---------------------------------------------------------------------------
// mapCmapxAttrs — individual attr presence (id-only / href-only / etc.)
// ---------------------------------------------------------------------------

describe('mapCmapxAttrs — individual attrs', () => {
  it('id only', () => {
    const buf: string[] = [];
    mapCmapxAttrs({ url: '', tooltip: '', target: '', id: 'n1' }, buf);
    expect(buf.join('')).toBe(' id=' + DQ + 'n1' + DQ);
  });
  it('href only', () => {
    const buf: string[] = [];
    mapCmapxAttrs({ url: 'http://x', tooltip: '', target: '', id: '' }, buf);
    expect(buf.join('')).toBe(' href=' + DQ + 'http://x' + DQ);
  });
  it('target only', () => {
    const buf: string[] = [];
    mapCmapxAttrs({ url: '', tooltip: '', target: '_blank', id: '' }, buf);
    expect(buf.join('')).toBe(' target=' + DQ + '_blank' + DQ);
  });
  it('tooltip only', () => {
    const buf: string[] = [];
    mapCmapxAttrs({ url: '', tooltip: 'tip', target: '', id: '' }, buf);
    expect(buf.join('')).toBe(' title=' + DQ + 'tip' + DQ);
  });
});

// ---------------------------------------------------------------------------
// mapGraphName / graphAttr / graphMapUrl
// ---------------------------------------------------------------------------

describe('graphMapUrl — root graph href/URL with parent-scope walk', () => {
  it('returns null when no href/URL attr is set anywhere', () => {
    const g = parse('digraph G { a; }');
    expect(graphMapUrl(g)).toBeNull();
  });

  it('resolves href set directly on the root graph', () => {
    const g = parse('digraph G { href="http://root.example"; a; }');
    expect(graphMapUrl(g)).toBe('http://root.example');
  });

  it('falls back to URL when href is absent', () => {
    const g = parse('digraph G { URL="http://url.example"; a; }');
    expect(graphMapUrl(g)).toBe('http://url.example');
  });
});

// ---------------------------------------------------------------------------
// buildMapCtx — dpi override vs default 96
// ---------------------------------------------------------------------------

describe('buildMapCtx — dpi/resolution override', () => {
  it('an explicit dpi attr scales devscale accordingly', () => {
    const g = makeGraph();
    g.attrs.set('dpi', '150');
    const job = makeJob();
    job.pad = { x: 4, y: 4 };
    const ctx = buildMapCtx(g, job, true);
    expect(ctx.scale).toBeCloseTo(150 / 72, 6);
  });

  it('resolution attr is used when dpi is absent', () => {
    const g = makeGraph();
    g.attrs.set('resolution', '150');
    const job = makeJob();
    job.pad = { x: 4, y: 4 };
    const ctx = buildMapCtx(g, job, true);
    expect(ctx.scale).toBeCloseTo(150 / 72, 6);
  });

  it('mapPolygon=false is threaded through', () => {
    const g = makeGraph();
    const job = makeJob();
    const ctx = buildMapCtx(g, job, false);
    expect(ctx.mapPolygon).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Full-pipeline cmapx rendering: node/cluster/edge URL hotspots, HTML cell
// hotspots (emitMapRect), and EMIT_CLUSTERS_LAST ordering.
// ---------------------------------------------------------------------------

function renderCmapx(src: string, np = false): string {
  const g = parse(src);
  return renderFormat(g, np ? 'cmapx-np' : 'cmapx');
}

describe('cmapx pipeline — node href hot spot', () => {
  it('a box-shaped node with href emits a rect <area> with its coords', () => {
    const out = renderCmapx('digraph G { a [shape=box, href="http://a.example"]; }');
    expect(out).toContain('<area shape=' + DQ + 'rect' + DQ);
    expect(out).toContain('href=' + DQ + 'http://a.example' + DQ);
  });

  it('an ellipse-shaped node with href emits a polygon <area>', () => {
    const out = renderCmapx('digraph G { a [href="http://a.example"]; }');
    expect(out).toContain('<area shape=' + DQ + 'poly' + DQ);
    expect(out).toContain('href=' + DQ + 'http://a.example' + DQ);
  });
});

describe('cmapx pipeline — cluster href hot spot (beginCluster)', () => {
  it('a cluster with href emits its own <area>', () => {
    const out = renderCmapx(
      'digraph G { subgraph cluster_0 { href="http://c.example"; a; } }',
    );
    expect(out).toContain('href=' + DQ + 'http://c.example' + DQ);
  });
});

describe('cmapx pipeline — root graph href hot spot (endGraph)', () => {
  it('a root graph with href emits the whole-drawing <area>', () => {
    const out = renderCmapx('digraph G { href="http://root.example"; a; }');
    expect(out).toContain('href=' + DQ + 'http://root.example' + DQ);
  });

  it('no root href/tooltip: no extra whole-drawing area beyond node areas', () => {
    const out = renderCmapx('digraph G { a; }');
    // Only the node's own area (if any) — root graph itself has no href here,
    // so no root-level href should appear anywhere in the output.
    expect(out).not.toContain('href=' + DQ + 'http://root.example' + DQ);
  });
});

describe('cmapx pipeline — HTML table cell href hot spot (emitMapRect)', () => {
  it('a TD HREF cell emits its own <area> nested before the enclosing anchor', () => {
    const out = renderCmapx(
      'digraph G { A [label=<<TABLE><TR><TD HREF="http://cell.example">go</TD></TR></TABLE>>]; }',
    );
    expect(out).toContain('href=' + DQ + 'http://cell.example' + DQ);
  });
});

describe('cmapx pipeline — whole-edge outline hot spot (emitEdge, mapPolygon)', () => {
  it('an edge with href emits polygon area(s) outlining its spline (cmapx, polygon-capable)', () => {
    const out = renderCmapx('digraph G { a -> b [href="http://edge.example"]; }');
    expect(out).toContain('shape=' + DQ + 'poly' + DQ);
    expect(out).toContain('href=' + DQ + 'http://edge.example' + DQ);
  });

  it('cmapx-np (no-polygon device) skips the whole-edge spline outline', () => {
    const out = renderCmapx('digraph G { a -> b [href="http://edge.example"]; }', true);
    expect(out).not.toContain('shape=' + DQ + 'poly' + DQ);
  });
});

describe('cmapx pipeline — edge label hot spots (center/xlabel/head/tail)', () => {
  const SRC = [
    'digraph G {',
    '  a -> b [href="http://edge.example",',
    '    label="EL", labelhref="http://lbl.example",',
    '    headlabel="HL", headhref="http://head.example",',
    '    taillabel="TL", tailhref="http://tail.example"];',
    '}',
  ].join('\n');

  it('emits a rect area for the center label', () => {
    const out = renderCmapx(SRC);
    expect(out).toContain('href=' + DQ + 'http://lbl.example' + DQ);
  });

  it('emits a rect area for the head label', () => {
    const out = renderCmapx(SRC);
    expect(out).toContain('href=' + DQ + 'http://head.example' + DQ);
  });

  it('emits a rect area for the tail label', () => {
    const out = renderCmapx(SRC);
    expect(out).toContain('href=' + DQ + 'http://tail.example' + DQ);
  });
});

describe('cmapx pipeline — explicit tooltip without url still opens a hot spot', () => {
  it('a node with only a tooltip (no href) still gets an <area> (explicit-tooltip gate)', () => {
    const out = renderCmapx('digraph G { a [tooltip="only a tip"]; }');
    expect(out).toContain('title=' + DQ + 'only a tip' + DQ);
  });

  it('an edge with only a tooltip (no href) still gets a whole-edge outline area', () => {
    const out = renderCmapx('digraph G { a -> b [tooltip="edge tip only"]; }');
    expect(out).toContain('shape=' + DQ + 'poly' + DQ);
    expect(out).toContain('title=' + DQ + 'edge tip only' + DQ);
  });
});

describe('cmapx pipeline — a placed edge label with no url/explicit-tooltip emits no label area', () => {
  it('label text with neither labelhref nor labeltooltip skips the label hot spot', () => {
    const out = renderCmapx('digraph G { a -> b [label="EL"]; }');
    // No href anywhere on the edge or its label -> zero <area> elements at all.
    expect(out).not.toContain('<area');
  });
});

// ---------------------------------------------------------------------------
// imap pipeline — `base referer` / `default <url>` and plain keyword lines
// ---------------------------------------------------------------------------

function renderImap(src: string, np = false): string {
  const g = parse(src);
  return renderFormat(g, np ? 'imap-np' : 'imap');
}

describe('imap pipeline — default line from root graph href', () => {
  it('emits `default <url>` when the root graph has an href', () => {
    const out = renderImap('digraph G { href="http://root.example"; a; }');
    expect(out).toContain('default http://root.example');
  });

  it('omits the default line when the root graph has no href', () => {
    const out = renderImap('digraph G { a; }');
    expect(out).not.toContain('default ');
  });
});

describe('imap pipeline — node rect line', () => {
  it('emits a rect keyword line for a box-shaped node with href', () => {
    const out = renderImap('digraph G { a [shape=box, href="http://a.example"]; }');
    expect(out).toContain('rect http://a.example');
  });
});

describe('imap-np pipeline — no polygon outline for edges', () => {
  it('an edge href produces no poly keyword line in the -np device', () => {
    const out = renderImap('digraph G { a -> b [href="http://edge.example"]; }', true);
    expect(out).not.toContain('poly http://edge.example');
  });
});

// ---------------------------------------------------------------------------
// Direct renderer instantiation: anonymous graph name in cmapx-np / imap-np
// ---------------------------------------------------------------------------

describe('ImapNpRenderer — default line uses graphMapUrl too', () => {
  it('emits `default <url>` from the root graph href', () => {
    const r = new ImapNpRenderer();
    const job = makeJob();
    const g = makeGraph();
    g.attrs.set('href', 'http://np.example');
    r.beginGraph(g, job);
    expect(job.output.join('')).toContain('default http://np.example');
  });
});

describe('CmapxNpRenderer — anonymous root graph name uses %1', () => {
  it('emits <map id="%1"> for an anonymous digraph', () => {
    const r = new CmapxNpRenderer();
    const job = makeJob();
    const g = new Graph('', 'directed', true);
    g.info.bb = { ll: { x: 0, y: 0 }, ur: { x: 144, y: 72 } };
    r.beginGraph(g, job);
    expect(job.output.join('')).toContain('<map id=' + DQ + '%1' + DQ);
  });
});
