---
sourceHash: 96b80725180c7f6708fcc435c4ad98ed934b7e558b1db664f454212b152ed64d
---
# Gebruik in de browser

@knowvah/dot-engine gebruikt geen API's die alleen in Node bestaan en is veilig te bundelen voor de
browser. Deze pagina behandelt de twee dingen die u moet weten bij clientzijdig gebruik.

## Bundelen

De bibliotheek bestaat uit gewone ES-modules. Elke moderne bundler (Vite, esbuild,
Rollup, webpack) kan haar opnemen. Er zijn geen runtime-afhankelijkheden om te
externaliseren en geen WASM-artefacten om te hosten.

```ts
import { renderSvg } from '@knowvah/dot-engine';

const svg = renderSvg('digraph { a -> b }', 'dot');
document.querySelector('#out')!.innerHTML = svg;
```

De [speeltuin](/nl/playground) van deze site doet precies dat — hij importeert de engine en
roept `renderSvg` aan in de browser, zonder server-roundtrip.

## Tekstmeting

Graphviz heeft tekstafmetingen nodig om labels te dimensioneren. @knowvah/dot-engine
regelt dit automatisch:

- **In de browser** (wanneer `document` bestaat) meet het tekst met de native
  `<canvas>`-2D-context — hostgetrouw, omdat het hetzelfde lettertype is waarmee de browser
  de SVG weergeeft.
- **In Node** gebruikt het standaard de ingebouwde **Estimate**-meter — een
  deterministisch, headless-veilig model dat Graphviz' eigen `estimate_textspan_size`
  nabootst. Voor een correcte lay-out in Node zijn geen `canvas`-installatie
  en geen lettertypebestanden nodig; een gehinte opzoektabelmeter (LUT) is
  bovendien beschikbaar als opt-in voor nauwkeurigere hostgetrouwe afmetingen zonder native
  canvas-afhankelijkheid. Zie [Tekstmeting](/nl/guide/text-measurement) om een meter
  expliciet te kiezen.

Voor de lay-out zijn in geen enkel geval lettertypebestanden nodig.

## Weblettertypen: waarom vooraf laden ertoe doet

Labelafmetingen komen voort uit het meten van tekst met een lettertype. Als een lettertype
met `@font-face` is gedeclareerd maar nog niet klaar is met laden, meet de browser
in plaats daarvan met het **terugvallettertype**, en klopt de lay-out niet meer zodra het echte lettertype
binnenkomt. Gemeten in Chromium met JetBrains Mono: een labelkader was **70,68 pt** breed
wanneer vóór het laden van het lettertype werd gemeten (terugval) en **124,8 pt** daarna.

De asynchrone ingangen (`renderSvgAsync`, `renderAsync`, `renderSvgInto`)
voorkomen dit: ze verzamelen de lettertypen die de graaf zal opvragen, laden ze via
`document.fonts` en voeren pas daarna de lay-out uit. `renderSvgAsync` leverde dezelfde
124,8 pt als meten na het laden.

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg, fontIssues } = await renderSvgAsync(
  'digraph { node [fontname="JetBrains Mono"]; a -> b }',
  'dot',
  { fontTimeoutMs: 5000 },
);
```

- **`fontTimeoutMs`** (standaard `3000`) is één deadline voor alle lettertypen,
  niet per lettertype.
- **`fontIssues`** is een lijst van `{ face, reason }`. `reason: 'failed'` betekent dat
  het lettertype een fout gaf (bijvoorbeeld een 404) of dat het laden werd afgewezen;
  `reason: 'timeout'` betekent dat het niet binnen `fontTimeoutMs` was geladen.
  In beide gevallen gaat de lay-out verder met een terugvallettertype. Elk probleem wordt
  bovendien met `console.warn` gemeld. Lettertypeproblemen laten de promise nooit
  afwijzen.
- **Beperking:** alleen families die met `@font-face` zijn gedeclareerd, kunnen worden gemeld.
  Een systeemlettertype of een onbekende familienaam telt als "geladen" (er valt niets
  op te wachten), zodat een verkeerd gespelde `fontname` nooit in
  `fontIssues` verschijnt.
- **Node en Workers** hebben geen `document.fonts`, dus het vooraf laden van lettertypen wordt
  overgeslagen en `fontIssues` is `[]`. Afbeeldingshooks werken nog steeds. U kunt een
  `fontSet` meegeven (alles met `load(font)`) om een eigen te leveren.

## Renderen in een pagina: `renderSvgInto`

```ts
import { renderSvgInto } from '@knowvah/dot-engine';

