#!/bin/bash
# SPDX-License-Identifier: EPL-2.0
# Reach check for #150: does the port ever need refinement past depth 10 in
# updateBbBz? Builds a $TMPDIR copy of src/ (base source, unbounded) whose
# updateBbBz prints P150HIT the moment depth 10 is reached unrefined, and
# P150CALLS <top-level calls> HITS <n> at exit; then renders each id.
#   bash depth-detector.sh <tsv of id<TAB>path>   (path under the 16.1.1 tests/)
set -euo pipefail
REPO=$(git rev-parse --show-toplevel); T=${TMPDIR:-/tmp}/issue150-det
rm -rf "$T"; mkdir -p "$T/test/corpus"
rsync -a "$REPO/src" "$T/"; cp "$REPO/test/corpus/render-one.ts" "$T/test/corpus/"
cp "$REPO/package.json" "$REPO/tsconfig.json" "$T/"; ln -s "$REPO/node_modules" "$T/node_modules"
python3 - "$T/src/common/splines-geom.ts" <<'PY'
import sys, re
p = sys.argv[1]; s = open(p).read()
s = s.replace("export function updateBbBz(bb: Box, cp: Point[]): void {\n  if (!anyOutside",
  "let H = 0, C = 0;\nprocess.on('exit', () => console.error('P150CALLS ' + C + ' HITS ' + H));\n"
  "export function updateBbBz(bb: Box, cp: Point[], depth = 0): void {\n  if (depth === 0) C++;\n  if (!anyOutside", 1)
s = s.replace("  const left: Point[] = [];\n  const right: Point[] = [];\n  evalBezier(cp, 0.5, left, right);\n  updateBbBz(bb, left);\n  updateBbBz(bb, right);",
  "  if (depth >= 10 && H++ < 3) console.error('P150HIT ' + JSON.stringify(cp));\n"
  "  const left: Point[] = [];\n  const right: Point[] = [];\n  evalBezier(cp, 0.5, left, right);\n"
  "  updateBbBz(bb, left, depth + 1);\n  updateBbBz(bb, right, depth + 1);", 1)
assert 'P150HIT' in s and 'P150CALLS' in s, 'patch did not apply (updateBbBz changed shape)'
open(p, 'w').write(s)
PY
export T
cut -f1,2 "$1" | xargs -P 3 -n 2 bash -c 'r=$(cd "$T" && timeout 120 npx tsx test/corpus/render-one.ts ~/git/graphviz-16.1.1/tests/$1 dot 2>&1 >/dev/null | grep -E "P150|Error" | head -3 | tr "\n" " "); echo "$0 $r"'
