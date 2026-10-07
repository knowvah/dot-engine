---
sourceHash: e2e54229b04c577dfb514c415c7f02fd786b797b5bfc7a4bbf2e4192d03d0c09
---

# Referință API

Suprafața publică este intenționat mică. Majoritatea apelanților au nevoie
doar de `renderSvg`. Consultați [Prezentare generală](/ro/guide/overview)
pentru a afla ce punct de intrare să folosiți, [Tipuri](/ro/guide/types)
pentru formele pe care le consumă și le returnează fiecare funcție, iar
[Referința](/reference/) generată pentru semnături exhaustive, fiecare câmp și
fiecare supraîncărcare.

> Declarațiile de tipuri (`.d.ts`) sunt emise de `npm run build` (pasul
> `build:types` rulează `tsc -p tsconfig.build.json`). Harta `exports` din
> `package.json` leagă condițiile `types` pentru fiecare intrare, astfel că
> `@knowvah/dot-engine`, `@knowvah/dot-engine/api` și
> `@knowvah/dot-engine/render` își rezolvă toate tipurile în editoare și în
> build-urile din aval.
>
> Build-ul emite și hărți de declarații (`.d.ts.map`) și source maps JS, iar
> pachetul livrează sursele sale `src/` — astfel „go to definition” duce direct
> la TypeScript-ul real, ceea ce face ușoară citirea codului și deschiderea
> unui PR.

Această pagină este organizată după cele trei puncte de intrare
([Prezentare generală](/ro/guide/overview) explică când să recurgeți la
fiecare): pachetul rădăcină `@knowvah/dot-engine` (analizare + randare într-un
singur apel, plus configurare globală la nivel de proces),
`@knowvah/dot-engine/api` (construirea unui graf în cod, citirea geometriei
calculate) și `@knowvah/dot-engine/render` (ieșire în mai multe formate și
operații de desenare brute). Fiecare funcție de mai jos este reexportată și
din pachetul rădăcină (`export * from './api/index.js'` /
`export * from './render/index.js'` în `src/index.ts`) — importul tuturor
din `@knowvah/dot-engine` funcționează, dar importurile pe subcăi sunt mai
explicite despre stratul pe care îl atingeți.

## `@knowvah/dot-engine` (rădăcină)

### `renderSvg`

```ts
function renderSvg(dotSource: string, engine: EngineName): string;
```

