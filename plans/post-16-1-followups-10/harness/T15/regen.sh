#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Regenerates the native renders src/gvc/layout-reset.edges.test.ts reads, from native graphviz 16.1.0.
# One file per case: out/<engine>.<subgraph>.<fmt>.<mode>, holding every render, as subg-after-free prints.
# neato is left out: native segfaults laying out either subgraph of subg.gv, with or without a root layout.
#
# Usage: GVBINDIR=<full plugin dir> bash regen.sh
set -eu
G=${G:-$HOME/git/graphviz}
B=$G/build
here=$(cd "$(dirname "$0")" && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
clang -O1 -w -o "$tmp/subg-after-free" "$here/subg-after-free.c" -I"$G/lib/gvc" -I"$G/lib/cgraph" -I"$G/lib/common" \
  -I"$G/lib/pathplan" -I"$G/lib/cdt" -I"$G/lib" -I"$B" -I"$B/lib/common" -I"$B/lib/gvc" \
  -L"$B/lib/gvc" -L"$B/lib/cgraph" -L"$B/lib/cdt" -lgvc -lcgraph -lcdt -Wl,-rpath,"$B/lib/gvc" \
  -Wl,-rpath,"$B/lib/cgraph" -Wl,-rpath,"$B/lib/cdt" -Wl,-rpath,"$B/lib/pathplan" -Wl,-rpath,"$B/lib/xdot"
mkdir -p "$here/out"
for e in dot fdp sfdp circo twopi osage patchwork; do
  for s in s cluster_k; do
    for f in plain xdot svg; do
      for m in free subonly twice; do
        [ "$f" != svg ] || [ "$e.$m" = dot.free ] || continue
        "$tmp/subg-after-free" "$here/subg.gv" "$e" "$f" "$s" "$m" > "$here/out/$e.$s.$f.$m"
      done
    done
  done
done
