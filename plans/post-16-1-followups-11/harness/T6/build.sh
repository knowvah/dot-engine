#!/bin/bash
# SPDX-License-Identifier: EPL-2.0
# Rebuilds T6's sgd trace rig (item 132) in a scratch dir. Never touches ~/git/graphviz or src/.
#
# Usage: T6_SC=<scratch> T6_ORACLE_GVBINDIR=<oracle plugins> build.sh
#   Native: $T6_SC/gv (copy, native-trace.patch on lib/neatogen/sgd.c), $T6_SC/build,
#   $T6_SC/ghl (core + dot_layout from the oracle, neato_layout instrumented). Traces are
#   gated on GVTS_T6 (terms, schedule, positions per iteration) and GVTS_T6_DEEP (every
#   step's mu, dx, dy, mag, r); off or on, the plugin's -Tdot is byte-equal to the oracle's.
#   Port: $T6_SC/port (copy of the worktree + port-trace.patch + port-trace.ts as
#   src/layout/neato/t6trace.ts). T6_HYPOT=libm swaps Math.hypot for src/common/libm-hypot.ts;
#   T6_EXP=<table> replays macOS exp keyed by its argument (results/exp-mac.txt, from expcmp).
set -euo pipefail
: "${T6_SC:?}" "${T6_ORACLE_GVBINDIR:?}"
HERE=$(cd "$(dirname "$0")" && pwd)
WT=$(cd "$HERE/../../../.." && pwd)
mkdir -p "$T6_SC/ghl" "$T6_SC/port"
rsync -a --exclude build --exclude .git --exclude .claude "$HOME/git/graphviz/" "$T6_SC/gv/"
patch -d "$T6_SC/gv/lib/neatogen" -p0 < "$HERE/native-trace.patch"
cmake -S "$T6_SC/gv" -B "$T6_SC/build" -DCMAKE_BUILD_TYPE=Release \
  -DBISON_EXECUTABLE=/opt/homebrew/opt/bison/bin/bison -DFLEX_EXECUTABLE=/opt/homebrew/opt/flex/bin/flex
cmake --build "$T6_SC/build" --target gvplugin_neato_layout -j8
for f in "$T6_ORACLE_GVBINDIR"/*; do
  case "$(basename "$f")" in *neato_layout*) ;; *) ln -sf "$f" "$T6_SC/ghl/" ;; esac
done
for f in "$T6_SC"/build/plugin/neato_layout/libgvplugin_neato_layout*.dylib; do
  rm -f "$T6_SC/ghl/$(basename "$f")"; ln -s "$f" "$T6_SC/ghl/"
done
rsync -a --exclude .git --exclude node_modules --exclude plans --exclude docs --exclude dist "$WT/" "$T6_SC/port/"
ln -sfn "$(cd "$WT" && pwd -P)/node_modules" "$T6_SC/port/node_modules"
patch -d "$T6_SC/port" -p0 < "$HERE/port-trace.patch"
cp "$HERE/port-trace.ts" "$T6_SC/port/src/layout/neato/t6trace.ts"
cp "$HERE/run.ts" "$T6_SC/port/"
cc -O0 -fno-builtin "$HERE/expcmp.c" -o "$T6_SC/expcmp" -lm
