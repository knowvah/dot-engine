---
sourceHash: 292491e2ebc9280dc60b10bc0e3f5bd75e3bf355f8e732d90f86b8fa35a07f40
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Teadaolevad erinevused C Graphvizist {#known-divergences-from-c-graphviz}

@knowvah/dot-engine püüab saavutada võimalikult suure ustavuse kanoonilise C
teostuse suhtes. C lähtekood on spetsifikatsioon; loetlemata erinevust
käsitletakse veana, mitte aktsepteeritud käitumisena.

> **Mida „vaste“ siin tähendab.** Korpuse paarsushinnang nimega `conformant`
> on **range deterministlik tolerants**, *mitte* sõna-sõnaline bait-baidilt
> SVG võrdsus: arvulised koordinaadid ja teed peavad ühtima **±0.01** piires ning kogu
> mittearvuline sisu (sildid, värvid, tekst) peab olema täpselt võrdne
> (`compareSvg(…, 'deterministic')`). Selles dokumendis viitavad „vaste“ ja
> „vastav“ sellele tolerantsihinnangule. Täielik definitsioon:
> [Vastavus](./conformance.md).

Kui väljund *erineb*, kuulub see täpselt ühte kolmest klassist:

1. **Aktsepteeritud deltad** — erinevused, mida oleme uurinud, mõistame algpõhjuseni
   ja oleme **teadlikult otsustanud mitte vastavaks muuta**. Igaüks on piiratud,
   iseloomustatud ja allpool põhjendatud. Need ei ole vead ning neid ei
   „parandata“ ilma konkreetse, eraldi piiritletud põhjuseta.
2. **Jälgitav pikk saba** — teadaolevad lüngad, mis *suletakse*, igaühel
   oraaklile kinnitatud parandus. Need asuvad jooksvate arvudega failis
   [`test/corpus/PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md).
3. **Mitte-eesmärgid** — tahtlikud ulatuse piirid (vormingud ja mehhanismid, mida me
   kunagi ei kavatsenud reprodutseerida).

Autoriteetsed, pidevalt uuendatavad kirjed on
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
(sisendipõhine paarsuse töölaud vs natiivne `dot`) ja
[`plans/port-catalog/README.md`](https://github.com/knowvah/dot-engine/blob/main/plans/port-catalog/README.md)
(algoritmitaseme pordi olekuinventuur).

Masinloetav tõeallikas selle kohta, millised graafid on *aktsepteeritud* (allolev klass 1), on
[`test/corpus/accepted-divergences.json`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/accepted-divergences.json).
Tööriistad ühendavad selle aruande koostamisel: `PARITY-dot.md` eraldab **aktsepteeritud deltad**
**jälgitavast** mahajäämusest ning reeglite värav võtab sellest oma lubatud loendi. Allolevad
proosajaotised selgitavad iga kirjet (A1 ja A3 on elusad; A2 on suletud ja
säilitatud ajaloona); CI-test (`accepted-divergences.test.ts`) tagab, et
iga aktsepteeritud graaf ikka erineb, nii et see loend ei saa vaikselt vananeda.

---

## Aktsepteeritud deltad (me ei muuda neid teadlikult vastavaks) {#accepted-deltas-we-deliberately-do-not-make-conformant}

Aktsepteerime delta — selle asemel, et taga ajada bait-baidilt paarsust — ainult siis, kui **kõik**
järgnevad tingimused kehtivad:

- Algpõhjus on **portatiivsuspiirang** (midagi, mida JavaScripti/
  brauseri käitusaeg ei suuda täpselt reprodutseerida), mitte loogikaviga pordis.
- Erinevus on **tajumatu** ja tõestatavalt **piiratud**.
- Parandusel oleks tasuga võrreldes **ebaproportsionaalne maksumus ja mõjuulatus**
  (tavaliselt: see puudutaks jagatud primitiivi, mida kasutavad sajad
  juba vastavad graafid, riskides regressioonidega murdosa piksli
  võidu nimel).

Kui delta aktsepteerime, iseloomustame seda siin, et tarbijaid ei tabaks üllatus.
Aktsepteeritud deltaga mõjutatud graafe valideeritakse **struktuuri- /
tolerantsilati** vastu, mitte baidilati vastu.

### A1. Ujukoma determinism (jõupõhised mootorid) {#a1-floating-point-determinism-force-directed-engines}

**Mõjutatud:** `neato`, `fdp`, `sfdp`, `circo`, `twopi`, `osage` (iteratiivsed,
vedrumudeliga mootorid). `dot` mootori *paigutust* see iteratiivse mudeli
determinism **ei** mõjuta; eraldi, kitsalt piiratud `dot` splaini marsruutimise
ujukomadelta on käsitletud allpool jaotises **A3**.

> **Ulatus, ajalooliselt mõõtmata reservatsioon — nüüd osaliselt mõõdetud.**
> **Põhiline dot-mootori SVG-uuring** (`test/corpus/survey.ts`) on endiselt
> **ainult dot**: natiivne oraakel töötab keskkonnas `GVBINDIR=/tmp/ghl`, mis
> lingib sümboolselt **ainult** `core` + `dot_layout` pluginad
> (`test/corpus/gen-headless-gvbindir.sh` käib läbi täpselt `core dot_layout`
> — ühtegi `neato`/`fdp`/`circo`/`twopi`/`osage`/`sfdp` paigutuspluginat ei ole),
> ning nii oraaklit kui ka porti kutsutakse `dot` mootoriga. Seega korpuse id-d
> nagu `*_neato` / `*_circo` / `root_twopi` on selles uuringus *failinimed*, mis on paigutatud
> `dot`-iga, mitte nende natiivse mootoriga, ja A1 sobib seal **nulli**
> graafiga — mitte sellepärast, et mootorid oleks tõestatult vastavad, vaid sellepärast, et
> see konkreetne uuring neid kunagi ei koorma.
>
> **Kuid nüüd on kõigil kuuel A1 mootoril oma natiivse mootori uuring**, failide
> `test/corpus/engine-walk.ts` + `parity-report.ts` kaudu (`GVBINDIR`-st sõltumatu —
> kumbki käivitab otse `dot -K <engine> -Txdot`), kahel erineval rangusastmel,
> mida on allpool eraldi dokumenteeritud: `circo`/`twopi`/`osage` töötavad sama
> **±0.01 deterministliku** tolerantsiga nagu dot-uuring koos id-põhise
> algpõhjuse sorteerimisega („Mootoriraja aktsepteerimine“ allpool); `neato`/`fdp`/`sfdp` töötavad
> lõdvema **±0.5 iseloomustus**-tolerantsiga, kuni id-põhise sorteerimiseta
> („Iteratiivsete mootorite iseloomustus“ allpool). Praegused mootoriteülesed arvud:
> [`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md).

**Iseloomustus.** Need mootorid käivitavad iteratiivseid numbrilisi paigutusi, mille tulemused
sõltuvad ujukoma ümardamisest — täpsemalt liit-korrutamis-liitmisest (FMA) ja
`Math.pow`-ist, mis võivad JavaScripti mootorite ja protsessoriarhitektuuride lõikes erineda.
Port järgib C tehete järjekorda, kus saab (`src/common/fma.ts`,
`src/common/arm-pow.ts`) — nt `sfdp` kinnistub ~6 olulise numbrini natiivse
oraakli suhtes sobitatud PRNG-ga ja `fma`-ga —, kuid täpne, identsete koordinaatidega
reprodutseerimine **ei ole platvormideüleselt garanteeritud**. Topoloogia säilib; võimalik
erinevus on sõlmede peenkoordinaatides.

**Miks aktsepteeritud.** See on JS-is töötamise kõva piirang, mitte disainivalik
— sama perekond mis A3 Apple-`hypot`-tundlikkus. Pole võimalust garanteerida
bitiliselt identseid transtsendentsete funktsioonide/FMA tulemusi kõigis sihtkäitusaegades, seega
baidilatt oleks testimatu, mitte pelgalt kallis. **A1 hindamine** (vastandina
pelgalt reservatsioonile) nõudis eraldi natiivse mootori paarsusrada — ehitatud
2026-07-11 kui `test/corpus/engine-walk.ts` + `parity-report.ts`, uurides iga
sisendit selle enda mootoriga `dot`-i asemel. Selle töö aus lagi on
A1 **kitsendamine** tasemele „aktiivset erinevust pole võrdlusplatvormil“, mitte kunagi
platvormideülese reservatsiooni kõrvaldamine; senised tulemused (allpool) jäävad sellesse
lakke: `circo`/`twopi`/`osage` on igaüks toonud päevavalgele ja algpõhjuseni
jälitanud käputäie tõelisi A1/A9 eksemplare, ja `neato`/`fdp`/`sfdp` on nüüd tasemel 90.8/77.5/68.0%
natiivsest 0.5pt piires 910-kirjelise universumi ulatuses, mis tähendab, et portitud
aritmeetika (`fma.ts`, `arm-pow.ts`, sobitatud PRNG) peab enamiku graafide puhul vastu —
ning iga järelejäänud lahknev id on eraldi omistatud süstimise teel (lahendaja
triiv vs pordi viga), mitte jäetud sorteerimata triiviks; vt
iteratiivsete mootorite iseloomustust allpool.

**Mootoriraja aktsepteerimine: twopi nooltepere.** <a id="a1-twopi-arrows-family"></a>
Ülaltoodud tsitaat kirjeldab dot-mootori SVG-uuringut, kus A1 sobib nulli
graafiga; eraldi `twopi` **xdot-mootorirada** (`parity-twopi.json`, natiivne
`dot -K twopi -Txdot` oraakel, `test/corpus/engine-walk.ts`) töötab *tõesti*
oma natiivse mootoriga ja toob esile konkreetse, kontrollitud A1 eksemplari 9 korpuse id puhul:
`graphs-arrows`, `graphs-newarrows`, `graphs-arrowsize`, `linux.x86-arrows_dot`,
`macosx-arrows_dot`, `nshare-arrows_dot`, `share-newarrows`, `windows-newarrows`
ja (lisatud 2026-07-28, uus 905-kirjelises universumis) directed/ sõsar
`tree-graphs-directed-oldarrows` — igaüks lahkneb ühel domineerival serval
(`Z->I` või `i->Z`; 12–64 joonistusoperatsiooni erinevust). Süstimise A/B (otsustuspäevik, 2026-07-10 kirje „injection A/B verdicts:
twopi arrows family EXONERATED...“) tõestas mehhanismi otse:
natiivse `spline_edges` sisendi `ND_pos` väljastamine ja selle süstimine
pordi `splineEdgesShifted`-i annab **täiesti vastava** väljundi
failil `graphs-arrows` (`Z->I` muutub oraakliga bait-baidilt identseks, sama 7/14-punktiline
splain) — seega erinevus on 100% marsruutimiseelne sõlmepositsiooni
triiv `twopi` PRISM-i kattuvuse eemaldamise lahendajast ning pordi splaini marsruutimine/väljastus
on süüst vabastatud. Nähtav sümptom 8 id-st 6 puhul on bezier'
punktide arvu ümberlülitus (`unfilled_bezier[ptCount]: 8 vs 14`): `Proutespline`-i
sobitatud lõikude arv on tundlik selle suhtes, millisele poole takistuse piiri
triivinud sõlmepositsioon langeb, nii et PRISM-i iteratiivse lahenduse järgne
ULP-st väiksem positsioonierinevus lülitab sobitatud splaini lõikude arvu ümber (ülejäänud 2 id-d,
`graphs-arrowsize`/`nshare-arrows_dot`, näitavad sama triivi väiksema
ainult positsioonidelta kujul, ilma lõikude arvu ümberlülituseta). Aktsepteeritud mootoriraja
tasemel failiga `test/corpus/accepted-divergences-engines.json`, mille `parity-report.ts`
ühendab faili `PARITY-twopi.md` — sama ühendus, mida `accepted.ts` teeb
dot-raja `PARITY-dot.md` jaoks.

`oldarrows` RCA (2026-07-28) kinnitas pere punktide arvu sümptomi täpse
ümberlülituskoha. Selle `i`–`Z`–`I` lehvik on kollineaarne ringi diameetril ja
pathplani `directVis` funktsiooni `intersect()` blokeerib nähtavusjoone, kui takistuse
tipp asub lõigul „peal“ — kus `wind()` 1e-4 kollineaarsuse tolerants
paneb isegi lõigust 270pt kaugusel oleva sõlme kollineaarseks lugema, ja
`inBetween()` (mis eeldab kollineaarsust) taandub seejärel ainult
**x-projektsiooni** testimisele: tipp blokeerib parajasti siis, kui selle x jääb rangelt
kahe lõpp-punkti x-koordinaadi vahelisse ULP-laiusesse vahemikku. Kumb kahest
peegeldatud radiaalserva kõverdub, sõltub seega PRISM-i lahendusest tulevate
kolme nominaalselt võrdse x-väärtuse viimasest ULP järjestusest — C kõverdab `Z->I`
(sõlme `i` telje tipp langeb selle vahemikku), port kõverdab `i->Z`
(sõlme `I` tipp langeb oma vahemikku). `directVis`-i reprodutseerimine võrguväliselt
kummagi poole väljastatud takistuste hulgal reprodutseerib kummagi poole otsuse täpselt,
ja oraakli marsruutimiseelse `ND_pos` süstimine porti annab 0 erinevust
(`attribution-twopi.json`) — marsruutimine ja väljastus on bait-baidilt ustavad.

`1855` on sama marsruutimiseelse PRISM FP mehhanismi radiaalne/tähtkuju **peegel**
variant (aktsepteeritud 2026-07-11): selle 31 lehte on täpselt kaasringsed, seega
tähtpaigutus on peegelsümmeetriline ja PRISM-i kattuvuse eemaldamine asub
sümmeetria suhtes ebastabiilses tasakaalus; 1-ULP V8-vs-libm `cos`/`sin` erinevus 5
lehenurgal funktsioonis `circleLayout`-i `setAbsolutePos` valib vastupidise peegelbasseini,
ja kogu radiaalpaigutus satub oraakli täpseks x-telje peegelpildiks (suurim
sõlme nihe 6.04pt, bb säilib). Süstimise A/B tõestas mõlemat suunda:
C täpsete `circleLayout` positsioonide söötmine pordi PRISM-i reprodutseerib oraakli
sõlm sõlme haaval (3e-14), ja ainult 5 ULP-lahknevast lehepositsioonist taastamine
lülitab kogu paigutuse tagasi pordi peegli juurde. Täielik RCA: `.agent-notes/twopi-radial-drift-rca.md` (otsustuspäevik
2026-07-11).

**Iteratiivsete mootorite iseloomustus: neato/fdp/sfdp.** <a id="a1-iterative-characterization"></a>
Erinevalt ülaltoodud `circo`/`twopi`/`osage` mootoriradadest ei ole `neato`/`fdp`/`sfdp`
veel id-põhiselt sorteeritud — `engine-walk.ts` salvestab nendele kolmele välja `tolerance: 0.5`
ja `parity-report.ts` kuvab need eraldi
jaotises „Iteratiivsed mootorid (±0.5 iseloomustus)“ failis
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md),
sõnaselgelt **mitte** võrreldavana ±0.01 deterministlike läbimismääradega mujal
selles dokumendis. Praegused arvud (910-kirjeline universum; läbimise % jätab välja
sisendid, mida C-oraakel ei suuda renderdada, vt [Vastavus](./conformance.md)):

