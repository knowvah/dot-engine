---
sourceHash: 545227fb3a0a91494ed7a2c299e5a9ca93a594d68d99e0596f743e7597dfbae9
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Fel och undantag

dot-engine kastar två sorters fel. Vilken sort du fångar visar vem som behöver
ändra något.

## Två familjer, en regel

| Familj | Så känner du igen den | Betydelse | Vem agerar |
|--------|-----------------------|-----------|------------|
| Fel i dot-engine | `err instanceof DotEngineError` | dot-engine misslyckades med den här indatan: felaktig DOT, ett ödesdigert fel som Graphviz självt skulle rapportera, en Graphviz-funktion som inte stöds, eller ett fel i dot-engine | DOT-författaren, eller en felrapport |
| Användningsfel | vanligt `TypeError` / `RangeError` / `Error` med `err.code` som börjar med `ERR_` | Anropet var fel: felaktig argumenttyp, okänt motor- eller formatnamn, fel anropsordning | Den anropande koden |

Förgrena på `.code`, inte på meddelandetexten. Meddelanden kan ändras mellan
utgåvor; koderna är stabila.

Användningsfel är inte `DotEngineError` och implementerar inte `GvError`. Deras
`name` förblir `TypeError`, `RangeError` eller `Error`, som i Node.js.

## Klassreferens

Alla fyra klasserna nedan utökar `DotEngineError` och implementerar formen
`GvError` (`type`, `code`, `message`, `friendlyMessage`, valfria `location`
och `expected`).

### `DotEngineError` (abstrakt)

Den gemensamma basen. `instanceof DotEngineError` är sant för varje fel som
dot-engine ger om sin indata. Den kan inte skapas direkt. `type`, `code` och
`friendlyMessage` definieras av underklasserna.

### `ParseError`

| Post | Värde |
|------|-------|
| Kastas när | DOT-källkoden är ogiltig, eller använder fel kantoperator för grafens sort |
| `type` | `syntax` |
| Koder | `SYNTAX_ERROR`, `SYNTAX_UNEXPECTED_EOF`, `EDGE_OP_DIRECTED_IN_UNDIRECTED`, `EDGE_OP_UNDIRECTED_IN_DIRECTED`, `GENERIC_ERROR` |
| Fält | `location` (`{ line, column, offset? }`), `expected` (tolkarens förväntningar; endast `SYNTAX_*`), getters för `line` och `column` |
| Anroparens åtgärd | Rätta DOT-källkoden. Visa `location` och `friendlyMessage` för författaren |

`GENERIC_ERROR` på ett `ParseError` betyder att källkoden är så djupt nästlad
att tolken fick slut på stack.

### `HtmlParseError`

| Post | Värde |
|------|-------|
| Kastas när | Når i dag aldrig en anropare (se nedan) |
| `type` | `semantic` |
| Koder | `HTML_PARSE_ERROR` |
| Fält | `tag` (den felaktiga token). Inget `location` eller `expected` |
| Anroparens åtgärd | Ingen. För att hitta en felaktig etikett, jämför den renderade utdatan med det du förväntade dig |

Tolken för HTML-liknande etiketter kastar `HtmlParseError` för ett okänt
element, ett felformat attribut eller en felplacerad `<TABLE>`, `<HR>` eller
`<VR>`. Layoutsteget fångar felet och ger etiketten inget innehåll, som
Graphviz gör: grafen renderas ändå, med en tom etikett. Ingen publik funktion
vidarebefordrar det.

`HtmlParseError` exporteras inte från paketroten. Om ett sådant fel ändå någon
gång når dig identifierar
`err instanceof DotEngineError && err.code === 'HTML_PARSE_ERROR'` det.

### `RenderError`

