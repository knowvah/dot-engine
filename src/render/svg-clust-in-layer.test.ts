// SPDX-License-Identifier: EPL-2.0
//
// A cluster is drawn only in the layers clust_in_layer puts it in
// (issue #181).
//
// C's emit_clusters tests `clust_in_layer(job, sg)` before it draws a cluster
// or recurses into it: the cluster's own `layer` decides, else (no `layer`)
// any node of it that is in the layer, judged by the cluster's own edges. So
// a skipped cluster's sub-clusters are skipped too, and a device without
// layers skips a cluster under `layerselect` (firstlayer keeps numLayers > 1).
// xdot_end_cluster then never runs for it: the cluster keeps its `bb` (set by
// rec_attach_bb from GD_clust) and any `_draw_` the input stored, and gains
// no `_draw_` of its own.
//
// Probe inputs and native stdout are read from
// plans/issue-181-clust-in-layer/harness/{probes,native,native-all}: native
// graphviz 16.1.1 (~/git/graphviz-16.1.1/build/cmd/dot/dot), `-K<engine>
// -T<fmt>`, GVBINDIR=/tmp/ghl1611 for dot and /tmp/ghl1611-all for neato and
// fdp, captured 2026-11-17 by harness/rowcheck.mjs (NATIVE_DIR). svg is in
// native/, the other formats in native-all/. They are not inlined because the
// svg bodies run to hundreds of lines.
//
// svg is compared from the first `<g id=`: the header above it does not
// depend on the clusters.
// @see lib/common/emit.c:clust_in_layer
// @see lib/common/emit.c:emit_clusters
// @see plugin/core/gvrender_core_dot.c:xdot_end_cluster
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderFormat } from '../../test/helpers/render-format.js';
import { parse } from '../index.js';
import type { EngineName } from '../index.js';

const HARNESS = new URL('../../plans/issue-181-clust-in-layer/harness/', import.meta.url);
const read = (rel: string): string => readFileSync(new URL(rel, HARNESS), 'utf8');

const ENGINES: readonly EngineName[] = ['dot', 'neato', 'fdp'];
/** The port's format names; native's files spell `-np` as `_np`. */
const CMAPX_FORMATS = ['cmapx', 'cmapx-np'] as const;

/** Probes whose svg body equals native byte for byte. `nolayers` guards the
 * graph without `layers`: a cluster `layer` there skips nothing. */
const BODY_EQUAL_PROBES = [
  'issue', 'clusterlayer', 'nested', 'inneredge', 'all', 'inherit', 'layersep', 'select', 'nolayers',
] as const;

/** `layerselect=l1`; `cluster_c`'s only node is on l2, `cluster_d`'s on l1. */
const SELECT_PROBE = 'select';
/** The same shape, with a `_draw_` stored on both clusters in the input. */
const SELECT_STORED_PROBE = 'select-stored';
const BODY_START = '<g id=';
const SVG_DIR = 'native';
const OTHER_DIR = 'native-all';
const CLUSTER_GROUP = /<g id="([^"]*)" class="cluster">/g;

const nativeOf = (probe: string, engine: EngineName, fmt: string): string =>
  read(`${fmt === 'svg' ? SVG_DIR : OTHER_DIR}/${probe}.gv.${engine}.${fmt.replace('-np', '_np')}`);

const portOf = (probe: string, engine: EngineName, fmt: string): string =>
  renderFormat(parse(read(`probes/${probe}.gv`)), fmt, engine);

const bodyOf = (svg: string): string => svg.slice(svg.indexOf(BODY_START));

describe('svg draws a cluster only in the layers clust_in_layer selects', () => {
  for (const probe of BODY_EQUAL_PROBES) {
    for (const engine of ENGINES) {
      it(`${probe} -K${engine} -Tsvg body equals native`, () => {
        const native = bodyOf(nativeOf(probe, engine, 'svg'));
        expect(native.startsWith(BODY_START)).toBe(true);
        expect(bodyOf(portOf(probe, engine, 'svg'))).toBe(native);
      });
    }
  }

  it('draws the issue input\'s cluster in l2 only', () => {
    const groups = [...portOf('issue', 'dot', 'svg').matchAll(CLUSTER_GROUP)].map((m) => m[1]);
    expect(groups).toEqual(['l2_clust1']);
  });

  // cluster_o holds b (l2) and, through cluster_i, c (l3): it is on l2 and
  // l3, and cluster_i on l3 only. cluster_x has `layer="l1:l2"` and is not
  // on l3 although its node d is.
  it('skips a sub-cluster with its parent and lets a cluster layer overrule its nodes', () => {
    const groups = [...portOf('nested', 'dot', 'svg').matchAll(CLUSTER_GROUP)].map((m) => m[1]);
    expect(groups).toEqual(['clust3', 'l2_clust1', 'l2_clust3', 'l3_clust1', 'l3_clust2']);
  });
});

describe('a device without layers skips a cluster outside the selected layer', () => {
  for (const engine of ENGINES) {
    for (const fmt of CMAPX_FORMATS) {
      it(`${SELECT_PROBE} -K${engine} -T${fmt} equals native`, () => {
        expect(portOf(SELECT_PROBE, engine, fmt)).toBe(nativeOf(SELECT_PROBE, engine, fmt));
      });
    }
    // The skipped cluster keeps `bb` and a stored `_draw_`, and gains none.
    for (const probe of [SELECT_PROBE, SELECT_STORED_PROBE]) {
      it(`${probe} -K${engine} -Txdot equals native`, () => {
        expect(portOf(probe, engine, 'xdot')).toBe(nativeOf(probe, engine, 'xdot'));
      });
    }
    // Structural: the port's json is not pretty-printed as native's is.
    it(`${SELECT_PROBE} -K${engine} -Tjson equals native as json`, () => {
      const native: unknown = JSON.parse(nativeOf(SELECT_PROBE, engine, 'json'));
      expect(JSON.parse(portOf(SELECT_PROBE, engine, 'json'))).toEqual(native);
    });
  }
});
