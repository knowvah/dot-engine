#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Issue #158: re-capture, from native graphviz 16.1.1, the rerender fixtures the
# valid_rank port turns red (rerender-files.txt), and only those.
#   bash recapture-rerender.sh <scratch-dir>          capture, compare, change nothing
#   bash recapture-rerender.sh <scratch-dir> apply    as above, then copy the files
# Run from the repo root. Runs src/gvc/__fixtures__/rerender/regen.sh in a scratch
# copy with G pointing at the 16.1.1 checkout, as #149's recapture.sh did.
set -euo pipefail
scr=${1:?scratch dir}; mode=${2:-check}
G16=$HOME/git/graphviz-16.1.1
GVALL=/tmp/ghl1611-all
"$G16/build/cmd/dot/dot" -V 2>&1 | grep -q '16\.1\.1' || { echo "oracle is not 16.1.1" >&2; exit 2; }
[ -f "$GVALL/config8" ] || { echo "$GVALL/config8 missing: GVBINDIR=$GVALL <dot> -c" >&2; exit 2; }
here=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$scr/rr/src/gvc/__fixtures__" "$scr/rr/plans"
cp -R src/gvc/__fixtures__/rerender "$scr/rr/src/gvc/__fixtures__/"
cp -R plans/post-16-1-followups-9 "$scr/rr/plans/"
( cd "$scr/rr/src/gvc/__fixtures__/rerender" && G=$G16 GVBINDIR=$GVALL bash regen.sh > "$scr/rr.log" 2>&1 )
while read -r f; do
  [ -z "$f" ] && continue
  new="$scr/rr/src/gvc/__fixtures__/rerender/$f"
  if cmp -s "$new" "src/gvc/__fixtures__/rerender/$f"; then echo "SAME $f"; else echo "DIFF $f"; fi
  [ "$mode" = apply ] && cp "$new" "src/gvc/__fixtures__/rerender/$f"
done < "$here/rerender-files.txt"
