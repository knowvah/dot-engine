---
sourceHash: 66af4fa5a29e8468c7ecdd9bd541c9d7572b0a87dc81ab412cb63c543106fde8
---
# Słowniczek

Jedna definicja na termin, w porządku alfabetycznym według terminu angielskiego (kolejność
nagłówków jest taka sama jak w wersji angielskiej). Każda z nich odsyła do strony
przewodnika (lub do źródła), która omawia dany termin szczegółowo.

## Klaster

Podgraf, którego nazwa zaczyna się od `cluster` (np. `subgraph cluster_build`) —
Graphviz rysuje go jako osobne pudełko grupujące należące do niego węzły. Wewnętrznie
snapshot geometrii @knowvah/dot-engine nadaje każdemu podgrafowi klastra nazwę
pozycyjną, taką jak `cluster6` (`ClusterGeometry.name`), a nie nazwę ze źródła
DOT, więc konsument, który potrzebuje oryginalnej nazwy, buduje mapę `idByName` przed
układem, a potem ponownie nadaje klucze w `snapshot.clusters`. Wzorzec ponownego
nadawania kluczy znajdziesz w [Przepisach](/pl/guide/recipes), a tworzenie klastrów
przez `addSubgraph` — w [Budowanie grafu w kodzie](/pl/guide/build-a-graph).

## Zgodność

Mechanicznie sprawdzana właściwość stojąca za twierdzeniem, że wynik renderowania
@knowvah/dot-engine „zgadza się” z wyrocznią w C. Po sparsowaniu obu SVG do
znormalizowanych drzew elementów każda wartość numeryczna (współrzędne, dane ścieżek,
`points`) musi zgadzać się w stałej tolerancji — **±0,01 pt** dla silników
deterministycznych (`dot`, `circo`, `twopi`, `osage`, `patchwork`) i **±0,5 pt** dla
iteracyjnych silników opartych na siłach (`neato`, `fdp`, `sfdp`) — a każda wartość
nienumeryczna (znaczniki, kolory, tekst) musi być dokładnie równa. To nie jest
deklaracja identyczności SVG co do bajta. Zobacz [Zgodność](/pl/conformance).

## Układ współrzędnych / oś y

Natywny układ współrzędnych Graphviz ma oś **y w górę** i początek w lewym dolnym
rogu; przeglądarki i ekrany mają oś **y w dół** i początek w lewym górnym rogu.
`getLayout` domyślnie używa `yAxis: 'down'` (odwraca każde y i normalizuje
`bounds` do `(0, 0)`) i przyjmuje `yAxis: 'up'`, aby zwrócić natywne współrzędne
Graphviz bez zmian. Operacje rysowania xdot (z `getDrawOps`) zawsze są w natywnym
układzie z osią y w górę. Zobacz [Odczyt obliczonej geometrii](/pl/guide/geometry).

## Rozbieżność

Różnica między wynikiem renderowania @knowvah/dot-engine a wyrocznią, która została
zbadana, sprowadzona do przyczyny i skatalogowana — w odróżnieniu od po cichu
tolerowanej. Skatalogowane rozbieżności należą do jednej z trzech klas:
zaakceptowane delty (celowo niedopasowane, np. niedeterminizm liczb
zmiennoprzecinkowych między platformami), śledzony długi ogon, który wciąż jest
domykany, oraz jawne nie-cele. Różnica spoza listy jest traktowana jako defekt,
a nie zaakceptowane zachowanie. Zobacz [Znane rozbieżności](/pl/divergences).

## DOT

Język opisu grafów — `digraph { ... }` / `graph { ... }` z instrukcjami węzłów, krawędzi
i atrybutów — który @knowvah/dot-engine parsuje, zanim przekaże wynik silnikowi
układu. Zobacz [Pierwsze kroki](/pl/guide/getting-started).

## Miernik rozmiaru obrazu / resolver obrazu

Dwa wstrzykiwalne punkty rozszerzeń dla obrazów zewnętrznych (węzły usershape i komórki
`<IMG>` w etykietach HTML). `ImageSizer` zgłasza naturalną szerokość/wysokość obrazu,
dzięki czemu rozmiary węzłów i układ etykiet mogą być obliczone bez ładowania danych
pikseli; `ImageResolver` dostarcza właściwe bajty obrazu do osadzenia w czasie
renderowania. Zobacz [Obrazy](/pl/guide/images).

