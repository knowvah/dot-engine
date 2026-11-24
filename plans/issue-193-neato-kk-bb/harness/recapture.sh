#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Issue #193: writes the no-free neato fixtures for kk-tri and kk-ratio from the carried oracle
# (ADR-0003) into <dir>, one file per render, as src/gvc/__fixtures__/rerender/regen.sh names them:
#   <case>.gv and <case>.neato.plain.nofree.{1,2,3}
# usage: bash recapture.sh <dir>   (after build.sh)
set -eu
here=$(cd "$(dirname "$0")" && pwd)
dir=${1:?usage: recapture.sh <dir>}
tn=${TMPDIR:-/tmp}/i193/twice-native
gvb=${GVBINDIR_ALL:-/tmp/ghl1611-carried-all}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
for c in kk-tri kk-ratio; do
  cp "$here/probes/$c.gv" "$dir/$c.gv"
  GVBINDIR=$gvb "$tn" "$dir/$c.gv" neato plain nofree > "$tmp/out"
  awk -v p="$dir/$c.neato.plain.nofree" '/^== render [0-9]$/ { f = p "." $3; printf "" > f; next } { print > f }' "$tmp/out"
done
