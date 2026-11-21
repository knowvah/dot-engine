#!/usr/bin/env bash
# Issue #188: run a bundle over the reach ids and probes under -Kdot -Tdot and
# print every ISSUE188_ marker line per input.
#   bash plans/issue-188-edgeinfo-lost/harness/marker-run.sh <bundle.mjs>
set -euo pipefail
BUNDLE=$1
H=plans/issue-188-edgeinfo-lost/harness
ROOT=$HOME/git/graphviz-16.1.1/tests
files=()
while read -r id; do
  [[ -z $id || $id == \#* ]] && continue
  p=$(node -e "const m=require('./test/corpus/corpus-manifest.json').find(x=>x.id===process.argv[1]);console.log(m?m.path:'')" "$id")
  [[ -n $p ]] && files+=("$id=$ROOT/$p")
done < $H/reach-ids.txt
for f in $H/probes/*.gv $H/../../issue-137-routedotedges-comments/harness/f*.gv; do
  files+=("$(basename "$f" .gv)=$f")
done
for kv in "${files[@]}"; do
  id=${kv%%=*}; file=${kv#*=}
  out=$(perl -e 'alarm 120; exec @ARGV' node --max-old-space-size=1536 --stack-size=65500 \
    test/tools/bd-job.ts "$BUNDLE" "$file" dot dot 2>/dev/null || echo "CAPPED")
  marks=$(grep -o 'ISSUE188_[A-Z]* .*' <<<"$out" | sort | uniq -c | tr '\n' ';' || true)
  echo -e "$id\t${marks:-none}"
done
