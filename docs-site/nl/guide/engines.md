---
sourceHash: 616f97a2fa8ffcabcf858e44e35372f1ed973566855990ca52be0169f39c9cb1
---
# Lay-out-engines

Alle acht lay-out-engines van Graphviz zijn geregistreerd. Geef de naam van de engine
als tweede argument mee aan `renderSvg`:

```ts
renderSvg(dot, 'neato');
```

| Lay-out-engine | Lay-outstijl                                |
|--------------|-----------------------------------------------|
| `dot`        | Hiërarchische / gelaagde gerichte grafen      |
| `neato`      | Veermodel (Kamada–Kawai)                      |
| `fdp`        | Krachtgestuurd                                |
| `sfdp`       | Multischaal krachtgestuurd (grote grafen)     |
| `circo`      | Cirkelvormig                                  |
| `twopi`      | Radiaal                                       |
| `osage`      | Geclusterd                                    |
| `patchwork`  | Squarified treemap                            |

## Opmerking over getrouwheid

De engines vallen uiteen in twee conformiteitsklassen (zie [Conformiteit](/nl/conformance)
voor de exacte definitie en de vergelijkingscode):

- **Deterministisch** — `dot`, `circo`, `twopi`, `osage`, `patchwork`. Ze moeten aan
  dezelfde lat van **±0,01** voldoen: numerieke coördinaten en paden komen op het
  golden-corpus binnen ±0,01 pt overeen met de native C-binary, en alle niet-numerieke
  inhoud (tags, kleuren, tekst) is exact gelijk.
- **Iteratief** — `neato`, `fdp`, `sfdp`. Krachtgestuurde/multischaalsolvers die
  afhangen van de afrondingsvolgorde bij drijvendekommagetallen; ze worden daarom
  getoetst aan een ruimere grens van **±0,5** pt en op structurele overeenkomst
  (dezelfde elementenboom) in plaats van strakke numerieke gelijkheid.

Geen van beide latten is een claim van letterlijk byte-voor-byte gelijke SVG-uitvoer.
Actuele slagingsaantallen en geaccepteerde afwijkingen per engine vindt u onder
[Pariteit](/parity) (met detailpagina's per engine) en [Bekende afwijkingen](/nl/divergences).

## Verschillende engines uitproberen

Wissel de engine in de keuzelijst "Lay-out-engine" om lay-outs van dezelfde graaf te vergelijken:

<Playground
  height="380px"
  :initial="`graph {\n  a -- b; a -- c; a -- d;\n  b -- c; c -- d; d -- b;\n  b -- e; c -- f;\n}`"
  engine="neato"
/>
