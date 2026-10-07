---
sourceHash: 616f97a2fa8ffcabcf858e44e35372f1ed973566855990ca52be0169f39c9cb1
---
# Layoutmotorer

Alla åtta Graphviz-layoutmotorer är registrerade. Ange motorns namn som andra
argument till `renderSvg`:

```ts
renderSvg(dot, 'neato');
```

| Motor        | Layoutstil                                    |
|--------------|-----------------------------------------------|
| `dot`        | Hierarkiska / lagerindelade riktade grafer    |
| `neato`      | Fjädermodell (Kamada–Kawai)                   |
| `fdp`        | Kraftstyrd                                    |
| `sfdp`       | Flerskalig kraftstyrd (stora grafer)          |
| `circo`      | Cirkulär                                      |
| `twopi`      | Radiell                                       |
| `osage`      | Klustrad                                      |
| `patchwork`  | Kvadrerad träddiagramskarta (treemap)         |

## Notering om trohet

Motorerna delas in i två överensstämmelseklasser (se [Överensstämmelse](/sv/conformance)
för den exakta definitionen och jämförelsekoden):

- **Deterministiska** — `dot`, `circo`, `twopi`, `osage`, `patchwork`. Hålls
  till samma **±0,01**-krav: numeriska koordinater och banor överensstämmer med den
  inbyggda C-binären inom ±0,01 pt och allt icke-numeriskt innehåll (taggar, färger, text)
  är exakt lika på golden-korpusen.
- **Iterativa** — `neato`, `fdp`, `sfdp`. Kraftstyrda/flerskaliga lösare
  som beror på flyttalens avrundningsordning, så de kontrolleras mot en
  lösare gräns på **±0,5** pt och mot strukturell (samma elementträd) överensstämmelse
  i stället för snäv numerisk likhet.

Inget av kraven är ett påstående om SVG-utdata byte för byte. För aktuella
antal godkända fall och eventuella godtagna avvikelser per motor, se [Paritet](/parity) (med
detaljsidor per motor) och [Kända avvikelser](/sv/divergences).

## Prova olika motorer

Byt motor i rullgardinsmenyn **Layoutmotor** för att jämföra layouter av samma graf:

<Playground
  height="380px"
  :initial="`graph {\n  a -- b; a -- c; a -- d;\n  b -- c; c -- d; d -- b;\n  b -- e; c -- f;\n}`"
  engine="neato"
/>
