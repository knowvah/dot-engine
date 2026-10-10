// SPDX-License-Identifier: EPL-2.0

import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { readFileSync, readdirSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { setImageResolver } from '../gvc/image-resolver.js';
import { setImageSizer } from '../gvc/usershape.js';
import { parse } from '../parser/index.js';
import { render } from '../render/public.js';
import { scrubSvgDocument, scrubSvgString } from './sanitize.js';
import type { SvgParserLike, SvgSerializerLike } from './sanitize.js';

const SVG_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">';
const SVG_CLOSE = '</svg>';
const SVG_MIME = 'image/svg+xml';
const GOLDEN_DIR = new URL('../../test/golden/inputs/', import.meta.url);
const GOLDEN_SAMPLE_COUNT = 40;

// xmldom's DOMParser/XMLSerializer satisfy the structural parameter types;
// its Document is not the lib.dom Document, hence the cast at this boundary.
const parser = new DOMParser({ onError: () => undefined }) as unknown as SvgParserLike;
const serializer = new XMLSerializer() as unknown as SvgSerializerLike;

function scrub(body: string, prolog = ''): string {
  return scrubSvgString(`${prolog}${SVG_OPEN}${body}${SVG_CLOSE}`, parser, serializer);
}

function roundTrip(svg: string): string {
  const doc = parser.parseFromString(svg, SVG_MIME);
  return serializer.serializeToString(doc);
}

describe('scrubSvgString: script and foreignObject', () => {
  it('removes <script> with its content, keeping siblings', () => {
    const out = scrub('<script>alert(1)</script><g id="keep"/>');
    expect(out).not.toContain('script');
    expect(out).not.toContain('alert');
    expect(out).toContain('<g id="keep"');
  });

  it('removes <foreignObject> with its subtree', () => {
    const out = scrub('<foreignObject><div xmlns="http://www.w3.org/1999/xhtml">x</div></foreignObject><g id="keep"/>');
    expect(out).not.toMatch(/foreignObject/i);
    expect(out).not.toContain('div');
    expect(out).toContain('id="keep"');
  });

  it('matches element names case-insensitively and ignores namespace prefix', () => {
    const out = scrub(
      '<SCRIPT>a()</SCRIPT><svg:script xmlns:svg="http://www.w3.org/2000/svg">b()</svg:script>' +
        '<FOREIGNOBJECT/><g id="keep"/>',
    );
    expect(out).not.toMatch(/script|foreignobject|a\(\)|b\(\)/i);
    expect(out).toContain('id="keep"');
  });

  it('removes a script nested deep inside groups', () => {
    const out = scrub('<g><g><g><script>x()</script><rect id="r"/></g></g></g>');
    expect(out).not.toContain('script');
    expect(out).toContain('id="r"');
  });

  it('removes an HTML-namespaced script outside foreignObject', () => {
    const out = scrub('<script xmlns="http://www.w3.org/1999/xhtml">x()</script>');
    expect(out).not.toContain('x()');
  });
});

describe('scrubSvgString: event handler attributes', () => {
  it('removes onclick and ONLOAD, keeps other attributes', () => {
    const out = scrub('<rect onclick="a()" ONLOAD="b()" ONMouseOver="c()" id="r" fill="red"/>');
    expect(out).not.toMatch(/onclick|onload|onmouseover/i);
    expect(out).toContain('id="r"');
    expect(out).toContain('fill="red"');
  });

  it('removes on* from the root element', () => {
    const out = scrubSvgString(
      '<svg xmlns="http://www.w3.org/2000/svg" onload="x()" width="5"/>',
      parser,
      serializer,
    );
    expect(out).not.toContain('onload');
    expect(out).toContain('width="5"');
  });

  it('removes namespace-prefixed on* attributes', () => {
    const out = scrub('<rect xmlns:x="urn:x" x:onclick="a()" id="r"/>');
    expect(out).not.toContain('onclick');
    expect(out).toContain('id="r"');
  });

  it('removes on* attributes carried by an <a>', () => {
    const out = scrub('<a onfocusin="a()" onactivate="b()" id="l"/>');
    expect(out).not.toMatch(/onfocusin|onactivate/);
    expect(out).toContain('id="l"');
  });
});

describe('scrubSvgString: href schemes', () => {
  it('removes " JaVa\\tScript:" xlink:href and keeps the element', () => {
    const out = scrub('<a xlink:href=" JaVa\tScript:alert(1)" id="l"><text>t</text></a>');
    expect(out).not.toMatch(/javascript|href/i);
    expect(out).toContain('id="l"');
    expect(out).toContain('<text>t</text>');
  });

  it('removes plain href (no namespace) with javascript:', () => {
    const out = scrub('<a href="javascript:alert(1)" id="l"/>');
    expect(out).not.toContain('href');
    expect(out).toContain('id="l"');
  });

  it('removes a javascript: href obfuscated with every ASCII whitespace/control char', () => {
    const hostile = ['\t', '\n', '\r', '\f', '\v', '\u0000', '\u0001', '\u001f', '\u007f', ' '];
    for (const ch of hostile) {
      const doc = parser.parseFromString(`${SVG_OPEN}<a id="l"/>${SVG_CLOSE}`, SVG_MIME);
      const a = doc.getElementsByTagName('a').item(0) as Element;
      a.setAttribute('href', `${ch}java${ch}script${ch}:alert(1)`);
      scrubSvgDocument(doc);
      expect(a.hasAttribute('href'), JSON.stringify(ch)).toBe(false);
      expect(a.getAttribute('id')).toBe('l');
    }
  });

  it('removes entity-encoded schemes as they appear after XML parsing', () => {
    const variants = [
      'jav&#x61;script:alert(1)',
      '&#106;avascript:alert(1)',
      'java&#9;script:alert(1)',
      'java&#x0A;script:alert(1)',
      'java&#13;script:alert(1)',
      '&#x6A;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;&#x3A;alert(1)',
      '&#32;javascript:alert(1)',
      'javascript&#58;alert(1)',
    ];
    for (const value of variants) {
      const out = scrub(`<a xlink:href="${value}" id="l"/>`);
      expect(out, value).not.toContain('href');
      expect(out, value).toContain('id="l"');
    }
  });

  it('removes vbscript: in any case', () => {
    const out = scrub('<a xlink:href="VBScript:msgbox(1)" id="l"/>');
    expect(out).not.toContain('href');
  });

  it('removes data:text/html on <a>', () => {
    const out = scrub('<a href="data:text/html,&lt;script&gt;alert(1)&lt;/script&gt;" id="l"/>');
    expect(out).not.toContain('href');
    expect(out).toContain('id="l"');
  });

  it('removes DATA: variants with leading whitespace', () => {
    const out = scrub('<a xlink:href="\n DaTa:text/html;base64,AAAA" id="l"/>');
    expect(out).not.toContain('href');
  });

  it('removes data:image/* from non-<image> elements', () => {
    const out = scrub('<a xlink:href="data:image/png;base64,AAAA" id="l"/><use href="data:image/svg+xml,x"/>');
    expect(out).not.toContain('href');
  });

  it('removes data:image/svg+xml-less non-image data on <image>', () => {
    const out = scrub('<image xlink:href="data:text/html,x" id="i"/><image href="data:application/x,y"/>');
    expect(out).not.toContain('href');
    expect(out).toContain('id="i"');
  });

  it('keeps data:image/* on <image>, with xlink:href and plain href', () => {
    const out = scrub(
      '<image xlink:href="data:image/png;base64,iVBORw0K" id="a"/>' +
        '<image href="DATA:IMAGE/jpeg;base64,/9j/" id="b"/>',
    );
    expect(out).toContain('xlink:href="data:image/png;base64,iVBORw0K"');
    expect(out).toContain('href="DATA:IMAGE/jpeg;base64,/9j/"');
  });

  it('matches <image> case-insensitively and with a prefix', () => {
    const out = scrub('<svg:image xmlns:svg="http://www.w3.org/2000/svg" href="data:image/png;base64,AA"/>');
    expect(out).toContain('data:image/png');
  });

  it('keeps benign hrefs (relative, http, fragment) and matches only the scheme prefix', () => {
    const out = scrub(
      '<a xlink:href="http://example.com/javascript:x" id="a"/>' +
        '<a href="#frag" id="b"/><a href="notjavascript:x" id="c"/><a href="/data:x" id="d"/>',
    );
    expect(out).toContain('xlink:href="http://example.com/javascript:x"');
    expect(out).toContain('href="#frag"');
    expect(out).toContain('href="notjavascript:x"');
    expect(out).toContain('href="/data:x"');
  });

  it('does not treat "javascript" inside a non-href attribute as hostile', () => {
    const out = scrub('<a id="l" title="javascript:foo" xlink:title="javascript:bar"/>');
    expect(out).toContain('title="javascript:foo"');
  });

  it('scrubs every href-named attribute regardless of prefix', () => {
    const out = scrub('<a xmlns:q="urn:q" q:href="javascript:x" xlink:href="javascript:y" href="javascript:z"/>');
    expect(out).not.toContain('javascript');
  });
});

describe('scrubSvgString: animation elements', () => {
  it('removes <set attributeName="href"> with javascript target', () => {
    const out = scrub('<a id="l"><set attributeName="href" to="javascript:alert(1)"/></a>');
    expect(out).not.toMatch(/set|javascript/);
    expect(out).toContain('id="l"');
  });

  it('removes animate, animateMotion and animateTransform targeting xlink:href', () => {
    const out = scrub(
      '<a id="l">' +
        '<animate attributeName="xlink:href" values="javascript:a()"/>' +
        '<animateMotion attributeName="href" values="x"/>' +
        '<animateTransform attributeName="XLINK:HREF" values="y"/>' +
        '</a>',
    );
    expect(out).not.toMatch(/animate|javascript/i);
    expect(out).toContain('id="l"');
  });

  it('matches attributeName case-insensitively and trims whitespace', () => {
    const out = scrub('<a><set attributeName=" HrEf\t" to="javascript:x"/></a>');
    expect(out).not.toContain('set');
  });

  it('removes animations targeting an event-handler attribute', () => {
    const out = scrub('<a><set attributeName="onclick" to="alert(1)"/></a>');
    expect(out).not.toContain('set');
  });

  it('removes prefixed animation elements', () => {
    const out = scrub('<a xmlns:s="http://www.w3.org/2000/svg"><s:set attributeName="href" to="javascript:x"/></a>');
    expect(out).not.toContain('set');
  });

  it('keeps animations of unrelated attributes', () => {
    const out = scrub('<rect><animate attributeName="width" from="1" to="9"/><set attributeName="fill" to="red"/></rect>');
    expect(out).toContain('<animate attributeName="width"');
    expect(out).toContain('<set attributeName="fill"');
  });

  it('keeps an animation with no attributeName', () => {
    const out = scrub('<rect><animate from="1" to="9"/></rect>');
    expect(out).toContain('<animate');
  });
});

describe('scrubSvgString: processing instructions', () => {
  it('removes xml-stylesheet before the root element', () => {
    const out = scrub('<g id="keep"/>', '<?xml-stylesheet href="x.css" type="text/css"?>');
    expect(out).not.toContain('xml-stylesheet');
    expect(out).toContain('id="keep"');
  });

  it('removes xml-stylesheet nested inside the document, any case', () => {
    const out = scrub('<g><?XML-Stylesheet href="x.css"?><rect id="r"/></g>');
    expect(out.toLowerCase()).not.toContain('xml-stylesheet');
    expect(out).toContain('id="r"');
  });

  it('keeps other processing instructions', () => {
    const out = scrub('<?other data?><g/>');
    expect(out).toContain('<?other data?>');
  });

  it('leaves non-element, non-PI nodes (text, comments) untouched', () => {
    const out = scrub('<!-- note --><text>hello</text>');
    expect(out).toContain('<!-- note -->');
    expect(out).toContain('hello');
  });
});

describe('scrubSvgDocument', () => {
  it('mutates the given document in place', () => {
    const doc = parser.parseFromString(`${SVG_OPEN}<script/><rect onclick="x()"/>${SVG_CLOSE}`, SVG_MIME);
    scrubSvgDocument(doc);
    expect(doc.getElementsByTagName('script').length).toBe(0);
    expect(doc.getElementsByTagName('rect').item(0)?.hasAttribute('onclick')).toBe(false);
  });

  it('handles very deep trees without stack overflow', () => {
    const depth = 5000;
    const body = '<g>'.repeat(depth) + '<script/>' + '</g>'.repeat(depth);
    const doc = parser.parseFromString(`${SVG_OPEN}${body}${SVG_CLOSE}`, SVG_MIME);
    scrubSvgDocument(doc);
    expect(doc.getElementsByTagName('script').length).toBe(0);
  });
});

describe('scrubSvgString: benign renderSvg output is untouched', () => {
  afterEach(() => {
    setImageSizer(null);
    setImageResolver(null);
  });

  it('removes nothing from a sample of golden inputs rendered to SVG', () => {
    const files = readdirSync(GOLDEN_DIR)
      .filter((f) => f.endsWith('.dot'))
      .sort()
      .filter((_, i, all) => i % Math.ceil(all.length / GOLDEN_SAMPLE_COUNT) === 0);
    expect(files.length).toBeGreaterThan(10);
    let checked = 0;
    for (const file of files) {
      const dot = readFileSync(new URL(file, GOLDEN_DIR), 'utf8');
      let svg: string;
      try {
        svg = render(parse(dot), 'svg');
      } catch {
        continue; // golden inputs that error in dot are not scrub subjects
      }
      expect(scrubSvgString(svg, parser, serializer), file).toBe(roundTrip(svg));
      checked++;
    }
    expect(checked).toBeGreaterThan(10);
  });

  it('keeps href-bearing nodes and edges (http URL, #fragment)', () => {
    const svg = render(
      parse('digraph { A [URL="http://example.com/a?x=1&y=2"]; B [href="#b"]; A -> B [URL="rel/path"]; }'),
      'svg',
    );
    expect(svg).toContain('xlink:href="http://example.com/a?x=1&amp;y=2"');
    expect(scrubSvgString(svg, parser, serializer)).toBe(roundTrip(svg));
  });

  it('keeps an inlineImages data:image/png <image>', () => {
    setImageSizer((s) => (s === 'logo.png' ? { w: 24, h: 12 } : null));
    setImageResolver((s) =>
      s === 'logo.png' ? { bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]), mime: 'image/png' } : null,
    );
    const svg = render(
      parse('digraph { A [shape=plaintext label=<<TABLE><TR><TD><IMG SRC="logo.png"/></TD></TR></TABLE>>]; }'),
      'svg',
      { inlineImages: true },
    );
    expect(svg).toContain('xlink:href="data:image/png;base64,iVBORw0K"');
    expect(scrubSvgString(svg, parser, serializer)).toBe(roundTrip(svg));
  });

  it('scrubs a hostile href injected via DOT while keeping the node', () => {
    const svg = render(parse('digraph { A [URL="javascript:alert(1)"]; }'), 'svg');
    expect(svg).toContain('javascript:alert(1)');
    const out = scrubSvgString(svg, parser, serializer);
    expect(out).not.toContain('javascript');
    expect(out).toContain('<title>A</title>');
  });
});
