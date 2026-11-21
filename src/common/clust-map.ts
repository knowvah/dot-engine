// SPDX-License-Identifier: EPL-2.0

/**
 * The flat cluster-name map dot's compound edges and fdp's cluster edges look
 * cluster endpoints up in. cgraph keeps subgraph names per parent, so two
 * clusters in the tree can share a name; C keeps the first and warns.
 *
 * @see lib/common/utils.c:fillMap, mkClustMap (1498-1525)
 * @see lib/cgraph/id.c:agnameof
 */

import type { Graph } from '../model/graph.js';
import { LOCALNAMEPREFIX } from '../model/cgraph-ops.js';
import { agwarningf } from './agerr.js';

/**
 * fillMap's state across the recursion. `anonKeyed` stands for C's key alias:
 * agnameof returns one static buffer for every anonymous graph, and fillMap
 * stores that pointer as the key, so once an anonymous cluster is in the map,
 * every later anonymous cluster's dtmatch finds it. A cluster is anonymous
 * here when its name starts with LOCALNAMEPREFIX, the test the dot writer
 * uses. A parsed `"%x"` is anonymous too: the parser gives it a `%<id>` name,
 * as endgraph's aginternalmapclearlocalnames leaves agnameof the static buffer.
 * @see lib/cgraph/id.c:agnameof (static buf, 161-164)
 */
interface ClustMapState { map: Map<string, Graph>; anonKeyed: boolean }

/**
 * Map every cluster's name to its subgraph, preorder over the cluster tree
 * (info.clust, 0-based here for C's GD_clust[1..n]). A second cluster with a
 * name already in the map is ignored, with a warning.
 * @see lib/common/utils.c:fillMap
 */
function fillMap(g: Graph, st: ClustMapState): void {
  const n = g.info.n_cluster ?? 0;
  for (let c = 0; c < n; c++) {
    const cl = g.info.clust![c]!;
    const s = cl.name;
    const anon = s.startsWith(LOCALNAMEPREFIX);
    if (st.map.has(s) || (anon && st.anonKeyed)) {
      agwarningf(`Two clusters named ${s} - the second will be ignored`);
    } else {
      st.map.set(s, cl);
      if (anon) st.anonKeyed = true;
    }
    fillMap(cl, st);
  }
}

/**
 * Build the name-to-cluster map for g's cluster tree. Assumes g's cluster
 * tree (info.n_cluster, info.clust) is already built.
 * @see lib/common/utils.c:mkClustMap
 */
export function mkClustMap(g: Graph): Map<string, Graph> {
  const st: ClustMapState = { map: new Map<string, Graph>(), anonKeyed: false };
  fillMap(g, st);
  return st.map;
}
