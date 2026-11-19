// SPDX-License-Identifier: EPL-2.0
//
// An HTML label emits inside its own obj state, so the map rects of its
// anchored cells never reach the label's owner (issue #178).
//
// C's emit_html_label wraps the whole label in allocObj/freeObj: a temporary
// obj pushed over the owner. Each anchored cell's initAnchor runs
// emit_map_rect, which writes url_map_p on that temporary obj, and freeObj
// pops it. map_end_page prints the root's area whenever the root obj holds
// map points, and emit_page sets them only for a root URL or an explicit
// tooltip. Without the temporary obj the last cell's rect stayed in the root
// obj and `-Tcmapx` printed it as a stray `id="graph0"` area.
//
// Probe inputs and native stdout are read from
// plans/issue-178-cmapx-html-label-obj/harness/{probes,native}: native
// graphviz 16.1.1 (~/git/graphviz-16.1.1/build/cmd/dot/dot), `-K<engine>
// -T<fmt>`, GVBINDIR=/tmp/ghl1611 for dot and /tmp/ghl1611-all for neato and
// fdp, captured 2026-11-17 by harness/rowcheck.mjs (NATIVE_DIR). They are not
// inlined because the area lines run past 100 columns.
//
// One probe is compared on the lines this change owns only:
//   edge     without the cell areas of an HTML edge label (`edge1_0`,
//            `edge2_1`), which the map renderer does not write yet (#252).
// The `cluster` probe was compared without line order until #179 moved the
// cluster's area after its label's cell areas; it is byte-equal now.
// @see lib/common/htmltable.c:emit_html_label
// @see lib/common/htmltable.c:allocObj
// @see lib/common/htmltable.c:freeObj
// @see plugin/core/gvrender_core_map.c:map_end_page
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderFormat } from '../../test/helpers/render-format.js';
import { parse } from '../index.js';
import type { EngineName } from '../index.js';
import { emitHtmlLabel } from '../common/htmltable-emit.js';
import type { PlacedHtml } from '../common/htmltable-pos.js';
import type { RendererPlugin } from '../gvc/context.js';
import { PenType } from '../gvc/context.js';
import { EmitState, ObjType, RenderJob, createObjState } from '../gvc/job.js';
import type { ObjState } from '../gvc/job.js';
import type { Point } from '../model/geom.js';

const HARNESS = new URL('../../plans/issue-178-cmapx-html-label-obj/harness/', import.meta.url);
const read = (rel: string): string => readFileSync(new URL(rel, HARNESS), 'utf8');

const ENGINES: readonly EngineName[] = ['dot', 'neato', 'fdp'];
/** The port's format names; native's files spell `-np` as `_np`. */
const FORMATS = ['cmapx', 'cmapx-np'] as const;

/** Probes whose cmapx and cmapx_np output equals native byte for byte. The
 * first five printed a stray graph area before the fix; the rest guard the
 * graph area of a root URL or tooltip and the node hot spot. */
const EQUAL_PROBES = [
  'repro', 'tblhref', 'nested', 'paint', 'cluster',
  'rooturl', 'roottip', 'node', 'text',
] as const;

/** The cell area of an HTML edge label, native's `edge<n>_<k>` (#252). */
const EDGE_CELL_AREA = / id="edge\d+_\d+" /;

/** The area of the root graph itself: the bare root id, no `_<n>` suffix. */
const GRAPH_AREA = / id="graph0" /;
const AREA = /^<area /;

/** The issue's input: the only anchors are cells of the root's HTML label. */
const CELLS = '<td href="http://cell" id="cellid">L</td><td title="t">M</td><td href="http://c2">N</td>';
const reproWith = (rootAttrs: string): string =>
  `digraph G { ${rootAttrs} label=<<table><tr>${CELLS}</tr></table>>; a -> b }`;

const nativeOf = (probe: string, engine: EngineName, fmt: string): string =>
  read(`native/${probe}.gv.${engine}.${fmt.replace('-np', '_np')}`);

