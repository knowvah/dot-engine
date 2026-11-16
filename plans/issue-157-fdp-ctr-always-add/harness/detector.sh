#!/usr/bin/env bash
# Usage: detector.sh <bundle> <ids-file> <out-dir> [lanes] [cap-s]
# Renders each corpus id with -Kfdp -Tplain through bd-job.ts and records every
# P157HIT line: a node whose bits differ between the old guarded ctr add and
# 16.1.1's unconditional one. Writes <out-dir>/hits.txt and status.txt.
set -u
BUNDLE=$1; IDS=$2; OUT=$3; LANES=${4:-5}; CAP=${5:-30}
REPO=${REPO:-$HOME/git/knowvah/dot-engine-queue}
ROOT=$HOME/git/graphviz-16.1.1/tests
mkdir -p "$OUT"; : > "$OUT/hits.txt"; : > "$OUT/status.txt"
node -e '
const m=require(process.argv[1]);const ids=new Set(require("fs").readFileSync(process.argv[2],"utf8").split("\n").map(s=>s.trim().split(/\s+/)[0]).filter(Boolean));
for(const e of m) if(ids.has(e.id)) console.log(e.id+"\t"+e.path);' "$REPO/test/corpus/corpus-manifest.json" "$IDS" |
while IFS=$'\t' read -r id p; do echo "$id $ROOT/$p"; done |
xargs -P "$LANES" -n 2 bash -c '
  id=$0; f=$1
  o=$(timeout '"$CAP"' node '"$REPO"'/test/tools/bd-job.ts '"$BUNDLE"' "$f" fdp plain 2>&1); rc=$?
  h=$(printf "%s\n" "$o" | grep -c P157HIT)
  echo "$id rc=$rc hits=$h" >> '"$OUT"'/status.txt
  printf "%s\n" "$o" | grep P157HIT | sed "s/^/$id /" >> '"$OUT"'/hits.txt'
