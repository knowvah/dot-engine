---
sourceHash: 9c653332a94ce7180323ec7cd584987db329e4217af01dd06692e410c0c22a8c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Vastavus: mida tähendab „vaste“ {#conformance-what-match-means}

@knowvah/dot-engine'i valideeritakse oraakliks oleva kanoonilise C-Graphvizi binaari vastu.
Kui see projekt ütleb, et graaf **ühtib** C-ga — paarsushinnang nimega `conformant` —, siis
mõeldakse konkreetset, mehaaniliselt kontrollitavat omadust, **mitte** SVG-teksti sõna-sõnalist
bait-baidi-võrdsust.

> **Definitsioon.** Pordi renderdus on oraakli renderdusega **vastav**, kui pärast mõlema
> SVG sõelumist normaliseeritud elemendipuuks:
>
> 1. iga **arvuline** väärtus (koordinaadid, tee andmed, `points`, `viewBox`,
>    `transform`-parameetrid) langeb kokku oraakliga kindlaksmääratud **tolerantsi** piires
>    ning
> 2. iga **mittearvuline** väärtus (siltide nimed, värvid, tekstisisu,
>    atribuudivõtmed, loendatavad atribuudiväärtused) on **täpselt võrdne**.
>
> Kui mõni arvuline väärtus ületab tolerantsi või mõni mittearvuline väärtus erineb,
> **ei** ole renderdus vastav.

## Miks mitte sõna-sõnalised baidid? {#why-not-literal-bytes}

SVG serialiseerib ujukomakoordinaadid kümnendtekstina. Kaks matemaatiliselt samaväärset
renderdust võivad siiski erineda viimase trükitud numbri poolest, kuna IEEE-754 ümardamine,
ujukomatehete järjekord ning platvormist sõltuv `libm`-i/FMA käitumine varieeruvad
protsessori ja JS-mootori lõikes. Sõna-sõnaline baidinõue oleks seetõttu käitusaegadel, mida
see teek sihib (brauserid, Node, erinevad protsessorid), mitte pelgalt range, vaid
**testimatu**. Vastavus kinnistab omaduse, mis tegelikult loeb — geomeetria ja sisu, mida
vaataja näeb — piirini, mis on piisavalt väike, et olla tajumatu.

## Täpne tolerants {#the-exact-tolerance}

Tolerants on **mootoriklassi kohta** ja on määratletud failis
[`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts):

| Klass | Tolerants (pt) | Mootorid |
|---|---:|---|
| `deterministic` | **±0.01** | `dot`, `circo`, `twopi`, `osage`, `patchwork` |
| `iterative` | **±0.5** | `neato`, `fdp`, `sfdp` |

Deterministlikud mootorid reprodutseerivad C täisarvulised/trükitud koordinaadid sisuliselt
täpselt, nii et ±0.01 neelab ainult kümnendvormingu müra. Iteratiivsed
(jõupõhised) mootorid sõltuvad transtsendentsetest funktsioonidest, mille viimase biti
tulemused ei ole platvormide vahel reprodutseeritavad, seega on neil lõdvem piir ja neid
kontrollitakse lisaks **struktuurilise** võrdsuse suhtes (sama elemendipuu).

Üks reservatsioon **plain/plain-ext** pinna kohta: plain trükib koordinaadid tollides
5 olulise numbriga (`%.5g`), nii et suurusjärkudes ≥ 100 on trüki kvant
(0.01) võrdne ±0.01 tolerantsiga. Väga suurte graafide puhul trükitakse ULP-st väiksem
paigutuse erinevus, mis juhtub ületama 5. numbri ümardamispiiri, täieliku
0.01 sammuna ja märgitakse lipuga, kuigi aluseks olev geomeetria on
~1e-11 pt täpsusega identne (vt circo `2108` aktsepteerimist,
päevik 2026-07-28). Punktides trükkivad xdot/json-pinnad on selles vahemikus
autoriteetne geomeetriavõrdlus.

**Korpuse paarsusuuring** hindab iga graafi režiimis `deterministic`
(±0.01), olenemata mootorist — vt
[`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
(`diffVerdict` → `compareSvg(port, oracle, 'deterministic')`).

## Lugege koodi {#read-the-code}

Ülaltoodud definitsioon ei ole proosaline lootus — see on täpselt see, mida
võrdluskood teeb. Ise kontrollimiseks:

- [`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts)
  — `TOLERANCES` (tabel ±0.01 / ±0.5) ja `compareSvg`, mis läbib kaks
  normaliseeritud puud ning rakendab reeglit (1) arvuline-tolerantsi-piires ja
  reeglit (2) mittearvuline-täpne atribuut atribuudi haaval.
- [`test/golden/normalize.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/normalize.ts)
  — kuidas toor-SVG sõelutakse võrreldavaks elemendipuuks.
- [`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
  — `diffVerdict`, mis omistab ühe allpool toodud hinnangutest. `survey.ts` katab
  ainult `dot` SVG-rada.
- [`test/corpus/engine-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/engine-walk.ts)
  — mootoripõhine **xdot**-uuring (`npx tsx test/corpus/engine-walk.ts <engine>`),
  mis rakendab sama klassijaotust kui ülaltoodud tabel
  (`TOLERANCE = 0.5` mootoritele `neato`/`fdp`/`sfdp`, `0.01` kõigile teistele mootoritele)
  ning võrdleb SVG asemel semantilisi joonistusoperatsioonide jadasid (`compareXdot`). Nii
  mõõdetakse rajad `circo`/`twopi`/`osage`/`patchwork`/`neato`/`fdp`/`sfdp`; `dot`-i enda
  xdot-rada kasutab sõsarfaili
  [`xdot-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/xdot-walk.ts).

## Hinnangud {#the-verdicts}

Uuring omistab igale graafile täpselt ühe hinnangu. Jooksvad arvud raja kohta:
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)
võtab kokku iga raja mootor × pind (nii deterministlikud kui ka iteratiivsed);
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
on `dot`-i SVG töölaud ja igal teisel mootoril on selle kõrval kaustas `test/corpus/` oma
töölaud `PARITY-<engine>.md`:

| Hinnang | Tähendus |
|---|---|
| **`conformant`** | Ühtib oraakliga ülaltoodud definitsiooni kohaselt (arvuline tolerantsi piires, mittearvuline täpne). |
| **`structural-match`** | Sama elemendipuu, kuid üks või mitu arvulist väärtust ületab tolerantsi. |
| **`diverged`** | Elemendipuud erinevad (puuduv/lisaelement või mittearvuline lahknevus). |
| **`errored` / `timeout`** | Port ei suutnud sisendit renderdada (`errored`; mootoripõhistel radadel `port-error`) või ületas oma ajaeelarve (`timeout`). Arvestatakse läbikukkumisena: läheb läbimismäära nimetajasse, mitte kunagi läbituna. |
| **`oracle-error`** | C-oraakel ei suutnud sisendit renderdada, seega pole millegagi võrrelda. Ulatusest väljas: jäetakse läbimismäära nimetajast välja. |

**Läbimismäär** igal töölaual on `conformant / (surveyed − oracle-error)`.

„Conformant“ on mõõdupuu; „structural-match“ on tähenduslik edasiminek (õige kuju,
koordinaadid veel triivivad); „diverged“, „errored“ ja „timeout“ on tegelikud lüngad.
Ükski neist ei väida bait-baidilt võrdset väljundit.

Mõne graafi puhul ei ole konkreetse mootori korral **hinnangut üldse**: vt
*mootorite välistused* allpool.

### Mootorite välistused {#engine-exclusions}

Välistatud paari (graaf, mootor) ei läbita, seega pole see ei vastav ega
erinev — seda lihtsalt ei mõõdeta seal. See erineb aktsepteeritud erinevusest, kus võrdlus
*toimus* ja erinevus andestatakse dokumenteeritud põhjusega.

Latt on tahtlikult kõrge, sest uurimata graaf on katvuse auk,
mitte teadaolev kulu. Kirje nõuab kõiki kolme tingimust: mootori algoritm
ei saa sisendi puhul tõendatult rakenduda, vahelejätmine säästab päriselt
aega ja sama käitumine on kontrollitud odavamal rajal. *Aeglane* olemine
ei piisa sõnaselgelt — halb pordi/oraakli suhe on täpselt see,
milline näeb välja päris jõudlusviga, ja selle põhjal välistamine varjaks just selle,
milleks korpus on olemas.

Iga välistus on mehhanismiga loetletud failis
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md#engine-exclusions);
register on `test/corpus/engine-exclusions.json`. Motiveeriv juhtum on
`2222`, mis deklareerib 28 303 sõlme ja mitte ühtegi serva: kuna pole millegi vahel seoseid
luua, delegeerivad kõik jõupõhised ja radiaalsed mootorid ühisele
komponendipakkijale ning ükski nende enda algoritm ei jookse — seda kinnitab, et
nende oraakli väljundid on bait-baidilt identsed. `dot` kasutab teist teed ja katab selle vastavalt
kuue sekundiga.
