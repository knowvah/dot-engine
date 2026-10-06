---
sourceHash: a49bdc5fdca8b04f5bd951935e322d616028e44f4567709824dbbd5229f60e3b
---

# Tyyppiviite

Käsitteellinen kartta julkisista tyypeistä, ryhmiteltynä sen mukaan, mistä ne
saadaan: `createGraph`/`parse` (rakenna + tarkastele), `getLayout`
(geometriatilannekuva), `render`/`getDrawOps` (tuloste) ja juuripaketti
(moottorit, kuvat, tekstin mittaus, virheet). Jokaisessa kohdassa on
lähdekoodista kopioitu muotolohko ja yhden rivin kuvaus tarkoituksesta.
Tyhjentävää kenttäkohtaista dokumentaatiota (mukaan lukien perityt jäsenet ja
JSDoc jokaisessa ominaisuudessa) varten katso generoitu
[TypeDoc-viite](/reference/).

Tämä sivu ei toista koordinaattikehyksen läpikäyntiä — katso se sivulta
[Lasketun geometrian lukeminen](/fi/guide/geometry). Se kertaa y-akselia koskevan
huomautuksen lyhyesti aina, kun tyypin kentät riippuvat kehyksestä.

## Rakenna + tarkastele (`@knowvah/dot-engine` / `@knowvah/dot-engine/api`)

### `Graph`

Läpinäkymätön kahva sisäiseen graafimalliin. Palauttavat `parse()` ja
`createGraph().graph`. Välitä se funktioille `render`, `getLayout` ja
`getDrawOps`; älä luo tai tarkastele sitä suoraan — rakentaja ja jäsennin ovat
ainoat tuetut tavat tuottaa sellainen.

### `CreateGraphOptions`

```ts
interface CreateGraphOptions {
  directed?: boolean;
  strict?: boolean;
  name?: string;
}
```

`createGraph`-funktion valitsimet. `directed`/`strict` valitsevat yhden neljästä
`GraphKind`-lajista (suunnattu, suuntaamaton, strict-suunnattu,
strict-suuntaamaton); `name` asettaa graafin nimen (oletus `''`).

### `GvNode`

```ts
interface GvNode {
  readonly name: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

Läpinäkymätön kahva graafin solmulle, jonka `builder.addNode(...)` palauttaa.
`setHtmlAttr` merkitsee arvon HTML-tyyppiseksi selitteeksi (vastaa
`label=<...>`-muotoa DOT-tekstissä), jotta asettelumoottori mittaa sen
merkintäkielenä.

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

Läpinäkymätön kahva graafin kaarelle, jonka `builder.addEdge(...)` palauttaa.

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

Palauttaa `createGraph(...)`. `addSubgraph` palauttaa sisäkkäisen rakentajan,
joka on rajattu kyseiseen aligraafiin; sen kautta lisätyt solmut ovat myös
juurigraafin jäseniä. `.graph` on luovutuspiste funktioille
`render`/`getLayout`/`getDrawOps`. Katso
[Graafin rakentaminen koodissa](/fi/guide/build-a-graph).

## Geometriatilannekuva (`getLayout`)

::: tip Koordinaattikehys
Natiivit graphviz-koordinaatit ovat y-ylös (origo vasemmassa alakulmassa).
`getLayout` käyttää oletuksena arvoa `yAxis: 'down'` (origo vasemmassa
yläkulmassa, näytön käytäntö) ja kääntää jokaisen y-koordinaatin; välitä
`{ yAxis: 'up' }` saadaksesi natiivit graphviz-koordinaatit.
Täysi läpikäynti: [Lasketun geometrian lukeminen](/fi/guide/geometry).
:::

### `YAxis` / `GeometryOptions`

```ts
type YAxis = 'up' | 'down';
type GeometryOptions = { yAxis?: YAxis };
```

`getLayout`-funktion valitsimet. Oletus `yAxis: 'down'`.

### `LayoutSnapshot`

```ts
interface LayoutSnapshot {
  bounds: BoundsGeometry;
  nodes: NodeGeometry[];
  edges: EdgeGeometry[];
  clusters: ClusterGeometry[];
}
```

Tavallinen, JSON-serialisoitava tilannekuva graafin lasketusta geometriasta,
jonka palauttaa `getLayout(g, opts?)`. `clusters` luettelee jokaisen
klusterialigraafin rekursiivisesti (sisäkkäiset klusterit saavat kukin oman
merkintänsä); se on tyhjä graafeille, joissa ei ole klustereita.

### `BoundsGeometry`

```ts
interface BoundsGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Kokonaisrajauslaatikko pisteinä. Arvolla `yAxis: 'down'` `x`/`y` normalisoidaan
arvoon `(0, 0)`. Arvolla `yAxis: 'up'` `x`/`y` ovat graafin rajauslaatikon raaka
vasen alakulma.

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

