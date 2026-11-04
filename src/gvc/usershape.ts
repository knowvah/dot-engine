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
import { safefile } from '../common/safefile.js';
import { ImageType, imagetype, type ImageTypeResult } from './image-type.js';

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
 * The type `gvusershape_open` sniffs from the bytes the resolver supplies for
 * `name`; null when there are none (a sizer-only image has no type, AD-5).
 * @see lib/gvc/gvusershape.c:gvusershape_open (imagetype)
 */
export function usershapeType(name: string, resolver?: ImageResolver): ImageTypeResult | null {
  const found = findImageBytes(name, resolver);
  return found === null ? null : imagetype(found.bytes);
}

/**
 * The `agwarningf` text for bytes whose magic matches nothing and that name no
 * shape-library member (the port has none).
 * @see lib/gvc/gvusershape.c:gvusershape_open (FT_NULL case)
 */
export function imageNotFoundWarning(name: string): string {
  return `"${name}" was not found as a file or as a shape library member`;
}

/**
 * The first warning `gvusershape_open` prints when it fails for `name`, or
 * null when it succeeds: nothing supplied (the open failure) or resolver
 * bytes of unknown type (FT_NULL).
 * @see lib/gvc/gvusershape.c:gvusershape_open
 */
export function imageOpenFailure(name: string, sizer?: ImageSizer, resolver?: ImageResolver): string | null {
  if (!imageIsSupplied(name, sizer, resolver)) return imageOpenWarning(name);
  return usershapeType(name, resolver)?.type === ImageType.FT_NULL ? imageNotFoundWarning(name) : null;
}

/**
 * The `agwarningf` text `gvusershape_file_access` prints when it cannot open
 * `name`. C does not cache a failed open, so every sizing request repeats it.
 * @see lib/gvc/gvusershape.c:gvusershape_file_access
 */
export function imageOpenWarning(name: string): string {
  if (safefile(name) === null) return `Filename "${name}" is unsafe`;
  return `${STRERROR_ENOENT} while opening ${name}`;
}

/** @see lib/gvc/gvusershape.c:DEFAULT_DPI */
export const DEFAULT_DPI = 96;
/** @see lib/common/geom.h:POINTS_PER_INCH */
const POINTS_PER_INCH = 72;

/**
 * The graph's `dpi` as `gvusershape_size` reads it: GD_drawing->dpi is
 * late_double(dpi, resolution, 0) (input.c:705), and a value below 1 means
 * the 96 default.
 * @see lib/common/input.c:graph_init (dpi), lib/gvc/gvusershape.c:gvusershape_size
 */
export function usershapeDpi(attrs: ReadonlyMap<string, string>): number {
  const lateDouble = (s: string | undefined, dflt: number): number => {
    if (s === undefined || s === '') return dflt;
    const v = Number(s);
    return Number.isNaN(v) || s.trim() === '' ? dflt : Math.max(v, 0);
  };
  const dpi = lateDouble(attrs.get('dpi'), lateDouble(attrs.get('resolution'), 0));
  return dpi >= 1 ? dpi : DEFAULT_DPI;
}

/**
 * Image size in points: `gvusershape_size`. The caller's sizer reports pixels;
 * the result is `(int)(px * 72 / dpi)` (the file's own dpi is unknown to a
 * sizer, so `us->dpi` is 0 as for most formats). Null stands for C's (-1,-1):
 * empty name or an image nobody supplies.
 * @param resolver - the caller's resolver, when it has one; bytes it supplies
 *   with unknown magic make the open fail (no size).
 * @see lib/gvc/gvusershape.c:gvusershape_size, gvusershape_size_dpi
 */
export function usershapeSizePts(
  name: string | undefined, dpi: number, sizer?: ImageSizer, resolver?: ImageResolver,
): { x: number; y: number } | null {
  if (name === undefined || name === '') return null;
  // gvusershape_open fails on bytes of unknown type: no size. Only a resolver
  // the caller names is consulted: an omitted one must not reach the global
  // resolver behind a per-context one (ADR-2).
  if (resolver !== undefined && usershapeType(name, resolver)?.type === ImageType.FT_NULL) return null;
  const px = sizer !== undefined ? sizer(name) : findImageSize(name);
  if (px === null) return null;
  return {
    x: Math.trunc((px.w * POINTS_PER_INCH) / dpi),
    y: Math.trunc((px.h * POINTS_PER_INCH) / dpi),
  };
}
