#!/bin/bash
# SPDX-License-Identifier: EPL-2.0
# Traces native and the port on sgd58 and reports the first differing value for each port
# configuration: stock (Math.hypot, Math.exp), libm hypot, macOS exp, both. Writes results/.
# usage: T6_SC=<scratch filled by build.sh> T6_ORACLE_GVBINDIR=<oracle plugins> trace.sh
set -euo pipefail
SC=${T6_SC:?}; O=${T6_ORACLE_GVBINDIR:?}
HERE=$(cd "$(dirname "$0")" && pwd)
F=$HERE/../T0/sgd58.gv
FD=$HERE/../../../post-16-1-followups-10/harness/T2/first-diff.py
D=~/git/graphviz/build/cmd/dot/dot
R=$HERE/results; mkdir -p "$R"
GVBINDIR=$O $D -Kneato -Tdot "$F" > "$SC/o.dot"
GVTS_T6=1 GVTS_T6_DEEP=1 GVBINDIR=$SC/ghl $D -Kneato -Tdot "$F" > "$SC/t.dot" 2> "$SC/t.err"
cmp "$SC/o.dot" "$SC/t.dot" && echo "instrumented==oracle"
EM=$(awk '/^eta_max /{print $2}' "$SC/t.err"); LAM=$(awk '/^lambda /{print $2}' "$SC/t.err")
"$SC/expcmp" "$EM" "$LAM" 30 > "$SC/exp-mac.txt"
cmp "$SC/exp-mac.txt" "$R/exp-mac.txt" && echo "exp table == archived"
run() { # name, env...
  local n=$1; shift
  (cd "$SC/port" && env "$@" GVTS_T6=1 GVTS_T6_DEEP=1 npx tsx run.ts "$F" "$SC/$n.dot" dot 2> "$SC/$n.err")
  echo "== $n (${*//$SC\//}): $(diff "$SC/o.dot" "$SC/$n.dot" | grep -c '^<' || true) of $(wc -l < "$SC/o.dot" | tr -d ' ') dot lines differ"
  python3 "$FD" "$SC/t.err" "$SC/$n.err"
}
{
  run stock T6_HYPOT=math
  run libm-hypot T6_HYPOT=libm
  run mac-exp T6_HYPOT=math T6_EXP="$SC/exp-mac.txt"
  run libm-hypot+mac-exp T6_HYPOT=libm T6_EXP="$SC/exp-mac.txt"
} | tee "$R/first-diff.txt"
node "$HERE/libmcount.mjs" "$SC/t.err" "$SC/exp-mac.txt" | tee "$R/libm-misses.txt"
