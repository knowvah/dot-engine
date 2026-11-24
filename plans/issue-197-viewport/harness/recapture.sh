#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Carried-oracle refs for issue #197 (the `viewport` graph attribute). Run from
# the repo root:
#   bash plans/issue-197-viewport/harness/recapture.sh [outdir]
# Default outdir: harness/native. Writes, for every probes/*.gv,
# <name>.{svg,xdot,json,cmapx,plain} and <name>.err (stderr of -Tsvg), under
# -Kdot, or -Kneato for rtest-*.gv: those port tests.txt's `viewport` cases
# (graphs/viewport.gv with each -Gviewport value set in the file, and neato
# without -n2, which the port does not have).
set -euo pipefail
H=$(cd "$(dirname "$0")" && pwd)
OUT=${1:-$H/native}
DOT=${DOT:-$HOME/git/sseely/graphviz-carried/build/cmd/dot/dot}
DOTDIR=${GVBINDIR:-/tmp/ghl1611-carried}
ALLDIR=${GVBINDIR_ALL:-/tmp/ghl1611-carried-all}
for d in "$DOTDIR" "$ALLDIR"; do [ -f "$d/config8" ] || GVBINDIR=$d "$DOT" -c; done
export GVBINDIR=$DOTDIR
"$DOT" -V 2>&1 | grep -q '16\.1\.1' || { echo "oracle is not 16.1.1" >&2; exit 1; }
mkdir -p "$OUT"
for f in "$H"/probes/*.gv; do
  n=$(basename "$f" .gv)
  K=dot; export GVBINDIR=$DOTDIR
  case $n in rtest-*) K=neato; export GVBINDIR=$ALLDIR ;; esac
  "$DOT" -K$K -Tsvg "$f" > "$OUT/$n.svg" 2> "$OUT/$n.err"
  for fmt in xdot json cmapx plain; do
    "$DOT" -K$K -T$fmt "$f" > "$OUT/$n.$fmt" 2>/dev/null
  done
done
ls -1 "$OUT" | wc -l