| mootor | uuritud | ±0.5pt piires | mittevastav (kõik omistatud, aktsepteeritud) | pordi viga / ajalõpp | oraakli viga |
|---|---:|---:|---:|---:|---:|
| `neato` | 910 | 826 (90.8%) | 83 | 1 | 0 |
| `fdp`   | 910 | 703 (77.5%) | 204 | 0 | 3 |
| `sfdp`  | 910 | 619 (68.0%) | 290 | 1 | 0 |

(Esimene pühkimine, 2026-07-11 762 kirjega, mõõtis 263/311/260 piires
±0.5pt — hüpe praegustele määradele tuli sellest ajast maandunud id-põhistest parandustest,
peamiselt neato portimata `user_pos`/`P_SET` käsitlusest, mootori init-i
konsolideerimisest ja `setEdgeType` makro-vs-funktsiooni parandusest.)

Erinevalt esimesest pühkimisest on nüüd iga lahknev rida eraldi omistatud:
süstimiskoormus (`test/corpus/attribute-divergence.ts`) söödab natiivse
oraakli marsruutimiseelse `ND_pos` porti ja võrdleb uuesti, ning
iga praegune lahknev id on kas `drift-exonerated` (pordi marsruutimine
ja väljastus reprodutseerivad oraakli täpselt, kui lahendaja triiv on eemaldatud)
või üks käputäiest eraldi aktsepteeritud id-põhistest jääkidest (`241_0`
CDT incircle'i viik kõigil kolmel mootoril, neato `2239`, sfdp `42`/`2556`).
Allolev klassiaktsepteerimine vormistab süüst vabastatud hulga; jooksvad arvud
mootoripõhistel töölaudadel
([`PARITY-neato.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-neato.md),
[`PARITY-fdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-fdp.md),
[`PARITY-sfdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-sfdp.md)).

**A1-drift klassi aktsepteerimine (iteratiivsed mootorid, arvutatud liikmelisus).**
<a id="a1-drift-iterative-engines"></a> `test/corpus/accepted-divergences-engines.json`
sisaldab iga iteratiivse mootori (`neato`,
`fdp`, `sfdp`) kohta ühe `"A1-drift"` **klassi** kirje — `{ class: true, attributionFile, ref }` — mis erineb
ülaltoodud `circo`/`twopi`/`osage` radade id-põhistest kirjetest (D2,
`plans/iterative-parity-campaign/decisions.md`). Erinevalt id-põhisest kirjest ei
loendata klassi liikmelisust registris kunagi käsitsi: `parity-report.ts`
arvutab selle aruande koostamisel vastavast `attribution-<engine>.json`-ist
(T1 süstimisomistamise koormus, `test/corpus/attribute-divergence.ts`)
— iga lahknev id, mille natiivne marsruutimiseelne `ND_pos` süstiti
porti ja võrreldi uuesti ning mis vastab ±0.5 juures, saab selles failis
`verdict: 'drift-exonerated'`, mis tähendab, et kahe mootori iteratiivsed lahendajad
koondusid arvuliselt erinevate, kuid kumbki sisemiselt järjekindlate paigutusteni (ujukoma
akumulatsiooni erinevus ülaltoodud A1 iseloomustuse järgi, mitte pordi marsruutimise
või väljastuse viga). Id-põhised tõendid — ämbri kuju, baas- vs süstitud erinevuste
arv, ühtlase nihke/peegli tuvastus — asuvad omistusartefaktis endas, mitte ei ole
dubleeritud sellesse dokumenti ega registrisse (D2). Id, mis
hiljem hakkab täielikult läbima või mille uuesti omistamine muudab hinnangut,
langeb klassist automaatselt välja järgmisel aruande taasgenereerimisel — vana aktsepteerimist
pole vaja redigeerida ega teki valvetesti ebaõnnestumist. Mootorid, mille
`attribution-<engine>.json` pole veel genereeritud, renderdavad klassi kui
„omistamine ootel“ ja nullliikmega, identselt aktsepteerimise puudumisega
üldse — klassikirjel on lubatud andmetest ette jõuda (vt
`test/corpus/accepted-divergences-engines.test.ts`).

### A2. Tekstimõõtmine (fondimeetrika) → sildipõhine paigutus — SULETUD <a id="a2-text-measurement-font-metrics-→-label-driven-layout-—-closed"></a> {#a2-text-measurement-font-metrics-label-driven-layout}

**Olek (2026-07-01): suletud.** Ühtegi korpuse id-d ei aktsepteerita enam selle klassi all;
jaotis on säilitatud mehhanismi ajaloolise dokumentatsioonina ning selle
neutraliseerinud süstitava `TextMeasurer`-i liidespunkti kirjeldusena.
Järjestikused tekstimõõtmise parandused (`EstimateTextMeasurer`-i üleminek,
fonditeadlikud vertikaalmeetrikad, mitte-ASCII UTF-8-baitide parandus) lahendasid peaaegu
iga sildipõhise paigutuse erinevuse, mis siin kunagi asus. **`proc3d`** —
endine kanooniline A2 näide — on täielikult **`conformant`** kõigis kolmes
korpuse kaustas (`graphs-`/`share-`/`windows-proc3d`): ühtiv bbox, null
teeandmete erinevust, null sildiankrute erinevust.

**Viimased liikmed pensionile saadetud (2026-07-01).** **`NaN` pere**
(`graphs-NaN` / `share-NaN` / `windows-NaN`) kanti siin pikalt edasi, kuigi selle
sõlmegeomeetria juba ühtis C-ga täpselt (76/76 viitepunkti). Selle tegelik
jääk — 8 sirgserva lõpp-punkti neljal vastassuunalisel 2-tsüklilisel paaril
(`Target↔TThread`, `Interp↔InterpF`, `Event↔Target`,
`AtomProperties↔NRAtom`) nihkus 6–14 pt — diagnoositi uuesti ja selgus, et see
ei olnud **üldse fondimeetrika efekt**, vaid kaks pordi viga dot-i
mitmikservade marsruutimises (missioon `plans/fix-nan-a2-retire/`,
`.agent-notes/nan-edge-endpoint-diagnosis.md`):

1. **Vastassuunalise paari rajajärjestus.** Port sorteeris iga paralleelservade
   rühma enne Multisep rajanihete määramist uuesti algse loomisjärjekorra (seq) järgi; C
   määrab rajad edgecmp-i kogutud järjekorras (MAINGRAPH edasisuunaline esindaja
   esimesena, AUXGRAPH pööratud liige teisena — `dotsplines.c:419`,
   `make_regular_edge:1885-1907`). 2-tsükkel, mille pööratud liige deklareeriti esimesena,
   joonistas kumbagi serva teise 18 pt koridori.
2. **Vale lamedaljärgsus tasemeülestel liidetud servadel.** `markAdjacent`
   märkis `ND_other` kirjeid ilma C sama-astme kaitsmeta
   (`flat.c:272-276`), lastes `groupSize`-i lamedaljärgsuse lühiskeemil
   alla neelata portcmp rühmapiirid.

Mõlema ustava parandusega on pere **`conformant`** kõigis kolmes
kaustas (elemendi kaupa: sõlmi 0, servi 0 erinevat), ja sama mehhanism
sulges `42`, `clust2`, `ngk10_4` (structural-match → conformant) ja viis
`b124` lahknevast structural-match'i — kõik 2-tsükli/paralleelpaaridel.

**Mõlemad uuringupooled kasutavad sama hindajat — mõõtmine on neutraliseeritud.**
Natiivne `dot` oraakel töötab peata `GVBINDIR` all
(`test/corpus/gen-headless-gvbindir.sh` → `/tmp/ghl`), mis lingib sümboolselt ainult
`core` ja `dot_layout` pluginad — ühtegi `gd`/`pango`/`quartz` teksti paigutuse pluginat pole.
Kui see pesa on tühi, langeb graphviz tagasi oma sisseehitatud
`estimate_textspan_size`-ile. TypeScripti pordi `EstimateTextMeasurer`
(`src/common/textmeasure.ts`) on sama rutiini ustav port ja
on Node'i vaikimisi mõõtja, mille lahendab `createMeasurer()`
(`src/common/textmeasure-factory.ts`). **Iga paarsusvõrdluse mõlemad pooled
mõõdavad seega teksti identse hindajaga** — päris
FreeType'i/pango glüüfi laiused ei satu kunagi võrdlusse. Seepärast osutab siinne
hinnangu regressioon paigutuskoodile, mitte fondile, ning seepärast sulges hindaja enda vigade
parandamine (UTF-8 baitide lugemine, vertikaalmeetrika
fonditeadlikkus) suure osa sellest klassist täielikult, mitte ei kitsendanud pelgalt fondimeetrika lõhet.

**Süstitav `TextMeasurer`-i liidespunkt.** See neutraliseerimine on võimalik ainult
seetõttu, et tekstimõõtmine on tahtlik liidespunkt, mitte kummagi
mootorisse kõvasti seotud. `TextMeasurer` on ühemeetodiline liides (`measure(text, font, size,
flags) → {w, h, …}`), mis on sõltuvussüstina antud igale sildi suuruse arvutamise
kutsekohale — `polyInit`, `recordInit`, `initEdgeLabels` ja `buildNodeLabel` võtavad
kõik mõõtja parameetrina; miski ei mõõda teksti globaalse kaudu. See kinnistatakse
testide/CI jaoks `setTextMeasurer(...)` või `GV_TEXT_MEASURER=estimate` kaudu.
Liidespunkt võimaldab ka jääki *tõestada* pelgalt mõõtmisest tulenevaks: söötke porti
täpsed laiused, mida C mõõtis (oraaklist püütud), ja kontrollige, kas paigutus
reprodutseerib siis C täpselt. See eksperiment andis algselt aluse
A2 hinnangule `proc3d` kohta (vt allolevat ajaloolist lisa) — tehnika
kehtib endiselt. Selle pöördvõte sulges klassi: kuna mõõtmine oli
tõendatult neutraliseeritud mõlemal uuringupoolel, ei saanud `NaN` serva jääk
olla fondimeetrika efekt, mis sundis uuesti diagnoosima ja leidis ülaltoodud kaks
marsruutimisviga.

::: details Ajalooline analüüs (aegunud 2026-06-30) — säilitatud arhiivi jaoks
Allolev materjal kirjeldab selle klassi varasemat olekut, enne seda kui
`EstimateTextMeasurer`-i üleminek, fonditeadlikud vertikaalmeetrikad ja
mitte-ASCII UTF-8-baitide parandus selle enamiku sulgesid. See ei kirjelda enam praegust
käitumist — säilitatud ainult selleks, et siia viinud arutluskäik ei läheks kaduma.
Eelkõige: (1) allolevas mõõtmistabelis olevad „natiivse C“ laiuse arvud
on päris fondi renderdusteelt pärit **FreeType'i** väärtused; paarsusuuring
seda teed kunagi ei koorma — mõlemad pooled käitavad `estimate_textspan_size`-i (vt
ülal) — seega ei kajasta tabel seda, kuidas paarsust praegu mõõdetakse; (2)
allolevad katte-joonised ja golden/meie renderdused kujutavad **mittekorpuse**
`proc3d`-i (`graphs/directed/proc3d.gv`, ~2620 pt), mis ei kuulu
paarsusuuringusse; korpuse `proc3d` variandid on nüüd vastavad null
erinevusega, seega pole nende jaoks katet näidata; (3) allolev `NaN`/`ratio=compress`
sõlme-x narratiiv on aegunud — praegune mõõtmine näitab, et kõik 76 sõlmepunkti
ühtivad täpselt, seega laiusvea → sõlmenihke ahel, mida see kirjeldab, ei
kehti enam `NaN` puhul.

**`NaN` režiimis `ratio=compress` (ajalooline).** Pere
`NaN.gv` (`orientation=landscape; ratio=compress; size="16,10"`) oli
A2 juhtum, mille hinnang tollal maandus *diverged*, mitte
*structural-match*. Compressi x-võrgu simpleksi tee oli ustav — iga
piirangu sisend ühtis C-ga (laiusepiirangu väärtus, `containNodes` minlen-id,
aux-servade arvud 471/kaal 1612, `lrBalance` ja astmete järjestused kõik identsed)
*välja arvatud* 9 sõlme poolläbimõõdud, mille mõõtja teatas 0.5–1.03 pt
laiemana kui C. `ratio=compress`-i kaal-1000 pakkimine muutis tavaliselt lõdvad
vasakult-paremale eraldusnõuded **siduvaks**, nii et see piksli-alune laiusviga —
ilma compressita nähtamatu — ilmnes −3..−5 pt sisemise
x-nihkena. See nihe viis `Target<->TThread` sirge splaini 0.55 pt
üle sõlmekasti seina, nii et marsruuter painutas selle täiendavaks bezier-lõiguks (7
punkti vs C 4) — *struktuurne* delta, seega *diverged*. 9 laiuse sundimine
C väärtustele reprodutseeris C täpselt (sõlme-x 53/76→0/76 lahku; splain 7→4 punkti),
kinnitades, et jääk oli 100% ülesvoolu fondimeetrika, mitte compressi ega
splaini kood, **selle endise erinevuse puhul**. Täielikud tõendid (visuaalse
golden-vs-meie kõrvutuse + 4-vs-7-punkti splaini delta kattega):
`plans/fix-compress-xcoord/comparisons/nan-compress-xcoord.html` (proosakirjeldus:
`…/nan-compress-xcoord.md`).

**Fondimeetrika mõõtmise näide (ajalooline — FreeType vs estimate).**
Natiivne Graphviz mõõdab päris teksti paigutuse pluginaga (mitte paarsusuuringus
kasutatava peata oraakliga) teksti FreeType'i/libgd glüüfilaiustega.
Pordi `EstimateTextMeasurer` ei kopeeri glüüfi rasterdajat. Enamiku stringide puhul
ühtivad need täpselt; mõne puhul erinevad nad
murdosa punkti võrra. Mõõdetud näide — Times-Roman 14 pt, string
`"/home/ek/work/src/lefty/lefty.c"` (31 märki):

| | laius |
|---|---|
| natiivne C (FreeType) | 176.00 pt |
| @knowvah/dot-engine (estimate) | 176.75 pt |
| delta | **+0.75 pt (+0.43%)** |

Sama sõlme teine sildirida `"93736-32246"` mõõdeti **identselt**
(96.00 pt mõlemal) — viga sõltub stringist ja kogunevad glüüfi kaupa,
mitte ühtlane skaleerimistegur. See FreeType-vs-estimate lõhe on päris, kuid
**ei ole** see, mida paarsusuuring mõõdab (mõlemad pooled käitavad `estimate`-i); sellel oleks
tähtsust ainult siis, kui @knowvah/dot-engine'i väljundit võrreldaks päris fondiga C
renderdusega väljaspool seda uuringut.

**Allavoolu mõju endisele `proc3d` erinevusele (ajalooline).** Sildi
laius mõjutab sõlme suurust, mis mõjutab paigutust:

1. Laiem silt → veidi laiem sõlmekast (*ellipsi* sõlme puhul skaleeritakse laiust
   lisaks √2-ga, nii et +0.75 pt teksti → +0.53 pt poolläbimõõtu).
2. Sõlme poolläbimõõdud määravad x-koordinaadi võrgusimpleksi vasakult-paremale
   eraldusnõuded; need nõuded on `ROUND()`-itud täisarvudeks,
   seega võib piksli-alune laiusemuutus lükata nõude *N*-lt väärtusele
   *N+1*.
3. Võrgusimpleks valib seejärel erineva — kuid võrdselt optimaalse —
   täisarvulise x-jaotuse, nihutades mõnede sõlmede x-positsioone 1–2 ühiku võrra.

Mittekorpuse `proc3d.gv` (`graphs/directed/proc3d.gv`, ~2620 pt, mitte
paarsusuuringu liige) puhul andis see **≤ 3.55 pt** erinevuse x-ulatuses
(**0.13%**), kaetuna allpool — **roheline = natiivne C `dot` (golden), punane =
@knowvah/dot-engine (meie)**:

![proc3d golden-vs-ours kate: roheline = C, punane = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Suurendatuna ilmus ääris peaaegu täielikult pikkadele failiteede ovaalsetele
siltidele:

![proc3d kate, suurendatud laiadele teesiltide ovaalidele: roheline = C, punane = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

| Golden — natiivne `dot` | Meie — @knowvah/dot-engine |
|---|---|
| ![proc3d, renderdatud C Graphvizi poolt](/img/proc3d-golden.svg) | ![proc3d, renderdatud @knowvah/dot-engine'i poolt](/img/proc3d-ours.svg) |

Eraldiseisev kirjeldus (algpõhjus, mõõdikupõhised arvud, reprodutseerimiskäsk)
asub oma lehel:
[**proc3d — kanooniline A2 fondimeetrika erinevus (ajalooline)**](/et/divergences-proc3d-a2).
See leht kirjeldab lahendatud erinevust mittekorpuse sisendil; praegused
korpuse `proc3d` variandid on vastavad.

**Miks see tollal aktsepteeriti.** FreeType'i glüüfikaupa laiuste bait-baidilt
kopeerimine iga fondi ja stringi puhul oleks nõudnud selle meetrikatabelite,
vihjamise ja ümardamise kopeerimist — suur, habras ja ikkagi mitte
garanteeritult täpne. Tekstimõõtja on jagatud primitiiv: iga korpuse silt
läbib seda, seega riskis ühele stringile suunatud parandus teisi
tajumatu tasu nimel regresseerida.
:::

### A3. `hypot` viigilahendus splaini marsruutimisel (`dot`) {#a3-hypot-tie-break-in-spline-routing-dot}

**Mõjutatud:** `dot` graafid **geomeetriliselt sümmeetrilise** servamarsruutimise
kanaliga — tavaliselt lühike, sümmeetriline lamedaserva kaar. Täheldatud näide: `2368`,
mis jääb hinnangule *structural-match* (maxΔ ≈ 10.2 pt **ühel** real, `376->76`).
Sama viigilahendus ilmneb ka **pika** (mitmeastmelise) serva puhul suure sissetulevate
servade arvuga sõlme, kui koridor on täpselt peegelsümmeetriline: `graphs-b100` /
`graphs-b104` (identne lähtekood) lahknevad maxΔ 20 (täpselt üks astmerida) võrra
serva `Node23730->Node23729` ainsal sõlmpunktil — iga sõlme positsioon ja kogu ülesvoolu
kasti/hulknurga/pingul tee struktuur on C-ga bait-baidilt identne; ainult `findMaxDev`-i
~1-ULP valik, milline peegelsümmeetriline sisepunkt saab bezieri sõlmpunktiks,
erineb. Lühike lamedaserva vorm ilmneb ka kui `241_1` (structural-match,
maxΔ ≈ 2.4 pt) — oraaklile kinnitatud `241_0` lahknev sõsar, mille C
müra hoopis esimese alles hoiab. Sama viigilahendus tekitab sildistatud 2-tsükli
tagasiserva pilukoridori lõhenemise failis `2413_1` (structural-match, maxΔ 67.65) ja
`2413_2` (maxΔ ≤99.55, kui T11 swapBezier-reverse parandus maandub — seni
domineerib faili teatatud maxΔ 1922.26 sõltumatu, eraldi jälgitav
viga), ja ühe klastrisisese sildistatud serva failis `graphs-decorate`
(maxΔ 43.54); igal juhul langevad kaks kandidaat-lõhenemisnurka kokku 5.7e-13 (2413 pere) /
3e-14 (decorate) täpsusega enne, kui
positsioonist sõltuv Apple `hypot` müra valib võitja. `2371`
(structural-match, maxΔ 16.8) näitab sama sõrmejälge kahel sõltumatul
serval (`g[9263]` `r6837mid--r9687mid`, `g[23859]` `r38mid--r8699mid`): port
väljastab mõlemal oraakli täpse kontrollpunktide jada peegli,
sõlmpunkti y on ümber pööratud identse Δ16.8 võrra (ülemine/alumine lõhenemismurd vahetatud).
Selle päritolu on kvalifitseeritud **KESKMISE** kindlusega, mitte teiste liikmete
KINNITATUD kindlusega: `2371` pakib ~199 komponenti, mis
lahutab pathplani-lokaalsed koordinaadid lehekoordinaatidest, nii et viiku
ei õnnestunud kolme instrumenteerimiskatsega otse korreleerida kohaga `route.ts:209`;
sirgrežiimi segmenteerimise või lõikejärgse `recover_slack` päritolu ei ole
täielikult välistatud. Täielik diagnoos:
`plans/residual-cleanup/analysis/2371-mirror.md`. Enamik marsruuditud servi
ei ole mõjutatud.

::: details Graafi definitsioon (`2368.dot`)
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

**Iseloomustus.** Splaini sobitaja (`Proutespline` → `findMaxDev`,
`src/pathplan/route.ts`) lõhestab sobitatud bezieri marsruudi sisepunktis
maksimaalse hälbega. Kui kanal on sümmeetriline, on kaks kandidaat-lõhestuspunkti
**täpne matemaatiline viik**, ja võitja otsustatakse siis ~1e-14
ujukoma kaotusmüraga absoluutkoordinaatides bezieri hindamisel,
mille **märk sõltub absoluutsest positsioonist**.

C hälbekaugus on libm `hypot`, ja macOS-i Apple `hypot`, mis
genereeris oraakli, on patenteeritud teostus, mis ei ühti bitiliselt **ühegi**
portatiivse `hypot`-iga (mõõdetud selle vastu graphvizi koordinaadirežiimis, bitiliselt
identsed määrad: V8 `Math.hypot` ≈ 63%, korrektselt ümardatud / Arm-stiilis `hypot`
≈ 84%, fdlibm `hypot` ≈ 90%, `sqrt(dx²+dy²)` ≈ 94%). Selle ULP müra tõttu
**ei ole C ise järjekindel**: ta lõhestab kaks *nihkes kongruentset* kaart
**vastassuunalistesse** nurkadesse. Failis `2368` on kaar `376->76` geomeetriliselt identse
kaare `256->436` peegelpilt:

```
C    376->76 : M273.31,-4.56 C268.33,-3.14 263.11,-1.9  258.11,-1.15 250.49,0     242.34,-0.98 234.83,-2.8
port 376->76 : M277.29,-4.51 C268.27,-1.69 257.65,0.32  247.89,-1.15 244.92,-1.59 241.88,-2.21 238.85,-2.94
```

Kogu delta, kaetuna (12× suurendus kaarel `376->76` / `to1`) — **roheline = C
Graphviz, punane = @knowvah/dot-engine**. Mõlemad on sama madal allasuunatud kaar samade
sõlmepiiride vahel; nad erinevad ~1–2 pt võrra kõhu juures (bezieri keskmine
kontrollpunkt), kus C viik purunes vastupidise nurga suunas:

![2368 376->76 kaar: roheline = C, punane = @knowvah/dot-engine](/img/2368-376to76-overlay.png)

Kõik muu ühtib tolerantsi piires — sama piirdekast (608×148), sõlmepositsioonid,
sildid, nooleotsad ja kõik teised servad. Täisrenderdused on visuaalselt
eristamatud:

| C Graphviz | @knowvah/dot-engine |
|---|---|
| ![2368, renderdatud C Graphvizi poolt](/img/2368-c.png) | ![2368, renderdatud @knowvah/dot-engine'i poolt](/img/2368-port.png) |

Port kasutab **nihke suhtes ekvivariantset** viigilahendust (tõeline viik laheneb alati
esimesele indeksile), seega joonistab ta *iga* sellise kaare samamoodi sõltumata
positsioonist — see on iseendaga järjekindel ja ühtib C-ga kaartel, kus ka C
müra hoiab esimese (nt `256->436` ja `241_0 5:ne->8:nw`), lahknedes ainult seal, kus C
müra lülitub teisele poole (`376->76`). Lõpp-punktid, nooleotsa sihtmärk, teised
servad, kõik sõlmed, sildid ja piirdekast ühtivad tolerantsi piires; liigub ainult
ühe kaare sisemised kontrollpunktid (~1–2 pt kõhu juures).

**Miks aktsepteeritud.** Apple'i `hypot` ei ole JS-mootorite ja
protsessorite lõikes reprodutseeritavam kui **A1** FMA/`pow` — see on sama portatiivsuspiirang, lihtsalt
`dot` splaini marsruuteris. C *positsioonist sõltuva* valiku vastavusse viimine tähendaks
C range viigilahenduse kasutuselevõttu, mis asub **jagatud primitiivis**, mida läbib iga marsruuditud
serv: nii vahetaksime `376->76` vaste *uute* mittevastavuste vastu
kaartel, kus C maandub teisel pool (see regresseerib `241_0` ja `cnt=3`
lamedaserva oraakli juhtumi), mis on nulltulemusega vahetus, mis ohverdab ka pordi
nihkeekvivariantsuse. Seega hoiame järjekindla (ekvivariantse) marsruuteri. See on
piiratud, tajumatu `dot` delta — mitte lahtine viga. Täielik uuring:
`.agent-notes/2368-residual-flat-label-ranksep.md`.

### A4. Oraakel tunnistatult rikutud olekus (init_rank / pathplani pere) {#a4-oracle-in-an-acknowledged-broken-state-the-init-rank-pathplan-family}

**Mõjutatud:** `2796` (structural-match, maxΔ 49), `2471` (structural-match,
maxΔ ~9063), `1435` (structural-match, maxΔ 503), `1581` (diverged, maxΔ 465). Pere
liikmed `1939` ja `2825` on **conformant** ja neil pole kirjet, ning `2470`
ja `graphs-structs` liitusid nendega 2026-07-11 (mõlemad kukkusid vastavaks
pärast ortho külgnevuse-ülevoolu/chancmpid, fmadd `polylineMidpoint` ja
poolpaarisarvulise viigi ümardamise parandusi — port reprodutseerib nüüd oraakli
taastamisväljundi täpselt, sealhulgas identsed kaotatud servad);
nende aktsepteerimiskirjed on pensionile saadetud.

`1581` ja `2825` olid krahhitaaste juhtumid (fix-element-count-bucket
missioon): fuzzeri/degenereerunud sisendid, kus ülesvoolu testid väidavad **ainult**,
et dot ei jookse kokku (`test_1581`: ASan rikkumist pole; `test_2825`: krahhi pole,
kui `rebuild_vlists` tagastab -1). C jookseb kokku sisemise `Error:`-iga
(`install_in_rank` / `rebuild_vlists: lead is null`) ja selle taaste
loobub paigutuse sisust; port jõuab **identsete rankset-kustutamise
otsusteni** (hoiatuste paarsus kontrollitud: samad sõlme-/graafinimed
`mark_clusters`-i hoiatustes „already in a rankset“, cluster.c:317-320).

`2825` on nüüd täielikult suletud. Missioon fix-2825-rebuild-vlists (pärast 1581)
sulges esmalt lõhe ühe kihi võrra: port jõuab C *täpsesse* sisemise vea
olekusse — bait-baidilt identne stderr, sealhulgas teadete järjekord
(`Error: rebuild_vlists: lead is null for rank 1` ja seejärel prefiksita
`agerr(AGPREV, ...)` jätk `concentrate=true may not work
correctly.`) — kusjuures `dotLayoutPipeline` propageerib `dot_position`-i
ebaõnnestumist õigesti, et jätta vahele `dot_splines`/`dotneato_postprocess`,
vastavalt C `dotLayout`-ile (`if (r != 0) return r;` pärast `dot_position`-it,
dotinit.c:322-325). Järelparandus (osa 2) sulges seejärel allesjäänud
renderduskihi lõhe: C `emit_node` värav kontrollib iga sõlme `node_in_box(n,
job->clip)` abil (emit.c:1806-1809), ja sellel katkestusteel on `job->clip`
degenereerunud, sest `GD_bb`-d ei seadnud kunagi `set_aspect` (vahelejäetud
`dot_position`-i sabas) — seega väljastab C *null* sõlme, ainult (samuti
degenereerunud) klastrikaadrid. Port portis sama `node_in_box` värava
(`src/gvc/device.ts:renderNode`, kasutades `job.bb`/`job.pad`-i `job->clip`-i
ühelehelise vastena) ja lõpetas usutava bbox-i ümberarvutamise elavatest
sõlmepositsioonidest, kui `g.info.bb` on seadmata
(`src/gvc/device.ts:render`, `job.bb = g.info.bb` sõna-sõnalt, peegeldades
`init_gvc`-i `gvc->bb = GD_bb(g)`, emit.c:3272) — iga paigutusmootor
seab `g.info.bb` ise enne `render()`-i käivitumist igal mittekatkestusteel, seega on see
terveil graafidel bait-baidilt identne ja muudab väljundit ainult
sellel katkestusteel. `2825` on nüüd `conformant` (4-elemendiline väljund,
bait-baidilt identne oraakliga). Mõlema osa täieliku mehhanismi jälje vt
`.agent-notes/2825-rebuild-vlists-abort.md`. `1581` ei jõua kunagi
ebajärjekindlasse olekusse (*teine* ülesvoolu klastriakna viga, mitte `rebuild_vlists`), seega
paigutab ta oma ellujäänud graafi täielikult — see lõhe jääb lahtiseks. Oraakli väljund
`1581` puhul on taastejääk ilma ülesvoolu määratletud semantikata. Tõendid:
[`1581`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1581.md). Igal
neist sisenditest on graphvizi enda hinnangul rikutud **C-oraakel**: `2471`, `1939` ja `1435` on
[`xfail(strict=True)`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/tests/test_regression.py)
ülesvoolus (probleemid
[#2471](https://gitlab.com/graphviz/graphviz/-/issues/2471),
[#1939](https://gitlab.com/graphviz/graphviz/-/issues/1939),
[#1435](https://gitlab.com/graphviz/graphviz/-/issues/1435), vrd
[#2796](https://gitlab.com/graphviz/graphviz/-/issues/2796)); ainus parandusekatse,
[mustandi MR !4849](https://gitlab.com/graphviz/graphviz/-/merge_requests/4849),
jääb liitmata mustandiks (viimati muudetud 2026-03-20). `graphs-structs` on
iidne record-marsruutimise kaotuse klass (#102/#242/#274/#1323), mille stabiilne
graphviz 15.0.0 renderdab õigesti — arendusehituse oraakli regressioon.

**Mida C teeb.** `init_rank` liikmetel (`2796`, `2471`, `1939`)
sulgeb natiivse dot-i x-koordinaadi abigraaf suunatud tsükli läbi
klastriseina piiranguservade; selle
[`init_rank`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/ns.c#L146)
ei suuda kõiki sõlmi läbi vaadata, trükib `Error: trouble in init_rank`, ja
paigutus jätkub sellest taaste olekust — failidel `2471`/`2796` lõpeb see
`Pshortestpath` triangulatsioonijäägi ja kaotatud servadega. Failidel `1435` ja
`graphs-structs` on rikutud etapp pathplan ise (kõrvaklambri
triangulatsiooni ummikud; kaotatud record-pordi serv).

**Sisendid kontrollitud, seejärel muudetud ustavaks (see on kandev osa).**
Missioon `verify-oracle-bug-family`
([brief](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/README.md))
väljastas piirangugraafi, mida mõlemad pooled söödavad võrgusimpleksile, rida realt,
iga pere liikme kohta — ja leidis, et pordi varasem „puhas“ käitumine
selles peres tulenes **neljast tõelisest pordi veast**, mis kõik on parandatud:

1. `flatEdges` jättis vahele C
   [`rec_reset_vlists`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/flat.c#L333)
   kutse, jättes klastri astmeaknad vananenuks pärast lamesildi vnode-i
   lisamist (see üksi pani pordi kaotama **9** serva failil `2471`, kus C
   kaotab 6).
2. Sama-`group` serva karistus rakendus iseendasse suunduvatel servadel, mitte
   sama mittetühja rühma lõpp-punktidel
   ([`dot_init_edge`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/dotinit.c#L66)).
3. `CL_CROSS` kasutas C `_WIN32` väärtust 100; oraakli platvorm kasutab 1000
   ([`const.h`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/const.h#L141)).
4. Triangulatsiooni ummik katkestas `Pshortestpath`-i C hoiata-ja-jätka +
   sirgjoone varuvariandi asemel
   ([`shortest.c:333`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/pathplan/shortest.c#L333)).

Pärast parandust on pere NS piirangute väljastused C-ga **rea-identsed**
(253 rank2 kutset failil `2471`; kõik kutsed failidel `1939`/`1435`/`graphs-structs`),
ja port järgib C-d läbi tunnistatult rikutud taaste: samad
kaotatud servad (`3->16` failil 2796; identsed 6 failil 2471), samad elemendipuud.
`1939` muutus täielikult vastavaks. Jääkarvulised deltad (ja 1435
erinev pathplani jääk) on käitumine *taaste oleku sees*, mida
projekti poliitika tahtlikult ei jälita.

**`2723` (segfault; kinnistatud, mitte jälitatud).** Natiivne `dot` segfaultib (exit 139)
failil `tests/2723.dot` (suunamata, `rank=same` rühmad, sildistatud servad), seega pole C-l
väljundit, millega ühtida. Ülesvoolu
[probleem #2723](https://gitlab.com/graphviz/graphviz/-/issues/2723) on avatud ja
`tests/test_regression.py:test_2723` on `xfail`. Port viskab
`InternalError` (`INTERNAL_ERROR`, `TypeError` põhjusega failist
`src/layout/dot/flat.ts:flatLabelYpos`, kus `rank[r-1]` on undefined). Õiget oraaklit
puudumisel jääb aus ebaõnnestumine kehtima ja porti ei muudeta;
`src/layout/dot/flat-2723.test.ts` kinnistab selle. Uuendage seda testi, kui ülesvool parandab
probleemi.

**Poliitikamärkus.** Varasem A4 seisukoht („port vastab probleemi
ootustele; ärge replitseerige“) põhines uskumusel, et pordi
atsükliline abigraaf tuli healoomulisest lokaalsest variandist. See ei tulnud — see tuli
veast (1), mis `2471` tõendatult paigast viis. Ustavus C
lähtekoodile võitis: port reprodutseerib nüüd C tunnistatult rikutud tulemusi
kontrollitult identsetest sisenditest, ja iga siinne kirje tuleks
**uuesti mõõta, kui ülesvool vastava probleemi parandab** (oraakli väljund
muutub; oodake, et need id-d süttivad selle uuenduse juures regressioonidena — see
on kavandatud, mitte mädanemine).

**Tõendid.** Id-põhised võrdluslehed (kõrvuti renderdused + tõenduskirjed):
[`2471`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2471.md),
[`1939`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1939.md),
[`1435`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1435.md),
[`graphs-structs`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/graphs-structs.md),
[`2796 post-fix addendum`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2796-post.md)
(paranduseelne baasjoon säilitatud failis
[`2796-cluster-ranking.md`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-2796-cluster-ranking/comparisons/2796-cluster-ranking.md)).
Diagnoosiartefaktid: `.agent-notes/2471-stale-cluster-windows-missing-reset.md`,
`.agent-notes/1939-group-penalty-clcross-misports.md`.

### A5. Kehtetud sisendbaidid (kodeeringu esitus) {#a5-invalid-input-bytes-encoding-representation}

**Mõjutatud:** `1367` (diverged, maxΔ 0 — täpselt üks struktuurne erinevus).

**Mis erineb.** Sisendfail sisaldab alasti UTF-8 jätkubaiti (`0x80`)
sõlme nime sees. C käsitleb alasti jätkubaite 0x80–0xBF kui „kehtivaid
märke, mis esindavad iseennast“ (`lib/common/utils.c:1200-1207`, hoiatust pole),
ja sõlme nime `<title>` tekst möödub märgistikukonversioonist täielikult
(`agnameof` baidid voolavad otse `gvputs_xml`-i). Oraakli SVG sisaldab seega
toorbaiti ja **ei ole kehtiv UTF-8** vaatamata deklareeritud
kodeeringule. Port dekodeerib kehtetu UTF-8 sisendi latin1 varuvariandiga
(`0x80 → U+0080`) ja väljastab korrektse UTF-8 (`\xc2\x80`).

**Miks aktsepteeritud.** Pordi I/O piir on JS stringid (brauseriteek).
Toor kehtetu bait ei saa läbida `renderSvg` stringitagastusväärtust edasi-tagasi;
C-ga bait-baidilt ühtimine tähendaks väljundkodeeringu rikkumist iga
tarbija jaoks. Latin1 varuvariant peegeldab C enda „käsitletakse kui Latin-1“ taaste
semantikat (`utils.c:1249`). See on koodi all olev piirang —
esituskiht — mitte portatiivne käitumine, mille portimisest keeldusime.
Kõik muu failis 1367 on vastav: elementide arvud (23 polyline /
103 text / 44 polygon / 24 path) ja kõik koordinaadid ühtivad pärast
decorate (T6) parandust.

**Tõendid.**
[`1367`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1367.md)
võrdlusleht (kõrvuti renderdus + tõenduskirje).

---

### A6. `unsigned int` lõuendi ülevool degenereerunud sisendil {#a6-unsigned-int-canvas-overflow-on-degenerate-input}

**Mõjutatud:** `1314` — fuzzerist tuletatud sisend (`fontsize="991836031967s8"`),
mille absurdne fondisuurus paisutab joonise ~2.75e11 pt-ni.

**Mis juhtub.** C salvestab `job->width` / `job->height` kui **`unsigned int`**
(`gvcjob.h:327-328`). Hiiglasliku punktisuuruse `ROUND(...)` (`emit.c:1249-1250`)
ületäitub 32 bitis ja pakitakse mod 2³², ning SVG taustaprogramm väljastab selle
**märgiga** `%d` kaudu (`gvrender_core_svg.c:258-259`) — seega trükib C
`height="-425618343"`. Port hoiab matemaatiliselt järjekindlat (pakkimata)
väärtust. Iga teine väärtus — sõlme ellipsi `cx/cy/rx/ry`, juure `translate`,
hulknurk, teksti `font-size` — on bait-baidilt identne; erinevad ainult ülataseme `<svg>`
laius/kõrgus.

**Miks me seda ei jälita.** C 32-bitise täisarvu ülevoolu replitseerimine ei ole
portimist väärt paigutuskäitumine ja sisend on degenereerunud. Vaadake uuesti üle, kui ülesvool
parandab ülevoolu (nt laiendab välja või piirab suurust).

<a id="a6b-degenerate-nan-layout"></a>

#### A6b. Degenereerunud NaN-paigutus (`sfdp`, patoloogiline `repulsiveforce`) {#a6b-degenerate-nan-layout-sfdp-pathological-repulsiveforce}

**Mõjutatud:** `2556` — `repulsiveforce=100` (⇒ tõukejõud kasutab
`pow(dist, 101)`), mis viib vedru-elektrilise lahendaja **NaN-ini mõlemas
mootoris**. Natiivne oraakel ise väljastab kõik sõlme/serva positsioonid `nan`-ina ja
degenereerunud piirdekasti.

**Mis juhtub.** Kui iga koordinaat on NaN, serialiseerivad kaks teostust
prügi erinevalt: (1) graafi bb / taustahulknurk — C ümardab `NaN`
`int`-iks, mis arm64-l annab `INT_MIN`-skaala prügi (`bb="0,0,-4.295e+09,
-4.295e+09"`); port hoiab `0`. (2) Serva joonistusoperatsioonid — natiivse
väljastuspass allasurub NaN-splaini `_draw_`/`_hdraw_` (väljastades ainult `pos`-i),
samas kui port väljastab need NaN kontrollpunktidega. Sõlmejoonistused ühtivad (mõlemad
allasurutakse). Kummalgi poolel pole päris paigutust.

**Miks me seda ei jälita.** Port reprodutseerib juba *sama* NaN-i plahvatuse mis
natiivne — parandus, mis selleni viis, on tõeline (vt allpool); järele jääb ainult
see, kuidas kumbki NaN-prügi serialiseerib. C `(int)NaN` määratlemata käitumise
ja selle NaN-splaini joonistuse allasurumise replitseerimine ei ole tähenduslik paigutusustavus sisendil,
mille paigutus on degenereerunud mõlemas mootoris. Vaadake uuesti üle, kui ülesvool piirab
`repulsiveforce`-i või puhastab NaN positsioonid.

**Pordi parandused, mis selle ligipääsetavaks tegid (mitte ära jälitatud — tõelised vead).** Enne
neid ei suutnud port degenereerunud olekusse isegi jõuda: (1) `armPow`
(`src/common/arm-pow.ts`) viskas erandi igal mittekiirtee argumendil; nüüd portib see ARM
`pow.c` täieliku erijuhtumi haru, nii et `pow(NaN, y) = NaN` nagu libm-is. (2)
`bezierClip` (`src/common/splines-geom.ts`) tsüklis lõputult NaN kontrollpunktidel,
sest selle koonduvustest oli C `while (ABS > .5)` naiivne eitus
(ekvivalentne lõplike väärtuste jaoks, mitte NaN-i jaoks); nüüd peegeldab see C-d täpselt ja
lõpeb NaN-il. Mõlemad on C-ustavad ja mõjutavad ainult NaN sisendeid.

---

### A7. `round()` kastiseina ümardamispiir (`dot`) {#a7-round-box-wall-rounding-boundary-dot}

**Mõjutatud:** `graphs-honda-tokoro` ja (lisatud 2026-07-28, uus 905-kirjelises
universumis) selle `graphs/directed/` sõsar `tree-graphs-directed-honda-tokoro`
(mõlemad structural-match, maxΔ ≈ 1 pt ühel real `n012->n011`). Sõsar
erineb ainult `samearrowhead` atribuutide poolest, mis ei puuduta selle paari
marsruutimist — selle `n012->n011` geomeetria on aktsepteeritud id-ga bait-baidilt identne
nii pordi kui ka oraakli poolel, seega kandub allolev mehhanism sõna-sõnalt üle.

**Mis erineb.** `maximal_bbox`-i pea-koridori kasti sein maandub sisemisele
x=90 juures C-s versus x=89 pordis kahe
`n012->n011` paralleeli jagatud `samehead` pordi jaoks. Jagatud pordi konstruktsioon (`buildSharedPort`) ja
paralleelide rühmitamine on mõlemad C-ga bait-baidilt vastavad; 1 px lõhe on puhtalt
`round()` ümardamispiiri artefakt — ~1e-14 ülesvoolu ujukoma müra
lükkab täpselt `.5` piiril oleva väärtuse naabertäisarvuni. Pordi
`maximal_bbox` valem peegeldab juba C-d täpselt.

**Miks me seda ei jälita.** `round()` on primitiiv, mida läbib iga korpuse marsruuditud
serv; selle piirikäitumise nügimine selle ühe juhtumi järgi on
korpuseülene regressioonirisk 1 px nimel 2 serval — sama jagatud primitiivi
piirang nagu `bbox-class-control-hull-vs-curve` all märgitud kontrollkesta ümardusmüra puhul. Täielik diagnoos:
`.agent-notes/honda-samehead-shared-port.md`.

---

### A8. `fp-contract`/FMA ümardamine vs range IEEE (`dot`) {#a8-fp-contract-fma-rounding-vs-strict-ieee-dot}

**Klass.** clang arm64 kompileerib oraakli binaari lipuga `-ffp-contract=on`,
sulatades valitud korrutus-liitmisjadad üksikuteks FMA käskudeks;
port jookseb V8-l, mis teostab ranget IEEE-754 ümardamist ja ei suuda väljastada
`fma`-d. Bitiliselt identsete sisendite korral lähevad need lahku 1-2 ULP võrra
mis tahes avaldises, mille kompilaator otsustas kontraheerida. Pordi pool on alati
range IEEE-754 tulemus; oraakli pool on alati FMA-kontraheeritud
tulemus. See on kompilaatori/käitusaja portatiivsuspiirang C
lähtekoodi semantikast allpool, mitte loogikaviga pordis — taandamatu ilma
clangi konkreetseid kontraktsioonivalikuid tarkvaras emuleerimata. Teada on kaks eksemplari,
kahes erinevas kohas, kahe erineva võimendusmehhanismiga:

- **2646** — ULP tekib `Proutespline`-i `points2coeff`/`solve3`
  kuupvõrrandi lahendis ja lülitab otse ümber splaini sobitaja juurte arvu.
- **2620** — ULP tekib `poly_init`-i hulknurga tipuulatuse tsüklis
  (sõlme suurus) ja seda võimendab allavoolu `ortho` ustav sammupõhine
  täisarvuline kärpimine võrdse maksumusega labürindikoridori viigi ümberlülituseks.

**Mõjutatud:** `2646` (structural-match, maxΔ 42.09 kolmel 21 216 servast:
`edge2575` `g[4639]`, `edge3905` `g[7777]`, `edge15467` `g[30201]` — kõik
record-pordi `:c->:nb_part` smode pikkade servade marsruudid). **A3** sõsar: mõlemad
klassid on taandamatud ujukoma portatiivsuse viigid `Proutespline`-i sees,
kuid mehhanism on erinev — kompilaatori `fp-contract`
artefakt, mitte libm `hypot`.

**Mis erineb.** Kõigil kolmel serval lahkneb ainult viimane `routesplines` kutse (sirge
lõik pea porti). Selle lõpp-punkt asub bit-täpselt tõkkehulknurga alumisel seinal
ja selle puutuja on seinaga paralleelne (`evs[1]=(1,-1.22e-16)`), seega iga `splinefits`
kandidaat on tõkkega puutuv kohas `t=1` — lõikekuupvõrrandi peaaegu kahekordne juur.
`points2coeff` arvutab selle kuupvõrrandi katastroofilise kaotuse kaudu (liikmed
~7446 ümber kukuvad ~0.099-ni). Oraakel (clang/arm64,
`-ffp-contract=on`) kontraheerib `v3 + 3*v1 - (v0 + 3*v2)` liit-korrutamisteks,
samas kui V8 teostab ranget IEEE ümardamist — need lähevad lahku
~9.1e-13 võrra **bitiliselt identsetel sisenditel**, ja see müra lülitab ümber
`solve3` diskriminandi märgi: C leiab 1 juure (866.7, lõigu sees); port
leiab 3 juurt valejuure partneriga kohas `t=0.9999975 < 1-EPSILON2`. Valejuur
käivitab ühe lisa `a`-poolitusiteratsiooni, mis lülitab lõpplõigu
puutuja suuruse ümber teguri 2 võrra (kummas suunas üle
3 serva), andes maxΔ 42.09 pärast lõikamist (26 SVG erinevust).

**Miks aktsepteeritud (taandamatus tõestatud kontrollitud eksperimendiga).** Kõik kuus
`routesplines` kutset väljastati mõlemal poolel — kast, hulknurk, `PL`, algus,
lõpp ja `evs` on bait-baidilt identsed, nagu ka varasema (mitte-lõpliku) kutse
väljundsplain; ainus lahknevus on lõpliku kutse `solve3` sees. Eraldiseisev
puhta C koormus isoleeris ainsa muutuja: kompileerimine lipuga
`-ffp-contract=off` reprodutseerib **pordi** bit-täpselt kõigil 3 serval; vaikimisi
(`on`) kontraktsioon reprodutseerib **oraakli** bit-täpselt kõigil 3
serval. Port ühtib seega juba range IEEE-754 C-ga; lahknevus
on täielikult oraakli kompilaatori FMA kontraktsioonivalik, C
lähtekoodi semantikast allpool — pole lähtekoodi tasandi ebaustavust parandada.
Sihitud parandust (kontraktsiooni käsitsi emuleerimine `points2coeff`-is) prooviti ja
ümber lükati: see parandab 2 serva 3-st, kuid mitte kolmandat, mille ümberlülitus
algab `solve3` enda sisemises kontraktsioonis. Täielik parandus
nõuaks tarkvaralist FMA emulatsiooni kogu splaini sobitajas — kuuma tsükli
maksumus korpuseülese ümardamise mõjuulatusega piksli-aluse, 3-serva tasu nimel.
Täielik diagnoos: `plans/residual-cleanup/analysis/2646-fp-contract.md`.

**Mõjutatud (ajalooline):** `2620` (oli structural-match, maxΔ 585; 423 erinevust
24 serva teel + 22 nooleotsal). **Kukkus vastavaks 2026-07-11**:
ustav `sgraph` külgnevuspuhvri ülevool + `chancmpid` kahesuunalise
sisalduvuse port (vt `.agent-notes/ortho-maze-circo-rca.md`) kõrvaldas
lahknevuse; aktsepteerimiskirje on pensionile saadetud ja see jaotis on säilitatud
A8 klassi dokumentatsioonina.

**Mis erineb.** `ortho` (`splines=ortho`) torujuhe on C-ga bait-baidilt vastav
identsete sisendite korral — tõestatud C täpse labürindisisendi
(koordinaadid, `xsize`/`ysize`) süstimisega pordi ortho etappi: 378/378 marsruuditud
lõiku tulevad bait-baidilt identsed, seega ei ole `src/ortho`-s midagi süüdi.
Tegelik lahknevus on 1-2 ULP labürindi *sisendis*: sõlme `ysize` (ja astmesisese
akumulatsiooni kaudu `ND_coord.y`), mis arvutatakse C `poly_init`
hulknurga tipuulatuse tsüklis (`shapes.c`), mis
`-ffp-contract=on` all sulatab `R.x += sidelength*cosx` FMA-ks, mis on ~1
ULP suurem kui pordi range IEEE aritmeetika (mõlemad pooled teostavad
aritmeetiliselt identset avaldist). `2620`-l on 173 murdlaiusega
hulknurksõlme; kõik näitavad C ≥ port 1-2 ULP võrra. Seda ULP-d võimendab — mitte
ei põhjusta — `ortho` Dijkstra lõdvendus, mis kärbib ustavalt oma
jooksvat kaugust samm-sammult (`sgraph.c:165`, pordis peegeldatud kui
`Math.trunc`) kaaludel, mis on tuletatud toorrakkude ulatustest
(`maze.c:257`). ULP-nihutatud geomeetria lülitab ümber võrdse maksumusega koridori viigi
4 marsruuditud serval (teed + nende nooleotsad); ülejäänud erinevused on
±1-raja ümbernummerdamise kõrvalnähud neist 4 ümberlülitusest.

**Miks aktsepteeritud (taandamatus tõestatud kontrollitud eksperimendiga).** Eraldiseisev
C koormus, mis varieeris ainult `-ffp-contract`-i, reprodutseeris mõlemad pooled
lahknevas kuusnurga tipus: `-ffp-contract=on` → `310.29250168188713`
(ühtib oraakliga), `-ffp-contract=off` → `310.29250168188707` (ühtib
pordiga), kusjuures lahknev operatsioon on isoleeritud tipuni `i=3`
(`R.x=-0.50000000000000011` sulatatud vs `-0.5` sulatamata). Teine
sisendisüstimise eksperiment (ainus muutuja: ortho sisendväärtused) kinnitas
võimendi: pordi enda `orthoEdges`-i söötmine C täpse
`coord`/`xsize`/`ysize`-ga kukutab kõik 4 koridori lahknevust 0-ni — ortho
koodil pole viga, see on lihtsalt tundlik (nagu C enda labürindi-maksumuse
marsruutimine) oma sisendi 1-2 ULP nihkele. Vastavusse viimine tähendaks
clangi konkreetse FMA kontraktsiooni emuleerimist ühe kompileeritud avaldispuu
jaoks `poly_init`-is — kompileeritud artefakti jälitamist, mitte lähtekoodi semantika portimist.
Täielik diagnoos: `plans/ortho-2620-residual/analysis/2620-ortho-route.md`.

**Emuleeritud erand (mitte aktsepteeritud): `triang.c:ccw`.** Üks kontraktsioonikoht
ON reprodutseeritud bitthaaval, mitte aktsepteeritud: pathplani `ccw`
kompileerub `fnmul`+`fmadd`-iks (täpne esimene korrutis − ümardatud teine), nii et
päringupunkt, mis on bitiliselt võrdne lõigu otspunktiga, testib ISCW/ISCCW asemel
ISON. `shortest.c:pointintri` lükkab siis tagasi hulknurga tipu otspunktid
(„destination point not in any triangle“) ja `makeMultiSpline` langeb tagasi
lihtsale marsruutimisele iga liidetud 2-tsükli jaoks — suur, diskreetne,
korpuseülene käitumine, millega port peab ühtima. Erinevalt ülalolevatest
`solve3`/`poly_init` kohtadest (sügaval kompileeritud avaldispuudes, parandus
ümber lükatud) on `ccw` üksik eraldiseisev kompileeritud funktsioon selge semantikaga, seega
`src/pathplan/triang.ts` emuleerib seda: lihtsa double'i kiirtee konservatiivse
veapiiriga, kus lihtne ja sulatatud märk tõendatult ühtivad, ning
täpne Dekkeri korrutise + düaadilise BigInt tee peaaegu nullijuhtudeks.

---

### A9. libm trig 1-ULP → CDT kaasringse viigi ümberlülitus (`circo`/`twopi` multispline) {#a9-libm-trig-1-ulp-→-cdt-cocircular-tie-flip-circo-twopi-multispline}

**Klass.** V8 `Math.sin`/`Math.cos` ei ole bitiliselt identsed Apple libm-i
`sin`/`cos`-iga (tõestatud: 1-ULP lahknevus kohas `2π·4.5/8`, üks kaheksast
ellipsi-takistuse nurgast). `makeObstacle`-i ümberpiiratud 8-nurga nurgad
pärivad selle ULP, seega erinevad kolmnurkruuteri sisendkoordinaadid
oraakli omadest ≤6e-14 võrra. Sümmeetrilised paigutused (võrdse suurusega sõlmed astmel/ringil)
muudavad ruuteri nelinurgad reaalaritmeetikas **täpselt kaasringseks**, seega täpne
incircle-predikaat asub noateral: sisend-ULP lülitab selle märgi ümber,
piiratud Delaunay diagonaal lülitub ümber ja koridorihulknurk, mis ebaõnnestub
`Pshortestpath`-is oraaklis („destination point not in any triangle“ →
lihtsa splaini varuvariant), õnnestub pordis (või vastupidi). Saadud
splainid erinevad ~0.2–0.5pt võrra. **A3**/**A8** sõsar: taandamatu
ujukoma portatiivsuspiirang C lähtekoodi semantikast allpool — vastavusse viimine
nõuaks Apple libm-i täpse `sin`/`cos` ümardamise reprodutseerimist JS-is.

**Mõjutatud:** `241_0` (circo Δ≈0.2 / twopi lõuendi Δ≈9 koridori ümberlülituse kaudu
serval `5:ne->8:nw`); `2343`, `2239`, `share-b29`, `windows-b29` (twopi,
igaühel 1–2 serva sildi positsiooni erinevust — libm 1-ULP tekib
`poly_init`-i ühikutipu trigonomeetrias (`hypot`/`atan2`/`sin`), paneb ühe sõlme
arvutatud kõrguse ULP võrra üle minimaalse suuruse kärpe, millele oraakel maandub
täpselt, ja kaskaadib `floor()` kaudu xlabel R-puu laadimises üheks
sildikandidaadi ümberlülituseks. Korrektselt ümardatud hypot-i parandust prooviti ja
LÜKATI ÜMBER: see parandas `2343`, kuid regresseeris `2168_3`, mille kaheksanurga suurus
voolab läbi sama kutse, kus oraakli väärtus EI OLE korrektselt
ümardatud — ükski deterministlik hypot-poliitika ei ühti oraakliga mõlemal).
`2168_1` asus algselt selles klassis, kuid muutus
vastavaks, kui port emuleeris oraakli fp-kontraheeritud `ccw`-i
(pathplani `triang.ts`): selle koridori ebaõnnestumist juhib FMA-ga
`pointintri` tipu otspunkti tagasilükkamine, mida port nüüd reprodutseerib
bitthaaval, seega CDT-diagonaali ULP viik seal enam ei ilmne.

**Miks aktsepteeritud (taandamatus tõestatud kontrollitud eksperimendiga).**
CDT ise on süüst vabastatud: pordi `mkSurface` on GTS
0.7.6 inkrementaalse lisamise ustav port (`cdt.c`: 1→3 lõhe + rekursiivne
`swap_if_in_circle`, piiranguservad eelloodud ja vahetamatud,
`remove_intersected_*` + `triangulate_polygon` piirangute jõustamine), ja
eraldiseisev C koormus, mis lingib **päris GTS teegiga** ja mida söödeti pordi
bit-täpsete ruuteri sisenditega, reprodutseerib pordi triangulatsiooni tahk-tahult
(2168_1: 22/22; 241_0: 185/185). Incircle determinandi täpne ratsionaalarvuline
hindamine kahel sisendikomplektil kinnitab märgi ümberlülitumist (+1 pordi
sisenditega, −1 oraakli omadega). Jääkmuutuja — 1-ULP
trigonomeetria erinevus — isoleeriti `Math.sin`/`sin` bitimustrite
otsese võrdlemisega.

**Mootoriraja aktsepteerimine (`accepted-divergences-engines.json`).**
<a id="a9-engine-track-twopi-circo"></a> Twopi/circo **xdot-mootorirajad**
(`parity-twopi.json` / `parity-circo.json`, natiivne `dot -K <engine>
-Txdot` oraakel, `test/corpus/engine-walk.ts`, semantiline joonistusoperatsioonide võrdlus
±0.01 juures — vt `test/golden/compare-xdot.ts`) toovad esile sama mehhanismi
sõltumatult ülaltsiteeritud dot-mootori SVG-uuringust: twopi `2239` (1
joonistusoperatsiooni erinevus — `_ldraw_` serva sildi tekstipositsiooni ümberlülitus, sama
`poly_init` ühikutipu trigonomeetria ULP, mis kaskaadib läbi `floor()` xlabel
R-puu ahela; `2343`, `share-b29` ja `windows-b29`, mis algselt aktsepteeriti
selle kirje all, *parandati* 2026-07-11 ustava fmadd kontraktsiooniga
`polylineMidpoint`-is — vt allolevat b29-pere lõiku) ja circo `241_0` (41
joonistusoperatsiooni erinevust, Δ≈0.2pt serva `1->2` marsruuditud bezieril — sama
CDT-diagonaali koridori ümberlülitus; otsustuspäevik, 2026-07-10 kirje „CDT rewritten as
faithful GTS port; 2168_3 outline-ring obstacle; 56/osage bb clobber; A9
filed“). Aktsepteeritud mootoriraja tasemel failiga
`test/corpus/accepted-divergences-engines.json`, mille `parity-report.ts` ühendab
faili `PARITY-twopi.md`/`PARITY-circo.md` — sama ühendus, mida `accepted.ts` teeb
dot-raja `PARITY-dot.md` jaoks.

**circo `2475_2` — kaasringne closestNode hypot viik.** Ühes selle 10762-sõlmelise
graafi 28-sõlmelises komponendis valib circo `getRotation`
(`circpos.c:73-92`) paigutuse alguspunktile lähima ploki sõlme
`hypot` abil, et otsustada alamploki pööre. Kaks kaasringset sõlme on
efektiivselt võrdsel kaugusel; V8 korrektselt ümardatud `Math.hypot` ja Apple
libm-i `hypot` ümardavad selle kauguse 2 ULP võrra erinevalt, mis lülitab ümber range `<`,
valib teise sõlme ja pöörab/peegeldab alamploki ~20° (18 sõlme
liigub, max 296.7pt; ülejäänud 10744 sõlme on bitiliselt identsed, nagu ka
plokipuu, ringi järjestus ja iga `centerAngle`). CR-hypot poliitika lükati
selle klassi jaoks juba ümber (2026-07-10). Eraldiseisev reprodutseerimine:
`.agent-notes/circo-2475-590-repro.dot`; täielik RCA:
`.agent-notes/circo-b81-2475-rca.md` (aktsepteeritud 2026-07-11).

**twopi `2470` — radiaalkoordinaadi ULP, mida võimendab xlabel R-puu.**
2470 on 140-servaline graaf, mille HTML `<table>` serva sildid klastrisse
peaaegu kokkulangevatel radiaalsetel ankrutel. Neato peres paigutatakse serva sildid
välissiltidena ahne xlabel paigutaja (`label/xlabels.c`) poolt,
mis valib kõige vähem kattuva kandidaatnurga Hilberti-järjestatud R-puu kaudu.
Pordi splainid ja sõlmekoordinaadid ühtivad oraakliga väljastustäpsuseni
(null splaini/sõlme/bbox erinevust isegi 1e-7 juures), kuid ühe sõlme radiaalne
`ND_coord.y` erineb ~2 ULP võrra (Apple libm `sin`/`cos` vs V8 `Math`) — kaugelt
vastavuslatist allpool, kuid see asub `floor(pos.y − sz.y/2)`
piiril täpselt 0 juures failis `objplpmks`, lülitades selle objekti R-puu ristküliku
ühe ühiku võrra ümber. Hilberti-järjestuse/puurühmitamise muutus paneb `RTreeSearch`-i
kärpima teist haru, nii et ~140 silti hüppavad igaüks naaberkandidaat-
nurka (iga erinevus on fikseeritud (+laius, −reakõrgus) samm). Paigutaja, objektide
järjestus, ristküliku ümardus, `CombineRect` (mis peegeldab ustavalt C min-min
veidrust) ja int32 Hilberti võti kontrolliti igaüks ustavaks; lahknevus
on ülesvoolu radiaaltrigonomeetria ULP, taandamatu samal põhjusel
mis twopi `1855`. Aktsepteeritud 2026-07-11; täielik RCA:
`.agent-notes/twopi-2470-rca.md` (mis dokumenteerib ka, et selle id
hommikune „läbimine“ oli aegunud oraakli binaari artefakt, mitte pordi
regressioon).

**osage `1855` — takistuse tipu fp-contract'i määrdumine.** Erineb ülaltoodud twopi
`1855` radiaalpeegli kirjest: osage all on sõlmekeskmed oraakliga bit-täpsed
ja 110 joonistusoperatsiooni erinevust on kolm takistusmarsruuditud serva,
mis on paigutatud sõlmerea peegelpoolele (X bit-täpne, Y peegeldatud).
Kaheksanurga takistuse tipud funktsioonist
`circumscribed_polygon_corner_about_ellipse` (`neatosplines.c:301`) erinevad
C-st 3–4 ULP võrra, sest clangi `-ffp-contract=on` sulatab
`ellipse_tangent_slope`/`line_intersection` `a·b±c`
ahelad üksikuteks ühekordse ümardusega FMA-deks, samas kui V8 ümardab iga operatsiooni: C sulatatud ümardus
koondab nurga-x väärtuste kanalisammba üheks bitiliselt identseks double'iks (täpselt kollineaarne),
pordi oma lõhestab selle kaheks väärtuseks, mis on 1 ULP kaugusel. See lülitab ümber nähtavuse
`clear()` puutuja testi — kanal ei ole enam blokeeritud —, lisades ~20
nähtavusserva, ja Dijkstra lahendab üles/alla homotoopiaviigi
peegelpoolele. Kontrollitud eksperiment: C täpsete takistuskoordinaatide süstimine
muus osas puutumata porti annab **null** lahknevat serva, vabastades
legaalse paigutuse, nähtavuse, Dijkstra ja splaini ahela täielikult süüst; ainult C libm `cos`/`sin`
süstimine on tühitoiming. Aktsepteeritud
2026-07-11; täielik RCA: `.agent-notes/osage-spline-family-rca.md`.

**b29 pere (twopi).** Neli b29 varianti jagavad ühte noaterva: serva silt
`EqmtTyp` (`Node14732->Node14731`) asub täpsel placeLabels
külje valiku viigil, mille tulemus sõltub ümbritsevate objektide 1-ULP twopi paigutustriivist.
`polylineMidpoint`-i ustava fmadd kontraktsiooniga (states-pere parandus, 2026-07-11) on pordi sildiankur
bitiliselt identne oraakli omaga, kuid viik laheneb ikka vastupidiselt
neljast variandist kahel (`graphs-b29`, `linux.i386-b29`), samas kui
teised kaks (`share-b29`, `windows-b29`) nüüd vastavad — ja `2343` aktsepteeritud A9
sildierinevus kadus täielikult. Piir: 1 joonistusoperatsioon, Δ12pt sildi y. Taandamatu
ilma ülesvoolu triivi kõrvaldamata. Täielik RCA:
`.agent-notes/twopi-states-rca.md`.

Sama placeLabels noaterv ilmneb **osage** rajal (aktsepteeritud
2026-07-11, täielik RCA: `.agent-notes/osage-small-tail-rca.md`):
`linux.i386-b29` ja `share-b29` (2 joonistusoperatsiooni erinevust mõlemal — ühe serva sildi
x-ankur maandub 878.28 vs 841.06, paigutatud sümmeetriliselt bitiliselt identse
splaini keskpunkti 859.67 ümber, st ±pool sildi laiust; need kaks
varianti peegeldavad teineteist) ja `1652` (2 joonistusoperatsiooni erinevust — kaks serva
lülitavad ümber igaüks ühe sildiankru identse keskpunkti ümber, üks x-is ja üks y-is,
bitiliselt identsete splainide ja nooleotstega; oraakel renderdab täielikult,
seega ei ole see teadaolev natiivse ajalõpu lipp). Igal juhul on serva
geomeetria bit-täpne ja ainult sildi külje valiku viik laheneb
vastupidiselt 1-ULP triivinud ümbruses.

Osage rada kannab `polypoly` kolmikut (`graphs-polypoly`,
`share-polypoly`, `windows-polypoly`; aktsepteeritud 2026-07-11, täielik RCA failis
`.agent-notes/patchwork-tail-rca.md`): ainus lahknev operatsioon on
paljas transtsendentne `cos(π+θ)` moonutatud nelinurga orientatsiooni-180 tipus —
V8 `Math.cos` on korrektselt ümardatud, samas kui Apple libm-i `cos` kannab
±1-ULP argumendist sõltuvat viga (seega ainult libm-i all `|cos(π+θ)| ≠
|cos(θ)|`); 1-ULP sõlme suuruse delta söödab paki `GRID`/`ceil`-i, lükkab
ümber perimeetri viigi ja qsort paigutab kaks komponenti teineteise pakkimis-
rakkudesse — jäik terve sõlme vahetus ilma kuju- või marsruutimisveata. Ükski
deterministlik ümberkirjutus ei saa reprodutseerida mittekorrektselt ümardatud libm-i
transtsendentfunktsiooni, õpikuline A9 kuju.

Sama mehhanism kinnitati 2026-07-28 suuremal sõsaral
`tree-graphs-directed-polypoly` (`graphs/directed/polypoly.gv`, uus
905-kirjelises universumis; 112 joonistusoperatsiooni erinevust, ainult osage). Lahknev operatsioon
on identne sõlme `9004` `cos(π+θ)` 1-ULP koht — C ja pordi `bb.x`
väärtused ühtivad algse RCA-ga bait-baidilt —, kuid sellel 76-sõlmelisel sisendil
kulgeb levik hoopis osage `arrayRects` kaudu: `acmpf` sorteerib paki
rakud toorsumma `width+height` järgi ja libm-i 1-ULP-võrra kõrge laius paneb
`9004` sorteeruma rangelt oma pööratud sõsarate `9000/9002/9006` ette, samas kui
V8 korrektselt ümardatud väärtus jätab täpse 4-suunalise viigi, mille ebastabiilne
qsort järjestab teisiti — erinevad reapõhised rakud, `9002`/`9006`
vahetus ja veerulaiuse `fmax` kaskaad, mis nihutab 8 naabrit x-is.
Pordi enda `arrayRects`-i söötmine C sõlmesuurustega versus pordi sõlme
suurustega reprodutseerib uuringu 10 liikunud sõlme bait-baidilt ühtivate x-deltadega,
sulgedes põhjusliku ahela.

Veel kaks mootoriraja eksemplari said algpõhjuseni jälitatud ja aktsepteeritud 2026-07-11
(täielik RCA: `.agent-notes/circo-edge-tail-rca.md`): twopi `241_0` (6 joonistusoperatsiooni
erinevust — ülaltoodud circo kirje sõsar: sama CDT kaasringne
incircle viik, mille libm `sin`/`cos` 1-ULP ümber lülitab, laseb pordi
multispline koridoril õnnestuda 14-punktise splainiga, kus natiivne ehitus
langeb tagasi lihtsale 8-punktisele marsruutimisele; punktide deltad < 0.07pt) ja circo
`windows-tree` (10 joonistusoperatsiooni erinevust ühel lehvikuserval — circo paigutustrigonomeetria
paneb `node2.y` ühe ULP võrra `node8.y` kohale täpselt sümmeetrilise
väärtuse 18.0 ümber, ja `closestSide`-i dyna pea-pordi valik lülitab TOP/BOTTOM
sellel täpsel viigil ümber; sõlmepositsioonid ja kastid on muus osas bitiliselt identsed
oraakliga).

**sfdp mootorirada — serva FP-viigid (`42`, `241_0`).**
<a id="a9-sfdp-fp-ties"></a> sfdp xdot-mootorirada (`parity-sfdp.json`,
natiivne `dot -Ksfdp -Txdot`, ±0.5) toob esile CDT kaasringse incircle viigi, kui
täpsed natiivsed marsruutimiseelsed positsioonid on süstitud (seega lahknevus EI OLE
iteratiivne triiv — vt A1-drift klassi — vaid diskreetne predikaadiviik):

- `42` ja `241_0` — CDT kaasringne incircle viik (multispline koridor).
  Süstitud positsioonidega on jääk **lõikude arvu ümberlülitus**: `42`
  `opCount 5 vs 9` (serv 0->3) / `ptCount 32 vs 26` (3->7); `241_0` `ptCount 14
  vs 8` (serv 3->2) — pordi piiratud Delaunay diagonaal lülitub oraakli suhtes ümber,
  nii et multispline koridor õnnestub N-punktise splainiga, kus
  natiivne ehitus langeb tagasi lühemale lihtsale marsruudile (või vastupidi), täpselt nagu
  ülaltoodud twopi/circo `241_0` kirje.
  Port emuleerib juba arm64
  `fmadd` kontraktsiooni incircle/`ccw` predikaadis (`src/pathplan/triang.ts`,
  `src/common/fma.ts`) ja kasutab robustset incircle Delaunay'd; jääk on
  V8-vs-Apple-libm `sin`/`hypot` 1-ULP predikaadi sisendis, mida ükski portatiivne
  kood ei reprodutseeri.

> **`2095` klassifitseeriti ümber A9 → A1-drift (2026-07-22).** Seda loetleti varem
> siin kui „hypot sõsarat“ (alla 0.7pt triiv tühja nimega
> sõlme `""->"4"` servadel). See jääk oli **koormuse artefakt**: omistamise
> süstija `GVTS_POS` regex nõudis ≥1 nimemärki, seega `""`-nimega sõlme ei
> süstitud kunagi ja see lohistas kaht külgnevat serva. Kui süstija parandati tühje
> nimesid sobitama (`(.+)`→`(.*)`, `src/layout/neato/splines.ts`), süstib sfdp `2095`
> **0 jäägini** — puhas jõutriiv, mida katab arvutatud A1-drift
> klass, mitte marsruutimise FP-viik. Selle id-põhine aktsepteerimine eemaldati failist
> `accepted-divergences-engines.json`. (Sama leid mis fdp `2095` allpool.)

**Värske kontrollitud eksperiment (2026-07-21).** Natiivse-vs-V8 `hypot` sond
(`plans/sfdp-tracked-divergences/batch-2/hypot-ulp-probe.txt`): süsteemse C `hypot`-i
kompileerimine ja võrdlemine Node `Math.hypot`-iga tüüpilistel
lamedaserva hälbe sisenditel näitab 1-ULP lahknevust 2-l 6-st (Δ 7.1e-15 ja
5.7e-14) — lõhestuslävendi noaterv, mis lülitab ümber alajaotuste arvu.
Taandamatu: ükski portatiivne hypot ei reprodutseeri Apple libm-i (`arm-pow.ts`
pretsedent sama piiri jaoks). Aktsepteeritud mootoriraja tasemel failiga
`accepted-divergences-engines.json` (`sfdp.42`, `sfdp.241_0`).

**fdp** xdot-mootorirada (`parity-fdp.json`, natiivne `dot -Kfdp -Txdot`,
±0.5) toob esile SAMA CDT kaasringse viigi samal graafil `241_0`: kui
oraakli täpsed marsruutimiseelsed positsioonid on süstitud, on jääk 11 arvulist
`unfilled_bezier` erinevust, mis piirduvad ühe servaga (`0->1#0`, maxΔ 3.39pt). Kuna
sõlmepositsioonid on süstituna identsed, on lahknevus allavoolu
pathplani multispline koridoris — sama libm-1-ULP incircle viik mis
twopi/circo/sfdp `241_0` puhul (täpne ratsionaalne incircle 185/185 ülal). Hoovad on
juba rakendatud (`src/pathplan/triang.ts` fmadd, `src/pathplan/route.ts:198`
`Math.hypot`); viik on taandamatu. Aktsepteeritud failiga `accepted-divergences-engines.json`
`fdp.241_0`. fdp `2095` on seevastu **A1-drift, mitte A9**: ainsa tühja nimega
sõlme süstimine (pärast omistamise süstija parandamist `""`-nimega sõlmi
sobitama) kukutab selle jäägi nulli — varasem „A9 saba“ oli
süstimata tühi sõlm, mis lohistas oma külgnevaid servi. sfdp `2095` aktsepteerimine oli
sama pimeala — värske sfdp omistamise taasgenereerimine (2026-07-22) parandatud
süstijaga kinnitas, et ka see süstib 0 jäägini, ja selle aktsepteerimine eemaldati (vt
ülaltoodud märkust `2095 reclassified`).

---

## Jälgitav pikk saba (`dot` atribuudid ja äärejuhtumid) {#tracked-long-tail-dot-attribute-edge-case}

**Vaikeseadetel** ühtib `dot` mootor C binaariga range deterministliku
tolerantsi piires golden-korpusel (`conformant` hinnang; vt märkust
alguses). Allesjäänud erinevused on **atribuutide ja
äärejuhtumite pikk saba** — iga Graphvizi pordi ajalooliselt raske osa. Erinevalt
ülaltoodud aktsepteeritud deltadest need *suletakse*; neid jälgitakse elavalt, arvudega,
failis
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md):

| Kategooria | Mis erineb |
|---|---|
| **path-structure** | Serva splaini marsruutimine konkreetsetes konfiguratsioonides (nt mõned lamedaserva ja tiheda koridori juhtumid). |
| **element-count** | Funktsioon, mis väljastab teatud graafides C-st rohkem/vähem SVG elemente. |
| **color-stroke** | Joone/täite väljastuse erinevused konkreetsete stiiliatribuutide puhul. |
| **parser-gap** | Väike hulk DOT sisendeid, mida parser veel täielikult ei aktsepteeri. |

Kui Teie graaf kasutab ainult tavalisi atribuute ja `dot` mootorit, olete
peaaegu kindlasti deterministliku tolerantsi vaste teel. Kui paigutus näeb vale välja, kontrollige faili `PARITY-dot.md`
selle sisendiklassi kohta — tõenäoliselt on see jälgitav kirje oraaklile kinnitatud
paranduse missiooniga, mitte tundmatu.

> **Märkus sildipõhiste juhtumite kohta.** Tekstimõõtmise klass (A2) on suletud —
> ühtegi `dot` graafi ei aktsepteerita selle all enam. Graaf, mis täna istub
> structural-match juures, on jälgitav lünk, mitte fondimeetrika delta.

### `concentrate=true` vastassuunaliste servade nooleotsad {#concentrate-true-opposing-edge-arrowheads}

Kui `concentrate=true` liidab antiparalleelse paari (`A->B; B->A`) üheks
ellujäänud serva, peab see serv joonistama nooleotsa **mõlemasse** otsa. See on nüüd
portitud (`arrow_flags`-i `conc_opp_flag` haru; vt
`src/common/splines-clip.ts:arrowFlags`), seega `graphs-b135`, `167` ja `2087`
ühtivad (puuduva nooleotsa `element-count` erinevus ja selle lõikamata splaini
`@d` kõrvalmõju on mõlemad kadunud).

Mõnel concentrate graafil **säilib eraldi, varem olemasolev jääk**, mida
nooleotsa parandus **ei** käsitle — see on sõlme **x-koordinaadi** positsiooni
delta (x-võrgusimpleks / kompassiport), mitte nooleotsa viga:

- **`graphs-b15`, `graphs-b69`** — suured record/klastri „lifti“ graafid.
  Concentrate aktiveerub ja liidab õigesti; jääk on ~1pt sõlme-x delta,
  mis võimendub `element-count`/splaini `@d` erinevuseks. Nooleotsa
  väljastus ise on nüüd õige (b69 saab oma puuduvad nooleotsa hulknurgad). Vt
  agendi märget `b69-concentrate-undermerge` x-koordinaadi algpõhjuse kohta.
- **`1453`** — lahkneb endiselt ülataseme `element-count` põhjusel, mis ei seostu
  conc_opp_flag nooleotsaga.
- **`2825`** — selle nooleotsa parandamise ajal lahknes ülataseme
  `element-count` põhjusel, mis ei seostunud conc_opp_flag-iga (seal ei
  käivitu vastassuunalise paari liitmist); sellest ajast suletud
  fix-2825-rebuild-vlists missiooniga, vt A4 ülal.

Need on jälgitavad x-koordinaadi / struktuurilised kirjed, **mitte** nooleotsa vead.

### Paigutusustavuse lüngad 2.0 ustavusmissioonist (neato, sfdp, fdp, twopi, circo) {#layout-fidelity-gaps-from-the-2-0-fidelity-mission-neato-sfdp-fdp-twopi-circo}

2.0 ustavusmissioon pani portimata atribuudiväärtused valjusti ebaõnnestuma (vt
`UNSUPPORTED_FEATURE` tabelit jaotises
[Vead ja erandid](https://github.com/knowvah/dot-engine/blob/main/docs-site/guide/errors.md)).
See jättis alles järgmised, mis on registreeritud failis `plans/v2-fidelity/decision-journal.md`.

**Valjult, portimata.** `overlap=voronoi` kattuvate sõlmedega viskab endiselt
`UNSUPPORTED_FEATURE` mootorites neato, twopi, circo ja sfdp: Voronoi korrigeerija
ise (`vAdjust`-i algoritm) ei ole portitud. Kattuvuse test, mis otsustab,
kas visata, on C enda (`countOverlap` `poly.c` sõlmehulknurkade üle).

**Teadaolevad lüngad, endiselt vaikivad.** Port renderdab need ilma veata ja
erineb natiivsest Graphvizist. Leitud missiooniga `v2-silent-gaps`
(`plans/v2-silent-gaps/decision-journal.md`); mitte aktsepteeritud deltad.

- **`getAdjustMode`-i hoiatust „Unrecognized overlap value“ ei väljastata.**
- **Pööratud hulknurga tipud võivad natiivsest viimastes bittides erineda
  (taandamatu: hostiteegi matemaatikateek).** `poly_init` orienteerib iga tipu
  `atan2`, `hypot`, `sin` ja `cos` abil. Bitiliselt identsete sisendite korral tagastavad macOS-i libm ja
  V8 erinevad viimased bitid (nt `atan2(0x3fd6a09e667f3bce,
  0xbfd6a09e667f3bca)`: libm `…21d1`, V8 `…21d2`; `hypot` järgmisel tipul:
  libm `…fffd`, V8 `…fffe`), seega saab kast, mille `orientation=20`, tipu y
  `-18` pordis ja `-17.999999999999996` natiivselt. Natiivne Graphviz ise
  varieerub platvormi libm-i järgi ja brauser ei saa seda kutsuda. Pordi enda
  aritmeetika ühtib C-ga (`RADIANS` järjekord fikseeritud; 776 valimisse võetud 1664 tipu
  koordinaadist on bitiliselt identsed, ülejäänud erinevad ainult libm-i kaudu). Mõju:
  täpse puute `polyOverlap` hinnangud võivad ümber lülituda; natiivsete tippudega
  ühtib iga hinnang.
- **sfdp võib macOS-is natiivsest erineda (taandamatu: hosti libm `pow`).**
  Diagnoositud instrumenteeritud natiivse sfdp-ga: positsioonid jäävad bitiliselt identseks,
  kuni üks tõukejõu liige, `pow(dist, 1 - p)` (`spring_electrical.c`,
  `p = -1`, seega `pow(x, 2)`), tagastab macOS-i libm-ist 1 ulp vähem kui `x*x`
  (`pow(1.4116727416983157, 2)`: libm `1.9928199296540394`, korrektselt ümardatud
  `…396`; macOS-is `pow(v, 2) != v*v` 20 korral 16201 valimisse võetud `v` hulgast). See muudab
  iteratsiooni `Fnorm`-i viimases bitis; sfdp adaptiivne jahutus võimendab selle
  erinevaks (sageli peegeldatud) paigutuseks. Pordi `armPow` on ARM-i
  optimized-routines `pow` (glibc ≥ 2.28), st see, mida Linuxi Graphviz arvutab;
  macOS-i oraakel on erand. Välistatud: külvamine (selgesõnalised `start=` väärtused
  ühtivad), `pcp_rotate` (sama sisend annab sama väljundi), positsioonid ja
  tõmbeliige (bitiliselt identsed). Näide: üksik kolmnurk `a--b; a--c; b--c`
  vaikimisi seemnega.
- **fdp võib natiivsest erineda hosti libm `cos`/`sin` kaudu.** fdp järgib
  Graphvizi pärast 15.0.0 (hypot-kauguse tõuge, `Mlimit`), hosti
  libm-i `hypot` reprodutseeritud bitthaaval (`src/common/libm-hypot.ts`, 0
  mittevastavust 400k valimil). 251 252-st fdp-ga renderdatavast golden-sisendist
  ühtib natiivse ehitusega täpselt; ülejäänu
  (`parallel-cluster-ldbxtried`) paigutab klastri pordisõlmed
  `T_Wd * cos(alpha)` abil, ja macOS-i libm `cos(-2.3840764867756761)` on 1 ulp
  V8 `Math.cos`-ist; fdp jõutsükkel võimendab selle umbes 3 tollini. Apple'i
  `cos` ei ole lühikesest mudelist reprodutseeritav nii nagu `hypot`.
- **Natiivsed krahhid, mille port määratleb.** Natiivne Graphviz väljub koodiga 139 neato
  `mode=KK` korral `model=mds`-iga ja serva `len`-iga (`mds_model` indekseerib `GD_dist`
  1-põhise järjenumbriga: kuhja ülevool), ja `model=circuit` korral
  mitteseotud graafiga. Port jätab esimesel juhul vahemikust väljas olevad lahtrid maha ja
  langeb teisel juhul tagasi lühimatele teedele; natiivset väljundit, millega
  võrrelda, pole.

---

## Tahtlikult portimata (mitte-eesmärgid) {#intentionally-not-ported-non-goals}

Need on tahtlikud ulatuse piirid, mitte vead. Teek sihib **SVG-d**
(pluss `json` / `xdot` / `dot` / imagemap vahetekstivorminguid).

- **Muud väljundvormingud.** Rasteri (PNG/JPG/GIF/WebP/BMP), PostScripti/PDF/EPS
  ja GUI/interaktiivsed taustaprogrammid on ulatusest väljas. Kasutage SVG väljundit ja konverteerige
  allavoolu, kui vajate rasterit.
- **`page=` lehekülgedeks jaotamine SVG jaoks.** Natiivne `dot` ei jaota SVG-d samuti lehekülgedeks (SVG
  seade ei sea lehekülgede lippu), seega on `page=` sellel teel mõlemas
  teostuses tühitoiming — dokumenteeritud siin ainult seetõttu, et see on levinud
  segaduskoht.
- **`-Tplain` tekstiväljund.** Edasi lükatud (ustav tekstivorming), mitte välistatud.
- **`gvpr`** (graafitöötluse skriptikeel) — ulatusest väljas.
- **C++ mugavusümbrised** (`cgraph++`, `gvc++`) — C API on portitud
  esimesena; idiomaatiline TypeScripti mugavuskiht, kui soovitakse, oleks
  eraldi pakett.
- **`fontnames=svg|ps` brauseri tekstimõõtmises.** Brauseris ehitab
  lõuendimõõtja oma fondi PostScripti aliase
  `fontnames=native` perekonnaloendist (`Times-Roman` → `Times, serif`), sama
  näo, mida SVG väljastaja vaikimisi renderdab. `TextMeasurer` ei kanna
  graafi konteksti, seega mõõdetakse graafe, mis seavad `fontnames=svg` või `fontnames=ps`,
  natiivse loendi vastu, samas kui SVG nimetab svg/ps perekonna. Aliasekaalud,
  mida CSS ei defineeri (`book`, `demi`, `light`, `medium`, `roman`),
  väljastatakse sõna-sõnalt, nagu C-s; brauserid ignoreerivad neid ja renderdavad tavalise
  kaaluga, ning mõõtja mõõdab sobitamiseks tavalist kaalu. Node'i väljundit
  see ei mõjuta (see ei kasuta kunagi lõuendimõõtjat).
- **Ainult natiivsed mehhanismid**, mis on asendatud brauseriturvaliste vastetega: dünaamiline
  pluginate laadimine (`dlopen`) on asendatud staatilise mootori/renderdaja registreerimisega;
  failisüsteemi lugemised (fondid, pildid, konfiguratsioon) on asendatud kutsuja antud
  tagasikutsetega (nt `setImageSizer`). Käitumine säilib; mehhanism erineb.

---

## Erinevusest teatamine {#reporting-a-divergence}

Kui leiate väljundi, mis erineb C-st ja **ei ole** ülaltoodud aktsepteeritud delta,
ei ole failis `PARITY-dot.md` ega ole mitte-eesmärk, siis on see teatamist väärt viga — C
lähtekood on spetsifikatsioon ja loetlemata erinevusi käsitletakse vigadena, mitte
aktsepteeritud käitumisena.
