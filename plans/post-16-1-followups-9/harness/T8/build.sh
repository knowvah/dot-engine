#!/bin/sh
# T8: builds part 7's native VPSC harness (plans/post-16-1-followups-7/harness/T5/harness.c, the
# driver part 8's T0 and T3 ran) twice into $1, with the oracle's flags (flags.make of lib/vpsc):
#  harness-pristine links the oracle's libvpsc.a as it is.
#  harness-ordered links a scratch copy of lib/vpsc (never ~/git/graphviz) with
#  blocks-by-creation.patch applied: Blocks ordered by a Block creation index, nothing else.
set -e
OUT=$1
HERE=$(cd "$(dirname "$0")" && pwd)
T5=$HERE/../../../post-16-1-followups-7/harness/T5
G=/Users/scottseely/git/graphviz; B=$G/build
CFLAGS="-O3 -DNDEBUG -std=gnu17 -flto=thin -arch arm64 -DDIGCOLA -DIPSEPCOLA"
CXXFLAGS="-O3 -DNDEBUG -std=gnu++17 -flto=thin -arch arm64 -fPIC -DDIGCOLA -DENABLE_LTDL -DIPSEPCOLA -DORTHO -DSFDP"
INC="-I$B -I$G/lib -I$G/lib/cdt -I$G/lib/cgraph -I$G/lib/common -I$G/lib/gvc -I$G/lib/pack -I$G/lib/pathplan"
mkdir -p "$OUT/lib"
rm -rf "$OUT/lib/vpsc"
cp -R "$G/lib/vpsc" "$OUT/lib/vpsc"
(cd "$OUT/lib/vpsc" && patch -s -p3 < "$HERE/blocks-by-creation.patch")
rm -f "$OUT/libvpsc-ordered.a"
for f in block blocks constraint csolve_VPSC generate-constraints solve_VPSC variable; do
  c++ $CXXFLAGS "-I$OUT/lib" -I$B -c "$OUT/lib/vpsc/$f.cpp" -o "$OUT/$f.o"
  ar rc "$OUT/libvpsc-ordered.a" "$OUT/$f.o"
done
clang -c $CFLAGS $INC "$T5/harness.c" -o "$OUT/harness.o"
clang++ -c $CXXFLAGS -I$B -I$G/lib "$T5/dump.cpp" -o "$OUT/dump.o"
link() { # <output> <libvpsc>
  clang++ -O3 -flto=thin -arch arm64 "$OUT/harness.o" "$OUT/dump.o" $B/lib/neatogen/libneatogen.a "$2" \
    $B/lib/common/libcommon.a $B/lib/pack/libpack.a $B/lib/label/liblabel.a $B/lib/rbtree/librbtree.a \
    $B/lib/ortho/libortho.a $B/lib/sfdpgen/libsfdpgen.a $B/lib/sparse/libsparse.a \
    -L$B/lib/gvc -lgvc -L$B/lib/cgraph -lcgraph -L$B/lib/cdt -lcdt -L$B/lib/pathplan -lpathplan \
    -L/opt/homebrew/opt/gts/lib -lgts -L/opt/homebrew/opt/glib/lib -lglib-2.0 \
    -Wl,-rpath,$B/lib/gvc -Wl,-rpath,$B/lib/cgraph -Wl,-rpath,$B/lib/cdt -Wl,-rpath,$B/lib/pathplan -o "$1"
}
link "$OUT/harness-pristine" "$B/lib/vpsc/libvpsc.a"
link "$OUT/harness-ordered" "$OUT/libvpsc-ordered.a"
