#!/usr/bin/env bash
# test/golden/gates.sh — Final quality gates for dot-engine
# Run from the repository root: bash test/golden/gates.sh
set -euo pipefail

GATE_PASS=0
GATE_FAIL=0

gate_pass() {
  echo "PASS [$1]"
  GATE_PASS=$((GATE_PASS + 1))
}

gate_fail() {
  echo "FAIL [$1]: $2"
  GATE_FAIL=$((GATE_FAIL + 1))
  exit 1
}

# The parser is generated from src/parser/dot.pegjs and untracked; npx tsc /
# npx vitest bypass the npm pre-hooks that regenerate it, so do it here.
npm run --silent parser:regen

# --- Gate 1: TypeScript type check ---
echo ""
echo "=== Gate 1: TypeScript type check ==="
npx tsc --noEmit && gate_pass "Gate 1" || gate_fail "Gate 1" "tsc --noEmit failed"

# --- Gate 2: Vitest test suite ---
echo ""
echo "=== Gate 2: Vitest test suite ==="
npx vitest run && gate_pass "Gate 2" || gate_fail "Gate 2" "vitest run failed"

# --- Gate 3: Golden-file tests ---
echo ""
echo "=== Gate 3: Golden-file tests ==="
bash test/golden/run.sh test/golden/manifest.json \
  && gate_pass "Gate 3" \
  || gate_fail "Gate 3" "golden-file comparison failed"

# --- Gate 4: No source file over 600 lines (ratchet) ---
# Test files are exempt. Pre-existing oversize files are pinned in
# test/golden/line-limit-baseline.txt and may not grow.
echo ""
echo "=== Gate 4: File length (max 600 lines, ratchet) ==="
baseline=test/golden/line-limit-baseline.txt
violations=$(find src -name '*.ts' ! -name '*.test.ts' -print0 \
  | xargs -0 wc -l \
  | awk -v base="$baseline" '
      BEGIN { while ((getline l < base) > 0) if (l !~ /^#/ && l != "") { split(l, f, " "); cap[f[1]] = f[2] } }
      $2 == "total" { next }
      $2 in cap { if ($1 > cap[$2]) print $2 ": " $1 " lines (baseline " cap[$2] ")"; next }
      $1 > 600 { print $2 ": " $1 " lines" }')
if [ -n "$violations" ]; then
  echo "Files over the line limit:"
  echo "$violations"
  gate_fail "Gate 4" "files exceed line limit"
fi
gate_pass "Gate 4"

# --- Gate 5: Bundle size < 500 KB gzipped ---
echo ""
echo "=== Gate 5: Bundle size ==="
npx esbuild src/index.ts \
  --bundle --minify --platform=node \
  --outfile=dist/bundle.js --format=cjs \
  --log-level=warning

bundle_gz=$(gzip -c dist/bundle.js | wc -c)
limit=$((500 * 1024))
echo "Bundle size (gzipped): ${bundle_gz} bytes (limit: ${limit} bytes)"
[ "$bundle_gz" -lt "$limit" ] \
  && gate_pass "Gate 5" \
  || gate_fail "Gate 5" "bundle ${bundle_gz} bytes >= limit ${limit} bytes"

# --- Summary ---
echo ""
echo "================================"
echo "Quality gates: ${GATE_PASS} passed, ${GATE_FAIL} failed"
echo "================================"
