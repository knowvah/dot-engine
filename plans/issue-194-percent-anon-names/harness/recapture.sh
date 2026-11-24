#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Issue #194: write the carried oracle's (ADR-0003) outputs the unit test reads.
#   bash recapture.sh [outdir]     (default: this harness's native/)
# Per in-scope probe: -Kdot -Tjson and -Tcmapx stdout. Plus the stderr of
# neato-warn (-Kneato -Tdot) and clusters (-Kdot -Tdot). Locations come from
# test/corpus/oracle-paths.mjs; run preflight first (a missing config8 is fixed
# with `GVBINDIR=<dir> <dot> -c`).
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/../../.." && pwd)
out=${1:-$here/native}
paths=$(cd "$root" && node --input-type=module -e "
import * as p from './test/corpus/oracle-paths.mjs';
console.log([p.ORACLE_DOT_BIN, p.ORACLE_GVBINDIR, p.ORACLE_GVBINDIR_ALL].join(' '));")
read -r dot gvb gvball <<<"$paths"
mkdir -p "$out"
for f in "$here"/probes/*.gv; do
  p=$(basename "$f" .gv)
  case $p in oos-*) continue ;; esac
  for fmt in json cmapx; do
    GVBINDIR=$gvb "$dot" -Kdot -T$fmt "$f" >"$out/$p.dot.$fmt" 2>/dev/null
  done
done
GVBINDIR=$gvball "$dot" -Kneato -Tdot "$here/probes/neato-warn.gv" 2>"$out/neato-warn.neato.err" >/dev/null
GVBINDIR=$gvb "$dot" -Kdot -Tdot "$here/probes/clusters.gv" 2>"$out/clusters.dot.err" >/dev/null
echo "wrote $(ls "$out" | wc -l | tr -d ' ') files to $out"
