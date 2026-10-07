---
sourceHash: 545227fb3a0a91494ed7a2c299e5a9ca93a594d68d99e0596f743e7597dfbae9
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Chyby a výnimky

dot-engine vyhadzuje dva druhy chýb. To, ktorý druh zachytíte, vám prezradí,
kto musí niečo zmeniť.

## Dve rodiny, jedno pravidlo

| Rodina | Ako ju rozpoznať | Význam | Kto koná |
|--------|------------------|--------|----------|
| Zlyhanie dot-engine | `err instanceof DotEngineError` | dot-engine na tomto vstupe zlyhal: chybný DOT, fatálna chyba, ktorú by ohlásil aj samotný Graphviz, nepodporovaná funkcia Graphviz alebo chyba v dot-engine | Autor DOT alebo nahlásenie chyby |
| Chyba použitia | štandardný `TypeError` / `RangeError` / `Error` s `err.code` začínajúcim na `ERR_` | Volanie bolo nesprávne: zlý typ argumentu, neznámy názov modulu alebo formátu, nesprávne poradie volaní | Volajúci kód |

Vetvte podľa `.code`, nie podľa textu správy. Správy sa môžu medzi vydaniami
meniť; kódy sú stabilné.

Chyby použitia nie sú `DotEngineError` a neimplementujú `GvError`. Ich `name`
zostáva `TypeError`, `RangeError` alebo `Error`, ako v Node.js.

## Referencia tried

Všetky štyri nižšie uvedené triedy rozširujú `DotEngineError` a implementujú
tvar `GvError` (`type`, `code`, `message`, `friendlyMessage`, voliteľné
`location` a `expected`).

### `DotEngineError` (abstraktná)

Spoločná základná trieda. `instanceof DotEngineError` je pravdivé pre každú
chybu, ktorú dot-engine ohlási o svojom vstupe. Nedá sa vytvoriť priamo.
`type`, `code` a `friendlyMessage` definujú podtriedy.

### `ParseError`

| Položka | Hodnota |
|---------|---------|
| Vyhodí sa, keď | Zdrojový kód DOT nie je platný alebo používa nesprávny operátor hrany pre daný druh grafu |
| `type` | `syntax` |
| Kódy | `SYNTAX_ERROR`, `SYNTAX_UNEXPECTED_EOF`, `EDGE_OP_DIRECTED_IN_UNDIRECTED`, `EDGE_OP_UNDIRECTED_IN_DIRECTED`, `GENERIC_ERROR` |
| Polia | `location` (`{ line, column, offset? }`), `expected` (očakávania parsera; iba `SYNTAX_*`), getteri `line` a `column` |
| Čo má urobiť volajúci | Opraviť zdrojový kód DOT. Zobraziť autorovi `location` a `friendlyMessage` |

`GENERIC_ERROR` pri `ParseError` znamená, že zdrojový kód je vnorený tak
hlboko, že parseru došiel zásobník.

### `HtmlParseError`

| Položka | Hodnota |
|---------|---------|
| Vyhodí sa, keď | Dnes sa k volajúcemu nikdy nedostane (pozrite nižšie) |
| `type` | `semantic` |
| Kódy | `HTML_PARSE_ERROR` |
| Polia | `tag` (problémový token). Žiadne `location` ani `expected` |
| Čo má urobiť volajúci | Nič. Chybný popis nájdete porovnaním vykresleného výstupu s tým, čo ste očakávali |

Parser popisov podobných HTML vyhodí `HtmlParseError` pri neznámom elemente,
chybnom atribúte alebo na nesprávnom mieste umiestnenom `<TABLE>`, `<HR>`
alebo `<VR>`. Fáza rozloženia ho zachytí a popisu nepriradí žiadny obsah,
rovnako ako Graphviz: graf sa stále vykreslí, s prázdnym popisom. Žiadna
verejná funkcia ho nepropaguje.

