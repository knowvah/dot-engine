---
sourceHash: 9c653332a94ce7180323ec7cd584987db329e4217af01dd06692e410c0c22a8c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Overensstemmelse: hvad „match“ betyder {#conformance-what-match-means}

@knowvah/dot-engine valideres mod den kanoniske C-Graphviz-binær som orakel.
Når dette projekt siger, at en graf **matcher** C — paritetsdommen med navnet
`conformant` — betyder det en bestemt, mekanisk kontrolleret egenskab, **ikke**
bogstavelig byte-for-byte-lighed i SVG-teksten.

> **Definition.** En port-rendering er **conformant** med orakel-renderingen, når
> begge SVG'er er parset til et normaliseret elementtræ, og:
>
> 1. hver **numerisk** værdi (koordinater, stidata, `points`, `viewBox`,
>    `transform`-parametre) stemmer med oraklet inden for en fast **tolerance**, og
> 2. hver **ikke-numerisk** værdi (tagnavne, farver, tekstindhold,
>    attributnøgler, opregnede attributværdier) er **nøjagtigt ens**.
>
> Hvis en numerisk værdi overskrider tolerancen, eller en ikke-numerisk værdi
> afviger, er renderingen **ikke** conformant.

## Hvorfor ikke bogstavelige bytes? {#why-not-literal-bytes}

SVG serialiserer kommatalskoordinater som decimaltekst. To renderinger, der er
matematisk ækvivalente, kan alligevel afvige i det sidste udskrevne ciffer på grund af
IEEE-754-afrunding, rækkefølgen af kommatalsoperationer og platformsafhængig
`libm`-/FMA-adfærd, der varierer med CPU og JS-motor. Et bogstaveligt byte-krav
ville derfor være **utestbart** på tværs af de kørselsmiljøer, dette bibliotek
retter sig mod (browsere, Node, forskellige CPU'er), og ikke blot strengt.
Overensstemmelse fastlægger den egenskab, der faktisk har betydning — den geometri og det
indhold, en betragter ser — inden for en grænse, der er lille nok til at være
umærkelig.

## Den præcise tolerance {#the-exact-tolerance}

Tolerancen gælder **pr. motorklasse** og er defineret i
[`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts):

| Klasse | Tolerance (pt) | Motorer |
|---|---:|---|
| `deterministic` | **±0.01** | `dot`, `circo`, `twopi`, `osage`, `patchwork` |
| `iterative` | **±0.5** | `neato`, `fdp`, `sfdp` |

De deterministiske motorer gengiver C's heltals-/udskrevne koordinater i det væsentlige
nøjagtigt, så ±0.01 absorberer kun støj fra decimalformateringen. De iterative
(kraftbaserede) motorer afhænger af transcendente funktioner, hvis resultater i sidste bit
ikke kan reproduceres på tværs af platforme, så de har en løsere grænse og
kontrolleres desuden for **strukturel** lighed (samme elementtræ).

Ét forbehold for **plain/plain-ext**-fladen: plain udskriver koordinater i tommer
med 5 betydende cifre (`%.5g`), så ved størrelser ≥ 100 er udskrivningskvantet
(0.01) lig med tolerancen på ±0.01. På meget store grafer bliver en layoutforskel
under én ULP, der tilfældigvis ligger på tværs af en afrundingsgrænse i 5. ciffer,
udskrevet som et helt 0.01-trin og markeret, selv om den underliggende geometri er
identisk til ~1e-11 pt (se circo-accepten `2108`, journal 2026-07-28). Fladerne
xdot/json, som udskriver i point, er den autoritative geometrisammenligning i det
område.

**Korpussets paritetsundersøgelse** evaluerer hver graf i tilstanden `deterministic`
(±0.01) uanset motor — se
[`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
(`diffVerdict` → `compareSvg(port, oracle, 'deterministic')`).

## Læs koden {#read-the-code}

Definitionen ovenfor er ikke et prosaløfte — det er præcis det, sammenligningskoden
gør. Sådan kan du selv efterprøve det:

- [`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts)
  — `TOLERANCES` (tabellen ±0.01 / ±0.5) og `compareSvg`, som gennemløber de to
  normaliserede træer og anvender regel (1) numerisk-inden-for-tolerance og
  regel (2) ikke-numerisk-nøjagtig attribut for attribut.
- [`test/golden/normalize.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/normalize.ts)
  — hvordan rå SVG parses til det sammenlignelige elementtræ.
- [`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
  — `diffVerdict`, som tildeler en af dommene nedenfor. `survey.ts` dækker kun
  `dot`-SVG-sporet.
- [`test/corpus/engine-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/engine-walk.ts)
  — **xdot**-undersøgelsen pr. motor (`npx tsx test/corpus/engine-walk.ts <engine>`), som
  anvender samme klasseopdeling som tabellen ovenfor
  (`TOLERANCE = 0.5` for `neato`/`fdp`/`sfdp`, `0.01` for alle andre motorer)
  og sammenligner semantiske draw-op-strømme (`compareXdot`) i stedet for SVG. Sådan
  måles sporene `circo`/`twopi`/`osage`/`patchwork`/`neato`/`fdp`/`sfdp`; `dot`'s
  eget xdot-spor bruger søsterværktøjet
  [`xdot-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/xdot-walk.ts).

## Dommene {#the-verdicts}

Undersøgelsen tildeler hver graf præcis én dom. Aktuelle tal pr. spor:
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)
opsummerer hvert spor af motor × flade (både deterministiske og iterative);
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
er `dot`'s SVG-dashboard, og hver anden motor har sit eget
`PARITY-<engine>.md`-dashboard ved siden af i `test/corpus/`:

| Dom | Betydning |
|---|---|
| **`conformant`** | Matcher oraklet efter definitionen ovenfor (numerisk inden for tolerance, ikke-numerisk nøjagtigt). |
| **`structural-match`** | Samme elementtræ, men en eller flere numeriske værdier overskrider tolerancen. |
| **`diverged`** | Elementtræerne afviger (et manglende/ekstra element eller en ikke-numerisk afvigelse). |
| **`errored` / `timeout`** | Porten kunne ikke rendere inputtet (`errored`; `port-error` på sporene pr. motor) eller overskred sit tidsbudget (`timeout`). Tæller som en fiasko: indgår i nævneren for beståprocenten, aldrig som bestået. |
| **`oracle-error`** | C-oraklet kunne ikke rendere inputtet, så der er ingen reference at sammenligne med. Uden for omfanget: udeladt fra nævneren for beståprocenten. |

**Beståprocenten** på hvert dashboard er `conformant / (surveyed − oracle-error)`.

„Conformant“ er kravet; „structural-match“ er meningsfuldt fremskridt (rigtig form,
koordinaterne driver stadig); „diverged“, „errored“ og „timeout“ er reelle huller.
Intet af dette er en påstand om byte-for-byte-ens output.

Nogle grafer har **slet ingen dom** på en given motor: se
*motorudelukkelser* nedenfor.

### Motorudelukkelser {#engine-exclusions}

Et udelukket par (graf, motor) gennemløbes ikke, så det er hverken conformant eller
afvigende — det måles simpelthen ikke dér. Det er noget andet end en accepteret
afvigelse, hvor sammenligningen *blev* foretaget, og forskellen tilgives med en
dokumenteret årsag.

Kravet er bevidst højt, for en ukontrolleret graf er et dækningshul og
ikke en kendt omkostning. En post kræver alle tre betingelser: Motorens algoritme
kan beviseligt ikke gribe ind over for inputtet, springet over sparer reel tid,
og den samme adfærd er verificeret på et billigere spor. At være *langsom* er
udtrykkeligt ikke nok — et dårligt forhold mellem port og orakel er netop sådan en
ægte ydelsesfejl ser ud, og en udelukkelse på det grundlag ville skjule præcis det,
korpusset er til for.

Hver udelukkelse er anført med sin mekanisme i
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md#engine-exclusions);
registret er `test/corpus/engine-exclusions.json`. Det motiverende tilfælde er
`2222`, som erklærer 28.303 knuder og ingen kanter: Når der intet er at sætte i
forhold til hinanden, uddelegerer alle kraftbaserede og radiale motorer til den
fælles komponentpakker, og ingen af deres egne algoritmer kører — bekræftet ved, at
deres orakeloutput er byte-identiske. `dot` tager en anden vej og dækker det
conformant på seks sekunder.
