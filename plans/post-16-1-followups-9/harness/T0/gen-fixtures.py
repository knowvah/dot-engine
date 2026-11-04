#!/usr/bin/env python3
# SPDX-License-Identifier: EPL-2.0
# Writes the part-9 native probe inputs (<case>.gv) and each directory's regen.sh.
# usage: python3 gen-fixtures.py <repo root>
import os
import sys

ROOT = sys.argv[1]

REGEN = """#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Regenerates these part-9 fixtures: graphviz 16.1.0 (oracle/16.1.0), -K{engine} -Txdot,
# one <case>.xdot and <case>.xdot.stderr per <case>.gv. Inputs come from
# plans/post-16-1-followups-9/harness/T0/gen-fixtures.py.
#
# Usage: GVBINDIR=<full plugin dir> bash regen.sh
set -u
DOT=${{DOT:-$HOME/git/graphviz/build/cmd/dot/dot}}
cd "$(dirname "$0")"
for f in *.gv; do
  c=${{f%.gv}}
  "$DOT" -K{engine} -Txdot "$f" > "$c.xdot" 2> "$c.xdot.stderr"
  rc=$?
  [ "$rc" -eq 0 ] || echo "$c: exit $rc"
done
"""

def emit(rel, engine, cases):
    d = os.path.join(ROOT, rel)
    os.makedirs(d, exist_ok=True)
    for name, text in cases.items():
        with open(os.path.join(d, name + ".gv"), "w") as f:
            f.write(text)
    with open(os.path.join(d, "regen.sh"), "w") as f:
        f.write(REGEN.format(engine=engine))

def graph(edges, attrs=(), extra=(), directed=False, after=()):
    op = "->" if directed else "--"
    lines = ["digraph G {" if directed else "graph G {"]
    lines += [f"  {k}={v};" for k, v in attrs]
    lines += [f"  {x}" for x in extra]
    for e in edges:
        u, v = e.split()
        lines.append(f"  {u} {op} {v};")
    lines += [f"  {x}" for x in after]
    lines.append("}")
    return "\n".join(lines) + "\n"

# --- neato: three components; the root's attributes must reach each one (AD-1).
THREE = ["a b", "b c", "c d", "d a", "a c",
         "e f", "f g", "g h", "h e", "e g", "h i",
         "j k", "k l", "l m"]
MODES = {
    "major": [],
    "hier": [("mode", "hier")],
    "sgd": [("mode", "sgd")],
    "kk": [("mode", "KK"), ("pack", "true")],
}
ATTRS = {
    "default": [],
    "maxiter3": [("maxiter", "3")],
    "epsilon": [("epsilon", "0.5")],
    "stresswt": [("stresswt", "1")],
    "maxiterneg": [("maxiter", "-1")],
}
neato = {}
for mode, mattrs in MODES.items():
    for tag, attrs in ATTRS.items():
        neato[f"{mode}-{tag}"] = graph(THREE, mattrs + attrs, directed=mode == "hier")
CLUSTER = "subgraph cluster_0 { a; b; }"
neato["major-maxiter3-cluster"] = graph(THREE, [("maxiter", "3")], [CLUSTER])
# pccomps keeps pinned nodes in one component: the copy must happen there as well.
PIN = 'a [pos="0,0!"]; e [pos="3,3!"];'
neato["major-maxiter3-pin"] = graph(THREE, [("maxiter", "3")], [PIN])
emit("src/layout/neato/__fixtures__/multi-component-attrs", "neato", neato)

# --- circo: two components of two blocks each, so the root picks the block tree.
# Node statements follow the edges: declared first, they would change node creation
# order, and the first node is the fallback root.
C1 = ["a b", "b c", "c a", "c d", "d e", "e c", "e f"]
C2 = ["g h", "h i", "i g", "i j", "j k", "k i", "k l"]
DISC = C1 + C2
circo = {
    "no-root": graph(DISC),
    "no-root-connected": graph(C1),
    "graph-root-first": graph(DISC, [("root", "e")]),
    "graph-root-later": graph(DISC, [("root", "j")]),
    "graph-root-paths": graph(["a b", "b c", "d e", "e f"], [("root", "a")]),
    "graph-root-none": graph(DISC, [("root", "zzz")]),
    "node-root-connected": graph(C1, after=["e [root=true];"]),
    "node-root-later": graph(DISC, after=["j [root=true];"]),
    "node-root-false": graph(C1, after=["e [root=false];"]),
    "node-root-two": graph(C1, after=["e [root=true];", "d [root=true];"]),
    "both-connected": graph(C1, [("root", "b")], after=["e [root=true];"]),
    "both-per-component": graph(DISC, [("root", "e")], after=["j [root=true];"]),
    "graph-none-node": graph(C1, [("root", "zzz")], after=["e [root=true];"]),
}
emit("src/layout/circo/__fixtures__/root", "circo", circo)

# --- sfdp: a connected graph; only start=random forms stay silent (AD-8).
CONN = ["a b", "b c", "c d", "d e", "e f", "f a", "a c", "c e", "e g", "g h", "h i", "i a"]
sfdp = {
    "start-unset": graph(CONN),
    "start-self": graph(CONN, [("start", "self")]),
    "start-regular": graph(CONN, [("start", "regular")]),
    "start-5": graph(CONN, [("start", "5")]),
    "start-random5": graph(CONN, [("start", "random5")]),
    # tuneControl warns on start, then on label_scheme: pins the order.
    "start-self-label-scheme": graph(CONN, [("start", "self"), ("label_scheme", "9")]),
}
emit("src/layout/sfdp/__fixtures__/start-warning", "sfdp", sfdp)
