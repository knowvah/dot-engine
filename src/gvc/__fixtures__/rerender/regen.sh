#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Regenerates these part-9 T11 fixtures from native graphviz 16.1.0 (oracle/16.1.0), libgvc in one
# process: gvLayout, gvRenderData, gvFreeLayout on one graph, as twice.c does. One file per render:
#   <case>.<engine>.<fmt>.<n>        render n of 2, with gvFreeLayout between them
#   <case>.<engine>.<fmt>.nofree.<n> render n of 3, with no gvFreeLayout
#   <case>.<engine>.<fmt>.then-<e>.2 render 2 with engine <e>
#   <case>.<engine>.seq-<name>.<n>   render n of a twice.c seq: script, named after its formats
#
# Usage: GVBINDIR=<full plugin dir> bash regen.sh
set -eu
G=${G:-$HOME/git/graphviz}
B=$G/build
here=$(cd "$(dirname "$0")" && pwd)
harness=$here/../../../../plans/post-16-1-followups-9/harness/T11
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
clang -O1 -o "$tmp/twice-native" "$harness/twice.c" -I"$G/lib/gvc" -I"$G/lib/cgraph" -I"$G/lib/common" \
  -I"$G/lib/pathplan" -I"$G/lib/cdt" -I"$G/lib" -I"$B" -I"$B/lib/common" -I"$B/lib/gvc" \
  -L"$B/lib/gvc" -L"$B/lib/cgraph" -L"$B/lib/cdt" -lgvc -lcgraph -lcdt -Wl,-rpath,"$B/lib/gvc" \
  -Wl,-rpath,"$B/lib/cgraph" -Wl,-rpath,"$B/lib/cdt" -Wl,-rpath,"$B/lib/pathplan" -Wl,-rpath,"$B/lib/xdot"
cd "$here"

# split <output of twice-native print> <file prefix>: one file per "== render N" section.
split() {
  awk -v p="$2" '/^== render [0-9]$/ { f = p "." $3; printf "" > f; next } { print > f }' "$1"
}

run() { # <case> <engine> <fmt> <mode> <prefix>
  "$tmp/twice-native" "$1.gv" "$2" "$3" "$4" > "$tmp/out"
  split "$tmp/out" "$5"
}

ALL="dot neato fdp sfdp circo twopi osage patchwork"
for e in $ALL; do
  run filing "$e" plain 2 "filing.$e.plain"
  run filing "$e" xdot 2 "filing.$e.xdot"
  run mixed "$e" plain 2 "mixed.$e.plain"
done
# Native does not repeat these; see NATIVE_REPEATS_NOT in rerender.test.ts. Render 2 of mixed.fdp varies
# between native runs, so it would not regenerate.
rm -f mixed.fdp.plain.2 mixed.sfdp.plain.2
for c in cluster-skeleton cluster-lrvn; do
  run "$c" dot plain 2 "$c.dot.plain"
  run "$c" dot xdot 2 "$c.dot.xdot"
done
for e in $ALL; do
  run filing "$e" plain nofree "filing.$e.plain.nofree"
done
# Native does not finish a no-free multi-edge.gv under neato, sfdp, circo, twopi or osage (over 8 s).
for e in dot fdp patchwork; do
  run multi-edge "$e" plain nofree "multi-edge.$e.plain.nofree"
done
run multi-edge dot svg nofree multi-edge.dot.svg.nofree
# A flat label at rank 0 runs abomination on every layout: the shift must not carry over.
for c in abom-shift abom-shift-parity abom-shift-pack; do
  run "$c" dot plain nofree "$c.dot.plain.nofree"
done
# tests/2368.dot: its third layout merges an edge flagged adjacent into a new reversed flat edge.
run flat-rev-stale dot plain nofree flat-rev-stale.dot.plain.nofree
# Part 11 T8: tests/graphs/nestedclust.gv. Layout 3 continues decompose's Cmark past layout 2's ND_mark, and
# dot_splines_ routes only the edges in the rank arrays.
for f in dot xdot; do
  run nestedclust dot "$f" nofree "nestedclust.dot.$f.nofree"
done
for e in neato fdp circo; do
  run filing dot plain "then:$e" "filing.dot.plain.then-$e"
  rm -f "filing.dot.plain.then-$e.1"
done
seq() { # <case> <engine> <name> <script>
  run "$1" "$2" unused "seq:$4" "$1.$2.seq-$3"
}
for c in filing mixed cluster-skeleton; do
  seq "$c" dot xdot-svg l,xdot,svg,f
  seq "$c" dot xdot-xdot l,xdot,xdot,f
  seq "$c" dot xdot-plain l,xdot,f,l,plain,f
  seq "$c" dot plain-xdot l,plain,f,l,xdot,f
  seq "$c" dot xdot-then-svg l,xdot,f,l,svg,f
  seq "$c" dot xdot-dot l,xdot,dot,f
  seq "$c" dot dot-dot l,dot,f,l,dot,f
done
seq filing neato xdot-then-svg l,xdot,f,l,svg,f
seq neato-pos neato xdot-plain l,xdot,f,l,plain,f
seq neato-pos neato dot-plain l,dot,f,l,plain,f
for e in $ALL; do
  run mixed "$e" xdot 2 "mixed.$e.xdot"
done
rm -f mixed.fdp.xdot.2 mixed.sfdp.xdot.2
seq background dot xdot-svg l,xdot,svg,f
seq neato-pos neato json-plain l,json,f,l,plain,f
seq neato-pos neato json0-plain l,json0,f,l,plain,f
seq filing dot json-json l,json,f,l,json,f
run sized-clip neato xdot 2 sized-clip.neato.xdot
# Part 10 T14. An edge to a cluster: -Tdot, -Txdot and -Tjson undo the first cycle's proxy nodes.
run cluster-edges fdp dot 2 cluster-edges.fdp.dot
run cluster-edges fdp xdot 2 cluster-edges.fdp.xdot
seq cluster-edges fdp dot-svg l,dot,f,l,svg,f
seq cluster-edges fdp dot-plain l,dot,f,l,plain,f
seq cluster-edges fdp json-json l,json,f,l,json,f
seq cluster-edges fdp nofree-dot-svg l,dot,l,svg
# The cluster-edge record outlives gvFreeLayout, so render 2 keeps line segments.
run cluster-edge-splines fdp plain 2 cluster-edge-splines.fdp.plain
# Native's render 2 of fdp-1581 takes one of two values per process (deriveGraph compares node addresses,
# lib/fdpgen/layout.c:466). Keep the one the port's id order gives; an unlucky run retries.
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16; do
  run fdp-1581 fdp dot 2 fdp-1581.fdp.dot
  grep -q 'bb="0,-24.8,29358,25432"' fdp-1581.fdp.dot.2 && break
done
grep -q 'bb="0,-24.8,29358,25432"' fdp-1581.fdp.dot.2
# cluster-edges.fdp.plain.noaddr.{1,2} are not regenerated here: render 2 of plain moves with node addresses
# at the same three sites, so they come from T14's patched plugin, GVTS_NOADDR=1, which orders by ND_id.
