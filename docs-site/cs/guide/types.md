---
sourceHash: a49bdc5fdca8b04f5bd951935e322d616028e44f4567709824dbbd5229f60e3b
---

# Reference typů

Pojmový přehled veřejných typů, seskupených podle toho, odkud je získáte:
`createGraph`/`parse` (sestavení + kontrola), `getLayout` (snímek geometrie),
`render`/`getDrawOps` (výstup) a kořenový balíček (moduly, obrázky, měření
textu, chyby). Každá položka ukazuje blok s tvarem zkopírovaný ze zdrojového
kódu a účel v jedné větě. Vyčerpávající dokumentaci pole po poli (včetně
zděděných členů a JSDoc u každé vlastnosti) najdete ve vygenerované
[referenci TypeDoc](/reference/).

Tato stránka neopakuje výklad souřadnicového rámce — ten najdete v části
[Čtení vypočtené geometrie](/cs/guide/geometry). Poznámku k ose y však stručně
zopakuje všude, kde jsou pole typu závislá na rámci.

## Sestavení + kontrola (`@knowvah/dot-engine` / `@knowvah/dot-engine/api`)

### `Graph`

Neprůhledný (opaque) handle interního modelu grafu. Vrací jej `parse()` a
`createGraph().graph`. Předejte jej funkcím `render`, `getLayout` a
`getDrawOps`; nevytvářejte jej ani neprohlížejte přímo — builder a parser jsou
jedinými podporovanými způsoby, jak jej získat.

### `CreateGraphOptions`

```ts
interface CreateGraphOptions {
  directed?: boolean;
  strict?: boolean;
  name?: string;
}
```

Volby pro `createGraph`. `directed`/`strict` volí jeden ze čtyř druhů
`GraphKind` (orientovaný, neorientovaný, striktně orientovaný, striktně
neorientovaný); `name` nastavuje název grafu (výchozí `''`).

### `GvNode`

```ts
interface GvNode {
  readonly name: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

Neprůhledný handle uzlu grafu, který vrací `builder.addNode(...)`.
`setHtmlAttr` označí hodnotu jako popisek podobný HTML (ekvivalent
`label=<...>` v textu DOT), aby jej modul rozvržení měřil jako značkování.

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

Neprůhledný handle hrany grafu, který vrací `builder.addEdge(...)`.

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

Vrací jej `createGraph(...)`. `addSubgraph` vrací vnořený builder omezený na
daný podgraf; uzly přidané přes něj jsou zároveň členy kořenového grafu.
`.graph` je předávací bod pro `render`/`getLayout`/`getDrawOps`. Viz
[Sestavení grafu v kódu](/cs/guide/build-a-graph).

## Snímek geometrie (`getLayout`)

::: tip Souřadnicový rámec
Nativní souřadnice Graphviz mají osu y nahoru (počátek vlevo dole). `getLayout`
má výchozí `yAxis: 'down'` (počátek vlevo nahoře, konvence obrazovky) a převrací
každou souřadnici y; pro nativní souřadnice Graphviz předejte `{ yAxis: 'up' }`.
Úplný výklad: [Čtení vypočtené geometrie](/cs/guide/geometry).
:::

### `YAxis` / `GeometryOptions`

```ts
type YAxis = 'up' | 'down';
type GeometryOptions = { yAxis?: YAxis };
```

Volby pro `getLayout`. Výchozí `yAxis: 'down'`.

### `LayoutSnapshot`

```ts
interface LayoutSnapshot {
  bounds: BoundsGeometry;
  nodes: NodeGeometry[];
  edges: EdgeGeometry[];
  clusters: ClusterGeometry[];
}
```

Prostý snímek vypočtené geometrie grafu serializovatelný do JSON, který vrací
`getLayout(g, opts?)`. `clusters` uvádí každý podgraf-cluster rekurzivně
(vnořené clustery mají každý vlastní položku); u grafů bez clusterů je prázdné.

### `BoundsGeometry`

```ts
interface BoundsGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Celkový ohraničující rámeček v bodech. S `yAxis: 'down'` jsou `x`/`y`
normalizovány k `(0, 0)`. S `yAxis: 'up'` jsou `x`/`y` původním levým dolním
rohem ohraničujícího rámečku grafu.

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

Geometrie jednotlivého uzlu. `x`/`y` jsou střed uzlu. `width`/`height` jsou v
**bodech** — model je ukládá v palcích (`ND_width`/`ND_height`); `getLayout`
je před vrácením vynásobí 72.

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

Geometrie jednotlivé hrany. `points` zřetězuje všechny řídicí body Bézierových
křivek vedeného splinu v pořadí (prázdné, pokud hrana nemá vedený spline).
`label` existuje jen tehdy, když hrana nese středový popisek.

`tailLabel` a `headLabel` jsou pozice popisků portů `taillabel`/`headlabel`.
Každý existuje, až když jej rozvržení umístilo — za stejné podmínky, za které
`render()` vypíše jeho `<text>` — takže popisek portu, který nebylo možné umístit
(například u hrany bez vedeného splinu), je hlášen jako chybějící, a ne jako
popisek v počátku.

