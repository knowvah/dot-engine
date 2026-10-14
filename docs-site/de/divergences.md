---
sourceHash: d4192db40bb45515f4ed4190420acec6a50ce6704e8bd447df33d35e3ffe0730
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Bekannte Abweichungen von C Graphviz {#known-divergences-from-c-graphviz}

@knowvah/dot-engine strebt die größtmögliche Treue zur kanonischen C-Implementierung
an. Der C-Quelltext ist die Spezifikation; eine nicht aufgeführte Abweichung gilt
als Fehler, nicht als akzeptiertes Verhalten.

> **Was „Übereinstimmung“ hier bedeutet.** Das Korpus-Paritätsurteil `conformant`
> ist eine **enge deterministische Toleranz**, *nicht* buchstäbliche
> Byte-für-Byte-Gleichheit des SVG: numerische Koordinaten und Pfade müssen
> innerhalb von **±0.01** übereinstimmen, und alle nicht numerischen Inhalte
> (Tags, Farben, Text) müssen exakt gleich sein
> (`compareSvg(…, 'deterministic')`). In diesem gesamten Dokument beziehen sich
> „Übereinstimmung“ und „konform“ auf dieses Toleranzurteil. Vollständige
> Definition: [Konformität](./conformance.md).

Wo die Ausgabe *tatsächlich* abweicht, fällt sie in genau eine von drei Klassen:

1. **Akzeptierte Abweichungen** — Unterschiede, die wir untersucht, bis auf die
   Ursache verstanden und **bewusst nicht konform gemacht** haben. Jede ist
   begrenzt, charakterisiert und unten begründet. Das sind keine Fehler, und sie
   werden nicht „behoben“, es sei denn, es gibt dafür einen konkreten, eigens
   abgegrenzten Grund.
2. **Nachverfolgter Long Tail** — bekannte Lücken, die geschlossen *werden*, jeweils
   mit einer am Orakel festgemachten Korrektur. Sie werden mit aktuellen Zählwerten in
   [`test/corpus/PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
   geführt.
3. **Nicht-Ziele** — bewusste Abgrenzungen des Umfangs (Formate und Mechanismen, die
   wir nie nachbilden wollten).

Die maßgeblichen, laufend aktualisierten Aufzeichnungen sind
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
(Paritäts-Dashboard je Eingabe gegenüber dem nativen `dot`) und
[`plans/port-catalog/README.md`](https://github.com/knowvah/dot-engine/blob/main/plans/port-catalog/README.md)
(Inventar des Portierungsstands auf Algorithmusebene).

Die **maschinenlesbare** maßgebliche Quelle dafür, welche Graphen *akzeptiert* sind
(Klasse 1 unten), ist
[`test/corpus/accepted-divergences.json`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/accepted-divergences.json).
Die Werkzeuge verknüpfen sie zur Berichtszeit: `PARITY-dot.md` trennt **akzeptierte
Abweichungen** vom **nachverfolgten** Rückstand, und das Regel-Gate bezieht seine
Allowlist daraus. Die folgenden Prosa-Abschnitte erklären jeden Eintrag (A1 ist
aktiv; A2, A3 und A8 sind geschlossen und als Historie aufbewahrt; A10 ist eine
Akzeptanz eines Portierungsfehlers, die kein Register ausdrücken kann); ein CI-Test
(`accepted-divergences.test.ts`) stellt sicher, dass jeder akzeptierte Graph
weiterhin abweicht, damit diese Liste nicht unbemerkt veraltet.

---

## Akzeptierte Abweichungen (wir machen sie bewusst nicht konform) {#accepted-deltas-we-deliberately-do-not-make-conformant}

Wir akzeptieren eine Abweichung — statt Byte-Parität anzustreben — nur, wenn **alle**
folgenden Bedingungen erfüllt sind:

- Die Ursache ist eine **Portabilitätsbeschränkung** (etwas, das die
  JavaScript-/Browser-Laufzeit nicht exakt reproduzieren kann), kein Logikfehler
  in der Portierung.
- Der Unterschied ist **nicht wahrnehmbar** und nachweislich **begrenzt**.
- Eine Korrektur hätte im Verhältnis zum Nutzen **unverhältnismäßige Kosten und
  einen unverhältnismäßigen Auswirkungsbereich** (typischerweise: sie würde einen
  gemeinsam genutzten Baustein berühren, den Hunderte bereits konforme Graphen
  verwenden, und für den Gewinn eines Bruchteils eines Pixels Regressionen
  riskieren).

Wenn wir eine Abweichung akzeptieren, charakterisieren wir sie hier, damit
Nutzerinnen und Nutzer nie überrascht werden. Von einer akzeptierten Abweichung
betroffene Graphen werden gegen eine **strukturelle / Toleranz-** statt einer
Byte-Latte validiert.

### A1. Gleitkomma-Determinismus (kräftebasierte Engines) {#a1-floating-point-determinism-force-directed-engines}

**Betroffen:** `neato`, `fdp`, `sfdp`, `circo`, `twopi`, `osage` (die iterativen,
Federmodell-Engines). Das *Layout* der `dot`-Engine ist von diesem Determinismus
iterativer Modelle **nicht** betroffen; die früheren Gleitkomma-Abweichungen des
`dot`-Spline-Routings (A3, A8) sind geschlossen und werden unten als Historie aufbewahrt.

> **Geltungsbereich, historisch eine unvermessene Einschränkung — jetzt teilweise
> vermessen.** Der **Haupt-SVG-Survey der dot-Engine** (`test/corpus/survey.ts`) ist
> weiterhin **ausschließlich dot**: Das native Orakel läuft unter
> `GVBINDIR=/tmp/ghl`, das **nur** die Plugins `core` + `dot_layout` verlinkt
> (`test/corpus/gen-headless-gvbindir.sh` durchläuft genau `core dot_layout` —
> es ist kein Layout-Plugin für `neato`/`fdp`/`circo`/`twopi`/`osage`/`sfdp`
> vorhanden), und sowohl Orakel als auch Portierung werden mit der `dot`-Engine
> aufgerufen. Korpus-IDs wie `*_neato` / `*_circo` / `root_twopi` sind in diesem
> Survey also *Dateinamen*, die mit `dot` angeordnet werden, nicht mit ihrer
> nativen Engine, und A1 trifft dort auf **null** Graphen — nicht weil die
> Engines als konform erwiesen wären, sondern weil dieser spezielle Survey sie nie
> ausführt.
>
> **Aber alle sechs A1-Engines haben jetzt einen eigenen Survey mit der nativen
> Engine**, über `test/corpus/engine-walk.ts` + `parity-report.ts`
> (`GVBINDIR`-unabhängig — jeder startet `dot -K <engine> -Txdot` direkt), mit zwei
> unterschiedlichen Strengegraden, die unten getrennt dokumentiert sind:
> `circo`/`twopi`/`osage` laufen mit derselben **deterministischen Toleranz von
> ±0.01** wie der dot-Survey, mit Ursachen-Triage je ID („Engine-Track-Akzeptanz“
> unten); `neato`/`fdp`/`sfdp` laufen mit einer lockereren
> **Charakterisierungstoleranz von ±0.5** und bislang ohne Triage je ID
> („Charakterisierung der iterativen Engines“ unten). Aktuelle Zahlen über alle
> Engines hinweg:
> [`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md).

**Charakterisierung.** Diese Engines führen iterative numerische Layouts aus, deren
Ergebnisse von der Gleitkomma-Rundung abhängen — insbesondere von Fused
Multiply-Add (FMA) und `Math.pow`, die sich zwischen JavaScript-Engines und
CPU-Architekturen unterscheiden können. Die Portierung folgt der Operationsreihenfolge
von C, wo sie kann (`src/common/fma.ts`, `src/common/arm-pow.ts`) — z. B. stimmt
`sfdp` mit einem passenden PRNG und `fma` auf ca. 6 signifikante Stellen mit dem
nativen Orakel überein —, aber eine exakte, koordinatengleiche Reproduktion ist
**plattformübergreifend nicht garantiert**. Die Topologie bleibt erhalten; die
mögliche Abweichung liegt in den feinen Knotenkoordinaten.

**Warum akzeptiert.** Das ist eine harte Randbedingung der Ausführung in JS, keine
Designentscheidung — aus derselben Familie wie die (inzwischen geschlossenen)
`hypot`-/FMA-Empfindlichkeiten von A3/A8. Es gibt keine Möglichkeit, bitidentische Ergebnisse bei transzendenten
Funktionen/FMA über alle Ziel-Laufzeiten hinweg zu garantieren; eine Byte-Latte
wäre daher nicht nur teuer, sondern untestbar. Um A1 zu **bewerten** (statt nur
mit einem Vorbehalt zu versehen), war ein eigener Paritäts-Track mit nativer
Engine nötig — am 2026-07-11 als `test/corpus/engine-walk.ts` + `parity-report.ts`
gebaut, der jede Eingabe unter ihrer eigenen Engine statt unter `dot` untersucht.
Die ehrliche Obergrenze dieser Arbeit ist, A1 auf „keine aktive Abweichung auf
der Referenzplattform“ **einzugrenzen**, niemals den plattformübergreifenden
Vorbehalt zu beseitigen; die bisherigen Ergebnisse (unten) halten diese Grenze
ein: `circo`/`twopi`/`osage` haben jeweils eine Handvoll echter A1/A9-Fälle zutage
gefördert und ihre Ursachen geklärt, und `neato`/`fdp`/`sfdp` liegen jetzt bei
90.3/96.5/68.1 % innerhalb von 0.5pt gegenüber dem nativen Binary über das
929-Item-Universum (graphviz 16.1.0) — die portierte Arithmetik (`fma.ts`,
`arm-pow.ts`, passender PRNG) trägt also für die meisten Graphen —, und jede
abweichende ID der 910-Item-Roster wird einzeln per Injection zugeordnet
(Solver-Drift vs. Portierungsfehler), statt als nicht triagierte Drift zu verbleiben;
die 19 Roster-Ergänzungen sind noch nicht zugeordnet. Siehe die Charakterisierung der
iterativen Engines unten.

**Engine-Track-Akzeptanz: twopi-Pfeilfamilie.** <a id="a1-twopi-arrows-family"></a>
Das Blockzitat oben beschreibt den SVG-Survey der dot-Engine, in dem A1
auf null Graphen trifft; der separate `twopi`-**xdot-Engine-Track**
(`parity-twopi.json`, Orakel `dot -K twopi -Txdot` nativ,
`test/corpus/engine-walk.ts`) läuft *tatsächlich* unter seiner nativen Engine und
fördert eine konkrete, verifizierte A1-Instanz bei 9 Korpus-IDs zutage:
`graphs-arrows`, `graphs-newarrows`, `graphs-arrowsize`, `linux.x86-arrows_dot`,
`macosx-arrows_dot`, `nshare-arrows_dot`, `share-newarrows`, `windows-newarrows`
und (am 2026-07-28 hinzugekommen, neu im 905-Item-Universum) die Schwester-ID
`tree-graphs-directed-oldarrows` aus directed/ — jede weicht bei einer einzigen
dominanten Kante ab (`Z->I` oder `i->Z`; 12–64 Draw-Op-Unterschiede). Die
Injection-A/B-Prüfung (Entscheidungsjournal, Eintrag vom 2026-07-10 „injection A/B
verdicts: twopi arrows family EXONERATED...“) hat den Mechanismus direkt bewiesen:
Das Auslesen des `ND_pos` am Eingang von `spline_edges` des nativen Binarys und
dessen Injektion in `splineEdgesShifted` der Portierung erzeugt auf `graphs-arrows`
**vollständig konforme** Ausgabe (`Z->I` wird byte-identisch zum Orakel, derselbe
Spline mit 7/14 Punkten) — die Abweichung ist also zu 100 % eine
Knotenpositions-Drift vor dem Routing, die aus dem PRISM-Überlappungsentfernungs-Solver
von `twopi` stammt, und Spline-Routing/-Ausgabe der Portierung sind entlastet.
Das sichtbare Symptom bei 6 der 8 IDs ist ein Umkippen der Bezier-Punktzahl
(`unfilled_bezier[ptCount]: 8 vs 14`): Die Zahl der angepassten Segmente von
`Proutespline` reagiert darauf, auf welcher Seite einer Hindernisgrenze die
abgedriftete Knotenposition landet; ein Positionsunterschied unterhalb eines ULP
nach dem iterativen Solve von PRISM kippt also die Segmentzahl des angepassten
Splines (die anderen 2 IDs, `graphs-arrowsize`/`nshare-arrows_dot`, zeigen dieselbe
Drift als kleineren reinen Positionsunterschied ohne Umkippen der Segmentzahl).
Auf Engine-Track-Ebene akzeptiert über
`test/corpus/accepted-divergences-engines.json`, das `parity-report.ts` in
`PARITY-twopi.md` einbindet — dieselbe Verknüpfung, die `accepted.ts` für das
`PARITY-dot.md` des dot-Tracks vornimmt.

Die `oldarrows`-Ursachenanalyse (2026-07-28) hat die genaue Kipp-Stelle des
Punktzahl-Symptoms der Familie bestimmt. Ihr `i`–`Z`–`I`-Fächer liegt kollinear auf
einem Ringdurchmesser, und das `intersect()` von `directVis` in pathplan blockiert
eine Sichtlinie, wenn ein Hindernis-Eckpunkt „auf“ der Strecke liegt — wobei die
Kollinearitätstoleranz von 1e-4 in `wind()` selbst einen 270pt von der Strecke
entfernten Knoten als kollinear zählt und `inBetween()` (das Kollinearität
voraussetzt) dann zum Test nur der **x-Projektion** degeneriert: Der Eckpunkt
blockiert genau dann, wenn sein x streng innerhalb des ULP-breiten Intervalls
zwischen den x-Koordinaten der beiden Endpunkte liegt. Welche der beiden
gespiegelten radialen Kanten sich biegt, hängt daher von der Reihenfolge im
letzten ULP dreier nominell gleicher x-Werte aus dem Solve von PRISM ab — C biegt
`Z->I` (der Achsen-Eckpunkt von Knoten `i` landet in seinem Intervall), die
Portierung biegt `i->Z` (der Eckpunkt von Knoten `I` landet in seinem eigenen).
Eine Offline-Nachbildung von `directVis` auf der jeweils ausgelesenen
Hindernismenge beider Seiten reproduziert die Entscheidung jeder Seite exakt, und
die Injektion des `ND_pos` des Orakels vor dem Routing in die Portierung ergibt
0 Unterschiede (`attribution-twopi.json`) — Routing und Ausgabe sind
byte-treu.

`1855` ist die radiale/sternförmige **Spiegel**-Variante desselben
FP-Mechanismus von PRISM vor dem Routing (akzeptiert am 2026-07-11): Seine 31 Blätter
liegen exakt auf einem Kreis, das Sternlayout ist daher spiegelsymmetrisch, und die
Überlappungsentfernung von PRISM sitzt in einem bezüglich der Symmetrie instabilen
Gleichgewicht; ein 1-ULP-Unterschied zwischen V8 und libm bei `cos`/`sin` an 5
Blattwinkeln in `setAbsolutePos` von `circleLayout` wählt das entgegengesetzte
Spiegelbecken, und das gesamte radiale Layout landet als exakte x-Achsen-Spiegelung
des Layouts des Orakels (maximale Knotenverschiebung 6.04pt, bb erhalten).
Die Injection-A/B-Prüfung hat beide Richtungen bewiesen: Die exakten
`circleLayout`-Positionen von C in das PRISM der Portierung zu geben, reproduziert
das Orakel Knoten für Knoten (3e-14), und die Wiederherstellung nur der 5
ULP-abweichenden Blattpositionen kippt das gesamte Layout zurück in die Spiegelung
der Portierung. Vollständige Ursachenanalyse: `.agent-notes/twopi-radial-drift-rca.md`
(Entscheidungsjournal 2026-07-11).

**Charakterisierung der iterativen Engines: neato/fdp/sfdp.** <a id="a1-iterative-characterization"></a>
Anders als die oben beschriebenen Engine-Tracks für `circo`/`twopi`/`osage` sind
`neato`/`fdp`/`sfdp` bislang **nicht** je ID triagiert — `engine-walk.ts` führt für
diese drei ein Feld `tolerance: 0.5`, und `parity-report.ts` stellt sie in einem
eigenen Abschnitt „Iterative engines (±0.5 characterization)“ von
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)
dar, ausdrücklich **nicht** vergleichbar mit den deterministischen
±0.01-Bestehensquoten an anderer Stelle in diesem Dokument. Aktuelle Zählwerte
gegenüber graphviz 16.1.0 (929-Item-Universum; die Bestehensquote lässt Eingaben aus,
die das C-Orakel nicht rendern kann, siehe [Konformität](./conformance.md)):

