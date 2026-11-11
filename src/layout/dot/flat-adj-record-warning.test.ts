// SPDX-License-Identifier: EPL-2.0

/**
 * Issue #171: C `make_flat_adj_edges` warns once per process when a flat edge
 * joins two adjacent nodes one of which has a record shape, then gives the
 * edge up. The port gave the edge up silently.
 *
 * Provenance: each `src` is a probe of
 * `plans/issue-171-flat-adj-record-warning/harness/probes/`, and each `err` is
 * the stderr of native graphviz 16.1.0 (`~/git/graphviz/build/cmd/dot/dot
 * -Tdot`, `GVBINDIR=/tmp/ghl`) on it, from `harness/native/*.err`, captured
 * 2026-11-11. `SRC_1323` is upstream `tests/1323.gv` whole.
 *
 * @see lib/dotgen/dotsplines.c:make_flat_adj_edges (1143-1152)
 */

import { afterEach, describe, it, expect } from 'vitest';
import { parse } from '../../parser/index.js';
import { render } from '../../render/index.js';
import { agseterrf } from '../../common/agerr.js';

/** The `agwarningf` line, with the prefix `out` gives it. */
const WARN =
  'Warning: flat edge between adjacent nodes one of which has a record shape - replace records with HTML-like labels\n';

const SRC_1323 = String.raw`digraph vfs {
node [shape = "record" fontsize = 10 style = filled];
color = lightgray;
subgraph cluster_mnt_namespace {
graph [fontsize = 10];
label = "mnt_namespace";
namespace1 [shape = "record",label = "{
       <f0>struct vfsmount * root\
       |{<f1>struct list_head list|{<f2>*next|<f3>*prev}}}
        "];
}
subgraph cluster_vfsmount {
graph [fontsize = 10];
label = "struct vfsmount";
subgraph cluster_mount1 {
//graph [bgcolor="#c1c1df", fontsize=12, labelloc=t];
//edge [style="invis"];
//label = "/";
"vfsmount1" [shape = "record",label ="{
       {<f0>struct list_head\nmnt_hash|{<f1>*next|<f2>*prev}} \
       |<f3>struct vfsmount *mnt_parent \
       |<f4>struct dentry * mnt_mountpoint\
       |<f5>struct dentry * mnt_root \
       |<f6>struct super_block * mnt_sb \
       |{<f7>struct list_head\nmnt_mounts|{<f8>*next|<f9>*prev}} \
       |{<f10>struct list_head\nmnt_child|{<f11>*next|<f12>*prev}} \
       |{<f13>struct list_head\nmnt_list|{<f14>*next|<f15>*prev}} \
       |<f16>struct namespace * mnt_namespace}
        "];
}
subgraph cluster_mount2 {
//graph [bgcolor="#c1c1df", fontsize=12, labelloc=t];
//edge [style="invis"];
//label = "/ext2";
"vfsmount2" [shape = "record",label ="{
       {<f0>struct list_head\nmnt_hash|{<f1>*next|<f2>*prev}} \
       |<f3>struct vfsmount *mnt_parent \
       |<f4>struct dentry * mnt_mountpoint\
       |<f5>struct dentry * mnt_root \
       |<f6>struct super_block * mnt_sb \
       |{<f7>struct list_head\nmnt_mounts|{<f8>*next|<f9>*prev}} \
       |{<f10>struct list_head\nmnt_child|{<f11>*next|<f12>*prev}} \
       |{<f13>struct list_head\nmnt_list|{<f14>*next|<f15>*prev}} \
       |<f16>struct namespace * mnt_namespace}
        "];
}
}
vfsmount1:f8 -> vfsmount2:f10 [color = "blue"];
vfsmount2:f12 -> vfsmount1:f7 [color = "green"];
vfsmount2:f11 -> vfsmount1:f7 [color = "green"];
vfsmount1:f9 -> vfsmount2:f10 [color = "blue"];
vfsmount2:f3 -> vfsmount1:f0;

namespace1:f0 -> vfsmount1:f0;


namespace1:f2 -> vfsmount1:f13;
vfsmount1:f14 -> vfsmount2:f13;
vfsmount2:f14 -> namespace1:f1;
namespace1:f3 -> vfsmount2:f13;
vfsmount2:f15 -> vfsmount1:f13;
//vfsmount1:f15 -> namespace1:f1;
}
`;

