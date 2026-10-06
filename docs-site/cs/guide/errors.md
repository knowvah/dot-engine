---
sourceHash: 545227fb3a0a91494ed7a2c299e5a9ca93a594d68d99e0596f743e7597dfbae9
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Chyby a výjimky

dot-engine vyhazuje dva druhy chyb. Který druh zachytíte, vám řekne, kdo musí
něco změnit.

## Dvě rodiny, jedno pravidlo

| Rodina | Jak ji poznat | Význam | Kdo jedná |
|--------|---------------|--------|-----------|
| Selhání dot-engine | `err instanceof DotEngineError` | dot-engine na tomto vstupu selhal: chybné DOT, fatální chyba, kterou by ohlásil i samotný Graphviz, nepodporovaná funkce Graphviz nebo chyba v dot-engine | Autor DOT, nebo hlášení chyby |
| Chyba použití | standardní `TypeError` / `RangeError` / `Error` s `err.code` začínajícím `ERR_` | Volání bylo chybné: špatný typ argumentu, neznámý název modulu nebo formátu, špatné pořadí volání | Volající kód |

Větvěte podle `.code`, ne podle textu zprávy. Zprávy se mohou mezi vydáními
měnit; kódy jsou stabilní.

Chyby použití nejsou `DotEngineError` a neimplementují `GvError`. Jejich `name`
zůstává `TypeError`, `RangeError` nebo `Error`, stejně jako v Node.js.

## Reference tříd

Všechny čtyři níže uvedené třídy rozšiřují `DotEngineError` a implementují tvar
`GvError` (`type`, `code`, `message`, `friendlyMessage`, volitelně `location`
a `expected`).

### `DotEngineError` (abstraktní)

Společný základ. `instanceof DotEngineError` platí pro každou chybu, kterou
dot-engine vyvolá kvůli svému vstupu. Nelze jej vytvořit přímo. `type`, `code`
a `friendlyMessage` definují podtřídy.

### `ParseError`

| Položka | Hodnota |
|---------|---------|
| Vyhazuje se, když | Zdrojový kód DOT není platný, nebo používá pro daný druh grafu špatný operátor hrany |
| `type` | `syntax` |
| Kódy | `SYNTAX_ERROR`, `SYNTAX_UNEXPECTED_EOF`, `EDGE_OP_DIRECTED_IN_UNDIRECTED`, `EDGE_OP_UNDIRECTED_IN_DIRECTED`, `GENERIC_ERROR` |
| Pole | `location` (`{ line, column, offset? }`), `expected` (očekávání parseru; pouze `SYNTAX_*`), gettery `line` a `column` |
| Postup volajícího | Opravte zdrojový kód DOT. Autorovi ukažte `location` a `friendlyMessage` |

`GENERIC_ERROR` u `ParseError` znamená, že zdroj je vnořen tak hluboko, že
parseru došel zásobník.

### `HtmlParseError`

| Položka | Hodnota |
|---------|---------|
| Vyhazuje se, když | Dnes se k volajícímu nikdy nedostane (viz níže) |
| `type` | `semantic` |
| Kódy | `HTML_PARSE_ERROR` |
| Pole | `tag` (problematický token). Žádné `location` ani `expected` |
| Postup volajícího | Žádný. Chybný popisek najdete porovnáním vykresleného výstupu s tím, co jste očekávali |

Parser popisků podobných HTML vyvolá `HtmlParseError` pro neznámý element,
chybně utvořený atribut nebo špatně umístěné `<TABLE>`, `<HR>` či `<VR>`.
Fáze rozvržení jej zachytí a popisku nepřidělí žádný obsah, stejně jako
Graphviz: graf se přesto vykreslí, s prázdným popiskem. Žádná veřejná funkce
jej nepropaguje.

`HtmlParseError` se z kořene balíčku neexportuje. Pokud se k vám někdy přece
dostane, identifikuje jej
`err instanceof DotEngineError && err.code === 'HTML_PARSE_ERROR'`.

### `RenderError`

