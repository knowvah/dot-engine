# T6 — English docs: A10 is registry-backed

## Context

`docs/known-divergences.md` is the public explanation of every accepted
divergence (rendered on the docs site and translated into 23 locales). Two
passages are now wrong after T2–T5:
- Intro, `docs/known-divergences.md:36-42`: "A10 is a port-error acceptance that
  no registry can express", and only `accepted-divergences.test.ts` is named as
  the anti-rot guard.
- A10, `:1109-1132`: "Affected … in every output format" (json on
  neato/fdp/sfdp/twopi and all plain walks are oracle errors — the oracle hits
  its cap; json circo and the five map walks are port-errors) and "no registry
  entry exists: the walks keep listing `2784` under their port-error faults".

## Task

Edit only those two passages:
1. Intro: A10 joins the live list as a registry-backed port-error acceptance;
   name `registry-staleness.test.ts` beside `accepted-divergences.test.ts` as the
   guard that fails when an accepted entry stops matching its walk row.
2. A10 **Affected**: state precisely — port-error on the xdot engine walks and
   the map walks for circo/twopi/neato/fdp/sfdp and the json walk for circo;
   the native oracle itself exceeds the walk cap on json (neato/fdp/sfdp/twopi)
   and plain, so those rows are oracle errors; `dot`, `osage`, `patchwork` pass.
3. A10 **Why accepted**: replace the "no registry" sentences with the registry
   locations (`accepted-divergences-engines.json`, `-json.json`, `-map.json`,
   `verdict: "port-error"`, `errIncludes: "Map maximum size exceeded"`) and that
   a different failure on 2784 would surface as an unaccepted fault and a stale
   entry. Keep the evidence link.
4. **Do not change the `### A10.` heading text** (its slug is the registry
   `ref` and the locale anchor) or any other section.

Hand-back must list the changed paragraphs (old → new, by first words) for T7.

## Write-set

- `docs/known-divergences.md`

## Read-set

- `docs/known-divergences.md:30-60`, `:1105-1135`
- T5's committed registry entries (`git show HEAD --stat`, the three JSON diffs)
- `plans/docs-site-localization/translation-spec.md:58-92` (hard rules: what
  must stay stable for translators)

## Acceptance criteria

- Given the new A10 section, then it cites the three registries and drops
  "no registry can express" / "no registry entry exists".
- Given the Affected line, then it no longer claims "every output format" and
  matches the committed walk rows (engines ×5, map ×5, json circo port-error;
  json ×4 + plain oracle-error; dot/osage/patchwork pass).
- Given the intro, then it names `registry-staleness.test.ts`.
- `npx vitest run test/corpus test/docs` passes (incl.
  `known-divergences-examples.test.ts`, `parity-report.test.ts`).

## Quality bar

Same register and line width as the surrounding prose; no new headings; no
other edits. Locales intentionally drift until T7 (i18n status is not a T6 gate).

## Observability

N/A.

## Rollback

Reversible — revert the commit.

## Commit

`docs(divergences): point a10 at its registry entries`
