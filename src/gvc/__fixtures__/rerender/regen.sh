#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Regenerates these part-9 T11 fixtures from native graphviz 16.1.0 (oracle/16.1.0), libgvc in one
# process: gvLayout, gvRenderData, gvFreeLayout on one graph, as twice.c does. One file per render:
#   <case>.<engine>.<fmt>.<n>        render n of 2, with gvFreeLayout between them
#   <case>.<engine>.<fmt>.nofree.<n> render n of 3, with no gvFreeLayout
#   <case>.<engine>.<fmt>.then-<e>.2 render 2 with engine <e>
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
run filing dot plain nofree filing.dot.plain.nofree
for e in neato fdp circo; do
  run filing dot plain "then:$e" "filing.dot.plain.then-$e"
  rm -f "filing.dot.plain.then-$e.1"
done
