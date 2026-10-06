---
sourceHash: 545227fb3a0a91494ed7a2c299e5a9ca93a594d68d99e0596f743e7597dfbae9
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Villur og undantekningar

dot-engine kastar tvenns konar villum. Hvor tegundin þú grípur segir þér hver
þarf að breyta einhverju.

## Tvær fjölskyldur, ein regla

| Fjölskylda | Hvernig á að þekkja hana | Merking | Hver bregst við |
|--------|---------------------|---------|----------|
| dot-engine-bilun | `err instanceof DotEngineError` | dot-engine brást á þessu inntaki: ógilt DOT, banvæn villa sem Graphviz sjálft myndi tilkynna, Graphviz-eiginleiki sem ekki er studdur, eða galli í dot-engine | Höfundur DOT-sins, eða villutilkynning |
| Notkunarvilla | venjuleg `TypeError` / `RangeError` / `Error` með `err.code` sem byrjar á `ERR_` | Kallið var rangt: röng tegund röksemdar, óþekkt heiti vélar eða sniðs, röng kallaröð | Kallandi kóði |

Greindu á `.code`, ekki á texta skilaboða. Skilaboð geta breyst milli útgáfa;
kóðar eru stöðugir.

Notkunarvillur eru ekki `DotEngineError` og útfæra ekki `GvError`. `name`
þeirra helst `TypeError`, `RangeError` eða `Error`, eins og í Node.js.

## Flokkatilvísun

Allir flokkarnir fjórir hér að neðan erfa frá `DotEngineError` og útfæra
`GvError`-lögunina (`type`, `code`, `message`, `friendlyMessage`, valfrjálst
`location` og `expected`).

### `DotEngineError` (óhlutbundinn)

Sameiginlegi grunnflokkurinn. `instanceof DotEngineError` er satt fyrir allar
villur sem dot-engine kastar um inntak sitt. Ekki er hægt að smíða hann beint.
`type`, `code` og `friendlyMessage` eru skilgreind í undirflokkunum.

### `ParseError`

| Atriði | Gildi |
|------|-------|
| Kastað þegar | DOT-frumkóðinn er ógildur, eða notar rangan leggjaaðgerðarmerki fyrir tegund grafsins |
| `type` | `syntax` |
| Kóðar | `SYNTAX_ERROR`, `SYNTAX_UNEXPECTED_EOF`, `EDGE_OP_DIRECTED_IN_UNDIRECTED`, `EDGE_OP_UNDIRECTED_IN_DIRECTED`, `GENERIC_ERROR` |
| Reitir | `location` (`{ line, column, offset? }`), `expected` (væntingar þáttarans; aðeins `SYNTAX_*`), `line`- og `column`-sóttaraðferðir |
| Aðgerð kallanda | Laga DOT-frumkóðann. Sýna höfundi `location` og `friendlyMessage` |

`GENERIC_ERROR` á `ParseError` þýðir að frumkóðinn er svo djúpt hreiðraður að
þátturinn varð uppiskroppa með stafla.

### `HtmlParseError`

| Atriði | Gildi |
|------|-------|
| Kastað þegar | Berst aldrei til kallanda í dag (sjá hér að neðan) |
| `type` | `semantic` |
| Kóðar | `HTML_PARSE_ERROR` |
| Reitir | `tag` (táknið sem olli villunni). Ekkert `location` eða `expected` |
| Aðgerð kallanda | Engin. Til að finna slæman merkimiða skaltu bera teiknaða úttakið saman við það sem þú bjóst við |

Þáttari HTML-líkra merkimiða kastar `HtmlParseError` fyrir óþekkt element,
rangt mótað eigindi eða `<TABLE>`, `<HR>` eða `<VR>` á röngum stað.
Uppsetningarstigið grípur hana og gefur merkimiðanum ekkert innihald, eins og
Graphviz gerir: grafið er samt teiknað, með tómum merkimiða. Ekkert opinbert fall
sendir hana áfram.

`HtmlParseError` er ekki flutt út úr rót pakkans. Ef ein slík berst þér einhvern
tíma auðkennir `err instanceof DotEngineError && err.code === 'HTML_PARSE_ERROR'`
hana.

### `RenderError`

