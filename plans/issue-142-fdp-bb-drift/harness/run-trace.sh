#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Issue #142: traces one fdp input natively (instrumented plugin, GVTS_NOADDR=1) and in the port,
# raw and with native's libm results injected (the counterfactual), and prints the first
# difference of each pair plus the xdot byte comparison (backslash-newline wraps removed).
# Needs: build-native.sh's scratch dir, and port-trace.patch applied to src/ (git apply; revert
# with `git checkout -- src/ && rm src/layout/fdp/tr142.ts` before any commit).
# Usage (repo root): bash run-trace.sh <scratch-dir> <out-prefix> <file>
#                    bash run-trace.sh <scratch-dir> <out-prefix> --subg <file> <subgraph>
#   --subg runs subg-after-free.c's `root` mode (#142's three renders) on both sides.
set -u
G=${G:-$HOME/git/graphviz}
B=$G/build
here=$(cd "$(dirname "$0")" && pwd)
scr=$1; o=$2; shift 2
unwrap() { perl -0pe 's/\\\n//g'; }
names() { sed -E 's/_port_[^ ]+/_port_/' "$1" > "$1.n"; }   # port-node names are debug text
rm -f "$o.nat.tr"
if [ "$1" = --subg ]; then
  bin=$scr/subg-after-free
  [ -x "$bin" ] || clang -O1 -w -o "$bin" "$here/../../post-16-1-followups-10/harness/T15/subg-after-free.c" \
    -I"$G/lib/gvc" -I"$G/lib/cgraph" -I"$G/lib/common" -I"$G/lib/pathplan" -I"$G/lib/cdt" -I"$G/lib" -I"$B" \
    -I"$B/lib/common" -I"$B/lib/gvc" -L"$B/lib/gvc" -L"$B/lib/cgraph" -L"$B/lib/cdt" -lgvc -lcgraph -lcdt \
    -Wl,-rpath,"$B/lib/gvc" -Wl,-rpath,"$B/lib/cgraph" -Wl,-rpath,"$B/lib/cdt" -Wl,-rpath,"$B/lib/pathplan" \
    -Wl,-rpath,"$B/lib/xdot"
  GVTS_NOADDR=1 GVBINDIR=$scr/gv GVTS_TRACE142=$o.nat.tr "$bin" "$2" fdp xdot "$3" root | unwrap > "$o.nat.xdot"
  set -- --subg "$2" "$3"
else
  GVTS_NOADDR=1 GVBINDIR=$scr/gv GVTS_TRACE142=$o.nat.tr "$B/cmd/dot/dot" -Kfdp -Txdot "$1" | unwrap > "$o.nat.xdot"
fi
npx tsx "$here/port-trace.ts" "$@" "$o.port.tr" | unwrap > "$o.port.xdot"
npx tsx "$here/port-trace.ts" "$@" "$o.cf.tr" "$o.nat.tr" 2> "$o.cf.libm" | unwrap > "$o.cf.xdot"
for t in nat port cf; do names "$o.$t.tr"; done
echo "== raw port against native"
echo "xdot lines differing: $(diff "$o.nat.xdot" "$o.port.xdot" | grep -c '^<')"
node "$here/firstdiff.mjs" "$o.nat.tr.n" "$o.port.tr.n" 1
echo "== port with native's libm results injected against native"
cat "$o.cf.libm"
echo "xdot lines differing: $(diff "$o.nat.xdot" "$o.cf.xdot" | grep -c '^<')"
node "$here/firstdiff.mjs" "$o.nat.tr.n" "$o.cf.tr.n" 1
exit 0
