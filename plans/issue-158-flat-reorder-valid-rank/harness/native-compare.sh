#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# native-compare.sh <base.mjs> <head.mjs> <ids-file> <outdir> [formats]
# Per id and format (engine dot), renders base, head (bd-job.ts) and native
# 16.1.1, and prints one line per job:
#   <id> <fmt> base=head:<y|n> base~native:<diff lines> head~native:<diff lines>
# "diff lines" counts '<'/'>' lines of `diff` against native (0 = byte-equal,
# ignoring blank lines at end of file, after normalize.mjs for svg and json).
# A nonzero native exit adds native-rc=N. A changed job (base=head:n) that is
# not equal to native adds toward:<ok|FAIL ...> from toward.mjs.
set -u
export LC_ALL=C
BASE=$1 HEAD=$2 IDS=$3 OUT=$4 FMTS=${5:-svg xdot plain json cmapx}
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../../.." && pwd)
ROOT=$HOME/git/graphviz-16.1.1/tests
DOT=$HOME/git/graphviz-16.1.1/build/cmd/dot/dot
mkdir -p "$OUT"
port() { # bundle file fmt out
  timeout 120 node "$REPO/test/tools/bd-job.ts" "$1" "$2" dot "$3" 2>/dev/null \
    | awk '/^--stderr--$/{exit} {print}' | sed -e :a -e '/^\n*$/{$d;N;ba' -e '}' > "$4"
}
manifest_path() {
  node -e 'const m=require(process.argv[1]);const e=m.find(x=>x.id===process.argv[2]);process.stdout.write(e?e.path:"")' \
    "$REPO/test/corpus/corpus-manifest.json" "$1"
}
cnt() { diff "$1" "$2" | grep -c '^[<>]'; }
grep -v '^#' "$IDS" | awk '{print $1}' | while read -r id; do
  [ -z "$id" ] && continue
  f="$ROOT/$(manifest_path "$id")"
  for fmt in $FMTS; do
    p="$OUT/$id.$fmt"
    nfmt=$fmt
    GVBINDIR=/tmp/ghl1611 timeout 120 "$DOT" -Kdot -T"$nfmt" "$f" > "$p.native" 2>/dev/null
    rc=$?
    sed -i '' -e :a -e '/^\n*$/{$d;N;ba' -e '}' "$p.native"
    port "$BASE" "$f" "$fmt" "$p.base"
    port "$HEAD" "$f" "$fmt" "$p.head"
    same=n; cmp -s "$p.base" "$p.head" && same=y
    for k in native base head; do node "$HERE/normalize.mjs" "$fmt" "$p.$k"; done
    nrc=""; [ $rc -ne 0 ] && nrc=" native-rc=$rc"
    hn=$(cnt "$p.head" "$p.native"); tw=""
    [ "$same" = n ] && [ "$hn" -gt 0 ] && tw=" toward:$(node "$HERE/toward.mjs" "$p.base" "$p.head" "$p.native")"
    echo "$id $fmt base=head:$same base~native:$(cnt "$p.base" "$p.native") head~native:$hn$nrc$tw"
  done
done