const portOf = (probe: string, engine: EngineName, fmt: string): string =>
  renderFormat(parse(read(`probes/${probe}.gv`)), fmt, engine);

const areasOf = (dot: string): string[] =>
  renderFormat(parse(dot), 'cmapx', 'dot').split('\n').filter((l) => AREA.test(l));

describe('an html label emits in its own obj state, as allocObj/freeObj do', () => {
  for (const probe of EQUAL_PROBES) {
    for (const engine of ENGINES) {
      for (const fmt of FORMATS) {
        it(`${probe} -K${engine} -T${fmt} equals native`, () => {
          expect(portOf(probe, engine, fmt)).toBe(nativeOf(probe, engine, fmt));
        });
      }
    }
  }

  for (const engine of ENGINES) {
    for (const fmt of FORMATS) {
      it(`edge -K${engine} -T${fmt} equals native outside the #252 lines`, () => {
        const native = nativeOf('edge', engine, fmt).split('\n');
        const owned = native.filter((l) => !EDGE_CELL_AREA.test(l));
        expect(native.length - owned.length).toBe(2);
        expect(portOf('edge', engine, fmt).split('\n')).toEqual(owned);
      });
    }
  }
});

describe('the root graph area comes from the root URL or tooltip only', () => {
  it('prints the 3 cell areas and no graph area for the issue input', () => {
    const areas = areasOf(reproWith(''));
    expect(areas.filter((l) => GRAPH_AREA.test(l))).toEqual([]);
    expect(areas).toHaveLength(3);
    expect(areas[0]).toContain(' id="cellid" href="http://cell" ');
    expect(areas[1]).toContain(' id="graph0_0" title="t" ');
    expect(areas[2]).toContain(' id="graph0_1" href="http://c2" ');
  });

  it('prints the graph area once, over the page box, for a root URL', () => {
    const areas = areasOf(reproWith('URL="http://r";'));
    const graph = areas.filter((l) => GRAPH_AREA.test(l));
    expect(areas).toHaveLength(4);
    expect(graph).toEqual([
      '<area shape="rect" id="graph0" href="http://r" title="&lt;TABLE&gt;" alt="" coords="0,-0,111,204"/>',
    ]);
    expect(areas[3]).toBe(graph[0]);
  });

  it('prints the graph area with the root tooltip as its title', () => {
    const areas = areasOf(reproWith('tooltip="t";'));
    const graph = areas.filter((l) => GRAPH_AREA.test(l));
    expect(areas).toHaveLength(4);
    expect(graph).toEqual([
      '<area shape="rect" id="graph0" title="t" alt="" coords="0,-0,111,204"/>',
    ]);
  });
});

/** One anchored cell holding one line of text. */
const PLACED: PlacedHtml = {
  box: { ll: { x: -20, y: -7 }, ur: { x: 20, y: 7 } },
  border: 0, columnCount: 1, rowCount: 1, spacing: 0,
  cells: [{
    box: { ll: { x: -20, y: -7 }, ur: { x: 20, y: 7 } },
    border: 0, col: 0, row: 0, colspan: 1, rowspan: 1,
    href: 'http://cell',
    lines: [{
      text: 'L', fontName: 'Times,serif', fontSize: 14, fontColor: '#000000',
      fontFlags: 0, x: -18, baseline: 5, width: 36,
    }],
  }],
};
const ORIGIN: Point = { x: 0, y: 0 };
const CELL_RECT: readonly Point[] = [{ x: 1, y: 2 }, { x: 3, y: 4 }];
const OWNER_RECT: readonly Point[] = [{ x: 10, y: 20 }, { x: 30, y: 40 }];
const SPAN_FAILURE = 'textspan failed';

/** A renderer that, like the map device's emit_map_rect, writes the cell's
 * rect on the current obj, and records which obj that was. */
