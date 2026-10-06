---
sourceHash: a49bdc5fdca8b04f5bd951935e322d616028e44f4567709824dbbd5229f60e3b
---

# Tüüpide teatmik

Avalike tüüpide kontseptuaalne kaart, rühmitatud selle järgi, kust te need saate:
`createGraph`/`parse` (koostamine + kontrollimine), `getLayout` (geomeetria
hetktõmmis), `render`/`getDrawOps` (väljund) ning juurpakett (mootorid, pildid,
teksti mõõtmine, vead). Iga kirje näitab lähtekoodist kopeeritud kujuplokki ja
ühelauselist eesmärki. Ammendava väljade kaupa dokumentatsiooni jaoks (sh päritud
liikmed ja JSDoc igal omadusel) vt genereeritud
[TypeDoc teatmikku](/reference/).

See leht ei korda koordinaatraami läbikäiku — selle kohta vt
[Arvutatud geomeetria lugemine](/et/guide/geometry). See kordab y-telje märkust
lühidalt kõikjal, kus tüübi väljad sõltuvad raamist.

## Koostamine + kontrollimine (`@knowvah/dot-engine` / `@knowvah/dot-engine/api`)

### `Graph`

Läbipaistmatu käepide sisemisele graafimudelile. Tagastavad `parse()` ja
`createGraph().graph`. Andke see edasi funktsioonidele `render`, `getLayout` ja
`getDrawOps`; ärge konstrueerige ega kontrollige seda otse — koostaja ja parser
on ainsad toetatud viisid selle tootmiseks.

### `CreateGraphOptions`

```ts
interface CreateGraphOptions {
  directed?: boolean;
  strict?: boolean;
  name?: string;
}
```

Valikud funktsioonile `createGraph`. `directed`/`strict` valivad ühe neljast
`GraphKind`-ist (suunatud, suunamata, range suunatud, range suunamata);
`name` määrab graafi nime (vaikimisi `''`).

### `GvNode`

```ts
interface GvNode {
  readonly name: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

Läbipaistmatu käepide graafi sõlmele, mille tagastab `builder.addNode(...)`.
`setHtmlAttr` märgib väärtuse HTML-laadseks sildiks (vastab `label=<...>`-ile
DOT-tekstis), nii et paigutusmootor mõõdab seda märgendina.

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

Läbipaistmatu käepide graafi servale, mille tagastab `builder.addEdge(...)`.

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

Tagastab `createGraph(...)`. `addSubgraph` tagastab pesastatud koostaja, mis on
selle alamgraafi piiridega; selle kaudu lisatud sõlmed on ka juurgraafi
liikmed. `.graph` on üleandmispunkt funktsioonidele
`render`/`getLayout`/`getDrawOps`. Vt
[Graafi koostamine koodis](/et/guide/build-a-graph).

## Geomeetria hetktõmmis (`getLayout`)

::: tip Koordinaatraam
Natiivsed Graphvizi koordinaadid on y-teljega ülespoole (alguspunkt vasakul all).
`getLayout` kasutab vaikimisi `yAxis: 'down'` (alguspunkt vasakul üleval,
ekraanikokkulepe) ja pöörab iga y-koordinaadi ümber; natiivsete Graphvizi
koordinaatide jaoks andke `{ yAxis: 'up' }`.
Täielik läbikäik: [Arvutatud geomeetria lugemine](/et/guide/geometry).
:::

### `YAxis` / `GeometryOptions`

```ts
type YAxis = 'up' | 'down';
type GeometryOptions = { yAxis?: YAxis };
```

Valikud funktsioonile `getLayout`. Vaikimisi `yAxis: 'down'`.

### `LayoutSnapshot`

```ts
interface LayoutSnapshot {
  bounds: BoundsGeometry;
  nodes: NodeGeometry[];
  edges: EdgeGeometry[];
  clusters: ClusterGeometry[];
}
```

Graafi arvutatud geomeetria tavaline, JSON-iks serialiseeritav hetktõmmis, mille
tagastab `getLayout(g, opts?)`. `clusters` loetleb rekursiivselt iga klastri
alamgraafi (pesastatud klastrid saavad igaüks oma kirje); graafide puhul, kus
klastreid ei ole, on see tühi.

### `BoundsGeometry`

```ts
interface BoundsGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Üldine piirdekast punktides. Väärtusega `yAxis: 'down'` on `x`/`y` normaliseeritud
väärtusele `(0, 0)`. Väärtusega `yAxis: 'up'` on `x`/`y` graafi piirdekasti
toores vasak alumine nurk.

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

