---
sourceHash: e2e54229b04c577dfb514c415c7f02fd786b797b5bfc7a4bbf2e4192d03d0c09
---

# API-viite

Julkinen rajapinta on tarkoituksella pieni. Useimmat kutsujat tarvitsevat vain
`renderSvg`-funktiota. Katso [Yleiskatsaus](/fi/guide/overview), mitä
sisääntulopistettä kannattaa käyttää, [Tyypit](/fi/guide/types), minkä muotoisia
arvoja kukin funktio ottaa vastaan ja palauttaa, sekä generoitu
[Viite](/reference/) tyhjentävistä allekirjoituksista, kaikista kentistä ja
kaikista ylikuormituksista.

> Tyyppimäärittelyt (`.d.ts`) tuotetaan komennolla `npm run build`
> (`build:types`-vaihe ajaa `tsc -p tsconfig.build.json`). `package.json`:n
> `exports`-kartta kytkee `types`-ehdot kullekin sisääntulopisteelle, joten
> `@knowvah/dot-engine`, `@knowvah/dot-engine/api` ja `@knowvah/dot-engine/render`
> kaikki ratkaisevat tyypit editoreissa ja jatkokoontiversioissa.
>
> Koontiversio tuottaa myös määrittelykartat (`.d.ts.map`) ja JS-lähdekartat, ja
> paketti toimittaa omat `src/`-lähteensä — joten "siirry määrittelyyn" hyppää
> suoraan oikeaan TypeScriptiin, mikä tekee koodin lukemisesta ja PR:n
> avaamisesta helppoa.

