---
sourceHash: a49bdc5fdca8b04f5bd951935e322d616028e44f4567709824dbbd5229f60e3b
---

# Referência de tipos

Um mapa conceitual dos tipos públicos, agrupados por onde você os obtém:
`createGraph`/`parse` (construir + inspecionar), `getLayout` (snapshot de
geometria), `render`/`getDrawOps` (saída) e o pacote raiz (mecanismos, imagens,
medição de texto, erros). Cada entrada mostra um bloco de formato copiado do
código-fonte e uma descrição de uma linha. Para a documentação exaustiva campo a
campo (incluindo membros herdados e o JSDoc de cada propriedade), veja a
[referência TypeDoc](/reference/) gerada.

Esta página não repete o passo a passo do quadro de coordenadas — veja
[Ler a geometria calculada](/pt-br/guide/geometry) para isso. Ela retoma
brevemente a nota sobre o eixo y sempre que os campos de um tipo dependem do
quadro.

## Construir + inspecionar (`@knowvah/dot-engine` / `@knowvah/dot-engine/api`)

### `Graph`

Um handle opaco para o modelo interno de grafo. Devolvido por `parse()` e por
`createGraph().graph`. Passe-o a `render`, `getLayout` e `getDrawOps`; não o
construa nem o inspecione diretamente — o construtor e o parser são as únicas
maneiras suportadas de produzir um.

### `CreateGraphOptions`

```ts
interface CreateGraphOptions {
  directed?: boolean;
  strict?: boolean;
  name?: string;
}
```

Opções de `createGraph`. `directed`/`strict` selecionam um dos quatro
`GraphKind`s (direcionado, não direcionado, strict direcionado, strict não
direcionado); `name` define o nome do grafo (padrão `''`).

### `GvNode`

