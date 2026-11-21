#!/usr/bin/env bash
# Issue #188 gate 6: base vs head, stdout and stderr byte for byte, over the
# reach ids and the probes, under -Kdot in dot, xdot and svg. bd-job prints
# the output, then "--stderr--" and every console line, so one cmp covers both.
#   bash plans/issue-188-edgeinfo-lost/harness/compare.sh <base.mjs> <head.mjs> > <out>.tsv
set -euo pipefail
BASE=$1; HEAD=$2
H=plans/issue-188-edgeinfo-lost/harness
ROOT=$HOME/git/graphviz-16.1.1/tests
TMP=$(mktemp -d "${TMPDIR:-/tmp}/i188cmp.XXXXXX")
files=()
while read -r id; do
  [[ -z $id || $id == \#* ]] && continue
  p=$(node -e "const m=require('./test/corpus/corpus-manifest.json').find(x=>x.id===process.argv[1]);console.log(m?m.path:'')" "$id")
  [[ -n $p ]] && files+=("$id=$ROOT/$p")
done < $H/reach-ids.txt
for f in $H/probes/*.gv $H/../../issue-137-routedotedges-comments/harness/f*.gv; do
  files+=("$(basename "$f" .gv)=$f")
done
job() { perl -e 'alarm 120; exec @ARGV' node --max-old-space-size=1536 --stack-size=65500 \
  test/tools/bd-job.ts "$1" "$2" dot "$3" > "$4" 2>/dev/null || echo CAPPED >> "$4"; }
echo -e "id\tformat\tidentical\tstderrLines"
same=0; total=0
for kv in "${files[@]}"; do
  id=${kv%%=*}; file=${kv#*=}
  for fmt in dot xdot svg; do
    job "$BASE" "$file" $fmt "$TMP/b"; job "$HEAD" "$file" $fmt "$TMP/h"
    total=$((total+1))
    # A job capped on either side is never identical (both sides capped would
    # otherwise compare equal).
    if grep -qx CAPPED "$TMP/b" "$TMP/h"; then r=CAPPED
    elif cmp -s "$TMP/b" "$TMP/h"; then r=yes; same=$((same+1)); else r=NO; fi
    n=$(sed -n '/^--stderr--$/,$p' "$TMP/h" | tail -n +2 | grep -c . || true)
    echo -e "$id\t$fmt\t$r\t$n"
  done
done
echo "# identical $same/$total"
rm -rf "$TMP"
