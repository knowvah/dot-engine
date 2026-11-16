## Observation: lint-title rejects `build:` PR titles
- **Context**: DE1 wanted a `build(parser):` squash title (non-releasing).
- **Finding**: the required `lint-title` check (amannn/action-semantic-pull-request) allows only feat/fix/chore/refactor/test/docs/style/perf/ci. `build` fails it.
- **Impact**: for a non-releasing build change use `chore:` or `refactor:`.
- **Confidence**: High

## Observation: CodeQL types bigint-literal consts as undefined
- **Context**: DE2, js/implicit-operand-conversion on arm-pow.ts / random.ts.
- **Finding**: `const X = 0x...n` is inferred as `undefined` at use sites; consts built from bigint expressions (`(1n << 64n) - 1n`) are not flagged. `BigInt('0x...')` is value-identical and clears it.
- **Impact**: new bigint constants should use `BigInt('...')` to avoid false findings.
- **Confidence**: Medium (the fix is verified only after the next Code Quality run on main)

## Observation: 2475_1 port OOMs; oracle sometimes completes
- **Context**: DE2 fresh rules survey.
- **Finding**: the port's `dot` render of tests/2475_1.dot dies with a V8 heap OOM (exit 134, ~18 min) on main. The committed parity-rules.json has it as oracle-error, but the native oracle completed this run, so the survey reports `errored`. share/examples/world.gv flipped oracle-error→conformant for the same reason.
- **Impact**: a fresh survey can show verdict deltas on these two ids that are oracle-side. rules-gate classifies them as pre-existing/improved.
- **Confidence**: High

## Observation: reused worker threads leak module state between renders
- **Context**: before/after corpus hashing with a worker_threads pool (one render per job, workers reused).
- **Finding**: 2242/twopi hashed differently depending on which job ran earlier in the same worker. A fresh-process render is deterministic.
- **Impact**: byte-identity sweeps must use one process per render, or re-verify mismatches in fresh processes.
- **Confidence**: High

## Observation: Homebrew's CodeQL cask has no query packs
- **Context**: building the local CodeQL gate (`npm run codeql:gate`), 2026-11-16.
- **Finding**: `/opt/homebrew` CodeQL 2.27.4 is the CLI only; `codeql/<lang>-queries` packs come from GHCR into `~/.codeql/packages` (cpp-queries was missing). `codeql database analyze --download` fetches them on first use. The javascript extractor also reports the 5 workflow files, but the separate `actions` language is what GitHub runs for them.
- **Impact**: a fresh machine needs network on its first gate run. GitHub's dismissed alerts #4/#12 no longer reproduce, so the tracked dismissals file starts empty.
- **Confidence**: High
