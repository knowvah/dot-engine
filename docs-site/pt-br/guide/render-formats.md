---
sourceHash: 91734a77ccd994e207575249d86485d95bac98d6ddb3b38481e94ded257de4b9
---

# Renderizar para outros formatos

`render` calcula o layout de um grafo e emite uma string no formato
solicitado. Ela aceita qualquer `Graph` produzido por `parse` ou
`createGraph`.

## Assinatura

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  { engine?: string },
): string;
```

`engine` tem como padrão `'dot'`. Veja [Mecanismos de layout](/pt-br/guide/engines)
para a lista completa.

## Formatos

```ts
type OutputFormat =
  | 'svg'        // SVG markup
  | 'dot'        // DOT source with layout attributes added
  | 'xdot'       // DOT + xdot draw instructions (_draw_ attributes)
  | 'json'       // Full graph as JSON (graphviz json format)
  | 'plain'      // Whitespace-separated node/edge geometry (plain text)
  | 'plain-ext'  // plain, extended with port info
  | 'imap'       // HTML image-map (server-side; clickable areas)
  | 'cmapx';     // HTML client-side image-map
```

## Quando usar cada um

| Formato | Uso típico |
|---|---|
| `'svg'` | Incorporar em páginas web; legível por humanos; escala sem perdas |
| `'dot'` | Depuração; realimentar outras ferramentas do graphviz com o layout preservado |
| `'xdot'` | Alimentar um renderizador próprio por meio de `getDrawOps` |
| `'json'` | Dados do grafo legíveis por máquina, para ferramentas ou inspeção |
| `'plain'` | Saída de geometria leve; fácil de analisar em scripts |
| `'plain-ext'` | Como `'plain'`, mais as coordenadas de porta nas arestas |
| `'imap'` | Mapa de imagem clicável no servidor para tags `<img>` |
| `'cmapx'` | Elemento `<map>` no cliente para tags `<img>` |

## Exemplos

```ts
import { parse, render } from '@knowvah/dot-engine';

const g = parse(`
  digraph {
    rankdir = LR;
    a [label="Node A"];
    b [label="Node B"];
    a -> b [label="edge"];
  }
`);

// SVG — most common output
const svg = render(g, 'svg');

// Annotated DOT (layout coordinates embedded)
const laid = render(g, 'dot');

// JSON for inspection
const json = render(g, 'json');

// Plain-text geometry
const plain = render(g, 'plain');
```

## Usando um mecanismo diferente

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: false });
b.addNode('x'); b.addNode('y'); b.addNode('z');
b.addEdge('x', 'y'); b.addEdge('y', 'z'); b.addEdge('z', 'x');

// neato uses a spring-model layout
const svg = render(b.graph, 'svg', { engine: 'neato' });
```

## Relação com `renderSvg`

`renderSvg(dot, engine)` é um wrapper de conveniência que chama `parse` +
`render` em uma única etapa e se limita à saída SVG. Use `render` diretamente
quando precisar de um formato diferente de SVG ou quando você já tiver em mãos
um objeto `Graph`.

```ts
// Equivalent
const svg1 = renderSvg(dotSource, 'dot');

const svg2 = render(parse(dotSource), 'svg', { engine: 'dot' });
```
