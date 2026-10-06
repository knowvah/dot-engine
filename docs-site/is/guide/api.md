---
sourceHash: e2e54229b04c577dfb514c415c7f02fd786b797b5bfc7a4bbf2e4192d03d0c09
---

# API-tilvísun

Opinbera yfirborðið er vísvitandi lítið. Flestir kallendur þurfa aðeins `renderSvg`.
Sjá [Yfirlit](/is/guide/overview) um hvaða aðgangspunkt á að nota, [Tegundir](/is/guide/types)
fyrir lögun þess sem hvert fall tekur við og skilar, og myndaða
[Tilvísun](/reference/) fyrir tæmandi undirskriftir, alla reiti og allar
yfirhleðslur.

> Tegundayfirlýsingar (`.d.ts`) eru búnar til með `npm run build` (`build:types`-skrefið
> keyrir `tsc -p tsconfig.build.json`). `exports`-kortið í `package.json`
> tengir `types`-skilyrði fyrir hvern aðgangspunkt, þannig að `@knowvah/dot-engine`, `@knowvah/dot-engine/api`
> og `@knowvah/dot-engine/render` leysast allir upp í tegundir í ritlum og eftirfylgjandi smíðum.
>
> Smíðin býr einnig til yfirlýsingakort (`.d.ts.map`) og JS-source map-skrár, og
> pakkinn fylgir með `src/`-frumkóðanum sínum — svo „fara í skilgreiningu“ stekkur beint
> í raunverulega TypeScript-kóðann, sem gerir auðvelt að lesa kóðann og opna PR.

Þessari síðu er skipt eftir aðgangspunktunum þremur ([Yfirlit](/is/guide/overview)
útskýrir hvenær á að grípa til hvers): rótarpakkinn `@knowvah/dot-engine` (þátta + teikna
í einu kalli, auk altækrar stillingar fyrir ferlið), `@knowvah/dot-engine/api` (smíða
graf í kóða, lesa reiknaða rúmfræði til baka) og `@knowvah/dot-engine/render`
(úttak á mörgum sniðum og hráar teikniaðgerðir). Öll föll hér að neðan eru einnig endurútflutt úr
rótarpakkanum (`export * from './api/index.js'` /
`export * from './render/index.js'` í `src/index.ts`) — að flytja allt inn
úr `@knowvah/dot-engine` virkar, en undirslóðainnflutningur er skýrari um
hvaða lag þú ert að snerta.

## `@knowvah/dot-engine` (rót)

### `renderSvg`

```ts
function renderSvg(dotSource: string, engine: EngineName): string;
```

