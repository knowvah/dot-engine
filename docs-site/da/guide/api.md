---
sourceHash: e2e54229b04c577dfb514c415c7f02fd786b797b5bfc7a4bbf2e4192d03d0c09
---

# API-reference

Den offentlige overflade er med vilje lille. De fleste kaldere har kun brug for
`renderSvg`. Se [Overblik](/da/guide/overview) for, hvilket indgangspunkt du skal
bruge, [Typer](/da/guide/types) for de former, hver funktion tager imod og
returnerer, og den genererede [Reference](/reference/) for udtømmende
signaturer, hvert felt og hver overload.

> Typedeklarationer (`.d.ts`) udsendes af `npm run build` (trinnet `build:types`
> kører `tsc -p tsconfig.build.json`). Kortlægningen `exports` i `package.json`
> kobler `types`-betingelser på hvert indgangspunkt, så `@knowvah/dot-engine`,
> `@knowvah/dot-engine/api` og `@knowvah/dot-engine/render` alle får opløst
> typer i editorer og efterfølgende builds.
>
> Buildet udsender også deklarationskort (`.d.ts.map`) og JS-source maps, og
> pakken leveres med sine `src/`-kilder — så "gå til definition" springer
> direkte til den rigtige TypeScript, hvilket gør det nemt at læse koden og åbne
> en PR.

Denne side er organiseret efter de tre indgangspunkter ([Overblik](/da/guide/overview)
beskriver, hvornår du skal række ud efter hvert af dem): rodpakken
`@knowvah/dot-engine` (parse + render i ét kald, plus proces-global
konfiguration), `@knowvah/dot-engine/api` (byg en graf i kode, læs beregnet
geometri tilbage) og `@knowvah/dot-engine/render` (output i flere formater og
rå tegneoperationer). Hver funktion nedenfor re-eksporteres også fra rodpakken
(`export * from './api/index.js'` / `export * from './render/index.js'` i
`src/index.ts`) — det virker at importere alt fra `@knowvah/dot-engine`, men
importer fra understier er mere eksplicitte om, hvilket lag du rører.

## `@knowvah/dot-engine` (rod)

### `renderSvg`

```ts
function renderSvg(dotSource: string, engine: EngineName): string;
```