Solmukohtainen geometria. `x`/`y` ovat solmun keskipiste. `width`/`height` ovat
**pisteinä** — malli tallentaa ne tuumina (`ND_width`/`ND_height`); `getLayout`
kertoo ne luvulla 72 ennen palauttamista.

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

Kaarikohtainen geometria. `points` yhdistää kaikki reititetyn splinen
Bézier-ohjauspisteet järjestyksessä (tyhjä, jos kaarella ei ole reititettyä
splineä). `label` on olemassa vain, kun kaarella on keskiselite.

`tailLabel` ja `headLabel` ovat `taillabel`-/`headlabel`-porttiselitteiden
sijainnit. Kukin on olemassa vasta, kun asettelu on sijoittanut sen — samalla
ehdolla, jolla `render()` lähettää sen `<text>`-elementin — joten porttiselite,
jota ei voitu sijoittaa (esimerkiksi kaari ilman reititettyä splineä),
raportoidaan puuttuvaksi eikä selitteeksi origossa.

`xlabel` on `xlabel`-ulkoisen selitteen sijainti. Toisin kuin `label`, se
valitaan graphvizin voimasijoitushaulla kaaren ympärillä olevien
ehdokaspaikkojen joukosta, joten sitä ei voi johtaa `label`-arvosta eikä
splinen keskipisteestä. Sillä on sama vain-sijoitettu-ehto: ilmoitettu xlabel,
jota haku ei kyennyt sovittamaan, raportoidaan puuttuvaksi, aivan kuten
`render()` jättää sen piirtämättä.

`sp` ja `ep` ovat nuolen kiinnityspisteet tail- ja head-päissä. Kun pää kantaa
nuolta, splineä lyhennetään jättämään sille tilaa, ja nuoli ulottuu päätepisteestä
tähän pisteeseen — joten oman nuolenkärkensä piirtävä käyttäjä lukee kärjen
tästä sen sijaan, että ekstrapoloisi sellaisen. Kukin on olemassa vain, kun
kyseisessä päässä todella on nuoli, joten tavallinen `digraph { a -> b }`-kaari
raportoi `ep`-arvon mutta ei `sp`-arvoa, ja `arrowhead=none` ei kumpaakaan.

Nämä ovat kiinnityspisteitä solmun reunalla. Graphvizin oma renderöijä
sisentää piirtämänsä nuolimonikulmion niistä viivanpaksuudesta riippuvalla
määrällä, joten `ep` on piste, jota *kohti* nuoli piirretään, ei kopio
renderöidystä kärjestä.

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

Klusterikohtainen rajauslaatikko. `name` on klusterialigraafin nimi (esim.
`cluster6`); sisäkkäiset klusterit koodaavat hierarkiansa nimeen, joten
eksplisiittistä vanhempilinkkiä ei paljasteta. Noudattaa samaa
kehyskäytäntöä kuin `BoundsGeometry`.

`label` on klusterin nimiön sijoittelu, olemassa vain, kun klusteri ilmoittaa
sellaisen. Sen `x`/`y` ovat selitetilan **keskipiste** — vastaten
`EdgeGeometry.label`-kenttää, ei yllä olevaa laatikon kulmaa `x`/`y` — ja
`width`/`height` ovat mitattu tekstin koko, joten selitelaatikko on
`[x - width/2, x + width/2] × [y - height/2, y + height/2]` ja on aina
klusterilaatikon sisällä. Huomaa, että tämä on selitteen *keskipiste*, kun taas
`render()`-funktion lähettämä `<text>` kantaa perusviivan, joka on alempana.

## Renderöinti (`@knowvah/dot-engine/render`)

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

