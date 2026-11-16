#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Usage: detector.sh <bundle> <ids-file|--all> <out-dir> [lanes] [cap-s]
# Renders each applicable corpus id with -Kdot -Tplain through bd-job.ts and
# records every P161* line the instrumented bundle prints (detector.patch =
# counterfactual.patch plus markers):
#   P161MR deadend / P161BK deadend   a forward / back chain ends at a vnode with no
#                                     out edge and is routed to it (16.1.1)
#   P161MR|P161BK incomplete-notdead  a chain still declined (ends elsewhere)
#   P161ER deadend   entryRunSegments stopped at a dead end
#   P161MRE out0 | routefail | null   the dead-end close (4f9ef1d9e, a79e42588)
#   P161RS a|b       recoverSlack stopped at a vnode with no out edge (f3da7c569)
#   P161CLB          clBound: n VIRTUAL with no out edge, taken as NORMAL (f8e3f2100)
#   P161SL           straightLen called on a node with no out edge (5649d079c)
# Writes <out-dir>/hits.txt and <out-dir>/status.txt (id rc hits).
# Bundle: a copy of the base with detector.patch applied, `npm run build:js`,
# pass dist/index.js.
set -u
BUNDLE=$1; IDS=$2; OUT=$3; LANES=${4:-4}; CAP=${5:-60}
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=${REPO:-$(cd "$HERE/../../.." && pwd)}
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
  m=$(printf "%s\n" "$o" | grep -c P161)
  echo "$id rc=$rc hits=$m" >> '"$OUT"'/status.txt
  printf "%s\n" "$o" | grep P161 | sort | uniq -c | sed "s/^/$id /" >> '"$OUT"'/hits.txt'
