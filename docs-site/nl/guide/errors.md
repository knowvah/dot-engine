---
sourceHash: 545227fb3a0a91494ed7a2c299e5a9ca93a594d68d99e0596f743e7597dfbae9
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Fouten en uitzonderingen

dot-engine werpt twee soorten fouten. Welke soort u opvangt, vertelt u wie iets
moet veranderen.

## Twee families, één regel

| Familie | Hoe u haar herkent | Betekenis | Wie handelt |
|--------|---------------------|---------|----------|
| Fout van dot-engine | `err instanceof DotEngineError` | dot-engine is op deze invoer mislukt: ongeldige DOT, een fatale fout die Graphviz zelf ook zou melden, een niet-ondersteunde Graphviz-functie of een bug in dot-engine | De DOT-auteur, of een bugmelding |
| Gebruiksfout | standaard `TypeError` / `RangeError` / `Error` met `err.code` die met `ERR_` begint | De aanroep was fout: verkeerd argumenttype, onbekende engine- of formaatnaam, verkeerde aanroepvolgorde | De aanroepende code |

Vertak op `.code`, niet op de berichttekst. Berichten kunnen tussen releases
veranderen; codes zijn stabiel.

Gebruiksfouten zijn geen `DotEngineError`s en implementeren `GvError` niet. Hun
`name` blijft `TypeError`, `RangeError` of `Error`, zoals in Node.js.

## Klassenreferentie

Alle vier onderstaande klassen breiden `DotEngineError` uit en implementeren de
vorm `GvError` (`type`, `code`, `message`, `friendlyMessage`, optioneel
`location` en `expected`).

### `DotEngineError` (abstract)

De gemeenschappelijke basis. `instanceof DotEngineError` is waar voor elke fout
die dot-engine over zijn invoer werpt. Ze kan niet rechtstreeks worden
geconstrueerd. `type`, `code` en `friendlyMessage` worden door de subklassen
gedefinieerd.

### `ParseError`

| Onderdeel | Waarde |
|------|-------|
| Wordt geworpen wanneer | De DOT-broncode ongeldig is, of de verkeerde kantoperator voor het soort graaf gebruikt |
| `type` | `syntax` |
| Codes | `SYNTAX_ERROR`, `SYNTAX_UNEXPECTED_EOF`, `EDGE_OP_DIRECTED_IN_UNDIRECTED`, `EDGE_OP_UNDIRECTED_IN_DIRECTED`, `GENERIC_ERROR` |
| Velden | `location` (`{ line, column, offset? }`), `expected` (verwachtingen van de parser; alleen `SYNTAX_*`), getters `line` en `column` |
| Actie van de aanroeper | Corrigeer de DOT-broncode. Toon `location` en `friendlyMessage` aan de auteur |

`GENERIC_ERROR` bij een `ParseError` betekent dat de broncode zo diep is
genest dat de parser geen stackruimte meer had.

### `HtmlParseError`

| Onderdeel | Waarde |
|------|-------|
| Wordt geworpen wanneer | Bereikt tegenwoordig nooit een aanroeper (zie hieronder) |
| `type` | `semantic` |
| Codes | `HTML_PARSE_ERROR` |
| Velden | `tag` (het aanstootgevende token). Geen `location` of `expected` |
| Actie van de aanroeper | Geen. Om een fout label te vinden, vergelijkt u de gerenderde uitvoer met wat u verwachtte |

De parser voor HTML-achtige labels werpt `HtmlParseError` bij een onbekend
element, een misvormd attribuut of een misplaatste `<TABLE>`, `<HR>` of `<VR>`.
De lay-outfase vangt de fout op en geeft het label geen inhoud, zoals Graphviz
dat doet: de graaf wordt nog steeds gerenderd, met een leeg label. Geen enkele
publieke functie propageert haar.

`HtmlParseError` wordt niet geëxporteerd vanuit de pakketroot. Mocht er ooit
toch een bij u terechtkomen, dan identificeert
`err instanceof DotEngineError && err.code === 'HTML_PARSE_ERROR'` haar.

### `RenderError`

