set -e
OUT=$1; SRC=$2
G=$HOME/git/graphviz; B=$G/build
INC="-I$B -I$G/lib -I$G/lib/cdt -I$G/lib/cgraph -I$G/lib/common -I$G/lib/gvc -I$G/lib/pack -I$G/lib/pathplan"
clang -c -O3 -DNDEBUG -std=gnu17 -flto=thin -arch arm64 -DDIGCOLA -DIPSEPCOLA $INC "$SRC" -o "$OUT.o"
clang++ -O3 -flto=thin -arch arm64 "$OUT.o" $B/lib/neatogen/libneatogen.a $B/lib/vpsc/libvpsc.a \
  $B/lib/common/libcommon.a $B/lib/pack/libpack.a $B/lib/label/liblabel.a $B/lib/rbtree/librbtree.a \
  $B/lib/ortho/libortho.a $B/lib/sfdpgen/libsfdpgen.a $B/lib/sparse/libsparse.a $B/lib/util/libutil.a \
  -L$B/lib/gvc -lgvc -L$B/lib/cgraph -lcgraph -L$B/lib/cdt -lcdt -L$B/lib/pathplan -lpathplan \
  -L/opt/homebrew/opt/gts/lib -lgts -L/opt/homebrew/opt/glib/lib -lglib-2.0 \
  -Wl,-rpath,$B/lib/gvc -Wl,-rpath,$B/lib/cgraph -Wl,-rpath,$B/lib/cdt -Wl,-rpath,$B/lib/pathplan -o "$OUT"
