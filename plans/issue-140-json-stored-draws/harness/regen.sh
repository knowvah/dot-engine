#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Native 16.1.0 refs for issue #140 (json prints stored draw strings). Run from the repo root
# after oraclePreflight on the plugin dir:
#   GVBINDIR=/tmp/ghl bash plans/issue-140-json-stored-draws/harness/regen.sh
# Writes harness/out/:
#   hidden.<fmt1>-json         hide-render.c on hidden.gv, dot: render <fmt1>, hide all, render json
#   stored-input.json          dot -Kdot -Tjson stored-input.gv (input draw strings, undrawn objects)
#   empty-buffer.json          dot -Kdot -Tjson empty-buffer.gv (drawn objects, one buffer empty)
#   subg.s.subnofree.json      part-10 subg-after-free.c on part-11 T0/subg.gv, dot, json, s, subnofree
# Open rows (a labelled cluster or root whose label buffer is empty; not equal in the port):
#   ldraw-cleared.{xdot,json}  invisible labelled clusters with input _ldraw_
#   ldraw-newline.{xdot,json}  root and cluster label "\n" with input _ldraw_
#   ldraw-fresh.xdot           an invisible labelled cluster, no input draw strings
#   hide-cluster.xdot-json     hide-cluster.c on hide-cluster.gv: render xdot, hide clusters, json
set -euo pipefail
G=${G:-$HOME/git/graphviz}
B=$G/build
DOT=${DOT_BIN:-$B/cmd/dot/dot}
H=$(cd "$(dirname "$0")" && pwd)
PLANS=$H/../..
: "${GVBINDIR:?set GVBINDIR (the dot oracle plugin dir, /tmp/ghl)}"
"$DOT" -V 2>&1 | grep -q '16\.1\.0' || { echo "oracle is not 16.1.0" >&2; exit 1; }
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
cc() { # <out> <src>
  clang -O1 -w -o "$1" "$2" -I"$G/lib/gvc" -I"$G/lib/cgraph" -I"$G/lib/common" -I"$G/lib/pathplan" \
    -I"$G/lib/cdt" -I"$G/lib" -I"$B" -I"$B/lib/common" -I"$B/lib/gvc" -L"$B/lib/gvc" -L"$B/lib/cgraph" \
    -L"$B/lib/cdt" -lgvc -lcgraph -lcdt -Wl,-rpath,"$B/lib/gvc" -Wl,-rpath,"$B/lib/cgraph" \
    -Wl,-rpath,"$B/lib/cdt" -Wl,-rpath,"$B/lib/pathplan" -Wl,-rpath,"$B/lib/xdot"
}
cc "$tmp/hide-render" "$H/hide-render.c"
cc "$tmp/hide-cluster" "$H/hide-cluster.c"
cc "$tmp/saf" "$PLANS/post-16-1-followups-10/harness/T15/subg-after-free.c"
mkdir -p "$H/out"
for f1 in xdot json; do
  "$tmp/hide-render" "$H/hidden.gv" dot "$f1" json > "$H/out/hidden.$f1-json"
done
"$DOT" -Kdot -Tjson "$H/stored-input.gv" > "$H/out/stored-input.json"
"$DOT" -Kdot -Tjson "$H/empty-buffer.gv" > "$H/out/empty-buffer.json"
"$tmp/saf" "$PLANS/post-16-1-followups-11/harness/T0/subg.gv" dot json s subnofree > "$H/out/subg.s.subnofree.json"
for f in ldraw-cleared ldraw-newline; do
  "$DOT" -Kdot -Txdot "$H/$f.gv" > "$H/out/$f.xdot"
  "$DOT" -Kdot -Tjson "$H/$f.gv" > "$H/out/$f.json"
done
"$DOT" -Kdot -Txdot "$H/ldraw-fresh.gv" > "$H/out/ldraw-fresh.xdot"
"$tmp/hide-cluster" "$H/hide-cluster.gv" dot xdot json > "$H/out/hide-cluster.xdot-json"
ls -1 "$H/out"
