#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Native 16.1.0 refs for issue #144: osage json and xdot on the three corpus
# inputs whose cluster bb is inf,inf,nan,nan (cluster_2 holds a node already
# placed by cluster_1). Native json prints the cluster _draw_ "p" op with bare
# inf/nan tokens (%.03f of a non-finite double), so the file is not valid JSON.
# Run from the repo root with a plugin dir that carries neato_layout (osage),
# after oraclePreflight on it:
#   GVBINDIR=<dir> bash plans/issue-144-json-nonfinite-draw/harness/regen.sh
set -euo pipefail
DOT=${DOT_BIN:-$HOME/git/graphviz/build/cmd/dot/dot}
H=$(cd "$(dirname "$0")" && pwd)
T=${CORPUS_ROOT:-$HOME/git/graphviz/tests}
: "${GVBINDIR:?set GVBINDIR (a 16.1.0 plugin dir with neato_layout)}"
"$DOT" -V 2>&1 | grep -q '16\.1\.0' || { echo "oracle is not 16.1.0" >&2; exit 1; }
mkdir -p "$H/out"
for id in 1221 1332 2721; do
  for fmt in json xdot; do
    GVBINDIR=$GVBINDIR "$DOT" -Kosage -T$fmt "$T/$id.dot" > "$H/out/$id.osage.$fmt"
  done
done
grep -c 'inf\|nan' "$H/out"/*.json