Parser DOT-kildekoden, kører den navngivne [layoutmotor](/da/guide/engines),
renderer til SVG og returnerer SVG-strengen. Det er indpakningen med ét kald: den
konstruerer en `GvcContext`, registrerer de otte indbyggede motorer og
SVG-rendereren, lægger ud, renderer og frigiver layoutet — se
[`GvcContext` / `renderWithContext`](#gvccontext-renderwithcontext) nedenfor,
hvis du har brug for at adskille disse trin.

- **`dotSource`** — graf-kildekode i DOT-sproget.
- **`engine`** — `EngineName`: en af de indbyggede (`dot`, `neato`, `fdp`,
  `sfdp`, `circo`, `twopi`, `osage`, `patchwork`) eller et hvilket som helst
  egenregistreret navn.
- **Kaster** en `DotEngineError` for ethvert problem med inputtet: `ParseError`,
  hvis `dotSource` er ugyldig, `RenderError`, hvis layout eller rendering
  fejler, `InternalError` (med `cause`) for en fejl i dot-engine. En `TypeError`
  med `code` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`, hvis `dotSource`
  eller `engine` er ugyldig (herunder et motornavn, der ikke er registreret). Se
  [Fejl og undtagelser](/da/guide/errors).

Fuld signatur, JSDoc og feltlisten for `GvError`: [Reference](/reference/).

### `tryRenderSvg` / `RenderResult`

```ts
function tryRenderSvg(dotSource: string, engine: EngineName): RenderResult;
```

Søsterfunktion til `renderSvg` i resultatstil. Returnerer (kaster aldrig) for
ethvert DOT-input: `{ svg }` ved succes eller `{ errors: [one] }` ved den første
fejl; `svg` og `errors` udelukker hinanden. Den kaster kun ved ugyldige
argumenter (`TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`). Hver
post i `errors` er almindelige, JSON-serialiserbare data (`type`, `code`,
`message`, `friendlyMessage`, plus `location` / `expected`, når de findes; ingen
`cause`, intet stakspor), så den kan sendes sikkert over en
worker-/postMessage-grænse eller serialiseres i en log. Foretræk den frem for
`renderSvg` + `try`/`catch`, når kalderen vil forgrene på `code` / `type` frem
for at fange en undtagelse. Se [Fejl og undtagelser](/da/guide/errors).
[Reference](/reference/).

### `parse` / `ParseError`

```ts
function parse(dotSource: string): Graph;
```

Parser DOT til den hukommelsesinterne grafmodel **uden** at lægge den ud. Nyttig
til at inspicere eller transformere grafen — eller aflevere den til
`getLayout` fra `@knowvah/dot-engine/api` / `render` fra
`@knowvah/dot-engine/render` — før rendering.

- **Kaster** `ParseError` ved syntaksfejl eller brud på kantretning (fx `->` i
  en urettet graf). `ParseError` udvider `DotEngineError` og implementerer
  `GvError` med `type: 'syntax'`; den bærer en
  `location: { line, column, offset? }`. `TypeError` `ERR_INVALID_ARG_TYPE`,
  hvis `dotSource` ikke er en streng. [Fejl og undtagelser](/da/guide/errors),
  [Reference](/reference/).

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

`instanceof DotEngineError` betyder, at dot-engine fejlede på dette input.
`RenderError` dækker kendte layout-/renderfejl (`type` er `semantic` for
`UNKNOWN_LAYOUT` og `UNSUPPORTED_FEATURE`). `InternalError` er en fejl i
dot-engine; `cause` rummer den oprindelige fejl, når en er blevet pakket ind.
Kaldermisgreb kaster i stedet en standard `TypeError` / `RangeError` / `Error`
med en `code`. `isGvError` tjekker for en streng i `type` og `code`, så den
virker på tværs af duplikerede bundles. Se [Fejl og undtagelser](/da/guide/errors)
for hver kode og hvad hver funktion kan kaste, [Typer](/da/guide/types) for
formen på `GvError` og [Reference](/reference/) for medlemslisten for
`GvErrorCode`.

### `setTextMeasurer` / `getTextMeasurer`

```ts
function setTextMeasurer(measurer: TextMeasurer | null): void;
function getTextMeasurer(): TextMeasurer;
```

Registrerer (eller rydder, med `null`) den proces-globale tekstmåler, som
konsulteres under layout for at dimensionere etiketter. Ryddes den, falder den
tilbage til biblioteksstandarden (browser: `CanvasTextMeasurer`; headless/Node:
`EstimateTextMeasurer`, medmindre en LUT-måler er koblet på — se
[Tekstmåling](/da/guide/text-measurement) for den fulde opløsningsrækkefølge og
implementeringerne `CanvasTextMeasurer` / `EstimateTextMeasurer` /
`LutTextMeasurer`, der eksporteres sammen med disse funktioner).
[Reference](/reference/).

### `setImageSizer` / `setImageResolver`

To beslægtede, men adskilte snitflader til billedkonfiguration — begge
proces-globale registre, der følger samme mønster (registrér et callback, send
`null` for at rydde), begge uden virkning, indtil en kalder registrerer et:

- **`setImageSizer`** — rapporterer et eksternt billedes *iboende dimensioner*,
  så layoutmotoren kan reservere plads til en HTML-`<IMG>`-celle eller en
  knudes `image=`-attribut før rendering. Returneres `null` (eller er der ingen
  sizer registreret), genskabes native Graphviz' adfærd ved manglende billede:
  en advarsel og størrelse nul.
- **`setImageResolver`** (ny — se [`inlineImages`](#inlineimages) nedenfor) —
  leverer de faktiske *bytes* i billedet, så SVG-rendereren kan indlejre dem som
  en `data:`-URI i stedet for at udsende `xlink:href="src"` som ren
  gennemstrømning.

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;
function setImageSizer(sizer: ImageSizer | null): void;

type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;
function setImageResolver(fn: ImageResolver | null): void;
```

`ImageResolver` kan returnere en blottet `Uint8Array` (MIME udledes af `src`s
filendelse — `.png`, `.jpg`/`.jpeg`, `.gif`, `.svg`, `.webp`; alt andet falder
tilbage til `application/octet-stream`) eller `{ bytes, mime }` for at angive
MIME-typen eksplicit. Returnér `null`, når `src` ikke kan opløses — rendereren
falder så tilbage til ren `src`-gennemstrømning, som hvis ingen resolver var
registreret. At registrere en resolver har ingen virkning i sig selv; den
konsulteres kun, når `render`s indstilling `inlineImages` er `true` (nedenfor).
Se [Arbejd med billeder](/da/guide/images) for et gennemarbejdet eksempel og
[Reference](/reference/) for begge callback-typer.

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

`renderSvgAsync` er den asynkrone modpart til `renderSvg`: den forhåndshenter de
webskrifttyper og billeddata, grafen har brug for, og lægger derefter ud og
renderer. `renderSvgInto` renderer og erstatter børnene af elementet med id'et
`id` og sanerer som standard SVG'en (`trusted: true` springer det over;
`sanitize` erstatter den indbyggede renser). Fejl, herunder forkerte argumenter,
er promise-afvisninger med de samme fejlklasser som `renderSvg`; et manglende
element-id afvises med `ERR_INVALID_ARG_VALUE`. Skrifttypeproblemer afviser
aldrig; de kommer tilbage i `fontIssues`. Se
[Brug i browseren](/da/guide/browser) og [Billeder](/da/guide/images) samt
[Reference](/reference/).

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

