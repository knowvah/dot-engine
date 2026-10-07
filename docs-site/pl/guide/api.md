---
sourceHash: e2e54229b04c577dfb514c415c7f02fd786b797b5bfc7a4bbf2e4192d03d0c09
---

# Referencja API

Publiczna powierzchnia jest celowo mała. Większość wywołujących potrzebuje
tylko `renderSvg`. W [Przegląd](/pl/guide/overview) znajdziesz, którego punktu
wejścia użyć, w [Typy](/pl/guide/types) kształty, które każda funkcja przyjmuje
i zwraca, a w wygenerowanej [Referencja](/reference/) wyczerpujące sygnatury,
każde pole i każde przeciążenie.

> Deklaracje typów (`.d.ts`) są emitowane przez `npm run build` (krok
> `build:types` uruchamia `tsc -p tsconfig.build.json`). Mapa `exports` w
> `package.json` podłącza warunki `types` dla każdego punktu wejścia, więc
> `@knowvah/dot-engine`, `@knowvah/dot-engine/api` i `@knowvah/dot-engine/render`
> rozwiązują typy w edytorach i w dalszych budowaniach.
>
> Build emituje też mapy deklaracji (`.d.ts.map`) i mapy źródeł JS, a pakiet
> zawiera swoje źródła `src/` — dlatego „przejdź do definicji” prowadzi wprost
> do prawdziwego TypeScriptu, co ułatwia czytanie kodu i otwarcie PR.

Ta strona jest zorganizowana według trzech punktów wejścia
([Przegląd](/pl/guide/overview) wyjaśnia, kiedy sięgnąć po który): pakiet
główny `@knowvah/dot-engine` (parsowanie i renderowanie jednym wywołaniem oraz
konfiguracja globalna dla procesu), `@knowvah/dot-engine/api` (budowanie grafu
w kodzie, odczyt obliczonej geometrii) i `@knowvah/dot-engine/render`
(wyjście w wielu formatach oraz surowe operacje rysowania). Każda poniższa
funkcja jest też reeksportowana z pakietu głównego
(`export * from './api/index.js'` / `export * from './render/index.js'` w
`src/index.ts`) — importowanie wszystkiego z `@knowvah/dot-engine` działa, ale
importy ze ścieżek podrzędnych jaśniej pokazują, której warstwy dotykasz.

## `@knowvah/dot-engine` (root)

### `renderSvg`

```ts
function renderSvg(dotSource: string, engine: EngineName): string;
```

