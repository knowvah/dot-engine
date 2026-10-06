---
sourceHash: a49bdc5fdca8b04f5bd951935e322d616028e44f4567709824dbbd5229f60e3b
---

# Típusreferencia

A nyilvános típusok fogalmi térképe, aszerint csoportosítva, honnan kapja őket:
`createGraph`/`parse` (építés + vizsgálat), `getLayout` (geometriai
pillanatkép), `render`/`getDrawOps` (kimenet) és a gyökércsomag (motorok, képek,
szövegmérés, hibák). Minden bejegyzés egy forrásból másolt alakblokkot és egy
egysoros célleírást mutat. A kimerítő, mezőnkénti dokumentációért (beleértve az
örökölt tagokat és az egyes tulajdonságok JSDoc-ját) lásd a generált
[TypeDoc-referenciát](/reference/).

Ez az oldal nem ismétli meg a koordinátakeret végigvezetését — azt lásd:
[A kiszámított geometria kiolvasása](/hu/guide/geometry). Az y-tengelyre
vonatkozó megjegyzést röviden újra elmondja minden olyan helyen, ahol egy típus
mezői keretfüggők.

## Építés + vizsgálat (`@knowvah/dot-engine` / `@knowvah/dot-engine/api`)

### `Graph`

A belső gráfmodell átlátszatlan kezelője. A `parse()` és a
`createGraph().graph` adja vissza. Adja át a `render`, a `getLayout` és a
`getDrawOps` függvénynek; ne hozza létre és ne vizsgálja közvetlenül — az építő
és az értelmező az egyetlen támogatott mód egy előállítására.

### `CreateGraphOptions`

```ts
interface CreateGraphOptions {
  directed?: boolean;
  strict?: boolean;
  name?: string;
}
```

A `createGraph` opciói. A `directed`/`strict` a négy `GraphKind` (irányított,
irányítatlan, strict irányított, strict irányítatlan) egyikét választja ki; a
`name` a gráf nevét állítja be (alapértéke `''`).

### `GvNode`