Orkestrering på lavere niveau til kaldere, der skal styre layout og rendering som
separate trin. `renderSvg` er en bekvemmelighedsindpakning over præcis dette:
konstruér en kontekst, registrér motorer/renderere, `layout`,
`renderWithContext`, `freeLayout`. Række kun ud efter disse direkte, når du har
brug for den kontrol — for eksempel for at registrere en delmængde af motorer,
tilføje en egen `LayoutEngine` eller `RendererPlugin`, eller rendere den samme
udlagte graf til flere formater uden at køre layout igen (kald `layout` én gang,
derefter `renderWithContext` for hvert format, derefter `freeLayout`).
[Reference](/reference/).

## `@knowvah/dot-engine/api`

Programmatisk konstruktion, sikker kantindsættelse og udlæsning af beregnet
geometri — laget til at bygge en graf uden at håndskrive DOT-tekst og læse dens
layout tilbage som almindelige data. Se [Typer](/da/guide/types) for
`LayoutSnapshot` og dens indlejrede former.

### `createGraph`

```ts
function createGraph(opts?: {
  directed?: boolean;
  strict?:   boolean;
  name?:     string;
}): GvGraphBuilder;
```

Opretter en frisk graf klar til overdragelse til `render` / `getLayout` /
`getDrawOps`. Standarder: `directed: true`, `strict: false`, `name: ''`.
Returnerer en `GvGraphBuilder` — `addNode`, `addEdge`, `addSubgraph`,
`setAttr`/`getAttr`, `setHtmlAttr` (til HTML-tabeletiketter) og en
`.graph`-egenskab, der eksponerer det uigennemsigtige `Graph`-håndtag. Se
[Byg en graf i kode](/da/guide/build-a-graph) og [Reference](/reference/) for de
fulde interfaces `GvGraphBuilder`/`GvNode`/`GvEdge`.

### `addEdge`

```ts
function addEdge(g: Graph, tail: Node, head: Node, name?: string): Edge;
```

Hjælpefunktion på lavere niveau til kantindsættelse, som ligger til grund for
`GvGraphBuilder.addEdge` — eksporteret direkte til kaldere, der arbejder med de
interne `Node`/`Edge`-referencer (fx kanter tilføjet til en graf returneret af
`parse()`) frem for builderens uigennemsigtige `GvNode`/`GvEdge`-håndtag. De
fleste kaldere bør i stedet bruge `createGraph(...).addEdge(tail, head, attrs?)`.

- **`name`** — kantnøgle; standard er `''` (anonym). Ignoreres ved
  deduplikering på strict-grafer, som matcher alene på `(tail, head)`
  (symmetrisk for urettede grafer).
- **Returnerer** den nye kant, eller den eksisterende, hvis `g` er strict, og en
  `(tail, head)`-kant allerede findes (spejler `agedge` med `cflag=1`).

Se [Byg en graf i kode](/da/guide/build-a-graph) og
[Reference](/reference/).

### `getLayout`

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

Returnerer et almindeligt, JSON-serialiserbart snapshot af grafens beregnede
geometri — knudepositioner, kontrolpunkter for kantsplines, kantetiketter,
afgrænsningsbokse for clustre og grafens samlede grænser — alt sammen i punkter.

- **`g`** — skal allerede være udlagt (via `render(g, ...)`, `getDrawOps(g)` eller
  `ctx.layout(g, engine)`); at kalde `getLayout` på en endnu ikke udlagt graf
  kaster, frem for i det skjulte at returnere geometri med kun nuller.
- **`opts.yAxis`** — standard `'down'`: skærmkoordinater, origo øverst til
  venstre, y vokser nedad, og `bounds` er normaliseret til `(0, 0)`. `'up'`
  returnerer native Graphviz-koordinater (origo nederst til venstre, y vokser
  opad) med `bounds.x`/`bounds.y` i det rå nederste venstre hjørne.
- **Kaster** `Error` med `code` `ERR_INVALID_STATE`, hvis `g` ikke er udlagt;
  `TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` ved en forkert `g`
  eller `opts`. Se [Fejl og undtagelser](/da/guide/errors).

