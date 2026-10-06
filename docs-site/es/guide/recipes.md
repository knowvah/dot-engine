---
sourceHash: 3d15763baac8b6d86c1f835e1c633c2b13aba787da3d897db25cb3038b8e2d78
---

# Recetario

Fragmentos orientados a tareas para las partes del recorrido construir → diseñar
→ leer la geometría que no resultan evidentes con solo la referencia de la API.
Cada receta es un ejemplo mínimo y ejecutable que usa únicamente la superficie
pública de `@knowvah/dot-engine` / `@knowvah/dot-engine/api` /
`@knowvah/dot-engine/render`, sin clases internas del modelo. Consulta
`/guide/api` para ver la lista completa de puntos de entrada de los que parten
estos fragmentos.

## 1. Construir un grafo en código y renderizarlo

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client', { shape: 'box' });
b.addNode('server', { shape: 'box' });
b.addEdge('client', 'server', { label: 'HTTP GET' });

const svg = render(b.graph, 'svg');
```

**Por qué:** `createGraph` te da un constructor cuando la estructura del grafo
procede de datos de la aplicación y no de una cadena DOT estática; `render`
calcula el diseño del grafo y lo serializa en una sola llamada. La API completa
del constructor (subgrafos, atributos, comparación con `parse`) está en
`/guide/build-a-graph`.

## 2. Calcular el diseño sin renderizar y luego leer la geometría

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

**Por qué:** `getLayout` es un lector puro sobre una geometría ya calculada: no
ejecuta el diseño por sí mismo. Si lo llamas antes de que se haya ejecutado
cualquier cálculo de diseño, lanza un `Error` con `code` `ERR_INVALID_STATE`
("getLayout requires a laid-out graph"; consulta
[Errores y excepciones](/es/guide/errors)) en lugar de devolver coordenadas
obsoletas o a cero. Si solo necesitas la geometría y nunca la cadena
renderizada, descarta el valor devuelto por `render`: lo que realmente estás
pagando es el efecto secundario del diseño.

## 3. Elegir el eje y para tu renderizador

```ts
import { getLayout } from '@knowvah/dot-engine';

// Screen/canvas/SVG convention: origin top-left, y increases downward.
const screenLayout = getLayout(g);

