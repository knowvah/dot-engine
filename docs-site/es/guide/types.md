---
sourceHash: a49bdc5fdca8b04f5bd951935e322d616028e44f4567709824dbbd5229f60e3b
---

# Referencia de tipos

Un mapa conceptual de los tipos públicos, agrupados según dónde los obtienes:
`createGraph`/`parse` (construir + inspeccionar), `getLayout` (instantánea de
la geometría), `render`/`getDrawOps` (salida) y el paquete raíz (motores,
imágenes, medición de texto, errores). Cada entrada muestra un bloque de forma
copiado del código fuente y una descripción de una línea. Para la documentación
exhaustiva campo por campo (incluidos los miembros heredados y el JSDoc de cada
propiedad), consulta la [referencia de TypeDoc](/reference/) generada.

Esta página no repite el recorrido por los marcos de coordenadas: para eso,
consulta [Leer la geometría calculada](/es/guide/geometry). Sí repite
brevemente la nota sobre el eje y allí donde los campos de un tipo dependen del
marco.

## Construir + inspeccionar (`@knowvah/dot-engine` / `@knowvah/dot-engine/api`)

### `Graph`

Un manejador opaco del modelo de grafo interno. Lo devuelven `parse()` y
`createGraph().graph`. Pásaselo a `render`, `getLayout` y `getDrawOps`; no lo
construyas ni lo inspecciones directamente: el constructor y el analizador son
las únicas formas admitidas de producir uno.

### `CreateGraphOptions`

```ts
interface CreateGraphOptions {
  directed?: boolean;
  strict?: boolean;
  name?: string;
}
```

Opciones de `createGraph`. `directed`/`strict` seleccionan uno de los cuatro
`GraphKind` (dirigido, no dirigido, dirigido estricto, no dirigido estricto);
`name` establece el nombre del grafo (por defecto `''`).

### `GvNode`

```ts
interface GvNode {
  readonly name: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

Manejador opaco de un nodo del grafo devuelto por `builder.addNode(...)`.
`setHtmlAttr` marca el valor como una etiqueta de tipo HTML (equivalente a
`label=<...>` en texto DOT) para que el motor de diseño la mida como marcado.

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

Manejador opaco de una arista del grafo devuelto por `builder.addEdge(...)`.

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

Lo devuelve `createGraph(...)`. `addSubgraph` devuelve un constructor anidado
limitado a ese subgrafo; los nodos añadidos a través de él son también miembros
del grafo raíz. `.graph` es el punto de entrega a
`render`/`getLayout`/`getDrawOps`. Consulta
[Construir un grafo en código](/es/guide/build-a-graph).

## Instantánea de la geometría (`getLayout`)

::: tip Marco de coordenadas
Las coordenadas nativas de Graphviz tienen el eje y hacia arriba (origen abajo
a la izquierda). `getLayout` usa por defecto `yAxis: 'down'` (origen arriba a la
izquierda, convención de pantalla) e invierte cada coordenada y; pasa
`{ yAxis: 'up' }` para obtener las coordenadas nativas de Graphviz. Recorrido
completo: [Leer la geometría calculada](/es/guide/geometry).
:::

### `YAxis` / `GeometryOptions`

```ts
type YAxis = 'up' | 'down';
type GeometryOptions = { yAxis?: YAxis };
```

Opciones de `getLayout`. Por defecto `yAxis: 'down'`.

### `LayoutSnapshot`

```ts
interface LayoutSnapshot {
  bounds: BoundsGeometry;
  nodes: NodeGeometry[];
  edges: EdgeGeometry[];
  clusters: ClusterGeometry[];
}
```

Instantánea simple y serializable a JSON de la geometría calculada de un grafo,
devuelta por `getLayout(g, opts?)`. `clusters` enumera de forma recursiva todos
los subgrafos clúster (cada clúster anidado tiene su propia entrada); está
vacío en los grafos sin clústeres.

### `BoundsGeometry`

```ts
interface BoundsGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Cuadro delimitador global, en puntos. Con `yAxis: 'down'`, `x`/`y` se
normalizan a `(0, 0)`. Con `yAxis: 'up'`, `x`/`y` son la esquina inferior
izquierda sin procesar del cuadro delimitador del grafo.

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

Geometría por nodo. `x`/`y` son el centro del nodo. `width`/`height` están en
**puntos**: el modelo los guarda en pulgadas (`ND_width`/`ND_height`);
`getLayout` los multiplica por 72 antes de devolverlos.

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

Geometría por arista. `points` concatena, en orden, todos los puntos de control
bézier del spline enrutado (vacío si la arista no tiene spline enrutado).
`label` solo está presente cuando la arista lleva una etiqueta central.

`tailLabel` y `headLabel` son las posiciones de las etiquetas de puerto
`taillabel`/`headlabel`. Cada una está presente solo cuando el diseño la ha
colocado, la misma condición bajo la que `render()` emite su `<text>`; así, una
etiqueta de puerto que no se pudo colocar (una arista sin spline enrutado, por
ejemplo) se informa como ausente y no como una etiqueta en el origen.

