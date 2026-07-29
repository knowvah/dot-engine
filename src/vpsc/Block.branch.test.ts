// SPDX-License-Identifier: EPL-2.0

/**
 * T4f — branch-coverage tests for vpsc/Block.ts.
 *
 * vpsc.test.ts exercises Block only indirectly through full VPSC/IncVPSC
 * solves on 2-3 variable scenarios, which never force: findMinOutConstraint
 * (only reached via Blocks.mergeRight during a real split), the stale-
 * timestamp requeue path in findMinInConstraint, both directions of
 * mergeTwoArg's size comparison, or the processBetweenIn/Out recursion
 * (findMinLMBetween/splitBetween's "between two named endpoints" search,
 * distinct from findMinLM's simpler whole-block recursion). This file
 * builds Block/Variable/Constraint fixtures directly to drive each method.
 *
 * @see lib/vpsc/block.cpp
 */

import { describe, it, expect } from 'vitest';
import { Variable } from './Variable.js';
import { Constraint } from './Constraint.js';
import { Block } from './Block.js';

function timeCtr(): { value: number } {
  return { value: 0 };
}

describe('Block — construction and addVariable', () => {
  it('constructs empty when no seed variable is given', () => {
    const b = new Block(timeCtr());
    expect(b.vars.length).toBe(0);
    expect(b.weight).toBe(0);
  });

  it('constructs with a seed variable, offset reset to 0', () => {
    const v = new Variable(0, 5, 2);
    v.offset = 99;
    const b = new Block(timeCtr(), v);
    expect(b.vars).toEqual([v]);
    expect(v.offset).toBe(0);
    expect(b.posn).toBe(5); // wposn/weight = (5-0)*2/2
  });
});

describe('Block — mergeTwoArg (both size-comparison directions)', () => {
  it('this.vars.length < b.vars.length: routes to r.mergeInto(l, ...)', () => {
    const ctr = timeCtr();
    const small = new Variable(0, 0, 1);
    const bigA = new Variable(1, 0, 1);
    const bigB = new Variable(2, 0, 1);
    const smallBlock = new Block(ctr, small); // 1 var
    const bigBlock = new Block(ctr, bigA);
    bigBlock.addVariable(bigB); // 2 vars — bigger than smallBlock

    const c = new Constraint(small, bigA, 1);
    // this=smallBlock (1 var) < b=bigBlock (2 vars) -> r.mergeInto(l,...)
    // where l=c.left.block=smallBlock, r=c.right.block=bigBlock.
    // So bigBlock (r) absorbs smallBlock (l).
    smallBlock.mergeTwoArg(bigBlock, c);
    expect(bigBlock.vars).toContain(small);
    expect(smallBlock.deleted).toBe(true);
  });

  it('this.vars.length >= b.vars.length: routes to l.mergeInto(r, ...)', () => {
    const ctr = timeCtr();
    const bigA = new Variable(0, 0, 1);
    const bigB = new Variable(1, 0, 1);
    const small = new Variable(2, 0, 1);
    const bigBlock = new Block(ctr, bigA);
    bigBlock.addVariable(bigB); // 2 vars
    const smallBlock = new Block(ctr, small); // 1 var

    const c = new Constraint(bigA, small, 1);
    // this=bigBlock (2 vars) >= b=smallBlock (1 var) -> l.mergeInto(r,...)
    // l=c.left.block=bigBlock, r=c.right.block=smallBlock.
    // So bigBlock (l) absorbs smallBlock (r).
    bigBlock.mergeTwoArg(smallBlock, c);
    expect(bigBlock.vars).toContain(small);
    expect(smallBlock.deleted).toBe(true);
  });
});

