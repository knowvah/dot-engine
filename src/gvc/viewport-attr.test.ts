// SPDX-License-Identifier: EPL-2.0
/**
 * The `viewport` graph attribute (issue #197). init_job_viewport reads
 * `W,H,Z,x,y` or `W,H,Z,node` (the node quoted or bare) with three sscanf
 * formats and sets the job's view, zoom and focus. The view fixes the page
 * size and job->clip, so a node or edge outside it is not drawn; plain prints
 * the zoom.
 *
 * Every native ref is the carried oracle's own output (ADR-0003), written by
 * the harness's `recapture.sh`. The `rtest-*` probes port tests.txt's
 * `viewport` cases: graphs/viewport.gv with each `-Gviewport` value set in the
 * file, under neato without `-n2` (the port has no `-n`).
 * @see lib/common/emit.c:init_job_viewport
 * @see lib/common/emit.c:emit_edge (edge_in_box gate)
 */
import { readdirSync, readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { renderFormat } from '../../test/helpers/render-format.js';
import { agseterrf } from '../common/agerr.js';
import { parse } from '../parser/index.js';
import type { Graph } from '../model/graph.js';
import { applyViewportAttr, initJobViewport, setupPageClip, type JobViewport } from './viewport.js';

const HARNESS_197 = new URL('../../plans/issue-197-viewport/harness/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, HARNESS_197), 'utf8');
const PROBE_COUNT = 47;
/** tests.txt's `viewport` cases (graphs/viewport.gv), run under neato as there. */
const RTEST_PREFIX = 'rtest-';
const PROBES = readdirSync(new URL('probes/', HARNESS_197))
  .filter((f) => f.endsWith('.gv'))
  .map((f) => f.replace(/\.gv$/, ''))
  .sort();
const FORMATS = ['svg', 'xdot', 'json', 'cmapx', 'plain'] as const;

/** json parsed with every object's keys sorted: the port's key order is #184's. */
function sortedJson(text: string): string {
  return JSON.stringify(JSON.parse(text), (_k, v: unknown) => {
    if (v === null || typeof v !== 'object' || Array.isArray(v)) return v;
    const o = v as Record<string, unknown>;
    return Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
  });
}

/** svg from `<svg` on, the tag's whitespace collapsed: the header comments and line breaks differ. */
function svgBody(text: string): string {
  const at = text.indexOf('<svg');
  const end = text.indexOf('>', at);
  return text.slice(at, end + 1).replace(/\s+/g, ' ') + text.slice(end + 1);
}

function norm(format: string, text: string): string {
  if (format === 'json') return sortedJson(text);
  return format === 'svg' ? svgBody(text) : text;
}

/** The port's output and everything it reported through agerr. */
function port(probe: string, format: string): { out: string; err: string } {
  const errs: string[] = [];
  agseterrf((m) => { errs.push(m); return 0; });
  const engine = probe.startsWith(RTEST_PREFIX) ? 'neato' : 'dot';
  const out = renderFormat(parse(read(`probes/${probe}.gv`)), format, engine);
  return { out, err: errs.join('') };
}

afterEach(() => { agseterrf(null); });

describe('viewport= matches native (#197)', () => {
  it('reads every probe', () => {
    expect(PROBES).toHaveLength(PROBE_COUNT);
  });

  for (const probe of PROBES) {
    for (const format of FORMATS) {
      it(`${probe} -T${format}`, () => {
        const got = port(probe, format);
        expect(norm(format, got.out)).toBe(norm(format, read(`native/${probe}.${format}`)));
        if (format === 'svg') expect(got.err).toBe(read(`native/${probe}.err`));
      });
    }
  }
});

/** A graph whose root has `viewport` set to `value` and a node `c` at (27, 90). */
function graphWith(value: string): Graph {
  const g = parse(`digraph G { viewport="${value}"; c }`);
  g.nodes.get('c')!.info.coord = { x: 27, y: 90 };
  return g;
}

/** The default viewport of a 54 x 252 bb with no pad and no size=. */
const DEFAULT: JobViewport = initJobViewport({ ll: { x: 0, y: 0 }, ur: { x: 54, y: 252 } }, null, { x: 0, y: 0 });

describe('applyViewportAttr: init_job_viewport\'s three sscanf formats', () => {
  it('starts from the bb centre, Z = 1 and the bb as the view', () => {
    expect(DEFAULT).toEqual({ view: { x: 54, y: 252 }, zoom: 1, focus: { x: 27, y: 126 } });
  });

  const cases: [string, JobViewport][] = [
    ['60,60,1,30,30', { view: { x: 60, y: 60 }, zoom: 1, focus: { x: 30, y: 30 } }],
    ['60,60,2,c', { view: { x: 60, y: 60 }, zoom: 2, focus: { x: 27, y: 90 } }],
    ["60,60,1,'c'", { view: { x: 60, y: 60 }, zoom: 1, focus: { x: 27, y: 90 } }],
    // rv == 4 needs no closing quote.
    ["60,60,1,'c", { view: { x: 60, y: 60 }, zoom: 1, focus: { x: 27, y: 90 } }],
    // A name that is no node keeps the default focus; a lone fourth number is a name.
    ['60,60,1,nosuch', { view: { x: 60, y: 60 }, zoom: 1, focus: { x: 27, y: 126 } }],
    ['60,60,1,30', { view: { x: 60, y: 60 }, zoom: 1, focus: { x: 27, y: 126 } }],
    // A name with a comma after it: %c reads it (rv 5), then %lf fails on the name.
    ['60,60,1,c,5', { view: { x: 60, y: 60 }, zoom: 1, focus: { x: 27, y: 126 } }],
    // Short values override only their leading fields.
    ['100,80', { view: { x: 100, y: 80 }, zoom: 1, focus: { x: 27, y: 126 } }],
    ['100,80,0.5', { view: { x: 100, y: 80 }, zoom: 0.5, focus: { x: 27, y: 126 } }],
    ['abc', DEFAULT],
    ['', DEFAULT],
    // %lf skips leading whitespace; the literal comma does not.
    [' 60, 60,1,30,30', { view: { x: 60, y: 60 }, zoom: 1, focus: { x: 30, y: 30 } }],
    ['60 ,60,1,30,30', { view: { x: 60, y: 252 }, zoom: 1, focus: { x: 27, y: 126 } }],
    ['0x3Cp0,60,1,30,30', { view: { x: 60, y: 60 }, zoom: 1, focus: { x: 30, y: 30 } }],
    ['60,60,1,30,30,99', { view: { x: 60, y: 60 }, zoom: 1, focus: { x: 30, y: 30 } }],
  ];
  for (const [value, want] of cases) {
    it(`viewport="${value}"`, () => {
      expect(applyViewportAttr(DEFAULT, graphWith(value))).toEqual(want);
    });
  }

  it('leaves the viewport alone when the attribute is unset', () => {
    const g = parse('digraph G { c }');
    expect(applyViewportAttr(DEFAULT, g)).toBe(DEFAULT);
  });

  it('centres the clip on the focus, a view / zoom wide', () => {
    const vp = applyViewportAttr(DEFAULT, graphWith('100,100,2,27,126'));
    expect(setupPageClip(vp)).toEqual({ ll: { x: 2, y: 101 }, ur: { x: 52, y: 151 } });
  });
});
