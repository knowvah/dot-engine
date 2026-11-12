#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Write cluster prefixes of 2475_1 (maintainer's recipe, issue #145).
# Usage: prefix.sh <outdir> [N...]   (default N: 100 200 400 800 1600)
set -euo pipefail
out=${1:?outdir}; shift || true
src=${GV_TESTS:-$HOME/git/graphviz/tests}/2475_1.dot
mkdir -p "$out"
for n in "${@:-100 200 400 800 1600}"; do
  for k in $n; do
    awk -v N="$k" 'NR<=2{print;next} /^subgraph/{c++} c>N{exit} {print} END{print "}"}' \
      "$src" > "$out/c$k.dot"
    printf 'c%s: %s lines, %s node stmts, %s edges\n' "$k" \
      "$(wc -l < "$out/c$k.dot" | tr -d ' ')" \
      "$(grep -c '\[' "$out/c$k.dot" || true)" \
      "$(grep -c -- '->' "$out/c$k.dot" || true)"
  done
done
