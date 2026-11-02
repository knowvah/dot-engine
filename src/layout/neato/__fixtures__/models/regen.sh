#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Regenerates the part-8 model probe fixtures: graphviz 16.1.0 (oracle/16.1.0),
# -Kneato -Txdot, one <case>.xdot and <case>.xdot.stderr per <case>.gv.
#
# KK circuit and mds index C arrays by the 1-based AGSEQ (circuit.c:46,
# neatoinit.c:1231), which reads past the row-pointer array when the last-created
# node has an edge. Those runs usually exit 139, so each case is retried up to
# TRIES times and the first run that exits 0 is kept. kk-len-mds survives about 1
# run in 1500, so a committed non-empty .xdot is left alone when no run survives.
# Any other case with no such run gets an empty .xdot, the longest stderr seen, and
# a <case>.native-crash marker.
#
# Usage: GVBINDIR=<full plugin dir> bash regen.sh
set -u
DOT=${DOT:-$HOME/git/graphviz/build/cmd/dot/dot}
TRIES=${TRIES:-200}
cd "$(dirname "$0")"
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
for f in *.gv; do
  c=${f%.gv}
  : > "$T/best"
  rc=1
  n=0
  while [ "$n" -lt "$TRIES" ]; do
    n=$((n + 1))
    "$DOT" -Kneato -Txdot "$f" > "$T/out" 2> "$T/err"
    rc=$?
    [ "$rc" -eq 0 ] && break
    [ "$(wc -c < "$T/err")" -gt "$(wc -c < "$T/best")" ] && cp "$T/err" "$T/best"
  done 2> /dev/null
  if [ "$rc" -eq 0 ]; then
    cp "$T/out" "$c.xdot"
    cp "$T/err" "$c.xdot.stderr"
    rm -f "$c.native-crash"
    [ "$n" -eq 1 ] || echo "$c: exit 0 on try $n"
  elif [ -s "$c.xdot" ]; then
    echo "$c: no surviving run in $TRIES, kept the committed output"
  else
    : > "$c.xdot"
    cp "$T/best" "$c.xdot.stderr"
    echo "exit $rc on all $TRIES runs" > "$c.native-crash"
    echo "$c: no surviving run in $TRIES"
  fi
done
