#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Issue #142: run-trace.sh over a list of "<id> <path>" lines; one summary line per id.
# Usage (repo root, port-trace.patch applied): bash trace-survey.sh <scratch-dir> <list> <outdir>
set -u
here=$(cd "$(dirname "$0")" && pwd)
scr=$1; list=$2; out=$3; mkdir -p "$out"
while read -r id file; do
  [ -z "$id" ] && continue
  if [ "$(stat -f %z "$file")" -gt 100000 ]; then echo "$id skipped (input over 100 kB)"; continue; fi
  o=$out/$id
  bash "$here/run-trace.sh" "$scr" "$o" "$file" > "$o.txt" 2>&1
  awk -v id="$id" '
    /^== raw/ {sec="raw"} /^== port with/ {sec="cf"}
    /^xdot lines differing/ {x[sec]=$4}
    /^lines native/ {split($2,a,"="); n[sec]=a[2]; split($4,b,"="); d[sec]=b[2]}
    /^  (native|port): / && !(sec in f) && $1=="native:" {f[sec]=$2" "$3}
    /^libm calls/ {lib=$0}
    END {printf "%s | raw: xdot-diff=%s trace-diff=%s/%s first=[%s] | injected: %s xdot-diff=%s trace-diff=%s/%s first=[%s]\n",
      id, x["raw"], d["raw"], n["raw"], f["raw"], lib, x["cf"], d["cf"], n["cf"], f["cf"]}' "$o.txt"
done < "$list"
