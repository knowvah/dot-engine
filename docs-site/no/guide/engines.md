---
sourceHash: 616f97a2fa8ffcabcf858e44e35372f1ed973566855990ca52be0169f39c9cb1
---
# Layoutmotorer

Alle åtte Graphviz-layoutmotorene er registrert. Send navnet på motoren som
andre argument til `renderSvg`:

```ts
renderSvg(dot, 'neato');
```

| Layoutmotor  | Layoutstil                                    |
|--------------|-----------------------------------------------|
| `dot`        | Hierarkiske / lagdelte rettede grafer         |
| `neato`      | Fjærmodell (Kamada–Kawai)                     |
| `fdp`        | Kraftbasert                                   |
| `sfdp`       | Flerskala kraftbasert (store grafer)          |
| `circo`      | Sirkulær                                      |
| `twopi`      | Radial                                        |
| `osage`      | Klyngebasert                                  |
| `patchwork`  | Squarified treemap                            |

## Merknad om troskap

Motorene deles i to samsvarsklasser (se [Samsvar](/no/conformance) for den
nøyaktige definisjonen og sammenligningskoden):

- **Deterministiske** — `dot`, `circo`, `twopi`, `osage`, `patchwork`. Holdt til
  samme **±0,01**-krav: numeriske koordinater og stier samsvarer med den
  innebygde C-binærfilen innenfor ±0,01 pt, og alt ikke-numerisk innhold
  (tagger, farger, tekst) er nøyaktig likt på golden-korpuset.
- **Iterative** — `neato`, `fdp`, `sfdp`. Kraftbaserte/flerskala løsere som
  avhenger av rekkefølgen flyttallsavrundingen skjer i, så de kontrolleres mot
  en løsere grense på **±0,5** pt og for strukturelt samsvar (samme
  elementtre) i stedet for stram numerisk likhet.

Ingen av kravene er en påstand om bokstavelig byte-for-byte-lik SVG-utdata. For
gjeldende antall beståtte tester og eventuelle godtatte avvik per motor, se
[Paritet](/parity) (med detaljsider per motor) og
[Kjente avvik](/no/divergences).

## Prøv ulike motorer

Bytt layoutmotor i nedtrekkslisten for å sammenligne layout av den samme grafen:

<Playground
  height="380px"
  :initial="`graph {\n  a -- b; a -- c; a -- d;\n  b -- c; c -- d; d -- b;\n  b -- e; c -- f;\n}`"
  engine="neato"
/>
