#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Usage: detector.sh <bundle> <ids-file|--all> <out-dir> [lanes] [cap-s]
# Renders each applicable corpus id with -Kdot -Tplain through bd-job.ts and
# records every P160* line the instrumented bundle prints (detector.patch =
# counterfactual.patch plus markers):
#   P160SIZEY below|above|maxabove  dot_splines_ self-loop sizey took a 16.1.1
#                                   empty-rank branch (ca3353d80, 1a77ac9df)
#   P160BB    dot_compute_bb's min rank is empty (8e06a6261)
#   P160YC    set_ycoords skipped a rank whose lower neighbour is empty (9fca64d0f)
#   P160LR0 / P160LRN  make_LR_constraints skipped a rank with v[0] == NULL,
#             n == 0 / n > 0 (d49e3a529)
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
  m=$(printf "%s\n" "$o" | grep -c P160)
  echo "$id rc=$rc hits=$m" >> '"$OUT"'/status.txt
  printf "%s\n" "$o" | grep P160 | sort | uniq -c | sed "s/^/$id /" >> '"$OUT"'/hits.txt'
