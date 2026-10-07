---
sourceHash: 545227fb3a0a91494ed7a2c299e5a9ca93a594d68d99e0596f743e7597dfbae9
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Feil og unntak

dot-engine kaster to slags feil. Hvilken slags du fanger, forteller hvem som må
endre noe.

## To familier, én regel

| Familie | Slik kjenner du den igjen | Betydning | Hvem handler |
|--------|---------------------|---------|----------|
| dot-engine-feil | `err instanceof DotEngineError` | dot-engine mislyktes på denne inndataen: ugyldig DOT, en fatal feil Graphviz selv ville rapportert, en Graphviz-funksjon som ikke støttes, eller en feil i dot-engine | DOT-forfatteren, eller en feilrapport |
| Bruksfeil | standard `TypeError` / `RangeError` / `Error` med `err.code` som starter med `ERR_` | Kallet var feil: feil argumenttype, ukjent motor- eller formatnavn, feil kallrekkefølge | Den kallende koden |

Forgren på `.code`, ikke på meldingsteksten. Meldinger kan endre seg mellom
utgivelser; kodene er stabile.

Bruksfeil er ikke `DotEngineError`-er og implementerer ikke `GvError`. `name`
forblir `TypeError`, `RangeError` eller `Error`, som i Node.js.

## Klassereferanse

Alle de fire klassene nedenfor utvider `DotEngineError` og implementerer
`GvError`-formen (`type`, `code`, `message`, `friendlyMessage`, valgfri
`location` og `expected`).

### `DotEngineError` (abstract)

Felles basisklasse. `instanceof DotEngineError` er sant for hver feil dot-engine
reiser om inndataene sine. Den kan ikke konstrueres direkte. `type`, `code` og
`friendlyMessage` defineres av underklassene.

### `ParseError`

| Punkt | Verdi |
|------|-------|
| Kastes når | DOT-kildekoden er ugyldig, eller bruker feil kantoperator for grafsorten |
| `type` | `syntax` |
| Koder | `SYNTAX_ERROR`, `SYNTAX_UNEXPECTED_EOF`, `EDGE_OP_DIRECTED_IN_UNDIRECTED`, `EDGE_OP_UNDIRECTED_IN_DIRECTED`, `GENERIC_ERROR` |
| Felter | `location` (`{ line, column, offset? }`), `expected` (parserens forventninger; bare `SYNTAX_*`), getterne `line` og `column` |
| Kallerens handling | Rett DOT-kildekoden. Vis `location` og `friendlyMessage` til forfatteren |

`GENERIC_ERROR` på en `ParseError` betyr at kildekoden er nøstet så dypt at
parseren gikk tom for stakk.

### `HtmlParseError`

| Punkt | Verdi |
|------|-------|
| Kastes når | Når aldri fram til en kaller i dag (se under) |
| `type` | `semantic` |
| Koder | `HTML_PARSE_ERROR` |
| Felter | `tag` (det anstøtelige tokenet). Ingen `location` eller `expected` |
| Kallerens handling | Ingen. For å finne en dårlig etikett, sammenlign den rendrede utdataen med det du forventet |

Parseren for HTML-lignende etiketter reiser `HtmlParseError` for et ukjent
element, en misdannet attributt eller en feilplassert `<TABLE>`, `<HR>` eller
`<VR>`. Layoutstadiet fanger den og gir etiketten intet innhold, slik Graphviz
gjør: grafen rendres fortsatt, med en tom etikett. Ingen offentlig funksjon
propagerer den.

`HtmlParseError` eksporteres ikke fra pakkeroten. Hvis en noensinne skulle nå
fram til deg, identifiserer `err instanceof DotEngineError && err.code === 'HTML_PARSE_ERROR'`
den.

### `RenderError`

