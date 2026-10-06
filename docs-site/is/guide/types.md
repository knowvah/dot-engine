---
sourceHash: a49bdc5fdca8b04f5bd951935e322d616028e44f4567709824dbbd5229f60e3b
---

# Tegundatilvísun

Hugtakakort yfir opinberu tegundirnar, flokkað eftir því hvaðan þú færð þær:
`createGraph`/`parse` (smíða + skoða), `getLayout` (rúmfræðiskyndimynd),
`render`/`getDrawOps` (úttak) og rótarpakkinn (vélar, myndir, textamæling,
villur). Hver færsla sýnir lögunarblokk afritaða úr frumkóða og eina línu um
tilgang. Fyrir tæmandi skjölun reit fyrir reit (þar á meðal erfða meðlimi og
JSDoc á hverju eigindi), sjá myndaða
[TypeDoc-tilvísun](/reference/).

Þessi síða endurtekur ekki leiðsögnina um hnitakerfið — sjá
[Lesa reiknaða rúmfræði](/is/guide/geometry) um það. Hún endurtekur þó
athugasemdina um y-ásinn í stuttu máli hvar sem reitir tegundar eru háðir hnitakerfinu.

## Smíða + skoða (`@knowvah/dot-engine` / `@knowvah/dot-engine/api`)

### `Graph`

Ógagnsætt hald á innra grafalíkaninu. Skilað af `parse()` og af
`createGraph().graph`. Sendu það í `render`, `getLayout` og `getDrawOps`;
smíðaðu það ekki né skoðaðu beint — smiðurinn og þátturinn eru einu
studdu leiðirnar til að búa það til.

### `CreateGraphOptions`

```ts
interface CreateGraphOptions {
  directed?: boolean;
  strict?: boolean;
  name?: string;
}
```

Valkostir fyrir `createGraph`. `directed`/`strict` velja eina af
`GraphKind`-gerðunum fjórum (stefnt, óstefnt, strict-stefnt, strict-óstefnt);
`name` setur heiti grafsins (sjálfgefið `''`).

### `GvNode`

```ts
interface GvNode {
  readonly name: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

Ógagnsætt hald á hnút grafs sem `builder.addNode(...)` skilar.
`setHtmlAttr` merkir gildið sem HTML-líkan merkimiða (jafngildir
`label=<...>` í DOT-texta) svo uppsetningarvélin mæli það sem markup.

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

Ógagnsætt hald á legg grafs sem `builder.addEdge(...)` skilar.

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

Skilað af `createGraph(...)`. `addSubgraph` skilar hreiðruðum smið sem afmarkast
við það hlutnet; hnútar sem bætt er við gegnum hann eru einnig meðlimir rótargrafsins.
`.graph` er afhendingarpunkturinn í `render`/`getLayout`/`getDrawOps`. Sjá
[Smíða graf í kóða](/is/guide/build-a-graph).

## Rúmfræðiskyndimynd (`getLayout`)

::: tip Hnitakerfi
Upprunaleg graphviz-hnit eru y-upp (upphafspunktur neðst til vinstri). `getLayout`
er sjálfgefið með `yAxis: 'down'` (upphafspunktur efst til vinstri, skjáhefð) og speglar
hvert y-hnit; sendu `{ yAxis: 'up' }` fyrir upprunaleg graphviz-hnit.
Full leiðsögn: [Lesa reiknaða rúmfræði](/is/guide/geometry).
:::

### `YAxis` / `GeometryOptions`

```ts
type YAxis = 'up' | 'down';
type GeometryOptions = { yAxis?: YAxis };
```

Valkostir fyrir `getLayout`. Sjálfgefið `yAxis: 'down'`.

### `LayoutSnapshot`

```ts
interface LayoutSnapshot {
  bounds: BoundsGeometry;
  nodes: NodeGeometry[];
  edges: EdgeGeometry[];
  clusters: ClusterGeometry[];
}
```

Hrein, JSON-raðgeranleg skyndimynd af reiknaðri rúmfræði grafs, skilað af
`getLayout(g, opts?)`. `clusters` telur upp hvern klasa-hlutnet endurkvæmt
(hreiðraðir klasar fá hver sína færslu); það er tómt fyrir graf án
klasa.

### `BoundsGeometry`

```ts
interface BoundsGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Heildarafmörkunarkassi, í punktum. Með `yAxis: 'down'` eru `x`/`y` stöðluð
að `(0, 0)`. Með `yAxis: 'up'` eru `x`/`y` hráa neðra vinstra hornið á
afmörkunarkassa grafsins.

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

