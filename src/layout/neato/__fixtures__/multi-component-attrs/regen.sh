#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Regenerates these part-9 fixtures: graphviz 16.1.0 (oracle/16.1.0), -Kneato -Txdot,
# one <case>.xdot and <case>.xdot.stderr per <case>.gv. Inputs come from
# plans/post-16-1-followups-9/harness/T0/gen-fixtures.py.
#
# Usage: GVBINDIR=<full plugin dir> bash regen.sh
set -u
DOT=${DOT:-$HOME/git/graphviz/build/cmd/dot/dot}
cd "$(dirname "$0")"
for f in *.gv; do
  c=${f%.gv}
  "$DOT" -Kneato -Txdot "$f" > "$c.xdot" 2> "$c.xdot.stderr"
  rc=$?
  [ "$rc" -eq 0 ] || echo "$c: exit $rc"
done
