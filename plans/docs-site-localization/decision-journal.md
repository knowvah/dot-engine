<!-- SPDX-License-Identifier: EPL-2.0 -->
# Decision journal

Appended during execution. One row per non-trivial judgment call, quarantine,
or measurement (per `~/.claude/docs/reference/autonomous-execution.md`).

| When | Task | Decision / observation | Why | Evidence |
|---|---|---|---|---|
| 2026-10-06 | pre-flight | Baseline: `docs:build` 9.9 s wall (17.4 s user); English search index `@localSearchIndexroot.*.js` 617,108 bytes; `npm test` 382 files / 7226 tests green; typecheck clean | Stop condition 6 thresholds: build > ~30 s, any locale index > ~1.85 MB | Measured on `main` @ 9e24b042, node 26.3.1 |
