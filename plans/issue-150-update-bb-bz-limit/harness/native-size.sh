#!/bin/bash
# SPDX-License-Identifier: EPL-2.0
# id path -> id W H (native 16.1.1 -Tplain graph line, inches)
id=$1; p=$2
out=$(cd ~/git/graphviz-16.1.1/tests && GVBINDIR=/tmp/ghl1611-all timeout 20 ~/git/graphviz-16.1.1/build/cmd/dot/dot -Tplain "$p" 2>/dev/null | head -1)
echo "$id $out"
# Usage: cut -f1,2 <tsv> | xargs -P 4 -n 2 bash native-size.sh
