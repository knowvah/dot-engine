#!/bin/bash
f=$1; K=$2; D=~/git/graphviz-16.1.1/build/cmd/dot/dot
G=/tmp/ghl1611-all; [ $K = dot ] && G=/tmp/ghl1611
n=$(GVBINDIR=$G timeout 30 $D -K$K -Tdot "$f" 2>&1 >/dev/null | grep -c "Two clusters named")
[ "$n" != 0 ] && echo "$f $K $n"; exit 0
