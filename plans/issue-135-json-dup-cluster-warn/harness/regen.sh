#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Native 16.1.0 stderr refs for issue #135. Run from the repo root:
#   GVBINDIR=/tmp/ghl NEATO_GVBINDIR=<core+dot_layout+neato_layout dir> \
#     bash plans/issue-135-json-dup-cluster-warn/harness/regen.sh
# NEATO_GVBINDIR: symlink build/plugin/{core,dot_layout,neato_layout}/libgvplugin_*
# into a dir under $TMPDIR, then `GVBINDIR=<dir> <dot> -c` (.agent-notes/issue-129.md).
# Only stderr is kept for root renders: the warning is the whole of #135 there and
# stdout is unchanged. The subgraph render (sub) keeps stdout too: its gids change.
set -euo pipefail
DOT=${DOT_BIN:-$HOME/git/graphviz/build/cmd/dot/dot}
H=$(cd "$(dirname "$0")" && pwd)
: "${GVBINDIR:?set GVBINDIR (the dot oracle plugin dir, /tmp/ghl)}"
: "${NEATO_GVBINDIR:?set NEATO_GVBINDIR (a dir with the neato_layout plugin)}"
"$DOT" -V 2>&1 | grep -q '16\.1\.0' || { echo "oracle is not 16.1.0" >&2; exit 1; }
mkdir -p "$H/out"
# dup: one repeat; dup3: four repeats in DFS order, one under a non-cluster;
# attr: clusters by the cluster attribute; lay: after the layers warnings.
for f in dup dup3 attr lay; do
  for fmt in json json0 svg; do
    GVBINDIR=$GVBINDIR "$DOT" -Kdot -T$fmt "$H/$f.gv" 2> "$H/out/$f.dot.$fmt.stderr" > /dev/null
  done
done
# Every engine prints the warning from the json writer. fdp also prints fillMap's
# "Two clusters named" first (a separate port gap: followup-fillmap-warning.md).
for e in neato fdp circo twopi osage patchwork sfdp; do
  for fmt in json json0; do
    GVBINDIR=$NEATO_GVBINDIR "$DOT" -K$e -T$fmt "$H/dup.gv" 2> "$H/out/dup.$e.$fmt.stderr" > /dev/null
  done
done
# sub: a render of subgraph s alone (never the root): label_subgs numbers s itself
# (g != agroot(g)), so _subgraph_cnt is 4 and its subgraphs' gids start at 1.
# Part 10 T15's harness program, without its agseterr(AGMAX) so warnings print.
G=${G:-$HOME/git/graphviz}
B=$G/build
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
sed '/agseterr(AGMAX);/d' "$H/../../post-16-1-followups-10/harness/T15/subg-after-free.c" > "$tmp/subg.c"
clang -O1 -w -o "$tmp/subg" "$tmp/subg.c" -I"$G/lib/gvc" -I"$G/lib/cgraph" \
  -I"$G/lib/common" -I"$G/lib/pathplan" -I"$G/lib/cdt" -I"$G/lib" -I"$B" -I"$B/lib/common" \
  -I"$B/lib/gvc" -L"$B/lib/gvc" -L"$B/lib/cgraph" -L"$B/lib/cdt" -lgvc -lcgraph -lcdt \
  -Wl,-rpath,"$B/lib/gvc" -Wl,-rpath,"$B/lib/cgraph" -Wl,-rpath,"$B/lib/cdt" \
  -Wl,-rpath,"$B/lib/pathplan" -Wl,-rpath,"$B/lib/xdot"
for fmt in json json0; do
  GVBINDIR=$GVBINDIR "$tmp/subg" "$H/sub.gv" dot $fmt s subonly \
    2> "$H/out/sub.s.$fmt.stderr" | sed 1d > "$H/out/sub.s.$fmt"
done
ls -1 "$H/out"
