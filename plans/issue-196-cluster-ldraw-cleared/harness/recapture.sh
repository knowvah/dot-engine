#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Carried-oracle refs for issue #196 (a labelled cluster's or root's _ldraw_
# is set from an empty label buffer). Run from the repo root:
#   bash plans/issue-196-cluster-ldraw-cleared/harness/recapture.sh [outdir]
# Default outdir: harness/native. Writes, for every probes/*.gv except
# hide-*.gv, <name>.{xdot,json,dot} (-Kdot) and <name>.err (stderr of
# -Txdot), plus <name>.xdot-json and <name>.xdot-xdot for each hide-*.gv from
# plans/issue-140-json-stored-draws/harness/hide-cluster.c (layout, render,
# style=invis on every top-level subgraph, render again, no free).
set -euo pipefail
H=$(cd "$(dirname "$0")" && pwd)
OUT=${1:-$H/native}
G=${G:-$HOME/git/sseely/graphviz-carried}
B=$G/build
DOT=$B/cmd/dot/dot
export GVBINDIR=${GVBINDIR:-/tmp/ghl1611-carried}
[ -f "$GVBINDIR/config8" ] || "$DOT" -c
"$DOT" -V 2>&1 | grep -q '16\.1\.1' || { echo "oracle is not 16.1.1" >&2; exit 1; }
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
clang -O1 -w -o "$tmp/hide-cluster" "$H/../../issue-140-json-stored-draws/harness/hide-cluster.c" \
  -I"$G/lib/gvc" -I"$G/lib/cgraph" -I"$G/lib/common" -I"$G/lib/pathplan" -I"$G/lib/cdt" -I"$G/lib" \
  -I"$B" -I"$B/lib/common" -I"$B/lib/gvc" -L"$B/lib/gvc" -L"$B/lib/cgraph" -L"$B/lib/cdt" \
  -lgvc -lcgraph -lcdt -Wl,-rpath,"$B/lib/gvc" -Wl,-rpath,"$B/lib/cgraph" -Wl,-rpath,"$B/lib/cdt" \
  -Wl,-rpath,"$B/lib/pathplan" -Wl,-rpath,"$B/lib/xdot"
mkdir -p "$OUT"
for f in "$H"/probes/*.gv; do
  n=$(basename "$f" .gv)
  case $n in hide-*) continue ;; esac
  "$DOT" -Kdot -Txdot "$f" > "$OUT/$n.xdot" 2> "$OUT/$n.err"
  "$DOT" -Kdot -Tjson "$f" > "$OUT/$n.json" 2>/dev/null
  "$DOT" -Kdot -Tdot "$f" > "$OUT/$n.dot" 2>/dev/null
done
for f in "$H"/probes/hide-*.gv; do
  n=$(basename "$f" .gv)
  "$tmp/hide-cluster" "$f" dot xdot json > "$OUT/$n.xdot-json"
  "$tmp/hide-cluster" "$f" dot xdot xdot > "$OUT/$n.xdot-xdot"
done
ls -1 "$OUT" | wc -l
