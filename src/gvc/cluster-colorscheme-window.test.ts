// SPDX-License-Identifier: EPL-2.0
//
// AD-16: emit_clusters opens setColorScheme right after emit_begin_cluster and
// restores it after emit_label(EMIT_CLABEL), so the cluster label fontcolor
// resolves inside the cluster's colorscheme. @see lib/common/emit.c:3800/3943

import { describe, it, expect } from 'vitest';
import { renderSvg } from '../index.js';

const LABEL_FILL = /<text[^>]*fill="([^"]*)">L<\/text>/;

describe('cluster colorscheme window spans box and label', () => {
  it('resolves a numeric label fontcolor in the cluster colorscheme', () => {
    const svg = renderSvg(
      'digraph{subgraph cluster_a{colorscheme=blues9 fontcolor=3 label=L; a}}', 'dot');
    expect(LABEL_FILL.exec(svg)?.[1]).toBe('#c6dbef');
  });

  it('leaves an unchanged cluster (no colorscheme) as before', () => {
    const svg = renderSvg('digraph{subgraph cluster_a{fontcolor=red label=L; a}}', 'dot');
    expect(LABEL_FILL.exec(svg)?.[1]).toBe('red');
  });

  it('does not leak the scheme to nodes after the cluster', () => {
    const svg = renderSvg(
      'digraph{subgraph cluster_a{colorscheme=blues9 label=L; a}; b[color=red]}', 'dot');
    expect(svg).toContain('stroke="red"');
  });
});
