// SPDX-License-Identifier: EPL-2.0

/**
 * In-place sort matching libc++ `std::sort`'s permutation, including its treatment of
 * comparator-equal elements. Ported from LLVM libc++ (`_LIBCPP_VERSION` 220106), which is
 * permissively licensed and EPL-2.0-compatible:
 *
 *   Part of the LLVM Project, under the Apache License v2.0 with LLVM Exceptions.
 *   See https://llvm.org/LICENSE.txt for license information.
 *   SPDX-License-Identifier: Apache-2.0 WITH LLVM-exception
 *
 * Source: `__algorithm/sort.h`, `sift_down.h`, `make_heap.h`, `partial_sort.h`, `sort_heap.h`,
 * `pop_heap.h`, `push_heap.h`.
 *
 * Why: lib/vpsc/generate-constraints.cpp sorts sweep events with `std::sort`. Its comparator
 * reports a tie for different rectangles at one position, and libc++ reorders ties repeatably,
 * so JS's stable sort gives another event order from 24 rectangles up (48 events, the first
 * length above `__limit`). See plans/post-16-1-followups-9/harness/T7.
 *
 * This is the one instantiation the oracle's libvpsc.a holds, whose mangled names read
 * `__introsort<_ClassicAlgPolicy, bool (*&)(const Event&, const Event&), Event*, false>` and
 * `__sift_down<_ClassicAlgPolicy, false, ...>`: a type that is not arithmetic and so not
 * branchless. What that instantiation cannot reach is not ported: the branchless `__sort3-5`,
 * `__bitset_partition`, `__sift_down`'s `__assume_both_children`, and `__partial_sort_impl`'s
 * loop over `[middle, last)`, because the fallback passes `middle == last`.
 *
 * Moved-from slots keep their old value here. No path reads one before it is written, as in C++.
 */

/** Upper bound for using insertion sort. @see __algorithm/sort.h:__introsort __limit */
const LIMIT = 24;
/** Lower bound for Tukey's ninther. @see __algorithm/sort.h:__introsort __ninther_threshold */
const NINTHER_THRESHOLD = 128;
/** Insertions before giving up. @see __algorithm/sort.h:__insertion_sort_incomplete __limit */
const INCOMPLETE_LIMIT = 8;

/** @see __bit/bit_log2.h:__bit_log2 */
function bitLog2(n: number): number {
  return 31 - Math.clz32(n);
}

/**
 * The template's fixed arguments, the array and the comparator, as fields. Indices stand for the
 * C++ iterators.
 */
class Introsort<T> {
  private readonly a: T[];
  private readonly lt: (x: T, y: T) => boolean;

  constructor(a: T[], lt: (x: T, y: T) => boolean) {
    this.a = a;
    this.lt = lt;
  }

  /** @see __algorithm/iter_swap.h:iter_swap */
  private swap(i: number, j: number): void {
    const a = this.a;
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }

  /** @see __algorithm/sort.h:__sort3 */
  private sort3(x: number, y: number, z: number): void {
    const { a, lt } = this;
    if (!lt(a[y]!, a[x]!)) {
      if (!lt(a[z]!, a[y]!)) return;
      this.swap(y, z);
      if (lt(a[y]!, a[x]!)) this.swap(x, y);
      return;
    }
    if (lt(a[z]!, a[y]!)) {
      this.swap(x, z);
      return;
    }
    this.swap(x, y);
    if (lt(a[z]!, a[y]!)) this.swap(y, z);
  }

  /** @see __algorithm/sort.h:__sort4 */
  private sort4(x1: number, x2: number, x3: number, x4: number): void {
    const { a, lt } = this;
    this.sort3(x1, x2, x3);
    if (lt(a[x4]!, a[x3]!)) {
      this.swap(x3, x4);
      if (lt(a[x3]!, a[x2]!)) {
        this.swap(x2, x3);
        if (lt(a[x2]!, a[x1]!)) this.swap(x1, x2);
      }
    }
  }

