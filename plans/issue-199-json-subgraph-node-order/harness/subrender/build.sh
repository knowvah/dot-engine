#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Builds part 10 T15's subgraph-render program against the carried oracle and
# writes native's json/json0 of subgraph `s` alone (mode subonly) for each
# subrender/*.gv into <out>. Run from the repo root:
#   bash plans/issue-199-json-subgraph-node-order/harness/subrender/build.sh <out>
set -euo pipefail
OUT=${1:?out dir}
H=$(cd "$(dirname "$0")" && pwd)
G=$HOME/git/sseely/graphviz-carried
B=$G/build
mkdir -p "$OUT"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
sed '/agseterr(AGMAX);/d' "$H/../../../post-16-1-followups-10/harness/T15/subg-after-free.c" > "$tmp/subg.c"
clang -O1 -w -o "$tmp/subg" "$tmp/subg.c" -I"$G/lib/gvc" -I"$G/lib/cgraph" \
  -I"$G/lib/common" -I"$G/lib/pathplan" -I"$G/lib/cdt" -I"$G/lib" -I"$B" -I"$B/lib/common" \
  -I"$B/lib/gvc" -L"$B/lib/gvc" -L"$B/lib/cgraph" -L"$B/lib/cdt" -lgvc -lcgraph -lcdt \
  -Wl,-rpath,"$B/lib/gvc" -Wl,-rpath,"$B/lib/cgraph" -Wl,-rpath,"$B/lib/cdt" \
  -Wl,-rpath,"$B/lib/pathplan" -Wl,-rpath,"$B/lib/xdot"
for f in "$H"/*.gv; do
  b=$(basename "$f" .gv)
  for fmt in json json0; do
    GVBINDIR=/tmp/ghl1611-carried "$tmp/subg" "$f" dot $fmt s subonly \
      2> "$OUT/$b.s.$fmt.stderr" | sed 1d > "$OUT/$b.s.$fmt"
  done
done