describe('Block — findMinInConstraint', () => {
  it('returns null when the in-heap is empty', () => {
    const b = new Block(timeCtr(), new Variable(0, 0, 1));
    expect(b.findMinInConstraint()).toBeNull();
  });

  it('skips (deletes) a constraint whose endpoints are already in the same block', () => {
    const ctr = timeCtr();
    const v0 = new Variable(0, 0, 1);
    const v1 = new Variable(1, 0, 1);
    const b = new Block(ctr, v0);
    b.addVariable(v1); // v0, v1 both in b
    const c = new Constraint(v0, v1, 1);
    b.in = [c];
    // findMinInConstraint: lb===rb (both v0.block and v1.block are b) -> skip
    expect(b.findMinInConstraint()).toBeNull();
    expect(b.in.length).toBe(0);
  });

  it('requeues a stale (timeStamp < lb.timeStamp) external constraint, then finds a fresh one', () => {
    const ctr = timeCtr();
    const v0 = new Variable(0, 0, 1);
    const b = new Block(ctr, v0);
    const other = new Variable(1, 0, 1);
    const otherBlock = new Block(ctr, other);
    otherBlock.timeStamp = 100; // newer than the constraint's stamp below

    const stale = new Constraint(other, v0, 1);
    stale.timeStamp = 1; // stale: less than otherBlock.timeStamp
    const fresh = new Constraint(other, v0, 1);
    fresh.timeStamp = 200; // fresh: not less than otherBlock.timeStamp

    b.in = [stale, fresh];
    const result = b.findMinInConstraint();
    // The stale one is filtered out (requeued with a fresh timestamp, but
    // remains not the min since `fresh` also survives); a real constraint
    // is returned either way.
    expect(result).not.toBeNull();
    expect([stale, fresh]).toContain(result);
  });
});

describe('Block — findMinOutConstraint', () => {
  it('returns null when the out-heap is empty', () => {
    const b = new Block(timeCtr(), new Variable(0, 0, 1));
    expect(b.findMinOutConstraint()).toBeNull();
  });

  it('skips constraints whose endpoints are in the same block, returning null if ALL are', () => {
    const ctr = timeCtr();
    const v0 = new Variable(0, 0, 1);
    const v1 = new Variable(1, 0, 1);
    const b = new Block(ctr, v0);
    b.addVariable(v1);
    const c = new Constraint(v0, v1, 1); // both endpoints in b
    b.out = [c];
    expect(b.findMinOutConstraint()).toBeNull();
  });

  it('skips same-block constraints then finds a real external one', () => {
    const ctr = timeCtr();
    const v0 = new Variable(0, 0, 1);
    const v1 = new Variable(1, 0, 1);
    const b = new Block(ctr, v0);
    b.addVariable(v1);
    const internal = new Constraint(v0, v1, 1); // same block: skip
    const external = new Variable(2, 0, 1);
    const extBlock = new Block(ctr, external);
    const externalC = new Constraint(v0, external, 1); // v0 in b, external not
    b.out = [internal, externalC];
    const found = b.findMinOutConstraint();
    expect(found).toBe(externalC);
    void extBlock;
  });
});

describe('Block — mergeIn / mergeOut', () => {
  it('mergeIn combines two heaps after calling findMinInConstraint on both', () => {
    const ctr = timeCtr();
    const v0 = new Variable(0, 0, 1);
    const b0 = new Block(ctr, v0);
    const v1 = new Variable(1, 0, 1);
    const b1 = new Block(ctr, v1);
    const ext = new Variable(2, 0, 1);
    new Block(ctr, ext);
    const c0 = new Constraint(ext, v0, 1);
    const c1 = new Constraint(ext, v1, 1);
    b0.in = [c0];
    b1.in = [c1];
    b0.mergeIn(b1);
    expect(b0.in.length).toBe(2);
  });

  it('mergeOut combines two heaps after calling findMinOutConstraint on both', () => {
    const ctr = timeCtr();
    const v0 = new Variable(0, 0, 1);
    const b0 = new Block(ctr, v0);
    const v1 = new Variable(1, 0, 1);
    const b1 = new Block(ctr, v1);
    const ext = new Variable(2, 0, 1);
    new Block(ctr, ext);
    const c0 = new Constraint(v0, ext, 1);
    const c1 = new Constraint(v1, ext, 1);
    b0.out = [c0];
    b1.out = [c1];
    b0.mergeOut(b1);
    expect(b0.out.length).toBe(2);
  });
});