Parsuje źródło DOT, uruchamia wskazany [silnik układu](/pl/guide/engines),
renderuje do SVG i zwraca łańcuch SVG. To funkcja pomocnicza do wywołania
jednym krokiem: tworzy `GvcContext`, rejestruje osiem wbudowanych silników i
renderer SVG, układa, renderuje i zwalnia układ — jeśli potrzebujesz tych
kroków osobno, zobacz niżej
[`GvcContext` / `renderWithContext`](#gvccontext-renderwithcontext).

- **`dotSource`** — źródło grafu w języku DOT.
- **`engine`** — `EngineName`: jeden z wbudowanych (`dot`, `neato`, `fdp`,
  `sfdp`, `circo`, `twopi`, `osage`, `patchwork`) lub dowolna nazwa
  zarejestrowana jako własna.
- **Rzuca** `DotEngineError` przy każdym problemie z wejściem: `ParseError`,
  jeśli `dotSource` jest nieprawidłowe, `RenderError`, jeśli układ lub
  renderowanie się nie powiodło, `InternalError` (z `cause`) przy błędzie w
  dot-engine. `TypeError` z `code` równym `ERR_INVALID_ARG_TYPE` /
  `ERR_INVALID_ARG_VALUE`, jeśli `dotSource` lub `engine` jest nieprawidłowe
  (także nazwa silnika, który nie jest zarejestrowany). Zobacz
  [Błędy i wyjątki](/pl/guide/errors).

Pełna sygnatura, JSDoc i lista pól `GvError`: [Referencja](/reference/).

### `tryRenderSvg` / `RenderResult`

```ts
function tryRenderSvg(dotSource: string, engine: EngineName): RenderResult;
```

Siostrzana funkcja `renderSvg` w stylu wyniku. Zwraca (nigdy nie rzuca) dla
dowolnego wejścia DOT: `{ svg }` w razie sukcesu albo `{ errors: [one] }` przy
pierwszej porażce; `svg` i `errors` wzajemnie się wykluczają. Rzuca tylko dla
nieprawidłowych argumentów (`TypeError` `ERR_INVALID_ARG_TYPE` /
`ERR_INVALID_ARG_VALUE`). Każdy wpis w `errors` to zwykłe dane serializowalne
do JSON (`type`, `code`, `message`, `friendlyMessage`, a także `location` /
`expected`, gdy występują; bez `cause`, bez śladu stosu), więc można je
bezpiecznie przesłać przez granicę workera/postMessage lub zserializować do
logu. Wybieraj tę funkcję zamiast `renderSvg` + `try`/`catch`, gdy wywołujący
chce rozgałęziać logikę po `code` / `type`, a nie łapać wyjątek. Zobacz
[Błędy i wyjątki](/pl/guide/errors). [Referencja](/reference/).

### `parse` / `ParseError`

```ts
function parse(dotSource: string): Graph;
```

Parsuje DOT do modelu grafu w pamięci **bez** układania go. Przydatne do
inspekcji lub przekształcania grafu — albo przekazania go do `getLayout` z
`@knowvah/dot-engine/api` lub `render` z `@knowvah/dot-engine/render` — przed
renderowaniem.

- **Rzuca** `ParseError` przy błędach składni lub naruszeniach kierunku
  krawędzi (np. `->` w grafie nieskierowanym). `ParseError` rozszerza
  `DotEngineError` i implementuje `GvError` z `type: 'syntax'`; niesie
  `location: { line, column, offset? }`. `TypeError` `ERR_INVALID_ARG_TYPE`,
  jeśli `dotSource` nie jest łańcuchem. [Błędy i wyjątki](/pl/guide/errors),
  [Referencja](/reference/).

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

`instanceof DotEngineError` oznacza, że dot-engine zawiódł na tym wejściu.
`RenderError` obejmuje znane porażki układu/renderowania (`type` ma wartość
`semantic` dla `UNKNOWN_LAYOUT` i `UNSUPPORTED_FEATURE`). `InternalError` to
błąd w dot-engine; `cause` zawiera pierwotny błąd, gdy został opakowany.
Pomyłki wywołującego rzucają zamiast tego standardowy `TypeError` /
`RangeError` / `Error` z `code`. `isGvError` sprawdza, czy `type` i `code` są
łańcuchami, więc działa między zduplikowanymi paczkami. Wszystkie kody i to,
co może rzucić każda funkcja, opisuje [Błędy i wyjątki](/pl/guide/errors),
kształt `GvError` — [Typy](/pl/guide/types), a listę członków `GvErrorCode` —
[Referencja](/reference/).

### `setTextMeasurer` / `getTextMeasurer`

```ts
function setTextMeasurer(measurer: TextMeasurer | null): void;
function getTextMeasurer(): TextMeasurer;
```

Rejestruje (lub czyści, przez `null`) globalny dla procesu miernik tekstu,
używany podczas układu do wymiarowania etykiet. Wyczyszczenie przywraca
domyślny miernik biblioteki (przeglądarka: `CanvasTextMeasurer`; tryb
headless/Node: `EstimateTextMeasurer`, chyba że podłączono miernik LUT) —
pełną kolejność rozstrzygania oraz implementacje `CanvasTextMeasurer` /
`EstimateTextMeasurer` / `LutTextMeasurer` eksportowane razem z tymi funkcjami
opisuje [Pomiar tekstu](/pl/guide/text-measurement).
[Referencja](/reference/).

### `setImageSizer` / `setImageResolver`

Dwa pokrewne, ale odrębne punkty rozszerzeń konfiguracji obrazów — oba to
globalne dla procesu rejestry o tym samym wzorcu (zarejestruj callback, przekaż
`null`, aby wyczyścić), oba bez efektu, dopóki wywołujący jakiegoś nie
zarejestruje:

- **`setImageSizer`** — zgłasza *wymiary własne* zewnętrznego obrazu, aby
  silnik układu mógł zarezerwować miejsce na komórkę HTML `<IMG>` lub atrybut
  węzła `image=` przed renderowaniem. Zwrócenie `null` (lub brak zarejestrowanego
  sizera) odtwarza zachowanie natywnego Graphviza przy brakującym obrazie:
  ostrzeżenie i zerowy rozmiar.
- **`setImageResolver`** (nowość — zobacz niżej [`inlineImages`](#inlineimages))
  — dostarcza właściwe *bajty* obrazu, aby renderer SVG mógł osadzić je jako URI
  `data:` zamiast emitować `xlink:href="src"` jako surowe przepuszczenie.

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;
function setImageSizer(sizer: ImageSizer | null): void;

type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;
function setImageResolver(fn: ImageResolver | null): void;
```

`ImageResolver` może zwrócić gołe `Uint8Array` (MIME wnioskowany z
rozszerzenia pliku `src` — `.png`, `.jpg`/`.jpeg`, `.gif`, `.svg`, `.webp`;
cokolwiek innego daje `application/octet-stream`) albo `{ bytes, mime }`, aby
ustawić typ MIME jawnie. Zwróć `null`, gdy `src` nie da się rozwiązać —
renderer wraca wtedy do surowego przepuszczenia `src`, tak jakby żaden
resolver nie był zarejestrowany. Zarejestrowanie resolvera samo w sobie nic nie
zmienia; jest używany tylko wtedy, gdy opcja `inlineImages` w `render` ma
wartość `true` (niżej). Przykład roboczy opisuje [Praca z obrazami](/pl/guide/images),
a oba typy callbacków — [Referencja](/reference/).

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

`renderSvgAsync` to asynchroniczny odpowiednik `renderSvg`: wstępnie pobiera
czcionki webowe i dane obrazów potrzebne grafowi, po czym układa i renderuje.
`renderSvgInto` renderuje i zastępuje potomków elementu o identyfikatorze `id`,
domyślnie sanityzując SVG (`trusted: true` to pomija; `sanitize` zastępuje
wbudowany czyściciel). Porażki, także złe argumenty, są odrzuceniami obietnicy
z tymi samymi klasami błędów co `renderSvg`; brakujący identyfikator elementu
odrzuca z `ERR_INVALID_ARG_VALUE`. Problemy z czcionkami nigdy nie odrzucają;
wracają w `fontIssues`. Zobacz [Użycie w przeglądarce](/pl/guide/browser),
[Praca z obrazami](/pl/guide/images) oraz [Referencja](/reference/).

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

Orkiestracja niższego poziomu dla wywołujących, którzy chcą prowadzić układ i
renderowanie jako osobne kroki. `renderSvg` jest funkcją pomocniczą dokładnie
nad tym: tworzy kontekst, rejestruje silniki/renderery, `layout`,
`renderWithContext`, `freeLayout`. Sięgaj po nie bezpośrednio tylko wtedy,
gdy potrzebujesz takiej kontroli — na przykład aby zarejestrować podzbiór
silników, dodać własny `LayoutEngine` lub `RendererPlugin` albo wyrenderować
ten sam ułożony graf do wielu formatów bez ponownego uruchamiania układu
(wywołaj `layout` raz, potem `renderWithContext` dla każdego formatu, na końcu
`freeLayout`). [Referencja](/reference/).

## `@knowvah/dot-engine/api`

Programowe konstruowanie, bezpieczne wstawianie krawędzi i odczyt obliczonej
geometrii — warstwa do budowania grafu bez ręcznego pisania tekstu DOT i
odczytywania jego układu jako zwykłych danych. `LayoutSnapshot` i jego
zagnieżdżone kształty opisuje [Typy](/pl/guide/types).

### `createGraph`

```ts
function createGraph(opts?: {
  directed?: boolean;
  strict?:   boolean;
  name?:     string;
}): GvGraphBuilder;
```

Tworzy świeży graf gotowy do przekazania do `render` / `getLayout` /
`getDrawOps`. Wartości domyślne: `directed: true`, `strict: false`,
`name: ''`. Zwraca `GvGraphBuilder` — `addNode`, `addEdge`, `addSubgraph`,
`setAttr`/`getAttr`, `setHtmlAttr` (dla etykiet w postaci tabel HTML) oraz
właściwość `.graph` udostępniającą nieprzezroczysty uchwyt `Graph`. Zobacz
[Budowanie grafu w kodzie](/pl/guide/build-a-graph) i
[Referencja](/reference/), gdzie są pełne interfejsy
`GvGraphBuilder`/`GvNode`/`GvEdge`.

### `addEdge`

```ts
function addEdge(g: Graph, tail: Node, head: Node, name?: string): Edge;
```

Funkcja pomocnicza niższego poziomu do wstawiania krawędzi, na której opiera się
`GvGraphBuilder.addEdge` — eksportowana bezpośrednio dla wywołujących, którzy
pracują na wewnętrznych referencjach `Node`/`Edge` (np. krawędzie dodawane do
grafu zwróconego przez `parse()`), a nie na nieprzezroczystych uchwytach
`GvNode`/`GvEdge` konstruktora. Większość wywołujących powinna zamiast tego
używać `createGraph(...).addEdge(tail, head, attrs?)`.

- **`name`** — klucz krawędzi; domyślnie `''` (anonimowa). Ignorowany przy
  deduplikacji w grafie strict, która dopasowuje wyłącznie po `(tail, head)`
  (symetrycznie dla grafów nieskierowanych).
- **Zwraca** nową krawędź albo istniejącą, jeśli `g` jest strict i krawędź
  `(tail, head)` już istnieje (odpowiada `agedge` z `cflag=1`).

Zobacz [Budowanie grafu w kodzie](/pl/guide/build-a-graph) i
[Referencja](/reference/).

### `getLayout`

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

Zwraca zwykłą migawkę obliczonej geometrii grafu, serializowalną do JSON —
pozycje węzłów, punkty kontrolne splajnów krawędzi, etykiety krawędzi,
prostokąty ograniczające klastrów i ogólne granice grafu — wszystko w
punktach.

- **`g`** — musi być już ułożony (przez `render(g, ...)`, `getDrawOps(g)` lub
  `ctx.layout(g, engine)`); wywołanie `getLayout` na grafie, który nie został
  jeszcze ułożony, rzuca wyjątek zamiast po cichu zwracać geometrię złożoną z
  samych zer.
- **`opts.yAxis`** — domyślnie `'down'`: współrzędne ekranowe, początek w lewym
  górnym rogu, y rośnie w dół, a `bounds` jest znormalizowane do `(0, 0)`.
  `'up'` zwraca natywne współrzędne Graphviza (początek w lewym dolnym rogu, y
  rośnie w górę) z `bounds.x`/`bounds.y` w surowym lewym dolnym rogu.
- **Rzuca** `Error` z `code` równym `ERR_INVALID_STATE`, jeśli `g` nie został
  ułożony; `TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` dla
  złego `g` lub `opts`. Zobacz [Błędy i wyjątki](/pl/guide/errors).

Szerokość i wysokość węzła (`width`/`height`) są przeliczane na punkty
(wewnętrzny model przechowuje cale); każda inna współrzędna jest już w
punktach. Opis układu współrzędnych znajdziesz w
[Odczyt obliczonej geometrii](/pl/guide/geometry), a pełne listy pól
`LayoutSnapshot`, `NodeGeometry`, `EdgeGeometry`, `ClusterGeometry` i
`BoundsGeometry` — w [Typy](/pl/guide/types) i [Referencja](/reference/).

### `Graph`

Nieprzezroczysty typ uchwytu reeksportowany z wewnętrznego modelu. Udostępniony
jest tylko *typ* (nie mutowalna klasa) — oznacz nim zmienną przechowującą
`.graph` konstruktora lub wynik `parse()`, ale nie konstruuj go ani nie
inspekcjonuj jego pól bezpośrednio; do odczytu stanu użyj konstruktora,
`getLayout` lub `getDrawOps`. [Referencja](/reference/).

## `@knowvah/dot-engine/render`

Wyjście w wielu formatach i dostęp do surowych operacji rysowania — warstwa do
renderowania grafu już sparsowanego przez `parse` lub zbudowanego konstruktorem.

### `render`

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  RenderOptions,
): string;
```

Układa i renderuje graf do łańcucha w żądanym formacie.

- **`format`** — `OutputFormat`: `'svg' | 'dot' | 'xdot' | 'json' | 'plain' |
  'plain-ext' | 'imap' | 'cmapx'`.
- **`opts.engine`** — silnik układu (domyślnie `'dot'`).
- **`opts.inlineImages`** — zobacz [niżej](#inlineimages).
- **Rzuca** `RenderError` przy porażce układu lub renderowania; `InternalError`
  przy błędzie w dot-engine; `TypeError` z `code` dla nieprawidłowych
  argumentów (w tym niezarejestrowanego silnika lub formatu). Zobacz
  [Błędy i wyjątki](/pl/guide/errors).

`opts.engine` odpowiada parametrowi `engine` w `renderSvg`; `format` to oś,
której `renderSvg` nie udostępnia (`renderSvg` jest na stałe ustawione na
`'svg'`). Zobacz [Renderowanie do innych formatów](/pl/guide/render-formats) i
[Referencja](/reference/), gdzie jest pełna unia `OutputFormat` i kształt
`RenderOptions`.

#### `inlineImages`

`RenderOptions.inlineImages` (domyślnie `false`) osadza zewnętrzne obrazy jako
URI `data:` zamiast surowego przepuszczenia `xlink:href="src"`. Nie ma efektu,
dopóki nie zarejestrowano resolvera przez `setImageResolver` (wyżej) — ani na
formatach innych niż SVG. Bez ustawienia wyjście jest bajt w bajt identyczne
jak przed pojawieniem się tej opcji.

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

Pełny przewodnik, w tym rozwiązywanie z `fetch` w przeglądarce i z systemu
plików w Node, znajdziesz w [Praca z obrazami](/pl/guide/images).

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

Asynchroniczny odpowiednik `render`: te same formaty i opcje
`engine`/`inlineImages`, plus asynchroniczne haki obrazów dla pojedynczego
wywołania i wstępne pobieranie czcionek. Każdy hak obrazu jest uruchamiany co
najwyżej raz dla każdego odrębnego `src`; rzucenie wyjątku lub odrzucenie jest
traktowane jako pudło. Wyjście dla formatów znacznikowych to niesanityzowany
znacznik; zobacz sekcję „Security” w README.

### `getDrawOps` / `DEFAULT_DRAW_ENGINE`

```ts
const DEFAULT_DRAW_ENGINE: EngineName; // 'dot'

function getDrawOps(g: Graph, opts?: { engine?: EngineName }): XdotOp[];
```

Układa `g`, renderuje do xdot i zwraca płaską, typowaną tablicę operacji
rysowania — kształty węzłów, odcinki tekstu, kolory i czcionki jako wartości
unii rozróżnianej (zawężaj po `op.kind` w `switch`) — do zasilania własnego
renderera canvas/WebGL/PDF bez dotykania SVG ani łańcuchowego kodowania xdot.
`opts.engine` domyślnie przyjmuje `DEFAULT_DRAW_ENGINE` (`'dot'`).

- **Rzuca** `ParseError`, jeśli pośredniego wyjścia xdot nie da się ponownie
  sparsować (błąd w dot-engine; w praktyce nieoczekiwany); `RenderError` przy
  porażce układu/renderowania; `InternalError` przy każdym innym błędzie w
  dot-engine; `TypeError` z `code` dla nieprawidłowych argumentów. Zobacz
  [Błędy i wyjątki](/pl/guide/errors).

Listę rodzajów operacji i działający przykład z canvas znajdziesz w
[Własne renderowanie z xdot](/pl/guide/xdot-drawops), a pełną unię `XdotOp` i
kształty `Xdot`/`XdotColor` — w [Typy](/pl/guide/types) i
[Referencja](/reference/).
