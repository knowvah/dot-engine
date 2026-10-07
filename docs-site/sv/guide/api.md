---
sourceHash: e2e54229b04c577dfb514c415c7f02fd786b797b5bfc7a4bbf2e4192d03d0c09
---

# API-referens

Den publika ytan är medvetet liten. De flesta anropare behöver bara `renderSvg`.
Se [Översikt](/sv/guide/overview) för vilken ingångspunkt du ska använda,
[Typer](/sv/guide/types) för formerna på det varje funktion tar emot och
returnerar, och det genererade [Referens](/reference/) för fullständiga
signaturer, alla fält och alla överlagringar.

> Typdeklarationer (`.d.ts`) skapas av `npm run build` (steget `build:types`
> kör `tsc -p tsconfig.build.json`). Tabellen `exports` i `package.json`
> kopplar `types`-villkor för varje ingång, så `@knowvah/dot-engine`,
> `@knowvah/dot-engine/api` och `@knowvah/dot-engine/render` löser alla upp
> typer i editorer och efterföljande byggen.
>
> Bygget skapar också deklarationskartor (`.d.ts.map`) och källkartor för JS,
> och paketet levererar sina `src/`-källor — så ”gå till definition” hoppar
> direkt till den riktiga TypeScript-koden, vilket gör det enkelt att läsa
> koden och öppna en PR.

Den här sidan är ordnad efter de tre ingångspunkterna ([Översikt](/sv/guide/overview)
beskriver när du ska använda vilken): rotpaketet `@knowvah/dot-engine` (tolka +
rendera i ett anrop, plus processglobal konfiguration), `@knowvah/dot-engine/api`
(bygg en graf i kod, läs tillbaka beräknad geometri) och
`@knowvah/dot-engine/render` (utdata i flera format och råa ritoperationer).
Varje funktion nedan återexporteras också från rotpaketet
(`export * from './api/index.js'` / `export * from './render/index.js'` i
`src/index.ts`) — att importera allt från `@knowvah/dot-engine` fungerar, men
import via underkatalogerna i sökvägen är tydligare om vilket lager du rör.

## `@knowvah/dot-engine` (rot)

### `renderSvg`

```ts
function renderSvg(dotSource: string, engine: EngineName): string;
```

