---
sourceHash: e2e54229b04c577dfb514c415c7f02fd786b797b5bfc7a4bbf2e4192d03d0c09
---

# API-referentie

Het publieke oppervlak is bewust klein gehouden. De meeste aanroepers hebben
alleen `renderSvg` nodig. Zie het [Overzicht](/nl/guide/overview) voor welk
toegangspunt u moet gebruiken, [Typen](/nl/guide/types) voor de vormen die elke
functie verwerkt en teruggeeft, en de gegenereerde
[Referentie](/reference/) voor uitputtende signaturen, elk veld en elke
overload.

> Typedeclaraties (`.d.ts`) worden uitgegeven door `npm run build` (de stap
> `build:types` draait `tsc -p tsconfig.build.json`). De `exports`-map in
> `package.json` koppelt `types`-condities aan elk toegangspunt, zodat
> `@knowvah/dot-engine`, `@knowvah/dot-engine/api` en
> `@knowvah/dot-engine/render` alle drie hun typen oplossen in editors en
> downstream-builds.
>
> De build geeft ook declaratiemaps (`.d.ts.map`) en JS-source-maps uit, en het
> pakket levert zijn `src/`-bronnen mee — zodat "ga naar definitie" rechtstreeks
> naar de echte TypeScript springt, waardoor het eenvoudig is de code te lezen
> en een PR te openen.

Deze pagina is opgebouwd rond de drie toegangspunten (het
[Overzicht](/nl/guide/overview) behandelt wanneer u welk gebruikt): het
rootpakket `@knowvah/dot-engine` (parsen + renderen in één aanroep, plus
procesbrede configuratie), `@knowvah/dot-engine/api` (een graaf in code bouwen,
berekende geometrie terugleze) en `@knowvah/dot-engine/render` (uitvoer in
meerdere formaten en ruwe tekenbewerkingen). Elke onderstaande functie wordt
ook opnieuw geëxporteerd vanuit het rootpakket (`export * from
'./api/index.js'` / `export * from './render/index.js'` in `src/index.ts`) —
alles importeren uit `@knowvah/dot-engine` werkt, maar de subpad-imports maken
explicieter met welke laag u werkt.

## `@knowvah/dot-engine` (root)

### `renderSvg`

```ts
function renderSvg(dotSource: string, engine: EngineName): string;
```

