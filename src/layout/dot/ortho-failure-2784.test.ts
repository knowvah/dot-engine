// SPDX-License-Identifier: EPL-2.0
//
// Corpus 2784 (graphviz tests/2784.dot, Gitlab #2784): splines=ortho on a
// layout whose rank sits at y = 1.08e18, so five node cells are zero-height
// and Seidel trapezoidation meets an invalid trapezoid. Graphviz 16.1 turns
// that into a failure chain (3c01aaeb4 → 3660b260e → 057e8779d → 312e49714 →
// 178fe6d2f → 8fd4b59ef): orthoEdges returns -1, dot_splines_ returns it,
// dotLayout/doDot fail, and dot_layout returns BEFORE dotneato_postprocess.
// Native still renders and exits 0 — the drawing just keeps its untranslated
// layout coordinates and has no edges.
//
// Expected data: __fixtures__/2784.native-16.1.svg and the stderr lines below
// are native 16.1.0 output (`GVBINDIR=/tmp/ghl dot -Tsvg tests/2784.dot`,
// exit status 0). 15.x instead printed 3x "add_segment: error" plus
// "failed at node N[0]" and translated the drawing (node cx 27, 99, ...).
//
// @see lib/dotgen/dotinit.c:dot_layout
// @see lib/dotgen/dotsplines.c:dot_splines_
// @see lib/ortho/ortho.c:orthoEdges

import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderSvg, parse } from '../../index.js';
import { createDefaultContext } from '../../gvc/default-context.js';

const SRC_2784 = readFileSync(new URL('./__fixtures__/2784.dot', import.meta.url), 'utf8');
const NATIVE_2784 = readFileSync(
  new URL('./__fixtures__/2784.native-16.1.svg', import.meta.url), 'utf8',
);

/** Native 16.1 stderr lines emitted by the ortho failure chain, in order. */
const ORTHO_FAILURE_LINES = [
  'trapezoid segment construction failed',
  'horizontal trapezoid construction failed',
];

interface NodeGeom { cx: string; cy: string; tx: string; ty: string }

const NODE_RE = new RegExp(
  '<title>([^<]*)</title>\\s*<ellipse[^>]*cx="([^"]+)" cy="([^"]+)"[^>]*/>' +
  '\\s*<text[^>]*x="([^"]+)" y="([^"]+)"', 'g',
);
const BACKGROUND_RE = new RegExp('<polygon fill="white" stroke="none" points="([^"]+)"');
const TRANSLATE_RE = new RegExp('<g id="graph0"[^>]*transform="([^"]+)"');

/** Each node's ellipse centre and label anchor, keyed by `<title>`. */
function nodeGeoms(svg: string): Record<string, NodeGeom> {
  const out: Record<string, NodeGeom> = {};
  for (const m of svg.matchAll(NODE_RE)) {
    out[m[1]!] = { cx: m[2]!, cy: m[3]!, tx: m[4]!, ty: m[5]! };
  }
  return out;
}

const ELLIPSE_RE = new RegExp(
  '<title>([^<]*)</title>\\s*<ellipse[^>]*rx="([^"]+)" ry="([^"]+)"', 'g',
);

/** Each node's ellipse radii, keyed by `<title>`. */
function ellipseRadii(svg: string): Record<string, { rx: string; ry: string }> {
  const out: Record<string, { rx: string; ry: string }> = {};
  for (const m of svg.matchAll(ELLIPSE_RE)) out[m[1]!] = { rx: m[2]!, ry: m[3]! };
  return out;
}

const SVG_SIZE_RE = /<svg width="([^"]+)" height="([^"]+)"\s+viewBox="([^"]+)"/;

/** The root `<svg>` width/height and viewBox. */
function svgHeader(svg: string): { size: string; viewBox: string } {
  const m = SVG_SIZE_RE.exec(svg);
  return { size: `${m?.[1] ?? ''} ${m?.[2] ?? ''}`, viewBox: m?.[3] ?? '' };
}

/** The background polygon's x coordinates (pad - bb.LL.x .. bb.UR.x + pad). */
function backgroundXs(svg: string): string[] {
  const pts = BACKGROUND_RE.exec(svg)?.[1] ?? '';
  return pts.split(' ').map((p) => p.split(',')[0]!);
}

/** The root group's transform attribute. */
function graphTransform(svg: string): string | undefined {
  return TRANSLATE_RE.exec(svg)?.[1];
}

