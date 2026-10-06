---
sourceHash: 616f97a2fa8ffcabcf858e44e35372f1ed973566855990ca52be0169f39c9cb1
---
# Uppsetningarvélar

Allar átta uppsetningarvélar Graphviz eru skráðar. Gefðu nafn uppsetningarvélarinnar sem
annað argument til `renderSvg`:

```ts
renderSvg(dot, 'neato');
```

| Vél          | Uppsetningarstíll                             |
|--------------|-----------------------------------------------|
| `dot`        | Stigskipt / lagskipt stefnd gröf              |
| `neato`      | Gormalíkan (Kamada–Kawai)                     |
| `fdp`        | Kraftstýrt                                    |
| `sfdp`       | Fjölkvarða kraftstýrt (stór gröf)             |
| `circo`      | Hringlaga                                     |
| `twopi`      | Geislalaga                                    |
| `osage`      | Klasað                                        |
| `patchwork`  | Ferningað trjákort (squarified treemap)       |

## Athugasemd um trúfesti

Vélunum er skipt í tvo samræmisflokka (nákvæma skilgreiningu og
samanburðarkóðann er að finna í [Samræmi](/is/conformance)):

- **Ákvarðandi** — `dot`, `circo`, `twopi`, `osage`, `patchwork`. Þær eru látnar
  standast sama viðmið, **±0,01**: tölulegar hnit og ferlar samsvara innbyggðu
  C-keyrsluskránni innan ±0,01 pt og allt sem ekki eru tölur (tög, litir, texti)
  er nákvæmlega eins á golden-safninu.
- **Ítrekandi** — `neato`, `fdp`, `sfdp`. Kraftstýrðir/fjölkvarða lausnarar sem
  eru háðir röð námundunar í fleytitölum, svo þær eru prófaðar gegn rýmri
  mörkum, **±0,5** pt, og með tilliti til byggingarlegs samræmis (sama
  þáttatré) fremur en þéttrar tölulegrar samsvörunar.

Hvorugt viðmiðið felur í sér fullyrðingu um SVG-úttak sem er bæti fyrir bæti
eins. Núverandi fjölda staðinna prófa og samþykkt frávik fyrir hverja vél er að
finna í [Jöfnuður](/parity) (með nákvæmari síðum fyrir hverja vél) og
[Þekkt frávik](/is/divergences).

## Prófaðu mismunandi vélar

Skiptu um færslu í fellilistanum „Uppsetningarvél“ til að bera saman uppsetningar á sama grafi:

<Playground
  height="380px"
  :initial="`graph {\n  a -- b; a -- c; a -- d;\n  b -- c; c -- d; d -- b;\n  b -- e; c -- f;\n}`"
  engine="neato"
/>
