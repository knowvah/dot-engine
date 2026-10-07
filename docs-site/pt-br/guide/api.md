---
sourceHash: e2e54229b04c577dfb514c415c7f02fd786b797b5bfc7a4bbf2e4192d03d0c09
---

# Referência da API

A superfície pública é intencionalmente pequena. A maioria dos chamadores só
precisa de `renderSvg`. Veja a [Visão geral](/pt-br/guide/overview) para saber
qual ponto de entrada usar, [Tipos](/pt-br/guide/types) para os formatos que cada
função consome e devolve, e a [Referência](/reference/) gerada para assinaturas
exaustivas, todos os campos e todas as sobrecargas.

> As declarações de tipo (`.d.ts`) são emitidas por `npm run build` (a etapa
> `build:types` executa `tsc -p tsconfig.build.json`). O mapa `exports` do
> `package.json` conecta condições `types` para cada entrada, de modo que
> `@knowvah/dot-engine`, `@knowvah/dot-engine/api` e `@knowvah/dot-engine/render`
> resolvem tipos nos editores e em builds downstream.
>
> A build também emite mapas de declaração (`.d.ts.map`) e source maps de JS, e
> o pacote distribui seus fontes em `src/` — assim, "ir para a definição" leva
> direto ao TypeScript real, o que facilita ler o código e abrir um PR.

Esta página é organizada pelos três pontos de entrada (a
[Visão geral](/pt-br/guide/overview) explica quando recorrer a cada um): o pacote
raiz `@knowvah/dot-engine` (parse + render em uma única chamada, mais a
configuração global do processo), `@knowvah/dot-engine/api` (construir um grafo
em código, ler de volta a geometria calculada) e `@knowvah/dot-engine/render`
(saída em vários formatos e operações de desenho brutas). Toda função abaixo
também é reexportada pelo pacote raiz (`export * from './api/index.js'` /
`export * from './render/index.js'` em `src/index.ts`) — importar tudo de
`@knowvah/dot-engine` funciona, mas as importações por subcaminho deixam mais
explícito em qual camada você está mexendo.

## `@knowvah/dot-engine` (raiz)

### `renderSvg`

```ts
function renderSvg(dotSource: string, engine: EngineName): string;
```

