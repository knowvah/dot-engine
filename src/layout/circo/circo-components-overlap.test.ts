// SPDX-License-Identifier: EPL-2.0
//
// T8 (v2-silent-gaps): C runs adjustNodes(sg) per derived component
// (circularinit.c:212), but the derived graph is a fresh agopen("derived")
// root that never declares `overlap`, `normalize` or `scale`, so
// agget(sg, ...) is NULL: AM_NONE, a no-op. Native output for a
// multi-component circo graph is therefore independent of those attributes
// (verified against the native binary: identical -Tplain for none/prism/
// scale/false and scale+normalize). These tests pin that behaviour.
// @see lib/circogen/circularinit.c:circoLayout
// @see lib/neatogen/adjust.c:adjustNodes

import { describe, it, expect } from 'vitest';
import { render, parse } from '../../index.js';

const NODE = 'node[shape=box,width=3,height=3,fixedsize=true];';
const TWO_COMPONENTS = 'a--b--c--a; d--e--f--d;';
const ONE_COMPONENT = 'a--b--c--a;';

function plain(attrs: string, edges: string): string {
  return render(parse(`graph G { ${attrs} ${NODE} ${edges} }`), 'plain', { engine: 'circo' });
}

describe('circo multi-component overlap (C adjustNodes(sg) is a no-op)', () => {
  const baseline = plain('', TWO_COMPONENTS);

  it('places the second component beside the first (packed, 6 nodes)', () => {
    expect(baseline).toContain('node d 7.0556 7.75 3 3');
    expect(baseline.match(/^node /gm)).toHaveLength(6);
  });

  it.each(['prism', 'scale', 'false', 'prism2000', 'oscale'])(
    'overlap=%s leaves multi-component output unchanged',
    (mode) => {
      expect(plain(`overlap=${mode};`, TWO_COMPONENTS)).toBe(baseline);
    },
  );

  it('scale and normalize on the root do not reach the derived components', () => {
    expect(plain('scale=3; normalize=90;', TWO_COMPONENTS)).toBe(baseline);
  });

  it('a single component still runs adjustNodes(g): overlap=prism changes output', () => {
    const none = plain('', ONE_COMPONENT);
    expect(plain('overlap=prism;', ONE_COMPONENT)).not.toBe(none);
  });
});
