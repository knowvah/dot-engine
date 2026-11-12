// SPDX-License-Identifier: EPL-2.0
//
// The job pad comes from the render device (issue #141). C's init_job_pad takes
// `pad=` when the graph sets it and the render plugin's default_pad otherwise:
// 4 for svg and map, 0 for dot, xdot, plain and json. setup_page builds
// job->clip from the padded bb, and emit_node gates each node on
// node_in_box(n, job->clip).
//
// A node lies outside GD_bb only where a layout stops before it sets the bb.
// The `abort-*` inputs are corpus 2825 with a URL on every node: dot_concentrate
// fails, dot_position returns before set_aspect, GD_bb stays 0,0,0,0, and each
// node keeps its rank y and its mincross order as x. Node G is on the lowest
// rank at x 0; the cluster margins put its box 2 pt above the bb (near), on it
// (touch) or 16 pt above it (far). The refs under
// plans/issue-141-nodeinbox-pad/harness are native 16.1.0's (regen.sh).
// @see lib/common/emit.c:3290-3304 init_job_pad
// @see lib/common/emit.c:1550-1564 setup_page
// @see lib/common/emit.c:1808 emit_node (node_in_box)
// @see lib/dotgen/position.c:dot_position
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compareJson } from '../../test/golden/compare-json.js';
import { parse } from '../parser/index.js';
import { Graph as GraphClass } from '../model/graph.js';
import { Node } from '../model/node.js';
import { makeNodeInfo } from '../model/nodeInfo.js';
import type { Box } from '../model/geom.js';
import type { TextMeasurer } from '../common/textmeasure.js';
import { createSvgRenderer } from '../render/svg.js';
import { createDotRenderer, createXdotRenderer } from '../render/dot.js';
import { createJson0Renderer, createJsonRenderer } from '../render/json.js';
import {
  createCmapxNpRenderer, createCmapxRenderer, createImapNpRenderer, createImapRenderer,
  createPlainExtRenderer, createPlainRenderer,
} from '../render/map.js';
import { SVG_PAD } from '../render/svg-helpers.js';
import type { RendererPlugin } from './context.js';
import { createDefaultContext } from './default-context.js';
import { render, renderNode } from './device.js';
import { deviceClip } from './emit-xdot.js';
import { RenderJob } from './job.js';
import { DEFAULT_GRAPH_PAD, parseGraphPad } from './viewport.js';

const stubMeasurer: TextMeasurer = { measure: () => ({ w: 0, h: 0 }) };

/** The pad of the devices whose C render features say 0. */
const NO_PAD = 0;
/** `[0,100]²`, the bb every hand-built job below uses. */
const BB: Box = { ll: { x: 0, y: 0 }, ur: { x: 100, y: 100 } };

const box = (llx: number, lly: number, urx: number, ury: number): Box =>
  ({ ll: { x: llx, y: lly }, ur: { x: urx, y: ury } });

describe('parseGraphPad: pad= or the fallback init_job_pad passes', () => {
  it('returns the fallback when pad= is unset', () => {
    expect(parseGraphPad(undefined, NO_PAD)).toEqual({ x: 0, y: 0 });
    expect(parseGraphPad(undefined, SVG_PAD)).toEqual({ x: 4, y: 4 });
  });

  it('returns pad= in points whatever the fallback', () => {
    expect(parseGraphPad('0.5', NO_PAD)).toEqual({ x: 36, y: 36 });
    expect(parseGraphPad('1,2', SVG_PAD)).toEqual({ x: 72, y: 144 });
  });

  it('returns the fallback when pad= does not parse', () => {
    expect(parseGraphPad('x', SVG_PAD)).toEqual({ x: 4, y: 4 });
    expect(parseGraphPad('x', NO_PAD)).toEqual({ x: 0, y: 0 });
  });

  it('names C\'s non-plugin default', () => {
    expect(DEFAULT_GRAPH_PAD).toBe(4);
  });
});

