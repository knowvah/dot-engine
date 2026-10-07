---
sourceHash: a49bdc5fdca8b04f5bd951935e322d616028e44f4567709824dbbd5229f60e3b
---

# Typenreferentie

Een conceptuele kaart van de publieke typen, gegroepeerd naar waar u ze
vandaan haalt: `createGraph`/`parse` (bouwen + inspecteren), `getLayout`
(geometriemomentopname), `render`/`getDrawOps` (uitvoer) en het rootpakket
(engines, afbeeldingen, tekstmeting, fouten). Elk onderdeel toont een vormblok
dat uit de broncode is gekopieerd en een doel in één regel. Voor uitputtende
documentatie veld voor veld (inclusief geërfde leden en JSDoc bij elke
eigenschap) zie de gegenereerde
[TypeDoc-referentie](/reference/).

Deze pagina herhaalt de uitleg over coördinatenframes niet — zie
[Berekende geometrie uitlezen](/nl/guide/geometry) daarvoor. Ze herhaalt wel
kort de opmerking over de y-as overal waar de velden van een type
frameafhankelijk zijn.

## Bouwen + inspecteren (`@knowvah/dot-engine` / `@knowvah/dot-engine/api`)

### `Graph`

Een ondoorzichtige handle naar het interne graafmodel. Wordt teruggegeven door
`parse()` en door `createGraph().graph`. Geef hem door aan `render`,
`getLayout` en `getDrawOps`; construeer of inspecteer hem niet rechtstreeks —
de builder en de parser zijn de enige ondersteunde manieren om er een te
produceren.

### `CreateGraphOptions`

```ts
interface CreateGraphOptions {
  directed?: boolean;
  strict?: boolean;
  name?: string;
}
```

Opties voor `createGraph`. `directed`/`strict` kiezen een van de vier
`GraphKind`s (gericht, ongericht, strict-gericht, strict-ongericht); `name`
stelt de naam van de graaf in (standaard `''`).

### `GvNode`

```ts
interface GvNode {
  readonly name: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

Ondoorzichtige handle voor een graafknoop, teruggegeven door
`builder.addNode(...)`. `setHtmlAttr` markeert de waarde als een HTML-achtig
label (gelijkwaardig aan `label=<...>` in DOT-tekst), zodat de lay-out-engine
het als markup meet.

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

Ondoorzichtige handle voor een graafkant, teruggegeven door
`builder.addEdge(...)`.

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

Teruggegeven door `createGraph(...)`. `addSubgraph` geeft een geneste builder
terug met die subgraaf als bereik; knopen die erdoor worden toegevoegd zijn ook
leden van de rootgraaf. `.graph` is het overdrachtspunt naar
`render`/`getLayout`/`getDrawOps`. Zie
[Een graaf bouwen in code](/nl/guide/build-a-graph).

## Geometriemomentopname (`getLayout`)

::: tip Coördinatenframe
Native graphviz-coördinaten zijn y-omhoog (oorsprong linksonder). `getLayout`
gebruikt standaard `yAxis: 'down'` (oorsprong linksboven, schermconventie) en
spiegelt elke y-coördinaat; geef `{ yAxis: 'up' }` mee voor native
graphviz-coördinaten. Volledige uitleg:
[Berekende geometrie uitlezen](/nl/guide/geometry).
:::

### `YAxis` / `GeometryOptions`

```ts
type YAxis = 'up' | 'down';
type GeometryOptions = { yAxis?: YAxis };
```

Opties voor `getLayout`. Standaard `yAxis: 'down'`.

### `LayoutSnapshot`

```ts
interface LayoutSnapshot {
  bounds: BoundsGeometry;
  nodes: NodeGeometry[];
  edges: EdgeGeometry[];
  clusters: ClusterGeometry[];
}
```

Gewone, naar JSON te serialiseren momentopname van de berekende geometrie van
een graaf, teruggegeven door `getLayout(g, opts?)`. `clusters` somt elke
clustersubgraaf recursief op (geneste clusters krijgen elk een eigen item); de
lijst is leeg voor grafen zonder clusters.

### `BoundsGeometry`

```ts
interface BoundsGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Totaal omsluitend kader, in punten. Met `yAxis: 'down'` worden `x`/`y`
genormaliseerd naar `(0, 0)`. Met `yAxis: 'up'` zijn `x`/`y` de ruwe
linkeronderhoek van het omsluitende kader van de graaf.

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

