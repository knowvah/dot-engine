---
sourceHash: a49bdc5fdca8b04f5bd951935e322d616028e44f4567709824dbbd5229f60e3b
---

# Referencja typów

Koncepcyjna mapa typów publicznych, pogrupowana według tego, skąd je
otrzymujesz: `createGraph`/`parse` (budowanie + inspekcja), `getLayout`
(migawka geometrii), `render`/`getDrawOps` (wyjście) oraz pakiet główny
(silniki, obrazy, pomiar tekstu, błędy). Każdy wpis pokazuje blok kształtu
skopiowany ze źródła i jednozdaniowe przeznaczenie. Wyczerpującą dokumentację
pole po polu (w tym odziedziczone składowe i JSDoc przy każdej właściwości)
znajdziesz w wygenerowanej [referencji TypeDoc](/reference/).

Ta strona nie powtarza omówienia ramki współrzędnych — zobacz
[Odczyt obliczonej geometrii](/pl/guide/geometry). Przypomina natomiast krótko
uwagę o osi y wszędzie tam, gdzie pola typu zależą od ramki.

## Budowanie + inspekcja (`@knowvah/dot-engine` / `@knowvah/dot-engine/api`)

### `Graph`

Nieprzezroczysty uchwyt wewnętrznego modelu grafu. Zwracany przez `parse()` i
przez `createGraph().graph`. Przekaż go do `render`, `getLayout` i
`getDrawOps`; nie konstruuj go ani nie inspekcjonuj bezpośrednio — konstruktor
i parser to jedyne wspierane sposoby jego wytworzenia.

### `CreateGraphOptions`

```ts
interface CreateGraphOptions {
  directed?: boolean;
  strict?: boolean;
  name?: string;
}
```

Opcje dla `createGraph`. `directed`/`strict` wybierają jeden z czterech
`GraphKind` (skierowany, nieskierowany, strict-skierowany,
strict-nieskierowany); `name` ustawia nazwę grafu (domyślnie `''`).

### `GvNode`

```ts
interface GvNode {
  readonly name: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

Nieprzezroczysty uchwyt węzła grafu zwracany przez `builder.addNode(...)`.
`setHtmlAttr` oznacza wartość jako etykietę w stylu HTML (odpowiednik
`label=<...>` w tekście DOT), aby silnik układu mierzył ją jako znacznik.

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

Nieprzezroczysty uchwyt krawędzi grafu zwracany przez `builder.addEdge(...)`.

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

Zwracany przez `createGraph(...)`. `addSubgraph` zwraca zagnieżdżony konstruktor
o zakresie tego podgrafu; węzły dodane przez niego są także członkami grafu
głównego. `.graph` to punkt przekazania do `render`/`getLayout`/`getDrawOps`.
Zobacz [Budowanie grafu w kodzie](/pl/guide/build-a-graph).

## Migawka geometrii (`getLayout`)

::: tip Ramka współrzędnych
Natywne współrzędne Graphviza mają oś y skierowaną w górę (początek w lewym
dolnym rogu). `getLayout` domyślnie używa `yAxis: 'down'` (początek w lewym
górnym rogu, konwencja ekranowa) i odwraca każdą współrzędną y; przekaż
`{ yAxis: 'up' }`, aby uzyskać natywne współrzędne Graphviza. Pełne omówienie:
[Odczyt obliczonej geometrii](/pl/guide/geometry).
:::

### `YAxis` / `GeometryOptions`

```ts
type YAxis = 'up' | 'down';
type GeometryOptions = { yAxis?: YAxis };
```

Opcje dla `getLayout`. Domyślnie `yAxis: 'down'`.

### `LayoutSnapshot`

```ts
interface LayoutSnapshot {
  bounds: BoundsGeometry;
  nodes: NodeGeometry[];
  edges: EdgeGeometry[];
  clusters: ClusterGeometry[];
}
```

Zwykła migawka obliczonej geometrii grafu, serializowalna do JSON, zwracana
przez `getLayout(g, opts?)`. `clusters` wymienia rekurencyjnie każdy podgraf
będący klastrem (każdy zagnieżdżony klaster dostaje własny wpis); dla grafów
bez klastrów jest puste.

### `BoundsGeometry`

```ts
interface BoundsGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Ogólny prostokąt ograniczający, w punktach. Przy `yAxis: 'down'` wartości
`x`/`y` są znormalizowane do `(0, 0)`. Przy `yAxis: 'up'` wartości `x`/`y` to
surowy lewy dolny róg prostokąta ograniczającego graf.

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

