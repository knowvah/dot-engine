---
sourceHash: 545227fb3a0a91494ed7a2c299e5a9ca93a594d68d99e0596f743e7597dfbae9
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Hibák és kivételek

A dot-engine kétféle hibát dob. Hogy melyik fajtát kapja el, abból látszik, kinek
kell változtatnia valamin.

## Két család, egy szabály

| Család | Hogyan ismerhető fel | Jelentés | Ki cselekszik |
|--------|---------------------|---------|----------|
| dot-engine-hiba | `err instanceof DotEngineError` | A dot-engine elbukott ezen a bemeneten: hibás DOT, olyan végzetes hiba, amelyet maga a Graphviz is jelentene, nem támogatott Graphviz-funkció, vagy dot-engine-hiba | A DOT szerzője, vagy hibabejelentés |
| Használati hiba | szabványos `TypeError` / `RangeError` / `Error`, amelynek `err.code` értéke `ERR_`-rel kezdődik | A hívás volt hibás: rossz argumentumtípus, ismeretlen motor- vagy formátumnév, rossz hívási sorrend | A hívó kód |

A `.code` alapján ágazzon el, ne az üzenet szövege alapján. Az üzenetek
kiadások között változhatnak; a kódok stabilak.

A használati hibák nem `DotEngineError`-ok, és nem implementálják a `GvError`-t.
A `name` értékük `TypeError`, `RangeError` vagy `Error` marad, mint a Node.js-ben.

## Osztályreferencia

Az alábbi négy osztály mindegyike kiterjeszti a `DotEngineError`-t, és
implementálja a `GvError` alakot (`type`, `code`, `message`, `friendlyMessage`,
opcionálisan `location` és `expected`).

### `DotEngineError` (absztrakt)

A közös alap. Az `instanceof DotEngineError` igaz minden olyan hibára, amelyet a
dot-engine a bemenetéről jelez. Közvetlenül nem példányosítható. A `type`, a
`code` és a `friendlyMessage` az alosztályokban van definiálva.

### `ParseError`

| Elem | Érték |
|------|-------|
| Mikor dobódik | A DOT-forráskód érvénytelen, vagy a gráf fajtájához nem illő élműveletet használ |
| `type` | `syntax` |
| Kódok | `SYNTAX_ERROR`, `SYNTAX_UNEXPECTED_EOF`, `EDGE_OP_DIRECTED_IN_UNDIRECTED`, `EDGE_OP_UNDIRECTED_IN_DIRECTED`, `GENERIC_ERROR` |
| Mezők | `location` (`{ line, column, offset? }`), `expected` (az értelmező várakozásai; csak `SYNTAX_*`), `line` és `column` getterek |
| A hívó teendője | Javítsa a DOT-forráskódot. Mutassa meg a `location` és a `friendlyMessage` értékét a szerzőnek |

A `ParseError` `GENERIC_ERROR` kódja azt jelenti, hogy a forráskód olyan mélyen
ágyazott, hogy az értelmezőnek elfogyott a verme.

### `HtmlParseError`

| Elem | Érték |
|------|-------|
| Mikor dobódik | Ma sosem jut el a hívóhoz (lásd lent) |
| `type` | `semantic` |
| Kódok | `HTML_PARSE_ERROR` |
| Mezők | `tag` (a hibás token). Nincs `location` vagy `expected` |
| A hívó teendője | Nincs. Hibás felirat megtalálásához vesse össze a renderelt kimenetet a várttal |

A HTML-szerű feliratok értelmezője `HtmlParseError`-t vált ki ismeretlen elemre,
hibás attribútumra vagy rossz helyre tett `<TABLE>`, `<HR>` vagy `<VR>` elemre. Az
elrendezési szakasz elkapja, és a feliratnak nem ad tartalmat, ahogy a Graphviz
is: a gráf továbbra is renderelődik, üres felirattal. Egyetlen nyilvános
függvény sem propagálja.

A `HtmlParseError` nincs exportálva a csomag gyökeréből. Ha mégis eljutna
Önhöz, az `err instanceof DotEngineError && err.code === 'HTML_PARSE_ERROR'`
azonosítja.

