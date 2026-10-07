---
sourceHash: a49bdc5fdca8b04f5bd951935e322d616028e44f4567709824dbbd5229f60e3b
---

# Referință de tipuri

O hartă conceptuală a tipurilor publice, grupate după locul de unde le
obțineți: `createGraph`/`parse` (construire + inspecție), `getLayout`
(instantanee de geometrie), `render`/`getDrawOps` (ieșire) și pachetul
rădăcină (motoare, imagini, măsurarea textului, erori). Fiecare intrare
prezintă un bloc de formă copiat din sursă și un scop într-o singură
propoziție. Pentru documentația exhaustivă, câmp cu câmp (inclusiv membrii
moșteniți și JSDoc pe fiecare proprietate), consultați
[referința TypeDoc](/reference/) generată.

Această pagină nu repetă parcurgerea cadrului de coordonate — consultați
[Citirea geometriei calculate](/ro/guide/geometry) pentru aceasta. Reia pe
scurt observația despre axa y oriunde câmpurile unui tip depind de cadru.

## Construire + inspecție (`@knowvah/dot-engine` / `@knowvah/dot-engine/api`)

### `Graph`

Un mâner opac către modelul intern al grafului. Returnat de `parse()` și de
`createGraph().graph`. Transmiteți-l lui `render`, `getLayout` și `getDrawOps`;
nu îl construiți și nu îl inspectați direct — constructorul și analizorul sunt
singurele moduri acceptate de a produce unul.

### `CreateGraphOptions`

```ts
interface CreateGraphOptions {
  directed?: boolean;
  strict?: boolean;
  name?: string;
}
```

Opțiuni pentru `createGraph`. `directed`/`strict` selectează unul dintre cele
patru `GraphKind` (orientat, neorientat, strict-orientat, strict-neorientat);
`name` setează numele grafului (implicit `''`).

### `GvNode`

```ts
interface GvNode {
  readonly name: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

Mâner opac pentru un nod de graf, returnat de `builder.addNode(...)`.
`setHtmlAttr` marchează valoarea ca etichetă de tip HTML (echivalent cu
`label=<...>` în textul DOT), astfel încât motorul de aranjare o măsoară ca
marcaj.

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

Mâner opac pentru o muchie de graf, returnat de `builder.addEdge(...)`.

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

Returnat de `createGraph(...)`. `addSubgraph` returnează un constructor
imbricat, cu domeniul limitat la acel subgraf; nodurile adăugate prin el sunt
și membre ale grafului rădăcină. `.graph` este punctul de predare către
`render`/`getLayout`/`getDrawOps`. Consultați
[Construirea unui graf în cod](/ro/guide/build-a-graph).

## Instantaneea de geometrie (`getLayout`)

::: tip Cadrul de coordonate
Coordonatele native graphviz au axa y în sus (origine în stânga jos).
`getLayout` are implicit `yAxis: 'down'` (origine în stânga sus, convenția
ecranului) și inversează fiecare coordonată y; transmiteți `{ yAxis: 'up' }`
pentru coordonatele native graphviz. Parcurgere completă:
[Citirea geometriei calculate](/ro/guide/geometry).
:::

### `YAxis` / `GeometryOptions`

```ts
type YAxis = 'up' | 'down';
type GeometryOptions = { yAxis?: YAxis };
```

Opțiuni pentru `getLayout`. Implicit `yAxis: 'down'`.

### `LayoutSnapshot`

```ts
interface LayoutSnapshot {
  bounds: BoundsGeometry;
  nodes: NodeGeometry[];
  edges: EdgeGeometry[];
  clusters: ClusterGeometry[];
}
```

Instantanee simplă, serializabilă în JSON, a geometriei calculate a unui graf,
returnată de `getLayout(g, opts?)`. `clusters` enumeră recursiv fiecare subgraf
de tip cluster (clusterele imbricate primesc fiecare propria intrare); este
goală pentru grafurile fără clustere.

### `BoundsGeometry`

```ts
interface BoundsGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Caseta de încadrare generală, în puncte. Cu `yAxis: 'down'`, `x`/`y` sunt
normalizate la `(0, 0)`. Cu `yAxis: 'up'`, `x`/`y` reprezintă colțul brut din
stânga jos al casetei de încadrare a grafului.

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

Geometria fiecărui nod. `x`/`y` reprezintă centrul nodului. `width`/`height`
sunt în **puncte** — modelul le stochează în inci (`ND_width`/`ND_height`);
`getLayout` le înmulțește cu 72 înainte de a le returna.

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

Geometria fiecărei muchii. `points` concatenează, în ordine, fiecare punct de
control bezier din spline-ul rutat (gol dacă muchia nu are spline rutat).
`label` este prezent doar când muchia poartă o etichetă centrală.

`tailLabel` și `headLabel` sunt pozițiile etichetelor de port
`taillabel`/`headlabel`. Fiecare este prezentă doar după ce aranjarea a
plasat-o — aceeași condiție în care `render()` își emite `<text>`-ul — deci o
etichetă de port care nu a putut fi plasată (o muchie fără spline rutat, de
exemplu) este raportată ca absentă, nu ca o etichetă la origine.