Rúmfræði hvers hnúts. `x`/`y` eru miðja hnútsins. `width`/`height` eru í
**punktum** — líkanið geymir þau í tommum (`ND_width`/`ND_height`);
`getLayout` margfaldar með 72 áður en það skilar.

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

Rúmfræði hvers leggs. `points` tengir saman hvern stjórnpunkt bezier-ferils
leiðuðu splínunnar, í röð (tómt ef leggurinn hefur enga leiðaða splínu). `label` er
aðeins til staðar þegar leggurinn ber miðjumerkimiða.

`tailLabel` og `headLabel` eru staðsetningar port-merkimiðanna `taillabel`/`headlabel`.
Hvor um sig er aðeins til staðar þegar uppsetningin hefur sett hann — sama skilyrði
og þegar `render()` gefur út `<text>`-stak hans — svo port-merkimiði sem ekki var hægt að
setja (leggur án leiðaðrar splínu, til dæmis) er tilkynntur sem fjarverandi
frekar en sem merkimiði í upphafspunkti.

`xlabel` er staðsetning ytri merkimiðans `xlabel`. Ólíkt `label` er hann valinn
með kraftastaðsetningarleit graphviz yfir frambjóðendastaðsetningar umhverfis legginn,
svo ekki er hægt að leiða hann af `label` eða af miðpunkti splínunnar. Hann ber
sama skilyrði um að hafa verið settur: yfirlýstur xlabel sem leitin gat ekki komið fyrir er tilkynntur
sem fjarverandi, nákvæmlega eins og `render()` neitar að teikna hann.

`sp` og `ep` eru festipunktar örvar við hala- og haus-enda. Þegar
endi ber ör er splínan stytt til að rýma fyrir henni og
örin nær frá lokastjórnpunktinum út að þessum punkti — svo notandi sem
teiknar eigin örvarhausa les oddinn hér í stað þess að framreikna hann.
Hvor um sig er aðeins til staðar þegar sá endi hefur í raun ör, svo venjulegur
`digraph { a -> b }`-leggur skilar `ep` en ekkert `sp`, og `arrowhead=none`
skilar hvorugu.

Þetta eru festipunktarnir á jaðri hnútsins. Eigin teiknivél Graphviz
færir örvarmarghyrninginn sem hún teiknar inn á við frá þeim um magn sem fer eftir penwidth, svo
`ep` er punkturinn sem á að teikna ör *að*, ekki afrit af teiknaða oddinum.

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

Afmörkunarkassi hvers klasa. `name` er heiti klasahlutnetsins (t.d.
`cluster6`); hreiðraðir klasar kóða stigveldi sitt í heitinu, svo
enginn skýr tengill á foreldri er sýndur. Fylgir sömu hnitakerfishefð og
`BoundsGeometry`.

`label` er staðsetning klasatitilsins, aðeins til staðar þegar klasinn
lýsir yfir slíkum. `x`/`y` hans eru **miðja** merkimiðarýmisins — í samræmi við
`EdgeGeometry.label`, ekki hornið á kassanum `x`/`y` hér að ofan — og `width`/`height`
eru mæld textastærð, svo merkimiðakassinn er
`[x - width/2, x + width/2] × [y - height/2, y + height/2]` og liggur alltaf
innan klasakassans. Athugaðu að þetta er *miðja* merkimiðans, en `<text>`-stakið sem
`render()` gefur út ber grunnlínuna, sem liggur neðar.