Knudernes `width`/`height` konverteres til punkter (den interne model gemmer
tommer); alle andre koordinater er allerede i punkter. Se
[Læs beregnet geometri](/da/guide/geometry) for gennemgangen af
koordinatsystemet og [Typer](/da/guide/types) / [Reference](/reference/) for de
fulde feltlister for `LayoutSnapshot`, `NodeGeometry`, `EdgeGeometry`,
`ClusterGeometry` og `BoundsGeometry`.

### `Graph`

Uigennemsigtig håndtagstype, der re-eksporteres fra den interne model. Kun
*typen* eksponeres (ikke den muterbare klasse) — annotér en variabel, der
rummer en builders `.graph` eller et `parse()`-resultat, med den, men konstruér
eller inspicér ikke dens felter direkte; brug buildern, `getLayout` eller
`getDrawOps` til at læse tilstand ud igen. [Reference](/reference/).

## `@knowvah/dot-engine/render`

Output i flere formater og adgang til rå tegneoperationer — laget til at rendere
en allerede `parse`ret eller builder-konstrueret graf.

### `render`

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  RenderOptions,
): string;
```

Lægger ud og renderer en graf til den ønskede formatstreng.

- **`format`** — `OutputFormat`: `'svg' | 'dot' | 'xdot' | 'json' | 'plain' |
  'plain-ext' | 'imap' | 'cmapx'`.
- **`opts.engine`** — layoutmotor (standard `'dot'`).
- **`opts.inlineImages`** — se [nedenfor](#inlineimages).
- **Kaster** `RenderError` ved layout- eller renderfejl; `InternalError` ved en
  fejl i dot-engine; `TypeError` med en `code` ved ugyldige argumenter (herunder
  en uregistreret motor eller et uregistreret format). Se
  [Fejl og undtagelser](/da/guide/errors).

`opts.engine` spejler `renderSvg`s parameter `engine`; `format` er den akse,
`renderSvg` ikke eksponerer (`renderSvg` er hårdkodet til `'svg'`). Se
[Render til andre formater](/da/guide/render-formats) og
[Reference](/reference/) for den fulde `OutputFormat`-union og formen på
`RenderOptions`.

#### `inlineImages`

`RenderOptions.inlineImages` (standard `false`) indlejrer eksterne billeder som
`data:`-URI'er i stedet for den rå gennemstrømning `xlink:href="src"`. Den har
ingen virkning, medmindre en resolver er registreret via `setImageResolver`
(ovenfor) — og ingen virkning på ikke-SVG-formater. Uden den er outputtet
byte-identisk med før denne indstilling fandtes.

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

Se [Arbejd med billeder](/da/guide/images) for den fulde guide, herunder
opløsning fra `fetch` i browseren og fra filsystemet i Node.

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

Asynkron modpart til `render`: de samme formater og indstillinger `engine`/
`inlineImages`, plus asynkrone billedkroge pr. kald og forhåndshentning af
skrifttyper. Hver billedkrog kører højst én gang pr. distinkt `src`; en kastet
fejl eller afvisning tæller som en miss. Outputtet er usaneret markup for
markup-formaterne; se README-afsnittet "Security".

### `getDrawOps` / `DEFAULT_DRAW_ENGINE`

```ts
const DEFAULT_DRAW_ENGINE: EngineName; // 'dot'

function getDrawOps(g: Graph, opts?: { engine?: EngineName }): XdotOp[];
```

Lægger `g` ud, renderer til xdot og returnerer et fladt, typet array af
tegneoperationer — knudeformer, tekststrækninger, farver og skrifttyper som
værdier i en diskrimineret union (indsnævr på `op.kind` i en `switch`) — til at
fodre en egen canvas-/WebGL-/PDF-renderer uden at røre SVG eller xdots
strengkodning. `opts.engine` er som standard `DEFAULT_DRAW_ENGINE` (`'dot'`).

- **Kaster** `ParseError`, hvis det mellemliggende xdot-output ikke kan parses
  igen (en fejl i dot-engine; ikke forventet i praksis); `RenderError` ved
  layout-/renderfejl; `InternalError` ved enhver anden fejl i dot-engine;
  `TypeError` med en `code` ved ugyldige argumenter. Se
  [Fejl og undtagelser](/da/guide/errors).

Se [Egen rendering med xdot](/da/guide/xdot-drawops) for listen over
operationstyper og et gennemarbejdet canvas-eksempel, og
[Typer](/da/guide/types) / [Reference](/reference/) for den fulde
`XdotOp`-union og formerne `Xdot`/`XdotColor`.
