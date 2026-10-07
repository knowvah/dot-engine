---
sourceHash: 292491e2ebc9280dc60b10bc0e3f5bd75e3bf355f8e732d90f86b8fa35a07f40
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Znane rozbieżności względem C Graphviz {#known-divergences-from-c-graphviz}

@knowvah/dot-engine dąży do jak najwierniejszego odwzorowania kanonicznej
implementacji w C. Kod źródłowy w C jest specyfikacją; niewymieniona różnica
jest traktowana jako defekt, a nie zaakceptowane zachowanie.

> **Co tu znaczy „zgodny”.** Werdykt parytetu korpusu o nazwie `conformant`
> to **ciasna deterministyczna tolerancja**, *a nie* dosłowna równość SVG bajt po
> bajcie: współrzędne liczbowe i ścieżki muszą zgadzać się w granicach **±0.01**,
> a cała zawartość nieliczbowa (tagi, kolory, tekst) musi być dokładnie równa
> (`compareSvg(…, 'deterministic')`). W całym tym dokumencie „zgodność” i
> „conformant” odnoszą się do tego werdyktu tolerancji. Pełna definicja:
> [Zgodność](./conformance.md).

Tam, gdzie wynik *rzeczywiście* się różni, należy on do dokładnie jednej z trzech klas:

1. **Zaakceptowane różnice** — różnice, które zbadaliśmy, zrozumieliśmy do
   przyczyny źródłowej i **świadomie postanowiliśmy nie czynić zgodnymi**. Każda jest
   ograniczona, scharakteryzowana i uzasadniona poniżej. To nie są błędy i nie będą
   „naprawiane” bez konkretnego, osobno wyznaczonego powodu.
2. **Śledzony długi ogon** — znane luki, które *zostaną* zamknięte, każda z
   poprawką przypiętą do wyroczni. Są one prowadzone z bieżącymi liczbami w
   [`test/corpus/PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md).
3. **Cele wykluczone** — celowe granice zakresu (formaty i mechanizmy, których
   nigdy nie zamierzaliśmy odtwarzać).

Wiarygodnymi, stale aktualizowanymi zapisami są
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
(panel parytetu dla każdego wejścia vs. natywny `dot`) oraz
[`plans/port-catalog/README.md`](https://github.com/knowvah/dot-engine/blob/main/plans/port-catalog/README.md)
(inwentarz stanu portu na poziomie algorytmów).

**Maszynowo czytelnym** źródłem prawdy o tym, które grafy są *zaakceptowane* (klasa 1
poniżej), jest
[`test/corpus/accepted-divergences.json`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/accepted-divergences.json).
Narzędzia łączą go przy generowaniu raportu: `PARITY-dot.md` oddziela **zaakceptowane różnice** od
**śledzonego** zaległego zbioru, a bramka reguł pobiera z niego swoją listę dozwolonych. Poniższe
sekcje prozy objaśniają każdy wpis (A1 i A3 są aktywne; A2 jest zamknięte i
zachowane jako historia); test CI (`accepted-divergences.test.ts`) wymusza, aby
każdy zaakceptowany graf nadal się rozjeżdżał, więc ta lista nie może po cichu zgnić.

---

## Zaakceptowane różnice (świadomie nie czynimy ich zgodnymi) {#accepted-deltas-we-deliberately-do-not-make-conformant}

Akceptujemy różnicę — zamiast gonić za parytetem co do bajta — tylko wtedy, gdy **wszystkie**
poniższe warunki są spełnione:

- Przyczyną źródłową jest **ograniczenie przenośności** (coś, czego środowisko
  JavaScript/przeglądarki nie potrafi odtworzyć dokładnie), a nie błąd logiki w porcie.
- Różnica jest **niezauważalna** i dowodnie **ograniczona**.
- Poprawka miałaby **nieproporcjonalny koszt i zasięg oddziaływania** w stosunku do
  zysku (zazwyczaj: dotykałaby wspólnego prymitywu używanego przez setki
  grafów już zgodnych, ryzykując regresje dla zysku rzędu ułamka piksela).

Gdy akceptujemy różnicę, charakteryzujemy ją tutaj, aby odbiorcy nigdy nie byli zaskoczeni.
Grafy dotknięte zaakceptowaną różnicą są walidowane względem poprzeczki **strukturalnej /
tolerancyjnej**, a nie bajtowej.

### A1. Determinizm zmiennoprzecinkowy (silniki siłowe) {#a1-floating-point-determinism-force-directed-engines}

**Dotyczy:** `neato`, `fdp`, `sfdp`, `circo`, `twopi`, `osage` (silniki
iteracyjne, oparte na modelu sprężyn). *Układ* silnika `dot` **nie** jest dotknięty tym
determinizmem modeli iteracyjnych; osobna, wąsko ograniczona różnica
zmiennoprzecinkowa w prowadzeniu splajnów `dot` jest opisana w **A3** poniżej.

> **Zakres — historycznie niezmierzone zastrzeżenie, obecnie częściowo zmierzone.**
> **Główny przegląd SVG silnika dot** (`test/corpus/survey.ts`) nadal jest
> **tylko dla dot**: natywna wyrocznia działa pod `GVBINDIR=/tmp/ghl`, który
> linkuje symbolicznie **wyłącznie** wtyczki `core` + `dot_layout`
> (`test/corpus/gen-headless-gvbindir.sh` przechodzi dokładnie po `core dot_layout`
> — nie ma wtyczki układu `neato`/`fdp`/`circo`/`twopi`/`osage`/`sfdp`),
> a zarówno wyrocznia, jak i port są wywoływane z silnikiem `dot`. Dlatego identyfikatory korpusu
> takie jak `*_neato` / `*_circo` / `root_twopi` to *nazwy plików* układane
> przez `dot` w tym przeglądzie, a nie ich natywnym silnikiem, i A1 dopasowuje **zero**
> grafów — nie dlatego, że silniki są dowodnie zgodne, lecz dlatego, że
> ten konkretny przegląd nigdy ich nie uruchamia.
>
> **Ale wszystkie sześć silników A1 ma teraz własny przegląd natywnego silnika**, przez
> `test/corpus/engine-walk.ts` + `parity-report.ts` (niezależny od `GVBINDIR` —
> każdy uruchamia bezpośrednio `dot -K <engine> -Txdot`), na dwóch różnych
> poziomach rygoru opisanych osobno poniżej: `circo`/`twopi`/`osage` działają z tą samą
> **deterministyczną tolerancją ±0.01** co przegląd dot, z analizą przyczyn źródłowych dla każdego id
> („Akceptacja ścieżki silnika” poniżej); `neato`/`fdp`/`sfdp` działają z luźniejszą
> **tolerancją charakteryzacji ±0.5**, jeszcze bez analizy poszczególnych id
> („Charakteryzacja silników iteracyjnych” poniżej). Aktualne liczby dla wszystkich silników:
> [`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md).

**Charakteryzacja.** Te silniki uruchamiają iteracyjne układy numeryczne, których wyniki
zależą od zaokrągleń zmiennoprzecinkowych — konkretnie od mnożenia z dodawaniem w jednej operacji (FMA) i
`Math.pow`, które mogą się różnić między silnikami JavaScript i architekturami procesorów. Port
odtwarza kolejność operacji z C tam, gdzie to możliwe (`src/common/fma.ts`,
`src/common/arm-pow.ts`) — np. `sfdp` zgadza się do ~6 cyfr znaczących z
natywną wyrocznią przy dopasowanym PRNG i `fma` — ale dokładne, identyczne współrzędne
**nie są gwarantowane między platformami**. Topologia jest zachowana; potencjalna
rozbieżność dotyczy drobnych współrzędnych węzłów.

**Dlaczego zaakceptowane.** To twarde ograniczenie działania w JS, a nie wybór projektowy
— z tej samej rodziny co wrażliwość A3 na `hypot` z Apple. Nie da się zagwarantować
identycznych co do bitu wyników funkcji przestępnych/FMA we wszystkich docelowych środowiskach,
więc poprzeczka bajtowa byłaby niemożliwa do przetestowania, a nie tylko droga. **Ocena A1** (w odróżnieniu od
samego zastrzeżenia) wymagała osobnej ścieżki parytetu natywnych silników — zbudowanej
2026-07-11 jako `test/corpus/engine-walk.ts` + `parity-report.ts`, badającej każde
wejście pod jego własnym silnikiem zamiast `dot`. Uczciwy pułap tej pracy to
**zawężenie** A1 do „braku aktywnej rozbieżności na platformie referencyjnej”, nigdy
wyeliminowanie zastrzeżenia o różnicach między platformami; dotychczasowe wyniki (poniżej) mieszczą się w tym
pułapie: `circo`/`twopi`/`osage` ujawniły i rozłożyły na przyczyny źródłowe garstkę
prawdziwych przypadków A1/A9, a `neato`/`fdp`/`sfdp` mieszczą się obecnie na poziomie 90.8/77.5/68.0%
w granicach 0.5pt od natywnego na zbiorze 910 pozycji, co oznacza, że przeportowana
arytmetyka (`fma.ts`, `arm-pow.ts`, dopasowany PRNG) działa dla większości grafów —
a każdy pozostały rozbieżny id jest indywidualnie przypisany przez wstrzyknięcie (dryf
solvera vs. defekt portu), zamiast zostać nieprzeanalizowanym dryfem; zob.
charakteryzację silników iteracyjnych poniżej.

**Akceptacja ścieżki silnika: rodzina strzałek twopi.** <a id="a1-twopi-arrows-family"></a>
Powyższy cytat opisuje przegląd SVG silnika dot, w którym A1 dopasowuje zero
grafów; osobna **ścieżka silnika xdot** dla `twopi` (`parity-twopi.json`, natywna
wyrocznia `dot -K twopi -Txdot`, `test/corpus/engine-walk.ts`) *działa* pod swoim
natywnym silnikiem i ujawnia konkretny, zweryfikowany przypadek A1 na 9 identyfikatorach korpusu:
`graphs-arrows`, `graphs-newarrows`, `graphs-arrowsize`, `linux.x86-arrows_dot`,
`macosx-arrows_dot`, `nshare-arrows_dot`, `share-newarrows`, `windows-newarrows`
oraz (dodany 2026-07-28, nowy w zbiorze 905 pozycji) siostrzany z directed/
`tree-graphs-directed-oldarrows` — każdy rozjeżdża się na jednej dominującej krawędzi
(`Z->I` lub `i->Z`; 12–64 różnic operacji rysowania). Wstrzyknięcie A/B (dziennik decyzji, wpis z 2026-07-10 „injection A/B verdicts:
twopi arrows family EXONERATED...”) dowiodło mechanizmu bezpośrednio:
zrzucenie `ND_pos` na wejściu natywnego `spline_edges` i wstrzyknięcie go do
`splineEdgesShifted` w porcie daje **w pełni zgodny** wynik dla
`graphs-arrows` (`Z->I` staje się identyczna co do bajta z wyrocznią, ten sam
7/14-punktowy splajn) — zatem rozbieżność to w 100% dryf pozycji węzłów sprzed prowadzenia krawędzi, pochodzący z solvera usuwania nakładania PRISM
w `twopi`, a prowadzenie splajnów i emisja w porcie są oczyszczone z zarzutów. Widocznym objawem w 6 z 8 identyfikatorów jest
przeskok liczby punktów béziera (`unfilled_bezier[ptCount]: 8 vs 14`): dopasowana przez `Proutespline`
liczba odcinków jest wrażliwa na to, po której stronie granicy przeszkody
ląduje zdryfowana pozycja węzła, więc różnica pozycji poniżej ULP za iteracyjnym
rozwiązaniem PRISM przerzuca liczbę segmentów dopasowanego splajnu (pozostałe 2 id,
`graphs-arrowsize`/`nshare-arrows_dot`, pokazują ten sam dryf jako mniejszą różnicę
samej pozycji bez przeskoku liczby odcinków). Zaakceptowane na poziomie ścieżki silnika
przez `test/corpus/accepted-divergences-engines.json`, dołączane do
`PARITY-twopi.md` przez `parity-report.ts` — to samo złączenie, które `accepted.ts` wykonuje
dla `PARITY-dot.md` ścieżki dot.

Analiza przyczyn `oldarrows` (2026-07-28) wskazała dokładne miejsce przeskoku
objawu liczby punktów w tej rodzinie. Jej wachlarz `i`–`Z`–`I` jest współliniowy na średnicy pierścienia, a
`intersect()` w pathplan `directVis` blokuje linię widzenia, gdy wierzchołek
przeszkody leży „na” odcinku — gdzie tolerancja współliniowości 1e-4 w `wind()`
sprawia, że nawet węzeł odległy o 270pt od odcinka liczy się jako współliniowy, a
`inBetween()` (które zakłada współliniowość) degeneruje się wtedy do sprawdzania wyłącznie
**rzutu na x**: wierzchołek blokuje wtedy i tylko wtedy, gdy jego x leży ściśle wewnątrz
przedziału o szerokości ULP między współrzędnymi x obu końców. To, która z dwóch
lustrzanych krawędzi promienistych się wygina, zależy więc od kolejności ostatniego ULP
trzech nominalnie równych wartości x z rozwiązania PRISM — C wygina `Z->I`
(wierzchołek osi węzła `i` ląduje wewnątrz jego przedziału), port wygina `i->Z`
(wierzchołek węzła `I` ląduje wewnątrz własnego). Odtworzenie `directVis` offline na
zrzuconym zbiorze przeszkód każdej strony reprodukuje dokładnie decyzję każdej strony,
a wstrzyknięcie przedroutingowego `ND_pos` wyroczni do portu daje 0 różnic
(`attribution-twopi.json`) — prowadzenie i emisja są wierne co do bajta.

`1855` to promienisto-gwiaździsty wariant **lustrzany** tego samego przedroutingowego
mechanizmu FP PRISM (zaakceptowany 2026-07-11): jego 31 liści leży dokładnie na jednym okręgu, więc
układ gwiazdy jest symetryczny względem odbicia, a usuwanie nakładania w PRISM spoczywa na niestabilnej symetrycznie
równowadze; różnica 1 ULP między `cos`/`sin` z V8 a libm dla 5
kątów liści w `setAbsolutePos` z `circleLayout` wybiera przeciwną lustrzaną
zlewnię, i cały układ promienisty ląduje jako dokładne lustro względem osi x
układu z wyroczni (maksymalne przemieszczenie węzła 6.04pt, bb zachowane). Wstrzyknięcie A/B dowiodło
obu kierunków: podanie dokładnych pozycji `circleLayout` z C do PRISM w porcie
odtwarza wyrocznię węzeł po węźle (3e-14), a przywrócenie tylko 5
pozycji liści różniących się o ULP przerzuca cały układ z powrotem na lustro
portu. Pełna analiza przyczyn: `.agent-notes/twopi-radial-drift-rca.md` (dziennik decyzji
2026-07-11).

**Charakteryzacja silników iteracyjnych: neato/fdp/sfdp.** <a id="a1-iterative-characterization"></a>
W przeciwieństwie do ścieżek silników `circo`/`twopi`/`osage` powyżej, `neato`/`fdp`/`sfdp`
**nie** są jeszcze analizowane dla poszczególnych id — `engine-walk.ts` zapisuje dla tych trzech pole `tolerance: 0.5`,
a `parity-report.ts` renderuje je w osobnej sekcji
„Iterative engines (±0.5 characterization)” w
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md),
wyraźnie **nieporównywalnej** ze wskaźnikami zaliczeń deterministycznych ±0.01 w innych miejscach
tego dokumentu. Aktualne liczby (zbiór 910 pozycji; wskaźnik zaliczeń pomija
wejścia, których wyrocznia w C nie potrafi wyrenderować, zgodnie z [Zgodnością](./conformance.md)):

