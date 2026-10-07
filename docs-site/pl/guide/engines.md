---
sourceHash: 616f97a2fa8ffcabcf858e44e35372f1ed973566855990ca52be0169f39c9cb1
---
# Silniki układu

Zarejestrowano wszystkie osiem silników układu Graphviz. Przekaż nazwę silnika jako
drugi argument do `renderSvg`:

```ts
renderSvg(dot, 'neato');
```

| Silnik       | Styl układu                                   |
|--------------|-----------------------------------------------|
| `dot`        | Hierarchiczne / warstwowe grafy skierowane    |
| `neato`      | Model sprężynowy (Kamada–Kawai)               |
| `fdp`        | Oparty na siłach                              |
| `sfdp`       | Wieloskalowy, oparty na siłach (duże grafy)   |
| `circo`      | Kołowy                                        |
| `twopi`      | Promienisty                                   |
| `osage`      | Klastrowy                                     |
| `patchwork`  | Squarified treemap                            |

## Uwaga o wierności

Silniki dzielą się na dwie klasy zgodności (dokładną definicję i kod porównania
znajdziesz w [Zgodność](/pl/conformance)):

- **Deterministyczne** — `dot`, `circo`, `twopi`, `osage`, `patchwork`. Obowiązuje je
  ta sama poprzeczka **±0,01**: współrzędne numeryczne i ścieżki zgadzają się z natywną
  binarką w C w granicach ±0,01 pt, a cała treść nienumeryczna (znaczniki, kolory,
  tekst) jest dokładnie równa na korpusie golden.
- **Iteracyjne** — `neato`, `fdp`, `sfdp`. Solwery oparte na siłach / wieloskalowe,
  zależne od kolejności zaokrągleń liczb zmiennoprzecinkowych, więc sprawdza się je
  w luźniejszej granicy **±0,5** pt oraz pod kątem zgodności strukturalnej (to samo
  drzewo elementów), a nie ścisłej równości numerycznej.

Żadna z tych poprzeczek nie jest deklaracją identyczności wyjściowego SVG co do bajta.
Aktualne liczby zaliczonych przypadków i zaakceptowane rozbieżności dla każdego silnika
znajdziesz w [Parytet](/parity) (ze stronami szczegółowymi dla poszczególnych silników)
i [Znane rozbieżności](/pl/divergences).

## Wypróbuj różne silniki

Przełącz silnik na liście rozwijanej „Silnik układu”, aby porównać układy tego samego grafu:

<Playground
  height="380px"
  :initial="`graph {\n  a -- b; a -- c; a -- d;\n  b -- c; c -- d; d -- b;\n  b -- e; c -- f;\n}`"
  engine="neato"
/>
