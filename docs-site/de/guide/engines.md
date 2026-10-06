---
sourceHash: 616f97a2fa8ffcabcf858e44e35372f1ed973566855990ca52be0169f39c9cb1
---
# Layout-Engines

Alle acht Graphviz-Layout-Engines sind registriert. Übergeben Sie den Namen der Layout-Engine als
zweites Argument an `renderSvg`:

```ts
renderSvg(dot, 'neato');
```

| Layout-Engine | Layout-Stil                                   |
|--------------|-----------------------------------------------|
| `dot`        | Hierarchische / geschichtete gerichtete Graphen |
| `neato`      | Federmodell (Kamada–Kawai)                    |
| `fdp`        | Kräftebasiert                                 |
| `sfdp`       | Mehrskalig kräftebasiert (große Graphen)      |
| `circo`      | Kreisförmig                                   |
| `twopi`      | Radial                                        |
| `osage`      | Geclustert                                    |
| `patchwork`  | Squarified Treemap                            |

## Hinweis zur Treue

Die Engines teilen sich in zwei Konformitätsklassen (die genaue Definition und den
Vergleichscode finden Sie unter [Konformität](/de/conformance)):

- **Deterministisch** — `dot`, `circo`, `twopi`, `osage`, `patchwork`. Sie müssen
  dieselbe Latte von **±0,01** erfüllen: Numerische Koordinaten und Pfade stimmen auf dem
  Golden-Korpus mit dem nativen C-Binary auf ±0,01 pt überein, und alle nicht
  numerischen Inhalte (Tags, Farben, Text) sind exakt gleich.
- **Iterativ** — `neato`, `fdp`, `sfdp`. Kräftebasierte bzw. mehrskalige Löser, die von
  der Rundungsreihenfolge bei Gleitkommazahlen abhängen; sie werden daher mit einer
  lockereren Schranke von **±0,5** pt geprüft, und zwar auf strukturelle Übereinstimmung
  (gleicher Elementbaum) statt auf enge numerische Gleichheit.

Keine der beiden Latten behauptet eine Byte-für-Byte-Gleichheit der SVG-Ausgabe. Aktuelle
Bestehensquoten und akzeptierte Abweichungen je Layout-Engine finden Sie unter [Parität](/parity)
(mit Detailseiten je Layout-Engine) und [Bekannte Abweichungen](/de/divergences).

## Verschiedene Engines ausprobieren

Wechseln Sie im Dropdown „Layout-Engine“ den Eintrag, um Layouts desselben Graphen zu vergleichen:

<Playground
  height="380px"
  :initial="`graph {\n  a -- b; a -- c; a -- d;\n  b -- c; c -- d; d -- b;\n  b -- e; c -- f;\n}`"
  engine="neato"
/>
