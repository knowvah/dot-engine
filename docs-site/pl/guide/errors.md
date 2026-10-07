---
sourceHash: 545227fb3a0a91494ed7a2c299e5a9ca93a594d68d99e0596f743e7597dfbae9
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Błędy i wyjątki

dot-engine rzuca dwa rodzaje błędów. To, który z nich złapiesz, mówi, kto
musi coś zmienić.

## Dwie rodziny, jedna zasada

| Rodzina | Jak ją rozpoznać | Znaczenie | Kto działa |
|--------|---------------------|---------|----------|
| Porażka dot-engine | `err instanceof DotEngineError` | dot-engine zawiódł na tym wejściu: błędny DOT, błąd krytyczny, który zgłosiłby też sam Graphviz, nieobsługiwana funkcja Graphviza albo błąd w dot-engine | Autor DOT albo zgłoszenie błędu |
| Błąd użycia | standardowy `TypeError` / `RangeError` / `Error` z `err.code` zaczynającym się od `ERR_` | Wywołanie było błędne: zły typ argumentu, nieznana nazwa silnika lub formatu, zła kolejność wywołań | Kod wywołujący |

Rozgałęziaj po `.code`, a nie po tekście komunikatu. Komunikaty mogą się zmieniać
między wydaniami; kody są stabilne.

Błędy użycia nie są `DotEngineError` i nie implementują `GvError`. Ich `name`
pozostaje `TypeError`, `RangeError` lub `Error`, tak jak w Node.js.

## Referencja klas

Wszystkie cztery poniższe klasy rozszerzają `DotEngineError` i implementują
kształt `GvError` (`type`, `code`, `message`, `friendlyMessage`, opcjonalne
`location` i `expected`).

### `DotEngineError` (abstrakcyjna)

Wspólna klasa bazowa. `instanceof DotEngineError` jest prawdziwe dla każdego
błędu, który dot-engine zgłasza w związku ze swoim wejściem. Nie można jej
skonstruować bezpośrednio. `type`, `code` i `friendlyMessage` są definiowane
przez podklasy.

### `ParseError`

| Element | Wartość |
|------|-------|
| Rzucany, gdy | Źródło DOT jest nieprawidłowe albo używa złego operatora krawędzi dla rodzaju grafu |
| `type` | `syntax` |
| Kody | `SYNTAX_ERROR`, `SYNTAX_UNEXPECTED_EOF`, `EDGE_OP_DIRECTED_IN_UNDIRECTED`, `EDGE_OP_UNDIRECTED_IN_DIRECTED`, `GENERIC_ERROR` |
| Pola | `location` (`{ line, column, offset? }`), `expected` (oczekiwania parsera; tylko `SYNTAX_*`), akcesory `line` i `column` |
| Działanie wywołującego | Popraw źródło DOT. Pokaż autorowi `location` i `friendlyMessage` |

`GENERIC_ERROR` w `ParseError` oznacza, że źródło jest zagnieżdżone tak głęboko,
że parserowi skończył się stos.

### `HtmlParseError`

| Element | Wartość |
|------|-------|
| Rzucany, gdy | Obecnie nigdy nie dociera do wywołującego (zobacz niżej) |
| `type` | `semantic` |
| Kody | `HTML_PARSE_ERROR` |
| Pola | `tag` (problematyczny token). Brak `location` i `expected` |
| Działanie wywołującego | Brak. Aby znaleźć złą etykietę, porównaj wyrenderowane wyjście z oczekiwanym |

Parser etykiet w stylu HTML rzuca `HtmlParseError` przy nieznanym elemencie,
źle sformułowanym atrybucie lub źle umieszczonym `<TABLE>`, `<HR>` albo `<VR>`.
Etap układu go przechwytuje i nie nadaje etykiecie żadnej treści, tak jak robi
to Graphviz: graf nadal się renderuje, z pustą etykietą. Żadna funkcja publiczna
go nie propaguje.

`HtmlParseError` nie jest eksportowany z korzenia pakietu. Gdyby kiedykolwiek
jednak do Ciebie dotarł, identyfikuje go
`err instanceof DotEngineError && err.code === 'HTML_PARSE_ERROR'`.

### `RenderError`

