---
sourceHash: e2e54229b04c577dfb514c415c7f02fd786b797b5bfc7a4bbf2e4192d03d0c09
---

# API-referencia

A nyilvános felület szándékosan kicsi. A legtöbb hívónak csak a `renderSvg`
kell. Hogy melyik belépési pontot érdemes használni, azt az
[Áttekintés](/hu/guide/overview) mondja meg; az egyes függvények által fogadott
és visszaadott alakokat a [Típusok](/hu/guide/types) írja le, a generált
[Referencia](/reference/) pedig kimerítő szignatúrákat, minden mezőt és minden
túlterhelést tartalmaz.

> A típusdeklarációkat (`.d.ts`) az `npm run build` állítja elő (a `build:types`
> lépés a `tsc -p tsconfig.build.json` parancsot futtatja). A `package.json`
> `exports` térképe minden belépési ponthoz bekötötte a `types` feltételeket,
> így a `@knowvah/dot-engine`, a `@knowvah/dot-engine/api` és a
> `@knowvah/dot-engine/render` egyaránt feloldja a típusokat a szerkesztőkben és
> a downstream buildekben.
>
> A build deklarációs térképeket (`.d.ts.map`) és JS-forrástérképeket is
> előállít, a csomag pedig a `src/` forrásait is tartalmazza — így a „go to
> definition” közvetlenül a valódi TypeScriptre ugrik, ami megkönnyíti a kód
> olvasását és a PR megnyitását.

Ez az oldal a három belépési pont szerint szerveződik (az [Áttekintés](/hu/guide/overview)
elmondja, mikor melyikhez érdemes nyúlni): a gyökér `@knowvah/dot-engine` csomag
(értelmezés + renderelés egy hívásban, valamint a folyamat-globális
konfiguráció), a `@knowvah/dot-engine/api` (gráf felépítése kódból, a kiszámított
geometria visszaolvasása) és a `@knowvah/dot-engine/render` (többformátumú
kimenet és nyers rajzolási műveletek). Az alábbi függvények mindegyike a gyökér
csomagból is újraexportálva van (`export * from './api/index.js'` /
`export * from './render/index.js'` a `src/index.ts`-ben) — mindent a
`@knowvah/dot-engine`-ből importálni működik, de az alútvonalas importok
explicitebben jelzik, melyik réteghez nyúl.

## `@knowvah/dot-engine` (gyökér)

### `renderSvg`

```ts
function renderSvg(dotSource: string, engine: EngineName): string;
```

