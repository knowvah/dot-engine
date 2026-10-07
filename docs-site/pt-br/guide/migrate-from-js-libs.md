---
sourceHash: 5733693facb69db8bab3b6997342fc5a9281465757bc64ca4fea3ebec54ebeeb
---

# Migrando de outras bibliotecas JS de Graphviz

viz.js / `@viz-js/viz`, `@hpcc-js/wasm` (`@hpcc-js/wasm-graphviz`) e
`d3-graphviz` dão acesso ao Graphviz a partir de JavaScript compilando o
Graphviz real, em C, para **WebAssembly** e chamando-o. O @knowvah/dot-engine é
um **port em TypeScript** feito do zero — os mecanismos de layout, o analisador
(parser) e o emissor de SVG são código-fonte TypeScript, não um binário
compilado.

Essa diferença é a manchete, não uma nota de rodapé:

| | Wrappers WASM (viz.js / `@hpcc-js/wasm` / d3-graphviz) | @knowvah/dot-engine |
|---|---|---|
| Implementação | Graphviz real em C, compilado para um binário `.wasm` | Port puro em TypeScript, sem artefato compilado |
| Inicialização do módulo | Assíncrona — instancie/aguarde o módulo WASM antes do primeiro uso | Nenhuma — `import` e chame de forma síncrona |
| Bundle | Distribua um asset `.wasm` (centenas de KB a poucos MB) junto com o JS | Apenas JS, com tree-shaking |
| Depuração | Percorrer um blob WASM (ou o código C, se você o tiver) | Percorrer o TypeScript real, com source maps |
| Modelo de threads | Algumas builds executam o layout em um Web Worker | Executa na thread chamadora, como qualquer função TS |
| Formatos de saída | O que a build C subjacente foi compilada para oferecer — normalmente o conjunto completo do Graphviz, incluindo raster/PDF | SVG + os formatos de texto DOT/json/xdot/plain/imagemap — veja abaixo |

