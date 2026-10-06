---
sourceHash: e2e54229b04c577dfb514c415c7f02fd786b797b5bfc7a4bbf2e4192d03d0c09
---

# API teatmik

Avalik pind on tahtlikult väike. Enamik kutsujaid vajab ainult `renderSvg`-i.
Millist sisendpunkti kasutada, vt [Ülevaade](/et/guide/overview); kujud, mida iga
funktsioon sisse võtab ja tagastab, kirjeldab [Tüübid](/et/guide/types), ning
genereeritud [Teatmik](/reference/) sisaldab ammendavaid signatuure, iga välja ja
iga ülelaadimist.

> Tüübideklaratsioonid (`.d.ts`) väljastab `npm run build` (samm `build:types`
> käivitab `tsc -p tsconfig.build.json`). `package.json` kaart `exports` seob
> igale sisendile `types`-tingimused, nii et `@knowvah/dot-engine`,
> `@knowvah/dot-engine/api` ja `@knowvah/dot-engine/render` lahendavad kõik
> tüübid redaktorites ja järgnevates ehitustes.
>
> Ehitus väljastab ka deklaratsioonikaardid (`.d.ts.map`) ja JS-i lähtekaardid,
> ning pakett tarnib oma `src/` lähtekoodi — nii viib „mine definitsiooni juurde“
> otse päris TypeScripti, mis teeb koodi lugemise ja PR-i avamise lihtsaks.

See leht on korraldatud kolme sisendpunkti järgi ([Ülevaade](/et/guide/overview)
selgitab, millal millegi järele haarata): juurpakett `@knowvah/dot-engine`
(parse + render ühe kutsega, pluss protsessiülene konfiguratsioon),
`@knowvah/dot-engine/api` (graafi koostamine koodis, arvutatud geomeetria
tagasilugemine) ja `@knowvah/dot-engine/render` (mitmevormingu väljund ning
toored joonistusoperatsioonid). Iga allolev funktsioon eksporditakse uuesti ka
juurpaketist (`export * from './api/index.js'` /
`export * from './render/index.js'` failis `src/index.ts`) — kõige importimine
paketist `@knowvah/dot-engine` töötab, kuid alamteega impordid on selgemad selles,
millist kihti te puudutate.

## `@knowvah/dot-engine` (juur)

### `renderSvg`

```ts
function renderSvg(dotSource: string, engine: EngineName): string;
```

