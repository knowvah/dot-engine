#!/bin/bash
# SPDX-License-Identifier: EPL-2.0
# Replays native's bits at the first differing pow only, one call at a time; prints where the first difference moves to.
# usage: onecall.sh <input> <name> <steps> [mode]
SC=${T2_SC:?set T2_SC to the scratch dir that build.sh filled}
f=$1; n=$2; steps=$3; mode=${4:-arm}
D=~/git/graphviz/build/cmd/dot/dot
GVTS_T2=1 GVTS_T2_DEEP=1 GVBINDIR=$SC/ghl $D -Ksfdp -Txdot "$f" > /dev/null 2>$SC/t-$n.err
: > $SC/ov-$n.txt
for s in $(seq 0 $steps); do
  (cd $SC/port && T2_POW=$mode T2_OVERRIDES=$SC/ov-$n.txt GVTS_T2=1 GVTS_T2_DEEP=1 npx tsx run.ts "$f" $SC/p-$n.xdot 2>$SC/p-$n.err)
  r=$(python3 "$(dirname "$0")/first-diff.py" $SC/t-$n.err $SC/p-$n.err)
  echo "--- overrides=$s"; echo "$r" | head -3
  echo "$r" | grep -q "^  native pow" || break
  echo "$r" | sed -n 2p | awk '{print $3,$4,$5}' >> $SC/ov-$n.txt
done
