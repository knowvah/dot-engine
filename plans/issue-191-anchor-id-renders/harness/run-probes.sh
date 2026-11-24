#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Issue #191: run probe.ts (the port twin of twice-native's seq mode) over every probe and
# script, write the outputs to results/<label>/, and print, per job, the anchor ids of the
# port and of native (harness/native/, carried 16.1.1) and whether they agree.
#   bash plans/issue-191-anchor-id-renders/harness/run-probes.sh <label> [probe ...]
# Default probes: anchor anchor-mixed (planning's 20 jobs). anchor-objs (graph, node and edge
# labels) and anchor-clust (the same with a cluster label) were added at execution.
set -uo pipefail
L=${1:?label}
shift
(( $# )) || set -- anchor anchor-mixed
H=plans/issue-191-anchor-id-renders/harness
mkdir -p "$H/results/$L"
eq=0; ne=0
for p in "$@"; do
  for s in l,svg,svg l,cmapx,svg l,xdot,svg l,json,svg l,json0,svg l,dot,svg l,plain,svg \
           l,imap,svg l,svg,f,l,svg l,svg,l,svg,l,svg; do
    t=$p.seq-$(echo "$s" | tr , _).txt
    # No native capture: native crashed on this script (a no-free relayout of a cluster graph,
    # .agent-notes/issue-138.md), so there is nothing to compare.
    if [[ ! -f $H/native/$t ]]; then echo -e "$t\tno-native"; continue; fi
    npx tsx "$H/probe.ts" "$H/probes/$p.gv" dot "$s" > "$H/results/$L/$t" 2>&1
    port=$(grep -o '"[a-z]*_\?[a-z]\+[0-9]\+_[0-9]\+"' "$H/results/$L/$t" | tr '\n' ' ')
    nat=$(grep -o '"[a-z]*_\?[a-z]\+[0-9]\+_[0-9]\+"' "$H/native/$t" | tr '\n' ' ')
    if [[ $port == "$nat" ]]; then v=equal; eq=$((eq+1)); else v=DIFF; ne=$((ne+1)); fi
    echo -e "$t\t$v\tport: $port\tnative: $nat"
  done
done
echo "# equal $eq, diff $ne"