Parseert de DOT-broncode, draait de genoemde [lay-out-engine](/nl/guide/engines),
rendert naar SVG en geeft de SVG-string terug. Dit is de gemaksomhulling voor
één aanroep: ze construeert een `GvcContext`, registreert de acht ingebouwde
engines en de SVG-renderer, legt uit, rendert en geeft de lay-out vrij — zie
[`GvcContext` / `renderWithContext`](#gvccontext-renderwithcontext) hieronder als
u die stappen gescheiden nodig hebt.

- **`dotSource`** — graafbroncode in de DOT-taal.
- **`engine`** — `EngineName`: een van de ingebouwde (`dot`, `neato`, `fdp`,
  `sfdp`, `circo`, `twopi`, `osage`, `patchwork`) of een willekeurige
  zelfgeregistreerde naam.
- **Werpt** een `DotEngineError` bij elk probleem met de invoer: `ParseError` als
  `dotSource` ongeldig is, `RenderError` als lay-out of rendering mislukt,
  `InternalError` (met `cause`) bij een bug in dot-engine. Een `TypeError` met
  `code` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` als `dotSource` of
  `engine` ongeldig is (inclusief een enginenaam die niet is geregistreerd). Zie
  [Fouten en uitzonderingen](/nl/guide/errors).

Volledige signatuur, JSDoc en de veldenlijst van `GvError`:
[Referentie](/reference/).

### `tryRenderSvg` / `RenderResult`

```ts
function tryRenderSvg(dotSource: string, engine: EngineName): RenderResult;
```

Resultaatgestuurde tegenhanger van `renderSvg`. Keert terug (werpt nooit) bij
elke DOT-invoer: `{ svg }` bij succes of `{ errors: [one] }` bij de eerste
mislukking; `svg` en `errors` sluiten elkaar uit. Het werpt alleen bij ongeldige
argumenten (`TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`). Elk
item in `errors` is gewone, naar JSON te serialiseren data (`type`, `code`,
`message`, `friendlyMessage`, plus `location` / `expected` indien aanwezig; geen
`cause`, geen stacktrace), dus het kan veilig over een
worker-/postMessage-grens worden verstuurd of in een log worden geserialiseerd.
Geef hieraan de voorkeur boven `renderSvg` + `try`/`catch` wanneer de aanroeper
op `code` / `type` wil vertakken in plaats van een uitzondering op te vangen. Zie
[Fouten en uitzonderingen](/nl/guide/errors). [Referentie](/reference/).

### `parse` / `ParseError`

```ts
function parse(dotSource: string): Graph;
```

Parseert DOT naar het in-memory graafmodel **zonder** het uit te leggen.
Nuttig om de graaf te inspecteren of te transformeren — of om hem door te geven
aan `getLayout` van `@knowvah/dot-engine/api` / `render` van
`@knowvah/dot-engine/render` — vóór het renderen.

- **Werpt** `ParseError` bij syntaxfouten of schendingen van de kantrichting
  (bijv. `->` in een ongerichte graaf). `ParseError` breidt `DotEngineError` uit
  en implementeert `GvError` met `type: 'syntax'`; het draagt een
  `location: { line, column, offset? }`. `TypeError` `ERR_INVALID_ARG_TYPE` als
  `dotSource` geen string is. [Fouten en uitzonderingen](/nl/guide/errors),
  [Referentie](/reference/).

### `DotEngineError` / `RenderError` / `InternalError`

```ts
abstract class DotEngineError extends Error implements GvError {
  abstract readonly type: GvErrorType;
  abstract readonly code: GvErrorCode;
  abstract readonly friendlyMessage: string;
}
class RenderError extends DotEngineError {
  readonly type: 'render' | 'semantic';
  readonly code: GvErrorCode; // 'RENDER_ERROR' | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE'
}
class InternalError extends DotEngineError {
  readonly type: 'render';
  readonly code: 'INTERNAL_ERROR';
}
function isGvError(e: unknown): e is GvError;
```

`instanceof DotEngineError` betekent dat dot-engine op deze invoer is
mislukt. `RenderError` dekt bekende lay-out-/renderfouten (`type` is `semantic`
voor `UNKNOWN_LAYOUT` en `UNSUPPORTED_FEATURE`). `InternalError` is een bug in
dot-engine; `cause` bevat de oorspronkelijke fout wanneer er een is omwikkeld.
Fouten van de aanroeper werpen in plaats daarvan een standaard `TypeError` /
`RangeError` / `Error` met een `code`. `isGvError` controleert op een
string-`type` en -`code`, zodat het ook werkt over dubbele bundels heen. Zie
[Fouten en uitzonderingen](/nl/guide/errors) voor elke code en wat elke functie
kan werpen, [Typen](/nl/guide/types) voor de vorm van `GvError`, en
[Referentie](/reference/) voor de ledenlijst van `GvErrorCode`.

### `setTextMeasurer` / `getTextMeasurer`

```ts
function setTextMeasurer(measurer: TextMeasurer | null): void;
function getTextMeasurer(): TextMeasurer;
```

Registreert (of wist, met `null`) de procesbrede tekstmeter die tijdens de
lay-out wordt geraadpleegd om labels te dimensioneren. Wissen valt terug op de
standaard van de bibliotheek (browser: `CanvasTextMeasurer`; headless/Node:
`EstimateTextMeasurer`, tenzij er een LUT-meter is aangesloten — zie
[Tekstmeting](/nl/guide/text-measurement) voor de volledige oplosvolgorde en de
implementaties `CanvasTextMeasurer` / `EstimateTextMeasurer` /
`LutTextMeasurer` die naast deze functies worden geëxporteerd).
[Referentie](/reference/).

### `setImageSizer` / `setImageResolver`

Twee verwante, maar afzonderlijke koppelpunten voor afbeeldingsconfiguratie —
beide procesbrede registers volgens hetzelfde patroon (registreer een callback,
geef `null` door om te wissen), beide zonder effect totdat een aanroeper er een
registreert:

- **`setImageSizer`** — meldt de *intrinsieke afmetingen* van een externe
  afbeelding, zodat de lay-out-engine vóór het renderen ruimte kan reserveren
  voor een HTML-`<IMG>`-cel of een knoopattribuut `image=`. Als `null` wordt
  teruggegeven (of er geen sizer is geregistreerd), levert dat het gedrag van
  native Graphviz bij ontbrekende afbeeldingen: een waarschuwing en afmeting nul.
- **`setImageResolver`** (nieuw — zie [`inlineImages`](#inlineimages) hieronder)
  — levert de daadwerkelijke afbeeldings*bytes*, zodat de SVG-renderer ze als
  `data:`-URI kan inlinen in plaats van `xlink:href="src"` als ruwe doorgifte uit
  te geven.

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;
function setImageSizer(sizer: ImageSizer | null): void;

type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;
function setImageResolver(fn: ImageResolver | null): void;
```

`ImageResolver` mag een kale `Uint8Array` teruggeven (MIME afgeleid van de
bestandsextensie van `src` — `.png`, `.jpg`/`.jpeg`, `.gif`, `.svg`, `.webp`;
al het andere valt terug op `application/octet-stream`) of `{ bytes, mime }` om
het MIME-type expliciet in te stellen. Geef `null` terug wanneer `src` niet kan
worden opgelost — de renderer valt dan terug op de ruwe `src`-doorgifte, net
alsof er geen resolver was geregistreerd. Een resolver registreren heeft op
zichzelf geen effect; hij wordt alleen geraadpleegd wanneer de optie
`inlineImages` van `render` `true` is (hieronder). Zie
[Werken met afbeeldingen](/nl/guide/images) voor een uitgewerkt voorbeeld en
[Referentie](/reference/) voor beide callbacktypen.

### `renderSvgAsync` / `renderSvgInto`

```ts
function renderSvgAsync(
  dotSource: string,
  engine: EngineName,
  opts?: AsyncSvgOptions,
): Promise<{ svg: string; fontIssues: FontIssue[] }>;

function renderSvgInto(
  id: string,
  src: string,
  engine: EngineName,
  opts?: RenderSvgIntoOptions,
): Promise<{ element: SVGSVGElement; fontIssues: FontIssue[] }>;

type FontIssue = { face: string; reason: 'failed' | 'timeout' };
type AsyncSvgOptions = Omit<AsyncRenderOptions, 'engine'>;
interface RenderSvgIntoOptions extends AsyncSvgOptions {
  sanitize?: (svg: string) => string;
  trusted?: boolean;
  document?: Document;
}
```

`renderSvgAsync` is de asynchrone tegenhanger van `renderSvg`: het haalt vooraf
de webfonts en afbeeldingsgegevens op die de graaf nodig heeft en legt daarna
uit en rendert. `renderSvgInto` rendert en vervangt de kinderen van het element
met id `id`, en saniteert de SVG standaard (`trusted: true` slaat dat over;
`sanitize` vervangt de ingebouwde schoonmaker). Mislukkingen, inclusief foute
argumenten, zijn promise-rejections met dezelfde foutklassen als `renderSvg`;
een ontbrekend element-id wordt afgewezen met `ERR_INVALID_ARG_VALUE`.
Lettertypeproblemen worden nooit afgewezen; ze komen terug in `fontIssues`. Zie
[Gebruik in de browser](/nl/guide/browser) en [Afbeeldingen](/nl/guide/images),
en [Referentie](/reference/).

### `GvcContext` / `renderWithContext`

```ts
class GvcContext {
  constructor(measurer: TextMeasurer, options?: { debug?: DebugOptions });
  register(plugin: LayoutEngine | RendererPlugin): void;
  layout(g: Graph, engineName: EngineName): void;
  freeLayout(g: Graph, engineName: EngineName): void;
}

function renderWithContext(ctx: GvcContext, g: Graph, format: string): string;
```

Lagere orkestratie voor aanroepers die lay-out en rendering als afzonderlijke
stappen moeten aansturen. `renderSvg` is een gemaksomhulling over precies dit:
een context construeren, engines/renderers registreren, `layout`,
`renderWithContext`, `freeLayout`. Gebruik deze alleen rechtstreeks wanneer u
die controle nodig hebt — bijvoorbeeld om een deelverzameling van engines te
registreren, een eigen `LayoutEngine` of `RendererPlugin` toe te voegen, of
dezelfde uitgelegde graaf naar meerdere formaten te renderen zonder de lay-out
opnieuw te draaien (roep `layout` één keer aan, daarna `renderWithContext` voor
elk formaat, en ten slotte `freeLayout`). [Referentie](/reference/).

## `@knowvah/dot-engine/api`

Programmatische constructie, veilig kanten invoegen en uitlezen van berekende
geometrie — de laag om een graaf te bouwen zonder DOT-tekst met de hand te
schrijven en de lay-out ervan als gewone data terug te lezen. Zie
[Typen](/nl/guide/types) voor `LayoutSnapshot` en de geneste vormen daarvan.

### `createGraph`

```ts
function createGraph(opts?: {
  directed?: boolean;
  strict?:   boolean;
  name?:     string;
}): GvGraphBuilder;
```

Maakt een verse graaf aan die klaar is om te worden doorgegeven aan `render` /
`getLayout` / `getDrawOps`. Standaardwaarden: `directed: true`, `strict: false`,
`name: ''`. Geeft een `GvGraphBuilder` terug — `addNode`, `addEdge`,
`addSubgraph`, `setAttr`/`getAttr`, `setHtmlAttr` (voor labels met
HTML-tabellen) en een eigenschap `.graph` die de ondoorzichtige `Graph`-handle
blootstelt. Zie [Een graaf bouwen in code](/nl/guide/build-a-graph) en
[Referentie](/reference/) voor de volledige interfaces
`GvGraphBuilder`/`GvNode`/`GvEdge`.

### `addEdge`

```ts
function addEdge(g: Graph, tail: Node, head: Node, name?: string): Edge;
```

Lagere hulpfunctie voor het invoegen van kanten die ten grondslag ligt aan
`GvGraphBuilder.addEdge` — rechtstreeks geëxporteerd voor aanroepers die met de
interne `Node`-/`Edge`-verwijzingen werken (bijv. kanten toegevoegd aan een graaf
die door `parse()` is teruggegeven) in plaats van met de ondoorzichtige
`GvNode`-/`GvEdge`-handles van de builder. De meeste aanroepers gebruiken in
plaats daarvan beter `createGraph(...).addEdge(tail, head, attrs?)`.

- **`name`** — kantsleutel; standaard `''` (anoniem). Genegeerd bij
  strict-graafdeduplicatie, die uitsluitend op `(tail, head)` vergelijkt
  (symmetrisch voor ongerichte grafen).
- **Geeft terug** de nieuwe kant, of de bestaande als `g` strict is en er al een
  kant `(tail, head)` bestaat (weerspiegelt `agedge` met `cflag=1`).

Zie [Een graaf bouwen in code](/nl/guide/build-a-graph) en
[Referentie](/reference/).

### `getLayout`

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

Geeft een gewone, naar JSON te serialiseren momentopname terug van de berekende
geometrie van de graaf — knoopposities, controlepunten van kantsplines,
kantlabels, omsluitende kaders van clusters en de totale grafgrenzen — alles in
punten.

- **`g`** — moet al zijn uitgelegd (via `render(g, ...)`, `getDrawOps(g)` of
  `ctx.layout(g, engine)`); `getLayout` aanroepen op een nog niet uitgelegde
  graaf werpt in plaats van stilzwijgend geometrie met alleen nullen terug te
  geven.
- **`opts.yAxis`** — standaard `'down'`: schermcoördinaten, oorsprong linksboven,
  y neemt naar beneden toe, en `bounds` wordt genormaliseerd naar `(0, 0)`.
  `'up'` geeft native Graphviz-coördinaten (oorsprong linksonder, y neemt naar
  boven toe) met `bounds.x`/`bounds.y` op de ruwe linkeronderhoek.
- **Werpt** `Error` met `code` `ERR_INVALID_STATE` als `g` niet is uitgelegd;
  `TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` bij een foute `g`
  of `opts`. Zie [Fouten en uitzonderingen](/nl/guide/errors).

De `width`/`height` van knopen worden omgerekend naar punten (het interne model
slaat inches op); elke andere coördinaat is al in punten. Zie
[Berekende geometrie uitlezen](/nl/guide/geometry) voor het verhaal over het
coördinatenstelsel en [Typen](/nl/guide/types) / [Referentie](/reference/) voor
de volledige veldenlijsten van `LayoutSnapshot`, `NodeGeometry`, `EdgeGeometry`,
`ClusterGeometry` en `BoundsGeometry`.

### `Graph`

Ondoorzichtig handletype dat opnieuw uit het interne model wordt geëxporteerd.
Alleen het *type* wordt blootgesteld (niet de muteerbare klasse) — annoteer er
een variabele mee die de `.graph` van een builder of een `parse()`-resultaat
bevat, maar construeer of inspecteer de velden ervan niet rechtstreeks; gebruik
de builder, `getLayout` of `getDrawOps` om de toestand terug te lezen.
[Referentie](/reference/).

## `@knowvah/dot-engine/render`

Uitvoer in meerdere formaten en directe toegang tot tekenbewerkingen — de laag
om een reeds `parse`d of met de builder gebouwde graaf te renderen.

### `render`

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  RenderOptions,
): string;
```

Legt een graaf uit en rendert die naar de string van het gevraagde formaat.

- **`format`** — `OutputFormat`: `'svg' | 'dot' | 'xdot' | 'json' | 'plain' |
  'plain-ext' | 'imap' | 'cmapx'`.
- **`opts.engine`** — lay-out-engine (standaard `'dot'`).
- **`opts.inlineImages`** — zie [hieronder](#inlineimages).
- **Werpt** `RenderError` bij een lay-out- of renderfout; `InternalError` bij een
  bug in dot-engine; `TypeError` met een `code` bij ongeldige argumenten
  (inclusief een niet-geregistreerde engine of een niet-geregistreerd formaat).
  Zie [Fouten en uitzonderingen](/nl/guide/errors).

`opts.engine` weerspiegelt de parameter `engine` van `renderSvg`; `format` is de
as die `renderSvg` niet blootstelt (`renderSvg` staat vast op `'svg'`). Zie
[Renderen naar andere formaten](/nl/guide/render-formats) en
[Referentie](/reference/) voor de volledige `OutputFormat`-union en de vorm van
`RenderOptions`.

#### `inlineImages`

`RenderOptions.inlineImages` (standaard `false`) inlinet externe afbeeldingen
als `data:`-URI's in plaats van de ruwe doorgifte `xlink:href="src"`. Het heeft
geen effect tenzij via `setImageResolver` (hierboven) een resolver is
geregistreerd — en ook geen effect op niet-SVG-formaten. Als de optie niet is
ingesteld, is de uitvoer byte-identiek aan die van vóór het bestaan van deze
optie.

```ts
import { setImageResolver } from '@knowvah/dot-engine';
import { render } from '@knowvah/dot-engine/render';
import { parse } from '@knowvah/dot-engine';

