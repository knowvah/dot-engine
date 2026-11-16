#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Compare a port bundle with native 16.1.1 on the #155 probes, xdot and stderr.
# Native runs from an empty directory, so neither side finds 2821.png (the
# corpus survey's setting). Usage: compare-native.sh <bundle.mjs>
set -u
BUNDLE=$1
H=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$H/../../.." && pwd)
DOT=$HOME/git/graphviz-16.1.1/build/cmd/dot/dot
EMPTY=$(mktemp -d)
eq=0; ne=0
for f in "$H"/probes/*.gv; do
  b=$(basename "${f%.gv}")
  nat=$(cd "$EMPTY" && GVBINDIR=/tmp/ghl1611 "$DOT" -Txdot "$f" 2>"$EMPTY/$b.err")
  natErr=$(cat "$EMPTY/$b.err")
  job=$(cd "$REPO" && node test/tools/bd-job.ts "$BUNDLE" "$f" dot xdot)
  out=${job%%$'\n--stderr--\n'*}
  err=${job#*$'\n--stderr--\n'}
  while [[ "$out" == *$'\n' ]]; do out=${out%$'\n'}; done  # $() strips native's
  if [[ "$out" == "$nat" && "$err" == "$natErr" ]]; then echo "EQUAL $b"; eq=$((eq+1))
  else
    ne=$((ne+1)); echo "DIFF  $b (xdot $([[ "$out" == "$nat" ]] && echo equal || echo differs), stderr $([[ "$err" == "$natErr" ]] && echo equal || echo differs))"
    diff <(echo "$natErr") <(echo "$err") | sed 's/^/      /'
  fi
done
echo "equal=$eq differ=$ne"
