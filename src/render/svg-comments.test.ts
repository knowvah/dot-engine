// SPDX-License-Identifier: EPL-2.0

/**
 * SVG comment nodes. C writes, through gvrender_comment → svg_comment
 * (gvputs_xml escaping):
 * - the root `comment` attribute (emit_graph, before emit_begin_graph),
 * - svg_begin_graph's `<!-- Title: <name> Pages: N -->` header,
 * - each emitted node's name and `comment` attribute (emit_node, after the
 *   node_in_box gate and BEFORE the style=invis shortcircuit),
 * - each emitted edge's `tail->head` (`--` undirected) name and `comment`
 *   attribute (emit_edge, after edge_in_box, before the invis shortcircuit).
 *
 * Expected sequences: native graphviz 16.1.0 `dot -Tsvg` (GVBINDIR=/tmp/ghl),
 * minus its version-stamped generator comment.
 *
 * @see lib/common/emit.c:emit_graph, emit_node, emit_edge
 * @see plugin/core/gvrender_core_svg.c:svg_comment, svg_begin_graph
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderSvg } from '../index.js';

const COMMENT_RE = /<!--([\s\S]*?)-->/g;

/** Every comment body after the generator comment, in document order. */
function comments(svg: string): string[] {
  return [...svg.matchAll(COMMENT_RE)].map((m) => m[1]!).slice(1);
}

describe('svg comments', () => {
  it('emits graph, node and edge comments in native order', () => {
    const svg = renderSvg(
      'digraph "G-1" { comment="top <x>"; a [comment="hi"]; a -> b [comment="e1"];'
      + ' c [style=invis]; c -> a [style=invis] }', 'dot');
    expect(comments(svg)).toEqual([
      ' top &lt;x&gt; ', ' Title: G&#45;1 Pages: 1 ', ' a ', ' hi ', ' b ',
      ' a&#45;&gt;b ', ' e1 ', ' c ', ' c&#45;&gt;a ',
    ]);
  });

  it('names undirected edges with -- and omits the title of an anonymous graph', () => {
    expect(comments(renderSvg('graph { a -- b }', 'dot'))).toEqual([
      ' Pages: 1 ', ' a ', ' b ', ' a&#45;&#45;b ',
    ]);
  });

  it('places each comment immediately before its object group (corpus 2784)', () => {
    const svg = renderSvg(readFileSync(
      new URL('../layout/dot/__fixtures__/2784.dot', import.meta.url), 'utf8'), 'dot');
    const native = readFileSync(
      new URL('../layout/dot/__fixtures__/2784.native-16.1.svg', import.meta.url), 'utf8');
    expect(comments(svg)).toEqual(comments(native));
    expect(svg).toContain('<!-- 00 -->\n<g id="node1" class="node">');
  });
});
