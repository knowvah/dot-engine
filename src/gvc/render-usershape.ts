// SPDX-License-Identifier: EPL-2.0

/**
 * `gvrender_usershape`: fit an image (node `image=`, HTML `<IMG>`) into the
 * bounding box of a polygon according to `imagescale` / `imagepos`, then hand
 * the resulting box to the renderer's loadimage hook (`usershape`).
 *
 * @see lib/gvc/gvrender.c:gvrender_usershape (670-790)
 */

import type { Box, Point } from '../model/geom.js';
import type { RenderJob } from './job.js';
import { imageIsSupplied, usershapeSizePts, type ImageSizer } from './usershape.js';
import { mapbool } from '../layout/dot/rank.js';

/** @see lib/gvc/gvcjob.h:imagescale_t */
export const ImageScale = {
  False: 'false',
  True: 'true',
  Width: 'width',
  Height: 'height',
  Both: 'both',
} as const;
export type ImageScale = (typeof ImageScale)[keyof typeof ImageScale];

/** @see lib/gvc/gvcjob.h:imagepos_t */
export const ImagePos = {
  TopLeft: 'tl',
  TopCenter: 'tc',
  TopRight: 'tr',
  MiddleLeft: 'ml',
  MiddleCenter: 'mc',
  MiddleRight: 'mr',
  BottomLeft: 'bl',
  BottomCenter: 'bc',
  BottomRight: 'br',
} as const;
export type ImagePos = (typeof ImagePos)[keyof typeof ImagePos];

const IMAGE_POSITIONS: ReadonlySet<string> = new Set(Object.values(ImagePos));

/** @see lib/gvc/gvrender.c:get_imagescale */
export function getImagescale(s: string): ImageScale {
  if (s === '') return ImageScale.False;
  const l = s.toLowerCase();
  if (l === 'width') return ImageScale.Width;
  if (l === 'height') return ImageScale.Height;
  if (l === 'both') return ImageScale.Both;
  if (mapbool(s)) return ImageScale.True;
  return ImageScale.False;
}

/** @see lib/gvc/gvrender.c:get_imagepos */
export function getImagepos(s: string): ImagePos {
  if (s === '') return ImagePos.MiddleCenter;
  const l = s.toLowerCase();
  return IMAGE_POSITIONS.has(l) ? (l as ImagePos) : ImagePos.MiddleCenter;
}

/** Scale `isz` toward the polygon extent (pw, ph) per `imagescale`. */
function scaleImage(
  mode: ImageScale, isz: { w: number; h: number }, pw: number, ph: number,
): { iw: number; ih: number } {
  let iw = isz.w;
  let ih = isz.h;
  const scalex = pw / iw;
  const scaley = ph / ih;
  switch (mode) {
    case ImageScale.True:
      // keep aspect ratio fixed by just using the smaller scale
      if (scalex < scaley) {
        iw *= scalex;
        ih *= scalex;
      } else {
        iw *= scaley;
        ih *= scaley;
      }
      break;
    case ImageScale.Width:
      iw *= scalex;
      break;
    case ImageScale.Height:
      ih *= scaley;
      break;
    case ImageScale.Both:
      iw *= scalex;
      ih *= scaley;
      break;
    case ImageScale.False:
      break;
  }
  return { iw, ih };
}

/** Apply `imagepos` to the target box when the image is narrower than it. */
function positionX(b: Box, position: ImagePos, iw: number, pw: number): void {
  if (!(iw < pw)) return;
  switch (position) {
    case ImagePos.TopLeft:
    case ImagePos.MiddleLeft:
    case ImagePos.BottomLeft:
      b.ur.x = b.ll.x + iw;
      break;
    case ImagePos.TopRight:
    case ImagePos.MiddleRight:
    case ImagePos.BottomRight:
      b.ll.x += pw - iw;
      b.ur.x = b.ll.x + iw;
      break;
    default:
      b.ll.x += (pw - iw) / 2.0;
      b.ur.x -= (pw - iw) / 2.0;
      break;
  }
}

