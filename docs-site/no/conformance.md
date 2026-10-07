---
sourceHash: 9c653332a94ce7180323ec7cd584987db329e4217af01dd06692e410c0c22a8c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Samsvar: hva «samsvarer» betyr {#conformance-what-match-means}

@knowvah/dot-engine valideres mot den kanoniske C-Graphviz-binærfilen som orakel.
Når dette prosjektet sier at en graf **samsvarer** med C — paritetsdommen som
heter `conformant` — betyr det en bestemt, mekanisk kontrollert egenskap, **ikke**
bokstavelig byte-for-byte-likhet i SVG-teksten.

> **Definisjon.** En port-rendering er **samsvarende** (conformant) med orakelets rendering når,
> etter at begge SVG-ene er parset til et normalisert elementtre:
>
> 1. hver **numeriske** verdi (koordinater, banedata, `points`, `viewBox`,
>    `transform`-parametere) stemmer med orakelet innenfor en fast
>    **toleranse**, og
> 2. hver **ikke-numeriske** verdi (tagnavn, farger, tekstinnhold, attributtnøkler,
>    oppregnede attributtverdier) er **nøyaktig lik**.
>
> Hvis en numerisk verdi overskrider toleransen, eller en ikke-numerisk verdi
> avviker, er renderingen **ikke** samsvarende.

## Hvorfor ikke bokstavelige byte? {#why-not-literal-bytes}

SVG serialiserer flyttallskoordinater som desimaltekst. To renderinger som er
matematisk ekvivalente, kan likevel avvike i det siste utskrevne sifferet på grunn av
IEEE-754-avrunding, rekkefølgen på flyttallsoperasjonene og plattformavhengig
`libm`-/FMA-oppførsel som varierer med CPU og JS-motor. Et bokstavelig bytekrav
ville derfor vært **umulig å teste** på tvers av kjøretidene dette biblioteket
retter seg mot (nettlesere, Node, ulike CPU-er), snarere enn bare strengt. Samsvar
fastsetter egenskapen som faktisk betyr noe — geometrien og innholdet en betrakter
ser — til en grense som er liten nok til å ligge under persepsjonsterskelen.

## Den nøyaktige toleransen {#the-exact-tolerance}

Toleransen gjelder **per motorklasse** og er definert i
[`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts):

| Klasse | Toleranse (pt) | Motorer |
|---|---:|---|
| `deterministic` | **±0.01** | `dot`, `circo`, `twopi`, `osage`, `patchwork` |
| `iterative` | **±0.5** | `neato`, `fdp`, `sfdp` |

De deterministiske motorene gjengir Cs heltalls-/utskrevne koordinater i praksis
nøyaktig, slik at ±0.01 bare tar opp desimalformateringsstøy. De iterative
(kraftbaserte) motorene avhenger av transcendente funksjoner hvis resultater i siste
bit ikke kan reproduseres på tvers av plattformer, så de har en løsere grense og
kontrolleres i tillegg for **strukturell** likhet (samme elementtre).

Ett forbehold for **plain/plain-ext**-flaten: plain skriver koordinater i tommer
med 5 gjeldende siffer (`%.5g`), slik at for størrelser ≥ 100 er utskriftskvantet
(0.01) lik toleransen på ±0.01. På svært store grafer skrives en layoutforskjell
under én ULP som tilfeldigvis ligger på tvers av en avrundingsgrense i 5. siffer, ut som et
helt 0.01-steg og flagges, selv om den underliggende geometrien er identisk til
~1e-11 pt (se circo-godkjenningen `2108`, journal 2026-07-28). Flatene xdot/json,
som skriver i punkter, er det autoritative geometrisammenlignende grunnlaget i
dette området.

Den **korpusomfattende paritetsundersøkelsen** evaluerer hver graf i modusen `deterministic`
(±0.01) uavhengig av motor — se
[`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
(`diffVerdict` → `compareSvg(port, oracle, 'deterministic')`).

## Les koden {#read-the-code}

Definisjonen ovenfor er ikke prosa-ambisjon — den er nøyaktig det
sammenligningskoden gjør. Slik kan du kontrollere det selv:

- [`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts)
  — `TOLERANCES` (tabellen ±0.01 / ±0.5) og `compareSvg`, som går gjennom de to
  normaliserte trærne og anvender regel (1) numerisk-innenfor-toleranse og regel (2)
  ikke-numerisk-nøyaktig attributt for attributt.
- [`test/golden/normalize.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/normalize.ts)
  — hvordan rå SVG parses til det sammenlignbare elementtreet.
- [`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
  — `diffVerdict`, som tildeler én av dommene nedenfor. `survey.ts` dekker bare
  `dot`-SVG-sporet.
- [`test/corpus/engine-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/engine-walk.ts)
  — **xdot**-undersøkelsen per motor (`npx tsx test/corpus/engine-walk.ts <engine>`),
  som anvender samme klasseinndeling som tabellen ovenfor
  (`TOLERANCE = 0.5` for `neato`/`fdp`/`sfdp`, `0.01` for alle andre motorer)
  og sammenligner semantiske strømmer av tegneoperasjoner (`compareXdot`) i stedet for SVG. Slik
  måles sporene `circo`/`twopi`/`osage`/`patchwork`/`neato`/`fdp`/`sfdp`; `dot`s
  eget xdot-spor bruker søsterverktøyet
  [`xdot-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/xdot-walk.ts).

## Dommene {#the-verdicts}

Undersøkelsen gir hver graf nøyaktig én dom. Gjeldende tall per spor:
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)
oppsummerer hvert spor av motor × flate (både deterministiske og iterative);
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
er SVG-dashbordet for `dot`, og hver av de andre motorene har sitt eget
dashbord `PARITY-<engine>.md` ved siden av i `test/corpus/`:

| Dom | Betydning |
|---|---|
| **`conformant`** | Samsvarer med orakelet etter definisjonen ovenfor (numerisk innenfor toleransen, ikke-numerisk nøyaktig). |
| **`structural-match`** | Samme elementtre, men én eller flere numeriske verdier overskrider toleransen. |
| **`diverged`** | Elementtrærne er forskjellige (et manglende/ekstra element eller et ikke-numerisk avvik). |
| **`errored` / `timeout`** | Porten klarte ikke å rendere inndataene (`errored`; `port-error` på sporene per motor) eller oversteg tidsbudsjettet (`timeout`). Regnes som en feil: telles med i nevneren for beståttandelen, aldri som bestått. |
| **`oracle-error`** | C-orakelet klarte ikke å rendere inndataene, så det finnes ingen referanse å sammenligne mot. Utenfor omfang: utelatt fra nevneren for beståttandelen. |

**Beståttandel** på hvert dashbord er `conformant / (surveyed − oracle-error)`.

«Conformant» er målet; «structural-match» er meningsfylt fremgang (riktig form,
koordinatene driver fortsatt); «diverged», «errored» og «timeout» er reelle hull.
Ingen av dem er en påstand om byte-for-byte-lik utdata.

Noen grafer har **ingen dom i det hele tatt** for en gitt motor: se
*motorunntak* nedenfor.

### Motorunntak {#engine-exclusions}

Et utelatt par (graf, motor) gjennomløpes ikke, og er derfor verken samsvarende
eller avvikende — det måles rett og slett ikke der. Dette er noe annet enn et
godkjent avvik, der sammenligningen *ble* gjort og forskjellen tilgis med en
dokumentert årsak.

Terskelen er bevisst høy, fordi en uundersøkt graf er et dekningshull
og ikke en kjent kostnad. En oppføring krever alle tre: motorens algoritme
kan beviselig ikke komme til anvendelse på inndataene, å hoppe over den sparer reell tid,
og samme oppførsel er verifisert på et rimeligere spor. Å være *treg* er uttrykkelig ikke
nok — et dårlig forhold mellom port og orakel er nettopp hvordan en ekte
ytelsesfeil ser ut, og å utelate på det grunnlaget ville skjule akkurat det
korpuset er til for.

Hvert unntak er oppført med sin mekanisme i
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md#engine-exclusions);
registeret er `test/corpus/engine-exclusions.json`. Det motiverende tilfellet er
`2222`, som deklarerer 28 303 noder og ingen kanter: siden det ikke finnes noe å
relatere, delegerer alle kraftbaserte og radiale motorer til den felles
komponentpakkeren, og ingen av deres egne algoritmer kjøres — bekreftet av at
orakelutdataene deres er byte-identiske. `dot` tar en annen vei og dekker det samsvarende på
seks sekunder.
