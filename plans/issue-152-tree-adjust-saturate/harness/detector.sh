#!/bin/bash
# SPDX-License-Identifier: EPL-2.0
# Reach check for #152: how often treeAdjust's rank + delta leaves int32
# (where C's sadd_saturate clamps), and how often a rank or delta already
# sits outside int32 on entry (a value C's int could not hold). Builds a
# traced copy of this checkout's src/ under $TMPDIR and prints
# "<id> rc=<exit> sat=<n> pre=<n>" per id.
# usage: harness/detector.sh <ids-file> [extra .gv files...]
#   ids from test/corpus/corpus-manifest.json; extra files run with dot.
set -euo pipefail
REPO=$(git rev-parse --show-toplevel)
S=$TMPDIR/issue152-det
rm -rf "$S"; mkdir -p "$S"
rsync -a --exclude node_modules --exclude .git --exclude coverage --exclude dist \
  --exclude docs-site --exclude comparisons --exclude plans "$REPO/" "$S/"
ln -s "$REPO/node_modules" "$S/node_modules"
python3 - "$S/src/layout/dot/ns-subtree.ts" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
old = "    n.info.rank = (n.info.rank ?? 0) + delta;\n"
assert old in s, "treeAdjust's add not found"
new = ("    { const r0 = n.info.rank ?? 0, I = 2147483647, J = -2147483648;\n"
       "      if (r0 > I || r0 < J || delta > I || delta < J) "
       "console.error(`DETECT152 pre rank=${r0} delta=${delta}`);\n"
       "      else if (r0 + delta > I || r0 + delta < J) "
       "console.error(`DETECT152 sat rank=${r0} delta=${delta}`); }\n") + old
s = s.replace(old, new, 1)
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
shift
for f in "$@"; do echo "$(basename "$f" .gv) dot $(cd "$(dirname "$f")" && pwd)/$(basename "$f")"; done >> "$S/targets.tsv"
while read -r id engine file; do
  out=$(cd "$REPO" && timeout 90 node test/tools/bd-job.ts "$S/det.mjs" "$file" "$engine" svg 2>&1) && rc=0 || rc=$?
  sat=$(printf '%s\n' "$out" | grep -c 'DETECT152 sat' || true)
  pre=$(printf '%s\n' "$out" | grep -c 'DETECT152 pre' || true)
  echo "$id rc=$rc sat=$sat pre=$pre"
  printf '%s\n' "$out" | grep DETECT152 | sort | uniq -c | head -5 >&2 || true
done < "$S/targets.tsv"