  /** @see __algorithm/sort.h:__sort5 */
  private sort5(x1: number, x2: number, x3: number, x4: number, x5: number): void {
    const { a, lt } = this;
    this.sort4(x1, x2, x3, x4);
    if (lt(a[x5]!, a[x4]!)) {
      this.swap(x4, x5);
      if (lt(a[x4]!, a[x3]!)) {
        this.swap(x3, x4);
        if (lt(a[x3]!, a[x2]!)) {
          this.swap(x2, x3);
          if (lt(a[x2]!, a[x1]!)) this.swap(x1, x2);
        }
      }
    }
  }

  /**
   * The `switch (__last - __first)` that `__introsort` and `__insertion_sort_incomplete` share
   * word for word, as one function because of the project's complexity limit.
   * @returns true when the length was one of the cases, so the range is sorted
   * @see __algorithm/sort.h:__introsort
   */
  private sortSmall(first: number, last: number): boolean {
    const { a, lt } = this;
    switch (last - first) {
      case 0:
      case 1:
        return true;
      case 2:
        if (lt(a[last - 1]!, a[first]!)) this.swap(first, last - 1);
        return true;
      case 3:
        this.sort3(first, first + 1, last - 1);
        return true;
      case 4:
        this.sort4(first, first + 1, first + 2, last - 1);
        return true;
      case 5:
        this.sort5(first, first + 1, first + 2, first + 3, last - 1);
        return true;
      default:
        return false;
    }
  }

  /** @see __algorithm/sort.h:__insertion_sort */
  private insertionSort(first: number, last: number): void {
    const { a, lt } = this;
    if (first === last) return;
    for (let i = first + 1; i !== last; ++i) {
      let j = i - 1;
      if (lt(a[i]!, a[j]!)) {
        const t = a[i]!;
        let k = j;
        j = i;
        do {
          a[j] = a[k]!;
          j = k;
        } while (j !== first && lt(t, a[--k]!));
        a[j] = t;
      }
    }
  }

  /**
   * Assumes that `first - 1` holds an element no element of the range sorts before.
   * @see __algorithm/sort.h:__insertion_sort_unguarded
   */
  private insertionSortUnguarded(first: number, last: number): void {
    const { a, lt } = this;
    if (first === last) return;
    for (let i = first + 1; i !== last; ++i) {
      let j = i - 1;
      if (lt(a[i]!, a[j]!)) {
        const t = a[i]!;
        let k = j;
        j = i;
        do {
          a[j] = a[k]!;
          j = k;
        } while (lt(t, a[--k]!));
        a[j] = t;
      }
    }
  }

  /** @see __algorithm/sort.h:__insertion_sort_incomplete */
  private insertionSortIncomplete(first: number, last: number): boolean {
    const { a, lt } = this;
    if (this.sortSmall(first, last)) return true;
    let j = first + 2;
    this.sort3(first, first + 1, j);
    let count = 0;
    for (let i = j + 1; i !== last; ++i) {
      if (lt(a[i]!, a[j]!)) {
        const t = a[i]!;
        let k = j;
        j = i;
        do {
          a[j] = a[k]!;
          j = k;
        } while (j !== first && lt(t, a[--k]!));
        a[j] = t;
        if (++count === INCOMPLETE_LIMIT) return ++i === last;
      }
      j = i;
    }
    return true;
  }

  /**
   * `*first` holds the pivot. Elements equivalent to it end up on its right.
   * @returns the pivot's index, and whether the range was already partitioned
   * @see __algorithm/sort.h:__partition_with_equals_on_right
   */
  private partitionWithEqualsOnRight(first: number, last: number): [number, boolean] {
    const { a, lt } = this;
    const begin = first;
    const pivot = a[first]!;
    do {
      ++first;
    } while (lt(a[first]!, pivot));
    if (begin === first - 1) {
      while (first < last && !lt(a[--last]!, pivot));
    } else {
      do {
        --last;
      } while (!lt(a[last]!, pivot));
    }
    const alreadyPartitioned = first >= last;
    while (first < last) {
      this.swap(first, last);
      do {
        ++first;
      } while (lt(a[first]!, pivot));
      do {
        --last;
      } while (!lt(a[last]!, pivot));
    }
    const pivotPos = first - 1;
    if (begin !== pivotPos) a[begin] = a[pivotPos]!;
    a[pivotPos] = pivot;
    return [pivotPos, alreadyPartitioned];
  }