`xlabel` je pozice externího popisku `xlabel`. Na rozdíl od `label` jej volí
silové umísťovací prohledávání Graphviz nad kandidátními pozicemi kolem hrany,
takže jej nelze odvodit z `label` ani ze středu splinu. Má stejnou podmínku
„pouze umístěné“: deklarovaný xlabel, který se při prohledávání nepodařilo
vměstnat, je hlášen jako chybějící, přesně jako jej `render()` odmítne nakreslit.

`sp` a `ep` jsou body připojení šipky na konci u ocasu a u hlavy. Když konec
nese šipku, spline se zkrátí, aby pro ni zbylo místo, a šipka se rozprostírá od
koncového řídicího bodu k tomuto bodu — takže konzument kreslící vlastní hroty
šipek čte špičku zde, místo aby ji extrapoloval. Každý existuje jen tehdy, když
daný konec skutečně šipku má, takže prostá hrana `digraph { a -> b }` hlásí `ep`
a žádné `sp` a `arrowhead=none` nehlásí ani jedno.

Jde o body připojení na hranici uzlu. Vlastní vykreslovač Graphviz od nich
odsazuje mnohoúhelník šipky, který kreslí, o hodnotu závislou na `penwidth`,
takže `ep` je bod, *k němuž* se šipka kreslí, ne kopie vykreslené špičky.

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

Ohraničující rámeček jednotlivého clusteru. `name` je název podgrafu-clusteru
(např. `cluster6`); vnořené clustery kódují svou hierarchii v názvu, takže není
zpřístupněn žádný explicitní odkaz na rodiče. Dodržuje stejnou konvenci rámce
jako `BoundsGeometry`.

`label` je umístění titulku clusteru, přítomné jen tehdy, když jej cluster
deklaruje. Jeho `x`/`y` jsou **střed** prostoru popisku — shodně s
`EdgeGeometry.label`, nikoli roh rámečku `x`/`y` výše — a `width`/`height` jsou
změřená velikost textu, takže rámeček popisku je
`[x - width/2, x + width/2] × [y - height/2, y + height/2]` a vždy leží uvnitř
rámečku clusteru. Pozor, jde o *střed* popisku, zatímco `<text>`, který
`render()` vypíše, nese účaří, které leží níže.

## Vykreslení (`@knowvah/dot-engine/render`)

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

Uzavřené sjednocení formátů, které přijímá `render(g, format, opts?)`. Viz
[Vykreslení do jiných formátů](/cs/guide/render-formats).

### `RenderOptions`

```ts
interface RenderOptions {
  engine?: EngineName;
  inlineImages?: boolean;
}
```

Volby pro `render`. `engine` má výchozí hodnotu `'dot'`. `inlineImages` (nové)
má výchozí hodnotu `false`; je-li `true`, emitor SVG vkládá externí obrázky
(`image=`/HTML `<IMG>`) jako URI `data:` dotazem na resolver zaregistrovaný přes
`setImageResolver` — minutí resolveru nebo chybějící registrace se vrací k
surovému průchodu `src`. Na formáty jiné než SVG nemá žádný účinek. Viz
[Práce s obrázky](/cs/guide/images).

::: warning `yAxis` není polem `RenderOptions`
Orientace souřadnic je záležitostí pouze `getLayout`. Surové řetězce formátů,
které `render` vytváří, nesou nativní souřadnice s osou y nahoru; pokud
potřebujete osu y dolů a nejdete přes `getLayout`, převraťte je při
následném zpracování.
:::

### `DrawOpsOptions`

```ts
interface DrawOpsOptions {
  engine?: EngineName;
}
```

Volby pro `getDrawOps`. `engine` má výchozí hodnotu `'dot'`.

### `Xdot`

```ts
interface Xdot {
  ops: XdotOp[];
  flags: number;
}
```

Zpracovaný výsledek jednoho toku atributů xdot: dekódovaná posloupnost
kreslicích operací plus bitová maska příznaků stavu zpracování. `getDrawOps`
vrací jen zploštělé `XdotOp[]` napříč všemi kreslicími atributy grafu, v pořadí
kreslení (graf → uzel → hrana) — úplnou tabulku druhů operací a příklad s
canvasem viz [Vlastní vykreslování pomocí xdot](/cs/guide/xdot-drawops).

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

Jedna dekódovaná kreslicí operace xdot, rozlišená podle `kind`. Každá varianta
nese jednu vlastnost s daty pojmenovanou podle svého tvaru — pro bezpečný
přístup zužujte podle `kind` ve `switch`. Souřadnice jsou v bodech, v nativním
rámci s osou y nahoru (pro canvas s osou y dolů převraťte — viz průvodce
odkazovaný výše).

### `XdotColor`

```ts
type XdotColor =
  | { type: 'none'; clr: string }
  | { type: 'linear'; ling: XdotLinearGrad }
  | { type: 'radial'; ring: XdotRadialGrad };
```