Sõlmekohane geomeetria. `x`/`y` on sõlme keskpunkt. `width`/`height` on
**punktides** — mudel salvestab need tollides (`ND_width`/`ND_height`);
`getLayout` korrutab need enne tagastamist 72-ga.

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

Servakohane geomeetria. `points` liidab kokku iga marsruuditud splaini Bézier'
kontrollpunkti järjekorras (tühi, kui serval marsruuditud splaini ei ole).
`label` on olemas ainult siis, kui serval on keskmine silt.

`tailLabel` ja `headLabel` on `taillabel`/`headlabel` pordisiltide positsioonid.
Kumbki on olemas alles siis, kui paigutus selle paigutas — sama tingimus, mille
korral `render()` väljastab selle `<text>`-i —, nii et pordisilt, mida ei saanud
paigutada (näiteks marsruuditud splainita serv), esitatakse puuduvana, mitte
sildina alguspunktis.

`xlabel` on välissildi `xlabel` positsioon. Erinevalt `label`-ist valib selle
Graphvizi jõupaigutusotsing serva ümbruse kandidaatpositsioonide hulgast, seega ei
ole see tuletatav `label`-ist ega splaini keskpunktist. Sellel on sama
„ainult paigutatud“ värav: deklareeritud xlabel, mida otsing ei mahutanud,
esitatakse puuduvana, täpselt nii, nagu `render()` keeldub seda joonistamast.

`sp` ja `ep` on noole kinnituspunktid saba- ja peaotsas. Kui otsal on nool,
lühendatakse splaini, et sellele ruumi jätta, ja nool ulatub lõppkontrollpunktist
selle punktini — nii et oma nooleotsi joonistav tarbija loeb tipu siit, mitte ei
ekstrapoleeri seda. Kumbki on olemas ainult siis, kui sellel otsal tõepoolest on
nool, seega tavaline serv `digraph { a -> b }` teatab `ep`-i ja `sp`-d mitte, ning
`arrowhead=none` ei teata kumbagi.

Need on kinnituspunktid sõlme piiril. Graphvizi enda renderdaja nihutab
joonistatava nooleosa hulknurga neist sissepoole joonepaksusest sõltuva hulga
võrra, seega on `ep` punkt, *milleni* noolt joonistada, mitte renderdatud tipu
koopia.

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

Klastrikohane piirdekast. `name` on klastri alamgraafi nimi (nt `cluster6`);
pesastatud klastrid kodeerivad oma hierarhia nimesse, seega selget
vanemviidet ei paljastata. Järgib sama raamikokkulepet nagu `BoundsGeometry`.

`label` on klastri tiitli paigutus, olemas ainult siis, kui klaster selle
deklareerib. Selle `x`/`y` on sildiruumi **keskpunkt** — vastab
`EdgeGeometry.label`-ile, mitte ülaltoodud kasti nurgale `x`/`y` — ning
`width`/`height` on mõõdetud teksti suurus, nii et sildikast on
`[x - width/2, x + width/2] × [y - height/2, y + height/2]` ja asub alati
klastri kasti sees. Pange tähele, et see on sildi *keskpunkt*, samas kui
`render()` väljastatav `<text>` kannab baasjoont, mis asub madalamal.

## Renderdamine (`@knowvah/dot-engine/render`)

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

