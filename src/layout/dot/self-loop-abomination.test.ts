// SPDX-License-Identifier: EPL-2.0

/**
 * Self-loop sizey after `abomination` inserts a flat-label rank.
 *
 * C inserts the label rank at index -1 and leaves ND_rank alone, so a node on
 * the (now only) real rank keeps r == 0 and dot_splines_ takes the
 * `r > 0 ? … : ND_ht(n)` fallback. The port renumbers ranks +1 (AD-2); the
 * literal `r > 0` must be read in C's numbering or the loop sizes itself off
 * the label rank's y and comes out taller.
 * @see docs/graphviz-issues/26-self-loop-in-cluster-with-flat-labelled-edge.md
 * @see lib/dotgen/dotsplines.c:dot_splines_ (self-edge sizey, 391-396)
 * @see lib/dotgen/flat.c:abomination
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../parser/index.js';
import { render } from '../../render/index.js';

// Bisected from plantuml class/cobumi-83-bapu892.
const SRC = `digraph unix {
nodesep=0.486111; ranksep=0.833333; remincross=true; searchsize=500;
sh0019->sh0019[arrowtail=none,arrowhead=none,minlen=0,
  label=<<TABLE FIXEDSIZE="TRUE" WIDTH="48" HEIGHT="25"><TR><TD></TD></TR></TABLE>>];
sh0018->sh0010[arrowtail=none,arrowhead=none,minlen=0,
  label=<<TABLE FIXEDSIZE="TRUE" WIDTH="37" HEIGHT="15"><TR><TD></TD></TR></TABLE>>];
subgraph cluster6p0 {label="";subgraph cluster6 {style=solid;labeljust="c";
  label=<<TABLE FIXEDSIZE="TRUE" WIDTH="44" HEIGHT="9"><TR><TD></TD></TR></TABLE>>;
subgraph cluster6p1 {label="";
sh0010 [shape=rect,label="",width=4.246354,height=1.833333];
sh0011 [shape=rect,label="",width=1.679687,height=1.055556];
sh0012 [shape=rect,label="",width=1.667535,height=1.055556];
sh0013 [shape=rect,label="",width=1.355208,height=0.861111];
subgraph cluster14p0 {label="";subgraph cluster14 {style=solid;labeljust="c";
  label=<<TABLE FIXEDSIZE="TRUE" WIDTH="57" HEIGHT="9"><TR><TD></TD></TR></TABLE>>;
subgraph cluster14p1 {label="";
sh0018 [shape=rect,label="",width=1.355208,height=0.861111];
sh0019 [shape=rect,label="",width=1.876563,height=1.250000];
sh0020 [shape=rect,label="",width=1.665799,height=0.666667];
sh0021 [shape=rect,label="",width=1.939757,height=1.250000];
}}}
}}}
}`;

describe('self-loop on the lone real rank after abomination', () => {
  it('sizes the loop from ND_ht, as native dot does', () => {
    const out = render(parse(SRC), 'dot');
    // Native dot 15.1 -Tdot.
    expect(out).toContain(
      'pos="192.05,117.81 211.53,117.15 226.56,111.55 226.56,101 226.56,90.453 211.53,84.85 192.05,84.191"',
    );
  });
});
