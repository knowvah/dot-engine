#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Carried-oracle refs for issue #199 (json lists a subgraph's nodes in
# sequence order). Run from the repo root:
#   bash plans/issue-199-json-subgraph-node-order/harness/recapture.sh [outdir]
# Default outdir: harness/native. Writes, for every probes/*.gv and each engine
# in dot and neato, <name>.<engine>.json and <name>.<engine>.json0, and the
# stderr of -Tjson as <name>.<engine>.err. The subgraph-render refs are
# subrender/build.sh's.
set -euo pipefail
H=$(cd "$(dirname "$0")" && pwd)
OUT=${1:-$H/native}
DOT=${DOT:-$HOME/git/sseely/graphviz-carried/build/cmd/dot/dot}
DOTDIR=${GVBINDIR:-/tmp/ghl1611-carried}
ALLDIR=${GVBINDIR_ALL:-/tmp/ghl1611-carried-all}
for d in "$DOTDIR" "$ALLDIR"; do [ -f "$d/config8" ] || GVBINDIR=$d "$DOT" -c; done
GVBINDIR=$DOTDIR "$DOT" -V 2>&1 | grep -q '16\.1\.1' || { echo "oracle is not 16.1.1" >&2; exit 1; }
mkdir -p "$OUT"
for f in "$H"/probes/*.gv; do
  n=$(basename "$f" .gv)
  for K in dot neato; do
    if [ "$K" = dot ]; then export GVBINDIR=$DOTDIR; else export GVBINDIR=$ALLDIR; fi
    "$DOT" -K$K -Tjson "$f" > "$OUT/$n.$K.json" 2> "$OUT/$n.$K.err"
    "$DOT" -K$K -Tjson0 "$f" > "$OUT/$n.$K.json0" 2>/dev/null
  done
done
ls -1 "$OUT" | wc -l
