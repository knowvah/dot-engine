#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Regenerates the part-7 native fixtures: graphviz 16.1.0 (oracle/16.1.0),
# run from each fixture dir so relative image names resolve.
# Usage: GVBINDIR=<full plugin dir> bash regen.sh
set -u
DOT=${DOT:-$HOME/git/graphviz/build/cmd/dot/dot}
HERE=$(cd "$(dirname "$0")" && pwd)
run() { # dir case fmt...
  local dir=$1 c=$2; shift 2
  for fmt in "$@"; do
    (cd "$HERE/$dir" && "$DOT" -T"$fmt" "$c.gv" > "$c.$fmt" 2> "$c.$fmt.stderr")
  done
}
for c in 97-custom 97-nosuch-image 102-ip-found 102-ip-missing 102-ip-abs \
  102-ip-two 102-ip-shapefile graphs-val_val; do run images "$c" svg xdot; done
run images 100-rotate svg
for c in 101-png 101-gif 101-jpg 101-svg 101-svgbare 101-bad; do
  run images "$c" svg xdot json dot plain cmapx
done
for c in 98-point 99-edge 99-edge-color 99-edge-red-colon; do
  run colors "$c" svg xdot json
done
