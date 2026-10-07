---
sourceHash: a49bdc5fdca8b04f5bd951935e322d616028e44f4567709824dbbd5229f60e3b
---

# Referencia typov

Koncepčná mapa verejných typov zoskupená podľa toho, odkiaľ ich získate:
`createGraph`/`parse` (zostavenie + kontrola), `getLayout` (snímka geometrie),
`render`/`getDrawOps` (výstup) a koreňový balík (moduly rozloženia, obrázky,
meranie textu, chyby). Každá položka zobrazuje blok s tvarom skopírovaný zo
zdrojového kódu a jednovetný účel. Vyčerpávajúcu dokumentáciu pole po poli
(vrátane zdedených členov a JSDoc ku každej vlastnosti) nájdete vo
vygenerovanej [referencii TypeDoc](/reference/).

Táto stránka neopakuje výklad súradnicových rámcov — ten nájdete v časti
[Čítanie vypočítanej geometrie](/sk/guide/geometry). Poznámku o osi y však
stručne zopakuje všade, kde polia typu závisia od rámca.

## Zostavenie + kontrola (`@knowvah/dot-engine` / `@knowvah/dot-engine/api`)

### `Graph`

Nepriehľadný úchyt na interný model grafu. Vracia ho `parse()` a
`createGraph().graph`. Odovzdajte ho funkciám `render`, `getLayout`
a `getDrawOps`; nevytvárajte ho ani neskúmajte priamo — builder a parser sú
jediné podporované spôsoby, ako ho získať.

### `CreateGraphOptions`

```ts
interface CreateGraphOptions {
  directed?: boolean;
  strict?: boolean;
  name?: string;
}
```

Možnosti pre `createGraph`. `directed`/`strict` vyberajú jeden zo štyroch
`GraphKind` (orientovaný, neorientovaný, strict-orientovaný,
strict-neorientovaný); `name` nastavuje názov grafu (predvolene `''`).

### `GvNode`

```ts
interface GvNode {
  readonly name: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

Nepriehľadný úchyt uzla grafu, ktorý vracia `builder.addNode(...)`.
`setHtmlAttr` označí hodnotu ako popis podobný HTML (ekvivalent
`label=<...>` v texte DOT), aby ju modul rozloženia meral ako značkovanie.

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

Nepriehľadný úchyt hrany grafu, ktorý vracia `builder.addEdge(...)`.

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

Vracia ho `createGraph(...)`. `addSubgraph` vráti vnorený builder
obmedzený na daný podgraf; uzly pridané cez neho sú zároveň členmi koreňového
grafu. `.graph` je miesto odovzdania funkciám `render`/`getLayout`/`getDrawOps`.
Pozrite [Zostavenie grafu v kóde](/sk/guide/build-a-graph).

## Snímka geometrie (`getLayout`)

::: tip Súradnicový rámec
Natívne súradnice Graphviz majú os y nahor (počiatok vľavo dole). `getLayout`
má predvolene `yAxis: 'down'` (počiatok vľavo hore, konvencia obrazovky)
a prevráti každú súradnicu y; natívne súradnice Graphviz získate cez
`{ yAxis: 'up' }`. Úplný výklad: [Čítanie vypočítanej geometrie](/sk/guide/geometry).
:::

### `YAxis` / `GeometryOptions`

```ts
type YAxis = 'up' | 'down';
type GeometryOptions = { yAxis?: YAxis };
```

Možnosti pre `getLayout`. Predvolene `yAxis: 'down'`.

### `LayoutSnapshot`

```ts
interface LayoutSnapshot {
  bounds: BoundsGeometry;
  nodes: NodeGeometry[];
  edges: EdgeGeometry[];
  clusters: ClusterGeometry[];
}
```

Obyčajná snímka vypočítanej geometrie grafu serializovateľná do JSON, ktorú
vracia `getLayout(g, opts?)`. `clusters` uvádza každý podgraf klastra
rekurzívne (každý vnorený klaster dostane vlastný záznam); pre grafy bez
klastrov je prázdne.

### `BoundsGeometry`

```ts
interface BoundsGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Celkový ohraničujúci rámec v bodoch. Pri `yAxis: 'down'` sú `x`/`y`
normalizované na `(0, 0)`. Pri `yAxis: 'up'` sú `x`/`y` surový ľavý dolný roh
ohraničujúceho rámca grafu.

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

