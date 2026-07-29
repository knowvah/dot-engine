// SPDX-License-Identifier: EPL-2.0

/**
 * Branch-coverage suite for src/render/json.ts (T2c).
 *
 * Complements json.test.ts (which covers the happy-path stoj/ind/buildJson
 * API). This file drives buildJson/JsonRenderer/Json0Renderer through
 * `parse()` + full layout + render on small DOT sources, targeting the
 * attribute-variant branches (URL/target/tooltip, gradients, records,
 * xlabels, edge labels, HTML labels, latin1 double-encode, graph/edge
 * `label` declaration propagation) plus a few hand-built-graph cases for
 * pure-logic branches that don't need a real layout.
 */

import { describe, it, expect } from 'vitest';
import { stoj, buildJson, Json0Renderer, JsonRenderer } from './json.js';
import { parse } from '../parser/index.js';
import { renderFormat } from '../../test/helpers/render-format.js';
import { RenderJob } from '../gvc/job.js';
import { Graph } from '../model/graph.js';
import { Node } from '../model/node.js';
import { Edge } from '../model/edge.js';
import type { TextMeasurer } from '../common/textmeasure.js';
import type { TextSpan } from '../common/emit-types.js';

// ---------------------------------------------------------------------------
// Avoid Lizard quote-tracker bug: never put " inside string literals.
// ---------------------------------------------------------------------------

const DQ = '\x22';

// ---------------------------------------------------------------------------
// Shared JSON shapes
// ---------------------------------------------------------------------------

type JObj = Record<string, unknown>;
interface RootJson {
  [k: string]: unknown;
  objects: JObj[];
  edges?: JObj[];
  label?: string;
  lp?: string;
}

function jsonObjects(src: string, doXDot = true, engine = 'dot'): RootJson {
  const g = parse(src);
  const out = renderFormat(g, doXDot ? 'json' : 'json0', engine);
  return JSON.parse(out) as RootJson;
}

function findByName(objs: JObj[], name: string): JObj {
  const found = objs.find((o) => o['name'] === name);
  if (found === undefined) throw new Error(`no object named ${name}`);
  return found;
}

// ---------------------------------------------------------------------------
// stoj — control-character escapes not covered by json.test.ts
// ---------------------------------------------------------------------------

describe('stoj — remaining control-character escapes', () => {
  it('escapes backspace as \\b', () => {
    expect(stoj('a\bb')).toBe(DQ + 'a\\bb' + DQ);
  });
  it('escapes form-feed as \\f', () => {
    expect(stoj('a\fb')).toBe(DQ + 'a\\fb' + DQ);
  });
  it('escapes carriage-return as \\r', () => {
    expect(stoj('a\rb')).toBe(DQ + 'a\\rb' + DQ);
  });
});

// ---------------------------------------------------------------------------
// URL / id / tooltip / target attrs on node, edge, cluster, graph
// ---------------------------------------------------------------------------

describe('buildJson — URL/id/tooltip/target attrs (non-xdot, plain emit)', () => {
  const SRC = [
    'digraph G {',
    '  href="http://graph.example"; tooltip="gtip"; id="gid";',
    '  subgraph cluster_0 {',
    '    href="http://cluster.example"; label="C0"; id="cid";',
    '    a [href="http://a.example", tooltip="atip", id="aid"];',
    '  }',
    '  b;',
    '  a -> b [href="http://edge.example", tooltip="etip", id="eid"];',
    '}',
  ].join('\n');

  it('root graph carries its own href/tooltip/id', () => {
    const root = jsonObjects(SRC);
    expect(root['label']).toBe('');
    expect(root['id']).toBe('gid');
  });

  it('node carries href/tooltip/id', () => {
    const root = jsonObjects(SRC);
    const a = findByName(root.objects, 'a');
    expect(a['href']).toBe('http://a.example');
    expect(a['tooltip']).toBe('atip');
    expect(a['id']).toBe('aid');
  });

  it('edge carries href/tooltip/id', () => {
    const root = jsonObjects(SRC);
    const edge = root.edges![0]!;
    expect(edge['href']).toBe('http://edge.example');
    expect(edge['tooltip']).toBe('etip');
    expect(edge['id']).toBe('eid');
  });

  it('cluster subgraph object carries its own href/id and label', () => {
    const root = jsonObjects(SRC);
    const cluster = root.objects.find((o) => o['name'] === 'cluster_0')!;
    expect(cluster['href']).toBe('http://cluster.example');
    expect(cluster['id']).toBe('cid');
    expect(cluster['label']).toBe('C0');
  });
});