Analisa o código-fonte DOT, executa o [mecanismo de layout](/pt-br/guide/engines)
indicado, renderiza para SVG e devolve a string SVG. Este é o wrapper de
conveniência de uma só chamada: ele constrói um `GvcContext`, registra os oito
mecanismos embutidos e o renderizador SVG, calcula o layout, renderiza e libera
o layout — veja [`GvcContext` / `renderWithContext`](#gvccontext-renderwithcontext)
abaixo se você precisar dessas etapas separadas.

- **`dotSource`** — código-fonte de grafo na linguagem DOT.
- **`engine`** — `EngineName`: um dos embutidos (`dot`, `neato`, `fdp`,
  `sfdp`, `circo`, `twopi`, `osage`, `patchwork`) ou qualquer nome registrado
  de forma personalizada.
- **Lança** um `DotEngineError` para qualquer problema com a entrada:
  `ParseError` se `dotSource` for inválido, `RenderError` se o layout ou a
  renderização falhar, `InternalError` (com `cause`) para um bug do dot-engine.
  Um `TypeError` com `code` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`
  se `dotSource` ou `engine` for inválido (inclusive um nome de mecanismo que
  não esteja registrado). Veja [Erros e exceções](/pt-br/guide/errors).

Assinatura completa, JSDoc e a lista de campos de `GvError`:
[Referência](/reference/).

### `tryRenderSvg` / `RenderResult`

```ts
function tryRenderSvg(dotSource: string, engine: EngineName): RenderResult;
```

Irmã de `renderSvg` em estilo de resultado. Retorna (nunca lança) para qualquer
entrada DOT: `{ svg }` em caso de sucesso ou `{ errors: [one] }` na primeira
falha; `svg` e `errors` são mutuamente exclusivos. Ela só lança para argumentos
inválidos (`TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`). Cada
entrada em `errors` é um dado simples e serializável em JSON (`type`, `code`,
`message`, `friendlyMessage`, mais `location` / `expected` quando presentes;
sem `cause`, sem stack trace), então é seguro enviá-la através de uma fronteira
de worker/postMessage ou serializá-la em um log. Prefira-a a `renderSvg` +
`try`/`catch` quando o chamador quiser ramificar por `code` / `type` em vez de
capturar uma exceção. Veja [Erros e exceções](/pt-br/guide/errors).
[Referência](/reference/).

### `parse` / `ParseError`

```ts
function parse(dotSource: string): Graph;
```

Analisa o DOT para o modelo de grafo em memória **sem** calcular o layout. É
útil para inspecionar ou transformar o grafo — ou para entregá-lo ao `getLayout`
de `@knowvah/dot-engine/api` ou ao `render` de `@knowvah/dot-engine/render` —
antes de renderizar.

- **Lança** `ParseError` para erros de sintaxe ou violações de direção de aresta
  (por exemplo, `->` em um grafo não direcionado). `ParseError` estende
  `DotEngineError` e implementa `GvError` com `type: 'syntax'`; carrega um
  `location: { line, column, offset? }`. `TypeError` `ERR_INVALID_ARG_TYPE` se
  `dotSource` não for uma string. [Erros e exceções](/pt-br/guide/errors),
  [Referência](/reference/).

### `DotEngineError` / `RenderError` / `InternalError`

```ts
abstract class DotEngineError extends Error implements GvError {
  abstract readonly type: GvErrorType;
  abstract readonly code: GvErrorCode;
  abstract readonly friendlyMessage: string;
}
class RenderError extends DotEngineError {
  readonly type: 'render' | 'semantic';
  readonly code: GvErrorCode; // 'RENDER_ERROR' | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE'
}
class InternalError extends DotEngineError {
  readonly type: 'render';
  readonly code: 'INTERNAL_ERROR';
}
function isGvError(e: unknown): e is GvError;
```

`instanceof DotEngineError` significa que o dot-engine falhou com esta entrada.
`RenderError` cobre falhas conhecidas de layout/renderização (`type` é
`semantic` para `UNKNOWN_LAYOUT` e `UNSUPPORTED_FEATURE`). `InternalError` é um
bug do dot-engine; `cause` guarda o erro original quando um foi encapsulado. Erros
do chamador lançam, em vez disso, um `TypeError` / `RangeError` / `Error` padrão
com um `code`. `isGvError` verifica a presença de `type` e `code` como strings,
então funciona entre bundles duplicados. Veja
[Erros e exceções](/pt-br/guide/errors) para cada código e o que cada função
pode lançar, [Tipos](/pt-br/guide/types) para o formato de `GvError` e a
[Referência](/reference/) para a lista de membros de `GvErrorCode`.

### `setTextMeasurer` / `getTextMeasurer`

```ts
function setTextMeasurer(measurer: TextMeasurer | null): void;
function getTextMeasurer(): TextMeasurer;
```

Registra (ou limpa, com `null`) o medidor de texto global do processo,
consultado durante o layout para dimensionar rótulos. Limpá-lo volta ao padrão
da biblioteca (navegador: `CanvasTextMeasurer`; headless/Node:
`EstimateTextMeasurer`, a menos que um medidor LUT esteja conectado — veja
[Medição de texto](/pt-br/guide/text-measurement) para a ordem de resolução
completa e as implementações `CanvasTextMeasurer` / `EstimateTextMeasurer` /
`LutTextMeasurer` exportadas junto com essas funções).
[Referência](/reference/).

### `setImageSizer` / `setImageResolver`

Dois pontos de extensão de configuração de imagem, relacionados mas distintos —
ambos são registros globais do processo que seguem o mesmo padrão (registre um
callback, passe `null` para limpar), e ambos não fazem nada até que um chamador
registre um:

- **`setImageSizer`** — informa as *dimensões intrínsecas* de uma imagem externa
  para que o mecanismo de layout possa reservar espaço para uma célula HTML
  `<IMG>` ou um atributo `image=` de nó antes da renderização. Retornar `null`
  (ou não ter nenhum sizer registrado) reproduz o comportamento do Graphviz
  nativo para imagem ausente: um aviso e tamanho zero.
- **`setImageResolver`** (novo — veja [`inlineImages`](#inlineimages) abaixo) —
  fornece os *bytes* reais da imagem para que o renderizador SVG possa
  incorporá-los como um URI `data:` em vez de emitir `xlink:href="src"` como
  passagem direta.

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;
function setImageSizer(sizer: ImageSizer | null): void;

type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;
function setImageResolver(fn: ImageResolver | null): void;
```

`ImageResolver` pode retornar um `Uint8Array` simples (MIME inferido a partir da
extensão do arquivo de `src` — `.png`, `.jpg`/`.jpeg`, `.gif`, `.svg`, `.webp`;
qualquer outra recai em `application/octet-stream`) ou `{ bytes, mime }` para
definir o tipo MIME explicitamente. Retorne `null` quando `src` não puder ser
resolvido — o renderizador recai na passagem direta de `src`, como se nenhum
resolver estivesse registrado. Registrar um resolver não tem efeito por si só;
ele só é consultado quando a opção `inlineImages` de `render` é `true` (abaixo).
Veja [Trabalhar com imagens](/pt-br/guide/images) para um exemplo completo e a
[Referência](/reference/) para os dois tipos de callback.

### `renderSvgAsync` / `renderSvgInto`

```ts
function renderSvgAsync(
  dotSource: string,
  engine: EngineName,
  opts?: AsyncSvgOptions,
): Promise<{ svg: string; fontIssues: FontIssue[] }>;

function renderSvgInto(
  id: string,
  src: string,
  engine: EngineName,
  opts?: RenderSvgIntoOptions,
): Promise<{ element: SVGSVGElement; fontIssues: FontIssue[] }>;

type FontIssue = { face: string; reason: 'failed' | 'timeout' };
type AsyncSvgOptions = Omit<AsyncRenderOptions, 'engine'>;
interface RenderSvgIntoOptions extends AsyncSvgOptions {
  sanitize?: (svg: string) => string;
  trusted?: boolean;
  document?: Document;
}
```

`renderSvgAsync` é a contrapartida assíncrona de `renderSvg`: ela pré-carrega as
fontes web e os dados de imagem de que o grafo precisa e então calcula o layout
e renderiza. `renderSvgInto` renderiza e substitui os filhos do elemento com id
`id`, sanitizando o SVG por padrão (`trusted: true` pula a sanitização;
`sanitize` substitui o limpador embutido). Falhas, inclusive argumentos
inválidos, são rejeições de promise com as mesmas classes de erro de `renderSvg`;
um id de elemento ausente rejeita com `ERR_INVALID_ARG_VALUE`. Problemas de fonte
nunca rejeitam; eles voltam em `fontIssues`. Veja
[Uso no navegador](/pt-br/guide/browser) e
[Trabalhar com imagens](/pt-br/guide/images), e a [Referência](/reference/).

### `GvcContext` / `renderWithContext`

```ts
class GvcContext {
  constructor(measurer: TextMeasurer, options?: { debug?: DebugOptions });
  register(plugin: LayoutEngine | RendererPlugin): void;
  layout(g: Graph, engineName: EngineName): void;
  freeLayout(g: Graph, engineName: EngineName): void;
}

function renderWithContext(ctx: GvcContext, g: Graph, format: string): string;
```

Orquestração de nível mais baixo para chamadores que precisam conduzir o layout
e a renderização como etapas separadas. `renderSvg` é um wrapper de conveniência
sobre exatamente isso: construir um contexto, registrar mecanismos/renderizadores,
`layout`, `renderWithContext`, `freeLayout`. Recorra a eles diretamente apenas
quando precisar desse controle — por exemplo, para registrar um subconjunto de
mecanismos, adicionar um `LayoutEngine` ou `RendererPlugin` personalizado, ou
renderizar o mesmo grafo com layout calculado para vários formatos sem executar o
layout de novo (chame `layout` uma vez, depois `renderWithContext` para cada
formato e, por fim, `freeLayout`). [Referência](/reference/).

## `@knowvah/dot-engine/api`

Construção programática, inserção segura de arestas e leitura da geometria
calculada — a camada para construir um grafo sem escrever DOT à mão e ler seu
layout de volta como dados simples. Veja [Tipos](/pt-br/guide/types) para
`LayoutSnapshot` e seus formatos aninhados.

### `createGraph`

```ts
function createGraph(opts?: {
  directed?: boolean;
  strict?:   boolean;
  name?:     string;
}): GvGraphBuilder;
```

Cria um grafo novo, pronto para ser entregue a `render` / `getLayout` /
`getDrawOps`. Padrões: `directed: true`, `strict: false`, `name: ''`. Devolve um
`GvGraphBuilder` — `addNode`, `addEdge`, `addSubgraph`, `setAttr`/`getAttr`,
`setHtmlAttr` (para rótulos de tabela HTML) e uma propriedade `.graph` que expõe
o handle opaco `Graph`. Veja [Construir um grafo em código](/pt-br/guide/build-a-graph)
e a [Referência](/reference/) para as interfaces completas
`GvGraphBuilder`/`GvNode`/`GvEdge`.

### `addEdge`

```ts
function addEdge(g: Graph, tail: Node, head: Node, name?: string): Edge;
```

Auxiliar de inserção de arestas de nível mais baixo, subjacente a
`GvGraphBuilder.addEdge` — exportado diretamente para chamadores que trabalham
com as referências internas `Node`/`Edge` (por exemplo, arestas adicionadas a um
grafo devolvido por `parse()`) em vez dos handles opacos `GvNode`/`GvEdge` do
construtor. A maioria dos chamadores deve usar
`createGraph(...).addEdge(tail, head, attrs?)`.

- **`name`** — chave da aresta; o padrão é `''` (anônima). Ignorada na
  deduplicação de grafos strict, que compara apenas `(tail, head)` (simétrica
  para grafos não direcionados).
- **Retorna** a nova aresta, ou a existente se `g` for strict e já existir uma
  aresta `(tail, head)` (espelha `agedge` com `cflag=1`).

Veja [Construir um grafo em código](/pt-br/guide/build-a-graph) e a
[Referência](/reference/).

### `getLayout`

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

Devolve um snapshot simples e serializável em JSON da geometria calculada do
grafo — posições de nós, pontos de controle das splines das arestas, rótulos de
aresta, caixas delimitadoras de clusters e os limites gerais do grafo — tudo em
pontos.

- **`g`** — precisa já ter o layout calculado (via `render(g, ...)`,
  `getDrawOps(g)` ou `ctx.layout(g, engine)`); chamar `getLayout` em um grafo
  cujo layout ainda não foi calculado lança um erro em vez de devolver
  silenciosamente uma geometria toda zerada.
- **`opts.yAxis`** — padrão `'down'`: coordenadas de tela, origem no canto
  superior esquerdo, y cresce para baixo, e `bounds` é normalizado para `(0, 0)`.
  `'up'` devolve as coordenadas nativas do Graphviz (origem no canto inferior
  esquerdo, y cresce para cima) com `bounds.x`/`bounds.y` no canto inferior
  esquerdo bruto.
- **Lança** `Error` com `code` `ERR_INVALID_STATE` se o layout de `g` não foi
  calculado; `TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` para
  um `g` ou `opts` inválido. Veja [Erros e exceções](/pt-br/guide/errors).

`width`/`height` dos nós são convertidos para pontos (o modelo interno armazena
polegadas); toda outra coordenada já está em pontos. Veja
[Ler a geometria calculada](/pt-br/guide/geometry) para a descrição do sistema de
coordenadas e [Tipos](/pt-br/guide/types) / [Referência](/reference/) para as
listas completas de campos de `LayoutSnapshot`, `NodeGeometry`, `EdgeGeometry`,
`ClusterGeometry` e `BoundsGeometry`.

### `Graph`

Tipo de handle opaco reexportado do modelo interno. Apenas o *tipo* é exposto
(não a classe mutável) — use-o para anotar uma variável que guarda o `.graph` de
um construtor ou o resultado de `parse()`, mas não construa nem inspecione seus
campos diretamente; use o construtor, `getLayout` ou `getDrawOps` para ler o
estado de volta. [Referência](/reference/).

## `@knowvah/dot-engine/render`

Saída em vários formatos e acesso bruto às operações de desenho — a camada para
renderizar um grafo já analisado com `parse` ou construído pelo construtor.

### `render`

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  RenderOptions,
): string;
```

Calcula o layout e renderiza um grafo para a string do formato solicitado.

- **`format`** — `OutputFormat`: `'svg' | 'dot' | 'xdot' | 'json' | 'plain' |
  'plain-ext' | 'imap' | 'cmapx'`.
- **`opts.engine`** — mecanismo de layout (padrão `'dot'`).
- **`opts.inlineImages`** — veja [abaixo](#inlineimages).
- **Lança** `RenderError` em falha de layout ou renderização; `InternalError`
  em um bug do dot-engine; `TypeError` com um `code` para argumentos inválidos
  (inclusive um mecanismo ou formato não registrado). Veja
  [Erros e exceções](/pt-br/guide/errors).

`opts.engine` espelha o parâmetro `engine` de `renderSvg`; `format` é o eixo que
`renderSvg` não expõe (`renderSvg` é fixado em `'svg'`). Veja
[Renderizar para outros formatos](/pt-br/guide/render-formats) e a
[Referência](/reference/) para a união completa `OutputFormat` e o formato de
`RenderOptions`.

#### `inlineImages`

`RenderOptions.inlineImages` (padrão `false`) incorpora imagens externas como
URIs `data:` em vez da passagem direta de `xlink:href="src"`. Não tem efeito a
menos que um resolver esteja registrado via `setImageResolver` (acima) — e
nenhum efeito em formatos que não sejam SVG. Se não for definida, a saída é
idêntica, byte a byte, à de antes de essa opção existir.

```ts
import { setImageResolver } from '@knowvah/dot-engine';
import { render } from '@knowvah/dot-engine/render';
import { parse } from '@knowvah/dot-engine';