Analizează sursa DOT, rulează [motorul de aranjare](/ro/guide/engines) numit,
randează în SVG și returnează șirul SVG. Acesta este învelișul de conveniență
dintr-un singur apel: construiește un `GvcContext`, înregistrează cele opt
motoare încorporate și randatorul SVG, aranjează, randează și eliberează
aranjarea — consultați mai jos
[`GvcContext` / `renderWithContext`](#gvccontext-renderwithcontext) dacă aveți
nevoie ca acești pași să fie separați.

- **`dotSource`** — codul sursă al grafului în limbajul DOT.
- **`engine`** — `EngineName`: unul dintre cele încorporate (`dot`, `neato`,
  `fdp`, `sfdp`, `circo`, `twopi`, `osage`, `patchwork`) sau orice nume
  înregistrat personalizat.
- **Aruncă** un `DotEngineError` pentru orice problemă legată de intrare:
  `ParseError` dacă `dotSource` este invalid, `RenderError` dacă aranjarea sau
  randarea eșuează, `InternalError` (cu `cause`) pentru un bug dot-engine. Un
  `TypeError` cu `code` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` dacă
  `dotSource` sau `engine` este invalid (inclusiv un nume de motor care nu este
  înregistrat). Consultați [Erori și excepții](/ro/guide/errors).

Semnătura completă, JSDoc și lista câmpurilor `GvError`:
[Referință](/reference/).

### `tryRenderSvg` / `RenderResult`

```ts
function tryRenderSvg(dotSource: string, engine: EngineName): RenderResult;
```

Echivalentul în stil „rezultat” al lui `renderSvg`. Returnează (nu aruncă
niciodată) pentru orice intrare DOT: `{ svg }` la succes sau `{ errors: [one] }`
la primul eșec; `svg` și `errors` se exclud reciproc. Aruncă doar pentru
argumente invalide (`TypeError` `ERR_INVALID_ARG_TYPE` /
`ERR_INVALID_ARG_VALUE`). Fiecare intrare din `errors` este un simplu set de
date serializabil în JSON (`type`, `code`, `message`, `friendlyMessage`, plus
`location` / `expected` când sunt prezente; fără `cause`, fără urmă de stivă),
deci poate fi trimisă în siguranță peste o graniță worker/postMessage sau
serializată într-un jurnal. Preferați această funcție în locul lui `renderSvg`
+ `try`/`catch` când apelantul dorește să ramifice după `code` / `type`, nu să
intercepteze o excepție. Consultați [Erori și excepții](/ro/guide/errors).
[Referință](/reference/).

### `parse` / `ParseError`

```ts
function parse(dotSource: string): Graph;
```

Analizează DOT în modelul de graf din memorie **fără** a-l aranja. Util pentru
inspectarea sau transformarea grafului — sau pentru a-l transmite lui
`getLayout` din `@knowvah/dot-engine/api` / lui `render` din
`@knowvah/dot-engine/render` — înainte de randare.

- **Aruncă** `ParseError` pentru erori de sintaxă sau încălcări ale direcției
  muchiilor (de exemplu `->` într-un graf neorientat). `ParseError` extinde
  `DotEngineError` și implementează `GvError` cu `type: 'syntax'`; poartă un
  `location: { line, column, offset? }`. `TypeError` `ERR_INVALID_ARG_TYPE`
  dacă `dotSource` nu este un șir. [Erori și excepții](/ro/guide/errors),
  [Referință](/reference/).

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

`instanceof DotEngineError` înseamnă că dot-engine a eșuat pe această intrare.
`RenderError` acoperă eșecurile cunoscute de aranjare/randare (`type` este
`semantic` pentru `UNKNOWN_LAYOUT` și `UNSUPPORTED_FEATURE`). `InternalError`
este un bug dot-engine; `cause` păstrează eroarea originală când una a fost
învelită. Greșelile apelantului aruncă în schimb un `TypeError` / `RangeError` /
`Error` standard cu un `code`. `isGvError` verifică existența unor `type` și
`code` de tip șir, deci funcționează între pachete duplicate. Consultați
[Erori și excepții](/ro/guide/errors) pentru fiecare cod și pentru ce poate
arunca fiecare funcție, [Tipuri](/ro/guide/types) pentru forma `GvError` și
[Referință](/reference/) pentru lista de membri a lui `GvErrorCode`.

### `setTextMeasurer` / `getTextMeasurer`

```ts
function setTextMeasurer(measurer: TextMeasurer | null): void;
function getTextMeasurer(): TextMeasurer;
```

Înregistrează (sau șterge, cu `null`) măsurătorul de text global la nivel de
proces, consultat în timpul aranjării pentru dimensionarea etichetelor. Ștergerea
revine la valoarea implicită a bibliotecii (browser: `CanvasTextMeasurer`;
fără interfață/Node: `EstimateTextMeasurer`, cu excepția cazului în care este
conectat un măsurător LUT — consultați [Măsurarea textului](/ro/guide/text-measurement)
pentru ordinea completă de rezolvare și pentru implementările
`CanvasTextMeasurer` / `EstimateTextMeasurer` / `LutTextMeasurer` exportate
alături de aceste funcții). [Referință](/reference/).

### `setImageSizer` / `setImageResolver`

Două puncte de extensie înrudite, dar distincte, pentru configurarea imaginilor
— ambele registre globale la nivel de proces, care urmează același tipar
(înregistrați un callback, transmiteți `null` pentru ștergere), ambele fără
efect până când un apelant înregistrează unul:

- **`setImageSizer`** — raportează *dimensiunile intrinseci* ale unei imagini
  externe, astfel încât motorul de aranjare să poată rezerva spațiu pentru o
  celulă HTML `<IMG>` sau pentru atributul `image=` al unui nod înainte de
  randare. Returnarea `null` (sau lipsa unui sizer înregistrat) reproduce
  comportamentul Graphviz nativ pentru imagine lipsă: un avertisment și
  dimensiune zero.
- **`setImageResolver`** (nou — vedeți mai jos [`inlineImages`](#inlineimages))
  — furnizează *octeții* efectivi ai imaginii, astfel încât randatorul SVG să
  îi poată insera direct ca URI `data:` în loc să emită `xlink:href="src"` ca
  trecere brută.

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;
function setImageSizer(sizer: ImageSizer | null): void;

type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;
function setImageResolver(fn: ImageResolver | null): void;
```

`ImageResolver` poate returna un `Uint8Array` simplu (MIME dedus din
extensia fișierului din `src` — `.png`, `.jpg`/`.jpeg`, `.gif`, `.svg`,
`.webp`; orice altceva revine la `application/octet-stream`) sau
`{ bytes, mime }` pentru a seta explicit tipul MIME. Returnați `null` când
`src` nu poate fi rezolvat — randatorul revine la trecerea brută a lui `src`,
ca și cum nu ar fi fost înregistrat niciun resolver. Înregistrarea unui
resolver nu are niciun efect prin ea însăși; este consultat doar când opțiunea
`inlineImages` a lui `render` este `true` (mai jos). Consultați
[Lucrul cu imagini](/ro/guide/images) pentru un exemplu detaliat și
[Referință](/reference/) pentru ambele tipuri de callback.

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

`renderSvgAsync` este corespondentul asincron al lui `renderSvg`: preîncarcă
fonturile web și datele de imagine de care are nevoie graful, apoi aranjează și
randează. `renderSvgInto` randează și înlocuiește copiii elementului cu id-ul
`id`, igienizând implicit SVG-ul (`trusted: true` omite igienizarea; `sanitize`
înlocuiește curățitorul încorporat). Eșecurile, inclusiv argumentele greșite,
sunt respingeri de promisiune cu aceleași clase de erori ca `renderSvg`; un id
de element lipsă respinge cu `ERR_INVALID_ARG_VALUE`. Problemele de fonturi nu
resping niciodată; se întorc în `fontIssues`. Consultați
[Utilizare în browser](/ro/guide/browser) și [Lucrul cu imagini](/ro/guide/images),
precum și [Referință](/reference/).

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

Orchestrare de nivel inferior pentru apelanții care trebuie să conducă
aranjarea și randarea ca pași separați. `renderSvg` este un înveliș de
conveniență tocmai peste aceasta: construiți un context, înregistrați
motoare/randatori, `layout`, `renderWithContext`, `freeLayout`. Recurgeți la
acestea direct doar când aveți nevoie de acest control — de exemplu, pentru a
înregistra un subset de motoare, a adăuga un `LayoutEngine` sau un
`RendererPlugin` personalizat ori pentru a randa același graf aranjat în mai
multe formate fără a relua aranjarea (apelați `layout` o dată, apoi
`renderWithContext` pentru fiecare format, apoi `freeLayout`).
[Referință](/reference/).

## `@knowvah/dot-engine/api`

Construire programatică, inserare sigură de muchii și citirea geometriei
calculate — stratul pentru construirea unui graf fără a scrie manual text DOT
și pentru citirea aranjării sale înapoi ca date simple. Consultați
[Tipuri](/ro/guide/types) pentru `LayoutSnapshot` și formele sale imbricate.

### `createGraph`

```ts
function createGraph(opts?: {
  directed?: boolean;
  strict?:   boolean;
  name?:     string;
}): GvGraphBuilder;
```

Creează un graf nou, gata de predat lui `render` / `getLayout` /
`getDrawOps`. Valori implicite: `directed: true`, `strict: false`, `name: ''`.
Returnează un `GvGraphBuilder` — `addNode`, `addEdge`, `addSubgraph`,
`setAttr`/`getAttr`, `setHtmlAttr` (pentru etichete de tip tabel HTML) și o
proprietate `.graph` care expune mânerul opac `Graph`. Consultați
[Construirea unui graf în cod](/ro/guide/build-a-graph) și
[Referință](/reference/) pentru interfețele complete
`GvGraphBuilder`/`GvNode`/`GvEdge`.

### `addEdge`

```ts
function addEdge(g: Graph, tail: Node, head: Node, name?: string): Edge;
```

Funcție ajutătoare de nivel inferior pentru inserarea muchiilor, aflată la baza
lui `GvGraphBuilder.addEdge` — exportată direct pentru apelanții care lucrează
cu referințele interne `Node`/`Edge` (de exemplu muchii adăugate pe un graf
returnat de `parse()`), nu cu mânerele opace `GvNode`/`GvEdge` ale
constructorului. Majoritatea apelanților ar trebui să folosească în schimb
`createGraph(...).addEdge(tail, head, attrs?)`.

- **`name`** — cheia muchiei; implicit `''` (anonimă). Ignorată pentru
  deduplicarea în grafuri stricte, care se face doar după `(tail, head)`
  (simetric pentru grafurile neorientate).
- **Returnează** muchia nouă sau pe cea existentă dacă `g` este strict și
  există deja o muchie `(tail, head)` (oglindește `agedge` cu `cflag=1`).

Consultați [Construirea unui graf în cod](/ro/guide/build-a-graph) și
[Referință](/reference/).

### `getLayout`

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

Returnează o instantanee simplă, serializabilă în JSON, a geometriei calculate
a grafului — poziții de noduri, puncte de control ale spline-urilor muchiilor,
etichete de muchie, casete de încadrare ale clusterelor și limitele generale
ale grafului — toate în puncte.

- **`g`** — trebuie să fie deja aranjat (prin `render(g, ...)`,
  `getDrawOps(g)` sau `ctx.layout(g, engine)`); apelarea `getLayout` pe un graf
  încă nearanjat aruncă o eroare, în loc să returneze în tăcere geometrie
  complet nulă.
- **`opts.yAxis`** — implicit `'down'`: coordonate de ecran, origine în stânga
  sus, y crește în jos, iar `bounds` este normalizat la `(0, 0)`. `'up'`
  returnează coordonatele native Graphviz (origine în stânga jos, y crește în
  sus), cu `bounds.x`/`bounds.y` în colțul brut din stânga jos.
- **Aruncă** `Error` cu `code` `ERR_INVALID_STATE` dacă `g` nu a fost aranjat;
  `TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` pentru un `g`
  sau `opts` greșit. Consultați [Erori și excepții](/ro/guide/errors).

`width`/`height` ale nodurilor sunt convertite în puncte (modelul intern
stochează inci); orice altă coordonată este deja în puncte. Consultați
[Citirea geometriei calculate](/ro/guide/geometry) pentru descrierea sistemului
de coordonate și [Tipuri](/ro/guide/types) / [Referință](/reference/) pentru
listele complete de câmpuri `LayoutSnapshot`, `NodeGeometry`, `EdgeGeometry`,
`ClusterGeometry` și `BoundsGeometry`.

### `Graph`

Tip de mâner opac, reexportat din modelul intern. Este expus doar *tipul* (nu
clasa mutabilă) — adnotați cu el o variabilă care deține `.graph` al unui
constructor sau rezultatul unui `parse()`, dar nu construiți și nu inspectați
direct câmpurile sale; folosiți constructorul, `getLayout` sau `getDrawOps`
pentru a citi starea. [Referință](/reference/).

## `@knowvah/dot-engine/render`

Ieșire în mai multe formate și acces la operațiile brute de desenare — stratul
pentru randarea unui graf deja analizat cu `parse` sau construit cu
constructorul.

### `render`

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  RenderOptions,
): string;
```

Aranjează și randează un graf în șirul formatului cerut.

- **`format`** — `OutputFormat`: `'svg' | 'dot' | 'xdot' | 'json' | 'plain' |
  'plain-ext' | 'imap' | 'cmapx'`.
- **`opts.engine`** — motorul de aranjare (implicit `'dot'`).
- **`opts.inlineImages`** — vedeți [mai jos](#inlineimages).
- **Aruncă** `RenderError` la eșec de aranjare sau randare; `InternalError` la
  un bug dot-engine; `TypeError` cu un `code` pentru argumente invalide
  (inclusiv un motor sau un format neînregistrat). Consultați
  [Erori și excepții](/ro/guide/errors).

`opts.engine` oglindește parametrul `engine` al lui `renderSvg`; `format` este
axa pe care `renderSvg` nu o expune (`renderSvg` este fixat la `'svg'`).
Consultați [Randare în alte formate](/ro/guide/render-formats) și
[Referință](/reference/) pentru uniunea completă `OutputFormat` și forma
`RenderOptions`.

#### `inlineImages`

`RenderOptions.inlineImages` (implicit `false`) inserează imaginile externe ca
URI `data:` în loc de trecerea brută `xlink:href="src"`. Nu are efect decât
dacă un resolver este înregistrat prin `setImageResolver` (mai sus) — și nu are
efect asupra formatelor care nu sunt SVG. Nesetată, ieșirea este identică la
nivel de octet cu cea de dinainte ca această opțiune să existe.

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

Consultați [Lucrul cu imagini](/ro/guide/images) pentru ghidul complet,
inclusiv rezolvarea din `fetch` în browser și din sistemul de fișiere în Node.

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

Corespondentul asincron al lui `render`: aceleași formate și opțiuni
`engine`/`inlineImages`, plus cârlige asincrone de imagine per apel și
preîncărcarea fonturilor. Fiecare cârlig de imagine rulează cel mult o dată
pentru fiecare `src` distinct; o aruncare sau o respingere este un eșec de
rezolvare (miss). Ieșirea este marcaj neigienizat pentru formatele de marcaj;
consultați secțiunea „Security” din README.

### `getDrawOps` / `DEFAULT_DRAW_ENGINE`

```ts
const DEFAULT_DRAW_ENGINE: EngineName; // 'dot'

