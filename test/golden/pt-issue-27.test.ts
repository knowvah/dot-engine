// SPDX-License-Identifier: EPL-2.0

/**
 * plantuml-ts issue 27: `digraph g { node { shape=box } a -> b }` rendered in
 * the port, but native dot rejects it with `syntax error in line 1 near '{'`.
 *
 * Mechanism: the port's AttrList had an empty alternative, so a bare `node`
 * keyword parsed as an attr statement and the following `{ ... }` then parsed
 * as an anonymous subgraph. C requires at least one bracket group:
 * `attrstmt : attrtype optmacroname attrlist`,
 * `attrlist : optattr '[' optattrdefs ']'`.
 *
 * @see lib/cgraph/grammar.y (attrstmt, attrlist)
 * @see src/parser/dot.pegjs AttrList
 */

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderSvg } from '../../src/index.js';
import { ParseError } from '../../src/parser/index.js';

const INPUT = fileURLToPath(new URL('./inputs/pt-issue-27.dot', import.meta.url));

describe('pt-issue-27: attr keyword without bracket list', () => {
  test('renderSvg rejects `node { ... }` with SYNTAX_ERROR like native dot', () => {
    const dot = readFileSync(INPUT, 'utf8');
    let err: unknown;
    try {
      renderSvg(dot, 'dot');
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ParseError);
    expect((err as ParseError).code).toBe('SYNTAX_ERROR');
  });
});