Geometrie per knoop. `x`/`y` zijn het midden van de knoop. `width`/`height` zijn
in **punten** — het model slaat ze op in inches (`ND_width`/`ND_height`);
`getLayout` vermenigvuldigt met 72 voordat het ze teruggeeft.

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

Geometrie per kant. `points` voegt alle bezier-controlepunten van de
gerouteerde spline in volgorde samen (leeg als de kant geen gerouteerde spline
heeft). `label` is alleen aanwezig wanneer de kant een gecentreerd label draagt.

`tailLabel` en `headLabel` zijn de posities van de poortlabels
`taillabel`/`headlabel`. Elk is alleen aanwezig zodra de lay-out het heeft
geplaatst — dezelfde voorwaarde waaronder `render()` de `<text>` ervan
uitgeeft — dus een poortlabel dat niet kon worden geplaatst (bijvoorbeeld een
kant zonder gerouteerde spline) wordt als afwezig gemeld in plaats van als een
label in de oorsprong.

`xlabel` is de positie van het externe label `xlabel`. In tegenstelling tot
`label` wordt die gekozen door de krachtgestuurde plaatsingszoektocht van
graphviz over kandidaatposities rond de kant, dus ze is niet af te leiden uit
`label` of uit het midden van de spline. Ze draagt dezelfde
alleen-indien-geplaatst-voorwaarde: een gedeclareerd xlabel dat de zoektocht
niet kon laten passen, wordt als afwezig gemeld, precies zoals `render()` het
weigert te tekenen.

`sp` en `ep` zijn de aanhechtpunten van de pijl aan het tail- en head-uiteinde.
Wanneer een uiteinde een pijl draagt, wordt de spline verkort om ruimte voor
die pijl te laten en loopt de pijl van het laatste controlepunt tot dit punt —
dus een afnemer die eigen pijlpunten tekent, leest de punt hier uit in plaats
van er een te extrapoleren. Elk is alleen aanwezig wanneer dat uiteinde
daadwerkelijk een pijl heeft, zodat een gewone kant `digraph { a -> b }` `ep`
meldt en geen `sp`, en `arrowhead=none` geen van beide.

Dit zijn de aanhechtpunten op de knoopgrens. De eigen renderer van Graphviz
trekt de pijlveelhoek die hij tekent daar, afhankelijk van de lijndikte, een
stukje vanaf in, dus `ep` is het punt om een pijl *naartoe* te tekenen, geen
kopie van de gerenderde punt.

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

Omsluitend kader per cluster. `name` is de naam van de clustersubgraaf (bijv.
`cluster6`); geneste clusters coderen hun hiërarchie in de naam, dus er wordt
geen expliciete verwijzing naar de ouder blootgesteld. Volgt dezelfde
frameconventie als `BoundsGeometry`.

`label` is de plaatsing van de clustertitel, alleen aanwezig wanneer het
cluster er een declareert. De `x`/`y` ervan zijn het **midden** van de
labelruimte — overeenkomend met `EdgeGeometry.label`, niet met de kaderhoek
`x`/`y` hierboven — en `width`/`height` zijn de gemeten tekstafmeting, dus het
labelkader is
`[x - width/2, x + width/2] × [y - height/2, y + height/2]` en ligt altijd
binnen het clusterkader. Merk op dat dit het *midden* van het label is, terwijl
de `<text>` die `render()` uitgeeft de basislijn draagt, die lager ligt.

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

