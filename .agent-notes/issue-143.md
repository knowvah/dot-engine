# issue-143 mission — observations (2026-11-10)

## Observation: a fresh `sourceHash` does not mean the translation is complete
- **Context**: #143 reworded one clause of `docs/known-divergences.md` and its 23 locale copies. The
  brief's precondition was "every locale is fresh at the base, so the new hash covers only this
  change".
- **Finding**: `351eb90e` (part 11 T11) added "and inputs whose native output varies from run to
  run" to the English A1 iterative paragraph and set all 23 hashes to the new value, but none of
  the 23 locale diffs carried the clause. `npm run docs:i18n-status` and `test/docs` compare the
  hash and the code fences only, so both were green. The other edits of that commit did reach every
  locale.
- **Impact**: before refreshing a locale hash, read the English diff of the commit that last set
  it against that commit's locale diff (`git show <sha> -- docs/known-divergences.md` and
  `-- docs-site/de/divergences.md`), at least for the paragraph being edited. Markers that survive
  translation (code spans, ids, figures) make a quick 23-locale check; allow for `%98,0` (tr) and
  full-width punctuation (ja, ko, zh-cn, zh-tw).
- **Confidence**: High

## Observation: one grep word misses a reworded copy of the same claim
- **Context**: the brief's setup step was `grep -n "triaged" docs/known-divergences.md`, expecting
  the false clause at `:190` and a correct use at `:119`.
- **Finding**: the A1 scope note at `:91` said "with no per-id triage yet": the same claim, which
  "triaged" does not match. `grep -i triag` finds all three.
- **Impact**: when a follow-up quotes a phrase, search for the stem and for the claim's other
  wordings before fixing the scope to line numbers.
- **Confidence**: High

## Observation: where each locale keeps the words a divergences edit needs
- **Context**: translating "each of their diverged ids is attributed" and "per-id attribution"
  into 23 locales without drifting from the reviewed text.
- **Finding**: every locale's `divergences.md` has three sentences that fix the terms: "every
  current diverged id is `drift-exonerated`" (the word for a diverged id; next to
  `attribute-divergence.ts`), "every diverged row … is individually attributed" (the verb), and
  the conformance note at the top (the word for tolerance). fi is the exception for "per-id": it
  says `syykohtainen` ("per-cause") while using `tunniste` for id (#200).
- **Impact**: pull the terms from those three sentences with a script before writing a clause;
  it takes one pass for all 23.
- **Confidence**: High
