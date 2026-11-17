#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Usage: detector-native.sh <ids-file|--all> <out-dir> [lanes] [cap-s]
# Native reach of #162: renders each applicable corpus id with the 16.1.1
# oracle (-Kdot -Tplain, GVBINDIR=/tmp/ghl1611) and records every
# "Edge length ... larger than maximum" line and the exit code. No
# instrumented build is needed: make_aux_edge prints the message on every
# refusal (checked and unchecked call sites alike).
# Writes <out-dir>/hits.txt (id count line) and <out-dir>/status.txt (id rc hits).
set -u
IDS=$1; OUT=$2; LANES=${3:-4}; CAP=${4:-60}
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=${REPO:-$(cd "$HERE/../../.." && pwd)}
ROOT=$HOME/git/graphviz-16.1.1/tests
DOT=$HOME/git/graphviz-16.1.1/build/cmd/dot/dot
mkdir -p "$OUT"; : > "$OUT/hits.txt"; : > "$OUT/status.txt"
node -e '
const m=require(process.argv[1]);const want=process.argv[2];
const ids=want==="--all"?null:new Set(require("fs").readFileSync(want,"utf8").split("\n").map(s=>s.trim().split(/\s+/)[0]).filter(Boolean));
for(const e of m) if(e.engine==="dot"&&e.status==="applicable"&&(!ids||ids.has(e.id))) console.log(e.id+"\t"+e.path);' "$REPO/test/corpus/corpus-manifest.json" "$IDS" |
while IFS=$'\t' read -r id p; do echo "$id $ROOT/$p"; done |
xargs -P "$LANES" -n 2 bash -c '
  id=$0; f=$1
  o=$(GVBINDIR=/tmp/ghl1611 timeout '"$CAP"' '"$DOT"' -Kdot -Tplain "$f" 2>&1 >/dev/null); rc=$?
  m=$(printf "%s\n" "$o" | grep -c "Edge length")
  echo "$id rc=$rc hits=$m" >> '"$OUT"'/status.txt
  printf "%s\n" "$o" | grep "Edge length" | sort | uniq -c | sed "s/^/$id /" >> '"$OUT"'/hits.txt'
