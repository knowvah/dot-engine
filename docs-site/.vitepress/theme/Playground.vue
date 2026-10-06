<!-- SPDX-License-Identifier: EPL-2.0 -->
<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { useData } from 'vitepress';
// Aliased in .vitepress/config.ts to the real engine source (src/index.ts),
// so the playground always runs the library exactly as shipped.
import { renderSvg } from '@knowvah/dot-engine';
// Client-side DOT syntax highlighting, reusing the SAME grammar the docs code
// blocks use (single source of truth). Shiki runs in the browser here over a
// transparent-textarea overlay with its pure-JS regex engine (no WASM); the
// plain textarea still works if it fails to load (progressive enhancement).
import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import githubLight from '@shikijs/themes/github-light';
import githubDark from '@shikijs/themes/github-dark';
import { dotLang } from '../dot.tmLanguage';
import { pickStrings } from './strings';

const ENGINES = [
  'dot', 'neato', 'fdp', 'sfdp', 'circo', 'twopi', 'osage', 'patchwork',
];

const DEFAULT_DOT = `digraph G {
  rankdir=LR;
  a -> b -> c;
  a -> c;
}`;

const props = defineProps<{
  initial?: string;
  engine?: string;
  height?: string;
}>();

// Control labels in the page's language. The registry (i18n.ts) reads the
// filesystem, so config.ts publishes each locale's strings as
// themeConfig.componentsByLang; English for the root or an unknown lang.
const { lang, theme } = useData();
const t = computed(() => pickStrings(lang.value, theme.value.componentsByLang));

const source = ref(props.initial ?? DEFAULT_DOT);
const engine = ref(props.engine ?? 'dot');
const svg = ref('');
const error = ref('');

// --- syntax-highlight overlay ---
const highlighted = ref('');
const overlaid = ref(false); // true once the highlighter has painted a layer
const highlightEl = ref<HTMLElement | null>(null);
let highlighter: HighlighterCore | undefined;

function paintHighlight(): void {
  if (!highlighter) return;
  // Trailing newline keeps the highlight layer's height in step with the
  // textarea while the last line is being typed.
  highlighted.value = highlighter.codeToHtml(`${source.value}\n`, {
    lang: 'dot',
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false,
  });
  overlaid.value = true;
}

function syncScroll(e: Event): void {
  const ta = e.target as HTMLTextAreaElement;
  if (highlightEl.value) {
    highlightEl.value.scrollTop = ta.scrollTop;
    highlightEl.value.scrollLeft = ta.scrollLeft;
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;

function renderNow(): void {
  // Render is client-only; layout uses the browser's native canvas measurer.
  if (typeof window === 'undefined') return;
  try {
    svg.value = renderSvg(source.value, engine.value);
    error.value = '';
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
}

function scheduleRender(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(renderNow, 250);
}

onMounted(async () => {
  renderNow();
  try {
    highlighter = await createHighlighterCore({
      themes: [githubLight, githubDark],
      langs: [dotLang],
      // Pure-JS regex engine: the DOT grammar is simple enough that the
      // JavaScript engine covers it fully, and it keeps the site's
      // no-WASM promise (the Oniguruma engine ships a .wasm binary).
      engine: createJavaScriptRegexEngine(),
    });
    paintHighlight();
  } catch {
    // Highlighter unavailable — the plain (visible) textarea keeps working.
  }
});

// --- export ---
// Raster scale for PNG export: 2× the SVG's CSS-pixel size so the image stays
// crisp on high-DPI displays and when zoomed.
const PNG_SCALE = 2;
const EXPORT_BASENAME = 'graph';

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // Defer revocation so the browser has started the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function exportSvg(): void {
  // renderSvg emits a complete standalone document (XML prolog + doctype).
  downloadBlob(
    new Blob([svg.value], { type: 'image/svg+xml' }),
    `${EXPORT_BASENAME}.svg`,
  );
}

function svgToPng(markup: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(
      new Blob([markup], { type: 'image/svg+xml' }),
    );
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(img.naturalWidth * PNG_SCALE);
      canvas.height = Math.ceil(img.naturalHeight * PNG_SCALE);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }
      // No background fill: the SVG paints its own bgcolor polygon, and a
      // bgcolor=transparent graph should stay transparent in the PNG.
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('PNG encoding failed'))),
        'image/png',
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not rasterize the SVG'));
    };
    img.src = url;
  });
}

