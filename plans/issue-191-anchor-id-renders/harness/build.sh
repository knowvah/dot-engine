#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Builds twice-native (copied from post-16-1-followups-10/harness/T5) against the
# carried oracle (ADR-0003) into $TMPDIR/i191.
# usage: bash build.sh   (then: GVBINDIR=/tmp/ghl1611-carried $TMPDIR/i191/twice-native ...)
set -eu
G=${G:-$HOME/git/sseely/graphviz-carried}
B=$G/build
here=$(cd "$(dirname "$0")" && pwd)
out=${TMPDIR:-/tmp}/i191
mkdir -p "$out"
clang -O1 -o "$out/twice-native" "$here/twice.c" -I"$G/lib/gvc" -I"$G/lib/cgraph" -I"$G/lib/common" \
  -I"$G/lib/pathplan" -I"$G/lib/cdt" -I"$G/lib" -I"$B" -I"$B/lib/common" -I"$B/lib/gvc" \
  -L"$B/lib/gvc" -L"$B/lib/cgraph" -L"$B/lib/cdt" -lgvc -lcgraph -lcdt -Wl,-rpath,"$B/lib/gvc" \
  -Wl,-rpath,"$B/lib/cgraph" -Wl,-rpath,"$B/lib/cdt" -Wl,-rpath,"$B/lib/pathplan" -Wl,-rpath,"$B/lib/xdot"
echo "$out/twice-native"