Geometria jednotlivého uzla. `x`/`y` sú stred uzla. `width`/`height` sú
v **bodoch** — model ich ukladá v palcoch (`ND_width`/`ND_height`);
`getLayout` ich pred vrátením vynásobí 72.

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

Geometria jednotlivej hrany. `points` zreťazuje každý riadiaci bod Bézierovej
krivky z vedeného splinu v poradí (prázdne, ak hrana nemá vedený spline).
`label` sa vyskytuje iba vtedy, keď hrana nesie centrovaný popis.

`tailLabel` a `headLabel` sú polohy popisov portov `taillabel`/`headlabel`.
Každý sa vyskytuje, až keď ho rozloženie umiestnilo — za rovnakej podmienky,
za akej `render()` vypíše jeho `<text>` — takže popis portu, ktorý sa nedal
umiestniť (napríklad hrana bez vedeného splinu), sa hlási ako chýbajúci
a nie ako popis v počiatku.

`xlabel` je poloha externého popisu `xlabel`. Na rozdiel od `label` ho vyberá
silové vyhľadávanie Graphviz medzi kandidátnymi polohami okolo hrany, takže
sa nedá odvodiť z `label` ani zo stredu splinu. Má rovnakú podmienku „len ak
bol umiestnený“: deklarovaný xlabel, ktorý vyhľadávanie nedokázalo umiestniť,
sa hlási ako chýbajúci, rovnako ako ho `render()` odmietne nakresliť.

`sp` a `ep` sú body pripojenia šípky na konci pri tail a pri head. Keď má
niektorý koniec šípku, spline sa skráti, aby pre ňu urobil miesto, a šípka
siaha od koncového riadiaceho bodu až po tento bod — takže spotrebiteľ
kresliaci vlastné hroty šípok si hrot prečíta tu, namiesto toho, aby ho
extrapoloval. Každý sa vyskytuje iba vtedy, keď daný koniec šípku skutočne má,
takže obyčajná hrana `digraph { a -> b }` hlási `ep` a nie `sp`, a
`arrowhead=none` nehlási ani jeden.

Ide o body pripojenia na hranici uzla. Vlastný vykresľovač Graphviz od nich
odsadí polygón šípky, ktorý kreslí, o hodnotu závislú od `penwidth`, takže
`ep` je bod, *ku ktorému* sa šípka kreslí, nie kópia vykresleného hrotu.

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

Ohraničujúci rámec jednotlivého klastra. `name` je názov podgrafu klastra
(napr. `cluster6`); vnorené klastre kódujú svoju hierarchiu v názve, takže
nie je sprístupnený žiadny explicitný odkaz na rodiča. Riadi sa rovnakou
konvenciou rámca ako `BoundsGeometry`.

`label` je umiestnenie názvu klastra a vyskytuje sa iba vtedy, keď ho klaster
deklaruje. Jeho `x`/`y` sú **stred** priestoru popisu — zodpovedá
`EdgeGeometry.label`, nie rohu rámčeka `x`/`y` vyššie — a `width`/`height` sú
zmeraná veľkosť textu, takže rámik popisu je
`[x - width/2, x + width/2] × [y - height/2, y + height/2]` a vždy leží
v rámčeku klastra. Všimnite si, že ide o *stred* popisu, kým `<text>`, ktorý
vypisuje `render()`, nesie základnú čiaru, ktorá leží nižšie.

## Vykreslenie (`@knowvah/dot-engine/render`)

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

Uzavretý zjednotený typ formátov, ktoré prijíma `render(g, format, opts?)`.
Pozrite [Vykreslenie do iných formátov](/sk/guide/render-formats).

