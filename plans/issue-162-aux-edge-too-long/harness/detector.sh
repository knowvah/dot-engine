#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Usage: detector.sh <bundle> <ids-file|--all> <out-dir> [lanes] [cap-s]
# Port reach of #162. Renders each applicable corpus id with -Kdot -Tplain
# through bd-job.ts and records the lines the instrumented bundle prints
# (detector.patch = counterfactual.patch plus two markers):
#   P162 reject <fn>     makeAuxEdge refused len > INT_MAX; <fn> is the caller
#   P162 fail dotPosition createAuxEdges failed, so dotPosition returned -1
#   Error: Edge length   the 16.1.1 message itself (counted, value kept)
# Writes <out-dir>/hits.txt (id count line) and <out-dir>/status.txt
# (id rc hits). Bundle: the base with detector.patch applied, then
# `npm run build:js`; pass dist/index.js.
set -u
BUNDLE=$1; IDS=$2; OUT=$3; LANES=${4:-4}; CAP=${5:-60}
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=${REPO:-$(cd "$HERE/../../.." && pwd)}
ROOT=$HOME/git/graphviz-16.1.1/tests
mkdir -p "$OUT"; : > "$OUT/hits.txt"; : > "$OUT/status.txt"
node -e '
const m=require(process.argv[1]);const want=process.argv[2];
const ids=want==="--all"?null:new Set(require("fs").readFileSync(want,"utf8").split("\n").map(s=>s.trim().split(/\s+/)[0]).filter(Boolean));
for(const e of m) if(e.engine==="dot"&&e.status==="applicable"&&(!ids||ids.has(e.id))) console.log(e.id+"\t"+e.path);' "$REPO/test/corpus/corpus-manifest.json" "$IDS" |
while IFS=$'\t' read -r id p; do echo "$id $ROOT/$p"; done |
xargs -P "$LANES" -n 2 bash -c '
  id=$0; f=$1
  o=$(timeout '"$CAP"' node '"$REPO"'/test/tools/bd-job.ts '"$BUNDLE"' "$f" dot plain 2>&1); rc=$?
  m=$(printf "%s\n" "$o" | grep -c -e "^P162" -e "Edge length")
  echo "$id rc=$rc hits=$m" >> '"$OUT"'/status.txt
  printf "%s\n" "$o" | grep -e "^P162" -e "Edge length" | sort | uniq -c | sed "s/^/$id /" >> '"$OUT"'/hits.txt'
