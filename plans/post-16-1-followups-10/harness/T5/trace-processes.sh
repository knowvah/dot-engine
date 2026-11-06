#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Usage: trace-processes.sh <scratch-dir> [n]   (n processes, default 10)
# Builds twice-native (twice.c) and interpose.dylib (interpose.c) in <scratch-dir> against ~/git/graphviz/build,
# then runs `fdp plain` on graphs/b56.gv n times with the interposer, printing per process:
#   canon  arg/ret pointers and the label bytes at canon time (agstrcanon returned its argument),
#   free   the pointer agstrfree released and the bytes at that address after the free,
#   plain  the label field of `node Torwaechter` in render 1 and render 2.
set -euo pipefail
S=$1; N=${2:-10}; HERE=$(cd "$(dirname "$0")" && pwd)
G=$HOME/git/graphviz; B=$G/build
export GVBINDIR=${GVBINDIR:-/private/tmp/claude-501/-Users-scottseely-git-knowvah-dot-engine/dfc80e32-d4b2-43d1-a20b-4d2c1be89946/scratchpad/ghl16-all}
mkdir -p "$S"
clang -O1 -g -o "$S/twice-native" "$HERE/twice.c" -I$G/lib/gvc -I$G/lib/cgraph -I$G/lib/common -I$G/lib/pathplan \
  -I$G/lib/cdt -I$G/lib -I$B -I$B/lib/common -I$B/lib/gvc -L$B/lib/gvc -L$B/lib/cgraph -L$B/lib/cdt -lgvc -lcgraph \
  -lcdt -Wl,-rpath,$B/lib/gvc -Wl,-rpath,$B/lib/cgraph -Wl,-rpath,$B/lib/cdt -Wl,-rpath,$B/lib/pathplan -Wl,-rpath,$B/lib/xdot
clang -dynamiclib -O1 -o "$S/interpose.dylib" "$HERE/interpose.c" -I$G/lib/cgraph -I$G/lib/cdt -I$G/lib -I$B \
  -L$B/lib/cgraph -L$B/lib/cdt -lcgraph -lcdt -Wl,-rpath,$B/lib/cgraph -Wl,-rpath,$B/lib/cdt
for p in $(seq 1 "$N"); do
  DYLD_INSERT_LIBRARIES=$S/interpose.dylib "$S/twice-native" "$G/tests/graphs/b56.gv" fdp plain print \
    >"$S/out$p.bin" 2>"$S/err$p.txt"
  echo "== process $p canon-hits=$(grep -c 'ret==arg:1' "$S/err$p.txt") frees=$(grep -c '^free' "$S/err$p.txt")"
  sed -n '1,2p' "$S/err$p.txt" | cut -c1-110
  python3 -I -c "
d=open('$S/out$p.bin','rb').read()
for i,x in enumerate(d.split(b'== render 2\n')):
    print('  plain render',i+1,'label byte of Torwaechter:',[l.split(b' ')[6] for l in x.split(b'\n') if l.startswith(b'node Torwaechter ')][0])
"
done
