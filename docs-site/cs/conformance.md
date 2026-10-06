---
sourceHash: 9c653332a94ce7180323ec7cd584987db329e4217af01dd06692e410c0c22a8c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Shoda: co znamená „shoduje se“ {#conformance-what-match-means}

@knowvah/dot-engine je validován proti kanonické C binárce Graphviz jako orákulu.
Když tento projekt říká, že graf se s C **shoduje** — verdikt parity nazvaný
`conformant` —, má na mysli konkrétní, mechanicky ověřovanou vlastnost, **nikoli**
doslovnou rovnost SVG textu bajt po bajtu.

> **Definice.** Výstup portace je s výstupem orákula **shodný** (conformant), když
> po naparsování obou SVG do normalizovaného stromu elementů:
>
> 1. každá **číselná** hodnota (souřadnice, data cest, `points`, `viewBox`,
>    parametry `transform`) souhlasí s orákulem v rámci pevné **tolerance** a
> 2. každá **nečíselná** hodnota (názvy tagů, barvy, textový obsah, klíče
>    atributů, výčtové hodnoty atributů) je **přesně stejná**.
>
> Pokud některá číselná hodnota překročí toleranci nebo se liší některá nečíselná
> hodnota, výstup **není** shodný.

## Proč ne doslovné bajty? {#why-not-literal-bytes}

SVG serializuje souřadnice s plovoucí desetinnou čárkou jako desetinný text. Dva
matematicky ekvivalentní výstupy se mohou přesto lišit v poslední vytištěné číslici
kvůli zaokrouhlování IEEE-754, pořadí operací s plovoucí desetinnou čárkou a
chování `libm`/FMA závislému na platformě, které se liší podle CPU a JS enginu.
Požadavek doslovné shody bajtů by proto byl napříč běhovými prostředími, na která
tato knihovna cílí (prohlížeče, Node, různé CPU), nejen přísný, ale **netestovatelný**.
Shoda zafixuje vlastnost, na které skutečně záleží — geometrii a obsah, které
divák vidí —, na mez dostatečně malou, aby byla pod hranicí vnímání.

## Přesná tolerance {#the-exact-tolerance}

Tolerance platí **pro každou třídu modulů zvlášť** a je definována v
[`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts):

| Třída | Tolerance (pt) | Moduly |
|---|---:|---|
| `deterministic` | **±0.01** | `dot`, `circo`, `twopi`, `osage`, `patchwork` |
| `iterative` | **±0.5** | `neato`, `fdp`, `sfdp` |

Deterministické moduly reprodukují celočíselné/vytištěné souřadnice z C v podstatě
přesně, takže ±0.01 pohltí jen šum při formátování desetinných čísel. Iterativní
(silově řízené) moduly závisejí na transcendentních funkcích, jejichž výsledky v
posledním bitu nejsou napříč platformami reprodukovatelné, a proto mají volnější
mez a navíc se kontroluje **strukturální** rovnost (stejný strom elementů).

Jedna výhrada pro povrch **plain/plain-ext**: plain tiskne souřadnice v palcích na
5 platných číslic (`%.5g`), takže při velikostech ≥ 100 se tiskové kvantum (0.01)
rovná toleranci ±0.01. U velmi velkých grafů se rozdíl v rozvržení pod úrovní
jednoho ULP, který náhodou přeskočí hranici zaokrouhlení 5. číslice, vytiskne jako
celý krok 0.01 a je označen, i když je podkladová geometrie shodná na ~1e-11 pt
(viz akceptace circo `2108`, journal 2026-07-28). Povrchy xdot/json, které tisknou
v bodech, jsou v tomto režimu směrodatným porovnáním geometrie.

**Průzkum parity korpusu** vyhodnocuje každý graf v režimu `deterministic`
(±0.01) bez ohledu na modul — viz
[`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
(`diffVerdict` → `compareSvg(port, oracle, 'deterministic')`).

## Přečtěte si kód {#read-the-code}

Výše uvedená definice není prózou vyjádřená aspirace — je to přesně to, co dělá
porovnávací kód. Ověřit si to můžete sami:

- [`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts)
  — `TOLERANCES` (tabulka ±0.01 / ±0.5) a `compareSvg`, který prochází dva
  normalizované stromy a atribut po atributu uplatňuje pravidlo (1) číselná
  hodnota v rámci tolerance a pravidlo (2) nečíselná hodnota přesně.
- [`test/golden/normalize.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/normalize.ts)
  — jak se surové SVG parsuje do srovnatelného stromu elementů.
- [`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
  — `diffVerdict`, který přiděluje jeden z níže uvedených verdiktů. `survey.ts`
  pokrývá pouze SVG stopu modulu `dot`.
- [`test/corpus/engine-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/engine-walk.ts)
  — průzkum **xdot** pro jednotlivé moduly (`npx tsx test/corpus/engine-walk.ts <engine>`),
  který uplatňuje stejné rozdělení tříd jako tabulka výše
  (`TOLERANCE = 0.5` pro `neato`/`fdp`/`sfdp`, `0.01` pro každý další modul)
  a místo SVG porovnává sémantické proudy kreslicích operací (`compareXdot`). Takto
  se měří stopy `circo`/`twopi`/`osage`/`patchwork`/`neato`/`fdp`/`sfdp`; vlastní
  xdot stopa modulu `dot` používá sesterský
  [`xdot-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/xdot-walk.ts).

## Verdikty {#the-verdicts}

Průzkum přiděluje každému grafu přesně jeden verdikt. Aktuální počty pro jednotlivé stopy:
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)
shrnuje každou stopu modul × povrch (deterministickou i iterativní);
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
je přehled SVG stopy modulu `dot` a každý další modul má vedle něj v `test/corpus/`
vlastní přehled `PARITY-<engine>.md`:

| Verdikt | Význam |
|---|---|
| **`conformant`** | Shoduje se s orákulem podle definice výše (číselné hodnoty v rámci tolerance, nečíselné přesně). |
| **`structural-match`** | Stejný strom elementů, ale jedna nebo více číselných hodnot překračuje toleranci. |
| **`diverged`** | Stromy elementů se liší (chybějící/přebývající element nebo nečíselný nesoulad). |
| **`errored` / `timeout`** | Portace vstup nedokázala vykreslit (`errored`; `port-error` na stopách jednotlivých modulů) nebo překročila časový rozpočet (`timeout`). Hodnoceno jako selhání: počítá se do jmenovatele procenta úspěšnosti, nikdy jako úspěch. |
| **`oracle-error`** | C orákulum vstup nedokázalo vykreslit, takže není s čím porovnávat. Mimo rozsah: vyloučeno z jmenovatele procenta úspěšnosti. |

**Procento úspěšnosti** na každém přehledu je `conformant / (surveyed − oracle-error)`.

„Conformant“ je laťka; „structural-match“ je smysluplný pokrok (správný tvar,
souřadnice se ještě rozcházejí); „diverged“, „errored“ a „timeout“ jsou skutečné
mezery. Nic z toho není tvrzením o výstupu shodném bajt po bajtu.

Některé grafy nemají u daného modulu **žádný verdikt**: viz *vyloučení modulů* níže.

### Vyloučení modulů {#engine-exclusions}

Vyloučená dvojice (graf, modul) se neprochází, takže není ani shodná, ani odlišná —
prostě se tam neměří. To se liší od akceptované odchylky, kdy porovnání *proběhlo*
a rozdíl je odpuštěn s dokumentovanou příčinou.

Laťka je záměrně vysoká, protože neprověřený graf je mezera v pokrytí, nikoli
známá cena. Záznam vyžaduje všechny tři podmínky: algoritmus modulu se na vstup
prokazatelně nemůže uplatnit, přeskočení šetří skutečný čas a stejné chování je
ověřeno na levnější stopě. Být *pomalý* výslovně nestačí — špatný poměr portace k
orákulu je přesně to, jak vypadá skutečná výkonnostní vada, a vyloučení kvůli němu
by skrylo právě to, k čemu korpus slouží.

Každé vyloučení je uvedeno se svým mechanismem v
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md#engine-exclusions);
registr je `test/corpus/engine-exclusions.json`. Motivačním případem je
`2222`, který deklaruje 28 303 uzlů a žádné hrany: protože není co dávat do
vztahu, všechny silově řízené a radiální moduly delegují na společný balič komponent
a žádný z jejich vlastních algoritmů neběží — potvrzeno tím, že jejich výstupy z
orákula jsou bajt po bajtu totožné. `dot` jde jinou cestou a pokrývá jej shodně
za šest sekund.
