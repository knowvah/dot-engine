// SPDX-License-Identifier: EPL-2.0

/**
 * Every expected permutation comes from `native-sort`, which runs the real libc++ `std::sort`
 * on a shared_ptr-holding struct (plans/post-16-1-followups-9/harness/T7/native-sort.cpp), the
 * same instantiation shape as `Event` in lib/vpsc/generate-constraints.cpp.
 */

import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { libcxxSort } from "./libcxx-sort.js";

interface Item {
  readonly key: number;
  readonly id: number;
}

interface NativeCase {
  readonly name: string;
  readonly keys: readonly number[];
  readonly ids: readonly number[];
  readonly compares: number;
}

const DUMP = new URL("../../plans/post-16-1-followups-9/harness/T7/dumps/sort.txt", import.meta.url);

const numbers = (s: string): number[] => s.trim().split(" ").filter(Boolean).map(Number);

function parseLine(line: string): NativeCase {
  const [head, ids, compares] = line.split("|") as [string, string, string];
  const [name, ...keys] = head.trim().split(" ") as [string, ...string[]];
  return { name, keys: keys.map(Number), ids: numbers(ids), compares: Number(compares) };
}

const CASES: readonly NativeCase[] = fs
  .readFileSync(DUMP, "utf8")
  .split("\n")
  .filter(Boolean)
  .map(parseLine);

const KEY_LT = (x: Item, y: Item): boolean => x.key < y.key;

function sortedIds(keys: readonly number[]): number[] {
  const a = keys.map((key, id) => ({ key, id }));
  libcxxSort(a, KEY_LT);
  return a.map((i) => i.id);
}

/** The result in the dump's shape: the comparator count shows the path, ties or no ties. */
function run(c: NativeCase): NativeCase {
  const a = c.keys.map((key, id) => ({ key, id }));
  let compares = 0;
  libcxxSort(a, (x, y) => {
    compares++;
    return KEY_LT(x, y);
  });
  return { name: c.name, keys: c.keys, ids: a.map((i) => i.id), compares };
}

function isStable(keys: readonly number[], ids: readonly number[]): boolean {
  return ids.every((id, i) => {
    const prev = ids[i - 1];
    if (prev === undefined || keys[prev] !== keys[id]) return true;
    return prev < id;
  });
}

const casesNamed = (prefix: string): readonly NativeCase[] =>
  CASES.filter((c) => c.name.startsWith(prefix));

describe("libcxxSort", () => {
  it("leaves empty and single-element arrays alone", () => {
    expect(sortedIds([])).toEqual([]);
    expect(sortedIds([4])).toEqual([0]);
  });

  it("orders distinct keys ascending", () => {
    expect(sortedIds([3, 1, 2])).toEqual([1, 2, 0]);
  });

  it("uses only the boolean comparator it was given, in reverse too", () => {
    const a = [1, 3, 2].map((key, id) => ({ key, id }));
    libcxxSort(a, (x, y) => x.key > y.key);
    expect(a.map((i) => i.key)).toEqual([3, 2, 1]);
  });

  it("reads the whole native dump", () => {
    expect(CASES).toHaveLength(37 * 8 + 6 * 8 + 2 + 4 * 5);
    expect(casesNamed("killer1000t3b125")[0]?.keys).toHaveLength(1000);
  });

  it("matches native's order and comparator count on every length from 0 to 36", () => {
    for (const c of casesNamed("p").filter((x) => x.keys.length <= 36)) {
      expect(run(c)).toEqual(c);
    }
  });

  it("matches native's order and comparator count on the larger patterns, ninther included", () => {
    for (const c of casesNamed("p").filter((x) => x.keys.length > 36)) {
      expect(run(c)).toEqual(c);
    }
  });

  it("matches native's order and comparator count where the adversary spends the depth limit", () => {
    for (const c of casesNamed("killer")) {
      expect(run(c)).toEqual(c);
    }
  });

  it("is really unstable above the insertion-sort limit, as native is", () => {
    const large = casesNamed("p5").filter((c) => c.keys.length >= 24);
    expect(large.length).toBeGreaterThan(0);
    expect(large.filter((c) => isStable(c.keys, c.ids))).toEqual([]);
    expect(large.filter((c) => isStable(c.keys, sortedIds(c.keys)))).toEqual([]);
  });
});
