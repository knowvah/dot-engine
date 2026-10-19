<!-- SPDX-License-Identifier: EPL-2.0 -->

# Technology Health

Versions come from `package.json` and the installed toolchain (`npx tsc -v`,
`node -v`, `node_modules/*/package.json`). Node.js EOL dates come from the
endoflife.date API (`/api/nodejs.json`). CVE status comes from
`npm audit --omit=dev` run on the repo. Date of check: 2026-10-16.

| Repo | Component | Version | EOL Date | CVEs (High+) | Action |
|------|-----------|---------|----------|--------------|--------|
| dot-engine | Node.js (Volta pin) | 26.3.1 (running `node -v`: v26.3.1; `engines` >= 22) | 2029-04-30 | None found | OK |
| dot-engine | TypeScript | ^6.0.0 (6.0.3 installed) | n/a (tooling) | None found | OK |
| dot-engine | `@typescript/native-preview` (tsgo) | ^7.0.0-dev.20260622.1 | n/a (preview) | None found | Preview only; backs `typecheck:ts7` |
| dot-engine | esbuild | ^0.28.1 (0.28.1) | n/a | None found | OK |
| dot-engine | vitest | ^4.1.11 (4.1.11) | n/a | None found | OK |
| dot-engine | peggy | ^5.0.0 (5.1.0) | n/a | None found | OK |
| dot-engine | vitepress / typedoc | ^1.6.0 (1.6.4) / ^0.28.20 (0.28.20) | n/a | None found | OK (docs only) |
| graphviz (C) | Graphviz | 16.1.0 | n/a (upstream spec) | n/a | OK (oracle, not shipped) |

## Notes

- **Runtime dependencies: none.** `npm audit --omit=dev` reports 0
  vulnerabilities (info, low, moderate, high, critical all 0). The only
  production-side entry is the optional peer `canvas` (`>=2 <4`), which `src/`
  never imports. Dev-dependency CVEs are not covered by this check.
- **Node.js 26.3.1** is in the 26 release line (released 2026-05-05). The
  endoflife.date API lists Active LTS from 2026-10-28 and EOL 2029-04-30.
  The library itself requires only Node >= 22; Volta pins 26.3.1 for
  development. For comparison the same source lists Node 24 EOL as
  2028-04-30. Node 22's EOL date was not retrieved for this check.
- **TypeScript 6.0.3** is installed and matches the `^6.0.0` range. The
  `typecheck:ts7` script runs `tsgo` from `@typescript/native-preview`, a
  pre-release package; it is a check, not part of the build. endoflife.date
  has no TypeScript page, so no EOL date is stated.
- **esbuild / vitest / peggy** are at their declared ranges. The Peggy grammar
  is compiled by `npm run parser:regen` before build, test and typecheck.
- **graphviz (C)** is the conformance oracle (ADR-0001), not a shipped
  dependency, so its version does not affect the published library's runtime
  or security posture. The 15.x build is kept for bisection only.
- **`overrides` pin**: `package.json` overrides `@knowvah/dot-engine` to the
  published 1.7.0 tarball for dev tooling that depends on it; this is not a
  dependency of the library.

## Action summary

- `OK`: Node 26.3.1, TypeScript 6.0.3, esbuild, vitest, peggy, vitepress,
  typedoc.
- `Preview`: `@typescript/native-preview` (tsgo), used only for
  `typecheck:ts7`.
- No `EOL — upgrade required` or `CVE — patch required` items found.