describe('RendererPlugin.defaultPad: C\'s render features', () => {
  const CASES: ReadonlyArray<readonly [string, () => RendererPlugin, number]> = [
    ['svg', createSvgRenderer, 4],
    ['xdot', createXdotRenderer, 0],
    ['dot', createDotRenderer, 0],
    ['plain', createPlainRenderer, 0],
    ['plain-ext', createPlainExtRenderer, 0],
    ['json', createJsonRenderer, 0],
    ['json0', createJson0Renderer, 0],
    ['imap', createImapRenderer, 4],
    ['imap-np', createImapNpRenderer, 4],
    ['cmapx', createCmapxRenderer, 4],
    ['cmapx-np', createCmapxNpRenderer, 4],
  ];

  it.each(CASES)('%s', (type, make, pad) => {
    const r = make();
    expect(r.type).toBe(type);
    expect(r.defaultPad).toBe(pad);
  });
});

/** A graph with no attributes, or with `pad=`. */
function graphWithPad(pad?: string): GraphClass {
  const g = new GraphClass('G', 'directed');
  if (pad !== undefined) g.attrs.set('pad', pad);
  return g;
}

/** A job over `BB` whose pad is what `render` resolves for `renderer`. */
function jobFor(g: GraphClass, renderer: RendererPlugin): RenderJob {
  const job = new RenderJob(renderer.type, stubMeasurer);
  job.bb = BB;
  job.pad = parseGraphPad(g.attrs.get('pad'), renderer.defaultPad ?? DEFAULT_GRAPH_PAD);
  job.clip = deviceClip(g, job);
  job.renderer = renderer;
  return job;
}

describe('deviceClip: the bb padded by job.pad', () => {
  it('cmapx with no pad= is bb ± 4', () => {
    expect(jobFor(graphWithPad(), createCmapxRenderer()).clip).toEqual(box(-4, -4, 104, 104));
  });

  it('cmapx with pad=0 is the bb', () => {
    expect(jobFor(graphWithPad('0'), createCmapxRenderer()).clip).toEqual(BB);
  });

  it('svg with no pad= is bb ± 4', () => {
    expect(jobFor(graphWithPad(), createSvgRenderer()).clip).toEqual(box(-4, -4, 104, 104));
  });

  it('xdot with no pad= is the bb', () => {
    expect(jobFor(graphWithPad(), createXdotRenderer()).clip).toEqual(BB);
  });

  it('pad=0.5 is bb ± 36 on xdot and svg alike', () => {
    for (const make of [createXdotRenderer, createSvgRenderer]) {
      const job = jobFor(graphWithPad('0.5'), make());
      expect(job.pad).toEqual({ x: 36, y: 36 });
      expect(job.clip).toEqual(box(-36, -36, 136, 136));
    }
  });
});

/** A node with bbox `[102,108]×[95,105]`: outside `BB`, within 4 pt of it. */
function nodeBesideBb(): { n: Node; drawn: () => boolean } {
  const g = new GraphClass('G', 'directed');
  const n = new Node(0, 'A', g);
  let drawn = false;
  n.info = makeNodeInfo();
  n.info.coord = { x: 105, y: 100 };
  n.info.lw = 3;
  n.info.rw = 3;
  n.info.ht = 10;
  n.info.shape = { name: 'ellipse', fns: { codefn: () => { drawn = true; } } } as unknown as typeof n.info.shape;
  return { n, drawn: () => drawn };
}

