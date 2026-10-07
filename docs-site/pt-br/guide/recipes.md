---
sourceHash: 3d15763baac8b6d86c1f835e1c633c2b13aba787da3d897db25cb3038b8e2d78
---

# Receitas

Trechos orientados a tarefas para as partes do caminho construir → layout →
ler geometria que não são óbvias apenas pela referência da API. Cada receita é
um exemplo mínimo e executável que usa apenas a superfície pública de
`@knowvah/dot-engine` / `@knowvah/dot-engine/api` /
`@knowvah/dot-engine/render` — sem classes internas do modelo. Veja
`/guide/api` para a lista completa dos pontos de entrada de onde esses trechos
partem.

## 1. Construir um grafo em código e renderizá-lo

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client', { shape: 'box' });
b.addNode('server', { shape: 'box' });
b.addEdge('client', 'server', { label: 'HTTP GET' });

const svg = render(b.graph, 'svg');
```

**Por quê:** `createGraph` oferece um construtor (builder) quando a estrutura
do seu grafo vem de dados da aplicação em vez de uma string DOT estática;
`render` calcula o layout do grafo e o serializa em uma única chamada. A API
completa do construtor (subgrafos, atributos, comparação com `parse`) está em
`/guide/build-a-graph`.

## 2. Calcular o layout sem renderizar e depois ler a geometria

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

// render() triggers layout as a side effect and leaves the computed
// geometry on the graph. Call it (or the lower-level ctx.layout) BEFORE
// getLayout(), even if you don't need render()'s return value.
render(b.graph, 'svg');

const layout = getLayout(b.graph);
for (const n of layout.nodes) {
  console.log(n.name, n.x, n.y, n.width, n.height);
}
```

**Por quê:** `getLayout` é um leitor puro sobre a geometria já calculada — ele
não executa o layout por conta própria. Se você o chamar antes de qualquer
chamada de layout, ele lança um `Error` com `code` `ERR_INVALID_STATE`
("getLayout requires a laid-out graph"; veja [Erros e exceções](/pt-br/guide/errors))
em vez de devolver coordenadas desatualizadas ou zeradas. Se você só precisa da
geometria e nunca da string renderizada, descarte o valor de retorno de
`render` — o efeito colateral do layout é o que você de fato está pagando.

## 3. Escolher o eixo y para o seu renderizador

```ts
import { getLayout } from '@knowvah/dot-engine';

// Screen/canvas/SVG convention: origin top-left, y increases downward.
const screenLayout = getLayout(g);

// Native graphviz convention: origin bottom-left, y increases upward.
const nativeLayout = getLayout(g, { yAxis: 'up' });
```

**Por quê:** o graphviz calcula o layout em um sistema de coordenadas com y
para cima; a maioria dos consumidores (canvas, DOM, SVG no navegador) quer y
para baixo. `getLayout` usa `'down'` como padrão, então a maioria dos chamadores
nunca precisa da opção. Veja `/guide/geometry` para a fórmula exata de inversão
e para como `bounds` difere entre os dois modos.

## 4. Conciliar o quadro de referência do SVG de `render()` com o de `getLayout()`

`render(g, 'svg')` e `getLayout(g)` descrevem o *mesmo* grafo com layout
calculado, mas em quadros de coordenadas diferentes, e a diferença não é só a
inversão do eixo y: o emissor de SVG de `render` nega cada coordenada y antes de
escrever uma primitiva de forma e depois envolve o desenho inteiro em um único
`<g transform="scale(..) rotate(..) translate(tx,ty)">` que incorpora o
preenchimento de página, a margem e qualquer escala/rotação de `size=` do
graphviz. `getLayout` pula tudo isso — ele devolve coordenadas do modelo
normalizadas para uma origem em `(0, 0)`, sem nenhuma geometria de página.

Para qualquer chamada isolada de `render()`, os dois quadros diferem por uma
única translação constante. Em vez de rederivar a fórmula de layout de página do
GVC, derive o deslocamento empiricamente a partir de um nó cujas posições você
já tem nos dois quadros:

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('start');
b.addNode('end');
b.addEdge('start', 'end');

const svg = render(b.graph, 'svg');
const layout = getLayout(b.graph);

/** Bounding-box center of a `<g id="nodeN" class="node">` block's own
 *  `<polygon points="...">`, keyed by the node name in its `<title>`. */
function svgNodeCenter(svg: string, name: string): { x: number; y: number } | undefined {
  const block = new RegExp(
    `<g id="node\\d+" class="node">\\s*<title>${name}</title>([\\s\\S]*?)</g>`,
  ).exec(svg)?.[1];
  const pts = block !== undefined ? /points="([^"]+)"/.exec(block)?.[1] : undefined;
  if (pts === undefined) return undefined;
  const xs: number[] = [];
  const ys: number[] = [];
  for (const pair of pts.trim().split(/\s+/)) {
    const [x, y] = pair.split(',').map(Number);
    xs.push(x ?? 0);
    ys.push(y ?? 0);
  }
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}

