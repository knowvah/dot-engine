---
sourceHash: 9c653332a94ce7180323ec7cd584987db329e4217af01dd06692e410c0c22a8c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Överensstämmelse: vad ”matchar” betyder {#conformance-what-match-means}

@knowvah/dot-engine valideras mot den kanoniska C-binären för Graphviz som orakel.
När det här projektet säger att en graf **matchar** C — paritetsutlåtandet
som heter `conformant` — menas en bestämd, mekaniskt kontrollerad egenskap,
**inte** bokstavlig byte-för-byte-likhet hos SVG-texten.

> **Definition.** En rendering från porteringen är **konform** med orakelrenderingen när,
> efter att båda SVG-filerna har tolkats till ett normaliserat elementträd:
>
> 1. varje **numeriskt** värde (koordinater, banddata, `points`, `viewBox`,
>    `transform`-parametrar) stämmer med oraklet inom en fast
>    **tolerans**, och
> 2. varje **icke-numeriskt** värde (taggnamn, färger, textinnehåll,
>    attributnycklar, uppräknade attributvärden) är **exakt lika**.
>
> Om något numeriskt värde överskrider toleransen, eller något icke-numeriskt värde
> skiljer sig, är renderingen **inte** konform.

## Varför inte bokstavliga byte? {#why-not-literal-bytes}

SVG serialiserar flyttalskoordinater som decimaltext. Två renderingar som är
matematiskt ekvivalenta kan ändå skilja sig i den sista utskrivna siffran på grund av
IEEE-754-avrundning, ordningen på flyttalsoperationerna och plattformsberoende
`libm`-/FMA-beteende som varierar mellan processorer och JS-motorer. Ett bokstavligt
byte-krav vore därför **otestbart** över de körmiljöer som det här biblioteket riktar sig
till (webbläsare, Node, olika processorer), snarare än bara strikt. Överensstämmelsen
låser fast den egenskap som faktiskt spelar roll — den geometri och det innehåll som en
betraktare ser — vid en gräns som är tillräckligt liten för att vara omärkbar.

## Den exakta toleransen {#the-exact-tolerance}

Toleransen gäller **per motorklass** och är definierad i
[`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts):

| Klass | Tolerans (pt) | Motorer |
|---|---:|---|
| `deterministic` | **±0.01** | `dot`, `circo`, `twopi`, `osage`, `patchwork` |
| `iterative` | **±0.5** | `neato`, `fdp`, `sfdp` |

De deterministiska motorerna återger C:s heltals-/utskrivna koordinater i praktiken
exakt, så ±0.01 fångar bara upp brus från decimalformateringen. De iterativa
(kraftbaserade) motorerna beror på transcendenta funktioner vars resultat i sista biten
inte går att reproducera mellan plattformar, så de har en lösare gräns och kontrolleras
dessutom för **strukturell** likhet (samma elementträd).

En reservation för ytan **plain/plain-ext**: plain skriver ut koordinater i tum med
5 signifikanta siffror (`%.5g`), så vid storleksordningar ≥ 100 är utskriftskvantumet
(0.01) lika med toleransen ±0.01. På mycket stora grafer skrivs en layoutskillnad under
en ULP som råkar ligga över en avrundningsgräns för den femte siffran ut som ett helt
0.01-steg och flaggas, trots att den underliggande geometrin är identisk till ~1e-11 pt
(se circo-godkännandet `2108`, journal 2026-07-28). Ytorna xdot/json, som skriver ut i
punkter, är den auktoritativa geometrijämförelsen i det intervallet.

**Paritetsundersökningen av korpusen** utvärderar varje graf i läget `deterministic`
(±0.01) oavsett motor — se
[`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
(`diffVerdict` → `compareSvg(port, oracle, 'deterministic')`).

## Läs koden {#read-the-code}

Definitionen ovan är inget önsketänkande i prosaform — den är exakt vad
jämförelsekoden gör. Så här kan du kontrollera det själv:

- [`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts)
  — `TOLERANCES` (tabellen ±0.01 / ±0.5) och `compareSvg`, som går igenom de två
  normaliserade träden och tillämpar regel (1) numeriskt-inom-tolerans och
  regel (2) icke-numeriskt-exakt, attribut för attribut.
- [`test/golden/normalize.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/normalize.ts)
  — hur rå SVG tolkas till det jämförbara elementträdet.
- [`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
  — `diffVerdict`, som tilldelar ett av utlåtandena nedan. `survey.ts` täcker bara
  `dot`-spåret för SVG.
- [`test/corpus/engine-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/engine-walk.ts)
  — undersökningen av **xdot** per motor (`npx tsx test/corpus/engine-walk.ts <engine>`),
  som tillämpar samma klassuppdelning som tabellen ovan
  (`TOLERANCE = 0.5` för `neato`/`fdp`/`sfdp`, `0.01` för alla andra motorer)
  och jämför semantiska strömmar av ritoperationer (`compareXdot`) i stället för SVG. Så
  mäts spåren `circo`/`twopi`/`osage`/`patchwork`/`neato`/`fdp`/`sfdp`; `dot`s
  eget xdot-spår använder systerverktyget
  [`xdot-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/xdot-walk.ts).

## Utlåtandena {#the-verdicts}

Undersökningen tilldelar varje graf exakt ett utlåtande. Aktuella antal per spår:
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)
sammanfattar varje spår av motor × yta (både deterministiska och iterativa);
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
är SVG-instrumentpanelen för `dot`, och varje annan motor har bredvid den i
`test/corpus/` sin egen panel `PARITY-<engine>.md`:

| Utlåtande | Betydelse |
|---|---|
| **`conformant`** | Matchar oraklet enligt definitionen ovan (numeriskt inom toleransen, icke-numeriskt exakt). |
| **`structural-match`** | Samma elementträd, men ett eller flera numeriska värden överskrider toleransen. |
| **`diverged`** | Elementträden skiljer sig åt (ett saknat/extra element eller en icke-numerisk avvikelse). |
| **`errored` / `timeout`** | Porteringen kunde inte rendera indatan (`errored`; `port-error` i spåren per motor) eller överskred sin tidsbudget (`timeout`). Räknas som ett misslyckande: ingår i nämnaren för godkännandegraden, aldrig som godkänd. |
| **`oracle-error`** | C-oraklet kunde inte rendera indatan, så det finns ingen referens att jämföra mot. Utanför omfånget: utesluten ur nämnaren för godkännandegraden. |

**Godkändandegraden** på varje instrumentpanel är `conformant / (surveyed − oracle-error)`.

”Conformant” är ribban; ”structural-match” är betydande framsteg (rätt form,
koordinaterna driver fortfarande); ”diverged”, ”errored” och ”timeout” är verkliga luckor.
Inget av detta är ett påstående om byte-lika utdata.

Vissa grafer har **inget utlåtande alls** för en viss motor: se
*motoruteslutningar* nedan.

### Motoruteslutningar {#engine-exclusions}

Ett uteslutet par (graf, motor) gås inte igenom, så det är varken konformt eller
avvikande — det mäts helt enkelt inte där. Det skiljer sig från en godkänd avvikelse,
där jämförelsen *gjordes* och skillnaden förlåts med en dokumenterad orsak.

Ribban ligger medvetet högt, eftersom en ogranskad graf som lämnas därhän är ett
täckningshål och inte en känd kostnad. En post kräver alla tre villkoren: motorns
algoritm kan bevisligen inte komma till användning på indatan, att hoppa över den sparar
verklig tid, och samma beteende är verifierat på ett billigare spår. Att vara *långsam*
räcker uttryckligen inte — ett dåligt förhållande mellan portering och orakel är precis
så en verklig prestandabrist ser ut, och att utesluta på den grunden skulle dölja just
det som korpusen finns till för.

Varje uteslutning är listad med sin mekanism i
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md#engine-exclusions);
registret är `test/corpus/engine-exclusions.json`. Det motiverande fallet är
`2222`, som deklarerar 28 303 noder och inga kanter: eftersom det inte finns något att
relatera delegerar varje kraftbaserad och radiell motor till den gemensamma
komponentpackaren, och ingen av deras egna algoritmer körs — vilket bekräftas av att
deras orakelutdata är byte-identiska. `dot` tar en annan väg och täcker det konformt på
sex sekunder.