Þáttar DOT-frumkóðann, keyrir nefndu [uppsetningarvélina](/is/guide/engines), teiknar
á SVG og skilar SVG-strengnum. Þetta er umbúðafallið fyrir eitt kall:
það smíðar `GvcContext`, skráir vélarnar átta sem fylgja með og SVG-
teiknivélina, raðar upp, teiknar og losar uppsetninguna — sjá
[`GvcContext` / `renderWithContext`](#gvccontext-renderwithcontext) hér að neðan ef
þú þarft að aðgreina þessi skref.

- **`dotSource`** — frumkóði DOT-málsgrafs.
- **`engine`** — `EngineName`: ein af innbyggðu vélunum (`dot`, `neato`, `fdp`,
  `sfdp`, `circo`, `twopi`, `osage`, `patchwork`) eða hvaða sérskráð heiti sem er.
- **Kastar** `DotEngineError` fyrir hvert vandamál með inntakið: `ParseError` ef
  `dotSource` er ógilt, `RenderError` ef uppsetning eða teiknun mistekst,
  `InternalError` (með `cause`) fyrir galla í dot-engine. `TypeError` með
  `code` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` ef `dotSource` eða
  `engine` er ógilt (þar á meðal vélarheiti sem er ekki skráð). Sjá
  [Villur og undantekningar](/is/guide/errors).

Fullu undirskriftina, JSDoc og lista `GvError`-reita: [Tilvísun](/reference/).

### `tryRenderSvg` / `RenderResult`

```ts
function tryRenderSvg(dotSource: string, engine: EngineName): RenderResult;
```

Systurfall `renderSvg` í niðurstöðustíl. Skilar (kastar aldrei) fyrir hvaða DOT-inntak sem er:
`{ svg }` ef vel tekst eða `{ errors: [one] }` við fyrstu bilun; `svg` og
`errors` útiloka hvort annað. Það kastar aðeins fyrir ógildar röksemdir (`TypeError`
`ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`). Hver færsla í `errors` er
hrein, JSON-raðgeranleg gögn (`type`, `code`, `message`, `friendlyMessage`, auk
`location` / `expected` þegar til staðar; ekkert `cause`, engin staflaslóð), svo óhætt er að
senda hana yfir mörk worker/postMessage eða raðgera í annál. Kjóstu þetta fram yfir
`renderSvg` + `try`/`catch` þegar kallandinn vill greina á `code` / `type`
í stað þess að grípa undantekningu. Sjá [Villur og undantekningar](/is/guide/errors).
[Tilvísun](/reference/).

### `parse` / `ParseError`

```ts
function parse(dotSource: string): Graph;
```

Þáttar DOT í grafalíkanið í minni **án** þess að raða því upp. Gagnlegt
til að skoða eða umbreyta grafinu — eða afhenda það `getLayout` í `@knowvah/dot-engine/api` /
`render` í `@knowvah/dot-engine/render` — áður en teiknað er.

- **Kastar** `ParseError` fyrir setningafræðivillur eða brot á leggjastefnu (t.d.
  `->` í óstefnugrafi). `ParseError` erfir frá `DotEngineError` og
  útfærir `GvError` með `type: 'syntax'`; hún ber
  `location: { line, column, offset? }`. `TypeError` `ERR_INVALID_ARG_TYPE` ef
  `dotSource` er ekki strengur. [Villur og undantekningar](/is/guide/errors),
  [Tilvísun](/reference/).

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

`instanceof DotEngineError` þýðir að dot-engine brást á þessu inntaki. `RenderError`
nær yfir þekktar uppsetningar-/teiknibilanir (`type` er `semantic` fyrir `UNKNOWN_LAYOUT` og
`UNSUPPORTED_FEATURE`). `InternalError` er galli í dot-engine; `cause` geymir
upprunalegu villuna þegar ein var vafin. Mistök kallanda kasta venjulegri `TypeError`
/ `RangeError` / `Error` með `code` í staðinn. `isGvError` kannar hvort `type` og `code`
séu strengir, svo það virkar milli tvítekinna búnta. Sjá
[Villur og undantekningar](/is/guide/errors) fyrir hvern kóða og hvað hvert fall getur
kastað, [Tegundir](/is/guide/types) fyrir lögun `GvError` og
[Tilvísun](/reference/) fyrir meðlimalista `GvErrorCode`.

### `setTextMeasurer` / `getTextMeasurer`

```ts
function setTextMeasurer(measurer: TextMeasurer | null): void;
function getTextMeasurer(): TextMeasurer;
```

Skráir (eða hreinsar, með `null`) altækan textamæli ferlisins sem er hafður til ráða
við uppsetningu til að stærðarmæla merkimiða. Hreinsun fellur aftur á sjálfgildi bókasafnsins
(vafri: `CanvasTextMeasurer`; haus-laust/Node: `EstimateTextMeasurer`, nema
LUT-mælir sé tengdur — sjá [Textamæling](/is/guide/text-measurement) fyrir
fulla úrlausnarröð og útfærslurnar `CanvasTextMeasurer` / `EstimateTextMeasurer` /
`LutTextMeasurer` sem eru fluttar út samhliða þessum föllum).
[Tilvísun](/reference/).

### `setImageSizer` / `setImageResolver`

Tveir skyldir en ólíkir tengipunktar fyrir myndastillingar — báðir altækar
skrár ferlisins sem fylgja sama mynstri (skrá endurkall, senda `null` til að
hreinsa), báðir án áhrifa þar til kallandi skráir slíkt:

- **`setImageSizer`** — tilkynnir *náttúrulegar stærðir* ytri myndar svo
  uppsetningarvélin geti frátekið pláss fyrir HTML `<IMG>`-reit eða `image=`-eigindi
  hnúts áður en teiknað er. Að skila `null` (eða hafa engan stærðarmæli
  skráðan) endurskapar hegðun upprunalegs Graphviz við mynd sem vantar: viðvörun
  og núllstærð.
- **`setImageResolver`** (nýtt — sjá [`inlineImages`](#inlineimages) hér að neðan) —
  leggur til raunveruleg *bæti* myndarinnar svo SVG-teiknivélin geti fellt þau inn sem
  `data:`-URI í stað þess að gefa út `xlink:href="src"` sem hráa umferð.

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;
function setImageSizer(sizer: ImageSizer | null): void;

type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;
function setImageResolver(fn: ImageResolver | null): void;
```

`ImageResolver` má skila berri `Uint8Array` (MIME ályktað af skráarendingu `src` —
`.png`, `.jpg`/`.jpeg`, `.gif`, `.svg`, `.webp`; allt annað
fellur aftur á `application/octet-stream`) eða `{ bytes, mime }` til að setja MIME-
tegundina beint. Skilaðu `null` þegar ekki er hægt að leysa `src` — teiknivélin
fellur aftur á hráa `src`-umferð, eins og enginn leysir hafi verið skráður.
Skráning leysis hefur engin áhrif ein og sér; hann er aðeins hafður til ráða þegar
`inlineImages`-valkostur `render` er `true` (hér að neðan). Sjá
[Unnið með myndir](/is/guide/images) fyrir útfært dæmi og
[Tilvísun](/reference/) fyrir báðar endurkallstegundir.

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

`renderSvgAsync` er ósamstillta hliðstæða `renderSvg`: það forsækir vefletrin
og myndagögnin sem grafið þarf, og raðar síðan upp og teiknar. `renderSvgInto`
teiknar og skiptir út börnum þáttarins með auðkenni `id`, og hreinsar SVG-ið
sjálfgefið (`trusted: true` sleppir því; `sanitize` kemur í stað innbyggða hreinsarans).
Bilanir, þar á meðal slæmar röksemdir, eru höfnun á promise með sömu villuflokkum
og `renderSvg`; þáttarauðkenni sem vantar hafnar með `ERR_INVALID_ARG_VALUE`.
Leturvandamál hafna aldrei; þau koma til baka í `fontIssues`. Sjá
[Notkun í vafra](/is/guide/browser) og [Unnið með myndir](/is/guide/images), og
[Tilvísun](/reference/).

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

Lægra stigs stýring fyrir kallendur sem þurfa að keyra uppsetningu og teiknun
sem aðskilin skref. `renderSvg` er umbúðafall utan um nákvæmlega þetta:
smíða samhengi, skrá vélar/teiknivélar, `layout`, `renderWithContext`,
`freeLayout`. Gríptu til þessara beint aðeins þegar þú þarft þá stjórn — til
dæmis til að skrá hlutmengi véla, bæta við sérsniðinni `LayoutEngine` eða
`RendererPlugin`, eða teikna sama uppsetta grafið á mörgum sniðum
án þess að keyra uppsetningu aftur (kallaðu á `layout` einu sinni, síðan `renderWithContext` fyrir
hvert snið, síðan `freeLayout`). [Tilvísun](/reference/).

## `@knowvah/dot-engine/api`

Forritunarleg smíði, örugg leggjainnsetning og útlestur reiknaðrar rúmfræði
— lagið til að smíða graf án þess að skrifa DOT-texta í höndunum og lesa uppsetningu þess
til baka sem hrein gögn. Sjá [Tegundir](/is/guide/types) fyrir `LayoutSnapshot` og
innfelldar lögun þess.

### `createGraph`

```ts
function createGraph(opts?: {
  directed?: boolean;
  strict?:   boolean;
  name?:     string;
}): GvGraphBuilder;
```

Býr til nýtt graf tilbúið til afhendingar í `render` / `getLayout` /
`getDrawOps`. Sjálfgildi: `directed: true`, `strict: false`, `name: ''`. Skilar
`GvGraphBuilder` — `addNode`, `addEdge`, `addSubgraph`, `setAttr`/`getAttr`,
`setHtmlAttr` (fyrir merkimiða í HTML-töflum) og `.graph`-eigind sem sýnir
ógagnsæja `Graph`-haldið. Sjá [Smíða graf í kóða](/is/guide/build-a-graph) og
[Tilvísun](/reference/) fyrir öll `GvGraphBuilder`/`GvNode`/`GvEdge`-
viðmótin.

### `addEdge`

```ts
function addEdge(g: Graph, tail: Node, head: Node, name?: string): Edge;
```

Lægra stigs hjálparfall fyrir leggjainnsetningu sem liggur að baki `GvGraphBuilder.addEdge` —
flutt út beint fyrir kallendur sem vinna með innri `Node`/`Edge`-
tilvísanir (t.d. leggi sem bætt er við graf sem `parse()` skilaði) frekar en
ógagnsæ `GvNode`/`GvEdge`-höldin í smiðnum. Flestir kallendur ættu að nota
`createGraph(...).addEdge(tail, head, attrs?)` í staðinn.

- **`name`** — lykill leggsins; sjálfgefið `''` (nafnlaus). Hunsað við afritun í strict-grafi,
  sem samsvarar aðeins á `(tail, head)` (samhverft fyrir óstefnugraf).
- **Skilar** nýja legginum, eða þeim sem fyrir er ef `g` er strict og
  `(tail, head)`-leggur er þegar til (speglar `agedge` með `cflag=1`).

Sjá [Smíða graf í kóða](/is/guide/build-a-graph) og
[Tilvísun](/reference/).

### `getLayout`

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

Skilar hreinni, JSON-raðgeranlegri skyndimynd af reiknaðri rúmfræði grafsins —
staðsetningum hnúta, stjórnpunktum splína leggja, leggjamerkimiðum, afmörkunarkössum
klasa og heildarmörkum grafsins — allt í punktum.

- **`g`** — verður þegar að vera uppsett (með `render(g, ...)`, `getDrawOps(g)` eða
  `ctx.layout(g, engine)`); að kalla á `getLayout` á graf sem er ekki uppsett
  kastar í stað þess að skila hljóðlega allri rúmfræði sem núll.
- **`opts.yAxis`** — sjálfgefið `'down'`: skjáhnit, upphafspunktur efst til vinstri, y
  vex niður á við, og `bounds` er stöðlað að `(0, 0)`. `'up'` skilar
  upprunalegum Graphviz-hnitum (upphafspunktur neðst til vinstri, y vex upp á við) með
  `bounds.x`/`bounds.y` í hráa neðra vinstra horninu.
- **Kastar** `Error` með `code` `ERR_INVALID_STATE` ef `g` hefur ekki verið uppsett;
  `TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` fyrir slæmt `g`
  eða `opts`. Sjá [Villur og undantekningar](/is/guide/errors).

`width`/`height` hnúta eru umbreytt í punkta (innra líkanið geymir
tommur); öll önnur hnit eru þegar í punktum. Sjá
[Lesa reiknaða rúmfræði](/is/guide/geometry) fyrir umfjöllun um hnitakerfið
og [Tegundir](/is/guide/types) / [Tilvísun](/reference/) fyrir fulla reitalista
`LayoutSnapshot`, `NodeGeometry`, `EdgeGeometry`, `ClusterGeometry` og
`BoundsGeometry`.

### `Graph`

Ógagnsæ haldtegund endurútflutt úr innra líkaninu. Aðeins *tegundin* er
sýnd (ekki breytilegi flokkurinn) — merktu breytu sem geymir `.graph` smiðs
eða niðurstöðu `parse()` með henni, en smíðaðu hana ekki né skoðaðu reiti hennar
beint; notaðu smiðinn, `getLayout` eða `getDrawOps` til að lesa ástand
til baka. [Tilvísun](/reference/).

## `@knowvah/dot-engine/render`

Úttak á mörgum sniðum og aðgangur að hráum teikniaðgerðum — lagið til að teikna
graf sem þegar hefur verið `parse`-að eða smíðað með smið.

### `render`

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  RenderOptions,
): string;
```

Raðar upp og teiknar graf á umbeðnu sniðsstrengsformi.

- **`format`** — `OutputFormat`: `'svg' | 'dot' | 'xdot' | 'json' | 'plain' |
  'plain-ext' | 'imap' | 'cmapx'`.
- **`opts.engine`** — uppsetningarvél (sjálfgefið `'dot'`).
- **`opts.inlineImages`** — sjá [hér að neðan](#inlineimages).
- **Kastar** `RenderError` við uppsetningar- eða teiknibilun; `InternalError` við
  galla í dot-engine; `TypeError` með `code` fyrir ógildar röksemdir (þar á meðal
  óskráða vél eða snið). Sjá [Villur og undantekningar](/is/guide/errors).

`opts.engine` speglar `engine`-færibreytu `renderSvg`; `format` er ásinn sem
`renderSvg` sýnir ekki (`renderSvg` er harðkóðað á `'svg'`). Sjá
[Teikna á önnur snið](/is/guide/render-formats) og [Tilvísun](/reference/)
fyrir fullt `OutputFormat`-samband og lögun `RenderOptions`.

#### `inlineImages`

`RenderOptions.inlineImages` (sjálfgefið `false`) fellir ytri myndir inn sem
`data:`-URI í stað hráu `xlink:href="src"`-umferðarinnar. Það hefur engin
áhrif nema leysir sé skráður með `setImageResolver` (hér að ofan) — og engin
áhrif á snið sem eru ekki SVG. Óstillt er úttakið bæti fyrir bæti eins og áður en
þessi valkostur kom til.

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

Sjá [Unnið með myndir](/is/guide/images) fyrir fulla leiðsögn, þar á meðal
úrlausn úr `fetch` í vafra og úr skráarkerfinu í Node.

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

Ósamstillt hliðstæða `render`: sömu snið og `engine`/`inlineImages`-valkostir,
auk ósamstilltra myndakróka fyrir hvert kall og forsóknar leturs. Hver myndakrókur keyrir í mesta lagi
einu sinni fyrir hvert aðgreint `src`; kast eða höfnun telst missir. Úttak er óhreinsað
markup fyrir markup-sniðin; sjá „Security“-kafla README.

### `getDrawOps` / `DEFAULT_DRAW_ENGINE`

```ts
const DEFAULT_DRAW_ENGINE: EngineName; // 'dot'

