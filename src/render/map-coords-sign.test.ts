// SPDX-License-Identifier: EPL-2.0
//
// The sign of zero and tie rounding in imagemap coordinates (issue #175).
//
// C maps every url_map point with gvrender_ptf_A: (y + translation.y) *
// scale.y, where scale.y is negative on the Y-goes-down map device. At the page
// top the sum is +0, and +0 times a negative scale is -0.0. map_output_shape
// then prints with "%.0f", which keeps the sign ("-0"), prints "-0" for -0.3,
// and rounds exact ties to even (2.5 prints "2").
//
// Probe inputs and native stdout are read from
// plans/issue-175-cmapx-negative-zero/harness/{probes,native}: native graphviz
// 16.1.1 (~/git/graphviz-16.1.1/build/cmd/dot/dot), `-K<engine> -T<fmt>`,
// GVBINDIR=/tmp/ghl1611 for dot and /tmp/ghl1611-all for neato and fdp,
// captured 2026-11-17 by harness/compare.mjs (NATIVE_DIR). They are not inlined
// because they hold 384 lines of up to 195 columns.
//
// Left out: nodes.gv and labels72.gv (edge-label area ids, #177) and rotate.gv
// (rotate=90 on maps, #247).
// @see lib/gvc/gvrender.c:gvrender_ptf_A
// @see lib/common/emit.c:setup_page ; emit.c:emit_graph (devscale.y *= -1)
// @see plugin/core/gvrender_core_map.c:map_output_shape
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderFormat } from '../../test/helpers/render-format.js';
import { parse } from '../index.js';
import type { EngineName } from '../index.js';
import { computeGraphUrlMap, mapTransform } from '../gvc/anchor.js';
import { MapShape } from '../gvc/job.js';
import { printfFixed, printfFixed0 } from '../util/printf-round.js';
import {
  buildMapCtx, cmapxCoordsCircle, cmapxCoordsPoly, cmapxCoordsRect, mapOutputImap,
} from './map.js';
import { makeGraph, makeJob, makeObjState } from './map-test-helpers.js';

const HARNESS = new URL('../../plans/issue-175-cmapx-negative-zero/harness/', import.meta.url);
const read = (rel: string): string => readFileSync(new URL(rel, HARNESS), 'utf8');

/** The default map dpi over points per inch. */
const DEVSCALE_96 = 96 / 72;
/** Two thirds of a pixel above an integer, as 96 dpi layouts give. */
const Y_59 = 58.666666666666664;
const X_83 = 82.66666666666666;

describe('printfFixed0 — C "%.0f"', () => {
  it('keeps the sign of an exact negative zero', () => {
    expect(printfFixed0(-0)).toBe('-0');
    expect(printfFixed0(0)).toBe('0');
  });

  it('keeps the sign of a negative value that rounds to zero', () => {
    expect(printfFixed0(-0.3)).toBe('-0');
    expect(printfFixed0(-0.5)).toBe('-0');
  });

  it('rounds exact ties to even', () => {
    expect(printfFixed0(0.5)).toBe('0');
    expect(printfFixed0(1.5)).toBe('2');
    expect(printfFixed0(2.5)).toBe('2');
    expect(printfFixed0(-2.5)).toBe('-2');
  });

  it('equals printfFixed(v, 0) on every other input, non-finite included', () => {
    for (const v of [1, -1, 82.66666666666666, -7.49, 1e21, Infinity, -Infinity, NaN]) {
      expect(printfFixed0(v)).toBe(printfFixed(v, 0));
    }
  });
});

describe('cmapx coordinate writers print with "%.0f"', () => {
  it('rect: the graph area of `digraph{URL="x"; a}` is 0,-0,83,59', () => {
    expect(cmapxCoordsRect([{ x: 0, y: Y_59 }, { x: X_83, y: -0 }])).toBe('0,-0,83,59');
  });

  it('circle: a -0 centre y and a 2.5 radius tie', () => {
    expect(cmapxCoordsCircle([{ x: 2.5, y: -0 }, { x: 5, y: 0 }])).toBe('2,-0,2');
  });

  it('poly: -0.3, a 2.5 tie and an exact -0', () => {
    expect(cmapxCoordsPoly([{ x: -0.3, y: 2.5 }, { x: 1.5, y: -0 }])).toBe('-0,2,2,-0');
  });
});

describe('mapOutputImap prints with "%.0f"', () => {
  const line = (shape: MapShape, pts: { x: number; y: number }[]): string => {
    const out: string[] = [];
    mapOutputImap(shape, pts, 'u', out);
    return out.join('');
  };

  it('rect', () => {
    expect(line(MapShape.Rectangle, [{ x: 0, y: Y_59 }, { x: X_83, y: -0 }]))
      .toBe('rect u 0,-0 83,59\n');
  });

  it('circle', () => {
    expect(line(MapShape.Circle, [{ x: 2.5, y: -0 }, { x: 5, y: 0 }])).toBe('circle u 2,-0,2\n');
  });

  it('poly', () => {
    expect(line(MapShape.Polygon, [{ x: -0.3, y: 2.5 }, { x: 1.5, y: -0 }]))
      .toBe('poly u -0,2 2,-0\n');
  });
});