| silnik | zbadano | w granicach ±0.5pt | niezgodne (wszystkie przypisane, zaakceptowane) | błąd portu / timeout | błąd wyroczni |
|---|---:|---:|---:|---:|---:|
| `neato` | 910 | 826 (90.8%) | 83 | 1 | 0 |
| `fdp`   | 910 | 703 (77.5%) | 204 | 0 | 3 |
| `sfdp`  | 910 | 619 (68.0%) | 290 | 1 | 0 |

(Pierwszy przebieg, 2026-07-11 przy 762 pozycjach, zmierzył 263/311/260 w granicach
±0.5pt — skok do obecnych wskaźników wziął się z poprawek dla poszczególnych id wprowadzonych od tego czasu,
głównie nieprzeportowanej obsługi `user_pos`/`P_SET` w neato, konsolidacji
inicjalizacji silników i poprawki `setEdgeType` makro-vs-funkcja.)

W odróżnieniu od pierwszego przebiegu każdy rozbieżny wiersz jest teraz indywidualnie przypisany:
narzędzie wstrzykiwania (`test/corpus/attribute-divergence.ts`) podaje
przedroutingowy `ND_pos` natywnej wyroczni do portu i porównuje ponownie, a
każdy obecny rozbieżny id jest albo `drift-exonerated` (prowadzenie i emisja w porcie
odtwarzają wyrocznię dokładnie po usunięciu dryfu solvera),
albo jednym z kilku osobno zaakceptowanych residuów dla poszczególnych id (remis incircle w CDT dla `241_0`
na wszystkich trzech silnikach, neato `2239`, sfdp `42`/`2556`).
Akceptacja klasy poniżej formalizuje zbiór oczyszczony z zarzutów; bieżące liczby w
panelach poszczególnych silników
([`PARITY-neato.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-neato.md),
[`PARITY-fdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-fdp.md),
[`PARITY-sfdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-sfdp.md)).

**Akceptacja klasy A1-drift (silniki iteracyjne, członkostwo wyliczane).**
<a id="a1-drift-iterative-engines"></a> `test/corpus/accepted-divergences-engines.json`
zawiera po jednym wpisie **klasy** `"A1-drift"` dla każdego silnika iteracyjnego (`neato`,
`fdp`, `sfdp`) — `{ class: true, attributionFile, ref }` — odrębnym od
wpisów dla poszczególnych id używanych na ścieżkach `circo`/`twopi`/`osage` powyżej (D2,
`plans/iterative-parity-campaign/decisions.md`). W przeciwieństwie do wpisu dla id, członkostwo
w klasie nigdy nie jest wyliczane ręcznie w rejestrze: `parity-report.ts`
oblicza je przy generowaniu raportu z odpowiedniego `attribution-<engine>.json`
(narzędzia przypisywania przez wstrzyknięcie z T1, `test/corpus/attribute-divergence.ts`)
— każdy rozbieżny id, którego natywny przedroutingowy `ND_pos` został wstrzyknięty do
portu i ponownie porównany z zgodnością przy ±0.5, dostaje w tym pliku `verdict: 'drift-exonerated'`,
co oznacza, że iteracyjne solvery obu silników zbiegły do
numerycznie różnych, lecz każdy wewnętrznie spójnych układów (różnica akumulacji
zmiennoprzecinkowej zgodnie z charakteryzacją A1 powyżej, a nie błąd prowadzenia lub
emisji w porcie). Dowody dla poszczególnych id — kształt kubełka, liczba różnic bazowych vs. po wstrzyknięciu,
wykrycie jednolitego przesunięcia/lustra — znajdują się w samym artefakcie przypisania,
nie są powielane w tym dokumencie ani w rejestrze (D2). Id, który
później zaczyna przechodzić wprost albo którego ponowne przypisanie zmienia werdykt,
wypada z klasy automatycznie przy następnym wygenerowaniu raportu — bez potrzeby edycji nieaktualnej
akceptacji i bez błędu testu strażniczego. Silniki, których
`attribution-<engine>.json` jeszcze nie wygenerowano, renderują klasę jako
„attribution pending” z zerem członków, identycznie jak przy braku jakiejkolwiek
akceptacji — wpis klasy może poprzedzać swoje dane (zob.
`test/corpus/accepted-divergences-engines.test.ts`).

### A2. Pomiar tekstu (metryki czcionki) → układ sterowany etykietami — ZAMKNIĘTE <a id="a2-text-measurement-font-metrics-→-label-driven-layout-—-closed"></a> {#a2-text-measurement-font-metrics-label-driven-layout}

**Status (2026-07-01): zamknięte.** Żaden id korpusu nie jest już
akceptowany w tej klasie; sekcja zostaje jako historyczna dokumentacja
mechanizmu i wstrzykiwalnego punktu rozszerzeń `TextMeasurer`, który go zneutralizował.
Kolejne poprawki pomiaru tekstu (przejście na `EstimateTextMeasurer`,
metryki pionowe uwzględniające czcionkę, poprawka dla bajtów UTF-8 spoza ASCII) rozwiązały niemal
każdą rozbieżność układu sterowanego etykietami, która tu kiedyś mieszkała. **`proc3d`** —
dawny kanoniczny przykład A2 — jest w pełni **`conformant`** we wszystkich trzech
katalogach korpusu (`graphs-`/`share-`/`windows-proc3d`): zgodny bbox, zero
różnic w danych ścieżek, zero różnic w kotwicach etykiet.

**Ostatni członkowie wycofani (2026-07-01).** **Rodzina `NaN`**
(`graphs-NaN` / `share-NaN` / `windows-NaN`) była tu utrzymywana długo po tym, jak
geometria jej węzłów zgadzała się już dokładnie z C (76/76 punktów odniesienia). Jej prawdziwy
residuum — 8 końców prostych krawędzi na czterech przeciwstawnych parach 2-cykli
(`Target↔TThread`, `Interp↔InterpF`, `Event↔Target`,
`AtomProperties↔NRAtom`) przesuniętych o 6–14 pt — zostało zdiagnozowane na nowo i okazało się
**wcale nie efektem metryk czcionki**, lecz dwoma defektami portu w wielokrawędziowym
prowadzeniu dot (misja `plans/fix-nan-a2-retire/`,
`.agent-notes/nan-edge-endpoint-diagnosis.md`):

1. **Kolejność pasów dla przeciwstawnych par.** Port ponownie sortował każdą grupę
   krawędzi równoległych według oryginalnego numeru kolejnego utworzenia przed przypisaniem przesunięć pasów Multisep; C
   przypisuje pasy w zebranej kolejności edgecmp (przedni reprezentant MAINGRAPH
   pierwszy, odwrócony członek AUXGRAPH drugi — `dotsplines.c:419`,
   `make_regular_edge:1885-1907`). 2-cykl, którego odwrócony członek był
   zadeklarowany pierwszy, rysował każdą krawędź na 18-punktowym korytarzu drugiej.
2. **Fałszywa płaska sąsiedniość na krawędziach scalonych między rangami.** `markAdjacent`
   oznaczało wpisy `ND_other` bez strażnika tej samej rangi z C
   (`flat.c:272-276`), pozwalając, aby zwarcie płaskiej sąsiedniości w `groupSize`
   połykało przerwy grup portcmp.

Po wiernym naprawieniu obu rodzina jest **`conformant`** we wszystkich trzech
katalogach (na element: węzły 0, krawędzie 0 różniących się), a ten sam mechanizm
zamknął `42`, `clust2`, `ngk10_4` (structural-match → conformant) i przesunął
`b124` z diverged do structural-match — wszystko na parach 2-cykli/równoległych.

**Obie strony przeglądu uruchamiają ten sam estymator — pomiar jest zneutralizowany.**
Natywna wyrocznia `dot` działa pod bezgłowym `GVBINDIR`
(`test/corpus/gen-headless-gvbindir.sh` → `/tmp/ghl`), który linkuje symbolicznie tylko wtyczki
`core` i `dot_layout` — bez wtyczki układu tekstu `gd`/`pango`/`quartz`.
Przy pustym slocie graphviz wraca do wbudowanego
`estimate_textspan_size`. `EstimateTextMeasurer` portu w TypeScript
(`src/common/textmeasure.ts`) to wierny port tej samej procedury i jest
domyślny w Node, rozstrzygany przez `createMeasurer()`
(`src/common/textmeasure-factory.ts`). **Obie strony każdego porównania parytetu
mierzą więc tekst identycznym estymatorem** — rzeczywiste przesunięcia glifów z FreeType/pango
nigdy nie wchodzą do porównania. Dlatego regresja werdyktu tutaj wskazuje na kod układu, a nie na czcionkę,
i dlatego naprawa własnych błędów estymatora (liczenie bajtów UTF-8, uwzględnianie
czcionki w metrykach pionowych) zamknęła większość tej klasy wprost, a nie tylko
zawęziła lukę w metrykach czcionki.

**Wstrzykiwalny punkt rozszerzeń `TextMeasurer`.** Ta neutralizacja jest możliwa tylko
dlatego, że pomiar tekstu jest celowym punktem rozszerzeń, a nie zaszyty na stałe w żadnym
silniku. `TextMeasurer` to interfejs z jedną metodą (`measure(text, font, size,
flags) → {w, h, …}`) wstrzykiwany jako zależność do każdego miejsca wywołania ustalającego rozmiar etykiety —
`polyInit`, `recordInit`, `initEdgeLabels` i `buildNodeLabel` przyjmują
miernik jako parametr; nic nie mierzy tekstu przez zmienną globalną. Jest
przypinany dla testów/CI przez `setTextMeasurer(...)` lub `GV_TEXT_MEASURER=estimate`.
Ten punkt rozszerzeń pozwala też *udowodnić*, że residuum dotyczy wyłącznie pomiaru: podaj portowi
dokładne szerokości zmierzone przez C (zebrane z wyroczni) i sprawdź, czy układ
odtwarza wtedy C dokładnie. Ten eksperyment pierwotnie uprawomocnił
werdykt A2 dla `proc3d` (zob. historyczny dodatek poniżej) — technika
pozostaje ważna. Jej odwrócenie wycofało klasę: ponieważ pomiar był
dowodnie zneutralizowany po obu stronach przeglądu, residuum krawędzi `NaN` nie mogło
być efektem metryk czcionki, co wymusiło ponowną diagnozę, która znalazła dwa
powyższe defekty prowadzenia.

::: details Analiza historyczna (zastąpiona 2026-06-30) — zachowana dla zapisu
Poniższy materiał opisuje wcześniejszy stan tej klasy, zanim przejście na
`EstimateTextMeasurer`, metryki pionowe uwzględniające czcionkę i poprawka dla
bajtów UTF-8 spoza ASCII zamknęły większość z niej. Nie opisuje już obecnego
zachowania — zachowany jedynie po to, by nie zgubić rozumowania, które do tego doprowadziło. W
szczególności: (1) liczby szerokości „natywnego C” w tabeli pomiarów poniżej to
wartości **FreeType** ze ścieżki renderowania z prawdziwą czcionką; przegląd parytetu
nigdy tej ścieżki nie używa — obie strony uruchamiają `estimate_textspan_size` (zob.
wyżej) — więc tabela nie odzwierciedla tego, jak parytet jest obecnie mierzony; (2)
rysunki nakładek i rendery golden/nasz poniżej przedstawiają **spoza korpusu**
`proc3d` (`graphs/directed/proc3d.gv`, ~2620 pt), który nie wchodzi w skład
przeglądu parytetu; warianty `proc3d` z korpusu są teraz zgodne z zerem
różnic, więc nie ma dla nich nakładki do pokazania; (3) narracja o przesunięciu x węzłów
`NaN`/`ratio=compress` poniżej jest zastąpiona — obecny pomiar pokazuje, że wszystkie 76 punktów węzłów
zgadza się dokładnie, więc łańcuch błąd szerokości → przesunięcie węzła, który opisuje, już
nie zachodzi dla `NaN`.

**`NaN` przy `ratio=compress` (historycznie).** Rodzina
`NaN.gv` (`orientation=landscape; ratio=compress; size="16,10"`) była
przypadkiem A2, którego werdykt lądował wówczas na *diverged*, a nie
*structural-match*. Ścieżka x-sieciowego simplexu z compress była wierna — każde wejście
ograniczeń zgadzało się z C (wartość ograniczenia szerokości, minlens `containNodes`,
liczby krawędzi pomocniczych 471/wt 1612, `lrBalance` i kolejności rang — wszystko identyczne)
*z wyjątkiem* połówek szerokości 9 węzłów, które miernik zgłaszał jako o 0.5–1.03 pt
szersze niż w C. Upakowanie o wadze 1000 w `ratio=compress` sprawiło, że zwykle luźne
ograniczenia separacji od lewej do prawej stały się **wiążące**, więc ten podpikselowy
błąd szerokości — niewidoczny bez compress — wypłynął jako wewnętrzne przesunięcie x o −3..−5 pt. To przesunięcie przechyliło prosty splajn `Target<->TThread` o 0.55 pt
poza ścianę pudełka węzła, więc router wygiął go w dodatkowy odcinek béziera (7
punktów vs 4 w C) — różnica *strukturalna*, stąd *diverged*. Wymuszenie 9 szerokości
na wartości z C odtworzyło C dokładnie (x węzłów 53/76→0/76 odchylonych; splajn 7→4 pkt),
potwierdzając, że residuum w 100% pochodziło z metryk czcionki powyżej w łańcuchu, a nie z compress ani
kodu splajnów, **dla tej dawnej rozbieżności**. Pełne dowody (z wizualnym
zestawieniem golden-vs-nasz obok siebie + nakładką różnicy splajnu 4 vs 7 punktów):
`plans/fix-compress-xcoord/comparisons/nan-compress-xcoord.html` (opis
prozą: `…/nan-compress-xcoord.md`).

**Przykład pomiaru metryk czcionki (historycznie — FreeType vs estimate).**
Natywny Graphviz uruchomiony z prawdziwą wtyczką układu tekstu (nie bezgłową
wyrocznią używaną w przeglądzie parytetu) mierzy tekst przesunięciami glifów z FreeType/libgd.
`EstimateTextMeasurer` portu nie replikuje rasteryzatora glifów. Dla większości ciągów obie wartości
zgadzają się dokładnie; dla niektórych różnią się o
ułamek punktu. Zmierzony przykład — Times-Roman 14 pt, ciąg
`"/home/ek/work/src/lefty/lefty.c"` (31 znaków):

| | szerokość |
|---|---|
| natywny C (FreeType) | 176.00 pt |
| @knowvah/dot-engine (estimate) | 176.75 pt |
| różnica | **+0.75 pt (+0.43%)** |

Druga linia etykiety tego samego węzła, `"93736-32246"`, zmierzona została **identycznie**
(96.00 pt w obu) — błąd zależy od ciągu i kumuluje się dla każdego glifu,
a nie jest jednolitym współczynnikiem skali. Ta luka FreeType-vs-estimate jest prawdziwa, ale
**nie** jest tym, co mierzy przegląd parytetu (obie strony używają `estimate`); miałaby
znaczenie tylko wtedy, gdyby wynik @knowvah/dot-engine porównywano z renderem C
z prawdziwą czcionką poza tym przeglądem.

**Skutek w dół łańcucha dla dawnej rozbieżności `proc3d` (historycznie).** Szerokość
etykiety wpływa na rozmiar węzła, który wpływa na układ:

1. Szersza etykieta → nieco szersze pudełko węzła (dla węzła-*elipsy* szerokość jest
   dodatkowo skalowana przez √2, więc +0.75 pt tekstu → +0.53 pt połowy szerokości).
2. Połowy szerokości węzłów ustalają ograniczenia separacji od lewej do prawej w
   sieciowym simplexie współrzędnej x; te ograniczenia są zaokrąglane przez `ROUND()` do
   liczb całkowitych, więc podpikselowa zmiana szerokości może przechylić ograniczenie z *N* na
   *N+1*.
3. Sieciowy simplex wybiera wtedy inne — lecz równie optymalne —
   całkowitoliczbowe przypisanie x, przesuwając pozycje x niektórych węzłów o 1–2 jednostki.

Dla spoza korpusu `proc3d.gv` (`graphs/directed/proc3d.gv`, ~2620 pt, nie jest
członkiem przeglądu parytetu) dało to różnicę **≤ 3.55 pt** w rozpiętości x
(**0.13%**), nałożoną poniżej — **zielony = natywny C `dot` (golden), czerwony =
@knowvah/dot-engine (nasz)**:

![Nakładka proc3d golden-vs-nasz: zielony = C, czerwony = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Po powiększeniu obwódka pojawiała się niemal wyłącznie na długich owalnych
etykietach ze ścieżkami plików:

![Nakładka proc3d, powiększona na szerokie owalne etykiety ścieżek: zielony = C, czerwony = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

| Golden — natywny `dot` | Nasz — @knowvah/dot-engine |
|---|---|
| ![proc3d wyrenderowany przez C Graphviz](/img/proc3d-golden.svg) | ![proc3d wyrenderowany przez @knowvah/dot-engine](/img/proc3d-ours.svg) |

Samodzielne opracowanie (przyczyna źródłowa, liczby dla poszczególnych metryk, polecenie do odtworzenia)
jest na osobnej stronie:
[**proc3d — kanoniczna rozbieżność A2 w metrykach czcionki (historyczna)**](/pl/divergences-proc3d-a2).
Ta strona opisuje rozwiązaną rozbieżność na wejściu spoza korpusu; obecne
warianty `proc3d` z korpusu są zgodne.

**Dlaczego wówczas zaakceptowane.** Dopasowanie co do bajta przesunięć poszczególnych glifów
FreeType dla każdej czcionki i ciągu wymagałoby replikacji jego tabel
metryk, hintingu i zaokrągleń — duże, kruche i wciąż bez
gwarancji dokładności. Miernik tekstu to wspólny prymityw: każda etykieta w
korpusie przez niego przepływa, więc poprawka wymierzona w jeden ciąg groziła regresją
innych za niezauważalną nagrodę.
:::

### A3. Rozstrzyganie remisu `hypot` w prowadzeniu splajnów (`dot`) {#a3-hypot-tie-break-in-spline-routing-dot}

**Dotyczy:** grafów `dot` z **geometrycznie symetrycznym** kanałem prowadzenia krawędzi —
zazwyczaj krótkim, symetrycznym łukiem krawędzi płaskiej. Zaobserwowany przykład: `2368`,
który pozostaje na *structural-match* (maxΔ ≈ 10.2 pt na **jednej** krawędzi, `376->76`).
To samo rozstrzyganie remisu pojawia się też na **długiej** (wielorangowej) krawędzi do
koncentratora o dużym stopniu wejściowym, gdy korytarz jest dokładnie symetryczny lustrzanie: `graphs-b100` /
`graphs-b104` (identyczne źródło) rozjeżdżają się o maxΔ 20 (dokładnie jeden wiersz rangi) na
pojedynczym węźle splajnu `Node23730->Node23729` — pozycje wszystkich węzłów i cała struktura
pudełek/wielokątów/napiętej ścieżki wyżej w łańcuchu jest identyczna co do bajta z C; różni się tylko
wybór `findMaxDev` o ~1 ULP, który z lustrzanie symetrycznych punktów wewnętrznych staje się węzłem béziera.
Forma krótkiej krawędzi płaskiej pojawia się też jako `241_1` (structural-match,
maxΔ ≈ 2.4 pt) — rozbieżny sibling przypiętego do wyroczni `241_0`, który szum C
zamiast tego zatrzymuje na pierwszym. To samo rozstrzyganie remisu powoduje rozszczepienie korytarza szczelinowego
krawędzi powrotnej etykietowanego 2-cyklu w `2413_1` (structural-match, maxΔ 67.65) i
`2413_2` (maxΔ ≤99.55 po wylądowaniu poprawki T11 swapBezier-reverse — do tego czasu
zgłaszane maxΔ 1922.26 dla pliku jest zdominowane przez niezwiązany, osobno
śledzony defekt), oraz pojedynczą etykietowaną krawędź wewnątrz klastra w `graphs-decorate`
(maxΔ 43.54); w każdym przypadku dwa kandydackie narożniki podziału remisują się z dokładnością do
5.7e-13 (rodzina 2413) / 3e-14 (decorate), zanim zależny od pozycji szum `hypot` z Apple
wybierze zwycięzcę. `2371`
(structural-match, maxΔ 16.8) pokazuje ten sam odcisk palca na dwóch niezwiązanych
krawędziach (`g[9263]` `r6837mid--r9687mid`, `g[23859]` `r38mid--r8699mid`): port
emituje dokładne lustro sekwencji punktów kontrolnych wyroczni na obu,
y węzła splajnu odwrócone o identyczną Δ16.8 (górne/dolne ułamki podziału zamienione).
Jego pochodzenie jest oceniane z pewnością **MEDIUM**, a nie
POTWIERDZONĄ jak u pozostałych członków: `2371` pakuje ~199 komponentów, co
rozprzęga lokalne współrzędne pathplan od współrzędnych strony, więc remisu nie dało się
skorelować na żywo z `route.ts:209` w trzech próbach instrumentacji; pochodzenie
w segmentacji trybu prostego lub w `recover_slack` po przycięciu nie jest
w pełni wykluczone. Pełna diagnoza:
`plans/residual-cleanup/analysis/2371-mirror.md`. Większość prowadzonych krawędzi
nie jest dotknięta.

::: details Definicja grafu (`2368.dot`)
```dot
digraph G {
  compound=true;
  concentrate=true;
  node[shape=box,fontsize="8",color="#909090",height="0.1"];
  edge[style="dashed",fontsize="8",color="#808080",arrowsize="0.5"];
  line7[label="#7"];
  {rank=same; line7;136;}
  line7 -> 136[style=invis];
  line11[label="#11"];
  line7 -> line11[weight=100,style=invis];
  {rank=same; line11;16;}
  line11 -> 16[style=invis];
  line16[label="#16"];
  line11 -> line16[weight=100,style=invis];
  {rank=same; line16;76;376;256;196;436;316;}
  line16 -> 316[style=invis];
  316 -> 76[style=invis];
  76 -> 376[style=invis];
  376 -> 256[style=invis];
  256 -> 196[style=invis];
  196 -> 436[style=invis];
  76 -> 376[label="from1"];
  376 -> 76[label="to1"];
  16 -> 76[label="ignore"];
  196 -> 376[label="from2"];
  376 -> 196[label="to2"];
  136 -> 196[label="ignore"];
  256 -> 436[label="to2"];
  256 -> 376[label="to1"];
  256 -> 316[label="as"];
  436 -> 256[label="from2"];
  376 -> 256[label="from1"];
}
```
:::

**Charakteryzacja.** Dopasowywacz splajnów (`Proutespline` → `findMaxDev`,
`src/pathplan/route.ts`) dzieli dopasowany bézier w wewnętrznym punkcie trasy o
maksymalnym odchyleniu. Gdy kanał jest symetryczny, dwa kandydackie punkty podziału
tworzą **dokładny matematyczny remis**, a zwycięzcę rozstrzyga wtedy szum anulowania
zmiennoprzecinkowego rzędu ~1e-14 w ewaluacji béziera we współrzędnych bezwzględnych,
którego **znak zależy od pozycji bezwzględnej**.

Odległością odchylenia w C jest `hypot` z libm, a `hypot` z macOS Apple, który
wygenerował wyrocznię, to własnościowa implementacja, która nie zgadza się bitowo z **żadnym**
przenośnym `hypot` (zmierzone względem niej w reżimie współrzędnych graphviz, wskaźniki
identyczności bitowej: V8 `Math.hypot` ≈ 63%, `hypot` poprawnie zaokrąglany / w stylu Arm
≈ 84%, `hypot` z fdlibm ≈ 90%, `sqrt(dx²+dy²)` ≈ 94%). Z powodu tego szumu ULP
**sam C nie jest spójny**: dzieli dwa *przesunięte translacyjnie, kongruentne* łuki ku
**przeciwnym** narożnikom. W `2368` łuk `376->76` jest lustrzanym odbiciem
geometrycznie identycznego łuku `256->436`:

```
C    376->76 : M273.31,-4.56 C268.33,-3.14 263.11,-1.9  258.11,-1.15 250.49,0     242.34,-0.98 234.83,-2.8
port 376->76 : M277.29,-4.51 C268.27,-1.69 257.65,0.32  247.89,-1.15 244.92,-1.59 241.88,-2.21 238.85,-2.94
```

Cała różnica, nałożona (powiększenie 12× na łuku `376->76` / `to1`) — **zielony = C
Graphviz, czerwony = @knowvah/dot-engine**. Oba to ten sam płytki łuk w dół między
tymi samymi granicami węzłów; różnią się o ~1–2 pt w brzuchu (środkowy punkt
kontrolny béziera), gdzie remis w C rozstrzygnął się ku przeciwnemu narożnikowi:

![Łuk 2368 376->76: zielony = C, czerwony = @knowvah/dot-engine](/img/2368-376to76-overlay.png)

Wszystko inne zgadza się w granicach tolerancji — ta sama ramka ograniczająca (608×148), pozycje węzłów,
etykiety, groty i wszystkie inne krawędzie. Pełne rendery są wizualnie
nie do odróżnienia:

| C Graphviz | @knowvah/dot-engine |
|---|---|
| ![2368 wyrenderowany przez C Graphviz](/img/2368-c.png) | ![2368 wyrenderowany przez @knowvah/dot-engine](/img/2368-port.png) |

Port używa rozstrzygania remisu **równoważnego względem translacji** (prawdziwy remis zawsze rozstrzyga się
na pierwszy indeks), więc rysuje *każdy* taki łuk tak samo niezależnie od
pozycji — jest wewnętrznie spójny i zgadza się z C na łukach, na których szum C również
zostawia pierwszy (np. `256->436` i `241_0 5:ne->8:nw`), rozjeżdżając się tylko tam, gdzie szum C
przechyla w drugą stronę (`376->76`). Końce, cel grotu, pozostałe
krawędzie, wszystkie węzły, etykiety i ramka ograniczająca zgadzają się w granicach tolerancji; przesuwają się tylko
wewnętrzne punkty kontrolne jednego łuku (~1–2 pt w brzuchu).

**Dlaczego zaakceptowane.** `hypot` z Apple nie jest bardziej powtarzalny między silnikami JS i
procesorami niż FMA/`pow` z **A1** — to to samo ograniczenie przenośności, tylko
w routerze splajnów `dot`. Dopasowanie *zależnego od pozycji* wyboru C oznaczałoby
przyjęcie ścisłego rozstrzygania remisu z C, które żyje we **wspólnym prymitywie**, przez który przepływa każda prowadzona
krawędź: kosztem zgodności `376->76` pojawiłyby się *nowe* niezgodności na
łukach, gdzie C ląduje w drugą stronę (regresuje `241_0` i przypadek wyroczni płaskiej krawędzi `cnt=3`),
bilans zerowy, który poświęca też równoważność translacyjną portu. Zachowujemy więc spójny (równoważny) router. To
ograniczona, niezauważalna różnica `dot` — nie otwarty błąd. Pełne badanie:
`.agent-notes/2368-residual-flat-label-ranksep.md`.

### A4. Wyrocznia w uznanym za zepsuty stanie (rodzina init_rank / pathplan) {#a4-oracle-in-an-acknowledged-broken-state-the-init-rank-pathplan-family}

**Dotyczy:** `2796` (structural-match, maxΔ 49), `2471` (structural-match,
maxΔ ~9063), `1435` (structural-match, maxΔ 503), `1581` (diverged, maxΔ 465). Członkowie
rodziny `1939` i `2825` są **conformant** i nie mają wpisu, a `2470`
i `graphs-structs` dołączyły do nich 2026-07-11 (oba zapadły się do conformant
po wylądowaniu poprawek ortho adjacency-spill/chancmpid, fmadd `polylineMidpoint` oraz
zaokrąglania remisów half-even — port odtwarza teraz wynik odzyskiwania wyroczni
dokładnie, włącznie z identycznymi utraconymi krawędziami); ich
wpisy akceptacji zostały wycofane.

`1581` i `2825` były przypadkami odzyskiwania po awarii (misja fix-element-count-bucket):
wejścia z fuzzera/zdegenerowane, dla których testy upstream sprawdzają **wyłącznie**,
że dot się nie wywraca (`test_1581`: brak naruszenia ASan; `test_2825`: brak
awarii, gdy `rebuild_vlists` zwraca -1). C trafia na wewnętrzny `Error:`
(`install_in_rank` / `rebuild_vlists: lead is null`), a jego odzyskiwanie
odrzuca zawartość układu; port dochodzi do **identycznych decyzji o usunięciu
rankset** (zgodność ostrzeżeń zweryfikowana: te same nazwy węzłów/grafów w
ostrzeżeniach „already in a rankset” z `mark_clusters`, cluster.c:317-320).

`2825` jest teraz w pełni zamknięte. Misja fix-2825-rebuild-vlists (po 1581)
najpierw zamknęła lukę o jedną warstwę: port dochodzi do *dokładnego* wewnętrznego stanu błędu
z C — stderr identyczny co do bajta, włącznie z kolejnością komunikatów
(`Error: rebuild_vlists: lead is null for rank 1`, a potem nieprefiksowana
kontynuacja `agerr(AGPREV, ...)` `concentrate=true may not work
correctly.`) — a `dotLayoutPipeline` poprawnie propaguje
niepowodzenie `dot_position`, pomijając `dot_splines`/`dotneato_postprocess`,
zgodnie z `dotLayout` w C (`if (r != 0) return r;` po `dot_position`,
dotinit.c:322-325). Kolejny krok (część 2) zamknął następnie pozostałą
lukę w warstwie renderowania: `emit_node` w C bramkuje każdy węzeł przez `node_in_box(n,
job->clip)` (emit.c:1806-1809), a na tej ścieżce przerwania `job->clip` jest
zdegenerowane, bo `GD_bb` nigdy nie zostało ustawione przez `set_aspect` (wewnątrz
pominiętego ogona `dot_position`) — więc C emituje *zero* węzłów, tylko (również
zdegenerowane) ramki klastrów. Port przeportował tę samą bramkę `node_in_box`
(`src/gvc/device.ts:renderNode`, używając `job.bb`/`job.pad` jako
jednostronicowego odpowiednika `job->clip`) i przestał
przeliczać wiarygodną ramkę bb z żywych pozycji węzłów, gdy `g.info.bb` nie jest ustawione
(`src/gvc/device.ts:render`, `job.bb = g.info.bb` dosłownie, odzwierciedlając
`gvc->bb = GD_bb(g)` z `init_gvc`, emit.c:3272) — każdy silnik układu
ustawia `g.info.bb` sam, zanim `render()` uruchomi się na każdej ścieżce bez przerwania,
więc na zdrowych grafach jest to identyczne co do bajta i zmienia wynik
tylko na tej ścieżce przerwania. `2825` jest teraz `conformant` (wynik z 4 elementów,
identyczny co do bajta z wyrocznią). Zob.
`.agent-notes/2825-rebuild-vlists-abort.md` dla pełnego śladu mechanizmu
obu części. `1581` w ogóle nie dochodzi do niespójnego stanu (to
*inny* błąd okna klastrów w upstream, nie `rebuild_vlists`), więc układa
cały ocalały graf — ta luka pozostaje otwarta. Wynik wyroczni
dla `1581` to szczątki po odzyskiwaniu bez semantyki zdefiniowanej w upstream. Dowody:
[`1581`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1581.md). Na
każdym z tych wejść to **wyrocznia w C** jest zepsuta, według
własnej oceny graphviz: `2471`, `1939` i `1435` to
[`xfail(strict=True)`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/tests/test_regression.py)
w upstream (zgłoszenia
[#2471](https://gitlab.com/graphviz/graphviz/-/issues/2471),
[#1939](https://gitlab.com/graphviz/graphviz/-/issues/1939),
[#1435](https://gitlab.com/graphviz/graphviz/-/issues/1435), por.
[#2796](https://gitlab.com/graphviz/graphviz/-/issues/2796)); jedyna próba
naprawy, [szkic MR !4849](https://gitlab.com/graphviz/graphviz/-/merge_requests/4849),
pozostaje niescalonym szkicem (ostatnia edycja 2026-03-20). `graphs-structs` to
dawna klasa utraty prowadzenia krawędzi rekordów (#102/#242/#274/#1323), którą
stabilny graphviz 15.0.0 renderuje poprawnie — regresja wyroczni w kompilacji deweloperskiej.

**Co robi C.** Na członkach `init_rank` (`2796`, `2471`, `1939`)
pomocniczy graf współrzędnej x natywnego dot zamyka skierowany cykl przez
krawędzie ograniczeń ścian klastrów; jego
[`init_rank`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/ns.c#L146)
nie może przejrzeć każdego węzła, wypisuje `Error: trouble in init_rank`, a
układ jest kontynuowany ze stanu odzyskiwania — na `2471`/`2796` kończąc się
szczątkami triangulacji `Pshortestpath` i utraconymi krawędziami. Na `1435` i
`graphs-structs` zepsutym etapem jest sam pathplan (ślepe zaułki triangulacji
przez odcinanie uszu; utracona krawędź portu rekordu).

**Wejścia zweryfikowane, a następnie odwzorowane wiernie (to jest część nośna).**
Misja `verify-oracle-bug-family`
([opis](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/README.md))
zrzuciła graf ograniczeń, który obie strony podają sieciowemu simplexowi, linia po linii,
dla każdego członka rodziny — i odkryła, że wcześniejsze „czyste” zachowanie portu na
tej rodzinie wynikało z **czterech prawdziwych defektów portu**, wszystkie naprawione:

1. `flatEdges` pomijało wywołanie
   [`rec_reset_vlists`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/flat.c#L333)
   z C, zostawiając nieaktualne okna rang klastrów po wstawieniu vnode etykiet płaskich
   (samo to sprawiało, że port tracił **9** krawędzi na `2471`, gdzie C
   traci 6).
2. Kara za krawędź z tej samej `group` uruchamiała się na pętlach własnych zamiast na
   końcach z tej samej niepustej grupy
   ([`dot_init_edge`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/dotinit.c#L66)).
3. `CL_CROSS` używało wartości 100 z `_WIN32` w C; platforma wyroczni używa 1000
   ([`const.h`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/const.h#L141)).
4. Ślepy zaułek triangulacji przerywał `Pshortestpath` zamiast ostrzeżenia i kontynuacji
   z awaryjną linią prostą jak w C
   ([`shortest.c:333`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/pathplan/shortest.c#L333)).

Po poprawkach zrzuty ograniczeń NS tej rodziny są **identyczne linia po linii** z C
(253 wywołania rank2 na `2471`; wszystkie wywołania na `1939`/`1435`/`graphs-structs`),
a port podąża za C przez uznane za zepsute odzyskiwanie: te same
utracone krawędzie (`3->16` na 2796; identyczne 6 na 2471), te same drzewa elementów.
`1939` stał się w pełni conformant. Pozostałe różnice liczbowe (oraz różne
szczątki pathplan w 1435) to zachowanie *wewnątrz* stanu odzyskiwania,
za którym polityka projektu świadomie nie podąża.

**`2723` (segfault; przypięte, bez pościgu).** Natywny `dot` wywala się z segfaultem (kod 139)
na `tests/2723.dot` (nieskierowany, grupy `rank=same`, etykietowane krawędzie), więc C nie ma
wyniku do dopasowania. Zgłoszenie upstream
[#2723](https://gitlab.com/graphviz/graphviz/-/issues/2723) jest otwarte, a
`tests/test_regression.py:test_2723` ma `xfail`. Port rzuca
`InternalError` (`INTERNAL_ERROR`, z przyczyną `TypeError` z
`src/layout/dot/flat.ts:flatLabelYpos`, gdzie `rank[r-1]` jest niezdefiniowane). Bez
poprawnej wyroczni uczciwa awaria pozostaje, a port nie jest zmieniany;
`src/layout/dot/flat-2723.test.ts` ją przypina. Zaktualizuj ten test, jeśli upstream naprawi
zgłoszenie.

### A5. Nieprawidłowe bajty wejścia (reprezentacja kodowania) {#a5-invalid-input-bytes-encoding-representation}

**Dotyczy:** `1367` (diverged, maxΔ 0 — dokładnie jedna różnica strukturalna).

**Co się różni.** Plik wejściowy zawiera samotny bajt kontynuacji UTF-8 (`0x80`)
wewnątrz nazwy węzła. C traktuje samotne bajty kontynuacji 0x80–0xBF jako „poprawne
znaki reprezentujące siebie” (`lib/common/utils.c:1200-1207`, bez
ostrzeżenia), a tekst `<title>` nazwy węzła całkowicie omija konwersję zestawu znaków
(bajty `agnameof` płyną prosto do `gvputs_xml`). SVG z wyroczni zawiera więc surowy bajt
i **nie jest poprawnym UTF-8** mimo deklarowanego
kodowania. Port dekoduje wejście z nieprawidłowym UTF-8 awaryjnie jako latin1
(`0x80 → U+0080`) i emituje poprawnie sformowany UTF-8 (`\xc2\x80`).

**Dlaczego zaakceptowane.** Granicą I/O portu są łańcuchy JS (biblioteka przeglądarkowa).
Surowy nieprawidłowy bajt nie przejdzie obiegu przez wartość zwracaną
`renderSvg` jako string; dopasowanie C co do bajta oznaczałoby zepsucie kodowania wyniku dla każdego
odbiorcy. Awaryjne latin1 odzwierciedla własną semantykę odzyskiwania C
„traktowane jak Latin-1” (`utils.c:1249`). To ograniczenie poniżej kodu —
w warstwie reprezentacji — a nie przenośne zachowanie, którego odmówiliśmy przeportowania.
Wszystko inne w 1367 jest conformant: liczby elementów (23 polyline /
103 text / 44 polygon / 24 path) i wszystkie współrzędne zgadzają się po poprawce
decorate (T6).

**Dowody.**
Strona porównania
[`1367`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1367.md)
(render obok siebie + zapis dowodów).

---

### A6. Przepełnienie płótna `unsigned int` na zdegenerowanym wejściu {#a6-unsigned-int-canvas-overflow-on-degenerate-input}

**Dotyczy:** `1314` — wejście pochodzące z fuzzera (`fontsize="991836031967s8"`),
którego absurdalny rozmiar czcionki rozdyma rysunek do ~2.75e11 pt.

**Co się dzieje.** C przechowuje `job->width` / `job->height` jako **`unsigned int`**
(`gvcjob.h:327-328`). `ROUND(...)` ogromnego rozmiaru w punktach (`emit.c:1249-1250`)
przepełnia 32 bity i zawija się modulo 2³², a backend SVG emituje to przez
**ze znakiem** `%d` (`gvrender_core_svg.c:258-259`) — więc C wypisuje
`height="-425618343"`. Port zachowuje matematycznie spójną (niezawiniętą)
wartość. Każda inna wartość — elipsa węzła `cx/cy/rx/ry`, główne `translate`,
wielokąt, `font-size` tekstu — jest identyczna co do bajta; różnią się tylko szerokość/wysokość
elementu `<svg>` najwyższego poziomu.

**Dlaczego za tym nie gonimy.** Replikowanie 32-bitowego przepełnienia liczby całkowitej z C nie jest
zachowaniem układu wartym przeportowania, a wejście jest zdegenerowane. Wrócimy do tematu, jeśli upstream
naprawi przepełnienie (np. poszerzy pole lub przytnie rozmiar).

<a id="a6b-degenerate-nan-layout"></a>

#### A6b. Zdegenerowany układ NaN (`sfdp`, patologiczne `repulsiveforce`) {#a6b-degenerate-nan-layout-sfdp-pathological-repulsiveforce}

**Dotyczy:** `2556` — `repulsiveforce=100` (⇒ siła odpychająca używa
`pow(dist, 101)`), co doprowadza solver sprężysto-elektryczny do **NaN w obu
silnikach**. Sama natywna wyrocznia emituje pozycje węzłów/krawędzi w całości `nan` i
zdegenerowaną ramkę ograniczającą.

**Co się dzieje.** Gdy każda współrzędna jest NaN, obie implementacje serializują
śmieci inaczej: (1) bb grafu / wielokąt tła — C zaokrągla `NaN`
do `int`, co na arm64 daje śmieci rzędu `INT_MIN` (`bb="0,0,-4.295e+09,
-4.295e+09"`); port zostawia `0`. (2) Operacje rysowania krawędzi — przebieg emisji w natywnym
pomija `_draw_`/`_hdraw_` splajnu NaN (emitując tylko `pos`),
podczas gdy port emituje je z punktami kontrolnymi NaN. Rysowanie węzłów się zgadza (oba
je pomijają). Po żadnej stronie nie istnieje prawdziwy układ.

**Dlaczego za tym nie gonimy.** Port już odtwarza *ten sam* rozbieg do NaN co
natywny — poprawka, która do tego doprowadziła, jest prawdziwa (zob. niżej); pozostaje tylko to,
jak każdy serializuje śmieci NaN. Replikowanie niezdefiniowanego zachowania `(int)NaN` w C
i pomijania rysowania splajnów NaN nie jest sensowną wiernością układu na wejściu,
którego układ jest zdegenerowany w obu silnikach. Wrócimy do tematu, jeśli upstream przytnie
`repulsiveforce` lub oczyści pozycje NaN.

**Poprawki portu, które to umożliwiły (nie odpędzone — prawdziwe błędy).** Przed
nimi port nie mógł nawet dojść do zdegenerowanego stanu: (1) `armPow`
(`src/common/arm-pow.ts`) rzucał wyjątek na każdym argumencie spoza szybkiej ścieżki; teraz przenosi
pełną gałąź przypadków szczególnych z ARM `pow.c`, więc `pow(NaN, y) = NaN` jak w libm. (2)
`bezierClip` (`src/common/splines-geom.ts`) zapętlał się w nieskończoność na punktach kontrolnych NaN,
bo jego test zbieżności był naiwną negacją `while (ABS > .5)` z C
(równoważną dla wartości skończonych, ale nie dla NaN); teraz odzwierciedla C dokładnie i
kończy się na NaN. Obie są wierne C i dotyczą tylko wejść NaN.

---

### A7. Granica zaokrąglania `round()` ściany pudełka (`dot`) {#a7-round-box-wall-rounding-boundary-dot}

**Dotyczy:** `graphs-honda-tokoro` oraz (dodany 2026-07-28, nowy w zbiorze 905
pozycji) jego sibling z `graphs/directed/` `tree-graphs-directed-honda-tokoro`
(oba structural-match, maxΔ ≈ 1 pt na pojedynczej krawędzi `n012->n011`). Sibling
różni się tylko atrybutami `samearrowhead`, które nie wpływają na prowadzenie tej pary —
jego geometria `n012->n011` jest identyczna co do bajta z zaakceptowanym id po
stronie portu i wyroczni, więc poniższy mechanizm przenosi się dosłownie.

**Co się różni.** Ściana pudełka korytarza głowy w `maximal_bbox` ląduje na wewnętrznym
x=90 w C, a x=89 w porcie dla wspólnego portu `samehead` dwóch
równoległych `n012->n011`. Konstrukcja wspólnego portu (`buildSharedPort`) i
grupowanie równoległych są oba zgodne z C co do bajta; 1-pikselowa luka to wyłącznie
artefakt granicy zaokrąglania `round()` — ~1e-14 szumu zmiennoprzecinkowego z wcześniejszych etapów
przechyla wartość leżącą dokładnie na granicy `.5` na sąsiednią liczbę całkowitą.
Wzór `maximal_bbox` w porcie już dokładnie odzwierciedla ten z C.

**Dlaczego za tym nie gonimy.** `round()` to prymityw, przez który przepływa każda prowadzona krawędź
korpusu; przesuwanie jego zachowania na granicy, aby dopasować ten jeden przypadek, to
ryzyko regresji w całym korpusie dla 1 px na 2 krawędziach — to samo ograniczenie wspólnego prymitywu
co zaokrąglanie otoczki kontrolnej odnotowane w
`bbox-class-control-hull-vs-curve`. Pełna diagnoza:
`.agent-notes/honda-samehead-shared-port.md`.

---

### A8. Zaokrąglanie `fp-contract`/FMA vs. ścisłe IEEE (`dot`) {#a8-fp-contract-fma-rounding-vs-strict-ieee-dot}

**Klasa.** clang arm64 kompiluje binarkę wyroczni z `-ffp-contract=on`,
łącząc wybrane sekwencje mnożenia z dodawaniem w pojedyncze instrukcje FMA; port
działa na V8, które wykonuje ścisłe zaokrąglanie IEEE-754 i nie potrafi emitować
`fma`. Na identycznych bitowo danych wejściowych oba różnią się o 1-2 ULP w tym
wyrażeniu, które kompilator zdecydował się skontraktować. Strona portu to zawsze
wynik ścisłego IEEE-754; strona wyroczni to zawsze wynik skontraktowany do FMA. To
ograniczenie przenośności kompilatora/środowiska uruchomieniowego poniżej semantyki kodu
źródłowego C, a nie defekt logiki w porcie — nie do zredukowania bez
programowej emulacji konkretnych wyborów kontrakcji clang. Znane są dwa przypadki,
w dwóch różnych miejscach, z dwoma różnymi mechanizmami wzmocnienia:

- **2646** — ULP powstaje wewnątrz rozwiązania sześciennego `points2coeff`/`solve3`
  w `Proutespline` i bezpośrednio przerzuca liczbę pierwiastków dopasowywacza splajnów.
- **2620** — ULP powstaje w pętli zakresu wierzchołków wielokąta w `poly_init`
  (rozmiar węzła) i jest wzmacniany dalej przez wierną obcinającą do liczby całkowitej
  relaksację `ortho` w przerzucenie remisu korytarza labiryntu o równym koszcie.

**Dotyczy:** `2646` (structural-match, maxΔ 42.09 na 3 z 21 216 krawędzi:
`edge2575` `g[4639]`, `edge3905` `g[7777]`, `edge15467` `g[30201]` — wszystkie to
długie trasy krawędzi smode z portem rekordu `:c->:nb_part`). Sibling **A3**: obie
klasy to nieredukowalne remisy przenośności zmiennoprzecinkowej wewnątrz
`Proutespline`, ale mechanizm jest odrębny — artefakt `fp-contract`
kompilatora, a nie `hypot` z libm.

**Co się różni.** Na wszystkich trzech krawędziach rozjeżdża się tylko ostatnie wywołanie `routesplines` (prosty
odcinek do portu głowy). Jego koniec leży bitowo dokładnie na dolnej ścianie wielokąta bariery, a styczna jest równoległa do tej ściany
(`evs[1]=(1,-1.22e-16)`), więc każdy kandydat `splinefits` jest styczny do
bariery w `t=1` — niemal podwójny pierwiastek sześcianu przecięcia.
`points2coeff` liczy ten sześcian przez katastrofalne skracanie (wyrazy
rzędu ~7446 zapadają się do ~0.099). Wyrocznia (clang/arm64,
`-ffp-contract=on`) kontraktuje `v3 + 3*v1 - (v0 + 3*v2)` do połączonych
mnożeń z dodawaniem, podczas gdy V8 wykonuje ścisłe zaokrąglanie IEEE — oba różnią się o
~9.1e-13 na **identycznych bitowo wejściach**, a ten szum przerzuca znak
wyróżnika `solve3`: C znajduje 1 pierwiastek (866.7, wewnątrz odcinka); port
znajduje 3 pierwiastki z fałszywym partnerem w `t=0.9999975 < 1-EPSILON2`. Fałszywy
pierwiastek wywołuje jedną dodatkową iterację połowienia `a`, co przerzuca
wielkość stycznej ostatniego fragmentu o czynnik 2 (w którąkolwiek stronę na
3 krawędziach), dając maxΔ 42.09 po przycięciu (26 różnic SVG).

**Dlaczego zaakceptowane (nieredukowalność udowodniona kontrolowanym eksperymentem).** Wszystkie sześć
wywołań `routesplines` zrzucono po obu stronach — box, wielokąt, `PL`, start,
koniec i `evs` są identyczne co do bajta, tak jak wynikowy splajn wcześniejszego (nieostatniego) wywołania;
jedyna rozbieżność jest wewnątrz `solve3` ostatniego wywołania. Samodzielne
narzędzie w czystym C wyodrębniło jedyną zmienną: kompilacja z
`-ffp-contract=off` odtwarza **port** bitowo dokładnie na wszystkich 3 krawędziach; domyślna
(`on`) kontrakcja odtwarza **wyrocznię** bitowo dokładnie na wszystkich 3
krawędziach. Port zgadza się więc już ze ścisłym IEEE-754 C; rozbieżność
to w całości wybór kontrakcji FMA przez kompilator wyroczni, poniżej semantyki
kodu źródłowego C — nie ma niewierności na poziomie źródła do naprawienia. Celowana
poprawka (ręczna emulacja kontrakcji w `points2coeff`) została wypróbowana i
obalona: poprawia 2 z 3 krawędzi, ale nie trzecią, której przerzut
powstaje wewnątrz własnej kontrakcji w `solve3`. Pełna poprawka
wymagałaby programowej emulacji FMA w całym dopasowywaczu splajnów — koszt w gorącej pętli
z zasięgiem zaokrągleń w całym korpusie dla podpikselowego zysku na 3 krawędziach.
Pełna diagnoza: `plans/residual-cleanup/analysis/2646-fp-contract.md`.

**Dotyczy (historycznie):** `2620` (był structural-match, maxΔ 585; 423 różnice
na 24 ścieżkach krawędzi + 22 grotach). **Zapadł się do conformant 2026-07-11**:
wierny port przelewu bufora sąsiedztwa `sgraph` + dwukierunkowego
zawierania `chancmpid` (zob. `.agent-notes/ortho-maze-circo-rca.md`) usunął
rozbieżność; wpis akceptacji został wycofany, a ta sekcja zostaje jako
dokumentacja klasy A8.

**Co się różni.** Potok `ortho` (`splines=ortho`) jest zgodny z C co do bajta
przy identycznych wejściach — dowód przez wstrzyknięcie dokładnego wejścia labiryntu z C
(współrzędne, `xsize`/`ysize`) do etapu ortho w porcie: 378/378 trasowanych
segmentów wychodzi identycznie co do bajta, więc nic w `src/ortho` nie zawiniło.
Faktyczna rozbieżność to 1-2 ULP w *wejściu* labiryntu: `ysize` węzła (a przez
akumulację w obrębie rangi `ND_coord.y`) obliczone w pętli zakresu wierzchołków wielokąta
`poly_init` w C (`shapes.c`), która pod
`-ffp-contract=on` łączy `R.x += sidelength*cosx` w FMA o ~1
ULP większe niż ścisła arytmetyka IEEE portu (obie strony implementują
arytmetycznie identyczne wyrażenie). `2620` ma 173 węzły wielokątne o ułamkowej szerokości;
wszystkie pokazują C ≥ port o 1-2 ULP. Ten ULP jest wzmacniany — nie
wprowadzany — przez relaksację Dijkstry w `ortho`, która wiernie obcina
bieżący dystans w każdym kroku (`sgraph.c:165`, odwzorowane w porcie jako
`Math.trunc`) dla wag wyprowadzonych z surowych rozmiarów komórek
(`maze.c:257`). Geometria przesunięta o ULP przerzuca remis korytarza o równym koszcie
dla 4 trasowanych krawędzi (ścieżki + ich groty); pozostałe różnice to
przenumerowanie ±1 ścieżki jako efekt uboczny tych 4 przerzutów.

**Dlaczego zaakceptowane (nieredukowalność udowodniona kontrolowanym eksperymentem).** Samodzielne
narzędzie w C zmieniające wyłącznie `-ffp-contract` odtworzyło obie strony na
rozbieżnym wierzchołku sześciokąta: `-ffp-contract=on` → `310.29250168188713`
(zgadza się z wyrocznią), `-ffp-contract=off` → `310.29250168188707` (zgadza się z
portem), z rozbieżną operacją wyodrębnioną do wierzchołka `i=3`
(`R.x=-0.50000000000000011` połączone vs. `-0.5` niepołączone). Drugi
eksperyment ze wstrzykiwaniem wejścia (jedyna zmienna: wartości wejściowe ortho) potwierdził
wzmacniacz: podanie `orthoEdges` portu dokładnych `coord`/`xsize`/`ysize` z C
sprowadza wszystkie 4 rozbieżności korytarzy do 0 — kod ortho
nie ma defektu, jest tylko wrażliwy (tak jak własne prowadzenie C oparte na kosztach labiryntu) na przesunięcie
wejścia o 1-2 ULP. Dopasowanie oznaczałoby emulację
konkretnej kontrakcji FMA przez clang jednego skompilowanego drzewa wyrażeń w
`poly_init` — pościg za skompilowanym artefaktem, a nie przenoszenie semantyki źródła.
Pełna diagnoza: `plans/ortho-2620-residual/analysis/2620-ortho-route.md`.

**Wyjątek emulowany (nieakceptowany): `triang.c:ccw`.** Jedno miejsce
kontrakcji JEST odtwarzane bit w bit, zamiast być akceptowane: `ccw` z pathplan
kompiluje się do `fnmul`+`fmadd` (dokładny pierwszy iloczyn − zaokrąglony drugi), więc
punkt zapytania bitowo równy końcowi odcinka testuje się jako ISCW/ISCCW zamiast
ISON. `shortest.c:pointintri` odrzuca wtedy końce będące wierzchołkami wielokąta
(„destination point not in any triangle”), a `makeMultiSpline` wraca
do zwykłego prowadzenia dla każdego scalonego 2-cyklu — duże, dyskretne,
obejmujące cały korpus zachowanie, które port musi odwzorować. W przeciwieństwie do miejsc
`solve3`/`poly_init` powyżej (głęboko wewnątrz skompilowanych drzew wyrażeń, poprawka obalona), `ccw` to
pojedyncza samodzielna skompilowana funkcja o czystej semantyce, więc
`src/pathplan/triang.ts` ją emuluje: szybka ścieżka zwykłego double z
zachowawczym oszacowaniem błędu tam, gdzie znaki zwykły i połączony dowodnie się zgadzają, oraz
dokładna ścieżka z iloczynem Dekkera + diadycznym BigInt dla przypadków bliskich zeru.

---

### A9. Trygonometria libm o 1 ULP → przerzut remisu współokręgowości w CDT (multispline `circo`/`twopi`) {#a9-libm-trig-1-ulp-→-cdt-cocircular-tie-flip-circo-twopi-multispline}

**Klasa.** `Math.sin`/`Math.cos` w V8 nie są identyczne bitowo z `sin`/`cos` z libm
Apple (dowiedzione: rozbieżność 1 ULP przy `2π·4.5/8`, jednym z ośmiu kątów
narożników przeszkody-elipsy). Narożniki opisanego 8-kąta z `makeObstacle`
dziedziczą ten ULP, więc współrzędne wejściowe routera trójkątów różnią się od
wyroczni o ≤6e-14. Symetryczne układy (węzły równej wielkości w randze/pierścieniu) sprawiają, że
czworokąty routera są **dokładnie współokręgowe** w arytmetyce rzeczywistej, więc dokładny
predykat incircle leży na ostrzu noża: ULP na wejściu przerzuca jego znak,
przekątna ograniczonej triangulacji Delaunaya się przerzuca, a wielokąt korytarza, który nie przechodzi
`Pshortestpath` w wyroczni („destination point not in any triangle” →
awaryjny zwykły splajn), w porcie się udaje (lub odwrotnie). Powstałe
splajny różnią się o ~0.2–0.5pt. Sibling **A3**/**A8**: nieredukowalne
ograniczenie przenośności zmiennoprzecinkowej poniżej semantyki źródła C — dopasowanie
wymagałoby odtworzenia w JS dokładnego zaokrąglania `sin`/`cos` z libm Apple.

**Dotyczy:** `241_0` (circo Δ≈0.2 / twopi Δ płótna≈9 przez przerzut korytarza
na krawędzi `5:ne->8:nw`); `2343`, `2239`, `share-b29`, `windows-b29` (twopi,
po 1–2 różnice pozycji etykiet krawędzi — ULP libm 1 powstaje w
trygonometrii wierzchołków jednostkowych w `poly_init` (`hypot`/`atan2`/`sin`), przesuwa obliczoną
wysokość jednego węzła o ULP poza ograniczenie minimalnego rozmiaru, na którym wyrocznia ląduje
dokładnie, i kaskaduje przez `floor()` w ładowaniu R-drzewa xlabel do
pojedynczego przerzutu kandydata etykiety. Poprawka z poprawnie zaokrąglanym hypot została wypróbowana i
OBALONA: naprawiła `2343`, ale zregresowała `2168_3`, którego rozmiar ośmiokąta
przepływa przez to samo wywołanie, gdzie wartość wyroczni NIE jest poprawnie
zaokrągloną — żadna deterministyczna polityka hypot nie zgadza się z wyrocznią w obu).
`2168_1` pierwotnie należał do tej klasy, ale stał się
conformant, gdy port zaczął emulować skontraktowane fp `ccw` wyroczni
(pathplan `triang.ts`): jego niepowodzenie korytarza jest rządzone przez odrzucenie
końców-wierzchołków w `pointintri` z FMA, które port odtwarza teraz
bit w bit, więc remis ULP przekątnej CDT już tam nie wypływa.

**Dlaczego zaakceptowane (nieredukowalność udowodniona kontrolowanym eksperymentem).**
Sama CDT jest oczyszczona z zarzutów: `mkSurface` w porcie jest wiernym portem
przyrostowego wstawiania z GTS 0.7.6 (`cdt.c`: podział 1→3 + rekurencyjne
`swap_if_in_circle`, krawędzie ograniczeń tworzone wcześniej i niezamienialne,
wymuszanie ograniczeń przez `remove_intersected_*` + `triangulate_polygon`), a
samodzielne narzędzie w C linkujące **prawdziwą bibliotekę GTS** i zasilone dokładnymi bitowo
wejściami routera z portu odtwarza triangulację portu ścianka po ściance
(2168_1: 22/22; 241_0: 185/185). Dokładna wymierna ewaluacja wyznacznika incircle
na dwóch zbiorach wejść potwierdza przerzut znaku (+1 z wejściami
portu, −1 z wejściami wyroczni). Pozostałą zmienną — różnicę
trygonometrii o 1 ULP — wyodrębniono, porównując bezpośrednio wzorce bitowe `Math.sin`/`sin`.

**Akceptacja ścieżki silnika (`accepted-divergences-engines.json`).**
<a id="a9-engine-track-twopi-circo"></a> **Ścieżki silnika xdot** twopi/circo
(`parity-twopi.json` / `parity-circo.json`, natywna wyrocznia `dot -K <engine>
-Txdot`, `test/corpus/engine-walk.ts`, semantyczne porównanie operacji rysowania przy
±0.01 — zob. `test/golden/compare-xdot.ts`) ujawniają ten sam mechanizm
niezależnie od przeglądu SVG silnika dot przywołanego wyżej: twopi `2239` (1
różnica operacji rysowania — przerzut pozycji tekstu etykiety krawędzi `_ldraw_`, ten sam
ULP trygonometrii wierzchołków jednostkowych z `poly_init` kaskadujący przez łańcuch R-drzewa xlabel z `floor()`;
`2343`, `share-b29` i `windows-b29`, pierwotnie zaakceptowane
w tym wpisie, zostały *naprawione* 2026-07-11 przez wierną kontrakcję fmadd
w `polylineMidpoint` — zob. akapit o rodzinie b29 poniżej) oraz circo `241_0` (41
różnic operacji rysowania, Δ≈0.2pt na wyprowadzonym béziera krawędzi `1->2` — ten sam
przerzut korytarza z przekątną CDT; dziennik decyzji, wpis z 2026-07-10 „CDT rewritten as
faithful GTS port; 2168_3 outline-ring obstacle; 56/osage bb clobber; A9
filed”). Zaakceptowane na poziomie ścieżki silnika przez
`test/corpus/accepted-divergences-engines.json`, dołączane do
`PARITY-twopi.md`/`PARITY-circo.md` przez `parity-report.ts` — to samo złączenie, które
`accepted.ts` wykonuje dla `PARITY-dot.md` ścieżki dot.

**circo `2475_2` — remis hypot dla współokręgowego closestNode.** W jednym
28-węzłowym komponencie tego grafu o 10762 węzłach `getRotation` w circo
(`circpos.c:73-92`) wybiera węzeł bloku najbliższy początkowi układu przez
`hypot`, aby ustalić obrót podbloku. Dwa współokręgowe węzły są
praktycznie równoodległe; poprawnie zaokrąglany `Math.hypot` z V8 i `hypot` z libm
Apple zaokrąglają tę odległość o 2 ULP inaczej, co przerzuca ścisłe `<`,
wybiera inny węzeł i obraca/odbija podblok o ~20° (18 węzłów
się przesuwa, maks. 296.7pt; pozostałe 10744 węzły są identyczne bitowo, tak samo jak
drzewo bloków, kolejność okręgu i każdy `centerAngle`). Polityka CR-hypot
była już obalona dla tej klasy (2026-07-10). Samodzielna reprodukcja:
`.agent-notes/circo-2475-590-repro.dot`; pełna analiza przyczyn:
`.agent-notes/circo-b81-2475-rca.md` (zaakceptowane 2026-07-11).

**twopi `2470` — ULP współrzędnej radialnej wzmocniony przez R-drzewo xlabel.**
2470 to graf ze 140 krawędziami, którego etykiety krawędzi z HTML `<table>` skupiają się
na niemal pokrywających się kotwicach radialnych. W rodzinie neato etykiety krawędzi są umieszczane
jako etykiety zewnętrzne przez zachłanny placer xlabel (`label/xlabels.c`), który
wybiera najmniej nakładający się narożnik kandydata przez R-drzewo uporządkowane krzywą Hilberta.
Splajny i współrzędne węzłów w porcie zgadzają się z wyrocznią co do precyzji emisji
(zero różnic splajnów/węzłów/bbox nawet przy 1e-7), ale radialne
`ND_coord.y` jednego węzła różni się o ~2 ULP (`sin`/`cos` libm Apple vs `Math` V8) — daleko
poniżej poprzeczki zgodności, a jednak leży po obu stronach granicy `floor(pos.y − sz.y/2)`
dokładnie w 0 w `objplpmks`, przerzucając prostokąt R-drzewa tego obiektu o
jedną jednostkę. Zmiana porządku Hilberta/grupowania drzewa sprawia, że `RTreeSearch` przycina
inną gałąź, więc ~140 etykiet przeskakuje na sąsiedni narożnik
kandydata (każda różnica to stały krok (+szerokość, −wysokość linii)). Placer, kolejność
obiektów, zaokrąglanie prostokątów, `CombineRect` (które wiernie odwzorowuje dziwactwo
min-min z C) i 32-bitowy klucz Hilberta zostały zweryfikowane jako wierne; rozbieżność
to ULP trygonometrii radialnej z wcześniejszych etapów, nieredukowalny z tego samego powodu
co twopi `1855`. Zaakceptowane 2026-07-11; pełna analiza przyczyn:
`.agent-notes/twopi-2470-rca.md` (która dokumentuje też, że poranne
„zaliczenie” tego id było artefaktem nieaktualnej binarki wyroczni, a nie regresją
portu).

**osage `1855` — rozmazanie fp-contract wierzchołków przeszkód.** Odrębne od wpisu lustra
radialnego twopi `1855` powyżej: w osage środki węzłów są bitowo dokładne
względem wyroczni, a 110 różnic operacji rysowania to trzy krawędzie prowadzone wokół przeszkód,
umieszczone po lustrzanej stronie rzędu węzłów (X bitowo dokładne, Y odbite). Wierzchołki
ośmiokątnej przeszkody z
`circumscribed_polygon_corner_about_ellipse` (`neatosplines.c:301`) różnią się
od C o 3–4 ULP, ponieważ `-ffp-contract=on` w clang łączy łańcuchy `a·b±c`
w `ellipse_tangent_slope`/`line_intersection` w pojedyncze FMA z jednym zaokrągleniem,
podczas gdy V8 zaokrągla każdą operację: połączone zaokrąglanie C zwija kolumnę rynny wartości
x narożników do jednego identycznego bitowo double (dokładnie współliniowe),
a port rozbija ją na dwie wartości różniące się o 1 ULP. To przerzuca test
styczności widoczności `clear()` — rynna przestaje być zablokowana — dodając ~20
krawędzi widoczności, a Dijkstra rozstrzyga remis homotopii góra/dół na
stronę lustrzaną. Kontrolowany eksperyment: wstrzyknięcie dokładnych współrzędnych
przeszkód z C do poza tym nietkniętego portu daje **zero** rozbieżnych
krawędzi, całkowicie oczyszczając z zarzutów łańcuch układu legalnego, widoczności, Dijkstry i splajnów;
wstrzyknięcie samych `cos`/`sin` z libm C nic nie zmienia. Zaakceptowane
2026-07-11; pełna analiza przyczyn: `.agent-notes/osage-spline-family-rca.md`.

**Rodzina b29 (twopi).** Cztery warianty b29 dzielą jedno ostrze noża: etykieta krawędzi
`EqmtTyp` (`Node14732->Node14731`) leży na dokładnym remisie wyboru strony w placeLabels,
którego wynik zależy od dryfu układu twopi o 1 ULP w otaczających
obiektach. Przy wiernej kontrakcji fmadd w
`polylineMidpoint` (poprawka rodziny states, 2026-07-11) kotwica etykiety w porcie
jest bitowo identyczna z kotwicą wyroczni, a mimo to remis wciąż rozstrzyga się odwrotnie na
dwóch z czterech wariantów (`graphs-b29`, `linux.i386-b29`), podczas gdy pozostałe
dwa (`share-b29`, `windows-b29`) są teraz zgodne — a zaakceptowana różnica etykiety A9 dla `2343`
zniknęła całkowicie. Granica: 1 operacja rysowania, Δ12pt w y etykiety. Nieredukowalne
bez wyeliminowania dryfu z wcześniejszych etapów. Pełna analiza przyczyn:
`.agent-notes/twopi-states-rca.md`.

To samo ostrze noża placeLabels pojawia się na ścieżce **osage** (zaakceptowane
2026-07-11, pełna analiza przyczyn: `.agent-notes/osage-small-tail-rca.md`):
`linux.i386-b29` i `share-b29` (po 2 różnice operacji rysowania — kotwica x jednej etykiety krawędzi
ląduje na 878.28 vs 841.06, umieszczona symetrycznie względem
bitowo identycznego środka splajnu 859.67, tj. ±połowa szerokości etykiety; oba
warianty są swoimi lustrami) oraz `1652` (2 różnice operacji rysowania — dwie krawędzie, z których każda
przerzuca kotwicę jednej etykiety wokół identycznego środka, jedna w x, druga w y,
przy bitowo identycznych splajnach i grotach; wyrocznia renderuje całość,
więc to nie jest znany niestabilny timeout natywny). W każdym przypadku geometria krawędzi
jest bitowo dokładna, a tylko remis wyboru strony etykiety rozstrzyga się
odwrotnie w otoczeniu zdryfowanym o 1 ULP.

Ścieżka osage niesie trójkę `polypoly` (`graphs-polypoly`,
`share-polypoly`, `windows-polypoly`; zaakceptowane 2026-07-11, pełna analiza przyczyn w
`.agent-notes/patchwork-tail-rca.md`): jedyną rozbieżną operacją jest
goła funkcja przestępna `cos(π+θ)` w wierzchołku zniekształconego czworokąta o orientacji 180 —
`Math.cos` w V8 jest poprawnie zaokrąglany, podczas gdy `cos` z libm Apple niesie
błąd zależny od argumentu o ±1 ULP (więc tylko w libm `|cos(π+θ)| ≠
|cos(θ)|`); różnica rozmiaru węzła o 1 ULP zasila `GRID`/`ceil` w pack, przechyla
remis obwodu, a qsort umieszcza dwa komponenty w komórkach pakowania nawzajem — sztywna
zamiana całych węzłów bez błędu kształtu czy prowadzenia. Żadne deterministyczne
przepisanie nie odtworzy niepoprawnie zaokrąglanej funkcji przestępnej libm,
podręcznikowy kształt A9.

Ten sam mechanizm potwierdzono 2026-07-28 na większym siblingu
`tree-graphs-directed-polypoly` (`graphs/directed/polypoly.gv`, nowy w zbiorze
905 pozycji; 112 różnic operacji rysowania, tylko osage). Rozbieżną operacją
jest to samo miejsce 1 ULP `cos(π+θ)` węzła `9004` — wartości `bb.x` z C i portu
zgadzają się z oryginalną analizą przyczyn co do bajta — ale na tym 76-węzłowym wejściu
propagacja przebiega przez `arrayRects` osage: `acmpf` sortuje komórki pakowania
według surowej sumy `width+height`, a szerokość zawyżona o 1 ULP w libm sprawia, że
`9004` sortuje się ściśle przed swoimi obróconymi siblingami `9000/9002/9006`, podczas gdy
poprawnie zaokrąglona wartość z V8 zostawia dokładny remis 4-stronny, który niestabilny
qsort porządkuje inaczej — inne komórki w porządku wierszowym, zamiana `9002`/`9006`
i kaskada `fmax` szerokości kolumn przesuwająca 8 sąsiadów w x.
Podanie `arrayRects` w porcie rozmiarów węzłów z C kontra rozmiarów węzłów z portu
odtwarza 10 przesuniętych węzłów z przeglądu z zgodnymi co do bajta deltami x,
domykając łańcuch przyczynowy.

Dwa kolejne przypadki ścieżek silników zostały rozłożone na przyczyny źródłowe i zaakceptowane 2026-07-11
(pełna analiza przyczyn: `.agent-notes/circo-edge-tail-rca.md`): twopi `241_0` (6 różnic
operacji rysowania — sibling wpisu circo powyżej: ten sam remis incircle współokręgowości w CDT,
przerzucony przez 1 ULP w libm `sin`/`cos`, sprawia, że multispline w porcie
przechodzi korytarzem ze splajnem 14-punktowym, gdy kompilacja natywna
wraca do zwykłego 8-punktowego prowadzenia; różnice punktów < 0.07pt) oraz circo
`windows-tree` (10 różnic operacji rysowania na jednej krawędzi wachlarza — trygonometria rozmieszczenia w circo
lokuje `node2.y` o pojedynczy ULP powyżej `node8.y` wokół dokładnie symetrycznej
wartości 18.0, a wybór portu głowy dyna w `closestSide` przerzuca TOP/BOTTOM na
tym dokładnym remisie; pozycje węzłów i pudełka są poza tym bitowo identyczne z
wyrocznią).

**Ścieżka silnika sfdp — remisy FP krawędzi (`42`, `241_0`).**
<a id="a9-sfdp-fp-ties"></a> Ścieżka silnika xdot sfdp (`parity-sfdp.json`,
natywny `dot -Ksfdp -Txdot`, ±0.5) ujawnia remis incircle współokręgowości w CDT po
wstrzyknięciu dokładnych natywnych pozycji sprzed prowadzenia (więc rozbieżność NIE jest
dryfem iteracyjnym — zob. klasa A1-drift — lecz dyskretnym remisem predykatu):

- `42` i `241_0` — remis incircle współokręgowości w CDT (korytarz multisplajnu).
  Przy wstrzykniętych pozycjach residuum to **przerzut liczby segmentów**: `42`
  `opCount 5 vs 9` (krawędź 0->3) / `ptCount 32 vs 26` (3->7); `241_0` `ptCount 14
  vs 8` (krawędź 3->2) — przekątna ograniczonej triangulacji Delaunaya w porcie przerzuca się względem
  wyroczni, więc korytarz multisplajnu udaje się ze splajnem N-punktowym, gdzie
  kompilacja natywna wraca do krótszej zwykłej trasy (lub odwrotnie), dokładnie jak we
  wpisie twopi/circo `241_0` powyżej. Port już emuluje kontrakcję arm64
  `fmadd` w predykacie incircle/`ccw` (`src/pathplan/triang.ts`,
  `src/common/fma.ts`) i używa odpornej triangulacji Delaunaya z incircle; residuum to
  1 ULP w `sin`/`hypot` V8-vs-libm Apple w wejściu predykatu, którego żaden przenośny
  kod nie odtwarza.

> **`2095` przeklasyfikowany z A9 na A1-drift (2026-07-22).** Wcześniej był wymieniony
> tu jako „sibling hypot” (dryf poniżej 0.7pt na krawędziach węzła o pustej nazwie
> `""->"4"`). To residuum było **artefaktem narzędzia**: regex `GVTS_POS` w
> narzędziu wstrzykującym przypisanie wymagał ≥1 znaku nazwy, więc węzeł o nazwie `""` nigdy nie
> był wstrzykiwany i ciągnął za sobą dwie incydentne krawędzie. Po poprawieniu wstrzykiwacza tak, by dopasowywał
> puste nazwy (`(.+)`→`(.*)`, `src/layout/neato/splines.ts`), sfdp `2095`
> wstrzykuje się do **0 residuum** — czysty dryf siłowy, objęty wyliczaną klasą
> A1-drift, a nie remisem FP w prowadzeniu. Jego akceptacja dla id została usunięta z
> `accepted-divergences-engines.json`. (To samo ustalenie co dla fdp `2095` poniżej.)

**Świeży kontrolowany eksperyment (2026-07-21).** Sonda `hypot` natywny-vs-V8
(`plans/sfdp-tracked-divergences/batch-2/hypot-ulp-probe.txt`): kompilacja
systemowego `hypot` z C i porównanie z `Math.hypot` z Node na reprezentatywnych
wejściach odchylenia krawędzi płaskiej pokazuje rozbieżność 1 ULP w 2 z 6 (Δ 7.1e-15 i
5.7e-14) — ostrze noża progu podziału, które przerzuca liczbę podziałów.
Nieredukowalne: żaden przenośny hypot nie odtwarza libm Apple (precedens `arm-pow.ts`
dla tej samej granicy). Zaakceptowane na poziomie ścieżki silnika przez
`accepted-divergences-engines.json` (`sfdp.42`, `sfdp.241_0`).

Ścieżka silnika xdot **fdp** (`parity-fdp.json`, natywny `dot -Kfdp -Txdot`,
±0.5) ujawnia TEN SAM remis współokręgowości w CDT na tym samym grafie, `241_0`: po
wstrzyknięciu dokładnych pozycji sprzed prowadzenia z wyroczni residuum to 11 liczbowych
różnic `unfilled_bezier` ograniczonych do jednej krawędzi (`0->1#0`, maxΔ 3.39pt). Ponieważ
pozycje węzłów są wstrzykiwane identycznie, rozbieżność leży w dole łańcucha, w
korytarzu multisplajnu pathplan — ten sam remis incircle z libm o 1 ULP co
twopi/circo/sfdp `241_0` (dokładny wymierny incircle 185/185 powyżej). Dźwignie są
już zastosowane (`src/pathplan/triang.ts` fmadd, `src/pathplan/route.ts:198`
`Math.hypot`); remis jest nieredukowalny. Zaakceptowane przez `accepted-divergences-engines.json`
`fdp.241_0`. `2095` w fdp jest natomiast **A1-drift, a nie A9**: wstrzyknięcie
pojedynczego węzła o pustej nazwie (po poprawieniu wstrzykiwacza przypisania tak, by dopasowywał
węzły o nazwie `""`) sprowadza jego residuum do zera — wcześniejszy „ogon A9” to
niewstrzyknięty pusty węzeł ciągnący za sobą incydentne krawędzie. Akceptacja sfdp `2095` miała
tę samą ślepą plamę — świeża regeneracja przypisania sfdp (2026-07-22) z poprawionym
wstrzykiwaczem potwierdziła, że też wstrzykuje się do 0, a jej akceptacja została usunięta (zob.
notę `2095 reclassified` powyżej).

---

## Śledzony długi ogon (atrybuty `dot` i przypadki brzegowe) {#tracked-long-tail-dot-attribute-edge-case}

Na **ustawieniach domyślnych** silnik `dot` zgadza się z binarką C w ciasnej deterministycznej
tolerancji na korpusie golden (werdykt `conformant`; zob. notę na
początku). Pozostałe różnice to **długi ogon atrybutów i
przypadków brzegowych** — historycznie najtrudniejsza część każdego portu Graphviz. W odróżnieniu od
zaakceptowanych różnic powyżej, te *zostaną* zamknięte; są śledzone na żywo, z
liczbami, w
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md):

| Kategoria | Co się różni |
|---|---|
| **path-structure** | Prowadzenie splajnów krawędzi w określonych konfiguracjach (np. niektóre przypadki krawędzi płaskich i gęstych korytarzy). |
| **element-count** | Funkcja, która w pewnych grafach emituje więcej/mniej elementów SVG niż C. |
| **color-stroke** | Różnice w emisji obrysu/wypełnienia dla określonych atrybutów stylu. |
| **parser-gap** | Niewielka liczba wejść DOT, których parser jeszcze w pełni nie akceptuje. |

Jeśli twój graf używa tylko typowych atrybutów i silnika `dot`, prawie na pewno
jesteś na ścieżce zgodności w tolerancji deterministycznej. Jeśli układ wygląda źle, sprawdź w `PARITY-dot.md`
tę klasę wejść — to prawdopodobnie śledzona pozycja z misją naprawczą przypiętą do wyroczni,
a nie niewiadoma.

> **Uwaga o przypadkach sterowanych etykietami.** Klasa pomiaru tekstu (A2) jest zamknięta —
> żaden graf `dot` nie jest już w niej akceptowany. Graf, który dziś siedzi na
> structural-match, to śledzona luka, a nie różnica metryk czcionki.

### Groty krawędzi przeciwstawnych przy `concentrate=true` {#concentrate-true-opposing-edge-arrowheads}

Gdy `concentrate=true` scala antyrównoległą parę (`A->B; B->A`) w jedną
ocalałą krawędź, ta krawędź musi rysować grot na **obu** końcach. Jest to teraz
przeportowane (gałąź `conc_opp_flag` w `arrow_flags`; zob.
`src/common/splines-clip.ts:arrowFlags`), więc `graphs-b135`, `167` i `2087`
się zgadzają (rozbieżność `element-count` z brakującym grotem i jej skutek uboczny
`@d` nieprzyciętego splajnu zniknęły).

Niektóre grafy z concentrate **zachowują osobne, wcześniej istniejące residuum**, którego
poprawka grotów **nie** obejmuje — jest to różnica pozycji **współrzędnej x**
węzła (x-sieciowy simplex / port kompasu), a nie defekt grotu:

- **`graphs-b15`, `graphs-b69`** — duże grafy rekordów/klastrów typu „winda”.
  Concentrate aktywuje się i scala poprawnie; residuum to różnica x węzła o ~1pt,
  która wzmacnia się w różnicę `element-count`/`@d` splajnu. Sama emisja grotów
  jest teraz poprawna (b69 zyskuje brakujące wielokąty grotów). Zob.
  notę agenta `b69-concentrate-undermerge` dla przyczyny źródłowej współrzędnej x.
- **`1453`** — wciąż rozjeżdża się na przyczynie `element-count` najwyższego poziomu niezwiązanej
  z grotem `conc_opp_flag`.
- **`2825`** — w chwili tej poprawki grotów rozjeżdżał się na przyczynie
  `element-count` najwyższego poziomu niezwiązanej z conc_opp_flag (nie
  uruchamia się tam scalanie par przeciwstawnych); od tego czasu zamknięty przez misję fix-2825-rebuild-vlists,
  zob. A4 powyżej.

To są śledzone pozycje dotyczące współrzędnej x / struktury, **a nie** błędy grotów.

### Luki w wierności układu z misji wierności 2.0 (neato, sfdp, fdp, twopi, circo) {#layout-fidelity-gaps-from-the-2-0-fidelity-mission-neato-sfdp-fdp-twopi-circo}

Misja wierności 2.0 sprawiła, że nieprzeportowane wartości atrybutów kończą się głośnym błędem (zob. tabela
`UNSUPPORTED_FEATURE` w
[Błędy i wyjątki](https://github.com/knowvah/dot-engine/blob/main/docs-site/guide/errors.md)).
Zostawiła następujące kwestie, zapisane w `plans/v2-fidelity/decision-journal.md`.

**Głośne, nieprzeportowane.** `overlap=voronoi` przy nakładających się węzłach nadal rzuca
`UNSUPPORTED_FEATURE` w neato, twopi, circo i sfdp: sam adapter Voronoia
(algorytm `vAdjust`) nie jest przeportowany. Test nakładania, który decyduje,
czy rzucić błąd, jest własnym testem C (`countOverlap` na wielokątach węzłów z `poly.c`).

**Znane luki, wciąż ciche.** Port renderuje je bez błędu i
różni się od natywnego Graphviz. Znalezione przez misję `v2-silent-gaps`
(`plans/v2-silent-gaps/decision-journal.md`); to nie są zaakceptowane różnice.

- **Ostrzeżenie „Unrecognized overlap value” z `getAdjustMode` nie jest emitowane.**
- **Obrócone wierzchołki wielokątów mogą różnić się od natywnych na ostatnich bitach
  (nieredukowalne: biblioteka matematyczna hosta).** `poly_init` orientuje każdy wierzchołek przez
  `atan2`, `hypot`, `sin` i `cos`. Przy bitowo identycznych wejściach libm w macOS i
  V8 zwracają różne ostatnie bity (np. `atan2(0x3fd6a09e667f3bce,
  0xbfd6a09e667f3bca)`: libm `…21d1`, V8 `…21d2`; `hypot` w następnym wierzchołku:
  libm `…fffd`, V8 `…fffe`), więc pudełko z `orientation=20` ma w porcie wierzchołek y
  `-18`, a natywnie `-17.999999999999996`. Sam natywny Graphviz
  zmienia się z libm platformy, a przeglądarka nie może jej wywołać. Własna
  arytmetyka portu zgadza się z C (kolejność `RADIANS` ustalona; 776 z 1664 próbkowanych współrzędnych
  wierzchołków jest identycznych bitowo, reszta różni się wyłącznie przez libm). Skutek:
  werdykty `polyOverlap` dla dokładnego zetknięcia mogą się przerzucić; przy natywnych wierzchołkach każdy
  werdykt się zgadza.
- **sfdp może różnić się od natywnego w macOS (nieredukowalne: `pow` z libm hosta).**
  Zdiagnozowane za pomocą zinstrumentowanego natywnego sfdp: pozycje pozostają bitowo identyczne,
  aż jeden wyraz siły odpychającej, `pow(dist, 1 - p)` (`spring_electrical.c`,
  `p = -1`, więc `pow(x, 2)`), zwróci o 1 ulp mniej niż `x*x` z libm w macOS
  (`pow(1.4116727416983157, 2)`: libm `1.9928199296540394`, poprawnie zaokrąglone
  `…396`; w macOS `pow(v, 2) != v*v` dla 20 z 16201 próbkowanych `v`). To zmienia
  `Fnorm` iteracji na ostatnim bicie; adaptacyjne chłodzenie sfdp wzmacnia to
  do innego (często odbitego) układu. `armPow` w porcie to `pow` z optimized-routines
  ARM (glibc ≥ 2.28), czyli to, co liczy Graphviz na Linuksie;
  wyrocznia z macOS jest odmieńcem. Wykluczone: ziarno losowania (jawne wartości `start=`
  się zgadzają), `pcp_rotate` (to samo wejście daje to samo wyjście), pozycje i
  człon przyciągający (identyczne bitowo). Przykład: samotny trójkąt `a--b; a--c; b--c`
  przy domyślnym ziarnie.
- **fdp może różnić się od natywnego przez `cos`/`sin` z libm hosta.** fdp podąża za
  Graphviz po wersji 15.0.0 (odpychanie z odległością hypot, `Mlimit`), z
  `hypot` z libm hosta odtworzonym bit w bit (`src/common/libm-hypot.ts`, 0
  niezgodności na 400k próbek). 251 z 252 wejść golden renderowalnych przez fdp
  zgadza się z kompilacją natywną dokładnie; pozostałe jedno
  (`parallel-cluster-ldbxtried`) umieszcza węzły portów klastra przez
  `T_Wd * cos(alpha)`, a `cos(-2.3840764867756761)` z libm macOS jest o 1 ulp od
  `Math.cos` z V8; pętla sił fdp wzmacnia to do około 3 cali. `cos` Apple
  nie daje się odtworzyć z krótkiego modelu tak jak `hypot`.
- **Awarie natywne, które port definiuje.** Natywny Graphviz kończy się kodem 139 na neato
  `mode=KK` z `model=mds` i krawędzią `len` (`mds_model` indeksuje `GD_dist`
  numerem kolejnym liczonym od 1: przepełnienie sterty), oraz na `model=circuit` z
  grafem niespójnym. Port odrzuca komórki spoza zakresu w pierwszym przypadku i
  wraca do najkrótszych ścieżek w drugim; nie ma natywnego wyniku do
  porównania.

---

## Celowo nieprzeportowane (cele wykluczone) {#intentionally-not-ported-non-goals}

To są celowe granice zakresu, a nie błędy. Biblioteka celuje w **SVG**
(plus pośrednie formaty tekstowe `json` / `xdot` / `dot` / imagemap).

- **Inne formaty wyjściowe.** Rastrowe (PNG/JPG/GIF/WebP/BMP), PostScript/PDF/EPS
  oraz backendy GUI/interaktywne są poza zakresem. Użyj wyjścia SVG i skonwertuj
  dalej, jeśli potrzebujesz rastra.
- **Paginacja `page=` dla SVG.** Natywny `dot` również nie paginuje SVG (urządzenie
  SVG nie ustawia flagi paginacji), więc `page=` jest bez efektu na tej ścieżce w obu
  implementacjach — udokumentowane tu tylko dlatego, że jest to częste miejsce
  nieporozumień.
- **Wyjście tekstowe `-Tplain`.** Odłożone (wierny format tekstowy), a nie wykluczone.
- **`gvpr`** (język skryptowy do przetwarzania grafów) — poza zakresem.
- **Wygodne nakładki C++** (`cgraph++`, `gvc++`) — najpierw portowane jest API C;
  idiomatyczna warstwa wygody dla TypeScript, jeśli będzie potrzebna, byłaby
  osobnym pakietem.
- **`fontnames=svg|ps` w pomiarze tekstu w przeglądarce.** W przeglądarce
  miernik canvas buduje czcionkę z listy rodzin `fontnames=native` aliasu
  PostScript (`Times-Roman` → `Times, serif`), tego samego
  kroju, który emiter SVG domyślnie renderuje. `TextMeasurer` nie niesie żadnego
  kontekstu grafu, więc grafy ustawiające `fontnames=svg` lub `fontnames=ps` są mierzone
  względem listy natywnej, podczas gdy SVG nazywa rodzinę svg/ps. Wagi aliasów,
  których CSS nie definiuje (`book`, `demi`, `light`, `medium`, `roman`),
  są emitowane dosłownie, tak jak w C; przeglądarki je ignorują i renderują normalną
  wagę, a miernik mierzy normalną wagę, aby się zgadzało. Wyjście Node
  nie jest dotknięte (nigdy nie używa miernika canvas).
- **Mechanika tylko natywna** zastąpiona odpowiednikami bezpiecznymi dla przeglądarki: dynamiczne
  ładowanie wtyczek (`dlopen`) zastąpione statyczną rejestracją silników/rendererów;
  odczyty systemu plików (czcionki, obrazy, konfiguracja) zastąpione wywołaniami zwrotnymi dostarczanymi przez wywołującego
  (np. `setImageSizer`). Zachowanie jest zachowane; mechanizm się różni.

---

## Zgłoszenie rozbieżności {#reporting-a-divergence}

Jeśli znajdziesz wynik, który różni się od C i **nie** jest zaakceptowaną różnicą powyżej,
nie ma go w `PARITY-dot.md` i nie jest celem wykluczonym, to błąd wart zgłoszenia — kod
źródłowy C jest specyfikacją, a niewymienione rozbieżności są traktowane jak defekty, a nie
zaakceptowane zachowanie.
