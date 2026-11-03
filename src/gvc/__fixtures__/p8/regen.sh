#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Regenerates the part-8 image fixtures: graphviz 16.1.0 (oracle/16.1.0), run
# from this dir so relative image names resolve.
# Usage: GVBINDIR=<full plugin dir> bash regen.sh
set -u
DOT=${DOT:-$HOME/git/graphviz/build/cmd/dot/dot}
cd "$(dirname "$0")"
for c in html-img-bad ip-shapefile; do
  for fmt in svg xdot; do
    "$DOT" -T"$fmt" "$c.gv" > "$c.$fmt" 2> "$c.$fmt.stderr"
  done
done
