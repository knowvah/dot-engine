#!/bin/sh
# SPDX-License-Identifier: EPL-2.0
# Usage: build.sh <output binary> [graphviz tree]
# Builds harness.c against the tree's own libneatogen.a with the oracle's
# flags (build/lib/neatogen/CMakeFiles/neatogen.dir/flags.make). The default
# tree is the 16.1.1 oracle; pass ~/git/graphviz to build the 16.1.0 control,
# which has no conjugate_gradient_d (imds and hier modes only).
# Nothing is written to the graphviz tree: objects go next to the output.
set -e
OUT=$1
G=${2:-$HOME/git/graphviz-16.1.1}; B=$G/build
HERE=$(cd "$(dirname "$0")" && pwd)
INC="-I$B -I$G/lib -I$G/lib/cdt -I$G/lib/cgraph -I$G/lib/common -I$G/lib/gvc -I$G/lib/pack -I$G/lib/pathplan"
CF="-O3 -DNDEBUG -std=gnu17 -flto=thin -arch arm64 -fPIC -DDIGCOLA -DIPSEPCOLA -DORTHO -DSFDP -DENABLE_LTDL"
OBJS="$OUT.o"
if grep -q conjugate_gradient_d "$G/lib/neatogen/conjgrad.c"; then
  # The traced copy: the oracle's conjgrad.c, its three solvers renamed, and a
  # call recording r.r, p.Ap and alpha after each is computed.
  sed -e 's/conjugate_gradient/h_conjugate_gradient/g' \
      -e 's/^\(.*\)r_r = vectors_inner_product(n, r, r);/&\
    h_trace(0, r_r);/' \
      -e 's/^\(.*\)p_Ap = vectors_inner_product(n, p, Ap);/&\
	h_trace(1, p_Ap);/' \
      -e 's/^\(.*\)alpha = r_r \/ p_Ap;/&\
	h_trace(2, alpha);/' \
      -e 's/^\(.*\)r_r_new = vectors_inner_product(n, r, r);/&\
	    h_trace(0, r_r_new);/' \
      "$G/lib/neatogen/conjgrad.c" > "$OUT.cgd_traced.c"
  printf 'void h_trace(int kind, double v);\n' > "$OUT.trace.h"
  clang -c $CF $INC -include "$OUT.trace.h" "$OUT.cgd_traced.c" -o "$OUT.cgd_traced.o"
  OBJS="$OBJS $OUT.cgd_traced.o"
else
  CF="$CF -DHARNESS_NO_CGD"
fi
clang -c $CF $INC "$HERE/harness.c" -o "$OUT.o"
clang++ -O3 -flto=thin -arch arm64 $OBJS $B/lib/neatogen/libneatogen.a $B/lib/vpsc/libvpsc.a \
  $B/lib/common/libcommon.a $B/lib/pack/libpack.a $B/lib/label/liblabel.a $B/lib/rbtree/librbtree.a \
  $B/lib/ortho/libortho.a $B/lib/sfdpgen/libsfdpgen.a $B/lib/sparse/libsparse.a $B/lib/util/libutil.a \
  -L$B/lib/gvc -lgvc -L$B/lib/cgraph -lcgraph -L$B/lib/cdt -lcdt -L$B/lib/pathplan -lpathplan \
  -L/opt/homebrew/opt/gts/lib -lgts -L/opt/homebrew/opt/glib/lib -lglib-2.0 \
  -Wl,-rpath,$B/lib/gvc -Wl,-rpath,$B/lib/cgraph -Wl,-rpath,$B/lib/cdt -Wl,-rpath,$B/lib/pathplan -o "$OUT"