| Engine | untersucht | innerhalb ±0.5pt | nicht konform | Portierungsfehler / Timeout | Orakelfehler |
|---|---:|---:|---:|---:|---:|
| `neato` | 929 | 838 (90.3%) | 88 | 1 | 1 |
| `fdp`   | 929 | 893 (96.5%) | 29 | 2 | 4 |
| `sfdp`  | 929 | 633 (68.1%) | 293 | 2 | 0 |

(Die Zeilen für `neato` und `sfdp` stammen aus Durchläufen, die vor dem abschließenden
erneuten Durchlauf von `graphs-decorate`, `1314`, `2784` und `2371` bereitgestellt
wurden; sie können sich um diese IDs verschieben. Die Bestehensquote von `fdp` stieg
gegenüber 77.5 %, weil der frühere eingecheckte Durchlauf dem Portierungsstand der
vorherigen Mission vorausging.)

(Der erste Durchlauf am 2026-07-11 mit 762 Items maß 263/311/260 innerhalb von
±0.5pt — der Sprung auf die aktuellen Quoten kam von seither eingespielten
Korrekturen je ID, vor allem von der nicht portierten `user_pos`/`P_SET`-Behandlung
in neato, der Konsolidierung der Engine-Initialisierung und der
`setEdgeType`-Korrektur Makro vs. Funktion.)

