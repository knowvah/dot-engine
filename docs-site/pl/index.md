---
sourceHash: 33fa90104a012c6ce9d15de21f32270498520e3d281601ddae71c0a48280eee4
layout: home
hero:
  name: "@knowvah/dot-engine"
  text: Graphviz w czystym TypeScripcie
  tagline: DOT na wejściu, SVG na wyjściu — bez C. Bez natywnej binarki Graphviz, bez WASM. Czysty TypeScript, działa w przeglądarce.
  actions:
    - theme: brand
      text: Pierwsze kroki
      link: /pl/guide/getting-started
    - theme: alt
      text: Otwórz plac zabaw
      link: /pl/playground
    - theme: alt
      text: Zobacz na GitHubie
      link: https://github.com/knowvah/dot-engine
features:
  - title: Wierny Graphviz w C
    details: Port kanonicznej implementacji w C, linia po linii. Silnik dot zgadza się z natywną binarką w wąskiej, deterministycznej tolerancji (±0,01 dla współrzędnych, dokładna zgodność treści nienumerycznej) na korpusie golden.
  - title: Natywny dla przeglądarki, zero zależności uruchomieniowych
    details: Bez C — bez natywnej binarki Graphviz, bez portu WASM, bez serwera renderującego. Sam silnik układu jest napisany w TypeScripcie — spakuj go i wdróż.
  - title: Wszystkie osiem silników układu
    details: dot, neato, fdp, sfdp, circo, twopi, osage i patchwork — renderowane do SVG.
  - title: Programowy układ i geometria
    details: Nie tylko renderuj — odczytaj obliczone pozycje węzłów, spline'y krawędzi i granice klastrów jako zwykły, serializowalny do JSON snapshot przez getLayout(), bez parsowania -Tplain.
---

## Wypróbuj

Edytor poniżej uruchamia prawdziwą bibliotekę w Twojej przeglądarce. Edytuj DOT
po lewej stronie; SVG aktualizuje się na żywo.

<Playground height="360px" />

## Wybierz swoją ścieżkę

Pierwszy raz tutaj? Wybierz drzwi, które pasują do tego, co robisz:

| Chcę… | Zacznij tutaj |
| --- | --- |
| Zrozumieć, jak elementy do siebie pasują | [Przegląd — model mentalny](/pl/guide/overview) |
| Zainstalować i wyrenderować mój pierwszy graf | [Pierwsze kroki](/pl/guide/getting-started) |
| Rozwiązać konkretne zadanie | [Książka przepisów](/pl/guide/recipes) |
| Sprawdzić funkcję lub typ | [Referencja API](/pl/guide/api) · [Typy](/pl/guide/types) |
| Poeksperymentować bez instalacji | [Plac zabaw](/pl/playground) |

Przychodzisz z innego narzędzia? Zobacz [Z narzędzia `dot` w C](/pl/guide/migrate-from-c-cli)
albo [Z bibliotek JS dla Graphviz](/pl/guide/migrate-from-js-libs).

Pełne, automatycznie generowane sygnatury znajdziesz w
[wygenerowanej referencji API](/reference/). Osadzasz wyrenderowane grafy na stronie?
Przeczytaj [Praca z obrazami](/pl/guide/images), aby poznać wstawianie obrazów inline i wskazówki dotyczące CSP.
