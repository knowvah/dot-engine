---
sourceHash: 9c653332a94ce7180323ec7cd584987db329e4217af01dd06692e410c0c22a8c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Samræmi: hvað „samsvörun“ þýðir {#conformance-what-match-means}

@knowvah/dot-engine er sannreynt gegn upprunalegu C-keyrsluskránni fyrir Graphviz sem véfrétt.
Þegar þetta verkefni segir að graf **samsvari** C — jöfnuðardómurinn sem
heitir `conformant` — þá er átt við tiltekinn eiginleika sem er sannprófaður með vélrænum
hætti, **ekki** bókstaflegt bæti-fyrir-bæti jafngildi SVG-textans.

> **Skilgreining.** Teikning úr yfirfærslunni er **samræmd** teikningu véfréttarinnar þegar,
> eftir að báðar SVG-skrárnar hafa verið þáttaðar í staðlað frumefnatré:
>
> 1. hvert **tölugildi** (hnit, ferilgögn, `points`, `viewBox`,
>    `transform`-stikar) er innan fastra **vikmarka** frá véfréttinni, og
> 2. hvert **gildi sem er ekki tala** (heiti merkja, litir, textainnihald,
>    eigindalyklar, upptalin eigindagildi) er **nákvæmlega eins**.
>
> Ef eitthvert tölugildi fer yfir vikmörkin, eða eitthvert gildi sem er ekki tala
> er ólíkt, er teikningin **ekki** samræmd.

## Hvers vegna ekki bókstaflega bæti? {#why-not-literal-bytes}

SVG ritar kommutöluhnit sem tugatexta. Tvær teikningar sem eru stærðfræðilega
jafngildar geta samt verið ólíkar í síðasta prentaða tölustafnum vegna
IEEE-754-námundunar, röðunar kommutöluaðgerða og hegðunar `libm`/FMA
á tilteknum kerfum, sem er breytileg eftir örgjörva og JS-vél. Bókstafleg
bætakrafa væri því **óprófanleg** á þeim keyrsluumhverfum sem þetta safn miðar við (vafrar,
Node, ólíkir örgjörvar) fremur en einungis ströng. Samræmið festir eiginleikann
sem skiptir raunverulega máli — rúmfræðina og efnið sem áhorfandi sér — við mörk
sem eru nógu lág til að vera ósýnileg.

## Nákvæm vikmörk {#the-exact-tolerance}

Vikmörkin eru **fyrir hvern vélaflokk** og eru skilgreind í
[`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts):

| Flokkur | Vikmörk (pt) | Vélar |
|---|---:|---|
| `deterministic` | **±0.01** | `dot`, `circo`, `twopi`, `osage`, `patchwork` |
| `iterative` | **±0.5** | `neato`, `fdp`, `sfdp` |

Ákvarðandi vélarnar endurskapa heiltölu- og prentuð hnit C nánast
upp á punkt, þannig að ±0.01 tekur aðeins við suði í tugasniði. Ítrekandi
(kraftstýrðu) vélarnar byggjast á torræðum föllum þar sem
niðurstöður í síðasta bita eru ekki endurtakanlegar milli kerfa, svo þær fá rýmri
mörk og eru að auki prófaðar með tilliti til **byggingarlegs** jafnræðis (sama
frumefnatré).

Eitt atriði til viðvörunar varðandi yfirborðið **plain/plain-ext**: plain prentar hnit í tommum
með 5 markverðum stöfum (`%.5g`), þannig að við stærðargráðu ≥ 100 er prentskammturinn
(0.01) jafn vikmörkunum ±0.01. Í mjög stórum grafum prentast munur á uppsetningu
undir einum ULP, sem lendir tilviljunarkennt yfir námundunarmörk 5. stafs, sem fullt
0.01-skref og er flaggaður, jafnvel þótt rúmfræðin undir sé eins upp á ~1e-11 pt
(sjá samþykkt circo `2108`, dagbók 2026-07-28). Yfirborðin
xdot/json, sem prenta í punktum, eru í því tilviki hinn ráðandi
samanburður á rúmfræði.

**Jöfnuðarkönnun safnsins** metur hvert graf í ham `deterministic`
(±0.01) án tillits til vélar — sjá
[`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
(`diffVerdict` → `compareSvg(port, oracle, 'deterministic')`).

## Lestu kóðann {#read-the-code}

Skilgreiningin hér að ofan er ekki orðagjálfur — hún er nákvæmlega það sem samanburðarkóðinn
gerir. Svona geturðu sannreynt það sjálf(ur):

- [`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts)
  — `TOLERANCES` (taflan ±0.01 / ±0.5) og `compareSvg`, sem gengur um trén tvö
  eftir stöðlun og beitir reglu (1) tölugildi-innan-vikmarka og
  reglu (2) ekki-tala-nákvæmlega-eins eigind fyrir eigind.
- [`test/golden/normalize.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/normalize.ts)
  — hvernig hrátt SVG er þáttað í samanburðarhæfa frumefnatréð.
- [`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
  — `diffVerdict`, sem úthlutar einum af dómunum hér á eftir. `survey.ts` nær aðeins
  yfir SVG-ferilinn fyrir `dot`.
- [`test/corpus/engine-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/engine-walk.ts)
  — **xdot**-könnunin fyrir hverja vél (`npx tsx test/corpus/engine-walk.ts <engine>`),
  sem beitir sömu flokkaskiptingu og taflan hér að ofan
  (`TOLERANCE = 0.5` fyrir `neato`/`fdp`/`sfdp`, `0.01` fyrir allar aðrar vélar)
  og ber saman merkingarbærar runur teikniaðgerða (`compareXdot`) í stað SVG. Þannig
  eru ferlarnir fyrir `circo`/`twopi`/`osage`/`patchwork`/`neato`/`fdp`/`sfdp`
  mældir; sérstakur xdot-ferill `dot` notar systurverkfærið
  [`xdot-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/xdot-walk.ts).

## Dómarnir {#the-verdicts}

Könnunin úthlutar hverju grafi nákvæmlega einum dómi. Núverandi talningar fyrir hvern feril:
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)
tekur saman hvern feril vélar × yfirborðs (bæði ákvarðandi og ítrekandi);
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
er SVG-mælaborðið fyrir `dot`, og hver önnur vél hefur sitt eigið
mælaborð `PARITY-<engine>.md` við hliðina í `test/corpus/`:

| Dómur | Merking |
|---|---|
| **`conformant`** | Samsvarar véfréttinni samkvæmt skilgreiningunni hér að ofan (tölugildi innan vikmarka, annað nákvæmlega eins). |
| **`structural-match`** | Sama frumefnatré, en eitt eða fleiri tölugildi fara yfir vikmörkin. |
| **`diverged`** | Frumefnatrén eru ólík (frumefni vantar eða er umfram, eða gildi sem er ekki tala er ólíkt). |
| **`errored` / `timeout`** | Yfirfærslan gat ekki teiknað inntakið (`errored`; `port-error` á ferlum einstakra véla) eða fór fram yfir tímaramma sinn (`timeout`). Metið sem bilun: telst með í nefnara árangurshlutfallsins, aldrei sem árangur. |
| **`oracle-error`** | C-véfréttin gat ekki teiknað inntakið, svo það er engin viðmiðun til að bera saman við. Utan umfangs: undanskilið nefnara árangurshlutfallsins. |

**Árangurshlutfall** á hverju mælaborði er `conformant / (surveyed − oracle-error)`.

„Conformant“ er viðmiðið; „structural-match“ er marktækur árangur (rétt lögun,
hnit enn á reiki); „diverged“, „errored“ og „timeout“ eru raunverulegar eyður.
Ekkert af þessu er fullyrðing um bæti-fyrir-bæti jafna úttekt.

Sum graf bera **engan dóm** á tiltekinni vél: sjá
*undanþágur véla* hér á eftir.

### Undanþágur véla {#engine-exclusions}

Undanþegið par (graf, vél) er ekki gengið í gegn, og er því hvorki samræmt
né frávikandi — það er einfaldlega ekki mælt þar. Það er annað en
samþykkt frávik, þar sem samanburðurinn *fór fram* og munurinn er fyrirgefinn
með skjalfestri orsök.

Þröskuldurinn er viljandi hár, því óskoðað graf er gat í umfangi
fremur en þekktur kostnaður. Færsla krefst allra þriggja skilyrða: reiknirit
vélarinnar getur sannanlega ekki tekið á inntakinu, að sleppa því sparar raunverulegan tíma, og
sama hegðun er staðfest á ódýrari ferli. Að vera *hæg* er beinlínis ekki
nóg — slæmt hlutfall yfirfærslu og véfréttar er einmitt það sem raunverulegur
afkastagalli lítur út eins og, og undanþága vegna þess myndi fela einmitt það sem
safnið er til fyrir.

Hver undanþága er skráð með verkun sinni í
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md#engine-exclusions);
skráin er `test/corpus/engine-exclusions.json`. Hvatamálið er
`2222`, sem lýsir 28.303 hnútum og engum leggjum: þar sem ekkert er til að tengja saman,
framselja allar kraftstýrðu og geislalaga vélarnar til sameiginlega
íhlutapakkarans og ekkert af þeirra eigin reikniritum keyrir — staðfest með því að
úttök véfréttarinnar þeirra eru bæta-eins. `dot` fer aðra leið og nær því samræmt á
sex sekúndum.
