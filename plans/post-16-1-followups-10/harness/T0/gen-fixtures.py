#!/usr/bin/env python3
# SPDX-License-Identifier: EPL-2.0
# Writes the part-10 native probe inputs (<case>.gv) and each directory's regen.sh.
# usage: python3 gen-fixtures.py <repo root>
import os
import sys

ROOT = sys.argv[1]

REGEN = """#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Regenerates these part-10 fixtures: graphviz 16.1.0 (oracle/16.1.0). One <case>.xdot,
# <case>.dot and <case>.stderr per <case>.gv. {note} The .stderr is the -Txdot run's;
# regen reports a case whose -Tdot stderr differs. Inputs come from
# plans/post-16-1-followups-10/harness/T0/gen-fixtures.py.
#
# Usage: GVBINDIR=<full plugin dir> bash regen.sh
set -u
DOT=${{DOT:-$HOME/git/graphviz/build/cmd/dot/dot}}
cd "$(dirname "$0")"
for f in *.gv; do
  c=${{f%.gv}}
  e={engine}
  "$DOT" -K"$e" -Txdot "$f" > "$c.xdot" 2> "$c.stderr"
  rc=$?
  [ "$rc" -eq 0 ] || echo "$c: xdot exit $rc"
  err=$(mktemp)
  "$DOT" -K"$e" -Tdot "$f" > "$c.dot" 2> "$err"
  rc=$?
  [ "$rc" -eq 0 ] || echo "$c: dot exit $rc"
  cmp -s "$c.stderr" "$err" || echo "$c: dot stderr differs"
  rm -f "$err"
done
"""


def emit(rel, engine, note, cases):
    d = os.path.join(ROOT, rel)
    os.makedirs(d, exist_ok=True)
    for name, text in cases.items():
        with open(os.path.join(d, name + ".gv"), "w") as f:
            f.write(text)
    with open(os.path.join(d, "regen.sh"), "w") as f:
        f.write(REGEN.format(engine=engine, note=note))


def graph(edges, attrs=(), extra=()):
    lines = ["graph G {"]
    lines += [f"  {k}={v};" for k, v in attrs]
    lines += [f"  {x}" for x in extra]
    for e in edges:
        u, v = e.split()
        lines.append(f"  {u} -- {v};")
    lines.append("}")
    return "\n".join(lines) + "\n"


# One small connected graph: a 5-cycle with a chord and a pendant.
SMALL = ["a b", "b c", "c d", "d e", "e a", "a c", "e f"]
THREE = ["a b", "b c", "c a", "d e", "e f", "f g", "g d", "h i", "i j"]
D3 = [("dim", "3"), ("dimen", "3")]

neato = {
    "dim3": graph(SMALL, [("dim", "3")]),
    "dimen3": graph(SMALL, [("dimen", "3")]),
    "dim3-dimen3": graph(SMALL, D3),
    "dim4-dimen4": graph(SMALL, [("dim", "4"), ("dimen", "4")]),
    "dim11-dimen11": graph(SMALL, [("dim", "11"), ("dimen", "11")]),
    "kk-dim3": graph(SMALL, D3 + [("mode", "KK")]),
    "hier-dim3": graph(SMALL, D3 + [("mode", "hier")]),
    "sgd-dim3": graph(SMALL, D3 + [("mode", "sgd")]),
    "ipsep-dim3": graph(SMALL, D3 + [("mode", "ipsep")]),
    "subset-dim3": graph(SMALL, D3 + [("model", "subset")]),
    "circuit-dim3": graph(SMALL, D3 + [("model", "circuit")]),
    "overlap-false-dim3": graph(SMALL, D3 + [("overlap", "false")]),
    "pins-dim3": graph(SMALL, D3, ['a [pos="1,2,3!"];', 'b [pos="4,5"];', "c [z=7];"]),
    "pack-dim3": graph(THREE, D3 + [("pack", "true")]),
}
emit("src/layout/neato/__fixtures__/dim", "neato", "Engine neato.", neato)

sfdp = {
    "dim3": graph(SMALL, [("dim", "3")]),
    "dim3-dimen3": graph(SMALL, D3),
    "dim4-dimen4": graph(SMALL, [("dim", "4"), ("dimen", "4")]),
    "overlap-prism-dim3": graph(SMALL, D3 + [("overlap", "prism")]),
}
emit("src/layout/sfdp/__fixtures__/dim", "sfdp", "Engine sfdp.", sfdp)

CC = "graph G { a -- b; subgraph _cc_0 { c } d -- e; }\n"
pack = {e: CC for e in ["circo", "twopi", "sfdp", "neato", "osage"]}
emit(
    "src/layout/pack/__fixtures__/cc-reuse",
    '"$c"',
    "The case name is the engine.",
    pack,
)