describe('mapTransform — gvrender_ptf_A with a negative y scale', () => {
  /** buildMapCtx for `digraph{URL="x"; a}`: bb 0,0,54,36, pad 4, dpi 96. */
  const reproCtx = (margin = { x: 0, y: 0 }) => {
    const job = makeJob();
    job.bb = { ll: { x: 0, y: 0 }, ur: { x: 54, y: 36 } };
    job.pad = { x: 4, y: 4 };
    job.margin = margin;
    return buildMapCtx(makeGraph(), job, true);
  };

  it('the y scale is negative and the x scale positive', () => {
    const ctx = reproCtx();
    expect(ctx.scale).toEqual({ x: DEVSCALE_96, y: -DEVSCALE_96 });
    expect(ctx.translation).toEqual({ x: 4, y: -40 });
  });

  it('maps the padded upper-right corner to y = -0.0', () => {
    const ur = mapTransform({ x: 58, y: 40 }, reproCtx());
    expect(ur.x).toBe(X_83);
    expect(Object.is(ur.y, -0)).toBe(true);
  });

  it('maps the padded lower-left corner to x = 0 and y = 58.67', () => {
    const ll = mapTransform({ x: -4, y: -4 }, reproCtx());
    expect(Object.is(ll.x, 0)).toBe(true);
    expect(ll.y).toBe(Y_59);
  });

  it('a margin moves the page top off zero', () => {
    const ur = mapTransform({ x: 58, y: 40 }, reproCtx({ x: 36, y: 18 }));
    expect(ur).toEqual({ x: (58 + 4 + 36) * DEVSCALE_96, y: 18 * DEVSCALE_96 });
  });
});

/** The double with the given IEEE-754 bits, as lldb reads them from native. */
function bits(hex: bigint): number {
  const view = new DataView(new ArrayBuffer(8));
  view.setBigUint64(0, hex);
  return view.getFloat64(0);
}

// `digraph{size="1,1"; URL="g"; a [URL="a"]; b [URL="b"]; a->b [URL="e"]}` under
// fdp -Tcmapx (harness/probes/size.gv). Native 16.1.1's GVJ_t at
// map_output_shape, read with lldb on 2026-11-17: pageSize.x is one ulp below
// the padded bb's width ((Z * sz) / Z), so clip.LL.x is 16 ulps above
// pageBox.LL.x = -4 and the root area's left edge is a tiny negative, which
// "%.0f" prints as `-0`.
describe('buildMapCtx — pageBox against a clip-based translation (size=)', () => {
  const job = makeJob();
  job.bb = {
    ll: { x: 0, y: 0 },
    ur: { x: bits(0x405ddd82e15e4394n), y: bits(0x4046e3df102cb4c5n) },
  };
  job.pad = { x: 4, y: 4 };
  const g = makeGraph();
  g.attrs.set('size', '1,1');
  const ctx = buildMapCtx(g, job, true);

  it('matches native job->pageBox, job->translation and zoom * devscale', () => {
    expect(ctx.pageBox).toEqual({
      ll: { x: -4, y: -4 },
      ur: { x: bits(0x405edd82e15e4393n), y: bits(0x4048e3df102cb4c5n) },
    });
    expect(ctx.translation).toEqual({
      x: bits(0x400ffffffffffff0n), y: bits(0xc048e3df102cb4c5n),
    });
    expect(ctx.scale).toEqual({
      x: bits(0x3fe819f9d5fd7405n), y: -bits(0x3fe819f9d5fd7405n),
    });
  });

  it('maps the root area to native url_map_p and prints -0,-0,96,41', () => {
    const obj = makeObjState();
    computeGraphUrlMap(obj, ctx);
    expect(obj.urlMapPts).toEqual([
      { x: bits(0xbcf819f9d5fd7405n), y: bits(0x404440bb4357a03an) },
      { x: bits(0x4057ffffffffffffn), y: -0 },
    ]);
    expect(cmapxCoordsRect(obj.urlMapPts)).toBe('-0,-0,96,41');
  });
});

/** Probes whose only base difference from native is the `-0`; margin.gv is the
 * control (byte-equal on the base: its margin moves the page top off zero). */
const PROBES = ['repro', 'dpi72', 'glabel', 'pad0', 'pinned', 'size', 'margin'];
const ENGINES: EngineName[] = ['dot', 'neato', 'fdp'];
/** Port format name, native format name. The `-np` devices are outside the
 * public OutputFormat union, hence renderFormat. */
const FORMATS: [string, string][] = [
  ['cmapx', 'cmapx'], ['cmapx-np', 'cmapx_np'], ['imap', 'imap'], ['imap-np', 'imap_np'],
];

describe.each(PROBES)('probe %s.gv equals native 16.1.1 byte for byte', (probe) => {
  const src = read(`probes/${probe}.gv`);
  for (const engine of ENGINES) {
    it.each(FORMATS)(`${engine} -T%s`, (fmt, nativeFmt) => {
      const native = read(`native/${probe}.gv.${engine}.${nativeFmt}`);
      expect(renderFormat(parse(src), fmt, engine)).toBe(native);
    });
  }
});
