#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Part 11 T8 (129): a dot layout plugin with trace.patch applied, in a scratch plugin dir, for
# native's no-free nestedclust.gv layouts. The oracle's build tree and plugin dirs are untouched.
#   T8TRACE=1        per phase of dotLayout, every node's rank/order/mark and edge-list sizes, the
#                    root's nlist and rank arrays; in dot_splines_, the rank arrays and the edges
#                    it collects (native-nofree.trace).
#   T8CMARK_RESET=1  prints Cmark before each decompose; =2 also zeroes it at each dotLayout, the
#                    port's pre-fix model (native then segfaults in layout 3).
# usage: bash build-traced-dot.sh <scratch dir>; then
#   T8TRACE=1 GVBINDIR=<scratch dir>/ghl twice-native nestedclust.gv dot dot nofree
# (twice-native: plans/post-16-1-followups-10/harness/T5/twice.c)
set -eu
G=${G:-$HOME/git/graphviz}
B=$G/build
N=$1
here=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$N/src/lib/dotgen" "$N/obj" "$N/ghl"
cp "$G"/lib/dotgen/*.c "$G"/lib/dotgen/*.h "$N/src/lib/dotgen/"
(cd "$N/src" && patch -p1 < "$here/trace.patch")
FL="-DDIGCOLA -DENABLE_LTDL -DIPSEPCOLA -DORTHO -DSFDP -I$B -I$G/lib -I$G/lib/cdt -I$G/lib/cgraph -I$G/lib/common
  -I$G/lib/gvc -I$G/lib/pack -I$G/lib/pathplan -I$N/src/lib/dotgen -O3 -DNDEBUG -std=gnu17 -flto=thin -arch arm64 -fPIC -w"
for f in "$N"/src/lib/dotgen/*.c; do
  /usr/bin/cc $FL -c "$f" -o "$N/obj/$(basename "$f" .c).o"
done
rm -f "$N/obj/libdotgen.a"
ar rcs "$N/obj/libdotgen.a" "$N"/obj/*.o
P=$B/plugin/dot_layout/CMakeFiles/gvplugin_dot_layout.dir
rm -f "$N/ghl/libgvplugin_dot_layout.8.0.15.dylib"
/usr/bin/cc -O3 -flto=thin -arch arm64 -dynamiclib -Wl,-headerpad_max_install_names -compatibility_version 8.0.0 \
  -current_version 8.0.15 -o "$N/ghl/libgvplugin_dot_layout.8.0.15.dylib" \
  -install_name @rpath/libgvplugin_dot_layout.8.dylib "$P/gvplugin_dot_layout.c.o" "$P/gvlayout_dot_layout.c.o" \
  -Wl,-rpath,"$B/lib/gvc" -Wl,-rpath,"$B/lib/cgraph" -Wl,-rpath,"$B/lib/cdt" "$N/obj/libdotgen.a" \
  "$B/lib/gvc/libgvc.7.0.14.dylib" "$B/lib/util/libutil.a" "$B/lib/cgraph/libcgraph.10.0.0.dylib" \
  /opt/homebrew/lib/libltdl.dylib -lz "$B/lib/cdt/libcdt.6.0.3.dylib" -lm
cd "$N/ghl"
cp /tmp/ghl/config8 .
for f in libgvplugin_core.8.0.15.dylib libgvplugin_core.8.dylib libgvplugin_core.dylib; do
  ln -sf "$B/plugin/core/$f" "$f"
done
ln -sf libgvplugin_dot_layout.8.0.15.dylib libgvplugin_dot_layout.8.dylib
ln -sf libgvplugin_dot_layout.8.0.15.dylib libgvplugin_dot_layout.dylib