## Teikna (`@knowvah/dot-engine/render`)

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

Lokað samband sniða sem `render(g, format, opts?)` tekur við. Sjá
[Teikna á önnur snið](/is/guide/render-formats).

### `RenderOptions`

```ts
interface RenderOptions {
  engine?: EngineName;
  inlineImages?: boolean;
}
```

Valkostir fyrir `render`. `engine` er sjálfgefið `'dot'`. `inlineImages` (nýtt)
er sjálfgefið `false`; þegar það er `true` fellir SVG-útgefandinn ytri myndir inn
(`image=`/HTML `<IMG>`) sem `data:`-URI með því að leita til leysisins sem skráður var
með `setImageResolver` — missir hjá leysi eða engin skráning fellur aftur á
hráa `src`-umferð. Hefur engin áhrif á snið sem eru ekki SVG. Sjá
[Unnið með myndir](/is/guide/images).

::: warning `yAxis` er ekki reitur í `RenderOptions`
Stefna hnita er aðeins mál `getLayout`. Hráu sniðstrengirnir sem `render`
býr til bera upprunaleg y-upp hnit; speglaðu í eftirvinnslu
ef þú þarft y-niður og ferð ekki í gegnum `getLayout`.
:::

### `DrawOpsOptions`

```ts
interface DrawOpsOptions {
  engine?: EngineName;
}
```

Valkostir fyrir `getDrawOps`. `engine` er sjálfgefið `'dot'`.

### `Xdot`

```ts
interface Xdot {
  ops: XdotOp[];
  flags: number;
}
```

Þáttuð niðurstaða eins xdot-eigindastraums: afkóðaða teikniaðgerðafylkið auk
bitamaska með þáttunarstöðu. `getDrawOps` skilar aðeins flatta `XdotOp[]`
yfir öll teikni-eigindi grafsins, í teikniröð (graf → hnútur →
leggur) — sjá [Eigin teiknun með xdot-teikniaðgerðum](/is/guide/xdot-drawops) fyrir
fullu töfluna yfir tegundir aðgerða og canvas-dæmið.

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

Ein afkóðuð xdot-teikniaðgerð, aðgreind eftir `kind`. Hvert afbrigði
ber eitt gagnaeigindi sem er nefnt eftir lögun þess — þrengdu á `kind`
í `switch` til að nálgast það á öruggan hátt. Hnit eru í punktum, upprunalegt y-upp
kerfi (speglaðu fyrir y-niður canvas — sjá tengdu leiðsögnina hér að ofan).

### `XdotColor`

```ts
type XdotColor =
  | { type: 'none'; clr: string }
  | { type: 'linear'; ling: XdotLinearGrad }
  | { type: 'radial'; ring: XdotRadialGrad };
```

Leystur xdot-fyllilitur/línulitur: heilsteyptur litur, eða línulegur/geislalaga litstigull
(`XdotLinearGrad`/`XdotRadialGrad` bera hvort um sig `x0,y0,x1,y1[,r0,r1]` auk
`stops: { frac: number; color: string }[]`-fylkis).

## Rótarpakkinn (`@knowvah/dot-engine`)

### `EngineName`

```ts
type BuiltinEngine =
  | 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi' | 'osage' | 'patchwork';

type EngineName = BuiltinEngine | (string & {});
```

Heiti uppsetningarvélar. Skráin er opin (hægt er að skrá sérsniðnar vélar
á `GvcContext`), svo hvaða strengur sem er er tekinn gildur; `(string & {})` heldur
sjálfvirkri útfyllingu ritils fyrir innbyggðu vélarnar án þess að loka menginu. Sjá
[Uppsetningarvélar](/is/guide/engines).

### `ImageSizer`

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;

