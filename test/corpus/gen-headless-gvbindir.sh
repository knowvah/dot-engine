#!/usr/bin/env sh
# SPDX-License-Identifier: EPL-2.0
#
# Build a HEADLESS GVBINDIR for the native `dot` oracle: core + dot_layout
# plugins ONLY (no gd / pango / quartz). With no text-layout plugin loaded,
# graphviz falls back to estimate_textspan_size — the deterministic,
# font-stack-independent measurement that the port's EstimateTextMeasurer
# reproduces. This is the oracle the rules survey (npm run survey) diffs against.
#
# Usage:  sh test/corpus/gen-headless-gvbindir.sh [outDir]
#         sh test/corpus/gen-headless-gvbindir.sh all [outDir]
# `all` also links neato_layout (circo/twopi/osage/patchwork/neato/fdp/sfdp)
# and writes ORACLE_GVBINDIR_ALL (default /tmp/ghl1611-all).
# Env:    GRAPHVIZ_BUILD (default ~/git/graphviz-16.1.1/build), DOT_BIN
#
# @see plans/fix-xcoord-position/DESIGN.md (headless oracle)
# @see plans/fix-xcoord-position/batch-0/T0.2-headless-corpus.md
set -eu

# Defaults mirror ORACLE_GRAPHVIZ_BUILD and ORACLE_GVBINDIR in
# test/corpus/oracle-paths.mjs (the single source of truth; a shell script
# cannot import it). gvbindir-defaults.test.ts fails if they drift apart.
BUILD="${GRAPHVIZ_BUILD:-$HOME/git/graphviz-16.1.1/build}"
PLUGINS="core dot_layout"
OUT="${1:-/tmp/ghl1611}"
ALL_OUT="${2:-/tmp/ghl1611-all}"
if [ "${1:-}" = all ]; then
  PLUGINS="core dot_layout neato_layout"
  OUT="$ALL_OUT"
fi
DOT="${DOT_BIN:-$BUILD/cmd/dot/dot}"

[ -x "$DOT" ] || { echo "dot binary not found/executable: $DOT" >&2; exit 1; }

mkdir -p "$OUT"
# Symlink only the headless-safe plugins. Omitting gd/pango/quartz leaves
# the text-layout slot empty, which is what forces the estimate path.
for plugin in $PLUGINS; do
  found=0
  for lib in "$BUILD/plugin/$plugin/"libgvplugin_"$plugin".*; do
    [ -e "$lib" ] || continue
    ln -sf "$lib" "$OUT/"
    found=1
  done
  [ "$found" = 1 ] || { echo "no libgvplugin_$plugin under $BUILD/plugin/$plugin" >&2; exit 1; }
done

# Regenerate config for exactly these plugins (textlayout ends up empty).
GVBINDIR="$OUT" "$DOT" -c
echo "headless GVBINDIR ready at $OUT (estimate path)"
