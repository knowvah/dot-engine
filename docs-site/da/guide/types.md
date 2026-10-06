---
sourceHash: a49bdc5fdca8b04f5bd951935e322d616028e44f4567709824dbbd5229f60e3b
---

# Typereference

Et begrebsligt kort over de offentlige typer, grupperet efter, hvor du får dem
fra: `createGraph`/`parse` (byg + inspicér), `getLayout` (geometrisnapshot),
`render`/`getDrawOps` (output) og rodpakken (motorer, billeder, tekstmåling,
fejl). Hver post viser en formblok kopieret fra kildekoden og et
enlinjesformål. For udtømmende dokumentation felt for felt (herunder nedarvede
medlemmer og JSDoc på hver egenskab), se den genererede
[TypeDoc-reference](/reference/).

Denne side gentager ikke gennemgangen af koordinatsystemet — se
[Læs beregnet geometri](/da/guide/geometry) for den. Den gentager dog kort
noten om y-aksen, hvor en types felter afhænger af koordinatsystemet.

## Byg + inspicér (`@knowvah/dot-engine` / `@knowvah/dot-engine/api`)

### `Graph`

Et uigennemsigtigt håndtag til den interne grafmodel. Returneres af `parse()` og
af `createGraph().graph`. Send det til `render`, `getLayout` og `getDrawOps`;
konstruér eller inspicér det ikke direkte — buildere og parseren er de eneste
understøttede måder at frembringe et på.

### `CreateGraphOptions`

```ts
interface CreateGraphOptions {
  directed?: boolean;
  strict?: boolean;
  name?: string;
}
```

Indstillinger til `createGraph`. `directed`/`strict` vælger en af de fire
`GraphKind`s (rettet, urettet, strict-rettet, strict-urettet); `name` angiver
grafens navn (standard `''`).

### `GvNode`

```ts
interface GvNode {
  readonly name: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

Uigennemsigtigt håndtag til en grafknude returneret af `builder.addNode(...)`.
`setHtmlAttr` mærker værdien som en HTML-lignende etiket (svarende til
`label=<...>` i DOT-tekst), så layoutmotoren måler den som markup.

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

Uigennemsigtigt håndtag til en grafkant returneret af `builder.addEdge(...)`.

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

Returneres af `createGraph(...)`. `addSubgraph` returnerer en indlejret builder
afgrænset til den undergraf; knuder tilføjet gennem den er også medlemmer af
rodgrafen. `.graph` er overdragelsespunktet til
`render`/`getLayout`/`getDrawOps`. Se
[Byg en graf i kode](/da/guide/build-a-graph).

## Geometrisnapshot (`getLayout`)

::: tip Koordinatsystem
Native graphviz-koordinater er y-op (origo nederst til venstre). `getLayout`
bruger som standard `yAxis: 'down'` (origo øverst til venstre, skærmkonvention)
og vender hver y-koordinat; send `{ yAxis: 'up' }` for native
graphviz-koordinater. Fuld gennemgang: [Læs beregnet geometri](/da/guide/geometry).
:::

### `YAxis` / `GeometryOptions`

```ts
type YAxis = 'up' | 'down';
type GeometryOptions = { yAxis?: YAxis };
```

Indstillinger til `getLayout`. Standard `yAxis: 'down'`.

### `LayoutSnapshot`

```ts
interface LayoutSnapshot {
  bounds: BoundsGeometry;
  nodes: NodeGeometry[];
  edges: EdgeGeometry[];
  clusters: ClusterGeometry[];
}
```

Almindeligt, JSON-serialiserbart snapshot af en grafs beregnede geometri,
returneret af `getLayout(g, opts?)`. `clusters` angiver hvert cluster-undergraf
rekursivt (indlejrede clustre får hver sin post); den er tom for grafer uden
clustre.

### `BoundsGeometry`

```ts
interface BoundsGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Samlet afgrænsningsboks, i punkter. Med `yAxis: 'down'` er `x`/`y` normaliseret
til `(0, 0)`. Med `yAxis: 'up'` er `x`/`y` det rå nederste venstre hjørne af
grafens afgrænsningsboks.

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

Geometri pr. knude. `x`/`y` er knudens midte. `width`/`height` er i **punkter** —
modellen gemmer dem i tommer (`ND_width`/`ND_height`); `getLayout` ganger med 72,
før den returnerer.

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

Geometri pr. kant. `points` sammenkæder hvert bezier-kontrolpunkt fra den
førte spline, i rækkefølge (tom, hvis kanten ikke har nogen ført spline).
`label` findes kun, når kanten bærer en midteretiket.

`tailLabel` og `headLabel` er positionerne for portetiketterne
`taillabel`/`headlabel`. Hver findes først, når layout har placeret den — den
samme betingelse, under hvilken `render()` udsender dens `<text>` — så en
portetiket, der ikke kunne placeres (fx en kant uden ført spline), rapporteres
som fraværende frem for som en etiket i origo.

