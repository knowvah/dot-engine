---
sourceHash: 5733693facb69db8bab3b6997342fc5a9281465757bc64ca4fea3ebec54ebeeb
---

# Migracja z innych bibliotek JS dla Graphviz

viz.js / `@viz-js/viz`, `@hpcc-js/wasm` (`@hpcc-js/wasm-graphviz`) oraz
`d3-graphviz` udostępniają JavaScriptowi Graphviz, kompilując prawdziwy
Graphviz napisany w C do **WebAssembly** i wywołując go. @knowvah/dot-engine to
napisany od zera **port do TypeScriptu** — silniki układu, parser i emiter SVG
to kod źródłowy w TypeScripcie, a nie skompilowana binarka.

Ta różnica jest sednem, a nie przypisem:

| | Opakowania WASM (viz.js / `@hpcc-js/wasm` / d3-graphviz) | @knowvah/dot-engine |
|---|---|---|
| Implementacja | Prawdziwy Graphviz w C, skompilowany do binarki `.wasm` | Czysty port w TypeScripcie, bez skompilowanego artefaktu |
| Inicjalizacja modułu | Asynchroniczna — przed pierwszym użyciem trzeba zainstancjonować moduł WASM i poczekać na niego | Brak — `import` i wywołanie synchroniczne |
| Paczka | Plik `.wasm` (od setek KB do niskich MB) obok JS | Tylko JS, z tree-shakingiem |
| Debugowanie | Krokowanie przez blob WASM (albo przez kod C, jeśli go masz) | Krokowanie przez prawdziwy TypeScript z mapami źródeł |
| Model wątków | Niektóre wersje uruchamiają układ w Web Workerze | Działa w wątku wywołującego, jak każda funkcja TS |
| Formaty wyjściowe | Wszystko, z czym skompilowano bazową wersję C — zwykle pełny zestaw Graphviza, w tym raster/PDF | SVG + formaty tekstowe DOT/json/xdot/plain/imagemap — zobacz niżej |

