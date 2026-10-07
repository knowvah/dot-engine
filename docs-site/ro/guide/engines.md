---
sourceHash: 616f97a2fa8ffcabcf858e44e35372f1ed973566855990ca52be0169f39c9cb1
---
# Motoare de aranjare

Toate cele opt motoare de aranjare Graphviz sunt înregistrate. Transmiteți numele
motorului ca al doilea argument către `renderSvg`:

```ts
renderSvg(dot, 'neato');
```

| Motor de aranjare | Stil de aranjare                              |
|--------------|-----------------------------------------------|
| `dot`        | Grafuri orientate ierarhice / pe straturi     |
| `neato`      | Model cu arcuri (Kamada–Kawai)                |
| `fdp`        | Orientat pe forțe                             |
| `sfdp`       | Orientat pe forțe, multiscală (grafuri mari)  |
| `circo`      | Circular                                      |
| `twopi`      | Radial                                        |
| `osage`      | Pe clustere                                   |
| `patchwork`  | Treemap pătratic                              |

## Notă despre fidelitate

Motoarele se împart în două clase de conformitate (vedeți [Conformitate](/ro/conformance)
pentru definiția exactă și codul de comparare):

- **Deterministe** — `dot`, `circo`, `twopi`, `osage`, `patchwork`. Supuse
  aceluiași prag de **±0.01**: coordonatele numerice și căile coincid cu binarul
  nativ în C în limita a ±0.01pt, iar tot conținutul nenumeric (etichete, culori, text) este
  exact egal pe corpusul golden.
- **Iterative** — `neato`, `fdp`, `sfdp`. Solvere orientate pe forțe / multiscală
  care depind de ordinea de rotunjire a virgulei mobile, așa că sunt verificate
  la o limită mai permisivă de **±0.5**pt și pentru concordanță structurală (același arbore
  de elemente), nu pentru egalitate numerică strânsă.

Niciunul dintre praguri nu pretinde o ieșire SVG identică octet cu octet. Pentru numărul
actual de teste trecute și orice divergențe acceptate pentru fiecare motor, vedeți [Paritate](/parity) (cu
pagini de detaliu pentru fiecare motor) și [Divergențe cunoscute](/ro/divergences).

## Încercați motoare diferite

Schimbați selecția din lista derulantă „Motor de aranjare” pentru a compara aranjările aceluiași graf:

<Playground
  height="380px"
  :initial="`graph {\n  a -- b; a -- c; a -- d;\n  b -- c; c -- d; d -- b;\n  b -- e; c -- f;\n}`"
  engine="neato"
/>