/** console.error lines that came from the ortho failure chain. */
function orthoLines(spy: { mock: { calls: unknown[][] } }): unknown[] {
  return spy.mock.calls.map((c) => c[0])
    .filter((l) => typeof l === 'string' && l.includes('construction failed'));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('2784 — graphviz 16.1 ortho failure skips dotneato_postprocess', () => {
  it('prints the native stderr lines once, in order', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderSvg(SRC_2784, 'dot');
    expect(orthoLines(err)).toEqual(ORTHO_FAILURE_LINES);
  });

  it('leaves every node at its untranslated layout position, as native does', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const port = nodeGeoms(renderSvg(SRC_2784, 'dot'));
    const native = nodeGeoms(NATIVE_2784);
    expect(Object.keys(native).sort()).toEqual(['0', '00', '1', '2', '6', 'e']);
    expect(port).toEqual(native);
    expect(port['00']).toEqual({
      cx: '0', cy: '-1080000000000000000', tx: '0', ty: '-1080000000000000000',
    });
  });

  // gvrender_ellipse passes the absolute corner and mid_pointf(corner0, corner1)
  // centre; svg_ellipse prints ry = corner.y - centre.y. Doubles near 1.08e18
  // are 256 apart, so coord.y ± 18 rounds back to coord.y and ry is 0 — only
  // node 2 (ry 1.08e18) keeps its height. @see lib/gvc/gvrender.c:gvrender_ellipse
  it('computes ellipse radii from absolute corners, as native does', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const port = ellipseRadii(renderSvg(SRC_2784, 'dot'));
    expect(port).toEqual(ellipseRadii(NATIVE_2784));
    expect(port['00']).toEqual({ rx: '27', ry: '0' });
    expect(port['2']).toEqual({ rx: '27', ry: '1080000000000000000' });
  });

  // job->height / pageBoundingBox.UR.y = ROUND(2.16e18): the native arm64 build
  // converts with fcvtzs.2d (int64) and keeps the low 32 bits (xtn / uzp1),
  // so 2160000000000000000 prints as 2160000000000000000 mod 2^32.
  // @see lib/common/emit.c:init_job_pagination
  it('prints the page size through the native int conversion', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const port = svgHeader(renderSvg(SRC_2784, 'dot'));
    expect(port).toEqual(svgHeader(NATIVE_2784));
    expect(port).toEqual({ size: '422pt 1255669760pt', viewBox: '0.00 0.00 422.00 1255669760.00' });
  });

  it('draws the background over the untranslated bb (x from -31 to 391)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const port = backgroundXs(renderSvg(SRC_2784, 'dot'));
    expect(port).toEqual(backgroundXs(NATIVE_2784));
    expect(port).toEqual(['-31', '-31', '391', '391', '-31']);
  });

  // emit_background boxes job->clip, which setup_page builds as focus ∓
  // pageSize/2 from init_job_viewport's focus = (LL+UR)/2 and padded size —
  // not bb ± pad. At y = 2.16e18 the pad is below the double spacing, so
  // clip.LL.y = 1.08e18 - 1.08e18 = 0 where bb.LL.y - pad would be -4.
  // @see lib/common/emit.c:setup_page, init_job_viewport
  it('draws the background over job->clip as setup_page computes it', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const port = BACKGROUND_RE.exec(renderSvg(SRC_2784, 'dot'))?.[1];
    expect(port).toBe(BACKGROUND_RE.exec(NATIVE_2784)?.[1]);
    expect(port).toBe(
      '-31,0 -31,-2160000000000000000 391,-2160000000000000000 391,0 -31,0',
    );
  });

  // setup_page: translation.x = -clip.LL.x = pad - bb.LL.x, so the skipped
  // postprocess (bb.LL.x = -27) shows up as translate(31 ...), not pad-only 4.
  it('emits the native page translate from the untranslated bb', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const port = graphTransform(renderSvg(SRC_2784, 'dot'));
    expect(port).toBe(graphTransform(NATIVE_2784));
    expect(port).toBe('scale(1 1) rotate(0) translate(31 2160000000000000000)');
  });
});

describe('pack arm — a failing component stops doDot before packing', () => {
  // C doDot: `rc = dotLayout(sg); if (rc != 0) { free(ccs); return rc; }`, so
  // later components are never laid out and packSubgraphs / copyClusterInfo /
  // dotneato_postprocess never run. Native 16.1 prints the same two lines on
  // this graph and then segfaults while rendering (exit 139), so there is no
  // native drawing to compare; these assertions pin the C control flow.
  const PACK_FAIL = 'graph{pack=true splines=ortho a b[height=30000000000000000] a--b c}';

  it('lays out the failing component untranslated and never reaches the next', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const g = parse(PACK_FAIL);
    createDefaultContext().layout(g, 'dot');
    expect(orthoLines(err)).toEqual(ORTHO_FAILURE_LINES);
    expect(g.nodes.get('a')!.info.coord).toEqual({ x: 0, y: 2160000000000000000 });
    expect(g.nodes.get('b')!.info.coord).toEqual({ x: 0, y: 1080000000000000000 });
    const c = g.nodes.get('c')!.info;
    expect(c.coord).toEqual({ x: 0, y: 0 });
    expect(c.rank).toBeUndefined();
    expect(g.info.bb).toEqual({ ll: { x: 0, y: 0 }, ur: { x: 0, y: 0 } });
  });
});
