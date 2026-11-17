#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# build-c.sh <outdir>: links partition-1611.c and partition-fuzz-1611.c against
# the 16.1.1 oracle build's own libortho.a and libutil.a (read-only), into
# <outdir>/partition-1611 and <outdir>/partition-fuzz-1611.
#   partition-1611        prints, per case, gv_permutation's two orderings and
#                         partition()'s sorted rectangle set, each from srand(1)
#                         (a fresh process); stderr is merged in order.
#   partition-fuzz-1611 S N  prints the 1-2 cell inputs (seed S) for which
#                         partition() returns N rectangles with empty stderr.
set -euo pipefail
OUT=$1; HERE=$(cd "$(dirname "$0")" && pwd)
G=$HOME/git/graphviz-16.1.1; B=$G/build
mkdir -p "$OUT"
for f in partition-1611 partition-fuzz-1611; do
  clang -O2 -std=gnu17 -w -I"$B" -I"$G/lib" -I"$G/lib/cdt" -I"$G/lib/cgraph" \
    -I"$G/lib/common" -I"$G/lib/gvc" -I"$G/lib/pathplan" "$HERE/$f.c" \
    "$B/lib/ortho/libortho.a" "$B/lib/util/libutil.a" \
    -L"$B/lib/gvc" -lgvc -L"$B/lib/cgraph" -lcgraph -L"$B/lib/cdt" -lcdt \
    -Wl,-rpath,"$B/lib/gvc" -Wl,-rpath,"$B/lib/cgraph" -Wl,-rpath,"$B/lib/cdt" \
    -o "$OUT/$f"
done
