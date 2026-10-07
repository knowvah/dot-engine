---
sourceHash: e2e54229b04c577dfb514c415c7f02fd786b797b5bfc7a4bbf2e4192d03d0c09
---

# API-referanse

Den offentlige flaten er bevisst liten. De fleste kallere trenger bare
`renderSvg`. Se [Oversikt](/no/guide/overview) for hvilket inngangspunkt du bør
bruke, [Typer](/no/guide/types) for formene hver funksjon tar imot og gir
tilbake, og den genererte [Referansen](/reference/) for uttømmende signaturer,
hvert felt og hver overlasting.

> Typedeklarasjoner (`.d.ts`) emitteres av `npm run build` (steget `build:types`
> kjører `tsc -p tsconfig.build.json`). `exports`-kartet i `package.json`
> kobler inn `types`-betingelser for hvert inngangspunkt, så
> `@knowvah/dot-engine`, `@knowvah/dot-engine/api` og
> `@knowvah/dot-engine/render` løser alle typer i editorer og nedstrøms bygg.
>
> Bygget emitterer også deklarasjonskart (`.d.ts.map`) og JS-source maps, og
> pakken leveres med `src/`-kildekoden — så «gå til definisjon» hopper rett til
> den virkelige TypeScript-koden, noe som gjør det lett å lese koden og åpne en
> PR.

Denne siden er organisert etter de tre inngangspunktene
([Oversikt](/no/guide/overview) forklarer når du bør velge hvilket): rotpakken
`@knowvah/dot-engine` (parse + render i ett kall, pluss prosessglobal
konfigurasjon), `@knowvah/dot-engine/api` (bygg en graf i kode, les tilbake
beregnet geometri) og `@knowvah/dot-engine/render` (utdata i flere formater og
rå tegneoperasjoner). Hver funksjon nedenfor re-eksporteres også fra
rotpakken (`export * from './api/index.js'` /
`export * from './render/index.js'` i `src/index.ts`) — det fungerer å importere
alt fra `@knowvah/dot-engine`, men importer fra understi er mer eksplisitte om
hvilket lag du berører.

## `@knowvah/dot-engine` (root)

### `renderSvg`

```ts
function renderSvg(dotSource: string, engine: EngineName): string;
```

