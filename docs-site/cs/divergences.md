---
sourceHash: 4f20fa111e0cdd1d8975c4886542dc4cca75fccc70ab24c8d23af3bb3e62ebd7
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Známé odchylky od C Graphviz {#known-divergences-from-c-graphviz}

@knowvah/dot-engine usiluje o co nejtěsnější věrnost kanonické implementaci v C.
Zdrojový kód v C je specifikace; nevyjmenovaný rozdíl se považuje za vadu, nikoli
za akceptované chování.

> **Co zde znamená „shoda“.** Verdikt parity korpusu nazvaný `conformant`
> je **těsná deterministická tolerance**, *nikoli* doslovná rovnost SVG bajt po
> bajtu: číselné souřadnice a cesty se musí shodovat v rozmezí **±0.01** a veškerý
> nečíselný obsah (tagy, barvy, text) musí být přesně stejný
> (`compareSvg(…, 'deterministic')`). V celém tomto dokumentu se „shoda“ a
> „shodný“ vztahují k tomuto verdiktu tolerance. Úplná definice:
> [Shoda](./conformance.md).

Tam, kde se výstup *skutečně* liší, spadá právě do jedné ze tří tříd:

1. **Akceptované odchylky** — rozdíly, které jsme prozkoumali, pochopili až do
   původní příčiny a **záměrně se rozhodli nečinit shodnými**. Každý z nich je
   omezený, charakterizovaný a níže zdůvodněný. Nejsou to chyby a nebudou
   „opraveny“ bez konkrétního, samostatně vymezeného důvodu.
2. **Sledovaný dlouhý chvost** — známé mezery, které *budou* uzavřeny, každá s
   opravou ukotvenou na orákulu. Žijí s aktuálními počty v
   [`test/corpus/PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md).
3. **Necíle** — záměrné hranice rozsahu (formáty a mechanismy, které jsme nikdy
   neměli v úmyslu reprodukovat).

Směrodatné, průběžně aktualizované záznamy jsou
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
(přehled parity jednotlivých vstupů vs. nativní `dot`) a
[`plans/port-catalog/README.md`](https://github.com/knowvah/dot-engine/blob/main/plans/port-catalog/README.md)
(soupis stavu portace na úrovni algoritmů).

**Strojově čitelným** zdrojem pravdy o tom, které grafy jsou *akceptovány* (třída 1
níže), je
[`test/corpus/accepted-divergences.json`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/accepted-divergences.json).
Nástroje jej připojují při tvorbě reportu: `PARITY-dot.md` odděluje **akceptované
odchylky** od **sledovaného** backlogu a brána pravidel z něj čerpá svůj seznam
povolených. Textové sekce níže vysvětlují každý záznam (A1 a A3 jsou živé; A2 je
uzavřena a ponechána jako historie); test v CI (`accepted-divergences.test.ts`)
vynucuje, že každý akceptovaný graf se stále liší, takže tento seznam nemůže
nepozorovaně zetlít.

---

## Akceptované odchylky (záměrně je nečiníme shodnými) {#accepted-deltas-we-deliberately-do-not-make-conformant}

Odchylku akceptujeme — místo honění shody bajt po bajtu — pouze tehdy, když platí
**všechno** z následujícího:

- Původní příčinou je **omezení přenositelnosti** (něco, co běhové prostředí
  JavaScript/prohlížeč nedokáže přesně reprodukovat), nikoli logická chyba v portaci.
- Rozdíl je **pod hranicí vnímání** a prokazatelně **omezený**.
- Oprava by měla **neúměrné náklady a dosah** ve srovnání s přínosem (typicky: dotkla
  by se sdílené primitivy používané stovkami již shodných grafů a riskovala by
  regrese kvůli zisku zlomku pixelu).

Když odchylku akceptujeme, charakterizujeme ji zde, aby spotřebitele nikdy nic
nepřekvapilo. Grafy dotčené akceptovanou odchylkou se ověřují proti **strukturální /
toleranční** laťce místo laťky bajtové.

### A1. Determinismus plovoucí desetinné čárky (silově řízené moduly) {#a1-floating-point-determinism-force-directed-engines}

**Dotčeno:** `neato`, `fdp`, `sfdp`, `circo`, `twopi`, `osage` (iterativní moduly
založené na pružinovém modelu). *Rozvržení* modulu `dot` tímto determinismem
iterativního modelu **dotčeno není**; samostatná, úzce omezená odchylka plovoucí
desetinné čárky ve vedení splines v modulu `dot` je popsána níže v **A3**.

> **Rozsah, historicky neměřená výhrada — nyní částečně změřená.** **Hlavní
> průzkum SVG modulu dot** (`test/corpus/survey.ts`) je stále
> **pouze pro dot**: nativní orákulum běží pod `GVBINDIR=/tmp/ghl`, který
> symlinkuje **pouze** pluginy `core` + `dot_layout`
> (`test/corpus/gen-headless-gvbindir.sh` prochází právě `core dot_layout`
> — žádný layout plugin `neato`/`fdp`/`circo`/`twopi`/`osage`/`sfdp` tam není)
> a orákulum i portace se volají s modulem `dot`. Takže id korpusu jako
> `*_neato` / `*_circo` / `root_twopi` jsou v tomto průzkumu *názvy souborů*
> rozvržené modulem `dot`, nikoli svým nativním modulem, a A1 se tam shoduje s
> **nulou** grafů — ne proto, že by moduly byly prokazatelně shodné, ale proto, že
> tento konkrétní průzkum je nikdy nepoužívá.
>
> **Ale všech šest modulů A1 má nyní svůj vlastní průzkum nativního modulu**, přes
> `test/corpus/engine-walk.ts` + `parity-report.ts` (nezávislé na `GVBINDIR` —
> každý přímo spouští `dot -K <engine> -Txdot`), na dvou různých úrovních
> přísnosti zdokumentovaných samostatně níže: `circo`/`twopi`/`osage` běží se
> stejnou **deterministickou tolerancí ±0.01** jako průzkum dot s tříděním příčin
> pro každé id („Akceptace stopy modulu“ níže); `neato`/`fdp`/`sfdp` běží s volnější
> **charakterizační tolerancí ±0.5** zatím bez třídění po jednotlivých id
> („Charakterizace iterativních modulů“ níže). Aktuální čísla napříč moduly:
> [`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md).

**Charakterizace.** Tyto moduly provádějí iterativní numerická rozvržení, jejichž
výsledky závisejí na zaokrouhlování plovoucí desetinné čárky — konkrétně na fused
multiply-add (FMA) a `Math.pow`, které se mohou lišit napříč JavaScriptovými enginy
a architekturami CPU. Portace odpovídá pořadí operací v C, kde to jde
(`src/common/fma.ts`, `src/common/arm-pow.ts`) — např. `sfdp` se vůči nativnímu
orákulu zafixuje na ~6 platných číslic se sladěným PRNG a `fma` — ale přesná,
souřadnicově identická reprodukce **není zaručena napříč platformami**. Topologie
je zachována; potenciální odchylka je v jemných souřadnicích uzlů.

**Proč akceptováno.** Je to tvrdé omezení běhu v JS, nikoli designová volba — ze
stejné rodiny jako citlivost A3 na Apple-`hypot`. Neexistuje způsob, jak zaručit
bitově identické výsledky transcendentních funkcí/FMA napříč všemi cílovými
běhovými prostředími, takže bajtová laťka by byla netestovatelná, nikoli jen
nákladná. **Posouzení A1** (na rozdíl od pouhého upozornění) vyžadovalo samostatnou
stopu parity nativních modulů — vytvořenou 2026-07-11 jako
`test/corpus/engine-walk.ts` + `parity-report.ts`, která zkoumá každý vstup pod
jeho vlastním modulem místo pod `dot`. Poctivým stropem této práce je A1
**zúžit** na „žádná aktivní odchylka na referenční platformě“, nikdy neodstranit
meziplatformní výhradu; dosavadní výsledky (níže) tento strop respektují:
`circo`/`twopi`/`osage` každý odhalily a zpětně vystopovaly hrstku skutečných
případů A1/A9 a `neato`/`fdp`/`sfdp` nyní stojí na 90.8/77.5/68.0 % v rozmezí 0.5pt
od nativního výstupu v univerzu 910 položek, což znamená, že portovaná aritmetika
(`fma.ts`, `arm-pow.ts`, sladěný PRNG) u většiny grafů drží — a každé zbývající
rozcházející se id je individuálně připsáno vstřikováním (drift řešiče vs. vada
portace), místo aby zůstalo netříděným driftem; viz charakterizace iterativních
modulů níže.

**Akceptace stopy modulu: rodina šipek twopi.** <a id="a1-twopi-arrows-family"></a>
Citát výše popisuje průzkum SVG modulu dot, kde se A1 shoduje s nulou grafů;
samostatná **xdot stopa modulu** `twopi` (`parity-twopi.json`, nativní orákulum
`dot -K twopi -Txdot`, `test/corpus/engine-walk.ts`) *běží* pod svým nativním
modulem a odhaluje konkrétní, ověřený případ A1 u 9 id z korpusu:
`graphs-arrows`, `graphs-newarrows`, `graphs-arrowsize`, `linux.x86-arrows_dot`,
`macosx-arrows_dot`, `nshare-arrows_dot`, `share-newarrows`, `windows-newarrows`
a (přidáno 2026-07-28, nové v univerzu 905 položek) sourozenec z directed/
`tree-graphs-directed-oldarrows` — každý se rozchází na jediné dominantní hraně
(`Z->I` nebo `i->Z`; 12–64 rozdílů kreslicích operací). Vstřikování A/B (decision
journal, 2026-07-10, záznam „injection A/B verdicts:
twopi arrows family EXONERATED...“) prokázalo mechanismus přímo:
vypsání vstupního `ND_pos` nativního `spline_edges` a jeho vstříknutí do
`splineEdgesShifted` v portaci dává **plně shodný** výstup na
`graphs-arrows` (`Z->I` se stane bajt po bajtu totožnou s orákulem, stejný
spline o 7/14 bodech) — rozdíl je tedy ze 100 % drift pozic uzlů před vedením
hran z řešiče PRISM pro odstranění překryvů v `twopi` a vedení splines/emise
v portaci jsou vyviněny. Viditelným příznakem u 6 z 8 id je překlopení počtu
bodů beziéru (`unfilled_bezier[ptCount]: 8 vs 14`): počet fitovaných kusů
`Proutespline` je citlivý na to, na kterou stranu hranice překážky driftovaná
pozice uzlu dopadne, takže podulpový rozdíl pozice po iterativním řešení PRISM
překlopí počet segmentů fitovaného splinu (zbylá 2 id,
`graphs-arrowsize`/`nshare-arrows_dot`, ukazují stejný drift jako menší
rozdíl pouze v pozici bez překlopení počtu kusů). Akceptováno na úrovni stopy
modulu přes `test/corpus/accepted-divergences-engines.json`, připojeno do
`PARITY-twopi.md` pomocí `parity-report.ts` — stejné připojení, jaké provádí
`accepted.ts` pro `PARITY-dot.md` na stopě dot.

Analýza příčiny u `oldarrows` (2026-07-28) určila přesné místo překlopení
příznaku počtu bodů v této rodině. Její vějíř `i`–`Z`–`I` je kolineární na
průměru kruhu a `intersect()` v pathplan `directVis` zablokuje zorný paprsek,
když vrchol překážky leží „na“ úsečce — kde tolerance kolinearity 1e-4 ve
`wind()` způsobí, že i uzel vzdálený 270pt od úsečky se počítá jako kolineární,
a `inBetween()` (které kolinearitu předpokládá) pak degeneruje na testování
pouze **projekce x**: vrchol blokuje, právě když jeho x leží striktně uvnitř
intervalu o šířce ULP mezi x-ovými souřadnicemi obou koncových bodů. Která ze
dvou zrcadlových radiálních hran se ohne, tedy závisí na pořadí posledního ULP
tří nominálně stejných hodnot x z řešení PRISM — C ohýbá `Z->I`
(osový vrchol uzlu `i` dopadne dovnitř jeho intervalu), portace ohýbá `i->Z`
(vrchol uzlu `I` dopadne dovnitř jeho vlastního). Zopakování `directVis` offline
na vypsané množině překážek každé strany přesně reprodukuje rozhodnutí každé
strany a vstříknutí `ND_pos` orákula před vedením hran do portace dává 0 rozdílů
(`attribution-twopi.json`) — vedení a emise jsou bajt po bajtu věrné.

`1855` je radiální/hvězdicová **zrcadlová** varianta téhož mechanismu FP v PRISM
před vedením hran (akceptováno 2026-07-11): jeho 31 listů je přesně kocirkulárních,
takže hvězdicové rozvržení je symetrické podle zrcadlení a odstranění překryvů v
PRISM sedí na rovnováze nestabilní vůči symetrii; rozdíl 1 ULP mezi V8 a libm v
`cos`/`sin` u 5 úhlů listů v `setAbsolutePos` ve funkci `circleLayout` vybere opačnou
zrcadlovou pánev a celé radiální rozvržení dopadne jako přesné zrcadlení orákula
podle osy x (maximální posun uzlu 6.04pt, bb zachován). Vstřikování A/B prokázalo
oba směry: vložení přesných pozic `circleLayout` z C do PRISM v portaci reprodukuje
orákulum uzel po uzlu (3e-14) a obnovení pouze 5 pozic listů lišících se o ULP
překlopí celé rozvržení zpět do zrcadla portace. Úplná analýza příčiny:
`.agent-notes/twopi-radial-drift-rca.md` (decision journal 2026-07-11).

**Charakterizace iterativních modulů: neato/fdp/sfdp.** <a id="a1-iterative-characterization"></a>
Na rozdíl od stop modulů `circo`/`twopi`/`osage` výše nejsou `neato`/`fdp`/`sfdp`
zatím tříděny po jednotlivých id — `engine-walk.ts` pro tyto tři zaznamenává pole
`tolerance: 0.5` a `parity-report.ts` je vykresluje v samostatné sekci
„Iterative engines (±0.5 characterization)“ v
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md),
výslovně **nesrovnatelné** s deterministickými mírami úspěšnosti ±0.01 jinde v
tomto dokumentu. Aktuální počty (univerzum 910 položek; procento úspěšnosti
vynechává vstupy, které C orákulum nedokáže vykreslit, podle [Shoda](./conformance.md)):

