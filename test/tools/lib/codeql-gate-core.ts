// SPDX-License-Identifier: EPL-2.0
// Pure parts of the local CodeQL gate (test/tools/codeql-gate.sh): read the
// findings out of SARIF files and drop the ones a tracked dismissal covers.

/** One CodeQL result, reduced to what a dismissal matches on and a reader needs. */
export interface Finding {
  readonly rule: string;
  readonly path: string;
  readonly line: number;
  readonly message: string;
}

/**
 * A finding the maintainer dismissed (`.github/codeql/dismissed.json`). It
 * matches on rule, path and message, not on line, so it survives edits above
 * the flagged line but not a second, different finding in the same file.
 */
export interface Dismissal {
  readonly rule: string;
  readonly path: string;
  readonly message: string;
  readonly reason: string;
  readonly alert?: string;
}

export interface GateResult {
  /** Findings no dismissal covers: the gate fails when this is non-empty. */
  readonly findings: readonly Finding[];
  readonly dismissed: number;
}

/** The subset of SARIF 2.1.0 that `codeql database analyze` writes and the gate reads. */
interface SarifResult {
  readonly ruleId: string;
  readonly message: { readonly text: string };
  readonly locations: readonly {
    readonly physicalLocation: {
      readonly artifactLocation: { readonly uri: string };
      readonly region: { readonly startLine: number };
    };
  }[];
}

export interface Sarif {
  readonly version?: string;
  readonly runs: readonly { readonly results?: readonly SarifResult[] }[];
}

const REQUIRED_FIELDS = ['rule', 'path', 'message', 'reason'] as const;
const OPTIONAL_FIELDS = ['alert'] as const;
const KNOWN_FIELDS: ReadonlySet<string> = new Set([...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]);

export function findingsOf(sarif: Sarif): Finding[] {
  return sarif.runs.flatMap((run) =>
    (run.results ?? []).map((r) => {
      const where = r.locations[0].physicalLocation;
      return {
        rule: r.ruleId,
        path: where.artifactLocation.uri,
        line: where.region.startLine,
        message: r.message.text,
      };
    }),
  );
}

/** Parse and validate the tracked dismissals file; throws naming the bad entry. */
export function parseDismissals(text: string): Dismissal[] {
  const doc: unknown = JSON.parse(text);
  if (!Array.isArray(doc)) throw new Error('dismissals must be a JSON array');
  return doc.map((entry: unknown, i) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new Error(`dismissal ${i}: must be an object`);
    }
    const fields = entry as Record<string, unknown>;
    for (const key of Object.keys(fields)) {
      if (!KNOWN_FIELDS.has(key)) throw new Error(`dismissal ${i}: unexpected field "${key}"`);
    }
    for (const key of [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]) {
      const value = fields[key];
      const optionalAbsent = value === undefined && (OPTIONAL_FIELDS as readonly string[]).includes(key);
      if (!optionalAbsent && (typeof value !== 'string' || value === '')) {
        throw new Error(`dismissal ${i}: "${key}" must be a non-empty string`);
      }
    }
    return fields as unknown as Dismissal;
  });
}

function covers(d: Dismissal, f: Finding): boolean {
  return d.rule === f.rule && d.path === f.path && d.message === f.message;
}

export function checkSarif(dismissals: readonly Dismissal[], sarifs: readonly Sarif[]): GateResult {
  const all = sarifs.flatMap(findingsOf);
  const findings = all.filter((f) => !dismissals.some((d) => covers(d, f)));
  return { findings, dismissed: all.length - findings.length };
}

export function formatFinding(f: Finding): string {
  return `${f.rule} ${f.path}:${f.line} ${f.message}`;
}