`HtmlParseError` sa neexportuje z koreňa balíka. Ak by sa predsa len niekedy
k vám dostal, identifikuje ho
`err instanceof DotEngineError && err.code === 'HTML_PARSE_ERROR'`.

### `RenderError`

| Položka | Hodnota |
|---------|---------|
| Vyhodí sa, keď | Rozloženie alebo vykreslenie zlyhá spôsobom, ktorý by ohlásil aj samotný Graphviz, graf pomenúva nedostupný modul rozloženia alebo graf používa funkciu Graphviz, ktorú dot-engine neportoval |
| `type` | `render` pre `RENDER_ERROR`; `semantic` pre `UNKNOWN_LAYOUT` a `UNSUPPORTED_FEATURE` |
| Kódy | `RENDER_ERROR`, `UNKNOWN_LAYOUT`, `UNSUPPORTED_FEATURE` |
| Polia | `cause`, keď zlyhanie obalilo inú chybu. Žiadne `location` |
| Čo má urobiť volajúci | `RENDER_ERROR`: zmeniť graf. `UNKNOWN_LAYOUT`: opraviť atribút `layout=`. `UNSUPPORTED_FEATURE`: vyhnúť sa funkcii (napríklad sfdp s `rotation=45`; pozrite [tabuľku](#unsupported-feature-reference)) |

### `InternalError`

| Položka | Hodnota |
|---------|---------|
| Vyhodí sa, keď | Zlyhá tvrdenie alebo invariant vnútri dot-engine, alebo z kanála rozloženia či vykreslenia unikne chyba, ktorá nepochádza z dot-engine |
| `type` | `render` |
| Kódy | `INTERNAL_ERROR` |
| Polia | `cause` (pôvodná chyba, ak bola obalená) |
| Čo má urobiť volajúci | Nahlásiť chybu spolu so zdrojovým kódom DOT, ktorý ju vyvolal |

Nič, čo môže autor DOT zmeniť, sa `InternalError` spoľahlivo nevyhne.

## Referencia kódov

### `GvErrorCode`

| Kód | Trieda | `type` | Význam | Typická príčina | Čo má urobiť volajúci | Vyhadzuje |
|-----|--------|--------|--------|-----------------|-----------------------|-----------|
| `SYNTAX_ERROR` | `ParseError` | `syntax` | Neočakávaný token | Preklep, chýbajúce `;` alebo `}` | Opraviť DOT v `location` | `parse`, `renderSvg` |
| `SYNTAX_UNEXPECTED_EOF` | `ParseError` | `syntax` | Zdrojový kód skončil uprostred príkazu | Neuzavreté `{`, `[` alebo reťazec | Opraviť DOT v `location` | `parse`, `renderSvg` |
| `EDGE_OP_DIRECTED_IN_UNDIRECTED` | `ParseError` | `syntax` | `->` v neorientovanom grafe | `graph { a -> b }` | Použiť `--` | `parse`, `renderSvg` |
| `EDGE_OP_UNDIRECTED_IN_DIRECTED` | `ParseError` | `syntax` | `--` v orientovanom grafe (digraph) | `digraph { a -- b }` | Použiť `->` | `parse`, `renderSvg` |
| `GENERIC_ERROR` | `ParseError` | `syntax` | Zdrojový kód je príliš hlboko vnorený na spracovanie | Patologicky vnorené podgrafy | Zploštiť DOT | `parse`, `renderSvg` |
| `HTML_PARSE_ERROR` | `HtmlParseError` | `semantic` | Chybný popis podobný HTML | Neznámy element, zlý atribút | Nič: popis sa vykreslí prázdny | Žiadna (zachytáva sa interne) |
| `RENDER_ERROR` | `RenderError` | `render` | Fatálna chyba rozloženia alebo vykreslenia, ktorú by ohlásil aj Graphviz | Chybný vstup pre niektorú fázu rozloženia | Zmeniť graf | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNKNOWN_LAYOUT` | `RenderError` | `semantic` | Atribút grafu `layout=` pomenúva modul, ktorý nie je zaregistrovaný | `layout="foo"` | Opraviť atribút | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNSUPPORTED_FEATURE` | `RenderError` | `semantic` | Graf požaduje funkciu Graphviz, ktorú dot-engine neportoval | sfdp s `rotation=45` | Vyhnúť sa funkcii | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `INTERNAL_ERROR` | `InternalError` | `render` | Chyba v dot-engine | Zlyhané tvrdenie, cudzia výnimka | Nahlásiť chybu | `renderSvg`, `render`, `getDrawOps`, metódy buildera, `GvcContext.layout` (neobalené) |

### `UsageErrorCode`

| Kód | Trieda | Význam | Typická príčina | Čo má urobiť volajúci | Vyhadzuje |
|-----|--------|--------|-----------------|-----------------------|-----------|
| `ERR_INVALID_ARG_TYPE` | `TypeError` | Zlý typ, `null` alebo chýbajúci povinný argument | `renderSvg(undefined, 'dot')`, `getLayout(null)` | Opraviť volanie | Každá verejná funkcia, ktorá prijíma argumenty |
| `ERR_INVALID_ARG_VALUE` | `TypeError` | Správny typ, neznáma hodnota | Nezaregistrovaný názov modulu alebo formátu; `getLayout(g, { yAxis: 'other' })` | Použiť zaregistrovaný názov alebo povolenú hodnotu | `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps`, `getLayout`, `GvcContext.layout`, `freeLayout`, `bestRenderer`, `renderWithContext` |
| `ERR_OUT_OF_RANGE` | `RangeError` | Číselný argument mimo svojho rozsahu | Rezervované | Opraviť volanie | Dnes ho nevyhadzuje žiadna verejná funkcia |
| `ERR_INVALID_STATE` | `Error` | Volanie v nesprávnom stave | `getLayout` pred rozložením | Najprv vytvoriť rozloženie (`render(g, ...)` alebo `ctx.layout`) | `getLayout` |

Argument s nezaregistrovaným modulom sa odmietne, aj keď zdrojový kód DOT
nastavuje platný atribút `layout=`. Argument sa kontroluje ako prvý.

## Referencia `UNSUPPORTED_FEATURE` {#unsupported-feature-reference}

Každá nižšie uvedená hodnota atribútu spôsobí, že rozloženie vyhodí
`RenderError` s kódom `UNSUPPORTED_FEATURE` tam, kde by natívny Graphviz
spustil algoritmus, ktorý dot-engine neportoval. Alternatívou bolo vykresliť
rozloženie, ktoré sa od Graphviz líši, bez toho, aby sa to povedalo. Kontrola
sa spustí iba vtedy, keď platí podmienka v stĺpci „Spustí sa, keď“; ten istý
atribút inde sa vykreslí normálne. Chybe sa vyhnete odstránením atribútu
alebo jeho zmenou na podporovanú hodnotu.

| Modul | Atribút a hodnota | Spustí sa, keď | Potrebná funkcia Graphviz |
|-------|-------------------|----------------|---------------------------|
| neato | `mode=hier` | Vždy (po tom, čo má graf 2+ uzlov a `maxiter` nie je záporný) | Hierarchická stresová majorizácia (`stress_majorization_with_hierarchy`) |
| neato | `mode=ipsep` | Iba keď by Graphviz zostavil obmedzenia: `diredgeconstraints` je pravdivé alebo `hier*`, `overlap=ipsep`, alebo graf má klaster najvyššej úrovne. Bez obmedzení beží ako stresová majorizácia, rovnako ako v Graphviz | Obmedzená majorizácia (`stress_majorization_cola`) |
| neato | `start=self` | `mode` je `major` (predvolené) alebo `ipsep` | Inteligentná inicializácia (`smart_ini`). Pri `mode=KK` alebo `mode=sgd` zaznamená `start=0 not supported with mode=self - ignored` raz za vykreslenie, rovnako ako Graphviz |
| neato | `model=subset` | `mode` je `major` alebo `KK` | Model vzdialeností subset |
| neato | `model=circuit` | `mode` je `major`, alebo `KK` pri súvislom grafe. `KK` pri nesúvislom grafe bez `pack` alebo `packmode` zaznamená varovanie a použije najkratšie cesty, rovnako ako Graphviz | Model vzdialeností circuit (`circuit_model`) |
| neato, twopi, circo, sfdp | `overlap=voronoi` (bez ohľadu na veľkosť písmen) | Graf (pri twopi komponent; pri sfdp celý graf alebo komponent) má 2+ uzlov a vlastný počet prekrytí Graphviz (`countOverlap`, ktorý testuje polygóny uzlov) je väčší ako 0. Uzly, ktoré sa dotýkajú iba ohraničujúcimi rámcami, ho nespustia. circo sa k nemu dostane iba pri grafe s jedným komponentom (pri viacerých komponentoch Graphviz `overlap` tiež ignoruje). sfdp sa k nemu dostane iba vtedy, keď `overlap` nie je režim prism | Odstraňovanie prekrytí pomocou Voronoiho diagramu (`vAdjust`) |
| fdp | `overlap=` jedna z hodnôt `voronoi`, `oscale`, `vpsc`, `ipsep`, `ortho`, `ortho_yx`, `orthoxy`, `orthoyx`, `portho`, `portho_yx`, `porthoxy`, `porthoyx` | Režim sa dosiahne po `N:` pokusoch silových iterácií, teda keď tieto pokusy neodstránia každé prekrytie (alebo `N` je 0 či chýba). Predpona `N:` je povolená, napríklad `3:voronoi` | Zodpovedajúci algoritmus úpravy `removeOverlapWith` |
| fdp | `splines=compound` | Vždy, s klastrami aj bez nich | Vedenie hrán obchádzajúce klastre (`compoundEdges`) |
| sfdp | `smoothing=` čokoľvek okrem `none` alebo `0` | Vždy | `post_process_smoothing` |
| sfdp | `rotation=` akékoľvek nenulové číslo | Vždy | `rotate()` pred odstránením prekrytí |
| sfdp | `label_scheme=1` až `4` | Existuje uzol s názvom `|edgelabel|...`, `overlap` sa vyhodnotí na režim `prism` a buď je schéma 3 alebo 4, alebo je schéma 1 alebo 2 a počet pokusov prism je väčší ako 0 (`overlap=prism` s číslom, nie predvolené `prism0`). Hodnoty nad 4 sa počítajú ako 0. Bežné popisy hrán ho nikdy nespustia | Spracovanie uzlov popisov hrán (`edge_labeling_scheme`) |
| sfdp | `quadtree=none` (aj `0`, `false`) | Ľubovoľný graf s aspoň jedným uzlom. Správa pomenúva vyhodnotenú schému | `spring_electrical_embedding_slow` |
| sfdp | `quadtree=fast` (aj `2`) | Ľubovoľný graf s aspoň jedným uzlom. Správa pomenúva vyhodnotenú schému | `spring_electrical_embedding_fast` |
| všetky moduly | Tvar uzla nakreslený špeciálnym prípadom `round_corners`, ktorý nie je portovaný | Uzol používa tento tvar. Správa: `special shape N not yet ported` | Kresliaca vetva `round_corners` pre daný tvar. Ide o interný poistný mechanizmus pre číslo tvaru bez kresliaceho prípadu; nie je známe, že by sa k nemu dostal nejaký pomenovaný tvar |

Väčšina správ má tvar `<attribute>=<value>: <what> is not supported yet`.
Výnimkou sú `smoothing` a `rotation` (ktoré pomenúvajú chýbajúcu rutinu),
riadky fdp a riadok pre tvary, ktoré používajú vyššie uvedené znenia. Vetvte
podľa `err.code === 'UNSUPPORTED_FEATURE'`, nie podľa textu.

Hodnoty, ktoré vyberajú predvolenú možnosť (napríklad `quadtree=normal`,
`true`, `yes`, `1`), a hodnoty akceptované Graphviz, ktoré sú portované
(napríklad `start=regular`, `start=random`, `model=mds`, `mode=KK`,
`mode=sgd`, `overlap=prism`, rodina `scale` a pri neato, twopi, circo a sfdp
`overlap=oscale`, `vpsc` a režimy `ortho*` / `portho*`), sa vykreslia
normálne.

## Referencia podľa funkcií

„Použitie“ znamená `TypeError` s `ERR_INVALID_ARG_TYPE`, pokiaľ riadok
neuvádza iný kód.

| Funkcia | Môže vyhodiť |
|---------|--------------|
| `renderSvg(dotSource, engine)` | Použitie (`dotSource` alebo `engine` nie je reťazec); `TypeError` `ERR_INVALID_ARG_VALUE` (modul nie je zaregistrovaný); `ParseError`; `RenderError`; `InternalError` |
| `tryRenderSvg(dotSource, engine)` | Použitie (`dotSource` alebo `engine` nie je reťazec); `TypeError` `ERR_INVALID_ARG_VALUE` (modul nie je zaregistrovaný). Nič iné: každé zlyhanie kvôli vstupu DOT sa vráti v `errors` |
| `parse(dotSource)` | `TypeError` `ERR_INVALID_ARG_TYPE` (`dotSource` nie je reťazec); `ParseError` |
| `render(g, format, opts?)` | Použitie (`g`, `format` alebo `opts` má zlý typ); `TypeError` `ERR_INVALID_ARG_VALUE` (modul alebo formát nie je zaregistrovaný); `RenderError`; `InternalError` |
| `getDrawOps(g, opts?)` | Použitie (`g` alebo `opts` má zlý typ); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.engine` nie je zaregistrovaný); `RenderError`; `ParseError` (sprostredkovaný xdot sa nepodarilo znova spracovať: chyba v dot-engine); `InternalError` |
| `createGraph(opts?)` a metódy buildera (`addNode`, `addEdge`, `addSubgraph`, `setAttr`, ...) | Použitie (nesprávne typy argumentov, vrátane hodnôt atribútov, ktoré nie sú reťazce); `InternalError` (model grafu nedokázal vytvoriť uzol alebo podgraf) |
| `addEdge(g, tail, head, name?)` (z `/api`) | Použitie (`g`, `tail` alebo `head` nie je objekt; `name` nie je reťazec) |
| `getLayout(g, opts?)` | Použitie (`g` alebo `opts` nie je objekt); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.yAxis` nie je `'up'` ani `'down'`); `Error` `ERR_INVALID_STATE` (graf nebol rozložený) |
| `new GvcContext(measurer, options?)` | Použitie (`measurer` nemá funkciu `measure`; `options` nie je objekt) |
| `ctx.register(plugin)` | Použitie (nie je plugin vykresľovača ani modul rozloženia) |
| `ctx.layout(g, engine)` | Použitie (`g` nie je objekt, `engine` nie je reťazec); `TypeError` `ERR_INVALID_ARG_VALUE` (modul nie je zaregistrovaný); `RenderError` `UNKNOWN_LAYOUT`. Zlyhania modulu sa propagujú neobalené |
| `ctx.freeLayout(g, engine)` | Použitie; `TypeError` `ERR_INVALID_ARG_VALUE` (modul nie je zaregistrovaný). Zlyhania modulu sa propagujú neobalené |
| `ctx.bestRenderer(format)` | Použitie (`format` nie je reťazec); `TypeError` `ERR_INVALID_ARG_VALUE` (pre `format` neexistuje vykresľovač) |
| `renderWithContext(ctx, g, format, inlineImages?)` | Použitie (`ctx` nie je `GvcContext`, `g` nie je objekt, `format` nie je reťazec); `TypeError` `ERR_INVALID_ARG_VALUE` (pre `format` neexistuje vykresľovač). Zlyhania vykreslenia sa propagujú neobalené |
| `setImageSizer(sizer)` | Použitie (nie je funkcia ani `null`) |
| `setImageResolver(fn)` | Použitie (nie je funkcia ani `null`) |
| `setTextMeasurer(measurer)` | Použitie (nie je `TextMeasurer` ani `undefined`) |

### Ktoré funkcie obaľujú cudzie výnimky

| Funkcie | Správanie pri neočakávanej výnimke (nepochádzajúcej z dot-engine) |
|---------|-------------------------------------------------------------------|
| `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps` | Obalí sa ako `InternalError`; `cause` je pôvodná chyba |
| `renderWithContext` a každá metóda `GvcContext` | **Neobaľuje sa.** Chyba modulu sa k volajúcemu dostane ako čokoľvek, čo modul vyhodil, napríklad obyčajný `TypeError` bez `code` |

Ak používate `GvcContext` priamo, chybu, ktorá nie je ani `DotEngineError`, ani
chybou použitia, považujte za chybu v dot-engine.

## `tryRenderSvg` alebo `renderSvg`

| | `renderSvg` | `tryRenderSvg` |
|---|-------------|----------------|
| Chybný DOT alebo zlyhanie rozloženia | Vyhodí `DotEngineError` | Vráti `{ errors: [one] }` |
| Nesprávne argumenty | Vyhodí chybu použitia | Vyhodí chybu použitia |
| Hodnota chyby | `Error` so zásobníkom volaní a `cause` | Obyčajné údaje: `type`, `code`, `message`, `friendlyMessage`, plus `location` / `expected`, ak sú prítomné |
| Použite, keď | Zlyhanie má prerušiť volajúceho | Vetvíte podľa `code` alebo posielate chybu cez `postMessage` či do záznamu |

`tryRenderSvg` nikdy nevyhodí výnimku pre žiadny vstup DOT. Vyhodí ju iba
vtedy, keď samotné argumenty sú neplatné, čo je chyba vo volajúcom kóde.
Chybové objekty, ktoré vracia, nenesú `cause` ani zásobník volaní.

## Obalené zlyhania a `cause`

Keď `renderSvg`, `render` alebo `getDrawOps` zachytí chybu, ktorú dot-engine
nevyvolal, vyhodí `InternalError`, ktorého `cause` je pôvodná chyba.
`message` je pôvodná správa.

`cause` nie je enumerovateľné, takže `JSON.stringify(err)` ho vynechá. Pri
zapisovaní do záznamu prejdite reťazec explicitne (pozrite posledný príklad
nižšie).

## Kontroly medzi balíkmi

`instanceof DotEngineError` funguje v rámci jednej kópie knižnice. Ak sa môžu
načítať dve kópie (duplicitné balíky, hostiteľ pluginov), použite
`isGvError(e)`. Kontroluje reťazcové `type` a `code` a funguje medzi
kópiami. Akceptuje aj obyčajné objekty, ktoré vracia `tryRenderSvg`.

## Príklady

Oddelenie oboch rodín:

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

Spracovanie výsledku `tryRenderSvg`:

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

Zapísanie `InternalError` do záznamu spolu s jeho príčinou:

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

## Pozrite aj

- [Referencia API (výber)](/sk/guide/api) pre signatúru každej funkcie.
- [Typy](/sk/guide/types) pre tvary `GvError` a `RenderResult`.
- [Vygenerované API (TypeDoc)](/reference/) pre úplné zjednotené typy `GvErrorCode` a `UsageErrorCode`.