### `RenderError`

| Elem | Érték |
|------|-------|
| Mikor dobódik | Az elrendezés vagy a renderelés olyan módon hiúsul meg, amelyet maga a Graphviz is jelentene, a gráf nem elérhető elrendezésmotort nevez meg, vagy a gráf olyan Graphviz-funkciót használ, amelyet a dot-engine nem portolt |
| `type` | `render` a `RENDER_ERROR` esetén; `semantic` az `UNKNOWN_LAYOUT` és az `UNSUPPORTED_FEATURE` esetén |
| Kódok | `RENDER_ERROR`, `UNKNOWN_LAYOUT`, `UNSUPPORTED_FEATURE` |
| Mezők | `cause`, ha a hiba más hibát csomagolt. Nincs `location` |
| A hívó teendője | `RENDER_ERROR`: változtassa meg a gráfot. `UNKNOWN_LAYOUT`: javítsa a `layout=` attribútumot. `UNSUPPORTED_FEATURE`: kerülje a funkciót (például sfdp `rotation=45`-tel; lásd a [táblázatot](#unsupported-feature-reference)) |

### `InternalError`

| Elem | Érték |
|------|-------|
| Mikor dobódik | A dot-engine belsejében egy állítás vagy invariáns megbukik, vagy nem dot-engine-hiba szökik ki az elrendezési vagy renderelési csővezetékből |
| `type` | `render` |
| Kódok | `INTERNAL_ERROR` |
| Mezők | `cause` (az eredeti hiba, ha volt becsomagolt) |
| A hívó teendője | Jelentsen hibát azzal a DOT-forráskóddal, amely kiváltotta |

Semmi, amit a DOT szerzője változtathat, nem kerüli el megbízhatóan az
`InternalError`-t.

## Kódreferencia

### `GvErrorCode`

| Kód | Osztály | `type` | Jelentés | Tipikus ok | A hívó teendője | Kiváltja |
|------|-------|--------|---------|---------------|---------------|-----------|
| `SYNTAX_ERROR` | `ParseError` | `syntax` | Váratlan token | Elgépelés, hiányzó `;` vagy `}` | Javítsa a DOT-ot a `location` helyén | `parse`, `renderSvg` |
| `SYNTAX_UNEXPECTED_EOF` | `ParseError` | `syntax` | A forráskód utasítás közben véget ért | Lezáratlan `{`, `[` vagy sztring | Javítsa a DOT-ot a `location` helyén | `parse`, `renderSvg` |
| `EDGE_OP_DIRECTED_IN_UNDIRECTED` | `ParseError` | `syntax` | `->` irányítatlan gráfban | `graph { a -> b }` | Használjon `--`-t | `parse`, `renderSvg` |
| `EDGE_OP_UNDIRECTED_IN_DIRECTED` | `ParseError` | `syntax` | `--` digráfban | `digraph { a -- b }` | Használjon `->`-t | `parse`, `renderSvg` |
| `GENERIC_ERROR` | `ParseError` | `syntax` | A forráskód túl mélyen ágyazott az értelmezéshez | Kóros mélységben ágyazott részgráfok | Lapítsa el a DOT-ot | `parse`, `renderSvg` |
| `HTML_PARSE_ERROR` | `HtmlParseError` | `semantic` | Hibás HTML-szerű felirat | Ismeretlen elem, hibás attribútum | Nincs: a felirat üresen renderelődik | Egyik sem (belsőleg elkapva) |
| `RENDER_ERROR` | `RenderError` | `render` | Végzetes elrendezési vagy renderelési hiba, amelyet a Graphviz is jelentene | Hibás bemenet egy elrendezési szakaszhoz | Változtassa meg a gráfot | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNKNOWN_LAYOUT` | `RenderError` | `semantic` | A gráf `layout=` attribútuma nem regisztrált motort nevez meg | `layout="foo"` | Javítsa az attribútumot | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNSUPPORTED_FEATURE` | `RenderError` | `semantic` | A gráf olyan Graphviz-funkciót kér, amelyet a dot-engine nem portolt | sfdp `rotation=45`-tel | Kerülje a funkciót | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `INTERNAL_ERROR` | `InternalError` | `render` | dot-engine-hiba | Megbukott állítás, idegen dobás | Jelentsen hibát | `renderSvg`, `render`, `getDrawOps`, építő metódusok, `GvcContext.layout` (becsomagolatlanul) |

### `UsageErrorCode`

| Kód | Osztály | Jelentés | Tipikus ok | A hívó teendője | Kiváltja |
|------|-------|---------|---------------|---------------|-----------|
| `ERR_INVALID_ARG_TYPE` | `TypeError` | Rossz típus, `null`, vagy hiányzó kötelező argumentum | `renderSvg(undefined, 'dot')`, `getLayout(null)` | Javítsa a hívást | Minden nyilvános függvény, amely argumentumot vesz |
| `ERR_INVALID_ARG_VALUE` | `TypeError` | Jó típus, ismeretlen érték | Nem regisztrált motor- vagy formátumnév; `getLayout(g, { yAxis: 'other' })` | Regisztrált nevet vagy megengedett értéket használjon | `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps`, `getLayout`, `GvcContext.layout`, `freeLayout`, `bestRenderer`, `renderWithContext` |
| `ERR_OUT_OF_RANGE` | `RangeError` | Számértékű argumentum a tartományán kívül | Fenntartott | Javítsa a hívást | Ma egyetlen nyilvános függvény sem váltja ki |
| `ERR_INVALID_STATE` | `Error` | A hívás rossz állapotban történt | `getLayout` elrendezés előtt | Előbb rendezzen el (`render(g, ...)` vagy `ctx.layout`) | `getLayout` |

A nem regisztrált motor argumentumot akkor is elutasítja, ha a DOT-forráskód
érvényes `layout=` attribútumot állít be. Az argumentumot ellenőrzi először.

## `UNSUPPORTED_FEATURE` referencia {#unsupported-feature-reference}

Az alábbi attribútumértékek mindegyike arra készteti az elrendezést, hogy
`UNSUPPORTED_FEATURE` kódú `RenderError`-t dobjon ott, ahol a natív Graphviz
olyan algoritmust futtatna, amelyet a dot-engine nem portolt. Az alternatíva az
lett volna, hogy a Graphvizétől eltérő elrendezést renderelünk, ezt elhallgatva.
Az ellenőrzés csak akkor lép működésbe, ha a „Mikor lép működésbe” oszlop
feltétele teljesül; ugyanaz az attribútum máshol normálisan renderelődik. A hiba
elkerüléséhez távolítsa el az attribútumot, vagy változtassa támogatott értékre.

| Motor | Attribútum és érték | Mikor lép működésbe | Szükséges Graphviz-funkció |
|--------|--------------------|------------|-------------------------|
| neato | `mode=hier` | Mindig (miután a gráfnak 2+ csúcsa van, és a `maxiter` nem negatív) | Hierarchikus feszültségmajorizáció (`stress_majorization_with_hierarchy`) |
| neato | `mode=ipsep` | Csak ha a Graphviz megszorításokat építene: a `diredgeconstraints` igaz, vagy `hier*`, `overlap=ipsep`, vagy a gráfnak van legfelső szintű klasztere. Megszorítások nélkül feszültségmajorizációként fut, mint a Graphvizben | Megszorításos majorizáció (`stress_majorization_cola`) |
| neato | `start=self` | A `mode` `major` (az alapértelmezés) vagy `ipsep` | Okos inicializálás (`smart_ini`). `mode=KK` vagy `mode=sgd` alatt renderelésenként egyszer naplózza: `start=0 not supported with mode=self - ignored`, ahogy a Graphviz teszi |
| neato | `model=subset` | A `mode` `major` vagy `KK` | A részhalmaz-távolságmodell |
| neato | `model=circuit` | A `mode` `major`, vagy `KK` összefüggő gráfon. A `KK` nem összefüggő gráfon `pack` vagy `packmode` nélkül figyelmeztetést naplóz, és legrövidebb utakat használ, ahogy a Graphviz teszi | Az áramköri távolságmodell (`circuit_model`) |
| neato, twopi, circo, sfdp | `overlap=voronoi` (kis- és nagybetűre érzéketlen) | A gráfnak (a twopi-nál egy komponensnek; az sfdp-nél a teljes gráfnak vagy egy komponensnek) 2+ csúcsa van, és a Graphviz saját átfedésszámlálója (`countOverlap`, amely a csúcssokszögeket teszteli) 0 fölött van. Azok a csúcsok, amelyek csak befoglaló dobozukkal érintkeznek, nem váltják ki. A circo csak egykomponensű gráfnál éri el (több komponensnél a Graphviz az `overlap`-et is figyelmen kívül hagyja). Az sfdp csak akkor éri el, ha az `overlap` nem prizma módú | Voronoi-alapú átfedéseltávolítás (`vAdjust`) |
| fdp | `overlap=` a következők egyike: `voronoi`, `oscale`, `vpsc`, `ipsep`, `ortho`, `ortho_yx`, `orthoxy`, `orthoyx`, `portho`, `portho_yx`, `porthoxy`, `porthoyx` | A módot az `N:` erőiterációs próbálkozások után éri el, vagyis amikor ezek a próbálkozások nem távolítanak el minden átfedést (vagy az `N` 0 vagy hiányzik). Az `N:` előtag megengedett, például `3:voronoi` | A megfelelő `removeOverlapWith` igazító algoritmus |
| fdp | `splines=compound` | Mindig, klaszterekkel vagy anélkül | Klasztert elkerülő élvezetés (`compoundEdges`) |
| sfdp | `smoothing=` bármi, kivéve `none` vagy `0` | Mindig | `post_process_smoothing` |
| sfdp | `rotation=` bármely nem nulla szám | Mindig | `rotate()` az átfedéseltávolítás előtt |
| sfdp | `label_scheme=1` – `4` | Létezik `|edgelabel|...` nevű csúcs, az `overlap` `prism` módra oldódik fel, és vagy a séma 3 vagy 4, vagy a séma 1 vagy 2, és a prizmapróbálkozások száma 0 fölött van (`overlap=prism` számmal, nem az alapértelmezett `prism0`). A 4 fölötti értékek 0-nak számítanak. A szokásos élfeliratok sosem váltják ki | Élfelirat-csúcsok kezelése (`edge_labeling_scheme`) |
| sfdp | `quadtree=none` (és `0`, `false`) | Bármely gráf, amelyben van legalább egy csúcs. Az üzenet megnevezi a feloldott sémát | `spring_electrical_embedding_slow` |
| sfdp | `quadtree=fast` (és `2`) | Bármely gráf, amelyben van legalább egy csúcs. Az üzenet megnevezi a feloldott sémát | `spring_electrical_embedding_fast` |
| minden motor | Egy portolatlan, különleges `round_corners` esettel rajzolt csúcsalakzat | A csúcs azt az alakzatot használja. Üzenet: `special shape N not yet ported` | Az alakzat `round_corners` rajzolási ága. Ez belső védőkorlát az olyan alakzatszám ellen, amelyhez nincs rajzolási eset; nem ismert névvel rendelkező alakzat, amely eljutna idáig |

A legtöbb üzenet alakja `<attribútum>=<érték>: <mi> is not supported yet`. A
kivételek a `smoothing` és a `rotation` (amelyek a hiányzó rutint nevezik meg),
az fdp sorok és az alakzatsor, amelyek a fenti megfogalmazásokat használják. Az
`err.code === 'UNSUPPORTED_FEATURE'` alapján ágazzon el, ne a szöveg alapján.

Az alapértelmezést kiválasztó értékek (például `quadtree=normal`, `true`, `yes`,
`1`) és a Graphviz által elfogadott, portolt értékek (például `start=regular`,
`start=random`, `model=mds`, `mode=KK`, `mode=sgd`, `overlap=prism`, a `scale`
család, valamint a neato, a twopi, a circo és az sfdp esetén az `overlap=oscale`,
`vpsc` és az `ortho*` / `portho*` módok) normálisan renderelődnek.

## Függvényenkénti referencia

A „Használati” egy `ERR_INVALID_ARG_TYPE` kódú `TypeError`-t jelent, hacsak egy sor
más kódot nem nevez meg.

| Függvény | Mit dobhat |
|----------|-----------|
| `renderSvg(dotSource, engine)` | Használati (a `dotSource` vagy az `engine` nem sztring); `TypeError` `ERR_INVALID_ARG_VALUE` (a motor nincs regisztrálva); `ParseError`; `RenderError`; `InternalError` |
| `tryRenderSvg(dotSource, engine)` | Használati (a `dotSource` vagy az `engine` nem sztring); `TypeError` `ERR_INVALID_ARG_VALUE` (a motor nincs regisztrálva). Semmi más: minden DOT-bemeneti hiba az `errors`-ban érkezik vissza |
| `parse(dotSource)` | `TypeError` `ERR_INVALID_ARG_TYPE` (a `dotSource` nem sztring); `ParseError` |
| `render(g, format, opts?)` | Használati (a `g`, a `format` vagy az `opts` rossz típusú); `TypeError` `ERR_INVALID_ARG_VALUE` (a motor vagy a formátum nincs regisztrálva); `RenderError`; `InternalError` |
| `getDrawOps(g, opts?)` | Használati (a `g` vagy az `opts` rossz típusú); `TypeError` `ERR_INVALID_ARG_VALUE` (az `opts.engine` nincs regisztrálva); `RenderError`; `ParseError` (a közbenső xdot nem volt újra értelmezhető: dot-engine-hiba); `InternalError` |
| `createGraph(opts?)` és az építő metódusai (`addNode`, `addEdge`, `addSubgraph`, `setAttr`, ...) | Használati (rossz argumentumtípusok, beleértve a nem sztring attribútumértékeket); `InternalError` (a gráfmodell nem tudott csúcsot vagy részgráfot létrehozni) |
| `addEdge(g, tail, head, name?)` (az `/api`-ból) | Használati (nem objektum `g`, `tail` vagy `head`; nem sztring `name`) |
| `getLayout(g, opts?)` | Használati (a `g` vagy az `opts` nem objektum); `TypeError` `ERR_INVALID_ARG_VALUE` (az `opts.yAxis` nem `'up'` vagy `'down'`); `Error` `ERR_INVALID_STATE` (a gráf nincs elrendezve) |
| `new GvcContext(measurer, options?)` | Használati (a `measurer`-nek nincs `measure` függvénye; az `options` nem objektum) |
| `ctx.register(plugin)` | Használati (nem renderelő beépülő modul vagy elrendezésmotor) |
| `ctx.layout(g, engine)` | Használati (a `g` nem objektum, az `engine` nem sztring); `TypeError` `ERR_INVALID_ARG_VALUE` (a motor nincs regisztrálva); `RenderError` `UNKNOWN_LAYOUT`. A motorhibák becsomagolatlanul propagálódnak |
| `ctx.freeLayout(g, engine)` | Használati; `TypeError` `ERR_INVALID_ARG_VALUE` (a motor nincs regisztrálva). A motorhibák becsomagolatlanul propagálódnak |
| `ctx.bestRenderer(format)` | Használati (a `format` nem sztring); `TypeError` `ERR_INVALID_ARG_VALUE` (nincs renderelő a `format`-hoz) |
| `renderWithContext(ctx, g, format, inlineImages?)` | Használati (a `ctx` nem `GvcContext`, a `g` nem objektum, a `format` nem sztring); `TypeError` `ERR_INVALID_ARG_VALUE` (nincs renderelő a `format`-hoz). A renderelési hibák becsomagolatlanul propagálódnak |
| `setImageSizer(sizer)` | Használati (nem függvény és nem `null`) |
| `setImageResolver(fn)` | Használati (nem függvény és nem `null`) |
| `setTextMeasurer(measurer)` | Használati (nem `TextMeasurer` és nem `undefined`) |

### Mely függvények csomagolják be az idegen dobásokat

| Függvények | Viselkedés váratlan (nem dot-engine) dobásnál |
|-----------|---------------------------------------------------|
| `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps` | `InternalError`-ként becsomagolva; a `cause` az eredeti hiba |
| `renderWithContext` és minden `GvcContext` metódus | **Nincs becsomagolva.** A motorhiba úgy jut el a hívóhoz, ahogy a motor dobta, például `code` nélküli egyszerű `TypeError`-ként |

Ha közvetlenül használja a `GvcContext`-et, kezelje dot-engine-hibaként azt a
hibát, amely sem `DotEngineError`, sem használati hiba.

## `tryRenderSvg` vagy `renderSvg`

| | `renderSvg` | `tryRenderSvg` |
|---|-------------|----------------|
| Hibás DOT vagy elrendezési hiba | `DotEngineError`-t dob | `{ errors: [one] }`-t ad vissza |
| Hibás argumentumok | Használati hibát dob | Használati hibát dob |
| Hibaérték | Veremmel és `cause`-zal rendelkező `Error` | Egyszerű adat: `type`, `code`, `message`, `friendlyMessage`, továbbá `location` / `expected`, ha van |
| Mikor használja | A hibának meg kell szakítania a hívót | A `code` alapján ágazik el, vagy a hibát `postMessage`-en át küldi, illetve naplóba írja |

A `tryRenderSvg` semmilyen DOT-bemenetre nem dob kivételt. Csak akkor dob, ha
maguk az argumentumok érvénytelenek, ami a hívó kód hibája. Az általa
visszaadott hibaobjektumok nem hordoznak `cause`-t és veremnyomot.

## Becsomagolt hibák és a `cause`

Amikor a `renderSvg`, a `render` vagy a `getDrawOps` olyan hibát kap el, amelyet
nem a dot-engine váltott ki, `InternalError`-t dob, amelynek `cause` értéke az
eredeti hiba. A `message` az eredeti üzenet.

A `cause` nem felsorolható, ezért a `JSON.stringify(err)` kihagyja. Naplózáskor
járja be a láncot explicit módon (lásd az utolsó példát lent).

## Csomagok közötti ellenőrzések

Az `instanceof DotEngineError` a könyvtár egyetlen példányán belül működik. Ha
két példány is betöltődhet (duplikált csomagok, beépülőmodul-gazda), használja az
`isGvError(e)` függvényt. Sztring típusú `type` és `code` meglétét ellenőrzi, és
példányokon át is működik. Elfogadja a `tryRenderSvg` által visszaadott egyszerű
objektumokat is.

## Példák

A két család szétválasztása:

```ts
import { renderSvg, DotEngineError, ParseError } from '@knowvah/dot-engine';

function renderOrExplain(dot: string): string {
  try {
    return renderSvg(dot, 'dot');
  } catch (err: unknown) {
    if (err instanceof ParseError) {
      const { line, column } = err.location;
      return `DOT error at ${line}:${column}: ${err.friendlyMessage}`;
    }
    if (err instanceof DotEngineError) {
      return `${err.code}: ${err.friendlyMessage}`;
    }
    // A usage error: the call was wrong. Do not swallow it.
    throw err;
  }
}
```

Egy `tryRenderSvg` eredmény kezelése:

```ts
import { tryRenderSvg } from '@knowvah/dot-engine';

const result = tryRenderSvg('digraph { a ->', 'dot');
if (result.svg !== undefined) {
  console.log(result.svg.length);
} else {
  const [first] = result.errors ?? [];
  console.error(first?.code, first?.location);
}
```

Egy `InternalError` naplózása az okával:

```ts
import { InternalError } from '@knowvah/dot-engine';

function describeChain(err: unknown): string[] {
  const lines: string[] = [];
  let current: unknown = err;
  while (current instanceof Error) {
    lines.push(`${current.name}: ${current.message}`);
    current = current.cause;
  }
  return lines;
}

export function logFailure(err: unknown): void {
  if (err instanceof InternalError) {
    // Report this: it is a dot-engine bug. `cause` is the original error.
    console.error(describeChain(err).join(' <- '));
  }
}
```

## Lásd még

- [API-referencia (válogatott)](/hu/guide/api) az egyes függvények szignatúrájához.
- [Típusok](/hu/guide/types) a `GvError` és a `RenderResult` alakjához.
- [Generált API (TypeDoc)](/reference/) a teljes `GvErrorCode` és `UsageErrorCode` unióhoz.
