// SPDX-License-Identifier: EPL-2.0
/**
 * The layer walk of `emit_graph`: `for (firstlayer; validlayer; nextlayer)`
 * over either every layer or the `layerselect` list, plus the
 * `GVDEVICE_DOES_LAYERS` warning. `GVDEVICE_DOES_LAYERS` is
 * `renderer.beginLayer !== undefined`.
 */
import { agwarningf } from '../common/agerr.js';
import type { LayerInfo } from '../common/layers.js';
import type { RenderJob } from './job.js';

/** Port format ids that spell a native `-T` name differently (`output_langname`). */
const NATIVE_LANGNAME: ReadonlyMap<string, string> = new Map([
  ['cmapx-np', 'cmapx_np'],
  ['imap-np', 'imap_np'],
]);

/** C's `int **listp`: the selected-layer list and the read position in it. */
export interface LayerCursor {
  list: number[] | null;
  pos: number;
}

function warnUnsupported(job: RenderJob): void {
  agwarningf(`layers not supported in ${NATIVE_LANGNAME.get(job.format) ?? job.format} output`);
}

/**
 * Number of layers emitted (begin/end layer wrap them only when above one).
 * @see lib/common/emit.c:numPhysicalLayers
 */
export function numPhysicalLayers(job: RenderJob, info: LayerInfo): number {
  return info.layerList !== null ? info.layerList[0]! : job.numLayers;
}

/**
 * Called after beginGraph, as emit_graph calls firstlayer after
 * emit_begin_graph: for `-Tjson` the nested xdot render in json_begin_graph
 * therefore warns first. With a list, a device without layers keeps only the
 * first entry by overwriting the second with the sentinel (as C does, in place).
 * @see lib/common/emit.c:firstlayer
 */
export function firstLayer(job: RenderJob, info: LayerInfo, doesLayers: boolean): LayerCursor {
  job.numLayers = info.numLayers;
  const list = info.layerList;
  if (list !== null) {
    if (list[0]! > 1 && !doesLayers) {
      warnUnsupported(job);
      list[2] = job.numLayers + 1; // only one layer printed
    }
    job.layerNum = list[1]!;
    return { list, pos: 2 };
  }
  if (job.numLayers > 1 && !doesLayers) {
    warnUnsupported(job);
    job.numLayers = 1;
  }
  job.layerNum = 1;
  return { list: null, pos: 0 };
}

/** @see lib/common/emit.c:validlayer */
export function validLayer(job: RenderJob): boolean {
  return job.layerNum <= job.numLayers;
}

/** @see lib/common/emit.c:nextlayer */
export function nextLayer(job: RenderJob, cur: LayerCursor): void {
  if (cur.list !== null) {
    job.layerNum = cur.list[cur.pos]!;
    cur.pos++;
  } else {
    job.layerNum++;
  }
}