| Element | Wartość |
|------|-------|
| Rzucany, gdy | Układ lub renderowanie zawodzi w sposób, który zgłosiłby też sam Graphviz, graf wskazuje niedostępny silnik układu albo używa funkcji Graphviza, której dot-engine nie przeniósł |
| `type` | `render` dla `RENDER_ERROR`; `semantic` dla `UNKNOWN_LAYOUT` i `UNSUPPORTED_FEATURE` |
| Kody | `RENDER_ERROR`, `UNKNOWN_LAYOUT`, `UNSUPPORTED_FEATURE` |
| Pola | `cause`, gdy porażka opakowała inny błąd. Brak `location` |
| Działanie wywołującego | `RENDER_ERROR`: zmień graf. `UNKNOWN_LAYOUT`: popraw atrybut `layout=`. `UNSUPPORTED_FEATURE`: unikaj funkcji (na przykład sfdp z `rotation=45`; zobacz [tabelę](#unsupported-feature-reference)) |

### `InternalError`

| Element | Wartość |
|------|-------|
| Rzucany, gdy | Zawodzi asercja lub niezmiennik wewnątrz dot-engine albo błąd spoza dot-engine ucieka z potoku układu lub renderowania |
| `type` | `render` |
| Kody | `INTERNAL_ERROR` |
| Pola | `cause` (pierwotny błąd, gdy został opakowany) |
| Działanie wywołującego | Zgłoś błąd wraz ze źródłem DOT, które go wywołało |

Nic, co może zmienić autor DOT, nie pozwoli niezawodnie uniknąć `InternalError`.

## Referencja kodów

### `GvErrorCode`

| Kod | Klasa | `type` | Znaczenie | Typowa przyczyna | Działanie wywołującego | Zgłaszany przez |
|------|-------|--------|---------|---------------|---------------|-----------|
| `SYNTAX_ERROR` | `ParseError` | `syntax` | Nieoczekiwany token | Literówka, brakujące `;` lub `}` | Popraw DOT w `location` | `parse`, `renderSvg` |
| `SYNTAX_UNEXPECTED_EOF` | `ParseError` | `syntax` | Źródło urwane w połowie instrukcji | Niezamknięte `{`, `[` lub łańcuch | Popraw DOT w `location` | `parse`, `renderSvg` |
| `EDGE_OP_DIRECTED_IN_UNDIRECTED` | `ParseError` | `syntax` | `->` w grafie nieskierowanym | `graph { a -> b }` | Użyj `--` | `parse`, `renderSvg` |
| `EDGE_OP_UNDIRECTED_IN_DIRECTED` | `ParseError` | `syntax` | `--` w digrafie | `digraph { a -- b }` | Użyj `->` | `parse`, `renderSvg` |
| `GENERIC_ERROR` | `ParseError` | `syntax` | Źródło zagnieżdżone zbyt głęboko, by je sparsować | Patologicznie zagnieżdżone podgrafy | Spłaszcz DOT | `parse`, `renderSvg` |
| `HTML_PARSE_ERROR` | `HtmlParseError` | `semantic` | Źle sformułowana etykieta w stylu HTML | Nieznany element, zły atrybut | Brak: etykieta renderuje się jako pusta | Brak (przechwytywany wewnętrznie) |
| `RENDER_ERROR` | `RenderError` | `render` | Krytyczny błąd układu lub renderowania, który zgłosiłby też Graphviz | Źle sformułowane wejście dla etapu układu | Zmień graf | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNKNOWN_LAYOUT` | `RenderError` | `semantic` | Atrybut `layout=` grafu wskazuje silnik, który nie jest zarejestrowany | `layout="foo"` | Popraw atrybut | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNSUPPORTED_FEATURE` | `RenderError` | `semantic` | Graf żąda funkcji Graphviza, której dot-engine nie przeniósł | sfdp z `rotation=45` | Unikaj funkcji | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `INTERNAL_ERROR` | `InternalError` | `render` | Błąd w dot-engine | Nieudana asercja, obcy throw | Zgłoś błąd | `renderSvg`, `render`, `getDrawOps`, metody konstruktora, `GvcContext.layout` (nieopakowany) |

### `UsageErrorCode`

| Kod | Klasa | Znaczenie | Typowa przyczyna | Działanie wywołującego | Zgłaszany przez |
|------|-------|---------|---------------|---------------|-----------|
| `ERR_INVALID_ARG_TYPE` | `TypeError` | Zły typ, `null` albo brakujący wymagany argument | `renderSvg(undefined, 'dot')`, `getLayout(null)` | Popraw wywołanie | Każda funkcja publiczna przyjmująca argumenty |
| `ERR_INVALID_ARG_VALUE` | `TypeError` | Dobry typ, nieznana wartość | Niezarejestrowana nazwa silnika lub formatu; `getLayout(g, { yAxis: 'other' })` | Użyj zarejestrowanej nazwy lub dozwolonej wartości | `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps`, `getLayout`, `GvcContext.layout`, `freeLayout`, `bestRenderer`, `renderWithContext` |
| `ERR_OUT_OF_RANGE` | `RangeError` | Argument liczbowy poza zakresem | Zarezerwowany | Popraw wywołanie | Dziś nie zgłasza go żadna funkcja publiczna |
| `ERR_INVALID_STATE` | `Error` | Wywołanie w złym stanie | `getLayout` przed układem | Najpierw ułóż (`render(g, ...)` lub `ctx.layout`) | `getLayout` |

Niezarejestrowany argument silnika jest odrzucany nawet wtedy, gdy źródło DOT
ustawia poprawny atrybut `layout=`. Argument jest sprawdzany jako pierwszy.

## Referencja `UNSUPPORTED_FEATURE` {#unsupported-feature-reference}

Każda poniższa wartość atrybutu sprawia, że układ rzuca `RenderError` z kodem
`UNSUPPORTED_FEATURE` tam, gdzie natywny Graphviz uruchomiłby algorytm, którego
dot-engine nie przeniósł. Alternatywą było wyrenderowanie układu różniącego się
od Graphviza bez słowa o tym. Sprawdzenie uruchamia się tylko wtedy, gdy
spełniony jest warunek z kolumny „Uruchamia się, gdy”; ten sam atrybut gdzie
indziej renderuje się normalnie. Aby uniknąć błędu, usuń atrybut albo zmień go
na obsługiwaną wartość.

| Silnik | Atrybut i wartość | Uruchamia się, gdy | Potrzebna funkcja Graphviza |
|--------|--------------------|------------|-------------------------|
| neato | `mode=hier` | Zawsze (gdy graf ma 2+ węzłów, a `maxiter` nie jest ujemne) | Hierarchiczna majoryzacja naprężeń (`stress_majorization_with_hierarchy`) |
| neato | `mode=ipsep` | Tylko gdy Graphviz zbudowałby ograniczenia: `diredgeconstraints` ma wartość prawda lub `hier*`, `overlap=ipsep`, albo graf ma klaster najwyższego poziomu. Bez ograniczeń działa jako majoryzacja naprężeń, jak w Graphviz | Majoryzacja z ograniczeniami (`stress_majorization_cola`) |
| neato | `start=self` | `mode` ma wartość `major` (domyślną) lub `ipsep` | Inteligentna inicjalizacja (`smart_ini`). Przy `mode=KK` lub `mode=sgd` loguje `start=0 not supported with mode=self - ignored` raz na renderowanie, jak Graphviz |
| neato | `model=subset` | `mode` ma wartość `major` lub `KK` | Model odległości podzbiorowej |
| neato | `model=circuit` | `mode` ma wartość `major` albo `KK` na grafie spójnym. `KK` na grafie niespójnym bez `pack` ani `packmode` loguje ostrzeżenie i używa najkrótszych ścieżek, jak Graphviz | Model odległości obwodowej (`circuit_model`) |
| neato, twopi, circo, sfdp | `overlap=voronoi` (bez rozróżniania wielkości liter) | Graf (dla twopi składowa; dla sfdp cały graf lub składowa) ma 2+ węzłów, a własna liczba nakładań Graphviza (`countOverlap`, która testuje wielokąty węzłów) jest większa od 0. Węzły, które stykają się tylko prostokątami ograniczającymi, tego nie wywołują. circo dochodzi do tego tylko dla grafu jednoskładnikowego (przy wielu składowych Graphviz też ignoruje `overlap`). sfdp dochodzi do tego tylko wtedy, gdy `overlap` nie jest trybem prism | Usuwanie nakładań metodą Voronoia (`vAdjust`) |
| fdp | `overlap=` jedno z: `voronoi`, `oscale`, `vpsc`, `ipsep`, `ortho`, `ortho_yx`, `orthoxy`, `orthoyx`, `portho`, `portho_yx`, `porthoxy`, `porthoyx` | Tryb jest osiągany po próbach iteracji sił `N:`, czyli gdy te próby nie usuwają wszystkich nakładań (lub `N` wynosi 0 albo jest nieobecne). Prefiks `N:` jest dozwolony, na przykład `3:voronoi` | Odpowiadający algorytm korekty `removeOverlapWith` |
| fdp | `splines=compound` | Zawsze, z klastrami lub bez | Prowadzenie krawędzi omijające klastry (`compoundEdges`) |
| sfdp | `smoothing=` cokolwiek poza `none` lub `0` | Zawsze | `post_process_smoothing` |
| sfdp | `rotation=` dowolna liczba różna od zera | Zawsze | `rotate()` przed usuwaniem nakładań |
| sfdp | `label_scheme=1` do `4` | Istnieje węzeł o nazwie `|edgelabel|...`, `overlap` rozstrzyga się do trybu `prism`, a schemat ma wartość 3 lub 4 albo schemat ma wartość 1 lub 2, a próby prism są większe od 0 (`overlap=prism` z liczbą, nie domyślne `prism0`). Wartości powyżej 4 liczą się jako 0. Zwykłe etykiety krawędzi nigdy tego nie wywołują | Obsługa węzłów etykiet krawędzi (`edge_labeling_scheme`) |
| sfdp | `quadtree=none` (także `0`, `false`) | Dowolny graf z co najmniej jednym węzłem. Komunikat wymienia rozstrzygnięty schemat | `spring_electrical_embedding_slow` |
| sfdp | `quadtree=fast` (także `2`) | Dowolny graf z co najmniej jednym węzłem. Komunikat wymienia rozstrzygnięty schemat | `spring_electrical_embedding_fast` |
| wszystkie silniki | Kształt węzła rysowany przez specjalny przypadek `round_corners`, który nie został przeniesiony | Węzeł używa tego kształtu. Komunikat: `special shape N not yet ported` | Gałąź rysowania `round_corners` dla tego kształtu. To wewnętrzna osłona przed numerem kształtu bez przypadku rysowania; nie jest znany żaden nazwany kształt, który by do niej docierał |

Większość komunikatów ma postać `<attribute>=<value>: <what> is not supported yet`.
Wyjątki to `smoothing` i `rotation` (które nazywają brakującą procedurę),
wiersze fdp oraz wiersz o kształcie, które używają sformułowań podanych wyżej.
Rozgałęziaj po `err.code === 'UNSUPPORTED_FEATURE'`, a nie po tekście.

Wartości wybierające domyślne zachowanie (na przykład `quadtree=normal`,
`true`, `yes`, `1`) oraz akceptowane przez Graphviz wartości, które zostały
przeniesione (na przykład `start=regular`, `start=random`, `model=mds`,
`mode=KK`, `mode=sgd`, `overlap=prism`, rodzina `scale` oraz, w neato, twopi,
circo i sfdp, `overlap=oscale`, `vpsc` i tryby `ortho*` / `portho*`)
renderują się normalnie.

## Referencja dla poszczególnych funkcji

„Użycie” oznacza `TypeError` z `ERR_INVALID_ARG_TYPE`, chyba że wiersz wskazuje
inny kod.

| Funkcja | Może rzucić |
|----------|-----------|
| `renderSvg(dotSource, engine)` | Użycie (`dotSource` lub `engine` nie jest łańcuchem); `TypeError` `ERR_INVALID_ARG_VALUE` (silnik niezarejestrowany); `ParseError`; `RenderError`; `InternalError` |
| `tryRenderSvg(dotSource, engine)` | Użycie (`dotSource` lub `engine` nie jest łańcuchem); `TypeError` `ERR_INVALID_ARG_VALUE` (silnik niezarejestrowany). Nic więcej: każda porażka wejścia DOT jest zwracana w `errors` |
| `parse(dotSource)` | `TypeError` `ERR_INVALID_ARG_TYPE` (`dotSource` nie jest łańcuchem); `ParseError` |
| `render(g, format, opts?)` | Użycie (`g`, `format` lub `opts` złego typu); `TypeError` `ERR_INVALID_ARG_VALUE` (silnik lub format niezarejestrowany); `RenderError`; `InternalError` |
| `getDrawOps(g, opts?)` | Użycie (`g` lub `opts` złego typu); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.engine` niezarejestrowany); `RenderError`; `ParseError` (pośredniego xdot nie dało się ponownie sparsować: błąd w dot-engine); `InternalError` |
| `createGraph(opts?)` i metody konstruktora (`addNode`, `addEdge`, `addSubgraph`, `setAttr`, ...) | Użycie (złe typy argumentów, w tym wartości atrybutów, które nie są łańcuchami); `InternalError` (model grafu nie zdołał utworzyć węzła lub podgrafu) |
| `addEdge(g, tail, head, name?)` (z `/api`) | Użycie (`g`, `tail` lub `head` niebędące obiektem; `name` niebędące łańcuchem) |
| `getLayout(g, opts?)` | Użycie (`g` lub `opts` nie jest obiektem); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.yAxis` inne niż `'up'` lub `'down'`); `Error` `ERR_INVALID_STATE` (graf nie został ułożony) |
| `new GvcContext(measurer, options?)` | Użycie (`measurer` nie ma funkcji `measure`; `options` nie jest obiektem) |
| `ctx.register(plugin)` | Użycie (to nie jest wtyczka renderera ani silnik układu) |
| `ctx.layout(g, engine)` | Użycie (`g` nie jest obiektem, `engine` nie jest łańcuchem); `TypeError` `ERR_INVALID_ARG_VALUE` (silnik niezarejestrowany); `RenderError` `UNKNOWN_LAYOUT`. Porażki silnika propagują się nieopakowane |
| `ctx.freeLayout(g, engine)` | Użycie; `TypeError` `ERR_INVALID_ARG_VALUE` (silnik niezarejestrowany). Porażki silnika propagują się nieopakowane |
| `ctx.bestRenderer(format)` | Użycie (`format` nie jest łańcuchem); `TypeError` `ERR_INVALID_ARG_VALUE` (brak renderera dla `format`) |
| `renderWithContext(ctx, g, format, inlineImages?)` | Użycie (`ctx` nie jest `GvcContext`, `g` nie jest obiektem, `format` nie jest łańcuchem); `TypeError` `ERR_INVALID_ARG_VALUE` (brak renderera dla `format`). Porażki renderowania propagują się nieopakowane |
| `setImageSizer(sizer)` | Użycie (nie funkcja ani `null`) |
| `setImageResolver(fn)` | Użycie (nie funkcja ani `null`) |
| `setTextMeasurer(measurer)` | Użycie (nie `TextMeasurer` ani `undefined`) |

### Które funkcje opakowują obce rzucenia

| Funkcje | Zachowanie przy nieoczekiwanym rzuceniu (spoza dot-engine) |
|-----------|---------------------------------------------------|
| `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps` | Opakowywane jako `InternalError`; `cause` to pierwotny błąd |
| `renderWithContext` i każda metoda `GvcContext` | **Nie są opakowywane.** Błąd silnika dociera do wywołującego jako to, co silnik rzucił, na przykład zwykły `TypeError` bez `code` |

Jeśli używasz `GvcContext` bezpośrednio, traktuj błąd, który nie jest ani
`DotEngineError`, ani błędem użycia, jako błąd w dot-engine.

## `tryRenderSvg` czy `renderSvg`

| | `renderSvg` | `tryRenderSvg` |
|---|-------------|----------------|
| Zły DOT lub porażka układu | Rzuca `DotEngineError` | Zwraca `{ errors: [one] }` |
| Złe argumenty | Rzuca błąd użycia | Rzuca błąd użycia |
| Wartość błędu | `Error` ze stosem i `cause` | Zwykłe dane: `type`, `code`, `message`, `friendlyMessage`, plus `location` / `expected`, gdy występują |
| Użyj, gdy | Porażka ma przerwać wywołującego | Rozgałęziasz po `code` albo wysyłasz błąd przez `postMessage` lub do logu |

`tryRenderSvg` nigdy nie rzuca dla żadnego wejścia DOT. Rzuca tylko wtedy, gdy
same argumenty są nieprawidłowe, co jest błędem w kodzie wywołującym. Zwracane
przez nią obiekty błędów nie niosą `cause` ani śladu stosu.

## Opakowane porażki i `cause`

Gdy `renderSvg`, `render` lub `getDrawOps` przechwytuje błąd, którego dot-engine
nie zgłosił, rzuca `InternalError`, którego `cause` to pierwotny błąd. `message`
to pierwotny komunikat.

`cause` jest nieenumerowalne, więc `JSON.stringify(err)` je pomija. Przy
logowaniu przejdź łańcuch jawnie (zobacz ostatni przykład niżej).

## Sprawdzanie między paczkami

`instanceof DotEngineError` działa w obrębie jednej kopii biblioteki. Jeśli
można załadować dwie kopie (zduplikowane paczki, host wtyczek), użyj
`isGvError(e)`. Sprawdza ono, czy `type` i `code` są łańcuchami, i działa
między kopiami. Akceptuje też zwykłe obiekty zwracane przez `tryRenderSvg`.

## Przykłady

Rozdziel obie rodziny:

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

Obsłuż wynik `tryRenderSvg`:

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

Zaloguj `InternalError` wraz z jego przyczyną:

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

## Zobacz także

- [Referencja API (wybór)](/pl/guide/api) — sygnatura każdej funkcji.
- [Typy](/pl/guide/types) — kształty `GvError` i `RenderResult`.
- [Wygenerowane API (TypeDoc)](/reference/) — pełne unie `GvErrorCode` i `UsageErrorCode`.
