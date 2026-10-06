---
sourceHash: 616f97a2fa8ffcabcf858e44e35372f1ed973566855990ca52be0169f39c9cb1
---
# Elrendezésmotorok

Mind a nyolc Graphviz elrendezésmotor regisztrálva van. A motor nevét a
`renderSvg` második argumentumaként adja át:

```ts
renderSvg(dot, 'neato');
```

| Motor        | Elrendezési stílus                            |
|--------------|-----------------------------------------------|
| `dot`        | Hierarchikus / rétegzett irányított gráfok    |
| `neato`      | Rugómodell (Kamada–Kawai)                     |
| `fdp`        | Erővezérelt                                   |
| `sfdp`       | Többléptékű erővezérelt (nagy gráfokhoz)      |
| `circo`      | Körkörös                                      |
| `twopi`      | Sugaras                                       |
| `osage`      | Klaszteres                                    |
| `patchwork`  | Négyzetesített treemap                        |

## Megjegyzés a hűségről

A motorok két megfelelőségi osztályba sorolhatók (a pontos meghatározást és az
összehasonlító kódot lásd: [Megfelelőség](/hu/conformance)):

- **Determinisztikus** — `dot`, `circo`, `twopi`, `osage`, `patchwork`. Ugyanaz a
  **±0,01** mérce vonatkozik rájuk: a numerikus koordináták és útvonalak a
  golden korpuszon ±0,01 pontnyi eltéréssel egyeznek a natív C binárissal, az
  összes nem numerikus tartalom (címkék, színek, szöveg) pedig pontosan megegyezik.
- **Iteratív** — `neato`, `fdp`, `sfdp`. Erővezérelt/többléptékű megoldók, amelyek
  a lebegőpontos kerekítés sorrendjétől függnek, ezért a szigorú numerikus
  egyezés helyett lazább, **±0,5** pontos határral és strukturális (azonos
  elemfa) egyezéssel ellenőrizzük őket.

Egyik mérce sem állítja, hogy az SVG-kimenet bájtról bájtra azonos. Az aktuális
sikeres esetek számát és a motoronként elfogadott eltéréseket lásd: [Paritás](/parity)
(motoronkénti részletoldalakkal) és [Ismert eltérések](/hu/divergences).

## Különböző motorok kipróbálása

Váltson az „Elrendezésmotor” legördülő listában, hogy ugyanannak a gráfnak az elrendezéseit összehasonlíthassa:

<Playground
  height="380px"
  :initial="`graph {\n  a -- b; a -- c; a -- d;\n  b -- c; c -- d; d -- b;\n  b -- e; c -- f;\n}`"
  engine="neato"
/>