Geometria pojedynczego węzła. `x`/`y` to środek węzła. `width`/`height` są w
**punktach** — model przechowuje je w calach (`ND_width`/`ND_height`);
`getLayout` mnoży je przez 72 przed zwróceniem.

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

Geometria pojedynczej krawędzi. `points` łączy po kolei wszystkie punkty
kontrolne krzywych Béziera wyznaczonego splajnu (puste, jeśli krawędź nie ma
wyznaczonego splajnu). `label` występuje tylko wtedy, gdy krawędź ma etykietę
środkową.

`tailLabel` i `headLabel` to pozycje etykiet portów `taillabel`/`headlabel`.
Każda występuje dopiero wtedy, gdy układ ją umieścił — ten sam warunek, przy
którym `render()` emituje jej `<text>` — więc etykieta portu, której nie dało
się umieścić (na przykład krawędź bez wyznaczonego splajnu), jest zgłaszana
jako nieobecna, a nie jako etykieta w początku układu.

`xlabel` to pozycja etykiety zewnętrznej `xlabel`. W przeciwieństwie do
`label` jest wybierana przez siłowe przeszukiwanie pozycji kandydackich wokół
krawędzi w Graphviz, więc nie da się jej wyprowadzić z `label` ani ze środka
splajnu. Obowiązuje ta sama bramka „tylko umieszczone”: zadeklarowana etykieta
xlabel, której wyszukiwanie nie zdołało zmieścić, jest zgłaszana jako
nieobecna, dokładnie tak, jak `render()` odmawia jej narysowania.

`sp` i `ep` to punkty zaczepienia strzałek na końcu ogona i głowy. Gdy koniec
niesie strzałkę, splajn jest skracany, by zostawić na nią miejsce, a strzałka
rozciąga się od końcowego punktu kontrolnego do tego punktu — dzięki temu
odbiorca rysujący własne groty odczytuje czubek stąd, zamiast go
ekstrapolować. Każdy występuje tylko wtedy, gdy dany koniec faktycznie ma
strzałkę, więc zwykła krawędź `digraph { a -> b }` zgłasza `ep` i brak `sp`, a
`arrowhead=none` nie zgłasza żadnego.

Są to punkty zaczepienia na granicy węzła. Własny renderer Graphviza cofa
rysowany wielokąt strzałki względem nich o wartość zależną od `penwidth`, więc
`ep` to punkt, *do którego* należy rysować strzałkę, a nie kopia
wyrenderowanego czubka.

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

Prostokąt ograniczający pojedynczego klastra. `name` to nazwa podgrafu
klastra (np. `cluster6`); zagnieżdżone klastry kodują swoją hierarchię w
nazwie, więc nie udostępniono jawnego łącza do rodzica. Stosuje tę samą
konwencję ramki co `BoundsGeometry`.

`label` to umiejscowienie tytułu klastra, obecne tylko wtedy, gdy klaster
jakiś deklaruje. Jego `x`/`y` to **środek** miejsca na etykietę — zgodnie z
`EdgeGeometry.label`, a nie z narożnikiem ramki `x`/`y` powyżej — a
`width`/`height` to zmierzony rozmiar tekstu, więc prostokąt etykiety to
`[x - width/2, x + width/2] × [y - height/2, y + height/2]` i zawsze leży
wewnątrz ramki klastra. Zauważ, że to *środek* etykiety, podczas gdy `<text>`
emitowany przez `render()` niesie linię bazową, która leży niżej.

