---
sourceHash: 616f97a2fa8ffcabcf858e44e35372f1ed973566855990ca52be0169f39c9cb1
---
# Paigutusmootorid

Kõik kaheksa Graphvizi paigutusmootorit on registreeritud. Andke mootori nimi
`renderSvg`-ile teise argumendina:

```ts
renderSvg(dot, 'neato');
```

| Paigutusmootor | Paigutusstiil                                 |
|--------------|-----------------------------------------------|
| `dot`        | Hierarhilised / kihilised suunatud graafid    |
| `neato`      | Vedrumudel (Kamada–Kawai)                     |
| `fdp`        | Jõupõhine                                     |
| `sfdp`       | Mitmetasandiline jõupõhine (suured graafid)   |
| `circo`      | Ringjas                                       |
| `twopi`      | Radiaalne                                     |
| `osage`      | Klastritega                                   |
| `patchwork`  | Squarified puukaart (treemap)                 |

## Märkus truuduse kohta

Mootorid jagunevad kahte vastavusklassi (täpse definitsiooni ja võrdluskoodi
leiate lehelt [Vastavus](/et/conformance)):

- **Deterministlikud** — `dot`, `circo`, `twopi`, `osage`, `patchwork`. Neile
  kehtib sama **±0,01** latt: numbrilised koordinaadid ja teed ühtivad golden-korpusel
  natiivse C-binaariga ±0,01 pt piires ning kogu mittenumbriline sisu (sildid,
  värvid, tekst) on täpselt võrdne.
- **Iteratiivsed** — `neato`, `fdp`, `sfdp`. Jõupõhised/mitmetasandilised
  lahendajad, mis sõltuvad ujukomaarvude ümardamisjärjestusest, mistõttu
  kontrollitakse neid lõdvema **±0,5** pt piiriga ning struktuurse (sama
  elemendipuu) ühtivuse, mitte range numbrilise võrdsuse alusel.

Kumbki latt ei väida SVG väljundi baithaaval täpset võrdsust. Praeguste
läbimisarvude ja iga mootori heakskiidetud erinevuste kohta vaadake lehte
[Paarsus](/parity) (koos mootoripõhiste üksikasjalehtedega) ja
[Teadaolevad erinevused](/et/divergences).

## Proovige erinevaid mootoreid

Vahetage rippmenüüs „Paigutusmootor“ valikut, et võrrelda sama graafi
paigutusi:

<Playground
  height="380px"
  :initial="`graph {\n  a -- b; a -- c; a -- d;\n  b -- c; c -- d; d -- b;\n  b -- e; c -- f;\n}`"
  engine="neato"
/>
