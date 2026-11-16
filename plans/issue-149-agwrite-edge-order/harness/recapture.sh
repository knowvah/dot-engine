#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Issue #149: re-capture, from native graphviz 16.1.1, the native fixtures whose
# tests the write_body port turns red (ADR-0002 decision 7). Only the files
# listed below, and only when the 16.1.1 capture differs from the committed
# 16.1.0 one in line ORDER alone (sorted lines equal): anything else is another
# upstream change, and the file must stay at 16.1.0.
#
#   bash recapture.sh check <scratch-dir>   classify every file, change nothing
#   bash recapture.sh apply <scratch-dir>   as check; copy only if no file is CONTENT
#
# Run from the repo root. Each capture uses the command line of the source's
# own regen script (cited per block), pointed at the 16.1.1 oracle
# (test/corpus/oracle-paths.mjs). The two instrumented sources run their
# regen.sh in a scratch copy with G pointing at the 16.1.1 checkout.
set -uo pipefail
mode=${1:?check|apply}; scr=${2:?scratch dir}
G16=$HOME/git/graphviz-16.1.1
DOT=$G16/build/cmd/dot/dot
GV=/tmp/ghl1611          # dot-only plugin dir
GVALL=/tmp/ghl1611-all   # all engines
REPO=$(pwd)
"$DOT" -V 2>&1 | grep -q '16\.1\.1' || { echo "oracle is not 16.1.1" >&2; exit 2; }
for d in "$GV" "$GVALL"; do [ -f "$d/config8" ] || { echo "$d/config8 missing: GVBINDIR=$d $DOT -c" >&2; exit 2; }; done
rm -rf "$scr"; mkdir -p "$scr/new"
pairs=()   # "<committed path>|<fresh capture path>"
cap() { # <committed path> <engine> <fmt> <input> <plugin dir>
  local out="$scr/new/$(echo "$1" | tr / _)"
  GVBINDIR=$5 "$DOT" -K"$2" -T"$3" "$4" > "$out" 2> /dev/null
  pairs+=("$1|$out")
}

# plans/issue-167-name-canon/harness/regen.sh:12-15
H=plans/issue-167-name-canon/harness
for f in names names-ll names-ll0 odd; do for fmt in dot xdot; do
  cap "$H/out/$f.$fmt" dot "$fmt" "$H/$f.gv" "$GV"
done; done
# plans/issue-134-echo-attr-canon/harness/regen.sh:16-25
H=plans/issue-134-echo-attr-canon/harness
for fmt in dot xdot; do
  cap "$H/out/odd.dot.$fmt" dot "$fmt" "$H/odd.gv" "$GV"
  cap "$H/out/odd.patchwork.$fmt" patchwork "$fmt" "$H/odd.gv" "$GVALL"
done
# plans/issue-141-nodeinbox-pad/harness/regen.sh:15-19 (native exits 1; output complete)
H=plans/issue-141-nodeinbox-pad/harness
for f in abort-near abort-touch abort-far abort-near-pad abort-near-pad0; do
  cap "$H/out/$f.xdot" dot xdot "$H/$f.gv" "$GV"
done
# plans/post-16-1-followups-11/harness/T7b/regen.sh:29-31 (stock = the all-engines dir)
H=plans/post-16-1-followups-11/harness/T7b
for e in dot circo; do for f in xdot dot; do
  cap "$H/stored-draws.$e.$f" "$e" "$f" "$H/stored-draws.gv" "$GVALL"
done; done
# src/layout/neato/ipsep-probes.test.ts:4-6 (the oracle's own -Kneato -Txdot; the
# seven unconstrained probes only: the directed ones are nondeterministic natively)
H=src/layout/neato/__fixtures__/ipsep
for f in ipsep-grid ipsep-k6 ipsep-rand ipsep-rand-len ipsep-tree kd-ipsep kd-ipsep-len; do
  cap "$H/$f.xdot" neato xdot "$H/$f.gv" "$GVALL"
done
# src/layout/sfdp/__fixtures__/dim/regen.sh (the -Tdot half; dim.test.ts reads .dot)
H=src/layout/sfdp/__fixtures__/dim
for c in dim3 dim3-dimen3 dim4-dimen4 overlap-prism-dim3; do
  cap "$H/$c.dot" sfdp dot "$H/$c.gv" "$GVALL"
done
# test/golden/pt-issue-36.test.ts:38 (the -Tdot ref)
cap test/golden/refs/pt-issue-36-cimare.native.dot dot dot test/golden/inputs/pt-issue-36-cimare.dot "$GV"

# Instrumented: T7b noaddr (subg-after-free.c under the noaddr fdp plugin).
mkdir -p "$scr/t7b/plans"
cp -R plans/post-16-1-followups-11 plans/post-16-1-followups-10 "$scr/t7b/plans/"
( cd "$scr/t7b/plans/post-16-1-followups-11/harness/T7b" &&
  G=$G16 GV_SOVER=8.0.16 bash regen.sh "$scr/t7b-build" "$GVALL" > "$scr/t7b.log" 2>&1 )
for e in fdp osage; do for s in s cluster_k; do for m in root nofree; do
  k=noaddr/subg-$e.$s.$m.xdot
  pairs+=("plans/post-16-1-followups-11/harness/T7b/$k|$scr/t7b/plans/post-16-1-followups-11/harness/T7b/$k")
done; done; done
# Instrumented: rerender (twice.c in one libgvc process).
mkdir -p "$scr/rr/src/gvc/__fixtures__" "$scr/rr/plans"
cp -R src/gvc/__fixtures__/rerender "$scr/rr/src/gvc/__fixtures__/"
cp -R plans/post-16-1-followups-9 "$scr/rr/plans/"
( cd "$scr/rr/src/gvc/__fixtures__/rerender" && G=$G16 GVBINDIR=$GVALL bash regen.sh > "$scr/rr.log" 2>&1 )
for f in dot xdot; do for n in 1 2 3; do
  k=nestedclust.dot.$f.nofree.$n
  pairs+=("src/gvc/__fixtures__/rerender/$k|$scr/rr/src/gvc/__fixtures__/rerender/$k")
done; done

content=0
for p in "${pairs[@]}"; do
  old=${p%%|*}; new=${p#*|}
  if [ ! -s "$new" ]; then v=MISSING; content=1
  elif cmp -s "$old" "$new"; then v=same
  elif [ "$(LC_ALL=C sort "$old" | shasum)" = "$(LC_ALL=C sort "$new" | shasum)" ]; then v=order
  else v=CONTENT; content=1
  fi
  echo "$v $old"
done
[ "$mode" = apply ] || exit $content
[ $content = 0 ] || { echo "a file is CONTENT or MISSING: nothing copied" >&2; exit 1; }
for p in "${pairs[@]}"; do cp "${p#*|}" "$REPO/${p%%|*}"; done
echo "copied ${#pairs[@]} files"
