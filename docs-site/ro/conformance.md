---
sourceHash: 9c653332a94ce7180323ec7cd584987db329e4217af01dd06692e410c0c22a8c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Conformitate: ce înseamnă „potrivire” {#conformance-what-match-means}

@knowvah/dot-engine este validat în raport cu binarul C canonic Graphviz, folosit ca oracol.
Când acest proiect spune că un graf **se potrivește** cu C — verdictul de paritate numit
`conformant` —, se referă la o proprietate precisă, verificată mecanic, **nu** la egalitate
literală, octet cu octet, a textului SVG.

> **Definiție.** O randare a portării este **conformă** cu randarea oracolului atunci când,
> după ce ambele SVG-uri au fost analizate într-un arbore de elemente normalizat:
>
> 1. fiecare valoare **numerică** (coordonate, date de traseu, `points`, `viewBox`,
>    parametrii `transform`) coincide cu cea a oracolului în limita unei **toleranțe**
>    fixe și
> 2. fiecare valoare **nenumerică** (nume de etichete, culori, conținut text,
>    chei de atribut, valori enumerate de atribut) este **exact egală**.
>
> Dacă vreo valoare numerică depășește toleranța sau vreo valoare nenumerică diferă,
> randarea **nu** este conformă.

## De ce nu octeți literali? {#why-not-literal-bytes}

SVG serializează coordonatele în virgulă mobilă ca text zecimal. Două randări echivalente
din punct de vedere matematic pot totuși să difere la ultima cifră tipărită din cauza
rotunjirii IEEE-754, a ordinii operațiilor în virgulă mobilă și a comportamentului
`libm`/FMA specific platformei, care variază în funcție de CPU și de motorul JS. Un prag de
egalitate octet cu octet ar fi, prin urmare, **netestabil** pe mediile de execuție vizate de
această bibliotecă (browsere, Node, procesoare diferite), nu doar strict. Conformitatea fixează
proprietatea care contează cu adevărat — geometria și conținutul pe care le vede un
privitor — la o limită suficient de mică încât să fie imperceptibilă.

## Toleranța exactă {#the-exact-tolerance}

Toleranța se aplică **pe clase de motoare** și este definită în
[`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts):

| Clasă | Toleranță (pt) | Motoare |
|---|---:|---|
| `deterministic` | **±0.01** | `dot`, `circo`, `twopi`, `osage`, `patchwork` |
| `iterative` | **±0.5** | `neato`, `fdp`, `sfdp` |

Motoarele deterministe reproduc coordonatele întregi/tipărite ale lui C practic exact, așa că
±0.01 absoarbe doar zgomotul de formatare zecimală. Motoarele iterative (bazate pe forțe)
depind de funcții transcendente al căror rezultat la ultimul bit nu este reproductibil între
platforme, așa că au o limită mai lejeră și sunt verificate suplimentar pentru egalitate
**structurală** (același arbore de elemente).

O rezervă pentru suprafața **plain/plain-ext**: plain tipărește coordonatele în inci cu
5 cifre semnificative (`%.5g`), astfel încât, la magnitudini ≥ 100, cuanta de tipărire
(0.01) este egală cu toleranța de ±0.01. Pe grafuri foarte mari, o diferență de aranjare
sub un ULP, care se nimerește să traverseze o limită de rotunjire a celei de-a 5-a cifre,
se tipărește ca un pas întreg de 0.01 și este semnalată, deși geometria de bază este
identică până la ~1e-11 pt (vezi acceptarea circo `2108`, jurnalul din 2026-07-28).
Suprafețele xdot/json, care tipăresc în puncte, reprezintă comparația geometrică de
referință în acest regim.

**Sondajul de paritate al corpusului** evaluează fiecare graf în modul `deterministic`
(±0.01), indiferent de motor — vezi
[`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
(`diffVerdict` → `compareSvg(port, oracle, 'deterministic')`).

## Citiți codul {#read-the-code}

Definiția de mai sus nu este o aspirație exprimată în proză — este exact ceea ce face
codul de comparare. Pentru a verifica singuri:

- [`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts)
  — `TOLERANCES` (tabelul ±0.01 / ±0.5) și `compareSvg`, care parcurge cei doi
  arbori normalizați și aplică, atribut cu atribut, regula (1) numeric-în-limita-toleranței
  și regula (2) nenumeric-exact.
- [`test/golden/normalize.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/normalize.ts)
  — cum este analizat SVG-ul brut în arborele de elemente comparabil.
- [`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
  — `diffVerdict`, care atribuie unul dintre verdictele de mai jos. `survey.ts` acoperă
  doar fluxul SVG al lui `dot`.
- [`test/corpus/engine-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/engine-walk.ts)
  — sondajul **xdot** pe motoare (`npx tsx test/corpus/engine-walk.ts <engine>`), care
  aplică aceeași împărțire pe clase ca tabelul de mai sus
  (`TOLERANCE = 0.5` pentru `neato`/`fdp`/`sfdp`, `0.01` pentru orice alt motor)
  și compară fluxuri semantice de operații de desenare (`compareXdot`), nu SVG. Astfel sunt
  măsurate fluxurile `circo`/`twopi`/`osage`/`patchwork`/`neato`/`fdp`/`sfdp`; fluxul xdot
  propriu al lui `dot` folosește instrumentul frate
  [`xdot-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/xdot-walk.ts).

## Verdictele {#the-verdicts}

Sondajul atribuie fiecărui graf exact un verdict. Numărătorile curente pe flux:
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)
centralizează fiecare flux motor × suprafață (deterministe și iterative deopotrivă);
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
este panoul SVG al lui `dot`, iar fiecare alt motor are alături, în `test/corpus/`,
propriul panou `PARITY-<engine>.md`:

| Verdict | Semnificație |
|---|---|
| **`conformant`** | Se potrivește cu oracolul conform definiției de mai sus (numeric în limita toleranței, nenumeric exact). |
| **`structural-match`** | Același arbore de elemente, dar una sau mai multe valori numerice depășesc toleranța. |
| **`diverged`** | Arborii de elemente diferă (un element lipsă/în plus sau o nepotrivire nenumerică). |
| **`errored` / `timeout`** | Portarea nu a reușit să randeze intrarea (`errored`; `port-error` în fluxurile pe motoare) sau a depășit bugetul de timp (`timeout`). Se punctează ca eșec: intră la numitorul procentului de reușită, niciodată ca reușită. |
| **`oracle-error`** | Oracolul C nu a reușit să randeze intrarea, deci nu există referință cu care să se compare. În afara domeniului: exclus de la numitorul procentului de reușită. |

**Procentul de reușită** de pe fiecare panou este `conformant / (surveyed − oracle-error)`.

„Conformant” este pragul; „structural-match” este un progres semnificativ (forma corectă,
coordonatele încă se abat); „diverged”, „errored” și „timeout” sunt lacune reale.
Nimic din acestea nu este o afirmație de ieșire identică octet cu octet.

Unele grafuri nu au **niciun verdict** pe un anumit motor: vezi
*excluderile de motoare* mai jos.

### Excluderile de motoare {#engine-exclusions}

O pereche (graf, motor) exclusă nu este parcursă, deci nu este nici conformă, nici
divergentă — pur și simplu nu este măsurată acolo. Aceasta este diferit de o divergență
acceptată, în care comparația *a avut loc*, iar diferența este iertată cu o cauză
documentată.

Pragul este intenționat ridicat, deoarece un graf neexaminat este o lacună de acoperire,
nu un cost cunoscut. O intrare necesită toate cele trei condiții: algoritmul motorului
demonstrabil nu poate intra în acțiune pe intrarea respectivă, omiterea economisește timp
real, iar același comportament este verificat pe un flux mai ieftin. Faptul de a fi *lent*
nu este în mod explicit suficient — un raport slab între portare și oracol este exact felul
în care arată un defect real de performanță, iar excluderea pe acest temei ar ascunde chiar
ceea ce este corpusul menit să scoată la iveală.

Fiecare excludere este listată cu mecanismul ei în
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md#engine-exclusions);
registrul este `test/corpus/engine-exclusions.json`. Cazul care a motivat-o este
`2222`, care declară 28.303 de noduri și nicio muchie: neavând nimic de pus în relație,
fiecare motor bazat pe forțe și fiecare motor radial deleagă către împachetatorul comun de
componente și niciunul dintre algoritmii proprii nu rulează — lucru confirmat de faptul că
ieșirile oracolului lor sunt identice octet cu octet. `dot` ia o altă cale și îl acoperă
conform în șase secunde.
