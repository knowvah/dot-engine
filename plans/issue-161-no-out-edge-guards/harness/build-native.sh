#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Builds a scratch dot_layout plugin from graphviz 16.1.1 with detector-native.patch
# (P161* markers on stderr at the five #161 guards). Only lib/dotgen/dotsplines.c is
# recompiled, with the oracle build's own flags (lib/dotgen/CMakeFiles/dotgen.dir/
# flags.make); the object goes ahead of libdotgen.a on the oracle's own link line, so it
# replaces the archive member. ~/git/graphviz-16.1.1 is only read.
# Usage: bash build-native.sh <scratch-dir>    -> GVBINDIR=<scratch-dir>/gv
set -eu
G=$HOME/git/graphviz-16.1.1; B=$G/build; F=$G/lib/dotgen
here=$(cd "$(dirname "$0")" && pwd); scr=$1
mkdir -p "$scr/orig" "$scr/src" "$scr/obj" "$scr/gv"
cp "$F/dotsplines.c" "$scr/orig/dotsplines.c"; cp "$F/dotsplines.c" "$scr/src/dotsplines.c"
(cd "$scr" && patch -s -p0 src/dotsplines.c < "$here/detector-native.patch")
/usr/bin/cc -DDIGCOLA -DENABLE_LTDL -DIPSEPCOLA -DORTHO -DSFDP -I"$B" -I"$F/.." -I"$F/../cdt" \
  -I"$F/../cgraph" -I"$F/../common" -I"$F/../gvc" -I"$F/../pack" -I"$F/../pathplan" \
  -O3 -DNDEBUG -std=gnu17 -flto=thin -arch arm64 -fPIC -w -c "$scr/src/dotsplines.c" \
  -o "$scr/obj/dotsplines.c.o"
cp -P /tmp/ghl1611/config8 /tmp/ghl1611/libgvplugin_core* "$scr/gv/"
rm -f "$scr"/gv/libgvplugin_dot_layout*
out=$scr/gv/libgvplugin_dot_layout.8.dylib
(cd "$B/plugin/dot_layout" && $(sed -e "s#-o libgvplugin_dot_layout.8.0.16.dylib#-o $out $scr/obj/dotsplines.c.o#" \
  CMakeFiles/gvplugin_dot_layout.dir/link.txt))
ln -sf libgvplugin_dot_layout.8.dylib "$scr/gv/libgvplugin_dot_layout.dylib"
echo "built $out"