Parsib DOT-lähtekoodi, käivitab nimetatud [paigutusmootori](/et/guide/engines),
renderdab SVG-ks ja tagastab SVG-sõne. See on ühe kutsega mugavusümbris: see
loob `GvcContext`-i, registreerib kaheksa sisseehitatud mootorit ja SVG-renderdaja,
paigutab, renderdab ja vabastab paigutuse — kui vajate neid samme eraldatuna,
vt allpool [`GvcContext` / `renderWithContext`](#gvccontext-renderwithcontext).

- **`dotSource`** — DOT-keeles graafi lähtekood.
- **`engine`** — `EngineName`: üks sisseehitatud mootoritest (`dot`, `neato`,
  `fdp`, `sfdp`, `circo`, `twopi`, `osage`, `patchwork`) või mis tahes
  eraldi registreeritud nimi.
- **Viskab** `DotEngineError`-i mis tahes sisendiprobleemi korral: `ParseError`,
  kui `dotSource` on kehtetu, `RenderError`, kui paigutus või renderdamine
  ebaõnnestub, `InternalError` (koos `cause`-iga) dot-engine'i vea korral.
  `TypeError`-i koodiga `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`, kui
  `dotSource` või `engine` on kehtetu (sh mootorinimi, mis ei ole registreeritud).
  Vt [Vead ja erandid](/et/guide/errors).

Täielik signatuur, JSDoc ja `GvError` väljade loend: [Teatmik](/reference/).

### `tryRenderSvg` / `RenderResult`

```ts
function tryRenderSvg(dotSource: string, engine: EngineName): RenderResult;
```

`renderSvg`-i tulemustüüpi õde. Tagastab (ei viska kunagi) mis tahes DOT-sisendi
korral: `{ svg }` edu korral või `{ errors: [one] }` esimese ebaõnnestumise korral;
`svg` ja `errors` välistavad teineteist. Viskab ainult kehtetute argumentide
korral (`TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`). Iga kirje
väljal `errors` on tavaline JSON-iks serialiseeritav andmeobjekt (`type`, `code`,
`message`, `friendlyMessage`, pluss `location` / `expected`, kui need on olemas;
ei mingit `cause`-i ega pinujälge), seega on seda ohutu saata üle
worker/postMessage piiri või serialiseerida logisse. Eelistage seda
`renderSvg` + `try`/`catch` asemel, kui kutsuja soovib hargneda `code` / `type`
järgi, mitte erandit püüda. Vt [Vead ja erandid](/et/guide/errors).
[Teatmik](/reference/).

### `parse` / `ParseError`

```ts
function parse(dotSource: string): Graph;
```

Parsib DOT-i mälusiseseks graafimudeliks **ilma** seda paigutamata. Kasulik
graafi kontrollimiseks või teisendamiseks — või selle andmiseks
`@knowvah/dot-engine/api` funktsioonile `getLayout` / `@knowvah/dot-engine/render`
funktsioonile `render` — enne renderdamist.

- **Viskab** `ParseError`-i süntaksivigade või serva suuna rikkumiste korral (nt
  `->` suunamata graafis). `ParseError` laiendab `DotEngineError`-it ja
  implementeerib `GvError`-i väärtusega `type: 'syntax'`; sellel on
  `location: { line, column, offset? }`. `TypeError` `ERR_INVALID_ARG_TYPE`, kui
  `dotSource` ei ole sõne. [Vead ja erandid](/et/guide/errors),
  [Teatmik](/reference/).

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

`instanceof DotEngineError` tähendab, et dot-engine ebaõnnestus selle sisendi
peal. `RenderError` katab teadaolevad paigutus-/renderdusvead (`type` on
`semantic` koodide `UNKNOWN_LAYOUT` ja `UNSUPPORTED_FEATURE` korral).
`InternalError` on dot-engine'i viga; `cause` hoiab algset viga, kui see
mähiti. Kutsuja eksimused viskavad selle asemel standardse `TypeError`-i /
`RangeError`-i / `Error`-i koos `code`-iga. `isGvError` kontrollib sõne-`type`-i
ja `code`-i olemasolu, seega töötab see üle dubleeritud komplektide. Iga koodi
ja selle kohta, mida iga funktsioon visata võib, vt
[Vead ja erandid](/et/guide/errors), `GvError`-i kuju kohta [Tüübid](/et/guide/types)
ning `GvErrorCode`-i liikmete loendi kohta [Teatmik](/reference/).

### `setTextMeasurer` / `getTextMeasurer`

```ts
function setTextMeasurer(measurer: TextMeasurer | null): void;
function getTextMeasurer(): TextMeasurer;
```

Registreerib (või tühistab väärtusega `null`) protsessiülese tekstimõõtja, mida
paigutuse ajal siltide suuruse määramiseks küsitakse. Tühistamine taastab
teegi vaikeväärtuse (brauser: `CanvasTextMeasurer`; peata/Node:
`EstimateTextMeasurer`, välja arvatud juhul, kui LUT-mõõtja on ühendatud — täieliku
lahendusjärjekorra ning nende funktsioonidega koos eksporditud
`CanvasTextMeasurer` / `EstimateTextMeasurer` / `LutTextMeasurer` teostuste
kohta vt [Teksti mõõtmine](/et/guide/text-measurement)).
[Teatmik](/reference/).

### `setImageSizer` / `setImageResolver`

Kaks seotud, kuid erinevat pildikonfiguratsiooni liidespunkti — mõlemad on
protsessiülesed registrid sama mustriga (registreeri tagasikutse, tühistamiseks
anna `null`), mõlemad ei tee midagi, kuni kutsuja ühe registreerib:

- **`setImageSizer`** — teatab välise pildi *omamõõtmed*, et paigutusmootor
  saaks enne renderdamist reserveerida ruumi HTML-i `<IMG>`-lahtrile või sõlme
  atribuudile `image=`. `null` tagastamine (või sizeri registreerimata jätmine)
  taasloob natiivse Graphvizi puuduva pildi käitumise: hoiatus ja nullsuurus.
- **`setImageResolver`** (uus — vt allpool [`inlineImages`](#inlineimages)) —
  annab tegelikud pildi *baidid*, et SVG-renderdaja saaks need `data:`
  URI-na sisse liita, selle asemel et väljastada `xlink:href="src"` toorelt
  läbilastuna.

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;
function setImageSizer(sizer: ImageSizer | null): void;

type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;
function setImageResolver(fn: ImageResolver | null): void;
```

`ImageResolver` võib tagastada paljas `Uint8Array` (MIME tuletatakse `src`-i
faililaiendist — `.png`, `.jpg`/`.jpeg`, `.gif`, `.svg`, `.webp`; kõik muu
taandub väärtusele `application/octet-stream`) või `{ bytes, mime }`, et MIME-tüüp
selgesõnaliselt määrata. Tagastage `null`, kui `src`-i ei saa lahendada —
renderdaja taandub toorele `src`-i läbilaskele, nagu poleks resolverit
registreeritud. Resolveri registreerimine ei mõjuta iseenesest midagi; seda
küsitakse ainult siis, kui `render`-i valik `inlineImages` on `true` (allpool).
Töönäite kohta vt [Piltidega töötamine](/et/guide/images) ning mõlema
tagasikutse tüübi kohta [Teatmik](/reference/).

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

`renderSvgAsync` on `renderSvg`-i asünkroonne vaste: see eellaeb graafi vajatavad
veebifondid ja pildiandmed, seejärel paigutab ja renderdab. `renderSvgInto`
renderdab ja asendab elemendi id-ga `id` lapsed, puhastades SVG vaikimisi
(`trusted: true` jätab selle vahele; `sanitize` asendab sisseehitatud puhastaja).
Ebaõnnestumised, sh vigased argumendid, on lubaduse tagasilükkamised samade
veaklassidega nagu `renderSvg`-il; puuduva elemendi id tagasilükkab koodiga
`ERR_INVALID_ARG_VALUE`. Fondiprobleemid ei lükka kunagi tagasi; need tulevad
tagasi väljal `fontIssues`. Vt [Kasutamine brauseris](/et/guide/browser) ja
[Piltidega töötamine](/et/guide/images) ning [Teatmik](/reference/).

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

Madalama taseme orkestreerimine kutsujatele, kes peavad paigutust ja
renderdamist eraldi sammudena juhtima. `renderSvg` on mugavusümbris just selle
kohal: loo kontekst, registreeri mootorid/renderdajad, `layout`,
`renderWithContext`, `freeLayout`. Haarake nende järele otse ainult siis, kui
vajate seda kontrolli — näiteks et registreerida mootorite alamhulk, lisada
oma `LayoutEngine` või `RendererPlugin` või renderdada sama paigutatud graaf
mitmesse vormingusse paigutust uuesti käivitamata (kutsuge `layout` üks kord,
seejärel `renderWithContext` iga vormingu jaoks, seejärel `freeLayout`).
[Teatmik](/reference/).

## `@knowvah/dot-engine/api`

Programmiline koostamine, turvaline serva lisamine ja arvutatud geomeetria
väljalugemine — kiht graafi koostamiseks ilma DOT-teksti käsitsi kirjutamata ja
selle paigutuse tavaandmetena tagasilugemiseks. `LayoutSnapshot`-i ja selle
pesastatud kujude kohta vt [Tüübid](/et/guide/types).

### `createGraph`

```ts
function createGraph(opts?: {
  directed?: boolean;
  strict?:   boolean;
  name?:     string;
}): GvGraphBuilder;
```

Loob värske graafi, mis on valmis üleandmiseks funktsioonidele `render` /
`getLayout` / `getDrawOps`. Vaikeväärtused: `directed: true`, `strict: false`,
`name: ''`. Tagastab `GvGraphBuilder`-i — `addNode`, `addEdge`, `addSubgraph`,
`setAttr`/`getAttr`, `setHtmlAttr` (HTML-tabelisiltide jaoks) ning omaduse
`.graph`, mis paljastab läbipaistmatu `Graph`-käepideme. Vt
[Graafi koostamine koodis](/et/guide/build-a-graph) ning täielike
`GvGraphBuilder`/`GvNode`/`GvEdge` liideste kohta [Teatmik](/reference/).

### `addEdge`

```ts
function addEdge(g: Graph, tail: Node, head: Node, name?: string): Edge;
```

Madalama taseme serva lisamise abifunktsioon, mis on `GvGraphBuilder.addEdge`-i
aluseks — eksporditud otse kutsujatele, kes töötavad sisemiste
`Node`/`Edge`-viidetega (nt servad, mis on lisatud `parse()`-i tagastatud
graafile), mitte koostaja läbipaistmatute `GvNode`/`GvEdge` käepidemetega.
Enamik kutsujaid peaks selle asemel kasutama
`createGraph(...).addEdge(tail, head, attrs?)`.

- **`name`** — serva võti; vaikimisi `''` (anonüümne). Strict-graafi
  dedubleerimisel eiratakse, mis sobitab ainult `(tail, head)` järgi
  (suunamata graafide puhul sümmeetriliselt).
- **Tagastab** uue serva või olemasoleva, kui `g` on strict ja serv
  `(tail, head)` on juba olemas (peegeldab `agedge`-i väärtusega `cflag=1`).

Vt [Graafi koostamine koodis](/et/guide/build-a-graph) ja
[Teatmik](/reference/).

### `getLayout`

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

Tagastab graafi arvutatud geomeetria tavalise, JSON-iks serialiseeritava
hetktõmmise — sõlmede positsioonid, servade splaini kontrollpunktid, servasildid,
klastrite piirdekastid ja graafi üldised piirid — kõik punktides.

- **`g`** — peab olema juba paigutatud (läbi `render(g, ...)`, `getDrawOps(g)` või
  `ctx.layout(g, engine)`); `getLayout` kutsumine veel paigutamata graafi peal
  viskab, selle asemel et vaikselt anda tagasi nullgeomeetriat.
- **`opts.yAxis`** — vaikimisi `'down'`: ekraanikoordinaadid, alguspunkt vasakul
  üleval, y kasvab allapoole ning `bounds` on normaliseeritud väärtusele
  `(0, 0)`. `'up'` tagastab natiivsed Graphvizi koordinaadid (alguspunkt vasakul
  all, y kasvab ülespoole), kus `bounds.x`/`bounds.y` on toores vasak alumine
  nurk.
- **Viskab** `Error`-i koodiga `ERR_INVALID_STATE`, kui `g` ei ole paigutatud;
  `TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` vigase `g` või
  `opts` korral. Vt [Vead ja erandid](/et/guide/errors).

Sõlme `width`/`height` teisendatakse punktideks (sisemine mudel salvestab
tollides); iga muu koordinaat on juba punktides. Koordinaatsüsteemi kirjelduse
leiate jaotisest [Arvutatud geomeetria lugemine](/et/guide/geometry), täielikud
väljaloendid `LayoutSnapshot`, `NodeGeometry`, `EdgeGeometry`, `ClusterGeometry`
ja `BoundsGeometry` kohta aga jaotistest [Tüübid](/et/guide/types) ja
[Teatmik](/reference/).

### `Graph`

Läbipaistmatu käepidemetüüp, mis on sisemisest mudelist uuesti eksporditud.
Paljastatakse ainult *tüüp* (mitte muudetav klass) — annoteerige sellega
muutuja, mis hoiab koostaja `.graph`-i või `parse()` tulemust, kuid ärge
konstrueerige ega kontrollige selle välju otse; kasutage oleku tagasilugemiseks
koostajat, `getLayout`-i või `getDrawOps`-i. [Teatmik](/reference/).

## `@knowvah/dot-engine/render`

Mitmevormingu väljund ja toorete joonistusoperatsioonide juurdepääs — kiht juba
`parse`-itud või koostajaga loodud graafi renderdamiseks.

### `render`

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  RenderOptions,
): string;
```

Paigutab graafi ja renderdab selle nõutud vormingu sõneks.

- **`format`** — `OutputFormat`: `'svg' | 'dot' | 'xdot' | 'json' | 'plain' |
  'plain-ext' | 'imap' | 'cmapx'`.
- **`opts.engine`** — paigutusmootor (vaikimisi `'dot'`).
- **`opts.inlineImages`** — vt [allpool](#inlineimages).
- **Viskab** `RenderError`-i paigutus- või renderdusvea korral; `InternalError`-i
  dot-engine'i vea korral; `TypeError`-i koos `code`-iga kehtetute argumentide
  korral (sh registreerimata mootor või vorming). Vt
  [Vead ja erandid](/et/guide/errors).

`opts.engine` peegeldab `renderSvg`-i parameetrit `engine`; `format` on telg,
mida `renderSvg` ei paljasta (`renderSvg` on kõvakodeeritud väärtusele `'svg'`).
Vt [Renderdamine teistesse vormingutesse](/et/guide/render-formats) ning täieliku
liidu `OutputFormat` ja kuju `RenderOptions` kohta [Teatmik](/reference/).

#### `inlineImages`

`RenderOptions.inlineImages` (vaikimisi `false`) liidab välised pildid sisse
`data:` URI-dena, selle asemel et väljastada toores `xlink:href="src"`
läbilaskmine. See ei mõjuta midagi, kui resolverit ei ole registreeritud
`setImageResolver`-iga (ülal) — ega mõjuta mitte-SVG vorminguid. Määramata
jätmisel on väljund baidi-baidilt identne sellega, mis oli enne selle valiku
olemasolu.

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

Täieliku juhendi, sh brauseris `fetch`-ist ja Node'is failisüsteemist
lahendamise kohta vt [Piltidega töötamine](/et/guide/images).

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

`render`-i asünkroonne vaste: samad vormingud ning valikud `engine`/`inlineImages`,
pluss kutsepõhised asünkroonsed pildikonksud ja fondi eellaadimine. Iga pildikonks
käivitatakse iga erineva `src`-i kohta kõige rohkem üks kord; viskamine või
tagasilükkamine on möödalask. Väljund on märgendivormingute puhul
puhastamata märgend; vt README jaotist „Security“.

### `getDrawOps` / `DEFAULT_DRAW_ENGINE`

```ts
const DEFAULT_DRAW_ENGINE: EngineName; // 'dot'

function getDrawOps(g: Graph, opts?: { engine?: EngineName }): XdotOp[];
```

Paigutab `g`, renderdab xdot-vormingusse ja tagastab lameda, tüübitud
joonistusoperatsioonide massiivi — sõlmekujud, tekstilõigud, värvid ja fondid
diskrimineeritud liidu väärtustena (kitsendage `switch`-is `op.kind` järgi) —
oma canvase/WebGL-i/PDF-i renderdaja toitmiseks ilma SVG-d või xdot-i
sõnekodeeringut puudutamata. `opts.engine` on vaikimisi `DEFAULT_DRAW_ENGINE`
(`'dot'`).

- **Viskab** `ParseError`-i, kui vahepealset xdot-väljundit ei saa uuesti parsida
  (dot-engine'i viga; praktikas ei ole oodata); `RenderError`-i
  paigutus-/renderdusvea korral; `InternalError`-i mis tahes muu dot-engine'i vea
  korral; `TypeError`-i koos `code`-iga kehtetute argumentide korral. Vt
  [Vead ja erandid](/et/guide/errors).

Operatsiooniliikide loendi ja töönäitega canvase kohta vt
[Oma renderdus xdot-iga](/et/guide/xdot-drawops) ning täieliku liidu `XdotOp` ja
kujude `Xdot`/`XdotColor` kohta [Tüübid](/et/guide/types) ja
[Teatmik](/reference/).