`xlabel` es la posición de la etiqueta externa `xlabel`. A diferencia de
`label`, la elige la búsqueda de colocación por fuerzas de Graphviz entre
posiciones candidatas alrededor de la arista, por lo que no se puede deducir de
`label` ni del punto medio del spline. Tiene la misma condición de «solo si se
colocó»: una xlabel declarada que la búsqueda no pudo ubicar se informa como
ausente, igual que `render()` se niega a dibujarla.

`sp` y `ep` son los puntos de unión de la flecha en los extremos de cola
(tail) y cabeza (head). Cuando un extremo lleva flecha, el spline se acorta
para dejarle sitio y la flecha va desde el punto de control final hasta este
punto, de modo que quien dibuja sus propias puntas de flecha lee aquí la punta
en lugar de extrapolarla. Cada uno está presente solo cuando ese extremo tiene
realmente una flecha, así que una arista simple `digraph { a -> b }` informa de
`ep` y no de `sp`, y `arrowhead=none` no informa de ninguno.

Estos son los puntos de unión en el borde del nodo. El propio renderizador de
Graphviz desplaza hacia dentro, desde ellos, el polígono de flecha que dibuja,
en una cantidad que depende del grosor de línea (penwidth), de modo que `ep` es
el punto *hasta* el que dibujar una flecha, no una copia de la punta
renderizada.

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

Cuadro delimitador por clúster. `name` es el nombre del subgrafo clúster (p. ej.
`cluster6`); los clústeres anidados codifican su jerarquía en el nombre, así
que no se expone ningún enlace explícito al padre. Sigue la misma convención de
marco que `BoundsGeometry`.

`label` es la colocación del título del clúster, presente solo cuando el clúster
declara uno. Su `x`/`y` son el **centro** del espacio de la etiqueta (igual que
`EdgeGeometry.label`, no la esquina de la caja `x`/`y` de arriba), y
`width`/`height` son el tamaño medido del texto, de modo que la caja de la
etiqueta es `[x - width/2, x + width/2] × [y - height/2, y + height/2]` y
siempre queda dentro de la caja del clúster. Ten en cuenta que este es el
*centro* de la etiqueta, mientras que el `<text>` que emite `render()` lleva la
línea base, que queda más abajo.

## Renderizado (`@knowvah/dot-engine/render`)

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

Unión cerrada de los formatos que acepta `render(g, format, opts?)`. Consulta
[Renderizar a otros formatos](/es/guide/render-formats).

### `RenderOptions`

```ts
interface RenderOptions {
  engine?: EngineName;
  inlineImages?: boolean;
}
```

Opciones de `render`. `engine` es `'dot'` por defecto. `inlineImages` (nuevo)
es `false` por defecto; cuando es `true`, el emisor SVG incrusta las imágenes
externas (`image=`/`<IMG>` de HTML) como URI `data:` consultando el resolutor
registrado con `setImageResolver`; si el resolutor no la resuelve o no hay
ninguno registrado, recurre al `src` tal cual. No tiene efecto sobre los
formatos que no son SVG. Consulta [Trabajar con imágenes](/es/guide/images).

::: warning `yAxis` no es un campo de `RenderOptions`
La orientación de las coordenadas es solo cosa de `getLayout`. Las cadenas de
formato en bruto que produce `render` llevan coordenadas nativas con el eje y
hacia arriba; invierte en el posprocesado si necesitas el eje y hacia abajo y no
pasas por `getLayout`.
:::

### `DrawOpsOptions`

```ts
interface DrawOpsOptions {
  engine?: EngineName;
}
```

Opciones de `getDrawOps`. `engine` es `'dot'` por defecto.

### `Xdot`

```ts
interface Xdot {
  ops: XdotOp[];
  flags: number;
}
```

Resultado analizado de un flujo de atributo xdot: el array de operaciones de
dibujo decodificado más una máscara de bits de indicadores de estado del
análisis. `getDrawOps` devuelve solo el `XdotOp[]` aplanado de todos los
atributos de dibujo del grafo, en orden de pintado (grafo → nodo → arista);
consulta [Renderizado propio con xdot](/es/guide/xdot-drawops) para ver la
tabla completa de tipos de operación y un ejemplo con canvas.

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

Una única operación de dibujo xdot decodificada, discriminada por `kind`. Cada
variante lleva una propiedad de carga con el nombre de su forma: estrecha por
`kind` en un `switch` para acceder a ella de forma segura. Las coordenadas
están en puntos, con el marco nativo de eje y hacia arriba (invierte para un
canvas con el eje y hacia abajo; consulta la guía enlazada arriba).

### `XdotColor`