describe('Block — setUpInConstraints / setUpOutConstraints', () => {
  it('only external constraints are added to the in heap', () => {
    const ctr = timeCtr();
    const v0 = new Variable(0, 0, 1);
    const v1 = new Variable(1, 0, 1);
    const b = new Block(ctr, v0);
    b.addVariable(v1);
    const internal = new Constraint(v0, v1, 1); // both in b: NOT external
    const ext = new Variable(2, 0, 1);
    new Block(ctr, ext);
    const external = new Constraint(ext, v0, 1); // v0 in b, ext outside: external
    void internal;
    b.setUpInConstraints();
    expect(b.in).toContain(external);
    expect(b.in).not.toContain(internal);
  });

  it('only external constraints are added to the out heap', () => {
    const ctr = timeCtr();
    const v0 = new Variable(0, 0, 1);
    const v1 = new Variable(1, 0, 1);
    const b = new Block(ctr, v0);
    b.addVariable(v1);
    const internal = new Constraint(v0, v1, 1); // both in b: NOT external
    const ext = new Variable(2, 0, 1);
    new Block(ctr, ext);
    const external = new Constraint(v0, ext, 1); // v0 in b, ext outside: external
    void internal;
    b.setUpOutConstraints();
    expect(b.out).toContain(external);
    expect(b.out).not.toContain(internal);
  });
});

describe('Block — deleteMinInConstraint / deleteMinOutConstraint', () => {
  it('deleteMinInConstraint pops the heap min from `in`', () => {
    const ctr = timeCtr();
    const v0 = new Variable(0, 0, 1);
    const b = new Block(ctr, v0);
    const ext = new Variable(1, 0, 1);
    new Block(ctr, ext);
    b.in = [new Constraint(ext, v0, 1)];
    b.deleteMinInConstraint();
    expect(b.in.length).toBe(0);
  });

  it('deleteMinOutConstraint pops the heap min from `out`', () => {
    const ctr = timeCtr();
    const v0 = new Variable(0, 0, 1);
    const b = new Block(ctr, v0);
    const ext = new Variable(1, 0, 1);
    new Block(ctr, ext);
    b.out = [new Constraint(v0, ext, 1)];
    b.deleteMinOutConstraint();
    expect(b.out.length).toBe(0);
  });
});

describe('Block — computeDfdv v.in branch (canFollowLeft)', () => {
  it('a hub variable with two active IN-edges recurses through both', () => {
    // Star: A --c1--> B <--c2-- C (both c1, c2 have B as the RIGHT
    // endpoint), so from B's perspective both are "in" edges. Seeding the
    // block with B as vars[0] means findMinLM's computeDfdv never takes
    // the v.out loop for the root call (B.out is empty) — only the v.in
    // loop, recursing into both A and C via canFollowLeft.
    const ctr = timeCtr();
    const a = new Variable(0, 0, 1);
    const bVar = new Variable(1, 0, 1);
    const c = new Variable(2, 0, 1);
    const block = new Block(ctr, bVar); // vars[0] = bVar (the hub)
    const blockA = new Block(ctr, a);
    const blockC = new Block(ctr, c);
    const c1 = new Constraint(a, bVar, 1); // a=left, bVar=right
    const c2 = new Constraint(c, bVar, 1); // c=left, bVar=right
    block.mergeTwoArg(blockA, c1);
    block.mergeTwoArg(blockC, c2);
    expect(c1.active).toBe(true);
    expect(c2.active).toBe(true);
    // mergeTwoArg's actual merge target is derived from c.left.block /
    // c.right.block (not necessarily `this`/`b` themselves), so read the
    // surviving block off a variable rather than assuming which local
    // reference survived.
    const survivor = bVar.block!;
    expect(survivor.vars.length).toBe(3);
    const minC = survivor.findMinLM();
    expect(minC).not.toBeNull();
    expect([c1, c2]).toContain(minC);
  });
});

