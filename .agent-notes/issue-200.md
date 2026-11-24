# issue #200: fi's word for per-id, an sv typo

## Observation: a case-sensitive grep misses a translated word at the start of a sentence
- **Context**: the brief fixed its scope from `grep -n syykohtai` and `grep -rn godkändande`, which gave seven lines.
- **Finding**: `grep -rni` over the worktree gave two more: `docs-site/fi/divergences.md:279` (`Syykohtainen näyttö`, English "Per-id evidence") and `docs-site/sv/conformance.md:106` (`**Godkändandegraden**`, English "Pass %"). Both begin a sentence, so the stem is capitalised.
- **Impact**: scope a wording fix in translated pages with `grep -i`, over all of `docs-site`, before fixing line numbers in a brief.
- **Confidence**: High

## Observation: editing a translated page does not move `docs:i18n-status`
- **Context**: gate 6, `npm run -s docs:i18n-status` before and after the edit.
- **Finding**: the report compares each page's `sourceHash` with the hash of its English source and nothing else, so the output was byte-identical after nine prose lines changed. It cannot tell a corrected translation from an untouched one.
- **Impact**: the status report is a check that hashes were left alone, not a check of the translation; the prose itself is only read by `test/docs`.
- **Confidence**: High