describe('renderNode: node_in_box reads job.clip', () => {
  it('xdot (pad 0) does not draw a node 2 pt outside the bb', () => {
    const { n, drawn } = nodeBesideBb();
    const r = createXdotRenderer();
    renderNode(n, r, jobFor(graphWithPad(), r), new Set<Node>());
    expect(drawn()).toBe(false);
  });

  it('svg (pad 4) draws it', () => {
    const { n, drawn } = nodeBesideBb();
    const r = createSvgRenderer();
    renderNode(n, r, jobFor(graphWithPad(), r), new Set<Node>());
    expect(drawn()).toBe(true);
  });

  it('reads job.clip, not job.bb ± job.pad', () => {
    const { n, drawn } = nodeBesideBb();
    const r = createSvgRenderer();
    const job = jobFor(graphWithPad(), r);
    job.clip = BB; // the pad alone would admit the node
    renderNode(n, r, job, new Set<Node>());
    expect(drawn()).toBe(false);
  });
});

/** `a`'s box after the dot layout below: `[0,54]×[0,36]`. */
const A_BOX = box(0, 0, 54, 36);
/** A bb whose left side is 2 pt right of `a`: outside it, within the svg pad. */
const BB_BESIDE_A = box(A_BOX.ur.x + 2, 0, 100, 36);

/** Lay `a` out with dot, move the bb beside it, and render `format`. */
function renderBesideBb(format: string, pad?: string): string {
  const ctx = createDefaultContext();
  const g = parse(`digraph G { ${pad === undefined ? '' : `pad=${pad};`} a [URL="u"] }`);
  ctx.layout(g, 'dot');
  const { coord, lw, rw, ht } = g.nodes.get('a')!.info;
  expect(box(coord.x - lw, coord.y - ht / 2, coord.x + rw, coord.y + ht / 2)).toEqual(A_BOX);
  g.info.bb = BB_BESIDE_A;
  return render(ctx, g, format);
}

/** Whether node `a` reached the output of `format`. */
const DRAWN: Readonly<Record<string, (out: string) => boolean>> = {
  svg: (out) => out.includes('<g id="node1" class="node">'),
  cmapx: (out) => out.includes('<area '),
  xdot: (out) => out.slice(out.indexOf('\ta\t[')).includes('_draw_='),
  json: (out) => (JSON.parse(out) as { objects: Array<Record<string, unknown>> }).objects[0]!['_draw_'] !== undefined,
};

describe('render: a node outside GD_bb by less than the svg pad', () => {
  it.each([['svg', true], ['cmapx', true], ['xdot', false], ['json', false]] as const)(
    '%s draws it: %s',
    (format, drawn) => {
      expect(DRAWN[format]!(renderBesideBb(format))).toBe(drawn);
    },
  );

  it.each(['svg', 'cmapx', 'xdot', 'json'] as const)('%s draws it under pad=0.5', (format) => {
    expect(DRAWN[format]!(renderBesideBb(format, '0.5'))).toBe(true);
  });

  it.each(['svg', 'cmapx', 'xdot', 'json'] as const)('%s does not draw it under pad=0', (format) => {
    expect(DRAWN[format]!(renderBesideBb(format, '0'))).toBe(false);
  });
});

