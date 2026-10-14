# T7a / T7b / T7c — re-translate the T6 paragraphs

One spec for all three groups; the orchestrator names the group's locales in
the prompt (see `overview.md`).

## Context

Each `docs-site/<locale>/divergences.md` is a full translation of
`docs/known-divergences.md`, stamped in front matter with
`sourceHash: <sha256 of the English source>` so drift is detectable. T6 changed
two passages of the English source (the intro around
`docs/known-divergences.md:36-42` and the A10 section around `:1109-1132`);
T6's hand-back (in `../decision-journal.md`) lists them old → new.

## Task

For each locale in your group:
1. Locate the translated counterparts of T6's changed paragraphs (A10 is the
   section whose heading carries
   `{#a10-v8-map-size-limit-in-polyomino-packing-2784-five-pack-based-engines}`;
   the intro sentence names A2/A3/A8/A10).
2. Re-translate **only** those paragraphs from the new English text, following
   `plans/docs-site-localization/translation-spec.md` (hard rules, glossary,
   tone for that locale). Everything else stays byte-identical.
3. Keep code spans (`` `2784` ``, registry file names, `verdict`,
   `errIncludes`, `"Map maximum size exceeded"`), links, and `{#…}` anchors
   byte-identical (STOP 8 if impossible).
4. Set `sourceHash` to the output of
   `node scripts/i18n-hash.mjs docs/known-divergences.md`.

## Write-set

`docs-site/<locale>/divergences.md` for your group's locales only.

## Read-set

- `plans/docs-site-localization/translation-spec.md` (whole, 123 lines)
- `git diff HEAD~1 -- docs/known-divergences.md` (T6's change) or T6's journal row
- In each locale file: its intro block (~lines 40-55) and its A10 section only

## Acceptance criteria

- Given each locale file, then only the two re-translated passages and the
  `sourceHash` line differ from `HEAD` (`git diff --stat` ≈ a few lines each).
- Given `sourceHash`, then it equals `node scripts/i18n-hash.mjs docs/known-divergences.md`.
- Given anchors, links and code spans in the changed passages, then they are
  byte-identical to the English source.
- `npx vitest run test/docs` passes.

## Quality bar

Natural, idiomatic prose per the spec's tone section; terminology from the
glossary; no machine-literal calques of "registry"/"port-error" where the spec
fixes a term.

## Observability

N/A.

## Rollback

Reversible — revert the batch commit.
