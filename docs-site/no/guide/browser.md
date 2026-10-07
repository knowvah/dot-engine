---
sourceHash: 96b80725180c7f6708fcc435c4ad98ed934b7e558b1db664f454212b152ed64d
---
# Bruk i nettleseren

@knowvah/dot-engine bruker ingen API-er som bare finnes i Node, og er trygt å bunte for nettleseren. Denne
siden dekker de to tingene du må vite når du kjører på klientsiden.

## Bunting

Biblioteket er vanlige ES-moduler. Enhver moderne bundler (Vite, esbuild, Rollup,
webpack) kan ta det med. Det finnes ingen kjøretidsavhengigheter som må eksternaliseres, og ingen
WASM-artefakter som må hostes.

```ts
import { renderSvg } from '@knowvah/dot-engine';

const svg = renderSvg('digraph { a -> b }', 'dot');
document.querySelector('#out')!.innerHTML = svg;
```

[Lekeplassen](/no/playground) på dette nettstedet gjør akkurat det — den importerer
motoren og kaller `renderSvg` i nettleseren, uten rundtur til en server.

## Tekstmåling

Graphviz trenger tekstdimensjoner for å fastsette størrelsen på etiketter. @knowvah/dot-engine håndterer dette
automatisk:

- **I nettleseren** (når `document` finnes) måler det tekst med den
  native 2D-konteksten til `<canvas>` — vertstro, siden det er den samme fonten
  nettleseren rendrer SVG-en med.
- **I Node** bruker det som standard den innebygde **Estimate**-måleren — en
  deterministisk, hodeløs-sikker modell som speiler Graphviz' egen
  `estimate_textspan_size`. Ingen installasjon av `canvas` og ingen fontfiler trengs for
  å få riktig layout i Node; en hintet oppslagstabell-måler (LUT) er også
  tilgjengelig som et valg for tettere vertstro størrelsesberegning uten en innebygd
  canvas-avhengighet. Se [Tekstmåling](/no/guide/text-measurement) for hvordan du
  velger en måler eksplisitt.

Ingen fontfiler trengs for layout uansett.

## Webfonter: hvorfor forhåndslasting er viktig

Etikettstørrelser kommer fra å måle tekst med en font. Hvis en skrifttype er deklarert med
`@font-face` men ikke er ferdig lastet, måler nettleseren med **reserve**-fonten
i stedet, og layouten blir feil når den virkelige fonten kommer.
Målt i Chromium med JetBrains Mono: en etikettboks var **70,68 pt** bred når den ble
målt før skrifttypen var lastet (reserve) og **124,8 pt** etter at den var lastet.

De asynkrone inngangspunktene (`renderSvgAsync`, `renderAsync`, `renderSvgInto`) unngår
dette: de samler fontene grafen vil be om, laster dem via
`document.fonts`, og kjører først deretter layout. `renderSvgAsync` ga de
samme 124,8 pt som å måle etter lasting.

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg, fontIssues } = await renderSvgAsync(
  'digraph { node [fontname="JetBrains Mono"]; a -> b }',
  'dot',
  { fontTimeoutMs: 5000 },
);
```

- **`fontTimeoutMs`** (standard `3000`) er én frist som deles av alle skrifttyper, ikke
  per skrifttype.
- **`fontIssues`** er en liste med `{ face, reason }`. `reason: 'failed'` betyr at
  skrifttypen feilet (for eksempel en 404) eller at lastingen ble avvist; `reason: 'timeout'`
  betyr at den ikke var lastet innen `fontTimeoutMs`. I begge tilfeller fortsetter layouten
  med en reservefont. Hvert problem skrives også ut med `console.warn`. Fontproblemer avviser aldri
  promiset.
- **Begrensning:** bare familier deklarert med `@font-face` kan rapporteres.
  En systemfont eller et ukjent familienavn løses som «lastet» (det er ingenting
  å vente på), så en feilstavet `fontname` blir aldri oppført i `fontIssues`.
- **Node og Workers** har ingen `document.fonts`, så forhåndslasting av fonter hoppes over og
  `fontIssues` er `[]`. Bildekrokene fungerer fortsatt. Du kan sende inn en `fontSet`
  (alt med `load(font)`) for å levere din egen.

## Rendre inn i en side: `renderSvgInto`

```ts
import { renderSvgInto } from '@knowvah/dot-engine';