Suljettu unioni muodoista, jotka `render(g, format, opts?)` hyväksyy. Katso
[Renderöinti muihin muotoihin](/fi/guide/render-formats).

### `RenderOptions`

```ts
interface RenderOptions {
  engine?: EngineName;
  inlineImages?: boolean;
}
```

`render`-funktion valitsimet. `engine` on oletuksena `'dot'`. `inlineImages`
(uusi) on oletuksena `false`; kun se on `true`, SVG-lähetin upottaa ulkoiset
kuvat (`image=`/HTML `<IMG>`) `data:`-URI:ina käyttämällä
`setImageResolver`-funktiolla rekisteröityä ratkaisijaa — ratkaisijan huti tai
rekisteröinnin puute palaa raakaan `src`-läpivientiin. Ei vaikutusta muihin
kuin SVG-muotoihin. Katso [Kuvien käyttö](/fi/guide/images).

::: warning `yAxis` ei ole `RenderOptions`-kenttä
Koordinaattien suunta on vain `getLayout`-funktion asia. `render`-funktion
tuottamat raa'at muotomerkkijonot kantavat natiiveja y-ylös-koordinaatteja;
käännä jälkikäsittelyssä, jos tarvitset y-alas etkä kulje `getLayout`-funktion
kautta.
:::

### `DrawOpsOptions`

```ts
interface DrawOpsOptions {
  engine?: EngineName;
}
```

`getDrawOps`-funktion valitsimet. `engine` on oletuksena `'dot'`.

### `Xdot`

```ts
interface Xdot {
  ops: XdotOp[];
  flags: number;
}
```

Yhden xdot-attribuuttivirran jäsennetty tulos: dekoodattu piirto-operaatiotaulukko
sekä jäsennyksen tilan lippubittimaski. `getDrawOps` palauttaa vain litistetyn
`XdotOp[]`-taulukon graafin jokaisesta piirtoattribuutista piirtojärjestyksessä
(graafi → solmu → kaari) — katso [Oma renderöinti xdotilla](/fi/guide/xdot-drawops)
täydestä operaatiotyyppien taulukosta ja canvas-esimerkistä.

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

Yksittäinen dekoodattu xdot-piirto-operaatio, erotettu `kind`-kentällä. Kukin
variantti kantaa yhtä muotonsa mukaan nimettyä hyötykuorma-ominaisuutta —
kavenna `kind`:n mukaan `switch`-lauseessa päästäksesi siihen turvallisesti.
Koordinaatit ovat pisteinä, natiivissa y-ylös-kehyksessä (käännä y-alas-canvasta
varten — katso yllä linkitetty opas).

### `XdotColor`

```ts
type XdotColor =
  | { type: 'none'; clr: string }
  | { type: 'linear'; ling: XdotLinearGrad }
  | { type: 'radial'; ring: XdotRadialGrad };
```

Ratkaistu xdot-täyttö-/viivaväri: yhtenäinen väri tai lineaarinen/säteittäinen
liukuväri (`XdotLinearGrad`/`XdotRadialGrad` kantavat kumpikin
`x0,y0,x1,y1[,r0,r1]` sekä `stops: { frac: number; color: string }[]`-taulukon).

## Juuripaketti (`@knowvah/dot-engine`)

### `EngineName`

```ts
type BuiltinEngine =
  | 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi' | 'osage' | 'patchwork';

type EngineName = BuiltinEngine | (string & {});
```

Asettelumoottorin nimi. Rekisteri on avoin (omia moottoreita voi rekisteröidä
`GvcContext`-olioon), joten mikä tahansa merkkijono hyväksytään; `(string & {})`
säilyttää editorin automaattisen täydennyksen sisäänrakennetuille moottoreille
sulkematta joukkoa. Katso [Asettelumoottorit](/fi/guide/engines).

### `ImageSizer`

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;

function setImageSizer(sizer: ImageSizer | null): void;
```

Rekisteröi takaisinkutsun, joka palauttaa `image=`-attribuutilla tai HTML-
`<IMG>`-solulla viitatun ulkoisen kuvan luontaiset mitat asettelun
mitoitusta varten. Palauta `null`, kun kokoa ei tiedetä (vastaa C:n
puuttuvan kuvan käyttäytymistä — nollakokoinen solu ja varoitus). Välitä
`null` funktiolle `setImageSizer` aiemmin asetetun mittaajan tyhjentämiseksi.
Katso [Käyttö selaimessa](/fi/guide/browser).

### `ImageResolver`

```ts
type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;