| Punkt | Verdi |
|------|-------|
| Kastes når | Layout eller rendering mislykkes på en måte Graphviz selv ville rapportert, grafen navngir en utilgjengelig layoutmotor, eller grafen bruker en Graphviz-funksjon dot-engine ikke har portert |
| `type` | `render` for `RENDER_ERROR`; `semantic` for `UNKNOWN_LAYOUT` og `UNSUPPORTED_FEATURE` |
| Koder | `RENDER_ERROR`, `UNKNOWN_LAYOUT`, `UNSUPPORTED_FEATURE` |
| Felter | `cause` når feilen pakket inn en annen feil. Ingen `location` |
| Kallerens handling | `RENDER_ERROR`: endre grafen. `UNKNOWN_LAYOUT`: rett attributtet `layout=`. `UNSUPPORTED_FEATURE`: unngå funksjonen (for eksempel sfdp med `rotation=45`; se [tabellen](#unsupported-feature-reference)) |

### `InternalError`

| Punkt | Verdi |
|------|-------|
| Kastes når | En assertion eller invariant inne i dot-engine svikter, eller en feil som ikke kommer fra dot-engine slipper ut av layout- eller renderingspipelinen |
| `type` | `render` |
| Koder | `INTERNAL_ERROR` |
| Felter | `cause` (den opprinnelige feilen, når en ble pakket inn) |
| Kallerens handling | Rapporter en feil med DOT-kildekoden som utløste den |

Ingenting DOT-forfatteren kan endre vil på en pålitelig måte unngå en
`InternalError`.

## Kodereferanse

### `GvErrorCode`

| Kode | Klasse | `type` | Betydning | Typisk årsak | Kallerens handling | Reises av |
|------|-------|--------|---------|---------------|---------------|-----------|
| `SYNTAX_ERROR` | `ParseError` | `syntax` | Uventet token | Skrivefeil, manglende `;` eller `}` | Rett DOT ved `location` | `parse`, `renderSvg` |
| `SYNTAX_UNEXPECTED_EOF` | `ParseError` | `syntax` | Kildekoden sluttet midt i en setning | Ulukket `{`, `[` eller streng | Rett DOT ved `location` | `parse`, `renderSvg` |
| `EDGE_OP_DIRECTED_IN_UNDIRECTED` | `ParseError` | `syntax` | `->` i en urettet graf | `graph { a -> b }` | Bruk `--` | `parse`, `renderSvg` |
| `EDGE_OP_UNDIRECTED_IN_DIRECTED` | `ParseError` | `syntax` | `--` i en digraf | `digraph { a -- b }` | Bruk `->` | `parse`, `renderSvg` |
| `GENERIC_ERROR` | `ParseError` | `syntax` | Kildekoden er for dypt nøstet til å tolkes | Patologisk nøstede delgrafer | Flat ut DOT | `parse`, `renderSvg` |
| `HTML_PARSE_ERROR` | `HtmlParseError` | `semantic` | Misdannet HTML-lignende etikett | Ukjent element, dårlig attributt | Ingen: etiketten rendres tom | Ingen (fanges internt) |
| `RENDER_ERROR` | `RenderError` | `render` | En fatal layout- eller renderingsfeil som Graphviz også ville rapportert | Misdannet inndata til et layoutstadium | Endre grafen | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNKNOWN_LAYOUT` | `RenderError` | `semantic` | Grafens attributt `layout=` navngir ingen registrert motor | `layout="foo"` | Rett attributtet | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNSUPPORTED_FEATURE` | `RenderError` | `semantic` | Grafen ber om en Graphviz-funksjon dot-engine ikke har portert | sfdp med `rotation=45` | Unngå funksjonen | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `INTERNAL_ERROR` | `InternalError` | `render` | Feil i dot-engine | Mislykket assertion, fremmed kast | Rapporter en feil | `renderSvg`, `render`, `getDrawOps`, byggermetoder, `GvcContext.layout` (uinnpakket) |

### `UsageErrorCode`

| Kode | Klasse | Betydning | Typisk årsak | Kallerens handling | Reises av |
|------|-------|---------|---------------|---------------|-----------|
| `ERR_INVALID_ARG_TYPE` | `TypeError` | Feil type, `null` eller et manglende obligatorisk argument | `renderSvg(undefined, 'dot')`, `getLayout(null)` | Rett kallet | Hver offentlig funksjon som tar argumenter |
| `ERR_INVALID_ARG_VALUE` | `TypeError` | Riktig type, ukjent verdi | Uregistrert motor- eller formatnavn; `getLayout(g, { yAxis: 'other' })` | Bruk et registrert navn eller en tillatt verdi | `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps`, `getLayout`, `GvcContext.layout`, `freeLayout`, `bestRenderer`, `renderWithContext` |
| `ERR_OUT_OF_RANGE` | `RangeError` | Numerisk argument utenfor området | Reservert | Rett kallet | Ingen offentlig funksjon reiser den i dag |
| `ERR_INVALID_STATE` | `Error` | Kall gjort i feil tilstand | `getLayout` før layout | Legg ut først (`render(g, ...)` eller `ctx.layout`) | `getLayout` |

Et uregistrert motorargument avvises selv når DOT-kildekoden setter et gyldig
`layout=`-attributt. Argumentet sjekkes først.

## Referanse for `UNSUPPORTED_FEATURE` {#unsupported-feature-reference}

Hver attributtverdi nedenfor får layouten til å kaste en `RenderError` med koden
`UNSUPPORTED_FEATURE` der innebygd Graphviz ville kjørt en algoritme som
dot-engine ikke har portert. Alternativet var å rendre en layout som avviker fra
Graphviz uten å si fra. Sjekken utløses bare når betingelsen i kolonnen
«Utløses når» er oppfylt; det samme attributtet andre steder rendres normalt.
For å unngå feilen fjerner du attributtet eller endrer det til en støttet verdi.

| Motor | Attributt og verdi | Utløses når | Nødvendig Graphviz-funksjon |
|--------|--------------------|------------|-------------------------|
| neato | `mode=hier` | Alltid (etter at grafen har 2+ noder og `maxiter` ikke er negativ) | Hierarkisk stress-majorisering (`stress_majorization_with_hierarchy`) |
| neato | `mode=ipsep` | Bare når Graphviz ville bygd skranker: `diredgeconstraints` er sann eller `hier*`, `overlap=ipsep`, eller grafen har en klynge på toppnivå. Uten skranker kjører den som stress-majorisering, som i Graphviz | Skrankebegrenset majorisering (`stress_majorization_cola`) |
| neato | `start=self` | `mode` er `major` (standard) eller `ipsep` | Smart initialisering (`smart_ini`). Under `mode=KK` eller `mode=sgd` logger den `start=0 not supported with mode=self - ignored` én gang per rendering, som Graphviz gjør |
| neato | `model=subset` | `mode` er `major` eller `KK` | Avstandsmodellen «subset» |
| neato | `model=circuit` | `mode` er `major`, eller `KK` på en sammenhengende graf. `KK` på en usammenhengende graf uten `pack` eller `packmode` logger en advarsel og bruker korteste veier, som Graphviz gjør | Avstandsmodellen «circuit» (`circuit_model`) |
| neato, twopi, circo, sfdp | `overlap=voronoi` (ikke skille mellom store og små bokstaver) | Grafen (for twopi en komponent; for sfdp hele grafen eller en komponent) har 2+ noder, og Graphvizs egen overlappstelling (`countOverlap`, som tester nodepolygoner) er over 0. Noder som bare berører hverandre med avgrensningsboksen utløser det ikke. circo når det bare for en graf med én komponent (ved flere komponenter ignorerer Graphviz også `overlap`). sfdp når det bare når `overlap` ikke er en prismemodus | Voronoi-fjerning av overlapp (`vAdjust`) |
| fdp | `overlap=` en av `voronoi`, `oscale`, `vpsc`, `ipsep`, `ortho`, `ortho_yx`, `orthoxy`, `orthoyx`, `portho`, `portho_yx`, `porthoxy`, `porthoyx` | Modusen nås etter `N:`-kraftiterasjonsforsøkene, altså når disse forsøkene ikke fjerner all overlapp (eller `N` er 0 eller mangler). Prefikset `N:` er tillatt, for eksempel `3:voronoi` | Den tilsvarende justeringsalgoritmen i `removeOverlapWith` |
| fdp | `splines=compound` | Alltid, med eller uten klynger | Klyngeunngående kantruting (`compoundEdges`) |
| sfdp | `smoothing=` alt unntatt `none` eller `0` | Alltid | `post_process_smoothing` |
| sfdp | `rotation=` ethvert tall som ikke er null | Alltid | `rotate()` før fjerning av overlapp |
| sfdp | `label_scheme=1` til `4` | En node med navn `|edgelabel|...` finnes, `overlap` løses til modusen `prism`, og enten er skjemaet 3 eller 4, eller skjemaet er 1 eller 2 og prismeforsøkene er over 0 (`overlap=prism` med et tall, ikke standarden `prism0`). Verdier over 4 regnes som 0. Vanlige kantetiketter utløser det aldri | Håndtering av kantetikettnoder (`edge_labeling_scheme`) |
| sfdp | `quadtree=none` (også `0`, `false`) | Enhver graf med minst én node. Meldingen navngir det løste skjemaet | `spring_electrical_embedding_slow` |
| sfdp | `quadtree=fast` (også `2`) | Enhver graf med minst én node. Meldingen navngir det løste skjemaet | `spring_electrical_embedding_fast` |
| alle motorer | En nodeform tegnet av et spesialtilfelle i `round_corners` som ikke er portert | Noden bruker den formen. Melding: `special shape N not yet ported` | Tegnegrenen `round_corners` for formen. Dette er en intern vaktsjekk mot et formnummer uten tegnetilfelle; ingen navngitt form er kjent for å nå den |

De fleste meldinger har formen `<attribute>=<value>: <what> is not supported yet`.
Unntakene er `smoothing` og `rotation` (som navngir den manglende rutinen),
fdp-radene og formraden, som bruker formuleringene ovenfor. Forgren på
`err.code === 'UNSUPPORTED_FEATURE'`, ikke på teksten.

Verdier som velger standarden (for eksempel `quadtree=normal`, `true`, `yes`,
`1`) og de Graphviz-aksepterte verdiene som er portert (for eksempel
`start=regular`, `start=random`, `model=mds`, `mode=KK`, `mode=sgd`,
`overlap=prism`, `scale`-familien og, på neato, twopi, circo og sfdp,
`overlap=oscale`, `vpsc` og modusene `ortho*` / `portho*`) rendres normalt.

## Referanse per funksjon

«Bruk» betyr `TypeError` med `ERR_INVALID_ARG_TYPE`, med mindre en rad navngir en
annen kode.

| Funksjon | Kan kaste |
|----------|-----------|
| `renderSvg(dotSource, engine)` | Bruk (`dotSource` eller `engine` er ikke en streng); `TypeError` `ERR_INVALID_ARG_VALUE` (motor ikke registrert); `ParseError`; `RenderError`; `InternalError` |
| `tryRenderSvg(dotSource, engine)` | Bruk (`dotSource` eller `engine` er ikke en streng); `TypeError` `ERR_INVALID_ARG_VALUE` (motor ikke registrert). Ingenting annet: hver feil på DOT-inndata returneres i `errors` |
| `parse(dotSource)` | `TypeError` `ERR_INVALID_ARG_TYPE` (`dotSource` er ikke en streng); `ParseError` |
| `render(g, format, opts?)` | Bruk (`g`, `format` eller `opts` har feil type); `TypeError` `ERR_INVALID_ARG_VALUE` (motor eller format ikke registrert); `RenderError`; `InternalError` |
| `getDrawOps(g, opts?)` | Bruk (`g` eller `opts` har feil type); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.engine` ikke registrert); `RenderError`; `ParseError` (den mellomliggende xdot-utdataen kunne ikke tolkes på nytt: en feil i dot-engine); `InternalError` |
| `createGraph(opts?)` og byggermetoder (`addNode`, `addEdge`, `addSubgraph`, `setAttr`, ...) | Bruk (feil argumenttyper, inkludert attributtverdier som ikke er strenger); `InternalError` (grafmodellen klarte ikke å opprette en node eller delgraf) |
| `addEdge(g, tail, head, name?)` (fra `/api`) | Bruk (`g`, `tail` eller `head` er ikke objekt; `name` er ikke streng) |
| `getLayout(g, opts?)` | Bruk (`g` eller `opts` er ikke objekt); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.yAxis` er ikke `'up'` eller `'down'`); `Error` `ERR_INVALID_STATE` (grafen er ikke utlagt) |
| `new GvcContext(measurer, options?)` | Bruk (`measurer` har ingen `measure`-funksjon; `options` er ikke objekt) |
| `ctx.register(plugin)` | Bruk (ikke en renderer-plugin eller layoutmotor) |
| `ctx.layout(g, engine)` | Bruk (`g` er ikke objekt, `engine` er ikke streng); `TypeError` `ERR_INVALID_ARG_VALUE` (motor ikke registrert); `RenderError` `UNKNOWN_LAYOUT`. Motorfeil propagerer uinnpakket |
| `ctx.freeLayout(g, engine)` | Bruk; `TypeError` `ERR_INVALID_ARG_VALUE` (motor ikke registrert). Motorfeil propagerer uinnpakket |
| `ctx.bestRenderer(format)` | Bruk (`format` er ikke streng); `TypeError` `ERR_INVALID_ARG_VALUE` (ingen renderer for `format`) |
| `renderWithContext(ctx, g, format, inlineImages?)` | Bruk (`ctx` er ikke en `GvcContext`, `g` er ikke objekt, `format` er ikke streng); `TypeError` `ERR_INVALID_ARG_VALUE` (ingen renderer for `format`). Renderingsfeil propagerer uinnpakket |
| `setImageSizer(sizer)` | Bruk (ikke en funksjon eller `null`) |
| `setImageResolver(fn)` | Bruk (ikke en funksjon eller `null`) |
| `setTextMeasurer(measurer)` | Bruk (ikke en `TextMeasurer` eller `undefined`) |

### Hvilke funksjoner pakker inn fremmede kast

| Funksjoner | Atferd ved et uventet kast (ikke fra dot-engine) |
|-----------|---------------------------------------------------|
| `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps` | Pakkes inn som `InternalError`; `cause` er den opprinnelige feilen |
| `renderWithContext` og hver `GvcContext`-metode | **Ikke innpakket.** En motorfeil når kalleren som det motoren kastet, for eksempel en vanlig `TypeError` uten `code` |

Hvis du bruker `GvcContext` direkte, behandle en feil som verken er en
`DotEngineError` eller en bruksfeil som en feil i dot-engine.

## `tryRenderSvg` eller `renderSvg`

| | `renderSvg` | `tryRenderSvg` |
|---|-------------|----------------|
| Dårlig DOT eller layoutfeil | Kaster en `DotEngineError` | Returnerer `{ errors: [one] }` |
| Dårlige argumenter | Kaster en bruksfeil | Kaster en bruksfeil |
| Feilverdi | En `Error` med stakk og `cause` | Vanlige data: `type`, `code`, `message`, `friendlyMessage`, pluss `location` / `expected` når de finnes |
| Bruk når | Feilen skal avbryte kalleren | Du forgrener på `code`, eller sender feilen over `postMessage` eller inn i en logg |

`tryRenderSvg` kaster aldri for noen DOT-inndata. Den kaster bare når selve
argumentene er ugyldige, som er en feil i den kallende koden. Feilobjektene den
returnerer har ingen `cause` og ingen stakksporing.

## Innpakkede feil og `cause`

Når `renderSvg`, `render` eller `getDrawOps` fanger en feil som dot-engine ikke
reiste, kaster den en `InternalError` der `cause` er den opprinnelige feilen.
`message` er den opprinnelige meldingen.

`cause` er ikke-opptellbar, så `JSON.stringify(err)` utelater den. Gå gjennom
kjeden eksplisitt når du logger (se det siste eksempelet nedenfor).

## Kontroller på tvers av bundles

`instanceof DotEngineError` fungerer innenfor én kopi av biblioteket. Hvis to
kopier kan lastes (duplikate bundles, en plugin-vert), bruk `isGvError(e)`. Den
sjekker etter en streng `type` og `code` og fungerer på tvers av kopier. Den
godtar også de vanlige objektene `tryRenderSvg` returnerer.

## Eksempler

Skill de to familiene:

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

Håndter et `tryRenderSvg`-resultat:

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

Logg en `InternalError` med årsaken:

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

- [API-referanse (utvalg)](/no/guide/api) for signaturen til hver funksjon.
- [Typer](/no/guide/types) for formene `GvError` og `RenderResult`.
- [Generert API (TypeDoc)](/reference/) for de fullstendige unionene `GvErrorCode` og `UsageErrorCode`.