async function exportPng(): Promise<void> {
  try {
    downloadBlob(await svgToPng(svg.value), `${EXPORT_BASENAME}.png`);
  } catch (e) {
    error.value = `PNG export failed: ${e instanceof Error ? e.message : String(e)}`;
  }
}

watch(source, () => { paintHighlight(); scheduleRender(); });
watch(engine, scheduleRender);
</script>

<template>
  <div class="gv-playground">
    <div class="gv-toolbar">
      <label>
        {{ t.engineLabel }}:
        <select v-model="engine">
          <option v-for="e in ENGINES" :key="e" :value="e">{{ e }}</option>
        </select>
      </label>
      <div class="gv-export">
        <button type="button" :disabled="!svg || !!error" @click="exportSvg">
          {{ t.exportSvg }}
        </button>
        <button type="button" :disabled="!svg || !!error" @click="exportPng">
          {{ t.exportPng }}
        </button>
      </div>
    </div>
    <div class="gv-panes" :style="{ height: props.height ?? '420px' }">
      <div class="gv-editor">
        <div
          ref="highlightEl"
          class="gv-highlight"
          aria-hidden="true"
          v-html="highlighted"
        ></div>
        <textarea
          v-model="source"
          class="gv-input"
          :class="{ overlaid }"
          spellcheck="false"
          autocapitalize="off"
          autocomplete="off"
          :aria-label="t.dotSource"
          @scroll="syncScroll"
        ></textarea>
      </div>
      <div class="gv-output" :aria-label="t.renderedSvg">
        <pre v-if="error" class="gv-error">{{ error }}</pre>
        <div v-else class="gv-svg" v-html="svg"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gv-playground {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  margin: 1rem 0;
}
.gv-toolbar {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 0.85rem;
}
.gv-toolbar select {
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 0.15rem 0.4rem;
  background: var(--vp-c-bg);
}
.gv-export {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}
.gv-export button {
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 0.15rem 0.6rem;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
}
.gv-export button:hover:not(:disabled) {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
.gv-export button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.gv-panes {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

/* Editor: a highlighted layer behind a transparent textarea. Both must share
   identical text metrics so the caret lines up with the painted glyphs. */
.gv-editor {
  position: relative;
  border-right: 1px solid var(--vp-c-divider);
  overflow: hidden;
  background: var(--vp-c-bg);
}
.gv-highlight,
.gv-input {
  margin: 0;
  padding: 0.75rem;
  font-family: var(--vp-font-family-mono);
  font-size: 0.85rem;
  line-height: 1.5;
  tab-size: 4;
  white-space: pre;
  word-wrap: normal;
  overflow-wrap: normal;
  border: none;
}
.gv-highlight {
  position: absolute;
  inset: 0;
  overflow: auto;
  pointer-events: none;
}
.gv-highlight :deep(pre.shiki) {
  margin: 0;
  padding: 0;
  background: transparent !important;
  font: inherit;
}
.gv-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  resize: none;
  outline: none;
  background: transparent;
  color: var(--vp-c-text-1); /* visible until the highlight layer paints */
  caret-color: var(--vp-c-text-1);
  overflow: auto;
}
.gv-input.overlaid {
  color: transparent; /* text is shown by the layer behind; keep the caret */
}
.gv-output {
  overflow: auto;
  padding: 0.75rem;
  background: #fff;
}
.gv-svg :deep(svg) {
  max-width: 100%;
  height: auto;
}
.gv-error {
  color: var(--vp-c-danger-1);
  white-space: pre-wrap;
  font-size: 0.8rem;
  margin: 0;
}
@media (max-width: 640px) {
  .gv-panes {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
    height: auto !important;
  }
}
</style>

<style>
/* UNSCOPED on purpose. defaultColor:false emits token colors as
   --shiki-light/--shiki-dark CSS variables, not a `color`; these rules map
   them to the live color, switching on VitePress's html.dark. They cannot
   live in the scoped block: Vue does not support :global() as an ancestor
   combinator, so a scoped `html.dark …` rule never matches and dark mode
   would paint the light palette onto the dark background. */
.gv-playground .gv-highlight .shiki,
.gv-playground .gv-highlight .shiki span {
  color: var(--shiki-light);
}
html.dark .gv-playground .gv-highlight .shiki,
html.dark .gv-playground .gv-highlight .shiki span {
  color: var(--shiki-dark);
}
</style>
