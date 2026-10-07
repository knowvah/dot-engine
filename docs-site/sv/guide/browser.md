---
sourceHash: 96b80725180c7f6708fcc435c4ad98ed934b7e558b1db664f454212b152ed64d
---
# Använd i webbläsaren

@knowvah/dot-engine använder inga API:er som bara finns i Node och är säkert att paketera för webbläsaren. Den här
sidan går igenom de två saker du behöver känna till när du kör på klientsidan.

## Paketering

Biblioteket består av vanliga ES-moduler. Vilken modern paketerare som helst (Vite, esbuild, Rollup,
webpack) kan ta med det. Det finns inga körtidsberoenden att externalisera och inga
WASM-artefakter att hosta.

```ts
import { renderSvg } from '@knowvah/dot-engine';

const svg = renderSvg('digraph { a -> b }', 'dot');
document.querySelector('#out')!.innerHTML = svg;
```

Den här webbplatsens [lekplats](/sv/playground) gör precis så — den importerar
motorn och anropar `renderSvg` i webbläsaren, utan någon tur-och-retur till en server.

## Textmätning

Graphviz behöver textmått för att dimensionera etiketter. @knowvah/dot-engine hanterar detta
automatiskt:

- **I webbläsaren** (när `document` finns) mäter det text med den
  inbyggda 2D-kontexten för `<canvas>` — värdtroget, eftersom det är samma typsnitt som
  webbläsaren renderar SVG:n med.
- **I Node** använder det som standard den inbyggda **Estimate**-mätaren — en
  deterministisk, huvudlös modell som speglar Graphviz egen
  `estimate_textspan_size`. Ingen installation av `canvas` och inga typsnittsfiler behövs för att
  få korrekt layout i Node; en hintad uppslagstabellsmätare (LUT) finns också
  som tillval för närmare värdtrogen storleksberäkning utan ett inbyggt
  canvas-beroende. Se [Textmätning](/sv/guide/text-measurement) för hur du
  väljer en mätare uttryckligen.

Inga typsnittsfiler behövs för layout i något fall.

## Webbtypsnitt: därför är förhämtning viktig

Etikettstorlekar kommer från att text mäts med ett typsnitt. Om ett typsnitt deklareras med
`@font-face` men inte har laddats klart mäter webbläsaren i stället med
**reservtypsnittet**, och layouten blir fel när det riktiga typsnittet väl har kommit.
Uppmätt i Chromium med JetBrains Mono: en etikettruta var **70,68 pt** bred när den
mättes innan typsnittet laddats (reservtypsnitt) och **124,8 pt** efter att det laddats.

De asynkrona ingångspunkterna (`renderSvgAsync`, `renderAsync`, `renderSvgInto`) undviker
detta: de samlar in de typsnitt som grafen kommer att begära, läser in dem via
`document.fonts` och kör först därefter layouten. `renderSvgAsync` gav samma
124,8 pt som mätning efter inladdning.

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg, fontIssues } = await renderSvgAsync(
  'digraph { node [fontname="JetBrains Mono"]; a -> b }',
  'dot',
  { fontTimeoutMs: 5000 },
);
```

- **`fontTimeoutMs`** (standard `3000`) är en gemensam tidsgräns för alla typsnitt, inte
  per typsnitt.
- **`fontIssues`** är en lista med `{ face, reason }`. `reason: 'failed'` betyder att
  typsnittet gav fel (till exempel ett 404) eller att dess inladdning avvisades; `reason: 'timeout'`
  betyder att det inte hade laddats inom `fontTimeoutMs`. I båda fallen fortsätter layouten
  med ett reservtypsnitt. Varje problem skrivs också ut med `console.warn`. Typsnittsproblem avvisar aldrig
  löftet (promise).
- **Begränsning:** bara familjer som deklarerats med `@font-face` kan rapporteras.
  Ett systemtypsnitt eller ett okänt familjenamn räknas som ”laddat” (det finns inget
  att vänta på), så ett felstavat `fontname` hamnar aldrig i `fontIssues`.
- **Node och Workers** har ingen `document.fonts`, så förhämtningen av typsnitt hoppas över och
  `fontIssues` är `[]`. Bildkrokarna fungerar fortfarande. Du kan skicka in en `fontSet`
  (vad som helst med `load(font)`) för att tillhandahålla din egen.

## Rendera in på en sida: `renderSvgInto`

```ts
import { renderSvgInto } from '@knowvah/dot-engine';