const HARNESS_141 = new URL('../../plans/issue-141-nodeinbox-pad/harness/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, HARNESS_141), 'utf8');

type Fmt = 'svg' | 'cmapx' | 'xdot' | 'json';
const FORMATS: readonly Fmt[] = ['svg', 'cmapx', 'xdot', 'json'];
/** The formats whose device pad is 4, then the ones whose pad is 0. */
const PADDED: readonly Fmt[] = ['svg', 'cmapx'];
const UNPADDED: readonly Fmt[] = ['xdot', 'json'];
/** The only node near the degenerate bb. */
const LOWEST = 'G';

/** Fixture → the formats native draws node G in. No other node is ever drawn. */
const NATIVE_DRAWS: ReadonlyArray<readonly [string, readonly Fmt[]]> = [
  ['abort-near', PADDED], // 2 pt outside the bb: inside the pad-4 clip only
  ['abort-touch', FORMATS], // on the bb: inside every clip
  ['abort-far', []], // 16 pt outside
  ['abort-near-pad', FORMATS], // pad=0.05 (3.6 pt) on every device
  ['abort-near-pad0', []], // pad=0 on every device, svg and cmapx included
];

/** Lay the harness source `name` out with dot and render it in `fmt`. */
function renderAbort(name: string, fmt: Fmt): string {
  const ctx = createDefaultContext();
  const g = parse(read(`${name}.gv`));
  ctx.layout(g, 'dot');
  return render(ctx, g, fmt);
}

interface JsonObject { readonly name: string; readonly _draw_?: unknown }
interface JsonGraph { readonly _subgraph_cnt: number; readonly objects: readonly JsonObject[] }

/** The node objects of a json output: write_graph prints the subgraphs first. */
const jsonNodes = (text: string): readonly JsonObject[] => {
  const o = JSON.parse(text) as JsonGraph;
  return o.objects.slice(o._subgraph_cnt);
};

/** The svg from the first group on: the header comment names the generator. */
const svgBody = (svg: string): string => svg.slice(svg.indexOf('<g id=')).trim();

/** The names of the nodes `out` draws, per format. */
const DRAWN_NODES: Readonly<Record<Fmt, (out: string) => string[]>> = {
  svg: (out) => [...out.matchAll(/<g id="node\d+" class="node">\n<title>([^<]*)<\/title>/g)].map((m) => m[1]!),
  cmapx: (out) => [...out.matchAll(/<area [^>]*title="([^"]*)"/g)].map((m) => m[1]!),
  xdot: (out) => [...out.matchAll(/^\t+(\w+)\t\[[^\]]*_draw_=/gm)].map((m) => m[1]!),
  json: (out) => jsonNodes(out).filter((n) => n._draw_ !== undefined).map((n) => n.name),
};

const ABORT_CASES = NATIVE_DRAWS.flatMap(([name, draws]) =>
  FORMATS.map((fmt) => [name, fmt, draws.includes(fmt) ? [LOWEST] : []] as const));

describe('a node beside a degenerate bb is drawn where the device pad reaches it', () => {
  it.each(ABORT_CASES)('%s, %s: native draws %j', (name, fmt, drawn) => {
    expect(DRAWN_NODES[fmt](read(`out/${name}.${fmt}`))).toEqual(drawn);
  });

  it.each(ABORT_CASES)('%s, %s: the port draws %j', (name, fmt, drawn) => {
    expect(DRAWN_NODES[fmt](renderAbort(name, fmt))).toEqual(drawn);
  });

  it('abort-near separates the devices: pad 4 draws G, pad 0 does not', () => {
    for (const fmt of PADDED) expect(DRAWN_NODES[fmt](renderAbort('abort-near', fmt))).toEqual([LOWEST]);
    for (const fmt of UNPADDED) expect(DRAWN_NODES[fmt](renderAbort('abort-near', fmt))).toEqual([]);
  });
});

describe('the abort inputs equal native', () => {
  const NAMES = NATIVE_DRAWS.map(([name]) => name);

  it.each(NAMES)('%s, xdot and cmapx: byte for byte', (name) => {
    for (const fmt of ['xdot', 'cmapx'] as const) expect(renderAbort(name, fmt)).toBe(read(`out/${name}.${fmt}`));
  });

  it.each(NAMES)('%s, svg: from the first group on', (name) => {
    expect(svgBody(renderAbort(name, 'svg'))).toBe(svgBody(read(`out/${name}.svg`)));
  });

  // compareJson reads a subgraph's `nodes` list as a set. Its order differs from native's here
  // (`{rank=same; H; B}`), on the base too (issue #199).
  it.each(NAMES)('%s, json: no difference by the json track\'s comparison', (name) => {
    const port = renderAbort(name, 'json');
    expect(compareJson(port, read(`out/${name}.json`)).diffs).toEqual([]);
    expect(jsonNodes(port)).toEqual(jsonNodes(read(`out/${name}.json`)));
  });
});
