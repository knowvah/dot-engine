#!/bin/bash
# SPDX-License-Identifier: EPL-2.0
# Reach check for #151: how often adjustregularpath's widening loop indexes a
# slot at or past P.nbox. Builds a traced copy of this checkout's src/ under
# $TMPDIR and prints "<id> rc=<exit> hits=<n> stale=<n>" per id.
# usage: harness/detector.sh <ids-file>   (ids from test/corpus/corpus-manifest.json)
set -euo pipefail
REPO=$(git rev-parse --show-toplevel)
S=$TMPDIR/issue151-det
rm -rf "$S"; mkdir -p "$S"
rsync -a --exclude node_modules --exclude .git --exclude coverage --exclude dist \
  --exclude docs-site --exclude comparisons "$REPO/" "$S/"
ln -s "$REPO/node_modules" "$S/node_modules"
python3 - "$S/src/layout/dot/edge-route-faithful.ts" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
old = "  for (let i = fb - 1; i < lb + 1; i++) {\n"
assert old in s
s = s.replace(old, old + "    if (i >= P.nbox) console.error(`DETECT151 i=${i} nbox=${P.nbox} "
              "fb=${fb} lb=${lb} stale=${P.boxes[i] !== undefined}`);\n", 1)
open(p, 'w').write(s)
PY
(cd "$S" && npx esbuild src/index.ts --bundle --format=esm --outfile="$S/det.mjs" --log-level=warning)
ROOT=$HOME/git/graphviz-16.1.1/tests
python3 - "$REPO/test/corpus/corpus-manifest.json" "$1" "$ROOT" <<'PY' > "$S/targets.tsv"
import json, os, sys
m = {e['id']: e for e in json.load(open(sys.argv[1]))}
for line in open(sys.argv[2]):
    i = line.split()[0] if line.strip() else None
    if i and i in m:
        print(i, m[i]['engine'], os.path.normpath(os.path.join(sys.argv[3], m[i]['path'])))
PY
while read -r id engine file; do
  out=$(cd "$REPO" && timeout 90 node test/tools/bd-job.ts "$S/det.mjs" "$file" "$engine" svg 2>&1) && rc=0 || rc=$?
  hits=$(printf '%s\n' "$out" | grep -c DETECT151 || true)
  stale=$(printf '%s\n' "$out" | grep DETECT151 | grep -c 'stale=true' || true)
  echo "$id rc=$rc hits=$hits stale=$stale"
done < "$S/targets.tsv"
