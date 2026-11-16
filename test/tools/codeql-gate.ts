// SPDX-License-Identifier: EPL-2.0
// Fails when the SARIF files hold a finding that .github/codeql/dismissed.json
// does not cover. Run by test/tools/codeql-gate.sh after the analyses.
//
// Usage: npx tsx test/tools/codeql-gate.ts <dismissals.json> <a.sarif> [<b.sarif> ...]
// Exit 0: no finding left. Exit 1: findings left (printed one per line).
import fs from 'node:fs';
import { checkSarif, formatFinding, parseDismissals, type Sarif } from './lib/codeql-gate-core.js';

const [dismissalsPath, ...sarifPaths] = process.argv.slice(2);
if (dismissalsPath === undefined || sarifPaths.length === 0) {
  console.error('usage: codeql-gate.ts <dismissals.json> <a.sarif> [<b.sarif> ...]');
  process.exit(2);
}

const dismissals = parseDismissals(fs.readFileSync(dismissalsPath, 'utf8'));
const sarifs = sarifPaths.map((p) => JSON.parse(fs.readFileSync(p, 'utf8')) as Sarif);
const { findings, dismissed } = checkSarif(dismissals, sarifs);

for (const f of findings) console.log(formatFinding(f));
console.log(`codeql gate: ${findings.length} finding(s), ${dismissed} dismissed, ${sarifPaths.length} SARIF file(s)`);
process.exit(findings.length === 0 ? 0 : 1);