```ts
interface GvNode {
  readonly name: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

Handle opaco de um nó do grafo devolvido por `builder.addNode(...)`.
`setHtmlAttr` marca o valor como um rótulo de tipo HTML (equivalente a
`label=<...>` no texto DOT) para que o mecanismo de layout o meça como marcação.

### `GvEdge`

```ts
interface GvEdge {
  readonly tail: string;
  readonly head: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

Handle opaco de uma aresta do grafo devolvida por `builder.addEdge(...)`.

### `GvGraphBuilder`

```ts
interface GvGraphBuilder {
  addNode(name: string, attrs?: Record<string, string>): GvNode;
  addEdge(
    tail: GvNode | string,
    head: GvNode | string,
    attrs?: Record<string, string>,
  ): GvEdge;
  addSubgraph(name: string, attrs?: Record<string, string>): GvGraphBuilder;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
  readonly graph: Graph;
}
```

Devolvido por `createGraph(...)`. `addSubgraph` devolve um construtor aninhado
restrito àquele subgrafo; os nós adicionados por meio dele também são membros do
grafo raiz. `.graph` é o ponto de entrega para `render`/`getLayout`/`getDrawOps`.
Veja [Construir um grafo em código](/pt-br/guide/build-a-graph).

## Snapshot de geometria (`getLayout`)

::: tip Quadro de coordenadas
As coordenadas nativas do graphviz têm y para cima (origem no canto inferior
esquerdo). `getLayout` usa `yAxis: 'down'` como padrão (origem no canto superior
esquerdo, convenção de tela) e inverte toda coordenada y; passe
`{ yAxis: 'up' }` para obter as coordenadas nativas do graphviz. Passo a passo
completo: [Ler a geometria calculada](/pt-br/guide/geometry).
:::

### `YAxis` / `GeometryOptions`

```ts
type YAxis = 'up' | 'down';
type GeometryOptions = { yAxis?: YAxis };
```

Opções de `getLayout`. Padrão `yAxis: 'down'`.

### `LayoutSnapshot`

```ts
interface LayoutSnapshot {
  bounds: BoundsGeometry;
  nodes: NodeGeometry[];
  edges: EdgeGeometry[];
  clusters: ClusterGeometry[];
}
```

Snapshot simples e serializável em JSON da geometria calculada de um grafo,
devolvido por `getLayout(g, opts?)`. `clusters` lista todo subgrafo cluster de
forma recursiva (clusters aninhados recebem, cada um, a sua própria entrada); a
lista fica vazia para grafos sem clusters.

### `BoundsGeometry`

```ts
interface BoundsGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Caixa delimitadora geral, em pontos. Com `yAxis: 'down'`, `x`/`y` são
normalizados para `(0, 0)`. Com `yAxis: 'up'`, `x`/`y` são o canto inferior
esquerdo bruto da caixa delimitadora do grafo.

### `NodeGeometry`

```ts
interface NodeGeometry {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Geometria por nó. `x`/`y` são o centro do nó. `width`/`height` estão em
**pontos** — o modelo os armazena em polegadas (`ND_width`/`ND_height`);
`getLayout` multiplica por 72 antes de devolver.

### `EdgeGeometry`

```ts
interface EdgeGeometry {
  tail: string;
  head: string;
  points: { x: number; y: number }[];
  label?: { x: number; y: number };
  tailLabel?: { x: number; y: number };
  headLabel?: { x: number; y: number };
  xlabel?: { x: number; y: number };
  sp?: { x: number; y: number };
  ep?: { x: number; y: number };
}
```

Geometria por aresta. `points` concatena, em ordem, todos os pontos de controle
de Bézier da spline roteada (vazio se a aresta não tem spline roteada). `label`
só está presente quando a aresta tem um rótulo central.

`tailLabel` e `headLabel` são as posições dos rótulos de porta
`taillabel`/`headlabel`. Cada um só está presente depois que o layout o
posicionou — a mesma condição em que `render()` emite o seu `<text>` — de modo
que um rótulo de porta que não pôde ser posicionado (uma aresta sem spline
roteada, por exemplo) é reportado como ausente, e não como um rótulo na origem.

`xlabel` é a posição do rótulo externo `xlabel`. Ao contrário de `label`, ela é
escolhida pela busca de posicionamento por forças do graphviz entre posições
candidatas ao redor da aresta, então não pode ser derivada de `label` nem do
ponto médio da spline. Ela tem a mesma regra de "apenas se posicionado": um
xlabel declarado que a busca não conseguiu encaixar é reportado como ausente,
exatamente como `render()` se recusa a desenhá-lo.

`sp` e `ep` são os pontos de fixação da seta nas extremidades tail e head. Quando
uma extremidade tem uma seta, a spline é encurtada para deixar espaço para ela e
a seta se estende do ponto de controle terminal até este ponto — de modo que um
consumidor que desenha as próprias pontas de seta lê a ponta aqui, em vez de
extrapolar uma. Cada um só está presente quando aquela extremidade de fato tem
uma seta; assim, uma aresta simples `digraph { a -> b }` reporta `ep` e nenhum
`sp`, e `arrowhead=none` não reporta nenhum dos dois.

Estes são os pontos de fixação na fronteira do nó. O renderizador do próprio
graphviz recua o polígono da seta que ele desenha a partir deles por uma
quantidade que depende da espessura da linha (penwidth), então `ep` é o ponto
*até* o qual se desenha uma seta, e não uma cópia da ponta renderizada.

### `ClusterGeometry`

```ts
interface ClusterGeometry {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: { x: number; y: number; width: number; height: number };
}
```

Caixa delimitadora por cluster. `name` é o nome do subgrafo cluster (por
exemplo, `cluster6`); clusters aninhados codificam a hierarquia no nome, então
nenhum vínculo explícito com o pai é exposto. Segue a mesma convenção de quadro
de `BoundsGeometry`.

`label` é o posicionamento do título do cluster, presente apenas quando o
cluster declara um. Seus `x`/`y` são o **centro** do espaço do rótulo — como em
`EdgeGeometry.label`, e não o canto da caixa `x`/`y` acima — e `width`/`height`
são o tamanho medido do texto, de modo que a caixa do rótulo é
`[x - width/2, x + width/2] × [y - height/2, y + height/2]` e sempre fica dentro
da caixa do cluster. Observe que este é o *centro* do rótulo, enquanto o
`<text>` que `render()` emite carrega a linha de base, que fica mais abaixo.

## Renderização (`@knowvah/dot-engine/render`)

### `OutputFormat`

```ts
type OutputFormat =
  | 'svg'
  | 'dot'
  | 'xdot'
  | 'json'
  | 'plain'
  | 'plain-ext'
  | 'imap'
  | 'cmapx';
```

União fechada dos formatos aceitos por `render(g, format, opts?)`. Veja
[Renderizar para outros formatos](/pt-br/guide/render-formats).

### `RenderOptions`

```ts
interface RenderOptions {
  engine?: EngineName;
  inlineImages?: boolean;
}
```

Opções de `render`. `engine` tem como padrão `'dot'`. `inlineImages` (novo) tem
como padrão `false`; quando `true`, o emissor de SVG incorpora imagens externas
(`image=`/HTML `<IMG>`) como URIs `data:` consultando o resolver registrado por
`setImageResolver` — uma falha do resolver ou a ausência de registro recai na
passagem direta de `src`. Não tem efeito em formatos que não sejam SVG. Veja
[Trabalhar com imagens](/pt-br/guide/images).

::: warning `yAxis` não é um campo de `RenderOptions`
A orientação das coordenadas é uma preocupação exclusiva de `getLayout`. As
strings de formato brutas produzidas por `render` carregam coordenadas nativas
com y para cima; inverta no pós-processamento se você precisar de y para baixo e
não estiver passando por `getLayout`.
:::

### `DrawOpsOptions`

```ts
interface DrawOpsOptions {
  engine?: EngineName;
}
```

Opções de `getDrawOps`. `engine` tem como padrão `'dot'`.

### `Xdot`

```ts
interface Xdot {
  ops: XdotOp[];
  flags: number;
}
```

Resultado analisado de um fluxo de atributo xdot: o array decodificado de
operações de desenho mais uma máscara de bits de flags com o status da análise.
`getDrawOps` devolve apenas o `XdotOp[]` achatado, reunindo todos os atributos
de desenho do grafo, na ordem de pintura (grafo → nó → aresta) — veja
[Renderização própria com xdot](/pt-br/guide/xdot-drawops) para a tabela completa
de tipos de operação e o exemplo de canvas.

### `XdotOp`

```ts
type XdotOp =
  | { kind: 'filled_ellipse' | 'unfilled_ellipse'; ellipse: XdotRect }
  | { kind: 'filled_polygon' | 'unfilled_polygon'; polygon: XdotPolyline }
  | { kind: 'filled_bezier' | 'unfilled_bezier'; bezier: XdotPolyline }
  | { kind: 'polyline'; polyline: XdotPolyline }
  | { kind: 'text'; text: XdotText }
  | { kind: 'fill_color' | 'pen_color'; color: string }
  | { kind: 'grad_fill_color' | 'grad_pen_color'; gradColor: XdotColor }
  | { kind: 'font'; font: XdotFont }
  | { kind: 'style'; style: string }
  | { kind: 'image'; image: XdotImage }
  | { kind: 'fontchar'; fontchar: number };
```

Uma única operação de desenho xdot decodificada, discriminada por `kind`. Cada
variante carrega uma propriedade de carga com o nome do seu formato — restrinja
por `kind` em um `switch` para acessá-la com segurança. As coordenadas estão em
pontos, no quadro nativo com y para cima (inverta para um canvas com y para
baixo — veja o guia indicado acima).

### `XdotColor`

```ts
type XdotColor =
  | { type: 'none'; clr: string }
  | { type: 'linear'; ling: XdotLinearGrad }
  | { type: 'radial'; ring: XdotRadialGrad };
```

Uma cor xdot de preenchimento/traço já resolvida: uma cor sólida ou um gradiente
linear/radial (`XdotLinearGrad`/`XdotRadialGrad` carregam, cada um,
`x0,y0,x1,y1[,r0,r1]` mais um array
`stops: { frac: number; color: string }[]`).

## Pacote raiz (`@knowvah/dot-engine`)

### `EngineName`

```ts
type BuiltinEngine =
  | 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi' | 'osage' | 'patchwork';

type EngineName = BuiltinEngine | (string & {});
```

Um nome de mecanismo de layout. O registro é aberto (mecanismos personalizados
podem ser registrados em um `GvcContext`), então qualquer string é aceita;
`(string & {})` mantém o autocompletar do editor para os embutidos sem fechar o
conjunto. Veja [Mecanismos de layout](/pt-br/guide/engines).

### `ImageSizer`

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;

function setImageSizer(sizer: ImageSizer | null): void;
```

Registra um callback que devolve as dimensões intrínsecas de uma imagem externa
referenciada por `image=` ou por uma célula HTML `<IMG>`, para o dimensionamento
do layout. Retorne `null` quando o tamanho for desconhecido (corresponde ao
comportamento do C para imagem ausente — uma célula de tamanho zero mais um
aviso). Passe `null` a `setImageSizer` para limpar um sizer definido
anteriormente. Veja [Uso no navegador](/pt-br/guide/browser).

### `ImageResolver`

```ts
type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;

function setImageResolver(fn: ImageResolver | null): void;
```

Registra um callback que devolve os bytes brutos de uma imagem externa,
consultado quando `RenderOptions.inlineImages` é `true`. Um retorno de
`Uint8Array` simples infere o tipo MIME a partir da extensão do arquivo de
`src`. `null` (vindo do resolver, ou sem resolver registrado) recai na passagem
direta de `src`. Veja [Trabalhar com imagens](/pt-br/guide/images).

### `TextMeasurer` / `TextSize`

```ts
interface TextMeasurer {
  measure(
    text: string,
    fontname: string,
    fontsize: number,
    flags?: { readonly bold?: boolean; readonly italic?: boolean },
  ): TextSize;
}

interface TextSize {
  w: number;
  h: number;
  yoffsetCenterline?: number;
  yoffsetLayout?: number;
}
```

Medição de texto plugável, instalada por `setTextMeasurer` (três embutidos são
distribuídos: `EstimateTextMeasurer`, `LutTextMeasurer`, `CanvasTextMeasurer`).
`yoffsetCenterline`/`yoffsetLayout` são métricas verticais opcionais (linha de
base→linha central, linha de base→ascendente); omita-as para recair nos padrões
calibrados pelo pango. Veja [Medição de texto](/pt-br/guide/text-measurement).

### `RenderResult` e erros

```ts
interface RenderResult {
  svg?: string;   // present on success
  errors?: GvError[]; // present on failure; length <= 1 for v1
}

interface GvError {
  type: 'syntax' | 'semantic' | 'render';
  code: 'SYNTAX_ERROR' | 'SYNTAX_UNEXPECTED_EOF'
      | 'EDGE_OP_DIRECTED_IN_UNDIRECTED' | 'EDGE_OP_UNDIRECTED_IN_DIRECTED'
      | 'HTML_PARSE_ERROR' | 'RENDER_ERROR' | 'INTERNAL_ERROR'
      | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE' | 'GENERIC_ERROR';
  message: string;
  friendlyMessage: string;
  location?: { line: number; column: number; offset?: number };
  expected?: GvExpectation[];
}
```

`tryRenderSvg(dotSource, engine)` é a contrapartida em estilo de resultado de
`renderSvg`: ela devolve `{ svg }` em caso de sucesso ou `{ errors: [one] }` na
primeira falha, em vez de lançar. Ela retorna para qualquer entrada DOT e só
lança para argumentos inválidos. As entradas de `errors` são dados simples, sem
`cause` e sem stack.

Todo erro do dot-engine lançado estende o `DotEngineError` abstrato e implementa
`GvError`:

```ts
abstract class DotEngineError extends Error implements GvError {
  abstract readonly type: GvErrorType;
  abstract readonly code: GvErrorCode;
  abstract readonly friendlyMessage: string;
}

class ParseError extends DotEngineError {
  readonly type = 'syntax';
  readonly code: GvErrorCode;
  readonly friendlyMessage: string;
  readonly location: { line: number; column: number; offset?: number };
  readonly expected?: GvExpectation[];
  get line(): number;   // convenience getter -> location.line
  get column(): number; // convenience getter -> location.column
}

class RenderError extends DotEngineError {
  readonly type: 'render' | 'semantic'; // 'semantic' for UNKNOWN_LAYOUT / UNSUPPORTED_FEATURE
  readonly code: GvErrorCode; // 'RENDER_ERROR' | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE'
  readonly friendlyMessage: string;
}

class InternalError extends DotEngineError {
  readonly type = 'render';
  readonly code = 'INTERNAL_ERROR';
  readonly friendlyMessage: string;
}

function isGvError(e: unknown): e is GvError; // structural; works across bundles
```

`renderSvg` lança `ParseError` para código-fonte DOT inválido, `RenderError` para
falhas nas etapas de layout/renderização e `InternalError` para um bug do
dot-engine. Erros do chamador lançam um `TypeError` / `RangeError` / `Error`
padrão cujo `code` é um `UsageErrorCode` (`'ERR_INVALID_ARG_TYPE' |
'ERR_INVALID_ARG_VALUE' | 'ERR_OUT_OF_RANGE' | 'ERR_INVALID_STATE'`); esses não
são `GvError`s. Chamadores que querem erros estruturados sem `try`/`catch` devem
usar `tryRenderSvg`. Veja [Erros e exceções](/pt-br/guide/errors) para cada
código.

## Relações

```graphviz
digraph types {
  rankdir=LR;
  bgcolor="transparent";
  node [shape=box, style=rounded, fontname="Helvetica", fontsize=11];
  edge [fontname="Helvetica", fontsize=10];

  subgraph cluster_build {
    label="Build"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    createGraph; GvGraphBuilder; GvNode; GvEdge;
  }
  subgraph cluster_read {
    label="Layout + Read"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    LayoutSnapshot; NodeGeometry; EdgeGeometry; ClusterGeometry; BoundsGeometry;
  }
  subgraph cluster_render {
    label="Render"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    OutputString [label="string"];
    XdotOpArray [label="XdotOp[]"];
  }

  createGraph -> GvGraphBuilder;
  GvGraphBuilder -> GvNode [label="addNode"];
  GvGraphBuilder -> GvEdge [label="addEdge"];
  GvGraphBuilder -> "Graph" [label=".graph"];
  parse -> "Graph";

  "Graph" -> LayoutSnapshot [label="getLayout"];
  LayoutSnapshot -> NodeGeometry;
  LayoutSnapshot -> EdgeGeometry;
  LayoutSnapshot -> ClusterGeometry;
  LayoutSnapshot -> BoundsGeometry;

  "Graph" -> OutputString [label="render"];
  "Graph" -> XdotOpArray  [label="getDrawOps"];
}
```

## Qual tipo vem de qual chamada

| Chamada | Devolve |
|---|---|
| `createGraph(opts?)` | `GvGraphBuilder` |
| `builder.addNode(name, attrs?)` | `GvNode` |
| `builder.addEdge(tail, head, attrs?)` | `GvEdge` |
| `builder.addSubgraph(name, attrs?)` | `GvGraphBuilder` (aninhado) |
| `parse(dotSource)` | `Graph` |
| `render(g, format, opts?)` | `string` |
| `getLayout(g, opts?)` | `LayoutSnapshot` |
| `getDrawOps(g, opts?)` | `XdotOp[]` |
| `renderSvg(dotSource, engine)` | `string` (lança `DotEngineError`, ou um `TypeError` de uso) |
| `tryRenderSvg(dotSource, engine)` | `RenderResult` |

Para cada campo de cada tipo acima — inclusive os que esta página resume — veja
a [referência TypeDoc](/reference/) gerada. Para o aprofundamento sobre o quadro
de coordenadas (com exemplos completos), veja
[Ler a geometria calculada](/pt-br/guide/geometry).
