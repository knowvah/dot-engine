#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Issue #158: the issue-130 aux-rank trace (I130), rebuilt against graphviz
# 16.1.1. Builds gvplugin_dot_layout from an rsync'd copy of the oracle tree,
# first unpatched (must be byte-identical to the oracle), then with
# native-i130-trace.patch, and prints the I130 line of every variant V1-V11 of
# src/layout/dot/flat-adj-source-subgraph.test.ts.
#   bash native-i130.sh <scratch-dir>
# Never writes to ~/git/graphviz-16.1.1 or /tmp/ghl1611.
set -euo pipefail
scr=${1:?scratch dir}
here=$(cd "$(dirname "$0")" && pwd)
G16=$HOME/git/graphviz-16.1.1
DOT=$G16/build/cmd/dot/dot
mkdir -p "$scr"
rsync -a --exclude build "$G16/" "$scr/gv/"
git -C "$scr/gv" checkout -- . 2>/dev/null || true
build() { # <build-dir>
  cmake -S "$scr/gv" -B "$1" -DCMAKE_BUILD_TYPE=Release -DWITH_POPPLER=OFF \
    -DBISON_EXECUTABLE=/opt/homebrew/opt/bison/bin/bison \
    -DFLEX_EXECUTABLE=/opt/homebrew/opt/flex/bin/flex > "$1.cmake.log" 2>&1
  cmake --build "$1" --target gvplugin_dot_layout -j 4 > "$1.build.log" 2>&1
}
plugdir() { # <build-dir> <plugin-dir>
  mkdir -p "$2"
  ln -sf /tmp/ghl1611/libgvplugin_core*.dylib "$2/"
  cp "$1"/plugin/dot_layout/libgvplugin_dot_layout*.dylib "$2/"
  GVBINDIR=$2 "$DOT" -c
}
build "$scr/b0"; plugdir "$scr/b0" "$scr/plug0"
( cd "$scr/gv" && patch -p1 < "$here/native-i130-trace.patch" )
build "$scr/b1"; plugdir "$scr/b1" "$scr/plug1"
SAME='{rank=same; a; b}'
W4='a:n->b:n [constraint=false]; a:s->b:s [constraint=false]; a->b [constraint=false];'
REV='b:n -> a:n; b:s -> a:s;'
LAB='a:n -> b:n [label=x]; a:s -> b:s [label=y];'
while IFS='|' read -r name src; do
  printf '%s\n' "$src" > "$scr/$name.gv"
  GVBINDIR=/tmp/ghl1611 "$DOT" -Tdot "$scr/$name.gv" > "$scr/$name.oracle" 2>&1
  GVBINDIR=$scr/plug0 "$DOT" -Tdot "$scr/$name.gv" > "$scr/$name.plug0" 2>&1
  cmp -s "$scr/$name.oracle" "$scr/$name.plug0" || { echo "$name: unpatched rebuild differs from the oracle" >&2; exit 3; }
  echo "$name $(GVTS_I130=1 GVBINDIR=$scr/plug1 "$DOT" -Tdot "$scr/$name.gv" 2>&1 >/dev/null | grep I130 | tr '\n' ' ')"
done <<VARIANTS
V1|digraph { $SAME $W4 }
V2|digraph { rankdir=LR; $SAME $W4 }
V3|digraph { {rank=same; a; b;} a -> b; a:e -> b:w; }
V4|digraph { $SAME a:n -> b:n; a:s -> b:s; }
V5|digraph { $SAME a:e -> b:w [label=x]; }
V6|digraph { $SAME a:n -> b:n; b:s -> a:s; }
V7|digraph { newrank=true; $SAME a:n -> b:n; a:s -> b:s; }
V8|digraph { $SAME $REV }
V9|digraph { rankdir=LR; $SAME $REV }
V10|digraph { a [ordering=out]; $SAME $LAB }
V11|digraph { b [ordering=in]; $SAME $LAB a -> b; }
VARIANTS
