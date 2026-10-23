// SPDX-License-Identifier: EPL-2.0

/**
 * User-shape (image) size resolution for HTML <IMG> labels.
 *
 * C resolves image dimensions through a process-global dictionary
 * (gvusershape.c ImageDict) populated from the filesystem — browser-
 * hostile. Per AD3, the port exposes a caller-injected ImageSizer in
 * the same global-registry position: callers register a sizer before
 * rendering; absent or unresolvable sources reproduce C's
 * missing-image behavior (warning + zero size).
 *
 * @see lib/gvc/gvusershape.c (ImageDict, gvusershape_find/size)
 */

import { invalidArgType } from '../errors.js';
import type { ImageSizer } from '../common/htmltable-types.js';
import { findImageBytes, type ImageResolver } from './image-resolver.js';

export type { ImageSizer } from '../common/htmltable-types.js';

let activeSizer: ImageSizer | null = null;

/**
 * Register (or clear, with null) the global image sizer consulted by
 * HTML <IMG> sizing. Mirrors gvusershape's process-global dictionary.
 * @throws TypeError `ERR_INVALID_ARG_TYPE` if `sizer` is neither a function
 *   nor null
 */
export function setImageSizer(sizer: ImageSizer | null): void {
  if (sizer !== null && typeof sizer !== 'function') {
    throw invalidArgType('sizer', 'function or null', sizer);
  }
  activeSizer = sizer;
}

/** Resolve an image source via the registered sizer; null if unresolved. */
export function findImageSize(src: string): { w: number; h: number } | null {
  return activeSizer !== null ? activeSizer(src) : null;
}

/**
 * `strerror(ENOENT)`: the port has no filesystem, so an image the caller
 * cannot supply is C's missing file (AD-11).
 */
export const STRERROR_ENOENT = 'No such file or directory';

/**
 * Whether the caller supplies `name` at all: a size from `sizer` (default: the
 * global one) or resolver bytes (a per-context `resolver` replaces the global). Mirrors gvusershape_open
 * finding the file.
 */
export function imageIsSupplied(name: string, sizer?: ImageSizer, resolver?: ImageResolver): boolean {
  const size = sizer !== undefined ? sizer(name) : findImageSize(name);
  return size !== null || findImageBytes(name, resolver) !== null;
}

/**
 * The `agwarningf` text `gvusershape_file_access` prints when it cannot open
 * `name`. C does not cache a failed open, so every sizing request repeats it.
 * @see lib/gvc/gvusershape.c:gvusershape_file_access
 */
export function imageOpenWarning(name: string): string {
  return `${STRERROR_ENOENT} while opening ${name}`;
}