Suletud liit vormingutest, mida funktsioon `render(g, format, opts?)` aktsepteerib.
Vt [Renderdamine teistesse vormingutesse](/et/guide/render-formats).

### `RenderOptions`

```ts
interface RenderOptions {
  engine?: EngineName;
  inlineImages?: boolean;
}
```

Valikud funktsioonile `render`. `engine` on vaikimisi `'dot'`. `inlineImages` (uus)
on vaikimisi `false`; väärtusega `true` liidab SVG-emitter välised pildid
(`image=`/HTML `<IMG>`) sisse `data:` URI-dena, küsides `setImageResolver`-iga
registreeritud resolverilt — resolveri möödalask või registreerimata jätmine
taandub toorele `src`-i läbilaskele. Ei mõjuta mitte-SVG vorminguid. Vt
[Piltidega töötamine](/et/guide/images).

::: warning `yAxis` ei ole `RenderOptions` väli
Koordinaatide orientatsioon on ainult `getLayout`-i mure. `render`-i toodetud
toorvormingusõned kannavad natiivseid y-teljega ülespoole koordinaate; pöörake
järeltöötluses ümber, kui vajate y-telge allapoole ega kasuta `getLayout`-i.
:::

### `DrawOpsOptions`

```ts
interface DrawOpsOptions {
  engine?: EngineName;
}
```

Valikud funktsioonile `getDrawOps`. `engine` on vaikimisi `'dot'`.

### `Xdot`

```ts
interface Xdot {
  ops: XdotOp[];
  flags: number;
}
```

Ühe xdot-atribuudivoo parsitud tulemus: dekodeeritud joonistusoperatsioonide
massiiv pluss parsimise oleku lippude bitimask. `getDrawOps` tagastab ainult
lamestatud `XdotOp[]` üle iga graafi joonistusatribuudi, joonistusjärjekorras
(graaf → sõlm → serv) — täieliku operatsiooniliikide tabeli ja canvase näite
leiate jaotisest [Oma renderdus xdot-iga](/et/guide/xdot-drawops).

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

Üks dekodeeritud xdot-joonistusoperatsioon, eristatud `kind` järgi. Iga variant
kannab ühte oma kujule nimetatud andmeomadust — kitsendage `switch`-is `kind`
järgi, et sellele turvaliselt ligi pääseda. Koordinaadid on punktides, natiivses
y-teljega ülespoole raamis (pöörake y-teljega allapoole canvase jaoks ümber — vt
ülaltoodud juhendit).

### `XdotColor`

```ts
type XdotColor =
  | { type: 'none'; clr: string }
  | { type: 'linear'; ling: XdotLinearGrad }
  | { type: 'radial'; ring: XdotRadialGrad };
```

Lahendatud xdot-täite/joonevärv: ühtne värv või lineaarne/radiaalne gradient
(`XdotLinearGrad`/`XdotRadialGrad` kannavad kumbki `x0,y0,x1,y1[,r0,r1]` pluss
massiivi `stops: { frac: number; color: string }[]`).

## Juurpakett (`@knowvah/dot-engine`)

### `EngineName`

```ts
type BuiltinEngine =
  | 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi' | 'osage' | 'patchwork';

type EngineName = BuiltinEngine | (string & {});
```

Paigutusmootori nimi. Register on avatud (eraldi mootoreid saab registreerida
`GvcContext`-is), seega aktsepteeritakse mis tahes sõne; `(string & {})` hoiab
sisseehitatud mootorite redaktoripoolse automaatlõpetuse, hulka sulgemata. Vt
[Paigutusmootorid](/et/guide/engines).

### `ImageSizer`

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;

function setImageSizer(sizer: ImageSizer | null): void;
```

Registreerib tagasikutse, mis tagastab atribuudiga `image=` või HTML-i
`<IMG>`-lahtriga viidatud välise pildi omamõõtmed paigutuse suuruse määramiseks.
Tagastage `null`, kui suurus on teadmata (vastab C-i puuduva pildi käitumisele —
nullsuurusega lahter pluss hoiatus). Varem määratud sizeri tühistamiseks andke
`setImageSizer`-ile `null`. Vt [Kasutamine brauseris](/et/guide/browser).

### `ImageResolver`

```ts
type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;