`xlabel` este poziția etichetei externe `xlabel`. Spre deosebire de `label`,
este aleasă de căutarea de plasare bazată pe forțe a graphviz, printre pozițiile
candidate din jurul muchiei, deci nu poate fi dedusă din `label` sau din
punctul de mijloc al spline-ului. Are aceeași condiție de „doar dacă a fost
plasat”: un xlabel declarat pe care căutarea nu l-a putut încadra este raportat
ca absent, exact cum `render()` refuză să îl deseneze.

`sp` și `ep` sunt punctele de atașare ale săgeții la capetele tail și head.
Când un capăt poartă o săgeată, spline-ul este scurtat pentru a lăsa loc, iar
săgeata se întinde de la punctul de control terminal până la acest punct — astfel
un consumator care își desenează propriile vârfuri de săgeată citește aici
vârful, în loc să-l extrapoleze. Fiecare este prezent doar când acel capăt are
efectiv o săgeată, deci o muchie simplă `digraph { a -> b }` raportează `ep` și
niciun `sp`, iar `arrowhead=none` nu raportează niciunul.

Acestea sunt punctele de atașare de pe conturul nodului. Randatorul propriu al
Graphviz retrage poligonul săgeții pe care îl desenează față de ele cu o valoare
dependentă de grosimea peniței, deci `ep` este punctul *până la* care se
desenează o săgeată, nu o copie a vârfului randat.

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

Caseta de încadrare a fiecărui cluster. `name` este numele subgrafului de tip
cluster (de exemplu `cluster6`); clusterele imbricate își codifică ierarhia în
nume, deci nu este expusă nicio legătură explicită către părinte. Urmează
aceeași convenție de cadru ca `BoundsGeometry`.

`label` este plasarea titlului clusterului, prezentă doar când clusterul
declară unul. `x`/`y` ale sale sunt **centrul** spațiului etichetei — în
acord cu `EdgeGeometry.label`, nu cu colțul casetei `x`/`y` de mai sus — iar
`width`/`height` sunt dimensiunea măsurată a textului, deci caseta etichetei
este `[x - width/2, x + width/2] × [y - height/2, y + height/2]` și se află
întotdeauna în interiorul casetei clusterului. Rețineți că acesta este
*centrul* etichetei, în timp ce `<text>`-ul emis de `render()` poartă linia de
bază, care se află mai jos.

## Randare (`@knowvah/dot-engine/render`)

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

Uniune închisă a formatelor acceptate de `render(g, format, opts?)`. Consultați
[Randare în alte formate](/ro/guide/render-formats).

### `RenderOptions`

```ts
interface RenderOptions {
  engine?: EngineName;
  inlineImages?: boolean;
}
```

Opțiuni pentru `render`. `engine` are implicit `'dot'`. `inlineImages` (nou)
are implicit `false`; când este `true`, emițătorul SVG inserează direct
imaginile externe (`image=`/HTML `<IMG>`) ca URI `data:`, consultând
resolverul înregistrat prin `setImageResolver` — o ratare a resolverului sau
lipsa înregistrării revine la trecerea brută a lui `src`. Nu are efect asupra
formatelor care nu sunt SVG. Consultați [Lucrul cu imagini](/ro/guide/images).

::: warning `yAxis` nu este un câmp din `RenderOptions`
Orientarea coordonatelor este o preocupare exclusivă a lui `getLayout`. Șirurile
de format brute produse de `render` poartă coordonate native cu axa y în sus;
inversați în postprocesare dacă aveți nevoie de y în jos și nu treceți prin
`getLayout`.
:::

### `DrawOpsOptions`

```ts
interface DrawOpsOptions {
  engine?: EngineName;
}
```

Opțiuni pentru `getDrawOps`. `engine` are implicit `'dot'`.

### `Xdot`

```ts
interface Xdot {
  ops: XdotOp[];
  flags: number;
}
```

Rezultatul analizat al unui flux de atribut xdot: tabloul decodat de operații
de desenare plus o mască de biți cu indicatori de stare a analizei.
`getDrawOps` returnează doar `XdotOp[]` aplatizat, peste fiecare atribut de
desenare al grafului, în ordinea de pictare (graf → nod → muchie) —
consultați [Randare proprie cu operații de desenare xdot](/ro/guide/xdot-drawops)
pentru tabelul complet al tipurilor de operații și exemplul cu canvas.

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

O singură operație de desenare xdot decodată, discriminată după `kind`.
Fiecare variantă poartă o singură proprietate de conținut, numită după forma
sa — restrângeți după `kind` într-un `switch` pentru a o accesa în siguranță.
Coordonatele sunt în puncte, în cadrul nativ cu axa y în sus (inversați pentru
un canvas cu y în jos — vedeți ghidul trimis mai sus).

### `XdotColor`

```ts
type XdotColor =
  | { type: 'none'; clr: string }
  | { type: 'linear'; ling: XdotLinearGrad }
  | { type: 'radial'; ring: XdotRadialGrad };
```

