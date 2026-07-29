// SPDX-License-Identifier: EPL-2.0
import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
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
