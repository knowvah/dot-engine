---
sourceHash: 616f97a2fa8ffcabcf858e44e35372f1ed973566855990ca52be0169f39c9cb1
---
# Mecanismos de layout

Todos os oito mecanismos de layout do Graphviz estão registrados. Passe o nome do
mecanismo como segundo argumento de `renderSvg`:

```ts
renderSvg(dot, 'neato');
```

| Mecanismo    | Estilo de layout                              |
|--------------|-----------------------------------------------|
| `dot`        | Grafos dirigidos hierárquicos / em camadas    |
| `neato`      | Modelo de molas (Kamada–Kawai)                |
| `fdp`        | Dirigido por forças                           |
| `sfdp`       | Dirigido por forças multiescala (grafos grandes) |
| `circo`      | Circular                                      |
| `twopi`      | Radial                                        |
| `osage`      | Em clusters                                   |
| `patchwork`  | Treemap quadrado (squarified)                 |

## Nota sobre fidelidade

Os mecanismos se dividem em duas classes de conformidade (veja
[Conformidade](/pt-br/conformance) para a definição exata e o código de comparação):

- **Determinísticos** — `dot`, `circo`, `twopi`, `osage`, `patchwork`. Sujeitos
  ao mesmo critério de **±0,01**: coordenadas numéricas e caminhos coincidem com
  o binário C nativo dentro de ±0,01pt, e todo o conteúdo não numérico (tags,
  cores, texto) é exatamente igual no corpus golden.
- **Iterativos** — `neato`, `fdp`, `sfdp`. Resolvedores dirigidos por
  forças/multiescala que dependem da ordem de arredondamento de ponto flutuante;
  por isso são verificados com um limite mais folgado de **±0,5**pt e por
  concordância estrutural (mesma árvore de elementos), e não por igualdade
  numérica estrita.

Nenhum dos dois critérios é uma afirmação de saída SVG idêntica byte a byte. Para
as contagens atuais de aprovação e as divergências aceitas por mecanismo, veja
[Paridade](/parity) (com páginas de detalhes por mecanismo) e
[Divergências conhecidas](/pt-br/divergences).

## Experimente mecanismos diferentes

Troque o mecanismo na lista suspensa "Mecanismo de layout" para comparar layouts
do mesmo grafo:

<Playground
  height="380px"
  :initial="`graph {\n  a -- b; a -- c; a -- d;\n  b -- c; c -- d; d -- b;\n  b -- e; c -- f;\n}`"
  engine="neato"
/>
