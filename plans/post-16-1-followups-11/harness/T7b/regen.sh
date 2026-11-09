#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Regenerates T7b's native refs.
#   noaddr/subg-<e>.<s>.<mode>.<fmt>  subg-after-free.c (part-10 T15) on T0/subg.gv under the
#                                     noaddr plugin of T7/build.sh (GVTS_NOADDR=1, fdp's settled class)
#   1581.dot.svg                      dot -Kdot -Tsvg on the corpus input 1581 (stock plugins)
#   stored-draws.<e>.<fmt>            dot and circo, xdot and dot, on stored-draws.gv (input draw attrs, stock)
# Usage: bash regen.sh <scratch-dir> <stock-plugin-dir>
set -u
G=${G:-$HOME/git/graphviz}
B=$G/build
here=$(cd "$(dirname "$0")" && pwd)
scr=$1; stock=$2
[ -f "$scr/gv/libgvplugin_neato_layout.8.dylib" ] || bash "$here/../T7/build.sh" "$scr" "$stock"
bin=$scr/subg-after-free
[ -x "$bin" ] || clang -O1 -w -o "$bin" "$here/../../../post-16-1-followups-10/harness/T15/subg-after-free.c" \
  -I"$G/lib/gvc" -I"$G/lib/cgraph" -I"$G/lib/common" -I"$G/lib/pathplan" -I"$G/lib/cdt" -I"$G/lib" -I"$B" \
  -I"$B/lib/common" -I"$B/lib/gvc" -L"$B/lib/gvc" -L"$B/lib/cgraph" -L"$B/lib/cdt" -lgvc -lcgraph -lcdt \
  -Wl,-rpath,"$B/lib/gvc" -Wl,-rpath,"$B/lib/cgraph" -Wl,-rpath,"$B/lib/cdt" -Wl,-rpath,"$B/lib/pathplan" \
  -Wl,-rpath,"$B/lib/xdot"
mkdir -p "$here/noaddr"
for e in fdp osage; do for s in s cluster_k; do for m in root nofree; do for f in xdot svg; do
  k=subg-$e.$s.$m.$f
  GVTS_NOADDR=1 GVBINDIR=$scr/gv "$bin" "$here/../T0/subg.gv" $e $f $s $m > "$here/noaddr/$k" 2> "$here/noaddr/$k.stderr"
  echo "rc=$?" >> "$here/noaddr/$k.stderr"
done; done; done; done
GVBINDIR=$stock "$B/cmd/dot/dot" -Kdot -Tsvg "$G/tests/1581.dot" > "$here/1581.dot.svg" 2> /dev/null
for e in dot circo; do for f in xdot dot; do
  GVBINDIR=$stock "$B/cmd/dot/dot" -K$e -T$f "$here/stored-draws.gv" > "$here/stored-draws.$e.$f"
done; done
