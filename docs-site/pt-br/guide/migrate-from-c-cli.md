---
sourceHash: 7638c760f4dc33297b8c499112956cda9094f2d9478dfb5e55ffa06926dea4fb
---

# Migrando da ferramenta de linha de comando `dot`

Os binários `dot`/`neato`/`fdp`/... em C leem um arquivo `.dot` (ou a entrada
padrão) e gravam um arquivo renderizado (ou a saída padrão). O
@knowvah/dot-engine não tem sistema de arquivos: ele recebe uma **string** DOT
e devolve uma **string** renderizada (ou, com `getLayout`, um objeto de
geometria JavaScript simples, em vez de uma string a ser analisada).

```bash
dot -Kneato -Tsvg input.dot -o output.svg
```

```ts
import { renderSvg } from '@knowvah/dot-engine';
import { readFileSync, writeFileSync } from 'node:fs';

const dot = readFileSync('input.dot', 'utf8');
const svg = renderSvg(dot, 'neato');
writeFileSync('output.svg', svg);
```

A leitura e a gravação de arquivos acima são código seu, não da biblioteca — o
@knowvah/dot-engine nunca toca o disco. É isso também que faz com que ele
funcione sem modificações em uma aba de navegador, onde não há `input.dot` para
ler.

## `-K<engine>` — o mecanismo de layout

`-K` seleciona o mecanismo de layout; o @knowvah/dot-engine aceita o mesmo nome
como o argumento `engine` de `renderSvg` ou o campo `opts.engine` de `render`.
Todos os oito mecanismos foram portados:

| Valor de `-K` | String `engine` do @knowvah/dot-engine |
|---|---|
| `-Kdot` | `'dot'` (também o padrão de `render` quando `engine` é omitido) |
| `-Kneato` | `'neato'` |
| `-Kfdp` | `'fdp'` |
| `-Ksfdp` | `'sfdp'` |
| `-Kcirco` | `'circo'` |
| `-Ktwopi` | `'twopi'` |
| `-Kosage` | `'osage'` |
| `-Kpatchwork` | `'patchwork'` |

```ts
renderSvg(dot, 'neato');
render(g, 'svg', { engine: 'neato' });
```

Veja [Mecanismos de layout](/pt-br/guide/engines) para saber o que cada um faz e
qual é a sua classe de conformidade.

## `-T<format>` — o formato de saída

`renderSvg` produz apenas SVG; use `render(g, format, opts?)` para qualquer
outra coisa. A união `OutputFormat` do @knowvah/dot-engine cobre estes alvos
`-T`:

| Valor de `-T` | String `format` do @knowvah/dot-engine | Observações |
|---|---|---|
| `-Tsvg` | `'svg'` | também é a única saída de `renderSvg` |
| `-Tdot` | `'dot'` | código DOT com atributos de layout (`pos`, `bb`, ...) adicionados |
| `-Txdot` | `'xdot'` | DOT + instruções xdot `_draw_`/`_ldraw_` |
| `-Tjson` | `'json'` | grafo completo como JSON |
| `-Tplain` | `'plain'` | geometria de nós/arestas separada por espaços em branco |
| `-Tplain-ext` | `'plain-ext'` | `plain`, mais as coordenadas de porta nas arestas |
| `-Timap` | `'imap'` | mapa de imagem HTML no servidor |
| `-Tcmapx` | `'cmapx'` | elemento `<map>` HTML no cliente |

```ts
const svg = render(g, 'svg', { engine: 'dot' });
const json = render(g, 'json');
```

**Não suportado:** formatos raster (`-Tpng`, `-Tjpg`, `-Tgif`, ...),
`-Tps`/`-Tpdf`/`-Teps` e backends gráficos/interativos. Esses são um limite de
escopo intencional — veja [Divergências conhecidas](/pt-br/divergences) para a
lista completa de não objetivos. Se você precisar de um raster, renderize para
`'svg'` e converta depois (um navegador headless, `resvg` ou algo semelhante).

## `-Gname=val` / `-Nname=val` / `-Ename=val` — atributos

As flags globais de atributo da CLI definem um valor padrão em todo
grafo/nó/aresta a partir da linha de comando. O @knowvah/dot-engine não tem
flags de linha de comando — defina os mesmos atributos diretamente no código DOT
ou, se você estiver construindo o grafo em código, pela API do construtor:

```bash
dot -Gsize=6,6 -Nshape=box -Ecolor=blue -Tsvg input.dot
```

```ts
// DOT source — put the defaults in a top-level attribute statement
const dot = `
  digraph {
    graph [size="6,6"];
    node  [shape=box];
    edge  [color=blue];
    a -> b;
  }
`;
const svg = renderSvg(dot, 'dot');
```

```ts
// Builder — set per-node/per-edge attrs where you create each one
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.setAttr('size', '6,6');
b.addNode('a', { shape: 'box' });
b.addNode('b', { shape: 'box' });
b.addEdge('a', 'b', { color: 'blue' });
const svg = render(b.graph, 'svg');
```

Veja [Construir um grafo em código](/pt-br/guide/build-a-graph) para a API
completa do construtor.

## Obtendo geometria que a CLI não oferece diretamente

`-Tplain` existe justamente para que scripts extraiam coordenadas de
nós/arestas de uma saída de texto. O @knowvah/dot-engine dispensa essa ida e
volta: chame `getLayout(g)` depois de `render` para obter um snapshot tipado e
serializável em JSON de cada posição de nó, de cada spline de aresta e da caixa
delimitadora geral — sem formato de texto para analisar.

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

render(b.graph, 'svg');
const layout = getLayout(b.graph);
// layout.nodes[0] → { name: 'a', x, y, width, height }
```

Veja [Ler a geometria calculada](/pt-br/guide/geometry) para o formato completo
do snapshot e a opção `yAxis` (o graphviz nativo usa y para cima; os navegadores
usam y para baixo).

## Fontes e imagens: a CLI lê o seu sistema de arquivos, o @knowvah/dot-engine não

O `dot` nativo mede o texto com as fontes instaladas na máquina e resolve
atributos `image="..."` lendo arquivos relativos ao diretório de trabalho. O
@knowvah/dot-engine não tem acesso ao sistema de arquivos, então ambos são
injetados pela aplicação hospedeira em vez de lidos do disco:

- **Medição de texto** — `setTextMeasurer` instala um `TextMeasurer`; se você não
  definir um, a biblioteca resolve automaticamente um padrão sensato (canvas do
  navegador ou, no Node, um modelo de métricas determinístico). Veja
  [Medição de texto](/pt-br/guide/text-measurement).
- **Imagens** — `setImageSizer` (e `setImageResolver`, para incorporação inline)
  permitem que você forneça por conta própria as dimensões intrínsecas da
  imagem e os dados da imagem, já que o @knowvah/dot-engine não consegue
  consultar um arquivo em seu nome. Veja
  [Trabalhar com imagens](/pt-br/guide/images).

## Veja também

- [Mecanismos de layout](/pt-br/guide/engines)
- [Renderizar para outros formatos](/pt-br/guide/render-formats)
- [Ler a geometria calculada](/pt-br/guide/geometry)
- [Divergências conhecidas](/pt-br/divergences)
- [Primeiros passos](/pt-br/guide/getting-started)
