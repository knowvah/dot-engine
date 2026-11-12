#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Native 16.1.0 refs for issue #134. Run from the repo root:
#   GVBINDIR=/tmp/ghl NEATO_GVBINDIR=<core+dot_layout+neato_layout dir> \
#     bash plans/issue-134-echo-attr-canon/harness/regen.sh
# NEATO_GVBINDIR: symlink build/plugin/{core,dot_layout,neato_layout}/libgvplugin_*
# into a dir under $TMPDIR, then `GVBINDIR=<dir> <dot> -c` (.agent-notes/issue-129.md).
set -euo pipefail
DOT=${DOT_BIN:-$HOME/git/graphviz/build/cmd/dot/dot}
H=$(cd "$(dirname "$0")" && pwd)
: "${GVBINDIR:?set GVBINDIR (the dot oracle plugin dir, /tmp/ghl)}"
: "${NEATO_GVBINDIR:?set NEATO_GVBINDIR (a dir with the neato_layout plugin)}"
"$DOT" -V 2>&1 | grep -q '16\.1\.0' || { echo "oracle is not 16.1.0" >&2; exit 1; }
mkdir -p "$H/out"
# odd.gv: echoed values that are html, keywords, numerals, escapes (added at execution).
for f in labels labels-ll echo echo-ll odd; do
  for fmt in dot xdot; do
    GVBINDIR=$GVBINDIR "$DOT" -Kdot -T$fmt "$H/$f.gv" > "$H/out/$f.dot.$fmt"
  done
done
for f in echo odd; do
  for fmt in dot xdot; do
    GVBINDIR=$NEATO_GVBINDIR "$DOT" -Kpatchwork -T$fmt "$H/$f.gv" > "$H/out/$f.patchwork.$fmt"
  done
done
ls -1 "$H/out"
