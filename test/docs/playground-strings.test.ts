// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EN, type DocsLocale } from '../../docs-site/.vitepress/i18n.js';
import {
  EN_COMPONENTS,
  pickStrings,
} from '../../docs-site/.vitepress/theme/strings.js';

const PLAYGROUND = readFileSync(
  fileURLToPath(
    new URL('../../docs-site/.vitepress/theme/Playground.vue', import.meta.url),
  ),
  'utf8',
);
const TEMPLATE = PLAYGROUND.slice(PLAYGROUND.indexOf('<template>'));

const DE_FIXTURE: DocsLocale = {
  label: 'Deutsch',
  lang: 'de-DE',
  ui: EN,
  components: { ...EN_COMPONENTS, exportSvg: 'SVG exportieren' },
};

/** The table config.ts publishes as `themeConfig.componentsByLang`. */
const BY_LANG = { [DE_FIXTURE.lang]: DE_FIXTURE.components };

describe('Playground strings', () => {
  it('resolves a registered locale through its lang', () => {
    expect(pickStrings('de-DE', BY_LANG).exportSvg).toBe('SVG exportieren');
  });

  it('uses English for the root and for an unregistered lang', () => {
    expect(pickStrings('en-US', BY_LANG)).toBe(EN_COMPONENTS);
    expect(pickStrings('fr-FR', BY_LANG)).toBe(EN_COMPONENTS);
  });

  it('binds every control label to the resolved strings', () => {
    expect(PLAYGROUND).toContain(
      'pickStrings(lang.value, theme.value.componentsByLang)',
    );
    expect(TEMPLATE).toContain('{{ t.engineLabel }}:');
    expect(TEMPLATE).toContain('{{ t.exportSvg }}');
    expect(TEMPLATE).toContain('{{ t.exportPng }}');
    expect(TEMPLATE).toContain(':aria-label="t.dotSource"');
    expect(TEMPLATE).toContain(':aria-label="t.renderedSvg"');
  });

  it('keeps no English control literal in the template', () => {
    const literals = [
      EN_COMPONENTS.engineLabel,
      EN_COMPONENTS.exportSvg,
      EN_COMPONENTS.exportPng,
      EN_COMPONENTS.dotSource,
      EN_COMPONENTS.renderedSvg,
    ];
    expect(literals.filter((s) => TEMPLATE.includes(s))).toEqual([]);
  });
});