Tolkar DOT-källkoden, kör den namngivna [layoutmotorn](/sv/guide/engines),
renderar till SVG och returnerar SVG-strängen. Det här är
bekvämlighetsfunktionen för ett enda anrop: den skapar en `GvcContext`,
registrerar de åtta inbyggda motorerna och SVG-renderaren, lägger ut,
renderar och frigör layouten — se
[`GvcContext` / `renderWithContext`](#gvccontext-renderwithcontext) nedan om du
behöver de stegen åtskilda.

- **`dotSource`** — graf i DOT-språket.
- **`engine`** — `EngineName`: en av de inbyggda (`dot`, `neato`, `fdp`,
  `sfdp`, `circo`, `twopi`, `osage`, `patchwork`) eller vilket eget
  registrerat namn som helst.
- **Kastar** ett `DotEngineError` för alla problem med indata: `ParseError` om
  `dotSource` är ogiltig, `RenderError` om layout eller rendering misslyckas,
  `InternalError` (med `cause`) för ett fel i dot-engine. Ett `TypeError` med
  `code` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` om `dotSource` eller
  `engine` är ogiltig (inklusive ett motornamn som inte är registrerat). Se
  [Fel och undantag](/sv/guide/errors).

Fullständig signatur, JSDoc och fältlistan för `GvError`: [Referens](/reference/).

### `tryRenderSvg` / `RenderResult`

```ts
function tryRenderSvg(dotSource: string, engine: EngineName): RenderResult;
```

Syskonfunktion till `renderSvg` i resultatstil. Returnerar (kastar aldrig) för
vilken DOT-indata som helst: `{ svg }` vid lyckad körning eller
`{ errors: [one] }` vid första felet; `svg` och `errors` utesluter varandra.
Den kastar bara vid ogiltiga argument (`TypeError`
`ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`). Varje post i `errors` är
vanlig, JSON-serialiserbar data (`type`, `code`, `message`, `friendlyMessage`,
plus `location` / `expected` när de finns; ingen `cause`, ingen stackspårning),
så den kan skickas över en worker-/postMessage-gräns eller serialiseras till en
logg. Föredra den framför `renderSvg` + `try`/`catch` när anroparen vill
förgrena på `code` / `type` i stället för att fånga ett undantag. Se
[Fel och undantag](/sv/guide/errors).
[Referens](/reference/).

### `parse` / `ParseError`

```ts
function parse(dotSource: string): Graph;
```

Tolkar DOT till den minnesinterna grafmodellen **utan** att lägga ut den.
Användbart för att inspektera eller transformera grafen — eller för att lämna
den till `getLayout` i `@knowvah/dot-engine/api` eller `render` i
`@knowvah/dot-engine/render` — före rendering.

- **Kastar** `ParseError` vid syntaxfel eller brott mot kantriktning (till
  exempel `->` i en oriktad graf). `ParseError` utökar `DotEngineError` och
  implementerar `GvError` med `type: 'syntax'`; den bär ett
  `location: { line, column, offset? }`. `TypeError` `ERR_INVALID_ARG_TYPE` om
  `dotSource` inte är en sträng. [Fel och undantag](/sv/guide/errors),
  [Referens](/reference/).

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

`instanceof DotEngineError` betyder att dot-engine misslyckades med den här
indatan. `RenderError` täcker kända layout-/renderingsfel (`type` är `semantic`
för `UNKNOWN_LAYOUT` och `UNSUPPORTED_FEATURE`). `InternalError` är ett fel i
dot-engine; `cause` innehåller det ursprungliga felet när ett sådant omslöts.
Anroparens misstag kastar i stället ett vanligt `TypeError` / `RangeError` /
`Error` med en `code`. `isGvError` kontrollerar att `type` och `code` är
strängar, så den fungerar över duplicerade paket (bundles). Se
[Fel och undantag](/sv/guide/errors) för varje kod och vad varje funktion kan
kasta, [Typer](/sv/guide/types) för formen på `GvError` och
[Referens](/reference/) för medlemslistan i `GvErrorCode`.

### `setTextMeasurer` / `getTextMeasurer`

```ts
function setTextMeasurer(measurer: TextMeasurer | null): void;
function getTextMeasurer(): TextMeasurer;
```

Registrerar (eller rensar, med `null`) den processglobala textmätaren som
anlitas under layouten för att storleksbestämma etiketter. Rensning faller
tillbaka på bibliotekets standard (webbläsare: `CanvasTextMeasurer`;
huvudlöst/Node: `EstimateTextMeasurer`, om inte en LUT-mätare är kopplad) — se
[Textmätning](/sv/guide/text-measurement) för hela upplösningsordningen och
implementationerna `CanvasTextMeasurer` / `EstimateTextMeasurer` /
`LutTextMeasurer` som exporteras tillsammans med de här funktionerna.
[Referens](/reference/).

### `setImageSizer` / `setImageResolver`

Två besläktade men skilda kopplingspunkter för bildkonfiguration — båda är
processglobala register som följer samma mönster (registrera en callback, ange
`null` för att rensa), och båda gör ingenting förrän en anropare registrerar
en:

- **`setImageSizer`** — rapporterar en extern bilds *inneboende mått* så att
  layoutmotorn kan reservera plats för en HTML-cell `<IMG>` eller ett
  nodattribut `image=` före renderingen. Returneras `null` (eller ingen
  storleksgivare är registrerad) återskapas native Graphviz beteende vid saknad
  bild: en varning och storlek noll.
- **`setImageResolver`** (ny — se [`inlineImages`](#inlineimages) nedan) —
  levererar själva bild-*byten* så att SVG-renderaren kan bädda in dem som en
  `data:`-URI i stället för att skriva `xlink:href="src"` som en rå
  vidareförmedling.

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;
function setImageSizer(sizer: ImageSizer | null): void;

type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;
function setImageResolver(fn: ImageResolver | null): void;
```

`ImageResolver` kan returnera en bar `Uint8Array` (MIME härleds från `src`s
filändelse — `.png`, `.jpg`/`.jpeg`, `.gif`, `.svg`, `.webp`; allt annat faller
tillbaka på `application/octet-stream`) eller `{ bytes, mime }` för att ange
MIME-typen uttryckligen. Returnera `null` när `src` inte kan lösas — renderaren
faller då tillbaka på rå vidareförmedling av `src`, precis som när ingen
resolver är registrerad. Att registrera en resolver har ingen effekt i sig; den
anlitas bara när alternativet `inlineImages` i `render` är `true` (nedan). Se
[Arbeta med bilder](/sv/guide/images) för ett genomgånget exempel och
[Referens](/reference/) för båda callback-typerna.

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

`renderSvgAsync` är den asynkrona motsvarigheten till `renderSvg`: den
förhämtar de webbteckensnitt och bilddata som grafen behöver och lägger sedan
ut och renderar. `renderSvgInto` renderar och ersätter barnen till elementet
med id `id`, och saniterar SVG som standard (`trusted: true` hoppar över det;
`sanitize` ersätter den inbyggda rensaren). Fel, inklusive felaktiga argument,
är förkastade promises med samma felklasser som `renderSvg`; ett saknat
element-id förkastar med `ERR_INVALID_ARG_VALUE`. Teckensnittsproblem
förkastar aldrig; de kommer tillbaka i `fontIssues`. Se
[Använd i webbläsaren](/sv/guide/browser) och [Bilder](/sv/guide/images), samt
[Referens](/reference/).

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

Orkestrering på lägre nivå för anropare som behöver styra layout och rendering
som separata steg. `renderSvg` är en bekvämlighetsfunktion över exakt detta:
skapa en kontext, registrera motorer/renderare, `layout`, `renderWithContext`,
`freeLayout`. Använd dem direkt bara när du behöver den kontrollen — till
exempel för att registrera en delmängd av motorerna, lägga till en egen
`LayoutEngine` eller `RendererPlugin`, eller rendera samma utlagda graf till
flera format utan att köra om layouten (anropa `layout` en gång, sedan
`renderWithContext` för varje format, och därefter `freeLayout`).
[Referens](/reference/).

## `@knowvah/dot-engine/api`

Programmatisk konstruktion, säker kantinsättning och uttag av beräknad
geometri — lagret för att bygga en graf utan att handskriva DOT-text och läsa
tillbaka dess layout som vanlig data. Se [Typer](/sv/guide/types) för
`LayoutSnapshot` och dess nästlade former.

### `createGraph`

```ts
function createGraph(opts?: {
  directed?: boolean;
  strict?:   boolean;
  name?:     string;
}): GvGraphBuilder;
```

Skapar en ny graf redo för överlämning till `render` / `getLayout` /
`getDrawOps`. Standardvärden: `directed: true`, `strict: false`, `name: ''`.
Returnerar en `GvGraphBuilder` — `addNode`, `addEdge`, `addSubgraph`,
`setAttr`/`getAttr`, `setHtmlAttr` (för HTML-tabelletiketter) och en
egenskap `.graph` som exponerar det ogenomskinliga `Graph`-handtaget. Se
[Bygg en graf i kod](/sv/guide/build-a-graph) och
[Referens](/reference/) för de fullständiga gränssnitten
`GvGraphBuilder`/`GvNode`/`GvEdge`.

### `addEdge`

```ts
function addEdge(g: Graph, tail: Node, head: Node, name?: string): Edge;
```

Lågnivåhjälpare för kantinsättning som ligger under `GvGraphBuilder.addEdge` —
exporterad direkt för anropare som arbetar med de interna
`Node`-/`Edge`-referenserna (till exempel kanter som läggs till på en graf som
returnerats av `parse()`) i stället för byggarens ogenomskinliga
`GvNode`-/`GvEdge`-handtag. De flesta anropare bör i stället använda
`createGraph(...).addEdge(tail, head, attrs?)`.

- **`name`** — kantnyckel; standardvärde `''` (anonym). Ignoreras vid
  deduplicering på strikta grafer, som matchar enbart på `(tail, head)`
  (symmetriskt för oriktade grafer).
- **Returnerar** den nya kanten, eller den befintliga om `g` är strikt och en
  `(tail, head)`-kant redan finns (speglar `agedge` med `cflag=1`).

Se [Bygg en graf i kod](/sv/guide/build-a-graph) och
[Referens](/reference/).

### `getLayout`

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

Returnerar en vanlig, JSON-serialiserbar ögonblicksbild av grafens beräknade
geometri — nodpositioner, kontrollpunkter för kantsplines, kantetiketter,
klustrens begränsningsrutor och grafens övergripande gränser — allt i punkter.

- **`g`** — måste redan vara utlagd (via `render(g, ...)`, `getDrawOps(g)` eller
  `ctx.layout(g, engine)`); att anropa `getLayout` på en graf som ännu inte
  lagts ut kastar i stället för att tyst returnera geometri med bara nollor.
- **`opts.yAxis`** — standardvärde `'down'`: skärmkoordinater, origo uppe till
  vänster, y ökar nedåt, och `bounds` normaliseras till `(0, 0)`. `'up'`
  returnerar Graphviz egna koordinater (origo nere till vänster, y ökar uppåt)
  med `bounds.x`/`bounds.y` i det råa nedre vänstra hörnet.
- **Kastar** `Error` med `code` `ERR_INVALID_STATE` om `g` inte har lagts ut;
  `TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` för ett
  felaktigt `g` eller felaktiga `opts`. Se [Fel och undantag](/sv/guide/errors).

Nodernas `width`/`height` konverteras till punkter (den interna modellen lagrar
tum); alla andra koordinater är redan i punkter. Se
[Läs beräknad geometri](/sv/guide/geometry) för genomgången av
koordinatsystemet och [Typer](/sv/guide/types) / [Referens](/reference/) för de
fullständiga fältlistorna för `LayoutSnapshot`, `NodeGeometry`, `EdgeGeometry`,
`ClusterGeometry` och `BoundsGeometry`.

### `Graph`

Ogenomskinlig handtagstyp som återexporteras från den interna modellen. Bara
*typen* exponeras (inte den muterbara klassen) — annotera en variabel som
håller en byggares `.graph` eller ett `parse()`-resultat med den, men skapa
eller inspektera inte dess fält direkt; använd byggaren, `getLayout` eller
`getDrawOps` för att läsa tillbaka tillstånd. [Referens](/reference/).

## `@knowvah/dot-engine/render`

Utdata i flera format och åtkomst till råa ritoperationer — lagret för att
rendera en redan `parse`ad graf eller en graf konstruerad med byggaren.

### `render`

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  RenderOptions,
): string;
```

Lägger ut och renderar en graf till den begärda formatsträngen.

- **`format`** — `OutputFormat`: `'svg' | 'dot' | 'xdot' | 'json' | 'plain' |
  'plain-ext' | 'imap' | 'cmapx'`.
- **`opts.engine`** — layoutmotor (standardvärde `'dot'`).
- **`opts.inlineImages`** — se [nedan](#inlineimages).
- **Kastar** `RenderError` vid layout- eller renderingsfel; `InternalError` vid
  ett fel i dot-engine; `TypeError` med en `code` för ogiltiga argument
  (inklusive en oregistrerad motor eller ett oregistrerat format). Se
  [Fel och undantag](/sv/guide/errors).

`opts.engine` speglar parametern `engine` i `renderSvg`; `format` är den axel
som `renderSvg` inte exponerar (`renderSvg` är hårdkodad till `'svg'`). Se
[Rendera till andra format](/sv/guide/render-formats) och
[Referens](/reference/) för hela unionen `OutputFormat` och formen på
`RenderOptions`.

#### `inlineImages`

`RenderOptions.inlineImages` (standardvärde `false`) bäddar in externa bilder
som `data:`-URI:er i stället för den råa vidareförmedlingen
`xlink:href="src"`. Det har ingen effekt om ingen resolver registrerats via
`setImageResolver` (ovan) — och ingen effekt på format som inte är SVG. Om det
inte är angivet är utdata byte för byte identisk med den före det här
alternativets tillkomst.

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

Se [Arbeta med bilder](/sv/guide/images) för hela guiden, inklusive hur du
löser upp bilder från `fetch` i webbläsaren och från filsystemet i Node.

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

Asynkron motsvarighet till `render`: samma format och alternativen
`engine`/`inlineImages`, plus asynkrona bildkrokar per anrop och
förhämtning av teckensnitt. Varje bildkrok körs högst en gång per distinkt
`src`; ett kast eller en förkastning räknas som en miss. Utdata är osanerad
markup för markupformaten; se avsnittet ”Security” i README.

### `getDrawOps` / `DEFAULT_DRAW_ENGINE`

```ts
const DEFAULT_DRAW_ENGINE: EngineName; // 'dot'

function getDrawOps(g: Graph, opts?: { engine?: EngineName }): XdotOp[];
```

Lägger ut `g`, renderar till xdot och returnerar en platt, typad array av
ritoperationer — nodformer, textspann, färger och teckensnitt som värden i en
diskriminerad union (avgränsa på `op.kind` i en `switch`) — för att mata en egen
canvas-/WebGL-/PDF-renderare utan att röra SVG eller xdots strängkodning.
`opts.engine` har som standard `DEFAULT_DRAW_ENGINE` (`'dot'`).

- **Kastar** `ParseError` om den mellanliggande xdot-utdatan inte kan tolkas
  på nytt (ett fel i dot-engine; förväntas inte i praktiken); `RenderError` vid
  layout-/renderingsfel; `InternalError` vid något annat fel i dot-engine;
  `TypeError` med en `code` för ogiltiga argument. Se
  [Fel och undantag](/sv/guide/errors).

Se [Egen rendering med xdot-ritoperationer](/sv/guide/xdot-drawops) för listan
över operationstyper och ett genomgånget canvas-exempel, samt
[Typer](/sv/guide/types) / [Referens](/reference/) för hela unionen `XdotOp`
och formerna `Xdot`/`XdotColor`.
