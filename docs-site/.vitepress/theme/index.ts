// SPDX-License-Identifier: EPL-2.0
import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
// Brand: the Warm Studio palette as VitePress variables, the brand mono
// face self-hosted at the two weights the corporate site loads, and this
// site's own rules for where that face applies. Same stack as plantuml-ts.
import '@knowvah/theme/vitepress';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import './custom.css';
import Playground from './Playground.vue';
import GoldenGallery from './GoldenGallery.vue';
import { DotDiagram } from '@knowvah/vitepress-plugin-dot/client';
import '@knowvah/vitepress-plugin-dot/style.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Playground', Playground);
    app.component('GoldenGallery', GoldenGallery);
    // client-mode ```graphviz fences render via this component (live src engine
    // through the config.ts vite alias).
    app.component('DotDiagram', DotDiagram);
  },
} satisfies Theme;