setImageResolver((src) => {
  // Return the bytes for any src your DOT source references via
  // `image="..."` or an HTML <IMG SRC="...">; null for anything else.
  if (src === 'logo.png') return fetchLogoBytesSync(); // Uint8Array
  return null;
});

const g = parse('digraph { a [image="logo.png" shape=none label=""]; }');
const svg = render(g, 'svg', { inlineImages: true });
// svg now embeds `xlink:href="data:image/png;base64,..."` for the `a` node
// instead of `xlink:href="logo.png"`.
```

Zie [Werken met afbeeldingen](/nl/guide/images) voor de volledige handleiding,
inclusief oplossen vanuit `fetch` in de browser en vanuit het bestandssysteem in
Node.

### `renderAsync`

```ts
function renderAsync(
  g:      Graph,
  format: OutputFormat,
  opts?:  AsyncRenderOptions,
): Promise<{ output: string; fontIssues: FontIssue[] }>;

interface AsyncRenderOptions extends RenderOptions {
  imageSizer?: (src: string) => Promise<{ w: number; h: number } | null>;
  imageResolver?: (
    src: string,
  ) => Promise<{ bytes: Uint8Array; mime?: string } | Uint8Array | null>;
  fontTimeoutMs?: number; // default 3000
  fontSet?: FontSetLike;  // default document.fonts when present
}
```

Asynchrone tegenhanger van `render`: dezelfde formaten en opties
`engine`/`inlineImages`, plus asynchrone afbeeldingshooks per aanroep en
vooraf ophalen van lettertypen. Elke afbeeldingshook draait hooguit één keer per
afzonderlijke `src`; een throw of reject telt als een misser. De uitvoer is voor
de opmaakformaten niet-gesaniteerde markup; zie de README-sectie "Security".

### `getDrawOps` / `DEFAULT_DRAW_ENGINE`

```ts
const DEFAULT_DRAW_ENGINE: EngineName; // 'dot'

