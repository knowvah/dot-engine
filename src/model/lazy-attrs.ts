// SPDX-License-Identifier: EPL-2.0

/**
 * Shared empty attribute map for dot virtual nodes/edges (AD-12).
 *
 * C virtual nodes/edges carry no attribute record; allocating an empty `Map`
 * per object cost ~372 B per virtual pair. Virtual objects start with this
 * single shared map instead; reads see an empty map, and the first write goes
 * through {@link ownAttrs}, which materialises a private `Map`. A direct
 * mutation of the shared map throws rather than leaking into every virtual.
 * @see lib/dotgen/fastgr.c:virtual_node
 */

class SharedEmptyAttrs extends Map<string, string> {
  override set(key: string, _value: string): never {
    throw new Error(`attrs.set("${key}") on a shared empty map; use ownAttrs()`);
  }
  override delete(key: string): never {
    throw new Error(`attrs.delete("${key}") on a shared empty map; use ownAttrs()`);
  }
  override clear(): never {
    throw new Error('attrs.clear() on a shared empty map; use ownAttrs()');
  }
}

/** The one shared empty attribute map (read-only by construction). */
export const EMPTY_ATTRS: Map<string, string> = new SharedEmptyAttrs();

/**
 * Return the object's private attribute map, materialising it on first write
 * when the object still holds {@link EMPTY_ATTRS}.
 */
export function ownAttrs(o: { attrs: Map<string, string> }): Map<string, string> {
  if (o.attrs === EMPTY_ATTRS) o.attrs = new Map();
  return o.attrs;
}
