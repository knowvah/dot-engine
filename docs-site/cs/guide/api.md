---
sourceHash: e2e54229b04c577dfb514c415c7f02fd786b797b5bfc7a4bbf2e4192d03d0c09
---

# Reference API

Veřejné rozhraní je záměrně malé. Většina volajících potřebuje jen `renderSvg`.
Který vstupní bod použít, popisuje [Přehled](/cs/guide/overview), tvary, které
každá funkce přijímá a vrací, popisují [Typy](/cs/guide/types) a vygenerovaná
[Reference](/reference/) obsahuje vyčerpávající signatury, každé pole a každé
přetížení.

> Deklarace typů (`.d.ts`) vytváří `npm run build` (krok `build:types` spouští
> `tsc -p tsconfig.build.json`). Mapa `exports` v `package.json` zapojuje
> podmínky `types` pro každý vstupní bod, takže `@knowvah/dot-engine`,
> `@knowvah/dot-engine/api` a `@knowvah/dot-engine/render` všechny řeší typy
> v editorech i v navazujících sestaveních.
>
> Sestavení také vytváří mapy deklarací (`.d.ts.map`) a source mapy JS a balíček
> dodává své zdrojové kódy `src/` — takže „přejít na definici“ skočí rovnou na
> skutečný TypeScript, což usnadňuje čtení kódu i otevření PR.

Tato stránka je uspořádána podle tří vstupních bodů ([Přehled](/cs/guide/overview)
vysvětluje, kdy sáhnout po kterém): kořenový balíček `@knowvah/dot-engine`
(parsování + vykreslení jedním voláním plus globální konfigurace procesu),
`@knowvah/dot-engine/api` (sestavení grafu v kódu, čtení vypočtené geometrie
zpět) a `@knowvah/dot-engine/render` (výstup ve více formátech a surové
kreslicí operace). Každá níže uvedená funkce se re-exportuje i z kořenového
balíčku (`export * from './api/index.js'` /
`export * from './render/index.js'` v `src/index.ts`) — importování všeho
z `@knowvah/dot-engine` funguje, ale importy z podcest jasněji říkají, na kterou
vrstvu sahate.

## `@knowvah/dot-engine` (kořen)

### `renderSvg`

```ts
function renderSvg(dotSource: string, engine: EngineName): string;
```

