// SPDX-License-Identifier: EPL-2.0
/**
 * The `GVDEVICE_DOES_LAYERS` check of `firstlayer`: a device without it prints
 * one layer and warns. The one-layer effect is `renderGraph`'s `layered` flag
 * (only svg has `beginLayer`; the other native layer-capable devices, ps/pov,
 * are not ported); this file owns the warning.
 */
import { agwarningf } from '../common/agerr.js';

/** Port format ids that spell a native `-T` name differently (`output_langname`). */
const NATIVE_LANGNAME: ReadonlyMap<string, string> = new Map([
  ['cmapx-np', 'cmapx_np'],
  ['imap-np', 'imap_np'],
]);

/**
 * Print `layers not supported in <output_langname> output` when the graph has
 * more than one layer and the device cannot draw layers. Called after
 * beginGraph, as emit_graph calls firstlayer after emit_begin_graph: for
 * `-Tjson` the nested xdot render in json_begin_graph therefore warns first.
 * @see lib/common/emit.c:firstlayer
 */
export function warnLayersUnsupported(format: string, numLayers: number, doesLayers: boolean): void {
  if (numLayers <= 1 || doesLayers) return;
  agwarningf(`layers not supported in ${NATIVE_LANGNAME.get(format) ?? format} output`);
}
