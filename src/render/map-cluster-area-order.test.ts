// SPDX-License-Identifier: EPL-2.0
//
// The map device writes a cluster's area after its label's areas (issue #179).
//
// The map device carries EMIT_CLUSTERS_LAST. With that flag C's emit_clusters
// runs emit_map_rect(job, GD_bb(sg)) and gvrender_begin_anchor for an anchored
// cluster after emit_label, not before the box, and map_begin_anchor writes
// the `<area>` from the obj's url_map_p. So a cluster's own area (`clust<N>`)
// follows the cell and table areas of its HTML label (`clust<N>_<k>`).
//
// Probe inputs and native stdout are read from
// plans/issue-179-cmapx-cluster-area-order/harness/{probes,native}: native
// graphviz 16.1.1 (~/git/graphviz-16.1.1/build/cmd/dot/dot), `-K<engine>
// -T<fmt>`, GVBINDIR=/tmp/ghl1611 for dot and /tmp/ghl1611-all for fdp and
// osage, captured 2026-11-17 by harness/rowcheck.mjs (NATIVE_DIR). They are
// not inlined because the area lines run past 100 columns.
//
// `tooltip` is compared on area order only in cmapx: its cell area's `title`
// is the cluster's tooltip in native and the label text in the port (#253).
// @see lib/common/emit.c:emit_clusters
// @see lib/common/emit.c:emit_map_rect
// @see plugin/core/gvrender_core_map.c:map_begin_anchor
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderFormat } from '../../test/helpers/render-format.js';
import { parse } from '../index.js';
import type { EngineName } from '../index.js';
import type { RendererPlugin } from '../gvc/context.js';
import { beginClusterAnchor } from '../gvc/device-cluster.js';
import { ObjType, RenderJob, createObjState } from '../gvc/job.js';
import type { ObjState } from '../gvc/job.js';
import type { Box } from '../model/geom.js';
import type { Graph } from '../model/graph.js';

const HARNESS = new URL('../../plans/issue-179-cmapx-cluster-area-order/harness/', import.meta.url);
const read = (rel: string): string => readFileSync(new URL(rel, HARNESS), 'utf8');

const ENGINES: readonly EngineName[] = ['dot', 'fdp', 'osage'];
/** The port's format names; native's files spell `-np` as `_np`. */
const CMAPX_FORMATS = ['cmapx', 'cmapx-np'] as const;
const IMAP_FORMATS = ['imap', 'imap-np'] as const;
const MAP_FORMATS = [...CMAPX_FORMATS, ...IMAP_FORMATS] as const;

/** Probes whose four map outputs equal native byte for byte. The first five
 * wrote the cluster's area before its label's areas; `text` (a text label,
 * and no label) and `nourl` (cell anchors in an unanchored cluster) guard the
 * clusters whose order cannot move. */
const EQUAL_PROBES = [
  'repro', 'own', 'nested', 'nodes', 'cluster178', 'text', 'nourl',
] as const;

/** The cluster with only `tooltip=`; its cell `title` is #253's. */
const TOOLTIP_PROBE = 'tooltip';
const CLUSTER_AREA_ID = ' id="clust1" ';
const AREA = /^<area /;
const TITLE = / title="[^"]*"/g;
const NO_TITLE = ' title=""';

const nativeOf = (probe: string, engine: EngineName, fmt: string): string =>
  read(`native/${probe}.gv.${engine}.${fmt.replace('-np', '_np')}`);

const portOf = (probe: string, engine: EngineName, fmt: string): string =>
  renderFormat(parse(read(`probes/${probe}.gv`)), fmt, engine);

const areaIdsOf = (out: string): string[] =>
  out.split('\n').filter((l) => AREA.test(l)).map((l) => / id="([^"]*)"/.exec(l)?.[1] ?? '');

