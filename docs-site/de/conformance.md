---
sourceHash: 9c653332a94ce7180323ec7cd584987db329e4217af01dd06692e410c0c22a8c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Konformität: was „Übereinstimmung“ bedeutet {#conformance-what-match-means}

@knowvah/dot-engine wird gegen das kanonische C-Graphviz-Binary als Orakel validiert.
Wenn dieses Projekt sagt, ein Graph **stimmt** mit C **überein** — das Paritätsurteil
namens `conformant` —, dann meint das eine bestimmte, mechanisch geprüfte Eigenschaft,
**nicht** buchstäbliche Byte-für-Byte-Gleichheit des SVG-Textes.

> **Definition.** Ein Port-Rendering ist mit dem Orakel-Rendering **konform**, wenn
> nach dem Parsen beider SVGs in einen normalisierten Elementbaum:
>
> 1. jeder **numerische** Wert (Koordinaten, Pfaddaten, `points`, `viewBox`,
>    `transform`-Parameter) mit dem Orakel innerhalb einer festen **Toleranz**
>    übereinstimmt und
> 2. jeder **nicht numerische** Wert (Tag-Namen, Farben, Textinhalt,
>    Attributschlüssel, aufzählbare Attributwerte) **exakt gleich** ist.
>
> Überschreitet ein numerischer Wert die Toleranz oder unterscheidet sich ein nicht
> numerischer Wert, ist das Rendering **nicht** konform.

## Warum nicht buchstäblich Bytes? {#why-not-literal-bytes}

SVG serialisiert Gleitkommakoordinaten als Dezimaltext. Zwei mathematisch äquivalente
Renderings können sich dennoch in der letzten gedruckten Ziffer unterscheiden — wegen der
IEEE-754-Rundung, der Reihenfolge der Gleitkommaoperationen und des plattformabhängigen
`libm`-/FMA-Verhaltens, das je nach CPU und JS-Engine variiert. Eine buchstäbliche
Byte-Latte wäre über die Laufzeiten, auf die diese Bibliothek zielt (Browser, Node,
verschiedene CPUs), daher nicht bloß streng, sondern **untestbar**. Die Konformität legt
die Eigenschaft fest, auf die es tatsächlich ankommt — die Geometrie und den Inhalt, die
eine Betrachterin sieht —, und zwar auf eine Schranke, die klein genug ist, um nicht
wahrnehmbar zu sein.

## Die exakte Toleranz {#the-exact-tolerance}

Die Toleranz gilt **je Engine-Klasse** und ist definiert in
[`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts):

| Klasse | Toleranz (pt) | Engines |
|---|---:|---|
| `deterministic` | **±0.01** | `dot`, `circo`, `twopi`, `osage`, `patchwork` |
| `iterative` | **±0.5** | `neato`, `fdp`, `sfdp` |

Die deterministischen Engines reproduzieren die ganzzahligen/gedruckten Koordinaten von C
im Wesentlichen exakt, sodass ±0.01 nur Rauschen bei der Dezimalformatierung auffängt. Die
iterativen (kräftebasierten) Engines hängen von transzendenten Funktionen ab, deren
Ergebnisse im letzten Bit plattformübergreifend nicht reproduzierbar sind; sie tragen daher
eine lockerere Schranke und werden zusätzlich auf **strukturelle** Gleichheit geprüft
(gleicher Elementbaum).

Eine Einschränkung für die Oberfläche **plain/plain-ext**: plain gibt Koordinaten in Zoll
mit 5 signifikanten Stellen aus (`%.5g`), sodass bei Größenordnungen ≥ 100 das Druckquantum
(0.01) der Toleranz von ±0.01 entspricht. Bei sehr großen Graphen wird ein Layoutunterschied
unterhalb eines ULP, der zufällig über eine Rundungsgrenze der 5. Stelle fällt, als voller
0.01-Schritt gedruckt und markiert, obwohl die zugrunde liegende Geometrie bis auf ~1e-11 pt
identisch ist (siehe die circo-Akzeptanz `2108`, Journal 2026-07-28). Die Oberflächen
xdot/json, die in Punkten drucken, sind in diesem Bereich der maßgebliche
Geometrievergleich.

Der **Paritäts-Survey des Korpus** bewertet jeden Graphen im Modus `deterministic`
(±0.01), unabhängig von der Engine — siehe
[`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
(`diffVerdict` → `compareSvg(port, oracle, 'deterministic')`).

## Den Code lesen {#read-the-code}

Die obige Definition ist kein Prosa-Anspruch — sie ist genau das, was der Vergleichscode
tut. So können Sie es selbst überprüfen:

- [`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts)
  — `TOLERANCES` (die Tabelle ±0.01 / ±0.5) und `compareSvg`, das die beiden
  normalisierten Bäume durchläuft und Regel (1) numerisch-innerhalb-der-Toleranz sowie
  Regel (2) nicht-numerisch-exakt Attribut für Attribut anwendet.
- [`test/golden/normalize.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/normalize.ts)
  — wie rohes SVG in den vergleichbaren Elementbaum geparst wird.
- [`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
  — `diffVerdict`, das eines der unten genannten Urteile vergibt. `survey.ts` deckt nur
  den `dot`-SVG-Track ab.
- [`test/corpus/engine-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/engine-walk.ts)
  — der **xdot**-Survey je Engine (`npx tsx test/corpus/engine-walk.ts <engine>`), der
  dieselbe Klassentrennung wie die obige Tabelle anwendet
  (`TOLERANCE = 0.5` für `neato`/`fdp`/`sfdp`, `0.01` für jede andere Engine)
  und semantische Draw-Op-Folgen (`compareXdot`) statt SVG vergleicht. So werden die
  Tracks `circo`/`twopi`/`osage`/`patchwork`/`neato`/`fdp`/`sfdp` gemessen; der
  eigene xdot-Track von `dot` verwendet das Schwesterwerkzeug
  [`xdot-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/xdot-walk.ts).

## Die Urteile {#the-verdicts}

Der Survey vergibt an jeden Graphen genau ein Urteil. Aktuelle Zählwerte je Track:
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)
fasst jeden Track aus Engine × Oberfläche zusammen (deterministische wie iterative);
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
ist das SVG-Dashboard von `dot`, und jede andere Engine hat daneben in `test/corpus/` ihr
eigenes Dashboard `PARITY-<engine>.md`:

| Urteil | Bedeutung |
|---|---|
| **`conformant`** | Stimmt gemäß der obigen Definition mit dem Orakel überein (numerisch innerhalb der Toleranz, nicht numerisch exakt). |
| **`structural-match`** | Gleicher Elementbaum, aber ein oder mehrere numerische Werte überschreiten die Toleranz. |
| **`diverged`** | Die Elementbäume unterscheiden sich (ein fehlendes/zusätzliches Element oder eine nicht numerische Abweichung). |
| **`errored` / `timeout`** | Die Portierung konnte die Eingabe nicht rendern (`errored`; `port-error` in den Tracks je Engine) oder hat ihr Zeitbudget überschritten (`timeout`). Wird als Fehlschlag gewertet: zählt im Nenner der Bestehensquote mit, nie als bestanden. |
| **`oracle-error`** | Das C-Orakel konnte die Eingabe nicht rendern, es gibt also keine Referenz zum Vergleichen. Außerhalb des Umfangs: aus dem Nenner der Bestehensquote ausgeschlossen. |

Die **Bestehensquote** auf jedem Dashboard ist `conformant / (surveyed − oracle-error)`.

„Conformant“ ist die Latte; „structural-match“ ist ein bedeutsamer Fortschritt (richtige
Form, Koordinaten driften noch); „diverged“, „errored“ und „timeout“ sind echte Lücken.
Nichts davon ist eine Behauptung byte-gleicher Ausgabe.

Manche Graphen tragen bei einer bestimmten Engine **überhaupt kein Urteil**: siehe
*Engine-Ausschlüsse* unten.

### Engine-Ausschlüsse {#engine-exclusions}

Ein ausgeschlossenes Paar (Graph, Engine) wird nicht durchlaufen, ist also weder konform
noch abweichend — es wird dort schlicht nicht gemessen. Das unterscheidet sich von einer
akzeptierten Abweichung, bei der der Vergleich *stattgefunden* hat und der Unterschied mit
dokumentierter Ursache verziehen wird.

Die Latte liegt bewusst hoch, denn ein ungeprüfter Graph ist eine Abdeckungslücke und
keine bekannte Kostenstelle. Ein Eintrag erfordert alle drei Bedingungen: Der Algorithmus
der Engine kann bei der Eingabe nachweislich nicht greifen, das Überspringen spart echte
Zeit, und dasselbe Verhalten ist auf einem günstigeren Track verifiziert. *Langsam* zu sein
genügt ausdrücklich nicht — ein schlechtes Verhältnis von Portierung zu Orakel ist genau
das, wie ein echter Performance-Defekt aussieht, und ein Ausschluss darauf würde gerade
das verbergen, wofür der Korpus da ist.

Jeder Ausschluss ist mit seinem Mechanismus aufgeführt in
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md#engine-exclusions);
die Registry ist `test/corpus/engine-exclusions.json`. Der motivierende Fall ist
`2222`, das 28.303 Knoten und keine Kanten deklariert: Da es nichts in Beziehung zu
setzen gibt, delegieren alle kräftebasierten und radialen Engines an den gemeinsamen
Komponenten-Packer, und keiner ihrer eigenen Algorithmen läuft — bestätigt dadurch, dass
ihre Orakelausgaben byte-identisch sind. `dot` nimmt einen anderen Pfad und deckt es in
sechs Sekunden konform ab.
