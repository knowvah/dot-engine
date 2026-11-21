#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Issue #193 no-free matrix: every probe in probes/ under neato, in plain and xdot, three layouts
# with no free, native (twice-native nofree, carried oracle) against the port (probe.ts, live src/).
# One TSV row per case and format: case fmt verdict r1 r2 r3, where rN is = when render N is
# byte-equal and the diff-line count otherwise. Stderr is not compared (twice.c silences it).
# usage: bash native-compare.sh > out.tsv   (after build.sh and preflight.ts)
set -u
here=$(cd "$(dirname "$0")" && pwd)
root=$here/../../..
tn=${TMPDIR:-/tmp}/i193/twice-native
gvb=${GVBINDIR_ALL:-/tmp/ghl1611-carried-all}
w=$(mktemp -d)
trap 'rm -rf "$w"' EXIT
split() { awk -v p="$2" '/^== render [0-9]$/ { f = p "." $3; printf "" > f; next } { print > f }' "$1"; }
printf 'case\tfmt\tverdict\tr1\tr2\tr3\n'
for f in "$here"/probes/*.gv; do
  c=$(basename "$f" .gv)
  for fmt in plain xdot; do
    GVBINDIR=$gvb "$tn" "$f" neato "$fmt" nofree > "$w/n" 2>/dev/null
    (cd "$root" && npx tsx "$here/probe.ts" neato "$f" "$fmt" 2>/dev/null) > "$w/p"
    split "$w/n" "$w/n"; split "$w/p" "$w/p"
    v=identical; cols=""
    for r in 1 2 3; do
      if cmp -s "$w/n.$r" "$w/p.$r"; then cols="$cols	="; else
        v=differs; cols="$cols	$(diff "$w/n.$r" "$w/p.$r" | grep -c '^[<>]')"; fi
    done
    printf '%s\t%s\t%s%s\n' "$c" "$fmt" "$v" "$cols"
  done
done