Vyřešená barva výplně/tahu xdot: plná barva nebo lineární/radiální přechod
(`XdotLinearGrad`/`XdotRadialGrad` nesou každý `x0,y0,x1,y1[,r0,r1]` plus pole
`stops: { frac: number; color: string }[]`).

## Kořenový balíček (`@knowvah/dot-engine`)

### `EngineName`

```ts
type BuiltinEngine =
  | 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi' | 'osage' | 'patchwork';

type EngineName = BuiltinEngine | (string & {});
```

Název modulu rozvržení. Registr je otevřený (vlastní moduly lze registrovat na
`GvcContext`), takže se přijímá libovolný řetězec; `(string & {})` zachovává
automatické doplňování v editoru pro vestavěné moduly, aniž by množinu
uzavíral. Viz [Moduly rozvržení](/cs/guide/engines).

### `ImageSizer`

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;

function setImageSizer(sizer: ImageSizer | null): void;
```

Zaregistruje zpětné volání vracející vlastní rozměry externího obrázku
odkazovaného přes `image=` nebo buňku HTML `<IMG>`, pro určení velikosti při
rozvržení. Vraťte `null`, když velikost není známa (odpovídá chování C při
chybějícím obrázku — buňka nulové velikosti plus varování). Předáním `null` do
`setImageSizer` dříve nastavený sizer zrušíte. Viz
[Použití v prohlížeči](/cs/guide/browser).

### `ImageResolver`

```ts
type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;

function setImageResolver(fn: ImageResolver | null): void;
```

Zaregistruje zpětné volání vracející surové bajty externího obrázku, používané,
když je `RenderOptions.inlineImages` `true`. Při vrácení holého `Uint8Array` se
typ MIME odvodí z přípony souboru v `src`. `null` (z resolveru, nebo když není
registrován žádný resolver) se vrací k surovému průchodu `src`. Viz
[Práce s obrázky](/cs/guide/images).

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

Zásuvné měření textu, instalované přes `setTextMeasurer` (dodávají se tři
vestavěné: `EstimateTextMeasurer`, `LutTextMeasurer`, `CanvasTextMeasurer`).
`yoffsetCenterline`/`yoffsetLayout` jsou volitelné svislé metriky (účaří→
střednice, účaří→vzestup); vynecháte-li je, použijí se výchozí hodnoty
kalibrované podle pango. Viz [Měření textu](/cs/guide/text-measurement).

### `RenderResult` a chyby

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

`tryRenderSvg(dotSource, engine)` je protějšek `renderSvg` ve stylu výsledku:
při úspěchu vrací `{ svg }` nebo při prvním selhání `{ errors: [one] }` místo
vyhození výjimky. Vrací se pro jakýkoli vstup DOT a vyhazuje jen pro neplatné
argumenty. Položky v `errors` jsou prostá data bez `cause` a bez zásobníku
volání.

Každá vyhozená chyba dot-engine rozšiřuje abstraktní `DotEngineError` a
implementuje `GvError`:

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

`renderSvg` vyhazuje `ParseError` pro neplatný zdrojový kód DOT, `RenderError`
pro selhání ve fázi rozvržení/vykreslení a `InternalError` pro chybu v
dot-engine. Chyby volajícího vyhazují standardní `TypeError` / `RangeError` /
`Error`, jehož `code` je `UsageErrorCode` (`'ERR_INVALID_ARG_TYPE' |
'ERR_INVALID_ARG_VALUE' | 'ERR_OUT_OF_RANGE' | 'ERR_INVALID_STATE'`); ty nejsou
`GvError`. Volající, kteří chtějí strukturované chyby bez `try`/`catch`, by
měli použít `tryRenderSvg`. Každý kód viz [Chyby a výjimky](/cs/guide/errors).

## Vztahy

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

## Který typ pochází z kterého volání

| Volání | Vrací |
|---|---|
| `createGraph(opts?)` | `GvGraphBuilder` |
| `builder.addNode(name, attrs?)` | `GvNode` |
| `builder.addEdge(tail, head, attrs?)` | `GvEdge` |
| `builder.addSubgraph(name, attrs?)` | `GvGraphBuilder` (vnořený) |
| `parse(dotSource)` | `Graph` |
| `render(g, format, opts?)` | `string` |
| `getLayout(g, opts?)` | `LayoutSnapshot` |
| `getDrawOps(g, opts?)` | `XdotOp[]` |
| `renderSvg(dotSource, engine)` | `string` (vyhazuje `DotEngineError` nebo `TypeError` použití) |
| `tryRenderSvg(dotSource, engine)` | `RenderResult` |

Každé pole každého výše uvedeného typu — včetně těch, která tato stránka
shrnuje — najdete ve vygenerované [referenci TypeDoc](/reference/). Podrobný
výklad souřadnicového rámce (s ukázkovými příklady) viz
[Čtení vypočtené geometrie](/cs/guide/geometry).