### `RenderOptions`

```ts
interface RenderOptions {
  engine?: EngineName;
  inlineImages?: boolean;
}
```

Možnosti pre `render`. `engine` má predvolenú hodnotu `'dot'`. `inlineImages`
(nové) má predvolene `false`; keď je `true`, emitor SVG vkladá externé obrázky
(`image=`/HTML `<IMG>`) ako URI `data:` tak, že sa opýta resolvera
zaregistrovaného cez `setImageResolver` — netrafenie resolvera alebo chýbajúca
registrácia sa vráti k surovému prepusteniu `src`. Na formáty iné než SVG nemá
žiadny účinok. Pozrite [Práca s obrázkami](/sk/guide/images).

::: warning `yAxis` nie je pole `RenderOptions`
Orientácia súradníc je záležitosť iba pre `getLayout`. Surové reťazce
formátov, ktoré vytvára `render`, nesú natívne súradnice s osou y nahor;
ak potrebujete os y nadol a nejdete cez `getLayout`, preklopte ju pri
následnom spracovaní.
:::

### `DrawOpsOptions`

```ts
interface DrawOpsOptions {
  engine?: EngineName;
}
```

Možnosti pre `getDrawOps`. `engine` má predvolenú hodnotu `'dot'`.

### `Xdot`

```ts
interface Xdot {
  ops: XdotOp[];
  flags: number;
}
```

Spracovaný výsledok jedného prúdu atribútu xdot: dekódované pole kresliacich
operácií plus bitová maska príznakov stavu spracovania. `getDrawOps` vracia
iba zploštené `XdotOp[]` naprieč všetkými kresliacimi atribútmi grafu
v poradí vykresľovania (graf → uzol → hrana) — úplnú tabuľku druhov operácií
a príklad pre canvas nájdete v časti
[Vlastné vykresľovanie pomocou kresliacich operácií xdot](/sk/guide/xdot-drawops).

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

Jedna dekódovaná kresliaca operácia xdot, rozlišovaná podľa `kind`. Každý
variant nesie jednu vlastnosť s dátami pomenovanú podľa jeho tvaru — zúžte
podľa `kind` v `switch`, aby ste k nej pristupovali bezpečne. Súradnice sú
v bodoch, v natívnom rámci s osou y nahor (pre canvas s osou y nadol
preklopte — pozrite príručku odkazovanú vyššie).

### `XdotColor`

```ts
type XdotColor =
  | { type: 'none'; clr: string }
  | { type: 'linear'; ling: XdotLinearGrad }
  | { type: 'radial'; ring: XdotRadialGrad };
```

Vyriešená farba výplne/obrysu xdot: jednolitá farba alebo lineárny/radiálny
prechod (`XdotLinearGrad`/`XdotRadialGrad` nesú každý `x0,y0,x1,y1[,r0,r1]`
plus pole `stops: { frac: number; color: string }[]`).

## Koreňový balík (`@knowvah/dot-engine`)

### `EngineName`

```ts
type BuiltinEngine =
  | 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi' | 'osage' | 'patchwork';

type EngineName = BuiltinEngine | (string & {});
```

Názov modulu rozloženia. Register je otvorený (vlastné moduly možno
zaregistrovať v `GvcContext`), takže sa prijíma ľubovoľný reťazec;
`(string & {})` zachováva automatické dopĺňanie v editore pre vstavané
moduly bez uzavretia množiny. Pozrite [Moduly rozloženia](/sk/guide/engines).

### `ImageSizer`

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;

function setImageSizer(sizer: ImageSizer | null): void;
```

Zaregistruje spätné volanie vracajúce vnútorné rozmery externého obrázka
referencovaného cez `image=` alebo bunku HTML `<IMG>`, na určenie veľkosti pri
rozložení. Vráťte `null`, keď veľkosť nie je známa (zodpovedá správaniu C pri
chýbajúcom obrázku — bunka nulovej veľkosti plus varovanie). Odovzdaním `null`
funkcii `setImageSizer` zrušíte predtým nastavený merač. Pozrite
[Použitie v prehliadači](/sk/guide/browser).

### `ImageResolver`

```ts
type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;

