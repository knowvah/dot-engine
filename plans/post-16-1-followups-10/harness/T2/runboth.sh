#!/bin/bash
# SPDX-License-Identifier: EPL-2.0
# usage: runboth.sh <input> <name> [deep]
SC=${T2_SC:?set T2_SC to the scratch dir that build.sh filled}
D=~/git/graphviz/build/cmd/dot/dot
f=$1; n=$2; shift 2
[ "$1" = deep ] && export GVTS_T2_DEEP=1
B=${T2_ORACLE_GVBINDIR:?set T2_ORACLE_GVBINDIR to the oracle plugin dir}
GVBINDIR=$B $D -Ksfdp -Txdot "$f" > $SC/o-$n.xdot 2>/dev/null
GVTS_T2=1 GVBINDIR=$SC/ghl $D -Ksfdp -Txdot "$f" > $SC/t-$n.xdot 2>$SC/t-$n.err
cmp $SC/o-$n.xdot $SC/t-$n.xdot && echo "instrumented==oracle ($n)"
(cd $SC/port && export T2_ADDON=$SC/addon/libmpow.node; GVTS_T2=1 npx tsx run.ts "$f" $SC/p-$n.xdot 2>$SC/p-$n.err)
cmp -s $SC/o-$n.xdot $SC/p-$n.xdot && echo XDOT-SAME || echo XDOT-DIFF
python3 "$(dirname "$0")/first-diff.py" $SC/t-$n.err $SC/p-$n.err