Tolker DOT-kildekoden, kjører den navngitte [layoutmotoren](/no/guide/engines),
rendrer til SVG og returnerer SVG-strengen. Dette er den praktiske
ett-kalls-innpakningen: den konstruerer en `GvcContext`, registrerer de åtte
innebygde motorene og SVG-rendereren, legger ut, rendrer og frigjør layouten —
se [`GvcContext` / `renderWithContext`](#gvccontext-renderwithcontext) nedenfor
hvis du trenger disse trinnene skilt fra hverandre.

- **`dotSource`** — graf-kildekode i DOT-språket.
- **`engine`** — `EngineName`: en av de innebygde (`dot`, `neato`, `fdp`,
  `sfdp`, `circo`, `twopi`, `osage`, `patchwork`) eller et hvilket som helst
  egenregistrert navn.
- **Kaster** en `DotEngineError` for ethvert problem med inndataene: `ParseError`
  hvis `dotSource` er ugyldig, `RenderError` hvis layout eller rendering
  mislykkes, `InternalError` (med `cause`) for en feil i dot-engine. En
  `TypeError` med `code` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` hvis
  `dotSource` eller `engine` er ugyldig (inkludert et motornavn som ikke er
  registrert). Se [Feil og unntak](/no/guide/errors).

Fullstendig signatur, JSDoc og feltlisten for `GvError`: [Referanse](/reference/).

### `tryRenderSvg` / `RenderResult`

```ts
function tryRenderSvg(dotSource: string, engine: EngineName): RenderResult;
```

Resultatstil-søsteren til `renderSvg`. Returnerer (kaster aldri) for enhver
DOT-inndata: `{ svg }` ved suksess eller `{ errors: [one] }` ved første feil;
`svg` og `errors` utelukker hverandre. Den kaster bare for ugyldige argumenter
(`TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`). Hver oppføring i
`errors` er vanlige, JSON-serialiserbare data (`type`, `code`, `message`,
`friendlyMessage`, pluss `location` / `expected` når de finnes; ingen `cause`,
ingen stakksporing), så den er trygg å sende over en worker-/postMessage-grense
eller serialisere inn i en logg. Foretrekk denne framfor `renderSvg` +
`try`/`catch` når kalleren vil forgrene på `code` / `type` i stedet for å fange
et unntak. Se [Feil og unntak](/no/guide/errors).
[Referanse](/reference/).

### `parse` / `ParseError`

```ts
function parse(dotSource: string): Graph;
```

Tolker DOT til den minnebaserte grafmodellen **uten** å legge den ut. Nyttig for
å inspisere eller transformere grafen — eller for å gi den til
`getLayout` i `@knowvah/dot-engine/api` / `render` i `@knowvah/dot-engine/render`
— før rendering.

- **Kaster** `ParseError` for syntaksfeil eller brudd på kantretning (f.eks.
  `->` i en urettet graf). `ParseError` utvider `DotEngineError` og
  implementerer `GvError` med `type: 'syntax'`; den bærer en
  `location: { line, column, offset? }`. `TypeError` `ERR_INVALID_ARG_TYPE` hvis
  `dotSource` ikke er en streng. [Feil og unntak](/no/guide/errors),
  [Referanse](/reference/).

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

`instanceof DotEngineError` betyr at dot-engine mislyktes på denne inndataen.
`RenderError` dekker kjente layout-/renderingsfeil (`type` er `semantic` for
`UNKNOWN_LAYOUT` og `UNSUPPORTED_FEATURE`). `InternalError` er en feil i
dot-engine; `cause` inneholder den opprinnelige feilen når en ble pakket inn.
Kallerfeil kaster i stedet en vanlig `TypeError` / `RangeError` / `Error` med en
`code`. `isGvError` sjekker etter en streng `type` og `code`, så den fungerer
på tvers av duplikate bundles. Se [Feil og unntak](/no/guide/errors) for hver
kode og hva hver funksjon kan kaste, [Typer](/no/guide/types) for formen på
`GvError`, og [Referanse](/reference/) for medlemslisten til `GvErrorCode`.

### `setTextMeasurer` / `getTextMeasurer`

```ts
function setTextMeasurer(measurer: TextMeasurer | null): void;
function getTextMeasurer(): TextMeasurer;
```

Registrerer (eller fjerner, med `null`) den prosessglobale tekstmåleren som
brukes under layout for å sette størrelse på etiketter. Å fjerne den faller
tilbake til bibliotekets standard (nettleser: `CanvasTextMeasurer`;
hodeløs/Node: `EstimateTextMeasurer`, med mindre en LUT-måler er koblet inn —
se [Tekstmåling](/no/guide/text-measurement) for den fullstendige
oppløsningsrekkefølgen og implementasjonene `CanvasTextMeasurer` /
`EstimateTextMeasurer` / `LutTextMeasurer` som eksporteres sammen med disse
funksjonene).
[Referanse](/reference/).

### `setImageSizer` / `setImageResolver`

To beslektede, men distinkte koblingspunkter for bildekonfigurasjon — begge
prosessglobale registre som følger samme mønster (registrer en callback, send
`null` for å fjerne), og begge gjør ingenting før en kaller registrerer en:

- **`setImageSizer`** — rapporterer et eksternt bildes *iboende dimensjoner* slik
  at layoutmotoren kan reservere plass til en HTML-`<IMG>`-celle eller en
  node-`image=`-attributt før rendering. Å returnere `null` (eller ikke ha
  registrert noen sizer) gjenskaper native Graphvizs atferd ved manglende bilde:
  en advarsel og null størrelse.
- **`setImageResolver`** (ny — se [`inlineImages`](#inlineimages) nedenfor) —
  leverer de faktiske *bildebytene* slik at SVG-rendereren kan innline dem som en
  `data:`-URI i stedet for å emittere `xlink:href="src"` som en rå gjennomgang.

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;
function setImageSizer(sizer: ImageSizer | null): void;

type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;
function setImageResolver(fn: ImageResolver | null): void;
```

`ImageResolver` kan returnere en bar `Uint8Array` (MIME utledes fra filendelsen
i `src` — `.png`, `.jpg`/`.jpeg`, `.gif`, `.svg`, `.webp`; alt annet faller
tilbake til `application/octet-stream`) eller `{ bytes, mime }` for å sette
MIME-typen eksplisitt. Returner `null` når `src` ikke kan løses opp — rendereren
faller tilbake til den rå `src`-gjennomgangen, akkurat som om ingen resolver var
registrert. Å registrere en resolver har ingen effekt i seg selv; den
konsulteres bare når `inlineImages`-valget til `render` er `true` (under). Se
[Arbeid med bilder](/no/guide/images) for et gjennomarbeidet eksempel og
[Referanse](/reference/) for begge callback-typene.

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

`renderSvgAsync` er den asynkrone motparten til `renderSvg`: den forhåndshenter
nettskriftene og bildedataene grafen trenger, og legger så ut og rendrer.
`renderSvgInto` rendrer og erstatter barna til elementet med id `id`, og
sanerer SVG-en som standard (`trusted: true` hopper over det; `sanitize`
erstatter den innebygde skrubberen). Feil, inkludert dårlige argumenter, er
promise-avvisninger med de samme feilklassene som `renderSvg`; en manglende
element-id avviser med `ERR_INVALID_ARG_VALUE`. Skriftproblemer avviser aldri;
de kommer tilbake i `fontIssues`. Se
[Bruk i nettleseren](/no/guide/browser) og [Bilder](/no/guide/images), og
[Referanse](/reference/).

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

Orkestrering på lavere nivå for kallere som må drive layout og rendering som
separate trinn. `renderSvg` er en praktisk innpakning rundt nøyaktig dette:
konstruer en kontekst, registrer motorer/renderere, `layout`,
`renderWithContext`, `freeLayout`. Bruk disse direkte bare når du trenger den
kontrollen — for eksempel for å registrere en delmengde av motorene, legge til
en egen `LayoutEngine` eller `RendererPlugin`, eller rendre den samme utlagte
grafen til flere formater uten å kjøre layout på nytt (kall `layout` én gang,
deretter `renderWithContext` for hvert format, og til slutt `freeLayout`).
[Referanse](/reference/).

## `@knowvah/dot-engine/api`

Programmatisk konstruksjon, trygg kantinnsetting og uthenting av beregnet
geometri — laget for å bygge en graf uten å skrive DOT-tekst for hånd og lese
layouten tilbake som vanlige data. Se [Typer](/no/guide/types) for
`LayoutSnapshot` og de nøstede formene.

### `createGraph`

```ts
function createGraph(opts?: {
  directed?: boolean;
  strict?:   boolean;
  name?:     string;
}): GvGraphBuilder;
```

Oppretter en fersk graf klar til å gis videre til `render` / `getLayout` /
`getDrawOps`. Standardverdier: `directed: true`, `strict: false`, `name: ''`.
Returnerer en `GvGraphBuilder` — `addNode`, `addEdge`, `addSubgraph`,
`setAttr`/`getAttr`, `setHtmlAttr` (for etiketter med HTML-tabeller), og en
`.graph`-egenskap som eksponerer det ugjennomsiktige `Graph`-håndtaket. Se
[Bygg en graf i kode](/no/guide/build-a-graph) og [Referanse](/reference/) for de
fullstendige grensesnittene `GvGraphBuilder`/`GvNode`/`GvEdge`.

### `addEdge`

```ts
function addEdge(g: Graph, tail: Node, head: Node, name?: string): Edge;
```

Hjelpefunksjon for kantinnsetting på lavere nivå som ligger under
`GvGraphBuilder.addEdge` — eksportert direkte for kallere som arbeider med de
interne `Node`/`Edge`-referansene (f.eks. kanter lagt til på en graf som er
returnert av `parse()`) i stedet for byggerens ugjennomsiktige
`GvNode`/`GvEdge`-håndtak. De fleste kallere bør bruke
`createGraph(...).addEdge(tail, head, attrs?)` i stedet.

- **`name`** — kantnøkkel; standard er `''` (anonym). Ignoreres ved
  deduplisering i strikte grafer, som bare matcher på `(tail, head)` (symmetrisk
  for urettede grafer).
- **Returnerer** den nye kanten, eller den eksisterende hvis `g` er strikt og en
  `(tail, head)`-kant allerede finnes (speiler `agedge` med `cflag=1`).

Se [Bygg en graf i kode](/no/guide/build-a-graph) og
[Referanse](/reference/).

### `getLayout`

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

Returnerer et vanlig, JSON-serialiserbart øyeblikksbilde av grafens beregnede
geometri — nodeposisjoner, kontrollpunkter for kantsplines, kantetiketter,
avgrensningsbokser for klynger og de samlede grafgrensene — alt i punkter.

- **`g`** — må allerede være utlagt (via `render(g, ...)`, `getDrawOps(g)` eller
  `ctx.layout(g, engine)`); å kalle `getLayout` på en graf som ikke er utlagt
  ennå kaster i stedet for å stille returnere geometri med bare nuller.
- **`opts.yAxis`** — standard `'down'`: skjermkoordinater, origo øverst til
  venstre, y øker nedover, og `bounds` normaliseres til `(0, 0)`. `'up'` gir
  innebygde Graphviz-koordinater (origo nederst til venstre, y øker oppover) med
  `bounds.x`/`bounds.y` i det rå nedre venstre hjørnet.
- **Kaster** `Error` med `code` `ERR_INVALID_STATE` hvis `g` ikke er utlagt;
  `TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` for en dårlig `g`
  eller `opts`. Se [Feil og unntak](/no/guide/errors).

Nodens `width`/`height` konverteres til punkter (den interne modellen lagrer
tommer); alle andre koordinater er allerede i punkter. Se
[Les beregnet geometri](/no/guide/geometry) for beskrivelsen av
koordinatsystemet og [Typer](/no/guide/types) / [Referanse](/reference/) for de
fullstendige feltlistene til `LayoutSnapshot`, `NodeGeometry`, `EdgeGeometry`,
`ClusterGeometry` og `BoundsGeometry`.

### `Graph`

Ugjennomsiktig håndtakstype som re-eksporteres fra den interne modellen. Bare
*typen* eksponeres (ikke den muterbare klassen) — annoter en variabel som holder
en bygers `.graph` eller et `parse()`-resultat med den, men ikke konstruer eller
inspiser feltene direkte; bruk byggeren, `getLayout` eller `getDrawOps` for å
lese tilstanden ut igjen. [Referanse](/reference/).

## `@knowvah/dot-engine/render`

Utdata i flere formater og tilgang til rå tegneoperasjoner — laget for å rendre
en graf som allerede er `parse`rt eller bygget med byggeren.

### `render`

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  RenderOptions,
): string;
```

Legger ut og rendrer en graf til den forespurte formatstrengen.

- **`format`** — `OutputFormat`: `'svg' | 'dot' | 'xdot' | 'json' | 'plain' |
  'plain-ext' | 'imap' | 'cmapx'`.
- **`opts.engine`** — layoutmotor (standard `'dot'`).
- **`opts.inlineImages`** — se [under](#inlineimages).
- **Kaster** `RenderError` ved layout- eller renderingsfeil; `InternalError` ved
  en feil i dot-engine; `TypeError` med en `code` for ugyldige argumenter
  (inkludert en uregistrert motor eller et uregistrert format). Se
  [Feil og unntak](/no/guide/errors).

`opts.engine` speiler `engine`-parameteren til `renderSvg`; `format` er aksen
`renderSvg` ikke eksponerer (`renderSvg` er hardkodet til `'svg'`). Se
[Render til andre formater](/no/guide/render-formats) og
[Referanse](/reference/) for den fullstendige unionen `OutputFormat` og formen
på `RenderOptions`.

#### `inlineImages`

`RenderOptions.inlineImages` (standard `false`) innliner eksterne bilder som
`data:`-URI-er i stedet for den rå gjennomgangen `xlink:href="src"`. Det har
ingen effekt med mindre en resolver er registrert via `setImageResolver`
(over) — og ingen effekt på andre formater enn SVG. Når det ikke er satt, er
utdataene byte-identiske med slik de var før dette valget fantes.

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

Se [Arbeid med bilder](/no/guide/images) for den fullstendige veiledningen,
inkludert oppløsning fra `fetch` i nettleseren og fra filsystemet i Node.

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

Asynkron motpart til `render`: de samme formatene og valgene
`engine`/`inlineImages`, pluss asynkrone bildekroker per kall og forhåndshenting
av skrifter. Hver bildekrok kjører høyst én gang per distinkt `src`; et kast
eller en avvisning regnes som bom. Utdataene er usanert markup for
markup-formatene; se avsnittet «Security» i README.

### `getDrawOps` / `DEFAULT_DRAW_ENGINE`

```ts
const DEFAULT_DRAW_ENGINE: EngineName; // 'dot'

function getDrawOps(g: Graph, opts?: { engine?: EngineName }): XdotOp[];
```

Legger ut `g`, rendrer til xdot og returnerer en flat, typet tabell med
tegneoperasjoner — nodeformer, tekstspenn, farger og skrifter som verdier i en
diskriminert union (innsnevre på `op.kind` i en `switch`) — for å mate en egen
canvas-/WebGL-/PDF-renderer uten å røre SVG eller xdots strengkoding.
`opts.engine` er som standard `DEFAULT_DRAW_ENGINE` (`'dot'`).

- **Kaster** `ParseError` hvis den mellomliggende xdot-utdataen ikke kan tolkes
  på nytt (en feil i dot-engine; ikke forventet i praksis); `RenderError` ved
  layout-/renderingsfeil; `InternalError` ved enhver annen feil i dot-engine;
  `TypeError` med en `code` for ugyldige argumenter. Se
  [Feil og unntak](/no/guide/errors).

Se [Egen rendering med xdot](/no/guide/xdot-drawops) for listen over
operasjonstyper og et gjennomarbeidet canvas-eksempel, og
[Typer](/no/guide/types) / [Referanse](/reference/) for den fullstendige
unionen `XdotOp` og formene `Xdot`/`XdotColor`.