function getDrawOps(g: Graph, opts?: { engine?: EngineName }): XdotOp[];
```

Legt `g` uit, rendert naar xdot en geeft een platte, getypeerde array van
tekenbewerkingen terug — knoopvormen, tekstspans, kleuren en lettertypen als
waarden van een discriminated union (versmal op `op.kind` in een `switch`) —
om een eigen canvas-/WebGL-/PDF-renderer te voeden zonder SVG of de
stringcodering van xdot aan te raken. `opts.engine` is standaard
`DEFAULT_DRAW_ENGINE` (`'dot'`).

- **Werpt** `ParseError` als de tussenliggende xdot-uitvoer niet opnieuw kan
  worden geparsed (een bug in dot-engine; in de praktijk niet te verwachten);
  `RenderError` bij een lay-out-/renderfout; `InternalError` bij elke andere bug
  in dot-engine; `TypeError` met een `code` bij ongeldige argumenten. Zie
  [Fouten en uitzonderingen](/nl/guide/errors).

Zie [Eigen rendering met xdot-tekenbewerkingen](/nl/guide/xdot-drawops) voor de
lijst met soorten bewerkingen en een uitgewerkt canvasvoorbeeld, en
[Typen](/nl/guide/types) / [Referentie](/reference/) voor de volledige
`XdotOp`-union en de vormen `Xdot`/`XdotColor`.