/** Apply `imagepos` to the target box when the image is shorter than it. */
function positionY(b: Box, position: ImagePos, ih: number, ph: number): void {
  if (!(ih < ph)) return;
  switch (position) {
    case ImagePos.TopLeft:
    case ImagePos.TopCenter:
    case ImagePos.TopRight:
      b.ll.y = b.ur.y - ih;
      break;
    case ImagePos.BottomLeft:
    case ImagePos.BottomCenter:
    case ImagePos.BottomRight:
      // Kept as C writes it: ll moves up by ih, ur lands on the old ll; the
      // LL/UR swap below restores order.
      b.ll.y += ih;
      b.ur.y = b.ll.y - ih;
      break;
    default:
      b.ll.y += (ph - ih) / 2.0;
      b.ur.y -= (ph - ih) / 2.0;
      break;
  }
}

/** Bounding box of the polygon `a` (expandbp over every vertex). */
function polygonBox(a: readonly Point[]): Box {
  const first = a[0]!;
  const b: Box = { ll: { x: first.x, y: first.y }, ur: { x: first.x, y: first.y } };
  for (let i = 1; i < a.length; i++) {
    const p = a[i]!;
    if (p.x < b.ll.x) b.ll.x = p.x;
    if (p.x > b.ur.x) b.ur.x = p.x;
    if (p.y < b.ll.y) b.ll.y = p.y;
    if (p.y > b.ur.y) b.ur.y = p.y;
  }
  return b;
}

/**
 * The rendering context's image sizer (the port's gvusershape dictionary),
 * set on the job by `render` beside `imageResolver`; undefined means the
 * global `setImageSizer`.
 */
declare module './job.js' {
  interface RenderJob {
    imageSizer?: ImageSizer | undefined;
  }
}

/**
 * Scale the image `name` to the bounding box of polygon `a` per `imagescale`,
 * place it per `imagepos`, convert to device coordinates unless the renderer
 * transforms, and pass the box to the renderer's `usershape` (gvloadimage).
 *
 * `gvusershape_find` is "the caller supplies `name`" (sizer or resolver); the
 * `find_user_shape` / `library_shape` branch is a no-op because no renderer
 * has `library_shape`. `filled` is only read by loadimage plugins that paint a
 * background (none of svg/xdot), so it is not forwarded.
 *
 * @see lib/gvc/gvrender.c:gvrender_usershape
 */
export function gvrenderUsershape(
  job: RenderJob, name: string, a: readonly Point[], _filled: boolean,
  imagescale: string, imagepos: string,
): void {
  const sizer = job.imageSizer;
  if (!imageIsSupplied(name, sizer, job.imageResolver)) return;

  // gvusershape_size_dpi(us, job->dpi)
  const isz = usershapeSizePts(name, job.dpi.x, sizer);
  if (isz === null || (isz.x <= 0 && isz.y <= 0)) return;

  const b = polygonBox(a);
  const pw = b.ur.x - b.ll.x;
  const ph = b.ur.y - b.ll.y;
  const { iw, ih } = scaleImage(getImagescale(imagescale), { w: isz.x, h: isz.y }, pw, ph);

  // if image is smaller in any dimension, apply the specified positioning
  const position = getImagepos(imagepos);
  positionX(b, position, iw, pw);
  positionY(b, position, ih, ph);

  // C converts graph to device coordinates here (gvrender_ptf) unless the
  // renderer has GVRENDER_DOES_TRANSFORM. The port never sets that flag: its
  // y-flip lives in transformPoint (devscale), applied by the callers of the
  // primitives. Both renderers with a `usershape` (svg, xdot) are
  // DOES_TRANSFORM in C and take graph coordinates (RendererPlugin.usershape
  // contract), so the ptf branch is dead for every registered renderer.

  if (b.ll.x > b.ur.x) [b.ll.x, b.ur.x] = [b.ur.x, b.ll.x];
  if (b.ll.y > b.ur.y) [b.ll.y, b.ur.y] = [b.ur.y, b.ll.y];
  job.renderer?.usershape?.(name, b, job);
}
