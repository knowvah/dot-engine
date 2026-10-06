---
sourceHash: 66af4fa5a29e8468c7ecdd9bd541c9d7572b0a87dc81ab412cb63c543106fde8
---
# Glossar

Eine Definition pro Begriff, alphabetisch nach dem englischen Begriff. Jede verweist auf die
Handbuchseite (oder den Quelltext), die den Begriff ausführlich behandelt.

## Cluster

Ein Teilgraph, dessen Name mit `cluster` beginnt (z. B. `subgraph cluster_build`) —
Graphviz zeichnet ihn als eigenen Kasten, der seine Mitgliedsknoten gruppiert. Intern
vergibt der Geometrie-Snapshot von @knowvah/dot-engine für jeden Cluster-Teilgraphen
einen positionsbasierten Namen wie `cluster6` (`ClusterGeometry.name`) statt des Namens
aus dem DOT-Quelltext. Wer den ursprünglichen Namen braucht, baut vor dem Layout eine
`idByName`-Map auf und vergibt danach die Schlüssel von `snapshot.clusters` neu. Siehe
[Rezepte](/de/guide/recipes) für das Muster zur Neuvergabe und
[Einen Graphen im Code aufbauen](/de/guide/build-a-graph) für das Erzeugen von Clustern über `addSubgraph`.

## Konformität

Die maschinell geprüfte Eigenschaft hinter der Aussage, ein Rendering von
@knowvah/dot-engine „stimme“ mit dem C-Orakel „überein“. Nachdem beide SVGs in normalisierte
Elementbäume geparst wurden, muss jeder numerische Wert (Koordinaten, Pfaddaten, `points`)
innerhalb einer festen Toleranz übereinstimmen — **±0,01 pt** bei den deterministischen
Engines (`dot`, `circo`, `twopi`, `osage`, `patchwork`) und **±0,5 pt** bei den iterativen
kräftebasierten Engines (`neato`, `fdp`, `sfdp`) —, und jeder nicht numerische Wert (Tags,
Farben, Text) muss exakt gleich sein. Das ist keine Behauptung einer Byte-für-Byte-Gleichheit
der SVG-Ausgabe. Siehe [Konformität](/de/conformance).

## Koordinatensystem / y-Achse

Das native Koordinatensystem von Graphviz ist **y-aufwärts** mit dem Ursprung in der
unteren linken Ecke; Browser und Bildschirme sind **y-abwärts** mit dem Ursprung oben links.
`getLayout` verwendet standardmäßig `yAxis: 'down'` (spiegelt jedes y und normalisiert
`bounds` auf `(0, 0)`) und akzeptiert `yAxis: 'up'`, um native Graphviz-Koordinaten
unverändert zurückzugeben. xdot-Zeichenoperationen (aus `getDrawOps`) liegen immer im nativen
y-aufwärts-Koordinatensystem. Siehe [Berechnete Geometrie auslesen](/de/guide/geometry).

## Abweichung

Ein Unterschied zwischen einem Rendering von @knowvah/dot-engine und dem Orakel, der
untersucht, auf seine Ursache zurückgeführt und katalogisiert wurde — im Gegensatz zu
einem stillschweigend hingenommenen. Katalogisierte Abweichungen gehören zu einer von drei
Klassen: akzeptierte Deltas (bewusst nicht konform gemacht, z. B. plattformübergreifender
Gleitkomma-Nichtdeterminismus), ein verfolgter Long Tail, der noch geschlossen wird, und
ausdrückliche Nicht-Ziele. Ein nicht aufgeführter Unterschied gilt als Defekt, nicht als
akzeptiertes Verhalten. Siehe [Bekannte Abweichungen](/de/divergences).

## DOT

Die Graphbeschreibungssprache — `digraph { ... }` / `graph { ... }` mit Knoten-, Kanten-
und Attributanweisungen —, die @knowvah/dot-engine parst, bevor das Ergebnis an eine
Layout-Engine übergeben wird. Siehe [Erste Schritte](/de/guide/getting-started).

## Image Sizer / Resolver