`xlabel` er positionen for den eksterne etiket `xlabel`. I modsætning til
`label` vælges den af graphviz' kraftbaserede placeringssøgning over
kandidatpositioner omkring kanten, så den kan ikke udledes af `label` eller af
splinens midtpunkt. Den har den samme kun-hvis-placeret-regel: en deklareret
xlabel, som søgningen ikke kunne få plads til, rapporteres som fraværende,
præcis som `render()` afstår fra at tegne den.

`sp` og `ep` er pilens fæstepunkter ved hale- og hovedenden. Når en ende har en
pil, forkortes splinen for at give plads til den, og pilen strækker sig fra det
afsluttende kontrolpunkt ud til dette punkt — så en forbruger, der tegner sine
egne pilespidser, læser spidsen her i stedet for at ekstrapolere en. Hver findes
kun, når den ende faktisk har en pil, så en almindelig kant `digraph { a -> b }`
rapporterer `ep` og ingen `sp`, og `arrowhead=none` rapporterer ingen af dem.

Det er fæstepunkterne på knudens kant. Graphviz' egen renderer rykker den
pilepolygon, den tegner, ind fra dem med et beløb, der afhænger af penwidth, så
`ep` er det punkt, man skal tegne en pil *hen til*, ikke en kopi af den
renderede spids.

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

Afgrænsningsboks pr. cluster. `name` er cluster-undergrafens navn (fx
`cluster6`); indlejrede clustre koder deres hierarki i navnet, så der eksponeres
intet eksplicit forældrelink. Følger samme koordinatsystemkonvention som
`BoundsGeometry`.

`label` er placeringen af cluster-titlen, til stede kun når clusteret deklarerer
en. Dens `x`/`y` er **midten** af etiketpladsen — i overensstemmelse med
`EdgeGeometry.label`, ikke boksens hjørne `x`/`y` ovenfor — og `width`/`height`
er den målte tekststørrelse, så etiketboksen er
`[x - width/2, x + width/2] × [y - height/2, y + height/2]` og altid ligger
inden for clusterboksen. Bemærk, at dette er etikettens *midte*, mens
`<text>`-elementet, som `render()` udsender, bærer grundlinjen, som ligger
lavere.

## Render (`@knowvah/dot-engine/render`)

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

Lukket union af formater, som `render(g, format, opts?)` accepterer. Se
[Render til andre formater](/da/guide/render-formats).

### `RenderOptions`

```ts
interface RenderOptions {
  engine?: EngineName;
  inlineImages?: boolean;
}
```

Indstillinger til `render`. `engine` er som standard `'dot'`. `inlineImages`
(ny) er som standard `false`; når den er `true`, indlejrer SVG-udsenderen
eksterne billeder (`image=`/HTML-`<IMG>`) som `data:`-URI'er ved at konsultere
den resolver, der er registreret via `setImageResolver` — en resolver-miss eller
manglende registrering falder tilbage til ren `src`-gennemstrømning. Har ingen
virkning på ikke-SVG-formater. Se [Arbejd med billeder](/da/guide/images).

::: warning `yAxis` er ikke et felt i `RenderOptions`
Koordinatorientering er kun et anliggende for `getLayout`. De rå formatstrenge,
som `render` producerer, bærer native y-op-koordinater; vend i efterbehandling,
hvis du har brug for y-ned og ikke går gennem `getLayout`.
:::

### `DrawOpsOptions`

```ts
interface DrawOpsOptions {
  engine?: EngineName;
}
```

Indstillinger til `getDrawOps`. `engine` er som standard `'dot'`.

### `Xdot`

```ts
interface Xdot {
  ops: XdotOp[];
  flags: number;
}
```

Parset resultat af én xdot-attributstrøm: det afkodede array af tegneoperationer
plus en bitmaske med parsestatusflag. `getDrawOps` returnerer kun den fladtrykte
`XdotOp[]` på tværs af hver tegneattribut på grafen, i tegnerækkefølge (graf →
knude → kant) — se [Egen rendering med xdot](/da/guide/xdot-drawops) for den
fulde tabel over operationstyper og canvas-eksemplet.

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

En enkelt afkodet xdot-tegneoperation, diskrimineret ved `kind`. Hver variant
bærer én nyttelastegenskab opkaldt efter sin form — indsnævr på `kind` i en
`switch` for at tilgå den sikkert. Koordinater er i punkter, native y-op-ramme
(vend for et y-ned-canvas — se den linkede guide ovenfor).

### `XdotColor`

```ts
type XdotColor =
  | { type: 'none'; clr: string }
  | { type: 'linear'; ling: XdotLinearGrad }
  | { type: 'radial'; ring: XdotRadialGrad };
```

