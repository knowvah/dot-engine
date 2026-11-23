#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Issue #195: write the carried oracle's (ADR-0003) outputs the unit test reads.
#   bash recapture.sh [outdir]     (default: this harness's native/)
# Per in-scope probe (not oos-*): -Kdot -Txdot, -Kosage -Txdot and -Kdot -Tplain
# stdout, and -Kdot -Tdot stderr. A probe that errors (unknown-elem) exits 1. Locations come from
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
  GVBINDIR=$gvb "$dot" -Kdot -Txdot "$f" >"$out/$p.dot.xdot" 2>/dev/null || true
  GVBINDIR=$gvball "$dot" -Kosage -Txdot "$f" >"$out/$p.osage.xdot" 2>/dev/null || true
  GVBINDIR=$gvb "$dot" -Kdot -Tplain "$f" >"$out/$p.dot.plain" 2>/dev/null || true
  GVBINDIR=$gvb "$dot" -Kdot -Tdot "$f" 2>"$out/$p.dot.err" >/dev/null || true
done
echo "wrote $(ls "$out" | wc -l | tr -d ' ') files to $out"
