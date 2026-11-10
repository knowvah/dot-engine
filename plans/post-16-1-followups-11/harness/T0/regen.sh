#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Regenerates part 11's native probe refs from native graphviz 16.1.0 (the oracle build).
# One <case>.<fmt> plus <case>.<fmt>.stderr per case and format. Multi-render cases print each
# render after a "== render N" line (harness output, part 10's twice.c / subg-after-free.c).
#
# Usage: GVBINDIR=<full plugin dir> bash regen.sh [outdir]
#   outdir defaults to this directory; variance.sh calls it with a scratch dir per run.
# Cases (part 11 T0):
#   w4, w5            dot -Tdot                       (128)
#   poly40[-ll0|-ll80] dot -Tdot, -Txdot              (127, 135)
#   cluster-edge      fdp -Tjson, -Tjson0             (133)
#   nestedclust       dot, 3 renders with no free, dot and xdot (twice.c nofree)   (129)
#   sgd58             neato -Tdot, -Txdot             (132; mode=sgd dim=2, 58 nodes)
#   subg-<e>.<s>.<mode>.<fmt>  fdp and osage, subgraphs s and cluster_k, modes root and nofree,
#                     xdot and svg (subg-after-free.c)  (136, 137)
set -u
G=${G:-$HOME/git/graphviz}
B=$G/build
DOT=$B/cmd/dot/dot
here=$(cd "$(dirname "$0")" && pwd)
out=${1:-$here}
H10=$here/../../../post-16-1-followups-10/harness
mkdir -p "$out"
bin=${BIN:-$(mktemp -d)}
build() {
  [ -x "$bin/$1" ] && return
  clang -O1 -w -o "$bin/$1" "$2" -I"$G/lib/gvc" -I"$G/lib/cgraph" -I"$G/lib/common" \
    -I"$G/lib/pathplan" -I"$G/lib/cdt" -I"$G/lib" -I"$B" -I"$B/lib/common" -I"$B/lib/gvc" \
    -L"$B/lib/gvc" -L"$B/lib/cgraph" -L"$B/lib/cdt" -lgvc -lcgraph -lcdt -Wl,-rpath,"$B/lib/gvc" \
    -Wl,-rpath,"$B/lib/cgraph" -Wl,-rpath,"$B/lib/cdt" -Wl,-rpath,"$B/lib/pathplan" -Wl,-rpath,"$B/lib/xdot"
}
build twice-native "$H10/T5/twice.c"
build subg-after-free "$H10/T15/subg-after-free.c"
one() { # case engine fmt
  "$DOT" -K"$2" -T"$3" "$here/$1.gv" > "$out/$1.$3" 2> "$out/$1.$3.stderr"
  echo "rc=$?" >> "$out/$1.$3.stderr"
}
for c in w4 w5; do one $c dot dot; done
for c in poly40 poly40-ll0 poly40-ll80; do for f in dot xdot; do one $c dot $f; done; done
for f in json json0; do one cluster-edge fdp $f; done
for f in dot xdot; do one sgd58 neato $f; done
for f in dot xdot; do
  "$bin/twice-native" "$here/nestedclust.gv" dot $f nofree > "$out/nestedclust.$f" 2> "$out/nestedclust.$f.stderr"
done
for e in fdp osage; do
  for s in s cluster_k; do
    for m in root nofree; do
      for f in xdot svg; do
        "$bin/subg-after-free" "$here/subg.gv" $e $f $s $m > "$out/subg-$e.$s.$m.$f" 2> "$out/subg-$e.$s.$m.$f.stderr"
      done
    done
  done
done