Gesloten union van formaten die `render(g, format, opts?)` accepteert. Zie
[Renderen naar andere formaten](/nl/guide/render-formats).

### `RenderOptions`

```ts
interface RenderOptions {
  engine?: EngineName;
  inlineImages?: boolean;
}
```

Opties voor `render`. `engine` is standaard `'dot'`. `inlineImages` (nieuw) is
standaard `false`; wanneer `true` inlinet de SVG-emitter externe afbeeldingen
(`image=`/HTML-`<IMG>`) als `data:`-URI's door de resolver te raadplegen die
via `setImageResolver` is geregistreerd — een resolver-misser of afwezige
registratie valt terug op de ruwe `src`-doorgifte. Heeft geen effect op
niet-SVG-formaten. Zie [Werken met afbeeldingen](/nl/guide/images).

::: warning `yAxis` is geen veld van `RenderOptions`
De oriëntatie van coördinaten is alleen een zaak van `getLayout`. De ruwe
formaatstrings die `render` produceert dragen native y-omhoog-coördinaten;
spiegel ze achteraf als u y-omlaag nodig hebt en niet via `getLayout` gaat.
:::

### `DrawOpsOptions`

```ts
interface DrawOpsOptions {
  engine?: EngineName;
}
```

Opties voor `getDrawOps`. `engine` is standaard `'dot'`.

### `Xdot`

```ts
interface Xdot {
  ops: XdotOp[];
  flags: number;
}
```

Geparsed resultaat van één xdot-attribuutstroom: de gedecodeerde array met
tekenbewerkingen plus een bitmasker met parsestatusvlaggen. `getDrawOps` geeft
alleen de afgevlakte `XdotOp[]` terug over alle tekenattributen van de graaf, in
tekenvolgorde (graaf → knoop → kant) — zie
[Eigen rendering met xdot-tekenbewerkingen](/nl/guide/xdot-drawops) voor de
volledige tabel met soorten bewerkingen en het canvasvoorbeeld.

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

Een enkele gedecodeerde xdot-tekenbewerking, onderscheiden door `kind`. Elke
variant draagt één payload-eigenschap die naar haar vorm is genoemd — versmal
op `kind` in een `switch` om er veilig bij te komen. Coördinaten zijn in punten,
in het native y-omhoog-frame (spiegel voor een y-omlaag-canvas — zie de
bovenstaande gelinkte handleiding).

### `XdotColor`

```ts
type XdotColor =
  | { type: 'none'; clr: string }
  | { type: 'linear'; ling: XdotLinearGrad }
  | { type: 'radial'; ring: XdotRadialGrad };
```

Een opgeloste xdot-vul-/lijnkleur: een effen kleur, of een lineair/radiaal
kleurverloop (`XdotLinearGrad`/`XdotRadialGrad` dragen elk `x0,y0,x1,y1[,r0,r1]`
plus een array `stops: { frac: number; color: string }[]`).

## Rootpakket (`@knowvah/dot-engine`)

### `EngineName`

```ts
type BuiltinEngine =
  | 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi' | 'osage' | 'patchwork';

type EngineName = BuiltinEngine | (string & {});
```

Een naam van een lay-out-engine. Het register is open (eigen engines kunnen op
een `GvcContext` worden geregistreerd), dus elke string wordt geaccepteerd;
`(string & {})` behoudt de automatische aanvulling in de editor voor de
ingebouwde engines zonder de verzameling te sluiten. Zie
[Lay-out-engines](/nl/guide/engines).

### `ImageSizer`

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;

function setImageSizer(sizer: ImageSizer | null): void;
```

Registreert een callback die de intrinsieke afmetingen teruggeeft van een
externe afbeelding waarnaar `image=` of een HTML-`<IMG>`-cel verwijst, voor het
dimensioneren van de lay-out. Geef `null` terug wanneer de afmeting onbekend is
(komt overeen met het gedrag van C bij ontbrekende afbeeldingen — een cel met
afmeting nul plus een waarschuwing). Geef `null` door aan `setImageSizer` om een
eerder ingestelde sizer te wissen. Zie
[Gebruik in de browser](/nl/guide/browser).

### `ImageResolver`

```ts
type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;

