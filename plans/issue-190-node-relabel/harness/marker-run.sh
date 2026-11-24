#!/usr/bin/env bash
# Issue #190: run a marker bundle (marker.patch applied on the prototype or head) once per
# input and engine, -Tplain, and count ISSUE190_REMAKE lines: a layout-time label remade on a
# node that already has one. Single-layout runs must show 0.
#   bash plans/issue-190-node-relabel/harness/marker-run.sh <marker.mjs> > <out>.tsv
set -uo pipefail
M=$1
H=plans/issue-190-node-relabel/harness
ROOT=$HOME/git/graphviz-16.1.1/tests
TMP=$(mktemp -d "${TMPDIR:-/tmp}/i190mk.XXXXXX")
echo -e "id\tengine\tremakes\tcapped"
total=0
while read -r id; do
  [[ -z $id || $id == \#* ]] && continue
  p=$(node -e "const m=require('./test/corpus/corpus-manifest.json').find(x=>x.id===process.argv[1]);console.log(m?m.path:'')" "$id")
  [[ -z $p ]] && { echo -e "$id\t-\tNOPATH\t-"; continue; }
  for e in dot neato fdp sfdp circo twopi osage patchwork; do
    perl -e 'alarm 120; exec @ARGV' node --max-old-space-size=1536 --stack-size=65500 \
      test/tools/bd-job.ts "$M" "$ROOT/$p" "$e" plain > "$TMP/o" 2>&1; rc=$?
    n=$(grep -c ISSUE190_REMAKE "$TMP/o" || true)
    total=$((total+n))
    echo -e "$id\t$e\t$n\t$([[ $rc -ge 128 ]] && echo yes || echo no)"
  done
done < $H/reach-ids.txt
echo "# remakes $total"
rm -rf "$TMP"