| Post | Värde |
|------|-------|
| Kastas när | Layout eller rendering misslyckas på ett sätt som Graphviz självt skulle rapportera, grafen namnger en otillgänglig layoutmotor, eller grafen använder en Graphviz-funktion som dot-engine inte har portat |
| `type` | `render` för `RENDER_ERROR`; `semantic` för `UNKNOWN_LAYOUT` och `UNSUPPORTED_FEATURE` |
| Koder | `RENDER_ERROR`, `UNKNOWN_LAYOUT`, `UNSUPPORTED_FEATURE` |
| Fält | `cause` när felet omslöt ett annat fel. Inget `location` |
| Anroparens åtgärd | `RENDER_ERROR`: ändra grafen. `UNKNOWN_LAYOUT`: rätta attributet `layout=`. `UNSUPPORTED_FEATURE`: undvik funktionen (till exempel sfdp med `rotation=45`; se [tabellen](#unsupported-feature-reference)) |

### `InternalError`

| Post | Värde |
|------|-------|
| Kastas när | En assertion eller invariant inuti dot-engine brister, eller ett fel som inte kommer från dot-engine slipper ut ur layout- eller renderingskedjan |
| `type` | `render` |
| Koder | `INTERNAL_ERROR` |
| Fält | `cause` (det ursprungliga felet, när ett sådant omslöts) |
| Anroparens åtgärd | Rapportera en bugg tillsammans med den DOT-källkod som utlöste den |

Ingenting som DOT-författaren kan ändra undviker pålitligt ett `InternalError`.

## Kodreferens

### `GvErrorCode`

| Kod | Klass | `type` | Betydelse | Typisk orsak | Anroparens åtgärd | Kastas av |
|------|-------|--------|-----------|--------------|-------------------|-----------|
| `SYNTAX_ERROR` | `ParseError` | `syntax` | Oväntad token | Skrivfel, saknad `;` eller `}` | Rätta DOT vid `location` | `parse`, `renderSvg` |
| `SYNTAX_UNEXPECTED_EOF` | `ParseError` | `syntax` | Källkoden tog slut mitt i en sats | Oavslutad `{`, `[` eller sträng | Rätta DOT vid `location` | `parse`, `renderSvg` |
| `EDGE_OP_DIRECTED_IN_UNDIRECTED` | `ParseError` | `syntax` | `->` i en oriktad graf | `graph { a -> b }` | Använd `--` | `parse`, `renderSvg` |
| `EDGE_OP_UNDIRECTED_IN_DIRECTED` | `ParseError` | `syntax` | `--` i en digraf | `digraph { a -- b }` | Använd `->` | `parse`, `renderSvg` |
| `GENERIC_ERROR` | `ParseError` | `syntax` | Källkoden är för djupt nästlad för att tolkas | Patologiskt nästlade delgrafer | Platta ut DOT | `parse`, `renderSvg` |
| `HTML_PARSE_ERROR` | `HtmlParseError` | `semantic` | Felformad HTML-liknande etikett | Okänt element, felaktigt attribut | Ingen: etiketten renderas tom | Ingen (fångas internt) |
| `RENDER_ERROR` | `RenderError` | `render` | Ett ödesdigert layout- eller renderingsfel som Graphviz också skulle rapportera | Felformad indata för ett layoutsteg | Ändra grafen | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNKNOWN_LAYOUT` | `RenderError` | `semantic` | Grafens attribut `layout=` namnger ingen registrerad motor | `layout="foo"` | Rätta attributet | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNSUPPORTED_FEATURE` | `RenderError` | `semantic` | Grafen begär en Graphviz-funktion som dot-engine inte har portat | sfdp med `rotation=45` | Undvik funktionen | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `INTERNAL_ERROR` | `InternalError` | `render` | Fel i dot-engine | Misslyckad assertion, främmande throw | Rapportera en bugg | `renderSvg`, `render`, `getDrawOps`, byggarmetoder, `GvcContext.layout` (ej omsluten) |

### `UsageErrorCode`

| Kod | Klass | Betydelse | Typisk orsak | Anroparens åtgärd | Kastas av |
|------|-------|-----------|--------------|-------------------|-----------|
| `ERR_INVALID_ARG_TYPE` | `TypeError` | Fel typ, `null` eller ett obligatoriskt argument saknas | `renderSvg(undefined, 'dot')`, `getLayout(null)` | Rätta anropet | Varje publik funktion som tar argument |
| `ERR_INVALID_ARG_VALUE` | `TypeError` | Rätt typ, okänt värde | Oregistrerat motor- eller formatnamn; `getLayout(g, { yAxis: 'other' })` | Använd ett registrerat namn eller ett tillåtet värde | `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps`, `getLayout`, `GvcContext.layout`, `freeLayout`, `bestRenderer`, `renderWithContext` |
| `ERR_OUT_OF_RANGE` | `RangeError` | Numeriskt argument utanför sitt intervall | Reserverad | Rätta anropet | Ingen publik funktion kastar den i dag |
| `ERR_INVALID_STATE` | `Error` | Anrop gjort i fel tillstånd | `getLayout` före layout | Lägg ut först (`render(g, ...)` eller `ctx.layout`) | `getLayout` |

Ett oregistrerat motorargument avvisas även när DOT-källkoden sätter ett giltigt
attribut `layout=`. Argumentet kontrolleras först.

## Referens för `UNSUPPORTED_FEATURE` {#unsupported-feature-reference}

Varje attributvärde nedan gör att layouten kastar ett `RenderError` med koden
`UNSUPPORTED_FEATURE` där inbyggda Graphviz skulle köra en algoritm som
dot-engine inte har portat. Alternativet vore att rendera en layout som skiljer
sig från Graphviz utan att säga det. Kontrollen utlöses bara när villkoret i
kolumnen ”Utlöses när” gäller; samma attribut i övrigt renderas normalt. För
att undvika felet tar du bort attributet eller ändrar det till ett värde som
stöds.

| Motor | Attribut och värde | Utlöses när | Graphviz-funktion som behövs |
|--------|--------------------|-------------|------------------------------|
| neato | `mode=hier` | Alltid (efter att grafen har 2+ noder och `maxiter` inte är negativt) | Hierarkisk stressmajorisering (`stress_majorization_with_hierarchy`) |
| neato | `mode=ipsep` | Bara när Graphviz skulle bygga villkor: `diredgeconstraints` är sant eller `hier*`, `overlap=ipsep`, eller grafen har ett kluster på översta nivån. Utan villkor körs den som stressmajorisering, som i Graphviz | Villkorad majorisering (`stress_majorization_cola`) |
| neato | `start=self` | `mode` är `major` (standardvärdet) eller `ipsep` | Smart initiering (`smart_ini`). Under `mode=KK` eller `mode=sgd` loggar den `start=0 not supported with mode=self - ignored` en gång per rendering, som Graphviz gör |
| neato | `model=subset` | `mode` är `major` eller `KK` | Delmängdsavståndsmodellen |
| neato | `model=circuit` | `mode` är `major`, eller `KK` på en sammanhängande graf. `KK` på en icke sammanhängande graf utan `pack` eller `packmode` loggar en varning och använder kortaste vägar, som Graphviz gör | Kretsavståndsmodellen (`circuit_model`) |
| neato, twopi, circo, sfdp | `overlap=voronoi` (skiftlägesokänsligt) | Grafen (för twopi en komponent; för sfdp hela grafen eller en komponent) har 2+ noder och Graphviz egen överlappsräkning (`countOverlap`, som testar nodpolygoner) är över 0. Noder som bara rör vid varandra med begränsningsrutan utlöser den inte. circo når den bara för en graf med en enda komponent (vid flera komponenter ignorerar Graphviz också `overlap`). sfdp når den bara när `overlap` inte är ett prismaläge | Voronoi-borttagning av överlapp (`vAdjust`) |
| fdp | `overlap=` ett av `voronoi`, `oscale`, `vpsc`, `ipsep`, `ortho`, `ortho_yx`, `orthoxy`, `orthoyx`, `portho`, `portho_yx`, `porthoxy`, `porthoyx` | Läget nås efter försöken med `N:` kraftiterationer, vilket är när de försöken inte tar bort alla överlapp (eller `N` är 0 eller saknas). Prefixet `N:` är tillåtet, till exempel `3:voronoi` | Motsvarande justeringsalgoritm i `removeOverlapWith` |
| fdp | `splines=compound` | Alltid, med eller utan kluster | Klusterundvikande kantdragning (`compoundEdges`) |
| sfdp | `smoothing=` allt utom `none` eller `0` | Alltid | `post_process_smoothing` |
| sfdp | `rotation=` valfritt tal skilt från noll | Alltid | `rotate()` före borttagning av överlapp |
| sfdp | `label_scheme=1` till `4` | En nod med namnet `|edgelabel|...` finns, `overlap` blir läget `prism`, och antingen är schemat 3 eller 4, eller är schemat 1 eller 2 och prismaförsöken är över 0 (`overlap=prism` med ett tal, inte standardvärdet `prism0`). Värden över 4 räknas som 0. Vanliga kantetiketter utlöser den aldrig | Hantering av kantetikettnoder (`edge_labeling_scheme`) |
| sfdp | `quadtree=none` (även `0`, `false`) | Valfri graf med minst en nod. Meddelandet namnger det upplösta schemat | `spring_electrical_embedding_slow` |
| sfdp | `quadtree=fast` (även `2`) | Valfri graf med minst en nod. Meddelandet namnger det upplösta schemat | `spring_electrical_embedding_fast` |
| alla motorer | En nodform som ritas av ett särskilt `round_corners`-fall som inte är portat | Noden använder den formen. Meddelande: `special shape N not yet ported` | Formens ritgren i `round_corners`. Det här är ett internt skydd mot ett formnummer utan ritfall; ingen namngiven form är känd för att nå det |

De flesta meddelanden har formen `<attribute>=<value>: <what> is not supported yet`.
Undantagen är `smoothing` och `rotation` (som namnger den saknade rutinen),
fdp-raderna och formraden, som använder formuleringarna ovan. Förgrena på
`err.code === 'UNSUPPORTED_FEATURE'`, inte på texten.

Värden som väljer standardvärdet (till exempel `quadtree=normal`, `true`, `yes`,
`1`) och de av Graphviz godtagna värden som är portade (till exempel
`start=regular`, `start=random`, `model=mds`, `mode=KK`, `mode=sgd`,
`overlap=prism`, familjen `scale` och, på neato, twopi, circo och sfdp,
`overlap=oscale`, `vpsc` och lägena `ortho*` / `portho*`) renderas normalt.

## Referens per funktion

”Användning” betyder `TypeError` med `ERR_INVALID_ARG_TYPE`, om inte en rad
namnger en annan kod.

| Funktion | Kan kasta |
|----------|-----------|
| `renderSvg(dotSource, engine)` | Användning (`dotSource` eller `engine` inte en sträng); `TypeError` `ERR_INVALID_ARG_VALUE` (motorn inte registrerad); `ParseError`; `RenderError`; `InternalError` |
| `tryRenderSvg(dotSource, engine)` | Användning (`dotSource` eller `engine` inte en sträng); `TypeError` `ERR_INVALID_ARG_VALUE` (motorn inte registrerad). Inget annat: varje fel i DOT-indata returneras i `errors` |
| `parse(dotSource)` | `TypeError` `ERR_INVALID_ARG_TYPE` (`dotSource` inte en sträng); `ParseError` |
| `render(g, format, opts?)` | Användning (`g`, `format` eller `opts` av fel typ); `TypeError` `ERR_INVALID_ARG_VALUE` (motor eller format inte registrerat); `RenderError`; `InternalError` |
| `getDrawOps(g, opts?)` | Användning (`g` eller `opts` av fel typ); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.engine` inte registrerad); `RenderError`; `ParseError` (den mellanliggande xdot-utdatan kunde inte tolkas på nytt: ett fel i dot-engine); `InternalError` |
| `createGraph(opts?)` och byggarmetoder (`addNode`, `addEdge`, `addSubgraph`, `setAttr`, ...) | Användning (felaktiga argumenttyper, inklusive attributvärden som inte är strängar); `InternalError` (grafmodellen kunde inte skapa en nod eller delgraf) |
| `addEdge(g, tail, head, name?)` (från `/api`) | Användning (`g`, `tail` eller `head` som inte är objekt; `name` som inte är en sträng) |
| `getLayout(g, opts?)` | Användning (`g` eller `opts` inte ett objekt); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.yAxis` inte `'up'` eller `'down'`); `Error` `ERR_INVALID_STATE` (grafen inte utlagd) |
| `new GvcContext(measurer, options?)` | Användning (`measurer` saknar funktionen `measure`; `options` inte ett objekt) |
| `ctx.register(plugin)` | Användning (varken ett renderarplugin eller en layoutmotor) |
| `ctx.layout(g, engine)` | Användning (`g` inte ett objekt, `engine` inte en sträng); `TypeError` `ERR_INVALID_ARG_VALUE` (motorn inte registrerad); `RenderError` `UNKNOWN_LAYOUT`. Motorfel propageras oomslutna |
| `ctx.freeLayout(g, engine)` | Användning; `TypeError` `ERR_INVALID_ARG_VALUE` (motorn inte registrerad). Motorfel propageras oomslutna |
| `ctx.bestRenderer(format)` | Användning (`format` inte en sträng); `TypeError` `ERR_INVALID_ARG_VALUE` (ingen renderare för `format`) |
| `renderWithContext(ctx, g, format, inlineImages?)` | Användning (`ctx` inte en `GvcContext`, `g` inte ett objekt, `format` inte en sträng); `TypeError` `ERR_INVALID_ARG_VALUE` (ingen renderare för `format`). Renderingsfel propageras oomslutna |
| `setImageSizer(sizer)` | Användning (varken en funktion eller `null`) |
| `setImageResolver(fn)` | Användning (varken en funktion eller `null`) |
| `setTextMeasurer(measurer)` | Användning (varken en `TextMeasurer` eller `undefined`) |

### Vilka funktioner omsluter främmande throw

| Funktioner | Beteende vid ett oväntat throw (som inte kommer från dot-engine) |
|------------|------------------------------------------------------------------|
| `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps` | Omsluts som `InternalError`; `cause` är det ursprungliga felet |
| `renderWithContext` och varje `GvcContext`-metod | **Omsluts inte.** Ett motorfel når anroparen som vad motorn än kastade, till exempel ett vanligt `TypeError` utan `code` |

Om du använder `GvcContext` direkt, behandla ett fel som varken är ett
`DotEngineError` eller ett användningsfel som ett fel i dot-engine.

## `tryRenderSvg` eller `renderSvg`

| | `renderSvg` | `tryRenderSvg` |
|---|-------------|----------------|
| Felaktig DOT eller layoutfel | Kastar ett `DotEngineError` | Returnerar `{ errors: [one] }` |
| Felaktiga argument | Kastar ett användningsfel | Kastar ett användningsfel |
| Felvärde | Ett `Error` med stack och `cause` | Vanlig data: `type`, `code`, `message`, `friendlyMessage`, plus `location` / `expected` när de finns |
| Använd när | Felet ska avbryta anroparen | Du förgrenar på `code`, eller skickar felet över `postMessage` eller till en logg |

`tryRenderSvg` kastar aldrig för någon DOT-indata. Den kastar bara när själva
argumenten är ogiltiga, vilket är en bugg i den anropande koden. De felobjekt
den returnerar har ingen `cause` och ingen stackspårning.

## Omslutna fel och `cause`

När `renderSvg`, `render` eller `getDrawOps` fångar ett fel som dot-engine inte
har gett kastar de ett `InternalError` vars `cause` är det ursprungliga felet.
`message` är det ursprungliga meddelandet.

`cause` är icke-uppräknelig, så `JSON.stringify(err)` utelämnar den. Gå igenom
kedjan uttryckligen när du loggar (se det sista exemplet nedan).

## Kontroller över paketgränser

`instanceof DotEngineError` fungerar inom en och samma kopia av biblioteket. Om
två kopior kan laddas (duplicerade paket, en pluginvärd) använd `isGvError(e)`.
Den kontrollerar att `type` och `code` är strängar och fungerar över kopior. Den
godtar också de vanliga objekt som `tryRenderSvg` returnerar.

## Exempel

Skilj de två familjerna åt:

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

Hantera ett resultat från `tryRenderSvg`:

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

Logga ett `InternalError` med dess orsak:

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

## Se även

- [API-referens (urval)](/sv/guide/api) för varje funktions signatur.
- [Typer](/sv/guide/types) för formerna `GvError` och `RenderResult`.
- [Genererat API (TypeDoc)](/reference/) för de fullständiga unionerna `GvErrorCode` och `UsageErrorCode`.
