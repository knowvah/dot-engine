#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Port (working tree) vs captured native, per probe x format. Prints one TSV
# row per job (probe, format, SAME|DIFF, diff count: lines for dot/xdot/plain,
# compareJson diffs for json) and a summary line.
# Usage: bash run-probes.sh <label>   writes results/<label>/ and prints the TSV
set -uo pipefail
H="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$H/../../.." && pwd)"
label="${1:?label}"
out="$H/results/$label"; mkdir -p "$out"
same=0; diff=0
for f in "$H"/probes/*.gv; do
  b=$(basename "$f" .gv)
  for fmt in dot xdot json plain; do
    (cd "$ROOT" && npx tsx "$H/port-render.ts" "$f" "$fmt") > "$out/$b.$fmt" 2> "$out/$b.$fmt.stderr"
    if [ "$fmt" = json ]; then
      n=$(cd "$ROOT" && npx tsx "$H/json-diff.ts" "$out/$b.$fmt" "$H/native/$b.$fmt" 2> "$out/$b.json.diffs")
    else
      n=$(diff "$H/native/$b.$fmt" "$out/$b.$fmt" | grep -c '^[<>]')
    fi
    if [ "$n" -eq 0 ]; then same=$((same+1)); v=SAME; else diff=$((diff+1)); v=DIFF; fi
    printf '%s\t%s\t%s\t%s\n' "$b" "$fmt" "$v" "$n"
  done
done
find "$out" -type f -empty -delete
echo "# same $same, diff $diff"
