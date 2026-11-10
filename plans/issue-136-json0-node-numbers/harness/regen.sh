#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Native 16.1.0 json0 refs for issue #136. Run from the repo root:
#   GVBINDIR=/tmp/ghl NEATO_GVBINDIR=<core+dot_layout+neato_layout dir> \
#     bash plans/issue-136-json0-node-numbers/harness/regen.sh
# NEATO_GVBINDIR: symlink build/plugin/{core,dot_layout,neato_layout}/libgvplugin_*
# into a dir under $TMPDIR, then `GVBINDIR=<dir> <dot> -c` (.agent-notes/issue-129.md).
# sizes: width/height below 1 inch and of 5+ significant digits (0.75, 0.34444, 2.0866);
# frac: fractional x coordinates (88.148, 133.15); dim3: dimen=3, a 3-coordinate pos.
set -euo pipefail
DOT=${DOT_BIN:-$HOME/git/graphviz/build/cmd/dot/dot}
H=$(cd "$(dirname "$0")" && pwd)
: "${GVBINDIR:?set GVBINDIR (the dot oracle plugin dir, /tmp/ghl)}"
: "${NEATO_GVBINDIR:?set NEATO_GVBINDIR (a dir with the neato_layout plugin)}"
"$DOT" -V 2>&1 | grep -q '16\.1\.0' || { echo "oracle is not 16.1.0" >&2; exit 1; }
mkdir -p "$H/out"
for f in sizes frac; do
  GVBINDIR=$GVBINDIR "$DOT" -Kdot -Tjson0 "$H/$f.gv" > "$H/out/$f.dot.json0"
done
GVBINDIR=$NEATO_GVBINDIR "$DOT" -Kneato -Tjson0 "$H/dim3.gv" > "$H/out/dim3.neato.json0"
ls -1 "$H/out"