// <div id="graph"></div>
const { element, fontIssues } = await renderSvgInto('graph', dot, 'dot');
if (fontIssues.length > 0) {
  console.warn('fallback fonts used for', fontIssues.map((i) => i.face));
}
```

Den erstatter barna til elementet med den gitte id-en med den rendrede
`<svg>` (returnert som `element`), ved hjelp av `DOMParser` og `importNode`, aldri
`innerHTML`. En manglende id avviser med `ERR_INVALID_ARG_VALUE`. SVG-en
renses som standard; send `sanitize` for å bruke din egen sanitizer, eller `trusted: true`
for å hoppe over sanitering. Se README-delen «Security» for hva renseren
fjerner og beholder, og ha en Content-Security-Policy på plass.

## Eksterne bilder: `setImageSizer`

Når en HTML-lignende etikett inneholder et eksternt bilde
(`<IMG SRC="logo.png"/>`), trenger Graphviz bildets egenmål for å
fastsette cellens størrelse. (Attributtet `image=` på en node får ikke størrelse beregnet: noden beholder sin
vanlige boks, som i hodeløs native Graphviz.) Siden biblioteket ikke kan
lese filsystemet, leverer du en måler:

```ts
import { setImageSizer } from '@knowvah/dot-engine';

setImageSizer((src) => {
  // Return the intrinsic { w, h } for this image source, or null if unknown.
  return { w: 64, h: 64 };
});
```

Hvis grafene dine aldri refererer til eksterne bilder, trenger du ikke kalle denne.
For å beregne bildestørrelser asynkront (for eksempel ved å laste dem), send en asynkron
`imageSizer` til `renderSvgAsync` i stedet; se [Bilder](/no/guide/images).

## Web Workers

Layout kjører synkront, så en stor graf blokkerer tråden den kjører på. Kjør
den i en Worker for å holde siden responsiv. Inne i en Worker finnes det ingen
`document`, så biblioteket måler tekst med en `OffscreenCanvas`, og det
asynkrone API-et laster fonter via Workerens eget fontsett (`self.fonts`).

Fonter i en Worker er adskilt fra sidens: registrer dem i Workeren
med `FontFace`-API-et (CSS-regler med `@font-face` når ikke fram til Workers).

```ts
// graph-worker.ts (module worker)
import { renderSvgAsync } from '@knowvah/dot-engine';

self.fonts.add(new FontFace('Inter', 'url(/fonts/Inter.woff2)'));

self.onmessage = async (e: MessageEvent<string>) => {
  const { svg, fontIssues } = await renderSvgAsync(e.data, 'dot');
  self.postMessage({ svg, fontIssues });
};
```

Render med `renderSvgAsync` (eller `renderAsync`) i en Worker, ikke `renderSvg`,
i hvert fall til hver webfont er lastet. Chromium fortsetter å måle en fontstreng
med reserveskrifttypen hvis akkurat den strengen ble målt i Workeren før
skrifttypen var lastet, selv etter at den er lastet; det asynkrone API-et laster fonter før det
måler, så det treffer aldri dette.

## Hva du ikke bør forvente

Biblioteket retter seg mot **SVG** (pluss tekstformatene `json` / `xdot` / `dot` / bildekart).
Rasterutdata (PNG/JPG), PostScript/PDF og interaktive/GUI-backender
er utenfor omfanget — konverter SVG-en i etterkant hvis du trenger et annet format. Se
[Kjente avvik](/no/divergences) for hele avgrensningen.

## Store grafer: forhåndsrendre til SVG

Svært store grafer — omtrent **>10 000 noder eller noen få MB DOT-kildekode** — er
upraktiske å legge ut ved kjøretid i nettleseren. Layout (mincross, rangering,
splineruting) er superlineær, så dette er et **skalataket som deles med
upstream Graphviz, ikke en begrensning som er spesifikk for denne motoren**: på slike inndata
går native `dot`, WASM-byggene (`@hpcc-js/wasm-graphviz`) og denne motoren alle
tom for tid eller minne på samme måte. (Denne motoren **lekker ikke** — heapen per
rendering er flat; grensen er strengt tatt grafstørrelsen. Se
[ytelsesoversikten](/perf) for den målte sammenligningen.)

For grafer i den skalaen bør du **rendre én gang ved byggetidspunktet og servere den resulterende
`.svg`-filen** i stedet for å legge ut i nettleseren ved hver visning — det samme mønsteret
du ville brukt selv med native `dot`, siden det er for tregt å kjøre per forespørsel.

Nettstedsadapterne for byggetid i
[knowvah/dot-plugins](https://github.com/knowvah/dot-plugins) (publisert på NPM)
gjør akkurat dette:

- `@knowvah/vitepress-plugin-dot` — VitePress (markdown-it), byggetid
- `@knowvah/eleventy-plugin-dot` — Eleventy (markdown-it), byggetid
- `@knowvah/docusaurus-plugin-dot` — Docusaurus (MDX/remark), byggetid
- `@knowvah/dot-markdown-it` — rammeverkuavhengig markdown-it-integrasjon

For dynamiske, brukerleverte grafer der rendering ved byggetid ikke er et alternativ,
hold interaktiv rendering til grafer av rimelig størrelse og mellomlagre den utsendte SVG-en.