O culoare xdot de umplere/contur rezolvată: o culoare plină sau un gradient
liniar/radial (`XdotLinearGrad`/`XdotRadialGrad` poartă fiecare
`x0,y0,x1,y1[,r0,r1]` plus un tablou `stops: { frac: number; color: string }[]`).

## Pachetul rădăcină (`@knowvah/dot-engine`)

### `EngineName`

```ts
type BuiltinEngine =
  | 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi' | 'osage' | 'patchwork';

type EngineName = BuiltinEngine | (string & {});
```

Un nume de motor de aranjare. Registrul este deschis (motoare personalizate pot
fi înregistrate pe un `GvcContext`), deci orice șir este acceptat;
`(string & {})` păstrează autocompletarea din editor pentru cele încorporate
fără a închide mulțimea. Consultați [Motoare de aranjare](/ro/guide/engines).

### `ImageSizer`

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;

function setImageSizer(sizer: ImageSizer | null): void;
```

Înregistrează un callback care returnează dimensiunile intrinseci ale unei
imagini externe referite prin `image=` sau printr-o celulă HTML `<IMG>`, pentru
dimensionarea în aranjare. Returnați `null` când dimensiunea este necunoscută
(corespunde comportamentului din C pentru imagine lipsă — o celulă de
dimensiune zero plus un avertisment). Transmiteți `null` lui `setImageSizer`
pentru a șterge un sizer setat anterior. Consultați
[Utilizare în browser](/ro/guide/browser).

### `ImageResolver`

```ts
type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;

function setImageResolver(fn: ImageResolver | null): void;
```

Înregistrează un callback care returnează octeții bruți ai unei imagini
externe, consultat când `RenderOptions.inlineImages` este `true`. O returnare
de `Uint8Array` simplu deduce tipul MIME din extensia fișierului din `src`.
`null` (de la resolver sau fără resolver înregistrat) revine la trecerea brută
a lui `src`. Consultați [Lucrul cu imagini](/ro/guide/images).

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

Măsurare de text conectabilă, instalată prin `setTextMeasurer` (se livrează trei
implementări încorporate: `EstimateTextMeasurer`, `LutTextMeasurer`,
`CanvasTextMeasurer`). `yoffsetCenterline`/`yoffsetLayout` sunt metrici
verticale opționale (linia de bază→linia centrală, linia de bază→ascendent);
omiteți-le pentru a reveni la valorile implicite calibrate pango. Consultați
[Măsurarea textului](/ro/guide/text-measurement).

### `RenderResult` și erorile

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

`tryRenderSvg(dotSource, engine)` este corespondentul în stil „rezultat” al lui
`renderSvg`: returnează `{ svg }` la succes sau `{ errors: [one] }` la primul
eșec, în loc să arunce. Returnează pentru orice intrare DOT și aruncă doar
pentru argumente invalide. Intrările din `errors` sunt date simple, fără
`cause` și fără stivă.

Fiecare eroare dot-engine aruncată extinde clasa abstractă `DotEngineError` și
implementează `GvError`:

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

`renderSvg` aruncă `ParseError` pentru sursă DOT invalidă, `RenderError` pentru
eșecuri în etapa de aranjare/randare și `InternalError` pentru un bug
dot-engine. Greșelile apelantului aruncă un `TypeError` / `RangeError` /
`Error` standard al cărui `code` este un `UsageErrorCode` (`'ERR_INVALID_ARG_TYPE' | 'ERR_INVALID_ARG_VALUE' |
'ERR_OUT_OF_RANGE' | 'ERR_INVALID_STATE'`); acestea nu sunt `GvError`. Apelanții
care doresc erori structurate fără `try`/`catch` ar trebui să folosească în
schimb `tryRenderSvg`. Consultați [Erori și excepții](/ro/guide/errors) pentru
fiecare cod.

## Relații

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

## Ce tip provine din ce apel

| Apel | Returnează |
|---|---|
| `createGraph(opts?)` | `GvGraphBuilder` |
| `builder.addNode(name, attrs?)` | `GvNode` |
| `builder.addEdge(tail, head, attrs?)` | `GvEdge` |
| `builder.addSubgraph(name, attrs?)` | `GvGraphBuilder` (imbricat) |
| `parse(dotSource)` | `Graph` |
| `render(g, format, opts?)` | `string` |
| `getLayout(g, opts?)` | `LayoutSnapshot` |
| `getDrawOps(g, opts?)` | `XdotOp[]` |
| `renderSvg(dotSource, engine)` | `string` (aruncă `DotEngineError` sau un `TypeError` de utilizare) |
| `tryRenderSvg(dotSource, engine)` | `RenderResult` |

Pentru fiecare câmp al fiecărui tip de mai sus — inclusiv cele pe care această
pagină le rezumă — consultați [referința TypeDoc](/reference/) generată. Pentru
analiza aprofundată a cadrului de coordonate (cu exemple detaliate), consultați
[Citirea geometriei calculate](/ro/guide/geometry).