function setImageResolver(fn: ImageResolver | null): void;
```

Registreert een callback die de ruwe bytes van een externe afbeelding
teruggeeft, geraadpleegd wanneer `RenderOptions.inlineImages` `true` is. Een
kale `Uint8Array` als returnwaarde leidt het MIME-type af uit de
bestandsextensie van `src`. `null` (van de resolver, of geen geregistreerde
resolver) valt terug op de ruwe `src`-doorgifte. Zie
[Werken met afbeeldingen](/nl/guide/images).

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

Pluggable tekstmeting, geïnstalleerd via `setTextMeasurer` (er worden drie
ingebouwde meters meegeleverd: `EstimateTextMeasurer`, `LutTextMeasurer`,
`CanvasTextMeasurer`). `yoffsetCenterline`/`yoffsetLayout` zijn optionele
verticale maten (basislijn→middenlijn, basislijn→bovenlengte); laat ze weg om
terug te vallen op de met pango gekalibreerde standaardwaarden. Zie
[Tekstmeting](/nl/guide/text-measurement).

### `RenderResult` en fouten

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

`tryRenderSvg(dotSource, engine)` is de resultaatgestuurde tegenhanger van
`renderSvg`: het geeft `{ svg }` terug bij succes of `{ errors: [one] }` bij de
eerste mislukking in plaats van te werpen. Het keert terug bij elke DOT-invoer
en werpt alleen bij ongeldige argumenten. Items in `errors` zijn gewone data
zonder `cause` en zonder stack.

Elke geworpen dot-engine-fout breidt de abstracte `DotEngineError` uit en
implementeert `GvError`:

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

`renderSvg` werpt `ParseError` bij ongeldige DOT-broncode, `RenderError` bij
mislukkingen in de lay-out-/renderfase en `InternalError` bij een bug in
dot-engine. Fouten van de aanroeper werpen een standaard `TypeError` /
`RangeError` / `Error` waarvan de `code` een `UsageErrorCode` is
(`'ERR_INVALID_ARG_TYPE' | 'ERR_INVALID_ARG_VALUE' | 'ERR_OUT_OF_RANGE' |
'ERR_INVALID_STATE'`); die zijn geen `GvError`s. Aanroepers die gestructureerde
fouten willen zonder `try`/`catch` gebruiken beter `tryRenderSvg`. Zie
[Fouten en uitzonderingen](/nl/guide/errors) voor elke code.

## Verbanden

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

## Welk type uit welke aanroep komt

| Aanroep | Geeft terug |
|---|---|
| `createGraph(opts?)` | `GvGraphBuilder` |
| `builder.addNode(name, attrs?)` | `GvNode` |
| `builder.addEdge(tail, head, attrs?)` | `GvEdge` |
| `builder.addSubgraph(name, attrs?)` | `GvGraphBuilder` (geneste) |
| `parse(dotSource)` | `Graph` |
| `render(g, format, opts?)` | `string` |
| `getLayout(g, opts?)` | `LayoutSnapshot` |
| `getDrawOps(g, opts?)` | `XdotOp[]` |
| `renderSvg(dotSource, engine)` | `string` (werpt `DotEngineError`, of een `TypeError` bij gebruiksfouten) |
| `tryRenderSvg(dotSource, engine)` | `RenderResult` |

Voor elk veld van elk bovenstaand type — inclusief de velden die deze pagina
samenvat — zie de gegenereerde [TypeDoc-referentie](/reference/). Voor de
verdieping in coördinatenframes (met uitgewerkte voorbeelden) zie
[Berekende geometrie uitlezen](/nl/guide/geometry).