class ObjCapture implements RendererPlugin {
  readonly type = 'test';
  readonly quality = 0;
  readonly mapObjs: ObjState[] = [];
  readonly spans: string[] = [];
  constructor(private readonly failOnSpan = false) {}
  beginGraph(): void {}
  endGraph(): void {}
  beginNode(): void {}
  endNode(): void {}
  beginEdge(): void {}
  endEdge(): void {}
  textspan(_pos: Point, span: { str: string }): void {
    if (this.failOnSpan) throw new Error(SPAN_FAILURE);
    this.spans.push(span.str);
  }
  ellipse(): void {}
  polygon(): void {}
  bezier(): void {}
  polyline(): void {}
  emitMapRect(_box: unknown, job: RenderJob): void {
    const obj = job.obj;
    if (obj === null) return;
    obj.urlMapPts = [...CELL_RECT];
    this.mapObjs.push(obj);
  }
}

const stubMeasurer = { measure: () => ({ w: 0, h: 0 }) };

/** A job whose current obj is a cluster with a URL, a tooltip and a hot spot. */
function jobWithOwner(): { job: RenderJob; owner: ObjState } {
  const job = new RenderJob('cmapx', stubMeasurer);
  const owner = createObjState(ObjType.Cluster);
  owner.emitState = EmitState.CLabel;
  owner.pen = PenType.Dashed;
  owner.penWidth = 3;
  owner.gradientAngle = 45;
  owner.penColor = { type: 'string', s: 'red' };
  owner.fillColor = { type: 'string', s: 'blue' };
  owner.stopColor = { type: 'string', s: 'green' };
  owner.url = 'http://owner';
  owner.tooltip = 'tip';
  owner.target = '_top';
  owner.explicitTooltip = true;
  owner.id = 'clust1';
  owner.label = 'owner label';
  owner.urlMapPts = [...OWNER_RECT];
  job.pushObj(owner);
  return { job, owner };
}

describe('emitHtmlLabel — allocObj before the label, freeObj after it', () => {
  it('writes a cell map rect on a child obj and leaves the owner hot spot alone', () => {
    const { job, owner } = jobWithOwner();
    const renderer = new ObjCapture();
    emitHtmlLabel(PLACED, ORIGIN, renderer, job);
    expect(renderer.mapObjs).toHaveLength(1);
    expect(renderer.mapObjs[0]).not.toBe(owner);
    expect(renderer.mapObjs[0]?.parent).toBe(owner);
    expect(renderer.mapObjs[0]?.urlMapPts).toEqual(CELL_RECT);
    expect(owner.urlMapPts).toEqual(OWNER_RECT);
    expect(renderer.spans).toEqual(['L']);
  });

  it('gives the child the fields push_obj_state and allocObj copy, and no others', () => {
    const { job, owner } = jobWithOwner();
    const renderer = new ObjCapture();
    emitHtmlLabel(PLACED, ORIGIN, renderer, job);
    const child = renderer.mapObjs[0];
    expect(child).toMatchObject({
      type: ObjType.Cluster, emitState: EmitState.CLabel, graphObj: owner.graphObj,
      penColor: owner.penColor, fillColor: owner.fillColor, stopColor: owner.stopColor,
      pen: PenType.Dashed, fill: owner.fill, penWidth: 3, gradientAngle: 45,
      url: 'http://owner', tooltip: 'tip', target: '_top', explicitTooltip: true,
      id: null, label: null,
    });
  });

  it('pops the child, so the owner is the current obj again', () => {
    const { job, owner } = jobWithOwner();
    emitHtmlLabel(PLACED, ORIGIN, new ObjCapture(), job);
    expect(job.obj).toBe(owner);
  });

  it('pops the child when the label throws', () => {
    const { job, owner } = jobWithOwner();
    expect(() => emitHtmlLabel(PLACED, ORIGIN, new ObjCapture(true), job)).toThrow(SPAN_FAILURE);
    expect(job.obj).toBe(owner);
  });

  it('emits without a push on a job with no current obj', () => {
    const job = new RenderJob('cmapx', stubMeasurer);
    const renderer = new ObjCapture();
    emitHtmlLabel(PLACED, ORIGIN, renderer, job);
    expect(renderer.mapObjs).toEqual([]);
    expect(renderer.spans).toEqual(['L']);
    expect(job.obj).toBeNull();
  });
});
