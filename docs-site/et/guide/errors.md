---
sourceHash: 545227fb3a0a91494ed7a2c299e5a9ca93a594d68d99e0596f743e7597dfbae9
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Vead ja erandid

dot-engine viskab kahte liiki vigu. See, millist liiki te püüate, ütleb teile, kes
peab midagi muutma.

## Kaks perekonda, üks reegel

| Perekond | Kuidas ära tunda | Tähendus | Kes tegutseb |
|--------|---------------------|---------|----------|
| dot-engine'i tõrge | `err instanceof DotEngineError` | dot-engine ebaõnnestus selle sisendi peal: vigane DOT, saatuslik viga, mida Graphviz ise teataks, toetamata Graphvizi funktsioon või dot-engine'i viga | DOT-i autor või veateade |
| Kasutusviga | standardne `TypeError` / `RangeError` / `Error`, mille `err.code` algab `ERR_`-ga | Kutse oli vale: vale argumenditüüp, tundmatu mootori- või vormingunimi, vale kutsejärjekord | Kutsuv kood |

Hargnege `.code` järgi, mitte sõnumi teksti järgi. Sõnumid võivad väljalasete
vahel muutuda; koodid on stabiilsed.

Kasutusvead ei ole `DotEngineError`-id ega implementeeri `GvError`-i. Nende
`name` jääb `TypeError`, `RangeError` või `Error`, nagu Node.js-is.

## Klassiteatmik

Kõik neli allolevat klassi laiendavad `DotEngineError`-it ja implementeerivad
`GvError` kuju (`type`, `code`, `message`, `friendlyMessage`, valikuline
`location` ja `expected`).

### `DotEngineError` (abstraktne)

Ühine alus. `instanceof DotEngineError` on tõene iga vea kohta, mille dot-engine
oma sisendi kohta tõstatab. Seda ei saa otse konstrueerida. `type`, `code` ja
`friendlyMessage` määratlevad alamklassid.

### `ParseError`

| Üksus | Väärtus |
|------|-------|
| Visatakse, kui | DOT-lähtekood ei ole kehtiv või kasutab graafi liigi jaoks vale serva operaatorit |
| `type` | `syntax` |
| Koodid | `SYNTAX_ERROR`, `SYNTAX_UNEXPECTED_EOF`, `EDGE_OP_DIRECTED_IN_UNDIRECTED`, `EDGE_OP_UNDIRECTED_IN_DIRECTED`, `GENERIC_ERROR` |
| Väljad | `location` (`{ line, column, offset? }`), `expected` (parseri ootused; ainult `SYNTAX_*`), `line` ja `column` getterid |
| Kutsuja tegevus | Parandage DOT-lähtekood. Näidake autorile `location`-it ja `friendlyMessage`-it |

`GENERIC_ERROR` `ParseError`-i puhul tähendab, et lähtekood on nii sügavalt
pesastatud, et parseril sai pinumälu otsa.

### `HtmlParseError`

| Üksus | Väärtus |
|------|-------|
| Visatakse, kui | Ei jõua praegu kunagi kutsujani (vt allpool) |
| `type` | `semantic` |
| Koodid | `HTML_PARSE_ERROR` |
| Väljad | `tag` (süüdlane märk). `location`-it ega `expected`-it ei ole |
| Kutsuja tegevus | Puudub. Vigase sildi leidmiseks võrrelge renderdatud väljundit sellega, mida ootasite |

HTML-laadse sildi parser tõstatab `HtmlParseError`-i tundmatu elemendi,
vigase atribuudi või valesse kohta pandud `<TABLE>`, `<HR>` või `<VR>` korral.
Paigutusetapp püüab selle kinni ja jätab sildi sisutuks, nagu Graphviz: graaf
renderdub endiselt, tühja sildiga. Ükski avalik funktsioon ei levita seda edasi.

`HtmlParseError` ei ole paketi juurest eksporditud. Kui see ometi kunagi teieni
jõuab, tuvastab selle `err instanceof DotEngineError && err.code === 'HTML_PARSE_ERROR'`.

### `RenderError`

