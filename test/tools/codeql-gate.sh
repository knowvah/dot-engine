#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Local CodeQL gate, run before opening a PR: `npm run codeql:gate`.
#
# Mirrors the two CodeQL checks GitHub runs on a PR, on the committed HEAD (a
# `git archive` export, so untracked build output such as dist/ is not
# scanned): code scanning (four languages, each language's code-scanning
# suite) and Code Quality (javascript and python, each one's code-quality
# suite, reported on PRs as github-code-quality[bot] comments). Fails on any
# finding .github/codeql/dismissed.json does not cover.
#
# Needs the CodeQL CLI on PATH. Missing query packs are downloaded on first use.
# Databases and SARIF go to $CODEQL_GATE_DIR (default $TMPDIR/dot-engine-codeql).
# CodeQL's own CODEQL_THREADS / CODEQL_RAM limit its CPU and memory.
set -euo pipefail

readonly LANGUAGES=(javascript python actions cpp)
# GitHub's Code Quality check covers only these.
readonly QUALITY_LANGUAGES=(javascript python)
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

fail() {
  echo "codeql gate: $1 failed; see $2" >&2
  tail -n 5 "$2" >&2
  exit 2
}

# analyze <lang> <suite> <sarif> <log>
analyze() {
  codeql database analyze "$WORK_DIR/db-$1" \
    "codeql/$1-queries:codeql-suites/$1-$2.qls" \
    --download --format=sarif-latest --output="$3" >>"$4" 2>&1 || fail "$1 $2" "$4"
}

sarifs=()
for lang in "${LANGUAGES[@]}"; do
  log="$WORK_DIR/$lang.log"
  echo "codeql gate: $lang"
  codeql database create "$WORK_DIR/db-$lang" --language="$lang" --build-mode=none \
    --source-root="$WORK_DIR/src" --overwrite >"$log" 2>&1 || fail "$lang database" "$log"
  analyze "$lang" code-scanning "$WORK_DIR/$lang.sarif" "$log"
  sarifs+=("$WORK_DIR/$lang.sarif")
  if [[ " ${QUALITY_LANGUAGES[*]} " == *" $lang "* ]]; then
    echo "codeql gate: $lang code quality"
    analyze "$lang" code-quality "$WORK_DIR/$lang.quality.sarif" "$log"
    sarifs+=("$WORK_DIR/$lang.quality.sarif")
  fi
done

cd "$REPO_DIR"
npx tsx test/tools/codeql-gate.ts "$DISMISSALS" "${sarifs[@]}"