function getDrawOps(g: Graph, opts?: { engine?: EngineName }): XdotOp[];
```

Aranjează `g`, randează în xdot și returnează un tablou plat, tipizat, de
operații de desenare — forme de noduri, intervale de text, culori și fonturi ca
valori de uniune discriminată (restrângeți după `op.kind` într-un `switch`) —
pentru alimentarea unui randator propriu canvas/WebGL/PDF fără a atinge SVG
sau codificarea șir a xdot. `opts.engine` are implicit `DEFAULT_DRAW_ENGINE`
(`'dot'`).

- **Aruncă** `ParseError` dacă ieșirea xdot intermediară nu poate fi reanalizată
  (un bug dot-engine; nu este de așteptat în practică); `RenderError` la eșec
  de aranjare/randare; `InternalError` la orice alt bug dot-engine; `TypeError`
  cu un `code` pentru argumente invalide. Consultați
  [Erori și excepții](/ro/guide/errors).

Consultați [Randare proprie cu operații de desenare xdot](/ro/guide/xdot-drawops)
pentru lista tipurilor de operații și un exemplu detaliat cu canvas, iar
[Tipuri](/ro/guide/types) / [Referință](/reference/) pentru uniunea completă
`XdotOp` și formele `Xdot`/`XdotColor`.
