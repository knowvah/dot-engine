---
sourceHash: e2e54229b04c577dfb514c415c7f02fd786b797b5bfc7a4bbf2e4192d03d0c09
---

# Referencia API

Verejné rozhranie je zámerne malé. Väčšina volajúcich potrebuje iba
`renderSvg`. Ktorý vstupný bod použiť, nájdete v [Prehľade](/sk/guide/overview),
tvary, ktoré jednotlivé funkcie prijímajú a vracajú, v časti
[Typy](/sk/guide/types) a vygenerovaná [Referencia](/reference/) obsahuje
vyčerpávajúce signatúry, každé pole a každé preťaženie.

> Deklarácie typov (`.d.ts`) vytvára `npm run build` (krok `build:types`
> spúšťa `tsc -p tsconfig.build.json`). Mapa `exports` v `package.json`
> prepája podmienky `types` pre každý vstupný bod, takže `@knowvah/dot-engine`,
> `@knowvah/dot-engine/api` aj `@knowvah/dot-engine/render` sa v editoroch
> a následných zostaveniach rozpoznajú aj z hľadiska typov.
>
> Zostavenie vytvára aj mapy deklarácií (`.d.ts.map`) a mapy zdrojov JS
> a balík dodáva svoje zdrojové súbory `src/` — takže „prejsť na definíciu“
> vás zavedie priamo do skutočného TypeScriptu, vďaka čomu je jednoduché
> prečítať si kód a otvoriť PR.

Táto stránka je usporiadaná podľa troch vstupných bodov ([Prehľad](/sk/guide/overview)
uvádza, kedy po ktorom siahnuť): koreňový balík `@knowvah/dot-engine` (parsovanie
+ vykreslenie jedným volaním, plus konfigurácia platná pre celý proces),
`@knowvah/dot-engine/api` (zostavenie grafu v kóde, čítanie vypočítanej
geometrie) a `@knowvah/dot-engine/render` (výstup vo viacerých formátoch
a surové kresliace operácie). Každá nižšie uvedená funkcia sa re-exportuje aj
z koreňového balíka (`export * from './api/index.js'` /
`export * from './render/index.js'` v `src/index.ts`) — import všetkého
z `@knowvah/dot-engine` funguje, ale importy cez podcesty jasnejšie vyjadrujú,
ktorej vrstvy sa dotýkate.

## `@knowvah/dot-engine` (koreň)

### `renderSvg`

```ts
function renderSvg(dotSource: string, engine: EngineName): string;
```

