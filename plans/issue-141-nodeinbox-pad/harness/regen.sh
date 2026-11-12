#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Native 16.1.0 refs for issue #141 (the job pad follows the render device).
# Each input is corpus 2825 (dot_concentrate fails, so dot_position returns
# before set_aspect and GD_bb stays 0,0,0,0) with a URL on every node and the
# cluster margins set so that node G's box is 2 pt above the bb (near), touches
# it (touch) or is 16 pt above it (far). Native exits 1 on each; the output is
# still complete. Run from the repo root, after oraclePreflight on the plugin dir:
#   GVBINDIR=/tmp/ghl bash plans/issue-141-nodeinbox-pad/harness/regen.sh
set -uo pipefail
DOT=${DOT_BIN:-$HOME/git/graphviz/build/cmd/dot/dot}
H=$(cd "$(dirname "$0")" && pwd)
: "${GVBINDIR:?set GVBINDIR (the dot oracle plugin dir, /tmp/ghl)}"
"$DOT" -V 2>&1 | grep -q '16\.1\.0' || { echo "oracle is not 16.1.0" >&2; exit 1; }
mkdir -p "$H/out"
for f in abort-near abort-touch abort-far abort-near-pad abort-near-pad0; do
  for fmt in svg xdot json cmapx; do
    GVBINDIR=$GVBINDIR "$DOT" -Kdot -T$fmt "$H/$f.gv" > "$H/out/$f.$fmt" 2> "$H/out/$f.$fmt.stderr"
    rc=$?
    [ "$rc" = 1 ] || { echo "$f.$fmt: expected exit 1, got $rc" >&2; exit 1; }
  done
done
ls -1 "$H/out"