const anchor = layout.nodes[0]!;
const rendered = svgNodeCenter(svg, anchor.name)!;
const offset = { dx: rendered.x - anchor.x, dy: rendered.y - anchor.y };

// offset is a pure translation for this render() call. Apply it to any
// other coordinate you scrape out of the same svg string to convert it
// into getLayout()'s frame:
// { x: scrapedX - offset.dx, y: scrapedY - offset.dy }
```

**Por quê:** uma única correspondência determina totalmente o deslocamento,
porque se trata de uma translação pura, e não de uma escala ou rotação
(assumindo `size=`/`rotate=` padrão). Você só precisa disso quando está lendo,
do SVG bruto, algo que `getLayout` não expõe — veja a receita 5 para o único
caso comum em que isso é inevitável hoje.

## 5. Recuperar as posições dos rótulos de aresta

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client');
b.addNode('server');
b.addEdge('client', 'server', { label: 'HTTP GET' });

render(b.graph, 'svg');
const layout = getLayout(b.graph);

for (const e of layout.edges) {
  if (e.label !== undefined) {
    console.log(`${e.tail} -> ${e.head} label center: (${e.label.x}, ${e.label.y})`);
  }
}
```

**Por quê:** `EdgeGeometry.label` está presente apenas para uma aresta cujo
atributo `label` o graphviz de fato posicionou um rótulo centralizado; arestas
sem um simplesmente omitem o campo. `getLayout` devolve apenas a *posição*
calculada — não a string do rótulo nem sua caixa medida — portanto, se o seu
renderizador precisa desenhar o rótulo por conta própria, combine essa posição
com o tamanho que você já mediu, do seu lado, para esse texto de rótulo (por
exemplo, devolvendo o seu próprio mapa de tamanhos de rótulo por aresta, indexado
pelo mesmo par tail/head que você usou para construir a aresta).

Os rótulos de porta `taillabel` e `headlabel` voltam do mesmo jeito, em
`tailLabel` e `headLabel`:

```ts
b.addEdge('client', 'server', { taillabel: '1', headlabel: '*' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.tailLabel) console.log(`${e.tail} end: (${e.tailLabel.x}, ${e.tailLabel.y})`);
  if (e.headLabel) console.log(`${e.head} end: (${e.headLabel.x}, ${e.headLabel.y})`);
}
```

Cada um está presente somente quando o layout o posicionou — a mesma condição em
que `render()` emite o `<text>` do rótulo — portanto não é preciso extrair as
posições do SVG renderizado para recuperá-las.

Um `xlabel` volta em `xlabel`, sob a mesma regra de "apenas se posicionado". Vale
a pena lê-lo em vez de aproximá-lo: o graphviz posiciona um rótulo externo por
uma busca de forças entre posições candidatas, e não deslocando o ponto médio da
spline, de modo que nenhuma aritmética sobre `label` ou `points` o reproduz.

```ts
b.addEdge('a', 'b', { xlabel: 'X' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.xlabel) console.log(`xlabel at (${e.xlabel.x}, ${e.xlabel.y})`);
}
```

## 5b. Desenhar as suas próprias pontas de seta

```ts
for (const e of getLayout(b.graph).edges) {
  const last = e.points[e.points.length - 1];
  if (e.ep) drawArrow(last, e.ep);   // tip at ep, base at the spline's end
  if (e.sp) drawArrow(e.points[0], e.sp);
}
```

**Por quê:** quando uma extremidade tem uma seta, o layout encurta a spline para
deixar espaço para ela e registra onde a seta deve chegar — `ep` na extremidade
head, `sp` na tail. Ambos estão ausentes quando aquela extremidade não tem seta,
então as verificações acima servem também como "esta extremidade precisa de uma
seta?". Extrapolar uma ponta a partir da direção final da spline acerta a
direção, mas chuta a profundidade; estes são os valores que o próprio graphviz
calculou.

Observe que são pontos de fixação na fronteira do nó. O renderizador do próprio
graphviz recua o polígono que ele desenha a partir deles por uma quantidade que
depende da espessura da linha (penwidth), então desenhe *até* `ep` em vez de
esperar que ele seja igual à ponta de uma seta renderizada.

## 6. Mapear os nomes de cluster do @knowvah/dot-engine de volta para os seus

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });

// graphviz only treats a subgraph as a cluster when its name starts with
// the literal prefix "cluster". Generate one synthetic name per caller
// cluster id and remember the reverse mapping before layout runs.
const idByName = new Map<string, string>();
function addCluster(id: string, label: string) {
  const name = `cluster${idByName.size}`;
  idByName.set(name, id);
  return b.addSubgraph(name, { label });
}

const web = addCluster('web-tier', 'Web');
web.addNode('lb');
web.addNode('app1');
web.addEdge('lb', 'app1');

b.addNode('db');
b.addEdge('app1', 'db');

render(b.graph, 'svg');
const layout = getLayout(b.graph);

