// SPDX-License-Identifier: EPL-2.0
import { describe, it, expect } from 'vitest';
import { HtmlParseError } from './htmltable-types.js';
import { DotEngineError, FRIENDLY_MESSAGES } from '../errors.js';

describe('HtmlParseError', () => {
  it('carries the semantic GvError contract additively', () => {
    const e = new HtmlParseError('TABLE');
    expect(e.type).toBe('semantic');
    expect(e.code).toBe('HTML_PARSE_ERROR');
    expect(e.tag).toBe('TABLE');
    expect(e.message).toBe('Unknown HTML element <TABLE>');
    expect(e.friendlyMessage).toBe(FRIENDLY_MESSAGES.HTML_PARSE_ERROR);
    expect(e.name).toBe('HtmlParseError');
  });

  it('is an Error instance', () => {
    expect(new HtmlParseError('x') instanceof Error).toBe(true);
  });

  it('derives from DotEngineError with the Unknown HTML element message', () => {
    const e = new HtmlParseError('i');
    expect(e).toBeInstanceOf(DotEngineError);
    expect(e.code).toBe('HTML_PARSE_ERROR');
    expect(e.message).toBe('Unknown HTML element <i>');
  });

  it('forwards options.cause', () => {
    const cause = new Error('root');
    expect(new HtmlParseError('i', { cause }).cause).toBe(cause);
  });
});