/** Native names the forward-normalized lead edge of the first group to exit. */
const ERR_1323 = `${WARN}  Edge namespace1 -> vfsmount2
Error: lost namespace1 vfsmount2 edge
Error: lost vfsmount2 namespace1 edge
`;

interface Probe {
  readonly name: string;
  readonly src: string;
  readonly err: string;
}

/**
 * `rankdir-lr`: the source edge is `b -> a`; C names makefwdedge's `a -> b`.
 * `quoted-name`: raw `agnameof` names, no `agstrcanon` quoting.
 * `two-pairs`: two record pairs, one warning. `splines-none` and
 * `splines-ortho` never reach the exit, and native prints nothing.
 */
const PROBES: readonly Probe[] = [
  { name: '1323', src: SRC_1323, err: ERR_1323 },
  { name: 'labelled', src: String.raw`digraph { {rank=same; a [shape=record]; b; a -> b [label=L];} }`, err: `${WARN}  Edge a -> b
Error: lost a b edge
` },
  { name: 'mrecord', src: String.raw`digraph { {rank=same; a [shape=Mrecord, label="{a|b}"]; b; a -> b;} }`, err: `${WARN}  Edge a -> b
Error: lost a b edge
` },
  { name: 'pair-back-first', src: String.raw`digraph { {rank=same; a [shape=record, label="{a|b}"]; b; b -> a; a -> b;} }`, err: `${WARN}  Edge a -> b
Error: lost a b edge
Error: lost b a edge
` },
  { name: 'pair-fwd-back', src: String.raw`digraph { {rank=same; a [shape=record, label="{a|b}"]; b; a -> b; b -> a;} }`, err: `${WARN}  Edge a -> b
Error: lost a b edge
Error: lost b a edge
` },
  { name: 'ported', src: String.raw`digraph { {rank=same; a [shape=record, label="<p>a|<q>b"]; b; a:p -> b;} }`, err: `${WARN}  Edge a -> b
Error: lost a b edge
` },
  { name: 'quoted-name', src: String.raw`digraph { {rank=same; "x y" [shape=record]; "p\"q"; "x y" -> "p\"q";} }`, err: `${WARN}  Edge x y -> p"q
Error: lost x y p"q edge
` },
  { name: 'rankdir-lr', src: String.raw`digraph { rankdir=LR; {rank=same; a [shape=record]; b; b -> a;} }`, err: `${WARN}  Edge a -> b
Error: lost b a edge
` },
  { name: 'single-head-record', src: String.raw`digraph { {rank=same; a; b [shape=record, label="{x|y}"]; a -> b;} }`, err: `${WARN}  Edge a -> b
Error: lost a b edge
` },
  { name: 'splines-line', src: String.raw`digraph { splines=line; {rank=same; a [shape=record]; b; a -> b;} }`, err: `${WARN}  Edge a -> b
Error: lost a b edge
` },
  { name: 'splines-none', src: String.raw`digraph { splines=none; {rank=same; a [shape=record]; b; a -> b;} }`, err: `` },
  { name: 'splines-ortho', src: String.raw`digraph { splines=ortho; {rank=same; a [shape=record]; b; a -> b;} }`, err: `` },
  { name: 'two-pairs', src: String.raw`digraph { {rank=same; a [shape=record]; b; a -> b;} {rank=same; c; d [shape=record]; c -> d;} a -> c; }`, err: `${WARN}  Edge a -> b
Error: lost a b edge
Error: lost c d edge
` },
  { name: 'undirected', src: String.raw`graph { {rank=same; a [shape=record, label="{a|b}"]; b; a -- b;} }`, err: `${WARN}  Edge a -- b
Error: lost a b edge
` },
];

const TWO_PAIRS = 'two-pairs';

/** Render with `-Tdot`, returning the pieces the port handed `agerr`, joined. */
function stderrOf(src: string): string {
  const pieces: string[] = [];
  agseterrf((m) => { pieces.push(m); });
  render(parse(src), 'dot', { engine: 'dot' });
  return pieces.join('');
}

describe('flat-adjacent record warning (issue #171)', () => {
  afterEach(() => {
    agseterrf(null);
  });

  it.each(PROBES)('$name: stderr equals native', ({ src, err }) => {
    expect(stderrOf(src)).toBe(err);
  });

  it('warns once per render: the flag is reset at render entry', () => {
    const probe = PROBES.find((p) => p.name === TWO_PAIRS)!;
    expect(stderrOf(probe.src)).toBe(probe.err);
    expect(stderrOf(probe.src)).toBe(probe.err);
  });
});