```ts
interface GvNode {
  readonly name: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

Egy gráfcsúcs átlátszatlan kezelője, amelyet a `builder.addNode(...)` ad vissza.
A `setHtmlAttr` HTML-szerű feliratként címkézi az értéket (megfelel a DOT-szöveg
`label=<...>` jelölésének), hogy az elrendezésmotor jelölésként mérje.

### `GvEdge`

```ts
interface GvEdge {
  readonly tail: string;
  readonly head: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

Egy gráfél átlátszatlan kezelője, amelyet a `builder.addEdge(...)` ad vissza.

### `GvGraphBuilder`

```ts
interface GvGraphBuilder {
  addNode(name: string, attrs?: Record<string, string>): GvNode;
  addEdge(
    tail: GvNode | string,
    head: GvNode | string,
    attrs?: Record<string, string>,
  ): GvEdge;
  addSubgraph(name: string, attrs?: Record<string, string>): GvGraphBuilder;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
  readonly graph: Graph;
}
```

A `createGraph(...)` adja vissza. Az `addSubgraph` az adott részgráfra szűkített
beágyazott építőt ad vissza; a rajta keresztül hozzáadott csúcsok a gyökérgráf
tagjai is. A `.graph` az átadási pont a `render`/`getLayout`/`getDrawOps`
felé. Lásd: [Gráf felépítése kódból](/hu/guide/build-a-graph).

## Geometriai pillanatkép (`getLayout`)

::: tip Koordinátakeret
A natív Graphviz-koordináták y-tengelye felfelé nő (az origó bal alul van). A
`getLayout` alapértelmezése `yAxis: 'down'` (az origó bal felül, képernyős
konvenció), és minden y koordinátát tükröz; a natív Graphviz-koordinátákhoz adja
meg a `{ yAxis: 'up' }` értéket. Teljes végigvezetés: [A kiszámított geometria
kiolvasása](/hu/guide/geometry).
:::

### `YAxis` / `GeometryOptions`

```ts
type YAxis = 'up' | 'down';
type GeometryOptions = { yAxis?: YAxis };
```

A `getLayout` opciói. Alapértelmezés: `yAxis: 'down'`.

### `LayoutSnapshot`

```ts
interface LayoutSnapshot {
  bounds: BoundsGeometry;
  nodes: NodeGeometry[];
  edges: EdgeGeometry[];
  clusters: ClusterGeometry[];
}
```

A gráf kiszámított geometriájának egyszerű, JSON-ba szerializálható
pillanatképe, amelyet a `getLayout(g, opts?)` ad vissza. A `clusters` minden
klaszter-részgráfot rekurzívan felsorol (a beágyazott klaszterek mind külön
bejegyzést kapnak); klaszter nélküli gráfoknál üres.

### `BoundsGeometry`

```ts
interface BoundsGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

A teljes befoglaló doboz, pontban. `yAxis: 'down'` esetén az `x`/`y`
`(0, 0)`-ra normalizált. `yAxis: 'up'` esetén az `x`/`y` a gráf befoglaló
dobozának nyers bal alsó sarka.

### `NodeGeometry`

```ts
interface NodeGeometry {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Csúcsonkénti geometria. Az `x`/`y` a csúcs középpontja. A `width`/`height`
**pontban** van — a modell hüvelykben tárolja (`ND_width`/`ND_height`); a
`getLayout` a visszaadás előtt megszorozza 72-vel.

### `EdgeGeometry`

```ts
interface EdgeGeometry {
  tail: string;
  head: string;
  points: { x: number; y: number }[];
  label?: { x: number; y: number };
  tailLabel?: { x: number; y: number };
  headLabel?: { x: number; y: number };
  xlabel?: { x: number; y: number };
  sp?: { x: number; y: number };
  ep?: { x: number; y: number };
}
```

Élenkénti geometria. A `points` a kivezetett spline minden Bézier-vezérlőpontját
összefűzi, sorrendben (üres, ha az élnek nincs kivezetett splineja). A `label`
csak akkor van jelen, ha az él középső feliratot hordoz.

A `tailLabel` és a `headLabel` a `taillabel`/`headlabel` portfeliratok
pozíciója. Mindegyik csak akkor van jelen, ha az elrendezés elhelyezte — ugyanazon
feltétel mellett, amelynél a `render()` kibocsátja a `<text>` elemét —, így az a
portfelirat, amelyet nem lehetett elhelyezni (például kivezetett spline nélküli
él), hiányzóként jelenik meg, nem pedig az origóban lévő feliratként.

Az `xlabel` az `xlabel` külső felirat pozíciója. A `label`-lel ellentétben a
Graphviz az él körüli jelölt pozíciók közötti erőalapú elhelyezéskeresésével
választja ki, így nem vezethető le a `label`-ből vagy a spline felezőpontjából.
Ugyanazt a csak-elhelyezett kaput hordozza: a deklarált xlabel, amelyet a keresés
nem tudott elhelyezni, hiányzóként jelenik meg, pontosan úgy, ahogy a `render()`
sem rajzolja ki.

Az `sp` és az `ep` a nyíl csatlakozási pontjai a farok és a fej végén. Ha egy
végen nyíl van, a spline megrövidül, hogy helyet hagyjon neki, és a nyíl a
végső vezérlőponttól ebbe a pontba nyúlik — így a saját nyílhegyeit rajzoló
felhasználó itt olvassa ki a hegyet, ahelyett hogy extrapolálna. Mindegyik csak
akkor van jelen, ha az adott végen valóban van nyíl, így egy egyszerű
`digraph { a -> b }` él `ep`-et jelent, `sp` nélkül, az `arrowhead=none` pedig
egyiket sem.

Ezek a csúcs határán lévő csatlakozási pontok. A Graphviz saját renderelője a
kirajzolt nyílsokszöget ezektől vonalvastagságtól függő mértékben beljebb
húzza, így az `ep` az a pont, amelyig a nyilat rajzolni kell, nem pedig a renderelt
hegy másolata.

### `ClusterGeometry`

```ts
interface ClusterGeometry {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: { x: number; y: number; width: number; height: number };
}
```

Klaszterenkénti befoglaló doboz. A `name` a klaszter-részgráf neve (pl.
`cluster6`); a beágyazott klaszterek a hierarchiájukat a névben kódolják, ezért
nincs kitéve explicit szülőhivatkozás. Ugyanazt a keretkonvenciót követi, mint a
`BoundsGeometry`.

A `label` a klaszter címének elhelyezése, csak akkor van jelen, ha a klaszter
deklarál ilyet. Az `x`/`y` a felirathely **középpontja** — az
`EdgeGeometry.label`-lel egyezően, nem a fenti doboz `x`/`y` sarkával —, a
`width`/`height` pedig a megmért szövegméret, így a felirat doboza
`[x - width/2, x + width/2] × [y - height/2, y + height/2]`, és mindig a
klaszterdobozon belül van. Vegye figyelembe, hogy ez a felirat *középpontja*,
míg a `render()` által kibocsátott `<text>` az alapvonalat hordozza, amely
lejjebb van.

## Renderelés (`@knowvah/dot-engine/render`)

### `OutputFormat`

```ts
type OutputFormat =
  | 'svg'
  | 'dot'
  | 'xdot'
  | 'json'
  | 'plain'
  | 'plain-ext'
  | 'imap'
  | 'cmapx';
```

A `render(g, format, opts?)` által elfogadott formátumok zárt uniója. Lásd:
[Renderelés más formátumokba](/hu/guide/render-formats).

### `RenderOptions`

```ts
interface RenderOptions {
  engine?: EngineName;
  inlineImages?: boolean;
}
```

A `render` opciói. Az `engine` alapértéke `'dot'`. Az `inlineImages` (új)
alapértéke `false`; ha `true`, az SVG-kibocsátó a külső képeket
(`image=`/HTML `<IMG>`) `data:` URI-ként beágyazza, a `setImageResolver`
által regisztrált feloldót lekérdezve — a feloldó mulasztása vagy a regisztráció
hiánya a nyers `src` átengedésére esik vissza. Nem SVG formátumokra nincs
hatása. Lásd: [Munka képekkel](/hu/guide/images).

::: warning Az `yAxis` nem `RenderOptions` mező
A koordináták tájolása kizárólag a `getLayout` ügye. A `render` által előállított
nyers formátumsztringek natív, felfelé növekvő y-tengelyű koordinátákat hordoznak;
ha lefelé növekvő y-ra van szüksége, és nem a `getLayout`-on keresztül megy,
utófeldolgozásban tükrözzön.
:::

### `DrawOpsOptions`

```ts
interface DrawOpsOptions {
  engine?: EngineName;
}
```

A `getDrawOps` opciói. Az `engine` alapértéke `'dot'`.

### `Xdot`

```ts
interface Xdot {
  ops: XdotOp[];
  flags: number;
}
```

Egy xdot attribútumfolyam értelmezett eredménye: a dekódolt rajzolásiművelet-tömb
plusz egy értelmezési állapotjelző bitmaszk. A `getDrawOps` csak a gráf minden
rajzolási attribútumán átívelő, lapított `XdotOp[]`-t adja vissza, festési
sorrendben (gráf → csúcs → él) — a teljes műveletfajta-táblázatot és a canvas-példát
lásd: [Egyéni renderelés xdot rajzolási műveletekkel](/hu/guide/xdot-drawops).

### `XdotOp`

```ts
type XdotOp =
  | { kind: 'filled_ellipse' | 'unfilled_ellipse'; ellipse: XdotRect }
  | { kind: 'filled_polygon' | 'unfilled_polygon'; polygon: XdotPolyline }
  | { kind: 'filled_bezier' | 'unfilled_bezier'; bezier: XdotPolyline }
  | { kind: 'polyline'; polyline: XdotPolyline }
  | { kind: 'text'; text: XdotText }
  | { kind: 'fill_color' | 'pen_color'; color: string }
  | { kind: 'grad_fill_color' | 'grad_pen_color'; gradColor: XdotColor }
  | { kind: 'font'; font: XdotFont }
  | { kind: 'style'; style: string }
  | { kind: 'image'; image: XdotImage }
  | { kind: 'fontchar'; fontchar: number };
```

Egyetlen dekódolt xdot rajzolási művelet, a `kind` alapján megkülönböztetve.
Minden változat egy, az alakjáról elnevezett adat-tulajdonságot hordoz — a
biztonságos eléréséhez szűkítsen a `kind` alapján egy `switch`-ben. A koordináták
pontban vannak, natív, felfelé növekvő y-tengelyű keretben (lefelé növekvő y-jú
canvashoz tükrözni kell — lásd a fent hivatkozott útmutatót).

### `XdotColor`

```ts
type XdotColor =
  | { type: 'none'; clr: string }
  | { type: 'linear'; ling: XdotLinearGrad }
  | { type: 'radial'; ring: XdotRadialGrad };
```

Feloldott xdot kitöltő-/vonalszín: egyszínű, vagy lineáris/sugaras színátmenet
(az `XdotLinearGrad`/`XdotRadialGrad` mindegyike `x0,y0,x1,y1[,r0,r1]` értékeket
hordoz, plusz egy `stops: { frac: number; color: string }[]` tömböt).

## Gyökércsomag (`@knowvah/dot-engine`)

### `EngineName`

```ts
type BuiltinEngine =
  | 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi' | 'osage' | 'patchwork';

type EngineName = BuiltinEngine | (string & {});
```

Elrendezésmotor neve. A nyilvántartás nyitott (egyéni motorok regisztrálhatók egy
`GvcContext`-en), ezért bármely sztring elfogadott; a `(string & {})` megtartja a
szerkesztő automatikus kiegészítését a beépítettekhez anélkül, hogy lezárná a
halmazt. Lásd: [Elrendezésmotorok](/hu/guide/engines).

### `ImageSizer`

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;

function setImageSizer(sizer: ImageSizer | null): void;
```

Visszahívást regisztrál, amely az `image=` vagy egy HTML `<IMG>` cella által
hivatkozott külső kép belső méreteit adja vissza az elrendezés méretezéséhez.
Adjon vissza `null`-t, ha a méret ismeretlen (a C hiányzó képre adott
viselkedését követi — nulla méretű cella plusz figyelmeztetés). Egy korábban
beállított méretező törléséhez adjon át `null`-t a `setImageSizer`-nek. Lásd:
[Használat böngészőben](/hu/guide/browser).

### `ImageResolver`

```ts
type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;

function setImageResolver(fn: ImageResolver | null): void;
```

Visszahívást regisztrál, amely egy külső kép nyers bájtjait adja vissza, és akkor
kérdezi le, ha a `RenderOptions.inlineImages` értéke `true`. A puszta
`Uint8Array` visszaadás a MIME-típust a `src` fájlkiterjesztéséből következteti.
A `null` (a feloldótól, vagy regisztrált feloldó hiányában) a nyers `src`
átengedésére esik vissza. Lásd: [Munka képekkel](/hu/guide/images).

### `TextMeasurer` / `TextSize`

```ts
interface TextMeasurer {
  measure(
    text: string,
    fontname: string,
    fontsize: number,
    flags?: { readonly bold?: boolean; readonly italic?: boolean },
  ): TextSize;
}

interface TextSize {
  w: number;
  h: number;
  yoffsetCenterline?: number;
  yoffsetLayout?: number;
}
```

Cserélhető szövegmérés, a `setTextMeasurer`-rel telepítve (három beépített
érkezik: `EstimateTextMeasurer`, `LutTextMeasurer`, `CanvasTextMeasurer`). Az
`yoffsetCenterline`/`yoffsetLayout` opcionális függőleges metrikák (alapvonal→
középvonal, alapvonal→emelkedés); elhagyásukkor a pango-kalibrált
alapértékekre esik vissza. Lásd: [Szövegmérés](/hu/guide/text-measurement).

### `RenderResult` és a hibák

```ts
interface RenderResult {
  svg?: string;   // present on success
  errors?: GvError[]; // present on failure; length <= 1 for v1
}

interface GvError {
  type: 'syntax' | 'semantic' | 'render';
  code: 'SYNTAX_ERROR' | 'SYNTAX_UNEXPECTED_EOF'
      | 'EDGE_OP_DIRECTED_IN_UNDIRECTED' | 'EDGE_OP_UNDIRECTED_IN_DIRECTED'
      | 'HTML_PARSE_ERROR' | 'RENDER_ERROR' | 'INTERNAL_ERROR'
      | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE' | 'GENERIC_ERROR';
  message: string;
  friendlyMessage: string;
  location?: { line: number; column: number; offset?: number };
  expected?: GvExpectation[];
}
```

A `tryRenderSvg(dotSource, engine)` a `renderSvg` eredményalapú megfelelője:
kivételdobás helyett `{ svg }`-t ad vissza siker esetén, vagy `{ errors: [one] }`-t
az első hibánál. Bármely DOT-bemenetre visszatér, és csak érvénytelen
argumentumokra dob. Az `errors` bejegyzései egyszerű adatok `cause` és verem
nélkül.

Minden eldobott dot-engine-hiba az absztrakt `DotEngineError`-t terjeszti ki, és
implementálja a `GvError`-t:

```ts
abstract class DotEngineError extends Error implements GvError {
  abstract readonly type: GvErrorType;
  abstract readonly code: GvErrorCode;
  abstract readonly friendlyMessage: string;
}

class ParseError extends DotEngineError {
  readonly type = 'syntax';
  readonly code: GvErrorCode;
  readonly friendlyMessage: string;
  readonly location: { line: number; column: number; offset?: number };
  readonly expected?: GvExpectation[];
  get line(): number;   // convenience getter -> location.line
  get column(): number; // convenience getter -> location.column
}

class RenderError extends DotEngineError {
  readonly type: 'render' | 'semantic'; // 'semantic' for UNKNOWN_LAYOUT / UNSUPPORTED_FEATURE
  readonly code: GvErrorCode; // 'RENDER_ERROR' | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE'
  readonly friendlyMessage: string;
}

class InternalError extends DotEngineError {
  readonly type = 'render';
  readonly code = 'INTERNAL_ERROR';
  readonly friendlyMessage: string;
}

function isGvError(e: unknown): e is GvError; // structural; works across bundles
```

A `renderSvg` `ParseError`-t dob érvénytelen DOT-forráskódra, `RenderError`-t
elrendezési/renderelési szakaszbeli hibákra és `InternalError`-t dot-engine-hiba
esetén. A hívó hibái szabványos `TypeError` / `RangeError` / `Error` kivételt
dobnak, amelynek `code` értéke egy `UsageErrorCode` (`'ERR_INVALID_ARG_TYPE' |
'ERR_INVALID_ARG_VALUE' | 'ERR_OUT_OF_RANGE' | 'ERR_INVALID_STATE'`); ezek nem
`GvError`-ok. Azoknak a hívóknak, akik strukturált hibákat szeretnének
`try`/`catch` nélkül, a `tryRenderSvg`-t érdemes használniuk. Minden kódot lásd:
[Hibák és kivételek](/hu/guide/errors).

## Kapcsolatok

```graphviz
digraph types {
  rankdir=LR;
  bgcolor="transparent";
  node [shape=box, style=rounded, fontname="Helvetica", fontsize=11];
  edge [fontname="Helvetica", fontsize=10];

  subgraph cluster_build {
    label="Build"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    createGraph; GvGraphBuilder; GvNode; GvEdge;
  }
  subgraph cluster_read {
    label="Layout + Read"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    LayoutSnapshot; NodeGeometry; EdgeGeometry; ClusterGeometry; BoundsGeometry;
  }
  subgraph cluster_render {
    label="Render"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    OutputString [label="string"];
    XdotOpArray [label="XdotOp[]"];
  }

  createGraph -> GvGraphBuilder;
  GvGraphBuilder -> GvNode [label="addNode"];
  GvGraphBuilder -> GvEdge [label="addEdge"];
  GvGraphBuilder -> "Graph" [label=".graph"];
  parse -> "Graph";

  "Graph" -> LayoutSnapshot [label="getLayout"];
  LayoutSnapshot -> NodeGeometry;
  LayoutSnapshot -> EdgeGeometry;
  LayoutSnapshot -> ClusterGeometry;
  LayoutSnapshot -> BoundsGeometry;

  "Graph" -> OutputString [label="render"];
  "Graph" -> XdotOpArray  [label="getDrawOps"];
}
```

## Melyik típus melyik hívásból jön

| Hívás | Visszaad |
|---|---|
| `createGraph(opts?)` | `GvGraphBuilder` |
| `builder.addNode(name, attrs?)` | `GvNode` |
| `builder.addEdge(tail, head, attrs?)` | `GvEdge` |
| `builder.addSubgraph(name, attrs?)` | `GvGraphBuilder` (beágyazott) |
| `parse(dotSource)` | `Graph` |
| `render(g, format, opts?)` | `string` |
| `getLayout(g, opts?)` | `LayoutSnapshot` |
| `getDrawOps(g, opts?)` | `XdotOp[]` |
| `renderSvg(dotSource, engine)` | `string` (`DotEngineError`-t vagy használati `TypeError`-t dob) |
| `tryRenderSvg(dotSource, engine)` | `RenderResult` |

Minden fenti típus minden mezőjéhez — beleértve azokat is, amelyeket ez az oldal
összefoglal — lásd a generált [TypeDoc-referenciát](/reference/). A
koordinátakeret mélyebb bemutatásához (kidolgozott példákkal) lásd:
[A kiszámított geometria kiolvasása](/hu/guide/geometry).
