// SPDX-License-Identifier: EPL-2.0
//
// The root graph's `id` prefixes every generated object id, in every renderer
// (issue #176).
//
// C's getObjId prefixes the id of a non-root object that has no `id` of its own
// with `GD_drawing(root)->id` and `_`. graph_init sets that field once, at
// layout start, as strdup_and_subst_obj(agget(g, "id"), g): it belongs to the
// graph, not to a render plugin, so `-Tcmapx` prints `G2_node1` exactly as
// `-Tsvg` does.
//
// Probe inputs and native stdout are read from
// plans/issue-176-cmapx-id-prefix/harness/{probes,native}: native graphviz
// 16.1.1 (~/git/graphviz-16.1.1/build/cmd/dot/dot), `-K<engine> -T<fmt>`,
// GVBINDIR=/tmp/ghl1611 for dot and /tmp/ghl1611-all for neato and fdp,
// captured 2026-11-17 by harness/rowcheck.mjs (NATIVE_DIR). They are not
// inlined because the area lines run to 230 columns.
//
// Three probes are compared on the lines this change owns only (AD-3):
//   clust   the cluster area: native prints `id="R"` (a subgraph opened after
//           the root's `id` inherits it in cgraph, #242), the port `R_clust1`.
//   elabel  the edge-label areas: native `R_edge1-label` and
//           `R_edge1-headlabel` (the suffix is #177), the port `R_edge1`.
//           cmapx only: cmapx_np prints no edge polyline, so every area of
//           that row is a label area.
//   subst2  the node whose own id is `i\N`: native substitutes it to `ia`
//           (initMapData, #249), the port prints it raw.
// @see lib/common/emit.c:getObjId
// @see lib/common/input.c:graph_init (786-788)
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderFormat } from '../../test/helpers/render-format.js';
import { parse } from '../index.js';
import type { EngineName } from '../index.js';
import { drawingIdOf } from './svg-id.js';

const HARNESS = new URL('../../plans/issue-176-cmapx-id-prefix/harness/', import.meta.url);
const read = (rel: string): string => readFileSync(new URL(rel, HARNESS), 'utf8');

const ENGINES: readonly EngineName[] = ['dot', 'neato', 'fdp'];
/** The port's format names; native's files spell `-np` as `_np`. */
const FORMATS = ['cmapx', 'cmapx-np'] as const;

/** Probes whose cmapx and cmapx_np output equals native byte for byte. */
const EQUAL_PROBES = ['repro', 'html', 'ownid', 'glabel', 'clust-late', 'subst'] as const;

/** A probe with one kind of line owned by another issue: that line's mark in
 * native's output, the issue, and the formats that have a line left to compare.
 * Every other native line must appear in the port's output. */
interface PartialProbe {
  readonly probe: string;
  readonly leftOut: RegExp;
  readonly issue: string;
  readonly formats: readonly string[];
}

const PARTIAL_PROBES: readonly PartialProbe[] = [
  { probe: 'clust', leftOut: / href="c" /, issue: '#242', formats: FORMATS },
  { probe: 'elabel', leftOut: / id="R_edge1-(head)?label" /, issue: '#177', formats: ['cmapx'] },
  { probe: 'subst2', leftOut: / id="ia" /, issue: '#249', formats: FORMATS },
];

/** An area line of a node or an edge that carries the root id prefix. */
const PREFIXED_AREA = / id="(R|xG)_(node|edge)\d+" /;

const nativeOf = (probe: string, engine: EngineName, fmt: string): string =>
  read(`native/${probe}.gv.${engine}.${fmt.replace('-np', '_np')}`);

const portOf = (probe: string, engine: EngineName, fmt: string): string =>
  renderFormat(parse(read(`probes/${probe}.gv`)), fmt, engine);

describe('drawingIdOf — GD_drawing(root)->id as graph_init sets it', () => {
  it('is empty when the root graph has no id', () => {
    expect(drawingIdOf(parse('digraph G { a }'))).toBe('');
  });

  it('is empty when the root graph id is the empty string', () => {
    expect(drawingIdOf(parse('digraph G { id=""; a }'))).toBe('');
  });

  it('is the id verbatim when it holds no escape', () => {
    expect(drawingIdOf(parse('digraph Tree { id="G2"; a }'))).toBe('G2');
  });

  it('substitutes \\G with the graph name, as strdup_and_subst_obj does', () => {
    expect(drawingIdOf(parse('digraph G { id="x\\G"; a }'))).toBe('xG');
  });
});

describe('map area ids carry the root graph id prefix', () => {
  for (const probe of EQUAL_PROBES) {
    for (const engine of ENGINES) {
      for (const fmt of FORMATS) {
        it(`${probe} -K${engine} -T${fmt} equals native`, () => {
          expect(portOf(probe, engine, fmt)).toBe(nativeOf(probe, engine, fmt));
        });
      }
    }
  }

  it('prefixes the 2258.dot node and edge areas with G2_', () => {
    const out = portOf('repro', 'dot', 'cmapx');
    expect(out).toContain('<area shape="rect" id="G2_node1" href="xxx" title=" "');
    expect(out).toContain('<area shape="rect" id="G2_node2" href="xxx" title=" "');
    expect(out).toContain('<area shape="poly" id="G2_edge1" title=" "');
  });

  it('prefixes the base id of HTML cell anchors', () => {
    const out = portOf('html', 'dot', 'cmapx');
    expect(out).toContain(' id="R_node1_0" href="t1" ');
    expect(out).toContain(' id="R_node1_1" href="t2" ');
  });

  it('leaves an own id unprefixed and prefixes its siblings', () => {
    const out = portOf('ownid', 'dot', 'cmapx');
    expect(out).toContain(' id="mine" href="n" ');
    expect(out).toContain(' id="eid" href="e" ');
    expect(out).toContain(' id="R_node2" href="m" ');
  });

  it('prints no prefix when the root graph has no id', () => {
    for (const engine of ENGINES) {
      for (const fmt of FORMATS) {
        expect(portOf('noid', engine, fmt)).toBe(nativeOf('noid', engine, fmt));
      }
    }
  });

  for (const { probe, leftOut, issue, formats } of PARTIAL_PROBES) {
    for (const engine of ENGINES) {
      for (const fmt of formats) {
        it(`${probe} -K${engine} -T${fmt} equals native outside the ${issue} lines`, () => {
          const owned = nativeOf(probe, engine, fmt).split('\n').filter((l) => !leftOut.test(l));
          expect(owned.filter((l) => PREFIXED_AREA.test(l)).length).toBeGreaterThan(0);
          expect(portOf(probe, engine, fmt).split('\n')).toEqual(expect.arrayContaining(owned));
        });
      }
    }
  }
});

describe('svg ids carry the substituted root graph id', () => {
  it('prints xG_node1 for a root id of x\\G', () => {
    expect(portOf('subst', 'dot', 'svg')).toContain('<g id="xG_node1" class="node">');
  });

  it('still prints the raw id as the prefix when it holds no escape', () => {
    expect(portOf('repro', 'dot', 'svg')).toContain('<g id="G2_node1" class="node">');
  });
});
