// SPDX-License-Identifier: EPL-2.0

/**
 * Index-sorting helpers of neatogen/kkutils.c: `quicksort_place` and
 * `quicksort_placef`. Both go through `gv_sort`, i.e. libc `qsort`, which is
 * not stable: tied keys keep the permutation the BSD/Apple qsort gives, so the
 * sort runs through `gvQsort` (the reproduction of that algorithm).
 *
 * @see lib/neatogen/kkutils.c
 * @see lib/util/sort.h:gv_sort
 */

import { gvQsort } from '../../util/bsd-qsort.js';

/** Three-way compare of two keys; 0 on tie or NaN, as C's `<`/`>` chain. */
function compareKeys(a: number, b: number): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Sort `ordering[first..first+count)` with `qsort` by `place[ordering[i]]`.
 * `gv_sort` skips the call when `nmemb <= 1`; `gvQsort` does the same.
 * @see lib/util/sort.h:gv_sort
 */
function gvSortByPlace(
  place: Float64Array | Float32Array,
  ordering: Int32Array,
  first: number,
  count: number,
): void {
  const slice = Array.from(ordering.subarray(first, first + count));
  gvQsort(slice, (x, y) => compareKeys(place[x]!, place[y]!));
  for (let i = 0; i < count; i++) ordering[first + i] = slice[i]!;
}

/**
 * Sort `ordering[0..size)` by ascending `place[ordering[i]]`.
 * @see lib/neatogen/kkutils.c:quicksort_place
 */
export function quicksortPlace(place: Float64Array, ordering: Int32Array, size: number): void {
  gvSortByPlace(place, ordering, 0, size);
}

/**
 * Sort `ordering[first..last]` (inclusive) by ascending `place[ordering[i]]`
 * (float keys); a no-op unless `first < last`.
 * @see lib/neatogen/kkutils.c:quicksort_placef
 */
export function quicksortPlacef(
  place: Float32Array,
  ordering: Int32Array,
  first: number,
  last: number,
): void {
  if (first < last) {
    gvSortByPlace(place, ordering, first, last - first + 1);
  }
}
