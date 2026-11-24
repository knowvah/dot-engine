# Decisions: issue #200

No discrepancy against the oracle is involved (translation wording), so no
diagnosis artifact applies.

## AD-1: the fi word is `tunnistekohtai-`

- **Context:** fi says `syykohtai…` ("per-cause") where English says "per-id".
  The page translates "id" as `tunniste`; #143 wrote `tunnistekohtaisesti`
  at `docs-site/fi/divergences.md:103`.
- **Decision:** replace the stem `syykohtai` with `tunnistekohtai` in each of
  the six lines, keeping the case ending each already has:
  `-sella` (100), `-sista` (239, 269), `-sia` (247), `-sessa` (270),
  `-nen` (1134). No other word on those lines changes.
- **Consequences:** consistent with the page's own term and #143.
- **Rejected:** `id-kohtainen` (a loanword the page does not use elsewhere);
  rewording the sentences (out of the issue's scope).

## AD-2: no hash or English change

- **Context:** the issue says no figure, code span or `sourceHash` is
  affected. At the base, every locale's `divergences.md` is already stale
  (`npm run docs:i18n-status`, 23 × `stale pages: 1`): the English moved in
  `70bd5faf` after #143's hash.
- **Decision:** leave `sourceHash` and `docs/known-divergences.md` untouched.
  Re-hashing fi and sv here would mark them current without translating the
  English change, hiding real staleness.
- **Consequences:** fi and sv stay stale exactly as at the base. The
  staleness is tracked by a `follow-up` issue (README push-forward).
- **Rejected:** re-hash fi/sv (hides staleness); re-translate the stale
  paragraph (out of scope, and a 23-locale job).

## AD-3: gates

- **Decision:** queue gates 1-4 as written; gate 5 not applicable (no `src/`
  change); gate 6 is `npm run docs:i18n-status` compared with the base.
- **Consequences:** the brief has no harness directory.

## Rollback

Reversible: revert the commit. No data, API or schema change.

## Auto-confirmed (unattended)

| Phase | Decision | Rejected | Evidence |
|---|---|---|---|
| Selection | #200 | — | lowest `queue:ready`, no "Blocked by", no open `queue:planned` |
| 2 | two files, seven lines | English edit | issue body; `grep -n syykohtai`, `grep -rn godkändande` at base |
| 3 | AD-1 | `id-kohtainen`, rewording | fi `:103`, page's `tunniste` |
| 3 | AD-2 | re-hash, re-translate | `docs:i18n-status` at base: 23 × stale 1 |
| 3 | AD-3 | bytediff, corpus survey | no `src/` change |
| 4 | N/A observability; Reversible | — | docs only |
| 5 | one task | split per locale | seven lines, one commit |
