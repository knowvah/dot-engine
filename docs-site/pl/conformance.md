---
sourceHash: 9c653332a94ce7180323ec7cd584987db329e4217af01dd06692e410c0c22a8c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Zgodność: co znaczy „zgodny” {#conformance-what-match-means}

@knowvah/dot-engine jest weryfikowany względem kanonicznej binarki Graphviz w C, używanej jako wyrocznia.
Gdy ten projekt mówi, że graf **jest zgodny** z C — werdykt parytetu o nazwie
`conformant` — oznacza to konkretną, sprawdzaną mechanicznie właściwość, **a nie**
dosłowną równość tekstu SVG bajt po bajcie.

> **Definicja.** Wyrenderowany przez port obraz jest **zgodny** (conformant) z obrazem wyroczni, gdy
> po sparsowaniu obu SVG do znormalizowanego drzewa elementów:
>
> 1. każda wartość **liczbowa** (współrzędne, dane ścieżek, `points`, `viewBox`,
>    parametry `transform`) zgadza się z wyrocznią w granicach ustalonej
>    **tolerancji**, oraz
> 2. każda wartość **nieliczbowa** (nazwy tagów, kolory, treść tekstu, klucze
>    atrybutów, wyliczeniowe wartości atrybutów) jest **dokładnie równa**.
>
> Jeśli jakakolwiek wartość liczbowa przekracza tolerancję albo jakakolwiek wartość
> nieliczbowa się różni, obraz **nie jest** zgodny.

## Dlaczego nie dosłowne bajty? {#why-not-literal-bytes}

SVG serializuje współrzędne zmiennoprzecinkowe jako tekst dziesiętny. Dwa
obrazy równoważne matematycznie mogą mimo to różnić się ostatnią wypisaną cyfrą
z powodu zaokrągleń IEEE-754, kolejności operacji zmiennoprzecinkowych oraz
zachowania `libm`/FMA zależnego od platformy, które zmienia się wraz z procesorem
i silnikiem JS. Poprzeczka dosłownej równości bajtów byłaby zatem dla środowisk,
na które celuje ta biblioteka (przeglądarki, Node, różne procesory),
nie tyle surowa, ile **niemożliwa do przetestowania**. Zgodność przypina to, co
naprawdę się liczy — geometrię i treść, które widzi oglądający — do granicy
na tyle małej, że jest niezauważalna.

## Dokładna tolerancja {#the-exact-tolerance}

Tolerancja jest ustalana **dla klasy silnika** i zdefiniowana w
[`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts):

| Klasa | Tolerancja (pt) | Silniki |
|---|---:|---|
| `deterministic` | **±0.01** | `dot`, `circo`, `twopi`, `osage`, `patchwork` |
| `iterative` | **±0.5** | `neato`, `fdp`, `sfdp` |

Silniki deterministyczne odtwarzają całkowite/wypisywane współrzędne z C
praktycznie dokładnie, więc ±0.01 pochłania jedynie szum formatowania dziesiętnego.
Silniki iteracyjne (siłowe) zależą od funkcji przestępnych, których wyniki
na ostatnim bicie nie są powtarzalne między platformami, dlatego mają luźniejszą granicę
i dodatkowo są sprawdzane pod kątem równości **strukturalnej** (to samo
drzewo elementów).

Jedno zastrzeżenie dla powierzchni **plain/plain-ext**: plain wypisuje współrzędne
w calach z 5 cyframi znaczącymi (`%.5g`), więc przy wielkościach ≥ 100 kwant wydruku
(0.01) równa się tolerancji ±0.01. Na bardzo dużych grafach różnica układu poniżej
jednego ULP, która akurat wypada na granicy zaokrąglenia 5. cyfry,
wypisuje się jako pełny krok 0.01 i zostaje oznaczona, mimo że leżąca u podstaw
geometria jest identyczna z dokładnością do ~1e-11 pt (zob. akceptację circo `2108`,
dziennik 2026-07-28). Powierzchnie xdot/json, które wypisują w punktach, są w tym
zakresie rozstrzygającym porównaniem geometrii.

**Przegląd parytetu korpusu** ocenia każdy graf w trybie `deterministic`
(±0.01) niezależnie od silnika — zob.
[`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
(`diffVerdict` → `compareSvg(port, oracle, 'deterministic')`).

## Przeczytaj kod {#read-the-code}

Powyższa definicja nie jest deklaracją na papierze — jest dokładnie tym, co robi
kod porównujący. Aby zweryfikować to samodzielnie:

- [`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts)
  — `TOLERANCES` (tabela ±0.01 / ±0.5) oraz `compareSvg`, które przechodzi po dwóch
  znormalizowanych drzewach i stosuje atrybut po atrybucie regułę (1) liczbowo-w-granicach-tolerancji
  oraz regułę (2) nieliczbowo-dokładnie.
- [`test/golden/normalize.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/normalize.ts)
  — jak surowy SVG jest parsowany do porównywalnego drzewa elementów.
- [`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
  — `diffVerdict`, które przyznaje jeden z werdyktów podanych poniżej. `survey.ts` obejmuje
  wyłącznie ścieżkę SVG silnika `dot`.
- [`test/corpus/engine-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/engine-walk.ts)
  — przegląd **xdot** dla każdego silnika (`npx tsx test/corpus/engine-walk.ts <engine>`),
  który stosuje ten sam podział na klasy co tabela powyżej
  (`TOLERANCE = 0.5` dla `neato`/`fdp`/`sfdp`, `0.01` dla każdego innego silnika)
  i porównuje semantyczne strumienie operacji rysowania (`compareXdot`), a nie SVG. W ten sposób
  mierzone są ścieżki `circo`/`twopi`/`osage`/`patchwork`/`neato`/`fdp`/`sfdp`; własna
  ścieżka xdot silnika `dot` używa siostrzanego narzędzia
  [`xdot-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/xdot-walk.ts).

## Werdykty {#the-verdicts}

Przegląd przyznaje każdemu grafowi dokładnie jeden werdykt. Aktualne liczby dla każdej ścieżki:
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)
zbiera każdą ścieżkę silnik × powierzchnia (zarówno deterministyczne, jak i iteracyjne);
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
to panel SVG silnika `dot`, a każdy inny silnik ma obok, w `test/corpus/`, własny
panel `PARITY-<engine>.md`:

| Werdykt | Znaczenie |
|---|---|
| **`conformant`** | Zgadza się z wyrocznią według powyższej definicji (wartości liczbowe w granicach tolerancji, nieliczbowe dokładnie). |
| **`structural-match`** | To samo drzewo elementów, ale jedna lub więcej wartości liczbowych przekracza tolerancję. |
| **`diverged`** | Drzewa elementów się różnią (brakujący/dodatkowy element albo niezgodność wartości nieliczbowej). |
| **`errored` / `timeout`** | Port nie zdołał wyrenderować danych wejściowych (`errored`; `port-error` na ścieżkach poszczególnych silników) albo przekroczył budżet czasu (`timeout`). Liczone jako porażka: wchodzi do mianownika wskaźnika zaliczeń, nigdy jako zaliczenie. |
| **`oracle-error`** | Wyrocznia w C nie zdołała wyrenderować danych wejściowych, więc nie ma odniesienia do porównania. Poza zakresem: wyłączone z mianownika wskaźnika zaliczeń. |

**Wskaźnik zaliczeń** na każdym panelu to `conformant / (surveyed − oracle-error)`.

„Conformant” to poprzeczka; „structural-match” to znaczący postęp (właściwy kształt,
współrzędne wciąż się rozjeżdżają); „diverged”, „errored” i „timeout” to realne luki.
Żadne z nich nie jest deklaracją wyniku zgodnego bajt po bajcie.

Niektóre grafy nie mają **żadnego werdyktu** dla danego silnika: zob.
*wyłączenia silników* poniżej.

### Wyłączenia silników {#engine-exclusions}

Wyłączona para (graf, silnik) nie jest przechodzona, więc nie jest ani zgodna,
ani rozbieżna — po prostu nie jest tam mierzona. Różni się to od zaakceptowanej
rozbieżności, w której porównanie *się odbyło*, a różnica jest wybaczona
z udokumentowaną przyczyną.

Poprzeczka jest celowo wysoka, ponieważ niezbadany graf to luka w pokryciu,
a nie znany koszt. Wpis wymaga spełnienia wszystkich trzech warunków: algorytm
silnika dowodnie nie może zadziałać na tych danych, pominięcie oszczędza realny
czas, a to samo zachowanie jest zweryfikowane na tańszej ścieżce. Bycie *wolnym* wyraźnie
nie wystarcza — kiepski stosunek portu do wyroczni to dokładnie to, jak wygląda prawdziwa
wada wydajności, a wyłączenie z tego powodu ukryłoby właśnie to,
do czego służy korpus.

Każde wyłączenie jest wymienione wraz z mechanizmem w
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md#engine-exclusions);
rejestr to `test/corpus/engine-exclusions.json`. Motywujący przypadek to
`2222`, który deklaruje 28 303 węzłów i zero krawędzi: skoro nie ma czego powiązać, każdy
silnik siłowy i radialny deleguje pracę do wspólnego pakera komponentów
i żaden z ich własnych algorytmów nie działa — potwierdza to fakt, że ich wyniki
z wyroczni są identyczne co do bajta. `dot` idzie inną ścieżką i obsługuje ten graf zgodnie w sześć
sekund.
