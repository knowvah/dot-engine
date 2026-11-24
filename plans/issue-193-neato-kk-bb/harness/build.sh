#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Builds twice-native (plans/post-16-1-followups-9/harness/T11/twice.c) against the carried
# oracle (ADR-0003) into $TMPDIR/i193.
# usage: bash build.sh   (then: GVBINDIR=/tmp/ghl1611-carried-all $TMPDIR/i193/twice-native <file> neato <fmt> nofree)
set -eu
G=${G:-$HOME/git/sseely/graphviz-carried}
B=$G/build
here=$(cd "$(dirname "$0")" && pwd)
src=$here/../../post-16-1-followups-9/harness/T11/twice.c
out=${TMPDIR:-/tmp}/i193
mkdir -p "$out"
clang -O1 -w -o "$out/twice-native" "$src" -I"$G/lib/gvc" -I"$G/lib/cgraph" -I"$G/lib/common" \
  -I"$G/lib/pathplan" -I"$G/lib/cdt" -I"$G/lib" -I"$B" -I"$B/lib/common" -I"$B/lib/gvc" \
  -L"$B/lib/gvc" -L"$B/lib/cgraph" -L"$B/lib/cdt" -lgvc -lcgraph -lcdt -Wl,-rpath,"$B/lib/gvc" \
  -Wl,-rpath,"$B/lib/cgraph" -Wl,-rpath,"$B/lib/cdt" -Wl,-rpath,"$B/lib/pathplan" -Wl,-rpath,"$B/lib/xdot"
echo "$out/twice-native"
