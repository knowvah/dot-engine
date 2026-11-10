#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Regenerates the native renders src/render/svg-subgraph-id.test.ts reads for issue #132, from
# native graphviz 16.1.0. Reuses part 10 T15's harness program (subg-after-free.c): root layout,
# render, free, then the subgraph's layout and render. One file per case:
# out/dot.<subgraph>.<fmt>.<fixture>, holding both renders.
#
# subg-html.gv: native aborts in gvFreeLayout of subgraph s (after both renders are flushed),
# so its exit status is ignored and the file is checked for two complete renders instead.
#
# Usage: GVBINDIR=<plugin dir with core + dot_layout> bash regen.sh
set -eu
G=${G:-$HOME/git/graphviz}
B=$G/build
here=$(cd "$(dirname "$0")" && pwd)
t15=$here/../../post-16-1-followups-10/harness/T15
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
clang -O1 -w -o "$tmp/subg-after-free" "$t15/subg-after-free.c" -I"$G/lib/gvc" -I"$G/lib/cgraph" \
  -I"$G/lib/common" -I"$G/lib/pathplan" -I"$G/lib/cdt" -I"$G/lib" -I"$B" -I"$B/lib/common" \
  -I"$B/lib/gvc" -L"$B/lib/gvc" -L"$B/lib/cgraph" -L"$B/lib/cdt" -lgvc -lcgraph -lcdt \
  -Wl,-rpath,"$B/lib/gvc" -Wl,-rpath,"$B/lib/cgraph" -Wl,-rpath,"$B/lib/cdt" \
  -Wl,-rpath,"$B/lib/pathplan" -Wl,-rpath,"$B/lib/xdot"
mkdir -p "$here/out"
for f in svg cmapx; do
  for s in s cluster_k; do
    "$tmp/subg-after-free" "$here/subg-url.gv" dot "$f" "$s" free > "$here/out/dot.$s.$f.url"
  done
  "$tmp/subg-after-free" "$here/subg-html.gv" dot "$f" s free > "$here/out/dot.s.$f.html" || true
  [ "$(grep -c '^== render' "$here/out/dot.s.$f.html")" = 2 ] || { echo "html $f: not 2 renders" >&2; exit 1; }
done
