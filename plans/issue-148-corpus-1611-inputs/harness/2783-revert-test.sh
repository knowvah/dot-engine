#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
#
# Issue #148, T3: revert test for corpus id 2783 (`splines=ortho`).
#
# Question: which 16.1.1 change makes native print `trapezoid segment
# construction failed` on 2783 and return before the drawing is translated?
#
# Method: rebuild libgvc twice under $TMPDIR from the oracle's own objects
# (the oracle tree is only read):
#   control  16.1.1's lib/ortho/partition.c, unmodified;
#   variant  the same file with b99490ece's permutation replaced by 16.1.0's
#            (srand48(173) + drand48 shuffle), see 2783-revert-permutation.patch.
# and render 2783 with each through DYLD_LIBRARY_PATH.
#
# Result on 2026-11-16: control is byte-identical to the oracle; the variant
# is byte-identical to native 16.1.0 (version comment aside), prints nothing
# and translates by 4. So b99490ece (#164) is what moved 2783.
#
# Usage: bash 2783-revert-test.sh [workDir]
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
S="${ORACLE_SRC:-$HOME/git/graphviz-16.1.1}"
B="$S/build"
GVB="${GVBINDIR:-/tmp/ghl1611}"
W="${1:-${TMPDIR:-/tmp}/i148-ortho}"
mkdir -p "$W/control" "$W/variant"

cp "$S/lib/ortho/partition.c" "$W/partition.control.c"
cp "$S/lib/ortho/partition.c" "$W/partition.variant.c"
patch -s "$W/partition.variant.c" "$HERE/2783-revert-permutation.patch"

# Flags and includes of lib/ortho's object library (ortho_obj.dir/flags.make).
INC="-I$B -I$S/lib -I$S/lib/cdt -I$S/lib/cgraph -I$S/lib/common -I$S/lib/gvc -I$S/lib/pack -I$S/lib/pathplan -I$S/lib/ortho"
FLAGS="-DDIGCOLA -DENABLE_LTDL -DGVC_EXPORTS -DIPSEPCOLA -DORTHO -DSFDP -O3 -DNDEBUG -std=gnu17 -flto=thin -arch arm64 -fPIC"
LINK="$(cat "$B/lib/gvc/CMakeFiles/gvc.dir/link.txt")"

for v in control variant; do
  # shellcheck disable=SC2086
  /usr/bin/cc $FLAGS $INC -o "$W/$v/partition.c.o" -c "$W/partition.$v.c"
  L="${LINK/-o libgvc.7.0.15.dylib/-o $W/$v/libgvc.7.0.15.dylib}"
  L="${L/..\/ortho\/CMakeFiles\/ortho_obj.dir\/partition.c.o/$W/$v/partition.c.o}"
  (cd "$B/lib/gvc" && eval "$L") 2>/dev/null
  ln -sf libgvc.7.0.15.dylib "$W/$v/libgvc.7.dylib"
  (cd "$S/tests" && DYLD_LIBRARY_PATH="$W/$v" GVBINDIR="$GVB" "$B/cmd/dot/dot" -Tsvg 2783.dot \
    > "$W/2783.$v.svg" 2> "$W/2783.$v.err") || true
  echo "$v: stderr=[$(tr '\n' '|' < "$W/2783.$v.err")] $(grep -o 'translate([^)]*)' "$W/2783.$v.svg")"
done
(cd "$S/tests" && GVBINDIR="$GVB" "$B/cmd/dot/dot" -Tsvg 2783.dot > "$W/2783.oracle.svg" 2>/dev/null) || true
cmp -s "$W/2783.control.svg" "$W/2783.oracle.svg" && echo "control == oracle: yes" || echo "control == oracle: NO"
