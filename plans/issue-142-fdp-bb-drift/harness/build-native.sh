#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Builds a scratch neato_layout plugin for issue #142: part 10's noaddr.patch (GVTS_NOADDR orders
# fdp's derived edges and ports by ND_id) plus trace-native.patch (%a traces of fdp's phases,
# written to the file named by GVTS_TRACE142; no trace code runs when it is unset).
# Only fdpgen's layout.c, tlayout.c and xlayout.c are recompiled, with the oracle build's own flags
# (lib/fdpgen/CMakeFiles/fdpgen.dir/flags.make); the objects go before libfdpgen.a on the oracle's
# own link line, so they replace the archive's members. ~/git/graphviz is only read.
# Usage: bash build-native.sh <scratch-dir> <stock-plugin-dir>
#   <scratch-dir>/gv is the new GVBINDIR (core and dot_layout are the stock dir's symlinks; the
#   neato plugin is a fresh file, any symlink at the -o path is removed first).
set -eu
G=${G:-$HOME/git/graphviz}
B=$G/build
here=$(cd "$(dirname "$0")" && pwd)
scr=$1; stock=$2
F=$G/lib/fdpgen
mkdir -p "$scr/src" "$scr/obj" "$scr/gv" "$scr/orig"
for f in layout.c tlayout.c xlayout.c; do cp "$F/$f" "$scr/orig/$f"; cp "$F/$f" "$scr/src/$f"; done
cp "$here/gvts142.h" "$scr/src/gvts142.h"
patch -s -p0 "$scr/src/layout.c" < "$here/../../post-16-1-followups-10/harness/T14/noaddr.patch"
(cd "$scr" && patch -s -p0 < "$here/trace-native.patch")
[ -n "${EXTRA_PATCH:-}" ] && (cd "$scr" && patch -s -p0 < "$EXTRA_PATCH")
objs=
for f in layout tlayout xlayout; do
  /usr/bin/cc -DDIGCOLA -DENABLE_LTDL -DIPSEPCOLA -DNEATOGEN_EXPORTS=1 -DORTHO -DSFDP -I"$B" -I"$F/.." \
    -I"$F/../cdt" -I"$F/../cgraph" -I"$F/../common" -I"$F/../gvc" -I"$F/../pack" -I"$F/../pathplan" \
    -I"$B/lib/gvc" -I"$B/lib/common" -I"$F" -I"$scr/src" -O3 -DNDEBUG -std=gnu17 -flto=thin \
    -arch arm64 -fPIC -w -c "$scr/src/$f.c" -o "$scr/obj/$f.c.o"
  objs="$objs $scr/obj/$f.c.o"
done
cp -P "$stock"/config8 "$stock"/libgvplugin_core* "$stock"/libgvplugin_dot_layout* "$scr/gv/"
rm -f "$scr"/gv/libgvplugin_neato_layout*
out=$scr/gv/libgvplugin_neato_layout.8.dylib
cd "$B/plugin/neato_layout"
gts=$(ls -d /opt/homebrew/opt/gts/lib/libgts.dylib)
$(sed -e "s#-o libgvplugin_neato_layout.8.0.15.dylib#-o $out $objs#" \
  -e "s#/opt/homebrew/Cellar/gts/[^/]*/lib/libgts.dylib#$gts#" CMakeFiles/gvplugin_neato_layout.dir/link.txt)
[ ! -L "$out" ] && echo "built $out"