/** Build a 4-variable linear active chain v0-c1->v1-c2->v2-c3->v3 in one block. */
function buildActiveChain(): { block: Block; vs: Variable[]; cs: Constraint[] } {
  const ctr = timeCtr();
  const v0 = new Variable(0, 0, 1);
  const v1 = new Variable(1, 0, 1);
  const v2 = new Variable(2, 0, 1);
  const v3 = new Variable(3, 0, 1);
  const b0 = new Block(ctr, v0);
  const b1 = new Block(ctr, v1);
  const b2 = new Block(ctr, v2);
  const b3 = new Block(ctr, v3);
  const c1 = new Constraint(v0, v1, 1);
  const c2 = new Constraint(v1, v2, 1);
  const c3 = new Constraint(v2, v3, 1);
  b0.mergeTwoArg(b1, c1);
  b0.mergeTwoArg(b2, c2);
  b0.mergeTwoArg(b3, c3);
  expect(b0.vars.length).toBe(4);
  expect(c1.active).toBe(true);
  expect(c2.active).toBe(true);
  expect(c3.active).toBe(true);
  return { block: b0, vs: [v0, v1, v2, v3], cs: [c1, c2, c3] };
}

describe('Block — findMinLM (whole-block recursion via computeDfdv)', () => {
  it('walks the full active tree and returns the constraint with the smallest lm', () => {
    const { block, cs } = buildActiveChain();
    const minC = block.findMinLM();
    expect(minC).not.toBeNull();
    expect(cs).toContain(minC);
  });
});

describe('Block — findMinLMBetween / computeDfdvBetween (processBetweenIn/Out)', () => {
  it('finds the min-LM constraint on the path between the two extreme variables', () => {
    const { block, vs, cs } = buildActiveChain();
    const minC = block.findMinLMBetween(vs[0]!, vs[3]!);
    expect(minC).not.toBeNull();
    expect(cs).toContain(minC);
  });

  it('finds the min-LM constraint between two ADJACENT variables (single-hop path)', () => {
    const { block, vs, cs } = buildActiveChain();
    const minC = block.findMinLMBetween(vs[1]!, vs[2]!);
    expect(minC).toBe(cs[1]); // c2, the only constraint directly between v1,v2
  });
});

describe('Block — splitInto / splitBetween / populateSplit', () => {
  it('splitInto divides the block into two new blocks at the given constraint', () => {
    const { block, cs } = buildActiveChain();
    const c2 = cs[1]!;
    const [l, r] = block.splitInto(c2);
    expect(c2.active).toBe(false);
    expect(l.vars.length).toBe(2); // v0, v1
    expect(r.vars.length).toBe(2); // v2, v3
    expect(block.deleted).toBe(false); // splitInto itself doesn't mark `this` deleted
  });

  it('splitBetween finds the split constraint, splits, and marks the original deleted', () => {
    const { block, vs } = buildActiveChain();
    const [c, l, r] = block.splitBetween(vs[0]!, vs[3]!);
    expect(c).not.toBeNull();
    expect(block.deleted).toBe(true);
    expect(l.vars.length + r.vars.length).toBe(4);
  });
});

describe('Block — cost / desiredWeightedPosition', () => {
  it('cost sums weight*(position-desired)^2 across all variables', () => {
    const ctr = timeCtr();
    const v0 = new Variable(0, 5, 2); // desired 5, weight 2
    const b = new Block(ctr, v0); // posn = 5 (matches desired) -> cost 0
    expect(b.cost()).toBe(0);
  });

  it('desiredWeightedPosition sums weight*(desired-offset) across all variables', () => {
    const ctr = timeCtr();
    const v0 = new Variable(0, 5, 2);
    const v1 = new Variable(1, 10, 1);
    const b = new Block(ctr, v0);
    b.addVariable(v1);
    expect(b.desiredWeightedPosition()).toBe(2 * 5 + 1 * (10 - v1.offset));
  });
});
