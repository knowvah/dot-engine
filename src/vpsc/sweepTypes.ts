// SPDX-License-Identifier: EPL-2.0

/**
 * Internal types for the sweep-line constraint generation algorithm.
 * Kept in a separate file so the lizard complexity analyser does not
 * mistake interface blocks for function bodies in SweepLine.ts.
 *
 * @see lib/vpsc/generate-constraints.cpp
 */

import type { Variable } from "./Variable.js";
import type { Rectangle } from "./Solver.js";

export const EvType = { Open: 0, Close: 1 } as const;
export type EvType = (typeof EvType)[keyof typeof EvType];

/**
 * `std::set<Node*, CmpNodePos>`: an array kept in `nodePosLt` order.
 * @see lib/vpsc/generate-constraints.cpp: NodeSet
 */
export type NodeSet = SweepNode[];

export interface SweepNode {
  v: Variable;
  r: Rectangle;
  pos: number;
  /**
   * Creation order in this pass, standing in for the `Node*` address that
   * `CmpNodePos` compares on a position tie (part-8 AD-8).
   */
  seq: number;
  firstAbove: SweepNode | null;
  firstBelow: SweepNode | null;
  leftNeighbours: NodeSet;
  rightNeighbours: NodeSet;
}

export interface SweepEvent {
  type: EvType;
  node: SweepNode;
  pos: number;
}