// Native graphviz convention: origin bottom-left, y increases upward.
const nativeLayout = getLayout(g, { yAxis: 'up' });
```

**Por qué:** Graphviz calcula el diseño en un sistema de coordenadas con el eje
y hacia arriba; la mayoría de los consumidores (canvas, DOM, SVG en el
navegador) quieren el eje y hacia abajo. `getLayout` usa `'down'` por defecto,
así que la mayoría de las llamadas nunca necesitan la opción. Consulta
`/guide/geometry` para ver la fórmula exacta de inversión y en qué se diferencia
`bounds` entre los dos modos.

## 4. Conciliar el marco SVG de `render()` con el marco de `getLayout()`

`render(g, 'svg')` y `getLayout(g)` describen el *mismo* grafo ya diseñado,
pero en marcos de coordenadas distintos, y la diferencia no es solo la
inversión del eje y: el emisor SVG de `render` niega cada coordenada y antes de
escribir una primitiva de forma y luego envuelve todo el dibujo en un único
`<g transform="scale(..) rotate(..) translate(tx,ty)">` que incorpora el
relleno de página de Graphviz, el margen y cualquier escalado o rotación de
`size=`. `getLayout` se salta todo eso: devuelve coordenadas del modelo
normalizadas a un origen `(0, 0)`, sin ninguna geometría de página.

Para cualquier llamada a `render()`, los dos marcos difieren en una traslación
constante. En lugar de volver a deducir la fórmula de diseño de página de GVC,
deduce el desplazamiento de forma empírica a partir de un nodo cuyas posiciones
ya conoces en ambos marcos:

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

**Por qué:** una sola coincidencia determina por completo el desplazamiento,
porque es una traslación pura, no un escalado ni una rotación (suponiendo los
valores predeterminados de `size=`/`rotate=`). Solo lo necesitas cuando lees del
SVG en bruto algo que `getLayout` no expone; consulta la receta 5 para ver el
único caso habitual en el que hoy es inevitable.

## 5. Recuperar las posiciones de las etiquetas de arista

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

**Por qué:** `EdgeGeometry.label` solo está presente en una arista para cuyo
atributo `label` Graphviz colocó realmente una etiqueta centrada; las aristas
sin ella simplemente omiten el campo. `getLayout` devuelve solo la *posición*
calculada, no la cadena de la etiqueta ni su caja medida, así que si tu
renderizador necesita dibujar la etiqueta por sí mismo, combina esta posición
con el tamaño que ya hayas medido por tu cuenta para ese texto de etiqueta (por
ejemplo, devolviendo tu propio mapa de tamaños de etiqueta por arista, con la
misma clave de par tail/head que usaste para construir la arista).

Las etiquetas de puerto `taillabel` y `headlabel` se obtienen del mismo modo,
en `tailLabel` y `headLabel`:

```ts
b.addEdge('client', 'server', { taillabel: '1', headlabel: '*' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.tailLabel) console.log(`${e.tail} end: (${e.tailLabel.x}, ${e.tailLabel.y})`);
  if (e.headLabel) console.log(`${e.head} end: (${e.headLabel.x}, ${e.headLabel.y})`);
}
```

Cada una está presente solo cuando el diseño la colocó, la misma condición bajo
la que `render()` emite el `<text>` de la etiqueta, así que no hace falta
extraer datos del SVG renderizado para recuperar estas posiciones.

Una `xlabel` se obtiene en `xlabel`, con la misma condición de «solo si se
colocó». Conviene leerla en lugar de aproximarla: Graphviz posiciona una
etiqueta externa mediante una búsqueda por fuerzas entre posiciones candidatas,
no desplazando el punto medio del spline, de modo que ninguna aritmética sobre
`label` o `points` la reproduce.

```ts
b.addEdge('a', 'b', { xlabel: 'X' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.xlabel) console.log(`xlabel at (${e.xlabel.x}, ${e.xlabel.y})`);
}
```

## 5b. Dibujar tus propias puntas de flecha

```ts
for (const e of getLayout(b.graph).edges) {
  const last = e.points[e.points.length - 1];
  if (e.ep) drawArrow(last, e.ep);   // tip at ep, base at the spline's end
  if (e.sp) drawArrow(e.points[0], e.sp);
}
```

**Por qué:** cuando un extremo lleva flecha, el diseño acorta el spline para
dejarle sitio y registra hasta dónde debe llegar la flecha: `ep` en el extremo
de la cabeza (head) y `sp` en el de la cola (tail). Ambos están ausentes cuando
ese extremo no tiene flecha, de modo que las comprobaciones anteriores sirven
también para saber si ese extremo necesita una flecha. Extrapolar una punta a
partir de la dirección final del spline acierta la dirección pero adivina la
profundidad; estos son los valores que calculó el propio Graphviz.

Ten en cuenta que son puntos de unión en el borde del nodo. El propio
renderizador de Graphviz desplaza hacia dentro, desde ellos, el polígono que
dibuja, en una cantidad que depende del grosor de línea (penwidth); por eso
dibuja *hasta* `ep` en lugar de esperar que coincida con la punta de una flecha
renderizada.

## 6. Asignar los nombres de clúster de @knowvah/dot-engine a los tuyos

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

**Por qué:** `ClusterGeometry.name` devuelve exactamente el nombre que diste a
`addSubgraph`: @knowvah/dot-engine no lo inventa, renumera ni transforma de
ningún otro modo. Si tu modelo de dominio identifica los clústeres con un id
propio (que no sería un nombre válido para Graphviz), conserva tú mismo la
correspondencia id-nombre mientras construyes el grafo y vuelve a indexar la
instantánea de `clusters` tras el diseño; no intentes deducir significado del
nombre propio de Graphviz.

## 6b. Dibujar tu propio bloque de título de clúster

```ts
for (const c of getLayout(b.graph).clusters) {
  if (!c.label) continue;                     // cluster declared no title
  drawBox(c.x, c.y, c.width, c.height);
  drawTextCentred(c.label.x, c.label.y, c.label.width, c.label.height);
}
```

**Por qué:** el diseño reserva espacio para el título de un clúster dentro de
la caja del clúster y después resuelve dónde va, respetando `labelloc`,
`labeljust`, `rankdir` y el tamaño medido de la propia etiqueta.
`ClusterGeometry.label` publica esa colocación ya resuelta, de modo que un
consumidor que dibuja su propio bloque de título la lee en lugar de volver a
medir el texto y recalcular un desplazamiento que tiene que coincidir con el
del motor.

`label.x`/`label.y` son el **centro** del espacio de la etiqueta, a diferencia
de `x`/`y` de la caja, que es una esquina. El `<text>` que emite `render()`
lleva en cambio la *línea base*, que queda por debajo del centro; por tanto, si
estás comparando con la salida renderizada, compara centros con centros, no con
la `y` emitida.

## 7. Añadir muchas aristas de forma segura

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

**Por qué:** el `addEdge` del constructor resuelve `tail`/`head` por nombre y
crea el nodo la primera vez que se usa si aún no existe; nunca tienes que
declarar los nodos de antemano antes de conectar una lista de aristas
procedente de datos. En un grafo `strict`, repetir el mismo par `(tail, head)`
devuelve la arista existente en lugar de añadir una paralela, reflejando el
contrato de deduplicación de `agedge` de cgraph.

Si añades aristas a un grafo producido por `parse()` en lugar de
`createGraph()`, usa directamente el `addEdge(g, tail, head, name?)` de nivel
inferior de `@knowvah/dot-engine` sobre referencias `Node` que ya tengas:

```ts
import { parse, addEdge } from '@knowvah/dot-engine';

const g = parse('digraph { a; b; }');
const a = g.nodes.get('a')!;
const c = g.nodes.get('b')!;
addEdge(g, a, c);
```

Consulta `/reference` para ver la firma completa de `addEdge` y su
comportamiento de deduplicación en grafos estrictos.

## 8. Todo junto

Una función compacta que toma un pequeño grafo de dominio, calcula su diseño y
devuelve nodos y aristas posicionados:

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

Esta es la forma que la mayoría de los consumidores acaban construyendo sobre
`getLayout`: un único punto de extensión que recibe tus propios tipos de nodo y
arista y devuelve la geometría posicionada en tu propia convención de
coordenadas.
