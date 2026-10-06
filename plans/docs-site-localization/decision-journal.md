<!-- SPDX-License-Identifier: EPL-2.0 -->
# Decision journal

Appended during execution. One row per non-trivial judgment call, quarantine,
or measurement (per `~/.claude/docs/reference/autonomous-execution.md`).

| When | Task | Decision / observation | Why | Evidence |
|---|---|---|---|---|
| 2026-10-06 | pre-flight | Baseline: `docs:build` 9.9 s wall (17.4 s user); English search index `@localSearchIndexroot.*.js` 617,108 bytes; `npm test` 382 files / 7226 tests green; typecheck clean | Stop condition 6 thresholds: build > ~30 s, any locale index > ~1.85 MB | Measured on `main` @ 9e24b042, node 26.3.1 |
| 2026-10-06 | process | Committed the brief as its own commit (`docs(plans)`); journal/checkbox edits under `plans/docs-site-localization/` ride along in task commits and are treated as outside the write-set gate | `plans/` is tracked here (not gitignored as the protocol assumes); bookkeeping is not task output | b6116364 |
| 2026-10-06 | process | No `Claude-Session:` trailer on commits, although translation-spec's Commit section asks for "the session attribution line" | `~/.claude/rules/commits.md` forbids attribution in commit bodies; the user's global rule wins over the brief's template line | — |
| 2026-10-06 | T1 | Executed by the orchestrator directly, not a typescript-pro subagent | Single sequential task that every later task builds on; dispatch would only re-pay the reading | — |
| 2026-10-06 | T1 | `navFor`, `sidebarFor`, `EN`, `assertLocaleComplete` live in `i18n.ts`, not `config.ts`; `config.ts` only calls them | The test must import them, and importing `config.ts` pulls vitepress's `.d.ts` into `tsc` (repo has `skipLibCheck: false`) → 8 lib errors (`Token` circular alias, `@vueuse` Bluetooth types). `i18n.ts` has no vitepress import; items are structural `NavLink`/`SidebarGroup` | tsc run before the move |
| 2026-10-06 | T1 | Client components cannot call `stringsForLang` (the registry reads `node:fs`). `strings.ts` adds a pure `pickStrings(lang, byLang)`; `config.ts` publishes `themeConfig.componentsByLang` (lang → strings); components call `pickStrings(useData().lang.value, useData().theme.value.componentsByLang)`. `stringsForLang` (build-side, contract) is `pickStrings` over the registry | Decision #3 ("resolve via `useData().lang`") holds; keeps `fs` out of the client bundle. ~11 strings × 23 locales of site data | — |
| 2026-10-06 | T1 | Completeness walk skips every one of the 23 known prefixes (`ALL_LOCALE_PREFIXES`), registered or not | An unregistered (in-progress or quarantined) locale's pages would otherwise count as English pages for every other locale | fixture test "ignores … other locales" |
| 2026-10-06 | T1 | Only nav **Parity** (`/engines`) is English-only in the nav; **Conformance** (`/conformance`) is translated (part c) and prefixed. Sidebar English-only: TypeDoc, Parity dashboard, Engine parity, Performance | `conformance.md` is a translated page per the spec's page split | test asserts the unprefixed set |
| 2026-10-06 | T1 | Gates: typecheck clean; `npm test` 383 files / 7236 green; `docs:build` 10.5 s wall (baseline 9.9 s); emitted `.html` set identical to `main` (139 files) | — | — |
| 2026-10-06 | T2 | Executed by the orchestrator (small: 6 template literals + test) while T3 ran in a typescript-pro/Sonnet subagent | Avoids a second dispatch for a ~20-line change; write-sets disjoint | — |
| 2026-10-06 | T2 | `PNG export failed: …` / `Could not rasterize the SVG` / `Canvas 2D context unavailable` stay English | Rare error-path text not in T1's `ComponentStrings` contract; `strings.ts` is outside T2's write-set. Follow-up candidate, not a stop | — |
| 2026-10-06 | T2 | Test asserts the template binds `t.*` and contains no English control literal (source-level), plus `pickStrings` resolution, instead of mounting the SFC | No `@vue/test-utils` in the repo; adding a dependency is out of scope | `test/docs/playground-strings.test.ts` |