Se o seu caso de uso é "chamar uma função, receber SVG de volta, sem cerimônia
assíncrona, sem asset WASM para hospedar" — é para isso que o
@knowvah/dot-engine serve. Se o seu caso de uso depende de saída raster ou PDF,
veja [Quando manter o WASM](#when-to-stay-on-wasm) abaixo.

## Diferenças de API

As três bibliotecas têm formatos diferentes; a tabela abaixo mostra o caso
comum de migração (aproximado — confira na documentação de cada biblioteca; veja
as citações abaixo de cada linha).

| Biblioteca | Chamada típica | Equivalente no @knowvah/dot-engine |
|---|---|---|
| `@viz-js/viz` (sucessor do viz.js) | `Viz.instance().then(viz => viz.renderSVGElement(dot))` — assíncrono, `Viz.instance()` resolve uma Promise | `renderSvg(dot, 'dot')` — síncrono, sem etapa de instância/inicialização |
| viz.js 2.x (legado, `new Viz()`) | `new Viz().renderString(dot)` — devolve uma `Promise<string>` | `renderSvg(dot, 'dot')` — síncrono |
| `@hpcc-js/wasm-graphviz` | `await Graphviz.load()` uma vez e depois `graphviz.dot(dot)` (síncrono após o carregamento) | `renderSvg(dot, engine)` — sem nenhuma etapa de carregamento/aquecimento |
| `d3-graphviz` | `d3.select(sel).graphviz().renderDot(dot)` — vincula a saída ao DOM, anima transições | `renderSvg(dot, engine)` devolve uma **string** SVG; você mesmo a insere no DOM (por exemplo, `el.innerHTML = svg`) |

Toda chamada do @knowvah/dot-engine na coluna da direita é **síncrona** — não há
módulo para aguardar, porque não há binário WASM para instanciar. Remova
qualquer `await`/`.then()` que envolva uma chamada do @knowvah/dot-engine; ele
nunca foi necessário.

- `Viz.instance()` → Promise e o método `renderSVGElement()` do `@viz-js/viz`
  estão documentados em viz-js.com; confirmados pelo exemplo de uso publicado
  do projeto na data da escrita.
- O `new Viz().renderString(dot)` do viz.js 2.x é a API documentada para essa
  linha de versões (agora superada); se você está em uma instalação atual,
  verifique se na verdade está no `@viz-js/viz`.
- O par `Graphviz.load()` / `graphviz.dot()` do `@hpcc-js/wasm-graphviz` está
  confirmado pelo exemplo de uso publicado do pacote na data da escrita. O
  pacote separado e mais antigo `@hpcc-js/wasm` expôs adicionalmente, em
  versões passadas, uma chamada `graphviz.layout(dot, format, engine)` —
  consulte a documentação da versão instalada antes de confiar na assinatura
  exata.
- A cadeia `.graphviz().renderDot(dot)` do `d3-graphviz`, e o fato de ele ser
  construído internamente sobre o `@hpcc-js/wasm`, está confirmada pelo README
  publicado do projeto na data da escrita.

### O vínculo de `renderDot` com o DOM está fora do escopo aqui

O `d3-graphviz` faz mais do que renderizar SVG: ele vincula o resultado a uma
seleção D3, compara (diff) as re-renderizações e anima as transições entre
layouts. O @knowvah/dot-engine não tem nenhuma opinião sobre o DOM —
`renderSvg`/`render` devolvem uma string simples. Se você quiser transições
animadas no estilo do d3-graphviz entre dois layouts, essa é uma lógica que você
construiria sobre duas chamadas de `renderSvg` e a sua própria comparação de DOM
(ou continuaria usando o d3-graphviz para esse recurso específico — veja
abaixo).

## Obter dados de layout sem analisar um formato de string

As três bibliotecas WASM podem ser solicitadas a produzir os formatos JSON ou de
texto simples do próprio Graphviz, e então você mesmo analisa essa string para
obter as coordenadas de nós/arestas. O @knowvah/dot-engine dispensa essa ida e
volta pelo texto: chame `getLayout(g)` (depois de `render`) para obter
diretamente um snapshot tipado e serializável em JSON — sem string de
`-Tjson`/`-Tplain` para analisar.

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

render(b.graph, 'svg');
const layout = getLayout(b.graph);
// layout.nodes  → [{ name: 'a', x, y, width, height }, ...]
// layout.edges  → [{ tail: 'a', head: 'b', points: [...] }]
// layout.bounds → { x, y, width, height }
```

Veja [Ler a geometria calculada](/pt-br/guide/geometry) para o formato completo
do snapshot, as unidades e a opção `yAxis`.

## Quando manter o WASM {#when-to-stay-on-wasm}

Seja honesto consigo mesmo sobre o escopo: o @knowvah/dot-engine mira SVG mais
os formatos de texto `dot`/`xdot`/`json`/`plain`/`plain-ext`/`imap`/`cmapx`. Ele
**não** emite formatos raster (PNG/JPEG/GIF/...) nem PostScript/PDF/EPS — esses
são um limite de escopo intencional, e não uma lacuna apenas inacabada. Veja
[Divergências conhecidas](/pt-br/divergences) para a lista exata de não
objetivos.

Se a sua aplicação precisa de saída `-Tpng` ou `-Tpdf` diretamente do mecanismo
de layout, as bibliotecas baseadas em WASM acima ainda atendem a esse caso —
como elas executam o Graphviz real em C, suportam os formatos de saída com que
aquela build foi compilada. Nesse cenário, continue usando a biblioteca WASM
para esse único caminho de código ou renderize para `'svg'` com o
@knowvah/dot-engine e converta o SVG para raster/PDF depois, com uma ferramenta
separada.

## Veja também

- [Mecanismos de layout](/pt-br/guide/engines)
- [Renderizar para outros formatos](/pt-br/guide/render-formats)
- [Ler a geometria calculada](/pt-br/guide/geometry)
- [Divergências conhecidas](/pt-br/divergences)
- [Primeiros passos](/pt-br/guide/getting-started)