function setImageResolver(fn: ImageResolver | null): void;
```

Rekisteröi takaisinkutsun, joka palauttaa ulkoisen kuvan raakatavut, ja jota
käytetään, kun `RenderOptions.inlineImages` on `true`. Pelkkä `Uint8Array`-
paluuarvo päättelee MIME-tyypin `src`-tiedostopäätteestä. `null` (ratkaisijalta
tai ratkaisijaa ei ole rekisteröity) palaa raakaan `src`-läpivientiin. Katso
[Kuvien käyttö](/fi/guide/images).

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

Liitettävä tekstin mittaus, asennetaan `setTextMeasurer`-funktiolla (kolme
sisäänrakennettua toimitetaan: `EstimateTextMeasurer`, `LutTextMeasurer`,
`CanvasTextMeasurer`). `yoffsetCenterline`/`yoffsetLayout` ovat valinnaisia
pystymittareita (perusviiva→keskiviiva, perusviiva→yläpuoli); jätä ne pois
pangolla kalibroitujen oletusten käyttämiseksi. Katso
[Tekstin mittaus](/fi/guide/text-measurement).

### `RenderResult` ja virheet

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

`tryRenderSvg(dotSource, engine)` on `renderSvg`-funktion tulosvakoinen vastine:
se palauttaa `{ svg }` onnistuessaan tai `{ errors: [one] }` ensimmäisestä
epäonnistumisesta heittämisen sijaan. Se palauttaa mille tahansa DOT-syötteelle
ja heittää vain virheellisistä argumenteista. `errors`-merkinnät ovat tavallista
dataa ilman `cause`-kenttää ja pinojälkeä.

Jokainen heitetty dot-engine-virhe laajentaa abstraktia `DotEngineError`-luokkaa
ja toteuttaa `GvError`-rajapinnan:

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

`renderSvg` heittää `ParseError`-virheen virheellisestä DOT-lähdekoodista,
`RenderError`-virheen asettelu-/renderöintivaiheen epäonnistumisista ja
`InternalError`-virheen dot-enginen virheestä. Kutsujan virheet heittävät
tavallisen `TypeError`-/`RangeError`-/`Error`-virheen, jonka `code` on
`UsageErrorCode` (`'ERR_INVALID_ARG_TYPE' | 'ERR_INVALID_ARG_VALUE' |
'ERR_OUT_OF_RANGE' | 'ERR_INVALID_STATE'`); ne eivät ole `GvError`-virheitä.
Kutsujien, jotka haluavat jäsenneltyjä virheitä ilman `try`/`catch`-rakennetta,
tulisi käyttää sen sijaan `tryRenderSvg`-funktiota. Katso
[Virheet ja poikkeukset](/fi/guide/errors) kaikista koodeista.

## Suhteet

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

## Mikä tyyppi tulee mistäkin kutsusta

| Kutsu | Palauttaa |
|---|---|
| `createGraph(opts?)` | `GvGraphBuilder` |
| `builder.addNode(name, attrs?)` | `GvNode` |
| `builder.addEdge(tail, head, attrs?)` | `GvEdge` |
| `builder.addSubgraph(name, attrs?)` | `GvGraphBuilder` (sisäkkäinen) |
| `parse(dotSource)` | `Graph` |
| `render(g, format, opts?)` | `string` |
| `getLayout(g, opts?)` | `LayoutSnapshot` |
| `getDrawOps(g, opts?)` | `XdotOp[]` |
| `renderSvg(dotSource, engine)` | `string` (heittää `DotEngineError`-virheen tai käyttö-`TypeError`-virheen) |
| `tryRenderSvg(dotSource, engine)` | `RenderResult` |

Jokaisen yllä olevan tyypin jokaisesta kentästä — myös niistä, jotka tämä
sivu tiivistää — katso generoitu [TypeDoc-viite](/reference/). Koordinaattikehyksen
syväsukellusta (esimerkkeineen) varten katso
[Lasketun geometrian lukeminen](/fi/guide/geometry).