| Položka | Hodnota |
|---------|---------|
| Vyhazuje se, když | Rozvržení nebo vykreslení selže způsobem, který by ohlásil i samotný Graphviz, graf uvádí nedostupný modul rozvržení, nebo graf používá funkci Graphviz, kterou dot-engine neportoval |
| `type` | `render` pro `RENDER_ERROR`; `semantic` pro `UNKNOWN_LAYOUT` a `UNSUPPORTED_FEATURE` |
| Kódy | `RENDER_ERROR`, `UNKNOWN_LAYOUT`, `UNSUPPORTED_FEATURE` |
| Pole | `cause`, pokud selhání obalilo jinou chybu. Žádné `location` |
| Postup volajícího | `RENDER_ERROR`: změňte graf. `UNKNOWN_LAYOUT`: opravte atribut `layout=`. `UNSUPPORTED_FEATURE`: funkci nepoužívejte (například sfdp s `rotation=45`; viz [tabulka](#unsupported-feature-reference)) |

### `InternalError`

| Položka | Hodnota |
|---------|---------|
| Vyhazuje se, když | Uvnitř dot-engine selže aserce nebo invariant, nebo z procesu rozvržení či vykreslení unikne chyba, která nepochází z dot-engine |
| `type` | `render` |
| Kódy | `INTERNAL_ERROR` |
| Pole | `cause` (původní chyba, pokud byla obalena) |
| Postup volajícího | Nahlaste chybu se zdrojovým kódem DOT, který ji vyvolal |

Nic, co může autor DOT změnit, `InternalError` spolehlivě neodstraní.

## Reference kódů

### `GvErrorCode`

| Kód | Třída | `type` | Význam | Typická příčina | Postup volajícího | Vyvolává |
|-----|-------|--------|--------|-----------------|-------------------|----------|
| `SYNTAX_ERROR` | `ParseError` | `syntax` | Neočekávaný token | Překlep, chybějící `;` nebo `}` | Opravte DOT na `location` | `parse`, `renderSvg` |
| `SYNTAX_UNEXPECTED_EOF` | `ParseError` | `syntax` | Zdroj skončil uprostřed příkazu | Neuzavřená `{`, `[` nebo řetězec | Opravte DOT na `location` | `parse`, `renderSvg` |
| `EDGE_OP_DIRECTED_IN_UNDIRECTED` | `ParseError` | `syntax` | `->` v neorientovaném grafu | `graph { a -> b }` | Použijte `--` | `parse`, `renderSvg` |
| `EDGE_OP_UNDIRECTED_IN_DIRECTED` | `ParseError` | `syntax` | `--` v orientovaném grafu (digraph) | `digraph { a -- b }` | Použijte `->` | `parse`, `renderSvg` |
| `GENERIC_ERROR` | `ParseError` | `syntax` | Zdroj je příliš hluboce vnořený pro zpracování | Patologicky vnořené podgrafy | Zploštěte DOT | `parse`, `renderSvg` |
| `HTML_PARSE_ERROR` | `HtmlParseError` | `semantic` | Chybně utvořený popisek podobný HTML | Neznámý element, chybný atribut | Žádný: popisek se vykreslí prázdný | Žádná (zachytává se interně) |
| `RENDER_ERROR` | `RenderError` | `render` | Fatální chyba rozvržení nebo vykreslení, kterou by ohlásil i Graphviz | Chybný vstup pro fázi rozvržení | Změňte graf | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNKNOWN_LAYOUT` | `RenderError` | `semantic` | Atribut `layout=` grafu neuvádí žádný registrovaný modul | `layout="foo"` | Opravte atribut | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNSUPPORTED_FEATURE` | `RenderError` | `semantic` | Graf požaduje funkci Graphviz, kterou dot-engine neportoval | sfdp s `rotation=45` | Funkci nepoužívejte | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `INTERNAL_ERROR` | `InternalError` | `render` | Chyba v dot-engine | Neúspěšná aserce, cizí throw | Nahlaste chybu | `renderSvg`, `render`, `getDrawOps`, metody builderu, `GvcContext.layout` (neobalené) |

### `UsageErrorCode`

| Kód | Třída | Význam | Typická příčina | Postup volajícího | Vyvolává |
|-----|-------|--------|-----------------|-------------------|----------|
| `ERR_INVALID_ARG_TYPE` | `TypeError` | Špatný typ, `null` nebo chybějící povinný argument | `renderSvg(undefined, 'dot')`, `getLayout(null)` | Opravte volání | Každá veřejná funkce, která přijímá argumenty |
| `ERR_INVALID_ARG_VALUE` | `TypeError` | Správný typ, neznámá hodnota | Neregistrovaný název modulu nebo formátu; `getLayout(g, { yAxis: 'other' })` | Použijte registrovaný název nebo povolenou hodnotu | `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps`, `getLayout`, `GvcContext.layout`, `freeLayout`, `bestRenderer`, `renderWithContext` |
| `ERR_OUT_OF_RANGE` | `RangeError` | Číselný argument mimo svůj rozsah | Rezervováno | Opravte volání | Dnes ji nevyvolává žádná veřejná funkce |
| `ERR_INVALID_STATE` | `Error` | Volání ve špatném stavu | `getLayout` před rozvržením | Nejprve proveďte rozvržení (`render(g, ...)` nebo `ctx.layout`) | `getLayout` |

Neregistrovaný argument modulu je odmítnut i tehdy, když zdrojový kód DOT
nastavuje platný atribut `layout=`. Argument se kontroluje jako první.

## Reference k `UNSUPPORTED_FEATURE` {#unsupported-feature-reference}

Každá níže uvedená hodnota atributu způsobí, že rozvržení vyhodí `RenderError`
s kódem `UNSUPPORTED_FEATURE` tam, kde by nativní Graphviz spustil algoritmus,
který dot-engine neportoval. Alternativou by bylo vykreslit rozvržení, které se
od Graphviz liší, aniž by to bylo řečeno. Kontrola se spustí jen tehdy, když
platí podmínka ve sloupci „Spustí se, když“; stejný atribut jinde se vykreslí
normálně. Chybě se vyhnete odstraněním atributu nebo jeho změnou na
podporovanou hodnotu.

| Modul | Atribut a hodnota | Spustí se, když | Potřebná funkce Graphviz |
|-------|-------------------|-----------------|--------------------------|
| neato | `mode=hier` | Vždy (poté, co graf má 2+ uzlů a `maxiter` není záporné) | Hierarchická majorizace stresu (`stress_majorization_with_hierarchy`) |
| neato | `mode=ipsep` | Pouze když by Graphviz sestavil omezení: `diredgeconstraints` je pravdivé nebo `hier*`, `overlap=ipsep`, nebo graf má cluster nejvyšší úrovně. Bez omezení běží jako majorizace stresu, stejně jako v Graphviz | Omezená majorizace (`stress_majorization_cola`) |
| neato | `start=self` | `mode` je `major` (výchozí) nebo `ipsep` | Chytrá inicializace (`smart_ini`). Pod `mode=KK` nebo `mode=sgd` jednou za vykreslení zaloguje `start=0 not supported with mode=self - ignored`, stejně jako Graphviz |
| neato | `model=subset` | `mode` je `major` nebo `KK` | Model vzdáleností subset |
| neato | `model=circuit` | `mode` je `major`, nebo `KK` na souvislém grafu. `KK` na nesouvislém grafu bez `pack` nebo `packmode` zaloguje varování a použije nejkratší cesty, stejně jako Graphviz | Model vzdáleností circuit (`circuit_model`) |
| neato, twopi, circo, sfdp | `overlap=voronoi` (bez ohledu na velikost písmen) | Graf (u twopi komponenta; u sfdp celý graf nebo komponenta) má 2+ uzlů a vlastní počet překryvů Graphviz (`countOverlap`, který testuje mnohoúhelníky uzlů) je nad 0. Uzly, které se dotýkají jen ohraničujícími rámečky, jej nespustí. circo se k němu dostane jen u grafu s jedinou komponentou (u více komponent Graphviz `overlap` také ignoruje). sfdp se k němu dostane jen tehdy, když `overlap` není režim prism | Odstranění překryvů pomocí Voronoiova diagramu (`vAdjust`) |
| fdp | `overlap=` jedna z hodnot `voronoi`, `oscale`, `vpsc`, `ipsep`, `ortho`, `ortho_yx`, `orthoxy`, `orthoyx`, `portho`, `portho_yx`, `porthoxy`, `porthoyx` | Režim je dosažen po `N:` pokusech silových iterací, tedy když tyto pokusy neodstraní všechny překryvy (nebo je `N` nula či chybí). Předpona `N:` je povolena, například `3:voronoi` | Odpovídající algoritmus úpravy `removeOverlapWith` |
| fdp | `splines=compound` | Vždy, s clustery i bez nich | Vedení hran vyhýbající se clusterům (`compoundEdges`) |
| sfdp | `smoothing=` cokoli kromě `none` nebo `0` | Vždy | `post_process_smoothing` |
| sfdp | `rotation=` libovolné nenulové číslo | Vždy | `rotate()` před odstraněním překryvů |
| sfdp | `label_scheme=1` až `4` | Existuje uzel s názvem `|edgelabel|...`, `overlap` se vyhodnotí na režim `prism` a buď je schéma 3 nebo 4, nebo je schéma 1 nebo 2 a počet pokusů prism je nad 0 (`overlap=prism` s číslem, ne výchozí `prism0`). Hodnoty nad 4 se počítají jako 0. Běžné popisky hran jej nikdy nespustí | Zpracování uzlů popisků hran (`edge_labeling_scheme`) |
| sfdp | `quadtree=none` (také `0`, `false`) | Libovolný graf s alespoň jedním uzlem. Zpráva uvádí vyhodnocené schéma | `spring_electrical_embedding_slow` |
| sfdp | `quadtree=fast` (také `2`) | Libovolný graf s alespoň jedním uzlem. Zpráva uvádí vyhodnocené schéma | `spring_electrical_embedding_fast` |
| všechny moduly | Tvar uzlu kreslený zvláštním případem `round_corners`, který není portován | Uzel tento tvar používá. Zpráva: `special shape N not yet ported` | Kreslicí větev `round_corners` pro daný tvar. Jde o interní pojistku proti číslu tvaru bez kreslicího případu; není znám žádný pojmenovaný tvar, který by se k ní dostal |

Většina zpráv má tvar `<atribut>=<hodnota>: <co> is not supported yet`.
Výjimkou jsou `smoothing` a `rotation` (které uvádějí chybějící rutinu),
řádky fdp a řádek s tvarem, které používají výše uvedená znění. Větvěte podle
`err.code === 'UNSUPPORTED_FEATURE'`, ne podle textu.

Hodnoty, které volí výchozí variantu (například `quadtree=normal`, `true`,
`yes`, `1`), a hodnoty přijímané Graphviz, které jsou portovány (například
`start=regular`, `start=random`, `model=mds`, `mode=KK`, `mode=sgd`,
`overlap=prism`, rodina `scale` a u neato, twopi, circo a sfdp
`overlap=oscale`, `vpsc` a režimy `ortho*` / `portho*`), se vykreslí normálně.

## Reference po jednotlivých funkcích

„Použití“ znamená `TypeError` s `ERR_INVALID_ARG_TYPE`, pokud řádek neuvádí jiný
kód.

| Funkce | Může vyhodit |
|--------|--------------|
| `renderSvg(dotSource, engine)` | Použití (`dotSource` nebo `engine` není řetězec); `TypeError` `ERR_INVALID_ARG_VALUE` (modul není registrován); `ParseError`; `RenderError`; `InternalError` |
| `tryRenderSvg(dotSource, engine)` | Použití (`dotSource` nebo `engine` není řetězec); `TypeError` `ERR_INVALID_ARG_VALUE` (modul není registrován). Nic dalšího: každé selhání vstupu DOT se vrací v `errors` |
| `parse(dotSource)` | `TypeError` `ERR_INVALID_ARG_TYPE` (`dotSource` není řetězec); `ParseError` |
| `render(g, format, opts?)` | Použití (`g`, `format` nebo `opts` má špatný typ); `TypeError` `ERR_INVALID_ARG_VALUE` (modul nebo formát není registrován); `RenderError`; `InternalError` |
| `getDrawOps(g, opts?)` | Použití (`g` nebo `opts` má špatný typ); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.engine` není registrován); `RenderError`; `ParseError` (průběžný xdot nebylo možné znovu zpracovat: chyba v dot-engine); `InternalError` |
| `createGraph(opts?)` a metody builderu (`addNode`, `addEdge`, `addSubgraph`, `setAttr`, ...) | Použití (špatné typy argumentů, včetně hodnot atributů, které nejsou řetězce); `InternalError` (model grafu nedokázal vytvořit uzel nebo podgraf) |
| `addEdge(g, tail, head, name?)` (z `/api`) | Použití (`g`, `tail` nebo `head` není objekt; `name` není řetězec) |
| `getLayout(g, opts?)` | Použití (`g` nebo `opts` není objekt); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.yAxis` není `'up'` ani `'down'`); `Error` `ERR_INVALID_STATE` (graf nebyl rozvržen) |
| `new GvcContext(measurer, options?)` | Použití (`measurer` nemá funkci `measure`; `options` není objekt) |
| `ctx.register(plugin)` | Použití (není plugin vykreslovače ani modul rozvržení) |
| `ctx.layout(g, engine)` | Použití (`g` není objekt, `engine` není řetězec); `TypeError` `ERR_INVALID_ARG_VALUE` (modul není registrován); `RenderError` `UNKNOWN_LAYOUT`. Selhání modulu se propagují neobalená |
| `ctx.freeLayout(g, engine)` | Použití; `TypeError` `ERR_INVALID_ARG_VALUE` (modul není registrován). Selhání modulu se propagují neobalená |
| `ctx.bestRenderer(format)` | Použití (`format` není řetězec); `TypeError` `ERR_INVALID_ARG_VALUE` (pro `format` neexistuje vykreslovač) |
| `renderWithContext(ctx, g, format, inlineImages?)` | Použití (`ctx` není `GvcContext`, `g` není objekt, `format` není řetězec); `TypeError` `ERR_INVALID_ARG_VALUE` (pro `format` neexistuje vykreslovač). Selhání vykreslení se propagují neobalená |
| `setImageSizer(sizer)` | Použití (není funkce ani `null`) |
| `setImageResolver(fn)` | Použití (není funkce ani `null`) |
| `setTextMeasurer(measurer)` | Použití (není `TextMeasurer` ani `undefined`) |

### Které funkce obalují cizí throw

| Funkce | Chování při neočekávaném throw (nepocházejícím z dot-engine) |
|--------|--------------------------------------------------------------|
| `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps` | Obaleno jako `InternalError`; `cause` je původní chyba |
| `renderWithContext` a každá metoda `GvcContext` | **Neobaleno.** Chyba modulu se k volajícímu dostane jako cokoli, co modul vyhodil, například prosté `TypeError` bez `code` |

Pokud používáte `GvcContext` přímo, považujte chybu, která není ani
`DotEngineError`, ani chybou použití, za chybu v dot-engine.

## `tryRenderSvg` nebo `renderSvg`

| | `renderSvg` | `tryRenderSvg` |
|---|-------------|----------------|
| Chybné DOT nebo selhání rozvržení | Vyhodí `DotEngineError` | Vrátí `{ errors: [one] }` |
| Špatné argumenty | Vyhodí chybu použití | Vyhodí chybu použití |
| Hodnota chyby | `Error` se zásobníkem volání a `cause` | Prostá data: `type`, `code`, `message`, `friendlyMessage`, plus `location` / `expected`, pokud jsou k dispozici |
| Použijte, když | Selhání má volajícího přerušit | Větvíte podle `code`, nebo chybu posíláte přes `postMessage` či do logu |

`tryRenderSvg` nikdy nevyhodí výjimku kvůli žádnému vstupu DOT. Vyhodí ji jen
tehdy, když jsou neplatné samotné argumenty, což je chyba ve volajícím kódu.
Vracené objekty chyb nenesou žádné `cause` ani zásobník volání.

## Obalená selhání a `cause`

Když `renderSvg`, `render` nebo `getDrawOps` zachytí chybu, kterou dot-engine
nevyvolal, vyhodí `InternalError`, jehož `cause` je původní chyba. `message` je
původní zpráva.

`cause` není vyčíslitelné (non-enumerable), takže ho `JSON.stringify(err)`
vynechá. Při logování procházejte řetězec explicitně (viz poslední příklad
níže).

## Kontroly napříč balíčky (bundle)

`instanceof DotEngineError` funguje v rámci jedné kopie knihovny. Pokud se může
načíst více kopií (duplicitní balíčky, hostitel pluginů), použijte
`isGvError(e)`. Kontroluje řetězcové `type` a `code` a funguje napříč kopiemi.
Přijímá také prosté objekty, které vrací `tryRenderSvg`.

## Příklady

Oddělení obou rodin:

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

Zpracování výsledku `tryRenderSvg`:

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

Zalogování `InternalError` s jeho příčinou:

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

## Viz také

- [Reference API (výběr)](/cs/guide/api) pro signaturu každé funkce.
- [Typy](/cs/guide/types) pro tvary `GvError` a `RenderResult`.
- [Generované API (TypeDoc)](/reference/) pro úplná sjednocení `GvErrorCode` a `UsageErrorCode`.
