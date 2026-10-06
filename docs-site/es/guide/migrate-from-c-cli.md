---
sourceHash: 7638c760f4dc33297b8c499112956cda9094f2d9478dfb5e55ffa06926dea4fb
---

# Migrar desde la herramienta de línea de comandos `dot`

Los binarios `dot`/`neato`/`fdp`/... de C leen un archivo `.dot` (o la entrada
estándar) y escriben un archivo renderizado (o la salida estándar).
@knowvah/dot-engine no tiene sistema de archivos: recibe una **cadena** DOT y
devuelve una **cadena** renderizada (o, con `getLayout`, un objeto JavaScript
simple con la geometría en lugar de una cadena que haya que analizar).

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

Las lecturas y escrituras de archivos de arriba son código tuyo, no de la
biblioteca: @knowvah/dot-engine nunca toca el disco. Eso es también lo que hace
que funcione sin cambios en una pestaña del navegador, donde no hay ningún
`input.dot` que leer.

## `-K<engine>` — el motor de diseño

`-K` selecciona el motor de diseño; @knowvah/dot-engine acepta el mismo nombre
como argumento `engine` de `renderSvg` o como campo `opts.engine` de `render`.
Los ocho motores están portados:

| Valor de `-K` | Cadena `engine` de @knowvah/dot-engine |
|---|---|
| `-Kdot` | `'dot'` (también el valor predeterminado de `render` cuando se omite `engine`) |
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

Consulta [Motores de diseño](/es/guide/engines) para saber qué hace cada uno y
su clase de conformidad.

## `-T<format>` — el formato de salida

`renderSvg` solo genera SVG; usa `render(g, format, opts?)` para todo lo demás.
La unión `OutputFormat` de @knowvah/dot-engine cubre estos destinos `-T`:

| Valor de `-T` | Cadena `format` de @knowvah/dot-engine | Notas |
|---|---|---|
| `-Tsvg` | `'svg'` | también es la única salida de `renderSvg` |
| `-Tdot` | `'dot'` | código DOT con atributos de diseño (`pos`, `bb`, ...) añadidos |
| `-Txdot` | `'xdot'` | DOT + instrucciones xdot `_draw_`/`_ldraw_` |
| `-Tjson` | `'json'` | grafo completo en JSON |
| `-Tplain` | `'plain'` | geometría de nodos y aristas separada por espacios en blanco |
| `-Tplain-ext` | `'plain-ext'` | `plain`, más las coordenadas de puerto en las aristas |
| `-Timap` | `'imap'` | mapa de imagen HTML del lado del servidor |
| `-Tcmapx` | `'cmapx'` | elemento HTML `<map>` del lado del cliente |

```ts
const svg = render(g, 'svg', { engine: 'dot' });
const json = render(g, 'json');
```

**No admitido:** formatos ráster (`-Tpng`, `-Tjpg`, `-Tgif`, ...),
`-Tps`/`-Tpdf`/`-Teps` y los backends gráficos o interactivos. Son un límite de
alcance intencionado; consulta [Divergencias conocidas](/es/divergences) para
ver la lista completa de lo que no es un objetivo. Si necesitas un ráster,
renderiza a `'svg'` y convierte después (un navegador sin interfaz, `resvg` o
algo similar).

## `-Gname=val` / `-Nname=val` / `-Ename=val` — atributos

Las opciones globales de atributos de la CLI establecen un valor predeterminado
en cada grafo, nodo o arista desde la línea de comandos. @knowvah/dot-engine no
tiene opciones de línea de comandos: establece los mismos atributos
directamente en el código DOT o mediante la API del constructor si construyes
el grafo en código:

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

Consulta [Construir un grafo en código](/es/guide/build-a-graph) para ver la API
completa del constructor.

## Obtener geometría que la CLI no puede darte directamente

`-Tplain` existe precisamente para que los scripts puedan extraer las
coordenadas de nodos y aristas de una salida de texto. @knowvah/dot-engine se
ahorra ese rodeo: llama a `getLayout(g)` después de `render` para obtener una
instantánea tipada y serializable a JSON de la posición de cada nodo, el spline
de cada arista y el cuadro delimitador global, sin ningún formato de texto que
analizar.

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

Consulta [Leer la geometría calculada](/es/guide/geometry) para ver la forma
completa de la instantánea y la opción `yAxis` (Graphviz nativo tiene el eje y
hacia arriba; los navegadores, hacia abajo).

## Fuentes e imágenes: la CLI lee tu sistema de archivos, @knowvah/dot-engine no

El `dot` nativo mide el texto con las fuentes que haya instaladas en la
máquina y resuelve los atributos `image="..."` leyendo archivos relativos al
directorio de trabajo. @knowvah/dot-engine no tiene acceso al sistema de
archivos, así que ambas cosas las inyecta la aplicación anfitriona en lugar de
leerlas del disco:

- **Medición de texto**: `setTextMeasurer` instala un `TextMeasurer`; si no
  estableces ninguno, la biblioteca resuelve automáticamente uno razonable
  (el canvas del navegador o, en Node, un modelo de métricas determinista).
  Consulta [Medición de texto](/es/guide/text-measurement).
- **Imágenes**: `setImageSizer` (y `setImageResolver` para incrustarlas) te
  permiten proporcionar tú mismo las dimensiones intrínsecas y los datos de la
  imagen, ya que @knowvah/dot-engine no puede consultar un archivo en tu
  nombre. Consulta [Trabajar con imágenes](/es/guide/images).

## Véase también

- [Motores de diseño](/es/guide/engines)
- [Renderizar a otros formatos](/es/guide/render-formats)
- [Leer la geometría calculada](/es/guide/geometry)
- [Divergencias conocidas](/es/divergences)
- [Primeros pasos](/es/guide/getting-started)