function setImageSizer(sizer: ImageSizer | null): void;
```

Skráir endurkall sem skilar náttúrulegum stærðum ytri myndar
sem vísað er í með `image=` eða HTML `<IMG>`-reit, fyrir stærðarákvörðun í uppsetningu. Skilaðu
`null` þegar stærðin er óþekkt (samsvarar hegðun C við mynd sem vantar — reitur
með núllstærð auk viðvörunar). Sendu `null` í `setImageSizer` til að hreinsa
áður stilltan stærðarmæli. Sjá [Notkun í vafra](/is/guide/browser).

### `ImageResolver`

```ts
type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;

function setImageResolver(fn: ImageResolver | null): void;
```

Skráir endurkall sem skilar hráum bætum ytri myndar, haft til ráða
þegar `RenderOptions.inlineImages` er `true`. Ber `Uint8Array` skilað án umbúða ályktar
MIME-tegund sína af skráarendingu `src`. `null` (frá leysinum, eða enginn
leysir skráður) fellur aftur á hráa `src`-umferð. Sjá
[Unnið með myndir](/is/guide/images).

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

Textamæling sem hægt er að skipta út, sett upp með `setTextMeasurer` (þrír innbyggðir
fylgja: `EstimateTextMeasurer`, `LutTextMeasurer`, `CanvasTextMeasurer`).
`yoffsetCenterline`/`yoffsetLayout` eru valfrjálsir lóðréttir mælikvarðar (grunnlína→
miðlína, grunnlína→upphæð); slepptu þeim til að falla aftur á sjálfgildi sem eru
kvörðuð við pango. Sjá [Textamæling](/is/guide/text-measurement).

### `RenderResult` og villur

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

`tryRenderSvg(dotSource, engine)` er hliðstæða `renderSvg` í niðurstöðustíl:
það skilar `{ svg }` ef vel tekst eða `{ errors: [one] }` við fyrstu
bilun í stað þess að kasta. Það skilar fyrir hvaða DOT-inntak sem er og kastar aðeins
fyrir ógildar röksemdir. Færslur í `errors` eru hrein gögn án `cause` og án
staflaslóðar.

Hver dot-engine-villa sem er kastað erfir frá óhlutbundna `DotEngineError` og
útfærir `GvError`:

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

`renderSvg` kastar `ParseError` fyrir ógildan DOT-frumkóða, `RenderError` fyrir
bilanir á uppsetningar-/teiknistigi og `InternalError` fyrir galla í dot-engine. Mistök
kallanda kasta venjulegri `TypeError` / `RangeError` / `Error` þar sem `code` er
`UsageErrorCode` (`'ERR_INVALID_ARG_TYPE' | 'ERR_INVALID_ARG_VALUE' |
'ERR_OUT_OF_RANGE' | 'ERR_INVALID_STATE'`); þær eru ekki `GvError`. Kallendur
sem vilja skipulagðar villur án `try`/`catch` ættu að nota `tryRenderSvg`
í staðinn. Sjá [Villur og undantekningar](/is/guide/errors) fyrir hvern kóða.

## Tengsl

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

## Hvaða tegund kemur úr hvaða kalli

| Kall | Skilar |
|---|---|
| `createGraph(opts?)` | `GvGraphBuilder` |
| `builder.addNode(name, attrs?)` | `GvNode` |
| `builder.addEdge(tail, head, attrs?)` | `GvEdge` |
| `builder.addSubgraph(name, attrs?)` | `GvGraphBuilder` (hreiðraður) |
| `parse(dotSource)` | `Graph` |
| `render(g, format, opts?)` | `string` |
| `getLayout(g, opts?)` | `LayoutSnapshot` |
| `getDrawOps(g, opts?)` | `XdotOp[]` |
| `renderSvg(dotSource, engine)` | `string` (kastar `DotEngineError`, eða notkunar-`TypeError`) |
| `tryRenderSvg(dotSource, engine)` | `RenderResult` |

Fyrir hvern reit á hverri tegund hér að ofan — þar á meðal þá sem þessi síða
dregur saman — sjá myndaða [TypeDoc-tilvísun](/reference/). Fyrir
ítarlega umfjöllun um hnitakerfið (með útfærðum dæmum), sjá
[Lesa reiknaða rúmfræði](/is/guide/geometry).
