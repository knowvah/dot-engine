---
sourceHash: 96b80725180c7f6708fcc435c4ad98ed934b7e558b1db664f454212b152ed64d
---
# Uso no navegador

O @knowvah/dot-engine não usa APIs exclusivas do Node e pode ser empacotado com
segurança para o navegador. Esta página cobre as duas coisas que você precisa
saber ao executá-lo no lado do cliente.

## Empacotamento

A biblioteca é feita de módulos ES simples. Qualquer empacotador moderno (Vite,
esbuild, Rollup, webpack) pode incluí-la. Não há dependências em tempo de
execução para externalizar nem artefatos WASM para hospedar.

```ts
import { renderSvg } from '@knowvah/dot-engine';

const svg = renderSvg('digraph { a -> b }', 'dot');
document.querySelector('#out')!.innerHTML = svg;
```

A [área de testes](/pt-br/playground) deste mesmo site faz exatamente isso — ela
importa o mecanismo e chama `renderSvg` no navegador, sem nenhuma ida e volta a
um servidor.

## Medição de texto

O Graphviz precisa das dimensões do texto para dimensionar os rótulos. O
@knowvah/dot-engine cuida disso automaticamente:

- **No navegador** (quando `document` existe), ele mede o texto com o contexto 2D
  nativo de `<canvas>` — fiel ao host, já que é a mesma fonte com que o navegador
  renderiza o SVG.
- **No Node**, o padrão é o medidor **Estimate** embutido — um modelo
  determinístico, seguro para ambientes sem interface, que espelha o próprio
  `estimate_textspan_size` do Graphviz. Não é preciso instalar `canvas` nem ter
  arquivos de fonte para obter um layout correto no Node; um medidor com tabela de
  consulta (LUT) com hinting também está disponível como opção, para um
  dimensionamento mais próximo do host sem uma dependência nativa de canvas. Veja
  [Medição de texto](/pt-br/guide/text-measurement) para saber como selecionar um
  medidor explicitamente.

Em nenhum caso são necessários arquivos de fonte para o layout.

## Fontes web: por que a pré-busca importa

Os tamanhos dos rótulos vêm da medição do texto com uma fonte. Se uma face é
declarada com `@font-face`, mas ainda não terminou de carregar, o navegador mede
com a fonte **de reserva** (fallback) e o layout fica errado quando a fonte real
chega. Medido no Chromium com JetBrains Mono: uma caixa de rótulo tinha **70,68 pt**
de largura quando medida antes de a face carregar (fallback) e **124,8 pt** depois
de carregada.

Os pontos de entrada assíncronos (`renderSvgAsync`, `renderAsync`, `renderSvgInto`)
evitam isso: eles coletam as fontes que o grafo vai solicitar, carregam-nas por
meio de `document.fonts` e só então executam o layout. `renderSvgAsync` produziu os
mesmos 124,8 pt que a medição feita depois do carregamento.

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg, fontIssues } = await renderSvgAsync(
  'digraph { node [fontname="JetBrains Mono"]; a -> b }',
  'dot',
  { fontTimeoutMs: 5000 },
);
```

- **`fontTimeoutMs`** (padrão `3000`) é um único prazo compartilhado por todas as
  faces, não por face.
- **`fontIssues`** é uma lista de `{ face, reason }`. `reason: 'failed'` significa
  que a face deu erro (por exemplo, um 404) ou que seu carregamento foi rejeitado;
  `reason: 'timeout'` significa que ela não carregou dentro de `fontTimeoutMs`. Em
  ambos os casos o layout prossegue com uma fonte de reserva. Cada problema também
  é registrado com `console.warn`. Problemas de fonte nunca rejeitam a promise.
- **Limitação:** só é possível relatar famílias declaradas com `@font-face`. Uma
  fonte do sistema ou um nome de família desconhecido é resolvido como
  "carregado" (não há nada a aguardar), de modo que um `fontname` com erro de
  digitação nunca aparece em `fontIssues`.
- **Node e Workers** não têm `document.fonts`, então a pré-busca de fontes é
  ignorada e `fontIssues` é `[]`. Os ganchos de imagem continuam funcionando. Você
  pode passar um `fontSet` (qualquer objeto com `load(font)`) para fornecer o seu.

## Renderizar dentro de uma página: `renderSvgInto`

```ts
import { renderSvgInto } from '@knowvah/dot-engine';