| Atriði | Gildi |
|------|-------|
| Kastað þegar | Uppsetning eða teiknun mistekst á þann hátt sem Graphviz sjálft myndi tilkynna, grafið nefnir uppsetningarvél sem er ekki tiltæk, eða grafið notar Graphviz-eiginleika sem dot-engine hefur ekki yfirfært |
| `type` | `render` fyrir `RENDER_ERROR`; `semantic` fyrir `UNKNOWN_LAYOUT` og `UNSUPPORTED_FEATURE` |
| Kóðar | `RENDER_ERROR`, `UNKNOWN_LAYOUT`, `UNSUPPORTED_FEATURE` |
| Reitir | `cause` þegar bilunin vafði aðra villu. Ekkert `location` |
| Aðgerð kallanda | `RENDER_ERROR`: breyta grafinu. `UNKNOWN_LAYOUT`: laga `layout=`-eigindið. `UNSUPPORTED_FEATURE`: forðast eiginleikann (til dæmis sfdp með `rotation=45`; sjá [töfluna](#unsupported-feature-reference)) |

### `InternalError`

| Atriði | Gildi |
|------|-------|
| Kastað þegar | Fullyrðing eða fastayrðing innan dot-engine bregst, eða villa sem er ekki frá dot-engine sleppur út úr uppsetningar- eða teiknirásinni |
| `type` | `render` |
| Kóðar | `INTERNAL_ERROR` |
| Reitir | `cause` (upprunalega villan, þegar ein var vafin) |
| Aðgerð kallanda | Tilkynna galla með DOT-frumkóðanum sem olli honum |

Ekkert sem DOT-höfundur getur breytt forðast `InternalError` með áreiðanlegum hætti.

## Kóðatilvísun

### `GvErrorCode`

| Kóði | Flokkur | `type` | Merking | Dæmigerð orsök | Aðgerð kallanda | Kastað af |
|------|-------|--------|---------|---------------|---------------|-----------|
| `SYNTAX_ERROR` | `ParseError` | `syntax` | Óvænt tákn | Innsláttarvilla, vantar `;` eða `}` | Laga DOT við `location` | `parse`, `renderSvg` |
| `SYNTAX_UNEXPECTED_EOF` | `ParseError` | `syntax` | Frumkóði endaði í miðri yfirlýsingu | Ólokað `{`, `[` eða strengur | Laga DOT við `location` | `parse`, `renderSvg` |
| `EDGE_OP_DIRECTED_IN_UNDIRECTED` | `ParseError` | `syntax` | `->` í óstefnugrafi | `graph { a -> b }` | Nota `--` | `parse`, `renderSvg` |
| `EDGE_OP_UNDIRECTED_IN_DIRECTED` | `ParseError` | `syntax` | `--` í stefnugrafi (digraph) | `digraph { a -- b }` | Nota `->` | `parse`, `renderSvg` |
| `GENERIC_ERROR` | `ParseError` | `syntax` | Frumkóði of djúpt hreiðraður til að þátta | Sjúklega hreiðruð hlutnet | Fletja út DOT | `parse`, `renderSvg` |
| `HTML_PARSE_ERROR` | `HtmlParseError` | `semantic` | Rangt mótaður HTML-líkur merkimiði | Óþekkt element, rangt eigindi | Engin: merkimiðinn teiknast tómur | Enginn (gripin innvortis) |
| `RENDER_ERROR` | `RenderError` | `render` | Banvæn uppsetningar- eða teiknivilla sem Graphviz myndi einnig tilkynna | Rangt mótað inntak fyrir uppsetningarstig | Breyta grafinu | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNKNOWN_LAYOUT` | `RenderError` | `semantic` | `layout=`-eigindi grafsins nefnir enga skráða vél | `layout="foo"` | Laga eigindið | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNSUPPORTED_FEATURE` | `RenderError` | `semantic` | Grafið biður um Graphviz-eiginleika sem dot-engine hefur ekki yfirfært | sfdp með `rotation=45` | Forðast eiginleikann | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `INTERNAL_ERROR` | `InternalError` | `render` | Galli í dot-engine | Misheppnuð fullyrðing, aðskotakast | Tilkynna galla | `renderSvg`, `render`, `getDrawOps`, aðferðir smiðs, `GvcContext.layout` (óvafið) |

### `UsageErrorCode`

| Kóði | Flokkur | Merking | Dæmigerð orsök | Aðgerð kallanda | Kastað af |
|------|-------|---------|---------------|---------------|-----------|
| `ERR_INVALID_ARG_TYPE` | `TypeError` | Röng tegund, `null`, eða nauðsynlega röksemd vantar | `renderSvg(undefined, 'dot')`, `getLayout(null)` | Laga kallið | Hvert opinbert fall sem tekur röksemdir |
| `ERR_INVALID_ARG_VALUE` | `TypeError` | Rétt tegund, óþekkt gildi | Óskráð heiti vélar eða sniðs; `getLayout(g, { yAxis: 'other' })` | Nota skráð heiti eða leyfilegt gildi | `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps`, `getLayout`, `GvcContext.layout`, `freeLayout`, `bestRenderer`, `renderWithContext` |
| `ERR_OUT_OF_RANGE` | `RangeError` | Tölugildi röksemdar utan marka | Frátekið | Laga kallið | Ekkert opinbert fall kastar henni í dag |
| `ERR_INVALID_STATE` | `Error` | Kall gert í röngu ástandi | `getLayout` fyrir uppsetningu | Raða fyrst upp (`render(g, ...)` eða `ctx.layout`) | `getLayout` |

Óskráðri vélarröksemd er hafnað jafnvel þótt DOT-frumkóðinn stilli gilt
`layout=`-eigindi. Röksemdin er könnuð fyrst.

## Tilvísun fyrir `UNSUPPORTED_FEATURE` {#unsupported-feature-reference}

Hvert eigindisgildi hér að neðan lætur uppsetningu kasta `RenderError` með kóðanum
`UNSUPPORTED_FEATURE` þar sem upprunalegt Graphviz myndi keyra reiknirit sem
dot-engine hefur ekki yfirfært. Valkosturinn var að teikna uppsetningu sem er
frábrugðin Graphviz án þess að segja frá því. Athugunin kviknar aðeins þegar
skilyrðið í dálknum „Kviknar þegar“ á við; sama eigindi annars staðar teiknast
eðlilega. Til að forðast villuna skaltu fjarlægja eigindið eða breyta því í
gildi sem er stutt.

| Vél | Eigindi og gildi | Kviknar þegar | Graphviz-eiginleiki sem þarf |
|--------|--------------------|------------|-------------------------|
| neato | `mode=hier` | Alltaf (eftir að grafið hefur 2+ hnúta og `maxiter` er ekki neikvætt) | Stigveld streituhámörkun (`stress_majorization_with_hierarchy`) |
| neato | `mode=ipsep` | Aðeins þegar Graphviz myndi smíða skorður: `diredgeconstraints` er satt eða `hier*`, `overlap=ipsep`, eða grafið hefur klasa á efsta stigi. Án skorða keyrir það sem streituhámörkun, eins og í Graphviz | Hámörkun með skorðum (`stress_majorization_cola`) |
| neato | `start=self` | `mode` er `major` (sjálfgildið) eða `ipsep` | Snjöll frumstilling (`smart_ini`). Undir `mode=KK` eða `mode=sgd` skráir það `start=0 not supported with mode=self - ignored` einu sinni við hverja teiknun, eins og Graphviz |
| neato | `model=subset` | `mode` er `major` eða `KK` | Hlutmengisfjarlægðarlíkanið |
| neato | `model=circuit` | `mode` er `major`, eða `KK` á samanhangandi grafi. `KK` á ósamanhangandi grafi án `pack` eða `packmode` skráir viðvörun og notar stystu leiðir, eins og Graphviz | Rásafjarlægðarlíkanið (`circuit_model`) |
| neato, twopi, circo, sfdp | `overlap=voronoi` (óháð há-/lágstöfum) | Grafið (fyrir twopi, íhlutur; fyrir sfdp, allt grafið eða íhlutur) hefur 2+ hnúta og eigin skörunartalning Graphviz (`countOverlap`, sem prófar marghyrninga hnúta) er yfir 0. Hnútar sem snertast aðeins í umgjörðarkassa kveikja það ekki. circo nær því aðeins fyrir graf með einn íhlut (með nokkrum íhlutum hunsar Graphviz `overlap` líka). sfdp nær því aðeins þegar `overlap` er ekki prism-hamur | Voronoi-skörunarfjarlæging (`vAdjust`) |
| fdp | `overlap=` eitt af `voronoi`, `oscale`, `vpsc`, `ipsep`, `ortho`, `ortho_yx`, `orthoxy`, `orthoyx`, `portho`, `portho_yx`, `porthoxy`, `porthoyx` | Hamurinn næst eftir `N:` kraftítrekunartilraunirnar, þ.e. þegar þær tilraunir fjarlægja ekki hverja skörun (eða `N` er 0 eða vantar). `N:`-forskeytið er leyft, til dæmis `3:voronoi` | Samsvarandi `removeOverlapWith`-aðlögunarreiknirit |
| fdp | `splines=compound` | Alltaf, með eða án klasa | Leggjaleiðing sem forðast klasa (`compoundEdges`) |
| sfdp | `smoothing=` hvað sem er nema `none` eða `0` | Alltaf | `post_process_smoothing` |
| sfdp | `rotation=` hvaða tala sem er önnur en núll | Alltaf | `rotate()` fyrir skörunarfjarlægingu |
| sfdp | `label_scheme=1` til `4` | Hnútur sem heitir `|edgelabel|...` er til, `overlap` leysist í `prism`-ham, og annaðhvort er kerfið 3 eða 4, eða kerfið er 1 eða 2 og prism-tilraunir eru yfir 0 (`overlap=prism` með tölu, ekki sjálfgildið `prism0`). Gildi yfir 4 teljast 0. Venjulegir leggjamerkimiðar kveikja það aldrei | Meðhöndlun hnúta fyrir leggjamerkimiða (`edge_labeling_scheme`) |
| sfdp | `quadtree=none` (einnig `0`, `false`) | Hvaða graf sem er með að minnsta kosti einn hnút. Skilaboðin nefna kerfið sem var leyst | `spring_electrical_embedding_slow` |
| sfdp | `quadtree=fast` (einnig `2`) | Hvaða graf sem er með að minnsta kosti einn hnút. Skilaboðin nefna kerfið sem var leyst | `spring_electrical_embedding_fast` |
| allar vélar | Hnútalögun sem er teiknuð með sérstöku `round_corners`-tilviki sem er ekki yfirfært | Hnúturinn notar þá lögun. Skilaboð: `special shape N not yet ported` | Teiknigrein `round_corners` fyrir lögunina. Þetta er innri varnagli gegn lögunarnúmeri án teikntilviks; engin nefnd lögun er þekkt fyrir að ná þangað |

Flest skilaboð hafa lögunina `<attribute>=<value>: <what> is not supported yet`.
Undantekningarnar eru `smoothing` og `rotation` (sem nefna rútínuna sem vantar),
fdp-línurnar og lögunarlínan, sem nota orðalagið hér að ofan. Greindu á
`err.code === 'UNSUPPORTED_FEATURE'`, ekki á textanum.

Gildi sem velja sjálfgildið (til dæmis `quadtree=normal`, `true`, `yes`,
`1`) og Graphviz-gildi sem eru yfirfærð (til dæmis
`start=regular`, `start=random`, `model=mds`, `mode=KK`, `mode=sgd`,
`overlap=prism`, `scale`-fjölskyldan og, á neato, twopi, circo og sfdp,
`overlap=oscale`, `vpsc` og `ortho*` / `portho*`-hamirnir) teiknast eðlilega.

## Tilvísun fyrir hvert fall

„Notkun“ þýðir `TypeError` með `ERR_INVALID_ARG_TYPE`, nema lína nefni annan
kóða.

| Fall | Getur kastað |
|----------|-----------|
| `renderSvg(dotSource, engine)` | Notkun (`dotSource` eða `engine` ekki strengur); `TypeError` `ERR_INVALID_ARG_VALUE` (vél ekki skráð); `ParseError`; `RenderError`; `InternalError` |
| `tryRenderSvg(dotSource, engine)` | Notkun (`dotSource` eða `engine` ekki strengur); `TypeError` `ERR_INVALID_ARG_VALUE` (vél ekki skráð). Ekkert annað: hver DOT-inntaksbilun er skilað í `errors` |
| `parse(dotSource)` | `TypeError` `ERR_INVALID_ARG_TYPE` (`dotSource` ekki strengur); `ParseError` |
| `render(g, format, opts?)` | Notkun (`g`, `format` eða `opts` af rangri tegund); `TypeError` `ERR_INVALID_ARG_VALUE` (vél eða snið ekki skráð); `RenderError`; `InternalError` |
| `getDrawOps(g, opts?)` | Notkun (`g` eða `opts` af rangri tegund); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.engine` ekki skráð); `RenderError`; `ParseError` (ekki var hægt að þátta milliliða-xdot aftur: galli í dot-engine); `InternalError` |
| `createGraph(opts?)` og aðferðir smiðs (`addNode`, `addEdge`, `addSubgraph`, `setAttr`, ...) | Notkun (rangar tegundir röksemda, þar á meðal eigindisgildi sem eru ekki strengir); `InternalError` (grafalíkanið gat ekki búið til hnút eða hlutnet) |
| `addEdge(g, tail, head, name?)` (úr `/api`) | Notkun (`g`, `tail` eða `head` ekki hlutur; `name` ekki strengur) |
| `getLayout(g, opts?)` | Notkun (`g` eða `opts` ekki hlutur); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.yAxis` hvorki `'up'` né `'down'`); `Error` `ERR_INVALID_STATE` (grafið er ekki uppsett) |
| `new GvcContext(measurer, options?)` | Notkun (`measurer` hefur ekkert `measure`-fall; `options` ekki hlutur) |
| `ctx.register(plugin)` | Notkun (ekki teiknivélarviðbót eða uppsetningarvél) |
| `ctx.layout(g, engine)` | Notkun (`g` ekki hlutur, `engine` ekki strengur); `TypeError` `ERR_INVALID_ARG_VALUE` (vél ekki skráð); `RenderError` `UNKNOWN_LAYOUT`. Vélarbilanir berast áfram óvafðar |
| `ctx.freeLayout(g, engine)` | Notkun; `TypeError` `ERR_INVALID_ARG_VALUE` (vél ekki skráð). Vélarbilanir berast áfram óvafðar |
| `ctx.bestRenderer(format)` | Notkun (`format` ekki strengur); `TypeError` `ERR_INVALID_ARG_VALUE` (engin teiknivél fyrir `format`) |
| `renderWithContext(ctx, g, format, inlineImages?)` | Notkun (`ctx` ekki `GvcContext`, `g` ekki hlutur, `format` ekki strengur); `TypeError` `ERR_INVALID_ARG_VALUE` (engin teiknivél fyrir `format`). Teiknibilanir berast áfram óvafðar |
| `setImageSizer(sizer)` | Notkun (ekki fall eða `null`) |
| `setImageResolver(fn)` | Notkun (ekki fall eða `null`) |
| `setTextMeasurer(measurer)` | Notkun (ekki `TextMeasurer` eða `undefined`) |

### Hvaða föll vefja aðskotakösti

| Föll | Hegðun við óvænt kast (ekki frá dot-engine) |
|-----------|---------------------------------------------------|
| `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps` | Vafið sem `InternalError`; `cause` er upprunalega villan |
| `renderWithContext` og hver `GvcContext`-aðferð | **Ekki vafið.** Galli í vél berst til kallanda sem það sem vélin kastaði, til dæmis venjuleg `TypeError` án `code` |

Ef þú notar `GvcContext` beint skaltu líta á villu sem er hvorki `DotEngineError`
né notkunarvilla sem galla í dot-engine.

## `tryRenderSvg` eða `renderSvg`

| | `renderSvg` | `tryRenderSvg` |
|---|-------------|----------------|
| Slæmt DOT eða uppsetningarbilun | Kastar `DotEngineError` | Skilar `{ errors: [one] }` |
| Slæmar röksemdir | Kastar notkunarvillu | Kastar notkunarvillu |
| Villugildi | `Error` með staflaslóð og `cause` | Hrein gögn: `type`, `code`, `message`, `friendlyMessage`, auk `location` / `expected` þegar til staðar |
| Notaðu þegar | Bilun á að stöðva kallandann | Þú greinir á `code`, eða sendir villuna yfir `postMessage` eða í annál |

`tryRenderSvg` kastar aldrei fyrir neitt DOT-inntak. Það kastar aðeins þegar
röksemdirnar sjálfar eru ógildar, sem er galli í kallandi kóða. Villuhlutirnir
sem það skilar bera hvorki `cause` né staflaslóð.

## Vafðar bilanir og `cause`

Þegar `renderSvg`, `render` eða `getDrawOps` grípur villu sem dot-engine kastaði
ekki sjálft kastar það `InternalError` þar sem `cause` er upprunalega villan.
`message` er upprunalega skilaboðið.

`cause` er óteljanlegt (non-enumerable), svo `JSON.stringify(err)` sleppir því.
Gakktu keðjuna beint þegar þú skráir í annál (sjá síðasta dæmið hér að neðan).

## Athuganir milli búnta

`instanceof DotEngineError` virkar innan eins eintaks af bókasafninu. Ef tvö
eintök geta verið hlaðin (tvítekin búnt, viðbótarhýsill) skaltu nota
`isGvError(e)`. Það kannar hvort `type` og `code` séu strengir og virkar milli
eintaka. Það tekur einnig við hreinu hlutunum sem `tryRenderSvg` skilar.

## Dæmi

Aðgreina fjölskyldurnar tvær:

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

Meðhöndla niðurstöðu `tryRenderSvg`:

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

Skrá `InternalError` með orsök sinni í annál:

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

## Sjá einnig

- [API-tilvísun (úrval)](/is/guide/api) fyrir undirskrift hvers falls.
- [Tegundir](/is/guide/types) fyrir lögun `GvError` og `RenderResult`.
- [Myndað API (TypeDoc)](/reference/) fyrir fullu sambönd `GvErrorCode` og `UsageErrorCode`.
