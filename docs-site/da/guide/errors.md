---
sourceHash: 545227fb3a0a91494ed7a2c299e5a9ca93a594d68d99e0596f743e7597dfbae9
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Fejl og undtagelser

dot-engine kaster to slags fejl. Hvilken slags du fanger, fortæller dig, hvem der
skal ændre noget.

## To familier, én regel

| Familie | Sådan genkender du den | Betydning | Hvem handler |
|--------|---------------------|---------|----------|
| dot-engine-fejl | `err instanceof DotEngineError` | dot-engine fejlede på dette input: ugyldig DOT, en fatal fejl, som Graphviz selv ville rapportere, en Graphviz-funktion, der ikke understøttes, eller en fejl i dot-engine | DOT-forfatteren, eller en fejlrapport |
| Brugsfejl | standard `TypeError` / `RangeError` / `Error` med `err.code`, der begynder med `ERR_` | Kaldet var forkert: forkert argumenttype, ukendt motor- eller formatnavn, forkert kaldrækkefølge | Den kaldende kode |

Forgren på `.code`, ikke på meddelelsesteksten. Meddelelser kan ændre sig mellem
udgivelser; koder er stabile.

Brugsfejl er ikke `DotEngineError`s og implementerer ikke `GvError`. Deres
`name` forbliver `TypeError`, `RangeError` eller `Error`, som i Node.js.

## Klassereference

Alle fire klasser nedenfor udvider `DotEngineError` og implementerer formen
`GvError` (`type`, `code`, `message`, `friendlyMessage`, valgfri `location` og
`expected`).

### `DotEngineError` (abstrakt)

Den fælles basis. `instanceof DotEngineError` er sand for hver fejl, dot-engine
rejser om sit input. Den kan ikke konstrueres direkte. `type`, `code` og
`friendlyMessage` defineres af underklasserne.

### `ParseError`

| Punkt | Værdi |
|------|-------|
| Kastes når | DOT-kildekoden er ugyldig, eller bruger den forkerte kantoperator for grafens art |
| `type` | `syntax` |
| Koder | `SYNTAX_ERROR`, `SYNTAX_UNEXPECTED_EOF`, `EDGE_OP_DIRECTED_IN_UNDIRECTED`, `EDGE_OP_UNDIRECTED_IN_DIRECTED`, `GENERIC_ERROR` |
| Felter | `location` (`{ line, column, offset? }`), `expected` (parserens forventninger; kun `SYNTAX_*`), getterne `line` og `column` |
| Kalderens handling | Ret DOT-kildekoden. Vis `location` og `friendlyMessage` til forfatteren |

`GENERIC_ERROR` på en `ParseError` betyder, at kildekoden er så dybt indlejret,
at parseren løb tør for stak.

### `HtmlParseError`

| Punkt | Værdi |
|------|-------|
| Kastes når | Når i dag aldrig frem til en kalder (se nedenfor) |
| `type` | `semantic` |
| Koder | `HTML_PARSE_ERROR` |
| Felter | `tag` (det anstødelige token). Ingen `location` eller `expected` |
| Kalderens handling | Ingen. For at finde en dårlig etiket, sammenlign det renderede output med det, du forventede |

Parseren for HTML-lignende etiketter rejser `HtmlParseError` ved et ukendt
element, en misdannet attribut eller en forkert placeret `<TABLE>`, `<HR>` eller
`<VR>`. Layouttrinnet fanger den og giver etiketten intet indhold, som Graphviz
gør: grafen renderes stadig, med en tom etiket. Ingen offentlig funktion
propagerer den.

`HtmlParseError` eksporteres ikke fra pakkens rod. Hvis en alligevel skulle nå
frem til dig, identificerer
`err instanceof DotEngineError && err.code === 'HTML_PARSE_ERROR'` den.

### `RenderError`