Jeśli Twój przypadek użycia to „wywołaj funkcję, dostań SVG, bez
asynchronicznej ceremonii i bez pliku WASM do hostowania” — do tego służy
@knowvah/dot-engine. Jeśli Twój przypadek zależy od wyjścia rastrowego lub PDF,
zobacz niżej [Kiedy zostać przy WASM](#when-to-stay-on-wasm).

## Różnice w API

Trzy biblioteki mają różne kształty; poniższa tabela przedstawia typowy
przypadek migracji (w przybliżeniu — sprawdź w dokumentacji każdej biblioteki;
zobacz przypisy pod tabelą).

| Biblioteka | Typowe wywołanie | Odpowiednik w @knowvah/dot-engine |
|---|---|---|
| `@viz-js/viz` (następca viz.js) | `Viz.instance().then(viz => viz.renderSVGElement(dot))` — asynchroniczne, `Viz.instance()` zwraca Promise | `renderSvg(dot, 'dot')` — synchroniczne, bez kroku instancji/inicjalizacji |
| viz.js 2.x (stare, `new Viz()`) | `new Viz().renderString(dot)` — zwraca `Promise<string>` | `renderSvg(dot, 'dot')` — synchroniczne |
| `@hpcc-js/wasm-graphviz` | jednorazowo `await Graphviz.load()`, potem `graphviz.dot(dot)` (po załadowaniu synchronicznie) | `renderSvg(dot, engine)` — w ogóle bez kroku ładowania/rozgrzewki |
| `d3-graphviz` | `d3.select(sel).graphviz().renderDot(dot)` — wiąże wyjście z DOM, animuje przejścia | `renderSvg(dot, engine)` zwraca **łańcuch** SVG; wstawiasz go do DOM samodzielnie (np. `el.innerHTML = svg`) |

Każde wywołanie @knowvah/dot-engine w prawej kolumnie jest **synchroniczne** —
nie ma modułu, na który trzeba czekać, bo nie ma binarki WASM do
zainstancjonowania. Usuń każde `await`/`.then()` otaczające wywołanie
@knowvah/dot-engine; nigdy nie było potrzebne.

- `Viz.instance()` → Promise oraz metoda `renderSVGElement()` z
  `@viz-js/viz` są udokumentowane na viz-js.com; potwierdzone opublikowanym
  przykładem użycia projektu w chwili pisania.
- `new Viz().renderString(dot)` z viz.js 2.x to API udokumentowane dla tej
  (zastąpionej już) linii wydań; jeśli masz aktualną instalację, sprawdź, czy
  faktycznie korzystasz z `@viz-js/viz`.
- Para `Graphviz.load()` / `graphviz.dot()` z `@hpcc-js/wasm-graphviz` jest
  potwierdzona opublikowanym przykładem użycia pakietu w chwili pisania.
  Osobny, starszy pakiet `@hpcc-js/wasm` udostępniał dodatkowo w dawnych
  wydaniach wywołanie `graphviz.layout(dot, format, engine)` — przed
  poleganiem na dokładnej sygnaturze sprawdź dokumentację zainstalowanej
  wersji.
- Łańcuch `.graphviz().renderDot(dot)` z `d3-graphviz` oraz to, że wewnętrznie
  opiera się on na `@hpcc-js/wasm`, są potwierdzone opublikowanym README
  projektu w chwili pisania.

### Wiązanie `renderDot` z DOM jest tu poza zakresem

`d3-graphviz` robi więcej niż renderowanie SVG: wiąże wynik z selekcją D3,
porównuje kolejne renderowania i animuje przejścia między układami.
@knowvah/dot-engine nie ma żadnego stanowiska wobec DOM —
`renderSvg`/`render` zwracają zwykły łańcuch. Jeśli chcesz animowanych przejść
między dwoma układami w stylu d3-graphviz, jest to logika, którą zbudujesz nad
dwoma wywołaniami `renderSvg` i własnym porównywaniem DOM (albo nadal
używaj d3-graphviz do tej konkretnej funkcji — zobacz niżej).

## Dane układu bez parsowania formatu tekstowego

Wszystkie trzy biblioteki WASM można poprosić o własne formaty JSON lub
tekstowe Graphviza, a następnie samodzielnie sparsować ten łańcuch, aby
uzyskać współrzędne węzłów i krawędzi. @knowvah/dot-engine pomija ten objazd
przez tekst: wywołaj `getLayout(g)` (po `render`), aby od razu dostać typowaną,
serializowalną do JSON migawkę — bez łańcucha `-Tjson`/`-Tplain` do
sparsowania.

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

render(b.graph, 'svg');
const layout = getLayout(b.graph);
// layout.nodes  → [{ name: 'a', x, y, width, height }, ...]
// layout.edges  → [{ tail: 'a', head: 'b', points: [...] }]
// layout.bounds → { x, y, width, height }
```

Pełny kształt migawki, jednostki i opcję `yAxis` opisuje
[Odczyt obliczonej geometrii](/pl/guide/geometry).

## Kiedy zostać przy WASM {#when-to-stay-on-wasm}

Bądź ze sobą szczery co do zakresu: @knowvah/dot-engine obsługuje SVG oraz
formaty tekstowe `dot`/`xdot`/`json`/`plain`/`plain-ext`/`imap`/`cmapx`.
**Nie** emituje formatów rastrowych (PNG/JPEG/GIF/...) ani
PostScript/PDF/EPS — to zamierzona granica zakresu, a nie luka, która jest po
prostu niedokończona. Dokładną listę rzeczy poza zakresem znajdziesz w
[Znane rozbieżności](/pl/divergences).

Jeśli Twoja aplikacja potrzebuje wyjścia `-Tpng` lub `-Tpdf` bezpośrednio z
silnika układu, biblioteki oparte na WASM nadal to zapewniają — ponieważ
uruchamiają prawdziwy Graphviz w C, obsługują wszystkie formaty wyjściowe, z
którymi skompilowano daną wersję. W takim scenariuszu albo nadal używaj
biblioteki WASM dla tej jednej ścieżki kodu, albo wyrenderuj do `'svg'` w
@knowvah/dot-engine i skonwertuj SVG do rastra/PDF dalej, osobnym narzędziem.

## Zobacz także

- [Silniki układu](/pl/guide/engines)
- [Renderowanie do innych formatów](/pl/guide/render-formats)
- [Odczyt obliczonej geometrii](/pl/guide/geometry)
- [Znane rozbieżności](/pl/divergences)
- [Pierwsze kroki](/pl/guide/getting-started)
