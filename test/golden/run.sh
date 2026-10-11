#!/usr/bin/env bash
# test/golden/run.sh — golden-file comparison of the TS port against the
# native reference SVGs listed in test/golden/manifest.json.
#
# The comparison logic (tolerance classes, per-entry tolerance overrides,
# port-pins, knownResidual skips) lives in test/golden/suite.test.ts; this
# wrapper runs it through vitest so the gate and the test suite cannot drift.
# There is no CLI build, so the former `node dist/cli.js` loop could not run.
set -euo pipefail

MANIFEST="${1:-test/golden/manifest.json}"
if [ "$MANIFEST" != "test/golden/manifest.json" ]; then
  echo "ERROR: suite.test.ts reads test/golden/manifest.json only" >&2
  exit 2
fi

npx vitest run test/golden/suite.test.ts