describe('a cluster map area follows its label areas, as emit_clusters orders them', () => {
  for (const probe of EQUAL_PROBES) {
    for (const engine of ENGINES) {
      for (const fmt of MAP_FORMATS) {
        it(`${probe} -K${engine} -T${fmt} equals native`, () => {
          expect(portOf(probe, engine, fmt)).toBe(nativeOf(probe, engine, fmt));
        });
      }
    }
  }

  for (const engine of ENGINES) {
    for (const fmt of IMAP_FORMATS) {
      it(`${TOOLTIP_PROBE} -K${engine} -T${fmt} equals native`, () => {
        expect(portOf(TOOLTIP_PROBE, engine, fmt)).toBe(nativeOf(TOOLTIP_PROBE, engine, fmt));
      });
    }
    for (const fmt of CMAPX_FORMATS) {
      it(`${TOOLTIP_PROBE} -K${engine} -T${fmt} has native's area order (title is #253)`, () => {
        const native = nativeOf(TOOLTIP_PROBE, engine, fmt);
        const port = portOf(TOOLTIP_PROBE, engine, fmt);
        const areas = port.split('\n').filter((l) => AREA.test(l));
        expect(areas.at(-1)).toContain(CLUSTER_AREA_ID);
        expect(port.replace(TITLE, NO_TITLE)).toBe(native.replace(TITLE, NO_TITLE));
      });
    }
  }

  it('writes the issue input as cell, table, then cluster', () => {
    expect(areaIdsOf(portOf('repro', 'dot', 'cmapx'))).toEqual([
      'graph0_0', 'graph0_1', 'clust1_2', 'clust1_3', 'clust1', 'graph0',
    ]);
  });

  it('writes nested clusters as inner cell, inner, outer cell, outer', () => {
    expect(areaIdsOf(portOf('nested', 'dot', 'cmapx'))).toEqual([
      'clust2_0', 'clust2', 'clust1_1', 'clust1',
    ]);
  });
});

const CLUSTER_BB: Box = { ll: { x: 8, y: 80 }, ur: { x: 78, y: 155 } };
const CLUSTER = { info: { bb: CLUSTER_BB } } as unknown as Graph;
const stubMeasurer = { measure: () => ({ w: 0, h: 0 }) };

/** Records the order of the two calls C makes under `if (doAnchor)`. */
class AnchorCapture implements RendererPlugin {
  readonly type = 'test';
  readonly quality = 0;
  readonly calls: string[] = [];
  readonly rects: Box[] = [];
  beginGraph(): void {}
  endGraph(): void {}
  beginNode(): void {}
  endNode(): void {}
  beginEdge(): void {}
  endEdge(): void {}
  textspan(): void {}
  ellipse(): void {}
  polygon(): void {}
  bezier(): void {}
  polyline(): void {}
  emitMapRect(box: Box): void {
    this.calls.push('emitMapRect');
    this.rects.push(box);
  }
  beginAnchor(url: string, tip: string, target: string, id: string): void {
    this.calls.push(`beginAnchor ${url}|${tip}|${target}|${id}`);
  }
}

function jobWithCluster(set: (obj: ObjState) => void): RenderJob {
  const job = new RenderJob('cmapx', stubMeasurer);
  const obj = createObjState(ObjType.Cluster);
  obj.id = 'clust1';
  set(obj);
  job.pushObj(obj);
  return job;
}

describe('beginClusterAnchor — emit_map_rect, then gvrender_begin_anchor, under doAnchor', () => {
  it('records the cluster box, then opens the anchor, for a cluster url', () => {
    const renderer = new AnchorCapture();
    const job = jobWithCluster((obj) => {
      obj.url = 'k';
      obj.tooltip = 'K';
      obj.target = '_top';
    });
    expect(beginClusterAnchor(CLUSTER, renderer, job)).toBe(true);
    expect(renderer.calls).toEqual(['emitMapRect', 'beginAnchor k|K|_top|clust1']);
    expect(renderer.rects).toEqual([CLUSTER_BB]);
  });

  it('does the same for an explicit tooltip with no url', () => {
    const renderer = new AnchorCapture();
    const job = jobWithCluster((obj) => {
      obj.tooltip = 'tip';
      obj.explicitTooltip = true;
    });
    expect(beginClusterAnchor(CLUSTER, renderer, job)).toBe(true);
    expect(renderer.calls).toEqual(['emitMapRect', 'beginAnchor |tip||clust1']);
  });

  it('makes no call for a cluster with neither a url nor an explicit tooltip', () => {
    const renderer = new AnchorCapture();
    const job = jobWithCluster((obj) => {
      obj.tooltip = 'default label tooltip';
    });
    expect(beginClusterAnchor(CLUSTER, renderer, job)).toBe(false);
    expect(renderer.calls).toEqual([]);
  });

  it('makes no call on a job with no current obj', () => {
    const renderer = new AnchorCapture();
    const job = new RenderJob('cmapx', stubMeasurer);
    expect(beginClusterAnchor(CLUSTER, renderer, job)).toBe(false);
    expect(renderer.calls).toEqual([]);
  });
});
