---
sourceHash: 7638c760f4dc33297b8c499112956cda9094f2d9478dfb5e55ffa06926dea4fb
---

# Migracja z narzędzia wiersza poleceń `dot`

Binarki `dot`/`neato`/`fdp`/... napisane w C czytają plik `.dot` (lub stdin) i
zapisują wyrenderowany plik (lub stdout). @knowvah/dot-engine nie ma systemu
plików: przyjmuje **łańcuch** DOT i zwraca wyrenderowany **łańcuch** (albo, z
`getLayout`, zwykły obiekt geometrii JavaScript zamiast łańcucha do
sparsowania).

```bash
dot -Kneato -Tsvg input.dot -o output.svg
```

```ts
import { renderSvg } from '@knowvah/dot-engine';
import { readFileSync, writeFileSync } from 'node:fs';

const dot = readFileSync('input.dot', 'utf8');
const svg = renderSvg(dot, 'neato');
writeFileSync('output.svg', svg);
```

Powyższe odczyty i zapisy plików to Twój kod, a nie biblioteki —
@knowvah/dot-engine nigdy nie dotyka dysku. Dzięki temu działa bez zmian także
w karcie przeglądarki, w której nie ma żadnego `input.dot` do odczytania.

## `-K<engine>` — silnik układu

`-K` wybiera silnik układu; @knowvah/dot-engine przyjmuje tę samą nazwę jako
argument `engine` w `renderSvg` albo pole `opts.engine` w `render`. Przeniesiono
wszystkie osiem silników:

| Wartość `-K` | Łańcuch `engine` w @knowvah/dot-engine |
|---|---|
| `-Kdot` | `'dot'` (także wartość domyślna `render`, gdy pominięto `engine`) |
| `-Kneato` | `'neato'` |
| `-Kfdp` | `'fdp'` |
| `-Ksfdp` | `'sfdp'` |
| `-Kcirco` | `'circo'` |
| `-Ktwopi` | `'twopi'` |
| `-Kosage` | `'osage'` |
| `-Kpatchwork` | `'patchwork'` |

```ts
renderSvg(dot, 'neato');
render(g, 'svg', { engine: 'neato' });
```

Co robi każdy z nich i jaką ma klasę zgodności, opisuje strona
[Silniki układu](/pl/guide/engines).

## `-T<format>` — format wyjściowy

`renderSvg` obsługuje tylko SVG; do wszystkiego innego użyj
`render(g, format, opts?)`. Unia `OutputFormat` w @knowvah/dot-engine obejmuje
te cele `-T`:

| Wartość `-T` | Łańcuch `format` w @knowvah/dot-engine | Uwagi |
|---|---|---|
| `-Tsvg` | `'svg'` | także jedyne wyjście `renderSvg` |
| `-Tdot` | `'dot'` | źródło DOT z dodanymi atrybutami układu (`pos`, `bb`, ...) |
| `-Txdot` | `'xdot'` | DOT + instrukcje xdot `_draw_`/`_ldraw_` |
| `-Tjson` | `'json'` | pełny graf jako JSON |
| `-Tplain` | `'plain'` | geometria węzłów i krawędzi rozdzielona białymi znakami |
| `-Tplain-ext` | `'plain-ext'` | `plain`, plus współrzędne portów na krawędziach |
| `-Timap` | `'imap'` | mapa obrazu HTML po stronie serwera |
| `-Tcmapx` | `'cmapx'` | element HTML `<map>` po stronie klienta |

```ts
const svg = render(g, 'svg', { engine: 'dot' });
const json = render(g, 'json');
```

**Nieobsługiwane:** formaty rastrowe (`-Tpng`, `-Tjpg`, `-Tgif`, ...),
`-Tps`/`-Tpdf`/`-Teps` oraz backendy GUI/interaktywne. To zamierzona granica
zakresu — pełną listę rzeczy poza zakresem znajdziesz w
[Znane rozbieżności](/pl/divergences). Jeśli potrzebujesz rastra,
wyrenderuj do `'svg'` i skonwertuj dalej (przeglądarka headless, `resvg` lub
podobne narzędzie).

## `-Gname=val` / `-Nname=val` / `-Ename=val` — atrybuty

Globalne flagi atrybutów w CLI ustawiają wartość domyślną dla każdego
grafu/węzła/krawędzi z wiersza poleceń. @knowvah/dot-engine nie ma flag
wiersza poleceń — ustaw te same atrybuty bezpośrednio w źródle DOT albo przez
API konstruktora, jeśli budujesz graf w kodzie:

```bash
dot -Gsize=6,6 -Nshape=box -Ecolor=blue -Tsvg input.dot
```

```ts
// DOT source — put the defaults in a top-level attribute statement
const dot = `
  digraph {
    graph [size="6,6"];
    node  [shape=box];
    edge  [color=blue];
    a -> b;
  }
`;
const svg = renderSvg(dot, 'dot');
```

```ts
// Builder — set per-node/per-edge attrs where you create each one
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.setAttr('size', '6,6');
b.addNode('a', { shape: 'box' });
b.addNode('b', { shape: 'box' });
b.addEdge('a', 'b', { color: 'blue' });
const svg = render(b.graph, 'svg');
```

Pełne API konstruktora znajdziesz w
[Budowanie grafu w kodzie](/pl/guide/build-a-graph).

## Geometria, której CLI nie poda wprost

`-Tplain` istnieje właśnie po to, by skrypty mogły wyłuskiwać współrzędne
węzłów i krawędzi z wyjścia tekstowego. @knowvah/dot-engine pomija ten objazd:
wywołaj `getLayout(g)` po `render`, aby dostać typowaną, serializowalną do
JSON migawkę pozycji każdego węzła, splajnu każdej krawędzi i całego
prostokąta ograniczającego — bez formatu tekstowego do parsowania.

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

render(b.graph, 'svg');
const layout = getLayout(b.graph);
// layout.nodes[0] → { name: 'a', x, y, width, height }
```

Pełny kształt migawki oraz opcję `yAxis` (natywny Graphviz ma oś y w górę,
przeglądarki w dół) opisuje [Odczyt obliczonej geometrii](/pl/guide/geometry).

## Czcionki i obrazy: CLI czyta Twój system plików, @knowvah/dot-engine nie

Natywny `dot` mierzy tekst czcionkami zainstalowanymi na maszynie i
rozwiązuje atrybuty `image="..."`, czytając pliki względem bieżącego katalogu
roboczego. @knowvah/dot-engine nie ma dostępu do systemu plików, więc oba te
elementy wstrzykuje aplikacja hosta, zamiast czytać je z dysku:

- **Pomiar tekstu** — `setTextMeasurer` instaluje `TextMeasurer`; jeśli
  żadnego nie ustawisz, biblioteka sama dobiera rozsądną wartość domyślną
  (canvas przeglądarki albo deterministyczny model metryk w Node). Zobacz
  [Pomiar tekstu](/pl/guide/text-measurement).
- **Obrazy** — `setImageSizer` (oraz `setImageResolver` do osadzania inline)
  pozwalają samodzielnie dostarczyć wymiary własne obrazu i jego dane, ponieważ
  @knowvah/dot-engine nie może sprawdzić pliku w Twoim imieniu. Zobacz
  [Praca z obrazami](/pl/guide/images).

## Zobacz także

- [Silniki układu](/pl/guide/engines)
- [Renderowanie do innych formatów](/pl/guide/render-formats)
- [Odczyt obliczonej geometrii](/pl/guide/geometry)
- [Znane rozbieżności](/pl/divergences)
- [Pierwsze kroki](/pl/guide/getting-started)