| Üksus | Väärtus |
|------|-------|
| Visatakse, kui | Paigutus või renderdamine ebaõnnestub viisil, mida Graphviz ise teataks, graaf nimetab kättesaamatut paigutusmootorit või graaf kasutab Graphvizi funktsiooni, mida dot-engine ei ole portinud |
| `type` | `render` koodi `RENDER_ERROR` puhul; `semantic` koodide `UNKNOWN_LAYOUT` ja `UNSUPPORTED_FEATURE` puhul |
| Koodid | `RENDER_ERROR`, `UNKNOWN_LAYOUT`, `UNSUPPORTED_FEATURE` |
| Väljad | `cause`, kui tõrge mähkis mõnda teist viga. `location`-it ei ole |
| Kutsuja tegevus | `RENDER_ERROR`: muutke graafi. `UNKNOWN_LAYOUT`: parandage atribuut `layout=`. `UNSUPPORTED_FEATURE`: vältige funktsiooni (näiteks sfdp koos `rotation=45`-ga; vt [tabelit](#unsupported-feature-referenz)) |

### `InternalError`

| Üksus | Väärtus |
|------|-------|
| Visatakse, kui | dot-engine'i seesmine väide või invariant ebaõnnestub või paigutus- või renderdustorusse pääseb mitte-dot-engine'i viga |
| `type` | `render` |
| Koodid | `INTERNAL_ERROR` |
| Väljad | `cause` (algne viga, kui see mähiti) |
| Kutsuja tegevus | Teatage veast koos DOT-lähtekoodiga, mis selle vallandas |

Miski, mida DOT-i autor saaks muuta, ei väldi `InternalError`-it usaldusväärselt.

## Kooditeatmik

### `GvErrorCode`

| Kood | Klass | `type` | Tähendus | Tüüpiline põhjus | Kutsuja tegevus | Tõstatab |
|------|-------|--------|---------|---------------|---------------|-----------|
| `SYNTAX_ERROR` | `ParseError` | `syntax` | Ootamatu märk | Kirjaviga, puuduv `;` või `}` | Parandage DOT kohas `location` | `parse`, `renderSvg` |
| `SYNTAX_UNEXPECTED_EOF` | `ParseError` | `syntax` | Lähtekood lõppes lause keskel | Sulgemata `{`, `[` või sõne | Parandage DOT kohas `location` | `parse`, `renderSvg` |
| `EDGE_OP_DIRECTED_IN_UNDIRECTED` | `ParseError` | `syntax` | `->` suunamata graafis | `graph { a -> b }` | Kasutage `--` | `parse`, `renderSvg` |
| `EDGE_OP_UNDIRECTED_IN_DIRECTED` | `ParseError` | `syntax` | `--` suunatud graafis | `digraph { a -- b }` | Kasutage `->` | `parse`, `renderSvg` |
| `GENERIC_ERROR` | `ParseError` | `syntax` | Lähtekood on parsimiseks liiga sügavalt pesastatud | Patoloogiliselt pesastatud alamgraafid | Lamestage DOT | `parse`, `renderSvg` |
| `HTML_PARSE_ERROR` | `HtmlParseError` | `semantic` | Vigane HTML-laadne silt | Tundmatu element, vigane atribuut | Puudub: silt renderdub tühjana | Puudub (püütakse seespidiselt kinni) |
| `RENDER_ERROR` | `RenderError` | `render` | Saatuslik paigutus- või renderdusviga, mida Graphviz samuti teataks | Paigutusetapi jaoks vigane sisend | Muutke graafi | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNKNOWN_LAYOUT` | `RenderError` | `semantic` | Graafi atribuut `layout=` nimetab mootorit, mida ei ole registreeritud | `layout="foo"` | Parandage atribuut | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNSUPPORTED_FEATURE` | `RenderError` | `semantic` | Graaf nõuab Graphvizi funktsiooni, mida dot-engine ei ole portinud | sfdp koos `rotation=45`-ga | Vältige funktsiooni | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `INTERNAL_ERROR` | `InternalError` | `render` | dot-engine'i viga | Ebaõnnestunud väide, võõras throw | Teatage veast | `renderSvg`, `render`, `getDrawOps`, koostaja meetodid, `GvcContext.layout` (mähkimata) |

### `UsageErrorCode`

| Kood | Klass | Tähendus | Tüüpiline põhjus | Kutsuja tegevus | Tõstatab |
|------|-------|---------|---------------|---------------|-----------|
| `ERR_INVALID_ARG_TYPE` | `TypeError` | Vale tüüp, `null` või puuduv kohustuslik argument | `renderSvg(undefined, 'dot')`, `getLayout(null)` | Parandage kutse | Iga avalik funktsioon, mis argumente võtab |
| `ERR_INVALID_ARG_VALUE` | `TypeError` | Õige tüüp, tundmatu väärtus | Registreerimata mootori- või vormingunimi; `getLayout(g, { yAxis: 'other' })` | Kasutage registreeritud nime või lubatud väärtust | `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps`, `getLayout`, `GvcContext.layout`, `freeLayout`, `bestRenderer`, `renderWithContext` |
| `ERR_OUT_OF_RANGE` | `RangeError` | Arvargument väljaspool oma vahemikku | Reserveeritud | Parandage kutse | Ükski avalik funktsioon ei tõstata seda praegu |
| `ERR_INVALID_STATE` | `Error` | Kutse tehti vales olekus | `getLayout` enne paigutust | Paigutage kõigepealt (`render(g, ...)` või `ctx.layout`) | `getLayout` |

Registreerimata mootori argument lükatakse tagasi ka siis, kui DOT-lähtekood
määrab kehtiva atribuudi `layout=`. Argumenti kontrollitakse esimesena.

## `UNSUPPORTED_FEATURE` teatmik {#unsupported-feature-referenz}

Iga allolev atribuudiväärtus paneb paigutuse viskama `RenderError`-i koodiga
`UNSUPPORTED_FEATURE` seal, kus natiivne Graphviz käivitaks algoritmi, mida
dot-engine ei ole portinud. Alternatiiv oleks renderdada paigutus, mis erineb
Graphvizist, sellest teatamata. Kontroll käivitub ainult siis, kui veerus
„Käivitub, kui“ olev tingimus kehtib; sama atribuut mujal renderdub tavapäraselt.
Vea vältimiseks eemaldage atribuut või muutke see toetatud väärtuseks.

| Mootor | Atribuut ja väärtus | Käivitub, kui | Vajalik Graphvizi funktsioon |
|--------|--------------------|---------------|-------------------------|
| neato | `mode=hier` | Alati (pärast seda, kui graafis on 2+ sõlme ja `maxiter` ei ole negatiivne) | Hierarhiline pingemajoriseerimine (`stress_majorization_with_hierarchy`) |
| neato | `mode=ipsep` | Ainult siis, kui Graphviz ehitaks piirangud: `diredgeconstraints` on tõene või `hier*`, `overlap=ipsep` või graafil on ülemise taseme klaster. Ilma piiranguteta töötab see pingemajoriseerimisena, nagu Graphvizis | Piiranguga majoriseerimine (`stress_majorization_cola`) |
| neato | `start=self` | `mode` on `major` (vaikimisi) või `ipsep` | Nutikas lähtestamine (`smart_ini`). Režiimis `mode=KK` või `mode=sgd` logib see üks kord renderduse kohta `start=0 not supported with mode=self - ignored`, nagu Graphviz |
| neato | `model=subset` | `mode` on `major` või `KK` | Alamhulga kaugusemudel |
| neato | `model=circuit` | `mode` on `major` või `KK` ühtsel graafil. `KK` mitteühtsel graafil ilma `pack`-i või `packmode`-ita logib hoiatuse ja kasutab lühimaid teid, nagu Graphviz | Vooluringi kaugusemudel (`circuit_model`) |
| neato, twopi, circo, sfdp | `overlap=voronoi` (tõstutundetu) | Graafil (twopi puhul komponendil; sfdp puhul kogu graafil või komponendil) on 2+ sõlme ja Graphvizi enda kattuvuste arv (`countOverlap`, mis testib sõlmede hulknurki) on üle 0. Sõlmed, mis puudutavad ainult piirdekasti kaudu, seda ei käivita. circo jõuab selleni ainult ühe komponendiga graafil (mitme komponendi korral eirab Graphviz `overlap`-i samuti). sfdp jõuab selleni ainult siis, kui `overlap` ei ole prisma-režiim | Voronoi kattuvuse eemaldamine (`vAdjust`) |
| fdp | `overlap=` üks väärtustest `voronoi`, `oscale`, `vpsc`, `ipsep`, `ortho`, `ortho_yx`, `orthoxy`, `orthoyx`, `portho`, `portho_yx`, `porthoxy`, `porthoyx` | Režiimini jõutakse pärast `N:` jõuiteratsioonide katseid, st kui need katsed ei eemalda kõiki kattuvusi (või `N` on 0 või puudub). Eesliide `N:` on lubatud, näiteks `3:voronoi` | Vastav `removeOverlapWith` kohandusalgoritm |
| fdp | `splines=compound` | Alati, klastritega või ilma | Klastreid vältiv servade marsruutimine (`compoundEdges`) |
| sfdp | `smoothing=` mis tahes muu kui `none` või `0` | Alati | `post_process_smoothing` |
| sfdp | `rotation=` mis tahes nullist erinev arv | Alati | `rotate()` enne kattuvuse eemaldamist |
| sfdp | `label_scheme=1` kuni `4` | Olemas on sõlm nimega `|edgelabel|...`, `overlap` lahendub režiimiks `prism` ja kas skeem on 3 või 4 või skeem on 1 või 2 ning prisma katseid on üle 0 (`overlap=prism` arvuga, mitte vaike-`prism0`). Väärtused üle 4 loetakse 0-ks. Tavalised servasildid ei käivita seda kunagi | Servasildi sõlmede käsitlus (`edge_labeling_scheme`) |
| sfdp | `quadtree=none` (ka `0`, `false`) | Mis tahes graaf vähemalt ühe sõlmega. Sõnum nimetab lahendatud skeemi | `spring_electrical_embedding_slow` |
| sfdp | `quadtree=fast` (ka `2`) | Mis tahes graaf vähemalt ühe sõlmega. Sõnum nimetab lahendatud skeemi | `spring_electrical_embedding_fast` |
| kõik mootorid | Sõlmekuju, mida joonistab portimata erijuhtum `round_corners` | Sõlm kasutab seda kuju. Sõnum: `special shape N not yet ported` | Kuju `round_corners` joonistusharu. See on sisemine kaitse kujunumbri vastu, millel puudub joonistusjuhtum; ühegi nimega kuju kohta ei ole teada, et see selleni jõuaks |

Enamik sõnumeid on kujul `<attribute>=<value>: <what> is not supported yet`.
Erandid on `smoothing` ja `rotation` (mis nimetavad puuduvat rutiini), fdp read
ja kujurida, mis kasutavad ülaltoodud sõnastust. Hargnege
`err.code === 'UNSUPPORTED_FEATURE'` järgi, mitte teksti järgi.

Väärtused, mis valivad vaikeseade (näiteks `quadtree=normal`, `true`, `yes`,
`1`), ning Graphvizi aktsepteeritud väärtused, mis on portitud (näiteks
`start=regular`, `start=random`, `model=mds`, `mode=KK`, `mode=sgd`,
`overlap=prism`, `scale`-perekond ning neato, twopi, circo ja sfdp puhul
`overlap=oscale`, `vpsc` ning režiimid `ortho*` / `portho*`) renderduvad
tavapäraselt.

## Funktsioonipõhine teatmik

„Kasutus“ tähendab `TypeError`-it koodiga `ERR_INVALID_ARG_TYPE`, kui rida ei
nimeta teist koodi.

| Funktsioon | Võib visata |
|----------|-----------|
| `renderSvg(dotSource, engine)` | Kasutus (`dotSource` või `engine` ei ole sõne); `TypeError` `ERR_INVALID_ARG_VALUE` (mootor ei ole registreeritud); `ParseError`; `RenderError`; `InternalError` |
| `tryRenderSvg(dotSource, engine)` | Kasutus (`dotSource` või `engine` ei ole sõne); `TypeError` `ERR_INVALID_ARG_VALUE` (mootor ei ole registreeritud). Muud midagi: iga DOT-sisendi tõrge tagastatakse väljal `errors` |
| `parse(dotSource)` | `TypeError` `ERR_INVALID_ARG_TYPE` (`dotSource` ei ole sõne); `ParseError` |
| `render(g, format, opts?)` | Kasutus (`g`, `format` või `opts` vale tüüp); `TypeError` `ERR_INVALID_ARG_VALUE` (mootor või vorming ei ole registreeritud); `RenderError`; `InternalError` |
| `getDrawOps(g, opts?)` | Kasutus (`g` või `opts` vale tüüp); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.engine` ei ole registreeritud); `RenderError`; `ParseError` (vahepealset xdot-i ei saanud uuesti parsida: dot-engine'i viga); `InternalError` |
| `createGraph(opts?)` ja koostaja meetodid (`addNode`, `addEdge`, `addSubgraph`, `setAttr`, ...) | Kasutus (valed argumenditüübid, sh atribuudiväärtused, mis ei ole sõned); `InternalError` (graafimudel ei suutnud sõlme või alamgraafi luua) |
| `addEdge(g, tail, head, name?)` (failist `/api`) | Kasutus (mitteobjektist `g`, `tail` või `head`; mittesõne `name`) |
| `getLayout(g, opts?)` | Kasutus (`g` või `opts` ei ole objekt); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.yAxis` ei ole `'up'` ega `'down'`); `Error` `ERR_INVALID_STATE` (graaf ei ole paigutatud) |
| `new GvcContext(measurer, options?)` | Kasutus (`measurer`-il puudub funktsioon `measure`; `options` ei ole objekt) |
| `ctx.register(plugin)` | Kasutus (ei ole renderdaja plugin ega paigutusmootor) |
| `ctx.layout(g, engine)` | Kasutus (`g` ei ole objekt, `engine` ei ole sõne); `TypeError` `ERR_INVALID_ARG_VALUE` (mootor ei ole registreeritud); `RenderError` `UNKNOWN_LAYOUT`. Mootori tõrked levivad mähkimata |
| `ctx.freeLayout(g, engine)` | Kasutus; `TypeError` `ERR_INVALID_ARG_VALUE` (mootor ei ole registreeritud). Mootori tõrked levivad mähkimata |
| `ctx.bestRenderer(format)` | Kasutus (`format` ei ole sõne); `TypeError` `ERR_INVALID_ARG_VALUE` (vormingule `format` ei ole renderdajat) |
| `renderWithContext(ctx, g, format, inlineImages?)` | Kasutus (`ctx` ei ole `GvcContext`, `g` ei ole objekt, `format` ei ole sõne); `TypeError` `ERR_INVALID_ARG_VALUE` (vormingule `format` ei ole renderdajat). Renderdustõrked levivad mähkimata |
| `setImageSizer(sizer)` | Kasutus (ei ole funktsioon ega `null`) |
| `setImageResolver(fn)` | Kasutus (ei ole funktsioon ega `null`) |
| `setTextMeasurer(measurer)` | Kasutus (ei ole `TextMeasurer` ega `undefined`) |

### Millised funktsioonid mähivad võõraid throw'e

| Funktsioonid | Käitumine ootamatu (mitte-dot-engine'i) throw korral |
|-----------|---------------------------------------------------|
| `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps` | Mähitakse `InternalError`-iks; `cause` on algne viga |
| `renderWithContext` ja iga `GvcContext`-i meetod | **Ei mähita.** Mootori viga jõuab kutsujani sellena, mida mootor viskas, näiteks tavaline `TypeError` ilma `code`-ita |

Kui kasutate `GvcContext`-i otse, käsitlege viga, mis ei ole ei `DotEngineError`
ega kasutusviga, dot-engine'i veana.

## `tryRenderSvg` või `renderSvg`

| | `renderSvg` | `tryRenderSvg` |
|---|-------------|----------------|
| Vigane DOT või paigutustõrge | Viskab `DotEngineError`-i | Tagastab `{ errors: [one] }` |
| Vigased argumendid | Viskab kasutusvea | Viskab kasutusvea |
| Veaväärtus | `Error` pinujälje ja `cause`-iga | Tavaandmed: `type`, `code`, `message`, `friendlyMessage`, pluss `location` / `expected`, kui need on olemas |
| Kasutage, kui | Tõrge peaks kutsuja katkestama | Hargnete `code` järgi või saadate vea üle `postMessage`-i või logisse |

`tryRenderSvg` ei viska kunagi ühegi DOT-sisendi korral. See viskab ainult siis,
kui argumendid ise on kehtetud, mis on kutsuva koodi viga. Selle tagastatavatel
veaobjektidel ei ole `cause`-i ega pinujälge.

## Mähitud tõrked ja `cause`

Kui `renderSvg`, `render` või `getDrawOps` püüab vea, mida dot-engine ei
tõstatanud, viskab see `InternalError`-i, mille `cause` on algne viga.
`message` on algne sõnum.

`cause` ei ole loendatav, seega jätab `JSON.stringify(err)` selle välja. Käige
ahel logimisel selgesõnaliselt läbi (vt allpool viimast näidet).

## Komplektideülesed kontrollid

`instanceof DotEngineError` töötab ühe teegikoopia piires. Kui võib laadida kaks
koopiat (dubleeritud komplektid, pluginate host), kasutage `isGvError(e)`. See
kontrollib sõne-`type`-i ja `code`-i olemasolu ning töötab üle koopiate. See
aktsepteerib ka `tryRenderSvg`-i tagastatavaid tavaobjekte.

## Näited

Eraldage need kaks perekonda:

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

Käsitlege `tryRenderSvg` tulemust:

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

Logige `InternalError` koos oma põhjusega:

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

## Vt ka

- [API teatmik (valik)](/et/guide/api) iga funktsiooni signatuuri kohta.
- [Tüübid](/et/guide/types) kujude `GvError` ja `RenderResult` kohta.
- [Genereeritud API (TypeDoc)](/reference/) täielike liitude `GvErrorCode` ja `UsageErrorCode` kohta.
