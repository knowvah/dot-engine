#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Compare a port bundle with native 16.1.1 -Kneato on the #156 probes (every
# probe takes mode=hier, the one path that reaches IMDS_given_dim and the
# subspace conjugate gradient). Formats: plain and xdot, bytes and stderr.
# Usage: compare-native.sh <bundle.mjs> [format ...]   (default: plain xdot)
set -u
BUNDLE=$1; shift
FORMATS=${*:-plain xdot}
H=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$H/../../.." && pwd)
DOT=$HOME/git/graphviz-16.1.1/build/cmd/dot/dot
GVB=/tmp/ghl1611-all
TMP=$(mktemp -d)
eq=0; ne=0
for f in "$H"/probes/*.gv; do
  b=$(basename "${f%.gv}")
  for fmt in $FORMATS; do
    nat=$(GVBINDIR=$GVB "$DOT" -Kneato -T"$fmt" "$f" 2>"$TMP/$b.err")
    natErr=$(cat "$TMP/$b.err")
    # The sentinel keeps $() from stripping the newline after --stderr--.
    job=$(cd "$REPO" && node test/tools/bd-job.ts "$BUNDLE" "$f" neato "$fmt"; echo x)
    job=${job%x}
    out=${job%%$'\n--stderr--\n'*}
    err=${job#*$'\n--stderr--\n'}
    while [[ "$out" == *$'\n' ]]; do out=${out%$'\n'}; done
    if [[ "$out" == "$nat" && "$err" == "$natErr" ]]; then
      echo "EQUAL $b $fmt"; eq=$((eq+1))
    else
      ne=$((ne+1))
      n=$(diff <(echo "$nat") <(echo "$out") | grep -c '^>')
      echo "DIFF  $b $fmt ($n lines; stderr $([[ "$err" == "$natErr" ]] && echo equal || echo differs))"
    fi
  done
done
echo "equal=$eq differ=$ne"