Zpracuje zdrojový kód DOT, spustí pojmenovaný [modul rozvržení](/cs/guide/engines),
vykreslí do SVG a vrátí řetězec SVG. Jde o pohodlný obal na jedno volání:
vytvoří `GvcContext`, zaregistruje osm vestavěných modulů a vykreslovač SVG,
provede rozvržení, vykreslení a uvolní rozvržení — pokud tyto kroky potřebujete
oddělit, viz níže [`GvcContext` / `renderWithContext`](#gvccontext-renderwithcontext).

- **`dotSource`** — zdrojový kód grafu v jazyce DOT.
- **`engine`** — `EngineName`: jeden z vestavěných (`dot`, `neato`, `fdp`,
  `sfdp`, `circo`, `twopi`, `osage`, `patchwork`) nebo libovolný vlastní
  registrovaný název.
- **Vyhazuje** `DotEngineError` pro jakýkoli problém se vstupem: `ParseError`,
  pokud je `dotSource` neplatný, `RenderError`, pokud selže rozvržení nebo
  vykreslení, `InternalError` (s `cause`) pro chybu v dot-engine. `TypeError`
  s `code` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`, pokud je
  `dotSource` nebo `engine` neplatný (včetně názvu modulu, který není
  registrován). Viz [Chyby a výjimky](/cs/guide/errors).

Úplnou signaturu, JSDoc a seznam polí `GvError` najdete v [Referenci](/reference/).

### `tryRenderSvg` / `RenderResult`

```ts
function tryRenderSvg(dotSource: string, engine: EngineName): RenderResult;
```

Sourozenec `renderSvg` ve stylu výsledku. Pro jakýkoli vstup DOT vrací (nikdy
nevyhazuje): `{ svg }` při úspěchu nebo `{ errors: [one] }` při prvním selhání;
`svg` a `errors` se vzájemně vylučují. Vyhazuje pouze pro neplatné argumenty
(`TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`). Každá položka
v `errors` jsou prostá data serializovatelná do JSON (`type`, `code`,
`message`, `friendlyMessage`, plus `location` / `expected`, pokud jsou
k dispozici; žádné `cause`, žádný zásobník volání), takže je bezpečné ji poslat
přes hranici workeru/postMessage nebo serializovat do logu. Dejte tomu přednost
před `renderSvg` + `try`/`catch`, když chce volající větvit podle `code` /
`type` místo zachytávání výjimky. Viz [Chyby a výjimky](/cs/guide/errors).
[Reference](/reference/).

### `parse` / `ParseError`

```ts
function parse(dotSource: string): Graph;
```

Zpracuje DOT do modelu grafu v paměti **bez** rozvržení. Užitečné pro kontrolu
nebo transformaci grafu — nebo jeho předání funkcím `getLayout` z
`@knowvah/dot-engine/api` / `render` z `@knowvah/dot-engine/render` — před
vykreslením.

- **Vyhazuje** `ParseError` pro syntaktické chyby nebo porušení směru hran (např.
  `->` v neorientovaném grafu). `ParseError` rozšiřuje `DotEngineError` a
  implementuje `GvError` s `type: 'syntax'`; nese
  `location: { line, column, offset? }`. `TypeError` `ERR_INVALID_ARG_TYPE`,
  pokud `dotSource` není řetězec. [Chyby a výjimky](/cs/guide/errors),
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

`instanceof DotEngineError` znamená, že dot-engine na tomto vstupu selhal.
`RenderError` pokrývá známá selhání rozvržení/vykreslení (`type` je `semantic`
pro `UNKNOWN_LAYOUT` a `UNSUPPORTED_FEATURE`). `InternalError` je chyba
v dot-engine; `cause` obsahuje původní chybu, pokud byla obalena. Chyby volajícího
místo toho vyhazují standardní `TypeError` / `RangeError` / `Error` s `code`.
`isGvError` kontroluje řetězcové `type` a `code`, takže funguje i napříč
duplicitními balíčky. Každý kód a to, co může která funkce vyhodit, viz
[Chyby a výjimky](/cs/guide/errors), tvar `GvError` viz [Typy](/cs/guide/types)
a seznam členů `GvErrorCode` viz [Reference](/reference/).

### `setTextMeasurer` / `getTextMeasurer`

```ts
function setTextMeasurer(measurer: TextMeasurer | null): void;
function getTextMeasurer(): TextMeasurer;
```

Zaregistruje (nebo s `null` zruší) procesově globální měřič textu, který se
při rozvržení používá k určení velikosti popisků. Zrušení se vrátí k výchozí
variantě knihovny (prohlížeč: `CanvasTextMeasurer`; bezhlavý režim/Node:
`EstimateTextMeasurer`, pokud není zapojen měřič LUT — úplné pořadí určení a
implementace `CanvasTextMeasurer` / `EstimateTextMeasurer` /
`LutTextMeasurer`, exportované vedle těchto funkcí, viz
[Měření textu](/cs/guide/text-measurement)).
[Reference](/reference/).

### `setImageSizer` / `setImageResolver`

Dvě související, ale odlišná rozhraní pro konfiguraci obrázků — obě jsou
procesově globální registry se stejným vzorem (zaregistrujte zpětné volání,
`null` jej zruší) a obě nedělají nic, dokud volající žádné nezaregistruje:

- **`setImageSizer`** — hlásí *vlastní rozměry* externího obrázku, aby modul
  rozvržení mohl před vykreslením vyhradit místo pro buňku HTML `<IMG>` nebo
  atribut uzlu `image=`. Vrácení `null` (nebo nezaregistrování žádného sizeru)
  reprodukuje chování nativního Graphviz při chybějícím obrázku: varování a
  nulovou velikost.
- **`setImageResolver`** (nové — viz níže [`inlineImages`](#inlineimages)) —
  dodává skutečná *data bajtů* obrázku, aby je vykreslovač SVG mohl vložit jako
  URI `data:` místo vypsání `xlink:href="src"` jako surového průchodu.

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;
function setImageSizer(sizer: ImageSizer | null): void;

type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;
function setImageResolver(fn: ImageResolver | null): void;
```

`ImageResolver` může vrátit holý `Uint8Array` (MIME se odvodí z přípony souboru
v `src` — `.png`, `.jpg`/`.jpeg`, `.gif`, `.svg`, `.webp`; cokoli jiného
se vrátí k `application/octet-stream`) nebo `{ bytes, mime }` pro explicitní
nastavení typu MIME. Vraťte `null`, když `src` nelze vyřešit — vykreslovač se
vrátí k surovému průchodu `src`, stejně jako když není zaregistrován žádný
resolver. Samotná registrace resolveru nemá žádný účinek; používá se jen tehdy,
když je volba `inlineImages` funkce `render` `true` (níže). Podrobný příklad viz
[Práce s obrázky](/cs/guide/images), oba typy zpětných volání viz
[Reference](/reference/).

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

`renderSvgAsync` je asynchronní protějšek `renderSvg`: předem načte webová písma
a data obrázků, která graf potřebuje, a pak provede rozvržení a vykreslení.
`renderSvgInto` vykreslí a nahradí potomky elementu s id `id`, přičemž SVG
standardně sanitizuje (`trusted: true` to přeskočí; `sanitize` nahradí
vestavěný čistič). Selhání, včetně špatných argumentů, jsou odmítnutí promise
(rejection) stejnými třídami chyb jako u `renderSvg`; chybějící id elementu
odmítne s `ERR_INVALID_ARG_VALUE`. Problémy s písmy nikdy neodmítnou; vrátí se
v `fontIssues`. Viz [Použití v prohlížeči](/cs/guide/browser) a
[Práce s obrázky](/cs/guide/images) a [Reference](/reference/).

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

Nízkoúrovňová orchestrace pro volající, kteří potřebují řídit rozvržení a
vykreslení jako samostatné kroky. `renderSvg` je pohodlný obal přesně nad tímto:
vytvořit kontext, zaregistrovat moduly/vykreslovače, `layout`,
`renderWithContext`, `freeLayout`. Sáhněte po nich přímo, jen když takovou
kontrolu potřebujete — například k registraci podmnožiny modulů, přidání
vlastního `LayoutEngine` nebo `RendererPlugin`, nebo k vykreslení téhož
rozvrženého grafu do více formátů bez opakovaného rozvržení (zavolejte `layout`
jednou, pak `renderWithContext` pro každý formát, nakonec `freeLayout`).
[Reference](/reference/).

## `@knowvah/dot-engine/api`

Programové sestavování, bezpečné vkládání hran a čtení vypočtené geometrie —
vrstva pro sestavení grafu bez ručního psaní textu DOT a čtení jeho rozvržení
zpět jako prostých dat. `LayoutSnapshot` a jeho vnořené tvary viz
[Typy](/cs/guide/types).

### `createGraph`

```ts
function createGraph(opts?: {
  directed?: boolean;
  strict?:   boolean;
  name?:     string;
}): GvGraphBuilder;
```

Vytvoří nový graf připravený k předání funkcím `render` / `getLayout` /
`getDrawOps`. Výchozí hodnoty: `directed: true`, `strict: false`, `name: ''`.
Vrací `GvGraphBuilder` — `addNode`, `addEdge`, `addSubgraph`,
`setAttr`/`getAttr`, `setHtmlAttr` (pro popisky s HTML tabulkou) a vlastnost
`.graph`, která zpřístupňuje neprůhledný (opaque) handle `Graph`. Viz
[Sestavení grafu v kódu](/cs/guide/build-a-graph) a [Reference](/reference/)
pro úplná rozhraní `GvGraphBuilder`/`GvNode`/`GvEdge`.

### `addEdge`

```ts
function addEdge(g: Graph, tail: Node, head: Node, name?: string): Edge;
```

Nízkoúrovňový pomocník pro vkládání hran, na němž stojí `GvGraphBuilder.addEdge`
— exportovaný přímo pro volající pracující s interními odkazy `Node`/`Edge`
(např. hrany přidávané do grafu vráceného z `parse()`) místo neprůhledných
handlů `GvNode`/`GvEdge` builderu. Většina volajících by měla místo toho použít
`createGraph(...).addEdge(tail, head, attrs?)`.

- **`name`** — klíč hrany; výchozí `''` (anonymní). Při deduplikaci ve strict
  grafu se ignoruje, ta porovnává pouze `(tail, head)` (u neorientovaných grafů
  symetricky).
- **Vrací** novou hranu, nebo existující, pokud je `g` strict a hrana
  `(tail, head)` už existuje (odpovídá `agedge` s `cflag=1`).

Viz [Sestavení grafu v kódu](/cs/guide/build-a-graph) a
[Reference](/reference/).

### `getLayout`

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

Vrátí prostý snímek vypočtené geometrie grafu serializovatelný do JSON — pozice
uzlů, řídicí body splinů hran, popisky hran, ohraničující rámečky clusterů a
celkové meze grafu — vše v bodech.

- **`g`** — musí být již rozvržen (přes `render(g, ...)`, `getDrawOps(g)` nebo
  `ctx.layout(g, engine)`); zavolání `getLayout` na dosud nerozvržený graf
  vyhodí chybu, místo aby tiše vrátilo nulovou geometrii.
- **`opts.yAxis`** — výchozí `'down'`: souřadnice obrazovky, počátek vlevo
  nahoře, y roste dolů a `bounds` je normalizováno k `(0, 0)`. `'up'` vrací
  nativní souřadnice Graphviz (počátek vlevo dole, y roste nahoru) s
  `bounds.x`/`bounds.y` v původním levém dolním rohu.
- **Vyhazuje** `Error` s `code` `ERR_INVALID_STATE`, pokud `g` nebyl rozvržen;
  `TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` pro špatné `g`
  nebo `opts`. Viz [Chyby a výjimky](/cs/guide/errors).

`width`/`height` uzlu se převádějí na body (interní model ukládá palce); každá
další souřadnice je již v bodech. Popis souřadnicového systému viz
[Čtení vypočtené geometrie](/cs/guide/geometry) a úplné seznamy polí
`LayoutSnapshot`, `NodeGeometry`, `EdgeGeometry`, `ClusterGeometry` a
`BoundsGeometry` viz [Typy](/cs/guide/types) / [Reference](/reference/).

### `Graph`

Neprůhledný typ handlu re-exportovaný z interního modelu. Zpřístupněn je pouze
*typ* (ne měnitelná třída) — použijte jej k anotaci proměnné držící `.graph`
builderu nebo výsledek `parse()`, ale jeho pole nevytvářejte ani přímo
neprohlížejte; stav čtěte zpět pomocí builderu, `getLayout` nebo `getDrawOps`.
[Reference](/reference/).

## `@knowvah/dot-engine/render`

Výstup ve více formátech a přímý přístup ke kreslicím operacím — vrstva pro
vykreslení již zpracovaného (`parse`) nebo builderem sestaveného grafu.

### `render`

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  RenderOptions,
): string;
```

Provede rozvržení a vykreslí graf do řetězce požadovaného formátu.

- **`format`** — `OutputFormat`: `'svg' | 'dot' | 'xdot' | 'json' | 'plain' |
  'plain-ext' | 'imap' | 'cmapx'`.
- **`opts.engine`** — modul rozvržení (výchozí `'dot'`).
- **`opts.inlineImages`** — viz [níže](#inlineimages).
- **Vyhazuje** `RenderError` při selhání rozvržení nebo vykreslení;
  `InternalError` při chybě v dot-engine; `TypeError` s `code` pro neplatné
  argumenty (včetně neregistrovaného modulu nebo formátu). Viz
  [Chyby a výjimky](/cs/guide/errors).

`opts.engine` odpovídá parametru `engine` funkce `renderSvg`; `format` je osa,
kterou `renderSvg` nezpřístupňuje (`renderSvg` je napevno nastaveno na
`'svg'`). Viz [Vykreslení do jiných formátů](/cs/guide/render-formats) a
[Reference](/reference/) pro úplné sjednocení `OutputFormat` a tvar
`RenderOptions`.

#### `inlineImages`

`RenderOptions.inlineImages` (výchozí `false`) vkládá externí obrázky jako URI
`data:` místo surového průchodu `xlink:href="src"`. Nemá žádný účinek, pokud
není pomocí `setImageResolver` (výše) zaregistrován resolver — a nemá účinek ani
na formáty jiné než SVG. Při nenastavení je výstup bajt po bajtu shodný s
výstupem před zavedením této volby.

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

Úplného průvodce, včetně získávání dat přes `fetch` v prohlížeči a ze souborového
systému v Node, najdete v části [Práce s obrázky](/cs/guide/images).

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

Asynchronní protějšek `render`: stejné formáty a volby `engine`/`inlineImages`,
navíc asynchronní háčky pro obrázky pro každé volání a předběžné načtení písem.
Každý háček pro obrázky se spustí nejvýše jednou pro každý odlišný `src`; throw
nebo reject se počítá jako minutí (miss). Výstup je u formátů značkování
nesanitizované značkování; viz sekce „Security“ v README.

### `getDrawOps` / `DEFAULT_DRAW_ENGINE`

```ts
const DEFAULT_DRAW_ENGINE: EngineName; // 'dot'