```ts
type XdotColor =
  | { type: 'none'; clr: string }
  | { type: 'linear'; ling: XdotLinearGrad }
  | { type: 'radial'; ring: XdotRadialGrad };
```

Un color de relleno o trazo xdot resuelto: un color sólido o un degradado
lineal/radial (`XdotLinearGrad`/`XdotRadialGrad` llevan cada uno
`x0,y0,x1,y1[,r0,r1]` más un array
`stops: { frac: number; color: string }[]`).

## Paquete raíz (`@knowvah/dot-engine`)

### `EngineName`

```ts
type BuiltinEngine =
  | 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi' | 'osage' | 'patchwork';

type EngineName = BuiltinEngine | (string & {});
```

Un nombre de motor de diseño. El registro es abierto (se pueden registrar
motores personalizados en un `GvcContext`), así que se acepta cualquier cadena;
`(string & {})` conserva el autocompletado del editor para los integrados sin
cerrar el conjunto. Consulta [Motores de diseño](/es/guide/engines).

### `ImageSizer`

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;

function setImageSizer(sizer: ImageSizer | null): void;
```

Registra un callback que devuelve las dimensiones intrínsecas de una imagen
externa referenciada por `image=` o por una celda HTML `<IMG>`, para
dimensionar el diseño. Devuelve `null` cuando se desconoce el tamaño (coincide
con el comportamiento de imagen ausente de C: una celda de tamaño cero más una
advertencia). Pasa `null` a `setImageSizer` para borrar un medidor
establecido previamente. Consulta [Uso en el navegador](/es/guide/browser).

### `ImageResolver`

```ts
type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;

function setImageResolver(fn: ImageResolver | null): void;
```

Registra un callback que devuelve los bytes en bruto de una imagen externa, que
se consulta cuando `RenderOptions.inlineImages` es `true`. Un `Uint8Array` sin
más deduce su tipo MIME de la extensión de archivo de `src`. `null` (del
resolutor, o sin resolutor registrado) recurre al `src` tal cual. Consulta
[Trabajar con imágenes](/es/guide/images).

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

Medición de texto enchufable, instalada mediante `setTextMeasurer` (se incluyen
tres integrados: `EstimateTextMeasurer`, `LutTextMeasurer`,
`CanvasTextMeasurer`). `yoffsetCenterline`/`yoffsetLayout` son métricas
verticales opcionales (línea base→línea central, línea base→ascendente);
omítelas para recurrir a los valores predeterminados calibrados con pango.
Consulta [Medición de texto](/es/guide/text-measurement).

### `RenderResult` y errores

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

`tryRenderSvg(dotSource, engine)` es la contraparte con estilo de resultado de
`renderSvg`: devuelve `{ svg }` si tiene éxito o `{ errors: [one] }` con el
primer fallo en lugar de lanzar. Devuelve para cualquier entrada DOT y solo
lanza ante argumentos no válidos. Las entradas de `errors` son datos simples,
sin `cause` ni traza de pila.

Todo error de dot-engine que se lanza extiende la clase abstracta
`DotEngineError` e implementa `GvError`:

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

`renderSvg` lanza `ParseError` ante un código DOT no válido, `RenderError` ante
fallos de las etapas de diseño o renderizado e `InternalError` ante un error de
dot-engine. Los errores de quien llama lanzan un `TypeError` / `RangeError` /
`Error` estándar cuyo `code` es un `UsageErrorCode` (`'ERR_INVALID_ARG_TYPE' |
'ERR_INVALID_ARG_VALUE' | 'ERR_OUT_OF_RANGE' | 'ERR_INVALID_STATE'`); esos no
son `GvError`. Quien quiera errores estructurados sin `try`/`catch` debería
usar `tryRenderSvg`. Consulta [Errores y excepciones](/es/guide/errors) para ver
cada código.

## Relaciones

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

## Qué tipo viene de qué llamada

| Llamada | Devuelve |
|---|---|
| `createGraph(opts?)` | `GvGraphBuilder` |
| `builder.addNode(name, attrs?)` | `GvNode` |
| `builder.addEdge(tail, head, attrs?)` | `GvEdge` |
| `builder.addSubgraph(name, attrs?)` | `GvGraphBuilder` (anidado) |
| `parse(dotSource)` | `Graph` |
| `render(g, format, opts?)` | `string` |
| `getLayout(g, opts?)` | `LayoutSnapshot` |
| `getDrawOps(g, opts?)` | `XdotOp[]` |
| `renderSvg(dotSource, engine)` | `string` (lanza `DotEngineError` o un `TypeError` de uso) |
| `tryRenderSvg(dotSource, engine)` | `RenderResult` |

Para ver cada campo de cada tipo anterior, incluidos los que esta página
resume, consulta la [referencia de TypeDoc](/reference/) generada. Para el
análisis a fondo de los marcos de coordenadas (con ejemplos prácticos),
consulta [Leer la geometría calculada](/es/guide/geometry).