function setImageResolver(fn: ImageResolver | null): void;
```

Registreerib tagasikutse, mis tagastab välise pildi toorbaidid, mida küsitakse,
kui `RenderOptions.inlineImages` on `true`. Paljas `Uint8Array` tagastus
tuletab MIME-tüübi `src`-i faililaiendist. `null` (resolverilt või kui
resolverit ei ole registreeritud) taandub toorele `src`-i läbilaskele. Vt
[Piltidega töötamine](/et/guide/images).

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

Pluginatav teksti mõõtmine, paigaldatakse `setTextMeasurer`-iga (kaasas on kolm
sisseehitatut: `EstimateTextMeasurer`, `LutTextMeasurer`, `CanvasTextMeasurer`).
`yoffsetCenterline`/`yoffsetLayout` on valikulised vertikaalmõõdud
(baasjoon→keskjoon, baasjoon→ülaulatus); jätke need ära, et taanduda pango-ga
kalibreeritud vaikeväärtustele. Vt [Teksti mõõtmine](/et/guide/text-measurement).

### `RenderResult` ja vead

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

`tryRenderSvg(dotSource, engine)` on `renderSvg`-i tulemustüüpi vaste: see
tagastab `{ svg }` edu korral või `{ errors: [one] }` esimese ebaõnnestumise
korral, selle asemel et visata. See tagastab mis tahes DOT-sisendi korral ja
viskab ainult kehtetute argumentide korral. Kirjed väljal `errors` on tavaandmed
ilma `cause`-i ja pinujäljeta.

Iga visatud dot-engine'i viga laiendab abstraktset `DotEngineError`-it ja
implementeerib `GvError`-i:

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

`renderSvg` viskab `ParseError`-i kehtetu DOT-lähtekoodi korral, `RenderError`-i
paigutus-/renderdusetapi tõrgete korral ja `InternalError`-i dot-engine'i vea
korral. Kutsuja eksimused viskavad standardse `TypeError`-i / `RangeError`-i /
`Error`-i, mille `code` on `UsageErrorCode` (`'ERR_INVALID_ARG_TYPE' |
'ERR_INVALID_ARG_VALUE' | 'ERR_OUT_OF_RANGE' | 'ERR_INVALID_STATE'`); need ei ole
`GvError`-id. Kutsujad, kes soovivad struktureeritud vigu ilma `try`/`catch`-ita,
peaksid kasutama selle asemel `tryRenderSvg`-i. Iga koodi kohta vt
[Vead ja erandid](/et/guide/errors).

## Seosed

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

## Milline tüüp tuleb millisest kutsest

| Kutse | Tagastab |
|---|---|
| `createGraph(opts?)` | `GvGraphBuilder` |
| `builder.addNode(name, attrs?)` | `GvNode` |
| `builder.addEdge(tail, head, attrs?)` | `GvEdge` |
| `builder.addSubgraph(name, attrs?)` | `GvGraphBuilder` (pesastatud) |
| `parse(dotSource)` | `Graph` |
| `render(g, format, opts?)` | `string` |
| `getLayout(g, opts?)` | `LayoutSnapshot` |
| `getDrawOps(g, opts?)` | `XdotOp[]` |
| `renderSvg(dotSource, engine)` | `string` (viskab `DotEngineError`-i või kasutuse `TypeError`-i) |
| `tryRenderSvg(dotSource, engine)` | `RenderResult` |

Iga ülaltoodud tüübi iga välja kohta — sh nende, mida see leht kokku võtab — vt
genereeritud [TypeDoc teatmikku](/reference/). Koordinaatraami põhjaliku käsitluse
(töönäidetega) leiate jaotisest
[Arvutatud geomeetria lugemine](/et/guide/geometry).
