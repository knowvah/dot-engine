// SPDX-License-Identifier: EPL-2.0

/**
 * `safefile` and the `Gvimagepath` process global (AD-6).
 *
 * C resolves a relative file name against the directories in `Gvimagepath`
 * (the graph's `imagepath`) and returns the first readable `dir/name`; NULL
 * means the name is unsafe or unreachable. The port has no filesystem, so
 * "readable `dir/name`" becomes "the host supplies `name`" (sizer or
 * resolver), keyed by the raw name.
 *
 * @see lib/common/utils.c:safefile (253-311)
 */

import type { ImageResolver } from '../gvc/image-resolver.js';
import { imageIsSupplied, type ImageSizer } from '../gvc/usershape.js';
import { registerRenderState } from './render-state.js';

/** utils.c PATHSEP on non-Windows. */
const PATHSEP = ':';
/** C's PATH_SEPARATOR, tested on the first character of the name. */
const PATH_SEPARATOR = '/';

/**
 * `Gvimagepath` (a C process global, initially NULL). Held in a const
 * container, reset per render; graph_init overwrites it on every graph.
 * @see lib/common/globals.h:Gvimagepath
 */
const imagePathState: { value: string | undefined } = { value: undefined };
registerRenderState(() => { imagePathState.value = undefined; });

/**
 * The layout's effective sizer and resolver (the per-context hooks, else
 * undefined so the global ones apply). They stand in for C's filesystem and
 * are set beside `Gvimagepath` at graph init (AD-7).
 */
const imageHooksState: { sizer: ImageSizer | undefined; resolver: ImageResolver | undefined } = {
  sizer: undefined,
  resolver: undefined,
};
registerRenderState(() => { imageHooksState.sizer = undefined; imageHooksState.resolver = undefined; });

/** Record the layout's per-context image hooks; graph_init calls this per graph. */
export function setImageHooks(sizer: ImageSizer | undefined, resolver: ImageResolver | undefined): void {
  imageHooksState.sizer = sizer;
  imageHooksState.resolver = resolver;
}

/**
 * graph_init's `Gvimagepath = agget(g, "imagepath")`, falling back to
 * `Gvfilepath` (unported: it comes from the command line/environment, so the
 * fallback is NULL).
 * @see lib/common/input.c:graph_init (627-630)
 */
export function setImagePath(imagepath: string | undefined): void {
  imagePathState.value = imagepath;
}

/**
 * The directory list `mkDirlist` builds: the split on PATHSEP, empty tokens
 * included only as `tok` yields them (it yields none for an empty list).
 * @see lib/common/utils.c:mkDirlist
 */
export function mkDirlist(list: string): string[] {
  return list === '' ? [] : list.split(PATHSEP);
}

/**
 * First directory whose `dir/str` is readable; here, the host supplies `str`.
 * C returns the joined path; lookups stay keyed by the raw name, so the
 * result is `str`.
 * @see lib/common/utils.c:findPath
 */
function findPath(dirs: readonly string[], str: string): string | null {
  return dirs.length > 0 && imageIsSupplied(str, imageHooksState.sizer, imageHooksState.resolver) ? str : null;
}

/**
 * NULL (here null) for a trivial name or one not found along `Gvimagepath`;
 * the name itself when the list is empty or the name is absolute.
 * Unported branches: `HTTPServerEnVar` (SERVER_NAME, always NULL) and
 * `Gvfilepath` (GV_FILE_PATH, a basename search) - the browser has no
 * environment.
 * @see lib/common/utils.c:safefile (253-311)
 */
export function safefile(filename: string | undefined): string | null {
  if (filename === undefined || filename === '') return null;
  const pathlist = imagePathState.value;
  const dirs = pathlist !== undefined && pathlist !== '' ? mkDirlist(pathlist) : [];
  if (filename.startsWith(PATH_SEPARATOR) || dirs.length === 0) return filename;
  return findPath(dirs, filename);
}