// <div id="graph"></div>
const { element, fontIssues } = await renderSvgInto('graph', dot, 'dot');
if (fontIssues.length > 0) {
  console.warn('fallback fonts used for', fontIssues.map((i) => i.face));
}
```

Het vervangt de kinderen van het element met de opgegeven id door de gerenderde
`<svg>` (teruggegeven als `element`), met `DOMParser` en `importNode`,
nooit met `innerHTML`. Een ontbrekende id wordt afgewezen met `ERR_INVALID_ARG_VALUE`. De SVG wordt
standaard gezuiverd; geef `sanitize` mee om uw eigen sanitizer te gebruiken,
of `trusted: true` om het zuiveren over te slaan. Wat de scrubber verwijdert en
behoudt, staat in de sectie "Security" van de README; houd daarnaast een
Content-Security-Policy aan.

## Externe afbeeldingen: `setImageSizer`

Wanneer een HTML-achtig label een externe afbeelding bevat
(`<IMG SRC="logo.png"/>`), heeft Graphviz de intrinsieke afmetingen van die afbeelding nodig
om de cel te dimensioneren. (Het attribuut `image=` van een knoop wordt niet gemeten:
de knoop behoudt zijn normale kader, zoals in headless native Graphviz.) Omdat de
bibliotheek het bestandssysteem niet kan lezen, levert u zelf een sizer:

```ts
import { setImageSizer } from '@knowvah/dot-engine';

setImageSizer((src) => {
  // Return the intrinsic { w, h } for this image source, or null if unknown.
  return { w: 64, h: 64 };
});
```

Verwijzen uw grafen nooit naar externe afbeeldingen, dan hoeft u dit niet aan te roepen.
Om afbeeldingen asynchroon te meten (bijvoorbeeld door ze te laden), geeft u in plaats daarvan een asynchrone
`imageSizer` mee aan `renderSvgAsync`; zie [Afbeeldingen](/nl/guide/images).

## Web Workers

De lay-out draait synchroon, zodat een grote graaf de thread blokkeert waarop hij draait.
Voer haar uit in een Worker om de pagina responsief te houden. In een Worker
bestaat geen `document`, dus meet de bibliotheek tekst met een `OffscreenCanvas`,
en laadt de asynchrone API lettertypen via de eigen lettertypeset van de Worker
(`self.fonts`).

Lettertypen in een Worker staan los van die van de pagina: registreer ze in de Worker
met de `FontFace`-API (CSS-`@font-face`-regels bereiken Workers niet).

```ts
// graph-worker.ts (module worker)
import { renderSvgAsync } from '@knowvah/dot-engine';

self.fonts.add(new FontFace('Inter', 'url(/fonts/Inter.woff2)'));

self.onmessage = async (e: MessageEvent<string>) => {
  const { svg, fontIssues } = await renderSvgAsync(e.data, 'dot');
  self.postMessage({ svg, fontIssues });
};
```

Render in een Worker met `renderSvgAsync` (of `renderAsync`), niet met
`renderSvg`, althans totdat elk weblettertype is geladen. Chromium blijft een
lettertypestring meten met het terugvallettertype als precies die string in de Worker is gemeten vóór
het lettertype was geladen, ook nadat het is geladen; de asynchrone API laadt
lettertypen voordat ze meet en loopt hier dus nooit tegenaan.

## Wat u niet moet verwachten

De bibliotheek richt zich op **SVG** (plus de tekstformaten `json` / `xdot` / `dot` /
image map). Rasteruitvoer (PNG/JPG), PostScript/PDF en interactieve/GUI-backends vallen
buiten de reikwijdte — converteer de SVG verderop in de keten als u een ander formaat
nodig hebt. De volledige reikwijdtegrens vindt u onder
[Bekende afwijkingen](/nl/divergences).

## Grote grafen: vooraf naar SVG renderen

Zeer grote grafen — grofweg **meer dan 10k knopen of enkele MB DOT-broncode** — zijn
tijdens runtime in de browser praktisch niet in te delen. De lay-out (mincross, ranking,
splinerouting) is superlineair, dus dit is een **schaalplafond dat met
upstream-Graphviz wordt gedeeld, geen beperking specifiek voor deze engine**: bij zulke
invoer lopen de native `dot`, de WASM-builds (`@hpcc-js/wasm-graphviz`) en deze
engine allemaal evengoed tegen time-outs of een tekort aan geheugen aan. (Deze engine
lekt **niet** — haar heap per rendering blijft vlak; de grens is
uitsluitend de grafgrootte. Zie het
[prestatiedashboard](/perf) voor de gemeten vergelijking.)

Voor grafen van die omvang geldt: **render eenmaal tijdens de build en lever de resulterende
`.svg` uit**, in plaats van bij elke weergave in de browser de lay-out te berekenen — hetzelfde patroon dat
u ook met de native `dot` zou gebruiken, omdat die te traag is om per verzoek uit te voeren.

De buildtijd-siteadapters in
[knowvah/dot-plugins](https://github.com/knowvah/dot-plugins) (gepubliceerd op NPM)
doen precies dat:

- `@knowvah/vitepress-plugin-dot` — VitePress (markdown-it), tijdens de build
- `@knowvah/eleventy-plugin-dot` — Eleventy (markdown-it), tijdens de build
- `@knowvah/docusaurus-plugin-dot` — Docusaurus (MDX/remark), tijdens de build
- `@knowvah/dot-markdown-it` — frameworkonafhankelijke markdown-it-integratie

Voor dynamische, door gebruikers aangeleverde grafen waarbij renderen tijdens de build geen
optie is, beperkt u interactief renderen tot grafen van redelijke omvang en cachet u
de geproduceerde SVG.