En opløst xdot-fyld-/stregfarve: en ensfarvet farve eller en lineær/radial
gradient (`XdotLinearGrad`/`XdotRadialGrad` bærer hver `x0,y0,x1,y1[,r0,r1]` plus
et array `stops: { frac: number; color: string }[]`).

## Rodpakke (`@knowvah/dot-engine`)

### `EngineName`

```ts
type BuiltinEngine =
  | 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi' | 'osage' | 'patchwork';

type EngineName = BuiltinEngine | (string & {});
```

Et layoutmotornavn. Registret er åbent (egne motorer kan registreres på en
`GvcContext`), så enhver streng accepteres; `(string & {})` bevarer editorens
autofuldførelse for de indbyggede uden at lukke mængden. Se
[Layoutmotorer](/da/guide/engines).

### `ImageSizer`

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;

function setImageSizer(sizer: ImageSizer | null): void;
```

Registrerer et callback, der returnerer de iboende dimensioner for et eksternt
billede, der refereres af `image=` eller en HTML-`<IMG>`-celle, til
layoutdimensionering. Returnér `null`, når størrelsen er ukendt (svarer til Cs
adfærd ved manglende billede — en celle med størrelse nul plus en advarsel).
Send `null` til `setImageSizer` for at rydde en tidligere angivet sizer. Se
[Brug i browseren](/da/guide/browser).

### `ImageResolver`

```ts
type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;

function setImageResolver(fn: ImageResolver | null): void;
```

Registrerer et callback, der returnerer de rå bytes i et eksternt billede, og som
konsulteres, når `RenderOptions.inlineImages` er `true`. En blottet
`Uint8Array`-returværdi udleder sin MIME-type af filendelsen i `src`. `null`
(fra resolveren, eller ingen registreret resolver) falder tilbage til ren
`src`-gennemstrømning. Se [Arbejd med billeder](/da/guide/images).

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

Udskiftelig tekstmåling, installeret via `setTextMeasurer` (tre indbyggede
følger med: `EstimateTextMeasurer`, `LutTextMeasurer`, `CanvasTextMeasurer`).
`yoffsetCenterline`/`yoffsetLayout` er valgfrie lodrette metrikker
(grundlinje→midterlinje, grundlinje→overlængde); udelad dem for at falde tilbage
til de pango-kalibrerede standarder. Se [Tekstmåling](/da/guide/text-measurement).

### `RenderResult` og fejl

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

`tryRenderSvg(dotSource, engine)` er modparten i resultatstil til `renderSvg`:
den returnerer `{ svg }` ved succes eller `{ errors: [one] }` ved den første
fejl i stedet for at kaste. Den returnerer for ethvert DOT-input og kaster kun
ved ugyldige argumenter. Poster i `errors` er almindelige data uden `cause` og
uden stakspor.

Hver kastet dot-engine-fejl udvider den abstrakte `DotEngineError` og
implementerer `GvError`:

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

`renderSvg` kaster `ParseError` for ugyldig DOT-kildekode, `RenderError` for
fejl i layout-/renderfasen og `InternalError` for en fejl i dot-engine.
Kaldermisgreb kaster en standard `TypeError` / `RangeError` / `Error`, hvis
`code` er en `UsageErrorCode` (`'ERR_INVALID_ARG_TYPE' | 'ERR_INVALID_ARG_VALUE' |
'ERR_OUT_OF_RANGE' | 'ERR_INVALID_STATE'`); de er ikke `GvError`s. Kaldere, der
vil have strukturerede fejl uden `try`/`catch`, bør i stedet bruge
`tryRenderSvg`. Se [Fejl og undtagelser](/da/guide/errors) for hver kode.

## Sammenhænge

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

## Hvilken type kommer fra hvilket kald

| Kald | Returnerer |
|---|---|
| `createGraph(opts?)` | `GvGraphBuilder` |
| `builder.addNode(name, attrs?)` | `GvNode` |
| `builder.addEdge(tail, head, attrs?)` | `GvEdge` |
| `builder.addSubgraph(name, attrs?)` | `GvGraphBuilder` (indlejret) |
| `parse(dotSource)` | `Graph` |
| `render(g, format, opts?)` | `string` |
| `getLayout(g, opts?)` | `LayoutSnapshot` |
| `getDrawOps(g, opts?)` | `XdotOp[]` |
| `renderSvg(dotSource, engine)` | `string` (kaster `DotEngineError` eller en `TypeError` ved brugsfejl) |
| `tryRenderSvg(dotSource, engine)` | `RenderResult` |

For hvert felt på hver type ovenfor — også dem, denne side opsummerer — se den
genererede [TypeDoc-reference](/reference/). For den dybe gennemgang af
koordinatsystemet (med gennemarbejdede eksempler), se
[Læs beregnet geometri](/da/guide/geometry).
