// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import {
  checkSarif,
  findingsOf,
  formatFinding,
  parseDismissals,
} from './lib/codeql-gate-core.js';

const RULE = 'js/incomplete-sanitization';
const PATH = 'src/render/dot.ts';
const MESSAGE = 'This does not escape backslash characters in the input.';

/** One SARIF result as `codeql database analyze --format=sarif-latest` writes it. */
function result(ruleId: string, uri: string, line: number, text: string) {
  return {
    ruleId,
    message: { text },
    locations: [
      { physicalLocation: { artifactLocation: { uri }, region: { startLine: line } } },
    ],
  };
}

function sarif(...runs: ReturnType<typeof result>[][]) {
  return { version: '2.1.0', runs: runs.map((results) => ({ results })) };
}

function dismissal(over: Record<string, string> = {}) {
  return { rule: RULE, path: PATH, message: MESSAGE, reason: 'false positive', ...over };
}

describe('findingsOf', () => {
  it('lists every result of every run', () => {
    const doc = sarif(
      [result(RULE, PATH, 337, MESSAGE)],
      [result('py/unused-import', 'plans/a/gen.py', 3, 'Import of os is not used.')],
    );
    expect(findingsOf(doc)).toEqual([
      { rule: RULE, path: PATH, line: 337, message: MESSAGE },
      { rule: 'py/unused-import', path: 'plans/a/gen.py', line: 3, message: 'Import of os is not used.' },
    ]);
  });

  it('gives an empty list for a run without results', () => {
    expect(findingsOf({ version: '2.1.0', runs: [{ results: [] }, {}] })).toEqual([]);
  });
});

describe('parseDismissals', () => {
  it('accepts an empty list', () => {
    expect(parseDismissals('[]')).toEqual([]);
  });

  it('keeps each entry with its alert link', () => {
    const entry = dismissal({ alert: 'https://github.com/knowvah/dot-engine/security/code-scanning/4' });
    expect(parseDismissals(JSON.stringify([entry]))).toEqual([entry]);
  });

  it('rejects a document that is not a list', () => {
    expect(() => parseDismissals('{}')).toThrow('dismissals must be a JSON array');
  });

  it('rejects an entry missing a required field, naming the entry', () => {
    const { reason: _omitted, ...noReason } = dismissal();
    expect(() => parseDismissals(JSON.stringify([dismissal(), noReason]))).toThrow(
      'dismissal 1: "reason" must be a non-empty string',
    );
  });

  it('rejects an entry that is not an object', () => {
    expect(() => parseDismissals('[["js/x"]]')).toThrow('dismissal 0: must be an object');
  });

  it('rejects an empty alert link', () => {
    expect(() => parseDismissals(JSON.stringify([dismissal({ alert: '' })]))).toThrow(
      'dismissal 0: "alert" must be a non-empty string',
    );
  });

  it('rejects an unexpected field', () => {
    expect(() => parseDismissals(JSON.stringify([dismissal({ line: '3' })]))).toThrow(
      'dismissal 0: unexpected field "line"',
    );
  });
});

describe('checkSarif', () => {
  it('keeps a finding no dismissal matches', () => {
    const doc = sarif([result(RULE, PATH, 337, MESSAGE)]);
    expect(checkSarif([], [doc])).toEqual({
      findings: [{ rule: RULE, path: PATH, line: 337, message: MESSAGE }],
      dismissed: 0,
    });
  });

  it('drops a finding matched on rule, path and message, whatever its line', () => {
    const doc = sarif([result(RULE, PATH, 412, MESSAGE)]);
    expect(checkSarif([dismissal()], [doc])).toEqual({ findings: [], dismissed: 1 });
  });

  it('keeps a finding that differs from the dismissal in message only', () => {
    const doc = sarif([result(RULE, PATH, 337, 'This does not escape quotes.')]);
    expect(checkSarif([dismissal()], [doc]).findings).toHaveLength(1);
  });

  it('keeps a finding that differs from the dismissal in path only', () => {
    const doc = sarif([result(RULE, 'src/render/xdot.ts', 337, MESSAGE)]);
    expect(checkSarif([dismissal()], [doc]).findings).toHaveLength(1);
  });

  it('pools the findings of several SARIF files', () => {
    const js = sarif([result(RULE, PATH, 1, MESSAGE)]);
    const py = sarif([result('py/unused-import', 'plans/a/gen.py', 3, 'x')]);
    expect(checkSarif([dismissal()], [js, py])).toEqual({
      findings: [{ rule: 'py/unused-import', path: 'plans/a/gen.py', line: 3, message: 'x' }],
      dismissed: 1,
    });
  });
});

describe('formatFinding', () => {
  it('prints rule, location and message on one line', () => {
    expect(formatFinding({ rule: RULE, path: PATH, line: 337, message: MESSAGE })).toBe(
      `${RULE} ${PATH}:337 ${MESSAGE}`,
    );
  });
});