Anders als beim ersten Durchlauf war jede abweichende Zeile der 910-Item-Roster einzeln
zugeordnet (die 19 IDs, die in der 929-Item-Roster neu sind, sind noch nicht zugeordnet;
sie sind in der T13-Übergabe als neu sichtbar aufgeführt): Das Injection-Harness
(`test/corpus/attribute-divergence.ts`) gibt das
`ND_pos` des nativen Orakels vor dem Routing in die Portierung und vergleicht neu,
und jede aktuelle abweichende ID ist entweder `drift-exonerated` (Routing und
Ausgabe der Portierung reproduzieren das Orakel exakt, sobald die Solver-Drift
entfernt ist) oder eines der wenigen gesondert akzeptierten Einzel-Restfälle
(der CDT-Incircle-Gleichstand von `241_0` bei allen drei Engines, neato `2239`,
sfdp `2556`; sfdp `42` ist A1-Drift, siehe
[`comparisons/sfdp-42.md`](https://github.com/knowvah/dot-engine/blob/main/comparisons/sfdp-42.md)). Die Klassen-Akzeptanz unten formalisiert die entlastete Menge;
aktuelle Zählwerte in den Dashboards je Engine
([`PARITY-neato.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-neato.md),
[`PARITY-fdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-fdp.md),
[`PARITY-sfdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-sfdp.md)).

**Klassen-Akzeptanz A1-drift (iterative Engines, berechnete Mitgliedschaft).**
<a id="a1-drift-iterative-engines"></a> `test/corpus/accepted-divergences-engines.json`
enthält je iterativer Engine (`neato`, `fdp`, `sfdp`) einen **Klassen**-Eintrag
`"A1-drift"` — `{ class: true, attributionFile, ref }` — unterschieden von den
Einträgen je ID, die die Tracks für `circo`/`twopi`/`osage` oben verwenden (D2,
`plans/iterative-parity-campaign/decisions.md`). Anders als bei einem Eintrag je ID
wird die Klassenmitgliedschaft nie von Hand in der Registry aufgezählt:
`parity-report.ts` berechnet sie zur Berichtszeit aus der passenden
`attribution-<engine>.json` (dem Injection-Attributions-Harness aus T1,
`test/corpus/attribute-divergence.ts`) — jede abweichende ID, deren natives
`ND_pos` vor dem Routing in die Portierung injiziert wurde und die beim erneuten
Vergleich bei ±0.5 konform ist, erhält in dieser Datei `verdict: 'drift-exonerated'`;
das bedeutet, dass die iterativen Solver beider Engines zu numerisch
unterschiedlichen, aber jeweils in sich konsistenten Layouts konvergiert sind (ein
Unterschied in der Gleitkomma-Akkumulation gemäß der A1-Charakterisierung oben,
kein Routing- oder Ausgabefehler der Portierung). Die Belege je ID — Bucket-Form,
Anzahl der Unterschiede vor und nach der Injektion, Erkennung einheitlicher
Verschiebung/Spiegelung — stehen im Attributions-Artefakt selbst und sind weder in
diesem Dokument noch in der Registry dupliziert (D2). Eine ID, die später
vollständig besteht oder deren erneute Zuordnung das Urteil ändert, scheidet beim
nächsten Neuerzeugen des Berichts automatisch aus der Klasse aus — keine veraltete
Akzeptanz muss bearbeitet werden, und kein Guard-Test schlägt fehl. Engines, deren
`attribution-<engine>.json` noch nicht erzeugt wurde, stellen die Klasse als
„attribution pending“ mit null Mitgliedern dar, identisch zu gar keiner Akzeptanz —
der Klassen-Eintrag darf seinen Daten vorausgehen (siehe
`test/corpus/accepted-divergences-engines.test.ts`).

### A2. Textvermessung (Schriftmetriken) → textabhängiges Layout — ABGESCHLOSSEN <a id="a2-text-measurement-font-metrics-→-label-driven-layout-—-closed"></a> {#a2-text-measurement-font-metrics-label-driven-layout}

**Status (2026-07-01): abgeschlossen.** Unter dieser Klasse ist keine Korpus-ID mehr
akzeptiert; der Abschnitt bleibt als historische Dokumentation des Mechanismus und
der injizierbaren `TextMeasurer`-Naht erhalten, die ihn neutralisiert hat.
Aufeinanderfolgende Korrekturen der Textvermessung (die Umstellung auf
`EstimateTextMeasurer`, schriftbewusste vertikale Metriken, die Korrektur für
nicht-ASCII-UTF-8-Bytes) haben nahezu jede textabhängige Layout-Abweichung beseitigt,
die hier früher stand. **`proc3d`** — das frühere kanonische A2-Beispiel — ist in
allen drei Korpus-Verzeichnissen (`graphs-`/`share-`/`windows-proc3d`) vollständig
**`conformant`**: übereinstimmende bbox, null Pfaddaten-Unterschiede, null
Label-Anker-Unterschiede.

**Die letzten Mitglieder wurden entlassen (2026-07-01).** Die **`NaN`-Familie**
(`graphs-NaN` / `share-NaN` / `windows-NaN`) wurde hier noch lange mitgeführt, obwohl
ihre Knotengeometrie bereits exakt mit C übereinstimmte (76/76 Referenzpunkte). Ihr
tatsächlicher Rest — 8 Endpunkte gerader Kanten an vier gegenläufigen
2-Zyklus-Paaren (`Target↔TThread`, `Interp↔InterpF`, `Event↔Target`,
`AtomProperties↔NRAtom`), um 6–14 pt verschoben — wurde neu diagnostiziert und
erwies sich als **überhaupt kein Schriftmetrik-Effekt**, sondern als zwei Fehler der
Portierung im Multi-Kanten-Routing von dot (Mission `plans/fix-nan-a2-retire/`,
`.agent-notes/nan-edge-endpoint-diagnosis.md`):

1. **Spurreihenfolge gegenläufiger Paare.** Die Portierung hat jede Gruppe paralleler
   Kanten vor der Vergabe der Multisep-Spurversätze nach ursprünglicher
   Erzeugungsnummer neu sortiert; C vergibt Spuren in der von edgecmp gesammelten
   Reihenfolge (zuerst der MAINGRAPH-Vorwärtsrepräsentant, als zweites das
   umgekehrte AUXGRAPH-Mitglied — `dotsplines.c:419`,
   `make_regular_edge:1885-1907`). Bei einem 2-Zyklus, dessen umgekehrtes Mitglied
   zuerst deklariert war, wurde jede Kante auf den 18-pt-Korridor der anderen
   gezeichnet.
2. **Fälschliche flache Nachbarschaft bei rangübergreifend zusammengeführten Kanten.**
   `markAdjacent` hat `ND_other`-Einträge ohne die Gleicher-Rang-Prüfung von C
   (`flat.c:272-276`) markiert, sodass der Kurzschluss für flach benachbarte Kanten
   in `groupSize` die Gruppengrenzen von portcmp verschluckt hat.

Mit beiden originalgetreu behobenen Fehlern ist die Familie in allen drei
Verzeichnissen **`conformant`** (je Element: Knoten 0, Kanten 0 abweichend), und
derselbe Mechanismus hat `42`, `clust2`, `ngk10_4` (structural-match → conformant)
geschlossen und `b124` von diverged auf structural-match gebracht — alle an
2-Zyklus-/Parallelpaaren.

**Beide Survey-Seiten verwenden denselben Schätzer — die Vermessung ist
neutralisiert.** Das native `dot`-Orakel läuft unter einem Headless-`GVBINDIR`
(`test/corpus/gen-headless-gvbindir.sh` → `/tmp/ghl`), das nur die Plugins `core` und
`dot_layout` verlinkt — kein Textlayout-Plugin `gd`/`pango`/`quartz`. Bei leerem Slot
fällt Graphviz auf das eingebaute `estimate_textspan_size` zurück. Der
`EstimateTextMeasurer` der TypeScript-Portierung (`src/common/textmeasure.ts`) ist
eine originalgetreue Portierung derselben Routine und der Node-Standard, aufgelöst
durch `createMeasurer()` (`src/common/textmeasure-factory.ts`). **Beide Seiten jedes
Paritätsvergleichs vermessen Text daher mit demselben Schätzer** — echte
FreeType-/pango-Glyphenvorschübe gehen nie in den Vergleich ein. Deshalb deutet eine
Urteils-Regression hier auf Layout-Code und nicht auf eine Schrift, und deshalb hat
die Behebung der eigenen Fehler des Schätzers (UTF-8-Byte-Zählung,
Schriftbewusstsein der vertikalen Metriken) den Großteil dieser Klasse vollständig
geschlossen, statt nur eine Schriftmetrik-Lücke zu verkleinern.

**Die injizierbare `TextMeasurer`-Naht.** Diese Neutralisierung ist nur möglich, weil
die Textvermessung eine bewusste Naht ist und in keiner der beiden Engines fest
verdrahtet. `TextMeasurer` ist eine Ein-Methoden-Schnittstelle (`measure(text, font,
size, flags) → {w, h, …}`), die per Dependency Injection an jede Stelle übergeben
wird, an der Label-Größen bestimmt werden — `polyInit`, `recordInit`,
`initEdgeLabels` und `buildNodeLabel` nehmen den Measurer jeweils als Parameter;
nichts vermisst Text über eine globale Variable. Für Tests/CI wird er per
`setTextMeasurer(...)` oder `GV_TEXT_MEASURER=estimate` festgelegt. Die Naht erlaubt
es außerdem, einen Rest als reine Vermessungsfolge zu *beweisen*: Man gibt der
Portierung die exakten Breiten, die C gemessen hat (vom Orakel erfasst), und prüft,
ob das Layout dann C exakt reproduziert. Dieses Experiment hat ursprünglich das
A2-Urteil für `proc3d` gerechtfertigt (siehe den historischen Anhang unten) — die
Technik bleibt gültig. Ihre Umkehrung hat die Klasse abgeschlossen: Weil die
Vermessung auf beiden Survey-Seiten nachweislich neutralisiert war, konnte der
`NaN`-Kantenrest kein Schriftmetrik-Effekt sein, was die Neudiagnose erzwang, die die
beiden Routing-Fehler oben fand.

::: details Historische Analyse (überholt seit 2026-06-30) — zur Dokumentation aufbewahrt
Das Folgende beschreibt einen früheren Zustand dieser Klasse, bevor die Umstellung
auf `EstimateTextMeasurer`, schriftbewusste vertikale Metriken und die
nicht-ASCII-UTF-8-Byte-Korrektur den Großteil davon geschlossen haben. Es beschreibt
nicht mehr das aktuelle Verhalten — es bleibt nur erhalten, damit die Überlegungen,
die hierher geführt haben, nicht verloren gehen. Insbesondere: (1) Die Breitenwerte
des „nativen C“ in der Messtabelle unten sind **FreeType**-Werte aus einem
Rendering-Pfad mit echten Schriften; der Paritäts-Survey durchläuft diesen Pfad nie —
beide Seiten führen `estimate_textspan_size` aus (siehe oben) —, die Tabelle
spiegelt also nicht wider, wie Parität aktuell gemessen wird; (2) die
Überlagerungsabbildungen und die Golden-/Ours-Renderings unten zeigen ein
**Nicht-Korpus-**`proc3d` (`graphs/directed/proc3d.gv`, ~2620 pt), das nicht Teil
des Paritäts-Surveys ist; die Korpus-Varianten von `proc3d` sind jetzt ohne
Unterschiede konform, es gibt für sie also keine Überlagerung zu zeigen; (3) die
unten stehende Darstellung der Knoten-x-Werte bei `NaN`/`ratio=compress` ist
überholt — die aktuelle Messung zeigt, dass alle 76 Knotenpunkte exakt
übereinstimmen, die dort beschriebene Kette von Breitenfehler zu Knotenverschiebung
gilt für `NaN` also nicht mehr.

**`NaN` unter `ratio=compress` (historisch).** Die
`NaN.gv`-Familie (`orientation=landscape; ratio=compress; size="16,10"`) war ein
A2-Fall, dessen Urteil damals bei *diverged* statt bei *structural-match* landete.
Der Pfad des Compress-x-Netzwerk-Simplex war originalgetreu — jede
Constraint-Eingabe stimmte mit C überein (Breiten-Constraint-Wert,
`containNodes`-minlens, Anzahl der Hilfskanten 471/wt 1612, `lrBalance` und alle
Rangordnungen identisch) *außer* den Halbbreiten von 9 Knoten, die der Measurer um
0.5–1.03 pt breiter meldete als C. Das Packen mit Gewicht 1000 bei `ratio=compress`
machte die normalerweise nicht ausgereizten Links-nach-rechts-Abstands-Constraints
**bindend**, sodass dieser Breitenfehler im Subpixelbereich — ohne compress
unsichtbar — als innere x-Verschiebung von −3..−5 pt zutage trat. Diese
Verschiebung brachte den geraden Spline `Target<->TThread` um 0.55 pt über eine
Knotenboxwand hinaus, sodass der Router ihn zu einem zusätzlichen Bezier-Stück
verbog (7 Punkte gegenüber 4 bei C) — ein *struktureller* Unterschied, daher
*diverged*. Das Erzwingen der 9 Breiten auf die Werte von C reproduzierte C exakt
(Knoten-x 53/76→0/76 abweichend; Spline 7→4 Punkte) und bestätigte, dass der Rest
zu 100 % auf vorgelagerten Schriftmetriken beruhte, nicht auf dem Compress- oder
Spline-Code, **für diese frühere Abweichung**. Vollständige Belege (mit visuellem
Golden-vs-Ours-Nebeneinander und der Überlagerung des Unterschieds 4 vs. 7 Spline-Punkte):
`plans/fix-compress-xcoord/comparisons/nan-compress-xcoord.html` (Prosa-Ausarbeitung:
`…/nan-compress-xcoord.md`).

**Beispiel zur Schriftmetrik-Vermessung (historisch — FreeType vs. Schätzung).**
Das native Graphviz vermisst Text, wenn es mit einem echten Textlayout-Plugin läuft
(nicht dem Headless-Orakel, das der Paritäts-Survey verwendet), mit
FreeType-/libgd-Glyphenvorschüben. Der `EstimateTextMeasurer` der Portierung
bildet keinen Glyphen-Rasterizer nach. Bei den meisten Zeichenketten stimmen beide
exakt überein; bei einigen unterscheiden sie sich um einen Bruchteil eines Punkts.
Gemessenes Beispiel — Times-Roman 14 pt, die Zeichenkette
`"/home/ek/work/src/lefty/lefty.c"` (31 Zeichen):

| | Breite |
|---|---|
| natives C (FreeType) | 176.00 pt |
| @knowvah/dot-engine (Schätzung) | 176.75 pt |
| Differenz | **+0.75 pt (+0.43%)** |

Die andere Label-Zeile desselben Knotens, `"93736-32246"`, wurde **identisch**
gemessen (96.00 pt bei beiden) — der Fehler hängt von der Zeichenkette ab und
akkumuliert je Glyphe, er ist kein einheitlicher Skalierungsfaktor. Diese
FreeType-vs.-Schätzung-Lücke ist real, ist aber **nicht**, was der Paritäts-Survey
misst (beide Seiten führen `estimate` aus); sie würde nur eine Rolle spielen, wenn
die Ausgabe von @knowvah/dot-engine außerhalb dieses Surveys mit einem C-Rendering
mit echten Schriften verglichen würde.

**Nachgelagerte Wirkung auf die frühere `proc3d`-Abweichung (historisch).** Die
Label-Breite bestimmt die Knotengröße, diese das Layout:

1. Ein breiteres Label → eine etwas breitere Knotenbox (bei einem *Ellipsen*-Knoten
   wird die Breite zusätzlich mit √2 skaliert, sodass +0.75 pt Text → +0.53 pt
   Halbbreite ergeben).
2. Die Knoten-Halbbreiten legen die Links-nach-rechts-Abstands-Constraints des
   x-Koordinaten-Netzwerk-Simplex fest; diese Constraints werden per `ROUND()` auf
   ganze Zahlen gerundet, sodass eine Breitenänderung im Subpixelbereich einen
   Constraint von *N* auf *N+1* kippen kann.
3. Der Netzwerk-Simplex wählt dann eine andere — aber gleich optimale — ganzzahlige
   x-Zuordnung und verschiebt einige Knoten-x-Positionen um 1–2 Einheiten.

Beim Nicht-Korpus-`proc3d.gv` (`graphs/directed/proc3d.gv`, ~2620 pt, kein Mitglied
des Paritäts-Surveys) ergab das einen Unterschied von **≤ 3.55 pt** in der
x-Ausdehnung (**0.13%**), unten überlagert — **grün = natives C-`dot` (Golden),
rot = @knowvah/dot-engine (Ours)**:

![Überlagerung proc3d Golden vs. Ours: grün = C, rot = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Vergrößert lag der Saum fast ausschließlich an den langen ovalen Dateipfad-Labels:

![Überlagerung proc3d, vergrößert auf die breiten ovalen Pfad-Labels: grün = C, rot = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

| Golden — natives `dot` | Ours — @knowvah/dot-engine |
|---|---|
| ![proc3d, gerendert von C Graphviz](/img/proc3d-golden.svg) | ![proc3d, gerendert von @knowvah/dot-engine](/img/proc3d-ours.svg) |

Die eigenständige Ausarbeitung (Ursache, Zahlen je Metrik, Reproduktionsbefehl)
steht auf einer eigenen Seite:
[**proc3d — die kanonische A2-Schriftmetrik-Abweichung (historisch)**](/de/divergences-proc3d-a2).
Diese Seite beschreibt eine behobene Abweichung an einer Nicht-Korpus-Eingabe; die
aktuellen Korpus-Varianten von `proc3d` sind konform.

**Warum sie damals akzeptiert wurde.** Die Glyphenvorschübe von FreeType über alle
Schriften und Zeichenketten hinweg byteexakt zu treffen, hätte erfordert, seine
Metriktabellen, sein Hinting und seine Rundung nachzubilden — groß, fragil und
dennoch nicht garantiert exakt. Der Textmesser ist ein gemeinsam genutzter
Baustein: Jedes Label im Korpus läuft durch ihn, sodass eine auf eine einzelne
Zeichenkette zielende Korrektur das Risiko barg, andere für einen nicht
wahrnehmbaren Gewinn zu verschlechtern.
:::

### A3. `hypot`-Gleichstandsauflösung im Spline-Routing (`dot`) — GESCHLOSSEN {#a3-hypot-tie-break-in-spline-routing-dot}

**Status (2026-10-12): geschlossen.** Unter dieser Klasse wird keine Korpus-ID mehr
akzeptiert; der Abschnitt bleibt als historische Dokumentation des Mechanismus
erhalten. Die früheren Mitglieder (`2368`, `graphs-b100`, `graphs-b104`, `241_1`,
`2413_1`, `2413_2`, `graphs-decorate`, `2371`) sind im frischen Durchlauf alle
**`conformant`** (`test/corpus/parity-probe.json`).

**Mechanismus und was ihn geschlossen hat.** Der Spline-Fitter (`Proutespline` ->
`findMaxDev`, `src/pathplan/route.ts`) teilt einen angepassten Bezier am inneren
Routenpunkt mit maximaler Abweichung. In einem geometrisch symmetrischen Kanal
unterscheiden sich die Abweichungen der Kandidaten um ~1 ULP, sodass die Arithmetik
des letzten Bits den Gewinner bestimmt. Der Portierung war eine nicht reduzierbare
Lücke zugeschrieben worden („Apple-`hypot` stimmt mit keinem portablen `hypot`
überein“), und sie wurde mit einer toleranten, translationsäquivarianten
Gleichstandsauflösung kompensiert. Diese Zuschreibung wurde widerlegt: Der Gleichstand
wird von der *exakten* Arithmetik von C entschieden, die reproduzierbar ist. Commit
`cdf597bc` (`fix(pathplan): split splines at C's max-deviation point bit for bit`) hat
sie portiert: libm-`hypot` für die Distanz (`route.c:448`), den strikten
`>`-Vergleich von C (`route.c:139`) und die `fp-contract`-Fusion von clang bei der
Bezier-Auswertung (`route.c:137-138`), die `mkspline`-Determinanten
(`route.c:181-183`), `dot` (459), `normv` (413), `B01` (488) und `B23` (494). Die
tolerante Gleichstandsauflösung ist entfernt; der Spline-Knoten von `241_0` ist im
Routing-Rahmen von C festgelegt, weil C bei solchen Gleichständen nicht
translationsäquivariant ist. Das hat `2368`, `2371`, `2413_1`, `2413_2`,
`graphs-b100`, `graphs-b104` und `graphs-decorate` geschlossen.

`241_1` war kein `hypot`-Gleichstand: Es wurde durch `87347711`
(`fix(dot): match port-less edge endpoints in flat-adjacent aux layout`) geschlossen. C
fasst alle benachbarten flachen Kanten, die eine Hauptkante teilen, in einem Aufruf von
`make_flat_adj_edges` zusammen und prüft Ports über die gesamte Gruppe, sodass eine
portlose Schwesterkante einer Kante mit Port über den Hilfsgraphen geroutet wird. Die
Portierung teilte die Gruppe nach Vorhandensein von Ports und routete die Schwesterkante
über `makeSimpleFlat`, dessen Clipping an einem anderen `bezier_clip`-Punkt landet
(54.28 vs. nativ 54.46).

Beide Korrekturen wurden mit frischen Korpus-Durchläufen ohne Regressionen verifiziert
(Journalzeilen „T5 land“ und „T6 land“,
`plans/plantuml-tracker-2/decision-journal.md`).

**Belege vor der Korrektur (historisch).** `2368` war das Referenzmitglied. Sein Bogen
`376->76` wurde zur gegenüberliegenden Ecke hin geteilt als in C; der Graph und die
Pfade von C und Portierung vor der Korrektur für diesen Bogen werden zur Dokumentation
aufbewahrt.

::: details Graphdefinition (`2368.dot`)
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

```
C    376->76 : M273.31,-4.56 C268.33,-3.14 263.11,-1.9  258.11,-1.15 250.49,0     242.34,-0.98 234.83,-2.8
port 376->76 : M277.29,-4.51 C268.27,-1.69 257.65,0.32  247.89,-1.15 244.92,-1.59 241.88,-2.21 238.85,-2.94
```

### A4. Orakel in einem anerkannt defekten Zustand (die Familie init_rank / pathplan) {#a4-oracle-in-an-acknowledged-broken-state-the-init-rank-pathplan-family}

**Betroffen (graphviz-16.1-Durchlauf):** `1435` (structural-match, maxΔ 0.39 an einem
Spline-Kontrollpunkt; war 503 gegenüber dem 15.x-Orakel — der Rückgang wurde nicht
per Bisect untersucht) und `1581` (diverged: Kinderzahl auf oberster Ebene 39 vs. 22,
maxΔ 0).
Die Familienmitglieder `1939` und `2825` sind **conformant** und haben keinen Eintrag,
und `2470` und `graphs-structs` sind ihnen am 2026-07-11 gefolgt (beide sind zu
conformant kollabiert, nachdem die Korrekturen für ortho-Adjazenz-Überlauf/chancmpid,
fmadd-`polylineMidpoint` und Half-even-Gleichstandsrundung eingespielt waren — die
Portierung reproduziert die Wiederherstellungsausgabe des Orakels jetzt exakt,
einschließlich der identischen verlorenen Kanten); ihre Akzeptanzeinträge sind
entfernt. **`2796` und `2471` sind ihnen mit graphviz 16.1 gefolgt** (beide
`conformant` im frischen Durchlauf, Akzeptanzeinträge entfernt): Die Portierung und das
16.1-Orakel stimmen jetzt in der `init_rank`-Wiederherstellungsausgabe einschließlich
der verlorenen Kanten überein. Die Ursache wurde nicht per Bisect isoliert (Kandidaten
sind der dotgen-Port von 16.1 `3cfbf55c` und die Korrektur des Verbrauchs verlorener
Kanten `5b6b9bfc`); die `init_rank`-Beschreibung unten bleibt als Mechanismus der
Klasse erhalten, und die beiden IDs sind durch den Paritäts-Durchlauf als conformant
festgeschrieben.

`1581` und `2825` waren Absturz-Wiederherstellungsfälle (Mission
fix-element-count-bucket): Fuzzer-/Degenerationseingaben, bei denen die
Upstream-Tests **nur** prüfen, dass dot nicht abstürzt (`test_1581`: keine
ASan-Verletzung; `test_2825`: kein Absturz, wenn `rebuild_vlists` -1 zurückgibt). C
stößt auf einen internen `Error:` (`install_in_rank` / `rebuild_vlists: lead is
null`), und seine Wiederherstellung verwirft Layout-Inhalt; die Portierung gelangt zu
den **identischen Rankset-Löschentscheidungen** (Warnungsparität verifiziert: dieselben
Knoten-/Graphnamen in den „already in a rankset“-Warnungen von `mark_clusters`,
cluster.c:317-320).

`2825` ist jetzt vollständig geschlossen. Die Mission fix-2825-rebuild-vlists (nach
1581) hat die Lücke zunächst eine Ebene weit geschlossen: Die Portierung erreicht
exakt den internen Fehlerzustand von C — byte-identische stderr einschließlich der
Nachrichtenreihenfolge (`Error: rebuild_vlists: lead is null for rank 1`, dann die
nicht präfigierte Fortsetzung `agerr(AGPREV, ...)` `concentrate=true may not work
correctly.`) —, wobei `dotLayoutPipeline` den Fehlschlag von `dot_position`
korrekt weiterreicht, um `dot_splines`/`dotneato_postprocess` zu überspringen, wie
das `dotLayout` von C (`if (r != 0) return r;` nach `dot_position`,
dotinit.c:322-325). Eine Folgearbeit (Teil 2) hat dann die verbleibende Lücke in der
Render-Schicht geschlossen: Das `emit_node` von C schaltet jeden Knoten hinter
`node_in_box(n, job->clip)` (emit.c:1806-1809), und auf diesem Abbruchpfad ist
`job->clip` degeneriert, weil `GD_bb` nie von `set_aspect` (im übersprungenen Ende von
`dot_position`) gesetzt wurde — C gibt also *null* Knoten aus, nur die (ebenfalls
degenerierten) Cluster-Rahmen. Die Portierung hat dasselbe `node_in_box`-Gate portiert
(`src/gvc/device.ts:renderNode`, mit `job.bb`/`job.pad` als Einzelseiten-Äquivalent
von `job->clip`) und aufgehört, aus den Live-Knotenpositionen eine plausible bbox neu
zu berechnen, wenn `g.info.bb` nicht gesetzt ist (`src/gvc/device.ts:render`,
`job.bb = g.info.bb` unverändert, entsprechend `gvc->bb = GD_bb(g)` in `init_gvc`,
emit.c:3272) — jede Layout-Engine setzt `g.info.bb` ohnehin selbst, bevor `render()`
auf jedem Nicht-Abbruchpfad läuft, sodass dies bei gesunden Graphen byte-identisch ist
und die Ausgabe nur auf diesem Abbruchpfad ändert. `2825` ist jetzt `conformant`
(Ausgabe aus 4 Elementen, byte-identisch zum Orakel). Siehe
`.agent-notes/2825-rebuild-vlists-abort.md` für die vollständige Mechanismus-Spur
beider Teile. `1581` erreicht den inkonsistenten Zustand gar nicht (ein
*anderer* Upstream-Fehler im Cluster-Fenster, nicht `rebuild_vlists`) und legt daher
seinen überlebenden Graphen vollständig aus — diese Lücke bleibt offen. Die
Orakelausgabe bei `1581` ist Wiederherstellungsschrott ohne von Upstream definierte
Semantik. Beleg:
[`1581`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1581.md).
Bei jeder dieser Eingaben ist es nach Graphviz' eigener Darstellung das
**C-Orakel**, das defekt ist: `2471`, `1939` und `1435` sind upstream
[`xfail(strict=True)`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/tests/test_regression.py)
(Issues
[#2471](https://gitlab.com/graphviz/graphviz/-/issues/2471),
[#1939](https://gitlab.com/graphviz/graphviz/-/issues/1939),
[#1435](https://gitlab.com/graphviz/graphviz/-/issues/1435), vgl.
[#2796](https://gitlab.com/graphviz/graphviz/-/issues/2796)); der einzige
Korrekturversuch, der [Entwurfs-MR !4849](https://gitlab.com/graphviz/graphviz/-/merge_requests/4849),
bleibt ein nicht gemergter Entwurf (zuletzt bearbeitet 2026-03-20). `graphs-structs` ist
die alte Klasse von Record-Routing-Verlusten (#102/#242/#274/#1323), die das stabile
Graphviz 15.0.0 korrekt rendert — eine Regression des Orakels im Dev-Build.

**Was C tut.** Bei den `init_rank`-Mitgliedern (`2796`, `2471`, `1939`) schließt der
x-Koordinaten-Hilfsgraph des nativen dot einen gerichteten Zyklus über
Cluster-Wand-Constraint-Kanten; sein
[`init_rank`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/ns.c#L146)
kann nicht jeden Knoten durchlaufen, gibt `Error: trouble in init_rank` aus, und das
Layout läuft aus diesem Wiederherstellungszustand weiter — bei `2471`/`2796` endet es
in `Pshortestpath`-Triangulationsschrott und verlorenen Kanten. Bei `1435` und
`graphs-structs` ist die defekte Stufe pathplan selbst (Sackgassen der
Ear-Clip-Triangulation; eine verlorene Record-Port-Kante).

**Eingaben verifiziert, dann originalgetreu gemacht (das ist der tragende Teil).**
Die Mission `verify-oracle-bug-family`
([Brief](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/README.md))
hat den Constraint-Graphen, den beide Seiten an den Netzwerk-Simplex geben, zeilenweise
für jedes Familienmitglied ausgegeben — und festgestellt, dass das frühere „saubere“
Verhalten der Portierung bei dieser Familie von **vier echten Fehlern der Portierung**
herrührte, die alle behoben sind:

1. `flatEdges` hat den Aufruf von C
   [`rec_reset_vlists`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/flat.c#L333)
   übersprungen, sodass die Cluster-Rangfenster nach dem Einfügen von Vnodes für flache
   Labels veraltet blieben (allein dadurch hat die Portierung bei `2471` **9** Kanten
   verloren, wo C 6 verliert).
2. Die Strafe für Kanten derselben `group` griff bei Selbstschleifen statt bei
   Endpunkten derselben nicht leeren Gruppe
   ([`dot_init_edge`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/dotinit.c#L66)).
3. `CL_CROSS` verwendete den `_WIN32`-Wert 100 von C; die Orakelplattform verwendet 1000
   ([`const.h`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/const.h#L141)).
4. Eine Sackgasse der Triangulation hat `Pshortestpath` abgebrochen, statt wie C zu
   warnen und weiterzumachen + Geradenlinien-Fallback
   ([`shortest.c:333`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/pathplan/shortest.c#L333)).

Nach den Korrekturen sind die NS-Constraint-Dumps der Familie **zeilenidentisch** mit
C (253 rank2-Aufrufe bei `2471`; alle Aufrufe bei `1939`/`1435`/`graphs-structs`), und
die Portierung folgt C durch die anerkannt defekte Wiederherstellung: dieselben
verlorenen Kanten (`3->16` bei 2796; dieselben 6 bei 2471), dieselben Elementbäume.
`1939` wurde vollständig konform. Die verbleibenden numerischen Abweichungen (und der
abweichende pathplan-Schrott bei 1435) sind Verhalten *innerhalb* des
Wiederherstellungszustands, dem die Projektrichtlinie bewusst nicht nachjagt.

**`2723` (Segfault; festgehalten, nicht verfolgt).** Das native `dot` stürzt bei
`tests/2723.dot` (ungerichtet, `rank=same`-Gruppen, beschriftete Kanten) mit Segfault
ab (Exit 139), C hat also keine Ausgabe, mit der man vergleichen könnte. Das Upstream-
[Issue #2723](https://gitlab.com/graphviz/graphviz/-/issues/2723) ist offen, und
`tests/test_regression.py:test_2723` ist `xfail`. Die Portierung wirft
`InternalError` (`INTERNAL_ERROR`, mit einer `TypeError`-Ursache aus
`src/layout/dot/flat.ts:flatLabelYpos`, wo `rank[r-1]` undefined ist). Ohne korrektes
Orakel bleibt der ehrliche Fehlschlag bestehen, und die Portierung wird nicht
geändert; `src/layout/dot/flat-2723.test.ts` hält ihn fest. Dieser Test ist zu
aktualisieren, wenn Upstream das Issue behebt.

**Hinweis zur Richtlinie.** Die frühere Haltung zu A4 („die Portierung erfüllt die
Erwartungen des Issues; nicht nachbilden“) beruhte auf der Annahme, der azyklische
Hilfsgraph der Portierung stamme aus einer harmlosen lokalen Variante. Das war nicht
so — er stammte aus Fehler (1), der `2471` nachweislich fehlgeleitet hat. Die Treue
zum C-Quelltext hat gewonnen: Die Portierung reproduziert jetzt die anerkannt defekten
Ergebnisse von C aus verifiziert identischen Eingaben, und jeder Eintrag hier sollte
**neu vermessen werden, wenn Upstream das entsprechende Issue behebt** (die Ausgabe des
Orakels ändert sich; zu erwarten ist, dass diese IDs bei diesem Upgrade als Regressionen
aufleuchten — das ist Absicht, kein Verfall).

**Belege.** Vergleichsseiten je ID (Renderings nebeneinander + Beleg-Aufzeichnungen):
[`2471`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2471.md),
[`1939`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1939.md),
[`1435`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1435.md),
[`graphs-structs`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/graphs-structs.md),
[`2796 post-fix addendum`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2796-post.md)
(die Basislinie vor der Korrektur bleibt erhalten unter
[`2796-cluster-ranking.md`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-2796-cluster-ranking/comparisons/2796-cluster-ranking.md)).
Diagnose-Artefakte: `.agent-notes/2471-stale-cluster-windows-missing-reset.md`,
`.agent-notes/1939-group-penalty-clcross-misports.md`.

### A5. Ungültige Eingabebytes (Kodierungsdarstellung) {#a5-invalid-input-bytes-encoding-representation}

**Betroffen:** `1367` (diverged, maxΔ 0 — genau ein struktureller Unterschied).

**Was abweicht.** Die Eingabedatei enthält ein nacktes UTF-8-Folgebyte (`0x80`) in
einem Knotennamen. C behandelt nackte Folgebytes 0x80–0xBF als „gültige Zeichen, die
für sich selbst stehen“ (`lib/common/utils.c:1200-1207`, keine Warnung), und der
`<title>`-Text von Knotennamen umgeht die Zeichensatzkonvertierung vollständig
(`agnameof`-Bytes fließen direkt in `gvputs_xml`). Das Orakel-SVG enthält daher das
rohe Byte und ist trotz seiner deklarierten Kodierung **kein gültiges UTF-8**. Die
Portierung dekodiert Eingaben mit ungültigem UTF-8 mit dem Latin-1-Fallback
(`0x80 → U+0080`) und gibt wohlgeformtes UTF-8 aus (`\xc2\x80`).

**Warum akzeptiert.** Die E/A-Grenze der Portierung sind JS-Strings (Browser-Bibliothek).
Ein rohes ungültiges Byte kann den Rückgabewert-String von `renderSvg` nicht
unbeschadet durchlaufen; C byteweise nachzubilden hieße, die Ausgabekodierung für
jeden Nutzer zu beschädigen. Der Latin-1-Fallback spiegelt die eigene
Wiederherstellungssemantik von C („treated as Latin-1“, `utils.c:1249`). Das ist eine
Randbedingung unterhalb des Codes — der Darstellungsschicht —, kein portables
Verhalten, dessen Portierung wir abgelehnt hätten. Alles andere in 1367 ist
konform: Elementzahlen (23 Polylinien / 103 Texte / 44 Polygone / 24 Pfade) und alle
Koordinaten stimmen nach der Korrektur für decorate (T6) überein.

**Beleg.**
Vergleichsseite zu [`1367`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1367.md)
(Rendering nebeneinander + Beleg-Aufzeichnung).

---

### A6. Überlauf der Zeichenfläche bei `unsigned int` bei degenerierter Eingabe {#a6-unsigned-int-canvas-overflow-on-degenerate-input}

**Betroffen:** sfdp `2556` (ein NaN-Layout; siehe den Engine-Track-Eintrag). `1314` —
eine aus einem Fuzzer stammende Eingabe (`fontsize="991836031967s8"`), deren absurde
Schriftgröße die Zeichnung auf ~2.75e11 pt aufbläht — ist mit graphviz 16.1
**conformant**, und ihre Akzeptanz ist entfernt: Die Portierung verengt die Seitengröße
jetzt wie die native `ROUND`-Konvertierung (`47f3165d`) und baut den Seiten-Clip in der
Reihenfolge von `setup_page` auf (`da6c4a53`). Die Mechanismus-Absätze unten
beschreiben den ursprünglichen Unterschied.

**Was geschieht.** C speichert `job->width` / `job->height` als **`unsigned int`**
(`gvcjob.h:327-328`). Das `ROUND(...)` der riesigen Punktgröße (`emit.c:1249-1250`)
läuft über 32 Bit über und wird modulo 2³² umgebrochen, und das SVG-Backend gibt es
über ein **vorzeichenbehaftetes** `%d` aus (`gvrender_core_svg.c:258-259`) — C druckt
also `height="-425618343"`. Die Portierung behält den mathematisch konsistenten
(nicht umgebrochenen) Wert. Jeder andere Wert — Knotenellipse `cx/cy/rx/ry`, das
Wurzel-`translate`, das Polygon, die Text-`font-size` — ist byte-identisch; nur
Breite/Höhe des obersten `<svg>` unterscheiden sich.

**Warum wir dem nicht nachjagen.** Den 32-Bit-Ganzzahlüberlauf von C nachzubilden ist
kein portierenswertes Layout-Verhalten, und die Eingabe ist degeneriert. Neu zu
bewerten, falls Upstream den Überlauf behebt (z. B. das Feld verbreitert oder die
Größe begrenzt).

<a id="a6b-degenerate-nan-layout"></a>

#### A6b. Degeneriertes NaN-Layout (`sfdp`, pathologisches `repulsiveforce`) {#a6b-degenerate-nan-layout-sfdp-pathological-repulsiveforce}

**Betroffen:** `2556` — `repulsiveforce=100` (⇒ die abstoßende Kraft verwendet
`pow(dist, 101)`), was den Spring-Electrical-Solver in **beiden Engines** zu **NaN**
treibt. Das native Orakel selbst gibt durchgehend `nan` als Knoten-/Kantenpositionen
und eine degenerierte Bounding Box aus.

**Was geschieht.** Bei durchgehend NaN-Koordinaten serialisieren die beiden
Implementierungen den Müll unterschiedlich: (1) die Graph-bb / das
Hintergrundpolygon — C rundet `NaN` auf `int`, was auf arm64 Müll in der Größenordnung
von `INT_MIN` ergibt (`bb="0,0,-4.295e+09,-4.295e+09"`); die Portierung behält `0`.
(2) Kanten-Draw-Ops — der Emit-Durchlauf des nativen Binarys unterdrückt `_draw_`/`_hdraw_`
eines NaN-Splines (und gibt nur die `pos` aus), während die Portierung sie mit
NaN-Kontrollpunkten ausgibt. Knotenzeichnungen stimmen überein (beide unterdrücken
sie). Auf keiner Seite existiert ein echtes Layout.

**Warum wir dem nicht nachjagen.** Die Portierung reproduziert bereits dieselbe
NaN-Explosion wie das native Binary — die Korrektur, die sie dorthin gebracht hat, ist
echt (siehe unten); übrig bleibt nur, wie jede Seite NaN-Müll serialisiert. Das
undefinierte Verhalten von C bei `(int)NaN` und dessen Unterdrückung von NaN-Splines
nachzubilden ist keine sinnvolle Layout-Treue bei einer Eingabe, deren Layout in beiden
Engines degeneriert ist. Neu zu bewerten, falls Upstream `repulsiveforce` begrenzt oder
NaN-Positionen bereinigt.

**Korrekturen an der Portierung, die dies erreichbar gemacht haben (nicht
weggejagt — echte Fehler).** Davor konnte die Portierung den degenerierten Zustand gar
nicht erreichen: (1) `armPow` (`src/common/arm-pow.ts`) warf bei jedem Argument
außerhalb des schnellen Pfads eine Ausnahme; es portiert jetzt den vollständigen
Sonderfallzweig von ARM-`pow.c`, sodass `pow(NaN, y) = NaN` wie in libm. (2)
`bezierClip` (`src/common/splines-geom.ts`) lief bei NaN-Kontrollpunkten endlos, weil
sein Konvergenztest die naive Negation von `while (ABS > .5)` in C war (für endliche
Werte äquivalent, nicht für NaN); es spiegelt C jetzt exakt und terminiert bei NaN. Beide
sind C-treu und betreffen nur NaN-Eingaben.

---

### A7. Rundungsgrenze der Boxwand bei `round()` (`dot`) {#a7-round-box-wall-rounding-boundary-dot}

**Betroffen:** `graphs-honda-tokoro` und (am 2026-07-28 hinzugekommen, neu im
905-Item-Universum) sein Geschwister `tree-graphs-directed-honda-tokoro` aus
`graphs/directed/` (beide structural-match, maxΔ ≈ 1 pt an der einzelnen Kante
`n012->n011`). Das Geschwister unterscheidet sich nur durch `samearrowhead`-Attribute,
die das Routing dieses Paars nicht berühren — seine Geometrie `n012->n011` ist auf
Portierungs- wie Orakelseite byte-identisch zur akzeptierten ID, sodass der Mechanismus
unten wörtlich übertragbar ist.

**Was abweicht.** Die Boxwand des Head-Korridors in `maximal_bbox` landet bei C beim
internen x=90, in der Portierung bei x=89, für den gemeinsamen `samehead`-Port der
beiden parallelen Kanten `n012->n011`. Die Konstruktion des gemeinsamen Ports
(`buildSharedPort`) und die Gruppierung der Parallelkanten sind beide byte-konform zu C;
die Lücke von 1 px ist rein ein Artefakt der Rundungsgrenze von `round()` — ca. 1e-14
vorgelagertes Gleitkommarauschen kippt einen Wert, der genau auf einer `.5`-Grenze
liegt, auf die benachbarte ganze Zahl. Die Formel von `maximal_bbox` in der Portierung
spiegelt die von C bereits exakt.

**Warum wir dem nicht nachjagen.** `round()` ist ein Baustein, durch den jede geroutete
Kante im Korpus läuft; sein Grenzverhalten anzustoßen, um diesen einen Fall zu treffen,
ist ein korpusweites Regressionsrisiko für 1 px an 2 Kanten — dieselbe
Randbedingung des gemeinsam genutzten Bausteins wie bei der Rundung der Kontrollhülle,
die unter `bbox-class-control-hull-vs-curve` vermerkt ist. Vollständige Diagnose:
`.agent-notes/honda-samehead-shared-port.md`.

---

### A8. `fp-contract`/FMA-Rundung vs. strikte IEEE (`dot`) — GESCHLOSSEN {#a8-fp-contract-fma-rounding-vs-strict-ieee-dot}

**Status (2026-10-12): geschlossen.** Unter dieser Klasse wird keine Korpus-ID mehr
akzeptiert; der Abschnitt bleibt als historische Dokumentation erhalten. Beide bekannten
Instanzen sind **`conformant`**: `2620` (2026-07-11) und `2646` (2026-10-12).

**Klasse.** clang arm64 kompiliert das Orakel-Binary mit `-ffp-contract=on` und fusioniert
ausgewählte Multiply-Add-Folgen zu einzelnen FMA-Instruktionen; die Portierung läuft auf
V8, das strikte IEEE-754-Rundung durchführt. Bei bitidentischen Eingaben weichen beide
bei dem Ausdruck, den der Compiler kontrahiert hat, um 1–2 ULP voneinander ab. Bekannt
waren zwei Fälle, an zwei verschiedenen Stellen, mit zwei verschiedenen
Verstärkungsmechanismen:

- **2646** — das ULP entstand in der Kubik-Lösung `points2coeff`/`solve3` von
  `Proutespline` und kippte direkt die Wurzelzahl des Spline-Fitters.
- **2620** — das ULP entstand in der Eckpunkt-Ausdehnungsschleife von `poly_init`
  (Knotengrößenbestimmung) und wurde nachgelagert von der originalgetreuen
  Ganzzahl-Abschneidung pro Relaxation in `ortho` zu einem kostengleichen Kippen eines
  Gleichstands im Labyrinth-Korridor verstärkt.

**Geschlossen: `2646` (`0cc05181`, `fix(pathplan): mirror clang fma contraction in
spline intersection`).** Drei smode-Langkanten-Abschnitte (`edge2575`, `edge3905`,
`edge15467`) enden an einer Barrierenwand mit paralleler Tangente, sodass die
`splinefits`-Schnittkubik eine fast doppelte Wurzel hat. `points2coeff` baut diese
Kubik über katastrophale Auslöschung auf; das Orakel fusioniert `route.c:397-398` und
`solvers.c:43`, sodass die Portierung mit strikter IEEE-Rundung eine andere
`solve3`-Wurzelzahl, eine unechte Kreuzung und eine zusätzliche `a`-Halbierung erhielt
(maxΔ 42.09). Der frühere Schluss, dies sei nicht reduzierbar („Software-FMA-Emulation
im gesamten Spline-Fitter“, mit einer widerlegten Teilkorrektur), wurde widerlegt: Die
Kontraktionsstellen sind endlich und aufzählbar. Die Portierung bildet jetzt jede
Kontraktion in `points2coeff` (`route.c:397-398`), `splineintersectsline` (371-372,
374, 360-361, 383-384), `solve3` (`solvers.c:41, 43, 46`) und dem darin inlinierten
`solve2` (80, 85) nach, und `solve3`/`solve2`/`solve1` sind in die Form von C neu
portiert. Alle 42.432 aufgezeichneten `Proutespline`-Aufrufe von `2646` sind bitidentisch
mit dem Orakel (Journalzeile „T7 land“). Ursprüngliche Diagnose (für den Mechanismus
weiterhin gültig): `plans/residual-cleanup/analysis/2646-fp-contract.md`.

**Betroffen (historisch):** `2620` (war structural-match, maxΔ 585; 423 Unterschiede an
24 Kantenpfaden + 22 Pfeilspitzen). **Am 2026-07-11 zu conformant kollabiert:** Die
originalgetreue Portierung des `sgraph`-Adjazenzpuffer-Überlaufs + der bidirektionalen
Einschließung `chancmpid` (siehe `.agent-notes/ortho-maze-circo-rca.md`) hat die
Abweichung beseitigt; der Akzeptanzeintrag ist entfernt, und dieser Abschnitt bleibt
als Dokumentation der Klasse A8 erhalten.

**Was abweicht.** Die `ortho`-Pipeline (`splines=ortho`) ist bei identischen Eingaben
byte-konform zu C — bewiesen durch Injektion der exakten Labyrinth-Eingabe von C
(Koordinaten, `xsize`/`ysize`) in die Ortho-Stufe der Portierung: 378/378 geroutete
Segmente kommen byte-identisch heraus, nichts in `src/ortho` ist also schuld. Die
eigentliche Abweichung ist 1–2 ULP in der *Eingabe* des Labyrinths: Knoten-`ysize` (und,
durch Akkumulation innerhalb des Rangs, `ND_coord.y`), berechnet in der
Polygon-Eckpunkt-Ausdehnungsschleife `poly_init` von C (`shapes.c`), die unter
`-ffp-contract=on` `R.x += sidelength*cosx` zu einem FMA fusioniert, das ~1 ULP größer
ist als die strikte IEEE-Arithmetik der Portierung (beide Seiten implementieren den
arithmetisch identischen Ausdruck). `2620` hat 173 Polygonknoten mit gebrochener Breite;
alle zeigen C ≥ Portierung um 1–2 ULP. Dieses ULP wird — nicht eingeführt, sondern —
verstärkt durch das Dijkstra-Relax von `ortho`, das seine laufende Distanz
originalgetreu je Schritt abschneidet (`sgraph.c:165`, in der Portierung als
`Math.trunc` gespiegelt) über Gewichte, die aus rohen Zellausdehnungen abgeleitet sind
(`maze.c:257`). Die um ein ULP verschobene Geometrie kippt einen kostengleichen
Korridor-Gleichstand bei 4 gerouteten Kanten (Pfade + ihre Pfeilspitzen); die
verbleibenden Unterschiede sind Folgewirkungen der Neunummerierung um ±1 Spur aus diesen
4 Kippvorgängen.

**Warum akzeptiert (Nicht-Reduzierbarkeit durch ein kontrolliertes Experiment
bewiesen).** Ein eigenständiges C-Harness, das nur `-ffp-contract` variiert hat,
reproduzierte beide Seiten am abweichenden Sechseck-Eckpunkt: `-ffp-contract=on` →
`310.29250168188713` (entspricht dem Orakel), `-ffp-contract=off` →
`310.29250168188707` (entspricht der Portierung), wobei die abweichende Operation auf
den Eckpunkt `i=3` eingegrenzt wurde (`R.x=-0.50000000000000011` fusioniert vs. `-0.5`
nicht fusioniert). Ein zweites Experiment mit Eingabe-Injektion (einzige Variable:
die Ortho-Eingabewerte) bestätigte den Verstärker: Gibt man dem eigenen `orthoEdges`
der Portierung das exakte `coord`/`xsize`/`ysize` von C, fallen alle 4
Korridor-Abweichungen auf 0 — der Ortho-Code hat keinen Fehler, er ist nur (wie das
eigene Labyrinth-Kosten-Routing von C) empfindlich gegenüber einer Verschiebung seiner
Eingabe um 1–2 ULP. Ein Treffen würde bedeuten, die spezifische FMA-Kontraktion von
clang an einem kompilierten Ausdrucksbaum in `poly_init` nachzubilden — dem Jagen eines
kompilierten Artefakts statt dem Portieren von Quelltextsemantik. Vollständige Diagnose:
`plans/ortho-2620-residual/analysis/2620-ortho-route.md`.

**Nachgebildete Ausnahme (nicht akzeptiert): `triang.c:ccw`.** Eine
Kontraktionsstelle wird bitgenau reproduziert statt akzeptiert: Das `ccw` von pathplan
kompiliert zu `fnmul`+`fmadd` (exaktes erstes Produkt − gerundetes zweites), sodass ein
Abfragepunkt, der bitgleich mit einem Segmentendpunkt ist, ISCW/ISCCW statt ISON
ergibt. `shortest.c:pointintri` verwirft dann Polygon-Eckpunkt-Endpunkte („destination
point not in any triangle“), und `makeMultiSpline` fällt bei jedem zusammengelegten
2-Zyklus auf einfaches Routing zurück — ein großes, diskretes, korpusweites Verhalten,
das die Portierung treffen muss. Anders als die Stellen `solve3`/`poly_init` oben (tief
in kompilierten Ausdrucksbäumen, Korrektur widerlegt) ist `ccw` eine einzelne
eigenständige kompilierte Funktion mit klarer Semantik, daher bildet
`src/pathplan/triang.ts` sie nach: ein Double-Schnellpfad mit konservativer
Fehlerschranke dort, wo einfache und fusionierte Vorzeichen nachweislich übereinstimmen,
und ein exakter Pfad aus Dekker-Produkt + dyadischem BigInt für die Fälle nahe null.

---

### A9. libm-Trigonometrie um 1 ULP → Kippen des CDT-Gleichstands bei Kozirkularität (`circo`/`twopi`-Multispline) {#a9-libm-trig-1-ulp-→-cdt-cocircular-tie-flip-circo-twopi-multispline}

**Klasse.** `Math.sin`/`Math.cos` von V8 sind nicht bitidentisch mit `sin`/`cos` der
Apple-libm (bewiesen: 1-ULP-Unterschied bei `2π·4.5/8`, einem der acht
Eckwinkel des Ellipsen-Hindernisses). Die Ecken des umschriebenen 8-Ecks von
`makeObstacle` erben dieses ULP, sodass sich die Eingabekoordinaten des
Dreiecks-Routers um ≤6e-14 von denen des Orakels unterscheiden. Symmetrische Layouts
(gleich große Knoten auf einem Rang/Ring) machen die Vierecke des Routers in reeller
Arithmetik **exakt kozirkular**, sodass das exakte Incircle-Prädikat auf Messers
Schneide sitzt: Das Eingabe-ULP kippt sein Vorzeichen, die Diagonale der Constrained
Delaunay kippt, und das Korridorpolygon, das im Orakel an `Pshortestpath` scheitert
(„destination point not in any triangle“ → Fallback auf einfachen Spline), gelingt in
der Portierung (oder umgekehrt). Die resultierenden Splines unterscheiden sich um
~0.2–0.5pt. Geschwister der (inzwischen geschlossenen) **A3**/**A8**: eine nicht reduzierbare
Gleitkomma-Portabilitätsbeschränkung unterhalb der C-Quelltextsemantik — ein Treffen
würde erfordern, die exakte `sin`/`cos`-Rundung der Apple-libm in JS zu reproduzieren.

**16.1-Neubasierung.** In der Geometrie des Multispline-Korridors fehlte die
FMA-Kontraktion von clang (Radikand der Ellipsenecke, `mkCtrlPts`, `DIST` =
sqrt(fmadd), das Skalarprodukt in `line_intersect`); `f66ac638` (`fix(neato): mirror fma
contraction in multispline routing geometry`) hat sie nachgebildet. twopi- und neato-`241_0`
— die diese Klasse dem kozirkularen Gleichstand unten zugeschrieben hatte — wurden
**conformant** (Akzeptanzen entfernt), und sfdp `42` hatte sich als völlig ohne
Gleichstand erwiesen (es ist A1-Drift, siehe
[`comparisons/sfdp-42.md`](https://github.com/knowvah/dot-engine/blob/main/comparisons/sfdp-42.md)). circo-, fdp- und sfdp-`241_0`
weichen weiterhin ab, ihre Reste sind unverändert oder verringert; ihre Zuschreibung zum
Gleichstand unten ist älter als `f66ac638` und wurde seither **nicht per
Positions-Injection neu verifiziert**, obwohl dieselbe Korrektur gezeigt hat, dass die
Zuschreibung für twopi/neato falsch war.

**Betroffen:** `241_0` (circo Δ≈0.2 durch das Kippen des Korridors an der Kante `1->2`;
fdp- und sfdp-`241_0` auf den Engine-Tracks unten); `2343`, `2239`, `share-b29`, `windows-b29`
(twopi, je 1–2 Unterschiede bei Kanten-Label-Positionen — das libm-1-ULP entsteht in
der Einheitseckpunkt-Trigonometrie von `poly_init` (`hypot`/`atan2`/`sin`), setzt die
berechnete Höhe eines Knotens ein ULP jenseits der Mindestgrößen-Klammer, auf der das
Orakel exakt landet, und kaskadiert über `floor()` beim Laden des xlabel-R-Baums zu
einem einzelnen Kippen eines Label-Kandidaten. Eine Korrektur mit korrekt gerundetem
hypot wurde versucht und WIDERLEGT: Sie behob `2343`, verschlechterte aber `2168_3`,
dessen Achteck-Größenbestimmung durch denselben Aufruf läuft, bei dem der Wert des
Orakels NICHT der korrekt gerundete ist — keine deterministische hypot-Richtlinie
trifft das Orakel in beiden Fällen). `2168_1` gehörte ursprünglich zu dieser Klasse,
wurde aber konform, sobald die Portierung das fp-kontrahierte `ccw` des Orakels
nachbildete (pathplan `triang.ts`): Sein Korridor-Fehlschlag wird von der
FMA-behafteten Zurückweisung von Eckpunkt-Endpunkten in `pointintri` bestimmt, die die
Portierung jetzt bitgenau reproduziert, sodass der ULP-Gleichstand der CDT-Diagonale
dort nicht mehr auftritt.

**Warum akzeptiert (Nicht-Reduzierbarkeit durch ein kontrolliertes Experiment
bewiesen).** Die CDT selbst ist entlastet: Das `mkSurface` der Portierung ist eine
originalgetreue Portierung der inkrementellen Einfügung von GTS 0.7.6 (`cdt.c`:
1→3-Teilung + rekursives `swap_if_in_circle`, Constraint-Kanten vorab angelegt und nicht
vertauschbar, Erzwingen der Constraints per `remove_intersected_*` +
`triangulate_polygon`), und ein eigenständiges C-Harness, das die **echte GTS-Bibliothek**
linkt und mit den bitgenauen Router-Eingaben der Portierung gespeist wurde, reproduziert
die Triangulation der Portierung Fläche für Fläche (2168_1: 22/22; 241_0: 185/185).
Eine Auswertung der Incircle-Determinante in exakten rationalen Zahlen auf den beiden
Eingabemengen bestätigt das Kippen des Vorzeichens (+1 mit den Eingaben der Portierung,
−1 mit denen des Orakels). Die verbleibende Variable — der 1-ULP-Trigonometrieunterschied
— wurde durch direkten Vergleich der Bitmuster von `Math.sin`/`sin` isoliert.

**Engine-Track-Akzeptanz (`accepted-divergences-engines.json`).**
<a id="a9-engine-track-twopi-circo"></a> Die **xdot-Engine-Tracks** für twopi/circo
(`parity-twopi.json` / `parity-circo.json`, natives Orakel `dot -K <engine> -Txdot`,
`test/corpus/engine-walk.ts`, semantischer Draw-Op-Vergleich bei ±0.01 — siehe
`test/golden/compare-xdot.ts`) bringen denselben Mechanismus unabhängig vom oben
genannten SVG-Survey der dot-Engine zutage: twopi `2239` (1 Draw-Op-Unterschied — das
Kippen der Textposition des Kanten-Labels `_ldraw_`, dasselbe ULP der
Einheitseckpunkt-Trigonometrie von `poly_init`, das über die `floor()`-xlabel-R-Baum-Kette
kaskadiert; `2343`, `share-b29` und `windows-b29`, ursprünglich unter diesem Eintrag
akzeptiert, wurden am 2026-07-11 durch die originalgetreue fmadd-Kontraktion in
`polylineMidpoint` *behoben* — siehe den Absatz zur b29-Familie unten) und circo `241_0`
(41 Draw-Op-Unterschiede, Δ≈0.2pt am gerouteten Bezier der Kante `1->2` — dasselbe
Kippen des CDT-Diagonal-Korridors; Entscheidungsjournal, Eintrag vom 2026-07-10 „CDT
rewritten as faithful GTS port; 2168_3 outline-ring obstacle; 56/osage bb clobber; A9
filed“). Auf Engine-Track-Ebene akzeptiert über
`test/corpus/accepted-divergences-engines.json`, das `parity-report.ts` in
`PARITY-twopi.md`/`PARITY-circo.md` einbindet — dieselbe Verknüpfung, die `accepted.ts`
für das `PARITY-dot.md` des dot-Tracks vornimmt.

**circo `2475_2` — kozirkularer Gleichstand bei `hypot` in closestNode.** In einer
Komponente mit 28 Knoten dieses Graphen mit 10762 Knoten wählt das `getRotation` von circo
(`circpos.c:73-92`) per `hypot` den dem Layoutursprung nächsten Blockknoten, um die
Rotation des Unterblocks zu bestimmen. Zwei kozirkulare Knoten sind praktisch
gleich weit entfernt; das korrekt gerundete `Math.hypot` von V8 und das `hypot` der Apple-libm
runden diese Distanz um 2 ULP unterschiedlich, was das strikte `<` kippt, einen anderen
Knoten auswählt und den Unterblock um ~20° dreht/spiegelt (18 Knoten bewegen sich, max.
296.7pt; die übrigen 10744 Knoten sind bitidentisch, ebenso der Blockbaum, die
Kreisreihenfolge und jedes `centerAngle`). Die CR-hypot-Richtlinie wurde für diese
Klasse bereits widerlegt (2026-07-10). Eigenständige Reproduktion:
`.agent-notes/circo-2475-590-repro.dot`; vollständige Ursachenanalyse:
`.agent-notes/circo-b81-2475-rca.md` (akzeptiert 2026-07-11).

**twopi `2470` — ULP bei Radialkoordinaten, verstärkt durch den xlabel-R-Baum.**
2470 ist ein Graph mit 140 Kanten, dessen HTML-`<table>`-Kanten-Labels sich an fast
zusammenfallenden radialen Ankern häufen. In der neato-Familie werden Kanten-Labels
vom gierigen xlabel-Platzierer (`label/xlabels.c`) als externe Labels gesetzt, der über
einen nach Hilbert geordneten R-Baum die am wenigsten überlappende Kandidatenecke
wählt. Splines und Knotenkoordinaten der Portierung stimmen mit dem Orakel bis zur
Ausgabepräzision überein (null Spline-/Knoten-/bbox-Unterschiede selbst bei 1e-7),
aber das radiale `ND_coord.y` eines Knotens unterscheidet sich um ~2 ULP (Apple-libm
`sin`/`cos` vs. V8-`Math`) — weit unter der Konformitätslatte, überschreitet jedoch in
`objplpmks` die Grenze `floor(pos.y − sz.y/2)` bei genau 0 und kippt das R-Baum-Rechteck
dieses Objekts um eine Einheit. Die Änderung der Hilbert-Reihenfolge/Baumgruppierung
lässt `RTreeSearch` einen anderen Zweig beschneiden, sodass ca. 140 Labels jeweils zur
benachbarten Kandidatenecke springen (jeder Unterschied ein fester Schritt von
(+Breite, −Zeilenhöhe)). Platzierer, Objektreihenfolge, Rechteckrundung, `CombineRect`
(das die Min-Min-Eigenheit von C originalgetreu spiegelt) und der int32-Hilbert-Schlüssel
wurden jeweils als originalgetreu verifiziert; die Abweichung ist das vorgelagerte
ULP der Radialtrigonometrie, aus demselben Grund nicht reduzierbar wie bei twopi `1855`.
Akzeptiert 2026-07-11; vollständige Ursachenanalyse: `.agent-notes/twopi-2470-rca.md`
(die auch dokumentiert, dass das „Bestehen“ der ID am Morgen ein Artefakt eines
veralteten Orakel-Binarys war und keine Regression der Portierung).

**osage `1855` — Verschmierung der Hindernis-Eckpunkte durch fp-contract.** Zu
unterscheiden vom radialen Spiegel-Eintrag von twopi `1855` oben: Bei osage sind die
Knotenmittelpunkte bitgenau gleich dem Orakel, und die 110 Draw-Op-Unterschiede sind
drei per Hindernis gerouteten Kanten, die auf der Spiegelseite einer Knotenreihe
platziert sind (X bitgenau, Y gespiegelt). Die Achteck-Hindernis-Eckpunkte aus
`circumscribed_polygon_corner_about_ellipse` (`neatosplines.c:301`) weichen um 3–4 ULP
von C ab, weil `-ffp-contract=on` von clang die `a·b±c`-Ketten in
`ellipse_tangent_slope`/`line_intersection` zu FMAs mit einfacher Rundung fusioniert,
während V8 jede Operation rundet: Die fusionierte Rundung von C lässt eine Gassenspalte
von Eckpunkt-x-Werten zu einem einzigen bitidentischen Double kollabieren (exakt
kollinear), die der Portierung teilt sie in zwei Werte mit 1 ULP Abstand. Das kippt den
Tangentialitätstest `clear()` der Sichtbarkeit — die Gasse ist nicht mehr blockiert —,
wodurch ca. 20 Sichtbarkeitskanten hinzukommen, und Dijkstra löst den
Homotopie-Gleichstand oben/unten zur Spiegelseite hin auf. Kontrolliertes Experiment:
Die Injektion der exakten Hindernis-Koordinaten von C in die ansonsten unberührte
Portierung ergibt **null** abweichende Kanten und entlastet damit die gesamte Kette aus
Legal-Arrangement, Sichtbarkeit, Dijkstra und Spline vollständig; die Injektion allein
von `cos`/`sin` aus der libm von C bewirkt nichts. Akzeptiert 2026-07-11; vollständige
Ursachenanalyse: `.agent-notes/osage-spline-family-rca.md`.

**b29-Familie (twopi).** Die vier b29-Varianten teilen eine Messerschneide: Das
Kanten-Label `EqmtTyp` (`Node14732->Node14731`) sitzt auf einem exakten Gleichstand der
Seitenwahl von placeLabels, dessen Ergebnis von einer 1-ULP-Drift des twopi-Layouts der
umgebenden Objekte abhängt. Mit der originalgetreuen fmadd-Kontraktion in
`polylineMidpoint` (Korrektur der states-Familie, 2026-07-11) ist der Label-Anker der
Portierung bitidentisch mit dem des Orakels, und doch wird der Gleichstand bei zwei der
vier Varianten (`graphs-b29`, `linux.i386-b29`) weiterhin entgegengesetzt aufgelöst,
während die anderen beiden (`share-b29`, `windows-b29`) jetzt konform sind — und die
akzeptierte A9-Label-Abweichung von `2343` ist vollständig verschwunden. Schranke:
1 Draw-Op, Δ12pt beim Label-y. Nicht reduzierbar, ohne die vorgelagerte Drift zu
beseitigen. Vollständige Ursachenanalyse: `.agent-notes/twopi-states-rca.md`.

Dieselbe Messerschneide von placeLabels tritt im **osage**-Track auf (akzeptiert
2026-07-11, vollständige Ursachenanalyse: `.agent-notes/osage-small-tail-rca.md`):
`linux.i386-b29` und `share-b29` (je 2 Draw-Op-Unterschiede — der x-Anker eines
Kanten-Labels landet bei 878.28 statt 841.06, symmetrisch um den bitidentischen
Spline-Mittelpunkt 859.67 platziert, also ±die halbe Label-Breite; die beiden Varianten
spiegeln einander) und `1652` (2 Draw-Op-Unterschiede — zwei Kanten kippen je einen
Label-Anker um einen identischen Mittelpunkt, eine in x und eine in y, bei
bitidentischen Splines und Pfeilspitzen; das Orakel rendert vollständig, es handelt sich
also nicht um den bekannten Flake des nativen Timeouts). In jedem Fall ist die
Kantengeometrie bitgenau, und nur der Gleichstand der Label-Seitenwahl wird bei um 1 ULP
abgedrifteter Umgebung entgegengesetzt aufgelöst.

Der osage-Track führt das `polypoly`-Tripel (`graphs-polypoly`, `share-polypoly`,
`windows-polypoly`; akzeptiert 2026-07-11, vollständige Ursachenanalyse in
`.agent-notes/patchwork-tail-rca.md`): Die einzige abweichende Operation ist das blanke
transzendente `cos(π+θ)` an einem Eckpunkt eines verzerrten Vierecks mit Orientierung
180 — `Math.cos` von V8 ist korrekt gerundet, während `cos` der Apple-libm einen
argumentabhängigen Fehler von ±1 ULP trägt (nur unter libm ist also `|cos(π+θ)| ≠
|cos(θ)|`); das 1-ULP-Knotengrößen-Delta fließt in `GRID`/`ceil` von pack, kippt einen
Umfangs-Gleichstand, und das qsort platziert zwei Komponenten in die Packzellen der
jeweils anderen — ein starrer Austausch ganzer Knoten ohne Form- oder Routingfehler. Keine
deterministische Umschreibung kann eine nicht korrekt gerundete transzendente
libm-Funktion reproduzieren, die klassische A9-Gestalt.

Derselbe Mechanismus wurde am 2026-07-28 am größeren Geschwister
`tree-graphs-directed-polypoly` bestätigt (`graphs/directed/polypoly.gv`, neu im
905-Item-Universum; 112 Draw-Op-Unterschiede, nur osage). Die abweichende Operation ist
dieselbe 1-ULP-Stelle `cos(π+θ)` an Knoten `9004` — die `bb.x`-Werte von C und der
Portierung stimmen byteweise mit der ursprünglichen Ursachenanalyse überein —, aber bei
dieser Eingabe mit 76 Knoten läuft die Ausbreitung stattdessen über `arrayRects` von
osage: `acmpf` sortiert Packzellen nach der rohen Summe `width+height`, und die um 1 ULP
zu hohe Breite aus libm lässt `9004` strikt vor seinen rotierten Geschwistern
`9000/9002/9006` einsortieren, während der korrekt gerundete Wert von V8 einen exakten
4-fachen Gleichstand lässt, den das nicht stabile qsort anders ordnet — andere
zeilenweise angeordnete Zellen, ein Tausch `9002`/`9006` und eine
Spaltenbreiten-`fmax`-Kaskade, die 8 Nachbarn in x verschiebt. Gibt man dem eigenen
`arrayRects` der Portierung die Knotengrößen von C gegenüber den Knotengrößen der
Portierung, so reproduziert das die 10 verschobenen Knoten des Sweeps mit
byteweise übereinstimmenden x-Deltas und schließt die Kausalkette.

Zwei weitere Instanzen auf Engine-Track-Ebene wurden am 2026-07-11 in ihrer Ursache
geklärt und akzeptiert (vollständige Ursachenanalyse: `.agent-notes/circo-edge-tail-rca.md`):
twopi `241_0` (6 Draw-Op-Unterschiede, damals demselben kozirkularen CDT-Incircle-Gleichstand
zugeschrieben wie der circo-Eintrag oben; **mit graphviz 16.1 zurückgezogen** — es ist seit
`f66ac638` conformant, das Kippen des Korridors zwischen 14 und 8 Punkten war also die
nicht nachgebildete FMA-Kontraktion, kein Gleichstand) und circo `windows-tree` (10
Draw-Op-Unterschiede an einer Fächerkante — die
Platzierungstrigonometrie von circo setzt `node2.y` genau ein ULP über `node8.y` um den
exakt symmetrischen Wert 18.0, und die dyna-Head-Port-Wahl von `closestSide` kippt bei
diesem exakten Gleichstand zwischen TOP/BOTTOM; Knotenpositionen und Boxen sind sonst
bitidentisch mit dem Orakel).

**sfdp-Engine-Track — Kanten-FP-Gleichstand (`241_0`).**
<a id="a9-sfdp-fp-ties"></a> Der xdot-Engine-Track von sfdp (`parity-sfdp.json`, nativ
`dot -Ksfdp -Txdot`, ±0.5) bringt den kozirkularen CDT-Incircle-Gleichstand zutage, sobald
exakte native Positionen vor dem Routing injiziert werden (die Abweichung ist also NICHT
iterative Drift — siehe die Klasse A1-drift — sondern ein diskreter Prädikat-Gleichstand):

- `241_0` — dem kozirkularen CDT-Incircle-Gleichstand zugeschrieben (der
  Multispline-Korridor; nach `f66ac638` nicht neu verifiziert, siehe die 16.1-Neubasierung
  oben). Der Rest ist ein **Kippen der Segmentzahl**: 7 Draw-Op-Unterschiede an Kante
  1->2, `ptCount 8 vs 20` (20 Unterschiede vor `f66ac638`) — der Korridor gelingt mit
  einem N-Punkte-Spline, wo das native Build auf eine kürzere einfache Route
  zurückfällt (oder umgekehrt), wie im Eintrag zu circo `241_0` oben. Die Portierung bildet die arm64-`fmadd`-Kontraktion
  im Incircle-/`ccw`-Prädikat bereits nach (`src/pathplan/triang.ts`,
  `src/common/fma.ts`) und verwendet eine robuste Incircle-Delaunay; der Rest ist das
  1-ULP von V8 vs. Apple-libm bei `sin`/`hypot` in der Prädikat-Eingabe, das kein
  portabler Code reproduziert.

> **sfdp `42` von A9 auf A1-drift umklassifiziert (graphviz-16.1-Sync).** Es war hier
> als CDT-/libm-Incircle-Gleichstand geführt. Die Mission fand etwas anderes
> ([`comparisons/sfdp-42.md`](https://github.com/knowvah/dot-engine/blob/main/comparisons/sfdp-42.md)): Das frühere Kippen des
> Korridors war ein portierungsseitiger FMA-Fehler in der Geometrie des
> Multispline-Korridors, behoben durch `f66ac638` (`fix(neato): mirror fma contraction in
> multispline routing geometry`); mit injizierten nativen Positionen reproduziert die
> Portierung jetzt das native xdot exakt. Der verbleibende Rest (Knotenversätze
> 0.06-0.65 pt) ist iterative Drift, ausgelöst durch eine 1-ULP-Abweichung zwischen
> `pow(dist, 2)` der Apple-libm und dem ARM-`pow` der Portierung auf der gröbsten Ebene,
> verstärkt durch die feineren Ebenen — A1 (siehe
> [A1](#a1-floating-point-determinism-force-directed-engines)).

> **`2095` von A9 auf A1-drift umklassifiziert (2026-07-22).** Sie war zuvor hier als
> „das hypot-Geschwister“ geführt (Drift unter 0.7pt an den Kanten eines Knotens mit
> leerem Namen `""->"4"`). Dieser Rest war ein **Harness-Artefakt**: Der reguläre
> Ausdruck `GVTS_POS` des Attributions-Injektors verlangte ≥1 Namenszeichen, sodass der
> Knoten mit dem Namen `""` nie injiziert wurde und seine beiden inzidenten Kanten
> mitzog. Nachdem der Injektor so korrigiert wurde, dass er leere Namen trifft
> (`(.+)`→`(.*)`, `src/layout/neato/splines.ts`), injiziert sich sfdp `2095` auf **0 Rest**
> — reine Kräfte-Drift, abgedeckt von der berechneten Klasse A1-drift, kein
> Routing-FP-Gleichstand. Sein Einzel-Accept wurde aus
> `accepted-divergences-engines.json` entfernt. (Gleicher Befund wie bei fdp `2095`
> unten.)

**Frisches kontrolliertes Experiment (2026-07-21).** Eine Sonde für natives vs. V8-`hypot`
(`plans/sfdp-tracked-divergences/batch-2/hypot-ulp-probe.txt`): Das Kompilieren des
`hypot` der System-C-Bibliothek und der Vergleich mit Node-`Math.hypot` an
repräsentativen Abweichungseingaben flacher Kanten zeigt eine 1-ULP-Abweichung bei 2 von 6
(Δ 7.1e-15 und 5.7e-14) — die Messerschneide der Teilungsschwelle, die die
Unterteilungszahl kippt. Nicht reduzierbar: Kein portables hypot reproduziert die
Apple-libm (der Präzedenzfall `arm-pow.ts` für dieselbe Grenze). `sfdp.241_0` ist auf
Engine-Track-Ebene über `accepted-divergences-engines.json` akzeptiert. `sfdp.42` gehört
**nicht** zu dieser Klasse: Sein Registereintrag ist A1 (`comparisons/sfdp-42.md`), und die
Sonde oben hat ihn nicht erklärt.

Der xdot-Engine-Track von **fdp** (`parity-fdp.json`, nativ `dot -Kfdp -Txdot`, ±0.5) bringt
DENSELBEN kozirkularen CDT-Gleichstand am selben Graphen `241_0` zutage: Mit injizierten
exakten Positionen des Orakels vor dem Routing besteht der Rest aus 11 numerischen
`unfilled_bezier`-Unterschieden, beschränkt auf eine Kante (`0->1#0`, maxΔ 3.39pt). Da die
Knotenpositionen injiziert identisch sind, liegt die Abweichung nachgelagert im
Multispline-Korridor von pathplan — derselbe libm-1-ULP-Incircle-Gleichstand wie bei
circo/sfdp `241_0` (Incircle in exakten rationalen Zahlen 185/185 oben; 11 Unterschiede durch
`f66ac638` unverändert — nicht per Injection neu verifiziert). Die Hebel
sind bereits angewandt (`src/pathplan/triang.ts` fmadd, `src/pathplan/route.ts:198`
`Math.hypot`); der Gleichstand wird als nicht reduzierbar behandelt. Akzeptiert über
`accepted-divergences-engines.json` `fdp.241_0`. `2095` von fdp ist dagegen **A1-drift,
nicht A9**: Die Injektion des einen Knotens mit leerem Namen (nachdem der
Attributions-Injektor so korrigiert wurde, dass er Knoten mit dem Namen `""` trifft)
lässt seinen Rest auf null kollabieren — der frühere „A9-Tail“ war der nicht injizierte
leere Knoten, der seine inzidenten Kanten mitzog. Das Accept von sfdp `2095` war derselbe
blinde Fleck — eine frische Neuerzeugung der sfdp-Attribution (2026-07-22) mit dem
korrigierten Injektor bestätigte, dass es sich ebenfalls auf 0 injiziert, und sein Accept
wurde entfernt (siehe den Hinweis `2095 reclassified` oben).

---

### A10. Größenlimit der V8-`Map` beim Polyomino-Packing (`2784`, fünf Pack-basierte Engines) {#a10-v8-map-size-limit-in-polyomino-packing-2784-five-pack-based-engines}

**Betroffen:** `2784` auf `circo`, `twopi`, `neato`, `fdp` und `sfdp`, in jedem
Ausgabeformat. Auf `dot` ist es `conformant`.

**Was geschieht.** `lib/pack/pack.c` hält die von einer Komponente belegten Zellen in
einem `PointSet` fest. Für `2784` (ein einzelner Knoten, 3e16 pt hoch, `splines="ortho"`)
benötigt die originalgetreue Ganzzahl-Arithmetik für `step`/Platzierung 2.011.656.764
Zellen; das native 16.1.0 benötigt 482 s und belegt 67.3 GB resident (101 GB Spitze). Das
`PointSet` der Portierung ist eine JavaScript-`Map`, die V8 auf 2^24 Einträge begrenzt,
sodass sie `Map maximum size exceeded` wirft.

**Warum akzeptiert.** Eine Laufzeitgrenze unterhalb des Codes, keine Logiklücke; die
Ursache ist die originalgetreue Arithmetik von `97fcccd8` (davor berechnete die
Portierung ein kleines, falsches Layout und erreichte das Limit nie). Das akzeptierte
Ergebnis ist ein geworfener Fehler statt eines `diverged`-Urteils, und die Register je
Engine akzeptieren nur `diverged`-Zeilen, sodass kein Registereintrag existiert: Die
Durchläufe führen `2784` weiterhin unter ihren Portierungsfehlern. Belege:
[`comparisons/2784-pack-cells.md`](https://github.com/knowvah/dot-engine/blob/main/comparisons/2784-pack-cells.md).

---

## Nachverfolgter Long Tail (`dot`-Attribute & Randfälle) {#tracked-long-tail-dot-attribute-edge-case}

Mit **Standardwerten** stimmt die `dot`-Engine auf dem Golden-Korpus mit dem C-Binary
innerhalb einer engen deterministischen Toleranz überein (das Urteil `conformant`; siehe
den Hinweis ganz oben). Die verbleibenden Unterschiede sind der **Long Tail aus
Attributen und Randfällen** — der historisch schwierige Teil jeder Graphviz-Portierung.
Anders als die akzeptierten Abweichungen oben werden diese geschlossen *werden*; sie
werden live, mit Zählwerten, in
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
nachverfolgt:

| Kategorie | Was abweicht |
|---|---|
| **path-structure** | Spline-Routing von Kanten in bestimmten Konfigurationen (z. B. einige Fälle mit flachen Kanten und dichten Korridoren). |
| **element-count** | Ein Feature, das in bestimmten Graphen mehr/weniger SVG-Elemente ausgibt als C. |
| **color-stroke** | Unterschiede bei der Ausgabe von Strich/Füllung für bestimmte Stilattribute. |
| **parser-gap** | Eine kleine Zahl von DOT-Eingaben, die der Parser noch nicht vollständig akzeptiert. |

Wenn Ihr Graph nur gängige Attribute und die `dot`-Engine verwendet, befinden Sie sich
mit ziemlicher Sicherheit auf dem Pfad der deterministischen Toleranz. Wenn ein Layout
falsch aussieht, prüfen Sie `PARITY-dot.md` für diese Eingabeklasse — wahrscheinlich ist
es ein nachverfolgter Punkt mit einer am Orakel festgemachten Korrekturmission und kein
unbekannter Fall.

> **Hinweis zu textabhängigen Fällen.** Die Klasse der Textvermessung (A2) ist
> abgeschlossen — kein `dot`-Graph ist mehr unter ihr akzeptiert. Ein Graph, der heute
> bei structural-match liegt, ist eine nachverfolgte Lücke, keine Abweichung durch
> Schriftmetriken.

### Pfeilspitzen gegenläufiger Kanten bei `concentrate=true` {#concentrate-true-opposing-edge-arrowheads}

Wenn `concentrate=true` ein antiparalleles Paar (`A->B; B->A`) zu einer einzigen
überlebenden Kante zusammenführt, muss diese Kante an **beiden** Enden eine Pfeilspitze
zeichnen. Das ist jetzt portiert (der Zweig `conc_opp_flag` von `arrow_flags`; siehe
`src/common/splines-clip.ts:arrowFlags`), sodass `graphs-b135`, `167` und `2087`
übereinstimmen (die Abweichung `element-count` durch fehlende Pfeilspitzen und ihr
Nebeneffekt auf das ungeclippte Spline-`@d` sind beide verschwunden).

Einige concentrate-Graphen **behalten einen separaten, bereits vorher bestehenden
Rest**, den die Pfeilspitzen-Korrektur **nicht** angeht — es ist eine Abweichung der
**x-Koordinate** von Knoten (x-Netzwerk-Simplex / Kompass-Port), kein Pfeilspitzenfehler:

- **`graphs-b15`, `graphs-b69`** — die großen Record-/Cluster-„Aufzug“-Graphen.
  Concentrate wird aktiv und führt korrekt zusammen; der Rest ist ein Knoten-x-Delta von
  ~1pt, das sich zu einem Unterschied bei `element-count`/Spline-`@d` verstärkt. Die
  Ausgabe der Pfeilspitzen selbst ist jetzt korrekt (b69 erhält seine fehlenden
  Pfeilspitzen-Polygone). Siehe die Agentennotiz `b69-concentrate-undermerge` zur
  Ursache bei der x-Koordinate.
- **`1453`** — weicht weiterhin aus einer Ursache auf oberster Ebene bei `element-count`
  ab, die mit der Pfeilspitze von conc_opp_flag nichts zu tun hat.
- **`2825`** — wich zum Zeitpunkt dieser Pfeilspitzen-Korrektur aus einer Ursache auf
  oberster Ebene bei `element-count` ab, die nichts mit conc_opp_flag zu tun hat (dort
  wird keine Zusammenführung eines gegenläufigen Paars ausgelöst); inzwischen durch die
  Mission fix-2825-rebuild-vlists geschlossen, siehe A4 oben.

Das sind nachverfolgte Punkte bei x-Koordinaten / Struktur, **keine** Pfeilspitzenfehler.

### Lücken in der Layout-Treue aus der Fidelity-Mission 2.0 (neato, sfdp, fdp, twopi, circo) {#layout-fidelity-gaps-from-the-2-0-fidelity-mission-neato-sfdp-fdp-twopi-circo}

Die Fidelity-Mission 2.0 hat nicht portierte Attributwerte laut scheitern lassen (siehe
die Tabelle `UNSUPPORTED_FEATURE` unter
[Fehler und Ausnahmen](https://github.com/knowvah/dot-engine/blob/main/docs-site/guide/errors.md)).
Sie hat Folgendes übrig gelassen, festgehalten in
`plans/v2-fidelity/decision-journal.md`.

**Laut, nicht portiert.** `overlap=voronoi` mit überlappenden Knoten wirft in neato,
twopi, circo und sfdp weiterhin `UNSUPPORTED_FEATURE`: Der Voronoi-Adjuster selbst (der
Algorithmus von `vAdjust`) ist nicht portiert. Der Überlappungstest, der entscheidet, ob
geworfen wird, ist der von C selbst (`countOverlap` über die `poly.c`-Knotenpolygone).

**Bekannte Lücken, weiterhin still.** Die Portierung rendert diese ohne Fehler und
weicht vom nativen Graphviz ab. Gefunden von der Mission `v2-silent-gaps`
(`plans/v2-silent-gaps/decision-journal.md`); keine akzeptierten Abweichungen.

- **Die Warnung „Unrecognized overlap value“ von `getAdjustMode` wird nicht ausgegeben.**
- **Gedrehte Polygon-Eckpunkte können sich in den letzten Bits vom nativen Binary
  unterscheiden (nicht reduzierbar: Mathematikbibliothek des Hosts).** `poly_init`
  richtet jeden Eckpunkt mit `atan2`, `hypot`, `sin` und `cos` aus. Bei bitidentischen
  Eingaben liefern macOS-libm und V8 unterschiedliche letzte Bits (z. B.
  `atan2(0x3fd6a09e667f3bce, 0xbfd6a09e667f3bca)`: libm `…21d1`, V8 `…21d2`; `hypot` am
  nächsten Eckpunkt: libm `…fffd`, V8 `…fffe`), sodass eine Box mit `orientation=20` in
  der Portierung das Eckpunkt-y `-18` erhält und nativ `-17.999999999999996`. Das native
  Graphviz selbst variiert mit der libm der Plattform, und ein Browser kann sie nicht
  aufrufen. Die eigene Arithmetik der Portierung entspricht C (Reihenfolge von `RADIANS`
  festgelegt; 776 von 1664 stichprobenartig geprüften Eckpunktkoordinaten sind
  bitidentisch, der Rest unterscheidet sich allein durch libm). Wirkung: Urteile von
  `polyOverlap` bei exakter Berührung können kippen; mit nativen Eckpunkten stimmt jedes
  Urteil.
- **sfdp kann unter macOS vom nativen Binary abweichen (nicht reduzierbar: `pow` der
  Host-libm).** Diagnostiziert mit einem instrumentierten nativen sfdp: Positionen bleiben
  bitidentisch, bis ein Term der abstoßenden Kraft, `pow(dist, 1 - p)`
  (`spring_electrical.c`, `p = -1`, also `pow(x, 2)`), von der macOS-libm ein ULP weniger
  als `x*x` liefert (`pow(1.4116727416983157, 2)`: libm `1.9928199296540394`, korrekt
  gerundet `…396`; unter macOS ist `pow(v, 2) != v*v` bei 20 von 16201 Stichproben-`v`).
  Das ändert `Fnorm` der Iteration im letzten Bit; das adaptive Abkühlen von sfdp
  verstärkt es zu einem anderen (oft gespiegelten) Layout. Das `armPow` der Portierung ist
  das `pow` aus den optimized-routines von ARM (glibc ≥ 2.28), also das, was Graphviz unter
  Linux berechnet; das macOS-Orakel ist der Ausreißer. Ausgeschlossen: Seeding (explizite
  `start=`-Werte stimmen überein), `pcp_rotate` (gleiche Eingabe gibt gleiche Ausgabe),
  Positionen und der anziehende Term (bitidentisch). Beispiel: ein einzelnes Dreieck
  `a--b; a--c; b--c` mit dem Standard-Seed.
- **fdp kann durch `cos`/`sin` der Host-libm vom nativen Binary abweichen.** fdp folgt
  Graphviz nach 15.0.0 (Abstoßung nach hypot-Distanz, `Mlimit`), wobei das `hypot` der
  Host-libm bitgenau reproduziert wird (`src/common/libm-hypot.ts`, 0 Abweichungen bei
  400k Stichproben). 251 der 252 mit fdp renderbaren Golden-Eingaben stimmen exakt mit dem
  nativen Build überein; die verbleibende (`parallel-cluster-ldbxtried`) platziert
  Cluster-Port-Knoten mit `T_Wd * cos(alpha)`, und das macOS-libm-`cos(-2.3840764867756761)`
  liegt ein ULP neben dem `Math.cos` von V8; die Kräfteschleife von fdp verstärkt das auf
  etwa 3 in. Das `cos` von Apple lässt sich nicht aus einem kurzen Modell reproduzieren,
  wie es bei `hypot` möglich ist.
- **Native Abstürze, die die Portierung definiert.** Das native Graphviz beendet sich mit
  139 bei neato `mode=KK` mit `model=mds` und einer Kante mit `len` (`mds_model` indiziert
  `GD_dist` mit einer 1-basierten Sequenznummer: Heap-Überlauf) sowie bei `model=circuit`
  mit einem nicht zusammenhängenden Graphen. Die Portierung verwirft im ersten Fall
  Zellen außerhalb des Bereichs und fällt im zweiten auf kürzeste Wege zurück; es gibt
  keine native Ausgabe, mit der man vergleichen könnte.

---

## Bewusst nicht portiert (Nicht-Ziele) {#intentionally-not-ported-non-goals}

Das sind bewusste Abgrenzungen des Umfangs, keine Fehler. Die Bibliothek zielt auf **SVG**
(plus die Zwischen-Textformate `json` / `xdot` / `dot` / Imagemap).

- **Andere Ausgabeformate.** Raster (PNG/JPG/GIF/WebP/BMP), PostScript/PDF/EPS und
  GUI-/interaktive Backends liegen außerhalb des Umfangs. Verwenden Sie die SVG-Ausgabe
  und konvertieren Sie nachgelagert, wenn Sie ein Rasterbild benötigen.
- **`page=`-Paginierung für SVG.** Das native `dot` paginiert SVG ebenfalls nicht (das
  SVG-Gerät setzt kein Paginierungs-Flag), sodass `page=` auf diesem Pfad in beiden
  Implementierungen wirkungslos ist — hier nur dokumentiert, weil es ein häufiger
  Verwirrungspunkt ist.
- **`-Tplain`-Textausgabe.** Zurückgestellt (ein originalgetreues Textformat), nicht
  ausgeschlossen.
- **`gvpr`** (die Skriptsprache zur Graphverarbeitung) — außerhalb des Umfangs.
- **C++-Komfort-Wrapper** (`cgraph++`, `gvc++`) — zuerst wird die C-API portiert; eine
  idiomatische TypeScript-Komfortschicht, falls gewünscht, wäre ein eigenes Paket.
- **`fontnames=svg|ps` bei der Textvermessung im Browser.** Im Browser baut der
  Canvas-Measurer seine Schrift aus der Familienliste `fontnames=native` des
  PostScript-Alias auf (`Times-Roman` → `Times, serif`), derselben Schrift, die der
  SVG-Emitter standardmäßig rendert. `TextMeasurer` trägt keinen Graphkontext, sodass
  Graphen, die `fontnames=svg` oder `fontnames=ps` setzen, gegen die native Liste
  vermessen werden, während das SVG die svg/ps-Familie benennt. Alias-Stärken, die CSS
  nicht definiert (`book`, `demi`, `light`, `medium`, `roman`), werden wie in C wörtlich
  ausgegeben; Browser ignorieren sie und rendern normale Stärke, und der Measurer
  vermisst normale Stärke, damit es passt. Die Node-Ausgabe ist nicht betroffen (sie
  verwendet den Canvas-Measurer nie).
- **Nur-native Mechanismen**, ersetzt durch browsersichere Entsprechungen: Das dynamische
  Laden von Plugins (`dlopen`) wird durch statische Registrierung von Engines/Renderern
  ersetzt; Dateisystemzugriffe (Schriften, Bilder, Konfiguration) werden durch vom
  Aufrufer gelieferte Callbacks ersetzt (z. B. `setImageSizer`). Das Verhalten bleibt
  erhalten; der Mechanismus unterscheidet sich.

---

## Eine Abweichung melden {#reporting-a-divergence}

Wenn Sie eine Ausgabe finden, die von C abweicht und **keine** oben genannte akzeptierte
Abweichung ist, nicht in `PARITY-dot.md` steht und kein Nicht-Ziel ist, ist das ein
meldenswerter Fehler — der C-Quelltext ist die Spezifikation, und nicht aufgeführte
Abweichungen gelten als Fehler, nicht als akzeptiertes Verhalten.