## Silnik układu

Jeden z ośmiu algorytmów układu rejestrowanych przez @knowvah/dot-engine, wybierany
po nazwie (`renderSvg(dot, engine)`): `dot` (hierarchiczny/warstwowy), `neato`
(model sprężynowy, Kamada–Kawai), `fdp` (oparty na siłach), `sfdp` (wieloskalowy,
oparty na siłach, dla dużych grafów), `circo` (kołowy), `twopi` (promienisty),
`osage` (klastrowy) i `patchwork` (squarified treemap). Zobacz
[Silniki układu](/pl/guide/engines).

## Wyrocznia

Natywna binarka `dot` Graphviz w C, zbudowana z kanonicznego źródła w C, z którą
porównywany jest każdy wynik renderowania @knowvah/dot-engine. @knowvah/dot-engine
uruchamia tę binarkę bezpośrednio (nigdy builda WASM), aby uniknąć rozjazdu ABI
między referencją a portem. Zobacz [Zgodność](/pl/conformance) i
[Parytet](/parity), aby dowiedzieć się, jak uruchamia się i raportuje porównania
z wyrocznią.

## Ranga / rankdir

W hierarchicznym układzie `dot` **ranga** (rank) to warstwa węzłów umieszczonych na tej
samej głębokości na rysunku. `rankdir` ustawia kierunek, w którym biegną rangi —
domyślnie `TB` (z góry na dół) albo `LR`, `BT`, `RL` — i jest ustawiany jako
atrybut grafu (`b.setAttr('rankdir', 'LR')`). Zobacz
[Budowanie grafu w kodzie](/pl/guide/build-a-graph).

## Spline / prowadzenie krawędzi

Zakrzywiona (Béziera) ścieżka, wzdłuż której rysowana jest krawędź, obliczona przez
kod prowadzący, który omija przeszkody w postaci węzłów i klastrów. @knowvah/dot-engine
udostępnia wyznaczone punkty kontrolne jako `EdgeGeometry.points` — uporządkowaną
tablicę punktów `{x, y}`, w punktach — przez `getLayout`. Zobacz
[Odczyt obliczonej geometrii](/pl/guide/geometry).

## Miernik tekstu

Wstrzykiwalny punkt rozszerzeń (`TextMeasurer`), który zgłasza szerokość/wysokość
etykiet, aby rozmiary węzłów i etykiet krawędzi mogły być obliczone przed układem.
@knowvah/dot-engine wybiera go automatycznie przy każdym renderowaniu — najpierw jawne
`setTextMeasurer`, potem `<canvas>` przeglądarki, jeśli jest dostępny, a następnie
wbudowany deterministyczny `EstimateTextMeasurer` w Node — albo akceptuje własną
implementację. Zobacz [Pomiar tekstu](/pl/guide/text-measurement).

## Usershape

Termin Graphviz na węzeł, którego kształtem jest zewnętrznie dostarczony obraz
(przez atrybut `image`), a nie narysowany wielokąt czy elipsa.
@knowvah/dot-engine rozwiązuje usershape'y przez wstrzykiwalny punkt rozszerzeń
image sizer / resolver, zamiast czytać pliki bezpośrednio, dzięki czemu biblioteka
pozostaje bezpieczna dla przeglądarki. Zobacz [Obrazy](/pl/guide/images).

## xdot

Rozszerzony format operacji rysowania DOT: ustrukturyzowany strumień operacji
(ustaw kolor wypełnienia/obrysu, ustaw czcionkę, wypełnij/obrysuj elipsę lub
wielokąt, narysuj krzywą Béziera, narysuj tekst) opisujący w kolejności malowania,
dokładnie jak należy namalować wyrenderowany graf. `getDrawOps` zwraca ten strumień
jako typowane wartości `XdotOp`, aby sterować własnym rendererem (canvas, WebGL,
PDF) bez parsowania SVG. Zobacz [Własne renderowanie z operacjami rysowania xdot](/pl/guide/xdot-drawops).