Spracuje zdrojový kód DOT, spustí pomenovaný [modul rozloženia](/sk/guide/engines),
vykreslí do SVG a vráti reťazec SVG. Ide o pohodlný obal na jedno volanie:
vytvorí `GvcContext`, zaregistruje osem vstavaných modulov rozloženia
a vykresľovač SVG, vytvorí rozloženie, vykreslí a rozloženie uvoľní — ak
potrebujete tieto kroky oddeliť, pozrite si nižšie
[`GvcContext` / `renderWithContext`](#gvccontext-renderwithcontext).

- **`dotSource`** — zdrojový kód grafu v jazyku DOT.
- **`engine`** — `EngineName`: jeden zo vstavaných (`dot`, `neato`, `fdp`,
  `sfdp`, `circo`, `twopi`, `osage`, `patchwork`) alebo ľubovoľný vlastný
  zaregistrovaný názov.
- **Vyhodí** `DotEngineError` pri každom probléme so vstupom: `ParseError`,
  ak je `dotSource` neplatný, `RenderError`, ak zlyhá rozloženie alebo
  vykreslenie, `InternalError` (s `cause`) pri chybe v dot-engine. `TypeError`
  s `code` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`, ak je `dotSource`
  alebo `engine` neplatný (vrátane názvu modulu, ktorý nie je zaregistrovaný).
  Pozrite [Chyby a výnimky](/sk/guide/errors).

Úplná signatúra, JSDoc a zoznam polí `GvError`: [Referencia](/reference/).

### `tryRenderSvg` / `RenderResult`

```ts
function tryRenderSvg(dotSource: string, engine: EngineName): RenderResult;
```

Súrodenec `renderSvg` v štýle výsledku. Pri akomkoľvek vstupe DOT vždy vráti
hodnotu (nikdy nevyhodí výnimku): `{ svg }` pri úspechu alebo
`{ errors: [one] }` pri prvom zlyhaní; `svg` a `errors` sa navzájom
vylučujú. Vyhodí iba pri neplatných argumentoch (`TypeError`
`ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`). Každý záznam v `errors` sú
obyčajné údaje serializovateľné do JSON (`type`, `code`, `message`,
`friendlyMessage`, plus `location` / `expected`, ak sú prítomné; žiadny
`cause`, žiadny zásobník volaní), takže ho možno bezpečne poslať cez hranicu
workera/postMessage alebo serializovať do záznamu. Uprednostnite ho pred
`renderSvg` + `try`/`catch`, ak chce volajúci vetviť podľa `code` / `type`
a nie zachytávať výnimku. Pozrite [Chyby a výnimky](/sk/guide/errors).
[Referencia](/reference/).

### `parse` / `ParseError`

```ts
function parse(dotSource: string): Graph;
```

Spracuje DOT do modelu grafu v pamäti **bez** vytvorenia rozloženia. Hodí sa
na kontrolu alebo transformáciu grafu — alebo na jeho odovzdanie funkcii
`getLayout` z `@knowvah/dot-engine/api` či `render` z
`@knowvah/dot-engine/render` — pred vykreslením.

- **Vyhodí** `ParseError` pri syntaktických chybách alebo porušení smeru hrán
  (napr. `->` v neorientovanom grafe). `ParseError` rozširuje `DotEngineError`
  a implementuje `GvError` s `type: 'syntax'`; nesie
  `location: { line, column, offset? }`. `TypeError` `ERR_INVALID_ARG_TYPE`,
  ak `dotSource` nie je reťazec. [Chyby a výnimky](/sk/guide/errors),
  [Referencia](/reference/).

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

`instanceof DotEngineError` znamená, že dot-engine na tomto vstupe zlyhal.
`RenderError` pokrýva známe zlyhania rozloženia/vykreslenia (`type` je
`semantic` pre `UNKNOWN_LAYOUT` a `UNSUPPORTED_FEATURE`). `InternalError` je
chyba v dot-engine; `cause` obsahuje pôvodnú chybu, ak bola obalená. Chyby
volajúceho vyhodia namiesto toho štandardný `TypeError` / `RangeError` /
`Error` s `code`. `isGvError` kontroluje reťazcové `type` a `code`, takže
funguje aj medzi duplicitnými balíkmi. Každý kód a to, čo môže ktorá funkcia
vyhodiť, nájdete v časti [Chyby a výnimky](/sk/guide/errors), tvar `GvError`
v časti [Typy](/sk/guide/types) a zoznam členov `GvErrorCode` v
[Referencii](/reference/).

### `setTextMeasurer` / `getTextMeasurer`

```ts
function setTextMeasurer(measurer: TextMeasurer | null): void;
function getTextMeasurer(): TextMeasurer;
```

Zaregistruje (alebo s `null` zruší) merač textu platný pre celý proces, ktorý
sa pri rozložení používa na určenie veľkosti popisov. Zrušenie sa vráti
k predvolenej hodnote knižnice (prehliadač: `CanvasTextMeasurer`; bezhlavý
režim/Node: `EstimateTextMeasurer`, pokiaľ nie je zapojený merač LUT) —
úplné poradie rozhodovania a implementácie `CanvasTextMeasurer` /
`EstimateTextMeasurer` / `LutTextMeasurer` exportované spolu s týmito
funkciami nájdete v časti [Meranie textu](/sk/guide/text-measurement).
[Referencia](/reference/).

### `setImageSizer` / `setImageResolver`

Dva súvisiace, ale odlišné zásuvné body pre konfiguráciu obrázkov — obidva
sú registre platné pre celý proces s rovnakým vzorom (zaregistrujte
spätné volanie, `null` ho zruší) a obidva nerobia nič, kým ich volajúci
nezaregistruje:

- **`setImageSizer`** — hlási *vnútorné rozmery* externého obrázka, aby modul
  rozloženia mohol pred vykreslením vyhradiť miesto pre bunku HTML `<IMG>`
  alebo atribút uzla `image=`. Vrátenie `null` (alebo nezaregistrovanie
  žiadneho merača) reprodukuje správanie natívneho Graphviz pri chýbajúcom
  obrázku: varovanie a nulovú veľkosť.
- **`setImageResolver`** (nové — pozrite nižšie [`inlineImages`](#inlineimages))
  — dodáva skutočné *bajty* obrázka, aby ich vykresľovač SVG mohol vložiť ako
  URI `data:` namiesto výpisu `xlink:href="src"` ako surového prepustenia.

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;
function setImageSizer(sizer: ImageSizer | null): void;

type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;
function setImageResolver(fn: ImageResolver | null): void;
```

`ImageResolver` môže vrátiť holé `Uint8Array` (MIME sa odvodí z prípony súboru
v `src` — `.png`, `.jpg`/`.jpeg`, `.gif`, `.svg`, `.webp`; čokoľvek iné sa
vráti k `application/octet-stream`) alebo `{ bytes, mime }`, ak chcete typ MIME
nastaviť výslovne. Vráťte `null`, keď sa `src` nedá vyriešiť — vykresľovač sa
vráti k surovému prepusteniu `src`, rovnako ako keď nie je zaregistrovaný
žiadny resolver. Samotná registrácia resolvera nemá žiadny účinok; použije sa
iba vtedy, keď je voľba `inlineImages` funkcie `render` nastavená na `true`
(nižšie). Pozrite [Práca s obrázkami](/sk/guide/images), kde nájdete prepracovaný
príklad, a [Referenciu](/reference/) pre oba typy spätných volaní.

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

`renderSvgAsync` je asynchrónny náprotivok `renderSvg`: vopred načíta webové
písma a údaje obrázkov, ktoré graf potrebuje, a potom vytvorí rozloženie
a vykreslí. `renderSvgInto` vykreslí a nahradí potomkov elementu s id `id`,
pričom SVG predvolene sanitizuje (`trusted: true` to preskočí; `sanitize`
nahradí vstavaný čistič). Zlyhania, vrátane nesprávnych argumentov, sú
zamietnutia promise s rovnakými triedami chýb ako `renderSvg`; chýbajúce id
elementu zamietne s `ERR_INVALID_ARG_VALUE`. Problémy s písmami nikdy
nezamietnu; vrátia sa v `fontIssues`. Pozrite
[Použitie v prehliadači](/sk/guide/browser) a [Práca s obrázkami](/sk/guide/images)
a [Referenciu](/reference/).

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

Nízkoúrovňová orchestrácia pre volajúcich, ktorí potrebujú riadiť rozloženie
a vykresľovanie ako samostatné kroky. `renderSvg` je pohodlný obal presne
nad týmto: vytvorí kontext, zaregistruje moduly/vykresľovače, `layout`,
`renderWithContext`, `freeLayout`. Po týchto funkciách siahnite priamo len
vtedy, keď takúto kontrolu potrebujete — napríklad na registráciu podmnožiny
modulov, pridanie vlastného `LayoutEngine` alebo `RendererPlugin`, alebo na
vykreslenie toho istého rozloženého grafu do viacerých formátov bez opätovného
spustenia rozloženia (zavolajte `layout` raz, potom `renderWithContext` pre
každý formát a nakoniec `freeLayout`). [Referencia](/reference/).

## `@knowvah/dot-engine/api`

Programové zostavenie, bezpečné vkladanie hrán a čítanie vypočítanej
geometrie — vrstva na zostavenie grafu bez ručného písania textu DOT
a čítanie jeho rozloženia späť ako obyčajných údajov. `LayoutSnapshot`
a jeho vnorené tvary nájdete v časti [Typy](/sk/guide/types).

### `createGraph`

```ts
function createGraph(opts?: {
  directed?: boolean;
  strict?:   boolean;
  name?:     string;
}): GvGraphBuilder;
```

Vytvorí čerstvý graf pripravený na odovzdanie funkciám `render` / `getLayout` /
`getDrawOps`. Predvolené hodnoty: `directed: true`, `strict: false`,
`name: ''`. Vráti `GvGraphBuilder` — `addNode`, `addEdge`, `addSubgraph`,
`setAttr`/`getAttr`, `setHtmlAttr` (pre popisy v podobe HTML tabuliek)
a vlastnosť `.graph`, ktorá sprístupňuje nepriehľadný úchyt `Graph`. Pozrite
[Zostavenie grafu v kóde](/sk/guide/build-a-graph) a [Referenciu](/reference/)
pre úplné rozhrania `GvGraphBuilder`/`GvNode`/`GvEdge`.

### `addEdge`

```ts
function addEdge(g: Graph, tail: Node, head: Node, name?: string): Edge;
```

Nízkoúrovňová pomocná funkcia na vkladanie hrán, na ktorej stojí
`GvGraphBuilder.addEdge` — exportovaná priamo pre volajúcich pracujúcich
s internými referenciami `Node`/`Edge` (napr. hrany pridané do grafu vráteného
z `parse()`) namiesto nepriehľadných úchytov `GvNode`/`GvEdge` buildera.
Väčšina volajúcich by mala namiesto toho použiť
`createGraph(...).addEdge(tail, head, attrs?)`.

- **`name`** — kľúč hrany; predvolene `''` (anonymná). Pri odstraňovaní
  duplicít v strict grafe sa ignoruje, pretože porovnáva iba `(tail, head)`
  (pre neorientované grafy symetricky).
- **Vráti** novú hranu, alebo existujúcu, ak je `g` strict a hrana
  `(tail, head)` už existuje (zodpovedá `agedge` s `cflag=1`).

Pozrite [Zostavenie grafu v kóde](/sk/guide/build-a-graph) a
[Referenciu](/reference/).

### `getLayout`

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

Vráti obyčajnú snímku vypočítanej geometrie grafu serializovateľnú do JSON —
polohy uzlov, riadiace body splinov hrán, popisy hrán, ohraničujúce rámce
klastrov a celkové hranice grafu — všetko v bodoch.

- **`g`** — musí byť už rozložený (cez `render(g, ...)`, `getDrawOps(g)` alebo
  `ctx.layout(g, engine)`); volanie `getLayout` na ešte nerozloženom grafe
  vyhodí výnimku namiesto toho, aby potichu vrátilo nulovú geometriu.
- **`opts.yAxis`** — predvolene `'down'`: súradnice obrazovky, počiatok vľavo
  hore, y rastie nadol a `bounds` sú normalizované na `(0, 0)`. `'up'` vráti
  natívne súradnice Graphviz (počiatok vľavo dole, y rastie nahor)
  s `bounds.x`/`bounds.y` v surovom ľavom dolnom rohu.
- **Vyhodí** `Error` s `code` `ERR_INVALID_STATE`, ak `g` nebol rozložený;
  `TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` pri nesprávnom
  `g` alebo `opts`. Pozrite [Chyby a výnimky](/sk/guide/errors).

`width`/`height` uzla sa prevádzajú na body (interný model ukladá palce);
každá ďalšia súradnica je už v bodoch. Opis súradnicových systémov nájdete
v časti [Čítanie vypočítanej geometrie](/sk/guide/geometry) a úplné zoznamy
polí `LayoutSnapshot`, `NodeGeometry`, `EdgeGeometry`, `ClusterGeometry`
a `BoundsGeometry` v časti [Typy](/sk/guide/types) / [Referencia](/reference/).

### `Graph`

Typ nepriehľadného úchytu re-exportovaný z interného modelu. Vystavený je iba
*typ* (nie meniteľná trieda) — použite ho na anotáciu premennej s `.graph`
buildera alebo výsledkom `parse()`, ale jeho polia priamo nevytvárajte
ani neskúmajte; stav čítajte späť cez builder, `getLayout` alebo `getDrawOps`.
[Referencia](/reference/).

## `@knowvah/dot-engine/render`

Výstup vo viacerých formátoch a prístup k surovým kresliacim operáciám —
vrstva na vykreslenie už spracovaného (`parse`) alebo cez builder zostaveného
grafu.

### `render`

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  RenderOptions,
): string;
```

Vytvorí rozloženie grafu a vykreslí ho do reťazca v požadovanom formáte.

- **`format`** — `OutputFormat`: `'svg' | 'dot' | 'xdot' | 'json' | 'plain' |
  'plain-ext' | 'imap' | 'cmapx'`.
- **`opts.engine`** — modul rozloženia (predvolene `'dot'`).
- **`opts.inlineImages`** — pozrite [nižšie](#inlineimages).
- **Vyhodí** `RenderError` pri zlyhaní rozloženia alebo vykreslenia;
  `InternalError` pri chybe v dot-engine; `TypeError` s `code` pri neplatných
  argumentoch (vrátane nezaregistrovaného modulu alebo formátu). Pozrite
  [Chyby a výnimky](/sk/guide/errors).

`opts.engine` zodpovedá parametru `engine` funkcie `renderSvg`; `format` je os,
ktorú `renderSvg` nesprístupňuje (`renderSvg` je napevno nastavené na `'svg'`).
Pozrite [Vykreslenie do iných formátov](/sk/guide/render-formats) a
[Referenciu](/reference/) pre úplný zjednotený typ `OutputFormat` a tvar
`RenderOptions`.

#### `inlineImages`

`RenderOptions.inlineImages` (predvolene `false`) vkladá externé obrázky ako
URI `data:` namiesto surového prepustenia `xlink:href="src"`. Nemá žiadny
účinok, pokiaľ nie je cez `setImageResolver` (vyššie) zaregistrovaný resolver
— a nemá účinok na formáty iné než SVG. Ak nie je nastavená, výstup je
bajt po bajte rovnaký ako predtým, než táto voľba existovala.

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

Úplného sprievodcu, vrátane riešenia cez `fetch` v prehliadači a zo súborového
systému v Node, nájdete v časti [Práca s obrázkami](/sk/guide/images).

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

Asynchrónny náprotivok `render`: rovnaké formáty a voľby `engine`/`inlineImages`,
plus asynchrónne háčiky pre obrázky pre jednotlivé volania a vopred načítanie
písem. Každý háčik pre obrázky sa spustí najviac raz pre každé odlišné `src`;
vyhodenie výnimky alebo zamietnutie sa počíta ako netrafenie. Výstup je pri
značkovacích formátoch nesanitizovaná značkovacia syntax; pozrite časť
„Security“ v README.

### `getDrawOps` / `DEFAULT_DRAW_ENGINE`

```ts
const DEFAULT_DRAW_ENGINE: EngineName; // 'dot'