setImageResolver((src) => {
  // Return the bytes for any src your DOT source references via
  // `image="..."` or an HTML <IMG SRC="...">; null for anything else.
  if (src === 'logo.png') return fetchLogoBytesSync(); // Uint8Array
  return null;
});

const g = parse('digraph { a [image="logo.png" shape=none label=""]; }');
const svg = render(g, 'svg', { inlineImages: true });
// svg now embeds `xlink:href="data:image/png;base64,..."` for the `a` node
// instead of `xlink:href="logo.png"`.
```

Veja [Trabalhar com imagens](/pt-br/guide/images) para o guia completo,
incluindo a resolução a partir de `fetch` no navegador e a partir do sistema de
arquivos no Node.

### `renderAsync`

```ts
function renderAsync(
  g:      Graph,
  format: OutputFormat,
  opts?:  AsyncRenderOptions,
): Promise<{ output: string; fontIssues: FontIssue[] }>;

interface AsyncRenderOptions extends RenderOptions {
  imageSizer?: (src: string) => Promise<{ w: number; h: number } | null>;
  imageResolver?: (
    src: string,
  ) => Promise<{ bytes: Uint8Array; mime?: string } | Uint8Array | null>;
  fontTimeoutMs?: number; // default 3000
  fontSet?: FontSetLike;  // default document.fonts when present
}
```

Contrapartida assíncrona de `render`: mesmos formatos e opções
`engine`/`inlineImages`, mais hooks assíncronos de imagem por chamada e
pré-carregamento de fontes. Cada hook de imagem é executado no máximo uma vez por
`src` distinto; um throw ou reject conta como ausência de resultado. A saída é
marcação não sanitizada para os formatos de marcação; veja a seção "Security" do
README.

### `getDrawOps` / `DEFAULT_DRAW_ENGINE`

```ts
const DEFAULT_DRAW_ENGINE: EngineName; // 'dot'

function getDrawOps(g: Graph, opts?: { engine?: EngineName }): XdotOp[];
```

Calcula o layout de `g`, renderiza para xdot e devolve um array plano e tipado
de operações de desenho — formas de nós, trechos de texto, cores e fontes como
valores de uma união discriminada (restrinja por `op.kind` em um `switch`) — para
alimentar um renderizador próprio de canvas/WebGL/PDF sem tocar em SVG nem na
codificação em string do xdot. `opts.engine` tem como padrão
`DEFAULT_DRAW_ENGINE` (`'dot'`).

- **Lança** `ParseError` se a saída xdot intermediária não puder ser reanalisada
  (um bug do dot-engine; não esperado na prática); `RenderError` em falha de
  layout/renderização; `InternalError` em qualquer outro bug do dot-engine;
  `TypeError` com um `code` para argumentos inválidos. Veja
  [Erros e exceções](/pt-br/guide/errors).

Veja [Renderização própria com xdot](/pt-br/guide/xdot-drawops) para a lista de
tipos de operação e um exemplo completo de canvas, e [Tipos](/pt-br/guide/types) /
[Referência](/reference/) para a união completa `XdotOp` e os formatos
`Xdot`/`XdotColor`.
