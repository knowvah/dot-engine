// SPDX-License-Identifier: EPL-2.0
/**
 * User-visible strings of the site's interactive components (Playground,
 * GoldenGallery, the stale-translation banner), with English defaults.
 *
 * This module is client-safe — no Node built-ins — because the theme
 * components import it. Each locale supplies its own `ComponentStrings` in
 * `.vitepress/locales/<prefix>.ts`; `config.ts` exposes them to the client as
 * `themeConfig.componentsByLang`, and components resolve the active one with
 * `pickStrings(useData().lang.value, useData().theme.value.componentsByLang)`.
 * The registry itself (`i18n.ts`) reads the filesystem and stays build-side.
 *
 * A translated page that names a control ("Export SVG") must use the same
 * string its component shows — the translation lint enforces it.
 */

export interface ComponentStrings {
  /** Playground engine `<select>` label (rendered with a trailing colon). */
  engineLabel: string;
  exportSvg: string;
  exportPng: string;
  /** Playground editor aria-label; GoldenGallery source `<summary>`. */
  dotSource: string;
  /** Playground output pane aria-label. */
  renderedSvg: string;
  /** GoldenGallery fallback when a render error has no friendly message. */
  renderFailed: string;
  /** GoldenGallery thumbnail tooltip. */
  clickToEnlarge: string;
  /** GoldenGallery placeholder while a golden renders. */
  rendering: string;
  /** GoldenGallery modal close-button aria-label. */
  close: string;
  /** Stale-translation banner body. */
  staleNotice: string;
  /** Stale-translation banner link to the English page. */
  staleLink: string;
}

export const EN_COMPONENTS: ComponentStrings = {
  engineLabel: 'Engine',
  exportSvg: 'Export SVG',
  exportPng: 'Export PNG',
  dotSource: 'DOT source',
  renderedSvg: 'Rendered SVG',
  renderFailed: 'Render failed',
  clickToEnlarge: 'Click to enlarge',
  rendering: 'rendering…',
  close: 'Close',
  staleNotice:
    'The English version of this page has changed since it was translated.',
  staleLink: 'Read the current English page',
};

/**
 * The strings for `lang` from a `lang → strings` table, or English when the
 * table is absent or has no entry for it (the root locale never has one).
 */
export function pickStrings(
  lang: string,
  byLang: Readonly<Record<string, ComponentStrings>> | undefined,
): ComponentStrings {
  return byLang?.[lang] ?? EN_COMPONENTS;
}
