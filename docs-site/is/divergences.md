---
sourceHash: 4f20fa111e0cdd1d8975c4886542dc4cca75fccc70ab24c8d23af3bb3e62ebd7
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Þekkt frávik frá C-útgáfu Graphviz {#known-divergences-from-c-graphviz}

@knowvah/dot-engine stefnir að sem mestu mögulegu trúnaði við upprunalegu C-útfærsluna.
C-frumkóðinn er skilgreiningin; ólistaður munur er
meðhöndlaður sem galli, ekki sem samþykkt hegðun.

> **Hvað „samsvörun“ þýðir hér.** Jöfnuðardómur safnsins sem heitir `conformant`
> er **þröng ákvarðandi vikmörk**, *ekki* bókstaflegt bæti-fyrir-bæti
> jafngildi SVG: tölugildi hnita og ferla verða að vera innan **±0.01** og allt
> sem er ekki tölur (merki, litir, texti) verður að vera nákvæmlega eins
> (`compareSvg(…, 'deterministic')`). Í þessu skjali vísa „samsvörun“ og
> „samræmt“ til þessa dóms um vikmörk. Full skilgreining:
> [Samræmi](./conformance.md).

Þar sem úttakið *er* ólíkt fellur það í nákvæmlega einn af þremur flokkum:

1. **Samþykkt frávik** — munur sem við höfum rannsakað, skiljum til hlítar
   niður í rót og höfum **viljandi ákveðið að gera ekki samræmdan**. Hvert um sig er afmarkað,
   lýst og rökstutt hér á eftir. Þetta eru ekki gallar og þeim verður ekki
   „lagað“ án sérstakrar, sérafmarkaðrar ástæðu.
2. **Rekjanlegur langur hali** — þekktar eyður sem *verða* lokaðar, hver með
   leiðréttingu sem er fest við véfréttina. Þær eru raktar með lifandi talningum í
   [`test/corpus/PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md).
3. **Utan markmiða** — viljandi mörk umfangs (snið og vélrænar útfærslur sem við
   ætluðum aldrei að endurskapa).

Áreiðanlegu, sífellt uppfærðu skrárnar eru
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
(jöfnuðarmælaborð fyrir hvert inntak gegn innbyggðu `dot`) og
[`plans/port-catalog/README.md`](https://github.com/knowvah/dot-engine/blob/main/plans/port-catalog/README.md)
(birgðaskrá yfir stöðu yfirfærslunnar á reikniritastigi).

**Véllesanleg** heimild sannleikans um hvaða graf eru *samþykkt* (flokkur 1
hér á eftir) er
[`test/corpus/accepted-divergences.json`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/accepted-divergences.json).
Verkfærin tengja hana saman við skýrslugerð: `PARITY-dot.md` aðgreinir **samþykkt frávik** frá
**rakta** vinnulistanum, og reglnahliðið sækir leyfislista sinn í hana. Textakaflarnir hér á eftir
útskýra hverja færslu (A1 og A3 eru virk; A2 er lokað og
varðveitt sem saga); CI-prófun (`accepted-divergences.test.ts`) tryggir að
hvert samþykkt graf víki enn, svo þessi listi geti ekki úrelst án þess að nokkur taki eftir.

---

## Samþykkt frávik (við gerum þau viljandi ekki samræmd) {#accepted-deltas-we-deliberately-do-not-make-conformant}

Við samþykkjum frávik — frekar en að elta bætajöfnuð — aðeins þegar **öll** eftirfarandi
skilyrði eiga við:

- Rótin er **flytjanleikahömlun** (eitthvað sem JavaScript-/
  vafrakeyrsluumhverfið getur ekki endurskapað upp á punkt), ekki rökvilla í
  yfirfærslunni.
- Munurinn er **ósýnilegur** og sannanlega **afmarkaður**.
- Lagfæring hefði **óhóflegan kostnað og áhrifasvið** miðað við
  ávinninginn (jafnan: hún myndi snerta sameiginlegan grunnþátt sem hundruð
  þegar samræmdra grafa nota, og tefla áhættu á afturförum fyrir
  ávinning upp á brot úr díl).

Þegar við samþykkjum frávik lýsum við því hér svo notendur verði aldrei hissa.
Graf sem frávik hefur áhrif á eru sannreynd gegn **byggingar- og vikmarkaviðmiði**
í stað bætaviðmiðs.

### A1. Kommutöluákveðni (kraftstýrðar vélar) {#a1-floating-point-determinism-force-directed-engines}

**Fyrir áhrifum:** `neato`, `fdp`, `sfdp`, `circo`, `twopi`, `osage` (ítrekandi
gormalíkansvélarnar). *Uppsetning* `dot`-vélarinnar verður **ekki** fyrir áhrifum af þessari
ákveðni ítrekandi líkana; sérstakt, þröngt afmarkað kommutölufrávik í leggjaleiðingu `dot` með splínum
er fjallað um í **A3** hér á eftir.

> **Umfang, sögulega óunnin fyrirvari — nú að hluta mældur.** **Aðal-SVG-könnunin fyrir dot-vélina**
> (`test/corpus/survey.ts`) er enn
> **eingöngu dot**: innbyggða véfréttin keyrir undir `GVBINDIR=/tmp/ghl`, sem
> tengir með táknrænum tenglum **aðeins** íbótirnar `core` + `dot_layout`
> (`test/corpus/gen-headless-gvbindir.sh` fer í gegnum nákvæmlega `core dot_layout`
> — engin uppsetningaríbót fyrir `neato`/`fdp`/`circo`/`twopi`/`osage`/`sfdp` er til staðar),
> og bæði véfréttin og yfirfærslan eru ræstar með `dot`-vélinni. Auðkenni í safninu
> eins og `*_neato` / `*_circo` / `root_twopi` eru því *skráarheiti* sem eru sett upp með
> `dot` í þeirri könnun, ekki með sinni eigin vél, og A1 á við um **engin**
> graf þar — ekki vegna þess að vélarnar hafi sannast samræmdar, heldur vegna þess að
> þessi tiltekna könnun reynir þær aldrei.
>
> **En allar sex A1-vélarnar hafa nú sína eigin könnun með innbyggðu
> vélinni**, með `test/corpus/engine-walk.ts` + `parity-report.ts` (óháð `GVBINDIR` —
> hver ræsir `dot -K <engine> -Txdot` beint), á tveimur ólíkum
> strangleikastigum sem eru skjalfest sérstaklega hér á eftir: `circo`/`twopi`/`osage` keyra með sömu
> **±0.01 ákvarðandi** vikmörkum og dot-könnunin, með rótarorsakagreiningu fyrir hvert auðkenni
> („Samþykki ferils vélar“ hér á eftir); `neato`/`fdp`/`sfdp` keyra með rýmri
> **±0.5 einkennavikmörkum** og enn án greiningar fyrir hvert auðkenni
> („Einkenni ítrekandi véla“ hér á eftir). Núverandi tölur þvert á vélar:
> [`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md).

**Einkenni.** Þessar vélar keyra ítrekandi tölulega uppsetningu þar sem niðurstöður
ráðast af kommutölunámundun — nánar tiltekið samruna margföldunar og samlagningar (FMA) og
`Math.pow`, sem geta verið ólík milli JavaScript-véla og
örgjörvaarkitektúra. Yfirfærslan fylgir aðgerðaröð C þar sem hún getur
(`src/common/fma.ts`, `src/common/arm-pow.ts`) — t.d. er `sfdp` fest við um 6 markverða tölustafi gagnvart
innbyggðu véfréttinni með samstilltum slembitölugjafa og `fma` — en nákvæm, hnitaeins
endurgerð er **ekki tryggð milli kerfa**. Grannfræðin varðveitist; mögulegt
frávik liggur í fínum hnútahnitum.

**Hvers vegna samþykkt.** Þetta er hörð takmörkun þess að keyra í JS, ekki hönnunarval
— sömu ættar og næmi A3 fyrir Apple-`hypot`. Engin leið er að tryggja
bitaeins torræð föll/FMA-niðurstöður yfir öll markkeyrsluumhverfi, svo bætaviðmið
væri óprófanlegt fremur en aðeins dýrt. **Mat á A1** (öfugt við að
setja bara fyrirvara) krafðist sérstaks jöfnuðarferils með innbyggðri vél — smíðaður
2026-07-11 sem `test/corpus/engine-walk.ts` + `parity-report.ts`, sem kannar hvert
inntak undir sinni eigin vél í stað `dot`. Hreinskilið þak þeirrar vinnu er
að **þrengja** A1 í „ekkert virkt frávik á viðmiðunarkerfinu“, aldrei að
útrýma fyrirvaranum um mismunandi kerfi; niðurstöðurnar hingað til (hér á eftir) standast það
þak: `circo`/`twopi`/`osage` hafa hver um sig afhjúpað og rótargreint nokkur
raunveruleg A1/A9-tilvik, og `neato`/`fdp`/`sfdp` eru nú í 90.8/77.5/68.0%
innan 0.5pt frá innbyggðu á 910 atriða heildinni, sem þýðir að yfirfærða
reikningsaðferðin (`fma.ts`, `arm-pow.ts`, samstilltur slembitölugjafi) heldur fyrir flest graf —
og hvert eitt afgangsfráviksauðkenni er rakið sérstaklega með innsprautun (rek lausnara
á móti galla í yfirfærslu) í stað þess að vera skilið eftir sem óflokkað rek; sjá
einkenni ítrekandi véla hér á eftir.

**Samþykki ferils vélar: twopi-örvafjölskyldan.** <a id="a1-twopi-arrows-family"></a>
Fyrirvarinn hér að ofan lýsir SVG-könnun dot-vélarinnar, þar sem A1 á við um engin
graf; sérstakur **xdot-vélarferill** fyrir `twopi` (`parity-twopi.json`, innbyggð
véfrétt `dot -K twopi -Txdot`, `test/corpus/engine-walk.ts`) keyrir *vissulega* undir sinni
eigin vél og afhjúpar áþreifanlegt, staðfest A1-tilvik á 9 auðkennum í safninu:
`graphs-arrows`, `graphs-newarrows`, `graphs-arrowsize`, `linux.x86-arrows_dot`,
`macosx-arrows_dot`, `nshare-arrows_dot`, `share-newarrows`, `windows-newarrows`,
og (bætt við 2026-07-28, nýtt í 905 atriða heildinni) systurskrána í directed/
`tree-graphs-directed-oldarrows` — hvert þeirra víkur á einum ráðandi legg
(`Z->I` eða `i->Z`; 12–64 mismunur í teikniaðgerðum). Innsprautunarprófun A/B (ákvörðunardagbók, færsla 2026-07-10 „injection A/B verdicts:
twopi arrows family EXONERATED...“) sannaði verkunina beint:
með því að sækja `ND_pos` við inngang `spline_edges` í innbyggðu útgáfunni og sprauta því inn í
`splineEdgesShifted` í yfirfærslunni fæst **fullkomlega samræmt** úttak fyrir
`graphs-arrows` (`Z->I` verður bæta-eins og véfréttin, sama 7/14 punkta
splína) — þannig að fráviksorsökin er 100% rek á hnútastöðum fyrir leiðingu úr
PRISM-lausnaranum í `twopi` sem fjarlægir skörun, og leggjaleiðing/úttak
yfirfærslunnar er sýknað. Sýnilega einkennið á 6 af 8 auðkennum er flipp í fjölda
Bézier-punkta (`unfilled_bezier[ptCount]: 8 vs 14`): fjöldi hluta sem `Proutespline`
aðlagar
er viðkvæmur fyrir því hvoru megin við hindrunarmörk rekin hnútastaða
lendir, þannig að staðsetningarmunur undir einum ULP eftir ítrekandi
lausn PRISM flippar hlutafjölda aðlöguðu splínunnar (hin 2 auðkennin,
`graphs-arrowsize`/`nshare-arrows_dot`, sýna sama rek sem minni
staðsetningarmun eingöngu, án flipps á hlutafjölda). Samþykkt á
vélaferlisstigi með `test/corpus/accepted-divergences-engines.json`, tengt við
`PARITY-twopi.md` með `parity-report.ts` — sama tenging og `accepted.ts` framkvæmir
fyrir `PARITY-dot.md` á dot-ferlinum.

Rótargreiningin á `oldarrows` (2026-07-28) negldi nákvæman flipp-stað á
punktafjöldaeinkenni fjölskyldunnar. Blævængur `i`–`Z`–`I` liggur á beinni línu eftir þvermáli hrings, og
`intersect()` í `directVis` í pathplan lokar fyrir sjónlínu þegar hornpunktur hindrunar
liggur „á“ striki — þar sem 1e-4 línuleikavikmörk `wind()`
gera að jafnvel hnútur í 270pt fjarlægð frá strikinu telst á línunni, og
`inBetween()` (sem gerir ráð fyrir línuleika) skreppur þá saman í að prófa aðeins
**x-vörpunina**: hornpunkturinn lokar ef og aðeins ef x hans er strangt innan
ULP-þröngs bilsins milli x-hnita endapunktanna. Hvor speglaða geislalaga leggjanna
beygir ræðst því af röðun síðasta ULP í
þremur nafnvirðis jöfnum x-gildum úr lausn PRISM — C beygir `Z->I`
(ásahornpunktur hnúts `i` lendir innan bils síns), yfirfærslan beygir `i->Z`
(hornpunktur hnúts `I` lendir innan síns eigin). Að endurtaka `directVis` án nettengingar á
hindranasafni hvorrar hliðar sem var sótt endurskapar ákvörðun hvorrar hliðar nákvæmlega,
og innsprautun á `ND_pos` véfréttarinnar fyrir leiðingu inn í yfirfærsluna gefur 0 mun
(`attribution-twopi.json`) — leiðing og úttak eru trú upp á bæti.

`1855` er geisla-/stjörnu-**spegil**afbrigði af sama PRISM-FP-verkun
fyrir leiðingu (samþykkt 2026-07-11): 31 lauf þess liggja nákvæmlega á einum hring, þannig að
stjörnuuppsetningin er speglunarsamhverf og skörunarfjarlæging PRISM situr á
jafnvægi sem er óstöðugt gagnvart samhverfu; 1 ULP munur V8 og libm á `cos`/`sin` við 5
laufhorn í `setAbsolutePos` í `circleLayout` velur gagnstæða spegilskál,
og öll geislauppsetningin lendir sem nákvæm x-ása-speglun
véfréttarinnar (mesta hnútafærsla 6.04pt, umlykjandi kassi varðveittur). Innsprautun A/B sannaði
báðar áttir: að mata PRISM í yfirfærslunni með nákvæmum `circleLayout`-stöðum C endurskapar véfréttina
hnút fyrir hnút (3e-14), og að endurheimta aðeins 5
laufstöður sem víkja um ULP flippar allri uppsetningunni aftur í speglun
yfirfærslunnar. Full rótargreining: `.agent-notes/twopi-radial-drift-rca.md` (ákvörðunardagbók
2026-07-11).

**Einkenni ítrekandi véla: neato/fdp/sfdp.** <a id="a1-iterative-characterization"></a>
Ólíkt vélaferlunum `circo`/`twopi`/`osage` hér að ofan eru `neato`/`fdp`/`sfdp`
**enn ekki** flokkaðar eftir auðkennum — `engine-walk.ts` skráir reitinn `tolerance: 0.5`
fyrir þessar þrjár og `parity-report.ts` birtir þær í sérstökum kafla
„Iterative engines (±0.5 characterization)“ í
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md),
sem er beinlínis **ekki** sambærilegur við ±0.01 ákvarðandi árangurshlutföll annars staðar
í þessu skjali. Núverandi talningar (910 atriða heild; árangurshlutfall sleppir
inntaki sem C-véfréttin getur ekki teiknað, samkvæmt [Samræmi](./conformance.md)):

