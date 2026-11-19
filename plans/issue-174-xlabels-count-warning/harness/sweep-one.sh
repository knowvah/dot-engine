#!/bin/bash
f=$1; D=~/git/graphviz-16.1.1/build/cmd/dot/dot
for K in dot neato; do G=/tmp/ghl1611-all; [ $K = dot ] && G=/tmp/ghl1611
e=$(GVBINDIR=$G timeout 20 $D -K$K -Tdot "$f" 2>&1 >/dev/null | grep "labels positioned"); [ -n "$e" ] && echo "$f $K: $e"; done
exit 0
