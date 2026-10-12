// SPDX-License-Identifier: EPL-2.0

/**
 * Known-failing ratchet for the graphviz 16.1 re-pin.
 *
 * `test/golden/known-failing.json` lists tests that are expected to fail until
 * the port catches up with re-captured 16.1 references. A listed test is
 * registered with `test.fails`: it passes while the comparison fails, and goes
 * red the moment the comparison passes, forcing the id out of the list. An
 * unlisted failure stays a normal red.
 */

import { test } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface KnownFailing {
  goldens: string[];
  ptIssue: string[];
}

export type KnownFailingList = keyof KnownFailing;

export const KNOWN_FAILING_SUFFIX = '[known-failing 16.1]';

const LIST_KEYS: readonly string[] = ['goldens', 'ptIssue'];
const KNOWN_FAILING_PATH = join(process.cwd(), 'test/golden/known-failing.json');

function validateList(key: string, value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`known-failing: "${key}" must be an array of strings`);
  }
  const seen = new Set<string>();
  let prev: string | undefined;
  value.forEach((entry: unknown, i) => {
    if (typeof entry !== 'string') {
      throw new Error(`known-failing: "${key}"[${i}] must be a string`);
    }
    if (seen.has(entry)) {
      throw new Error(`known-failing: "${key}" has duplicate id "${entry}"`);
    }
    if (prev !== undefined && prev > entry) {
      throw new Error(
        `known-failing: "${key}" is not sorted: "${entry}" must precede "${prev}"`,
      );
    }
    seen.add(entry);
    prev = entry;
  });
  return value as string[];
}

/** Pure shape check for the parsed known-failing.json. */
export function validateKnownFailing(raw: unknown): KnownFailing {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('known-failing: root must be an object');
  }
  const obj = raw as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!LIST_KEYS.includes(key)) {
      throw new Error(`known-failing: unknown key "${key}"`);
    }
  }
  return {
    goldens: validateList('goldens', obj['goldens']),
    ptIssue: validateList('ptIssue', obj['ptIssue']),
  };
}

export function loadKnownFailing(): KnownFailing {
  return validateKnownFailing(JSON.parse(readFileSync(KNOWN_FAILING_PATH, 'utf8')));
}

export function isListed(
  known: KnownFailing,
  list: KnownFailingList,
  id: string,
): boolean {
  return known[list].includes(id);
}

/** Pure registration choice: `fails` when listed, `plain` otherwise. */
export function selectTestFn<F>(listed: boolean, plain: F, fails: F): F {
  return listed ? fails : plain;
}

export function knownFailingName(name: string, listed: boolean): string {
  return listed ? `${name} ${KNOWN_FAILING_SUFFIX}` : name;
}

function register(
  list: KnownFailingList,
  id: string,
  name: string,
  fn: () => void,
): void {
  const listed = isListed(loadKnownFailing(), list, id);
  const run = selectTestFn(listed, test, test.fails);
  run(knownFailingName(name, listed), fn);
}

export function goldenTest(id: string, name: string, fn: () => void): void {
  register('goldens', id, name, fn);
}

export function ptIssueTest(id: string, name: string, fn: () => void): void {
  register('ptIssue', id, name, fn);
}
