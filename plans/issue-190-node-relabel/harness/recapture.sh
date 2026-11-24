#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Issue #190: captures the carried oracle's no-free relabel renders for the regression test.
# Writes <out>/relabel.gv and, per engine, <out>/relabel.<engine>.plain.relabel.<n> (n = 1, 2):
# render n of `gvLayout, gvRenderData, set a.label, gvLayout, gvRenderData` on one graph, no free.
#   bash plans/issue-190-node-relabel/harness/recapture.sh <out dir>
# T1 runs it with <out dir> = src/gvc/__fixtures__/rerender. Run harness/preflight.ts first.
set -euo pipefail
out=$1
H=$(cd "$(dirname "$0")" && pwd)
N=$(bash "$H/build.sh" | tail -1)
cp "$H/probes/relabel.gv" "$out/relabel.gv"
for e in dot neato; do
  gvb=/tmp/ghl1611-carried-all; [[ $e == dot ]] && gvb=/tmp/ghl1611-carried
  GVBINDIR=$gvb "$N" "$H/probes/relabel.gv" "$e" plain 2 a label "a much longer label than before" \
    | awk -v p="$out/relabel.$e.plain.relabel" '/^== render [0-9]$/ { f = p "." $3; printf "" > f; next } { print > f }'
done
ls "$out"/relabel.*
