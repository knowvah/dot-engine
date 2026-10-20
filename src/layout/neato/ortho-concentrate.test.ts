// SPDX-License-Identifier: EPL-2.0
/**
 * Concentrate dedup shared by neato and dot ortho gathering.
 * @see lib/ortho/ortho.c:1215-1235 (orthoEdges gather loop)
 */
import { describe, it, expect } from 'vitest';
import { renderSvg } from '../../index.js';
import { PointSet } from '../../common/pointset.js';
import type { Edge } from '../../model/edge.js';
import { isConcentrateDup } from '../dot/ortho-adapter.js';

const edgeOf = (tail: number, head: number): Edge =>
  ({ tail: { id: tail }, head: { id: head } }) as unknown as Edge;

const NEATO_PREFIX = 'digraph { splines=ortho; ';
const EDGE_PATHS = /<g id="edge\d+" class="edge">[\s\S]*?<\/g>/g;

function edgeGroups(src: string): string[] {
  const svg = renderSvg(src, 'neato');
  return svg.match(EDGE_PATHS) ?? [];
}

describe('isConcentrateDup', () => {
  it('keeps the first edge per unordered pair and drops later ones', () => {
    const ps = new PointSet();
    expect(isConcentrateDup(ps, edgeOf(1, 2))).toBe(false);
    expect(isConcentrateDup(ps, edgeOf(2, 1))).toBe(true);
    expect(isConcentrateDup(ps, edgeOf(1, 2))).toBe(true);
    expect(isConcentrateDup(ps, edgeOf(1, 3))).toBe(false);
  });
});

describe('neato ortho concentrate gather', () => {
  it('routes only the first of a 2-cycle plus parallel edge', () => {
    const groups = edgeGroups(
      `${NEATO_PREFIX}concentrate=true; a->b; b->a; a->b }`,
    );
    // Unrouted (deduped) edges are not emitted; native emits one group.
    expect(groups).toHaveLength(1);
    expect(groups[0]).toContain('id="edge1"');
    expect(groups[0]).toContain('M53.11,-23C53.11,-23 60.59,-23 60.59,-23');
  });

  it('routes every edge without concentrate', () => {
    const groups = edgeGroups(`${NEATO_PREFIX}a->b; b->a; a->b }`);
    expect(groups.filter((g) => g.includes('<path'))).toHaveLength(3);
  });
});