function getDrawOps(g: Graph, opts?: { engine?: EngineName }): XdotOp[];
```

Vytvorí rozloženie `g`, vykreslí do xdot a vráti plochú typovanú sadu
kresliacich operácií — tvary uzlov, textové úseky, farby a písma ako hodnoty
zjednoteného typu (zúžte podľa `op.kind` v `switch`) — na napájanie
vlastného vykresľovača canvas/WebGL/PDF bez dotyku SVG alebo reťazcového
kódovania xdot. `opts.engine` má predvolenú hodnotu `DEFAULT_DRAW_ENGINE`
(`'dot'`).

- **Vyhodí** `ParseError`, ak sa sprostredkovaný výstup xdot nedá znova
  spracovať (chyba v dot-engine; v praxi sa neočakáva); `RenderError` pri
  zlyhaní rozloženia/vykreslenia; `InternalError` pri akejkoľvek inej chybe
  v dot-engine; `TypeError` s `code` pri neplatných argumentoch. Pozrite
  [Chyby a výnimky](/sk/guide/errors).

Zoznam druhov operácií a prepracovaný príklad pre canvas nájdete v časti
[Vlastné vykresľovanie pomocou kresliacich operácií xdot](/sk/guide/xdot-drawops)
a úplný zjednotený typ `XdotOp` a tvary `Xdot`/`XdotColor` v časti
[Typy](/sk/guide/types) / [Referencia](/reference/).
