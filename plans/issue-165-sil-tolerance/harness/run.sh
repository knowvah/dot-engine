#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Issue 165 harness. Builds route-cases.c and sil-cases.c against the 16.1.0
# and 16.1.1 builds (oracle flags: -O3 -std=gnu17, clang fp-contract=on), runs
# the port's routeSpline and splineIntersectsLine on the same cases from the
# CURRENT tree, and compares. Usage: bash run.sh <outdir>
set -euo pipefail
H=$(cd "$(dirname "$0")" && pwd)
OUT=${1:?outdir}
mkdir -p "$OUT"
for v in 1611:graphviz-16.1.1 1610:graphviz; do
  tag=${v%%:*}; dir=$HOME/git/${v#*:}
  util=$dir/build/lib/util/libutil.a; [ -f "$util" ] || util=
  cc -O3 -DNDEBUG -std=gnu17 -w -o "$OUT/route-$tag" "$H/route-cases.c" \
    -I"$dir/lib" -I"$dir/build/lib/pathplan" -L"$dir/build/lib/pathplan" \
    -lpathplan -Wl,-rpath,"$dir/build/lib/pathplan"
  cc -O3 -DNDEBUG -std=gnu17 -w -o "$OUT/sil-$tag" "$H/sil-cases.c" \
    -DROUTE_C="\"$dir/lib/pathplan/route.c\"" -I"$dir/build" -I"$dir/lib" \
    -I"$dir/lib/pathplan" -L"$dir/build/lib/pathplan" -lpathplan $util \
    -Wl,-rpath,"$dir/build/lib/pathplan"
  "$OUT/route-$tag" > "$OUT/route-$tag.out"
  "$OUT/sil-$tag" > "$OUT/sil-$tag.out"
done
REPO=$(cd "$H/../../.." && pwd)
sed -e 's/^class RouteHelper/export class RouteHelper/' \
    -e "s#from '\./#from '../../../src/pathplan/#" \
    -e "s#from '\.\./common/#from '../../../src/common/#" \
    "$REPO/src/pathplan/route.ts" > "$H/.route-x.ts"
(cd "$REPO" && npx tsx "$H/port-cases.ts") > "$OUT/port-route.out"
(cd "$REPO" && npx tsx "$H/port-sil.ts" "$H/.route-x.ts") > "$OUT/port-sil.out"
rm -f "$H/.route-x.ts"
echo "route: port vs 16.1.1"; diff "$OUT/route-1611.out" "$OUT/port-route.out" && echo EQUAL
echo "route: port vs 16.1.0"; diff -q "$OUT/route-1610.out" "$OUT/port-route.out" && echo EQUAL || true
echo "sil (counts exact, roots to 1e-15):"
python3 "$H/sil-compare.py" "$OUT/sil-1611.out" "$OUT/port-sil.out"
