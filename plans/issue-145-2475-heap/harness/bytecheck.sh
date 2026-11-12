#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Render cluster prefixes with two trees and require byte-identical SVGs
# (issue #145, AD-4). Usage: bytecheck.sh <baseTree> <headTree> <prefixDir> [cN...]
set -euo pipefail
base=${1:?base tree}; head=${2:?head tree}; dir=${3:?prefix dir}; shift 3
rc=0
for c in "${@:-c100 c200 c400 c800}"; do
  for k in $c; do
    (cd "$base" && node --import tsx test/corpus/render-one.ts "$dir/$k.dot" dot) > "$dir/$k.base.svg" 2> /dev/null
    (cd "$head" && node --import tsx test/corpus/render-one.ts "$dir/$k.dot" dot) > "$dir/$k.head.svg" 2> /dev/null
    if cmp -s "$dir/$k.base.svg" "$dir/$k.head.svg"; then
      printf '%s: identical (%s bytes)\n' "$k" "$(wc -c < "$dir/$k.head.svg" | tr -d ' ')"
    else
      printf '%s: DIFFERENT\n' "$k"; rc=1
    fi
  done
done
exit $rc
