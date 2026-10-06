---
sourceHash: 96b80725180c7f6708fcc435c4ad98ed934b7e558b1db664f454212b152ed64d
---
# Brug i browseren

@knowvah/dot-engine bruger ingen API'er, der kun findes i Node, og kan trygt
bundles til browseren. Denne side dækker de to ting, du skal vide, når du kører
klientside.

## Bundling

Biblioteket er almindelige ES-moduler. Enhver moderne bundler (Vite, esbuild, Rollup,
webpack) kan inkludere det. Der er ingen runtime-afhængigheder at eksternalisere og
ingen WASM-artefakter at hoste.

```ts
import { renderSvg } from '@knowvah/dot-engine';

const svg = renderSvg('digraph { a -> b }', 'dot');
document.querySelector('#out')!.innerHTML = svg;
```

Dette sites egen [legeplads](/da/playground) gør præcis det — den importerer
motoren og kalder `renderSvg` i browseren, uden rundtur til en server.

## Tekstmåling

Graphviz har brug for tekstmål for at dimensionere etiketter. @knowvah/dot-engine
håndterer det automatisk:

- **I browseren** (når `document` findes) måler det tekst med den
  native `<canvas>`-2D-kontekst — værtstro, fordi det er den samme skrifttype,
  som browseren renderer SVG'en med.
- **I Node** bruger det som standard den indbyggede **Estimate**-måler — en
  deterministisk, headless-sikker model, der spejler Graphviz' egen
  `estimate_textspan_size`. Der kræves ingen installation af `canvas` eller
  skrifttypefiler for at få korrekt layout i Node; en hintet opslagstabel-måler
  (LUT) er også tilgængelig som tilvalg for mere værtstro dimensionering uden en
  native canvas-afhængighed. Se [Tekstmåling](/da/guide/text-measurement) for,
  hvordan du vælger en måler eksplicit.

Der kræves under ingen omstændigheder skrifttypefiler til layout.

## Webskrifttyper: hvorfor forhåndshentning har betydning

Etiketstørrelser kommer fra at måle tekst med en skrifttype. Hvis en
skrifttypefamilie er deklareret med `@font-face`, men endnu ikke er færdig med at
indlæse, måler browseren i stedet med **reserve**skrifttypen, og layoutet bliver
forkert, når den rigtige skrifttype ankommer. Målt i Chromium med JetBrains Mono:
en etiketboks var **70,68 pt** bred, når den blev målt før skrifttypen var indlæst
(reserve), og **124,8 pt** efter indlæsning.

De asynkrone indgangspunkter (`renderSvgAsync`, `renderAsync`, `renderSvgInto`)
undgår dette: de indsamler de skrifttyper, grafen vil bede om, indlæser dem
gennem `document.fonts` og kører først derefter layout. `renderSvgAsync`
producerede de samme 124,8 pt som måling efter indlæsning.

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg, fontIssues } = await renderSvgAsync(
  'digraph { node [fontname="JetBrains Mono"]; a -> b }',
  'dot',
  { fontTimeoutMs: 5000 },
);
```

- **`fontTimeoutMs`** (standard `3000`) er én frist, der deles af alle
  skrifttypefamilier, ikke pr. familie.
- **`fontIssues`** er en liste af `{ face, reason }`. `reason: 'failed'` betyder, at
  skrifttypen fejlede (for eksempel en 404), eller at dens indlæsning blev afvist;
  `reason: 'timeout'` betyder, at den ikke var indlæst inden for `fontTimeoutMs`.
  I begge tilfælde fortsætter layout med en reserveskrifttype. Hvert problem
  skrives desuden med `console.warn`. Skrifttypeproblemer afviser aldrig
  promiset.
- **Begrænsning:** kun familier deklareret med `@font-face` kan rapporteres.
  En systemskrifttype eller et ukendt familienavn opløses som „indlæst“ (der er
  intet at vente på), så et forkert stavet `fontname` bliver aldrig opført i
  `fontIssues`.
- **Node og Workers** har ikke `document.fonts`, så forhåndshentning af skrifttyper
  springes over, og `fontIssues` er `[]`. Billedkroge virker stadig. Du kan
  angive et `fontSet` (alt med `load(font)`) for at levere dit eget.

## Rendering ind på en side: `renderSvgInto`

```ts
import { renderSvgInto } from '@knowvah/dot-engine';

