#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Runs every subg-* case of harness/T0 (subg-after-free.c) N times (default 8) in three arms and
# prints, per case and per render, the number of distinct outputs and each class's run count:
#   stock   GVBINDIR=<stock-plugin-dir>                       (the oracle as is)
#   ctrl    GVBINDIR=<scratch>/gv, GVTS_NOADDR unset         (patched build, address order)
#   noaddr  GVBINDIR=<scratch>/gv, GVTS_NOADDR=1             (patched build, ND_id order)
# <scratch> is build.sh's scratch dir. Each run's output and rc go to <scratch>/runs/<arm>/<i>/.
# Usage: bash variance.sh <scratch> <stock-plugin-dir> [N]
set -u
G=${G:-$HOME/git/graphviz}
B=$G/build
here=$(cd "$(dirname "$0")" && pwd)
scr=$1; stock=$2; n=${3:-8}
T0=$here/../T0
bin=$scr/subg-after-free
[ -x "$bin" ] || clang -O1 -w -o "$bin" "$here/../../../post-16-1-followups-10/harness/T15/subg-after-free.c" \
  -I"$G/lib/gvc" -I"$G/lib/cgraph" -I"$G/lib/common" -I"$G/lib/pathplan" -I"$G/lib/cdt" -I"$G/lib" -I"$B" \
  -I"$B/lib/common" -I"$B/lib/gvc" -L"$B/lib/gvc" -L"$B/lib/cgraph" -L"$B/lib/cdt" -lgvc -lcgraph -lcdt \
  -Wl,-rpath,"$B/lib/gvc" -Wl,-rpath,"$B/lib/cgraph" -Wl,-rpath,"$B/lib/cdt" -Wl,-rpath,"$B/lib/pathplan" \
  -Wl,-rpath,"$B/lib/xdot"
cases=()
for e in fdp osage; do for s in s cluster_k; do for m in root nofree; do for f in xdot svg; do
  cases+=("$e $s $m $f"); done; done; done; done
for arm in stock ctrl noaddr; do
  for i in $(seq 1 "$n"); do
    d=$scr/runs/$arm/$i; mkdir -p "$d"
    for c in "${cases[@]}"; do
      set -- $c; k=subg-$1.$2.$3.$4
      if [ $arm = stock ]; then
        GVBINDIR=$stock "$bin" "$T0/subg.gv" $1 $4 $2 $3 > "$d/$k" 2> "$d/$k.stderr"
      elif [ $arm = ctrl ]; then
        env -u GVTS_NOADDR GVBINDIR=$scr/gv "$bin" "$T0/subg.gv" $1 $4 $2 $3 > "$d/$k" 2> "$d/$k.stderr"
      else
        GVTS_NOADDR=1 GVBINDIR=$scr/gv "$bin" "$T0/subg.gv" $1 $4 $2 $3 > "$d/$k" 2> "$d/$k.stderr"
      fi
      echo "rc=$?" >> "$d/$k.stderr"
      # split into one file per render
      rm -f "$d/$k".r*
      awk -v p="$d/$k" '/^== render [0-9]+$/{f=p".r"$3; printf "" > f; next} f{print >> f}' "$d/$k"
    done
  done
done
cd "$scr/runs/stock/1" || exit 1
for c in "${cases[@]}"; do
  set -- $c; k=subg-$1.$2.$3.$4
  for part in "" .stderr .r1 .r2 .r3; do
    line="$k$part"
    for arm in stock ctrl noaddr; do
      cls=$(for i in $(seq 1 "$n"); do f=$scr/runs/$arm/$i/$k$part
        if [ -f "$f" ]; then shasum "$f" | cut -c1-8; else echo missing; fi; done | sort | uniq -c |
        awk '{printf "%s%s:%s", (NR>1?",":""), $2, $1}')
      line="$line  $arm[$cls]"
    done
    echo "$line"
  done
done
