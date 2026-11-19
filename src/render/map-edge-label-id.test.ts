// SPDX-License-Identifier: EPL-2.0
//
// An edge label's map area id carries the label kind as a suffix (issue #177).
//
// C's emit_edge_label builds the anchor id of a label as `<obj->id>-label`
// (center label and xlabel, both EMIT_ELABEL), `<obj->id>-headlabel` or
// `<obj->id>-taillabel`, and map_begin_anchor prints it on the label's
// `<area>`. The whole-edge area keeps the bare id (emit_begin_edge).
//
// Probe inputs and native stdout are read from
// plans/issue-177-cmapx-edge-label-ids/harness/{probes,native}: native
// graphviz 16.1.1 (~/git/graphviz-16.1.1/build/cmd/dot/dot), `-K<engine>
// -T<fmt>`, GVBINDIR=/tmp/ghl1611 for dot and /tmp/ghl1611-all for neato and
// fdp, captured 2026-11-17 by harness/rowcheck.mjs (NATIVE_DIR). They are not
// inlined because the area lines run past 100 columns.
// @see lib/common/emit.c:emit_edge_label
// @see plugin/core/gvrender_core_map.c:map_begin_anchor
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderFormat } from '../../test/helpers/render-format.js';
import { parse } from '../index.js';
import type { EngineName } from '../index.js';

const HARNESS = new URL('../../plans/issue-177-cmapx-edge-label-ids/harness/', import.meta.url);
const read = (rel: string): string => readFileSync(new URL(rel, HARNESS), 'utf8');

const ENGINES: readonly EngineName[] = ['dot', 'neato', 'fdp'];
/** The port's format names; native's files spell `-np` as `_np`. */
const FORMATS = ['cmapx', 'cmapx-np'] as const;

/** Probes with a label area: its id is the line this change owns. */
const LABEL_AREA_PROBES = [
  'repro', 'graphs-url', 'xlabel', 'tooltip', 'ownid', 'rootid', 'edgeurl', 'decorate',
] as const;

/** A URL with no label and a label with no URL: no label area is printed. */
const NO_LABEL_AREA_PROBE = 'nolabel';

const nativeOf = (probe: string, engine: EngineName, fmt: string): string =>
  read(`native/${probe}.gv.${engine}.${fmt.replace('-np', '_np')}`);

const portOf = (probe: string, engine: EngineName, fmt: string): string =>
  renderFormat(parse(read(`probes/${probe}.gv`)), fmt, engine);

const cmapx = (dot: string): string => renderFormat(parse(dot), 'cmapx', 'dot');

describe('edge label map areas equal native', () => {
  for (const probe of [...LABEL_AREA_PROBES, NO_LABEL_AREA_PROBE]) {
    for (const engine of ENGINES) {
      for (const fmt of FORMATS) {
        it(`${probe} -K${engine} -T${fmt} equals native`, () => {
          expect(portOf(probe, engine, fmt)).toBe(nativeOf(probe, engine, fmt));
        });
      }
    }
  }
});

describe('edge label area id suffix, as emit_edge_label builds it', () => {
  it('suffixes a center label with -label', () => {
    const out = cmapx('digraph G { a -> b [label="l", URL="u"] }');
    expect(out).toContain('<area shape="rect" id="edge1-label" href="u" title="l" ');
  });

  it('suffixes a head label with -headlabel', () => {
    const out = cmapx('digraph G { a -> b [headlabel="h", headURL="hu"] }');
    expect(out).toContain('<area shape="rect" id="edge1-headlabel" href="hu" ');
  });

  it('suffixes a tail label with -taillabel', () => {
    const out = cmapx('digraph G { a -> b [taillabel="t", tailURL="tu"] }');
    expect(out).toContain('<area shape="rect" id="edge1-taillabel" href="tu" ');
  });

  it('suffixes an xlabel with -label (EMIT_ELABEL, as the center label)', () => {
    const out = cmapx('digraph G { a -> b [xlabel="x", labelURL="lx"] }');
    expect(out).toContain('<area shape="rect" id="edge1-label" href="lx" ');
  });

  it('suffixes the edge\'s own id', () => {
    const out = cmapx('digraph G { a -> b [id="E1", label="l", URL="u"] }');
    expect(out).toContain('<area shape="rect" id="E1-label" href="u" ');
    expect(out).toContain('<area shape="poly" id="E1" href="u" ');
  });

  it('keeps the bare id on the whole-edge area', () => {
    const out = cmapx('digraph G { a -> b [label="l", URL="u"] }');
    expect(out).toContain('<area shape="poly" id="edge1" href="u" title="l" ');
    expect(out.match(/ id="edge1" /g)).toHaveLength(1);
  });
});
