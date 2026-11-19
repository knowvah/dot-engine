// SPDX-License-Identifier: EPL-2.0
//
// Every object id carries its layer's prefix after the first layer
// (issue #180).
//
// C's getObjId starts each id with layerPagePrefix: `<layerIDs[layerNum]>_`
// when job->layerNum > 1, written before the explicit-`id` check and before
// the `<gid>_` prefix. emit_page gives the root graph's id the same prefix
// when the page is not the first. So obj->id carries it, and so does every
// string built from obj->id: the svg groups, the anchors `a_<id>`, the edge
// label anchors `<id>-label`, the HTML cell anchors `<id>_<n>`, the gradient
// ids `<id>_l_<n>` / `<id>_r_<n>` and the map area ids. A device without
// layers (cmapx) still starts at the layer `layerselect` names (firstlayer),
// so its area ids carry the prefix too.
//
// Probe inputs and native stdout are read from
// plans/issue-180-svg-layer-anchor-id/harness/{probes,native}: native
// graphviz 16.1.1 (~/git/graphviz-16.1.1/build/cmd/dot/dot), `-K<engine>
// -T<fmt>`, GVBINDIR=/tmp/ghl1611 for dot and /tmp/ghl1611-all for neato and
// fdp, captured 2026-11-17 by harness/rowcheck.mjs (NATIVE_DIR). They are not
// inlined because the svg bodies run to hundreds of lines.
//
// svg is compared from the first `<g id=`: the header above it does not carry
// an object id.
// @see lib/common/emit.c:getObjId
// @see lib/common/emit.c:layerPagePrefix
// @see lib/common/emit.c:emit_page
// @see lib/common/emit.c:firstlayer
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderFormat } from '../../test/helpers/render-format.js';
import { parse } from '../index.js';
import type { EngineName } from '../index.js';
import { RenderJob } from '../gvc/job.js';

const HARNESS = new URL('../../plans/issue-180-svg-layer-anchor-id/harness/', import.meta.url);
const read = (rel: string): string => readFileSync(new URL(rel, HARNESS), 'utf8');

const ENGINES: readonly EngineName[] = ['dot', 'neato', 'fdp'];
/** The port's format names; native's files spell `-np` as `_np`. */
const CMAPX_FORMATS = ['cmapx', 'cmapx-np'] as const;

/** Probes whose svg body equals native byte for byte. `nolayers` guards the
 * ids that must not gain a prefix (no `layers`, so layerNum stays 1). */
const BODY_EQUAL_PROBES = [
  'html', 'gradient', 'explicitid', 'gid', 'edgelabels', 'select', 'list', 'nolayers', 'repro',
] as const;

/** `layerselect=l3`: a layer-less device starts at layer 3. */
const SELECT_PROBE = 'select';
const BODY_START = '<g id=';
const ANCHOR_ID = / id="(a_[^"]*)"/g;
const AREA_ID = /^<area [^>]* id="([^"]*)"/gm;

const nativeOf = (probe: string, engine: EngineName, fmt: string): string =>
  read(`native/${probe}.gv.${engine}.${fmt.replace('-np', '_np')}`);

const portOf = (probe: string, engine: EngineName, fmt: string): string =>
  renderFormat(parse(read(`probes/${probe}.gv`)), fmt, engine);

const bodyOf = (svg: string): string => svg.slice(svg.indexOf(BODY_START));

const idsOf = (out: string, re: RegExp): string[] => [...out.matchAll(re)].map((m) => m[1] ?? '');

describe('svg ids on a layer after the first carry the layer prefix, as getObjId writes it', () => {
  for (const probe of BODY_EQUAL_PROBES) {
    for (const engine of ENGINES) {
      it(`${probe} -K${engine} -Tsvg body equals native`, () => {
        const native = bodyOf(nativeOf(probe, engine, 'svg'));
        expect(native.startsWith(BODY_START)).toBe(true);
        expect(bodyOf(portOf(probe, engine, 'svg'))).toBe(native);
      });
    }
  }

  // The cluster (`layer=l2`) is drawn on l2 only (#181, clust_in_layer), so
  // layer 1 holds no `a_clust1`.
  it('writes the issue input\'s anchors with the layer prefix inside l2', () => {
    const NATIVE_ANCHORS = [
      'a_graph0', 'a_node1',
      'a_l2_graph0', 'a_l2_clust1', 'a_l2_node2', 'a_l2_edge1',
    ];
    expect(idsOf(portOf('repro', 'dot', 'svg'), ANCHOR_ID)).toEqual(NATIVE_ANCHORS);
    expect(idsOf(nativeOf('repro', 'dot', 'svg'), ANCHOR_ID)).toEqual(NATIVE_ANCHORS);
  });

  it('leaves the issue input\'s group ids with one prefix', () => {
    const groups = idsOf(portOf('repro', 'dot', 'svg'), /<g id="((?:l2_)+[^"]*)" class="(?:graph|cluster|node|edge)"/g);
    expect(groups).toEqual(['l2_graph0', 'l2_clust1', 'l2_node2_l2', 'l2_edge1']);
  });
});

describe('a map device started at a selected layer prefixes its area ids', () => {
  for (const engine of ENGINES) {
    for (const fmt of CMAPX_FORMATS) {
      it(`${SELECT_PROBE} -K${engine} -T${fmt} equals native`, () => {
        expect(portOf(SELECT_PROBE, engine, fmt)).toBe(nativeOf(SELECT_PROBE, engine, fmt));
      });
    }
  }

  it('writes the area ids of layer l3', () => {
    expect(idsOf(portOf(SELECT_PROBE, 'dot', 'cmapx'), AREA_ID)).toEqual([
      'l3_node1', 'l3_node2', 'l3_edge1', 'l3_graph0',
    ]);
  });
});

describe('RenderJob.objId', () => {
  const stubMeasurer = { measure: () => ({ w: 0, h: 0 }) };
  const GID = 'G';
  const LAYER_IDS = [null, 'l1', 'l2'];

  function jobAt(layerNum: number): RenderJob {
    const job = new RenderJob('svg', stubMeasurer);
    job.layerIDs = LAYER_IDS;
    job.numLayers = 2;
    job.drawingId = GID;
    job.layerNum = layerNum;
    return job;
  }

  const idsAt = (layerNum: number): string[] => {
    const job = jobAt(layerNum);
    return [
      job.objId('x', 'node1'),
      job.objId(undefined, 'node1'),
      job.objId(undefined, 'graph0', true),
    ];
  };

  // layerNum 0: emit_begin_graph, before firstlayer. layerNum 1: the first
  // (or only) layer. Neither writes a prefix (`job->layerNum > 1`).
  for (const layerNum of [0, 1]) {
    it(`writes no layer prefix at layerNum ${layerNum}`, () => {
      expect(idsAt(layerNum)).toEqual(['x', 'G_node1', 'graph0']);
    });
  }

  it('starts an explicit id, a <gid>_ id and the root id with the layer at layerNum 2', () => {
    expect(idsAt(2)).toEqual(['l2_x', 'l2_G_node1', 'l2_graph0']);
  });

  it('writes the prefix once: idLayerPrefix is the whole of it', () => {
    const job = jobAt(2);
    expect(job.objId(undefined, 'node1')).toBe(job.idLayerPrefix() + 'G_node1');
  });
});