| vél | könnuð | innan ±0.5pt | ósamræmd (öll rakin, samþykkt) | villa í yfirfærslu / tímamörk | villa í véfrétt |
|---|---:|---:|---:|---:|---:|
| `neato` | 910 | 826 (90.8%) | 83 | 1 | 0 |
| `fdp`   | 910 | 703 (77.5%) | 204 | 0 | 3 |
| `sfdp`  | 910 | 619 (68.0%) | 290 | 1 | 0 |

(Fyrsta yfirferðin, 2026-07-11 við 762 atriði, mældi 263/311/260 innan
±0.5pt — stökkið í núverandi hlutföll kom frá lagfæringum fyrir einstök auðkenni sem hafa lent síðan,
einkum óyfirfærðri meðhöndlun `user_pos`/`P_SET` í neato, sameiningu
vélarræsingar og lagfæringunni á `setEdgeType` (fjölvi á móti falli).)

Ólíkt fyrstu yfirferð er hver fráviksröð nú rakin sérstaklega:
innsprautunarverkfærið (`test/corpus/attribute-divergence.ts`) matar yfirfærsluna á
`ND_pos` véfréttarinnar fyrir leiðingu og ber saman á ný, og
hvert núverandi fráviksauðkenni er annaðhvort `drift-exonerated` (leiðing og úttak
yfirfærslunnar endurskapa véfréttina nákvæmlega þegar rek lausnarans er fjarlægt)
eða eitt af fáeinum sérstaklega samþykktum afgöngum fyrir einstök auðkenni (CDT-incircle-jafntefli `241_0`
á öllum þremur vélunum, neato `2239`, sfdp `42`/`2556`).
Flokkssamþykktin hér á eftir festir í sessi hópinn sem er sýknaður; lifandi talningar í
mælaborðum hverrar vélar
([`PARITY-neato.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-neato.md),
[`PARITY-fdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-fdp.md),
[`PARITY-sfdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-sfdp.md)).

**Flokkssamþykki A1-rek (ítrekandi vélar, reiknuð aðild).**
<a id="a1-drift-iterative-engines"></a> `test/corpus/accepted-divergences-engines.json`
geymir eina **flokks**færslu `"A1-drift"` fyrir hverja ítrekandi vél (`neato`,
`fdp`, `sfdp`) — `{ class: true, attributionFile, ref }` — aðgreinda frá
færslunum fyrir einstök auðkenni sem ferlarnir `circo`/`twopi`/`osage` hér að ofan nota (D2,
`plans/iterative-parity-campaign/decisions.md`). Ólíkt færslu fyrir einstakt auðkenni er
aðild að flokki aldrei talin upp í höndunum í skránni: `parity-report.ts`
reiknar hana við skýrslugerð út frá viðeigandi `attribution-<engine>.json`
(innsprautunarrekjuverkfæri T1, `test/corpus/attribute-divergence.ts`)
— hvert fráviksauðkenni þar sem `ND_pos` innbyggðu vélarinnar fyrir leiðingu var sprautað inn í
yfirfærsluna og borið saman á ný og samræmist við ±0.5 fær `verdict: 'drift-exonerated'` í
þeirri skrá, sem þýðir að ítrekandi lausnarar vélanna tveggja runnu saman í
tölulega ólíkar en hvor um sig innbyrðis samkvæmar uppsetningar (munur á uppsöfnun
kommutalna samkvæmt einkennalýsingu A1 hér að ofan, ekki galli í leiðingu
eða úttaki yfirfærslunnar). Gögn fyrir einstök auðkenni — lögun fötu, munur á grunni og eftir innsprautun
í fjölda, greining á samræmdri færslu/speglun — er að finna í
rekjuskránni sjálfri, ekki tvítekin í þessu skjali eða skránni (D2). Auðkenni
sem síðar fer að standast án fyrirvara, eða þar sem ný rakning breytir dómi,
dettur sjálfkrafa úr flokknum við næstu endurgerð skýrslu — engin úrelt
breyting á samþykki nauðsynleg og engin bilun í varnarprófun. Vélar þar sem
`attribution-<engine>.json` hefur ekki enn verið búin til birta flokkinn sem
„attribution pending“ með engum meðlimum, eins og ekkert samþykki væri til
— flokksfærslan má koma á undan gögnum sínum (sjá
`test/corpus/accepted-divergences-engines.test.ts`).

### A2. Textamæling (leturmælikvarðar) → textadrifin uppsetning — LOKAÐ <a id="a2-text-measurement-font-metrics-→-label-driven-layout-—-closed"></a> {#a2-text-measurement-font-metrics-label-driven-layout}

**Staða (2026-07-01): lokað.** Ekkert auðkenni í safninu er lengur samþykkt undir þessum flokki;
kaflinn er varðveittur sem söguleg skjölun á
verkuninni og á innsprautanlega `TextMeasurer`-tengipunktinum sem gerði hana óvirka.
Röð lagfæringa á textamælingu (umskiptin yfir í `EstimateTextMeasurer`,
leturmeðvitaðir lóðréttir mælikvarðar, lagfæringin á UTF-8-bætum utan ASCII) leystu nánast
hvert textadrifið uppsetningarfrávik sem áður átti heima hér. **`proc3d`** —
fyrrum helsta A2-dæmið — er fullkomlega **`conformant`** í öllum þremur
möppum safnsins (`graphs-`/`share-`/`windows-proc3d`): samsvarandi umlykjandi kassi, engir
mismunir í ferilgögnum, engir mismunir í textafestingum.

**Síðustu meðlimirnir hættu (2026-07-01).** **`NaN`-fjölskyldan**
(`graphs-NaN` / `share-NaN` / `windows-NaN`) var höfð hér löngu eftir að
hnútarúmfræði hennar passaði þegar nákvæmlega við C (76/76 viðmiðunarpunktar). Raunverulegur
afgangur hennar — 8 endapunktar beinna leggja á fjórum gagnstæðum tveggja-hringja pörum
(`Target↔TThread`, `Interp↔InterpF`, `Event↔Target`,
`AtomProperties↔NRAtom`) færðir um 6–14 pt — var greindur að nýju og reyndist
**alls ekki áhrif leturmælikvarða**, heldur tveir gallar í yfirfærslunni í fjöllegga-leiðingu dot
(verkefni `plans/fix-nan-a2-retire/`,
`.agent-notes/nan-edge-endpoint-diagnosis.md`):

1. **Akreinaröð gagnstæðra para.** Yfirfærslan endurraðaði hverjum hópi samsíða leggja
   eftir upphaflegu sköpunarröðinni áður en hún úthlutaði Multisep-akreinahliðrunum; C
   úthlutar akreinum í safnaðri röð edgecmp (MAINGRAPH-framvísandi fulltrúi
   fyrst, AUXGRAPH-umsnúinn meðlimur annar — `dotsplines.c:419`,
   `make_regular_edge:1885-1907`). Tveggja-hringur þar sem umsnúni meðlimurinn var
   lýstur yfir fyrst teiknaði hvorn legg á 18 pt gangi hins.
2. **Fölsk flatsvæðisnánd á samruna leggjum milli þrepa.** `markAdjacent`
   merkti færslur í `ND_other` án varnarinnar hjá C um sama þrep
   (`flat.c:272-276`), sem lét skammhlaup `groupSize` fyrir flatnándina
   gleypa hópaskil portcmp.

Með báðum lagfærðum af trúnaði er fjölskyldan **`conformant`** í öllum þremur
möppum (eftir frumefnum: hnútar 0, leggir 0 ólíkir), og sama verkun
lokaði `42`, `clust2`, `ngk10_4` (structural-match → conformant) og færði
`b124` úr diverged í structural-match — allt á tveggja-hringjum/samsíða pörum.

**Báðar hliðar könnunarinnar keyra sama matskerfið — mælingin er gerð óvirk.**
Innbyggða `dot`-véfréttin keyrir undir ósýnilegu (headless) `GVBINDIR`
(`test/corpus/gen-headless-gvbindir.sh` → `/tmp/ghl`) sem tengir aðeins
íbæturnar `core` og `dot_layout` — engin textauppsetningaríbót `gd`/`pango`/`quartz`.
Þegar það hólf er tómt hverfur graphviz aftur í innbyggða
`estimate_textspan_size`. `EstimateTextMeasurer` í TypeScript-yfirfærslunni
(`src/common/textmeasure.ts`) er trú yfirfærsla sömu rútínu og er
sjálfgefið í Node, leyst af `createMeasurer()`
(`src/common/textmeasure-factory.ts`). **Báðar hliðar hvers jöfnuðarsamanburðar
mæla því texta með nákvæmlega sama matskerfinu** — raunveruleg
FreeType-/pango-stafabreidd kemur aldrei inn í samanburðinn. Þess vegna bendir afturför í
dómi hér á uppsetningarkóða, ekki á letur, og þess vegna lokaði lagfæring á göllum
matskerfisins sjálfs (talning UTF-8-bæta, leturmeðvitund lóðréttra mælikvarða) mestum
hluta þessa flokks fyrir fullt og allt í stað þess að þrengja aðeins bil í leturmælikvörðum.

**Innsprautanlegi `TextMeasurer`-tengipunkturinn.** Þessi hlutleysing er aðeins möguleg
vegna þess að textamæling er viljandi tengipunktur, ekki fastvírað inn í hvora
vélina. `TextMeasurer` er viðmót með einni aðferð (`measure(text, font, size,
flags) → {w, h, …}`) sem er sprautað inn sem ósjálfstæði í hvern stað sem stærðarákvarðar texta —
`polyInit`, `recordInit`, `initEdgeLabels` og `buildNodeLabel` taka hvert um sig
mælinn sem færibreytu; ekkert mælir texta í gegnum altæka breytu. Hann er
festur fyrir próf/CI með `setTextMeasurer(...)` eða `GV_TEXT_MEASURER=estimate`.
Tengipunkturinn gerir líka kleift að *sanna* að afgangur sé eingöngu mæling: mata yfirfærsluna á
nákvæmri breidd sem C mældi (sótt úr véfréttinni) og athuga hvort uppsetningin
endurskapar þá C nákvæmlega. Sú tilraun er það sem upphaflega réttlætti
A2-dóminn fyrir `proc3d` (sjá söguviðaukann hér á eftir) — aðferðin
er enn í gildi. Andhverfa hennar lokaði flokknum: þar sem mæling var
sannanlega hlutlaus á báðum hliðum könnunarinnar gat `NaN`-leggjaafgangurinn ekki
verið áhrif leturmælikvarða, sem knúði fram endurgreininguna sem fann
leiðingargallana tvo hér að ofan.

::: details Söguleg greining (leyst af hólmi 2026-06-30) — varðveitt til skráningar
Efnið hér á eftir lýsir eldra ástandi þessa flokks, áður en
umskiptin yfir í `EstimateTextMeasurer`, leturmeðvitaðir lóðréttir mælikvarðar og
lagfæringin á UTF-8-bætum utan ASCII lokuðu mestum hluta hans. Það lýsir ekki lengur núverandi
hegðun — er aðeins geymt svo rökin sem leiddu okkur hingað glatist ekki. Einkum:
(1) „innbyggðu C“-breiddartölurnar í mælingatöflunni hér á eftir eru
**FreeType**-gildi úr raunverulegri leturteikningarleið; jöfnuðarkönnunin
reynir þá leið aldrei — báðar hliðar keyra `estimate_textspan_size` (sjá
að ofan) — svo taflan endurspeglar ekki hvernig jöfnuður er mældur núna; (2)
yfirlagsmyndirnar og golden-/okkar-teikningarnar hér á eftir sýna **utansafns**
`proc3d` (`graphs/directed/proc3d.gv`, ~2620 pt) sem er ekki hluti af
jöfnuðarkönnuninni; `proc3d`-afbrigði safnsins eru nú samræmd án
nokkurs mismunar, svo ekkert yfirlag er til að sýna fyrir þau; (3) frásögnin um
hnútastöðu x í `NaN`/`ratio=compress` hér á eftir er úrelt — núverandi mæling sýnir að allir 76 hnútapunktar
passa nákvæmlega, svo keðjan breiddarvilla → hnútafærsla sem hún lýsir
gildir ekki lengur fyrir `NaN`.

**`NaN` undir `ratio=compress` (söguleg).**
`NaN.gv`-fjölskyldan (`orientation=landscape; ratio=compress; size="16,10"`) var
A2-tilvik þar sem dómurinn á þeim tíma lenti á *diverged* fremur en
*structural-match*. Þjöppunarferill x-netsímplex var trúr — allt inntak
skorða passaði við C (gildi breiddarskorðu, minlens fyrir `containNodes`,
fjöldi hjálparleggja 471/wt 1612, `lrBalance` og allar þreparaðir eins)
*nema* hálfbreidd 9 hnúta, sem mælirinn skilaði 0.5–1.03 pt
breiðari en C. Pökkun `ratio=compress` með vægi 1000 gerði venjulega slaka
skorður um aðskilnað frá vinstri til hægri **bindandi**, þannig að sú undirdíla
breiddarvilla — ósýnileg án compress — kom fram sem −3..−5 pt innri
x-færsla. Sú færsla velti beinu splínunni `Target<->TThread` 0.55 pt
yfir vegg hnútakassa, svo leiðarinn beygði hana í aukabút úr Bézier (7
punktar á móti 4 hjá C) — *byggingarlegur* munur, þar með *diverged*. Að þvinga
breiddirnar 9 í gildi C endurskapaði C nákvæmlega (hnútar x 53/76→0/76 frá; splína 7→4 punktar),
sem staðfesti að afgangurinn var 100% leturmælikvarðar ofar í ferlinu, ekki þjöppunar- eða
splínukóðinn, **fyrir það fyrrverandi frávik**. Öll gögn (með sjónrænum
golden-á-móti-okkar samanburði hlið við hlið + yfirlagi á muninum 4 á móti 7 punktum í splínu):
`plans/fix-compress-xcoord/comparisons/nan-compress-xcoord.html` (textagrein:
`…/nan-compress-xcoord.md`).

**Dæmi um mælingu á leturmælikvörðum (söguleg — FreeType á móti mati).**
Innbyggt Graphviz, þegar það er keyrt með raunverulegri textauppsetningaríbót (ekki ósýnilegu
véfréttinni sem jöfnuðarkönnunin notar), mælir texta með FreeType-/libgd-stafabreidd.
`EstimateTextMeasurer` í yfirfærslunni endurskapar ekki stafarasterara. Fyrir flesta strengi
eru þau alveg sammála; fyrir suma munar broti úr punkti. Mælt
dæmi — Times-Roman 14 pt, strengurinn
`"/home/ek/work/src/lefty/lefty.c"` (31 stafur):

| | breidd |
|---|---|
| innbyggt C (FreeType) | 176.00 pt |
| @knowvah/dot-engine (mat) | 176.75 pt |
| munur | **+0.75 pt (+0.43%)** |

Hin textalína sama hnúts, `"93736-32246"`, mældist **eins**
(96.00 pt í báðum) — villan er háð strengnum og safnast upp á staf, ekki
einn jafn kvörðunarstuðull. Þetta bil á milli FreeType og matsins er raunverulegt en er
**ekki** það sem jöfnuðarkönnunin mælir (báðar hliðar keyra `estimate`); það myndi
aðeins skipta máli ef úttak @knowvah/dot-engine væri borið saman við C-teikningu með raunverulegu letri
utan þessarar könnunar.

**Afleidd áhrif á fyrrum `proc3d`-frávik (söguleg).** Breidd
texta ræður stærð hnúts, sem ræður uppsetningu:

1. Breiðari texti → örlítið breiðari hnútakassi (fyrir *sporöskju*-hnút er breidd
   að auki margfölduð með √2, svo +0.75 pt af texta → +0.53 pt af hálfbreidd).
2. Hálfbreidd hnúta ákvarðar skorður um aðskilnað frá vinstri til hægri í
   x-hnita-netsímplex; þær skorður eru `ROUND()`-aðar í
   heiltölur, svo undirdílabreyting á breidd getur velt skorðu úr *N* í
   *N+1*.
3. Netsímplexinn velur þá aðra — en jafn bestu — heiltölu-x-úthlutun og færir
   sumar x-stöður hnúta um 1–2 einingar.

Fyrir `proc3d.gv` utan safns (`graphs/directed/proc3d.gv`, ~2620 pt, ekki
meðlimur í jöfnuðarkönnun) gaf það **≤ 3.55 pt** mun á x-útbreiðslu
(**0.13%**), lagt yfir hér á eftir — **grænt = innbyggt C `dot` (golden), rautt =
@knowvah/dot-engine (okkar)**:

![Yfirlag proc3d, golden á móti okkar: grænt = C, rautt = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Þegar rennt var nær birtist jaðarinn nánast alfarið á löngu
skráarslóðasporöskjutextunum:

![Yfirlag proc3d, rennt að breiðu slóðasporöskjunum: grænt = C, rautt = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

| Golden — innbyggt `dot` | Okkar — @knowvah/dot-engine |
|---|---|
| ![proc3d teiknað af C-útgáfu Graphviz](/img/proc3d-golden.svg) | ![proc3d teiknað af @knowvah/dot-engine](/img/proc3d-ours.svg) |

Sjálfstæða greinargerðin (rót, tölur fyrir hvern mælikvarða, skipun til að endurskapa)
er á sinni eigin síðu:
[**proc3d — hið kanóníska A2-frávik í leturmælikvörðum (söguleg)**](/is/divergences-proc3d-a2).
Sú síða lýsir leystu fráviki á inntaki utan safns; núverandi
`proc3d`-afbrigði safnsins eru samræmd.

**Hvers vegna þetta var samþykkt á sínum tíma.** Að passa bæti FreeType fyrir bæti við stafabreidd
á hvert letur og streng hefði krafist þess að endurskapa mælitöflur þess,
vísbendingar (hinting) og námundun — stórt, brothætt og samt ekki
tryggt nákvæmt. Textamælirinn er sameiginlegur grunnþáttur: hver texti í
safninu fer í gegnum hann, svo lagfæring sem beindist að einum streng gat valdið afturför í
öðrum fyrir ósýnilegan ávinning.
:::

### A3. Jafnteflisúrlausn með `hypot` í splínuleiðingu (`dot`) {#a3-hypot-tie-break-in-spline-routing-dot}

**Fyrir áhrifum:** `dot`-graf með **rúmfræðilega samhverfa** leggjaleiðingarrás —
jafnan stuttan, samhverfan boga á láréttum legg. Dæmi sem sést hefur: `2368`,
sem helst á *structural-match* (maxΔ ≈ 10.2 pt á **einum** legg, `376->76`).
Sama jafnteflisúrlausn kemur einnig fram á **löngum** legg (yfir mörg þrep) inn í
miðstöð með mikla innkomu þegar gangurinn er nákvæmlega spegilsamhverfur: `graphs-b100` /
`graphs-b104` (sami frumkóði) víkja um maxΔ 20 (nákvæmlega ein þreparöð) á
einum hnút `Node23730->Node23729` — hver hnútastaða og öll uppstreymis
kassa-/marghyrnings-/strekktra-slóða-bygging er bæta-eins og hjá C; aðeins val `findMaxDev`, með
~1 ULP, á því hvaða spegilsamhverfi innri punktur verður Bézier-hnútur
er ólíkt. Stutta láréttu leggjaformið birtist einnig sem `241_1` (structural-match,
maxΔ ≈ 2.4 pt) — frávikandi systkini `241_0` sem er fest við véfréttina, þar sem suð C
heldur í staðinn fyrsta. Sama jafnteflisúrlausn veldur klofningi í rifugangi baklegs
með merkimiða í tveggja-hringjum í `2413_1` (structural-match, maxΔ 67.65) og
`2413_2` (maxΔ ≤99.55 þegar swapBezier-reverse-lagfæring T11 lendir — þangað til
er tilkynnt maxΔ 1922.26 skrárinnar ráðið af óskyldum, sérstaklega
rekjanlegum galla), og á einum legg með merkimiða innan klasa í `graphs-decorate`
(maxΔ 43.54); í hverju tilviki eru tvö frambjóðandi klofningshorn jöfn upp á
5.7e-13 (2413-fjölskyldan) / 3e-14 (decorate) áður en
staðsetningarháð suð Apple-`hypot` velur sigurvegara. `2371`
(structural-match, maxΔ 16.8) sýnir sama fingrafar á tveimur óskyldum
leggjum (`g[9263]` `r6837mid--r9687mid`, `g[23859]` `r38mid--r8699mid`): yfirfærslan
gefur nákvæma speglun véfréttarinnar á stýripunktaröðinni í báðum,
y hnútsins snúið um sama Δ16.8 (efri/neðri klofningshlutföll víxluð).
Uppruni þess er flokkaður með **MIÐLUNGS** vissu fremur en STAÐFESTU
vissunni hjá öðrum meðlimum: `2371` pakkar ~199 hlutum, sem
aftengir pathplan-staðbundin hnit frá síðuhnitum, þannig að jafnteflið
var ekki hægt að tengja lifandi við `route.ts:209` í þremur
tækjavæðingartilraunum; uppruni í bein-ham-hlutun eða í `recover_slack` eftir klippingu
er ekki útilokaður að fullu. Full greining:
`plans/residual-cleanup/analysis/2371-mirror.md`. Flestir leiðaðir leggir
verða ekki fyrir áhrifum.

::: details Graf-skilgreining (`2368.dot`)
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

**Einkenni.** Splínuaðlagarinn (`Proutespline` → `findMaxDev`,
`src/pathplan/route.ts`) klýfur aðlagaðan Bézier við innri leiðarpunktinn með
mesta frávikið. Þegar rásin er samhverf eru frambjóðandi klofningspunktarnir tveir
**nákvæmt stærðfræðilegt jafntefli**, og sigurvegarinn ræðst þá af um það bil 1e-14
kommutölu-útstrikunarsuði í Bézier-mati á alhnitum
þar sem **formerkið ræðst af alhnitastöðu**.

Frávikafjarlægð C er libm-`hypot`, og macOS-Apple-`hypot` sem
bjó til véfréttina er séreignarútfærsla sem er bita-eins við **ekkert**
færanlegt `hypot` (mælt gegn henni á hnitasviði graphviz, hlutfall bitaeins:
V8 `Math.hypot` ≈ 63%, rétt-námundað / Arm-líkt `hypot`
≈ 84%, fdlibm `hypot` ≈ 90%, `sqrt(dx²+dy²)` ≈ 94%). Vegna þessa ULP-suðs
**er C sjálft ekki samkvæmt sér**: það klýfur tvo *færsluþýða* boga í átt að
**gagnstæðum** hornum. Innan `2368` er bogi `376->76` spegilmynd
rúmfræðilega eins boga `256->436`:

```
C    376->76 : M273.31,-4.56 C268.33,-3.14 263.11,-1.9  258.11,-1.15 250.49,0     242.34,-0.98 234.83,-2.8
port 376->76 : M277.29,-4.51 C268.27,-1.69 257.65,0.32  247.89,-1.15 244.92,-1.59 241.88,-2.21 238.85,-2.94
```

Allur munurinn, lagður yfir (12× aðdráttur á boga `376->76` / `to1`) — **grænt = C-útgáfa
Graphviz, rautt = @knowvah/dot-engine**. Báðir eru sami grunni niðurbogi milli
sömu hnútamarka; þeir eru ólíkir um ~1–2 pt í kviðnum (miðjustýripunktur
Bézier), þar sem jafntefli C féll í átt að gagnstæða horninu:

![2368 376->76-bogi: grænt = C, rautt = @knowvah/dot-engine](/img/2368-376to76-overlay.png)

Allt annað passar innan vikmarka — sami umlykjandi kassi (608×148), hnútastöður,
merkimiðar, örvaroddar og allir aðrir leggir. Heildarteikningarnar eru sjónrænt
óaðgreinanlegar:

| C-útgáfa Graphviz | @knowvah/dot-engine |
|---|---|
| ![2368 teiknað af C-útgáfu Graphviz](/img/2368-c.png) | ![2368 teiknað af @knowvah/dot-engine](/img/2368-port.png) |

Yfirfærslan notar **færslujafnstæða** jafnteflisúrlausn (raunverulegt jafntefli leysist alltaf
á fyrsta vísi), svo hún teiknar *alla* slíka boga eins án tillits til
stöðu — hún er samkvæm sér og passar við C á bogum þar sem suð C heldur einnig
fyrsta (t.d. `256->436`, og `241_0 5:ne->8:nw`), og víkur aðeins þar sem suð C
flippar hinn veginn (`376->76`). Endapunktar, markpunktur örvarodds, hinir
leggirnir, allir hnútar, merkimiðar og umlykjandi kassi passa innan vikmarka; aðeins
innri stýripunktar eins boga færast (~1–2 pt í kviðnum).

**Hvers vegna samþykkt.** `hypot` Apple er ekki endurtakanlegra milli JS-véla og
örgjörva en FMA/`pow` í **A1** — þetta er sama flytjanleikahömlunin, aðeins
í `dot`-splínuleiðaranum. Að passa *staðsetningarháð* val C myndi þýða að
taka upp strangt jafnteflisúrlausn C, sem býr í **sameiginlegum grunnþætti** sem hver leiddur
leggur fer í gegnum: með því er passanum á `376->76` skipt út fyrir *nýjan* ósamræmi á
bogum þar sem C lendir hinum megin (það veldur afturför í `241_0` og í véfréttartilviki
með `cnt=3` á láréttum legg), núll á móti núlli sem fórnar að auki
færslujafnstæðu yfirfærslunnar. Því höldum við samkvæma (jafnstæða) leiðaranum. Þetta er
afmarkað, ósýnilegt `dot`-frávik — ekki opinn galli. Full rannsókn:
`.agent-notes/2368-residual-flat-label-ranksep.md`.

### A4. Véfrétt í viðurkenndu biluðu ástandi (init_rank-/pathplan-fjölskyldan) {#a4-oracle-in-an-acknowledged-broken-state-the-init-rank-pathplan-family}

**Fyrir áhrifum:** `2796` (structural-match, maxΔ 49), `2471` (structural-match,
maxΔ ~9063), `1435` (structural-match, maxΔ 503), `1581` (diverged, maxΔ 465). Meðlimir
fjölskyldunnar `1939` og `2825` eru **conformant** og bera enga færslu, og `2470`
og `graphs-structs` bættust í þann hóp 2026-07-11 (bæði urðu samræmd
eftir að lagfæringarnar á ortho-aðliggjandi yfirfalli/chancmpid, fmadd `polylineMidpoint` og
námundun jafnteflis að jöfnu (half-even) lentu — yfirfærslan endurskapar nú
úttak véfréttarinnar við endurheimt upp á punkt, þar með taldir sömu töpuðu leggir);
samþykktarfærslur þeirra eru dregnar til baka.

`1581` og `2825` voru hrunendurheimtartilvik (verkefnið fix-element-count-bucket):
fuzzer-/úrkynjað inntak þar sem prófanir upprunans fullyrða **aðeins**
að dot hrynji ekki (`test_1581`: ekkert ASan-brot; `test_2825`: ekkert
hrun þegar `rebuild_vlists` skilar -1). C rekst á innri `Error:`
(`install_in_rank` / `rebuild_vlists: lead is null`) og endurheimtin
fleygir uppsetningarefni; yfirfærslan kemst að **sömu ákvörðunum um eyðingu
röðunarsetta** (jöfnuður viðvarana staðfestur: sömu hnúta-/grafheiti í
viðvörunum „already in a rankset“ frá `mark_clusters`, cluster.c:317-320).

`2825` er nú fullkomlega lokað. Verkefnið fix-2825-rebuild-vlists (eftir 1581)
lokaði fyrst bilinu um eitt lag: yfirfærslan nær nákvæmlega innra villuástandi C
— stderr bæta-eins þar með talin röð skilaboða
(`Error: rebuild_vlists: lead is null for rank 1` og svo framhaldið án forskeytis
`agerr(AGPREV, ...)` `concentrate=true may not work
correctly.`) — þar sem `dotLayoutPipeline` miðlar bilun
`dot_position` rétt áfram til að sleppa `dot_splines`/`dotneato_postprocess`,
í samræmi við `dotLayout` í C (`if (r != 0) return r;` eftir `dot_position`,
dotinit.c:322-325). Framhald (hluti 2) lokaði síðan afganginum af bilinu í
teikningarlaginu: `emit_node` í C hliðar hvern hnút á `node_in_box(n,
job->clip)` (emit.c:1806-1809), og á þessari hætti-slóð er `job->clip`
úrkynjað vegna þess að `GD_bb` var aldrei sett af `set_aspect` (innan
sleppta halans á `dot_position`) — svo C gefur út *engan* hnút, aðeins (einnig
úrkynjaða) klasaramma. Yfirfærslan yfirfærði sama `node_in_box`-hlið
(`src/gvc/device.ts:renderNode`, með `job.bb`/`job.pad` sem
jafngildi `job->clip` fyrir eina síðu) og hætti að endurreikna
sennilegan umlykjandi kassa út frá lifandi hnútastöðum þegar `g.info.bb` er ósett
(`src/gvc/device.ts:render`, `job.bb = g.info.bb` orðrétt, sem speglar
`gvc->bb = GD_bb(g)` í `init_gvc`, emit.c:3272) — hver uppsetningarvél
setur `g.info.bb` sjálf áður en `render()` keyrir á hverri slóð sem hættir ekki,
svo þetta er bæta-eins á heilbrigðum grafum og breytir aðeins úttaki
á þessari hætti-slóð. `2825` er nú `conformant` (úttak með 4 frumefnum,
bæta-eins og véfréttin). Sjá
`.agent-notes/2825-rebuild-vlists-abort.md` fyrir fullan verkunarferil
beggja hluta. `1581` nær aldrei ósamkvæmu ástandi (*annar*
galli í klasagluggum upprunans, ekki `rebuild_vlists`), svo það
setur upp eftirlifandi graf sitt í heild — það bil er enn opið. Úttak véfréttarinnar
fyrir `1581` er rusl úr endurheimt án merkingar sem upprunaverkefnið skilgreinir. Gögn:
[`1581`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1581.md). Í
öllum þessum inntökum er það **C-véfréttin** sem er biluð, samkvæmt
frásögn graphviz sjálfs: `2471`, `1939` og `1435` eru
[`xfail(strict=True)`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/tests/test_regression.py)
í upprunanum (villur
[#2471](https://gitlab.com/graphviz/graphviz/-/issues/2471),
[#1939](https://gitlab.com/graphviz/graphviz/-/issues/1939),
[#1435](https://gitlab.com/graphviz/graphviz/-/issues/1435), sbr.
[#2796](https://gitlab.com/graphviz/graphviz/-/issues/2796)); eina
lagfæringartilraunin, [drög MR !4849](https://gitlab.com/graphviz/graphviz/-/merge_requests/4849),
eru enn ósamþykkt drög (síðast breytt 2026-03-20). `graphs-structs` er
hinn forni flokkur taps á hafnarleggjum í leiðingu record-hnúta (#102/#242/#274/#1323) sem stöðug
útgáfa graphviz 15.0.0 teiknar rétt — afturför í véfrétt úr þróunarsmíð.

**Hvað C gerir.** Í `init_rank`-meðlimunum (`2796`, `2471`, `1939`)
lokar hjálparnet innbyggðs dot fyrir x-hnit stefndum hring í gegnum
skorðuleggi klasaveggja; `init_rank` þess
([`init_rank`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/ns.c#L146))
getur ekki skannað alla hnúta, prentar `Error: trouble in init_rank`, og
uppsetningin heldur áfram frá því endurheimtarástandi — í `2471`/`2796` endar hún í
rusli úr `Pshortestpath`-þríhyrningun og týndum leggjum. Í `1435` og
`graphs-structs` er biluð áfanginn pathplan sjálft (blindgötur í þríhyrningun með
eyrnaklippingu; týndur record-hafnarleggur).

**Inntök staðfest, síðan gerð trú (þetta er burðarhlutinn).**
Verkefnið `verify-oracle-bug-family`
([lýsing](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/README.md))
sótti skorðunetið sem báðar hliðar mata netsímplex á, línu fyrir línu,
fyrir hvern meðlim fjölskyldunnar — og komst að því að „hrein“ hegðun yfirfærslunnar fyrr á
þessari fjölskyldu kom frá **fjórum raunverulegum göllum í yfirfærslunni**, öllum lagfærðum:

1. `flatEdges` sleppti kalli C á
   [`rec_reset_vlists`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/flat.c#L333),
   sem skildi eftir úrelta þreparglugga klasa eftir innsetningu vnode fyrir flata merkimiða
   (þetta eitt lét yfirfærsluna tapa **9** leggjum í `2471` þar sem C
   tapar 6).
2. Refsingin fyrir leggi í sama `group` virkjaðist á lykkjuleggjum í stað
   endapunkta í sama ekki-tóma hópi
   ([`dot_init_edge`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/dotinit.c#L66)).
3. `CL_CROSS` notaði `_WIN32`-gildi C, 100; viðmiðunarkerfi véfréttarinnar notar 1000
   ([`const.h`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/const.h#L141)).
4. Blindgata í þríhyrningun stöðvaði `Pshortestpath` í stað þess að C
   varar við og heldur áfram + varaleið með beinni línu
   ([`shortest.c:333`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/pathplan/shortest.c#L333)).

Eftir lagfæringar eru NS-skorðuúttök fjölskyldunnar **línu-eins** og hjá C
(253 rank2-köll í `2471`; öll köll í `1939`/`1435`/`graphs-structs`),
og yfirfærslan fylgir C í gegnum viðurkennda bilaða endurheimt: sömu
töpuðu leggir (`3->16` í 2796; sömu 6 í 2471), sömu frumefnatré.
`1939` varð fullkomlega samræmt. Afgangsmunur í tölum (og ólíkt pathplan-rusl
í 1435) er hegðun *innan* endurheimtarástandsins, sem
stefna verkefnisins eltir viljandi ekki.

**`2723` (segfault; fest, ekki elt).** Innbyggt `dot` fær segfault (útgangskóði 139)
á `tests/2723.dot` (óstefnt, `rank=same`-hópar, leggir með merkimiða), svo C hefur
ekkert úttak til að passa við. Villa [#2723](https://gitlab.com/graphviz/graphviz/-/issues/2723)
í upprunanum er opin og
`tests/test_regression.py:test_2723` er `xfail`. Yfirfærslan kastar
`InternalError` (`INTERNAL_ERROR`, með `TypeError` sem orsök frá
`src/layout/dot/flat.ts:flatLabelYpos`, þar sem `rank[r-1]` er óskilgreint). Án
réttrar véfréttar stendur hreinskilin bilun og yfirfærslunni er ekki breytt;
`src/layout/dot/flat-2723.test.ts` festir hana. Uppfærðu þá prófun ef upprunaverkefnið lagar
villuna.

**Athugasemd um stefnu.** Fyrri afstaða A4 („yfirfærslan uppfyllir væntingar
villunnar; ekki endurskapa“) byggðist á þeirri trú að óhringlaga
hjálparnet yfirfærslunnar kæmi frá meinlausu staðbundnu afbrigði. Svo var ekki — það kom
frá galla (1), sem sannanlega villti um fyrir `2471`. Trúnaður við C-frumkóðann
vann: yfirfærslan endurskapar nú viðurkenndar bilaðar niðurstöður C úr
staðfest-eins inntökum, og sérhverja færslu hér ætti að **mæla að nýju
þegar upprunaverkefnið lagar samsvarandi villu** (úttak véfréttarinnar
breytist; búast má við að þessi auðkenni lýsist upp sem afturfarir við þá uppfærslu — það
er af ásettu ráði, ekki fúi).

**Gögn.** Samanburðarsíður fyrir hvert auðkenni (teikningar hlið við hlið + sönnunarskrár):
[`2471`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2471.md),
[`1939`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1939.md),
[`1435`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1435.md),
[`graphs-structs`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/graphs-structs.md),
[`2796 post-fix addendum`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2796-post.md)
(grunnlína fyrir lagfæringu varðveitt á
[`2796-cluster-ranking.md`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-2796-cluster-ranking/comparisons/2796-cluster-ranking.md)).
Greiningarskrár: `.agent-notes/2471-stale-cluster-windows-missing-reset.md`,
`.agent-notes/1939-group-penalty-clcross-misports.md`.

### A5. Ógild inntaksbæti (framsetning kóðunar) {#a5-invalid-input-bytes-encoding-representation}

**Fyrir áhrifum:** `1367` (diverged, maxΔ 0 — nákvæmlega einn byggingarlegur munur).

**Hvað er ólíkt.** Inntaksskráin inniheldur nakið UTF-8-eftirfylgdarbæti (`0x80`)
inni í hnútaheiti. C meðhöndlar nakin eftirfylgdarbæti 0x80–0xBF sem „gild
tákn sem standa fyrir sig sjálf“ (`lib/common/utils.c:1200-1207`, engin
viðvörun), og `<title>`-texti hnútaheitis sleppir stafasettsumbreytingu alfarið
(bæti úr `agnameof` renna beint í `gvputs_xml`). SVG véfréttarinnar inniheldur því
hrábætið og er **ekki gilt UTF-8** þrátt fyrir yfirlýsta
kóðun. Yfirfærslan afkóðar ógilt UTF-8-inntak með latin1-varaleið
(`0x80 → U+0080`) og skilar vel mótuðu UTF-8 (`\xc2\x80`).

**Hvers vegna samþykkt.** Inntaks-/úttaksmörk yfirfærslunnar eru JS-strengir (vafrasafn).
Hrátt ógilt bæti kemst ekki hring í gegnum skilagildi `renderSvg` sem er strengur;
að passa bæti C þýddi að skemma úttakskóðun fyrir hvern
notanda. latin1-varaleiðin speglar eigin endurheimtarsemantík C, „treated as Latin-1“
(`utils.c:1249`). Þetta er takmörkun fyrir neðan kóðann —
framsetningarlagið — ekki flytjanleg hegðun sem við neituðum að yfirfæra.
Allt annað í 1367 er samræmt: fjöldi frumefna (23 polyline /
103 text / 44 polygon / 24 path) og öll hnit passa eftir
lagfæringuna á decorate (T6).

**Gögn.**
Samanburðarsíða fyrir [`1367`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1367.md)
(teikning hlið við hlið + sönnunarskrá).

---

### A6. Yfirflæði `unsigned int` á striga við úrkynjað inntak {#a6-unsigned-int-canvas-overflow-on-degenerate-input}

**Fyrir áhrifum:** `1314` — inntak sem er unnið úr fuzzer (`fontsize="991836031967s8"`)
þar sem fáránleg leturstærð blæs teikninguna upp í ~2.75e11 pt.

**Hvað gerist.** C geymir `job->width` / `job->height` sem **`unsigned int`**
(`gvcjob.h:327-328`). `ROUND(...)` á hinni risastóru punktastærð (`emit.c:1249-1250`)
yfirflæðir 32 bita og vefst yfir mod 2³², og SVG-bakendinn skrifar það út í gegnum
**formerkt** `%d` (`gvrender_core_svg.c:258-259`) — svo C prentar
`height="-425618343"`. Yfirfærslan heldur stærðfræðilega samkvæma (óvafða)
gildinu. Öll önnur gildi — `cx/cy/rx/ry` hnútasporöskju, `translate` rótar,
marghyrningurinn, `font-size` textans — eru bæta-eins; aðeins breidd/hæð
`<svg>` á efsta stigi eru ólík.

**Hvers vegna við eltum þetta ekki.** Að endurskapa 32 bita heiltöluyfirflæði C er ekki
uppsetningarhegðun sem er þess virði að yfirfæra, og inntakið er úrkynjað. Endurskoðum ef upprunaverkefnið
lagar yfirflæðið (t.d. með því að víkka reitinn eða takmarka stærðina).

<a id="a6b-degenerate-nan-layout"></a>

#### A6b. Úrkynjuð NaN-uppsetning (`sfdp`, sjúklegt `repulsiveforce`) {#a6b-degenerate-nan-layout-sfdp-pathological-repulsiveforce}

**Fyrir áhrifum:** `2556` — `repulsiveforce=100` (⇒ fráhrindikrafturinn notar
`pow(dist, 101)`), sem rekur gorma-rafsviðslausnarann í **NaN í báðum
vélum**. Innbyggða véfréttin sjálf gefur út allar hnúta-/leggjastöður sem `nan` og
úrkynjaðan umlykjandi kassa.

**Hvað gerist.** Þegar hvert hnit er NaN rita útfærslurnar tvær
ruslið á ólíkan hátt: (1) bb grafsins / bakgrunnsmarghyrningur — C námundar `NaN`
í `int`, sem á arm64 gefur rusl af stærðargráðu `INT_MIN` (`bb="0,0,-4.295e+09,
-4.295e+09"`); yfirfærslan heldur `0`. (2) Teikniaðgerðir leggja — úttakspassi innbyggðu
útgáfunnar bælir `_draw_`/`_hdraw_` NaN-splínu (gefur aðeins út `pos`),
meðan yfirfærslan gefur þær út með NaN-stýripunktum. Teikningar hnúta passa (báðar
bæla þær). Engin raunveruleg uppsetning er til hvorum megin.

**Hvers vegna við eltum þetta ekki.** Yfirfærslan endurskapar nú þegar *sömu* NaN-sprengingu og
innbyggða útgáfan — lagfæringin sem kom henni þangað er ósvikin (sjá hér á eftir); það sem eftir er er aðeins
hvernig hvor um sig ritar NaN-rusl. Að endurskapa óskilgreinda hegðun `(int)NaN` í C
og bælingu NaN-splínuteikningar er ekki marktækur uppsetningartrúnaður á inntaki
þar sem uppsetningin er úrkynjuð í báðum vélum. Endurskoðum ef upprunaverkefnið takmarkar
`repulsiveforce` eða hreinsar NaN-stöður.

**Lagfæringar í yfirfærslunni sem gerðu þetta aðgengilegt (ekki eltar burt — raunverulegir gallar).** Áður en
þær komu gat yfirfærslan ekki einu sinni náð úrkynjaða ástandinu: (1) `armPow`
(`src/common/arm-pow.ts`) kastaði á hvert gildi utan hraðleiðar; það yfirfærir nú alla sérstilfellagrein
ARM `pow.c` þannig að `pow(NaN, y) = NaN` eins og í libm. (2)
`bezierClip` (`src/common/splines-geom.ts`) lykkjaðist endalaust á NaN-stýripunktum
því samrunaprófið var einföld neitun á `while (ABS > .5)` í C (jafngilt
fyrir endanleg gildi, ekki fyrir NaN); það speglar nú C nákvæmlega og
lýkur á NaN. Báðar eru C-trúar og hafa aðeins áhrif á NaN-inntak.

---

### A7. Námundunarmörk á kassavegg með `round()` (`dot`) {#a7-round-box-wall-rounding-boundary-dot}

**Fyrir áhrifum:** `graphs-honda-tokoro` og (bætt við 2026-07-28, nýtt í 905 atriða
heildinni) systurskrá þess í `graphs/directed/`, `tree-graphs-directed-honda-tokoro`
(bæði structural-match, maxΔ ≈ 1 pt á eina leggnum `n012->n011`). Systurskráin
er aðeins ólík vegna `samearrowhead`-eiginda, sem snerta ekki leiðingu þessa pars —
rúmfræði `n012->n011` í henni er bæta-eins og hjá samþykkta auðkenninu á
báðum hliðum, yfirfærslu og véfréttar, svo verkunin hér á eftir flyst orðrétt.

**Hvað er ólíkt.** Kassaveggur `maximal_bbox` fyrir höfuðgang lendir við innra
x=90 í C en x=89 í yfirfærslunni fyrir sameiginlega `samehead`-höfn leggjanna
tveggja `n012->n011` sem eru samsíða. Smíði sameiginlegu hafnarinnar (`buildSharedPort`) og
samsíða hópunin eru bæði bæta-samræmd C; 1 dílsbilið er eingöngu
gripur námundunarmarka `round()` — ~1e-14 af kommutölusuði ofar í ferlinu
velta gildi sem situr nákvæmlega á `.5`-mörkum yfir á nágrannaheiltöluna.
Formúla `maximal_bbox` í yfirfærslunni speglar nú þegar C upp á punkt.

**Hvers vegna við eltum þetta ekki.** `round()` er grunnþáttur sem hver leiddur leggur
í safninu fer í gegnum; að þoka hegðun hans á mörkunum til að passa við þetta eina tilvik er
afturfaráhætta fyrir allt safnið fyrir 1 díl á 2 leggjum — sama takmörkun á sameiginlegum grunnþætti
og námundunarsuðið á stýriskel sem er nefnt í
`bbox-class-control-hull-vs-curve`. Full greining:
`.agent-notes/honda-samehead-shared-port.md`.

---

### A8. `fp-contract`/FMA-námundun á móti ströngu IEEE (`dot`) {#a8-fp-contract-fma-rounding-vs-strict-ieee-dot}

**Flokkur.** clang arm64 þýðir véfréttarkeyrsluskrána með `-ffp-contract=on`,
sem sameinar valdar margföldunar-og-samlagningarrunur í einstakar FMA-skipanir; yfirfærslan
keyrir á V8, sem framkvæmir stranga IEEE-754-námundun og getur ekki gefið út
`fma`. Á bitaeins inntaki eru þau ósammála um 1–2 ULP í hverri
segð sem þýðandinn valdi að sameina. Yfirfærsluhliðin er alltaf
strangt IEEE-754-niðurstaða; véfréttarhliðin er alltaf FMA-sameinuð
niðurstaða. Þetta er flytjanleikahömlun þýðanda/keyrsluumhverfis fyrir neðan merkingu
C-frumkóða, ekki rökgalli í yfirfærslunni — óhjákvæmileg án þess að
herma eftir sértækum sameiningarvalum clang í hugbúnaði. Tvö tilvik
eru þekkt, á tveimur ólíkum stöðum, með tveimur ólíkum mögnunarverkunum:

- **2646** — ULP verður til inni í þriðjastigsleysingu `Proutespline`, `points2coeff`/`solve3`,
  og flippar beint fjölda róta hjá splínuaðlagaranum.
- **2620** — ULP verður til í lykkju `poly_init` sem finnur hornpunktaútbreiðslu marghyrnings
  (stærðarákvörðun hnúta) og er magnað ofar í ferlinu af trúrri heiltölustyttingu `ortho` í hverju losunarskrefi
  yfir í flipp á jafndýru jafntefli í völundarhúsagangi.

**Fyrir áhrifum:** `2646` (structural-match, maxΔ 42.09 á 3 af 21.216 leggjum:
`edge2575` `g[4639]`, `edge3905` `g[7777]`, `edge15467` `g[30201]` — allt
langar leggjaleiðir með `:c->:nb_part` smode og record-höfnum). Systkini **A3**: báðir
flokkar eru óhjákvæmileg flytjanleikajafntefli í kommutölum innan
`Proutespline`, en verkunin er önnur — gripur frá `fp-contract` í þýðanda,
ekki libm-`hypot`.

**Hvað er ólíkt.** Á öllum þremur leggjum víkur aðeins síðasta kallið á `routesplines` (bein
leggur inn í höfuðhöfnina). Endapunktur þess liggur bita-nákvæmlega á
neðri vegg hindrunarmarghyrningsins með snertil samsíða þeim vegg
(`evs[1]=(1,-1.22e-16)`), svo hver `splinefits`-frambjóðandi snertir
hindrunina við `t=1` — nærri tvöföld rót skurðþriðjastigsmargliðunnar.
`points2coeff` reiknar þá margliðu í gegnum stórfellda útstrikun
(liðir um ~7446 falla saman í ~0.099). Véfréttin (clang/arm64,
`-ffp-contract=on`) sameinar `v3 + 3*v1 - (v0 + 3*v2)` í samrunnar
margfaldanir-og-samlagningar, meðan V8 framkvæmir stranga IEEE-námundun — þau eru ósammála um
~9.1e-13 á **bitaeins inntaki**, og sú suð flippar formerki
aðgreinis `solve3`: C finnur 1 rót (866.7, innan bútsins); yfirfærslan
finnur 3 rætur með falskri hjárót við `t=0.9999975 < 1-EPSILON2`. Falska
rótin kallar fram eina aukaítrun með `a`-helmingun, sem flippar
snertilstærð síðasta hluta um stuðulinn 2 (í hvora áttina sem er á
leggjunum 3), sem gefur maxΔ 42.09 eftir klippingu (26 SVG-mismunir).

**Hvers vegna samþykkt (óhjákvæmileiki sannaður með stýrðri tilraun).** Öll sex
köll á `routesplines` voru sótt á báðum hliðum — kassi, marghyrningur, `PL`, upphaf,
endir og `evs` eru bæta-eins, sem og úttaksspalín fyrra (ekki síðasta) kallsins; eini
munurinn er inni í `solve3` í síðasta kallinu. Sjálfstætt tilraunaforrit í hreinu C
einangraði einu breytuna: þýðing með `-ffp-contract=off` endurskapar
**yfirfærsluna** bita-nákvæmlega á öllum 3 leggjum; sjálfgefin (`on`) sameining endurskapar
**véfréttina** bita-nákvæmlega á öllum 3
leggjum. Yfirfærslan er því þegar sammála ströngu IEEE-754-C; munurinn
er alfarið val véfréttarþýðandans á FMA-sameiningu, fyrir neðan
merkingu C-frumkóða — enginn trúnaðarbrestur á frumkóðastigi til að laga. Markviss
lagfæring (að herma handvirkt eftir sameiningunni í `points2coeff`) var reynd og
hrakin: hún leiðréttir 2 af 3 leggjum en ekki þann þriðja, sem flippið á
á upptök sín í eigin innri sameiningu `solve3`. Fullkomin lagfæring
krefðist hugbúnaðar-FMA-hermunar í öllum splínuaðlagaranum — kostnaður í heitri lykkju
með námundunaráhrifasvið um allt safnið fyrir ávinning upp á undirdíla og 3 leggi.
Full greining: `plans/residual-cleanup/analysis/2646-fp-contract.md`.

**Fyrir áhrifum (söguleg):** `2620` (var structural-match, maxΔ 585; 423 mismunir
á 24 leggjaferlum + 22 örvaroddum). **Féll saman í conformant 2026-07-11**:
trú yfirfærsla á yfirflæði aðliggjandi-biðminnis í `sgraph` + tvíátta
innihaldsprófi í `chancmpid` (sjá `.agent-notes/ortho-maze-circo-rca.md`) fjarlægði
fráviksorsökina; samþykktarfærslan er dregin til baka og þessi kafli er varðveittur sem
skjölun á A8-flokknum.

**Hvað er ólíkt.** `ortho`-ferlið (`splines=ortho`) er bæta-samræmt
C með eins inntaki — sannað með því að sprauta nákvæmu völundarhúsainntaki C
(hnit, `xsize`/`ysize`) inn í ortho-áfanga yfirfærslunnar: 378/378 leidd
bútar koma út bæta-eins, svo ekkert í `src/ortho` er sekt.
Raunverulegi munurinn er 1–2 ULP í *inntaki* völundarhússins: `ysize` hnúts (og, með
uppsöfnun innan þreps, `ND_coord.y`) reiknað í lykkju C í `poly_init` sem finnur
hornpunktaútbreiðslu marghyrnings (`shapes.c`), sem undir
`-ffp-contract=on` sameinar `R.x += sidelength*cosx` í FMA sem er ~1
ULP stærra en ströng IEEE-reikniaðferð yfirfærslunnar (báðar hliðar útfæra
stærðfræðilega eins segð). `2620` hefur 173 marghyrningshnúta með brotabreidd;
allir sýna C ≥ yfirfærsla um 1–2 ULP. Sá ULP er magnaður — ekki
innleiddur — af Dijkstra-losun `ortho`, sem sker trúlega af
vegalengd sína í hverju skrefi (`sgraph.c:165`, speglað í yfirfærslunni sem
`Math.trunc`) yfir vægi sem er leitt af hráum stærðum reita
(`maze.c:257`). Rúmfræðin með ULP-færslunni flippar jafndýru jafntefli í gangi
fyrir 4 leidda leggi (ferla + örvaodda þeirra); afgangsmunur er
afleidd endurnúmering á ±1 braut vegna þessara 4 flippa.

**Hvers vegna samþykkt (óhjákvæmileiki sannaður með stýrðri tilraun).** Sjálfstætt
C-tilraunaforrit sem breytti aðeins `-ffp-contract` endurskapaði báðar hliðar
á hornpunkti sexhyrningsins sem er ólíkur: `-ffp-contract=on` → `310.29250168188713`
(passar við véfréttina), `-ffp-contract=off` → `310.29250168188707` (passar við
yfirfærsluna), og ólíka aðgerðin einangruð við hornpunkt `i=3`
(`R.x=-0.50000000000000011` sameinað á móti `-0.5` ósameinað). Önnur
innsprautunartilraun (eina breytan: inntaksgildi ortho) staðfesti
magnarann: að mata `orthoEdges` í yfirfærslunni sjálfri á nákvæm `coord`/`xsize`/`ysize` frá C lækkar öll 4 gangafrávik í 0 — ortho-kóðinn
hefur engan galla, hann er bara viðkvæmur (eins og eigin völundarhúsakostnaðarleiðing C) fyrir 1–2 ULP færslu í
inntaki sínu. Að passa þýddi að herma eftir sértækri FMA-sameiningu clang á einu þýddu segðartré
í `poly_init` — að elta þýddan grip, ekki að yfirfæra merkingu frumkóða.
Full greining: `plans/ortho-2620-residual/analysis/2620-ortho-route.md`.

**Hermd undantekning (ekki samþykkt): `triang.c:ccw`.** Einn sameiningarstaður
ER endurskapaður bita fyrir bita í stað þess að vera samþykktur: `ccw` í pathplan
þýðist í `fnmul`+`fmadd` (nákvæm fyrri margfeldi − námundað seinna), svo
fyrirspurnarpunktur bita-jafn endapunkti striks prófast sem ISCW/ISCCW í stað
ISON. `shortest.c:pointintri` hafnar þá endapunktum sem eru hornpunktar marghyrnings
(„destination point not in any triangle“) og `makeMultiSpline` hverfur aftur
í einfalda leiðingu fyrir hvern samrunninn tveggja-hring — stór, stakræn
hegðun um allt safnið sem yfirfærslan verður að passa. Ólíkt stöðunum `solve3`/`poly_init`
hér að ofan (djúpt inni í þýddum segðartrjám, lagfæring hrakin) er `ccw`
eitt sjálfstætt þýtt fall með skýra merkingu, svo
`src/pathplan/triang.ts` hermir eftir því: einföld tvöföld-nákvæmni hraðleið með
varfærinni skekkjumörkun þar sem einföld og sameinuð formerki sanna að séu sammála, og
nákvæm Dekker-margfeldi + tvíundar-BigInt leið fyrir tilvik nærri núlli.

---

### A9. libm-hornaföll með 1 ULP → flipp á CDT-jafntefli á einum hring (`circo`/`twopi` multispline) {#a9-libm-trig-1-ulp-→-cdt-cocircular-tie-flip-circo-twopi-multispline}

**Flokkur.** `Math.sin`/`Math.cos` í V8 eru ekki bita-eins og `sin`/`cos` í Apple libm
(sannað: 1 ULP ósamkomulag við `2π·4.5/8`, eitt af átta
hornum sporöskjuhindrunar). Horn umritaðs 8-hyrnings í `makeObstacle`
erfa þann ULP, svo hnit inntaks þríhyrningaleiðarans eru ólík
véfréttarinnar um ≤6e-14. Samhverfar uppsetningar (jafnstórir hnútar í þrepi/hring) gera
ferhyrninga leiðarans **nákvæmlega á einum hring** í raunverulegri reikningslist, svo nákvæma
innhringsforsendan situr á hnífsegg: inntaks-ULP flippar formerki hennar,
hornalína þvingaðrar Delaunay-þríhyrningunar flippar, og gangamarghyrningurinn sem mistekst í
`Pshortestpath` í véfréttinni („destination point not in any triangle“ →
varaleið með einfaldri splínu) tekst í yfirfærslunni (eða öfugt). Splínurnar sem
koma út eru ólíkar um ~0.2–0.5pt. Systkini **A3**/**A8**: óhjákvæmileg
flytjanleikahömlun í kommutölum fyrir neðan merkingu frumkóða — að passa
krefðist þess að endurskapa nákvæma `sin`/`cos`-námundun Apple libm í JS.

**Fyrir áhrifum:** `241_0` (circo Δ≈0.2 / striga-Δ twopi ≈9 vegna gangaflipps
á legg `5:ne->8:nw`); `2343`, `2239`, `share-b29`, `windows-b29` (twopi,
1–2 mismunir á stöðu leggjamerkimiða hvert — libm-1-ULP verður til í
einingahornpunktahornaföllum `poly_init` (`hypot`/`atan2`/`sin`), setur reiknaða
hæð eins hnúts einum ULP fram yfir lágmarksstærðartakmarkið sem véfréttin lendir á
nákvæmlega, og fossar í gegnum `floor()` í R-trés-hleðslu xlabel inn í
eitt flipp á merkimiðaframbjóðanda. Lagfæring með rétt-námundað hypot var reynd og
HRAKIN: hún lagaði `2343` en olli afturför í `2168_3`, þar sem áttstrendingsstærðin
fer í gegnum sama kallið þar sem gildi véfréttarinnar er EKKI það sem er rétt
námundað — engin ákvarðandi hypot-stefna passar við véfréttina í báðum).
`2168_1` var upphaflega í þessum flokki en varð
samræmt þegar yfirfærslan fór að herma eftir `ccw` véfréttarinnar með fp-sameiningu
(`triang.ts` í pathplan): gangabilun þess ræðst af FMA-hafnaðri
endapunktahöfnun hornpunkta í `pointintri`, sem yfirfærslan endurskapar nú
bita fyrir bita, svo ULP-jafntefli CDT-hornalínunnar kemur þar ekki lengur fram.

**Hvers vegna samþykkt (óhjákvæmileiki sannaður með stýrðri tilraun).**
CDT sjálf er sýknuð: `mkSurface` í yfirfærslunni er trú yfirfærsla á stigvaxandi
innsetningu GTS 0.7.6 (`cdt.c`: 1→3 klofningur + endurkvæm
`swap_if_in_circle`, þvingunarleggir fyrirfram búnir til og ósnúanlegir,
`remove_intersected_*` + `triangulate_polygon` þvingun skorða), og
sjálfstætt C-tilraunaforrit sem tengist **hinu raunverulega GTS-safni** og er mataður bitanákvæmu
leiðarainntaki yfirfærslunnar endurskapar þríhyrningun yfirfærslunnar flöt fyrir flöt
(2168_1: 22/22; 241_0: 185/185). Nákvæm hlutfallstölumat á
ákvörðunarstuðli innhringsins á inntakssettunum tveimur staðfestir formerkisflippið (+1 með inntaki
yfirfærslunnar, −1 með inntaki véfréttarinnar). Afgangsbreytan — 1-ULP
munur í hornaföllum — var einangruð með því að bera bitamynstur `Math.sin`/`sin`
beint saman.

**Samþykki ferils vélar (`accepted-divergences-engines.json`).**
<a id="a9-engine-track-twopi-circo"></a> **xdot-vélaferlarnir** fyrir twopi/circo
(`parity-twopi.json` / `parity-circo.json`, innbyggð véfrétt `dot -K <engine>
-Txdot`, `test/corpus/engine-walk.ts`, merkingarbær samanburður á teikniaðgerðum við
±0.01 — sjá `test/golden/compare-xdot.ts`) afhjúpa sömu verkun
óháð SVG-könnun dot-vélarinnar sem vísað er til hér að ofan: twopi `2239` (1
mismunur í teikniaðgerð — flipp á textastöðu leggjamerkimiða í `_ldraw_`, sami
ULP í hornaföllum einingahornpunkta í `poly_init` sem fossar í gegnum `floor()`-keðju xlabel
R-trésins; `2343`, `share-b29` og `windows-b29`, upphaflega samþykkt
undir þessari færslu, voru *lagfærð* 2026-07-11 með trúrri fmadd-sameiningu
í `polylineMidpoint` — sjá málsgreinina um b29-fjölskylduna hér á eftir) og circo `241_0` (41
mismunur í teikniaðgerðum, Δ≈0.2pt á leiddum Bézier leggjar `1->2` — sama
gangaflipp CDT-hornalínu; ákvörðunardagbók, færsla 2026-07-10 „CDT rewritten as
faithful GTS port; 2168_3 outline-ring obstacle; 56/osage bb clobber; A9
filed“). Samþykkt á vélaferlisstigi með
`test/corpus/accepted-divergences-engines.json`, tengt við
`PARITY-twopi.md`/`PARITY-circo.md` með `parity-report.ts` — sama tenging
og `accepted.ts` framkvæmir fyrir `PARITY-dot.md` á dot-ferlinum.

**circo `2475_2` — jafntefli í `hypot` fyrir næsta hnút á einum hring.** Í einum 28 hnúta
hluta þessa 10762 hnúta grafs velur `getRotation` í circo
(`circpos.c:73-92`) blokkarhnútinn sem er næstur uppruna uppsetningarinnar með
`hypot` til að ákvarða snúning undirblokkarinnar. Tveir hnútar á einum hring eru
í reynd jafnlangt frá; rétt-námundað `Math.hypot` í V8 og `hypot` í Apple
libm námunda þá fjarlægð 2 ULP í sundur, sem flippar stranga `<`,
velur annan hnút, og snýr/speglar undirblokkina um ~20° (18 hnútar
færast, mest 296.7pt; hinir 10744 hnútarnir eru bita-eins, sem og
blokkartréð, hringröðin og hvert `centerAngle`). Stefnan með CR-hypot var
þegar hrakin fyrir þennan flokk (2026-07-10). Sjálfstæð endurgerð:
`.agent-notes/circo-2475-590-repro.dot`; full rótargreining:
`.agent-notes/circo-b81-2475-rca.md` (samþykkt 2026-07-11).

**twopi `2470` — ULP í geislahnitum magnaður af R-tré xlabel.**
2470 er graf með 140 leggjum þar sem HTML-`<table>`-leggjamerkimiðar þyrpast á
nærri samfallandi geislafestingum. Í neato-fjölskyldunni eru leggjamerkimiðar settir
sem ytri merkimiðar af gráðuga xlabel-staðsetjaranum (`label/xlabels.c`), sem
velur frambjóðandahornið með minnsta skörun í gegnum R-tré í Hilbert-röð.
Splínur og hnútahnit yfirfærslunnar passa við véfréttina upp á útgáfunákvæmni
(engir mismunir í splínum/hnútum/umlykjandi kassa jafnvel við 1e-7), en geisla-`ND_coord.y` eins hnúts
er ólíkt um ~2 ULP (Apple libm `sin`/`cos` á móti `Math` í V8) — langt
undir samræmisviðmiðinu, en það liggur yfir mörkum `floor(pos.y − sz.y/2)`
við nákvæmlega 0 í `objplpmks`, sem flippar R-trés-rétthyrningi þess hlutar
um eina einingu. Breytingin á Hilbert-röð/trjáhópun lætur `RTreeSearch` klippa
aðra grein, svo ~140 merkimiðar fara hver á nágrannahornið
(hver mismunur fast skref (+breidd, −línuhæð)). Staðsetjarinn, röð hluta,
námundun rétthyrninga, `CombineRect` (sem speglar trúlega min-min-sérkenni C) og
int32-Hilbert-lykillinn voru hvert um sig staðfest trú; fráviksorsökin
er ULP í geislahornaföllum ofar í ferlinu, óhjákvæmilegur af sömu ástæðu
og twopi `1855`. Samþykkt 2026-07-11; full rótargreining:
`.agent-notes/twopi-2470-rca.md` (sem skjalfestir einnig að „stóðst“
auðkennisins um morguninn var gripur úr úreltri véfréttarkeyrsluskrá, ekki afturför í
yfirfærslu).

**osage `1855` — fp-contract-útstrikun á hindrunarhornpunktum.** Aðgreint frá twopi-
`1855`-geislaspeglunarfærslunni hér að ofan: undir osage eru hnútamiðjur bita-nákvæmar
miðað við véfréttina, og 110 mismunir í teikniaðgerðum eru þrír hindrunarleiddir leggir
settir á speglaða hlið hnútaraðar (X bita-nákvæmt, Y speglað). Hornpunktar
áttstrendingshindrunar frá
`circumscribed_polygon_corner_about_ellipse` (`neatosplines.c:301`) eru ólíkir
C um 3–4 ULP því `-ffp-contract=on` í clang sameinar `a·b±c`-keðjurnar í
`ellipse_tangent_slope`/`line_intersection` í FMA með einni námundun
meðan V8 námundar hverja aðgerð: sameinuð námundun C fellir rennudálk af hornpunkta-x-gildum
í eitt bita-eins tvöfalt gildi (nákvæmlega á einni línu),
yfirfærslan klýfur það í tvö gildi 1 ULP í sundur. Það flippar
snertiprófi `clear()` fyrir sýnileika — rennan er ekki lengur lokuð — sem bætir við ~20
sýnileikaleggjum, og Dijkstra leysir upp/niður-grannfræðijafnteflið á
speglaðri hlið. Stýrð tilraun: að sprauta nákvæmum hindrunarhnitum C
inn í yfirfærsluna sem er að öðru leyti ósnert gefur **enga** frávikandi
leggi, sem sýknar löglegu-skipanina, sýnileikann, Dijkstra og splínukeðjuna
alfarið; að sprauta eingöngu `cos`/`sin` úr libm hjá C gerir ekkert. Samþykkt
2026-07-11; full rótargreining: `.agent-notes/osage-spline-family-rca.md`.

**b29-fjölskyldan (twopi).** Afbrigðin fjögur af b29 deila einni hnífsegg:
leggjamerkimiðinn `EqmtTyp` (`Node14732->Node14731`) situr á nákvæmu jafntefli í hliðarvali
placeLabels sem niðurstaðan ræðst af 1-ULP reki twopi-uppsetningar í
nálægum hlutum. Með trúrri fmadd-sameiningu í
`polylineMidpoint` (lagfæring states-fjölskyldunnar, 2026-07-11) er merkimiðafesting yfirfærslunnar
bita-eins og véfréttarinnar, en jafnteflið leysist samt öfugt í
tveimur af fjórum afbrigðum (`graphs-b29`, `linux.i386-b29`) meðan hin
tvö (`share-b29`, `windows-b29`) samræmast nú — og samþykkti A9-
merkimiðamunur `2343` hreinsaðist alveg. Mörk: 1 teikniaðgerð, Δ12pt á y merkimiða. Óhjákvæmilegt
án þess að útrýma reki ofar í ferlinu. Full rótargreining:
`.agent-notes/twopi-states-rca.md`.

Sama hnífseggin í placeLabels kemur fram á **osage**-ferlinum (samþykkt
2026-07-11, full rótargreining: `.agent-notes/osage-small-tail-rca.md`):
`linux.i386-b29` og `share-b29` (2 mismunir í teikniaðgerðum hvort — x-festing eins leggjamerkimiða
lendir á 878.28 á móti 841.06, sett samhverft um
bita-eins miðpunkt splínunnar 859.67, þ.e. ±hálf breidd merkimiðans; afbrigðin tvö
spegla hvort annað) og `1652` (2 mismunir í teikniaðgerðum — tveir leggir flippa hvor
einni merkimiðafestingu um eins miðpunkt, einn í x og einn í y,
með bita-eins splínum og örvaoddum; véfréttin teiknar fullkomlega,
svo þetta er ekki þekkta tímamarkaflökt innbyggðu útgáfunnar). Í öllum tilvikum
er rúmfræði leggja bita-nákvæm og aðeins hliðarvalsjafntefli merkimiðans leysist
öfugt í nágrenni sem hefur rekið um 1 ULP.

Osage-ferillinn ber þrenndina `polypoly` (`graphs-polypoly`,
`share-polypoly`, `windows-polypoly`; samþykkt 2026-07-11, full rótargreining í
`.agent-notes/patchwork-tail-rca.md`): eina frávikandi aðgerðin er
berfættu torræðu aðgerðin `cos(π+θ)` við hornpunkt með stefnu 180 í brenglaðri ferhyrningi —
`Math.cos` í V8 er rétt námundað meðan `cos` í Apple libm ber
±1 ULP villu sem er háð færibreytu (svo aðeins undir libm er `|cos(π+θ)| ≠
|cos(θ)|`); 1 ULP munur á hnútastærð fer í `GRID`/`ceil` í pack, veltir
jafntefli um ummál, og qsort setur tvo hluta í pökkunarreiti hvors annars —
stíf skipti á heilum hnútum án lögunar- eða leiðingarvillu. Engin
ákvarðandi umritun getur endurskapað torræða aðgerð í libm sem er ekki rétt námunduð,
sem er skólabókardæmi um A9-lögun.

Sama verkun var staðfest 2026-07-28 á stærra systurskjalinu
`tree-graphs-directed-polypoly` (`graphs/directed/polypoly.gv`, nýtt í
905 atriða heildinni; 112 mismunir í teikniaðgerðum, aðeins osage). Frávikandi aðgerðin
er sami 1-ULP-staðurinn `cos(π+θ)` fyrir hnút `9004` — gildin `bb.x` hjá C og
yfirfærslunni passa við upprunalegu rótargreininguna bæti fyrir bæti — en á þessu 76 hnúta inntaki
fer útbreiðslan í gegnum `arrayRects` í osage í staðinn: `acmpf` raðar pökkunarreitum
eftir hráu summunni `width+height`, og 1 ULP of há breidd í libm lætur
`9004` raðast strangt á undan snúnu systkinunum `9000/9002/9006` meðan
rétt-námundað gildi V8 skilur eftir nákvæmt 4-hliða jafntefli sem óstöðugt
qsort raðar á annan hátt — ólíkir raðbundnir reitir, skipti á `9002`/`9006`,
og `fmax`-foss á dálkbreidd sem færir 8 nágranna í x.
Að mata `arrayRects` yfirfærslunnar á hnútastærðum C á móti hnútastærðum yfirfærslunnar
endurskapar 10 færðu hnúta könnunarinnar með bita-samsvarandi x-mismun,
sem lokar orsakakeðjunni.

Tvö vélaferilstilvik til viðbótar voru rótargreind og samþykkt 2026-07-11
(full rótargreining: `.agent-notes/circo-edge-tail-rca.md`): twopi `241_0` (6 mismunir í
teikniaðgerðum — systkini circo-færslunnar hér að ofan: sama CDT-innhringsjafntefli á einum hring,
flippað af libm `sin`/`cos` með 1 ULP, lætur
fjölsplínugang yfirfærslunnar takast með 14 punkta splínu þar sem innbyggða smíðin
hverfur aftur í einfalda 8 punkta leiðingu; punktamunur < 0.07pt) og circo
`windows-tree` (10 mismunir í teikniaðgerðum á einum blævængarlegg — staðsetningarhornaföll circo
lenda `node2.y` einum ULP ofan við `node8.y` í kringum nákvæmlega samhverfa
gildið 18.0, og val dyna-höfuðhafnar í `closestSide` flippar TOP/BOTTOM við
það nákvæma jafntefli; hnútastöður og kassar eru að öðru leyti bita-eins og hjá
véfréttinni).

**xdot-vélaferill sfdp — FP-jafntefli á leggjum (`42`, `241_0`).** <a id="a9-sfdp-fp-ties"></a> xdot-vélaferill sfdp (`parity-sfdp.json`,
innbyggt `dot -Ksfdp -Txdot`, ±0.5) afhjúpar CDT-innhringsjafntefli á einum hring um leið og
nákvæmum innbyggðum stöðum fyrir leiðingu er sprautað inn (svo fráviksorsökin er EKKI
ítrekandi rek — sjá A1-drift-flokkinn — heldur stakrænt jafntefli í forsendu):

- `42` og `241_0` — CDT-innhringsjafntefli á einum hring (fjölsplínugangurinn).
  Með innsprautuðum stöðum er afgangurinn **flipp á fjölda hluta**: `42`
  `opCount 5 vs 9` (leggur 0->3) / `ptCount 32 vs 26` (3->7); `241_0` `ptCount 14
  vs 8` (leggur 3->2) — hornalína þvingaðrar Delaunay-þríhyrningunar í yfirfærslunni flippar á móti
  véfréttinni, svo fjölsplínugangurinn tekst með N punkta splínu þar sem
  innbyggða smíðin hverfur aftur í styttri einfalda leið (eða öfugt), nákvæmlega eins og
  twopi/circo-færslan `241_0` hér að ofan. Yfirfærslan hermir þegar eftir arm64-
  `fmadd`-sameiningunni í innhrings-/`ccw`-forsendunni (`src/pathplan/triang.ts`,
  `src/common/fma.ts`) og notar öfluga Delaunay-innhringsprófun; afgangurinn er
  1 ULP í `sin`/`hypot` (V8 á móti Apple libm) í inntaki forsendunnar sem enginn flytjanlegur
  kóði endurskapar.

> **`2095` endurflokkað úr A9 í A1-drift (2026-07-22).** Það var áður skráð
> hér sem „hypot-systkinið“ (rek undir 0.7pt á leggjum hnúts með tómt heiti
> `""->"4"`). Sá afgangur var **gripur í prófunarumgjörð**: regluleg segð `GVTS_POS` í
> innsprautara rekjunnar krafðist ≥1 stafs í heiti, svo hnúturinn með heitið `""` var aldrei
> innsprautaður og dró með sér leggina tvo sem að honum liggja. Eftir að innsprautarinn var lagaður til að passa við tóm
> heiti (`(.+)`→`(.*)`, `src/layout/neato/splines.ts`) innsprautast sfdp `2095`
> í **0 afgang** — hreint kraftarek, fellur undir reiknaða A1-drift-
> flokkinn, ekki FP-jafntefli í leiðingu. Samþykki þess fyrir einstakt auðkenni var fjarlægt úr
> `accepted-divergences-engines.json`. (Sama niðurstaða og fyrir fdp `2095` hér á eftir.)

**Ný stýrð tilraun (2026-07-21).** Samanburðarprófun á `hypot` í innbyggðu á móti V8
(`plans/sfdp-tracked-divergences/batch-2/hypot-ulp-probe.txt`): með því að þýða
`hypot` úr C-kerfissafni og bera saman við `Math.hypot` í Node á dæmigerðu
frávikainntaki fyrir lárétta leggi kemur fram 1 ULP ósamkomulag í 2 af 6 (Δ 7.1e-15 og
5.7e-14) — klofningsþröskuldshnífseggin sem flippar fjölda undirskiptinga.
Óhjákvæmilegt: ekkert flytjanlegt hypot endurskapar Apple libm (fordæmi
`arm-pow.ts` fyrir sömu mörk). Samþykkt á vélaferlisstigi með
`accepted-divergences-engines.json` (`sfdp.42`, `sfdp.241_0`).

**fdp**-xdot-vélaferillinn (`parity-fdp.json`, innbyggt `dot -Kfdp -Txdot`,
±0.5) afhjúpar SAMA CDT-jafntefli á einum hring á sama grafi, `241_0`: með
nákvæmum stöðum véfréttarinnar fyrir leiðingu innsprautuðum er afgangurinn 11 tölulegir
`unfilled_bezier`-mismunir bundnir við einn legg (`0->1#0`, maxΔ 3.39pt). Þar sem
hnútastöður eru innsprautaðar-eins er fráviksorsökin niðurstreymis í
fjölsplínugangi pathplan — sama libm-1-ULP-innhringsjafntefli og í
twopi/circo/sfdp `241_0` (nákvæm hlutfallstölu-innhringur 185/185 hér að ofan). Tökin eru
þegar beitt (`src/pathplan/triang.ts` fmadd, `src/pathplan/route.ts:198`
`Math.hypot`); jafnteflið er óhjákvæmilegt. Samþykkt með `accepted-divergences-engines.json`
`fdp.241_0`. `2095` í fdp er hins vegar **A1-drift, ekki A9**: að innsprauta
eina hnútinn með tómt heiti (eftir að rekjuinnsprautarinn var lagaður til að passa við
hnúta með heitið `""`) fellir afganginn niður í núll — fyrri „A9-halinn“ var
óinnsprautaði hnúturinn með tómt heiti sem dró leggi sína með sér. Samþykki sfdp `2095` var
sama blindsvæðið — ný endurgerð rekju fyrir sfdp (2026-07-22) með lagaða
innsprautaranum staðfesti að það innsprautast einnig í 0, og samþykki þess var fjarlægt (sjá
athugasemdina um `2095` endurflokkað hér að ofan).

---

## Rakinn langur hali (eigindir og jaðartilvik í `dot`) {#tracked-long-tail-dot-attribute-edge-case}

Við **sjálfgefin gildi** passar `dot`-vélin við C-keyrsluskrána innan þröngra ákvarðandi
vikmarka á golden-safninu (dómurinn `conformant`; sjá athugasemdina efst).
Það sem eftir stendur er **langi halinn af eigindum og
jaðartilvikum** — sögulega erfiði hluti hverrar Graphviz-yfirfærslu. Ólíkt
samþykktu fráviki hér að ofan *verða* þessi lokuð; þau eru rakin lifandi, með
talningum, í
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md):

| Flokkur | Hvað er ólíkt |
|---|---|
| **path-structure** | Splínuleiðing leggja í tilteknum stillingum (t.d. sum tilvik með láréttum leggjum og þéttum göngum). |
| **element-count** | Eiginleiki sem gefur út fleiri/færri SVG-frumefni en C í tilteknum grafum. |
| **color-stroke** | Munur á útgáfu útlínu/fyllingar fyrir tilteknar stíleigindir. |
| **parser-gap** | Fáein DOT-inntök sem þáttarinn tekur ekki enn að fullu við. |

Ef grafið þitt notar aðeins algengar eigindir og `dot`-vélina ertu nær örugglega
á leið samsvörunar innan ákvarðandi vikmarka. Ef uppsetning lítur rangt út skaltu athuga `PARITY-dot.md` fyrir
þann inntaksflokk — líklega er það rakin færsla með lagfæringarverkefni sem er fest við véfréttina,
ekki óþekkt.

> **Athugasemd um textadrifin tilvik.** Flokkur textamælingar (A2) er lokaður —
> ekkert `dot`-graf er lengur samþykkt undir honum. Graf sem situr á
> structural-match í dag er rakin eyða, ekki munur á leturmælikvörðum.

### Örvaoddar gagnstæðra leggja við `concentrate=true` {#concentrate-true-opposing-edge-arrowheads}

Þegar `concentrate=true` sameinar andsamsíða par (`A->B; B->A`) í einn
eftirlifandi legg verður sá leggur að teikna örvarodd á **báðum** endum. Þetta er nú
yfirfært (greinin `conc_opp_flag` í `arrow_flags`; sjá
`src/common/splines-clip.ts:arrowFlags`), svo `graphs-b135`, `167` og `2087`
passa (`element-count`-fráviki vegna örvarodds sem vantaði og aukaáhrif þess á óklippta splínu,
`@d`, eru bæði horfin).

Sum concentrate-graf **halda sérstökum, fyrri afgangi** sem lagfæringin á
örvaroddum tekur **ekki** á — það er munur á **x-hnitum** hnúta
(x-netsímplex / áttavitahöfn), ekki galli í örvaroddum:

- **`graphs-b15`, `graphs-b69`** — stóru record-/klasa-„lyftu“-grafin.
  Concentrate virkjast og sameinar rétt; afgangurinn er ~1pt munur á x hnúta
  sem magnast upp í mun á `element-count`/splínu `@d`. Útgáfa örvaroddanna
  sjálf er nú rétt (b69 fær örvaroddamarghyrningana sem vantaði). Sjá
  athugasemd umboðsmanns `b69-concentrate-undermerge` fyrir rót x-hnitanna.
- **`1453`** — víkur enn vegna `element-count`-orsakar á efsta stigi sem er óskyld
  örvaroddinum í conc_opp_flag.
- **`2825`** — þegar þessi lagfæring á örvaroddum var gerð vék það vegna `element-count`-orsakar á efsta stigi
  óskyldrar conc_opp_flag (engin sameining andstæðra para
  er kveikt þar); síðan lokað með verkefninu fix-2825-rebuild-vlists,
  sjá A4 hér að ofan.

Þetta eru rakin x-hnita-/byggingaratriði, **ekki** gallar í örvaroddum.

### Eyður í uppsetningartrúnaði úr trúnaðarverkefni 2.0 (neato, sfdp, fdp, twopi, circo) {#layout-fidelity-gaps-from-the-2-0-fidelity-mission-neato-sfdp-fdp-twopi-circo}

Trúnaðarverkefni 2.0 lét óyfirfærð eigindagildi mistakast hátt (sjá töfluna
`UNSUPPORTED_FEATURE` í
[Villur og undantekningar](https://github.com/knowvah/dot-engine/blob/main/docs-site/guide/errors.md)).
Það skildi eftir eftirfarandi, skráð í `plans/v2-fidelity/decision-journal.md`.

**Hátt, óyfirfært.** `overlap=voronoi` með skarandi hnúta kastar enn
`UNSUPPORTED_FEATURE` í neato, twopi, circo og sfdp: Voronoi-aðlagarinn
sjálfur (reiknirit `vAdjust`) er ekki yfirfærður. Skörunarprófið sem ákveður
hvort kastað er er eigið próf C (`countOverlap` yfir `poly.c`-hnútamarghyrninga).

**Þekktar eyður, enn hljóðar.** Yfirfærslan teiknar þetta án villu og
er ólík innbyggðu Graphviz. Fundið af verkefninu `v2-silent-gaps`
(`plans/v2-silent-gaps/decision-journal.md`); ekki samþykkt frávik.

- **Viðvörunin „Unrecognized overlap value“ frá `getAdjustMode` er ekki gefin út.**
- **Hornpunktar snúinna marghyrninga geta verið ólíkir innbyggðu í síðustu bitum
  (óhjákvæmilegt: stærðfræðisafn hýsilsins).** `poly_init` stefnir hvern hornpunkt með
  `atan2`, `hypot`, `sin` og `cos`. Með bita-eins inntaki skila libm á macOS og
  V8 ólíkum síðustu bitum (t.d. `atan2(0x3fd6a09e667f3bce,
  0xbfd6a09e667f3bca)`: libm `…21d1`, V8 `…21d2`; `hypot` við næsta hornpunkt:
  libm `…fffd`, V8 `…fffe`), svo kassi með `orientation=20` fær hornpunkts-y
  `-18` í yfirfærslunni og `-17.999999999999996` í innbyggðu. Innbyggt Graphviz sjálft
  er breytilegt eftir libm á kerfinu, og vafri getur ekki kallað í það. Eigin
  reikningur yfirfærslunnar passar við C (röð `RADIANS` fest; 776 af 1664 sýnatökum á hornpunktahnitum
  eru bita-eins, hin eru ólík eingöngu vegna libm). Áhrif:
  `polyOverlap`-dómar um nákvæma snertingu geta flippað; með innbyggðum hornpunktum passar hver
  dómur.
- **sfdp getur verið ólíkt innbyggðu á macOS (óhjákvæmilegt: `pow` í libm hýsilsins).**
  Greint með tækjavæddu innbyggðu sfdp: stöður haldast bita-eins
  þar til einn fráhrindikraftsliður, `pow(dist, 1 - p)` (`spring_electrical.c`,
  `p = -1` svo `pow(x, 2)`), skilar 1 ulp minna en `x*x` úr libm á macOS
  (`pow(1.4116727416983157, 2)`: libm `1.9928199296540394`, rétt námundað
  `…396`; `pow(v, 2) != v*v` á macOS fyrir 20 af 16201 sýnatökugildum `v`). Það breytir
  `Fnorm` ítrunarinnar í síðasta bita; aðlögunarkæling sfdp magnar það
  upp í ólíka (oft speglaða) uppsetningu. `armPow` í yfirfærslunni er `pow` úr
  optimized-routines hjá ARM (glibc ≥ 2.28), þ.e. það sem Graphviz á Linux reiknar;
  macOS-véfréttin er sú sem sker sig úr. Útilokað: sáning (skýr gildi `start=`
  passa), `pcp_rotate` (sama inntak gefur sama úttak), stöður og
  aðdráttarliðurinn (bita-eins). Dæmi: stakur þríhyrningur `a--b; a--c; b--c`
  við sjálfgefið sáðgildi.
- **fdp getur verið ólíkt innbyggðu vegna `cos`/`sin` í libm hýsilsins.** fdp fylgir
  Graphviz eftir 15.0.0 (fráhrinding með hypot-fjarlægð, `Mlimit`), með `hypot`
  í libm hýsilsins endurskapað bita fyrir bita (`src/common/libm-hypot.ts`, 0
  frávik á 400 þúsund sýnum). 251 af 252 golden-inntökum sem fdp getur teiknað
  passa nákvæmlega við innbyggðu smíðina; hið eina sem eftir er
  (`parallel-cluster-ldbxtried`) setur klasahafnarhnúta með
  `T_Wd * cos(alpha)`, og `cos(-2.3840764867756761)` í libm á macOS er 1 ulp frá
  `Math.cos` í V8; kraftalykkja fdp magnar það upp í um 3 tommur. `cos` frá Apple
  er ekki endurskapanlegt úr stuttu líkani eins og `hypot` er.
- **Innbyggð hrun sem yfirfærslan skilgreinir.** Innbyggt Graphviz hættir með 139 á neato
  `mode=KK` með `model=mds` og legg með `len` (`mds_model` vísar í `GD_dist`
  með raðnúmeri sem byrjar á 1: yfirflæði á hrúgu), og á `model=circuit` með
  ótengt graf. Yfirfærslan sleppir hólfum utan marka í fyrra tilvikinu og
  hverfur aftur í stystu slóðir í því síðara; ekkert innbyggt úttak er til að
  bera saman við.

---

## Viljandi ekki yfirfært (utan markmiða) {#intentionally-not-ported-non-goals}

Þetta eru viljandi mörk umfangs, ekki gallar. Safnið miðar við **SVG**
(auk millitextasniðanna `json` / `xdot` / `dot` / imagemap).

- **Önnur úttakssnið.** Punktamyndir (PNG/JPG/GIF/WebP/BMP), PostScript/PDF/EPS
  og myndræn/gagnvirk bakendi eru utan umfangs. Notaðu SVG-úttakið
  og umbreyttu síðar ef þú þarft punktamynd.
- **`page=`-síðuskipting fyrir SVG.** Innbyggt `dot` síðuskiptir SVG heldur ekki (SVG-
  tækið setur engan síðuskiptingarfána), svo `page=` gerir ekkert á þessari leið í báðum
  útfærslum — skjalfest hér aðeins vegna þess að það er algengur
  ruglingspunktur.
- **`-Tplain`-textaúttak.** Frestað (trútt textasnið), ekki
  undanskilið.
- **`gvpr`** (forskriftarmálið til graf-vinnslu) — utan umfangs.
- **C++-þægindaumbúðir** (`cgraph++`, `gvc++`) — C-API er yfirfært
  fyrst; hefðbundið TypeScript-þægindalag, ef óskað er, yrði
  sérstakur pakki.
- **`fontnames=svg|ps` í textamælingu í vafra.** Í vafra byggir
  canvas-mælirinn letur sitt úr fjölskyldulistanum `fontnames=native` fyrir
  PostScript-aliasið (`Times-Roman` → `Times, serif`), sama
  letur og SVG-útgefandinn teiknar sjálfgefið. `TextMeasurer` ber ekkert
  grafssamhengi, svo graf sem setja `fontnames=svg` eða `fontnames=ps` eru mæld
  gegn innbyggða listanum meðan SVG nefnir svg/ps-fjölskylduna. Aliasþyngdir
  sem CSS skilgreinir ekki (`book`, `demi`, `light`, `medium`, `roman`)
  eru gefnar út orðrétt, eins og í C; vafrar hunsa þær og teikna venjulega
  þyngd, og mælirinn mælir venjulega þyngd til að passa. Node-úttak
  verður ekki fyrir áhrifum (það notar aldrei canvas-mælinn).
- **Vélrænt eingöngu innbyggt** skipt út fyrir vafraörugg jafngildi: kvikt
  íbótahlaðning (`dlopen`) er skipt út fyrir kyrrstæða skráningu véla/teiknara;
  skráakerfislestri (letur, myndir, stillingar) er skipt út fyrir
  endurkall frá kallanda (t.d. `setImageSizer`). Hegðun varðveitist; vélrænan er ólík.

---

## Að tilkynna frávik {#reporting-a-divergence}

Ef þú finnur úttak sem er ólíkt C og er **ekki** samþykkt frávik hér að ofan,
ekki í `PARITY-dot.md` og ekki utan markmiða, er það galli sem vert er að tilkynna — C-
frumkóðinn er skilgreiningin og ólistað frávik eru meðhöndluð sem gallar, ekki sem
samþykkt hegðun.