Értelmezi a DOT-forráskódot, lefuttatja a megnevezett
[elrendezésmotort](/hu/guide/engines), SVG-be renderel, és visszaadja az
SVG-sztringet. Ez az egyhívásos kényelmi burkoló: létrehoz egy `GvcContext`-et,
regisztrálja a nyolc beépített motort és az SVG-renderelőt, elrendez, renderel,
majd felszabadítja az elrendezést — ha ezeket a lépéseket szét kell választania,
lásd lent a [`GvcContext` / `renderWithContext`](#gvccontext-renderwithcontext)
részt.

- **`dotSource`** — DOT nyelvű gráfforráskód.
- **`engine`** — `EngineName`: az egyik beépített (`dot`, `neato`, `fdp`,
  `sfdp`, `circo`, `twopi`, `osage`, `patchwork`) vagy bármely egyéni
  regisztrált név.
- **Kivételt dob**: `DotEngineError`-t a bemenettel kapcsolatos bármely hibára:
  `ParseError`-t, ha a `dotSource` érvénytelen, `RenderError`-t, ha az
  elrendezés vagy a renderelés meghiúsul, `InternalError`-t (`cause`-zal)
  dot-engine-hiba esetén. `TypeError`-t `ERR_INVALID_ARG_TYPE` /
  `ERR_INVALID_ARG_VALUE` `code` értékkel, ha a `dotSource` vagy az `engine`
  érvénytelen (beleértve a nem regisztrált motornevet is). Lásd: [Hibák és
  kivételek](/hu/guide/errors).

A teljes szignatúra, a JSDoc és a `GvError` mezőlistája: [Referencia](/reference/).

### `tryRenderSvg` / `RenderResult`

```ts
function tryRenderSvg(dotSource: string, engine: EngineName): RenderResult;
```

A `renderSvg` eredményalapú testvére. Bármely DOT-bemenetre visszatér (soha nem
dob kivételt): `{ svg }` siker esetén, vagy `{ errors: [one] }` az első
hibánál; az `svg` és az `errors` kölcsönösen kizárják egymást. Csak érvénytelen
argumentumokra dob kivételt (`TypeError` `ERR_INVALID_ARG_TYPE` /
`ERR_INVALID_ARG_VALUE`). Az `errors` minden eleme egyszerű, JSON-ba
szerializálható adat (`type`, `code`, `message`, `friendlyMessage`, továbbá
`location` / `expected`, ha van; `cause` és veremnyom nélkül), így biztonságosan
átküldhető worker/postMessage határon, vagy szerializálható naplóba.
Részesítse előnyben a `renderSvg` + `try`/`catch` helyett, ha a hívó a `code` /
`type` alapján szeretne elágazni kivétel elkapása helyett. Lásd: [Hibák és
kivételek](/hu/guide/errors). [Referencia](/reference/).

### `parse` / `ParseError`

```ts
function parse(dotSource: string): Graph;
```

A DOT-ot a memóriabeli gráfmodellbe értelmezi **elrendezés nélkül**. Hasznos a
gráf vizsgálatához vagy átalakításához — vagy ahhoz, hogy renderelés előtt
átadja a `@knowvah/dot-engine/api` `getLayout` vagy a
`@knowvah/dot-engine/render` `render` függvényének.

- **Kivételt dob**: `ParseError`-t szintaktikai hibákra vagy élirány-
  szabálysértésekre (pl. `->` irányítatlan gráfban). A `ParseError` kiterjeszti a
  `DotEngineError`-t, és `type: 'syntax'` értékkel implementálja a `GvError`-t;
  `location: { line, column, offset? }` értéket hordoz. `TypeError`
  `ERR_INVALID_ARG_TYPE`, ha a `dotSource` nem sztring. [Hibák és
  kivételek](/hu/guide/errors), [Referencia](/reference/).

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

Az `instanceof DotEngineError` azt jelenti, hogy a dot-engine elbukott ezen a
bemeneten. A `RenderError` az ismert elrendezési/renderelési hibákat fedi le (a
`type` az `UNKNOWN_LAYOUT` és az `UNSUPPORTED_FEATURE` esetén `semantic`). Az
`InternalError` dot-engine-hiba; a `cause` az eredeti hibát tartalmazza, ha volt
becsomagolt. A hívó hibái ehelyett szabványos `TypeError` / `RangeError` /
`Error` kivételt dobnak `code` értékkel. Az `isGvError` sztring típusú `type` és
`code` meglétét ellenőrzi, így duplikált csomagokon át is működik. Minden kódot
és azt, hogy az egyes függvények mit dobhatnak, a [Hibák és
kivételek](/hu/guide/errors) ismerteti, a `GvError` alakját a
[Típusok](/hu/guide/types), a `GvErrorCode` tagjainak listáját pedig a
[Referencia](/reference/).

### `setTextMeasurer` / `getTextMeasurer`

```ts
function setTextMeasurer(measurer: TextMeasurer | null): void;
function getTextMeasurer(): TextMeasurer;
```

Regisztrálja (vagy `null`-lal törli) a folyamat-globális szövegmérőt, amelyet az
elrendezés a feliratok méretezéséhez használ. A törlés a könyvtár
alapértelmezésére esik vissza (böngésző: `CanvasTextMeasurer`; fej nélküli/Node:
`EstimateTextMeasurer`, hacsak nincs LUT-mérő bekötve — a teljes feloldási
sorrendet és az e függvények mellett exportált `CanvasTextMeasurer` /
`EstimateTextMeasurer` / `LutTextMeasurer` megvalósításokat lásd a
[Szövegmérés](/hu/guide/text-measurement) oldalon).
[Referencia](/reference/).

### `setImageSizer` / `setImageResolver`

Két rokon, mégis különálló képkonfigurációs bővítési pont — mindkettő
folyamat-globális nyilvántartás, ugyanazt a mintát követve (visszahívás
regisztrálása, `null` átadása a törléshez), mindkettő hatástalan, amíg a hívó
nem regisztrál egyet:

- **`setImageSizer`** — egy külső kép *belső méreteit* jelenti, hogy az
  elrendezésmotor a renderelés előtt helyet foglalhasson egy HTML `<IMG>`
  cellának vagy egy csúcs `image=` attribútumának. A `null` visszaadása (vagy
  ha nincs regisztrált méretező) a natív Graphviz hiányzó kép esetén mutatott
  viselkedését reprodukálja: figyelmeztetés és nulla méret.
- **`setImageResolver`** (új — lásd lent az [`inlineImages`](#inlineimages)
  részt) — a tényleges kép *bájtjait* adja meg, hogy az SVG-renderelő
  `data:` URI-ként beágyazhassa őket ahelyett, hogy az `xlink:href="src"`
  értéket nyersen átengedné.

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;
function setImageSizer(sizer: ImageSizer | null): void;

type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;
function setImageResolver(fn: ImageResolver | null): void;
```

Az `ImageResolver` visszaadhat puszta `Uint8Array`-t (a MIME-típus a `src`
fájlkiterjesztéséből következik — `.png`, `.jpg`/`.jpeg`, `.gif`, `.svg`,
`.webp`; minden más `application/octet-stream`-re esik vissza), vagy
`{ bytes, mime }` értéket a MIME-típus kifejezett megadásához. Adjon vissza
`null`-t, ha a `src` nem oldható fel — a renderelő a nyers `src` átengedésére
esik vissza, mintha nem lenne regisztrált feloldó. A feloldó regisztrálásának
önmagában nincs hatása; csak akkor kérdezi le, ha a `render` `inlineImages`
opciója `true` (lásd lent). Egy kidolgozott példát a [Munka
képekkel](/hu/guide/images) mutat, mindkét visszahívástípust pedig a
[Referencia](/reference/).

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

A `renderSvgAsync` a `renderSvg` aszinkron megfelelője: előtölti a gráfhoz
szükséges webes betűtípusokat és képadatokat, majd elrendez és renderel. A
`renderSvgInto` renderel, és lecseréli az `id` azonosítójú elem gyermekeit,
alapértelmezés szerint megtisztítva az SVG-t (a `trusted: true` ezt kihagyja; a
`sanitize` leváltja a beépített tisztítót). A hibák, a hibás argumentumokat is
beleértve, Promise-elutasítások ugyanazokkal a hibaosztályokkal, mint a
`renderSvg`-nél; a hiányzó elemazonosító `ERR_INVALID_ARG_VALUE`-val utasít el.
A betűtípus-problémák soha nem utasítanak el; a `fontIssues`-ban érkeznek vissza.
Lásd: [Használat böngészőben](/hu/guide/browser) és [Munka
képekkel](/hu/guide/images), valamint a [Referencia](/reference/).

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

Alacsonyabb szintű vezénylés azoknak a hívóknak, akiknek az elrendezést és a
renderelést külön lépésben kell vezérelniük. A `renderSvg` pontosan erre épülő
kényelmi burkoló: létrehoz egy kontextust, regisztrálja a motorokat/renderelőket,
`layout`, `renderWithContext`, `freeLayout`. Csak akkor nyúljon ezekhez
közvetlenül, ha erre a kontrollra van szüksége — például a motorok egy
részhalmazának regisztrálásához, egyéni `LayoutEngine` vagy `RendererPlugin`
hozzáadásához, vagy ugyanazon elrendezett gráf több formátumba rendereléséhez az
elrendezés újrafuttatása nélkül (egyszer hívja a `layout`-ot, majd formátumonként
a `renderWithContext`-et, végül a `freeLayout`-ot). [Referencia](/reference/).

## `@knowvah/dot-engine/api`

Programozott felépítés, biztonságos élbeszúrás és a kiszámított geometria
kiolvasása — az a réteg, amellyel kézzel írt DOT-szöveg nélkül építhet gráfot, és
az elrendezését egyszerű adatként olvashatja vissza. A `LayoutSnapshot`-ot és
beágyazott alakjait lásd a [Típusok](/hu/guide/types) oldalon.

### `createGraph`

```ts
function createGraph(opts?: {
  directed?: boolean;
  strict?:   boolean;
  name?:     string;
}): GvGraphBuilder;
```

Új gráfot hoz létre, amely készen áll a `render` / `getLayout` / `getDrawOps`
számára való átadásra. Alapértékek: `directed: true`, `strict: false`,
`name: ''`. `GvGraphBuilder`-t ad vissza — `addNode`, `addEdge`, `addSubgraph`,
`setAttr`/`getAttr`, `setHtmlAttr` (HTML-táblázatos feliratokhoz), valamint egy
`.graph` tulajdonság, amely az átlátszatlan `Graph` kezelőt teszi elérhetővé.
Lásd: [Gráf felépítése kódból](/hu/guide/build-a-graph) és a
[Referencia](/reference/) a teljes `GvGraphBuilder`/`GvNode`/`GvEdge`
interfészekhez.

### `addEdge`

```ts
function addEdge(g: Graph, tail: Node, head: Node, name?: string): Edge;
```

Alacsonyabb szintű élbeszúró segédfüggvény a `GvGraphBuilder.addEdge` alatt —
közvetlenül exportálva azoknak a hívóknak, akik a belső `Node`/`Edge`
hivatkozásokkal dolgoznak (pl. a `parse()` által visszaadott gráfra hozzáadott
élek), nem pedig az építő átlátszatlan `GvNode`/`GvEdge` kezelőivel. A legtöbb
hívónak inkább a `createGraph(...).addEdge(tail, head, attrs?)` hívást érdemes
használnia.

- **`name`** — az él kulcsa; alapértéke `''` (névtelen). A strict gráfos
  deduplikáció figyelmen kívül hagyja, amely egyedül a `(tail, head)` alapján
  egyeztet (irányítatlan gráfoknál szimmetrikusan).
- **Visszaadja** az új élt, vagy a meglévőt, ha a `g` strict, és már létezik
  `(tail, head)` él (az `agedge` viselkedését tükrözi `cflag=1` mellett).

Lásd: [Gráf felépítése kódból](/hu/guide/build-a-graph) és a
[Referencia](/reference/).

### `getLayout`

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

A gráf kiszámított geometriájának egyszerű, JSON-ba szerializálható
pillanatképét adja vissza — csúcspozíciók, élspline-vezérlőpontok, élfeliratok,
klaszterek befoglaló dobozai és a gráf teljes határai — mind pontban.

- **`g`** — már elrendezettnek kell lennie (a `render(g, ...)`, a
  `getDrawOps(g)` vagy a `ctx.layout(g, engine)` által); a `getLayout` meghívása
  még el nem rendezett gráfon kivételt dob ahelyett, hogy csendben csupa nulla
  geometriát adna vissza.
- **`opts.yAxis`** — alapértéke `'down'`: képernyőkoordináták, az origó a bal
  felső sarokban, az y lefelé nő, és a `bounds` `(0, 0)`-ra normalizált. A
  `'up'` natív Graphviz-koordinátákat ad vissza (az origó a bal alsó sarokban,
  az y felfelé nő), a `bounds.x`/`bounds.y` a nyers bal alsó sarokban.
- **Kivételt dob**: `Error`-t `ERR_INVALID_STATE` `code` értékkel, ha a `g` nincs
  elrendezve; `TypeError`-t `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`
  értékkel hibás `g` vagy `opts` esetén. Lásd: [Hibák és
  kivételek](/hu/guide/errors).

A csúcsok `width`/`height` értéke pontra van átváltva (a belső modell hüvelykben
tárolja); minden más koordináta már pontban van. A koordináta-rendszer
leírását lásd: [A kiszámított geometria kiolvasása](/hu/guide/geometry), a
teljes `LayoutSnapshot`, `NodeGeometry`, `EdgeGeometry`, `ClusterGeometry` és
`BoundsGeometry` mezőlistákat pedig a [Típusok](/hu/guide/types) /
[Referencia](/reference/) tartalmazza.

### `Graph`

A belső modellből újraexportált átlátszatlan kezelőtípus. Csak a *típus* van
kitéve (a módosítható osztály nem) — jelölje vele azt a változót, amely egy
építő `.graph` értékét vagy egy `parse()` eredményét tartalmazza, de ne hozza
létre és ne vizsgálja közvetlenül a mezőit; az állapot visszaolvasásához
használja az építőt, a `getLayout`-ot vagy a `getDrawOps`-ot. [Referencia](/reference/).

## `@knowvah/dot-engine/render`

Többformátumú kimenet és nyers rajzolásiművelet-hozzáférés — az a réteg, amellyel
egy már `parse`-olt vagy építővel összeállított gráfot lehet renderelni.

### `render`

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  RenderOptions,
): string;
```

Elrendez és renderel egy gráfot a kért formátumú sztringbe.

- **`format`** — `OutputFormat`: `'svg' | 'dot' | 'xdot' | 'json' | 'plain' |
  'plain-ext' | 'imap' | 'cmapx'`.
- **`opts.engine`** — elrendezésmotor (alapértéke `'dot'`).
- **`opts.inlineImages`** — lásd [lent](#inlineimages).
- **Kivételt dob**: `RenderError`-t elrendezési vagy renderelési hibánál;
  `InternalError`-t dot-engine-hibánál; `TypeError`-t `code` értékkel érvénytelen
  argumentumokra (beleértve a nem regisztrált motort vagy formátumot).
  Lásd: [Hibák és kivételek](/hu/guide/errors).

Az `opts.engine` a `renderSvg` `engine` paraméterét tükrözi; a `format` az a
tengely, amelyet a `renderSvg` nem tesz elérhetővé (a `renderSvg` fixen
`'svg'`). Lásd: [Renderelés más formátumokba](/hu/guide/render-formats) és a
[Referencia](/reference/) a teljes `OutputFormat` unióhoz és a `RenderOptions`
alakjához.

#### `inlineImages`

A `RenderOptions.inlineImages` (alapértéke `false`) a külső képeket `data:`
URI-ként ágyazza be a nyers `xlink:href="src"` átengedés helyett. Nincs hatása,
ha nincs feloldó regisztrálva a `setImageResolver` által (lásd fent) — és nincs
hatása a nem SVG formátumokra sem. Beállítatlanul a kimenet bájtra azonos
azzal, ami az opció megjelenése előtt volt.

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

A teljes útmutatót, beleértve a feloldást a böngészőben `fetch`-ből és Node-ban a
fájlrendszerből, lásd: [Munka képekkel](/hu/guide/images).

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

A `render` aszinkron megfelelője: ugyanazok a formátumok és `engine`/`inlineImages`
opciók, kiegészítve hívásonkénti aszinkron képkampókkal és betűtípus-előtöltéssel.
Minden képkampó legfeljebb egyszer fut le egy-egy különböző `src`-re; a dobott
kivétel vagy elutasítás találatmulasztásnak számít. A kimenet a jelölőnyelvi
formátumoknál szűretlen jelölés; lásd a README „Security” szakaszát.

### `getDrawOps` / `DEFAULT_DRAW_ENGINE`

```ts
const DEFAULT_DRAW_ENGINE: EngineName; // 'dot'

function getDrawOps(g: Graph, opts?: { engine?: EngineName }): XdotOp[];
```

Elrendezi a `g`-t, xdot-ba renderel, és lapos, típusos rajzolásiművelet-tömböt ad
vissza — csúcsalakzatok, szövegszakaszok, színek és betűtípusok megkülönböztetett
unióértékekként (az `op.kind` alapján szűkítve egy `switch`-ben) — egyéni
canvas/WebGL/PDF renderelő táplálására, SVG vagy az xdot sztringkódolásának
érintése nélkül. Az `opts.engine` alapértéke a `DEFAULT_DRAW_ENGINE` (`'dot'`).

- **Kivételt dob**: `ParseError`-t, ha a közbenső xdot-kimenet nem értelmezhető
  újra (dot-engine-hiba; a gyakorlatban nem várt); `RenderError`-t
  elrendezési/renderelési hibánál; `InternalError`-t bármely más dot-engine-hibánál;
  `TypeError`-t `code` értékkel érvénytelen argumentumokra. Lásd:
  [Hibák és kivételek](/hu/guide/errors).

A műveletfajták listáját és egy kidolgozott canvas-példát lásd: [Egyéni
renderelés xdot rajzolási műveletekkel](/hu/guide/xdot-drawops), a teljes `XdotOp`
uniót és az `Xdot`/`XdotColor` alakokat pedig a [Típusok](/hu/guide/types) /
[Referencia](/reference/) tartalmazza.
