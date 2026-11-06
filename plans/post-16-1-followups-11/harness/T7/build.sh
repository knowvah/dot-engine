#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Builds a scratch neato_layout plugin with part 10's noaddr.patch (fdp orders derived edges and
# ports by ND_id, not node address, when GVTS_NOADDR is set) and a plugin dir that uses it.
# Usage: bash build.sh <scratch-dir> <stock-plugin-dir>
#   <scratch-dir>/gv is the new GVBINDIR. Its core and dot_layout entries are symlinks copied from
#   <stock-plugin-dir>; the neato plugin is a fresh file (any symlink at the -o path is removed
#   first, so the link can never write through into the shared plugin dir or the graphviz build).
set -eu
G=${G:-$HOME/git/graphviz}
B=$G/build
here=$(cd "$(dirname "$0")" && pwd)
scr=$1; stock=$2
mkdir -p "$scr/src" "$scr/obj" "$scr/gv"
cp "$G/lib/fdpgen/layout.c" "$scr/src/layout.c"
patch -s -p0 "$scr/src/layout.c" < "$here/../../../post-16-1-followups-10/harness/T14/noaddr.patch"
F=$G/lib/fdpgen
/usr/bin/cc -DDIGCOLA -DENABLE_LTDL -DIPSEPCOLA -DNEATOGEN_EXPORTS=1 -DORTHO -DSFDP -I"$B" -I"$F/.." \
  -I"$F/../cdt" -I"$F/../cgraph" -I"$F/../common" -I"$F/../gvc" -I"$F/../pack" -I"$F/../pathplan" \
  -I"$B/lib/gvc" -I"$B/lib/common" -I"$F" -O3 -DNDEBUG -std=gnu17 -flto=thin -arch arm64 -fPIC -w \
  -c "$scr/src/layout.c" -o "$scr/obj/layout.c.o"
cp -P "$stock"/config8 "$stock"/libgvplugin_core* "$stock"/libgvplugin_dot_layout* "$scr/gv/"
rm -f "$scr"/gv/libgvplugin_neato_layout*
out=$scr/gv/libgvplugin_neato_layout.8.dylib
cd "$B/plugin/neato_layout"
gts=$(ls -d /opt/homebrew/opt/gts/lib/libgts.dylib)
$(sed -e "s#-o libgvplugin_neato_layout.8.0.15.dylib#-o $out $scr/obj/layout.c.o#" \
  -e "s#/opt/homebrew/Cellar/gts/[^/]*/lib/libgts.dylib#$gts#" CMakeFiles/gvplugin_neato_layout.dir/link.txt)
[ ! -L "$out" ] && echo "built $out"