  /**
   * The opening scan of `__partition_with_equals_on_left`, apart because of the project's
   * complexity limit.
   * @returns the first index after `first` that sorts after the pivot, or `last`
   * @see __algorithm/sort.h:__partition_with_equals_on_left
   */
  private firstAfterPivot(first: number, last: number, pivot: T): number {
    const { a, lt } = this;
    if (lt(pivot, a[last - 1]!)) {
      do {
        ++first;
      } while (!lt(pivot, a[first]!));
    } else {
      while (++first < last && !lt(pivot, a[first]!));
    }
    return first;
  }

  /**
   * `*first` holds the pivot. Elements equivalent to it end up on its left.
   * @returns the index after the pivot
   * @see __algorithm/sort.h:__partition_with_equals_on_left
   */
  private partitionWithEqualsOnLeft(first: number, last: number): number {
    const { a, lt } = this;
    const begin = first;
    const pivot = a[first]!;
    first = this.firstAfterPivot(first, last, pivot);
    if (first < last) {
      do {
        --last;
      } while (lt(pivot, a[last]!));
    }
    while (first < last) {
      this.swap(first, last);
      do {
        ++first;
      } while (!lt(pivot, a[first]!));
      do {
        --last;
      } while (lt(pivot, a[last]!));
    }
    const pivotPos = first - 1;
    if (begin !== pivotPos) a[begin] = a[pivotPos]!;
    a[pivotPos] = pivot;
    return first;
  }

  /** @see __algorithm/sift_down.h:__sift_down */
  private siftDown(first: number, len: number, start: number): void {
    const { a, lt } = this;
    let child = start;
    if (len < 2 || Math.trunc((len - 2) / 2) < child) return;
    child = 2 * child + 1;
    if (child + 1 < len && lt(a[first + child]!, a[first + child + 1]!)) ++child;
    if (lt(a[first + child]!, a[first + start]!)) return;
    const top = a[first + start]!;
    do {
      a[first + start] = a[first + child]!;
      start = child;
      if (Math.trunc((len - 2) / 2) < child) break;
      child = 2 * child + 1;
      if (child + 1 < len && lt(a[first + child]!, a[first + child + 1]!)) ++child;
    } while (!lt(a[first + child]!, top));
    a[first + start] = top;
  }

  /** @see __algorithm/sift_down.h:__floyd_sift_down */
  private floydSiftDown(first: number, len: number): number {
    const { a, lt } = this;
    let hole = first;
    let childI = first;
    let child = 0;
    while (true) {
      childI += child + 1;
      child = 2 * child + 1;
      if (child + 1 < len && lt(a[childI]!, a[childI + 1]!)) {
        ++childI;
        ++child;
      }
      a[hole] = a[childI]!;
      hole = childI;
      if (child > Math.trunc((len - 2) / 2)) return hole;
    }
  }

  /** @see __algorithm/push_heap.h:__sift_up */
  private siftUp(first: number, last: number, len: number): void {
    const { a, lt } = this;
    if (len > 1) {
      len = Math.trunc((len - 2) / 2);
      let ptr = first + len;
      if (lt(a[ptr]!, a[--last]!)) {
        const t = a[last]!;
        do {
          a[last] = a[ptr]!;
          last = ptr;
          if (len === 0) break;
          len = Math.trunc((len - 1) / 2);
          ptr = first + len;
        } while (lt(a[ptr]!, t));
        a[last] = t;
      }
    }
  }

