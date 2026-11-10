#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Native 16.1.0 refs for issue #139 (an explicit empty graph name is a name).
# Run from the repo root, after oraclePreflight on the plugin dir:
#   GVBINDIR=/tmp/ghl bash plans/issue-139-empty-graph-name/harness/regen.sh
set -euo pipefail
DOT=${DOT_BIN:-$HOME/git/graphviz/build/cmd/dot/dot}
H=$(cd "$(dirname "$0")" && pwd)
: "${GVBINDIR:?set GVBINDIR (the dot oracle plugin dir, /tmp/ghl)}"
"$DOT" -V 2>&1 | grep -q '16\.1\.0' || { echo "oracle is not 16.1.0" >&2; exit 1; }
mkdir -p "$H/out"
for f in root-empty strict-empty root-anon anonsub-empty sub-empty sub-empty-bare root-percent; do
  for fmt in dot xdot json cmapx; do
    GVBINDIR=$GVBINDIR "$DOT" -Kdot -T$fmt "$H/$f.gv" > "$H/out/$f.$fmt"
  done
done
ls -1 "$H/out"
