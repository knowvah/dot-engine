// SPDX-License-Identifier: EPL-2.0
/**
 * DtBag — ordered multiset (Dtobag) backed by a splay tree.
 *
 * Unlike DtSplay (DT_OSET), DtBag allows duplicate keys.  On insert of a
 * duplicate, the matched (old) node is threaded onto the new node's RIGHT
 * subtree — not the left, as an earlier version of this comment claimed.
 * C dttree.c DT_INSERT's DT_OBAG found-branch does
 * `root->left = NULL; root->right = link.left; link.left = root;`
 * (dttree.c:223-231): the old matched node is pushed onto the head of the
 * RIGHT partition, which becomes the new root's `.right` subtree.
 *
 * Iteration (first/next) produces ascending comparator order.  Among
 * equal-key nodes the sub-order is the deterministic order CDT's Dtobag
 * produces (via bagInsert's integrated splay+insert) — load-bearing for the
 * xlabel R-tree, which drains this bag to seed its Hilbert insertion order.
 *
 * AD4 extension: required by xlabels.ts which uses dtopen(&Hdisc, Dtobag).
 *
 * @see lib/cdt/dttree.c (DT_OBAG)
 */

import type { Comparator, KeyOf } from "./types.js";
import {
  splay,
  splayMin,
  splayMax,
  bagInsert,
} from "./splay-core.js";
import type { SplayNode } from "./splay-core.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Remove `root` itself from the tree, joining its two subtrees.  delete()
 * always walks the equal-key duplicate group (via splay + next()) until the
 * target identity is splayed to root, so unlinking only ever needs to
 * handle the "match is at root" case — mirrors dttree.c:211-222 dt_delete's
 * reassembly (`l->right = root->left; r->left = root->right; ...`).
 * Returns the new root.
 */
function removeRoot<T>(root: SplayNode<T>): SplayNode<T> | null {
  const left  = root.left;
  const right = root.right;
  if (left === null) return right;
  const maxLeft = splayMax(left);
  maxLeft.right = right;
  return maxLeft;
}

// ---------------------------------------------------------------------------
// DtBag class
// ---------------------------------------------------------------------------

export class DtBag<T, K = T> {
  private _root: SplayNode<T> | null = null;
  private _size = 0;
  private readonly _keyOf: KeyOf<T, K>;
  private readonly _compare: Comparator<K>;

  constructor(keyOf: KeyOf<T, K>, compare: Comparator<K>) {
    this._keyOf = keyOf;
    this._compare = compare;
  }

  /** @see lib/cdt/dtsize.c:dtsize */
  size(): number { return this._size; }

  /**
   * Insert obj.  Duplicates ARE inserted (DT_OBAG semantics).
   * @see lib/cdt/dttree.c:dttree DT_INSERT (DT_OBAG branch)
   */
  insert(obj: T): T {
    const node: SplayNode<T> = { left: null, right: null, obj };
    if (this._root === null) {
      this._root = node;
      this._size++;
      return obj;
    }
    // Integrated CDT top-down splay + insert: the equal-key sub-order is
    // load-bearing (see bagInsert), so we must NOT splay-reassemble first.
    this._root = bagInsert(this._root, node, this._keyOf, this._compare);
    this._size++;
    return obj;
  }

  /**
   * Delete one occurrence of obj by object identity.
   * @see lib/cdt/dttree.c:dttree DT_OBAG DT_DELETE
   */
  delete(obj: T): boolean {
    if (this._root === null) return false;
    const key = this._keyOf(obj);
    this._root = splay(this._root, key, this._keyOf, this._compare);
    if (this._compare(key, this._keyOf(this._root.obj)) !== 0) return false;
    // Mirror dttree.c:67-79's DT_OBAG DELETE/DETACH pre-pass: dtsearch
    // splays an equal-key node to root, then dtnext (also splaying) walks
    // the equal-key duplicate group by pointer identity until it finds
    // `obj`. Each next() call re-splays `this._root`, mirroring C's
    // mutate-on-lookup contract.
    while (this._root.obj !== obj) {
      const nxt = this.next(this._root.obj);
      if (nxt === undefined || this._compare(key, this._keyOf(nxt)) !== 0) {
        return false;
      }
    }
    this._root = removeRoot(this._root);
    this._size--;
    return true;
  }

  /**
   * Return the minimum element (splays to root).
   * @see lib/cdt/dttree.c:dttree DT_FIRST
   */
  first(): T | undefined {
    if (this._root === null) return undefined;
    this._root = splayMin(this._root);
    return this._root.obj;
  }

  /**
   * Return the in-order successor of obj.
   * @see lib/cdt/dttree.c:dttree DT_NEXT
   */
  next(obj: T): T | undefined {
    if (this._root === null) return undefined;
    const key = this._keyOf(obj);
    this._root = splay(this._root, key, this._keyOf, this._compare);
    const cmp = this._compare(key, this._keyOf(this._root.obj));
    if (cmp < 0) return this._root.obj;
    const right = this._root.right;
    if (right === null) return undefined;
    const minNode = splayMin(right);
    this._root.right = null;
    minNode.left = this._root;
    this._root = minNode;
    return minNode.obj;
  }

  /**
   * Return the maximum element (splays to root).
   * @see lib/cdt/dttree.c:dttree DT_LAST
   */
  last(): T | undefined {
    if (this._root === null) return undefined;
    this._root = splayMax(this._root);
    return this._root.obj;
  }

  /** Remove all elements. */
  clear(): void {
    this._root = null;
    this._size = 0;
  }

  /** Iterate in ascending comparator order via first() / next(). */
  [Symbol.iterator](): Iterator<T> {
    let current: T | undefined = this.first();
    const self = this;
    return {
      next(): IteratorResult<T> {
        if (current === undefined) {
          return { value: undefined as unknown as T, done: true };
        }
        const value = current;
        current = self.next(value);
        return { value, done: false };
      },
    };
  }
}