// <div id="graph"></div>
const { element, fontIssues } = await renderSvgInto('graph', dot, 'dot');
if (fontIssues.length > 0) {
  console.warn('fallback fonts used for', fontIssues.map((i) => i.face));
}
```

Den erstatter børnene af elementet med det angivne id med den renderede
`<svg>` (returneret som `element`) ved hjælp af `DOMParser` og `importNode`,
aldrig `innerHTML`. Et manglende id afvises med `ERR_INVALID_ARG_VALUE`. SVG'en
renses som standard; angiv `sanitize` for at bruge din egen sanitizer eller
`trusted: true` for at springe rensning over. Se afsnittet „Security“ i README
for, hvad renseren fjerner og beholder, og hav en Content-Security-Policy på plads.

## Eksterne billeder: `setImageSizer`

Når en HTML-lignende etiket indeholder et eksternt billede
(`<IMG SRC="logo.png"/>`), har Graphviz brug for billedets iboende dimensioner for
at dimensionere cellen. (En knudes `image=`-attribut dimensioneres ikke: knuden
beholder sin normale boks, som i headless native Graphviz.) Fordi biblioteket ikke
kan læse filsystemet, leverer du en måler:

```ts
import { setImageSizer } from '@knowvah/dot-engine';

setImageSizer((src) => {
  // Return the intrinsic { w, h } for this image source, or null if unknown.
  return { w: 64, h: 64 };
});
```

Hvis dine grafer aldrig refererer til eksterne billeder, behøver du ikke kalde
denne. For at dimensionere billeder asynkront (for eksempel ved at indlæse dem)
kan du i stedet give en asynkron `imageSizer` til `renderSvgAsync`; se [Billeder](/da/guide/images).

## Web Workers

Layout kører synkront, så en stor graf blokerer den tråd, den kører på. Kør den i
en Worker for at holde siden responsiv. Inde i en Worker findes der ikke noget
`document`, så biblioteket måler tekst med et `OffscreenCanvas`, og det
asynkrone API indlæser skrifttyper gennem Workerens eget skrifttypesæt (`self.fonts`).

Skrifttyper i en Worker er adskilt fra sidens: registrér dem i Workeren
med `FontFace`-API'et (CSS-regler med `@font-face` når ikke ud til Workers).

```ts
// graph-worker.ts (module worker)
import { renderSvgAsync } from '@knowvah/dot-engine';

self.fonts.add(new FontFace('Inter', 'url(/fonts/Inter.woff2)'));

self.onmessage = async (e: MessageEvent<string>) => {
  const { svg, fontIssues } = await renderSvgAsync(e.data, 'dot');
  self.postMessage({ svg, fontIssues });
};
```

Rendér med `renderSvgAsync` (eller `renderAsync`) i en Worker, ikke `renderSvg`,
i hvert fald indtil hver webskrifttype er indlæst. Chromium bliver ved med at måle
en skrifttypestreng med reserveskrifttypen, hvis netop den streng blev målt i
Workeren, før skrifttypen var indlæst, selv efter at den er indlæst; det asynkrone
API indlæser skrifttyper, før det måler, så det rammer aldrig dette.

## Hvad du ikke skal forvente

Biblioteket retter sig mod **SVG** (plus tekstformaterne `json` / `xdot` / `dot` /
billedkort). Rasteroutput (PNG/JPG), PostScript/PDF og interaktive/GUI-backends
er uden for omfanget — konvertér SVG'en bagefter, hvis du har brug for et andet
format. Se [Kendte afvigelser](/da/divergences) for den fulde afgrænsning.

## Store grafer: præ-render til SVG

Meget store grafer — cirka **>10k knuder eller nogle få MB DOT-kildekode** — er
upraktiske at lave layout på ved kørsel i browseren. Layout (mincross, ranking,
spline-føring) er superlineært, så dette er et **skalaloft, som deles med
upstream Graphviz, ikke en begrænsning specifik for denne motor**: på sådanne input
løber native `dot`, WASM-builds (`@hpcc-js/wasm-graphviz`) og denne motor alle
ind i timeout eller løber tør for hukommelse. (Denne motor lækker **ikke** — dens
heap pr. render er flad; grænsen er udelukkende grafstørrelsen. Se
[ydelsesoversigten](/perf) for den målte sammenligning.)

For grafer i den skala skal du **rendere én gang ved byggetidspunktet og servere den
resulterende `.svg`** frem for at lave layout i browseren ved hver visning — det
samme mønster, du ville bruge selv med native `dot`, da det er for langsomt at køre
pr. forespørgsel.

Site-adapterne til byggetidspunktet i
[knowvah/dot-plugins](https://github.com/knowvah/dot-plugins) (udgivet på NPM)
gør præcis dette:

- `@knowvah/vitepress-plugin-dot` — VitePress (markdown-it), byggetid
- `@knowvah/eleventy-plugin-dot` — Eleventy (markdown-it), byggetid
- `@knowvah/docusaurus-plugin-dot` — Docusaurus (MDX/remark), byggetid
- `@knowvah/dot-markdown-it` — rammeuafhængig markdown-it-integration

For dynamiske, brugerleverede grafer, hvor rendering ved byggetidspunktet ikke er en
mulighed, hold da den interaktive rendering til grafer af rimelig størrelse og cache
den udsendte SVG.