| Punkt | Værdi |
|------|-------|
| Kastes når | Layout eller rendering fejler på en måde, Graphviz selv ville rapportere, grafen navngiver en utilgængelig layoutmotor, eller grafen bruger en Graphviz-funktion, som dot-engine ikke har portereret |
| `type` | `render` for `RENDER_ERROR`; `semantic` for `UNKNOWN_LAYOUT` og `UNSUPPORTED_FEATURE` |
| Koder | `RENDER_ERROR`, `UNKNOWN_LAYOUT`, `UNSUPPORTED_FEATURE` |
| Felter | `cause`, når fejlen har pakket en anden fejl ind. Ingen `location` |
| Kalderens handling | `RENDER_ERROR`: ændr grafen. `UNKNOWN_LAYOUT`: ret attributten `layout=`. `UNSUPPORTED_FEATURE`: undgå funktionen (for eksempel sfdp med `rotation=45`; se [tabellen](#unsupported-feature-reference)) |

### `InternalError`

| Punkt | Værdi |
|------|-------|
| Kastes når | En assertion eller invariant i dot-engine fejler, eller en fejl, der ikke stammer fra dot-engine, slipper ud af layout- eller renderpipelinen |
| `type` | `render` |
| Koder | `INTERNAL_ERROR` |
| Felter | `cause` (den oprindelige fejl, når en er blevet pakket ind) |
| Kalderens handling | Rapportér en fejl sammen med den DOT-kildekode, der udløste den |

Intet, DOT-forfatteren kan ændre, undgår pålideligt en `InternalError`.

## Kodereference

### `GvErrorCode`

| Kode | Klasse | `type` | Betydning | Typisk årsag | Kalderens handling | Rejses af |
|------|-------|--------|---------|---------------|---------------|-----------|
| `SYNTAX_ERROR` | `ParseError` | `syntax` | Uventet token | Slåfejl, manglende `;` eller `}` | Ret DOT ved `location` | `parse`, `renderSvg` |
| `SYNTAX_UNEXPECTED_EOF` | `ParseError` | `syntax` | Kildekoden sluttede midt i en sætning | Ulukket `{`, `[` eller streng | Ret DOT ved `location` | `parse`, `renderSvg` |
| `EDGE_OP_DIRECTED_IN_UNDIRECTED` | `ParseError` | `syntax` | `->` i en urettet graf | `graph { a -> b }` | Brug `--` | `parse`, `renderSvg` |
| `EDGE_OP_UNDIRECTED_IN_DIRECTED` | `ParseError` | `syntax` | `--` i en digraf | `digraph { a -- b }` | Brug `->` | `parse`, `renderSvg` |
| `GENERIC_ERROR` | `ParseError` | `syntax` | Kildekoden er for dybt indlejret til at kunne parses | Patologisk indlejrede undergrafer | Flad DOT ud | `parse`, `renderSvg` |
| `HTML_PARSE_ERROR` | `HtmlParseError` | `semantic` | Misdannet HTML-lignende etiket | Ukendt element, dårlig attribut | Ingen: etiketten renderes tom | Ingen (fanges internt) |
| `RENDER_ERROR` | `RenderError` | `render` | En fatal layout- eller renderfejl, som Graphviz også ville rapportere | Misdannet input til et layouttrin | Ændr grafen | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNKNOWN_LAYOUT` | `RenderError` | `semantic` | Grafens attribut `layout=` navngiver ingen registreret motor | `layout="foo"` | Ret attributten | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNSUPPORTED_FEATURE` | `RenderError` | `semantic` | Grafen anmoder om en Graphviz-funktion, som dot-engine ikke har portereret | sfdp med `rotation=45` | Undgå funktionen | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `INTERNAL_ERROR` | `InternalError` | `render` | Fejl i dot-engine | Fejlet assertion, fremmed throw | Rapportér en fejl | `renderSvg`, `render`, `getDrawOps`, builder-metoder, `GvcContext.layout` (uindpakket) |

### `UsageErrorCode`

| Kode | Klasse | Betydning | Typisk årsag | Kalderens handling | Rejses af |
|------|-------|---------|---------------|---------------|-----------|
| `ERR_INVALID_ARG_TYPE` | `TypeError` | Forkert type, `null` eller et manglende påkrævet argument | `renderSvg(undefined, 'dot')`, `getLayout(null)` | Ret kaldet | Hver offentlig funktion, der tager argumenter |
| `ERR_INVALID_ARG_VALUE` | `TypeError` | Rigtig type, ukendt værdi | Uregistreret motor- eller formatnavn; `getLayout(g, { yAxis: 'other' })` | Brug et registreret navn eller en tilladt værdi | `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps`, `getLayout`, `GvcContext.layout`, `freeLayout`, `bestRenderer`, `renderWithContext` |
| `ERR_OUT_OF_RANGE` | `RangeError` | Numerisk argument uden for sit interval | Reserveret | Ret kaldet | Ingen offentlig funktion rejser den i dag |
| `ERR_INVALID_STATE` | `Error` | Kald foretaget i den forkerte tilstand | `getLayout` før layout | Læg først ud (`render(g, ...)` eller `ctx.layout`) | `getLayout` |

Et uregistreret motorargument afvises, selv når DOT-kildekoden sætter en gyldig
attribut `layout=`. Argumentet kontrolleres først.

## Reference for `UNSUPPORTED_FEATURE` {#unsupported-feature-reference}

Hver attributværdi nedenfor får layout til at kaste en `RenderError` med koden
`UNSUPPORTED_FEATURE`, hvor native Graphviz ville køre en algoritme, som
dot-engine ikke har portereret. Alternativet var at rendere et layout, der
afviger fra Graphviz, uden at sige det. Kontrollen udløses kun, når betingelsen
i kolonnen "Udløses når" gælder; den samme attribut andre steder renderes
normalt. For at undgå fejlen skal du fjerne attributten eller ændre den til en
understøttet værdi.

| Motor | Attribut og værdi | Udløses når | Nødvendig Graphviz-funktion |
|--------|--------------------|------------|-------------------------|
| neato | `mode=hier` | Altid (efter at grafen har 2+ knuder, og `maxiter` ikke er negativ) | Hierarkisk stress-majorisering (`stress_majorization_with_hierarchy`) |
| neato | `mode=ipsep` | Kun når Graphviz ville bygge begrænsninger: `diredgeconstraints` er sand eller `hier*`, `overlap=ipsep`, eller grafen har et cluster på øverste niveau. Uden begrænsninger kører den som stress-majorisering, som i Graphviz | Begrænset majorisering (`stress_majorization_cola`) |
| neato | `start=self` | `mode` er `major` (standarden) eller `ipsep` | Smart initialisering (`smart_ini`). Under `mode=KK` eller `mode=sgd` logger den `start=0 not supported with mode=self - ignored` én gang pr. rendering, som Graphviz gør |
| neato | `model=subset` | `mode` er `major` eller `KK` | Delmængde-afstandsmodellen |
| neato | `model=circuit` | `mode` er `major`, eller `KK` på en sammenhængende graf. `KK` på en ikke-sammenhængende graf uden `pack` eller `packmode` logger en advarsel og bruger korteste stier, som Graphviz gør | Kredsløbs-afstandsmodellen (`circuit_model`) |
| neato, twopi, circo, sfdp | `overlap=voronoi` (versalfølsomhed ignoreres) | Grafen (for twopi en komponent; for sfdp hele grafen eller en komponent) har 2+ knuder, og Graphviz' egen overlapstælling (`countOverlap`, som tester knudepolygoner) er over 0. Knuder, der kun rører hinanden via afgrænsningsboksen, udløser den ikke. circo når den kun for en graf med én komponent (ved flere komponenter ignorerer Graphviz også `overlap`). sfdp når den kun, når `overlap` ikke er en prism-tilstand | Voronoi-fjernelse af overlap (`vAdjust`) |
| fdp | `overlap=` en af `voronoi`, `oscale`, `vpsc`, `ipsep`, `ortho`, `ortho_yx`, `orthoxy`, `orthoyx`, `portho`, `portho_yx`, `porthoxy`, `porthoyx` | Tilstanden nås efter `N:`-kraftiterationsforsøgene, hvilket er, når disse forsøg ikke fjerner alle overlap (eller `N` er 0 eller fraværende). Præfikset `N:` er tilladt, for eksempel `3:voronoi` | Den tilsvarende justeringsalgoritme i `removeOverlapWith` |
| fdp | `splines=compound` | Altid, med eller uden clustre | Kantføring, der undgår clustre (`compoundEdges`) |
| sfdp | `smoothing=` alt andet end `none` eller `0` | Altid | `post_process_smoothing` |
| sfdp | `rotation=` et vilkårligt tal forskelligt fra nul | Altid | `rotate()` før fjernelse af overlap |
| sfdp | `label_scheme=1` til `4` | Der findes en knude ved navn `|edgelabel|...`, `overlap` opløses til `prism`-tilstand, og enten er skemaet 3 eller 4, eller også er skemaet 1 eller 2, og prism-forsøgene er over 0 (`overlap=prism` med et tal, ikke standarden `prism0`). Værdier over 4 tæller som 0. Almindelige kantetiketter udløser den aldrig | Håndtering af kantetiket-knuder (`edge_labeling_scheme`) |
| sfdp | `quadtree=none` (også `0`, `false`) | Enhver graf med mindst én knude. Meddelelsen navngiver det opløste skema | `spring_electrical_embedding_slow` |
| sfdp | `quadtree=fast` (også `2`) | Enhver graf med mindst én knude. Meddelelsen navngiver det opløste skema | `spring_electrical_embedding_fast` |
| alle motorer | En knudeform, der tegnes af et særligt `round_corners`-tilfælde, som ikke er portereret | Knuden bruger den form. Meddelelse: `special shape N not yet ported` | Formens tegnegren i `round_corners`. Det er en intern værn mod et formnummer uden tegnetilfælde; ingen navngiven form er kendt for at nå det |

De fleste meddelelser har formen `<attribute>=<value>: <what> is not supported yet`.
Undtagelserne er `smoothing` og `rotation` (som navngiver den manglende rutine),
fdp-rækkerne og formrækken, som bruger formuleringerne ovenfor. Forgren på
`err.code === 'UNSUPPORTED_FEATURE'`, ikke på teksten.

Værdier, der vælger standarden (for eksempel `quadtree=normal`, `true`, `yes`,
`1`), og de af Graphviz accepterede værdier, der er portereret (for eksempel
`start=regular`, `start=random`, `model=mds`, `mode=KK`, `mode=sgd`,
`overlap=prism`, `scale`-familien og, på neato, twopi, circo og sfdp,
`overlap=oscale`, `vpsc` og tilstandene `ortho*` / `portho*`), renderes normalt.

## Reference pr. funktion

"Brug" betyder `TypeError` med `ERR_INVALID_ARG_TYPE`, medmindre en række
navngiver en anden kode.

| Funktion | Kan kaste |
|----------|-----------|
| `renderSvg(dotSource, engine)` | Brug (`dotSource` eller `engine` er ikke en streng); `TypeError` `ERR_INVALID_ARG_VALUE` (motor ikke registreret); `ParseError`; `RenderError`; `InternalError` |
| `tryRenderSvg(dotSource, engine)` | Brug (`dotSource` eller `engine` er ikke en streng); `TypeError` `ERR_INVALID_ARG_VALUE` (motor ikke registreret). Intet andet: hver fejl fra DOT-input returneres i `errors` |
| `parse(dotSource)` | `TypeError` `ERR_INVALID_ARG_TYPE` (`dotSource` er ikke en streng); `ParseError` |
| `render(g, format, opts?)` | Brug (`g`, `format` eller `opts` har forkert type); `TypeError` `ERR_INVALID_ARG_VALUE` (motor eller format ikke registreret); `RenderError`; `InternalError` |
| `getDrawOps(g, opts?)` | Brug (`g` eller `opts` har forkert type); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.engine` ikke registreret); `RenderError`; `ParseError` (det mellemliggende xdot kunne ikke parses igen: en fejl i dot-engine); `InternalError` |
| `createGraph(opts?)` og builder-metoder (`addNode`, `addEdge`, `addSubgraph`, `setAttr`, ...) | Brug (forkerte argumenttyper, herunder attributværdier, der ikke er strenge); `InternalError` (grafmodellen kunne ikke oprette en knude eller undergraf) |
| `addEdge(g, tail, head, name?)` (fra `/api`) | Brug (`g`, `tail` eller `head` er ikke et objekt; `name` er ikke en streng) |
| `getLayout(g, opts?)` | Brug (`g` eller `opts` er ikke et objekt); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.yAxis` er ikke `'up'` eller `'down'`); `Error` `ERR_INVALID_STATE` (grafen er ikke udlagt) |
| `new GvcContext(measurer, options?)` | Brug (`measurer` har ingen `measure`-funktion; `options` er ikke et objekt) |
| `ctx.register(plugin)` | Brug (ikke et renderer-plugin eller en layoutmotor) |
| `ctx.layout(g, engine)` | Brug (`g` er ikke et objekt, `engine` er ikke en streng); `TypeError` `ERR_INVALID_ARG_VALUE` (motor ikke registreret); `RenderError` `UNKNOWN_LAYOUT`. Motorfejl propageres uindpakket |
| `ctx.freeLayout(g, engine)` | Brug; `TypeError` `ERR_INVALID_ARG_VALUE` (motor ikke registreret). Motorfejl propageres uindpakket |
| `ctx.bestRenderer(format)` | Brug (`format` er ikke en streng); `TypeError` `ERR_INVALID_ARG_VALUE` (ingen renderer til `format`) |
| `renderWithContext(ctx, g, format, inlineImages?)` | Brug (`ctx` er ikke en `GvcContext`, `g` er ikke et objekt, `format` er ikke en streng); `TypeError` `ERR_INVALID_ARG_VALUE` (ingen renderer til `format`). Renderfejl propageres uindpakket |
| `setImageSizer(sizer)` | Brug (ikke en funktion eller `null`) |
| `setImageResolver(fn)` | Brug (ikke en funktion eller `null`) |
| `setTextMeasurer(measurer)` | Brug (ikke en `TextMeasurer` eller `undefined`) |

### Hvilke funktioner pakker fremmede throws ind

| Funktioner | Adfærd ved et uventet throw (ikke fra dot-engine) |
|-----------|---------------------------------------------------|
| `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps` | Pakkes ind som `InternalError`; `cause` er den oprindelige fejl |
| `renderWithContext` og hver `GvcContext`-metode | **Pakkes ikke ind.** En motorfejl når kalderen som det, motoren kastede, for eksempel en almindelig `TypeError` uden `code` |

Hvis du bruger `GvcContext` direkte, så behandl en fejl, der hverken er en
`DotEngineError` eller en brugsfejl, som en fejl i dot-engine.

## `tryRenderSvg` eller `renderSvg`

| | `renderSvg` | `tryRenderSvg` |
|---|-------------|----------------|
| Dårlig DOT eller layoutfejl | Kaster en `DotEngineError` | Returnerer `{ errors: [one] }` |
| Dårlige argumenter | Kaster en brugsfejl | Kaster en brugsfejl |
| Fejlværdi | En `Error` med stakspor og `cause` | Almindelige data: `type`, `code`, `message`, `friendlyMessage`, plus `location` / `expected`, når de findes |
| Brug når | Fejl skal afbryde kalderen | Du forgrener på `code`, eller sender fejlen over `postMessage` eller ind i en log |

`tryRenderSvg` kaster aldrig for noget DOT-input. Den kaster kun, når selve
argumenterne er ugyldige, hvilket er en fejl i den kaldende kode. De
fejlobjekter, den returnerer, bærer ingen `cause` og intet stakspor.

## Indpakkede fejl og `cause`

Når `renderSvg`, `render` eller `getDrawOps` fanger en fejl, som dot-engine ikke
selv har rejst, kaster den en `InternalError`, hvis `cause` er den oprindelige
fejl. `message` er den oprindelige meddelelse.

`cause` er ikke-opregnelig, så `JSON.stringify(err)` udelader den. Gennemgå
kæden eksplicit, når du logger (se det sidste eksempel nedenfor).

## Kontroller på tværs af bundles

`instanceof DotEngineError` virker inden for én kopi af biblioteket. Hvis to
kopier kan blive indlæst (duplikerede bundles, en plugin-vært), så brug
`isGvError(e)`. Den tjekker for en streng i `type` og `code` og virker på tværs
af kopier. Den accepterer også de almindelige objekter, `tryRenderSvg`
returnerer.

## Eksempler

Adskil de to familier:

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

Håndtér et `tryRenderSvg`-resultat:

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

Log en `InternalError` med dens årsag:

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

## Se også

- [API-reference (udvalgt)](/da/guide/api) for hver funktions signatur.
- [Typer](/da/guide/types) for formerne `GvError` og `RenderResult`.
- [Genereret API (TypeDoc)](/reference/) for de fulde unioner `GvErrorCode` og `UsageErrorCode`.