function getDrawOps(g: Graph, opts?: { engine?: EngineName }): XdotOp[];
```

Raðar `g` upp, teiknar á xdot og skilar flötu, tegunduðu fylki teikniaðgerða — lögun hnúta,
textabilum, litum og leturgerðum sem gildum í aðgreindu sambandi (þrengdu á
`op.kind` í `switch`) — til að mata sérsniðna canvas/WebGL/PDF-teiknivél
án þess að snerta SVG eða strengjakóðun xdot. `opts.engine` er sjálfgefið
`DEFAULT_DRAW_ENGINE` (`'dot'`).

- **Kastar** `ParseError` ef ekki er hægt að þátta milliliða-xdot-úttakið aftur
  (galli í dot-engine; ekki við því að búast í reynd); `RenderError` við
  uppsetningar-/teiknibilun; `InternalError` við hvern annan galla í dot-engine; `TypeError` með
  `code` fyrir ógildar röksemdir. Sjá [Villur og undantekningar](/is/guide/errors).

Sjá [Eigin teiknun með xdot-teikniaðgerðum](/is/guide/xdot-drawops) fyrir lista yfir tegundir aðgerða
og útfært canvas-dæmi, og [Tegundir](/is/guide/types) /
[Tilvísun](/reference/) fyrir fullt `XdotOp`-samband og lögun `Xdot`/`XdotColor`.