function getDrawOps(g: Graph, opts?: { engine?: EngineName }): XdotOp[];
```

Provede rozvržení `g`, vykreslí do xdot a vrátí plochou typovanou posloupnost
kreslicích operací — tvary uzlů, textové úseky, barvy a písma jako hodnoty
diskriminovaného sjednocení (zužujte podle `op.kind` ve `switch`) — pro napájení
vlastního vykreslovače canvas/WebGL/PDF bez zásahu do SVG nebo řetězcového
kódování xdot. `opts.engine` má výchozí hodnotu `DEFAULT_DRAW_ENGINE` (`'dot'`).

- **Vyhazuje** `ParseError`, pokud průběžný výstup xdot nelze znovu zpracovat
  (chyba v dot-engine; v praxi se nečeká); `RenderError` při selhání
  rozvržení/vykreslení; `InternalError` při jakékoli jiné chybě v dot-engine;
  `TypeError` s `code` pro neplatné argumenty. Viz
  [Chyby a výjimky](/cs/guide/errors).

Seznam druhů operací a podrobný příklad s canvasem viz
[Vlastní vykreslování pomocí xdot](/cs/guide/xdot-drawops), úplné sjednocení
`XdotOp` a tvary `Xdot`/`XdotColor` viz [Typy](/cs/guide/types) /
[Reference](/reference/).
