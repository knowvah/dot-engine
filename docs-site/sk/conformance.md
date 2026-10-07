---
sourceHash: 9c653332a94ce7180323ec7cd584987db329e4217af01dd06692e410c0c22a8c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Zhoda: čo znamená „zhodovať sa“ {#conformance-what-match-means}

@knowvah/dot-engine sa validuje voči kanonickej binárke Graphviz v jazyku C ako orákulu.
Keď tento projekt hovorí, že sa graf **zhoduje** s C — verdikt parity s názvom
`conformant` —, znamená to konkrétnu, mechanicky overovanú vlastnosť, **nie**
doslovnú zhodu textu SVG bajt po bajte.

> **Definícia.** Vykreslenie z portu je **zhodné** (conformant) s vykreslením z orákula, keď
> po spracovaní oboch SVG do normalizovaného stromu elementov:
>
> 1. každá **číselná** hodnota (súradnice, údaje ciest, `points`, `viewBox`,
>    parametre `transform`) súhlasí s orákulom v rámci pevnej
>    **tolerancie** a
> 2. každá **nečíselná** hodnota (názvy značiek, farby, textový obsah,
>    kľúče atribútov, vymenované hodnoty atribútov) je **presne rovnaká**.
>
> Ak ktorákoľvek číselná hodnota presiahne toleranciu alebo sa ktorákoľvek nečíselná
> hodnota líši, vykreslenie **nie je** zhodné.

## Prečo nie doslovné bajty? {#why-not-literal-bytes}

SVG serializuje súradnice s pohyblivou desatinnou čiarkou ako desatinný text. Dve vykreslenia,
ktoré sú matematicky rovnocenné, sa môžu napriek tomu líšiť v poslednej vytlačenej číslici
kvôli zaokrúhľovaniu IEEE-754, poradiu operácií s pohyblivou desatinnou čiarkou a správaniu
`libm`/FMA závislému od platformy, ktoré sa líši podľa procesora a enginu JS. Doslovná
laťka na úrovni bajtov by preto bola naprieč runtimami, na ktoré knižnica cieli (prehliadače,
Node, rôzne procesory), nielen prísna, ale **netestovateľná**. Zhoda viaže vlastnosť, na ktorej
skutočne záleží — geometriu a obsah, ktoré vidí divák — na hranicu dosť malú na to, aby bola
nepostrehnuteľná.

## Presná tolerancia {#the-exact-tolerance}

Tolerancia platí **pre každú triedu modulov** a je definovaná v
[`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts):

| Trieda | Tolerancia (pt) | Moduly |
|---|---:|---|
| `deterministic` | **±0.01** | `dot`, `circo`, `twopi`, `osage`, `patchwork` |
| `iterative` | **±0.5** | `neato`, `fdp`, `sfdp` |

Deterministické moduly reprodukujú celočíselné/vytlačené súradnice z C v podstate presne,
takže ±0.01 pohlcuje iba šum desatinného formátovania. Iteratívne
(silovo orientované) moduly závisia od transcendentných funkcií, ktorých výsledky
v poslednom bite nie sú reprodukovateľné naprieč platformami, preto majú voľnejšiu hranicu a
dodatočne sa kontrolujú na **štrukturálnu** rovnosť (rovnaký strom elementov).

Jedno upozornenie pre povrch **plain/plain-ext**: plain tlačí súradnice v palcoch
na 5 platných číslic (`%.5g`), takže pri veľkostiach ≥ 100 sa kvantum tlače
(0.01) rovná tolerancii ±0.01. Pri veľmi veľkých grafoch sa rozdiel v rozložení
pod úrovňou jedného ULP, ktorý náhodou preklenie hranicu zaokrúhlenia piatej číslice,
vytlačí ako celý krok 0.01 a je označený, hoci podkladová
geometria je identická s presnosťou ~1e-11 pt (pozri akceptáciu circo `2108`,
žurnál 2026-07-28). Povrchy xdot/json, ktoré tlačia v bodoch, sú v tomto
rozsahu smerodajným porovnaním geometrie.

**Prieskum parity korpusu** vyhodnocuje každý graf v režime `deterministic`
(±0.01) bez ohľadu na modul — pozri
[`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
(`diffVerdict` → `compareSvg(port, oracle, 'deterministic')`).

## Prečítajte si kód {#read-the-code}

Vyššie uvedená definícia nie je prózou vyjadrená túžba — je to presne to, čo robí porovnávací
kód. Môžete si to overiť sami:

- [`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts)
  — `TOLERANCES` (tabuľka ±0.01 / ±0.5) a `compareSvg`, ktorá prechádza dva
  normalizované stromy a atribút po atribúte uplatňuje pravidlo (1) číselná hodnota
  v rámci tolerancie a pravidlo (2) nečíselná hodnota presne.
- [`test/golden/normalize.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/normalize.ts)
  — ako sa surové SVG spracuje do porovnateľného stromu elementov.
- [`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
  — `diffVerdict`, ktorá priraďuje jeden z nižšie uvedených verdiktov. `survey.ts` pokrýva
  iba stopu SVG pre `dot`.
- [`test/corpus/engine-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/engine-walk.ts)
  — prieskum **xdot** pre jednotlivé moduly (`npx tsx test/corpus/engine-walk.ts <engine>`),
  ktorý uplatňuje rovnaké rozdelenie tried ako tabuľka vyššie
  (`TOLERANCE = 0.5` pre `neato`/`fdp`/`sfdp`, `0.01` pre každý ďalší modul)
  a namiesto SVG porovnáva sémantické prúdy kresliacich operácií (`compareXdot`). Takto sa
  merajú stopy `circo`/`twopi`/`osage`/`patchwork`/`neato`/`fdp`/`sfdp`; vlastná
  stopa xdot pre `dot` používa súrodenecký nástroj
  [`xdot-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/xdot-walk.ts).

## Verdikty {#the-verdicts}

Prieskum priraďuje každému grafu presne jeden verdikt. Aktuálne počty pre jednotlivé stopy:
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)
sumarizuje každú stopu modul × povrch (deterministické aj iteratívne);
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
je dashboard SVG pre `dot` a každý ďalší modul má vedľa neho v `test/corpus/` vlastný
dashboard `PARITY-<engine>.md`:

| Verdikt | Význam |
|---|---|
| **`conformant`** | Zhoduje sa s orákulom podľa vyššie uvedenej definície (číselné hodnoty v rámci tolerancie, nečíselné presne). |
| **`structural-match`** | Rovnaký strom elementov, ale jedna alebo viac číselných hodnôt presahuje toleranciu. |
| **`diverged`** | Stromy elementov sa líšia (chýbajúci/nadbytočný element alebo nečíselný nesúlad). |
| **`errored` / `timeout`** | Port nedokázal vstup vykresliť (`errored`; `port-error` v stopách pre jednotlivé moduly) alebo prekročil svoj časový rozpočet (`timeout`). Hodnotí sa ako zlyhanie: počíta sa do menovateľa percenta úspešnosti, nikdy ako úspech. |
| **`oracle-error`** | Orákulum v C nedokázalo vstup vykresliť, takže nie je s čím porovnávať. Mimo rozsahu: vylúčené z menovateľa percenta úspešnosti. |

**Percento úspešnosti** na každom dashboarde je `conformant / (surveyed − oracle-error)`.

„Conformant“ je laťka; „structural-match“ je zmysluplný pokrok (správny tvar,
súradnice sa ešte rozchádzajú); „diverged“, „errored“ a „timeout“ sú skutočné medzery.
Nič z toho nie je tvrdením o výstupe zhodnom bajt po bajte.

Niektoré grafy nemajú pri danom module **vôbec žiadny verdikt**: pozri
*vylúčenia modulov* nižšie.

### Vylúčenia modulov {#engine-exclusions}

Vylúčená dvojica (graf, modul) sa neprechádza, takže nie je ani zhodná, ani
odchýlená — jednoducho sa tam nemeria. To sa líši od akceptovanej odchýlky, kde sa porovnanie
*uskutočnilo* a rozdiel sa odpúšťa s dokumentovanou príčinou.

Laťka je zámerne vysoko, pretože neskúmaný graf je diera v pokrytí,
a nie známa cena. Záznam vyžaduje splnenie všetkých troch podmienok: algoritmus modulu
sa na vstup preukázateľne nedokáže zapojiť, preskočenie ušetrí skutočný čas a rovnaké
správanie je overené na lacnejšej stope. Byť *pomalý* výslovne nestačí —
zlý pomer port/orákulum je presne to, ako vyzerá skutočná chyba výkonu, a vylúčenie
na jeho základe by skrylo práve to, na čo korpus slúži.

Každé vylúčenie je uvedené aj s mechanizmom v
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md#engine-exclusions);
register je `test/corpus/engine-exclusions.json`. Motivačným prípadom je
`2222`, ktorý deklaruje 28 303 uzlov a žiadne hrany: keďže nie je čo dávať do vzťahu, každý
silovo orientovaný a radiálny modul deleguje na spoločný baliaci algoritmus komponentov a
žiadny z ich vlastných algoritmov nebeží — potvrdené tým, že ich výstupy z orákula sú
bajt po bajte identické. `dot` ide inou cestou a pokrýva ho zhodne za
šesť sekúnd.
