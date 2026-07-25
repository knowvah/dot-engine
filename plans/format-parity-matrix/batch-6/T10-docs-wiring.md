<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — Docs wiring

## Context
The new `PARITY-*.md` pages must publish to the VitePress site. Mirror them via
`copy-reports.mjs` and add nav entries, following the existing PARITY page
pattern exactly.

## Task
1. In `docs-site/copy-reports.mjs`: add a `REPORTS` entry for each new
   `PARITY-*.md` (src `../test/corpus/PARITY-*.md`, dst site path), copying the
   `./PARITY*.md → site route` rewrite rules from the existing entries.
2. In `docs-site/.vitepress/config.ts`: add nav links under the Reference group
   (beside the existing parity dashboards) for the new tracks.
3. Add the generated mirror filenames to `.gitignore` (the site copies are
   gitignored, like `parity.md`/`perf.md`).

## Write-set
- `docs-site/copy-reports.mjs` (modify)
- `docs-site/.vitepress/config.ts` (modify)
- `.gitignore` (add generated mirrors)

## Read-set
- `docs-site/copy-reports.mjs` (REPORTS array + rewrite rules pattern).
- `docs-site/.vitepress/config.ts` (Reference nav group).

## Acceptance criteria
- Given `npm run docs:build`, then it exits 0 (no dead links) with the new pages.
- Given the built site, then each new track has a nav entry that resolves.
- Given `.gitignore`, then the generated site mirrors are ignored (only
  `test/corpus/PARITY-*.md` sources are tracked).

## Observability / rollback
N/A. Reversible.

## Quality bar
`npm run docs:build` exit 0; new nav links present; `git status` shows no
untracked generated mirror.