## Renderowanie (`@knowvah/dot-engine/render`)

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

Zamknięta unia formatów akceptowanych przez `render(g, format, opts?)`. Zobacz
[Renderowanie do innych formatów](/pl/guide/render-formats).

### `RenderOptions`

```ts
interface RenderOptions {
  engine?: EngineName;
  inlineImages?: boolean;
}
```

Opcje dla `render`. `engine` domyślnie ma wartość `'dot'`. `inlineImages`
(nowość) domyślnie ma wartość `false`; gdy jest `true`, emiter SVG osadza
zewnętrzne obrazy (`image=`/HTML `<IMG>`) jako URI `data:`, korzystając z
resolvera zarejestrowanego przez `setImageResolver` — chybienie resolvera lub
brak rejestracji wraca do surowego przepuszczenia `src`. Nie ma efektu dla
formatów innych niż SVG. Zobacz [Praca z obrazami](/pl/guide/images).

::: warning `yAxis` nie jest polem `RenderOptions`
Orientacja współrzędnych dotyczy wyłącznie `getLayout`. Surowe łańcuchy
formatów tworzone przez `render` niosą natywne współrzędne z osią y w górę;
jeśli potrzebujesz osi y w dół, a nie korzystasz z `getLayout`, odwróć je w
postprocessingu.
:::

### `DrawOpsOptions`

```ts
interface DrawOpsOptions {
  engine?: EngineName;
}
```

Opcje dla `getDrawOps`. `engine` domyślnie ma wartość `'dot'`.

### `Xdot`

```ts
interface Xdot {
  ops: XdotOp[];
  flags: number;
}
```

Sparsowany wynik jednego strumienia atrybutu xdot: zdekodowana tablica
operacji rysowania plus maska bitowa flag statusu parsowania. `getDrawOps`
zwraca tylko spłaszczoną tablicę `XdotOp[]` ze wszystkich atrybutów rysowania
grafu, w kolejności malowania (graf → węzeł → krawędź) — pełną tabelę rodzajów
operacji i przykład z canvas znajdziesz w
[Własne renderowanie z xdot](/pl/guide/xdot-drawops).

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

Pojedyncza zdekodowana operacja rysowania xdot, rozróżniana po `kind`. Każdy
wariant niesie jedną właściwość ładunku nazwaną od jego kształtu — zawężaj po
`kind` w `switch`, aby bezpiecznie do niej sięgnąć. Współrzędne są w punktach,
w natywnej ramce z osią y w górę (odwróć je dla canvas z osią y w dół — zobacz
przewodnik wyżej).

### `XdotColor`

```ts
type XdotColor =
  | { type: 'none'; clr: string }
  | { type: 'linear'; ling: XdotLinearGrad }
  | { type: 'radial'; ring: XdotRadialGrad };
```

Rozstrzygnięty kolor wypełnienia/obrysu xdot: kolor jednolity albo gradient
liniowy/promienisty (`XdotLinearGrad`/`XdotRadialGrad` niosą każdy
`x0,y0,x1,y1[,r0,r1]` oraz tablicę
`stops: { frac: number; color: string }[]`).

## Pakiet główny (`@knowvah/dot-engine`)

### `EngineName`

```ts
type BuiltinEngine =
  | 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi' | 'osage' | 'patchwork';

type EngineName = BuiltinEngine | (string & {});
```

Nazwa silnika układu. Rejestr jest otwarty (własne silniki można rejestrować w
`GvcContext`), więc akceptowany jest dowolny łańcuch; `(string & {})`
zachowuje autouzupełnianie w edytorze dla wbudowanych bez zamykania zbioru.
Zobacz [Silniki układu](/pl/guide/engines).

### `ImageSizer`

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;

