#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# engine-compare.sh <base.mjs> <head.mjs> <list> <outdir> [formats]
# <list>: lines "<input> <engine>[,<engine>...]"; <input> is a corpus manifest id
# or a path relative to the repo root (goldens). Per input, engine and format it
# renders base, head (test/tools/bd-job.ts) and native 16.1.1 (GVBINDIR
# /tmp/ghl1611 for dot, /tmp/ghl1611-all otherwise) and prints:
#   <input> <engine> <fmt> base=head:<y|n> base~native:<n> head~native:<n>
#     [native-rc=N] [toward:<ok|FAIL ...>] native-err=<bytes> base-err=<bytes>
#     head-err=<bytes> head-err=native:<y|n>
# (stderr: byte counts of each side's messages; head-err=native:y when the
# head's messages equal native's byte for byte, one message per line.)
# "n" counts '<'/'>' diff lines against native after normalize.mjs (0 = equal).
# Run at load below 12. LANES (default 4) inputs run at once; output order is
# sorted at the end so runs compare line for line.
set -u
export LC_ALL=C
BASE=$1 HEAD=$2 LIST=$3 OUT=$4 FMTS=${5:-svg xdot plain json cmapx}
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../../.." && pwd)
ROOT=$HOME/git/graphviz-16.1.1/tests
DOT=$HOME/git/graphviz-16.1.1/build/cmd/dot/dot
LANES=${LANES:-4}
mkdir -p "$OUT"
strip() { sed -i '' -e :a -e '/^\n*$/{$d;N;ba' -e '}' "$1"; }
port() { # bundle file engine fmt out
  timeout 300 node --stack-size=65500 "$REPO/test/tools/bd-job.ts" "$1" "$2" "$3" "$4" 2>/dev/null > "$5.raw"
  awk '/^--stderr--$/{exit} {print}' "$5.raw" > "$5"
  awk 'f{print} /^--stderr--$/{f=1}' "$5.raw" | sed '/^$/d' > "$5.err"
  strip "$5"
}
resolve() {
  if [ -f "$REPO/$1" ]; then echo "$REPO/$1"; return; fi
  node -e 'const m=require(process.argv[1]);const e=m.find(x=>x.id===process.argv[2]);process.stdout.write(e?e.path:"")' \
    "$REPO/test/corpus/corpus-manifest.json" "$1" | sed "s|^|$ROOT/|"
}
cnt() { diff "$1" "$2" | grep -c '^[<>]'; }
one() { # input engine
  local in=$1 eng=$2 f b gvb fmt p rc same hn tw nrc err
  f=$(resolve "$in"); b=$(basename "$in" .dot)
  gvb=/tmp/ghl1611-all; [ "$eng" = dot ] && gvb=/tmp/ghl1611
  for fmt in $FMTS; do
    p="$OUT/$b.$eng.$fmt"
    GVBINDIR=$gvb timeout 300 "$DOT" -K"$eng" -T"$fmt" "$f" > "$p.native" 2> "$p.native.err"
    rc=$?; strip "$p.native"
    port "$BASE" "$f" "$eng" "$fmt" "$p.base"
    port "$HEAD" "$f" "$eng" "$fmt" "$p.head"
    same=n; cmp -s "$p.base" "$p.head" && same=y
    for k in native base head; do node "$HERE/normalize.mjs" "$fmt" "$p.$k"; done
    nrc=""; [ $rc -ne 0 ] && nrc=" native-rc=$rc"
    hn=$(cnt "$p.head" "$p.native"); tw=""
    [ "$same" = n ] && [ "$hn" -gt 0 ] && tw=" toward:$(node "$HERE/toward.mjs" "$p.base" "$p.head" "$p.native")"
    se=n; cmp -s "$p.head.err" "$p.native.err" && se=y
    err=" native-err=$(wc -c < "$p.native.err" | tr -d ' ') base-err=$(wc -c < "$p.base.err" | tr -d ' ') head-err=$(wc -c < "$p.head.err" | tr -d ' ') head-err=native:$se"
    echo "$in $eng $fmt base=head:$same base~native:$(cnt "$p.base" "$p.native") head~native:$hn$nrc$tw$err"
  done
}
export -f one port resolve cnt strip
export BASE HEAD OUT FMTS HERE REPO ROOT DOT
grep -v '^#' "$LIST" | awk 'NF{n=split($2,e,",");for(i=1;i<=n;i++)print $1" "e[i]}' \
  | xargs -P "$LANES" -n 2 bash -c 'one "$0" "$1"' | sort -k1,1 -k2,2 -k3,3
