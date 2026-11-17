#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# golden-compare.sh <base.mjs> <head.mjs> <files-list> <outdir> [formats]
# Like issue-162's native-compare.sh, but takes input file paths (relative to
# the repo root) instead of corpus ids. Per file and format (engine dot) it
# renders base, head (test/tools/bd-job.ts) and native 16.1.1 and prints:
#   <file> <fmt> base=head:<y|n> base~native:<n> head~native:<n> [stderr...]
# "n" counts '<'/'>' diff lines against native after normalize.mjs (0 = equal).
# stderr: native-err/head-err are the byte counts of each side's stderr.
set -u
export LC_ALL=C
BASE=$1 HEAD=$2 LIST=$3 OUT=$4 FMTS=${5:-svg xdot plain json dot cmapx}
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../../.." && pwd)
DOT=$HOME/git/graphviz-16.1.1/build/cmd/dot/dot
mkdir -p "$OUT"
strip() { sed -i '' -e :a -e '/^\n*$/{$d;N;ba' -e '}' "$1"; }
port() { # bundle file fmt out
  timeout 120 node "$REPO/test/tools/bd-job.ts" "$1" "$2" dot "$3" 2>/dev/null > "$4.raw"
  awk '/^--stderr--$/{exit} {print}' "$4.raw" > "$4"
  awk 'f{print} /^--stderr--$/{f=1}' "$4.raw" | sed '/^$/d' > "$4.err"
  strip "$4"
}
cnt() { diff "$1" "$2" | grep -c '^[<>]'; }
grep -v '^#' "$LIST" | while read -r rel; do
  [ -z "$rel" ] && continue
  f="$REPO/$rel"; b=$(basename "$rel" .dot)
  for fmt in $FMTS; do
    p="$OUT/$b.$fmt"
    GVBINDIR=/tmp/ghl1611 timeout 120 "$DOT" -Kdot -T"$fmt" "$f" > "$p.native" 2> "$p.native.err"
    rc=$?; strip "$p.native"
    port "$BASE" "$f" "$fmt" "$p.base"
    port "$HEAD" "$f" "$fmt" "$p.head"
    same=n; cmp -s "$p.base" "$p.head" && same=y
    for k in native base head; do node "$HERE/normalize.mjs" "$fmt" "$p.$k"; done
    nrc=""; [ $rc -ne 0 ] && nrc=" native-rc=$rc"
    hn=$(cnt "$p.head" "$p.native"); tw=""
    [ "$same" = n ] && [ "$hn" -gt 0 ] && tw=" toward:$(node "$HERE/toward.mjs" "$p.base" "$p.head" "$p.native")"
    err=" native-err=$(wc -c < "$p.native.err" | tr -d ' ') head-err=$(wc -c < "$p.head.err" | tr -d ' ')"
    echo "$rel $fmt base=head:$same base~native:$(cnt "$p.base" "$p.native") head~native:$hn$nrc$tw$err"
  done
done