function setImageSizer(sizer: ImageSizer | null): void;
```

Rejestruje callback zwracający wymiary własne zewnętrznego obrazu wskazanego
przez `image=` lub komórkę HTML `<IMG>`, do wymiarowania w układzie. Zwróć
`null`, gdy rozmiar jest nieznany (odpowiada zachowaniu C przy brakującym
obrazie — komórka o zerowym rozmiarze plus ostrzeżenie). Przekaż `null` do
`setImageSizer`, aby wyczyścić wcześniej ustawiony sizer. Zobacz
[Użycie w przeglądarce](/pl/guide/browser).

### `ImageResolver`

```ts
type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;

function setImageResolver(fn: ImageResolver | null): void;
```

Rejestruje callback zwracający surowe bajty zewnętrznego obrazu, używany, gdy
`RenderOptions.inlineImages` ma wartość `true`. Zwrócenie gołego `Uint8Array`
wnioskuje typ MIME z rozszerzenia pliku `src`. `null` (z resolvera albo brak
zarejestrowanego resolvera) wraca do surowego przepuszczenia `src`. Zobacz
[Praca z obrazami](/pl/guide/images).

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

Wymienny pomiar tekstu, instalowany przez `setTextMeasurer` (w zestawie trzy
wbudowane: `EstimateTextMeasurer`, `LutTextMeasurer`, `CanvasTextMeasurer`).
`yoffsetCenterline`/`yoffsetLayout` to opcjonalne metryki pionowe (linia
bazowa→oś środkowa, linia bazowa→wznios); pomiń je, aby wrócić do wartości
domyślnych skalibrowanych względem pango. Zobacz
[Pomiar tekstu](/pl/guide/text-measurement).

### `RenderResult` i błędy

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

`tryRenderSvg(dotSource, engine)` to odpowiednik `renderSvg` w stylu wyniku:
zamiast rzucać, zwraca `{ svg }` w razie sukcesu albo `{ errors: [one] }` przy
pierwszej porażce. Zwraca wynik dla dowolnego wejścia DOT i rzuca tylko dla
nieprawidłowych argumentów. Wpisy w `errors` to zwykłe dane bez `cause` i bez
stosu.

Każdy rzucony błąd dot-engine rozszerza abstrakcyjny `DotEngineError` i
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

`renderSvg` rzuca `ParseError` dla nieprawidłowego źródła DOT, `RenderError` dla
porażek na etapie układu/renderowania i `InternalError` dla błędu w dot-engine.
Pomyłki wywołującego rzucają standardowy `TypeError` / `RangeError` / `Error`,
którego `code` to `UsageErrorCode` (`'ERR_INVALID_ARG_TYPE' |
'ERR_INVALID_ARG_VALUE' | 'ERR_OUT_OF_RANGE' | 'ERR_INVALID_STATE'`); nie są to
`GvError`. Wywołujący, którzy chcą ustrukturyzowanych błędów bez `try`/`catch`,
powinni użyć zamiast tego `tryRenderSvg`. Każdy kod opisuje
[Błędy i wyjątki](/pl/guide/errors).

## Zależności

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

## Który typ pochodzi z którego wywołania

| Wywołanie | Zwraca |
|---|---|
| `createGraph(opts?)` | `GvGraphBuilder` |
| `builder.addNode(name, attrs?)` | `GvNode` |
| `builder.addEdge(tail, head, attrs?)` | `GvEdge` |
| `builder.addSubgraph(name, attrs?)` | `GvGraphBuilder` (zagnieżdżony) |
| `parse(dotSource)` | `Graph` |
| `render(g, format, opts?)` | `string` |
| `getLayout(g, opts?)` | `LayoutSnapshot` |
| `getDrawOps(g, opts?)` | `XdotOp[]` |
| `renderSvg(dotSource, engine)` | `string` (rzuca `DotEngineError` albo `TypeError` użycia) |
| `tryRenderSvg(dotSource, engine)` | `RenderResult` |

Wszystkie pola wszystkich powyższych typów — także te, które ta strona
streszcza — znajdziesz w wygenerowanej [referencji TypeDoc](/reference/).
Dogłębne omówienie ramki współrzędnych (z przykładami roboczymi) znajdziesz w
[Odczyt obliczonej geometrii](/pl/guide/geometry).
