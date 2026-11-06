#!/bin/bash
# SPDX-License-Identifier: EPL-2.0
# Rebuilds T2's sfdp trace rig in a scratch dir. Never touches ~/git/graphviz or src/.
#
# Usage: T2_SC=<scratch> T2_ORACLE_GVBINDIR=<oracle plugins> build.sh
#   Native: $T2_SC/gv (patched copy), $T2_SC/build, $T2_SC/ghl (core + dot_layout from
#   the oracle, neato_layout instrumented). Traces are gated on GVTS_T2 / GVTS_T2_DEEP;
#   with them off, or on, the plugin's xdot is byte-equal to the oracle's.
#   Port: $T2_SC/port (copy of the worktree, port-trace.patch + trace.ts), T2_POW=arm|math|libm.
#   Addon: $T2_SC/addon/libmpow.node, the platform pow as a JS function.
set -euo pipefail
: "${T2_SC:?}" "${T2_ORACLE_GVBINDIR:?}"
HERE=$(cd "$(dirname "$0")" && pwd)
WT=$(cd "$HERE/../../../.." && pwd)
mkdir -p "$T2_SC/ghl" "$T2_SC/addon" "$T2_SC/port"
rsync -a --exclude build --exclude .git --exclude .claude "$HOME/git/graphviz/" "$T2_SC/gv/"
patch -d "$T2_SC/gv/lib/sfdpgen" -p0 spring_electrical.c < "$HERE/native-trace.patch"
cmake -S "$T2_SC/gv" -B "$T2_SC/build" -DCMAKE_BUILD_TYPE=Release \
  -DBISON_EXECUTABLE=/opt/homebrew/opt/bison/bin/bison -DFLEX_EXECUTABLE=/opt/homebrew/opt/flex/bin/flex
cmake --build "$T2_SC/build" --target gvplugin_neato_layout -j8
for f in "$T2_ORACLE_GVBINDIR"/*; do
  case "$(basename "$f")" in *neato_layout*) ;; *) ln -sf "$f" "$T2_SC/ghl/" ;; esac
done
ln -sf "$T2_SC"/build/plugin/neato_layout/libgvplugin_neato_layout*.dylib "$T2_SC/ghl/"
rsync -a --exclude .git --exclude node_modules --exclude plans --exclude docs --exclude dist "$WT/" "$T2_SC/port/"
ln -sfn "$(cd "$WT" && pwd -P)/node_modules" "$T2_SC/port/node_modules"
patch -d "$T2_SC/port" -p0 < "$HERE/port-trace.patch"
cp "$HERE/port-trace.ts" "$T2_SC/port/src/layout/sfdp/trace.ts"
cp "$HERE/run.ts" "$HERE/sweep.ts" "$T2_SC/port/"
NODE_BIN=$(cd "$T2_SC/port" && volta which node 2>/dev/null || which node)
cc -O1 -fno-builtin -bundle -undefined dynamic_lookup -I"$(dirname "$(dirname "$NODE_BIN")")/include/node" \
  "$HERE/libmpow.c" -o "$T2_SC/addon/libmpow.node" -lm
