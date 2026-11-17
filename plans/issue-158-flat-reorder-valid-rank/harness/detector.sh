#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Usage: detector.sh <bundle> <ids-file> <out-dir> [lanes] [cap-s]
# Renders each corpus id with -Kdot -Tplain through bd-job.ts and records every
# P158* line the instrumented bundle prints (see detector-base.patch):
#   P158MOVE  a rank 16.1.1's valid_rank skips, where the base's flat_reorder
#             moved a node or reversed a flat edge (the #158 reach);
#   P158SORT  a non-adjacent flat group whose left-tail-first order differs
#             from seq order (the splines-flat-multi.ts:109 reach).
# Writes <out-dir>/hits.txt and <out-dir>/status.txt.
# Bundles: build a $TMPDIR copy of the base with detector-base.patch applied
# (both markers); for the cf run, apply counterfactual.patch and only the
# splines-flat-multi.ts hunk of detector-base.patch. `npm run parser:regen`,
# then `npm run build:js`, and pass dist/index.js.
# Usage with --all as <ids-file> scans every applicable manifest id.
set -u
BUNDLE=$1; IDS=$2; OUT=$3; LANES=${4:-5}; CAP=${5:-30}
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../../.." && pwd)
ROOT=$HOME/git/graphviz-16.1.1/tests
mkdir -p "$OUT"; : > "$OUT/hits.txt"; : > "$OUT/status.txt"
node -e '
const m=require(process.argv[1]);const want=process.argv[2];
const ids=want==="--all"?null:new Set(require("fs").readFileSync(want,"utf8").split("\n").map(s=>s.trim().split(/\s+/)[0]).filter(Boolean));
for(const e of m) if(e.status==="applicable"&&(!ids||ids.has(e.id))) console.log(e.id+"\t"+e.path);' "$REPO/test/corpus/corpus-manifest.json" "$IDS" |
while IFS=$'\t' read -r id p; do echo "$id $ROOT/$p"; done |
xargs -P "$LANES" -n 2 bash -c '
  id=$0; f=$1
  o=$(timeout '"$CAP"' node '"$REPO"'/test/tools/bd-job.ts '"$BUNDLE"' "$f" dot plain 2>&1); rc=$?
  m=$(printf "%s\n" "$o" | grep -c P158MOVE); s=$(printf "%s\n" "$o" | grep -c P158SORT)
  echo "$id rc=$rc move=$m sort=$s" >> '"$OUT"'/status.txt
  printf "%s\n" "$o" | grep P158 | sed "s/^/$id /" >> '"$OUT"'/hits.txt'