Tämä sivu on jäsennelty kolmen sisääntulopisteen mukaan
([Yleiskatsaus](/fi/guide/overview) kertoo, milloin mitäkin kannattaa käyttää):
juuripaketti `@knowvah/dot-engine` (jäsennys + renderöinti yhdellä kutsulla sekä
prosessikohtainen globaali konfiguraatio), `@knowvah/dot-engine/api` (graafin
rakentaminen koodissa, lasketun geometrian lukeminen takaisin) ja
`@knowvah/dot-engine/render` (monimuototuloste ja raa'at piirto-operaatiot).
Jokainen alla oleva funktio uudelleenviedään myös juuripaketista
(`export * from './api/index.js'` / `export * from './render/index.js'`
tiedostossa `src/index.ts`) — kaiken tuonti paketista `@knowvah/dot-engine`
toimii, mutta alipolkutuonnit ovat eksplisiittisempiä siitä, mihin kerrokseen
kosket.

## `@knowvah/dot-engine` (juuri)

### `renderSvg`

```ts
function renderSvg(dotSource: string, engine: EngineName): string;
```

Jäsentää DOT-lähdekoodin, ajaa nimetyn [asettelumoottorin](/fi/guide/engines),
renderöi SVG:ksi ja palauttaa SVG-merkkijonon. Tämä on yhden kutsun
apufunktio: se luo `GvcContext`-olion, rekisteröi kahdeksan sisäänrakennettua
moottoria ja SVG-renderöijän, asettelee, renderöi ja vapauttaa asettelun —
katso alta [`GvcContext` / `renderWithContext`](#gvccontext-renderwithcontext),
jos tarvitset nämä vaiheet erillisinä.

- **`dotSource`** — DOT-kielinen graafin lähdekoodi.
- **`engine`** — `EngineName`: jokin sisäänrakennetuista (`dot`, `neato`, `fdp`,
  `sfdp`, `circo`, `twopi`, `osage`, `patchwork`) tai mikä tahansa
  mukautettuna rekisteröity nimi.
- **Heittää** `DotEngineError`-virheen mistä tahansa syötteen ongelmasta:
  `ParseError`, jos `dotSource` on virheellinen, `RenderError`, jos asettelu
  tai renderöinti epäonnistuu, `InternalError` (`cause`-kentällä) dot-enginen
  virheestä. `TypeError`, jonka `code` on `ERR_INVALID_ARG_TYPE` /
  `ERR_INVALID_ARG_VALUE`, jos `dotSource` tai `engine` on virheellinen
  (mukaan lukien moottorin nimi, jota ei ole rekisteröity). Katso
  [Virheet ja poikkeukset](/fi/guide/errors).

Täysi allekirjoitus, JSDoc ja `GvError`-kenttäluettelo: [Viite](/reference/).

### `tryRenderSvg` / `RenderResult`

```ts
function tryRenderSvg(dotSource: string, engine: EngineName): RenderResult;
```

`renderSvg`-funktion tulosvakoinen sisarfunktio. Palauttaa (ei koskaan heitä)
mille tahansa DOT-syötteelle: `{ svg }` onnistuessaan tai `{ errors: [one] }`
ensimmäisestä epäonnistumisesta; `svg` ja `errors` ovat toisensa poissulkevia.
Se heittää vain virheellisistä argumenteista (`TypeError`
`ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`). Jokainen `errors`-merkintä on
tavallista, JSON-serialisoitavaa dataa (`type`, `code`, `message`,
`friendlyMessage` sekä `location` / `expected`, kun ne ovat saatavilla; ei
`cause`-kenttää, ei pinojälkeä), joten sen voi turvallisesti lähettää
worker-/postMessage-rajan yli tai serialisoida lokiin. Suosi tätä
`renderSvg` + `try`/`catch` -yhdistelmän sijaan, kun kutsuja haluaa haarautua
`code`- / `type`-arvon perusteella poikkeuksen nappaamisen sijaan. Katso
[Virheet ja poikkeukset](/fi/guide/errors).
[Viite](/reference/).

### `parse` / `ParseError`

```ts
function parse(dotSource: string): Graph;
```

Jäsentää DOT-lähdekoodin muistissa olevaksi graafimalliksi ilman asettelua
(**ei** asettele sitä). Hyödyllinen graafin tarkasteluun tai muokkaamiseen —
tai sen välittämiseen `@knowvah/dot-engine/api`:n `getLayout`- /
`@knowvah/dot-engine/render`:n `render`-funktiolle — ennen renderöintiä.

- **Heittää** `ParseError`-virheen syntaksivirheistä tai kaarten suuntarikkomuksista
  (esim. `->` suuntaamattomassa graafissa). `ParseError` laajentaa
  `DotEngineError`-luokkaa ja toteuttaa `GvError`-rajapinnan arvolla
  `type: 'syntax'`; se kantaa kentän `location: { line, column, offset? }`.
  `TypeError` `ERR_INVALID_ARG_TYPE`, jos `dotSource` ei ole merkkijono.
  [Virheet ja poikkeukset](/fi/guide/errors), [Viite](/reference/).

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

`instanceof DotEngineError` tarkoittaa, että dot-engine epäonnistui tällä
syötteellä. `RenderError` kattaa tunnetut asettelu-/renderöintivirheet (`type`
on `semantic` arvoille `UNKNOWN_LAYOUT` ja `UNSUPPORTED_FEATURE`).
`InternalError` on dot-enginen virhe; `cause` sisältää alkuperäisen virheen,
jos sellainen kääriytyi. Kutsujan virheet heittävät sen sijaan tavallisen
`TypeError`-/`RangeError`-/`Error`-virheen, jolla on `code`. `isGvError`
tarkistaa merkkijonomuotoisen `type`- ja `code`-kentän, joten se toimii
päällekkäisten bundlejen yli. Katso
[Virheet ja poikkeukset](/fi/guide/errors) kaikista koodeista ja siitä, mitä
kukin funktio voi heittää, [Tyypit](/fi/guide/types) `GvError`-muodosta ja
[Viite](/reference/) `GvErrorCode`-tyypin jäsenluettelosta.

### `setTextMeasurer` / `getTextMeasurer`

```ts
function setTextMeasurer(measurer: TextMeasurer | null): void;
function getTextMeasurer(): TextMeasurer;
```

Rekisteröi (tai tyhjentää arvolla `null`) prosessikohtaisen globaalin
tekstinmittaajan, jota asettelu käyttää selitteiden mitoittamiseen.
Tyhjentäminen palauttaa kirjaston oletuksen (selain: `CanvasTextMeasurer`;
päätön/Node: `EstimateTextMeasurer`, ellei LUT-mittaajaa ole kytketty — katso
[Tekstin mittaus](/fi/guide/text-measurement) täydestä ratkaisujärjestyksestä
sekä näiden funktioiden rinnalla viedyistä `CanvasTextMeasurer`- /
`EstimateTextMeasurer`- / `LutTextMeasurer`-toteutuksista).
[Viite](/reference/).

### `setImageSizer` / `setImageResolver`

Kaksi toisiinsa liittyvää mutta erillistä kuvakonfiguraation liitäntäkohtaa —
molemmat prosessikohtaisia globaaleja rekisterejä, jotka noudattavat samaa
mallia (rekisteröi takaisinkutsu, tyhjennä välittämällä `null`), ja molemmat
ovat tyhjiä operaatioita, kunnes kutsuja rekisteröi sellaisen:

- **`setImageSizer`** — ilmoittaa ulkoisen kuvan *luontaiset mitat*, jotta
  asettelumoottori voi varata tilaa HTML-`<IMG>`-solulle tai solmun
  `image=`-attribuutille ennen renderöintiä. `null`:n palauttaminen (tai
  mittaajan rekisteröimättä jättäminen) toistaa natiivin Graphvizin
  puuttuvan kuvan käyttäytymisen: varoituksen ja nollakoon.
- **`setImageResolver`** (uusi — katso [`inlineImages`](#inlineimages) alla) —
  toimittaa varsinaiset kuvan *tavut*, jotta SVG-renderöijä voi upottaa ne
  `data:`-URI:ksi sen sijaan, että se lähettäisi `xlink:href="src"` raakana
  läpivientinä.

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;
function setImageSizer(sizer: ImageSizer | null): void;

type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;
function setImageResolver(fn: ImageResolver | null): void;
```

`ImageResolver` voi palauttaa pelkän `Uint8Array`-arvon (MIME päätellään
`src`:n tiedostopäätteestä — `.png`, `.jpg`/`.jpeg`, `.gif`, `.svg`, `.webp`;
mikä tahansa muu palautuu arvoon `application/octet-stream`) tai
`{ bytes, mime }` MIME-tyypin asettamiseksi eksplisiittisesti. Palauta `null`,
kun `src`:ää ei voi ratkaista — renderöijä palaa raakaan `src`-läpivientiin,
aivan kuin ratkaisijaa ei olisi rekisteröity. Ratkaisijan rekisteröinnillä ei
ole yksinään vaikutusta; sitä käytetään vain, kun `render`-funktion
`inlineImages`-valitsin on `true` (alla). Katso
[Kuvien käyttö](/fi/guide/images) esimerkkitoteutuksesta ja
[Viite](/reference/) molempien takaisinkutsutyyppien osalta.

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

`renderSvgAsync` on `renderSvg`-funktion asynkroninen vastine: se esihakee
graafin tarvitsemat verkkofontit ja kuvadatan ja sitten asettelee ja
renderöi. `renderSvgInto` renderöi ja korvaa elementin, jonka tunniste on `id`,
lapsisolmut, ja puhdistaa SVG:n oletuksena (`trusted: true` ohittaa
puhdistuksen; `sanitize` korvaa sisäänrakennetun puhdistimen). Epäonnistumiset,
virheelliset argumentit mukaan lukien, ovat promisen hylkäyksiä samoilla
virheluokilla kuin `renderSvg`-funktiossa; puuttuva elementin tunniste hylkää
arvolla `ERR_INVALID_ARG_VALUE`. Fonttiongelmat eivät koskaan hylkää; ne
palautuvat `fontIssues`-kentässä. Katso
[Käyttö selaimessa](/fi/guide/browser) ja [Kuvien käyttö](/fi/guide/images)
sekä [Viite](/reference/).

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

Alemman tason orkestrointi kutsujille, jotka tarvitsevat asettelun ja
renderöinnin ohjausta erillisinä vaiheina. `renderSvg` on tarkalleen tämän
päällä oleva apufunktio: luo konteksti, rekisteröi moottorit/renderöijät,
`layout`, `renderWithContext`, `freeLayout`. Käytä näitä suoraan vain, kun
tarvitset tätä hallintaa — esimerkiksi rekisteröidäksesi vain osan
moottoreista, lisätäksesi oman `LayoutEngine`- tai `RendererPlugin`-liitännäisen
tai renderöidäksesi saman asettelun saaneen graafin useaan muotoon ilman
asettelun ajamista uudelleen (kutsu `layout` kerran, sitten
`renderWithContext` kullekin muodolle ja lopuksi `freeLayout`).
[Viite](/reference/).

## `@knowvah/dot-engine/api`

Ohjelmallinen rakentaminen, turvallinen kaarten lisäys ja lasketun geometrian
luku — kerros graafin rakentamiseen ilman käsin kirjoitettua DOT-tekstiä ja sen
asettelun lukemiseen takaisin tavallisena datana. Katso [Tyypit](/fi/guide/types)
`LayoutSnapshot`-tyypistä ja sen sisäkkäisistä muodoista.

### `createGraph`

```ts
function createGraph(opts?: {
  directed?: boolean;
  strict?:   boolean;
  name?:     string;
}): GvGraphBuilder;
```

Luo tuoreen graafin, joka on valmis luovutettavaksi funktioille `render` /
`getLayout` / `getDrawOps`. Oletukset: `directed: true`, `strict: false`,
`name: ''`. Palauttaa `GvGraphBuilder`-olion — `addNode`, `addEdge`,
`addSubgraph`, `setAttr`/`getAttr`, `setHtmlAttr` (HTML-taulukkoselitteille)
sekä `.graph`-ominaisuuden, joka paljastaa läpinäkymättömän `Graph`-kahvan.
Katso [Graafin rakentaminen koodissa](/fi/guide/build-a-graph) ja
[Viite](/reference/) täydellisistä `GvGraphBuilder`-/`GvNode`-/`GvEdge`-
rajapinnoista.

### `addEdge`

```ts
function addEdge(g: Graph, tail: Node, head: Node, name?: string): Edge;
```

Alemman tason kaaren lisäyksen apufunktio `GvGraphBuilder.addEdge`:n taustalla
— viety suoraan kutsujille, jotka työskentelevät sisäisten
`Node`-/`Edge`-viitteiden kanssa (esim. kaaret, jotka lisätään `parse()`-
funktion palauttamaan graafiin) rakentajan läpinäkymättömien
`GvNode`-/`GvEdge`-kahvojen sijaan. Useimpien kutsujien tulisi käyttää
sen sijaan `createGraph(...).addEdge(tail, head, attrs?)`.

- **`name`** — kaaren avain; oletuksena `''` (nimetön). Ohitetaan strict-
  graafin deduplikoinnissa, joka vertaa vain parin `(tail, head)` perusteella
  (suuntaamattomissa graafeissa symmetrisesti).
- **Palauttaa** uuden kaaren tai olemassa olevan, jos `g` on strict ja
  `(tail, head)`-kaari on jo olemassa (jäljittelee `agedge`-funktiota arvolla
  `cflag=1`).

Katso [Graafin rakentaminen koodissa](/fi/guide/build-a-graph) ja
[Viite](/reference/).

### `getLayout`

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

Palauttaa tavallisen, JSON-serialisoitavan tilannekuvan graafin lasketusta
geometriasta — solmujen sijainnit, kaarten splinen ohjauspisteet, kaarten
selitteet, klusterien rajauslaatikot ja koko graafin rajat — kaikki pisteinä.

- **`g`** — täytyy olla jo asettelun saanut (`render(g, ...)`, `getDrawOps(g)`
  tai `ctx.layout(g, engine)` kautta); `getLayout`-kutsu graafille, jota ei ole
  vielä asetettu, heittää virheen eikä hiljaa palauta pelkkiä nollia sisältävää
  geometriaa.
- **`opts.yAxis`** — oletus `'down'`: näyttökoordinaatit, origo vasemmassa
  yläkulmassa, y kasvaa alaspäin, ja `bounds` normalisoidaan arvoon `(0, 0)`.
  `'up'` palauttaa natiivit Graphviz-koordinaatit (origo vasemmassa
  alakulmassa, y kasvaa ylöspäin), ja `bounds.x`/`bounds.y` ovat raa'assa
  vasemmassa alakulmassa.
- **Heittää** `Error`-virheen, jonka `code` on `ERR_INVALID_STATE`, jos `g`:tä
  ei ole asetettu; `TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`
  virheelliselle `g`:lle tai `opts`:lle. Katso
  [Virheet ja poikkeukset](/fi/guide/errors).

Solmun `width`/`height` muunnetaan pisteiksi (sisäinen malli tallentaa
tuumina); kaikki muut koordinaatit ovat jo pisteinä. Katso
[Lasketun geometrian lukeminen](/fi/guide/geometry) koordinaatistokuvauksesta
sekä [Tyypit](/fi/guide/types) / [Viite](/reference/) täydellisistä
`LayoutSnapshot`-, `NodeGeometry`-, `EdgeGeometry`-, `ClusterGeometry`- ja
`BoundsGeometry`-kenttäluetteloista.

### `Graph`

Läpinäkymätön kahvatyyppi, joka on viety uudelleen sisäisestä mallista. Vain
*tyyppi* on esillä (ei muokattavaa luokkaa) — merkitse sillä muuttuja, joka
sisältää rakentajan `.graph`-arvon tai `parse()`-tuloksen, mutta älä rakenna
tai tarkastele sen kenttiä suoraan; käytä rakentajaa, `getLayout`- tai
`getDrawOps`-funktiota tilan lukemiseen takaisin. [Viite](/reference/).

## `@knowvah/dot-engine/render`

Monimuototuloste ja raaka piirto-operaatioiden käyttö — kerros jo
`parse`:lla jäsennetyn tai rakentajalla muodostetun graafin renderöintiin.

### `render`

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  RenderOptions,
): string;
```

Asettelee ja renderöi graafin pyydettyyn muotoon merkkijonoksi.

- **`format`** — `OutputFormat`: `'svg' | 'dot' | 'xdot' | 'json' | 'plain' |
  'plain-ext' | 'imap' | 'cmapx'`.
- **`opts.engine`** — asettelumoottori (oletus `'dot'`).
- **`opts.inlineImages`** — katso [alla](#inlineimages).
- **Heittää** `RenderError`-virheen asettelun tai renderöinnin
  epäonnistuessa; `InternalError`-virheen dot-enginen virheessä; `TypeError`-
  virheen, jolla on `code`, virheellisistä argumenteista (mukaan lukien
  rekisteröimätön moottori tai muoto). Katso
  [Virheet ja poikkeukset](/fi/guide/errors).

`opts.engine` vastaa `renderSvg`-funktion `engine`-parametria; `format` on akseli,
jota `renderSvg` ei tarjoa (`renderSvg` on kovakoodattu arvoon `'svg'`). Katso
[Renderöinti muihin muotoihin](/fi/guide/render-formats) ja
[Viite](/reference/) täydestä `OutputFormat`-unionista ja
`RenderOptions`-muodosta.

#### `inlineImages`

`RenderOptions.inlineImages` (oletus `false`) upottaa ulkoiset kuvat
`data:`-URI:ina raa'an `xlink:href="src"`-läpiviennin sijaan. Sillä ei ole
vaikutusta, ellei ratkaisijaa ole rekisteröity `setImageResolver`-funktiolla
(yllä) — eikä vaikutusta muihin kuin SVG-muotoihin. Asettamattomana tuloste on
tavu tavulta identtinen sen kanssa, mitä se oli ennen tämän valitsimen
olemassaoloa.

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

Katso [Kuvien käyttö](/fi/guide/images) täydestä oppaasta, mukaan lukien
ratkaiseminen `fetch`-kutsulla selaimessa ja tiedostojärjestelmästä Nodessa.

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

`render`-funktion asynkroninen vastine: samat muodot ja `engine`-/
`inlineImages`-valitsimet sekä kutsukohtaiset asynkroniset kuvakoukut ja
fonttien esihaku. Kukin kuvakoukku ajetaan enintään kerran kutakin erillistä
`src`-arvoa kohden; heitto tai hylkäys lasketaan huteriksi. Tuloste on
puhdistamatonta merkintäkieltä merkintäkielimuodoille; katso README:n
"Security"-osio.

### `getDrawOps` / `DEFAULT_DRAW_ENGINE`

```ts
const DEFAULT_DRAW_ENGINE: EngineName; // 'dot'

function getDrawOps(g: Graph, opts?: { engine?: EngineName }): XdotOp[];
```

Asettelee `g`:n, renderöi xdotiksi ja palauttaa tasaisen, tyypitetyn
piirto-operaatiotaulukon — solmujen muodot, tekstivälit, värit ja fontit
erottelevan unionin arvoina (kavenna `op.kind`:n mukaan `switch`-lauseessa) —
oman canvas-/WebGL-/PDF-renderöijän syöttämiseen koskematta SVG:hen tai
xdotin merkkijonokoodaukseen. `opts.engine` on oletuksena
`DEFAULT_DRAW_ENGINE` (`'dot'`).

- **Heittää** `ParseError`-virheen, jos välivaiheen xdot-tulostetta ei voi
  jäsentää uudelleen (dot-enginen virhe; ei odotettavissa käytännössä);
  `RenderError`-virheen asettelun/renderöinnin epäonnistuessa;
  `InternalError`-virheen mistä tahansa muusta dot-enginen virheestä;
  `TypeError`-virheen, jolla on `code`, virheellisistä argumenteista. Katso
  [Virheet ja poikkeukset](/fi/guide/errors).

Katso [Oma renderöinti xdotilla](/fi/guide/xdot-drawops) operaatiotyyppien
luettelosta ja läpikäydystä canvas-esimerkistä sekä [Tyypit](/fi/guide/types) /
[Viite](/reference/) täydestä `XdotOp`-unionista ja `Xdot`-/`XdotColor`-
muodoista.
