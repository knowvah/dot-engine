---
sourceHash: 616f97a2fa8ffcabcf858e44e35372f1ed973566855990ca52be0169f39c9cb1
---
# Layoutmotorer

Alle otte Graphviz-layoutmotorer er registreret. Angiv motorens navn som andet
argument til `renderSvg`:

```ts
renderSvg(dot, 'neato');
```

| Motor        | Layoutstil                                    |
|--------------|-----------------------------------------------|
| `dot`        | Hierarkiske / lagdelte rettede grafer         |
| `neato`      | Fjedermodel (Kamada–Kawai)                    |
| `fdp`        | Kraftstyret                                   |
| `sfdp`       | Multiskala kraftstyret (store grafer)         |
| `circo`      | Cirkulær                                      |
| `twopi`      | Radial                                        |
| `osage`      | Clusteropdelt                                 |
| `patchwork`  | Kvadreret trækort (treemap)                   |

## Note om troskab

Motorerne deles i to overensstemmelsesklasser (se [Overensstemmelse](/da/conformance)
for den nøjagtige definition og sammenligningskoden):

- **Deterministiske** — `dot`, `circo`, `twopi`, `osage`, `patchwork`. Holdes til
  den samme **±0,01**-standard: numeriske koordinater og stier stemmer med den
  native C-binær inden for ±0,01pt, og alt ikke-numerisk indhold (tags, farver,
  tekst) er nøjagtigt ens på golden-korpusset.
- **Iterative** — `neato`, `fdp`, `sfdp`. Kraftstyrede/multiskala-solvere, der
  afhænger af rækkefølgen af flydende-komma-afrunding, så de kontrolleres mod en
  løsere grænse på **±0,5**pt og for strukturel overensstemmelse (samme
  elementtræ) frem for stram numerisk lighed.

Ingen af standarderne er et krav om bogstavelig byte-for-byte SVG-output. For
aktuelle antal beståede og eventuelle accepterede afvigelser pr. motor, se
[Paritet](/parity) (med detaljesider pr. motor) og [Kendte afvigelser](/da/divergences).

## Prøv forskellige motorer

Skift motor i rullemenuen „Layoutmotor“ for at sammenligne layouts af den samme graf:

<Playground
  height="380px"
  :initial="`graph {\n  a -- b; a -- c; a -- d;\n  b -- c; c -- d; d -- b;\n  b -- e; c -- f;\n}`"
  engine="neato"
/>