| Onderdeel | Waarde |
|------|-------|
| Wordt geworpen wanneer | Lay-out of rendering mislukt op een manier die Graphviz zelf ook zou melden, de graaf een niet-beschikbare lay-out-engine noemt, of de graaf een Graphviz-functie gebruikt die dot-engine niet heeft geport |
| `type` | `render` voor `RENDER_ERROR`; `semantic` voor `UNKNOWN_LAYOUT` en `UNSUPPORTED_FEATURE` |
| Codes | `RENDER_ERROR`, `UNKNOWN_LAYOUT`, `UNSUPPORTED_FEATURE` |
| Velden | `cause` wanneer de mislukking een andere fout omwikkelde. Geen `location` |
| Actie van de aanroeper | `RENDER_ERROR`: pas de graaf aan. `UNKNOWN_LAYOUT`: corrigeer het attribuut `layout=`. `UNSUPPORTED_FEATURE`: vermijd de functie (bijvoorbeeld sfdp met `rotation=45`; zie de [tabel](#unsupported-feature-reference)) |

### `InternalError`

| Onderdeel | Waarde |
|------|-------|
| Wordt geworpen wanneer | Een assertie of invariant binnen dot-engine faalt, of een fout die niet van dot-engine is aan de lay-out- of renderpijplijn ontsnapt |
| `type` | `render` |
| Codes | `INTERNAL_ERROR` |
| Velden | `cause` (de oorspronkelijke fout, wanneer er een is omwikkeld) |
| Actie van de aanroeper | Meld een bug met de DOT-broncode die haar veroorzaakte |

Niets wat de DOT-auteur kan veranderen, voorkomt betrouwbaar een
`InternalError`.

## Codereferentie

### `GvErrorCode`

| Code | Klasse | `type` | Betekenis | Typische oorzaak | Actie van de aanroeper | Opgeworpen door |
|------|-------|--------|---------|---------------|---------------|-----------|
| `SYNTAX_ERROR` | `ParseError` | `syntax` | Onverwacht token | Typefout, ontbrekende `;` of `}` | Corrigeer DOT op `location` | `parse`, `renderSvg` |
| `SYNTAX_UNEXPECTED_EOF` | `ParseError` | `syntax` | Broncode eindigde midden in een statement | Niet gesloten `{`, `[` of string | Corrigeer DOT op `location` | `parse`, `renderSvg` |
| `EDGE_OP_DIRECTED_IN_UNDIRECTED` | `ParseError` | `syntax` | `->` in een ongerichte graaf | `graph { a -> b }` | Gebruik `--` | `parse`, `renderSvg` |
| `EDGE_OP_UNDIRECTED_IN_DIRECTED` | `ParseError` | `syntax` | `--` in een digraph | `digraph { a -- b }` | Gebruik `->` | `parse`, `renderSvg` |
| `GENERIC_ERROR` | `ParseError` | `syntax` | Broncode te diep genest om te parsen | Pathologisch geneste subgrafen | Maak de DOT vlakker | `parse`, `renderSvg` |
| `HTML_PARSE_ERROR` | `HtmlParseError` | `semantic` | Misvormd HTML-achtig label | Onbekend element, fout attribuut | Geen: het label wordt leeg gerenderd | Geen (intern opgevangen) |
| `RENDER_ERROR` | `RenderError` | `render` | Een fatale lay-out- of renderfout die Graphviz ook zou melden | Misvormde invoer voor een lay-outfase | Pas de graaf aan | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNKNOWN_LAYOUT` | `RenderError` | `semantic` | Het attribuut `layout=` van de graaf noemt geen geregistreerde engine | `layout="foo"` | Corrigeer het attribuut | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNSUPPORTED_FEATURE` | `RenderError` | `semantic` | De graaf vraagt een Graphviz-functie die dot-engine niet heeft geport | sfdp met `rotation=45` | Vermijd de functie | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `INTERNAL_ERROR` | `InternalError` | `render` | Bug in dot-engine | Mislukte assertie, vreemde throw | Meld een bug | `renderSvg`, `render`, `getDrawOps`, builder-methoden, `GvcContext.layout` (niet omwikkeld) |

### `UsageErrorCode`

| Code | Klasse | Betekenis | Typische oorzaak | Actie van de aanroeper | Opgeworpen door |
|------|-------|---------|---------------|---------------|-----------|
| `ERR_INVALID_ARG_TYPE` | `TypeError` | Verkeerd type, `null` of een ontbrekend verplicht argument | `renderSvg(undefined, 'dot')`, `getLayout(null)` | Corrigeer de aanroep | Elke publieke functie die argumenten neemt |
| `ERR_INVALID_ARG_VALUE` | `TypeError` | Juist type, onbekende waarde | Niet-geregistreerde engine- of formaatnaam; `getLayout(g, { yAxis: 'other' })` | Gebruik een geregistreerde naam of een toegestane waarde | `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps`, `getLayout`, `GvcContext.layout`, `freeLayout`, `bestRenderer`, `renderWithContext` |
| `ERR_OUT_OF_RANGE` | `RangeError` | Numeriek argument buiten zijn bereik | Gereserveerd | Corrigeer de aanroep | Geen enkele publieke functie werpt haar tegenwoordig |
| `ERR_INVALID_STATE` | `Error` | Aanroep gedaan in de verkeerde toestand | `getLayout` vóór de lay-out | Leg eerst uit (`render(g, ...)` of `ctx.layout`) | `getLayout` |

Een niet-geregistreerd engine-argument wordt afgewezen, ook als de DOT-broncode
een geldig attribuut `layout=` instelt. Het argument wordt eerst gecontroleerd.

## Referentie voor `UNSUPPORTED_FEATURE` {#unsupported-feature-reference}

Elke onderstaande attribuutwaarde laat de lay-out een `RenderError` met code
`UNSUPPORTED_FEATURE` werpen waar native Graphviz een algoritme zou draaien dat
dot-engine niet heeft geport. Het alternatief was een lay-out te renderen die
van Graphviz verschilt zonder dat te zeggen. De controle slaat alleen aan
wanneer de voorwaarde in de kolom "Slaat aan wanneer" geldt; hetzelfde attribuut
elders wordt gewoon gerenderd. Om de fout te vermijden, verwijdert u het
attribuut of wijzigt u het naar een ondersteunde waarde.

| Engine | Attribuut en waarde | Slaat aan wanneer | Benodigde Graphviz-functie |
|--------|--------------------|------------|-------------------------|
| neato | `mode=hier` | Altijd (nadat de graaf 2+ knopen heeft en `maxiter` niet negatief is) | Hiërarchische stressmajorisatie (`stress_majorization_with_hierarchy`) |
| neato | `mode=ipsep` | Alleen wanneer Graphviz beperkingen zou opbouwen: `diredgeconstraints` is waar of `hier*`, `overlap=ipsep`, of de graaf heeft een cluster op het hoogste niveau. Zonder beperkingen draait het als stressmajorisatie, zoals in Graphviz | Beperkte majorisatie (`stress_majorization_cola`) |
| neato | `start=self` | `mode` is `major` (de standaardwaarde) of `ipsep` | Slimme initialisatie (`smart_ini`). Onder `mode=KK` of `mode=sgd` logt het eenmaal per render `start=0 not supported with mode=self - ignored`, zoals Graphviz doet |
| neato | `model=subset` | `mode` is `major` of `KK` | Het afstandsmodel subset |
| neato | `model=circuit` | `mode` is `major`, of `KK` op een samenhangende graaf. `KK` op een niet-samenhangende graaf zonder `pack` of `packmode` logt een waarschuwing en gebruikt kortste paden, zoals Graphviz doet | Het afstandsmodel circuit (`circuit_model`) |
| neato, twopi, circo, sfdp | `overlap=voronoi` (hoofdletterongevoelig) | De graaf (voor twopi een component; voor sfdp de hele graaf of een component) heeft 2+ knopen en de eigen overlaptelling van Graphviz (`countOverlap`, die knoopveelhoeken toetst) is groter dan 0. Knopen die elkaar alleen via het omsluitende kader raken, triggeren het niet. circo bereikt het alleen voor een graaf met één component (bij meerdere componenten negeert Graphviz `overlap` ook). sfdp bereikt het alleen wanneer `overlap` geen prism-modus is | Voronoi-overlapverwijdering (`vAdjust`) |
| fdp | `overlap=` een van `voronoi`, `oscale`, `vpsc`, `ipsep`, `ortho`, `ortho_yx`, `orthoxy`, `orthoyx`, `portho`, `portho_yx`, `porthoxy`, `porthoyx` | De modus wordt bereikt na de `N:`-krachtiteratiepogingen, dat wil zeggen wanneer die pogingen niet alle overlap verwijderen (of `N` is 0 of ontbreekt). Het voorvoegsel `N:` is toegestaan, bijvoorbeeld `3:voronoi` | Het bijbehorende `removeOverlapWith`-aanpassingsalgoritme |
| fdp | `splines=compound` | Altijd, met of zonder clusters | Clustermijdende kantroutering (`compoundEdges`) |
| sfdp | `smoothing=` alles behalve `none` of `0` | Altijd | `post_process_smoothing` |
| sfdp | `rotation=` elk getal ongelijk aan nul | Altijd | `rotate()` vóór overlapverwijdering |
| sfdp | `label_scheme=1` tot `4` | Er bestaat een knoop met de naam `|edgelabel|...`, `overlap` resolveert naar de modus `prism`, en ofwel het schema is 3 of 4, ofwel het schema is 1 of 2 en het aantal prism-pogingen is groter dan 0 (`overlap=prism` met een getal, niet de standaard `prism0`). Waarden boven 4 tellen als 0. Gewone kantlabels triggeren het nooit | Afhandeling van kantlabelknopen (`edge_labeling_scheme`) |
| sfdp | `quadtree=none` (ook `0`, `false`) | Elke graaf met minstens één knoop. Het bericht noemt het opgeloste schema | `spring_electrical_embedding_slow` |
| sfdp | `quadtree=fast` (ook `2`) | Elke graaf met minstens één knoop. Het bericht noemt het opgeloste schema | `spring_electrical_embedding_fast` |
| alle engines | Een knoopvorm die door een speciaal `round_corners`-geval wordt getekend dat niet is geport | De knoop gebruikt die vorm. Bericht: `special shape N not yet ported` | De tekentak `round_corners` van de vorm. Dit is een interne bewaker tegen een vormnummer zonder tekengeval; van geen enkele benoemde vorm is bekend dat die er komt |

De meeste berichten hebben de vorm `<attribute>=<value>: <what> is not supported yet`.
De uitzonderingen zijn `smoothing` en `rotation` (die de ontbrekende routine
noemen), de fdp-rijen en de vormrij, die de bovenstaande bewoordingen gebruiken.
Vertak op `err.code === 'UNSUPPORTED_FEATURE'`, niet op de tekst.

Waarden die de standaard selecteren (bijvoorbeeld `quadtree=normal`, `true`,
`yes`, `1`) en de door Graphviz geaccepteerde waarden die wel zijn geport
(bijvoorbeeld `start=regular`, `start=random`, `model=mds`, `mode=KK`,
`mode=sgd`, `overlap=prism`, de `scale`-familie en, bij neato, twopi, circo en
sfdp, `overlap=oscale`, `vpsc` en de modi `ortho*` / `portho*`) worden gewoon
gerenderd.

## Referentie per functie

"Gebruik" betekent `TypeError` met `ERR_INVALID_ARG_TYPE`, tenzij een rij een
andere code noemt.

| Functie | Kan werpen |
|----------|-----------|
| `renderSvg(dotSource, engine)` | Gebruik (`dotSource` of `engine` is geen string); `TypeError` `ERR_INVALID_ARG_VALUE` (engine niet geregistreerd); `ParseError`; `RenderError`; `InternalError` |
| `tryRenderSvg(dotSource, engine)` | Gebruik (`dotSource` of `engine` is geen string); `TypeError` `ERR_INVALID_ARG_VALUE` (engine niet geregistreerd). Verder niets: elke mislukking bij DOT-invoer wordt in `errors` teruggegeven |
| `parse(dotSource)` | `TypeError` `ERR_INVALID_ARG_TYPE` (`dotSource` is geen string); `ParseError` |
| `render(g, format, opts?)` | Gebruik (`g`, `format` of `opts` van verkeerd type); `TypeError` `ERR_INVALID_ARG_VALUE` (engine of formaat niet geregistreerd); `RenderError`; `InternalError` |
| `getDrawOps(g, opts?)` | Gebruik (`g` of `opts` van verkeerd type); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.engine` niet geregistreerd); `RenderError`; `ParseError` (de tussenliggende xdot kon niet opnieuw worden geparsed: een bug in dot-engine); `InternalError` |
| `createGraph(opts?)` en builder-methoden (`addNode`, `addEdge`, `addSubgraph`, `setAttr`, ...) | Gebruik (verkeerde argumenttypen, inclusief attribuutwaarden die geen string zijn); `InternalError` (het graafmodel kon geen knoop of subgraaf aanmaken) |
| `addEdge(g, tail, head, name?)` (uit `/api`) | Gebruik (`g`, `tail` of `head` is geen object; `name` is geen string) |
| `getLayout(g, opts?)` | Gebruik (`g` of `opts` is geen object); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.yAxis` is niet `'up'` of `'down'`); `Error` `ERR_INVALID_STATE` (graaf niet uitgelegd) |
| `new GvcContext(measurer, options?)` | Gebruik (`measurer` heeft geen functie `measure`; `options` is geen object) |
| `ctx.register(plugin)` | Gebruik (geen renderer-plugin of lay-out-engine) |
| `ctx.layout(g, engine)` | Gebruik (`g` is geen object, `engine` is geen string); `TypeError` `ERR_INVALID_ARG_VALUE` (engine niet geregistreerd); `RenderError` `UNKNOWN_LAYOUT`. Enginefouten propageren niet-omwikkeld |
| `ctx.freeLayout(g, engine)` | Gebruik; `TypeError` `ERR_INVALID_ARG_VALUE` (engine niet geregistreerd). Enginefouten propageren niet-omwikkeld |
| `ctx.bestRenderer(format)` | Gebruik (`format` is geen string); `TypeError` `ERR_INVALID_ARG_VALUE` (geen renderer voor `format`) |
| `renderWithContext(ctx, g, format, inlineImages?)` | Gebruik (`ctx` is geen `GvcContext`, `g` is geen object, `format` is geen string); `TypeError` `ERR_INVALID_ARG_VALUE` (geen renderer voor `format`). Renderfouten propageren niet-omwikkeld |
| `setImageSizer(sizer)` | Gebruik (geen functie of `null`) |
| `setImageResolver(fn)` | Gebruik (geen functie of `null`) |
| `setTextMeasurer(measurer)` | Gebruik (geen `TextMeasurer` of `undefined`) |

### Welke functies vreemde throws omwikkelen

| Functies | Gedrag bij een onverwachte throw (niet van dot-engine) |
|-----------|---------------------------------------------------|
| `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps` | Omwikkeld als `InternalError`; `cause` is de oorspronkelijke fout |
| `renderWithContext` en elke `GvcContext`-methode | **Niet omwikkeld.** Een enginebug bereikt de aanroeper als wat de engine ook wierp, bijvoorbeeld een gewone `TypeError` zonder `code` |

Als u `GvcContext` rechtstreeks gebruikt, behandel dan een fout die noch een
`DotEngineError` noch een gebruiksfout is als een bug in dot-engine.

## `tryRenderSvg` of `renderSvg`

| | `renderSvg` | `tryRenderSvg` |
|---|-------------|----------------|
| Ongeldige DOT of lay-outfout | Werpt een `DotEngineError` | Geeft `{ errors: [one] }` terug |
| Foute argumenten | Werpt een gebruiksfout | Werpt een gebruiksfout |
| Foutwaarde | Een `Error` met een stack en `cause` | Gewone data: `type`, `code`, `message`, `friendlyMessage`, plus `location` / `expected` indien aanwezig |
| Gebruik wanneer | Een mislukking de aanroeper moet afbreken | U op `code` vertakt, of de fout via `postMessage` of in een log verstuurt |

`tryRenderSvg` werpt nooit bij enige DOT-invoer. Het werpt alleen wanneer de
argumenten zelf ongeldig zijn, wat een bug in de aanroepende code is. De
foutobjecten die het teruggeeft hebben geen `cause` en geen stacktrace.

## Omwikkelde mislukkingen en `cause`

Wanneer `renderSvg`, `render` of `getDrawOps` een fout opvangt die dot-engine
niet zelf heeft geworpen, werpt het een `InternalError` waarvan `cause` de
oorspronkelijke fout is. Het `message` is het oorspronkelijke bericht.

`cause` is niet-enumereerbaar, dus `JSON.stringify(err)` laat het weg. Loop de
keten expliciet door wanneer u logt (zie het laatste voorbeeld hieronder).

## Controles over bundelgrenzen heen

`instanceof DotEngineError` werkt binnen één kopie van de bibliotheek. Als er
twee kopieën kunnen worden geladen (dubbele bundels, een pluginhost), gebruik
dan `isGvError(e)`. Het controleert op een string-`type` en -`code` en werkt
over kopieën heen. Het accepteert ook de gewone objecten die `tryRenderSvg`
teruggeeft.

## Voorbeelden

Houd de twee families uit elkaar:

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

Verwerk een `tryRenderSvg`-resultaat:

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

Log een `InternalError` met zijn oorzaak:

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

## Zie ook

- [API-referentie (selectie)](/nl/guide/api) voor de signatuur van elke functie.
- [Typen](/nl/guide/types) voor de vormen `GvError` en `RenderResult`.
- [Gegenereerde API (TypeDoc)](/reference/) voor de volledige unions `GvErrorCode` en `UsageErrorCode`.
