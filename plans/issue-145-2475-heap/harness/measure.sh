#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Apply the temporary markers to a tree, render one prefix under --trace-gc,
# print the phase lines, the largest heap before any GC and peak RSS, then
# remove the markers again (issue #145, AD-1).
# Usage: measure.sh <tree> <file.dot> <tag>     (logs go next to the .dot)
set -euo pipefail
tree=${1:?tree}; dot=${2:?dot file}; tag=${3:?tag}
here=$(cd "$(dirname "$0")" && pwd)
log=${dot%.dot}.$tag
cd "$tree"
# The aux-edge counter hunk is left out: it does not apply once T3 has changed
# makeAuxEdge, and the count is already recorded.
git apply --exclude=src/layout/dot/position-aux.ts "$here/markers.patch"
trap 'git apply -R --exclude=src/layout/dot/position-aux.ts "$here/markers.patch"' EXIT
/usr/bin/time -l node --expose-gc --trace-gc --import tsx test/corpus/render-one.ts "$dot" dot \
  2> "$log.phase.log" | grep -a ' ms: ' > "$log.gc.log" || true
grep -E 'PHASE (mincross|pos\.|position|render)' "$log.phase.log"
awk '{for (i = 1; i <= NF; i++) if ($i == "->") { v = $(i - 2) + 0; if (v > m) m = v }}
     END { print "largest heap before any GC (MB): " m }' "$log.gc.log"
awk '/maximum resident/ { printf "peak RSS (MB): %.0f\n", $1 / 1048576 } / real / { print "wall (s): " $1 }' "$log.phase.log"