| modul | prozkoumáno | v rámci ±0.5pt | neshodné (všechny připsány, akceptovány) | chyba portace / timeout | chyba orákula |
|---|---:|---:|---:|---:|---:|
| `neato` | 910 | 826 (90.8%) | 83 | 1 | 0 |
| `fdp`   | 910 | 703 (77.5%) | 204 | 0 | 3 |
| `sfdp`  | 910 | 619 (68.0%) | 290 | 1 | 0 |

(První průchod, 2026-07-11 při 762 položkách, naměřil 263/311/260 v rámci
±0.5pt — skok na současné míry přinesly od té doby nasazené opravy jednotlivých id,
zejména neportované zpracování `user_pos`/`P_SET` v neato, konsolidace
inicializace modulů a oprava makro-vs-funkce u `setEdgeType`.)

Na rozdíl od prvního průchodu je nyní každý rozcházející se řádek individuálně
připsán: vstřikovací harness (`test/corpus/attribute-divergence.ts`) vkládá
`ND_pos` nativního orákula před vedením hran do portace a znovu porovnává, a každé
aktuální rozcházející se id je buď `drift-exonerated` (vedení a emise portace přesně
reprodukují orákulum, jakmile se drift řešiče odstraní), nebo jedním z hrstky
samostatně akceptovaných zbytků po jednotlivých id (`241_0` — remíza incircle v CDT
na všech třech modulech, neato `2239`, sfdp `42`/`2556`).
Akceptace třídy níže formalizuje vyviněnou množinu; aktuální počty v přehledech
jednotlivých modulů
([`PARITY-neato.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-neato.md),
[`PARITY-fdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-fdp.md),
[`PARITY-sfdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-sfdp.md)).

**Akceptace třídy A1-drift (iterativní moduly, počítané členství).**
<a id="a1-drift-iterative-engines"></a> `test/corpus/accepted-divergences-engines.json`
obsahuje jeden záznam **třídy** `"A1-drift"` pro každý iterativní modul (`neato`,
`fdp`, `sfdp`) — `{ class: true, attributionFile, ref }` — odlišný od záznamů po
jednotlivých id používaných stopami `circo`/`twopi`/`osage` výše (D2,
`plans/iterative-parity-campaign/decisions.md`). Na rozdíl od záznamu po id se
členství ve třídě v registru nikdy neenumeruje ručně: `parity-report.ts` je
počítá při tvorbě reportu z odpovídajícího `attribution-<engine>.json`
(harness pro připisování vstřikováním z T1, `test/corpus/attribute-divergence.ts`)
— každé rozcházející se id, jehož nativní `ND_pos` před vedením hran byl vstříknut
do portace a po opětovném porovnání se shoduje na ±0.5, dostane v tomto souboru
`verdict: 'drift-exonerated'`, což znamená, že iterativní řešiče obou modulů
konvergovaly k numericky odlišným, ale každé vnitřně konzistentním rozvržením
(rozdíl v akumulaci plovoucí desetinné čárky podle charakterizace A1 výše, nikoli
chyba vedení nebo emise v portaci). Důkazy po jednotlivých id — tvar kbelíku, počet
rozdílů základní vs. po vstříknutí, detekce rovnoměrného posunu/zrcadlení — žijí v
samotném artefaktu atribuce, nejsou duplikovány do tohoto dokumentu ani do registru
(D2). Id, které později začne procházet úplně, nebo jehož nová atribuce změní
verdikt, z třídy vypadne automaticky při další regeneraci reportu — není třeba
žádná úprava zastaralé akceptace a žádné selhání hlídacího testu. Moduly, jejichž
`attribution-<engine>.json` ještě nebyl vygenerován, vykreslují třídu jako
„attribution pending“ s nulou členů, shodně s tím, jako by žádnou akceptaci neměly
— záznam třídy smí předcházet svým datům (viz
`test/corpus/accepted-divergences-engines.test.ts`).

### A2. Měření textu (metriky písma) → rozvržení řízené popisky — UZAVŘENO <a id="a2-text-measurement-font-metrics-→-label-driven-layout-—-closed"></a> {#a2-text-measurement-font-metrics-label-driven-layout}

**Stav (2026-07-01): uzavřeno.** V této třídě již není akceptováno žádné id z
korpusu; sekce je ponechána jako historická dokumentace mechanismu a zásuvného
bodu `TextMeasurer` s možností injekce, který jej neutralizoval.
Postupné opravy měření textu (přechod na `EstimateTextMeasurer`,
vertikální metriky závislé na písmu, oprava ne-ASCII bajtů UTF-8) vyřešily téměř
každou odchylku rozvržení řízenou popisky, která zde dříve žila. **`proc3d`** —
dřívější kanonický příklad A2 — je plně **`conformant`** ve všech třech
adresářích korpusu (`graphs-`/`share-`/`windows-proc3d`): shodný bbox, nulové
rozdíly v datech cest, nulové rozdíly v kotvách popisků.

**Poslední členové vyřazeni (2026-07-01).** **Rodina `NaN`**
(`graphs-NaN` / `share-NaN` / `windows-NaN`) se zde vedla dlouho poté, co její
geometrie uzlů již přesně odpovídala C (76/76 referenčních bodů). Její skutečný
zbytek — 8 koncových bodů přímých hran na čtyřech protilehlých 2-cyklech
(`Target↔TThread`, `Interp↔InterpF`, `Event↔Target`,
`AtomProperties↔NRAtom`) posunutých o 6–14 pt — byl znovu diagnostikován a ukázalo
se, že **nejde vůbec o efekt metriky písma**, ale o dvě vady portace ve vedení
vícenásobných hran v dot (mise `plans/fix-nan-a2-retire/`,
`.agent-notes/nan-edge-endpoint-diagnosis.md`):

1. **Pořadí drah u protilehlých dvojic.** Portace přeřazovala každou skupinu
   rovnoběžných hran podle původní tvůrčí sekvence před přidělením posunů drah
   Multisep; C přiděluje dráhy v pořadí sesbíraném podle edgecmp (nejprve
   dopředný reprezentant MAINGRAPH, druhý obrácený člen AUXGRAPH —
   `dotsplines.c:419`, `make_regular_edge:1885-1907`). 2-cyklus, jehož obrácený
   člen byl deklarován jako první, kreslil každou hranu v koridoru té druhé o šířce 18 pt.
2. **Falešná plochá sousednost u sloučených hran přes úrovně.** `markAdjacent`
   označoval záznamy `ND_other` bez hlídání stejné úrovně z C
   (`flat.c:272-276`), takže zkratování `groupSize` při plochých sousedech
   pohltilo zlomy skupin portcmp.

S oběma opravami provedenými věrně je rodina **`conformant`** ve všech třech
adresářích (po elementech: uzly 0, hrany 0 odlišných) a stejný mechanismus
uzavřel `42`, `clust2`, `ngk10_4` (structural-match → conformant) a posunul
`b124` z diverged na structural-match — vše na 2-cyklech/rovnoběžných dvojicích.

**Obě strany průzkumu používají stejný odhadovač — měření je neutralizováno.**
Nativní orákulum `dot` běží pod headless `GVBINDIR`
(`test/corpus/gen-headless-gvbindir.sh` → `/tmp/ghl`), který symlinkuje pouze
pluginy `core` a `dot_layout` — žádný textový layout plugin `gd`/`pango`/`quartz`.
Je-li tento slot prázdný, graphviz se vrátí k vestavěné funkci
`estimate_textspan_size`. `EstimateTextMeasurer` v portaci TypeScript
(`src/common/textmeasure.ts`) je věrnou portací téže rutiny a je
výchozí v Node, rozhoduje o něm `createMeasurer()`
(`src/common/textmeasure-factory.ts`). **Obě strany každého porovnání parity tedy
měří text identickým odhadovačem** — skutečné šířky glyfů z FreeType/pango do
porovnání nikdy nevstupují. Proto regrese verdiktu zde ukazuje na kód rozvržení,
nikoli na písmo, a proto oprava vlastních chyb odhadovače (počítání bajtů UTF-8,
závislost vertikální metriky na písmu) většinu této třídy rovnou uzavřela, místo
aby jen zúžila mezeru v metrice písma.

**Zásuvný bod `TextMeasurer` s možností injekce.** Tato neutralizace je možná jen
proto, že měření textu je záměrné rozhraní, nikoli napevno zadrátované do žádného
z modulů. `TextMeasurer` je rozhraní s jedinou metodou (`measure(text, font, size,
flags) → {w, h, …}`) injektované závislostí do každého místa, které určuje velikost
popisku — `polyInit`, `recordInit`, `initEdgeLabels` a `buildNodeLabel` přebírají
měřič jako parametr; nic neměří text přes globální stav. Pro testy/CI se zafixuje
přes `setTextMeasurer(...)` nebo `GV_TEXT_MEASURER=estimate`.
Toto rozhraní také umožňuje *prokázat*, že zbytek je čistě měřicí: dejte portaci
přesné šířky, které naměřilo C (zachycené z orákula), a ověřte, zda rozvržení pak C
přesně reprodukuje. Právě tento pokus původně opravňoval verdikt A2 pro `proc3d`
(viz historická příloha níže) — technika zůstává platná. Její opak třídu vyřadil:
protože měření bylo na obou stranách průzkumu prokazatelně neutralizováno, nemohl
být zbytek hran `NaN` efektem metriky písma, což vynutilo opětovnou diagnózu, která
našla dvě výše uvedené vady vedení.

::: details Historická analýza (překonána 2026-06-30) — ponechána pro záznam
Níže uvedený materiál popisuje dřívější stav této třídy, před tím, než většinu z ní
uzavřel přechod na `EstimateTextMeasurer`, vertikální metriky závislé na písmu a
oprava ne-ASCII bajtů UTF-8. Již nepopisuje současné chování — ponechán pouze proto,
aby se neztratila úvaha, která vedla sem. Zejména: (1) čísla šířek „nativního C“ v
měřicí tabulce níže jsou hodnoty **FreeType** z cesty vykreslování se skutečným
písmem; průzkum parity tuto cestu nikdy nepoužívá — obě strany běží na
`estimate_textspan_size` (viz výše) — takže tabulka neodráží, jak se parita
aktuálně měří; (2) překryvné obrázky a vykreslení golden/naše níže zobrazují
**mimokorpusový** `proc3d` (`graphs/directed/proc3d.gv`, ~2620 pt), který není
součástí průzkumu parity; varianty `proc3d` v korpusu jsou nyní shodné s nulou
rozdílů, takže pro ně není co překrývat; (3) vyprávění o x uzlů u
`NaN`/`ratio=compress` níže je překonáno — současné měření ukazuje, že všech 76
bodů uzlů přesně odpovídá, takže řetězec chyba šířky → posun uzlu, který popisuje,
pro `NaN` již neplatí.

**`NaN` pod `ratio=compress` (historicky).** Rodina
`NaN.gv` (`orientation=landscape; ratio=compress; size="16,10"`) byla případem
A2, jehož verdikt tehdy skončil na *diverged* místo *structural-match*. Cesta x-ové
sítě network simplex při kompresi byla věrná — každý vstup omezení odpovídal C
(hodnota omezení šířky, minlen v `containNodes`, počty pomocných hran 471/wt 1612,
`lrBalance` a pořadí na úrovních vesměs shodné) *kromě* polovičních šířek 9 uzlů,
které měřič uváděl o 0.5–1.03 pt širší než C. Balení s vahou 1000 u
`ratio=compress` učinilo normálně volná omezení vzdálenosti zleva doprava
**vazebnými**, takže se tato podpixelová chyba šířky — bez komprese neviditelná —
projevila jako vnitřní posun x o −3..−5 pt. Tento posun přetlačil přímý spline
`Target<->TThread` o 0.55 pt
přes stěnu rámečku uzlu, takže jej router ohnul do dodatečného kusu beziéru (7
bodů vs. 4 v C) — *strukturální* rozdíl, tedy *diverged*. Vynucení 9 šířek na
hodnoty z C reprodukovalo C přesně (x uzlů 53/76→0/76 mimo; spline 7→4 body),
čímž se potvrdilo, že zbytek byl na 100 % způsoben metrikami písma výše po
proudu, nikoli kódem komprese nebo splines, **pro tuto dřívější odchylku**. Úplné
důkazy (s vizuálním srovnáním golden-vs-naše vedle sebe + překryvem rozdílu splinu
4 vs. 7 bodů):
`plans/fix-compress-xcoord/comparisons/nan-compress-xcoord.html` (textový
rozbor: `…/nan-compress-xcoord.md`).

**Příklad měření metriky písma (historicky — FreeType vs. odhad).**
Nativní Graphviz, spuštěný se skutečným textovým layout pluginem (nikoli s headless
orákulem používaným průzkumem parity), měří text pomocí šířek glyfů z FreeType/libgd.
`EstimateTextMeasurer` v portaci rasterizér glyfů nereplikuje. U většiny řetězců
se obě shodují přesně; u některých se liší o zlomek bodu. Naměřený příklad —
Times-Roman 14 pt, řetězec `"/home/ek/work/src/lefty/lefty.c"` (31 znaků):

| | šířka |
|---|---|
| nativní C (FreeType) | 176.00 pt |
| @knowvah/dot-engine (odhad) | 176.75 pt |
| rozdíl | **+0.75 pt (+0.43%)** |

Druhý řádek popisku téhož uzlu, `"93736-32246"`, byl naměřen **shodně**
(96.00 pt u obou) — chyba závisí na řetězci a akumuluje se po glyfech, nejde o
rovnoměrný měřicí faktor. Tato mezera FreeType-vs-odhad je skutečná, ale **není**
tím, co měří průzkum parity (obě strany používají `estimate`); záleželo by na ní
jen tehdy, kdyby se výstup @knowvah/dot-engine porovnával se skutečným vykreslením
v C se skutečným písmem mimo tento průzkum.

**Následný efekt na dřívější odchylku `proc3d` (historicky).** Šířka popisku
ovlivňuje velikost uzlu, ta ovlivňuje rozvržení:

1. Širší popisek → o něco širší rámeček uzlu (u uzlu typu *elipsa* se šířka
   dále násobí √2, takže +0.75 pt textu → +0.53 pt poloviční šířky).
2. Poloviční šířky uzlů určují omezení vzdálenosti zleva doprava v network simplex
   pro x-ové souřadnice; tato omezení se zaokrouhlují pomocí `ROUND()` na celá
   čísla, takže podpixelová změna šířky může přetlačit omezení z *N* na
   *N+1*.
3. Network simplex pak zvolí odlišné — ale stejně optimální — celočíselné
   přiřazení x, které posune některé x-ové pozice uzlů o 1–2 jednotky.

U mimokorpusového `proc3d.gv` (`graphs/directed/proc3d.gv`, ~2620 pt, není členem
průzkumu parity) to vedlo k rozdílu v x-ovém rozsahu **≤ 3.55 pt**
(**0.13%**), překryto níže — **zelená = nativní C `dot` (golden), červená =
@knowvah/dot-engine (naše)**:

![Překryv proc3d golden vs. naše: zelená = C, červená = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Po zvětšení se lem objevoval téměř výhradně na dlouhých oválných popiscích s
cestami k souborům:

![Překryv proc3d zvětšený na široké oválné popisky cest: zelená = C, červená = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

| Golden — nativní `dot` | Naše — @knowvah/dot-engine |
|---|---|
| ![proc3d vykreslený C Graphviz](/img/proc3d-golden.svg) | ![proc3d vykreslený @knowvah/dot-engine](/img/proc3d-ours.svg) |

Samostatný rozbor (původní příčina, čísla po jednotlivých metrikách, příkaz pro
reprodukci) je na vlastní stránce:
[**proc3d — kanonická odchylka A2 v metrice písma (historická)**](/cs/divergences-proc3d-a2).
Tato stránka popisuje vyřešenou odchylku na mimokorpusovém vstupu; aktuální
varianty `proc3d` v korpusu jsou shodné.

**Proč to bylo tehdy akceptováno.** Shoda bajt po bajtu se šířkami glyfů z FreeType
napříč každým písmem a řetězcem by vyžadovala replikovat jeho tabulky metrik,
hinting a zaokrouhlování — rozsáhlé, křehké a stále bez záruky přesnosti. Měřič
textu je sdílená primitiva: protéká jím každý popisek v korpusu, takže oprava
zaměřená na jediný řetězec riskovala regresi jiných kvůli odměně pod hranicí
vnímání.
:::

### A3. Rozhodnutí remízy `hypot` ve vedení splines (`dot`) {#a3-hypot-tie-break-in-spline-routing-dot}

**Dotčeno:** grafy `dot` s **geometricky symetrickým** kanálem vedení hran —
typicky krátký, symetrický oblouk ploché hrany. Pozorovaný příklad: `2368`,
který zůstává na *structural-match* (maxΔ ≈ 10.2 pt na **jedné** hraně, `376->76`).
Stejná remíza se projevuje i na **dlouhé** (víceúrovňové) hraně do
huby s vysokým vstupním stupněm, když je koridor přesně zrcadlově symetrický:
`graphs-b100` / `graphs-b104` (identický zdroj) se rozcházejí o maxΔ 20 (přesně
jeden řádek úrovně) na jediném uzlu `Node23730->Node23729` — každá pozice uzlu a
veškerá struktura boxů/polygonů/napjaté cesty před ním je bajt po bajtu totožná s C;
liší se pouze volba, kterou zrcadlově symetrický vnitřní bod se v `findMaxDev` o
~1 ULP stane uzlem beziéru. Krátká forma ploché hrany se projevuje i jako `241_1`
(structural-match, maxΔ ≈ 2.4 pt) — odlišný sourozenec orákulem zafixovaného
`241_0`, který šum C naopak řeší „první vyhrává“. Stejná remíza vytváří rozdělení
štěrbinového koridoru zpětné hrany popisovaného 2-cyklu v `2413_1`
(structural-match, maxΔ 67.65) a `2413_2` (maxΔ ≤99.55, jakmile bude nasazena oprava
T11 swapBezier-reverse — do té doby je hlášené maxΔ 1922.26 souboru dominováno
nesouvisející, samostatně sledovanou vadou) a jedinou popisovanou hranu uvnitř
clusteru v `graphs-decorate` (maxΔ 43.54); v každém případě se dva kandidátní
rohy rozdělení před tím, než šum Apple `hypot` závislý na pozici vybere vítěze,
vyrovnají na 5.7e-13 (rodina 2413) / 3e-14 (decorate). `2371`
(structural-match, maxΔ 16.8) vykazuje stejný otisk na dvou nesouvisejících
hranách (`g[9263]` `r6837mid--r9687mid`, `g[23859]` `r38mid--r8699mid`): portace
vydává na obou přesné zrcadlení posloupnosti řídicích bodů orákula, y uzlu
překlopeno o shodné Δ16.8 (horní/dolní zlomky rozdělení prohozeny).
Jeho původ je kvalifikován s důvěrou **MEDIUM**, nikoli s důvěrou CONFIRMED
ostatních členů: `2371` balí ~199 komponent, což odpojuje souřadnice lokální v
pathplan od souřadnic stránky, takže se remízu nepodařilo ve třech pokusech o
instrumentaci živě korelovat s `route.ts:209`; původ v segmentaci v přímém režimu
nebo v `recover_slack` po ořezu není zcela vyloučen. Úplná diagnóza:
`plans/residual-cleanup/analysis/2371-mirror.md`. Většina vedených hran
dotčena není.

::: details Definice grafu (`2368.dot`)
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

**Charakterizace.** Fitter splines (`Proutespline` → `findMaxDev`,
`src/pathplan/route.ts`) rozděluje fitovaný beziér ve vnitřním bodě trasy s
maximální odchylkou. Je-li kanál symetrický, jsou dva kandidátní body rozdělení
**přesnou matematickou remízou** a vítěze pak rozhoduje šum zrušení plovoucí
desetinné čárky řádu ~1e-14 při vyhodnocení beziéru v absolutních souřadnicích,
jehož **znaménko závisí na absolutní poloze**.

Vzdálenost odchylky v C je libm `hypot` a macOS Apple `hypot`, který vygeneroval
orákulum, je proprietární implementace, která bitově neodpovídá **žádnému**
přenosnému `hypot` (měřeno proti němu v souřadnicovém režimu graphviz, míry
bitové shody: V8 `Math.hypot` ≈ 63 %, správně zaokrouhlený `hypot` / ve stylu Arm
≈ 84 %, fdlibm `hypot` ≈ 90 %, `sqrt(dx²+dy²)` ≈ 94 %). Kvůli tomuto šumu ULP
**není ani samotné C konzistentní**: dva *translačně shodné* oblouky rozdělí ke
**opačným** rohům. V rámci `2368` je oblouk `376->76` zrcadlovým obrazem
geometricky identického oblouku `256->436`:

```
C    376->76 : M273.31,-4.56 C268.33,-3.14 263.11,-1.9  258.11,-1.15 250.49,0     242.34,-0.98 234.83,-2.8
port 376->76 : M277.29,-4.51 C268.27,-1.69 257.65,0.32  247.89,-1.15 244.92,-1.59 241.88,-2.21 238.85,-2.94
```

Celý rozdíl, překryt (zvětšení 12× na oblouku `376->76` / `to1`) — **zelená = C
Graphviz, červená = @knowvah/dot-engine**. Oba jsou týmž mělkým obloukem dolů mezi
týmiž hranicemi uzlů; liší se o ~1–2 pt v břichu (prostřední řídicí bod beziéru),
kde se remíza v C zlomila k opačnému rohu:

![Oblouk 2368 376->76: zelená = C, červená = @knowvah/dot-engine](/img/2368-376to76-overlay.png)

Vše ostatní se shoduje v rámci tolerance — stejný ohraničující obdélník (608×148), pozice uzlů,
popisky, hroty šipek i všechny ostatní hrany. Celá vykreslení jsou vizuálně
nerozlišitelná:

| C Graphviz | @knowvah/dot-engine |
|---|---|
| ![2368 vykreslený C Graphviz](/img/2368-c.png) | ![2368 vykreslený @knowvah/dot-engine](/img/2368-port.png) |

Portace používá **translačně ekvivariantní** rozhodnutí remízy (skutečná remíza se
vždy rozhodne ve prospěch prvního indexu), takže kreslí *každý* takový oblouk stejně
bez ohledu na polohu — je vnitřně konzistentní a shoduje se s C na obloucích, kde šum
C také zvolí „první vyhrává“ (např. `256->436` a `241_0 5:ne->8:nw`), a rozchází se
jen tam, kde šum C překlopí druhým směrem (`376->76`). Koncové body, cíl hrotu
šipky, ostatní hrany, všechny uzly, popisky i ohraničující obdélník se shodují v
rámci tolerance; posunou se jen vnitřní řídicí body jediného oblouku (~1–2 pt v břichu).

**Proč akceptováno.** Apple `hypot` není napříč JS enginy a CPU o nic reprodukovatelnější
než FMA/`pow` z **A1** — je to totéž omezení přenositelnosti, jen v routeru splines
modulu `dot`. Shodnout se na volbě C *závislé na pozici* by znamenalo převzít striktní
rozhodnutí remízy z C, které žije ve **sdílené primitivě**, jíž prochází každá vedená
hrana: tím by se shoda `376->76` vyměnila za *nové* neshody na obloucích, kde C
dopadne opačně (regreskovalo by `241_0` a případ orákula s plochou hranou `cnt=3`),
tedy čistá nula, která navíc obětuje translační ekvivarianci portace. Proto
ponecháváme konzistentní (ekvivariantní) router. Jde o omezenou odchylku modulu
`dot` pod hranicí vnímání — nikoli o otevřenou chybu. Úplné vyšetření:
`.agent-notes/2368-residual-flat-label-ranksep.md`.

### A4. Orákulum v uznaně rozbitém stavu (rodina init_rank / pathplan) {#a4-oracle-in-an-acknowledged-broken-state-the-init-rank-pathplan-family}

**Dotčeno:** `2796` (structural-match, maxΔ 49), `2471` (structural-match,
maxΔ ~9063), `1435` (structural-match, maxΔ 503), `1581` (diverged, maxΔ 465). Členové
rodiny `1939` a `2825` jsou **conformant** a nemají záznam a `2470`
a `graphs-structs` se k nim připojily 2026-07-11 (oba se zhroutily na conformant
po nasazení oprav ortho adjacency-spill/chancmpid, fmadd `polylineMidpoint` a
zaokrouhlování remíz half-even — portace nyní přesně reprodukuje výstup obnovy
orákula, včetně identických ztracených hran); jejich akceptační záznamy jsou
vyřazeny.

`1581` a `2825` byly případy obnovy po pádu (mise fix-element-count-bucket):
fuzzerové/degenerované vstupy, u nichž upstreamové testy tvrdí **pouze**,
že dot nespadne (`test_1581`: žádné porušení ASan; `test_2825`: žádný
pád, když `rebuild_vlists` vrátí -1). C narazí na interní `Error:`
(`install_in_rank` / `rebuild_vlists: lead is null`) a jeho obnova
zahodí obsah rozvržení; portace dospěje k **identickým rozhodnutím o mazání
množin úrovní** (parita varování ověřena: stejné názvy uzlů/grafů v
upozorněních „already in a rankset“ funkce `mark_clusters`, cluster.c:317-320).

`2825` je nyní plně uzavřen. Mise fix-2825-rebuild-vlists (po 1581)
nejprve uzavřela mezeru o jednu vrstvu: portace dospěje k *přesně* témuž
stavu interní chyby jako C — bajt po bajtu totožný stderr včetně pořadí zpráv
(`Error: rebuild_vlists: lead is null for rank 1` a poté nepředponované
pokračování `agerr(AGPREV, ...)` `concentrate=true may not work
correctly.`) — přičemž `dotLayoutPipeline` správně propaguje
selhání `dot_position`, aby přeskočila `dot_splines`/`dotneato_postprocess`,
shodně s `dotLayout` v C (`if (r != 0) return r;` po `dot_position`,
dotinit.c:322-325). Navazující krok (část 2) pak uzavřel zbývající
mezeru ve vrstvě vykreslování: `emit_node` v C podmiňuje každý uzel výrazem `node_in_box(n,
job->clip)` (emit.c:1806-1809) a na této cestě přerušení je `job->clip`
degenerovaný, protože `GD_bb` nikdy nenastavil `set_aspect` (uvnitř
přeskočeného konce `dot_position`) — takže C vydá *nula* uzlů, jen (rovněž
degenerované) rámy clusterů. Portace portovala stejnou bránu `node_in_box`
(`src/gvc/device.ts:renderNode`, s použitím `job.bb`/`job.pad` jako
jednostránkového ekvivalentu `job->clip`) a přestala přepočítávat
věrohodný bbox z živých pozic uzlů, když `g.info.bb` není nastaven
(`src/gvc/device.ts:render`, `job.bb = g.info.bb` doslova, zrcadlí
`gvc->bb = GD_bb(g)` z `init_gvc`, emit.c:3272) — každý modul rozvržení
si `g.info.bb` nastavuje sám ještě před během `render()` na každé cestě bez
přerušení, takže na zdravých grafech je to bajt po bajtu totožné a výstup se mění
jen na této cestě přerušení. `2825` je nyní `conformant` (výstup o 4 elementech,
bajt po bajtu totožný s orákulem). Úplné trasování mechanismu obou částí viz
`.agent-notes/2825-rebuild-vlists-abort.md`. `1581` se do nekonzistentního stavu
nikdy nedostane (jde o *jinou* upstreamovou chybu okna clusteru, nikoli
`rebuild_vlists`), takže svůj přeživší graf rozvrhne celý — ta mezera zůstává
otevřená. Výstup orákula
u `1581` je odpad z obnovy bez upstreamem definované sémantiky. Důkazy:
[`1581`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1581.md). U
každého z těchto vstupů je rozbité **orákulum v C**, podle vlastního vyjádření
graphviz: `2471`, `1939` a `1435` jsou upstream
[`xfail(strict=True)`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/tests/test_regression.py)
(issues
[#2471](https://gitlab.com/graphviz/graphviz/-/issues/2471),
[#1939](https://gitlab.com/graphviz/graphviz/-/issues/1939),
[#1435](https://gitlab.com/graphviz/graphviz/-/issues/1435), srov.
[#2796](https://gitlab.com/graphviz/graphviz/-/issues/2796)); jediný pokus o
opravu, [draft MR !4849](https://gitlab.com/graphviz/graphviz/-/merge_requests/4849),
zůstává nesloučeným konceptem (naposledy upraveno 2026-03-20). `graphs-structs` je
prastará třída ztrát při vedení záznamů (#102/#242/#274/#1323), kterou stabilní
graphviz 15.0.0 vykresluje správně — regrese orákula ve vývojovém sestavení.

**Co dělá C.** U členů `init_rank` (`2796`, `2471`, `1939`)
pomocný graf x-ových souřadnic nativního dot uzavírá orientovaný cyklus přes
hrany omezení stěn clusterů; jeho
[`init_rank`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/ns.c#L146)
nedokáže projít každý uzel, vypíše `Error: trouble in init_rank` a
rozvržení pokračuje z tohoto stavu obnovy — u `2471`/`2796` končí
odpadem z triangulace `Pshortestpath` a ztracenými hranami. U `1435` a
`graphs-structs` je rozbitou fází samotný pathplan (slepé uličky triangulace
ořezáváním uší; ztracená hrana s portem záznamu).

**Vstupy ověřeny a poté učiněny věrnými (toto je nosná část).**
Mise `verify-oracle-bug-family`
([zadání](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/README.md))
vypsala řádek po řádku graf omezení, který obě strany předkládají network simplex,
pro každého člena rodiny — a zjistila, že dřívější „čisté“ chování portace u
této rodiny pocházelo ze **čtyř skutečných vad portace**, všechny opraveny:

1. `flatEdges` vynechávala volání
   [`rec_reset_vlists`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/flat.c#L333)
   z C, takže okna úrovní clusterů zůstávala po vložení virtuálních uzlů plochých
   popisků zastaralá (jen tím portace ztrácela na `2471` **9** hran, kde C ztrácí 6).
2. Penalizace hran téže `group` se uplatňovala na smyčky místo na koncové body
   téže neprázdné skupiny
   ([`dot_init_edge`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/dotinit.c#L66)).
3. `CL_CROSS` používal hodnotu 100 z `_WIN32` v C; platforma orákula používá 1000
   ([`const.h`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/const.h#L141)).
4. Slepá ulička triangulace přerušila `Pshortestpath` místo varování s
   pokračováním + záložní přímkou v C
   ([`shortest.c:333`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/pathplan/shortest.c#L333)).

Po opravě jsou výpisy omezení NS této rodiny **řádek po řádku identické** s C
(253 volání rank2 na `2471`; všechna volání na `1939`/`1435`/`graphs-structs`)
a portace sleduje C skrz uznaně rozbitou obnovu: stejné
ztracené hrany (`3->16` u 2796; identických 6 u 2471), stejné stromy elementů.
`1939` se stal plně shodným. Zbývající číselné rozdíly (a odlišný odpad pathplan
u 1435) jsou chování *uvnitř* stavu obnovy, které politika projektu záměrně
nehoní.

**`2723` (segfault; zafixováno, nehoněno).** Nativní `dot` padá (exit 139)
na `tests/2723.dot` (neorientovaný, skupiny `rank=same`, popisované hrany), takže C
nemá žádný výstup, s nímž by se šlo shodnout. Upstreamový
[issue #2723](https://gitlab.com/graphviz/graphviz/-/issues/2723) je otevřený a
`tests/test_regression.py:test_2723` je `xfail`. Portace vyhodí
`InternalError` (`INTERNAL_ERROR`, s příčinou `TypeError` z
`src/layout/dot/flat.ts:flatLabelYpos`, kde je `rank[r-1]` nedefinováno). Bez
správného orákula zůstává poctivé selhání a portace se nemění;
`src/layout/dot/flat-2723.test.ts` ho zafixuje. Pokud upstream tento problém opraví,
tento test aktualizujte.

**Poznámka k politice.** Dřívější postoj k A4 („portace splňuje očekávání
issue; nereplikovat“) vycházel z přesvědčení, že acyklický pomocný graf portace
pochází z neškodné lokální varianty. Nepocházel — pocházel
z vady (1), která prokazatelně zbloudila u `2471`. Věrnost zdrojovému kódu
C zvítězila: portace nyní reprodukuje uznaně rozbité výsledky C z
ověřeně identických vstupů a každý záznam zde by měl být **znovu změřen,
až upstream příslušný issue opraví** (výstup orákula
se změní; očekávejte, že tato id se při takovém upgradu rozsvítí jako regrese — to
je záměr, nikoli zetlení).

**Důkazy.** Stránky srovnání po jednotlivých id (vykreslení vedle sebe + záznamy
důkazů):
[`2471`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2471.md),
[`1939`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1939.md),
[`1435`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1435.md),
[`graphs-structs`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/graphs-structs.md),
[`2796 post-fix addendum`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2796-post.md)
(základní stav před opravou zachován v
[`2796-cluster-ranking.md`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-2796-cluster-ranking/comparisons/2796-cluster-ranking.md)).
Diagnostické artefakty: `.agent-notes/2471-stale-cluster-windows-missing-reset.md`,
`.agent-notes/1939-group-penalty-clcross-misports.md`.

### A5. Neplatné vstupní bajty (reprezentace kódování) {#a5-invalid-input-bytes-encoding-representation}

**Dotčeno:** `1367` (diverged, maxΔ 0 — právě jeden strukturální rozdíl).

**V čem se liší.** Vstupní soubor obsahuje osamocený navazující bajt UTF-8 (`0x80`)
uvnitř názvu uzlu. C považuje osamocené navazující bajty 0x80–0xBF za „platné
znaky reprezentující samy sebe“ (`lib/common/utils.c:1200-1207`, bez
varování) a text `<title>` s názvem uzlu zcela obchází převod znakové sady
(bajty z `agnameof` proudí přímo do `gvputs_xml`). SVG z orákula tedy
obsahuje surový bajt a navzdory deklarovanému kódování **není platné UTF-8**.
Portace dekóduje vstup s neplatným UTF-8 záložním kódováním latin1
(`0x80 → U+0080`) a vydává správně utvořené UTF-8 (`\xc2\x80`).

**Proč akceptováno.** Hranicí I/O portace jsou řetězce JS (knihovna pro
prohlížeč). Surový neplatný bajt nemůže projít zpáteční cestou návratovou hodnotou
řetězce z `renderSvg`; shoda s C bajt po bajtu by znamenala poškodit kódování
výstupu pro každého spotřebitele. Záložní latin1 zrcadlí vlastní sémantiku obnovy
„zacházet jako s Latin-1“ v C (`utils.c:1249`). Je to omezení pod kódem —
vrstva reprezentace —, nikoli přenositelné chování, které bychom odmítli portovat.
Vše ostatní v 1367 je shodné: počty elementů (23 polyline /
103 text / 44 polygon / 24 path) a všechny souřadnice se shodují po
opravě decorate (T6).

**Důkazy.**
stránka srovnání [`1367`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1367.md)
(vykreslení vedle sebe + záznam důkazů).

---

### A6. Přetečení plátna `unsigned int` u degenerovaného vstupu {#a6-unsigned-int-canvas-overflow-on-degenerate-input}

**Dotčeno:** `1314` — vstup odvozený fuzzerem (`fontsize="991836031967s8"`),
jehož absurdní velikost písma nafoukne výkres na ~2.75e11 pt.

**Co se děje.** C ukládá `job->width` / `job->height` jako **`unsigned int`**
(`gvcjob.h:327-328`). Výraz `ROUND(...)` z obrovské velikosti v bodech (`emit.c:1249-1250`)
přeteče 32 bitů a zalomí se modulo 2³² a backend SVG ji vydá přes
**znaménkové** `%d` (`gvrender_core_svg.c:258-259`) — takže C vytiskne
`height="-425618343"`. Portace ponechává matematicky konzistentní (nezalomenou)
hodnotu. Každá další hodnota — `cx/cy/rx/ry` elipsy uzlu, kořenový `translate`,
polygon, `font-size` textu — je bajt po bajtu totožná; liší se pouze
width/height nejvyššího `<svg>`.

**Proč se tím nezabýváme.** Replikace 32bitového celočíselného přetečení z C není
chování rozvržení, které by stálo za portaci, a vstup je degenerovaný. Vraťte se k
tomu, pokud upstream přetečení opraví (např. rozšíří pole nebo velikost omezí).

<a id="a6b-degenerate-nan-layout"></a>

#### A6b. Degenerované rozvržení s NaN (`sfdp`, patologické `repulsiveforce`) {#a6b-degenerate-nan-layout-sfdp-pathological-repulsiveforce}

**Dotčeno:** `2556` — `repulsiveforce=100` (⇒ odpudivá síla používá
`pow(dist, 101)`), což žene řešič spring-electrical k **NaN v obou
modulech**. Samotné nativní orákulum vydává všechny pozice uzlů/hran jako `nan` a
degenerovaný ohraničující obdélník.

**Co se děje.** Když je každá souřadnice NaN, obě implementace serializují
zmetek odlišně: (1) bb grafu / polygon pozadí — C zaokrouhlí `NaN`
na `int`, což na arm64 dává zmetek v řádu `INT_MIN` (`bb="0,0,-4.295e+09,
-4.295e+09"`); portace ponechá `0`. (2) Kreslicí operace hran — emitační průchod
nativního potlačí `_draw_`/`_hdraw_` NaN splinu (vydá jen `pos`),
zatímco portace je vydá s NaN řídicími body. Kresby uzlů se shodují (obě je
potlačují). Žádné skutečné rozvržení na žádné straně neexistuje.

**Proč se tím nezabýváme.** Portace již reprodukuje *tentýž* NaN výbuch jako
nativní — oprava, která ji tam dostala, je skutečná (viz níže); zbývá jen
to, jak každá serializuje NaN zmetek. Replikace nedefinovaného chování `(int)NaN` v C
a jeho potlačení kreslení NaN splinu není smysluplná věrnost rozvržení u vstupu,
jehož rozvržení je degenerované v obou modulech. Vraťte se k tomu, pokud upstream omezí
`repulsiveforce` nebo ošetří pozice NaN.

**Opravy portace, které to zpřístupnily (nejde o odbytí — skutečné chyby).** Před
nimi se portace do degenerovaného stavu ani nedostala: (1) `armPow`
(`src/common/arm-pow.ts`) vyhazoval výjimku při každém argumentu mimo rychlou cestu; nyní portuje celou speciální
větev ARM `pow.c`, takže `pow(NaN, y) = NaN` jako v libm. (2)
`bezierClip` (`src/common/splines-geom.ts`) se při NaN řídicích bodech točil
donekonečna, protože jeho test konvergence byl naivní negací `while (ABS > .5)` z C
(ekvivalentní pro konečné hodnoty, nikoli pro NaN); nyní zrcadlí C přesně a
na NaN skončí. Obě jsou věrné C a týkají se pouze vstupů s NaN.

---

### A7. Hranice zaokrouhlení stěny boxu v `round()` (`dot`) {#a7-round-box-wall-rounding-boundary-dot}

**Dotčeno:** `graphs-honda-tokoro` a (přidáno 2026-07-28, nové v univerzu
905 položek) jeho sourozenec z `graphs/directed/` `tree-graphs-directed-honda-tokoro`
(oba structural-match, maxΔ ≈ 1 pt na jediné hraně `n012->n011`). Sourozenec
se liší pouze atributy `samearrowhead`, které se vedení tohoto páru nedotýkají —
jeho geometrie `n012->n011` je bajt po bajtu totožná s akceptovaným id na straně
portace i orákula, takže mechanismus níže platí doslova i pro něj.

**V čem se liší.** Stěna boxu koridoru hlavy v `maximal_bbox` dopadne v C na vnitřní
x=90, zatímco v portaci na x=89, a to u sdíleného portu `samehead` dvou
rovnoběžných hran `n012->n011`. Konstrukce sdíleného portu (`buildSharedPort`) i
seskupení rovnoběžek jsou bajt po bajtu shodné s C; mezera 1 px je čistě
artefakt hranice zaokrouhlení v `round()` — ~1e-14 upstreamového šumu plovoucí desetinné
čárky přetlačí hodnotu ležící přesně na hranici `.5` k sousednímu celému číslu.
Vzorec `maximal_bbox` v portaci již přesně zrcadlí C.

**Proč se tím nezabýváme.** `round()` je primitiva, kterou prochází každá vedená hrana v
korpusu; upravovat chování její hranice kvůli tomuto jednomu případu je
riziko regrese napříč korpusem kvůli 1 px na 2 hranách — totéž omezení sdílené
primitivy jako zaokrouhlování řídicí obálky zmíněné v
`bbox-class-control-hull-vs-curve`. Úplná diagnóza:
`.agent-notes/honda-samehead-shared-port.md`.

---

### A8. Zaokrouhlení `fp-contract`/FMA vs. striktní IEEE (`dot`) {#a8-fp-contract-fma-rounding-vs-strict-ieee-dot}

**Třída.** clang arm64 kompiluje binárku orákula s `-ffp-contract=on`,
čímž vybrané posloupnosti násobení-sčítání slučuje do jednotlivých instrukcí FMA;
portace běží na V8, který provádí striktní zaokrouhlování IEEE-754 a nemůže vydávat
`fma`. Na bitově identických vstupech se obě liší o 1-2 ULP v tom výrazu,
který se kompilátor rozhodl kontrahovat. Strana portace je vždy výsledkem
striktního IEEE-754; strana orákula je vždy výsledkem kontrahovaným pomocí FMA.
Jde o omezení přenositelnosti kompilátoru/běhového prostředí pod sémantikou
zdrojového kódu C, nikoli logickou vadu portace — neredukovatelné bez
softwarové emulace specifických kontrakčních voleb clangu. Známé jsou dva případy,
na dvou různých místech, se dvěma různými mechanismy zesílení:

- **2646** — ULP vzniká uvnitř kubického řešení `points2coeff`/`solve3`
  v `Proutespline` a přímo překlopí počet kořenů fitteru splines.
- **2620** — ULP vzniká ve smyčce rozsahu vrcholů polygonu v `poly_init`
  (dimenzování uzlu) a je dále po proudu zesílen věrným celočíselným ořezem
  `ortho` v každém relaxačním kroku do překlopení remízy stejně nákladného
  koridoru bludiště.

**Dotčeno:** `2646` (structural-match, maxΔ 42.09 na 3 z 21 216 hran:
`edge2575` `g[4639]`, `edge3905` `g[7777]`, `edge15467` `g[30201]` — všechno
trasy dlouhých hran v režimu smode s porty záznamu `:c->:nb_part`). Sourozenec **A3**: obě
třídy jsou neredukovatelné remízy přenositelnosti plovoucí desetinné čárky uvnitř
`Proutespline`, ale mechanismus je odlišný — artefakt kompilátorového
`fp-contract`, nikoli libm `hypot`.

**V čem se liší.** Na všech třech hranách se rozchází pouze poslední volání
`routesplines` (přímý úsek do portu hlavy). Jeho koncový bod leží bitově přesně na
spodní stěně bariérového polygonu s tečnou rovnoběžnou s touto stěnou
(`evs[1]=(1,-1.22e-16)`), takže každý kandidát `splinefits` je v `t=1` tečný
k bariéře — téměř dvojnásobný kořen průsečíkové kubiky.
`points2coeff` počítá tuto kubiku katastrofálním krácením (členy
kolem ~7446 se zhroutí na ~0.099). Orákulum (clang/arm64,
`-ffp-contract=on`) kontrahuje `v3 + 3*v1 - (v0 + 3*v2)` do fused
multiply-add, zatímco V8 provádí striktní zaokrouhlování IEEE — obě se liší
o ~9.1e-13 na **bitově identických vstupech** a tento šum překlopí znaménko
diskriminantu `solve3`: C najde 1 kořen (866.7, uvnitř segmentu); portace
najde 3 kořeny s falešným partnerským kořenem v `t=0.9999975 < 1-EPSILON2`. Falešný
kořen spustí jednu dodatečnou iteraci půlení `a`, která překlopí
velikost tečny posledního kusu faktorem 2 (v obou směrech napříč
třemi hranami), což po ořezu vyvolá maxΔ 42.09 (26 rozdílů v SVG).

**Proč akceptováno (neredukovatelnost prokázána řízeným pokusem).** Všech šest
volání `routesplines` bylo vypsáno na obou stranách — box, polygon, `PL`, start,
konec a `evs` jsou bajt po bajtu totožné, stejně jako výstupní spline dřívějšího
(nikoli posledního) volání; jediná odchylka je uvnitř `solve3` posledního volání.
Samostatný harness v čistém C izoloval jedinou proměnnou: kompilace s
`-ffp-contract=off` reprodukuje **portaci** bitově přesně na všech 3 hranách;
výchozí kontrakce (`on`) reprodukuje **orákulum** bitově přesně na všech 3
hranách. Portace tedy již souhlasí se striktním IEEE-754 C; odchylka je zcela
volbou FMA kontrakce kompilátoru orákula, pod sémantikou zdrojového kódu C —
neexistuje žádná nevěrnost na úrovni zdroje, kterou by bylo možné opravit. Cílená
oprava (ruční emulace kontrakce v `points2coeff`) byla vyzkoušena a
vyvrácena: opraví 2 ze 3 hran, ale ne třetí, jejíž překlopení
pochází z vlastní interní kontrakce uvnitř `solve3`. Úplná oprava by
vyžadovala softwarovou emulaci FMA napříč celým fitterem splines — náklady v
horké smyčce s dosahem na zaokrouhlování v celém korpusu kvůli odměně pod
pixelem na 3 hranách.
Úplná diagnóza: `plans/residual-cleanup/analysis/2646-fp-contract.md`.

**Dotčeno (historicky):** `2620` (býval structural-match, maxΔ 585; 423 rozdílů
na 24 cestách hran + 22 hrotech šipek). **Zhroutil se na conformant 2026-07-11**:
věrná portace přetečení adjacency bufferu `sgraph` + obousměrného
obsažení `chancmpid` (viz `.agent-notes/ortho-maze-circo-rca.md`) odstranila
odchylku; akceptační záznam je vyřazen a tato sekce je ponechána jako
dokumentace třídy A8.

**V čem se liší.** Řetězec `ortho` (`splines=ortho`) je při identických
vstupech bajt po bajtu shodný s C — prokázáno vstříknutím přesného vstupu bludiště z C
(souřadnice, `xsize`/`ysize`) do fáze ortho v portaci: 378/378 vedených
segmentů vyjde bajt po bajtu totožně, takže na vině není nic v `src/ortho`.
Skutečná odchylka je 1-2 ULP ve *vstupu* bludiště: `ysize` uzlu (a následnou
akumulací v rámci úrovně `ND_coord.y`) vypočtené ve smyčce rozsahu vrcholů polygonu v `poly_init` v C
(`shapes.c`), která při
`-ffp-contract=on` slučuje `R.x += sidelength*cosx` do FMA o ~1
ULP většího než striktní aritmetika IEEE v portaci (obě strany implementují
aritmeticky identický výraz). `2620` má 173 polygonových uzlů s necelou šířkou;
všechny vykazují C ≥ portace o 1-2 ULP. Tento ULP je zesílen — nikoli
zaveden — relaxací Dijkstra v `ortho`, která věrně ořezává svou
běžící vzdálenost po každém kroku (`sgraph.c:165`, v portaci zrcadleno jako
`Math.trunc`) přes váhy odvozené ze surových rozsahů buněk
(`maze.c:257`). Geometrie posunutá o ULP překlopí remízu stejně nákladného koridoru
u 4 vedených hran (cesty + jejich hroty šipek); zbylé rozdíly jsou
následné přečíslování stop o ±1 vyvolané těmito 4 překlopeními.

**Proč akceptováno (neredukovatelnost prokázána řízeným pokusem).** Samostatný
harness v C měnící pouze `-ffp-contract` reprodukoval obě strany na
odchylném vrcholu šestiúhelníku: `-ffp-contract=on` → `310.29250168188713`
(shoduje se s orákulem), `-ffp-contract=off` → `310.29250168188707` (shoduje se
s portací), přičemž odchylná operace byla izolována na vrchol `i=3`
(`R.x=-0.50000000000000011` sloučeno vs. `-0.5` nesloučeno). Druhý
pokus se vstřikováním vstupů (jediná proměnná: vstupní hodnoty ortho) potvrdil
zesilovač: předání přesných `coord`/`xsize`/`ysize` z C do `orthoEdges`
portace zhroutí všechny 4 odchylky koridoru na 0 — kód ortho
nemá žádnou vadu, je jen citlivý (jako vlastní vedení podle nákladů bludiště v C)
na posun vstupu o 1-2 ULP. Shoda by znamenala emulovat
specifickou FMA kontrakci kompilátoru clang u jednoho zkompilovaného stromu výrazů v
`poly_init` — honění zkompilovaného artefaktu, nikoli portace sémantiky zdroje.
Úplná diagnóza: `plans/ortho-2620-residual/analysis/2620-ortho-route.md`.

**Emulovaná výjimka (neakceptováno): `triang.c:ccw`.** Jedno kontrakční
místo JE reprodukováno bit po bitu místo akceptování: `ccw` v pathplan
se kompiluje na `fnmul`+`fmadd` (přesný první součin − zaokrouhlený druhý), takže
bod dotazu bitově rovný koncovému bodu segmentu se testuje jako ISCW/ISCCW místo
ISON. `shortest.c:pointintri` pak odmítne koncové body ve vrcholech polygonu
(„destination point not in any triangle“) a `makeMultiSpline` se vrátí
k prostému vedení u každého sloučeného 2-cyklu — velké, diskrétní chování
napříč korpusem, které portace musí reprodukovat. Na rozdíl od míst
`solve3`/`poly_init` výše (hluboko uvnitř zkompilovaných stromů výrazů, oprava
vyvrácena) je `ccw` samostatná zkompilovaná funkce s čistou sémantikou, takže
`src/pathplan/triang.ts` ji emuluje: rychlá cesta v prostých doublech s
konzervativní mezí chyby tam, kde se prosté a sloučené znaménko prokazatelně shodují,
a přesná cesta s Dekkerovým součinem + dyadickým BigInt pro případy blízké nule.

---

### A9. 1-ULP u goniometrie libm → překlopení remízy kocirkulárních bodů CDT (multispline `circo`/`twopi`) {#a9-libm-trig-1-ulp-→-cdt-cocircular-tie-flip-circo-twopi-multispline}

**Třída.** `Math.sin`/`Math.cos` ve V8 nejsou bitově identické s `sin`/`cos` z
Apple libm (prokázáno: nesouhlas o 1 ULP v `2π·4.5/8`, jednom z osmi
rohových úhlů překážky ve tvaru elipsy). Rohy opsaného 8úhelníku v `makeObstacle`
zdědí tento ULP, takže vstupní souřadnice trojúhelníkového routeru se od
souřadnic orákula liší o ≤6e-14. Symetrická rozvržení (stejně velké
uzly na úrovni/kruhu) činí čtyřúhelníky routeru v reálné aritmetice **přesně
kocirkulárními**, takže přesný predikát incircle sedí na ostří nože: vstupní ULP
překlopí jeho znaménko, překlopí se úhlopříčka omezené Delaunayovy triangulace
a polygon koridoru, který v orákulu v `Pshortestpath` selže („destination point not in any triangle“ →
záložní prostý spline), v portaci uspěje (nebo naopak). Výsledné
splines se liší o ~0.2–0.5pt. Sourozenec **A3**/**A8**: neredukovatelná
omezení přenositelnosti plovoucí desetinné čárky pod sémantikou zdroje C — shoda
by vyžadovala reprodukovat v JS přesné zaokrouhlování `sin`/`cos` z Apple libm.

**Dotčeno:** `241_0` (circo Δ≈0.2 / plátno twopi Δ≈9 přes překlopení koridoru
na hraně `5:ne->8:nw`); `2343`, `2239`, `share-b29`, `windows-b29` (twopi,
vždy 1–2 rozdíly v pozici popisků hran — 1 ULP z libm vzniká v
goniometrii jednotkových vrcholů v `poly_init` (`hypot`/`atan2`/`sin`), posune
vypočtenou výšku jednoho uzlu o ULP za mez minimální velikosti, na které
orákulum přistane přesně, a přes `floor()` při načítání R-stromu xlabelů se kaskáduje do
překlopení jediného kandidáta popisku. Oprava správně zaokrouhleným hypot byla vyzkoušena a
VYVRÁCENA: opravila `2343`, ale zregresovala `2168_3`, jehož dimenzování
osmiúhelníku prochází tímtéž voláním, kde hodnota orákula NENÍ
správně zaokrouhlená — žádná deterministická politika hypot se s orákulem neshoduje na obou).
`2168_1` původně patřil do této třídy, ale stal se
shodným, jakmile portace emulovala fp-kontrahované `ccw` orákula
(pathplan `triang.ts`): jeho selhání koridoru se řídí odmítnutím koncového
bodu ve vrcholu v `pointintri` s FMA, které portace nyní reprodukuje
bit po bitu, takže se tam remíza ULP v úhlopříčce CDT již neprojevuje.

**Proč akceptováno (neredukovatelnost prokázána řízeným pokusem).**
Samotné CDT je vyvíněno: `mkSurface` v portaci je věrnou portací inkrementálního
vkládání v GTS 0.7.6 (`cdt.c`: rozdělení 1→3 + rekurzivní
`swap_if_in_circle`, hrany omezení předem vytvořené a nezaměnitelné,
vynucení omezení pomocí `remove_intersected_*` + `triangulate_polygon`) a
samostatný harness v C linkující **skutečnou knihovnu GTS** a krmený bitově přesnými
vstupy routeru z portace reprodukuje triangulaci portace stěnu po stěně
(2168_1: 22/22; 241_0: 185/185). Vyhodnocení determinantu incircle v přesných
racionálních číslech na obou množinách vstupů potvrzuje překlopení znaménka (+1 se
vstupy portace, −1 se vstupy orákula). Zbývající proměnná — rozdíl 1 ULP
v goniometrii — byla izolována přímým porovnáním bitových vzorů `Math.sin`/`sin`.

**Akceptace stopy modulu (`accepted-divergences-engines.json`).**
<a id="a9-engine-track-twopi-circo"></a> **Xdot stopy modulů** twopi/circo
(`parity-twopi.json` / `parity-circo.json`, nativní orákulum `dot -K <engine>
-Txdot`, `test/corpus/engine-walk.ts`, sémantické porovnání kreslicích operací na
±0.01 — viz `test/golden/compare-xdot.ts`) odhalují tentýž mechanismus
nezávisle na výše uvedeném průzkumu SVG modulu dot: twopi `2239` (1
rozdíl kreslicí operace — překlopení pozice textu popisku hrany `_ldraw_`, tentýž
ULP goniometrie jednotkových vrcholů v `poly_init` kaskádovaný přes řetězec R-stromu xlabelů s `floor()`;
`2343`, `share-b29` a `windows-b29`, původně akceptované
pod tímto záznamem, byly 2026-07-11 *opraveny* věrnou kontrakcí fmadd
v `polylineMidpoint` — viz odstavec o rodině b29 níže) a circo `241_0` (41
rozdílů kreslicích operací, Δ≈0.2pt na vedeném beziéru hrany `1->2` — totéž
překlopení koridoru podle úhlopříčky CDT; decision journal, 2026-07-10, záznam „CDT rewritten as
faithful GTS port; 2168_3 outline-ring obstacle; 56/osage bb clobber; A9
filed“). Akceptováno na úrovni stopy modulu přes
`test/corpus/accepted-divergences-engines.json`, připojeno do
`PARITY-twopi.md`/`PARITY-circo.md` pomocí `parity-report.ts` — stejné připojení,
jaké provádí `accepted.ts` pro `PARITY-dot.md` na stopě dot.

**circo `2475_2` — remíza hypot u kocirkulárního closestNode.** V jedné
komponentě o 28 uzlech tohoto grafu o 10762 uzlech vybírá `getRotation` v circo
(`circpos.c:73-92`) uzel bloku nejbližší počátku rozvržení pomocí
`hypot`, aby rozhodlo o rotaci podbloku. Dva kocirkulární uzly jsou
prakticky stejně vzdálené; správně zaokrouhlený `Math.hypot` ve V8 a `hypot` z Apple
libm zaokrouhlí tuto vzdálenost o 2 ULP odlišně, což překlopí striktní `<`,
vybere jiný uzel a podblok se otočí/zrcadlí o ~20° (pohne se 18 uzlů,
max 296.7pt; ostatních 10744 uzlů je bitově identických, stejně jako
strom bloků, pořadí kružnic a každý `centerAngle`). Politika CR-hypot byla
pro tuto třídu již vyvrácena (2026-07-10). Samostatná reprodukce:
`.agent-notes/circo-2475-590-repro.dot`; úplná analýza příčiny:
`.agent-notes/circo-b81-2475-rca.md` (akceptováno 2026-07-11).

**twopi `2470` — ULP radiální souřadnice zesílený R-stromem xlabelů.**
2470 je graf se 140 hranami, jehož popisky hran ve formě HTML `<table>` se shlukují
na téměř splývajících radiálních kotvách. V rodině neato jsou popisky hran
umisťovány jako externí popisky hladovým umisťovačem xlabelů (`label/xlabels.c`),
který vybírá kandidátní roh s nejmenším překryvem přes R-strom uspořádaný Hilbertovou křivkou.
Splines a souřadnice uzlů portace se s orákulem shodují na přesnost emise
(nula rozdílů ve splines/uzlech/bbox i při 1e-7), ale radiální
`ND_coord.y` jednoho uzlu se liší o ~2 ULP (Apple libm `sin`/`cos` vs. V8 `Math`) — daleko
pod laťkou shody, přesto však přeskočí hranici `floor(pos.y − sz.y/2)`
přesně na 0 v `objplpmks`, čímž se rect R-stromu daného objektu
překlopí o jednu jednotku. Změna Hilbertova pořadí/seskupení stromu způsobí, že `RTreeSearch`
ořeže jinou větev, takže se ~140 popisků vždy přichytí k sousednímu kandidátnímu
rohu (každý rozdíl je pevný krok (+šířka, −výška řádku)). Umisťovač, pořadí
objektů, zaokrouhlení rectů, `CombineRect` (který věrně zrcadlí zvláštnost min-min z C)
a int32 Hilbertův klíč byly každý ověřeny jako věrné; odchylkou je
upstreamový ULP radiální goniometrie, neredukovatelný ze stejného důvodu
jako twopi `1855`. Akceptováno 2026-07-11; úplná analýza příčiny:
`.agent-notes/twopi-2470-rca.md` (která také dokumentuje, že ranní
„průchod“ tohoto id byl artefaktem zastaralé binárky orákula, nikoli regresí
portace).

**osage `1855` — rozmazání fp-contract ve vrcholech překážek.** Odlišné od záznamu
radiálního zrcadlení twopi `1855` výše: pod osage jsou středy uzlů bitově přesné
vůči orákulu a 110 rozdílů kreslicích operací jsou tři hrany vedené kolem překážek,
umístěné na zrcadlové straně řady uzlů (X bitově přesné, Y zrcadlené). Vrcholy
osmiúhelníkové překážky z
`circumscribed_polygon_corner_about_ellipse` (`neatosplines.c:301`) se od
C liší o 3–4 ULP, protože `-ffp-contract=on` v clangu slučuje řetězce `a·b±c`
v `ellipse_tangent_slope`/`line_intersection` do FMA s jediným zaokrouhlením,
zatímco V8 zaokrouhluje každou operaci: sloučené zaokrouhlení v C zhroutí sloupec
žlabu hodnot x rohů na jediný bitově identický double (přesně kolineární),
v portaci se rozdělí na dvě hodnoty vzdálené 1 ULP. To překlopí test
tečnosti viditelnosti `clear()` — žlab již není blokován — přidá ~20
hran viditelnosti a Dijkstra rozhodne remízu homotopie nahoru/dolů ve prospěch
zrcadlové strany. Řízený pokus: vstříknutí přesných souřadnic překážek z C do jinak
nedotčené portace dává **nula** rozcházejících se hran, čímž se zcela vyvinil
řetězec legálního uspořádání, viditelnosti, Dijkstra a splines; samotné vstříknutí `cos`/`sin` z libm v C
nemá žádný účinek. Akceptováno
2026-07-11; úplná analýza příčiny: `.agent-notes/osage-spline-family-rca.md`.

**Rodina b29 (twopi).** Čtyři varianty b29 sdílejí jedno ostří nože: popisek hrany
`EqmtTyp` (`Node14732->Node14731`) sedí na přesné remíze při volbě strany v
placeLabels, jejíž výsledek závisí na driftu rozvržení twopi o 1 ULP v
okolních objektech. S věrnou kontrakcí fmadd v
`polylineMidpoint` (oprava rodiny states, 2026-07-11) je kotva popisku portace
bitově identická s kotvou orákula, a přesto se remíza stále rozhoduje opačně u
dvou ze čtyř variant (`graphs-b29`, `linux.i386-b29`), zatímco zbylé
dvě (`share-b29`, `windows-b29`) se nyní shodují — a akceptovaný rozdíl popisku A9 u `2343`
zmizel úplně. Mez: 1 kreslicí operace, Δ12pt y popisku. Neredukovatelné
bez odstranění upstreamového driftu. Úplná analýza příčiny:
`.agent-notes/twopi-states-rca.md`.

Totéž ostří nože v placeLabels se projevuje na stopě **osage** (akceptováno
2026-07-11, úplná analýza příčiny: `.agent-notes/osage-small-tail-rca.md`):
`linux.i386-b29` a `share-b29` (vždy 2 rozdíly kreslicích operací — x-ová kotva jednoho
popisku hrany dopadne na 878.28 místo 841.06, umístěná symetricky kolem
bitově identického středu splinu 859.67, tj. ±polovina šířky popisku; obě
varianty se zrcadlí navzájem) a `1652` (2 rozdíly kreslicích operací — dvě hrany vždy
překlopí kotvu jednoho popisku kolem identického středu, jedna v x a jedna v y,
s bitově identickými splines a hroty šipek; orákulum vykresluje zcela,
takže nejde o známý nestabilní timeout nativního sestavení). V každém případě
je geometrie hran bitově přesná a pouze remíza při volbě strany popisku se rozhoduje
opačně na okolí driftujícím o 1 ULP.

Stopa osage nese trojici `polypoly` (`graphs-polypoly`,
`share-polypoly`, `windows-polypoly`; akceptováno 2026-07-11, úplná analýza příčiny v
`.agent-notes/patchwork-tail-rca.md`): jedinou rozcházející se operací je
holý transcendentní `cos(π+θ)` ve vrcholu zkresleného čtyřúhelníku s orientací 180 —
`Math.cos` ve V8 je správně zaokrouhlený, zatímco `cos` z Apple libm nese
chybu závislou na argumentu o ±1 ULP (takže jen pod libm platí `|cos(π+θ)| ≠
|cos(θ)|`); rozdíl velikosti uzlu o 1 ULP vstupuje do `GRID`/`ceil` v pack, přetlačí
remízu na obvodu a qsort umístí dvě komponenty do balicích buněk té druhé —
tuhá výměna celých uzlů bez chyby tvaru či vedení. Žádné deterministické
přepsání nemůže reprodukovat nesprávně zaokrouhlenou transcendentní funkci libm,
učebnicový tvar A9.

Stejný mechanismus byl 2026-07-28 potvrzen na větším sourozenci
`tree-graphs-directed-polypoly` (`graphs/directed/polypoly.gv`, nové v
univerzu 905 položek; 112 rozdílů kreslicích operací, pouze osage). Rozcházející se operace
je identické místo `cos(π+θ)` u uzlu `9004` s 1 ULP — hodnoty `bb.x` z C a portace
odpovídají původní analýze příčiny bajt po bajtu — ale na tomto vstupu o 76 uzlech
vede šíření přes `arrayRects` v osage: `acmpf` řadí balicí
buňky podle surového součtu `width+height` a o 1 ULP vyšší šířka z libm způsobí, že
`9004` se zařadí striktně před své otočené sourozence `9000/9002/9006`, zatímco
správně zaokrouhlená hodnota ve V8 ponechá přesnou 4cestnou remízu, kterou
nestabilní qsort uspořádá jinak — jiné buňky po řádcích, výměna `9002`/`9006`
a kaskáda `fmax` šířky sloupce posunující 8 sousedů v x.
Předání vlastním `arrayRects` portace velikostí uzlů z C versus velikostí uzlů z portace
reprodukuje 10 posunutých uzlů z průchodu s bajt po bajtu shodnými delty v x,
čímž se uzavírá kauzální řetěz.

Dva další případy na stopách modulů byly vystopovány do příčiny a akceptovány 2026-07-11
(úplná analýza příčiny: `.agent-notes/circo-edge-tail-rca.md`): twopi `241_0` (6 rozdílů
kreslicích operací — sourozenec záznamu circo výše: tatáž remíza incircle
kocirkulárních bodů v CDT, překlopená 1 ULP u libm `sin`/`cos`, způsobí, že koridor
multispline v portaci uspěje se splinem o 14 bodech, zatímco nativní sestavení
se vrátí k prostému vedení o 8 bodech; rozdíly bodů < 0.07pt) a circo
`windows-tree` (10 rozdílů kreslicích operací na jedné vějířové hraně — goniometrie umisťování v circo
dosadí `node2.y` o jediný ULP nad `node8.y` kolem přesně symetrické
hodnoty 18.0 a výběr dyna portu hlavy v `closestSide` překlopí TOP/BOTTOM na
této přesné remíze; pozice uzlů a boxy jsou jinak bitově identické s
orákulem).

**Stopa modulu sfdp — FP remízy hran (`42`, `241_0`).**
<a id="a9-sfdp-fp-ties"></a> Xdot stopa modulu sfdp (`parity-sfdp.json`,
nativní `dot -Ksfdp -Txdot`, ±0.5) odhaluje remízu incircle kocirkulárních bodů v CDT, jakmile
se vstříknou přesné nativní pozice před vedením hran (takže odchylka NENÍ
iterativní drift — viz třída A1-drift — ale diskrétní remíza predikátu):

- `42` a `241_0` — remíza incircle kocirkulárních bodů v CDT (koridor multispline).
  Se vstříknutými pozicemi je zbytkem **překlopení počtu segmentů**: `42`
  `opCount 5 vs 9` (hrana 0->3) / `ptCount 32 vs 26` (3->7); `241_0` `ptCount 14
  vs 8` (hrana 3->2) — úhlopříčka omezené Delaunayovy triangulace v portaci se
  oproti orákulu překlopí, takže koridor multispline uspěje se splinem o N bodech, kde
  nativní sestavení spadne na kratší prosté vedení (nebo naopak), přesně jako
  záznam twopi/circo `241_0` výše. Portace již emuluje kontrakci arm64
  `fmadd` v predikátu incircle/`ccw` (`src/pathplan/triang.ts`,
  `src/common/fma.ts`) a používá robustní Delaunay s incircle; zbytkem je
  1 ULP rozdílu V8-vs-Apple-libm v `sin`/`hypot` ve vstupu predikátu, který žádný přenosný
  kód nereprodukuje.

> **`2095` překlasifikováno z A9 na A1-drift (2026-07-22).** Dříve bylo uvedeno
> zde jako „sourozenec hypot“ (drift pod 0.7pt na hranách uzlu s prázdným názvem
> `""->"4"`). Tento zbytek byl **artefaktem harnessu**: regex `GVTS_POS` v
> injektoru atribuce vyžadoval ≥1 znak názvu, takže uzel s názvem `""` se nikdy
> nevstříkl a táhl s sebou své dvě incidentní hrany. Po opravě injektoru, aby
> odpovídal prázdným názvům (`(.+)`→`(.*)`, `src/layout/neato/splines.ts`), se sfdp `2095`
> vstříkne na **0 zbytku** — čistý silový drift, pokrytý počítanou třídou
> A1-drift, nikoli FP remíza ve vedení. Jeho akceptace po id byla odstraněna z
> `accepted-divergences-engines.json`. (Stejné zjištění jako u fdp `2095` níže.)

**Čerstvý řízený pokus (2026-07-21).** Sonda `hypot` nativní-vs-V8
(`plans/sfdp-tracked-divergences/batch-2/hypot-ulp-probe.txt`): zkompilování
systémového `hypot` z C a porovnání s Node `Math.hypot` na reprezentativních
vstupech odchylky ploché hrany ukazuje nesoulad o 1 ULP u 2 ze 6 (Δ 7.1e-15 a
5.7e-14) — ostří nože prahu rozdělení, které překlápí počet podrozdělení.
Neredukovatelné: žádný přenosný hypot nereprodukuje Apple libm (precedent
`arm-pow.ts` pro stejnou hranici). Akceptováno na úrovni stopy modulu přes
`accepted-divergences-engines.json` (`sfdp.42`, `sfdp.241_0`).

Xdot stopa modulu **fdp** (`parity-fdp.json`, nativní `dot -Kfdp -Txdot`,
±0.5) odhaluje TUTÉŽ remízu kocirkulárních bodů v CDT na stejném grafu, `241_0`: se
vstříknutými přesnými pozicemi orákula před vedením hran je zbytkem 11 číselných
rozdílů `unfilled_bezier` omezených na jednu hranu (`0->1#0`, maxΔ 3.39pt). Protože
pozice uzlů jsou vstříknuty identické, odchylka vzniká dále po proudu v
koridoru multispline v pathplan — tatáž remíza incircle s libm o 1 ULP jako u
twopi/circo/sfdp `241_0` (incircle v přesných racionálních číslech 185/185 výše). Páky
jsou již uplatněny (`src/pathplan/triang.ts` fmadd, `src/pathplan/route.ts:198`
`Math.hypot`); remíza je neredukovatelná. Akceptováno přes `accepted-divergences-engines.json`
`fdp.241_0`. `2095` u fdp je naproti tomu **A1-drift, nikoli A9**: vstříknutí
jediného uzlu s prázdným názvem (poté, co byl injektor atribuce opraven, aby odpovídal uzlům s názvem
`""`) zhroutí jeho zbytek na nulu — dřívější „ocas A9“ byl
nevstříknutý prázdný uzel, který táhl své incidentní hrany. Akceptace sfdp `2095` byla
tatáž slepá skvrna — nová regenerace atribuce sfdp (2026-07-22) s opraveným
injektorem potvrdila, že se také vstříkne na 0, a její akceptace byla odstraněna (viz
poznámka `2095 reclassified` výše).

---

## Sledovaný dlouhý chvost (atributy `dot` a okrajové případy) {#tracked-long-tail-dot-attribute-edge-case}

Při **výchozím nastavení** se modul `dot` shoduje s binárkou C v těsné deterministické
toleranci na korpusu golden testů (verdikt `conformant`; viz poznámka na
začátku). Zbývající rozdíly tvoří **dlouhý chvost atributů a
okrajových případů** — historicky nejtěžší část každé portace Graphviz. Na rozdíl od
akceptovaných odchylek výše budou tyto rozdíly *uzavřeny*; sledují se živě, s
počty, v
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md):

| Kategorie | V čem se liší |
|---|---|
| **path-structure** | Vedení splines hran v určitých konfiguracích (např. některé případy plochých hran a hustých koridorů). |
| **element-count** | Funkce, která v některých grafech vydává více/méně elementů SVG než C. |
| **color-stroke** | Rozdíly v emisi tahu/výplně u konkrétních atributů stylu. |
| **parser-gap** | Malý počet vstupů DOT, které parser zatím plně nepřijímá. |

Pokud váš graf používá jen běžné atributy a modul `dot`, jste téměř jistě na cestě
shody v rámci deterministické tolerance. Pokud rozvržení vypadá špatně, zkontrolujte `PARITY-dot.md` pro
danou třídu vstupu — pravděpodobně jde o sledovanou položku s misí opravy ukotvenou na
orákulu, nikoli o neznámou.

> **Poznámka k případům řízeným popisky.** Třída měření textu (A2) je uzavřena —
> žádný graf `dot` pod ní již není akceptován. Graf, který dnes sedí na
> structural-match, je sledovaná mezera, nikoli odchylka v metrice písma.

### Hroty šipek protilehlých hran u `concentrate=true` {#concentrate-true-opposing-edge-arrowheads}

Když `concentrate=true` sloučí antiparalelní dvojici (`A->B; B->A`) do jedné
přeživší hrany, musí tato hrana kreslit hrot šipky na **obou** koncích. To je nyní
portováno (větev `conc_opp_flag` v `arrow_flags`; viz
`src/common/splines-clip.ts:arrowFlags`), takže `graphs-b135`, `167` a `2087`
se shodují (chybějící hrot šipky jako divergence `element-count` i její vedlejší
efekt neořezaného splinu v `@d` jsou pryč).

Některé grafy s concentrate **si ponechávají samostatný, již dříve existující zbytek**, který
oprava hrotu šipky **neřeší** — jde o rozdíl pozice **x-ové souřadnice** uzlu
(x-network-simplex / kompasový port), nikoli o vadu hrotu šipky:

- **`graphs-b15`, `graphs-b69`** — velké grafy „výtahového“ typu se záznamy/clustery.
  Concentrate se aktivuje a slučuje správně; zbytkem je rozdíl x uzlů ~1pt,
  který se zesiluje do rozdílu `element-count`/splinu `@d`. Samotná emise hrotu
  šipky je nyní správná (b69 získává své chybějící polygony hrotů šipek). Viz
  poznámku agenta `b69-concentrate-undermerge` pro původní příčinu v x-ové souřadnici.
- **`1453`** — stále se rozchází z příčiny `element-count` na nejvyšší úrovni, která
  nesouvisí s hrotem šipky conc_opp_flag.
- **`2825`** — v době této opravy hrotu šipky se rozcházel z příčiny `element-count` na nejvyšší úrovni,
  nesouvisející s conc_opp_flag (nespouští se tam žádné sloučení
  protilehlých dvojic); od té doby uzavřeno misí fix-2825-rebuild-vlists,
  viz A4 výše.

Jde o sledované položky x-ové souřadnice / struktury, **nikoli** o chyby hrotů šipek.

### Mezery ve věrnosti rozvržení z mise věrnosti 2.0 (neato, sfdp, fdp, twopi, circo) {#layout-fidelity-gaps-from-the-2-0-fidelity-mission-neato-sfdp-fdp-twopi-circo}

Mise věrnosti 2.0 způsobila, že neportované hodnoty atributů nahlas selhávají (viz
tabulka `UNSUPPORTED_FEATURE` v
[Chyby a výjimky](https://github.com/knowvah/dot-engine/blob/main/docs-site/guide/errors.md)).
Zanechala následující, zaznamenané v `plans/v2-fidelity/decision-journal.md`.

**Hlasité, neportované.** `overlap=voronoi` s překrývajícími se uzly stále vyhazuje
`UNSUPPORTED_FEATURE` v neato, twopi, circo a sfdp: samotný Voronoiův
upravovač (algoritmus `vAdjust`) není portován. Test překryvu, který rozhoduje,
zda vyhodit chybu, je vlastní test C (`countOverlap` nad polygony uzlů z `poly.c`).

**Známé mezery, stále tiché.** Portace tyto případy vykresluje bez chyby a
liší se od nativního Graphviz. Nalezeno misí `v2-silent-gaps`
(`plans/v2-silent-gaps/decision-journal.md`); nejde o akceptované odchylky.

- **Varování „Unrecognized overlap value“ z `getAdjustMode` se nevydává.**
- **Otočené vrcholy polygonů se mohou od nativních lišit v posledních bitech
  (neredukovatelné: hostitelská matematická knihovna).** `poly_init` orientuje každý vrchol
  pomocí `atan2`, `hypot`, `sin` a `cos`. Při bitově identických vstupech vrací macOS libm a
  V8 odlišné poslední bity (např. `atan2(0x3fd6a09e667f3bce,
  0xbfd6a09e667f3bca)`: libm `…21d1`, V8 `…21d2`; `hypot` u dalšího vrcholu:
  libm `…fffd`, V8 `…fffe`), takže obdélník s `orientation=20` dostane y vrcholu
  `-18` v portaci a `-17.999999999999996` nativně. Samotný nativní Graphviz
  se mění podle libm platformy a prohlížeč jej nemůže volat. Vlastní
  aritmetika portace odpovídá C (pořadí `RADIANS` pevně dané; 776 z 1664 vzorkovaných souřadnic
  vrcholů je bitově identických, ostatní se liší pouze kvůli libm). Důsledek:
  verdikty `polyOverlap` při přesném dotyku se mohou překlopit; s nativními vrcholy se
  každý verdikt shoduje.
- **sfdp se může na macOS od nativního lišit (neredukovatelné: hostitelský libm `pow`).**
  Diagnostikováno instrumentovaným nativním sfdp: pozice zůstávají bitově identické,
  dokud jeden člen odpudivé síly, `pow(dist, 1 - p)` (`spring_electrical.c`,
  `p = -1`, takže `pow(x, 2)`), nevrátí z macOS libm o 1 ulp méně než `x*x`
  (`pow(1.4116727416983157, 2)`: libm `1.9928199296540394`, správně zaokrouhleno
  `…396`; na macOS `pow(v, 2) != v*v` pro 20 z 16201 vzorkovaných `v`). To mění
  `Fnorm` iterace v posledním bitu; adaptivní chlazení sfdp jej zesílí
  do odlišného (často zrcadleného) rozvržení. `armPow` v portaci je optimalizovaný
  `pow` z optimized-routines od ARM (glibc ≥ 2.28), tedy to, co počítá Graphviz na Linuxu;
  odlišné je orákulum na macOS. Vyloučeno: nasazení generátoru (explicitní hodnoty `start=`
  se shodují), `pcp_rotate` (stejný vstup dává stejný výstup), pozice a
  přitažlivý člen (bitově identické). Příklad: osamělý trojúhelník `a--b; a--c; b--c`
  při výchozím nasazení.
- **fdp se může od nativního lišit přes hostitelský libm `cos`/`sin`.** fdp sleduje
  Graphviz po verzi 15.0.0 (odpuzování se vzdáleností hypot, `Mlimit`), přičemž
  `hypot` hostitelského libm je reprodukován bit po bitu (`src/common/libm-hypot.ts`, 0
  neshod na 400k vzorků). 251 z 252 golden vstupů vykreslitelných modulem fdp
  se přesně shoduje s nativním sestavením; zbývající jeden
  (`parallel-cluster-ldbxtried`) umisťuje portové uzly clusteru pomocí
  `T_Wd * cos(alpha)` a `cos(-2.3840764867756761)` z macOS libm se od
  `Math.cos` ve V8 liší o 1 ulp; silová smyčka fdp to zesílí na asi 3 palce. `cos`
  od Apple není reprodukovatelný z krátkého modelu tak, jako `hypot`.
- **Nativní pády, které portace definuje.** Nativní Graphviz končí s kódem 139 u neato
  `mode=KK` s `model=mds` a hranou `len` (`mds_model` indexuje `GD_dist`
  jednobázovým pořadovým číslem: přetečení haldy) a u `model=circuit` s
  nesouvislým grafem. Portace v prvním případě zahazuje buňky mimo rozsah a
  ve druhém se vrací k nejkratším cestám; není s čím nativní výstup
  porovnat.

---

## Záměrně neportováno (necíle) {#intentionally-not-ported-non-goals}

Jde o záměrné hranice rozsahu, nikoli o chyby. Knihovna cílí na **SVG**
(plus textové mezilehlé formáty `json` / `xdot` / `dot` / imagemap).

- **Jiné výstupní formáty.** Rastrové (PNG/JPG/GIF/WebP/BMP), PostScript/PDF/EPS
  a GUI/interaktivní backendy jsou mimo rozsah. Použijte výstup SVG a v případě
  potřeby rastru jej převeďte dále.
- **Stránkování `page=` pro SVG.** Nativní `dot` SVG také nestránkuje (zařízení
  SVG nenastavuje příznak stránkování), takže `page=` je na této cestě v obou
  implementacích bez účinku — zde uvedeno jen proto, že jde o častý zdroj
  nedorozumění.
- **Textový výstup `-Tplain`.** Odloženo (věrný textový formát), nikoli vyloučeno.
- **`gvpr`** (skriptovací jazyk pro zpracování grafů) — mimo rozsah.
- **Pohodlné obaly pro C++** (`cgraph++`, `gvc++`) — nejprve se portuje API v C;
  případná vrstva pro pohodlí v idiomatickém TypeScriptu by byla
  samostatným balíčkem.
- **`fontnames=svg|ps` při měření textu v prohlížeči.** V prohlížeči
  canvasový měřič sestavuje své písmo ze seznamu rodin `fontnames=native`
  pro alias PostScriptu (`Times-Roman` → `Times, serif`), tedy stejné
  řezy, které emitor SVG vykresluje ve výchozím stavu. `TextMeasurer` nenese žádný
  kontext grafu, takže grafy nastavující `fontnames=svg` nebo `fontnames=ps` se měří
  podle nativního seznamu, zatímco SVG uvádí rodinu svg/ps. Váhy aliasů,
  které CSS nedefinuje (`book`, `demi`, `light`, `medium`, `roman`),
  se vydávají doslova jako v C; prohlížeče je ignorují a vykreslí normální
  váhu a měřič měří normální váhu, aby odpovídal. Výstup v Node
  tím dotčen není (canvasový měřič nikdy nepoužívá).
- **Mechanismy pouze nativní** nahrazené ekvivalenty bezpečnými pro prohlížeč: dynamické
  načítání pluginů (`dlopen`) je nahrazeno statickou registrací modulů/rendererů;
  čtení souborového systému (písma, obrázky, konfigurace) je nahrazeno funkcemi zpětného volání
  dodanými volajícím (např. `setImageSizer`). Chování je zachováno; mechanismus se liší.

---

## Nahlášení odchylky {#reporting-a-divergence}

Pokud najdete výstup, který se liší od C a **není** akceptovanou odchylkou výše,
není v `PARITY-dot.md` a není necílem, jde o chybu, kterou stojí za to nahlásit — zdrojový
kód v C je specifikace a nevyjmenované odchylky se považují za vady, nikoli za
akceptované chování.
