#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Capture the carried oracle's output for every probe in dot, xdot, json, plain.
# Usage: bash capture-native.sh   (from anywhere)
set -euo pipefail
H="$(cd "$(dirname "$0")" && pwd)"
DOT="${DOT_BIN:-$HOME/git/sseely/graphviz-carried/build/cmd/dot/dot}"
export GVBINDIR="${GVBINDIR:-/tmp/ghl1611-carried}"
[ -f "$GVBINDIR/config8" ] || { echo "missing $GVBINDIR/config8: GVBINDIR=$GVBINDIR $DOT -c" >&2; exit 2; }
for f in "$H"/probes/*.gv; do
  b=$(basename "$f" .gv)
  for fmt in dot xdot json plain; do
    "$DOT" -T"$fmt" "$f" > "$H/native/$b.$fmt" 2> "$H/native/$b.$fmt.stderr" || echo "exit $? $b $fmt" >&2
  done
done
find "$H/native" -name "*.stderr" -empty -delete
