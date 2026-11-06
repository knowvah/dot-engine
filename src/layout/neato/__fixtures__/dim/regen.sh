#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Regenerates these part-10 fixtures: graphviz 16.1.0 (oracle/16.1.0). One <case>.xdot,
# <case>.dot and <case>.stderr per <case>.gv. Engine neato. The .stderr is the -Txdot run's;
# regen reports a case whose -Tdot stderr differs. Inputs come from
# plans/post-16-1-followups-10/harness/T0/gen-fixtures.py.
#
# Usage: GVBINDIR=<full plugin dir> bash regen.sh
set -u
DOT=${DOT:-$HOME/git/graphviz/build/cmd/dot/dot}
cd "$(dirname "$0")"
for f in *.gv; do
  c=${f%.gv}
  e=neato
  "$DOT" -K"$e" -Txdot "$f" > "$c.xdot" 2> "$c.stderr"
  rc=$?
  [ "$rc" -eq 0 ] || echo "$c: xdot exit $rc"
  err=$(mktemp)
  "$DOT" -K"$e" -Tdot "$f" > "$c.dot" 2> "$err"
  rc=$?
  [ "$rc" -eq 0 ] || echo "$c: dot exit $rc"
  cmp -s "$c.stderr" "$err" || echo "$c: dot stderr differs"
  rm -f "$err"
done