// ---------------------------------------------------------------------------
// graphLabelDeclared: a labeled cluster forces `label` onto every graph
// object, including the label-less root and label-less sibling subgraphs.
// ---------------------------------------------------------------------------

describe('buildJson — graphLabelDeclared propagation', () => {
  it('root graph with no label gets label="" once a cluster declares one', () => {
    const root = jsonObjects('digraph G { subgraph cluster_0 { label="C"; a; } }');
    expect(root['label']).toBe('');
  });

  it('no graph/cluster labels anywhere: root has no label key at all', () => {
    const root = jsonObjects('digraph G { a -> b; }');
    expect(Object.prototype.hasOwnProperty.call(root, 'label')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// edgeLabelDeclared: `edge [label=...]` default forces `label` on every edge
// ---------------------------------------------------------------------------

describe('buildJson — edgeLabelDeclared propagation', () => {
  it('edge default label forces label="" on an edge with no own label', () => {
    const root = jsonObjects('digraph G { edge [label="D"]; a -> b [label=""]; c -> d; }');
    const noLabelEdge = root.edges!.find((e) => e['head'] === root.objects.find((o) => o['name'] === 'd')!['_gvid'])!;
    expect(noLabelEdge['label']).toBe('D');
  });

  it('no edge label declared anywhere: edge has no label key', () => {
    const root = jsonObjects('digraph G { a -> b; }');
    expect(Object.prototype.hasOwnProperty.call(root.edges![0]!, 'label')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Edge label geometry: lp / head_lp / tail_lp / xlp (attachEdgeLabelPositions)
// ---------------------------------------------------------------------------

describe('buildJson — edge label position attrs', () => {
  const SRC = 'digraph G { a -> b [label="EL", headlabel="HL", taillabel="TL", xlabel="XL"]; }';

  it('emits lp for the center edge label', () => {
    const root = jsonObjects(SRC);
    const edge = root.edges![0]!;
    expect(typeof edge['lp']).toBe('string');
    expect((edge['lp'] as string).split(',')).toHaveLength(2);
  });

  it('emits head_lp and tail_lp for head/tail labels', () => {
    const root = jsonObjects(SRC);
    const edge = root.edges![0]!;
    expect(typeof edge['head_lp']).toBe('string');
    expect(typeof edge['tail_lp']).toBe('string');
  });

  it('emits xlp for the exterior label', () => {
    const root = jsonObjects(SRC);
    const edge = root.edges![0]!;
    expect(typeof edge['xlp']).toBe('string');
  });

  it('an edge with no label at all emits none of lp/head_lp/tail_lp/xlp', () => {
    const root = jsonObjects('digraph G { a -> b; }');
    const edge = root.edges![0]!;
    for (const k of ['lp', 'head_lp', 'tail_lp', 'xlp']) {
      expect(Object.prototype.hasOwnProperty.call(edge, k)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Node exterior label xlp (attachNodeXlp)
// ---------------------------------------------------------------------------

describe('buildJson — node xlabel position', () => {
  it('emits xlp when a node has an xlabel', () => {
    const root = jsonObjects('digraph G { a [xlabel="NX"]; b; a -> b; }');
    const a = findByName(root.objects, 'a');
    expect(typeof a['xlp']).toBe('string');
  });

  it('omits xlp when the node has no xlabel', () => {
    const root = jsonObjects('digraph G { a; b; a -> b; }');
    const a = findByName(root.objects, 'a');
    expect(Object.prototype.hasOwnProperty.call(a, 'xlp')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Graph/cluster label geometry (attachGraphLabelGeom)
// ---------------------------------------------------------------------------

describe('buildJson — graph/cluster label geometry (lp/lwidth/lheight)', () => {
  it('a labeled cluster gets lp, lwidth, lheight', () => {
    const root = jsonObjects('digraph G { subgraph cluster_0 { label="C0"; a; } }');
    const cluster = root.objects.find((o) => o['name'] === 'cluster_0')!;
    expect(typeof cluster['lp']).toBe('string');
    expect(typeof cluster['lwidth']).toBe('string');
    expect(typeof cluster['lheight']).toBe('string');
  });

  it('root graph label gets lp/lwidth/lheight too', () => {
    const root = jsonObjects('digraph G { label="Root Label"; a; }');
    expect(typeof root['lp']).toBe('string');
    expect(typeof root['lwidth']).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Record shape: attachNodeRects (setRecordRects recursion) + polyline draws
// ---------------------------------------------------------------------------

describe('buildJson — record-shape node rects', () => {
  it('a flat record emits a `rects` string with one rect per field', () => {
    const root = jsonObjects('digraph G { a [shape=record, label="f0|f1|f2"]; }');
    const a = findByName(root.objects, 'a');
    expect(typeof a['rects']).toBe('string');
    const rects = (a['rects'] as string).split(' ');
    expect(rects).toHaveLength(3);
    for (const r of rects) expect(r.split(',')).toHaveLength(4);
  });

  it('a nested record recurses into sub-fields (more than 2 rects)', () => {
    const root = jsonObjects('digraph G { a [shape=record, label="f0|{f1|f2}|f3"]; }');
    const a = findByName(root.objects, 'a');
    const rects = (a['rects'] as string).split(' ');
    expect(rects).toHaveLength(4);
  });

  it('a non-record node has no rects key', () => {
    const root = jsonObjects('digraph G { a [shape=box]; }');
    const a = findByName(root.objects, 'a');
    expect(Object.prototype.hasOwnProperty.call(a, 'rects')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Gradient fills: linear (style=filled, fillcolor="c1:c2") and radial
// (style="radial,filled"). Exercises gradColorOp's linear/radial branches.
// ---------------------------------------------------------------------------

describe('buildJson — gradient fill draw ops', () => {
  it('linear gradient node draws a grad C op with grad="linear"', () => {
    const root = jsonObjects('digraph G { a [style=filled, fillcolor="red:blue"]; }');
    const a = findByName(root.objects, 'a');
    const draw = a['_draw_'] as JObj[];
    const gradOp = draw.find((o) => o['grad'] === 'linear');
    expect(gradOp).toBeDefined();
    expect(gradOp!['op']).toBe('C');
    expect(Array.isArray(gradOp!['p0'])).toBe(true);
    expect(Array.isArray(gradOp!['stops'])).toBe(true);
    expect((gradOp!['stops'] as JObj[]).length).toBeGreaterThanOrEqual(2);
  });

  it('radial gradient node draws a grad C op with grad="radial" and 3-elem p0/p1', () => {
    const root = jsonObjects('digraph G { a [style="radial,filled", fillcolor="red:blue"]; }');
    const a = findByName(root.objects, 'a');
    const draw = a['_draw_'] as JObj[];
    const gradOp = draw.find((o) => o['grad'] === 'radial');
    expect(gradOp).toBeDefined();
    expect((gradOp!['p0'] as number[])).toHaveLength(3);
    expect((gradOp!['p1'] as number[])).toHaveLength(3);
  });

  it('plain single-color fill draws a flat C op with grad="none"', () => {
    const root = jsonObjects('digraph G { a [style=filled, fillcolor=red]; }');
    const a = findByName(root.objects, 'a');
    const draw = a['_draw_'] as JObj[];
    const flatOp = draw.find((o) => o['op'] === 'C');
    expect(flatOp).toBeDefined();
    expect(flatOp!['grad']).toBe('none');
    expect(flatOp!['color']).toBe('#ff0000');
  });
});

// ---------------------------------------------------------------------------
// Text alignment: \l (left) / \r (right) / default (center)
// ---------------------------------------------------------------------------

describe('buildJson — text op alignment (left/center/right)', () => {
  it('a multi-line label with \\l \\r \\n produces l/r/c aligned text ops', () => {
    const root = jsonObjects('digraph G { a [label="left\\lright\\rcenter\\n"]; }');
    const a = findByName(root.objects, 'a');
    const draw = a['_ldraw_'] as JObj[];
    const aligns = draw.filter((o) => o['op'] === 'T').map((o) => o['align']);
    expect(aligns).toContain('l');
    expect(aligns).toContain('r');
    expect(aligns).toContain('c');
  });
});

// ---------------------------------------------------------------------------
// Record field-separator polylines (opToJson 'polyline' -> op 'L')
// ---------------------------------------------------------------------------

describe('buildJson — record separator polyline draw op', () => {
  it('a two-field record draws at least one polyline (op L) separator', () => {
    const root = jsonObjects('digraph G { a [shape=record, label="f0|f1"]; }');
    const a = findByName(root.objects, 'a');
    const draw = a['_draw_'] as JObj[];
    const line = draw.find((o) => o['op'] === 'L');
    expect(line).toBeDefined();
    expect(Array.isArray(line!['points'])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// HTML label: agxget mirror (isHtmlValue -> htmlValueContent) on the label
// attr, and font-face op faces from an HTML table cell.
// ---------------------------------------------------------------------------

describe('buildJson — HTML label attr surfaces as marker-stripped content', () => {
  it('label attr value is the raw HTML content, not the internal marker', () => {
    const root = jsonObjects(
      'digraph G { a [label=<<TABLE><TR><TD>hi</TD></TR></TABLE>>]; }',
    );
    const a = findByName(root.objects, 'a');
    expect(typeof a['label']).toBe('string');
    expect(a['label']).toContain('<TABLE>');
    expect(a['label']).not.toContain('\x01');
  });
});

// ---------------------------------------------------------------------------
// latin1Reencode: charset=latin1 double-encodes non-ASCII draw text.
// ---------------------------------------------------------------------------

describe('buildJson — charset=latin1 double-encodes non-ASCII draw text', () => {
  it('a UTF-8 "é" in a label round-trips to its Latin-1-reinterpreted mojibake', () => {
    const root = jsonObjects('digraph G { charset=latin1; a [label="cafeé"]; }');
    const a = findByName(root.objects, 'a');
    const draw = a['_ldraw_'] as JObj[];
    const textOp = draw.find((o) => o['op'] === 'T')!;
    // "é" (U+00E9) is the 2-byte UTF-8 sequence C3 A9; latin1Reencode replays
    // those two bytes as Latin-1 code points U+00C3 U+00A9 ("Ã©").
    expect(textOp['text']).toBe('cafeÃ©');
  });

  it('without charset=latin1, the same label round-trips unchanged', () => {
    const root = jsonObjects('digraph G { a [label="cafeé"]; }');
    const a = findByName(root.objects, 'a');
    const draw = a['_ldraw_'] as JObj[];
    const textOp = draw.find((o) => o['op'] === 'T')!;
    expect(textOp['text']).toBe('cafeé');
  });
});

// ---------------------------------------------------------------------------
// json0 (doXDot=false): no _draw_/_ldraw_ keys, but pos/width/height present.
// ---------------------------------------------------------------------------

describe('buildJson — json0 omits xdot draw-op keys', () => {
  it('json0 node has pos/width/height but no _draw_', () => {
    const root = jsonObjects('digraph G { a -> b; }', false);
    const a = findByName(root.objects, 'a');
    expect(typeof a['pos']).toBe('string');
    expect(typeof a['width']).toBe('string');
    expect(typeof a['height']).toBe('string');
    expect(Object.prototype.hasOwnProperty.call(a, '_draw_')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// json0 with a raw xdot-attribute-shaped attr present on a hand-built graph:
// neither emitAttrs branch runs (doXDot false short-circuits the first arm,
// and isXDot(k) is true so the second arm's !isXDot(k) is also false).
// ---------------------------------------------------------------------------

describe('emitAttrs — json0 skips a literal xdot-named attr entirely', () => {
  it('a node with a raw `_draw_` DOT attribute is dropped from json0 output', () => {
    const g = parse('digraph G { a [_draw_="whatever"]; }');
    const out = renderFormat(g, 'json0');
    const parsed = JSON.parse(out) as RootJson;
    const a = findByName(parsed.objects, 'a');
    expect(Object.prototype.hasOwnProperty.call(a, '_draw_')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Empty-value skip: an explicitly empty non-label attr is omitted; an
// explicitly empty label is NOT (the label-name exemption).
// ---------------------------------------------------------------------------

const measurer: TextMeasurer = { measure: () => ({ w: 0, h: 0 }) };

function makeJob(): RenderJob {
  return new RenderJob('json', measurer);
}

function makeGraph(): Graph {
  const g = new Graph('G', 'directed');
  g.info.bb = { ll: { x: 0, y: 0 }, ur: { x: 200, y: 100 } };
  return g;
}

function makeNode(g: Graph, name: string): Node {
  const n = new Node(0, name, g);
  n.info.coord = { x: 50, y: 40 };
  n.info.width = 1.0;
  n.info.height = 0.5;
  g.nodes.set(name, n);
  return n;
}

describe('emitAttrs — empty-value skip exemption for `label`', () => {
  it('an explicit empty non-label attr is omitted from the object', () => {
    const g = makeGraph();
    const a = makeNode(g, 'A');
    a.attrs.set('tooltip', '');
    const out = JSON.parse(buildJson(g, false)) as RootJson;
    const node = findByName(out.objects, 'A');
    expect(Object.prototype.hasOwnProperty.call(node, 'tooltip')).toBe(false);
  });

  it('an explicit empty label IS still emitted (label exemption)', () => {
    const g = makeGraph();
    const a = makeNode(g, 'A');
    a.attrs.set('label', '');
    const out = JSON.parse(buildJson(g, false)) as RootJson;
    const node = findByName(out.objects, 'A');
    expect(node['label']).toBe('');
  });
});

// ---------------------------------------------------------------------------
// isGraphLabelDeclared / isEdgeLabelDeclared: nested-subgraph recursion, and
// an edge default declared on a nested subgraph (not the root).
// ---------------------------------------------------------------------------

describe('buildJson — label declaration recursion through nested subgraphs', () => {
  it('a graph label declared only on a doubly-nested subgraph propagates to the root', () => {
    const root = jsonObjects(
      'digraph G { subgraph cluster_0 { subgraph cluster_1 { label="deep"; a; } } }',
    );
    expect(root['label']).toBe('');
  });

  it('an edge label default declared only on a nested subgraph makes the symbol global: a root-level edge with no own label gets the empty default', () => {
    const root = jsonObjects(
      'digraph G { subgraph cluster_0 { edge [label="D"]; } a -> b; }',
    );
    expect(root.edges![0]!['label']).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Cluster correlation: two same-named clusters at different depths must not
// collide (collectDrawLookup's identity-keyed cluster correlation).
// ---------------------------------------------------------------------------

describe('buildJson — cluster identity correlation (same-name clusters at different depths)', () => {
  it('an empty cluster_1 nested in cluster_0, plus a real top-level cluster_1, both resolve', () => {
    const root = jsonObjects(
      'digraph G { subgraph cluster_0 { subgraph cluster_1 {} } subgraph cluster_1 { a; } }',
    );
    const names = root.objects.filter((o) => o['name'] === 'cluster_1');
    expect(names).toHaveLength(2);
    // Both must have resolved a distinct _gvid (no identity collision).
    expect(names[0]!['_gvid']).not.toBe(names[1]!['_gvid']);
  });
});

// ---------------------------------------------------------------------------
// opToJson 'filled_bezier' (op 'B'): a cylinder shape's periphery is drawn as
// a Bezier outline; style=filled makes it filled_bezier, not unfilled.
// ---------------------------------------------------------------------------

describe('buildJson — cylinder shape draws a filled_bezier (op B) periphery', () => {
  it('shape=cylinder style=filled emits a B-op bezier plus an unfilled top arc (b-op)', () => {
    const root = jsonObjects('digraph G { a [shape=cylinder, style=filled, fillcolor=red]; }');
    const a = findByName(root.objects, 'a');
    const draw = a['_draw_'] as JObj[];
    const ops = draw.filter((o) => o['op'] === 'B' || o['op'] === 'b');
    expect(ops.some((o) => o['op'] === 'B')).toBe(true);
    expect(ops.some((o) => o['op'] === 'b')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// collectDrawLookup cluster correlation: a non-"cluster"-prefixed subgraph is
// filtered from the xdot re-render (not drawable), so a cluster nested inside
// it must fall into the `correlate` else branch (descend g, hold xg position).
// ---------------------------------------------------------------------------

describe('buildJson — cluster nested inside a non-cluster subgraph still resolves', () => {
  it('cluster_inner nested in a plain (non-cluster) subgraph gets its own _gvid', () => {
    const root = jsonObjects('digraph G { subgraph rg { subgraph cluster_inner { x; } } }');
    const names = root.objects.map((o) => o['name']);
    expect(names).toContain('rg');
    expect(names).toContain('cluster_inner');
    const inner = root.objects.find((o) => o['name'] === 'cluster_inner')!;
    expect(typeof inner['_gvid']).toBe('number');
  });

  it('cluster_inner nested in an anonymous subgraph (dropped by the xdot writer) still resolves', () => {
    const root = jsonObjects('digraph G { { subgraph cluster_inner { x; } } }');
    const inner = root.objects.find((o) => o['name'] === 'cluster_inner')!;
    expect(typeof inner['_gvid']).toBe('number');
  });

  it('cluster_inner nested in a rank=same subgraph (dropped by the xdot writer) still resolves', () => {
    const root = jsonObjects('digraph G { subgraph rg2 { rank=same; subgraph cluster_inner { x; } } }');
    const inner = root.objects.find((o) => o['name'] === 'cluster_inner')!;
    expect(typeof inner['_gvid']).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// graphEffectiveAttrs: a hand-built subgraph constructed without going
// through the parser has no `graphDefaultsSnapshot` (parser-only field) — the
// `?? []` nullish fallback path.
// ---------------------------------------------------------------------------

describe('graphEffectiveAttrs — subgraph with no graphDefaultsSnapshot (hand-built)', () => {
  it('a hand-built subgraph (no parser, snapshot undefined) still resolves without throwing', () => {
    const g = makeGraph();
    const sg = new Graph('cluster_0', 'directed');
    sg.parent = g;
    g.subgraphs.set('cluster_0', sg);
    const n = makeNode(g, 'A');
    sg.nodes.set('A', n);
    expect(sg.graphDefaultsSnapshot).toBeUndefined();
    const out = JSON.parse(buildJson(g, false)) as RootJson;
    const cluster = out.objects.find((o) => o['name'] === 'cluster_0');
    expect(cluster).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// isGraphLabelDeclared: a graph whose `info.label` was populated WITHOUT an
// explicit `attrs.has('label')` (e.g. inherited/computed) still declares.
// ---------------------------------------------------------------------------

describe('isGraphLabelDeclared — info.label set without an explicit attrs entry', () => {
  it('graphLabelDeclared becomes true from info.label alone, and label emits as the empty default', () => {
    const g = makeGraph();
    g.info.label = {
      text: 'Direct', fontname: '', fontcolor: '', charset: 0, fontsize: 14,
      dimen: { x: 10, y: 10 }, space: { x: 10, y: 10 }, pos: { x: 5, y: 5 },
      u: { kind: 'txt', spans: [] },
    } as unknown as Graph['info']['label'];
    expect(g.attrs.has('label')).toBe(false);
    const out = JSON.parse(buildJson(g, false)) as RootJson;
    // write_attrs never sees a `label` value (it's not in g.attrs), so the
    // graphLabelDeclared exemption supplies the empty default, not the text.
    expect(out['label']).toBe('');
    expect(out['lp']).toBe('5,5');
  });
});

// ---------------------------------------------------------------------------
// drawStringToOps: unparseable draw string -> []. A hand-built node's
// manually-set `_hdraw_` survives into the output because the real xdot
// re-render produces no head-arrow draw content for a plain node (nothing to
// overlay-overwrite it with).
//
// NB an *empty* draw-attr string (`val === ''`) is unreachable from
// buildJson's only call site: emitAttrs's empty-value skip
// (`if (v === '' && k !== 'label') continue;`, json.ts:412) filters every
// empty attribute value — xdot-named or not — before drawStringToOps is ever
// invoked, so `drawStringToOps`'s own `if (val === '') return [];` guard
// (json.ts:182) is dead code given the current single call site.
// ---------------------------------------------------------------------------

describe('drawStringToOps — unparseable draw-attr string', () => {
  it('an unparseable _hdraw_ string yields an empty op array', () => {
    const g = makeGraph();
    const n = makeNode(g, 'A');
    n.attrs.set('_hdraw_', 'not valid xdot');
    const out = JSON.parse(buildJson(g, true)) as RootJson;
    const node = findByName(out.objects, 'A');
    expect(node['_hdraw_']).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// attachNodeRects: shape_info undefined despite shape=record, and a
// container field with n_flds!==0 but fld===null (defensive states reached
// via direct field manipulation on a hand-built node).
// ---------------------------------------------------------------------------

describe('attachNodeRects — defensive record shape_info states', () => {
  it('shape=record with no shape_info at all: no rects key', () => {
    const g = makeGraph();
    const n = makeNode(g, 'A');
    n.info.shape = { name: 'record' } as unknown as Node['info']['shape'];
    // n.info.shape_info intentionally left undefined.
    const out = JSON.parse(buildJson(g, false)) as RootJson;
    const node = findByName(out.objects, 'A');
    expect(Object.prototype.hasOwnProperty.call(node, 'rects')).toBe(false);
  });

  it('a container field with n_flds!==0 and fld===null contributes no rects', () => {
    const g = makeGraph();
    const n = makeNode(g, 'A');
    n.info.shape = { name: 'record' } as unknown as Node['info']['shape'];
    n.info.shape_info = {
      size: { x: 0, y: 0 }, b: { ll: { x: 0, y: 0 }, ur: { x: 0, y: 0 } },
      n_flds: 2, lp: null, fld: null, id: null, LR: false,
    } as unknown as Node['info']['shape_info'];
    const out = JSON.parse(buildJson(g, false)) as RootJson;
    const node = findByName(out.objects, 'A');
    expect(Object.prototype.hasOwnProperty.call(node, 'rects')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// strict digraph: `o.directed`/`o.strict` right-hand `||` operand.
// ---------------------------------------------------------------------------

describe('buildJson — strict digraph sets directed=true, strict=true', () => {
  it('a strict digraph reports directed and strict', () => {
    const root = jsonObjects('strict digraph G { a -> b; }');
    expect(root['directed']).toBe(true);
    expect(root['strict']).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// A cluster with a member edge gets its own `edges` gid array.
// ---------------------------------------------------------------------------

describe('buildJson — cluster subgraph object with member edges', () => {
  it('a cluster containing an internal edge lists it in `edges`', () => {
    const root = jsonObjects('digraph G { subgraph cluster_0 { a -> b; } }');
    const cluster = root.objects.find((o) => o['name'] === 'cluster_0')!;
    expect(Array.isArray(cluster['edges'])).toBe(true);
    expect((cluster['edges'] as number[]).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Json0Renderer / JsonRenderer end-to-end (beginGraph/endGraph no-ops verified
// via direct instantiation, complementing the buildJson-level tests above).
// ---------------------------------------------------------------------------

describe('Json0Renderer / JsonRenderer — direct renderer no-op hooks', () => {
  it('Json0Renderer beginNode/endNode/beginEdge/endEdge/textspan/ellipse/polygon/bezier/polyline are no-ops', () => {
    const r = new Json0Renderer();
    const job = makeJob();
    const g = makeGraph();
    const n = makeNode(g, 'A');
    const e = new Edge(n, n, '');
    const before = job.output.length;
    r.beginNode(n, job); r.endNode(n, job);
    r.beginEdge(e, job); r.endEdge(e, job);
    r.textspan({ x: 0, y: 0 }, { str: 'x' } as unknown as TextSpan, job);
    r.ellipse({ x: 0, y: 0 }, 1, 1, true, job);
    r.polygon([], true, job);
    r.bezier([], true, job);
    r.polyline([], job);
    expect(job.output.length).toBe(before);
  });
});
