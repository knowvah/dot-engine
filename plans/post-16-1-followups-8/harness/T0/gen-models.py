#!/usr/bin/env python3
# SPDX-License-Identifier: EPL-2.0
# Writes the part-8 model probe inputs (one <case>.gv each) into the cwd.
import random

EDGES = ["a b", "b c", "c d", "d e", "e f", "f a", "a c", "a g", "g h", "c i", "i j"]
LEN = {"a b": 1.5, "c d": 0.7, "e f": 2.0, "a g": 1.25, "i j": 0.5}
DISC = ["a b", "b c", "c a", "d e", "e f"]
MODES = {"major": None, "kk": "KK", "hier": "hier"}

def graph(mode, attrs, edges=EDGES, lens=None, name="G", prefix=""):
    directed = mode == "hier"
    op = "->" if directed else "--"
    kind = "digraph" if directed else "graph"
    head = f"{kind} {name} {{" if name else f"{kind} {{"
    lines = [head]
    if MODES[mode]:
        lines.append(f"  mode={MODES[mode]};")
    for k, v in attrs:
        lines.append(f"  {k}={v};")
    if prefix:
        lines.append(f"  {prefix}")
    for e in edges:
        u, v = e.split()
        l = f" [len={lens[e]}]" if lens and e in lens else ""
        lines.append(f"  {u} {op} {v}{l};")
    lines.append("}")
    return "\n".join(lines) + "\n"

def put(name, text):
    with open(name + ".gv", "w") as f:
        f.write(text)

for mode in MODES:
    put(f"{mode}-default", graph(mode, []))
    for m in ("shortpath", "subset", "circuit"):
        put(f"{mode}-{m}", graph(mode, [("model", m)]))
    put(f"{mode}-mds-nolen", graph(mode, [("model", "mds")]))
    for m in ("subset", "circuit", "mds"):
        put(f"{mode}-len-{m}", graph(mode, [("model", m)], lens=LEN))
    put(f"{mode}-disc-circuit", graph(mode, [("model", "circuit")], edges=DISC))
put("kk-disc-circuit-pack",
    graph("kk", [("model", "circuit"), ("pack", "true")], edges=DISC))
put("major-mds-nolen-anon", graph("major", [("model", "mds")], name=""))
put("major-mds-edge-default", graph("major", [("model", "mds")], prefix="edge [len=1.5];"))
put("major-model-foo", graph("major", [("model", "foo")]))
put("major-model-foo-anon", graph("major", [("model", "foo")], name=""))
put("major-model-Subset", graph("major", [("model", "Subset")]))

# >=150 nodes, connected: a seeded random tree plus chords (T9's timing row).
rnd = random.Random(103)
N = 160
big = [f"n{rnd.randrange(i)} n{i}" for i in range(1, N)]
seen = set(big)
while len(big) < N + 40:
    u, v = rnd.randrange(N), rnd.randrange(N)
    e = f"n{min(u, v)} n{max(u, v)}"
    if u != v and e not in seen:
        seen.add(e)
        big.append(e)
put("large-circuit", graph("major", [("model", "circuit")], edges=big))

# Major and hier pack by default (neato_layout: Pack < 0 && layoutMode), so each
# *-disc-circuit is split into connected components and never warns. pccomps
# keeps pinned nodes in one component: that is what reaches the warning.
PIN = 'a [pos="0,0!"]; d [pos="3,3!"];'
put("major-pin-disc-circuit", graph("major", [("model", "circuit")], edges=DISC, prefix=PIN))
put("hier-pin-disc-circuit", graph("hier", [("model", "circuit")], edges=DISC, prefix=PIN))

# KK: AGSEQ is 1-based, so C reads past Gm/GD_dist on the last-created node. With
# that node isolated nothing overflows and native is deterministic.
ISO = ["a b", "b c", "c a", "c d", "d e", "e a"]
ISOLEN = {"a b": 2, "b c": 3, "c a": 1.5, "c d": 0.75, "d e": 2.5, "e a": 1.25}
put("kk-iso-circuit", graph("kk", [("model", "circuit")], edges=ISO, prefix="", lens=None).replace("}\n", "  z;\n}\n"))
put("kk-iso-len-circuit", graph("kk", [("model", "circuit")], edges=ISO, lens=ISOLEN).replace("}\n", "  z;\n}\n"))
put("kk-iso-len-mds", graph("kk", [("model", "mds")], edges=ISO, lens=ISOLEN).replace("}\n", "  z;\n}\n"))

# Two 4-cycles under pack=true: native prints _neato_cc0's warning, then crashes.
DISC4 = ["a b", "b c", "c d", "d a", "e f", "f g", "g h", "h e"]
put("kk-disc4-circuit-pack", graph("kk", [("model", "circuit"), ("pack", "true")], edges=DISC4))

# An edge longer than the path around it: mds keeps its len, shortest paths do not,
# so these are the cases that tell the two distance models apart.
LONG = {"a c": 4.0, "c d": 0.7, "f a": 3.5}
put("major-long-mds", graph("major", [("model", "mds")], lens=LONG))
put("hier-long-mds", graph("hier", [("model", "mds")], lens=LONG))
put("major-long-shortpath", graph("major", [("model", "shortpath")], lens=LONG))
LONGISO = {"a b": 1, "b c": 1, "c a": 4.0, "c d": 0.75, "d e": 2.5, "e a": 1.25}
put("kk-iso-long-mds", graph("kk", [("model", "mds")], edges=ISO, lens=LONGISO).replace("}\n", "  z;\n}\n"))

# T7: model=shortpath twins of the pack cases, native's layout evidence for them.
put("kk-disc-shortpath-pack", graph("kk", [("model", "shortpath"), ("pack", "true")], edges=DISC))
put("kk-disc4-shortpath-pack", graph("kk", [("model", "shortpath"), ("pack", "true")], edges=DISC4))

# T7: the large graph under KK. It caught a pow mismatch the small cases passed.
put("kk-large", graph("kk", [], edges=big))
