#!/bin/bash
# SPDX-License-Identifier: EPL-2.0
# Usage: FUZZ_REPO=<repo> bash run.sh <outdir>   -> structured (fuzz) + attribute (fuzzattr) fuzz, 3 seeds x 300
D=$(cd "$(dirname "$0")" && pwd); OUT=${1:?outdir}; mkdir -p "$OUT"
cd "${FUZZ_REPO:-$D/../../..}"
for s in 11 12 13; do npx tsx "$D/fuzzattr.ts" $s 300 "$OUT/attr-$s.jsonl" 2>>"$OUT/summary.txt"; done
for s in 1 2 3; do npx tsx "$D/fuzz.ts" $s 300 "$OUT/struct-$s.jsonl" 2>>"$OUT/summary.txt"; done
cat "$OUT/summary.txt"