const clustersByCallerId = new Map(
  layout.clusters.map((c) => [idByName.get(c.name) ?? c.name, c]),
);
// clustersByCallerId.get('web-tier') -> { name, x, y, width, height }
```

**Por quê:** `ClusterGeometry.name` devolve exatamente o nome que você deu a
`addSubgraph` — o @knowvah/dot-engine não inventa, renumera nem transforma o
nome de outra forma. Se o seu modelo de domínio identifica clusters por um id
próprio (e não por um nome que o graphviz aceitaria), mantenha você mesmo o
mapeamento id-para-nome ao construir o grafo e reindexe o snapshot de `clusters`
após o layout; não tente recuperar significado a partir do nome do próprio
graphviz.

## 6b. Desenhar o seu próprio bloco de título de cluster

```ts
for (const c of getLayout(b.graph).clusters) {
  if (!c.label) continue;                     // cluster declared no title
  drawBox(c.x, c.y, c.width, c.height);
  drawTextCentred(c.label.x, c.label.y, c.label.width, c.label.height);
}
```

**Por quê:** o layout reserva espaço para o título do cluster dentro da caixa do
cluster e depois resolve onde ele fica — respeitando `labelloc`, `labeljust`,
`rankdir` e o tamanho medido do próprio rótulo. `ClusterGeometry.label` publica
esse posicionamento resolvido, de modo que um consumidor que desenha o próprio
bloco de título o lê em vez de remedir o texto e rederivar um deslocamento que
precisa concordar com o do mecanismo.

`label.x`/`label.y` são o **centro** do espaço do rótulo, diferentemente de
`x`/`y` da caixa, que é um canto. O `<text>` que `render()` emite carrega a
*linha de base*, que fica abaixo do centro — então, se você estiver comparando
com a saída renderizada, compare centros com centros, e não com o `y` emitido.

## 7. Adicionar muitas arestas com segurança

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true, strict: true });

const dependencies: Array<[string, string]> = [
  ['build', 'test'],
  ['test', 'deploy'],
  ['build', 'lint'],
  ['lint', 'test'],
  ['build', 'test'], // duplicate -- collapsed on a strict graph, not doubled
];

for (const [from, to] of dependencies) {
  b.addEdge(from, to);
}

const svg = render(b.graph, 'svg');
```

**Por quê:** o `addEdge` do construtor resolve `tail`/`head` pelo nome e cria o
nó no primeiro uso, caso ele ainda não exista — você nunca precisa pré-declarar
nós antes de ligar uma lista de arestas orientada por dados. Em um grafo
`strict`, repetir o mesmo par `(tail, head)` devolve a aresta existente em vez
de adicionar uma paralela, espelhando o contrato de deduplicação de `agedge` do
cgraph.

Se você estiver adicionando arestas a um grafo produzido por `parse()` em vez de
`createGraph()`, use diretamente o `addEdge(g, tail, head, name?)` de nível mais
baixo de `@knowvah/dot-engine`, com referências `Node` que você já tem em mãos:

```ts
import { parse, addEdge } from '@knowvah/dot-engine';

const g = parse('digraph { a; b; }');
const a = g.nodes.get('a')!;
const c = g.nodes.get('b')!;
addEdge(g, a, c);
```

Veja `/reference` para a assinatura completa de `addEdge` e seu comportamento de
deduplicação em grafos strict.

## 8. Juntando tudo

Uma função compacta que recebe um pequeno grafo de domínio, calcula seu layout e
devolve nós e arestas posicionados:

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';
import type { LayoutSnapshot } from '@knowvah/dot-engine';

interface DomainNode {
  id: string;
  label: string;
}

interface DomainEdge {
  from: string;
  to: string;
  label?: string;
}

interface PositionedGraph {
  nodes: Array<{ id: string; x: number; y: number; width: number; height: number }>;
  edges: Array<{
    from: string;
    to: string;
    points: { x: number; y: number }[];
    label?: { x: number; y: number };
  }>;
  width: number;
  height: number;
}

function layoutDomainGraph(nodes: DomainNode[], edges: DomainEdge[]): PositionedGraph {
  const b = createGraph({ directed: true });
  for (const n of nodes) b.addNode(n.id, { label: n.label });
  for (const e of edges) {
    b.addEdge(e.from, e.to, e.label !== undefined ? { label: e.label } : {});
  }

  // render() triggers layout; getLayout() reads the geometry it left behind.
  render(b.graph, 'svg');
  const snap: LayoutSnapshot = getLayout(b.graph);

  return {
    nodes: snap.nodes.map((n) => ({
      id: n.name,
      // graphviz reports the node CENTER; convert to top-left if your
      // renderer expects that instead.
      x: n.x - n.width / 2,
      y: n.y - n.height / 2,
      width: n.width,
      height: n.height,
    })),
    edges: snap.edges.map((e) => ({
      from: e.tail,
      to: e.head,
      points: e.points,
      ...(e.label !== undefined ? { label: e.label } : {}),
    })),
    width: snap.bounds.width,
    height: snap.bounds.height,
  };
}
```

Esta é a forma que a maioria dos consumidores acaba construindo sobre
`getLayout`: um único ponto de extensão que recebe os seus próprios tipos de
nó/aresta e devolve geometria posicionada na sua própria convenção de
coordenadas.
