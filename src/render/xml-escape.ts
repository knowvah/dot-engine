// SPDX-License-Identifier: EPL-2.0
//
// The SVG renderer's three gv_xml_escape flag sets (lib/util/xml.c), as presets
// over the faithful port in util/xml.ts. '<', '>', '"' and "'" are always
// escaped; '&' is escaped only when it does not begin an entity
// (xml_isentity), except under raw, which escapes every '&'.

import { gvXmlEscape, type XmlFlags } from '../util/xml.js';

/** flags {0}. @see plugin/core/gvrender_core_svg.c:svg_begin_anchor (href) */
const FLAGS_BASE: XmlFlags = { raw: false, dash: false, nbsp: false, utf8: false };
/** gvputs_xml's flags. @see lib/gvc/gvdevice.c:gvputs_xml */
const FLAGS_TITLE: XmlFlags = { raw: false, dash: true, nbsp: true, utf8: false };
/** @see plugin/core/gvrender_core_svg.c:svg_textspan, svg_begin_anchor (tooltip) */
const FLAGS_TEXT: XmlFlags = { raw: true, dash: true, nbsp: true, utf8: false };

/**
 * Base XML escape (gv_xml_escape with flags {0}): ids, hrefs.
 * @see lib/util/xml.c:gv_xml_escape
 */
export function escapeXml(s: string): string {
  return gvXmlEscape(s, FLAGS_BASE);
}

/**
 * Title/id/class XML escape (gv_xml_escape with flags {dash, nbsp} — C's
 * gvputs_xml): base escaping plus '-'→&#45; and 2nd+ consecutive
 * spaces→&#160;, WITHOUT the raw flag (entity-aware '&', no \n/\r
 * escapes). Used for <title> content and id/class attribute values.
 * @see lib/gvc/gvdevice.c:gvputs_xml, lib/util/xml.c:xml_core
 */
export function escapeXmlTitle(s: string): string {
  return gvXmlEscape(s, FLAGS_TITLE);
}

/**
 * Text/tooltip XML escape (gv_xml_escape with flags {raw, dash, nbsp}): raw
 * escapes every '&' -- entity-looking or not -- and newline/CR to
 * &#10;/&#13;; also '-'→&#45; and 2nd+ consecutive spaces→&#160;. Used for
 * textspans and xlink:title.
 * @see plugin/core/gvrender_core_svg.c:svg_textspan, svg_begin_anchor
 * @see lib/util/xml.c:xml_core (`flags.raw || !xml_isentity(s)`)
 */
export function escapeXmlText(s: string): string {
  return gvXmlEscape(s, FLAGS_TEXT);
}
