---
sourceHash: 292491e2ebc9280dc60b10bc0e3f5bd75e3bf355f8e732d90f86b8fa35a07f40
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Známe odchýlky od C Graphviz {#known-divergences-from-c-graphviz}

@knowvah/dot-engine sa snaží o čo najvernejšiu zhodu s kanonickou implementáciou
v C. Zdrojový kód v C je špecifikácia; neuvedený rozdiel
sa považuje za chybu, nie za akceptované správanie.

> **Čo tu znamená „zhoda“.** Verdikt parity korpusu s názvom `conformant`
> je **tesná deterministická tolerancia**, *nie* doslovná zhoda SVG bajt po
> bajte: číselné súradnice a cesty sa musia zhodovať v rámci **±0.01** a všetok
> nečíselný obsah (značky, farby, text) musí byť presne rovnaký
> (`compareSvg(…, 'deterministic')`). V celom tomto dokumente sa „zhoda“ a
> „zhodný“ vzťahujú na tento verdikt tolerancie. Úplná
> definícia: [Zhoda](./conformance.md).

Tam, kde sa výstup *skutočne* líši, spadá presne do jednej z troch tried:

1. **Akceptované odchýlky** — rozdiely, ktoré sme preskúmali, pochopili až po
   koreňovú príčinu a **zámerne sme sa rozhodli nerobiť ich zhodnými**. Každá je
   ohraničená, charakterizovaná a nižšie zdôvodnená. Nie sú to chyby a nebudú
   „opravené“ bez konkrétneho, samostatne vymedzeného dôvodu.
2. **Sledovaný dlhý chvost** — známe medzery, ktoré *budú* uzavreté, každá s
   opravou ukotvenou v orákule. Tie sa so živými počtami vedú v
   [`test/corpus/PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md).
3. **Necieľové oblasti** — zámerné hranice rozsahu (formáty a mechanizmy, ktoré sme
   nikdy nemali v úmysle reprodukovať).

Smerodajné, priebežne aktualizované záznamy sú
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
(dashboard parity po jednotlivých vstupoch voči natívnemu `dot`) a
[`plans/port-catalog/README.md`](https://github.com/knowvah/dot-engine/blob/main/plans/port-catalog/README.md)
(inventár stavu portovania na úrovni algoritmov).

**Strojovo čitateľným** zdrojom pravdy o tom, ktoré grafy sú *akceptované* (trieda 1
nižšie), je
[`test/corpus/accepted-divergences.json`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/accepted-divergences.json).
Nástroje ho pripájajú v čase generovania reportu: `PARITY-dot.md` oddeľuje **akceptované
odchýlky** od **sledovaného** nevybavenia a brána pravidiel z neho preberá svoj
zoznam povolených. Prózové oddiely nižšie vysvetľujú každý záznam (A1 a A3 sú živé;
A2 je uzavretý a ponechaný ako história); test v CI (`accepted-divergences.test.ts`) zaisťuje, že
každý akceptovaný graf sa stále líši, takže tento zoznam nemôže nepozorovane
zastarať.

---

## Akceptované odchýlky (zámerne ich nerobíme zhodnými) {#accepted-deltas-we-deliberately-do-not-make-conformant}

Odchýlku akceptujeme — namiesto naháňania sa za paritou na úrovni bajtov — iba vtedy, keď platia **všetky**
nasledujúce podmienky:

- Koreňovou príčinou je **obmedzenie prenosnosti** (niečo, čo runtime
  JavaScriptu/prehliadača nedokáže presne reprodukovať), nie logická chyba portu.
- Rozdiel je **nepostrehnuteľný** a preukázateľne **ohraničený**.
- Oprava by mala **neprimerané náklady a dosah** v porovnaní s
  prínosom (typicky: dotkla by sa zdieľanej primitívy používanej stovkami
  už zhodných grafov a riskovala by regresie kvôli zisku zlomku pixelu).

Keď odchýlku akceptujeme, charakterizujeme ju tu, aby spotrebitelia nikdy neboli prekvapení.
Grafy zasiahnuté akceptovanou odchýlkou sa validujú voči **štrukturálnej /
tolerančnej** laťke namiesto laťky na úrovni bajtov.

### A1. Determinizmus pohyblivej desatinnej čiarky (silovo orientované moduly) {#a1-floating-point-determinism-force-directed-engines}

**Dotknuté:** `neato`, `fdp`, `sfdp`, `circo`, `twopi`, `osage` (iteratívne
moduly založené na pružinovom modeli). *Rozloženie* modulu `dot` týmto
determinizmom iteratívneho modelu **nie je** dotknuté; samostatná, úzko ohraničená odchýlka
pohyblivej desatinnej čiarky pri vedení splinov v `dot` je popísaná nižšie v **A3**.

> **Rozsah, historicky nezmeraná výhrada — teraz čiastočne zmeraná.**
> **Hlavný prieskum SVG pre modul dot** (`test/corpus/survey.ts`) je stále
> **iba pre dot**: natívne orákulum beží pod `GVBINDIR=/tmp/ghl`, ktorý
> symbolicky prepája **iba** pluginy `core` + `dot_layout`
> (`test/corpus/gen-headless-gvbindir.sh` prechádza presne `core dot_layout`
> — nie je prítomný žiadny plugin rozloženia `neato`/`fdp`/`circo`/`twopi`/`osage`/`sfdp`),
> a orákulum aj port sa spúšťajú s modulom `dot`. Takže id korpusu
> ako `*_neato` / `*_circo` / `root_twopi` sú v tomto prieskume *názvy súborov* rozložené
> modulom `dot`, nie ich natívnym modulom, a A1 sa tam zhoduje s **nulou**
> grafov — nie preto, že by moduly boli preukázateľne zhodné, ale preto, že
> tento konkrétny prieskum ich nikdy nepoužíva.
>
> **Všetkých šesť modulov A1 však má teraz vlastný prieskum natívneho modulu** cez
> `test/corpus/engine-walk.ts` + `parity-report.ts` (nezávislý od `GVBINDIR` —
> každý spúšťa priamo `dot -K <engine> -Txdot`), na dvoch rôznych úrovniach prísnosti
> zdokumentovaných samostatne nižšie: `circo`/`twopi`/`osage` bežia s rovnakou
> **deterministickou toleranciou ±0.01** ako prieskum dot s triážou koreňovej príčiny po jednotlivých id
> („Akceptácia na úrovni stopy modulu“ nižšie); `neato`/`fdp`/`sfdp` bežia s
> voľnejšou **charakterizačnou toleranciou ±0.5** zatiaľ bez triáže po jednotlivých id
> („Charakterizácia iteratívnych modulov“ nižšie). Aktuálne čísla naprieč modulmi:
> [`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md).

**Charakterizácia.** Tieto moduly spúšťajú iteratívne numerické rozloženia, ktorých výsledky
závisia od zaokrúhľovania pohyblivej desatinnej čiarky — konkrétne od fused multiply-add (FMA) a
`Math.pow`, ktoré sa môžu líšiť medzi enginmi JavaScriptu a architektúrami procesorov. Port
zodpovedá poradiu operácií v C, kde sa to dá (`src/common/fma.ts`,
`src/common/arm-pow.ts`) — napr. `sfdp` sa viaže na ~6 platných číslic voči
natívnemu orákulu so zhodným PRNG a `fma` — ale presná reprodukcia identických súradníc
**nie je zaručená naprieč platformami**. Topológia sa zachová; potenciálna
odchýlka je v jemných súradniciach uzlov.

**Prečo akceptované.** Toto je tvrdé obmedzenie behu v JS, nie dizajnové rozhodnutie
— z tej istej rodiny ako citlivosť A3 na `hypot` od Apple. Neexistuje spôsob, ako zaručiť
bitovo identické výsledky transcendentných funkcií/FMA vo všetkých cieľových runtimoch, takže laťka
na úrovni bajtov by bola skôr netestovateľná než len drahá. **Posúdenie A1** (na rozdiel od
pouhého upozornenia naň) si vyžiadalo samostatnú stopu parity natívnych modulov — vytvorenú
2026-07-11 ako `test/corpus/engine-walk.ts` + `parity-report.ts`, ktorá skúma každý
vstup pod jeho vlastným modulom namiesto `dot`. Úprimným stropom tejto práce je
**zúžiť** A1 na „žiadna aktívna odchýlka na referenčnej platforme“, nikdy neodstrániť
medziplatformovú výhradu; doterajšie výsledky (nižšie) tento
strop spĺňajú: `circo`/`twopi`/`osage` odhalili a vyriešili po koreňovú príčinu niekoľko
skutočných prípadov A1/A9 a `neato`/`fdp`/`sfdp` sú teraz na 90.8/77.5/68.0 %
v rámci 0.5pt od natívneho na univerze 910 položiek, čo znamená, že portovaná
aritmetika (`fma.ts`, `arm-pow.ts`, zhodný PRNG) pre väčšinu grafov drží —
a každé zostávajúce odchýlené id je individuálne priradené injekciou (drift solvera
vs. chyba portu), a nie ponechané ako netriedený drift; pozri
charakterizáciu iteratívnych modulov nižšie.

**Akceptácia na úrovni stopy modulu: rodina šípok twopi.** <a id="a1-twopi-arrows-family"></a>
Citovaný blok vyššie opisuje prieskum SVG pre modul dot, kde sa A1 zhoduje s nulou
grafov; samostatná **stopa xdot modulu** `twopi` (`parity-twopi.json`, natívne
orákulum `dot -K twopi -Txdot`, `test/corpus/engine-walk.ts`) *beží* pod svojím
natívnym modulom a odhaľuje konkrétny, overený prípad A1 na 9 id korpusu:
`graphs-arrows`, `graphs-newarrows`, `graphs-arrowsize`, `linux.x86-arrows_dot`,
`macosx-arrows_dot`, `nshare-arrows_dot`, `share-newarrows`, `windows-newarrows`
a (pridané 2026-07-28, nové vo vesmíre 905 položiek) súrodenec z directed/
`tree-graphs-directed-oldarrows` — pričom každé sa odchyľuje na jedinej dominantnej hrane
(`Z->I` alebo `i->Z`; 12–64 rozdielov kresliacich operácií). Injekcia A/B (žurnál rozhodnutí, 2026-07-10, záznam „injection A/B verdicts:
twopi arrows family EXONERATED...“) preukázala mechanizmus priamo:
výpis vstupného `ND_pos` natívneho `spline_edges` a jeho vstreknutie do
`splineEdgesShifted` portu vytvára **plne zhodný** výstup pre
`graphs-arrows` (`Z->I` sa stane bajt po bajte identickou s orákulom, rovnaký 7/14-bodový
spline) — takže odchýlka je na 100 % drift polohy uzlov pred vedením hrán zo solvera PRISM
na odstraňovanie prekryvov v `twopi` a vedenie splinov/emisia portu sú
očistené. Viditeľným príznakom pri 6 z 8 id je preklopenie počtu bodov beziéra
(`unfilled_bezier[ptCount]: 8 vs 14`): počet fitovaných kusov
`Proutespline` je citlivý na to, na ktorú stranu hranice prekážky
dopadne odchýlená poloha uzla, takže rozdiel polohy pod úrovňou ULP po
iteratívnom riešení PRISM preklopí počet segmentov fitovaného splinu (ďalšie 2 id,
`graphs-arrowsize`/`nshare-arrows_dot`, vykazujú ten istý drift ako menší
rozdiel iba v polohe bez preklopenia počtu kusov). Akceptované na úrovni stopy
modulu cez `test/corpus/accepted-divergences-engines.json`, pripojené do
`PARITY-twopi.md` nástrojom `parity-report.ts` — rovnaké pripojenie, aké vykonáva `accepted.ts`
pre stopu dot v `PARITY-dot.md`.

Analýza príčiny `oldarrows` (2026-07-28) určila presné miesto preklopenia
príznaku počtu bodov v tejto rodine. Jeho vejár `i`–`Z`–`I` je kolineárny na priemere
kruhu a `intersect()` v pathplan `directVis` blokuje zorný lúč, keď
vrchol prekážky leží „na“ úsečke — kde tolerancia kolinearity 1e-4 vo `wind()`
spôsobí, že aj uzol vzdialený 270pt od úsečky sa počíta ako kolineárny, a
`inBetween()` (ktoré predpokladá kolinearitu) potom degeneruje na testovanie iba
**projekcie x**: vrchol blokuje práve vtedy, keď jeho x leží striktne vnútri
intervalu šírky ULP medzi súradnicami x dvoch koncových bodov. To, ktorá z dvoch
zrkadlových radiálnych hrán sa ohne, teda závisí od poradia posledného ULP
troch nominálne rovnakých hodnôt x z riešenia PRISM — C ohýba `Z->I`
(osový vrchol uzla `i` dopadne do jeho intervalu), port ohýba `i->Z`
(vrchol uzla `I` dopadne do jeho vlastného). Replikácia `directVis` offline na
vypísanej množine prekážok každej strany reprodukuje rozhodnutie každej strany presne
a vstreknutie `ND_pos` z orákula pred vedením hrán do portu dáva 0 rozdielov
(`attribution-twopi.json`) — vedenie a emisia sú bajt po bajte verné.

`1855` je radiálny/hviezdicový **zrkadlový** variant toho istého mechanizmu FP v PRISM
pred vedením hrán (akceptované 2026-07-11): jeho 31 listov je presne kokruhových, takže
hviezdicové rozloženie je zrkadlovo symetrické a odstraňovanie prekryvov v PRISM sedí na
symetricky nestabilnej rovnováhe; rozdiel 1 ULP medzi V8 a libm v `cos`/`sin` pri 5
uhloch listov v `setAbsolutePos` z `circleLayout` zvolí opačnú zrkadlovú
panvu a celé radiálne rozloženie dopadne ako presné zrkadlo orákula podľa osi x
(maximálny posun uzla 6.04pt, bb zachovaný). Injekcia A/B preukázala
oba smery: vloženie presných pozícií `circleLayout` z C do PRISM v porte
reprodukuje orákulum uzol po uzle (3e-14) a obnovenie iba 5
listových pozícií s rozdielom ULP preklopí celé rozloženie späť do zrkadla
portu. Úplná RCA: `.agent-notes/twopi-radial-drift-rca.md` (žurnál rozhodnutí
2026-07-11).

**Charakterizácia iteratívnych modulov: neato/fdp/sfdp.** <a id="a1-iterative-characterization"></a>
Na rozdiel od stôp modulov `circo`/`twopi`/`osage` vyššie, `neato`/`fdp`/`sfdp`
zatiaľ **nie sú** triedené po jednotlivých id — `engine-walk.ts` zaznamenáva pre tieto tri pole
`tolerance: 0.5` a `parity-report.ts` ich vykresľuje v samostatnej
sekcii „Iterative engines (±0.5 characterization)“ súboru
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md),
výslovne **nie je porovnateľná** s deterministickou mierou úspešnosti ±0.01 inde
v tomto dokumente. Aktuálne počty (univerzum 910 položiek; percento úspešnosti vynecháva
vstupy, ktoré orákulum v C nedokáže vykresliť, podľa [Zhody](./conformance.md)):

