#!/bin/sh
# Usage: build.sh <output binary>. Same flags and libraries as part-7 T5.
set -e
OUT=$1
HERE=$(cd "$(dirname "$0")" && pwd)
G=$HOME/git/graphviz; B=$G/build
INC="-I$B -I$G/lib -I$G/lib/cdt -I$G/lib/cgraph -I$G/lib/common -I$G/lib/gvc -I$G/lib/pack -I$G/lib/pathplan"
clang -c -O3 -DNDEBUG -std=gnu17 -flto=thin -arch arm64 -DDIGCOLA -DIPSEPCOLA $INC "$HERE/harness.c" -o "$OUT.o"
clang++ -O3 -flto=thin -arch arm64 "$OUT.o" $B/lib/neatogen/libneatogen.a $B/lib/vpsc/libvpsc.a \
  $B/lib/common/libcommon.a $B/lib/pack/libpack.a $B/lib/label/liblabel.a $B/lib/rbtree/librbtree.a \
  $B/lib/ortho/libortho.a $B/lib/sfdpgen/libsfdpgen.a $B/lib/sparse/libsparse.a \
  -L$B/lib/gvc -lgvc -L$B/lib/cgraph -lcgraph -L$B/lib/cdt -lcdt -L$B/lib/pathplan -lpathplan \
  -L/opt/homebrew/opt/gts/lib -lgts -L/opt/homebrew/opt/glib/lib -lglib-2.0 \
  -Wl,-rpath,$B/lib/gvc -Wl,-rpath,$B/lib/cgraph -Wl,-rpath,$B/lib/cdt -Wl,-rpath,$B/lib/pathplan -o "$OUT"
