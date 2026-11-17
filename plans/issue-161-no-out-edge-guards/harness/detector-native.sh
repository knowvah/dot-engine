#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Usage: detector-native.sh <gvbindir> <ids-file|--all> <out-dir> [lanes] [cap-s]
# Renders each applicable corpus id with the instrumented native plugin (build-native.sh),
# -Kdot -Tplain, and records every P161* stderr line:
#   P161MRE out0    make_regular_edge: (!smode || si) held but hn has no out edge (4f9ef1d9e)
#   P161MRE null    make_regular_edge: straight_path returned NULL, edge dropped (a79e42588)
#   P161RS a|b      recover_slack stopped at a vnode with no out edge (f3da7c569)
#   P161CLB         cl_bound: n VIRTUAL with no out edge, treated as NORMAL (f8e3f2100)
#   P161SL          straight_len called on a node with no out edge (5649d079c)
# Writes <out-dir>/hits.txt and <out-dir>/status.txt (id rc hits).
set -u
GVB=$1; IDS=$2; OUT=$3; LANES=${4:-4}; CAP=${5:-60}
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=${REPO:-$(cd "$HERE/../../.." && pwd)}
ROOT=$HOME/git/graphviz-16.1.1/tests; DOT=$HOME/git/graphviz-16.1.1/build/cmd/dot/dot
mkdir -p "$OUT"; : > "$OUT/hits.txt"; : > "$OUT/status.txt"
node -e '
const m=require(process.argv[1]);const want=process.argv[2];
const ids=want==="--all"?null:new Set(require("fs").readFileSync(want,"utf8").split("\n").map(s=>s.trim().split(/\s+/)[0]).filter(Boolean));
for(const e of m) if(e.status==="applicable"&&(!ids||ids.has(e.id))) console.log(e.id+"\t"+e.path);' "$REPO/test/corpus/corpus-manifest.json" "$IDS" |
while IFS=$'\t' read -r id p; do echo "$id $ROOT/$p"; done |
xargs -P "$LANES" -n 2 bash -c '
  id=$0; f=$1
  o=$(GVBINDIR='"$GVB"' timeout '"$CAP"' '"$DOT"' -Kdot -Tplain "$f" 2>&1 >/dev/null); rc=$?
  m=$(printf "%s\n" "$o" | grep -c "^P161")
  echo "$id rc=$rc hits=$m" >> '"$OUT"'/status.txt
  printf "%s\n" "$o" | grep "^P161" | sort | uniq -c | sed "s/^/$id /" >> '"$OUT"'/hits.txt'