| modul | preskúmané | v rámci ±0.5pt | nezhodné (všetky priradené, akceptované) | chyba portu / timeout | chyba orákula |
|---|---:|---:|---:|---:|---:|
| `neato` | 910 | 826 (90.8%) | 83 | 1 | 0 |
| `fdp`   | 910 | 703 (77.5%) | 204 | 0 | 3 |
| `sfdp`  | 910 | 619 (68.0%) | 290 | 1 | 0 |

(Prvý prieskum, 2026-07-11 pri 762 položkách, nameral 263/311/260 v rámci
±0.5pt — skok na súčasné miery spôsobili opravy po jednotlivých id pristáté odvtedy,
najmä neportované spracovanie `user_pos`/`P_SET` v neato, konsolidácia
inicializácie modulov a oprava `setEdgeType` makro-vs-funkcia.)

Na rozdiel od prvého prieskumu je teraz každý odchýlený riadok individuálne priradený:
injekčný nástroj (`test/corpus/attribute-divergence.ts`) vkladá
`ND_pos` z natívneho orákula pred vedením hrán do portu a znovu porovnáva
a každé súčasné odchýlené id je buď `drift-exonerated` (vedenie
a emisia portu reprodukujú orákulum presne, keď sa drift solvera odstráni),
alebo jedným z hŕstky samostatne akceptovaných zvyškov po jednotlivých id (`241_0` —
väzba incircle v CDT na všetkých troch moduloch, neato `2239`, sfdp `42`/`2556`).
Akceptácia triedy nižšie formalizuje množinu očistených; živé počty v
dashboardoch jednotlivých modulov
([`PARITY-neato.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-neato.md),
[`PARITY-fdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-fdp.md),
[`PARITY-sfdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-sfdp.md)).

**Akceptácia triedy A1-drift (iteratívne moduly, vypočítané členstvo).**
<a id="a1-drift-iterative-engines"></a> `test/corpus/accepted-divergences-engines.json`
obsahuje pre každý iteratívny modul (`neato`,
`fdp`, `sfdp`) jeden záznam **triedy** `"A1-drift"` — `{ class: true, attributionFile, ref }` — odlišný od
záznamov po jednotlivých id používaných stopami `circo`/`twopi`/`osage` vyššie (D2,
`plans/iterative-parity-campaign/decisions.md`). Na rozdiel od záznamu po jednotlivých id sa
členstvo v triede v registri nikdy neenumeruje ručne: `parity-report.ts`
ho vypočíta v čase generovania reportu z príslušného `attribution-<engine>.json`
(injekčný atribučný nástroj T1, `test/corpus/attribute-divergence.ts`)
— každé odchýlené id, ktorého natívne `ND_pos` pred vedením hrán bolo vstreknuté do
portu a znovu porovnané a zhoduje sa pri ±0.5, dostane v tom súbore `verdict: 'drift-exonerated'`,
čo znamená, že iteratívne solvery oboch modulov skonvergovali k
numericky odlišným, ale každé samo o sebe konzistentným rozloženiam (rozdiel v akumulácii
pohyblivej desatinnej čiarky podľa charakterizácie A1 vyššie, nie chyba vedenia hrán
alebo emisie v porte). Dôkazy po jednotlivých id — tvar koša, počet rozdielov základu vs. po injekcii,
detekcia rovnomerného posunu/zrkadlenia — žijú v samotnom atribučnom
artefakte, nie sú duplikované do tohto dokumentu ani do registra (D2). Id,
ktoré neskôr začne prechádzať úplne, alebo ktorého re-atribúcia zmení verdikt,
vypadne z triedy automaticky pri ďalšom pregenerovaní reportu — netreba žiadnu úpravu zastaranej
akceptácie a nezlyhá žiadny stráž-test. Moduly, ktorých
`attribution-<engine>.json` ešte nebol vygenerovaný, vykreslia triedu ako
„attribution pending“ s nulou členov, identicky, ako keby nemali žiadnu akceptáciu
— záznam triedy smie predchádzať svojim údajom (pozri
`test/corpus/accepted-divergences-engines.test.ts`).

### A2. Meranie textu (fontové metriky) → rozloženie riadené popiskami — UZAVRETÉ <a id="a2-text-measurement-font-metrics-→-label-driven-layout-—-closed"></a> {#a2-text-measurement-font-metrics-label-driven-layout}

**Stav (2026-07-01): uzavreté.** Pod touto triedou už nie je akceptované žiadne id
korpusu; oddiel sa ponecháva ako historická dokumentácia mechanizmu a
zásuvného bodu `TextMeasurer`, ktorý ho neutralizoval.
Postupné opravy merania textu (prechod na `EstimateTextMeasurer`,
vertikálne metriky citlivé na font, oprava bajtov UTF-8 mimo ASCII) vyriešili takmer
každú odchýlku rozloženia riadeného popiskami, ktorá tu kedysi bývala. **`proc3d`** —
bývalý kanonický príklad A2 — je plne **`conformant`** vo všetkých troch
adresároch korpusu (`graphs-`/`share-`/`windows-proc3d`): zhodný bbox, nula
rozdielov v údajoch ciest, nula rozdielov v kotvách popiskov.

**Posledné členy vyradené (2026-07-01).** **Rodina `NaN`**
(`graphs-NaN` / `share-NaN` / `windows-NaN`) sa tu viedla ešte dlho po tom, ako jej
geometria uzlov už presne zodpovedala C (76/76 referenčných bodov). Jej skutočný
zvyšok — 8 koncových bodov priamych hrán na štyroch protiľahlých dvojiciach 2-cyklov
(`Target↔TThread`, `Interp↔InterpF`, `Event↔Target`,
`AtomProperties↔NRAtom`) posunutých o 6–14 pt — bol znovu diagnostikovaný a ukázalo sa, že
**nejde vôbec o efekt fontových metrík**, ale o dve chyby portu vo vedení
viacnásobných hrán v dot (misia `plans/fix-nan-a2-retire/`,
`.agent-notes/nan-edge-endpoint-diagnosis.md`):

1. **Poradie pruhov protiľahlých dvojíc.** Port prerádil každú skupinu
   paralelných hrán podľa pôvodnej poradovej hodnoty vytvorenia pred priradením posunov pruhov Multisep; C
   priraďuje pruhy v zozbieranom poradí edgecmp (dopredný reprezentant MAINGRAPH
   prvý, spätný člen AUXGRAPH druhý — `dotsplines.c:419`,
   `make_regular_edge:1885-1907`). 2-cyklus, ktorého spätný člen bol
   deklarovaný ako prvý, kreslil každú hranu v 18pt koridore tej druhej.
2. **Falošná plochá susednosť pri zlúčených hranách medzi radmi.** `markAdjacent`
   označoval záznamy `ND_other` bez stráže na rovnaký rad z C
   (`flat.c:272-276`), čo dovolilo skratu plochej susednosti v `groupSize`
   pohltiť zlomy skupín portcmp.

Po verných opravách oboch je rodina **`conformant`** vo všetkých troch
adresároch (po elementoch: uzly 0, hrany 0 sa líšia) a rovnaký mechanizmus
uzavrel `42`, `clust2`, `ngk10_4` (structural-match → conformant) a posunul
`b124` z diverged na structural-match — všetko na dvojiciach 2-cyklov/paralelných hrán.

**Obe strany prieskumu používajú ten istý odhadca — meranie je neutralizované.**
Natívne orákulum `dot` beží pod bezhlavým `GVBINDIR`
(`test/corpus/gen-headless-gvbindir.sh` → `/tmp/ghl`), ktorý symbolicky prepája iba
pluginy `core` a `dot_layout` — žiadny textový plugin `gd`/`pango`/`quartz`.
Keď je tento slot prázdny, graphviz sa vráti k svojmu vstavanému
`estimate_textspan_size`. `EstimateTextMeasurer` v porte v TypeScripte
(`src/common/textmeasure.ts`) je verný port tej istej rutiny a je
predvolený pre Node, rozhoduje o ňom `createMeasurer()`
(`src/common/textmeasure-factory.ts`). **Obe strany každého porovnania parity
teda merajú text identickým odhadcom** — skutočné posuny glyfov z FreeType/pango
do porovnania nikdy nevstupujú. Preto regresia verdiktu tu ukazuje na kód
rozloženia, nie na font, a preto oprava vlastných chýb odhadcu (počítanie bajtov UTF-8,
citlivosť vertikálnych metrík na font) uzavrela väčšinu tejto triedy úplne, a nie iba
zúžila medzeru vo fontových metrikách.

**Zásuvný bod `TextMeasurer`.** Táto neutralizácia je možná len preto,
že meranie textu je zámerný zásuvný bod, nie pevne zadrôtované do žiadneho
z modulov. `TextMeasurer` je rozhranie s jednou metódou (`measure(text, font, size,
flags) → {w, h, …}`) vstrekované závislosťou do každého miesta, ktoré určuje veľkosť popiskov —
`polyInit`, `recordInit`, `initEdgeLabels` a `buildNodeLabel` preberajú
merač ako parameter; nič nemeria text cez globál. Pre testy/CI sa pripína cez
`setTextMeasurer(...)` alebo `GV_TEXT_MEASURER=estimate`.
Zásuvný bod tiež umožňuje *dokázať*, že zvyšok je čisto meraním: podajte portu
presné šírky, ktoré nameralo C (zachytené z orákula), a skontrolujte, či rozloženie
potom reprodukuje C presne. Tento pokus pôvodne oprávnil
verdikt A2 pre `proc3d` (pozri historickú prílohu nižšie) — technika
zostáva platná. Jej inverzia triedu vyradila: keďže meranie bolo
preukázateľne neutralizované na oboch stranách prieskumu, zvyšok hrán `NaN` nemohol
byť efektom fontových metrík, čo vynútilo opätovnú diagnostiku, ktorá našla dve
chyby vedenia hrán vyššie.

::: details Historická analýza (prekonaná 2026-06-30) — ponechaná pre záznam
Materiál nižšie popisuje skorší stav tejto triedy, predtým než ju
väčšinou uzavreli prechod na `EstimateTextMeasurer`, vertikálne metriky citlivé na font a
oprava bajtov UTF-8 mimo ASCII. Už nepopisuje súčasné
správanie — ponechané iba preto, aby sa nestratila úvaha, ktorá nás sem priviedla. Konkrétne:
(1) čísla šírok „natívneho C“ v tabuľke merania nižšie sú
hodnoty **FreeType** z cesty vykresľovania so skutočným fontom; prieskum parity
túto cestu nikdy nepoužíva — obe strany spúšťajú `estimate_textspan_size` (pozri
vyššie) — takže tabuľka neodráža, ako sa parita v súčasnosti meria; (2)
obrázky s prekrytím a vykreslenia golden/naše nižšie zobrazujú `proc3d` **mimo korpusu**
 (`graphs/directed/proc3d.gv`, ~2620 pt), ktorý nie je súčasťou
prieskumu parity; varianty `proc3d` z korpusu sú teraz zhodné s nulou
rozdielov, takže pre ne niet prekrytia, ktoré by sa dalo ukázať; (3) rozprávanie
o posune x uzlov `NaN`/`ratio=compress` nižšie je prekonané — súčasné meranie ukazuje, že všetkých 76 bodov uzlov
sa zhoduje presne, takže reťaz chyba šírky → posun uzla, ktorú opisuje,
pre `NaN` už neplatí.

**`NaN` pri `ratio=compress` (historické).** Rodina
`NaN.gv` (`orientation=landscape; ratio=compress; size="16,10"`) bola
prípadom A2, ktorého verdikt vtedy pristál na *diverged* namiesto
*structural-match*. Cesta compress pre x v sieťovom simplexe bola verná — každý
vstup obmedzení zodpovedal C (hodnota obmedzenia šírky, minlen pre `containNodes`,
počty pomocných hrán 471/wt 1612, `lrBalance` aj poradia v rade boli všetky identické)
*okrem* polovičných šírok 9 uzlov, ktoré merač hlásil o 0.5–1.03 pt
širšie než C. Balenie `ratio=compress` s váhou 1000 spravilo normálne voľné
ľavo-pravé separačné obmedzenia **viažucimi**, takže tá podpixelová chyba šírky
— bez compress neviditeľná — vyplávala ako vnútorný posun x o −3..−5 pt. Tento posun prevážil
priamy spline `Target<->TThread` o 0.55 pt
za stenu rámčeka uzla, takže smerovač ho ohol do ďalšieho kusa beziéra (7
bodov oproti 4 v C) — *štrukturálny* rozdiel, teda *diverged*. Vynútenie 9 šírok
na hodnoty z C reprodukovalo C presne (uzol-x 53/76→0/76 mimo; spline 7→4 body),
čo potvrdilo, že zvyšok bol na 100 % z fontových metrík na vstupe (upstream), nie z kódu compress ani
splinov, **pre túto bývalú odchýlku**. Úplné dôkazy (s vizuálnym porovnaním
golden vs. naše vedľa seba + prekrytím rozdielu splinu 4 vs. 7 bodov):
`plans/fix-compress-xcoord/comparisons/nan-compress-xcoord.html` (prózový
rozbor: `…/nan-compress-xcoord.md`).

**Príklad merania fontových metrík (historické — FreeType vs. odhad).**
Natívny Graphviz, keď beží so skutočným textovým pluginom (nie s bezhlavým
orákulom použitým prieskumom parity), meria text posunmi glyfov FreeType/libgd.
`EstimateTextMeasurer` v porte nereplikuje rasterizér glyfov. Pri väčšine reťazcov
sa obe zhodujú presne; pri niektorých sa líšia o zlomok bodu. Zmeraný príklad — Times-Roman 14 pt, reťazec
`"/home/ek/work/src/lefty/lefty.c"` (31 znakov):

| | šírka |
|---|---|
| natívne C (FreeType) | 176.00 pt |
| @knowvah/dot-engine (odhad) | 176.75 pt |
| rozdiel | **+0.75 pt (+0.43%)** |

Druhý riadok popisku toho istého uzla, `"93736-32246"`, sa zmeral **identicky**
(96.00 pt na oboch stranách) — chyba závisí od reťazca a hromadí sa po jednotlivých glyfoch,
nie je to rovnomerný mierkový faktor. Tento rozdiel FreeType vs. odhad je skutočný, ale
**nie je** tým, čo meria prieskum parity (obe strany používajú `estimate`); záležal by
iba vtedy, keby sa výstup @knowvah/dot-engine porovnával so
skutočným vykreslením v C so skutočným fontom mimo tohto prieskumu.

**Následný efekt na bývalú odchýlku `proc3d` (historické).** Šírka popisku
určuje veľkosť uzla, ktorá určuje rozloženie:

1. Širší popisok → o niečo širší rámček uzla (pri uzle typu *elipsa* sa šírka
   ďalej násobí √2, takže +0.75 pt textu → +0.53 pt polovičnej šírky).
2. Polovičné šírky uzlov určujú ľavo-pravé separačné obmedzenia sieťového simplexu
   pre súradnicu x; tieto obmedzenia sa zaokrúhľujú `ROUND()` na
   celé čísla, takže podpixelová zmena šírky môže prevážiť obmedzenie z *N* na
   *N+1*.
3. Sieťový simplex potom zvolí iné — ale rovnako optimálne —
   celočíselné priradenie x, čím posunie niektoré polohy x uzlov o 1–2 jednotky.

Pre `proc3d.gv` mimo korpusu (`graphs/directed/proc3d.gv`, ~2620 pt, nie člen
prieskumu parity) to vyvolalo rozdiel **≤ 3.55 pt** v rozsahu x
(**0.13%**), prekrytý nižšie — **zelená = natívny C `dot` (golden), červená =
@knowvah/dot-engine (naše)**:

![Prekrytie proc3d golden vs. naše: zelená = C, červená = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Pri priblížení sa lem objavoval takmer výlučne na dlhých ovalových
popiskoch s cestami k súborom:

![Prekrytie proc3d priblížené na široké ovály s popiskami ciest: zelená = C, červená = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

| Golden — natívny `dot` | Naše — @knowvah/dot-engine |
|---|---|
| ![proc3d vykreslený cez C Graphviz](/img/proc3d-golden.svg) | ![proc3d vykreslený cez @knowvah/dot-engine](/img/proc3d-ours.svg) |

Samostatný rozbor (koreňová príčina, čísla po jednotlivých metrikách, príkaz na reprodukciu)
je na vlastnej stránke:
[**proc3d — kanonická odchýlka A2 vo fontových metrikách (historická)**](/sk/divergences-proc3d-a2).
Táto stránka opisuje vyriešenú odchýlku na vstupe mimo korpusu; súčasné
varianty `proc3d` z korpusu sú zhodné.

**Prečo to bolo vtedy akceptované.** Zhoda posunov jednotlivých glyfov FreeType
bajt po bajte pre každý font a reťazec by si vyžadovala replikovať jeho
tabuľky metrík, hinting a zaokrúhľovanie — veľké, krehké a stále
nezaručene presné. Merač textu je zdieľaná primitíva: každý popisok
v korpuse ňou prechádza, takže oprava zameraná na jeden reťazec riskovala regresiu
iných kvôli nepostrehnuteľnému prínosu.
:::

### A3. Rozhodovanie remízy pri `hypot` vo vedení splinov (`dot`) {#a3-hypot-tie-break-in-spline-routing-dot}

**Dotknuté:** grafy `dot` s **geometricky symetrickým** kanálom pre vedenie hrán
— typicky krátky, symetrický oblúk ploché hrany. Pozorovaný príklad: `2368`,
ktorý zostáva na *structural-match* (maxΔ ≈ 10.2 pt na **jednej** hrane, `376->76`).
Rovnaké rozhodovanie remízy sa objavuje aj na **dlhej** (viacradovej) hrane do
uzla-hubu s vysokým vstupným stupňom, keď je koridor presne zrkadlovo symetrický: `graphs-b100` /
`graphs-b104` (identický zdroj) sa líšia o maxΔ 20 (presne jeden riadok radu) na
jedinom uzle `Node23730->Node23729` — každá poloha uzla a celá predchádzajúca
štruktúra boxov/polygónov/napnutej cesty je bajt po bajte identická s C; líši sa iba
~1-ULP voľba `findMaxDev`, ktorý zrkadlovo symetrický vnútorný bod sa stane uzlom beziéra.
Krátka forma ploché hrany sa objavuje aj ako `241_1` (structural-match,
maxΔ ≈ 2.4 pt) — odchýlený súrodenec orákulom pripnutého `241_0`, pri ktorom šum C
naopak ponecháva prvý. Rovnaké rozhodovanie remízy vytvára rozdelenie koridoru štrbiny
spätnej hrany označeného 2-cyklu v `2413_1` (structural-match, maxΔ 67.65) a
`2413_2` (maxΔ ≤99.55, keď pristane oprava T11 swapBezier-reverse — dovtedy
je nahlásené maxΔ 1922.26 súboru dominované nesúvisiacou, samostatne
sledovanou chybou), a jednu označenú hranu vnútri klastra v `graphs-decorate`
(maxΔ 43.54); v každom prípade sa dva kandidátne rohy rozdelenia rovnajú v rámci
5.7e-13 (rodina 2413) / 3e-14 (decorate), kým šum `hypot` od Apple závislý od
polohy nevyberie víťaza. `2371`
(structural-match, maxΔ 16.8) vykazuje rovnaký odtlačok na dvoch nesúvisiacich
hranách (`g[9263]` `r6837mid--r9687mid`, `g[23859]` `r38mid--r8699mid`): port
vydáva presné zrkadlo postupnosti riadiacich bodov orákula na oboch,
y uzla je preklopené o identické Δ16.8 (horný/dolný zlomok rozdelenia vymenené).
Jeho pôvod je kvalifikovaný ako istota **MEDIUM**, a nie ako POTVRDENÁ
istota ostatných členov: `2371` balí ~199 komponentov, čo
oddeľuje lokálne súradnice pathplan od súradníc stránky, takže remíza
sa nedala pri troch pokusoch o inštrumentáciu živo skorelovať s `route.ts:209`;
pôvod v segmentácii priameho režimu alebo v `recover_slack` po orezaní
nie je úplne vylúčený. Úplná diagnostika:
`plans/residual-cleanup/analysis/2371-mirror.md`. Väčšina vedených hrán
nie je dotknutá.

::: details Definícia grafu (`2368.dot`)
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

**Charakterizácia.** Fitter splinov (`Proutespline` → `findMaxDev`,
`src/pathplan/route.ts`) rozdelí fitovaný beziér vo vnútornom bode trasy
s maximálnou odchýlkou. Keď je kanál symetrický, dva kandidátne body rozdelenia
sú **presná matematická remíza** a víťaza potom určí šum
zrušenia pohyblivej desatinnej čiarky ~1e-14 pri vyhodnotení beziéra v absolútnych súradniciach,
ktorého **znamienko závisí od absolútnej polohy**.

Vzdialenosť odchýlky v C je libm `hypot` a `hypot` z macOS od Apple, ktorý
vygeneroval orákulum, je proprietárna implementácia, ktorá sa bitovo nezhoduje s **žiadnym**
prenosným `hypot` (merané voči nej v režime súradníc graphviz, miery
bitovej zhody: V8 `Math.hypot` ≈ 63 %, správne zaokrúhlený `hypot` v štýle Arm
≈ 84 %, fdlibm `hypot` ≈ 90 %, `sqrt(dx²+dy²)` ≈ 94 %). Kvôli tomuto šumu ULP
**C samo nie je konzistentné**: dva *translačne zhodné* oblúky rozdelí smerom k
**opačným** rohom. V rámci `2368` je oblúk `376->76` zrkadlovým obrazom
geometricky identického oblúka `256->436`:

```
C    376->76 : M273.31,-4.56 C268.33,-3.14 263.11,-1.9  258.11,-1.15 250.49,0     242.34,-0.98 234.83,-2.8
port 376->76 : M277.29,-4.51 C268.27,-1.69 257.65,0.32  247.89,-1.15 244.92,-1.59 241.88,-2.21 238.85,-2.94
```

Celý rozdiel, prekrytý (12× zväčšenie na oblúk `376->76` / `to1`) — **zelená = C
Graphviz, červená = @knowvah/dot-engine**. Obe sú ten istý plytký oblúk smerom nadol medzi
rovnakými hranicami uzlov; líšia sa o ~1–2 pt v brušku (stredný riadiaci bod
beziéra), kde remíza v C padla smerom k opačnému rohu:

![Oblúk 2368 376->76: zelená = C, červená = @knowvah/dot-engine](/img/2368-376to76-overlay.png)

Všetko ostatné sa zhoduje v rámci tolerancie — rovnaký ohraničujúci rámec (608×148), polohy uzlov,
popisky, šípky a všetky ostatné hrany. Úplné vykreslenia sú vizuálne
nerozoznateľné:

| C Graphviz | @knowvah/dot-engine |
|---|---|
| ![2368 vykreslený cez C Graphviz](/img/2368-c.png) | ![2368 vykreslený cez @knowvah/dot-engine](/img/2368-port.png) |

Port používa **translačne ekvivariantné** rozhodovanie remízy (skutočná remíza sa vždy rozhodne
v prospech prvého indexu), takže kreslí *každý* takýto oblúk rovnako bez ohľadu na
polohu — je samo so sebou konzistentný a zhoduje sa s C na oblúkoch, kde šum C tiež
ponecháva prvý (napr. `256->436` a `241_0 5:ne->8:nw`), a líši sa iba tam, kde šum C
preklopí na druhú stranu (`376->76`). Koncové body, cieľ šípky, ostatné
hrany, všetky uzly, popisky a ohraničujúci rámec sa zhodujú v rámci tolerancie; hýbu sa iba
vnútorné riadiace body jedného oblúka (~1–2 pt v brušku).

**Prečo akceptované.** `hypot` od Apple nie je o nič reprodukovateľnejší medzi enginmi JS a
procesormi ako FMA/`pow` z **A1** — je to rovnaké obmedzenie prenosnosti, len
v smerovači splinov `dot`. Zhoda s *polohovo závislou* voľbou C by znamenala
prevziať striktné rozhodovanie remízy z C, ktoré žije v **zdieľanej primitíve**, ktorou prechádza každá
vedená hrana: výmenou za zhodu `376->76` by sme získali *nové* nezhody na
oblúkoch, kde C dopadne inak (regresuje `241_0` a orákulový prípad
ploché hrany `cnt=3`), čisto nulový zisk, ktorý navyše obetuje translačnú
ekvivariantnosť portu. Preto ponechávame konzistentný (ekvivariantný) smerovač. Je to
ohraničená, nepostrehnuteľná odchýlka `dot` — nie otvorená chyba. Úplné vyšetrovanie:
`.agent-notes/2368-residual-flat-label-ranksep.md`.

### A4. Orákulum v uznanom pokazenom stave (rodina init_rank / pathplan) {#a4-oracle-in-an-acknowledged-broken-state-the-init-rank-pathplan-family}

**Dotknuté:** `2796` (structural-match, maxΔ 49), `2471` (structural-match,
maxΔ ~9063), `1435` (structural-match, maxΔ 503), `1581` (diverged, maxΔ 465). Členovia
rodiny `1939` a `2825` sú **conformant** a nemajú záznam, a `2470`
a `graphs-structs` sa k nim pridali 2026-07-11 (obe sa zrútili na conformant
po pristátí opráv ortho adjacency-spill/chancmpid, fmadd `polylineMidpoint` a
half-even zaokrúhľovania remíz — port teraz reprodukuje výstup obnovy orákula
presne, vrátane identických stratených hrán); ich
akceptačné záznamy sú vyradené.

`1581` a `2825` boli prípady obnovy po páde (misia fix-element-count-bucket):
vstupy z fuzzera/degenerované vstupy, kde upstreamové testy tvrdia **iba**,
že dot nespadne (`test_1581`: žiadne porušenie ASan; `test_2825`: žiadny
pád, keď `rebuild_vlists` vráti -1). C narazí na interné `Error:`
(`install_in_rank` / `rebuild_vlists: lead is null`) a jeho obnova
zahodí obsah rozloženia; port dospeje k **identickým rozhodnutiam o vymazaní
rankset** (parita varovaní overená: rovnaké názvy uzlov/grafov vo
varovaniach „already in a rankset“ z `mark_clusters`, cluster.c:317-320).

`2825` je teraz úplne uzavreté. Misia fix-2825-rebuild-vlists (po 1581)
najprv uzavrela medzeru o jednu vrstvu: port dosiahne *presný* interný stav chyby C
— bajt po bajte identický stderr vrátane poradia správ
(`Error: rebuild_vlists: lead is null for rank 1`, potom bezpredponové
pokračovanie `agerr(AGPREV, ...)` `concentrate=true may not work
correctly.`) — pričom `dotLayoutPipeline` správne šíri zlyhanie
`dot_position` tak, že preskočí `dot_splines`/`dotneato_postprocess`,
čo zodpovedá `dotLayout` v C (`if (r != 0) return r;` po `dot_position`,
dotinit.c:322-325). Nadväzujúci krok (časť 2) potom uzavrel zostávajúcu
medzeru vo vrstve vykresľovania: `emit_node` v C podmieňuje každý uzol cez `node_in_box(n,
job->clip)` (emit.c:1806-1809) a na tejto ceste prerušenia je `job->clip`
degenerovaný, pretože `GD_bb` nikdy nenastavil `set_aspect` (vnútri
preskočeného chvosta `dot_position`) — takže C vydá *nula* uzlov, iba (tiež
degenerované) rámce klastrov. Port portoval tú istú bránu `node_in_box`
(`src/gvc/device.ts:renderNode`, s použitím `job.bb`/`job.pad` ako
ekvivalentu jednej stránky pre `job->clip`) a prestal prepočítavať
hodnoverný bbox z živých polôh uzlov, keď `g.info.bb` nie je nastavené
(`src/gvc/device.ts:render`, `job.bb = g.info.bb` doslovne, zrkadliac
`gvc->bb = GD_bb(g)` z `init_gvc`, emit.c:3272) — každý modul rozloženia
už nastavuje `g.info.bb` sám pred spustením `render()` na každej ceste bez prerušenia,
takže je to na zdravých grafoch bajt po bajte identické a mení výstup
iba na tejto ceste prerušenia. `2825` je teraz `conformant` (výstup so 4 elementmi,
bajt po bajte identický s orákulom). Úplnú stopu mechanizmu
oboch častí nájdete v `.agent-notes/2825-rebuild-vlists-abort.md`. `1581` sa do
nekonzistentného stavu vôbec nedostane (*iná* upstreamová chyba
okna klastra, nie `rebuild_vlists`), takže rozloží svoj prežívajúci graf celý —
táto medzera zostáva otvorená. Výstup orákula
pre `1581` je odpad z obnovy bez upstreamom definovanej sémantiky. Dôkazy:
[`1581`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1581.md). Pri
každom z týchto vstupov je pokazené **orákulum v C**, podľa vlastných slov
graphviz: `2471`, `1939` a `1435` sú
[`xfail(strict=True)`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/tests/test_regression.py)
upstream (issues
[#2471](https://gitlab.com/graphviz/graphviz/-/issues/2471),
[#1939](https://gitlab.com/graphviz/graphviz/-/issues/1939),
[#1435](https://gitlab.com/graphviz/graphviz/-/issues/1435), por.
[#2796](https://gitlab.com/graphviz/graphviz/-/issues/2796)); jediný pokus
o opravu, [draft MR !4849](https://gitlab.com/graphviz/graphviz/-/merge_requests/4849),
zostáva nezlúčeným konceptom (naposledy upravený 2026-03-20). `graphs-structs` je
prastará trieda straty vedenia záznamových uzlov (#102/#242/#274/#1323), ktorú
stabilný graphviz 15.0.0 vykresľuje správne — regresia orákula vo vývojárskom builde.

**Čo robí C.** Pri členoch `init_rank` (`2796`, `2471`, `1939`)
pomocný graf súradníc x v natívnom dot uzatvára orientovaný cyklus cez
hrany obmedzení stien klastrov; jeho
[`init_rank`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/ns.c#L146)
nedokáže prejsť každý uzol, vypíše `Error: trouble in init_rank` a
rozloženie pokračuje z tohto stavu obnovy — pri `2471`/`2796` končí
odpadom z triangulácie `Pshortestpath` a stratenými hranami. Pri `1435` a
`graphs-structs` je pokazenou fázou samotný pathplan (slepé uličky triangulácie
orezávaním uší; stratená hrana portu záznamu).

**Vstupy overené, potom urobené vernými (toto je nosná časť).**
Misia `verify-oracle-bug-family`
([zadanie](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/README.md))
vypísala graf obmedzení, ktorý obe strany podávajú sieťovému simplexu, riadok po riadku,
pre každého člena rodiny — a zistila, že skoršie „čisté“ správanie portu pri
tejto rodine pochádzalo zo **štyroch skutočných chýb portu**, všetky opravené:

1. `flatEdges` preskakoval volanie
   [`rec_reset_vlists`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/flat.c#L333)
   z C, čím nechával okná radov klastrov zastarané po vložení vnodov
   plochých popiskov (samo toto spôsobilo, že port stratil pri `2471` **9** hrán, kde C
   stratí 6).
2. Penalizácia hrán s rovnakým `group` sa uplatňovala na slučky namiesto
   koncových bodov s rovnakou neprázdnou skupinou
   ([`dot_init_edge`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/dotinit.c#L66)).
3. `CL_CROSS` používal hodnotu `_WIN32` z C, 100; platforma orákula používa 1000
   ([`const.h`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/const.h#L141)).
4. Slepá ulička triangulácie prerušila `Pshortestpath` namiesto postupu C
   upozorni-a-pokračuj + záložná priama čiara
   ([`shortest.c:333`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/pathplan/shortest.c#L333)).

Po oprave sú výpisy obmedzení NS tejto rodiny **riadok po riadku identické** s C
(253 volaní rank2 pri `2471`; všetky volania pri `1939`/`1435`/`graphs-structs`)
a port nasleduje C cez uznanú pokazenú obnovu: rovnaké
stratené hrany (`3->16` pri 2796; identických 6 pri 2471), rovnaké stromy elementov.
`1939` sa stal plne conformant. Zvyškové číselné rozdiely (a odlišný odpad pathplan
pri 1435) sú správanie *vnútri* stavu obnovy, ktoré politika
projektu zámerne nenaháňa.

**`2723` (segfault; pripnuté, nenaháňané).** Natívny `dot` spadne so segfaultom (exit 139)
na `tests/2723.dot` (neorientovaný, skupiny `rank=same`, označené hrany), takže C nemá
žiadny výstup, s ktorým by sa dalo zhodovať. Upstreamový
[issue #2723](https://gitlab.com/graphviz/graphviz/-/issues/2723) je otvorený a
`tests/test_regression.py:test_2723` je `xfail`. Port vyhodí
`InternalError` (`INTERNAL_ERROR`, s príčinou `TypeError` z
`src/layout/dot/flat.ts:flatLabelYpos`, kde je `rank[r-1]` nedefinované). Bez
správneho orákula zostáva čestné zlyhanie a port sa nemení;
`src/layout/dot/flat-2723.test.ts` ho pripína. Ak upstream problém opraví, aktualizujte
ten test.

**Poznámka k politike.** Skoršie stanovisko A4 („port spĺňa očakávania
issue; nereplikovať“) vychádzalo z presvedčenia, že acyklický pomocný graf portu
pochádzal z neškodného lokálneho variantu. Nepochádzal — pochádzal
z chyby (1), ktorá preukázateľne zle umiestnila `2471`. Vernosť zdroju v C
zvíťazila: port teraz reprodukuje uznané pokazené výsledky C z
overene identických vstupov a každý záznam tu by sa mal **znovu zmerať,
keď upstream opraví zodpovedajúci issue** (výstup orákula
sa zmení; očakávajte, že tieto id sa pri tom upgrade rozsvietia ako regresie — to
je zámer, nie hniloba).

**Dôkazy.** Stránky porovnania po jednotlivých id (vykreslenia vedľa seba + záznamy
dôkazov):
[`2471`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2471.md),
[`1939`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1939.md),
[`1435`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1435.md),
[`graphs-structs`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/graphs-structs.md),
[`2796 post-fix addendum`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2796-post.md)
(základ pred opravou je zachovaný v
[`2796-cluster-ranking.md`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-2796-cluster-ranking/comparisons/2796-cluster-ranking.md)).
Diagnostické artefakty: `.agent-notes/2471-stale-cluster-windows-missing-reset.md`,
`.agent-notes/1939-group-penalty-clcross-misports.md`.

### A5. Neplatné vstupné bajty (reprezentácia kódovania) {#a5-invalid-input-bytes-encoding-representation}

**Dotknuté:** `1367` (diverged, maxΔ 0 — presne jeden štrukturálny rozdiel).

**V čom sa líši.** Vstupný súbor obsahuje holý koncový bajt UTF-8 (`0x80`)
v názve uzla. C zaobchádza s holými koncovými bajtmi 0x80–0xBF ako s „platnými
znakmi reprezentujúcimi seba samých“ (`lib/common/utils.c:1200-1207`, bez
varovania) a text `<title>` s názvom uzla úplne obchádza konverziu znakovej sady
(bajty `agnameof` tečú priamo do `gvputs_xml`). SVG z orákula teda
obsahuje surový bajt a **nie je platným UTF-8** napriek deklarovanému
kódovaniu. Port dekóduje vstup s neplatným UTF-8 záložným režimom latin1
(`0x80 → U+0080`) a vydáva správne tvarované UTF-8 (`\xc2\x80`).

**Prečo akceptované.** Hranicou I/O portu sú reťazce JS (knižnica pre prehliadač).
Surový neplatný bajt nemôže prejsť okružnou cestou cez návratovú hodnotu typu reťazec
z `renderSvg`; zhoda s C bajt po bajte by znamenala poškodenie kódovania výstupu pre
každého spotrebiteľa. Záložný režim latin1 zrkadlí vlastnú sémantiku obnovy C
„spracované ako Latin-1“ (`utils.c:1249`). Je to obmedzenie pod kódom —
vrstvou reprezentácie — nie prenosné správanie, ktoré sme odmietli portovať.
Všetko ostatné v 1367 je conformant: počty elementov (23 polyline /
103 text / 44 polygon / 24 path) a všetky súradnice sa zhodujú po oprave
decorate (T6).

**Dôkazy.**
stránka porovnania
[`1367`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1367.md)
(vykreslenie vedľa seba + záznam dôkazov).

---

### A6. Pretečenie plátna typu `unsigned int` pri degenerovanom vstupe {#a6-unsigned-int-canvas-overflow-on-degenerate-input}

**Dotknuté:** `1314` — vstup odvodený z fuzzera (`fontsize="991836031967s8"`),
ktorého absurdná veľkosť písma nafúkne výkres na ~2.75e11 pt.

**Čo sa deje.** C ukladá `job->width` / `job->height` ako **`unsigned int`**
(`gvcjob.h:327-328`). `ROUND(...)` obrovskej veľkosti v bodoch (`emit.c:1249-1250`)
pretečie 32 bitov a obalí sa modulo 2³² a backend SVG ho vydá cez
**znamienkové** `%d` (`gvrender_core_svg.c:258-259`) — takže C vytlačí
`height="-425618343"`. Port ponecháva matematicky konzistentnú (neobalenú)
hodnotu. Každá ďalšia hodnota — `cx/cy/rx/ry` elipsy uzla, koreňový `translate`,
polygón, `font-size` textu — je bajt po bajte identická; líši sa iba
width/height najvyššej úrovne `<svg>`.

**Prečo sa tým nenaháňame.** Replikovať 32-bitové celočíselné pretečenie z C nie je
správanie rozloženia, ktoré by stálo za portovanie, a vstup je degenerovaný. Vrátime sa k tomu, ak upstream
pretečenie opraví (napr. rozšíri pole alebo obmedzí veľkosť).

<a id="a6b-degenerate-nan-layout"></a>

#### A6b. Degenerované rozloženie NaN (`sfdp`, patologické `repulsiveforce`) {#a6b-degenerate-nan-layout-sfdp-pathological-repulsiveforce}

**Dotknuté:** `2556` — `repulsiveforce=100` (⇒ odpudivá sila používa
`pow(dist, 101)`), čo privedie pružinovo-elektrický solver k **NaN v oboch
moduloch**. Samotné natívne orákulum vydáva všetky polohy uzlov/hrán ako `nan` a
degenerovaný ohraničujúci rámec.

**Čo sa deje.** Keď je každá súradnica NaN, obe implementácie serializujú
odpad odlišne: (1) bb grafu / polygón pozadia — C zaokrúhľuje `NaN`
na `int`, čo na arm64 dáva odpad v rozsahu `INT_MIN` (`bb="0,0,-4.295e+09,
-4.295e+09"`); port ponecháva `0`. (2) Kresliace operácie hrán — emitovacia
fáza natívneho potláča `_draw_`/`_hdraw_` splinu s NaN (vydá iba `pos`),
kým port ich vydáva s riadiacimi bodmi NaN. Kresby uzlov sa zhodujú (obe
ich potláčajú). Na žiadnej strane neexistuje skutočné rozloženie.

**Prečo sa tým nenaháňame.** Port už reprodukuje *ten istý* výbuch NaN ako
natívne — oprava, ktorá ho tam dostala, je skutočná (pozri nižšie); zostáva iba to,
ako každé serializuje odpad NaN. Replikovať nedefinované správanie `(int)NaN` z C
a potláčanie kreslenia splinu s NaN nie je zmysluplná vernosť rozloženia pri vstupe,
ktorého rozloženie je degenerované v oboch moduloch. Vrátime sa k tomu, ak upstream obmedzí
`repulsiveforce` alebo sanitizuje polohy NaN.

**Opravy portu, vďaka ktorým sa to dalo dosiahnuť (nie odohnané — skutočné chyby).** Predtým
port nedokázal dosiahnuť ani degenerovaný stav: (1) `armPow`
(`src/common/arm-pow.ts`) vyhadzoval výnimku pri každom argumente mimo rýchlej cesty; teraz portuje
úplnú vetvu osobitných prípadov z ARM `pow.c`, takže `pow(NaN, y) = NaN` ako v libm. (2)
`bezierClip` (`src/common/splines-geom.ts`) sa donekonečna točil pri riadiacich bodoch NaN,
pretože jeho test konvergencie bol naivnou negáciou `while (ABS > .5)` z C
(ekvivalentnou pre konečné hodnoty, nie pre NaN); teraz presne zrkadlí C a
na NaN skončí. Obe sú verné C a týkajú sa iba vstupov s NaN.

---

### A7. Hranica zaokrúhlenia steny boxu pri `round()` (`dot`) {#a7-round-box-wall-rounding-boundary-dot}

**Dotknuté:** `graphs-honda-tokoro` a (pridané 2026-07-28, nové vo vesmíre 905
položiek) jeho súrodenec z `graphs/directed/`, `tree-graphs-directed-honda-tokoro`
(oba structural-match, maxΔ ≈ 1 pt na jedinej hrane `n012->n011`). Súrodenec
sa líši iba atribútmi `samearrowhead`, ktoré sa vedenia tejto dvojice nedotýkajú —
jeho geometria `n012->n011` je bajt po bajte identická s akceptovaným id na
strane portu aj orákula, takže nižšie uvedený mechanizmus platí doslovne.

**V čom sa líši.** Stena boxu koridoru hlavy v `maximal_bbox` pristane na internom
x=90 v C oproti x=89 v porte pri zdieľanom porte `samehead` dvoch
paralelných hrán `n012->n011`. Konštrukcia zdieľaného portu (`buildSharedPort`) a
zoskupenie paralelných hrán sú obe bajt po bajte zhodné s C; rozdiel 1 px je čisto
artefakt hranice zaokrúhlenia `round()` — ~1e-14 upstreamového šumu pohyblivej desatinnej čiarky
prevalí hodnotu ležiacu presne na hranici `.5` na susedné celé číslo.
Vzorec `maximal_bbox` v porte už presne zrkadlí C.

**Prečo sa tým nenaháňame.** `round()` je primitíva, ktorou prechádza každá vedená hrana
v korpuse; doťahovanie správania jej hranice kvôli tomuto jedinému prípadu je
riziko regresie naprieč korpusom za 1 px na 2 hranách — rovnaké obmedzenie zdieľanej primitívy
ako pri zaokrúhľovaní obalu riadiacich bodov uvedenom v
`bbox-class-control-hull-vs-curve`. Úplná diagnostika:
`.agent-notes/honda-samehead-shared-port.md`.

---

### A8. Zaokrúhľovanie `fp-contract`/FMA vs. striktné IEEE (`dot`) {#a8-fp-contract-fma-rounding-vs-strict-ieee-dot}

**Trieda.** clang na arm64 kompiluje binárku orákula s `-ffp-contract=on`,
čím spája vybrané postupnosti násobenia a sčítania do jednotlivých inštrukcií FMA; port
beží na V8, ktorý vykonáva striktné zaokrúhľovanie IEEE-754 a nevie vydať
`fma`. Pri bitovo identických vstupoch sa obe líšia o 1-2 ULP v každom
výraze, ktorý sa kompilátor rozhodol zlúčiť. Strana portu je vždy výsledok
striktného IEEE-754; strana orákula je vždy výsledok zlúčený do FMA.
Je to obmedzenie prenosnosti kompilátora/runtime pod úrovňou sémantiky
zdrojového kódu C, nie logická chyba v porte — neredukovateľné bez
softvérovej emulácie konkrétnych rozhodnutí clangu o zlučovaní. Sú známe dva prípady,
na dvoch rôznych miestach, s dvoma rôznymi zosilňovacími
mechanizmami:

- **2646** — ULP vzniká vnútri kubického riešenia `points2coeff`/`solve3`
  v `Proutespline` a priamo preklopí počet koreňov fittera splinov.
- **2620** — ULP vzniká v slučke rozsahu vrcholov polygónu v `poly_init`
  (určovanie veľkosti uzlov) a nadväzne ho zosilňuje verné celočíselné orezávanie po každom relax
  v `ortho` na preklopenie remízy rovnako nákladných koridorov bludiska.

**Dotknuté:** `2646` (structural-match, maxΔ 42.09 na 3 z 21 216 hrán:
`edge2575` `g[4639]`, `edge3905` `g[7777]`, `edge15467` `g[30201]` — všetko
dlhé trasy hrán `:c->:nb_part` s portmi záznamu v režime smode). Súrodenec **A3**: obe
triedy sú neredukovateľné remízy prenosnosti pohyblivej desatinnej čiarky vnútri
`Proutespline`, ale mechanizmus je odlišný — artefakt `fp-contract`
kompilátora, nie libm `hypot`.

**V čom sa líši.** Pri všetkých troch hranách sa odchyľuje iba posledné volanie `routesplines` (priamy
úsek do portu hlavy). Jeho koncový bod leží bitovo presne na dolnej stene
polygónu bariéry s dotyčnicou rovnobežnou s touto stenou
(`evs[1]=(1,-1.22e-16)`), takže každý kandidát `splinefits` je dotyčnicou k
bariére v `t=1` — takmer dvojnásobný koreň kubiky priesečníka.
`points2coeff` túto kubiku počíta katastrofálnym krátením (členy
okolo ~7446 sa zrútia na ~0.099). Orákulum (clang/arm64,
`-ffp-contract=on`) zlučuje `v3 + 3*v1 - (v0 + 3*v2)` do fused
multiply-add, kým V8 zaokrúhľuje striktne podľa IEEE — obe sa líšia o
~9.1e-13 pri **bitovo identických vstupoch** a tento šum preklopí znamienko
diskriminantu `solve3`: C nájde 1 koreň (866.7, vnútri úsečky); port
nájde 3 korene s falošným partnerským koreňom pri `t=0.9999975 < 1-EPSILON2`. Falošný
koreň spustí jednu ďalšiu iteráciu polovičenia `a`, čo preklopí
veľkosť dotyčnice posledného kusu o faktor 2 (v oboch smeroch naprieč
3 hranami), a po orezaní vzniká maxΔ 42.09 (26 rozdielov v SVG).

**Prečo akceptované (neredukovateľnosť preukázaná kontrolovaným pokusom).** Všetkých šesť
volaní `routesplines` bolo vypísaných na oboch stranách — box, polygón, `PL`, začiatok,
koniec a `evs` sú bajt po bajte identické, rovnako ako výstupný spline skoršieho (nie posledného)
volania; jediná odchýlka je vnútri `solve3` posledného volania. Samostatný
nástroj s čistým C izoloval jedinú premennú: kompilácia s
`-ffp-contract=off` reprodukuje **port** bitovo presne na všetkých 3 hranách; predvolené
(`on`) zlučovanie reprodukuje **orákulum** bitovo presne na všetkých 3
hranách. Port sa teda už zhoduje s C podľa striktného IEEE-754; odchýlka
je celá vo voľbe zlučovania FMA kompilátorom orákula, pod úrovňou sémantiky
zdrojového kódu C — niet žiadnej nevernosti na úrovni zdroja, ktorú by bolo treba opraviť.
Cielená oprava (ručná emulácia zlučovania v `points2coeff`) bola vyskúšaná a
vyvrátená: opraví 2 z 3 hrán, ale nie tretiu, ktorej preklopenie
pochádza z vlastného interného zlučovania v `solve3`. Úplná oprava by
vyžadovala softvérovú emuláciu FMA v celom fitteri splinov — cena v horúcej slučke
s dosahom zaokrúhľovania naprieč celým korpusom za podpixelový zisk na 3 hranách.
Úplná diagnostika: `plans/residual-cleanup/analysis/2646-fp-contract.md`.

**Dotknuté (historické):** `2620` (bolo structural-match, maxΔ 585; 423 rozdielov
na 24 cestách hrán + 22 šípkach). **Zrútilo sa na conformant 2026-07-11**:
verný port prelievania vyrovnávacej pamäte susednosti `sgraph` + obojsmerného
obsahovania `chancmpid` (pozri `.agent-notes/ortho-maze-circo-rca.md`) odstránil
odchýlku; akceptačný záznam je vyradený a tento oddiel sa ponecháva ako
dokumentácia triedy A8.

**V čom sa líši.** Pipeline `ortho` (`splines=ortho`) je bajt po bajte zhodná
s C pri identických vstupoch — dokázané vstreknutím presného vstupu bludiska z C
(súradnice, `xsize`/`ysize`) do fázy ortho v porte: 378/378 vedených
segmentov vyjde bajt po bajte identických, takže nič v `src/ortho` nie je chybné.
Skutočná odchýlka je 1-2 ULP vo *vstupe* bludiska: `ysize` uzla (a pri
akumulácii v rámci radu `ND_coord.y`) vypočítané v slučke rozsahu vrcholov
polygónu v `poly_init` z C (`shapes.c`), ktorá pod
`-ffp-contract=on` zlučuje `R.x += sidelength*cosx` do FMA, ktorý je o ~1
ULP väčší než striktná aritmetika IEEE v porte (obe strany implementujú
aritmeticky identický výraz). `2620` má 173 polygónových uzlov s
necelou šírkou; všetky vykazujú C ≥ port o 1-2 ULP. Toto ULP zosilňuje — nie
zavádza — relax Dijkstru v `ortho`, ktorý verne orezáva svoju
bežiacu vzdialenosť po každom kroku (`sgraph.c:165`, v porte zrkadlené ako
`Math.trunc`) nad váhami odvodenými zo surových rozsahov buniek
(`maze.c:257`). Geometria posunutá o ULP preklopí remízu rovnako nákladných koridorov
pri 4 vedených hranách (cesty + ich šípky); zvyšné rozdiely sú
následné prečíslovanie ±1 stopy z týchto 4 preklopení.

**Prečo akceptované (neredukovateľnosť preukázaná kontrolovaným pokusom).** Samostatný
nástroj v C meniaci iba `-ffp-contract` reprodukoval obe strany na
odchýlenom vrchole šesťuholníka: `-ffp-contract=on` → `310.29250168188713`
(zodpovedá orákulu), `-ffp-contract=off` → `310.29250168188707` (zodpovedá
portu), pričom odchylná operácia bola izolovaná na vrchol `i=3`
(`R.x=-0.50000000000000011` zlúčené vs. `-0.5` nezlúčené). Druhý
pokus s injekciou vstupu (jediná premenná: vstupné hodnoty ortho) potvrdil
zosilňovač: podanie presných `coord`/`xsize`/`ysize` z C vlastnému `orthoEdges` portu
zredukuje všetky 4 odchýlky koridorov na 0 — kód ortho nemá
chybu, je len citlivý (ako aj vedenie podľa nákladov bludiska v samotnom C) na posun
vstupu o 1-2 ULP. Zhoda by znamenala emulovať
konkrétne zlučovanie FMA v clangu jedného skompilovaného výrazového stromu v
`poly_init` — naháňanie skompilovaného artefaktu, nie portovanie sémantiky zdroja.
Úplná diagnostika: `plans/ortho-2620-residual/analysis/2620-ortho-route.md`.

**Emulovaná výnimka (neakceptovaná): `triang.c:ccw`.** Jedno miesto
zlučovania JE reprodukované bit po bite namiesto akceptovania: `ccw` z pathplan
sa kompiluje na `fnmul`+`fmadd` (presný prvý súčin − zaokrúhlený druhý), takže
bod dotazu bitovo rovný koncovému bodu úsečky testuje ISCW/ISCCW namiesto
ISON. `shortest.c:pointintri` potom odmietne koncové body vo vrcholoch polygónu
(„destination point not in any triangle“) a `makeMultiSpline` sa vráti
k obyčajnému vedeniu pre každý zlúčený 2-cyklus — veľké, diskrétne
správanie naprieč korpusom, ktoré musí port zodpovedať. Na rozdiel od miest
`solve3`/`poly_init` vyššie (hlboko vnútri skompilovaných výrazových stromov, oprava
vyvrátená) je `ccw` jedna samostatná skompilovaná funkcia s čistou sémantikou, takže
ju `src/pathplan/triang.ts` emuluje: rýchla cesta s obyčajnými double s
konzervatívnou hranicou chyby tam, kde sa znamienka obyčajného a zlúčeného výpočtu preukázateľne zhodujú, a
presná cesta Dekkerovho súčinu + dyadického BigInt pre prípady blízke nule.

---

### A9. Trigonometria libm o 1 ULP → preklopenie kokruhovej remízy CDT (multispline `circo`/`twopi`) {#a9-libm-trig-1-ulp-→-cdt-cocircular-tie-flip-circo-twopi-multispline}

**Trieda.** `Math.sin`/`Math.cos` vo V8 nie sú bitovo identické s `sin`/`cos`
z libm od Apple (dokázané: nesúlad 1 ULP pri `2π·4.5/8`, jednom z ôsmich
uhlov rohov obstrukcie v tvare elipsy). Rohy opísaného 8-uholníka z `makeObstacle`
zdedia toto ULP, takže vstupné súradnice trojuholníkového smerovača sa líšia
od súradníc orákula o ≤6e-14. Symetrické rozloženia (uzly rovnakej veľkosti v rade/kruhu) robia
štvoruholníky smerovača **presne kokruhovými** v reálnej aritmetike, takže presný
predikát incircle sedí na ostrí noža: vstupné ULP preklopí jeho znamienko,
uhlopriečka ohraničenej Delaunayovej triangulácie sa preklopí a polygón koridoru, ktorý v orákule zlyhá
v `Pshortestpath` („destination point not in any triangle“ →
záloha na obyčajný spline), v porte uspeje (alebo naopak). Výsledné
spliny sa líšia o ~0.2–0.5pt. Súrodenec **A3**/**A8**: neredukovateľné
obmedzenie prenosnosti pohyblivej desatinnej čiarky pod úrovňou sémantiky zdroja C — zhoda
by si vyžadovala reprodukovať v JS presné zaokrúhľovanie `sin`/`cos` z libm od Apple.

**Dotknuté:** `241_0` (circo Δ≈0.2 / plátno twopi Δ≈9 cez preklopenie koridoru
na hrane `5:ne->8:nw`); `2343`, `2239`, `share-b29`, `windows-b29` (twopi,
po 1–2 rozdieloch polohy popiskov hrán — libm 1-ULP vzniká
v trigonometrii jednotkových vrcholov v `poly_init` (`hypot`/`atan2`/`sin`), posunie vypočítanú
výšku jedného uzla o ULP za hranicu minimálnej veľkosti, na ktorej orákulum
pristane presne, a kaskáduje cez `floor()` pri načítaní R-stromu xlabelov do
jediného preklopenia kandidáta popisku. Oprava so správne zaokrúhleným hypot bola vyskúšaná
a VYVRÁTENÁ: opravila `2343`, ale zregresovala `2168_3`, ktorého určovanie
veľkosti osemuholníka prechádza tým istým volaním, kde hodnota orákula NIE je správne
zaokrúhlená — žiadna deterministická politika hypot sa nezhoduje s orákulom v oboch prípadoch).
`2168_1` pôvodne patril do tejto triedy, ale stal sa
conformant, keď port emuloval fp-contracted `ccw` orákula
(pathplan `triang.ts`): jeho zlyhanie koridoru je riadené odmietnutím koncového bodu vo vrchole
v `pointintri` cez FMA, ktoré port teraz reprodukuje
bit po bite, takže remíza ULP uhlopriečky CDT sa tam už neobjavuje.

**Prečo akceptované (neredukovateľnosť preukázaná kontrolovaným pokusom).** Samotná
CDT je očistená: `mkSurface` v porte je verný port inkrementálneho vkladania
GTS 0.7.6 (`cdt.c`: rozdelenie 1→3 + rekurzívne
`swap_if_in_circle`, hrany obmedzení vytvorené vopred a nevymeniteľné,
vynucovanie obmedzení cez `remove_intersected_*` + `triangulate_polygon`)
a samostatný nástroj v C, ktorý sa linkuje s **reálnou knižnicou GTS** a dostane bitovo presné
vstupy smerovača z portu, reprodukuje triangulačné fazety portu stena po stene
(2168_1: 22/22; 241_0: 185/185). Vyhodnotenie determinantu incircle v presných racionálnych číslach
na dvoch množinách vstupov potvrdzuje preklopenie znamienka (+1 so vstupmi
portu, −1 so vstupmi orákula). Zvyšná premenná — rozdiel
trigonometrie o 1 ULP — bola izolovaná priamym porovnaním bitových vzorov `Math.sin`/`sin`.

**Akceptácia na úrovni stopy modulu (`accepted-divergences-engines.json`).**
<a id="a9-engine-track-twopi-circo"></a> **Stopy xdot modulov** twopi/circo
(`parity-twopi.json` / `parity-circo.json`, natívne orákulum `dot -K <engine>
-Txdot`, `test/corpus/engine-walk.ts`, porovnanie sémantických kresliacich operácií pri
±0.01 — pozri `test/golden/compare-xdot.ts`) odhaľujú ten istý mechanizmus
nezávisle od prieskumu SVG pre modul dot citovaného vyššie: twopi `2239` (1
rozdiel kresliacej operácie — preklopenie polohy textu `_ldraw_` popisku hrany, rovnaké
ULP trigonometrie jednotkových vrcholov z `poly_init` kaskádujúce cez reťaz R-stromu xlabelov
cez `floor()`; `2343`, `share-b29` a `windows-b29`, pôvodne akceptované
pod týmto záznamom, boli *opravené* 2026-07-11 vernou kontrakciou fmadd
v `polylineMidpoint` — pozri odsek o rodine b29 nižšie) a circo `241_0` (41
rozdielov kresliacich operácií, Δ≈0.2pt na vedenom beziérovi hrany `1->2` — rovnaké
preklopenie koridoru uhlopriečkou CDT; žurnál rozhodnutí, záznam z 2026-07-10 „CDT rewritten as
faithful GTS port; 2168_3 outline-ring obstacle; 56/osage bb clobber; A9
filed“). Akceptované na úrovni stopy modulu cez
`test/corpus/accepted-divergences-engines.json`, pripojené do
`PARITY-twopi.md`/`PARITY-circo.md` nástrojom `parity-report.ts` — rovnaké pripojenie,
aké vykonáva `accepted.ts` pre stopu dot v `PARITY-dot.md`.

**circo `2475_2` — remíza hypot pri kokruhovom closestNode.** V jednom komponente s 28 uzlami
tohto grafu s 10762 uzlami vyberá `getRotation` v circo
(`circpos.c:73-92`) uzol bloku najbližší k počiatku rozloženia cez
`hypot`, aby určil rotáciu podbloku. Dva kokruhové uzly sú
prakticky rovnako vzdialené; správne zaokrúhlený `Math.hypot` vo V8 a `hypot`
z libm od Apple zaokrúhlia túto vzdialenosť o 2 ULP odlišne, čo preklopí striktné `<`,
vyberie iný uzol a otočí/zrkadlí podblok o ~20° (18 uzlov
sa posunie, max. 296.7pt; ostatných 10744 uzlov je bitovo identických, rovnako ako
strom blokov, poradie kruhu a každý `centerAngle`). Politika CR-hypot bola
pre túto triedu už vyvrátená (2026-07-10). Samostatná reprodukcia:
`.agent-notes/circo-2475-590-repro.dot`; úplná RCA:
`.agent-notes/circo-b81-2475-rca.md` (akceptované 2026-07-11).

**twopi `2470` — ULP radiálnej súradnice zosilnený R-stromom xlabelov.**
2470 je graf so 140 hranami, ktorého popisky hrán v HTML `<table>` sa zhlukujú na
takmer zhodných radiálnych kotvách. V rodine neato sa popisky hrán umiestňujú
ako externé popisky chamtivým umiestňovačom xlabelov (`label/xlabels.c`),
ktorý vyberá kandidátny roh s najmenším prekryvom cez R-strom usporiadaný Hilbertovou krivkou.
Spliny a súradnice uzlov v porte sa zhodujú s orákulom v presnosti emisie
(nula rozdielov splinov/uzlov/bbox aj pri 1e-7), ale radiálne
`ND_coord.y` jedného uzla sa líši o ~2 ULP (`sin`/`cos` z libm od Apple vs. `Math` vo V8) — hlboko
pod laťkou zhody, no prekračuje hranicu `floor(pos.y − sz.y/2)`
presne pri 0 v `objplpmks`, čím sa o jednu jednotku preklopí obdĺžnik R-stromu
daného objektu. Zmena poradia Hilbertovej krivky/zoskupenia stromu spôsobí, že `RTreeSearch` odreže
inú vetvu, takže sa ~140 popiskov prichytí k susednému kandidátnemu
rohu (každý rozdiel je pevný krok (+šírka, −výška riadka)). Umiestňovač, poradie objektov,
zaokrúhľovanie obdĺžnikov, `CombineRect` (ktorý verne zrkadlí zvláštnosť min-min z C) a
32-bitový celočíselný Hilbertov kľúč boli každé overené ako verné; odchýlka
je upstreamové ULP radiálnej trigonometrie, neredukovateľné z rovnakého dôvodu
ako twopi `1855`. Akceptované 2026-07-11; úplná RCA:
`.agent-notes/twopi-2470-rca.md` (ktorá tiež dokumentuje, že ranné
„prešlo“ pre toto id bolo artefaktom zastaranej binárky orákula, nie regresiou
portu).

**osage `1855` — rozmazanie fp-contract vo vrcholoch obstrukcií.** Odlišné od záznamu o
radiálnom zrkadle twopi `1855` vyššie: pod osage sú stredy uzlov bitovo presné
voči orákulu a 110 rozdielov kresliacich operácií sú tri hrany vedené
obstrukciami umiestnené na zrkadlovej strane radu uzlov (X bitovo presné, Y zrkadlené).
Vrcholy osemuholníkovej obstrukcie z
`circumscribed_polygon_corner_about_ellipse` (`neatosplines.c:301`) sa líšia
od C o 3–4 ULP, pretože `-ffp-contract=on` v clangu zlučuje reťazce `a·b±c`
v `ellipse_tangent_slope`/`line_intersection` do FMA s jediným zaokrúhlením,
kým V8 zaokrúhľuje každú operáciu: zlúčené zaokrúhľovanie v C zrúti stĺpec uličky
hodnôt x rohov do jedného bitovo identického double (presne kolineárne),
port ho rozdelí na dve hodnoty vzdialené 1 ULP. To preklopí test dotyčnice
viditeľnosti `clear()` — ulička už nie je blokovaná — čím pribudne ~20
hrán viditeľnosti a Dijkstra vyrieši remízu homotopie hore/dole
na zrkadlovú stranu. Kontrolovaný pokus: vstreknutie presných súradníc
obstrukcií z C do inak nedotknutého portu dáva **nula** odchýlených
hrán, čím sa úplne očisťuje reťaz legálneho usporiadania, viditeľnosti, Dijkstru a splinov;
samotné vstreknutie `cos`/`sin` z libm v C nič nezmení. Akceptované
2026-07-11; úplná RCA: `.agent-notes/osage-spline-family-rca.md`.

**Rodina b29 (twopi).** Štyri varianty b29 zdieľajú jedno ostrie noža:
popisok hrany `EqmtTyp` (`Node14732->Node14731`) sedí na presnej remíze pri výbere strany
v placeLabels, ktorej výsledok závisí od driftu rozloženia twopi o 1 ULP
v okolitých objektoch. S vernou kontrakciou fmadd v
`polylineMidpoint` (oprava rodiny states, 2026-07-11) je kotva popisku
v porte bitovo identická s kotvou orákula, a napriek tomu sa remíza stále rozhoduje opačne
pri dvoch zo štyroch variantov (`graphs-b29`, `linux.i386-b29`), kým ďalšie
dva (`share-b29`, `windows-b29`) sa teraz zhodujú — a akceptovaný rozdiel popisku A9 pre `2343`
úplne zmizol. Hranica: 1 kresliaca operácia, Δ12pt y popisku. Neredukovateľné
bez odstránenia upstreamového driftu. Úplná RCA:
`.agent-notes/twopi-states-rca.md`.

To isté ostrie noža v placeLabels sa objavuje aj na stope **osage** (akceptované
2026-07-11, úplná RCA: `.agent-notes/osage-small-tail-rca.md`):
`linux.i386-b29` a `share-b29` (po 2 rozdieloch kresliacich operácií — kotva x
jedného popisku hrany dopadne na 878.28 oproti 841.06, umiestnená symetricky okolo
bitovo identického stredu splinu 859.67, t. j. ±polovica šírky popisku; obe
varianty sa navzájom zrkadlia) a `1652` (2 rozdiely kresliacich operácií — dve hrany
každá preklopí kotvu jedného popisku okolo identického stredu, jedna v x a jedna v y,
s bitovo identickými splinmi a šípkami; orákulum sa vykreslí kompletne,
takže nejde o známu nespoľahlivosť natívneho timeoutu). V každom prípade
je geometria hrán bitovo presná a opačne sa rozhoduje iba remíza pri výbere strany popisku
v okolí posunutom o 1 ULP.

Stopa osage nesie trojicu `polypoly` (`graphs-polypoly`,
`share-polypoly`, `windows-polypoly`; akceptované 2026-07-11, úplná RCA v
`.agent-notes/patchwork-tail-rca.md`): jedinou odchylnou operáciou je
holé transcendentné `cos(π+θ)` vo vrchole zdeformovaného štvoruholníka s orientáciou 180 —
`Math.cos` vo V8 je správne zaokrúhlené, kým `cos` z libm od Apple nesie
chybu ±1 ULP závislú od argumentu (takže iba v libm platí `|cos(π+θ)| ≠
|cos(θ)|`); rozdiel veľkosti uzla o 1 ULP vstupuje do `GRID`/`ceil` v pack, prevalí
remízu obvodu a qsort umiestni dva komponenty do baliacich buniek toho druhého —
tuhá výmena celých uzlov bez chyby tvaru či vedenia. Žiadne
deterministické prepísanie nedokáže reprodukovať nesprávne zaokrúhlenú transcendentnú funkciu
z libm, učebnicový tvar A9.

Rovnaký mechanizmus bol potvrdený 2026-07-28 na väčšom súrodencovi
`tree-graphs-directed-polypoly` (`graphs/directed/polypoly.gv`, nové vo
vesmíre 905 položiek; 112 rozdielov kresliacich operácií, iba osage). Odchylnou operáciou
je identické miesto `cos(π+θ)` pre uzol `9004` s 1 ULP — hodnoty `bb.x` z C aj z portu
zodpovedajú pôvodnej RCA bajt po bajte — ale pri tomto vstupe so 76 uzlami
sa šírenie uberá cez `arrayRects` v osage: `acmpf` triedi baliace
bunky podľa surového súčtu `width+height` a šírka o 1 ULP vyššia v libm
spôsobí, že `9004` sa zaradí striktne pred svojich otočených súrodencov `9000/9002/9006`,
kým správne zaokrúhlená hodnota z V8 zanechá presnú 4-člennú remízu, ktorú
nestabilný qsort usporiada inak — iné bunky po riadkoch, výmena `9002`/`9006`
a kaskáda `fmax` šírky stĺpca posunie 8 susedov v x.
Podanie vlastnému `arrayRects` portu veľkostí uzlov z C oproti veľkostiam uzlov z portu
reprodukuje 10 posunutých uzlov z prieskumu s bajt po bajte zhodnými rozdielmi x,
čím sa kauzálny reťazec uzatvára.

Dva ďalšie prípady na úrovni stopy modulu boli rozobrané po koreňovú príčinu a akceptované 2026-07-11
(úplná RCA: `.agent-notes/circo-edge-tail-rca.md`): twopi `241_0` (6 rozdielov
kresliacich operácií — súrodenec záznamu circo vyššie: tá istá kokruhová
remíza incircle v CDT, preklopená 1-ULP `sin`/`cos` z libm, spôsobí, že multispline
koridor v porte uspeje s 14-bodovým splinom, kým natívny build
sa vráti k obyčajnému 8-bodovému vedeniu; rozdiely bodov < 0.07pt) a circo
`windows-tree` (10 rozdielov kresliacich operácií na jednej hrane vejára — trigonometria umiestnenia v circo
dopadne `node2.y` o jediné ULP nad `node8.y` okolo presne symetrickej
hodnoty 18.0 a výber portu hlavy dyna v `closestSide` preklopí TOP/BOTTOM pri
tejto presnej remíze; polohy uzlov a boxy sú inak bitovo identické s
orákulom).

**Stopa modulu sfdp — remízy FP pri hranách (`42`, `241_0`).**
<a id="a9-sfdp-fp-ties"></a> Stopa xdot modulu sfdp (`parity-sfdp.json`,
natívne `dot -Ksfdp -Txdot`, ±0.5) odhaľuje kokruhovú remízu incircle v CDT, keď sa
vstreknú presné natívne polohy pred vedením hrán (takže odchýlka NIE je
iteratívny drift — pozri triedu A1-drift — ale diskrétna remíza predikátu):

- `42` a `241_0` — kokruhová remíza incircle v CDT (koridor multisplinu).
  So vstreknutými polohami je zvyškom **preklopenie počtu segmentov**: `42`
  `opCount 5 vs 9` (hrana 0->3) / `ptCount 32 vs 26` (3->7); `241_0` `ptCount 14
  vs 8` (hrana 3->2) — uhlopriečka ohraničenej Delaunayovej triangulácie v porte sa preklopí oproti
  orákulu, takže koridor multisplinu uspeje s N-bodovým splinom, kde natívny
  build sa vráti k kratšiemu obyčajnému vedeniu (alebo naopak), presne ako
  záznam twopi/circo `241_0` vyššie. Port už emuluje kontrakciu arm64
  `fmadd` v predikáte incircle/`ccw` (`src/pathplan/triang.ts`,
  `src/common/fma.ts`) a používa Delaunay s robustným incircle; zvyškom je
  1-ULP `sin`/`hypot` medzi V8 a libm od Apple vo vstupe predikátu, ktorý žiadny prenosný
  kód nereprodukuje.

> **`2095` preklasifikované A9 → A1-drift (2026-07-22).** Predtým bolo tu uvedené
> ako „súrodenec hypot“ (drift pod 0.7pt na hranách uzla s prázdnym názvom
> `""->"4"`). Tento zvyšok bol **artefaktom nástroja**: regex `GVTS_POS` atribučného
> injektora vyžadoval ≥1 znak názvu, takže uzol s názvom `""` sa nikdy nevstreknul
> a ťahal so sebou dve incidentné hrany. Po oprave injektora tak, aby zodpovedal prázdnym
> názvom (`(.+)`→`(.*)`, `src/layout/neato/splines.ts`), sfdp `2095`
> injekciou dosiahne **0 zvyšku** — čistý silový drift, pokrytý vypočítanou triedou
> A1-drift, nie remízou FP vo vedení. Jeho akceptácia po jednotlivých id bola odstránená z
> `accepted-divergences-engines.json`. (Rovnaké zistenie ako pri fdp `2095` nižšie.)

**Nový kontrolovaný pokus (2026-07-21).** Sonda natívneho a V8 `hypot`
(`plans/sfdp-tracked-divergences/batch-2/hypot-ulp-probe.txt`): kompilácia
systémového `hypot` z C a porovnanie s `Math.hypot` z Node na reprezentatívnych
vstupoch odchýlky plochých hrán ukazuje nesúlad 1 ULP v 2 zo 6 (Δ 7.1e-15 a
5.7e-14) — ostrie noža prahu rozdelenia, ktoré preklopí počet delení.
Neredukovateľné: žiadny prenosný hypot nereprodukuje libm od Apple (precedens `arm-pow.ts`
pre tú istú hranicu). Akceptované na úrovni stopy modulu cez
`accepted-divergences-engines.json` (`sfdp.42`, `sfdp.241_0`).

Stopa xdot modulu **fdp** (`parity-fdp.json`, natívne `dot -Kfdp -Txdot`,
±0.5) odhaľuje TÚ ISTÚ kokruhovú remízu CDT na rovnakom grafe, `241_0`: keď sa vstreknú
presné polohy orákula pred vedením hrán, zvyškom je 11 číselných
rozdielov `unfilled_bezier` obmedzených na jednu hranu (`0->1#0`, maxΔ 3.39pt). Keďže
polohy uzlov sú po injekcii identické, odchýlka je nižšie v
koridore multisplinu v pathplan — rovnaká remíza incircle s libm 1-ULP ako pri
twopi/circo/sfdp `241_0` (incircle v presných racionálnych číslach 185/185 vyššie). Páky sú
už uplatnené (`src/pathplan/triang.ts` fmadd, `src/pathplan/route.ts:198`
`Math.hypot`); remíza je neredukovateľná. Akceptované cez `accepted-divergences-engines.json`
`fdp.241_0`. `2095` pri fdp je naopak **A1-drift, nie A9**: vstreknutie
jediného uzla s prázdnym názvom (po oprave atribučného injektora, aby zodpovedal uzlom
s názvom `""`) zredukuje jeho zvyšok na nulu — skorší „chvost A9“ bol
nevstreknutý prázdny uzol, ktorý ťahal incidentné hrany. Akceptácia sfdp `2095` bola
tou istou slepou škvrnou — nová regenerácia atribúcie sfdp (2026-07-22) s opraveným
injektorom potvrdila, že aj ono injekciou dosiahne 0, a jeho akceptácia bola odstránená (pozri
poznámku o preklasifikovaní `2095` vyššie).

---

## Sledovaný dlhý chvost (atribúty a hraničné prípady v `dot`) {#tracked-long-tail-dot-attribute-edge-case}

Pri **predvolených nastaveniach** sa modul `dot` zhoduje s binárkou v C v tesnej deterministickej
tolerancii na golden korpuse (verdikt `conformant`; pozri poznámku na
začiatku). Zostávajúce rozdiely sú **dlhým chvostom atribútov a
hraničných prípadov** — historicky najťažšou časťou každého portu Graphviz. Na rozdiel od
akceptovaných odchýlok vyššie tieto *budú* uzavreté; sledujú sa naživo, s
počtami, v
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md):

| Kategória | V čom sa líši |
|---|---|
| **path-structure** | Vedenie splinov hrán v konkrétnych konfiguráciách (napr. niektoré prípady plochých hrán a hustých koridorov). |
| **element-count** | Funkcia, ktorá v určitých grafoch vydáva viac/menej elementov SVG než C. |
| **color-stroke** | Rozdiely v emisii čiary/výplne pri konkrétnych atribútoch štýlu. |
| **parser-gap** | Malý počet vstupov DOT, ktoré parser zatiaľ plne neprijíma. |

Ak váš graf používa iba bežné atribúty a modul `dot`, ste takmer
určite na ceste zhody v deterministickej tolerancii. Ak rozloženie vyzerá zle, pozrite si `PARITY-dot.md` pre
danú triedu vstupov — pravdepodobne ide o sledovanú položku s misiou opravy ukotvenou v orákule,
nie o neznámu.

> **Poznámka k prípadom riadeným popiskami.** Trieda merania textu (A2) je uzavretá —
> už nie je pod ňou akceptovaný žiadny graf `dot`. Graf, ktorý dnes sedí na
> structural-match, je sledovaná medzera, nie rozdiel fontových metrík.

### Šípky protiľahlých hrán pri `concentrate=true` {#concentrate-true-opposing-edge-arrowheads}

Keď `concentrate=true` zlúči antiparalelnú dvojicu (`A->B; B->A`) do jednej
zostávajúcej hrany, táto hrana musí kresliť šípku na **oboch** koncoch. Toto je teraz
portované (vetva `conc_opp_flag` v `arrow_flags`; pozri
`src/common/splines-clip.ts:arrowFlags`), takže `graphs-b135`, `167` a `2087`
sa zhodujú (odchýlka `element-count` s chýbajúcou šípkou a jej vedľajší efekt s neorezaným splinom
v `@d` sú obe preč).

Niektoré grafy s concentrate si **ponechávajú samostatný, už skôr existujúci zvyšok**, ktorý oprava
šípky **nerieši** — je to rozdiel polohy **súradnice x** uzla
(sieťový simplex pre x / port s kompasom), nie chyba šípky:

- **`graphs-b15`, `graphs-b69`** — veľké grafy so záznamami/klastrami typu „výťah“.
  Concentrate sa aktivuje a zlučuje správne; zvyškom je rozdiel ~1pt v x uzla,
  ktorý sa zosilní na rozdiel `element-count`/`@d` splinu. Samotná emisia šípok
  je teraz správna (b69 získava svoje chýbajúce polygóny šípok). Koreňovú príčinu súradnice x
  pozri v poznámke agenta `b69-concentrate-undermerge`.
- **`1453`** — stále sa odchyľuje z príčiny `element-count` na najvyššej úrovni, ktorá nesúvisí
  so šípkou `conc_opp_flag`.
- **`2825`** — v čase tejto opravy šípok sa odchyľoval z príčiny `element-count`
  na najvyššej úrovni, ktorá nesúvisela s conc_opp_flag (nespustí sa tam žiadne zlúčenie
  protiľahlej dvojice); odvtedy uzavreté misiou fix-2825-rebuild-vlists,
  pozri A4 vyššie.

Sú to sledované položky súradnice x / štruktúry, **nie** chyby šípok.

### Medzery vo vernosti rozloženia z misie vernosti 2.0 (neato, sfdp, fdp, twopi, circo) {#layout-fidelity-gaps-from-the-2-0-fidelity-mission-neato-sfdp-fdp-twopi-circo}

Misia vernosti 2.0 spôsobila, že neportované hodnoty atribútov zlyhávajú nahlas (pozri tabuľku
`UNSUPPORTED_FEATURE` v
[Chybách a výnimkách](https://github.com/knowvah/dot-engine/blob/main/docs-site/guide/errors.md)).
Nechala nasledujúce, zaznamenané v `plans/v2-fidelity/decision-journal.md`.

**Nahlas, neportované.** `overlap=voronoi` s prekrývajúcimi sa uzlami stále vyhadzuje
`UNSUPPORTED_FEATURE` v neato, twopi, circo a sfdp: samotný Voronoiov korektor
(algoritmus `vAdjust`) nie je portovaný. Test prekryvu, ktorý rozhoduje,
či sa vyhodí výnimka, je vlastný test z C (`countOverlap` nad polygónmi uzlov z `poly.c`).

**Známe medzery, stále ticho.** Port tieto vykresľuje bez chyby a
líši sa od natívneho Graphviz. Nájdené misiou `v2-silent-gaps`
(`plans/v2-silent-gaps/decision-journal.md`); nie sú to akceptované odchýlky.

- **Varovanie „Unrecognized overlap value“ z `getAdjustMode` sa nevydáva.**
- **Vrcholy otočených polygónov sa môžu od natívnych líšiť v posledných bitoch
  (neredukovateľné: hostiteľská matematická knižnica).** `poly_init` orientuje každý vrchol cez
  `atan2`, `hypot`, `sin` a `cos`. Pri bitovo identických vstupoch vracajú libm z macOS a
  V8 odlišné posledné bity (napr. `atan2(0x3fd6a09e667f3bce,
  0xbfd6a09e667f3bca)`: libm `…21d1`, V8 `…21d2`; `hypot` pri ďalšom vrchole:
  libm `…fffd`, V8 `…fffe`), takže box s `orientation=20` má vo vrchole y
  `-18` v porte a `-17.999999999999996` natívne. Samotný natívny Graphviz
  sa mení s libm platformy a prehliadač ho nemôže volať. Vlastná
  aritmetika portu zodpovedá C (poradie `RADIANS` pevné; 776 zo 1664 vzorkovaných súradníc
  vrcholov je bitovo identických, ostatné sa líšia iba cez libm). Dôsledok:
  verdikty `polyOverlap` pri presnom dotyku sa môžu preklopiť; s natívnymi vrcholmi sa
  každý verdikt zhoduje.
- **sfdp sa môže od natívneho líšiť na macOS (neredukovateľné: hostiteľský libm `pow`).**
  Diagnostikované inštrumentovaným natívnym sfdp: polohy zostávajú bitovo identické,
  kým jeden člen odpudivej sily, `pow(dist, 1 - p)` (`spring_electrical.c`,
  `p = -1`, teda `pow(x, 2)`), nevráti z libm macOS o 1 ulp menej než `x*x`
  (`pow(1.4116727416983157, 2)`: libm `1.9928199296540394`, správne zaokrúhlené
  `…396`; macOS `pow(v, 2) != v*v` pre 20 zo 16201 vzorkovaných `v`). To mení
  `Fnorm` iterácie v poslednom bite; adaptívne chladenie sfdp ho zosilní
  do odlišného (často zrkadleného) rozloženia. `armPow` v porte je `pow` z optimized-routines
  od ARM (glibc ≥ 2.28), t. j. to, čo počíta Graphviz na Linuxe;
  orákulum z macOS je odľahlou hodnotou. Vylúčené: seedovanie (explicitné hodnoty `start=`
  sa zhodujú), `pcp_rotate` (rovnaký vstup dáva rovnaký výstup), polohy a
  príťažlivý člen (bitovo identické). Príklad: osamelý trojuholník `a--b; a--c; b--c`
  s predvoleným seedom.
- **fdp sa môže od natívneho líšiť cez hostiteľské libm `cos`/`sin`.** fdp nasleduje
  Graphviz po 15.0.0 (odpudzovanie na vzdialenosť hypot, `Mlimit`), pričom `hypot`
  hostiteľského libm je reprodukovaný bit po bite (`src/common/libm-hypot.ts`, 0
  nezhôd na 400k vzorkách). 251 z 252 golden vstupov vykresliteľných modulom fdp
  sa zhoduje s natívnym buildom presne; zostávajúci jeden
  (`parallel-cluster-ldbxtried`) umiestňuje uzly portov klastrov pomocou
  `T_Wd * cos(alpha)` a `cos(-2.3840764867756761)` z libm macOS je o 1 ulp od
  `Math.cos` vo V8; silová slučka fdp to zosilní na asi 3 palce. `cos`
  od Apple sa nedá reprodukovať z krátkeho modelu tak, ako `hypot`.
- **Natívne pády, ktoré port definuje.** Natívny Graphviz skončí s kódom 139 pri neato
  `mode=KK` s `model=mds` a hranou `len` (`mds_model` indexuje `GD_dist`
  poradovým číslom od 1: pretečenie haldy) a pri `model=circuit` s
  nesúvislým grafom. Port v prvom prípade zahodí bunky mimo rozsahu a
  v druhom sa vráti k najkratším cestám; nie je s čím natívny výstup
  porovnať.

---

## Zámerne neportované (necieľové oblasti) {#intentionally-not-ported-non-goals}

Sú to zámerné hranice rozsahu, nie chyby. Knižnica cieli na **SVG**
(plus sprostredkujúce textové formáty `json` / `xdot` / `dot` / imagemap).

- **Iné výstupné formáty.** Rastrové (PNG/JPG/GIF/WebP/BMP), PostScript/PDF/EPS
  a GUI/interaktívne backendy sú mimo rozsahu. Použite výstup SVG a v prípade
  potreby rastra ho následne skonvertujte.
- **Stránkovanie `page=` pre SVG.** Ani natívny `dot` SVG nestránkuje (zariadenie
  SVG nenastavuje príznak stránkovania), takže `page=` je na tejto ceste v oboch
  implementáciách bez efektu — uvedené tu iba preto, že ide o častý
  zdroj zmätku.
- **Textový výstup `-Tplain`.** Odložené (verný textový formát), nie vylúčené.
- **`gvpr`** (skriptovací jazyk na spracovanie grafov) — mimo rozsahu.
- **Pohodlné obaly pre C++** (`cgraph++`, `gvc++`) — najprv sa portuje API v C;
  idiomatická pohodlná vrstva v TypeScripte, ak by bola žiaduca, by bola
  samostatným balíkom.
- **`fontnames=svg|ps` pri meraní textu v prehliadači.** V prehliadači
  merač cez canvas zostavuje svoj font zo zoznamu rodín `fontnames=native`
  pre alias PostScript (`Times-Roman` → `Times, serif`), teda rovnakú
  tvár, akú emitor SVG predvolene vykresľuje. `TextMeasurer` nenesie žiadny
  kontext grafu, takže grafy, ktoré nastavujú `fontnames=svg` alebo `fontnames=ps`, sa merajú
  voči natívnemu zoznamu, kým SVG uvádza rodinu svg/ps. Váhy aliasov,
  ktoré CSS nedefinuje (`book`, `demi`, `light`, `medium`, `roman`),
  sa vydávajú doslovne ako v C; prehliadače ich ignorujú a vykresľujú normálnu
  váhu a merač meria normálnu váhu, aby to zodpovedalo. Výstup v Node
  nie je dotknutý (merač cez canvas nikdy nepoužíva).
- **Natívne mechanizmy** nahradené ekvivalentmi bezpečnými pre prehliadač: dynamické
  načítavanie pluginov (`dlopen`) je nahradené statickou registráciou modulov/renderérov;
  čítanie zo súborového systému (fonty, obrázky, konfigurácia) je nahradené spätnými volaniami
  dodanými volajúcim (napr. `setImageSizer`). Správanie je zachované; mechanizmus sa líši.

---

## Nahlásenie odchýlky {#reporting-a-divergence}

Ak nájdete výstup, ktorý sa líši od C a **nie je** akceptovanou odchýlkou vyššie,
nie je v `PARITY-dot.md` a nie je necieľovou oblasťou, je to chyba, ktorú stojí za to nahlásiť —
zdrojový kód v C je špecifikácia a neuvedené odchýlky sa považujú za chyby, nie za
akceptované správanie.