function setImageResolver(fn: ImageResolver | null): void;
```

Zaregistruje spätné volanie vracajúce surové bajty externého obrázka, ktoré sa
použije, keď je `RenderOptions.inlineImages` `true`. Pri vrátení holého
`Uint8Array` sa typ MIME odvodí z prípony súboru v `src`. `null` (z resolvera,
alebo keď nie je zaregistrovaný žiadny resolver) sa vráti k surovému
prepusteniu `src`. Pozrite [Práca s obrázkami](/sk/guide/images).

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

Zásuvné meranie textu, inštalované cez `setTextMeasurer` (dodávajú sa tri
vstavané: `EstimateTextMeasurer`, `LutTextMeasurer`, `CanvasTextMeasurer`).
`yoffsetCenterline`/`yoffsetLayout` sú voliteľné vertikálne metriky (základná
čiara→stredová čiara, základná čiara→horný presah); ak ich vynecháte, použijú
sa predvolené hodnoty kalibrované podľa pango. Pozrite
[Meranie textu](/sk/guide/text-measurement).

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

`tryRenderSvg(dotSource, engine)` je náprotivok `renderSvg` v štýle výsledku:
pri úspechu vráti `{ svg }` a pri prvom zlyhaní `{ errors: [one] }` namiesto
vyhodenia výnimky. Vráti hodnotu pre akýkoľvek vstup DOT a vyhodí iba pri
neplatných argumentoch. Záznamy v `errors` sú obyčajné údaje bez `cause`
a bez zásobníka volaní.

Každá vyhodená chyba dot-engine rozširuje abstraktnú triedu `DotEngineError`
a implementuje `GvError`:

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

`renderSvg` vyhodí `ParseError` pri neplatnom zdrojovom kóde DOT,
`RenderError` pri zlyhaniach vo fáze rozloženia/vykreslenia a `InternalError`
pri chybe v dot-engine. Chyby volajúceho vyhodia štandardný `TypeError` /
`RangeError` / `Error`, ktorého `code` je `UsageErrorCode` (`'ERR_INVALID_ARG_TYPE' |
'ERR_INVALID_ARG_VALUE' | 'ERR_OUT_OF_RANGE' | 'ERR_INVALID_STATE'`); tieto
nie sú `GvError`. Volajúci, ktorí chcú štruktúrované chyby bez `try`/`catch`,
by mali namiesto toho použiť `tryRenderSvg`. Každý kód nájdete v časti
[Chyby a výnimky](/sk/guide/errors).

## Vzťahy

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

## Ktorý typ pochádza z ktorého volania

| Volanie | Vracia |
|---|---|
| `createGraph(opts?)` | `GvGraphBuilder` |
| `builder.addNode(name, attrs?)` | `GvNode` |
| `builder.addEdge(tail, head, attrs?)` | `GvEdge` |
| `builder.addSubgraph(name, attrs?)` | `GvGraphBuilder` (vnorený) |
| `parse(dotSource)` | `Graph` |
| `render(g, format, opts?)` | `string` |
| `getLayout(g, opts?)` | `LayoutSnapshot` |
| `getDrawOps(g, opts?)` | `XdotOp[]` |
| `renderSvg(dotSource, engine)` | `string` (vyhodí `DotEngineError` alebo `TypeError` použitia) |
| `tryRenderSvg(dotSource, engine)` | `RenderResult` |

Každé pole každého vyššie uvedeného typu — vrátane tých, ktoré táto stránka
zhrnuje — nájdete vo vygenerovanej [referencii TypeDoc](/reference/).
Hĺbkový výklad súradnicových rámcov (s prepracovanými príkladmi) nájdete
v časti [Čítanie vypočítanej geometrie](/sk/guide/geometry).
