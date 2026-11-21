#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Builds relabel-native against the carried oracle (ADR-0003) into $TMPDIR/i190.
# usage: bash build.sh   (then: GVBINDIR=/tmp/ghl1611-carried[-all] $TMPDIR/i190/relabel-native ...)
set -eu
G=${G:-$HOME/git/sseely/graphviz-carried}
B=$G/build
here=$(cd "$(dirname "$0")" && pwd)
out=${TMPDIR:-/tmp}/i190
mkdir -p "$out"
clang -O1 -o "$out/relabel-native" "$here/relabel.c" -I"$G/lib/gvc" -I"$G/lib/cgraph" -I"$G/lib/common" \
  -I"$G/lib/pathplan" -I"$G/lib/cdt" -I"$G/lib" -I"$B" -I"$B/lib/common" -I"$B/lib/gvc" \
  -L"$B/lib/gvc" -L"$B/lib/cgraph" -L"$B/lib/cdt" -lgvc -lcgraph -lcdt -Wl,-rpath,"$B/lib/gvc" \
  -Wl,-rpath,"$B/lib/cgraph" -Wl,-rpath,"$B/lib/cdt" -Wl,-rpath,"$B/lib/pathplan" -Wl,-rpath,"$B/lib/xdot"
echo "$out/relabel-native"