Die beiden injizierbaren Nahtstellen für externe Bilder (Usershape-Knoten und
`<IMG>`-Zellen in HTML-Labels). Ein `ImageSizer` meldet die natürliche Breite/Höhe eines
Bildes, sodass Knotengrößen und Label-Layout ohne Laden der Pixeldaten berechnet werden
können; ein `ImageResolver` liefert zur Renderzeit die eigentlichen Bildbytes zum
Einbetten. Siehe [Bilder](/de/guide/images).

## Layout-Engine

Einer der acht Layout-Algorithmen, die @knowvah/dot-engine registriert und die per Namen
gewählt werden (`renderSvg(dot, engine)`): `dot` (hierarchisch/geschichtet), `neato`
(Federmodell, Kamada–Kawai), `fdp` (kräftebasiert), `sfdp` (mehrskalig kräftebasiert, für
große Graphen), `circo` (kreisförmig), `twopi` (radial), `osage` (geclustert) und
`patchwork` (Squarified Treemap). Siehe [Layout-Engines](/de/guide/engines).

## Orakel

Das native C-Graphviz-Binary `dot`, gebaut aus dem kanonischen C-Quelltext, gegen das jedes
Rendering von @knowvah/dot-engine validiert wird. @knowvah/dot-engine startet dieses
Binary direkt (nie einen WASM-Build), um ABI-Drift zwischen Referenz und Portierung zu
vermeiden. Siehe [Konformität](/de/conformance) und [Parität](/parity), wie
Orakel-Vergleiche ausgeführt und berichtet werden.

## Rank / rankdir

Im hierarchischen Layout von `dot` ist ein **Rank** eine Schicht von Knoten, die in der
Zeichnung auf derselben Tiefe liegen. `rankdir` legt die Richtung fest, in der die Ranks
verlaufen — standardmäßig `TB` (von oben nach unten) oder `LR`, `BT`, `RL` — und wird als
Graphattribut gesetzt (`b.setAttr('rankdir', 'LR')`). Siehe
[Einen Graphen im Code aufbauen](/de/guide/build-a-graph).

## Spline / Kantenführung

Der gekrümmte (Bézier-)Pfad, entlang dem eine Kante gezeichnet wird, berechnet von
Routing-Code, der Knoten- und Cluster-Hindernissen ausweicht. @knowvah/dot-engine stellt
die gerouteten Kontrollpunkte über `getLayout` als `EdgeGeometry.points` bereit — ein
geordnetes Array von `{x, y}`-Punkten, in Punkt. Siehe
[Berechnete Geometrie auslesen](/de/guide/geometry).

## Textvermesser

Die injizierbare Nahtstelle (`TextMeasurer`), die Breite/Höhe von Labels meldet, damit
Knoten- und Kantenlabel-Größen vor dem Layout berechnet werden können.
@knowvah/dot-engine ermittelt pro Rendering automatisch einen — zuerst ein explizites
`setTextMeasurer`, dann das `<canvas>` des Browsers, falls vorhanden, dann in Node den
eingebauten deterministischen `EstimateTextMeasurer` — oder akzeptiert eine eigene
Implementierung. Siehe [Textvermessung](/de/guide/text-measurement).

## Usershape

Der Graphviz-Begriff für einen Knoten, dessen Form ein extern bereitgestelltes Bild ist
(über das Attribut `image`) statt eines gezeichneten Polygons oder einer Ellipse.
@knowvah/dot-engine löst Usershapes über die injizierbare Image-Sizer-/Resolver-Nahtstelle
auf, statt Dateien direkt zu lesen, und bleibt so browsersicher. Siehe
[Bilder](/de/guide/images).

## xdot

Das erweiterte DOT-Draw-Op-Format: ein strukturierter Strom von Operationen (Füll-/
Strichfarbe setzen, Schrift setzen, eine Ellipse oder ein Polygon füllen/zeichnen, eine
Bézierkurve zeichnen, Text zeichnen), der in Malreihenfolge genau beschreibt, wie ein
gerenderter Graph gemalt werden soll. `getDrawOps` gibt diesen Strom als typisierte
`XdotOp`-Werte zurück, um einen eigenen Renderer (Canvas, WebGL, PDF) ohne SVG-Parsing
anzusteuern. Siehe [Eigenes Rendering mit xdot-Zeichenoperationen](/de/guide/xdot-drawops).
