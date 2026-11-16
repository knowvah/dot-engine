#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Local CodeQL gate, run before opening a PR: `npm run codeql:gate`.
#
# Mirrors the repository's GitHub default code-scanning setup: the same four
# languages and each language's code-scanning query suite, on the committed
# HEAD (a `git archive` export, so untracked build output such as dist/ is not
# scanned). Fails on any finding .github/codeql/dismissed.json does not cover.
#
# Needs the CodeQL CLI on PATH. Missing query packs are downloaded on first use.
# Databases and SARIF go to $CODEQL_GATE_DIR (default $TMPDIR/dot-engine-codeql).
# CodeQL's own CODEQL_THREADS / CODEQL_RAM limit its CPU and memory.
set -euo pipefail

readonly LANGUAGES=(javascript python actions cpp)
REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
readonly REPO_DIR
readonly DISMISSALS="$REPO_DIR/.github/codeql/dismissed.json"
tmp="${TMPDIR:-/tmp}"
readonly WORK_DIR="${CODEQL_GATE_DIR:-${tmp%/}/dot-engine-codeql}"

if ! command -v codeql >/dev/null; then
  echo "codeql gate: the CodeQL CLI is not on PATH (brew install --cask codeql)" >&2
  exit 2
fi

head="$(git -C "$REPO_DIR" rev-parse --short HEAD)"
if [[ -n "$(git -C "$REPO_DIR" status --porcelain --untracked-files=no)" ]]; then
  echo "codeql gate: note: uncommitted changes are not scanned; scanning HEAD $head"
fi

# Only ever delete the gate's own export, never a directory the variable could
# point at by mistake ($CODEQL_GATE_DIR=$HOME, say).
rm -rf "$WORK_DIR/src"
mkdir -p "$WORK_DIR/src"
git -C "$REPO_DIR" archive HEAD | tar -x -C "$WORK_DIR/src"
echo "codeql gate: CodeQL $(codeql version --format=terse), HEAD $head, work dir $WORK_DIR"

sarifs=()
for lang in "${LANGUAGES[@]}"; do
  db="$WORK_DIR/db-$lang"
  sarif="$WORK_DIR/$lang.sarif"
  log="$WORK_DIR/$lang.log"
  echo "codeql gate: $lang"
  if ! codeql database create "$db" --language="$lang" --build-mode=none \
      --source-root="$WORK_DIR/src" --overwrite >"$log" 2>&1 ||
    ! codeql database analyze "$db" \
      "codeql/$lang-queries:codeql-suites/$lang-code-scanning.qls" \
      --download --format=sarif-latest --output="$sarif" >>"$log" 2>&1; then
    echo "codeql gate: $lang analysis failed; see $log" >&2
    tail -n 5 "$log" >&2
    exit 2
  fi
  sarifs+=("$sarif")
done

cd "$REPO_DIR"
npx tsx test/tools/codeql-gate.ts "$DISMISSALS" "${sarifs[@]}"