// <div id="graph"></div>
const { element, fontIssues } = await renderSvgInto('graph', dot, 'dot');
if (fontIssues.length > 0) {
  console.warn('fallback fonts used for', fontIssues.map((i) => i.face));
}
```

Ela substitui os filhos do elemento com o id informado pelo `<svg>` renderizado
(retornado como `element`), usando `DOMParser` e `importNode`, nunca `innerHTML`.
Um id inexistente rejeita com `ERR_INVALID_ARG_VALUE`. O SVG é higienizado por
padrão; passe `sanitize` para usar seu próprio sanitizador ou `trusted: true`
para pular a higienização. Veja a seção "Security" do README para saber o que o
higienizador remove e mantém, e mantenha uma Content-Security-Policy em vigor.

## Imagens externas: `setImageSizer`

Quando um rótulo no estilo HTML contém uma imagem externa
(`<IMG SRC="logo.png"/>`), o Graphviz precisa das dimensões intrínsecas dessa
imagem para dimensionar a célula. (O atributo `image=` de um nó não é medido: o nó
mantém sua caixa normal, como no Graphviz nativo sem interface.) Como a biblioteca
não pode ler o sistema de arquivos, você fornece um medidor:

```ts
import { setImageSizer } from '@knowvah/dot-engine';

setImageSizer((src) => {
  // Return the intrinsic { w, h } for this image source, or null if unknown.
  return { w: 64, h: 64 };
});
```

Se seus grafos nunca referenciam imagens externas, você não precisa chamar isso.
Para dimensionar imagens de forma assíncrona (por exemplo, carregando-as), passe
em vez disso um `imageSizer` assíncrono para `renderSvgAsync`; veja
[Imagens](/pt-br/guide/images).

## Web Workers

O layout roda de forma síncrona, então um grafo grande bloqueia a thread em que
roda. Execute-o em um Worker para manter a página responsiva. Dentro de um Worker
não existe `document`, então a biblioteca mede o texto com um `OffscreenCanvas` e a
API assíncrona carrega as fontes pelo conjunto de fontes do próprio Worker
(`self.fonts`).

As fontes em um Worker são separadas das da página: registre-as no Worker com a
API `FontFace` (regras CSS `@font-face` não chegam aos Workers).

```ts
// graph-worker.ts (module worker)
import { renderSvgAsync } from '@knowvah/dot-engine';

self.fonts.add(new FontFace('Inter', 'url(/fonts/Inter.woff2)'));

self.onmessage = async (e: MessageEvent<string>) => {
  const { svg, fontIssues } = await renderSvgAsync(e.data, 'dot');
  self.postMessage({ svg, fontIssues });
};
```

Renderize com `renderSvgAsync` (ou `renderAsync`) em um Worker, e não com
`renderSvg`, pelo menos até que cada fonte web tenha carregado. O Chromium
continua medindo uma string de fonte com a face de reserva se essa exata string
foi medida no Worker antes de a face carregar, mesmo depois que ela carrega; a
API assíncrona carrega as fontes antes de medir, então nunca cai nesse caso.

## O que não esperar

A biblioteca tem como alvo **SVG** (mais os formatos de texto `json` / `xdot` /
`dot` / mapa de imagem). Saída raster (PNG/JPG), PostScript/PDF e backends
interativos/gráficos estão fora do escopo — converta o SVG a jusante se precisar
de outro formato. Veja [Divergências conhecidas](/pt-br/divergences) para o limite
completo do escopo.

## Grafos grandes: pré-renderize em SVG

Grafos muito grandes — aproximadamente **>10 mil nós ou alguns MB de código-fonte
DOT** — são impraticáveis de dispor em tempo de execução no navegador. O layout
(mincross, ranking, roteamento de splines) é superlinear, então isto é um **limite
de escala compartilhado com o Graphviz original, não uma limitação específica
deste mecanismo**: nessas entradas, o `dot` nativo, as builds WASM
(`@hpcc-js/wasm-graphviz`) e este mecanismo estouram o tempo limite ou ficam sem
memória da mesma forma. (Este mecanismo **não** vaza memória — o heap por
renderização é estável; o limite é estritamente o tamanho do grafo. Veja o
[painel de desempenho](/perf) para a comparação medida.)

Para grafos nessa escala, **renderize uma vez no momento da build e sirva o
`.svg` resultante** em vez de calcular o layout no navegador a cada visualização —
o mesmo padrão que você usaria até com o `dot` nativo, já que ele é lento demais
para rodar a cada requisição.

Os adaptadores de site em tempo de build de
[knowvah/dot-plugins](https://github.com/knowvah/dot-plugins) (publicados no NPM)
fazem exatamente isso:

- `@knowvah/vitepress-plugin-dot` — VitePress (markdown-it), em tempo de build
- `@knowvah/eleventy-plugin-dot` — Eleventy (markdown-it), em tempo de build
- `@knowvah/docusaurus-plugin-dot` — Docusaurus (MDX/remark), em tempo de build
- `@knowvah/dot-markdown-it` — integração com markdown-it independente de framework

Para grafos dinâmicos fornecidos pelo usuário, em que a renderização em tempo de
build não é uma opção, limite a renderização interativa a grafos de tamanho
razoável e coloque em cache o SVG emitido.
