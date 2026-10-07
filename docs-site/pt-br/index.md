---
sourceHash: 33fa90104a012c6ce9d15de21f32270498520e3d281601ddae71c0a48280eee4
layout: home
hero:
  name: "@knowvah/dot-engine"
  text: Graphviz em TypeScript puro
  tagline: DOT entra, SVG sai — sem C. Sem binário nativo do Graphviz, sem WASM. TypeScript puro, roda no navegador.
  actions:
    - theme: brand
      text: Primeiros passos
      link: /pt-br/guide/getting-started
    - theme: alt
      text: Abrir a área de testes
      link: /pt-br/playground
    - theme: alt
      text: Ver no GitHub
      link: https://github.com/knowvah/dot-engine
features:
  - title: Fiel ao Graphviz em C
    details: Um port linha a linha da implementação canônica em C. O mecanismo dot corresponde ao binário nativo dentro de uma tolerância determinística estreita (±0,01 nas coordenadas, conteúdo não numérico exatamente igual) no corpus golden.
  - title: Nativo do navegador, sem dependências em tempo de execução
    details: Sem C — sem binário nativo do Graphviz, sem port para WASM, sem servidor de renderização. O próprio mecanismo de layout é TypeScript — empacote e publique.
  - title: Todos os oito mecanismos de layout
    details: dot, neato, fdp, sfdp, circo, twopi, osage e patchwork — renderizados em SVG.
  - title: Layout programático + geometria
    details: Não só renderize — leia de volta as posições calculadas dos nós, as splines das arestas e os limites dos clusters como um snapshot simples e serializável em JSON via getLayout(), sem precisar interpretar -Tplain.
---

## Experimente

O editor abaixo executa a biblioteca de verdade, no seu navegador. Edite o DOT
à esquerda; o SVG é atualizado ao vivo.

<Playground height="360px" />

## Escolha seu caminho

Novo por aqui? Escolha a porta que corresponde ao que você está fazendo:

| Quero… | Comece aqui |
| --- | --- |
| Entender como as peças se encaixam | [Visão geral — o modelo mental](/pt-br/guide/overview) |
| Instalar e renderizar meu primeiro grafo | [Primeiros passos](/pt-br/guide/getting-started) |
| Resolver uma tarefa concreta | [Livro de receitas](/pt-br/guide/recipes) |
| Consultar uma função ou tipo | [Referência da API](/pt-br/guide/api) · [Tipos](/pt-br/guide/types) |
| Experimentar sem instalar nada | [Área de testes](/pt-br/playground) |

Vindo de outra ferramenta? Veja [A partir da CLI `dot` em C](/pt-br/guide/migrate-from-c-cli)
ou [A partir de bibliotecas JS de Graphviz](/pt-br/guide/migrate-from-js-libs).

Para assinaturas completas geradas automaticamente, consulte a
[referência da API gerada](/reference/). Vai incorporar grafos renderizados em
uma página? Leia [Trabalhar com imagens](/pt-br/guide/images) para orientações
sobre incorporação de imagens e CSP.