// <div id="graph"></div>
const { element, fontIssues } = await renderSvgInto('graph', dot, 'dot');
if (fontIssues.length > 0) {
  console.warn('fallback fonts used for', fontIssues.map((i) => i.face));
}
```

Den ersätter barnen till elementet med angivet id med den renderade
`<svg>`-noden (returneras som `element`), med hjälp av `DOMParser` och `importNode`, aldrig
`innerHTML`. Ett id som saknas avvisas med `ERR_INVALID_ARG_VALUE`. SVG:n
rensas som standard; skicka `sanitize` för att använda din egen rensare eller `trusted: true`
för att hoppa över rensningen. Se avsnittet ”Security” i README för vad rensaren
tar bort och behåller, och behåll en Content-Security-Policy på plats.

## Externa bilder: `setImageSizer`

När en HTML-liknande etikett innehåller en extern bild
(`<IMG SRC="logo.png"/>`) behöver Graphviz bildens egna mått för att
dimensionera cellen. (En nods `image=`-attribut dimensioneras inte: noden behåller sin
vanliga ruta, som i huvudlös inbyggd Graphviz.) Eftersom biblioteket inte kan
läsa filsystemet tillhandahåller du en mätare:

```ts
import { setImageSizer } from '@knowvah/dot-engine';

setImageSizer((src) => {
  // Return the intrinsic { w, h } for this image source, or null if unknown.
  return { w: 64, h: 64 };
});
```

Om dina grafer aldrig refererar till externa bilder behöver du inte anropa detta.
Om du vill mäta bilder asynkront (till exempel genom att läsa in dem) skickar du i stället en asynkron
`imageSizer` till `renderSvgAsync`; se [Arbeta med bilder](/sv/guide/images).

## Web Workers

Layouten körs synkront, så en stor graf blockerar den tråd den körs på. Kör
den i en Worker för att hålla sidan responsiv. I en Worker finns ingen
`document`, så biblioteket mäter text med en `OffscreenCanvas` och det
asynkrona API:et läser in typsnitt via Workerns egen typsnittsuppsättning (`self.fonts`).

Typsnitt i en Worker är skilda från sidans: registrera dem i Workern
med API:et `FontFace` (CSS-regler med `@font-face` når inte Workers).

```ts
// graph-worker.ts (module worker)
import { renderSvgAsync } from '@knowvah/dot-engine';

self.fonts.add(new FontFace('Inter', 'url(/fonts/Inter.woff2)'));

self.onmessage = async (e: MessageEvent<string>) => {
  const { svg, fontIssues } = await renderSvgAsync(e.data, 'dot');
  self.postMessage({ svg, fontIssues });
};
```

Rendera med `renderSvgAsync` (eller `renderAsync`) i en Worker, inte `renderSvg`,
åtminstone tills varje webbtypsnitt har laddats. Chromium fortsätter mäta en typsnittssträng
med reservtypsnittet om exakt den strängen mättes i Workern innan
typsnittet laddats, även efter att det har laddats; det asynkrona API:et läser in typsnitt innan det
mäter, så det råkar aldrig ut för detta.

## Vad du inte ska förvänta dig

Biblioteket riktar sig mot **SVG** (plus textformaten `json` / `xdot` / `dot` / bildkarta).
Rasterutdata (PNG/JPG), PostScript/PDF och interaktiva/grafiska backends
ligger utanför ramen — konvertera SVG:n i ett senare steg om du behöver ett annat format. Se
[Kända avvikelser](/sv/divergences) för hela omfattningsgränsen.

## Stora grafer: förrendera till SVG

Mycket stora grafer — ungefär **fler än 10 000 noder eller några MB DOT-källkod** — är
opraktiska att lägga ut vid körning i webbläsaren. Layouten (mincross, rangordning,
splinedragning) är superlinjär, så detta är ett **skalningstak som delas med
uppströms Graphviz, inte en begränsning specifik för den här motorn**: på sådana indata
får inbyggd `dot`, WASM-byggena (`@hpcc-js/wasm-graphviz`) och den här motorn alla
tidsgränsfel eller slut på minne. (Den här motorn **läcker inte** — dess
heap per rendering är konstant; gränsen är enbart grafens storlek. Se
[prestandaöversikten](/perf) för den uppmätta jämförelsen.)

För grafer i den skalan: **rendera en gång vid byggtillfället och servera den resulterande
`.svg`** i stället för att lägga ut i webbläsaren vid varje visning — samma mönster
som du skulle använda även med inbyggd `dot`, eftersom den är för långsam för att köras per anrop.

Byggtidsadaptrarna för webbplatser i
[knowvah/dot-plugins](https://github.com/knowvah/dot-plugins) (publicerade på NPM)
gör precis detta:

- `@knowvah/vitepress-plugin-dot` — VitePress (markdown-it), vid byggtillfället
- `@knowvah/eleventy-plugin-dot` — Eleventy (markdown-it), vid byggtillfället
- `@knowvah/docusaurus-plugin-dot` — Docusaurus (MDX/remark), vid byggtillfället
- `@knowvah/dot-markdown-it` — ramverksoberoende markdown-it-integration

För dynamiska, användarlevererade grafer där rendering vid byggtillfället inte är ett alternativ
håller du den interaktiva renderingen till rimligt stora grafer och cachar den skapade SVG:n.