  /** @see __algorithm/pop_heap.h:__pop_heap */
  private popHeap(first: number, last: number, len: number): void {
    const a = this.a;
    if (len > 1) {
      const top = a[first]!;
      let hole = this.floydSiftDown(first, len);
      --last;
      if (hole === last) {
        a[hole] = top;
      } else {
        a[hole] = a[last]!;
        ++hole;
        a[last] = top;
        this.siftUp(first, hole, hole - first);
      }
    }
  }

  /** @see __algorithm/make_heap.h:__make_heap */
  private makeHeap(first: number, last: number): void {
    const n = last - first;
    if (n > 1) {
      for (let start = Math.trunc((n - 2) / 2); start >= 0; --start) {
        this.siftDown(first, n, start);
      }
    }
  }

  /** @see __algorithm/sort_heap.h:__sort_heap */
  private sortHeap(first: number, last: number): void {
    for (let n = last - first; n > 1; --last, --n) this.popHeap(first, last, n);
  }

  /**
   * `__partial_sort_impl(first, last, last, comp)`, as the depth fallback calls it.
   * @see __algorithm/partial_sort.h:__partial_sort_impl
   */
  private partialSort(first: number, last: number): void {
    this.makeHeap(first, last);
    this.sortHeap(first, last);
  }

  /**
   * Tukey's ninther or the median of 3, leaving the pivot at `first`. Apart from `__introsort`
   * because of the project's complexity limit.
   * @see __algorithm/sort.h:__introsort
   */
  private selectPivot(first: number, last: number, len: number): void {
    const halfLen = Math.trunc(len / 2);
    if (len > NINTHER_THRESHOLD) {
      this.sort3(first, first + halfLen, last - 1);
      this.sort3(first + 1, first + (halfLen - 1), last - 2);
      this.sort3(first + 2, first + (halfLen + 1), last - 3);
      this.sort3(first + (halfLen - 1), first + halfLen, first + (halfLen + 1));
      this.swap(first, first + halfLen);
    } else {
      this.sort3(first + halfLen, first, last - 1);
    }
  }

  /**
   * `__introsort`'s test for a pivot equal to the highest element on its left. Apart because of
   * the project's complexity limit.
   * @see __algorithm/sort.h:__introsort
   */
  private pivotEqualsLeftNeighbour(first: number, leftmost: boolean): boolean {
    return !leftmost && !this.lt(this.a[first - 1]!, this.a[first]!);
  }

  /** @see __algorithm/sort.h:__introsort */
  introsort(first: number, last: number, depth: number, leftmost: boolean): void {
    while (true) {
      const len = last - first;
      if (this.sortSmall(first, last)) return;
      if (len < LIMIT) {
        if (leftmost) this.insertionSort(first, last);
        else this.insertionSortUnguarded(first, last);
        return;
      }
      if (depth === 0) {
        this.partialSort(first, last);
        return;
      }
      --depth;
      this.selectPivot(first, last, len);
      if (this.pivotEqualsLeftNeighbour(first, leftmost)) {
        first = this.partitionWithEqualsOnLeft(first, last);
        continue;
      }
      const [i, alreadyPartitioned] = this.partitionWithEqualsOnRight(first, last);
      if (alreadyPartitioned) {
        const fs = this.insertionSortIncomplete(first, i);
        if (this.insertionSortIncomplete(i + 1, last)) {
          if (fs) return;
          last = i;
          continue;
        }
        if (fs) {
          first = i + 1;
          continue;
        }
      }
      this.introsort(first, i, depth, leftmost);
      leftmost = false;
      first = i + 1;
    }
  }
}

/**
 * Sorts `a` in place as libc++ `std::sort(a.begin(), a.end(), lt)` does, for an element type that
 * is not arithmetic and a comparator that is not `std::less`.
 * @see __algorithm/sort.h:__sort_dispatch
 */
export function libcxxSort<T>(a: T[], lt: (x: T, y: T) => boolean): void {
  if (a.length === 0) return;
  new Introsort(a, lt).introsort(0, a.length, 2 * bitLog2(a.length), true);
}
