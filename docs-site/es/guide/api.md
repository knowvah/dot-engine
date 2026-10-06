---
sourceHash: e2e54229b04c577dfb514c415c7f02fd786b797b5bfc7a4bbf2e4192d03d0c09
---

# Referencia de la API

La superficie pública es intencionadamente pequeña. La mayoría de las llamadas
solo necesitan `renderSvg`. Consulta la [Visión general](/es/guide/overview)
para saber qué punto de entrada usar, [Tipos](/es/guide/types) para las formas
que consume y devuelve cada función, y la [Referencia](/reference/) generada
para ver las firmas exhaustivas, cada campo y cada sobrecarga.

> Las declaraciones de tipos (`.d.ts`) las emite `npm run build` (el paso
> `build:types` ejecuta `tsc -p tsconfig.build.json`). El mapa `exports` de
> `package.json` conecta las condiciones `types` de cada entrada, de modo que
> `@knowvah/dot-engine`, `@knowvah/dot-engine/api` y
> `@knowvah/dot-engine/render` resuelven los tipos en los editores y en las
> compilaciones posteriores.
>
> La compilación también emite mapas de declaraciones (`.d.ts.map`) y mapas de
> código fuente de JS, y el paquete distribuye sus fuentes `src/`, así que «ir a
> la definición» salta directamente al TypeScript real, lo que facilita leer el
> código y abrir una PR.

Esta página se organiza según los tres puntos de entrada (la
[Visión general](/es/guide/overview) explica cuándo recurrir a cada uno): el
paquete raíz `@knowvah/dot-engine` (analizar + renderizar en una sola llamada,
más la configuración global del proceso), `@knowvah/dot-engine/api` (construir
un grafo en código y leer la geometría calculada) y
`@knowvah/dot-engine/render` (salida en varios formatos y operaciones de dibujo
en bruto). Todas las funciones de abajo se reexportan también desde el paquete
raíz (`export * from './api/index.js'` / `export * from './render/index.js'` en
`src/index.ts`): importarlo todo desde `@knowvah/dot-engine` funciona, pero las
importaciones por subruta son más explícitas sobre qué capa estás tocando.

## `@knowvah/dot-engine` (raíz)

### `renderSvg`

```ts
function renderSvg(dotSource: string, engine: EngineName): string;
```

Analiza el código DOT, ejecuta el [motor de diseño](/es/guide/engines)
indicado, renderiza a SVG y devuelve la cadena SVG. Es la función de
conveniencia de una sola llamada: construye un `GvcContext`, registra los ocho
motores integrados y el renderizador SVG, calcula el diseño, renderiza y libera
el diseño; consulta [`GvcContext` / `renderWithContext`](#gvccontext-renderwithcontext)
más abajo si necesitas separar esos pasos.

- **`dotSource`**: código fuente del grafo en lenguaje DOT.
- **`engine`**: `EngineName`; uno de los integrados (`dot`, `neato`, `fdp`,
  `sfdp`, `circo`, `twopi`, `osage`, `patchwork`) o cualquier nombre registrado
  a medida.
- **Lanza** un `DotEngineError` ante cualquier problema con la entrada:
  `ParseError` si `dotSource` no es válido, `RenderError` si falla el diseño o
  el renderizado, `InternalError` (con `cause`) ante un error de dot-engine. Un
  `TypeError` con `code` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` si
  `dotSource` o `engine` no son válidos (incluido un nombre de motor que no está
  registrado). Consulta [Errores y excepciones](/es/guide/errors).

Firma completa, JSDoc y la lista de campos de `GvError`:
[Referencia](/reference/).

### `tryRenderSvg` / `RenderResult`

```ts
function tryRenderSvg(dotSource: string, engine: EngineName): RenderResult;
```

Hermana de `renderSvg` con estilo de resultado. Devuelve (nunca lanza) para
cualquier entrada DOT: `{ svg }` si tiene éxito o `{ errors: [one] }` con el
primer fallo; `svg` y `errors` son mutuamente excluyentes. Solo lanza ante
argumentos no válidos (`TypeError` `ERR_INVALID_ARG_TYPE` /
`ERR_INVALID_ARG_VALUE`). Cada entrada de `errors` son datos simples y
serializables a JSON (`type`, `code`, `message`, `friendlyMessage` y, cuando
existen, `location` / `expected`; sin `cause` ni traza de pila), por lo que es
seguro enviarla a través de un límite worker/postMessage o serializarla en un
registro. Prefiérela a `renderSvg` + `try`/`catch` cuando quien llama quiera
bifurcar según `code` / `type` en lugar de capturar una excepción. Consulta
[Errores y excepciones](/es/guide/errors). [Referencia](/reference/).

### `parse` / `ParseError`

```ts
function parse(dotSource: string): Graph;
```

Analiza DOT al modelo de grafo en memoria **sin** calcular su diseño. Resulta
útil para inspeccionar o transformar el grafo, o para pasárselo al `getLayout`
de `@knowvah/dot-engine/api` o al `render` de `@knowvah/dot-engine/render`,
antes de renderizar.

- **Lanza** `ParseError` por errores de sintaxis o violaciones de dirección de
  aristas (por ejemplo, `->` en un grafo no dirigido). `ParseError` extiende
  `DotEngineError` e implementa `GvError` con `type: 'syntax'`; lleva un
  `location: { line, column, offset? }`. `TypeError` `ERR_INVALID_ARG_TYPE` si
  `dotSource` no es una cadena. [Errores y excepciones](/es/guide/errors),
  [Referencia](/reference/).

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

`instanceof DotEngineError` significa que dot-engine ha fallado con esta
entrada. `RenderError` cubre los fallos conocidos de diseño o renderizado
(`type` es `semantic` para `UNKNOWN_LAYOUT` y `UNSUPPORTED_FEATURE`).
`InternalError` es un error de dot-engine; `cause` contiene el error original
cuando se envolvió uno. Los errores de quien llama lanzan en su lugar un
`TypeError` / `RangeError` / `Error` estándar con un `code`. `isGvError`
comprueba que existan `type` y `code` de tipo cadena, por lo que funciona entre
paquetes duplicados. Consulta [Errores y excepciones](/es/guide/errors) para ver
cada código y qué puede lanzar cada función, [Tipos](/es/guide/types) para la
forma de `GvError` y la [Referencia](/reference/) para la lista de miembros de
`GvErrorCode`.

### `setTextMeasurer` / `getTextMeasurer`

```ts
function setTextMeasurer(measurer: TextMeasurer | null): void;
function getTextMeasurer(): TextMeasurer;
```

Registra (o borra, con `null`) el medidor de texto global del proceso que se
consulta durante el diseño para dimensionar las etiquetas. Borrarlo vuelve al
valor predeterminado de la biblioteca (navegador: `CanvasTextMeasurer`;
sin interfaz/Node: `EstimateTextMeasurer`, salvo que haya un medidor LUT
conectado; consulta [Medición de texto](/es/guide/text-measurement) para ver el
orden de resolución completo y las implementaciones `CanvasTextMeasurer` /
`EstimateTextMeasurer` / `LutTextMeasurer` exportadas junto a estas funciones).
[Referencia](/reference/).

### `setImageSizer` / `setImageResolver`

Dos puntos de extensión de configuración de imágenes relacionados pero
distintos; ambos son registros globales del proceso que siguen el mismo patrón
(registrar un callback, pasar `null` para borrarlo) y ambos no hacen nada hasta
que quien llama registra uno:

- **`setImageSizer`**: informa de las *dimensiones intrínsecas* de una imagen
  externa para que el motor de diseño pueda reservar espacio para una celda
  HTML `<IMG>` o un atributo `image=` de un nodo antes de renderizar. Devolver
  `null` (o no tener ningún medidor registrado) reproduce el comportamiento de
  imagen ausente del Graphviz nativo: una advertencia y tamaño cero.
- **`setImageResolver`** (nuevo; consulta [`inlineImages`](#inlineimages) más
  abajo): proporciona los *bytes* reales de la imagen para que el renderizador
  SVG pueda incrustarlos como URI `data:` en lugar de emitir `xlink:href="src"`
  tal cual.

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;
function setImageSizer(sizer: ImageSizer | null): void;

type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;
function setImageResolver(fn: ImageResolver | null): void;
```

`ImageResolver` puede devolver un `Uint8Array` sin más (el MIME se deduce de la
extensión de archivo de `src`: `.png`, `.jpg`/`.jpeg`, `.gif`, `.svg`, `.webp`;
cualquier otra cosa recurre a `application/octet-stream`) o `{ bytes, mime }`
para fijar el tipo MIME explícitamente. Devuelve `null` cuando `src` no se
pueda resolver: el renderizador recurre al `src` tal cual, igual que si no
hubiera ningún resolutor registrado. Registrar un resolutor no tiene efecto por
sí solo; solo se consulta cuando la opción `inlineImages` de `render` es `true`
(abajo). Consulta [Trabajar con imágenes](/es/guide/images) para ver un ejemplo
práctico y la [Referencia](/reference/) para ambos tipos de callback.

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

`renderSvgAsync` es la contraparte asíncrona de `renderSvg`: precarga las
fuentes web y los datos de imagen que necesita el grafo y luego calcula el
diseño y renderiza. `renderSvgInto` renderiza y reemplaza los hijos del
elemento con id `id`, sanitizando el SVG de forma predeterminada
(`trusted: true` omite la sanitización; `sanitize` sustituye el depurador
integrado). Los fallos, incluidos los argumentos incorrectos, son rechazos de
la promesa con las mismas clases de error que `renderSvg`; un id de elemento
inexistente se rechaza con `ERR_INVALID_ARG_VALUE`. Los problemas de fuentes
nunca rechazan; se devuelven en `fontIssues`. Consulta
[Uso en el navegador](/es/guide/browser) y
[Trabajar con imágenes](/es/guide/images), y la [Referencia](/reference/).

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

Orquestación de nivel inferior para quien necesita controlar el diseño y el
renderizado como pasos separados. `renderSvg` es una función de conveniencia
sobre exactamente esto: construir un contexto, registrar motores y
renderizadores, `layout`, `renderWithContext`, `freeLayout`. Recurre
directamente a estas funciones solo cuando necesites ese control; por ejemplo,
para registrar un subconjunto de motores, añadir un `LayoutEngine` o un
`RendererPlugin` personalizado, o renderizar el mismo grafo ya diseñado a
varios formatos sin volver a ejecutar el diseño (llama a `layout` una vez, luego
a `renderWithContext` para cada formato y después a `freeLayout`).
[Referencia](/reference/).

## `@knowvah/dot-engine/api`

Construcción programática, inserción segura de aristas y lectura de la
geometría calculada: la capa para construir un grafo sin escribir texto DOT a
mano y leer su diseño como datos simples. Consulta [Tipos](/es/guide/types)
para `LayoutSnapshot` y sus formas anidadas.

### `createGraph`

```ts
function createGraph(opts?: {
  directed?: boolean;
  strict?:   boolean;
  name?:     string;
}): GvGraphBuilder;
```

Crea un grafo nuevo listo para pasárselo a `render` / `getLayout` /
`getDrawOps`. Valores predeterminados: `directed: true`, `strict: false`,
`name: ''`. Devuelve un `GvGraphBuilder`: `addNode`, `addEdge`, `addSubgraph`,
`setAttr`/`getAttr`, `setHtmlAttr` (para etiquetas de tabla HTML) y una
propiedad `.graph` que expone el manejador opaco `Graph`. Consulta
[Construir un grafo en código](/es/guide/build-a-graph) y la
[Referencia](/reference/) para ver las interfaces completas de
`GvGraphBuilder`/`GvNode`/`GvEdge`.

### `addEdge`

```ts
function addEdge(g: Graph, tail: Node, head: Node, name?: string): Edge;
```

Función auxiliar de nivel inferior para insertar aristas en la que se apoya
`GvGraphBuilder.addEdge`; se exporta directamente para quien trabaja con las
referencias internas `Node`/`Edge` (por ejemplo, aristas añadidas a un grafo
devuelto por `parse()`) en lugar de los manejadores opacos `GvNode`/`GvEdge` del
constructor. La mayoría debería usar en su lugar
`createGraph(...).addEdge(tail, head, attrs?)`.

- **`name`**: clave de la arista; por defecto `''` (anónima). Se ignora en la
  deduplicación de grafos estrictos, que compara solo `(tail, head)` (simétrica
  en los grafos no dirigidos).
- **Devuelve** la nueva arista, o la existente si `g` es estricto y ya existe
  una arista `(tail, head)` (refleja `agedge` con `cflag=1`).

Consulta [Construir un grafo en código](/es/guide/build-a-graph) y la
[Referencia](/reference/).

### `getLayout`

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

Devuelve una instantánea simple y serializable a JSON de la geometría calculada
del grafo (posiciones de nodos, puntos de control de los splines de las
aristas, etiquetas de aristas, cuadros delimitadores de clústeres y los límites
globales del grafo), todo en puntos.

- **`g`**: debe tener ya el diseño calculado (mediante `render(g, ...)`,
  `getDrawOps(g)` o `ctx.layout(g, engine)`); llamar a `getLayout` sobre un
  grafo sin diseño calculado lanza una excepción en lugar de devolver en
  silencio geometría toda a cero.
- **`opts.yAxis`**: por defecto `'down'`: coordenadas de pantalla, origen
  arriba a la izquierda, la y crece hacia abajo y `bounds` se normaliza a
  `(0, 0)`. `'up'` devuelve las coordenadas nativas de Graphviz (origen abajo a
  la izquierda, la y crece hacia arriba) con `bounds.x`/`bounds.y` en la esquina
  inferior izquierda sin procesar.
- **Lanza** `Error` con `code` `ERR_INVALID_STATE` si `g` no tiene el diseño
  calculado; `TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` para
  un `g` u `opts` incorrectos. Consulta [Errores y excepciones](/es/guide/errors).

`width`/`height` de los nodos se convierten a puntos (el modelo interno guarda
pulgadas); el resto de las coordenadas ya está en puntos. Consulta
[Leer la geometría calculada](/es/guide/geometry) para ver la explicación del
sistema de coordenadas y [Tipos](/es/guide/types) / [Referencia](/reference/)
para las listas completas de campos de `LayoutSnapshot`, `NodeGeometry`,
`EdgeGeometry`, `ClusterGeometry` y `BoundsGeometry`.

### `Graph`

Tipo de manejador opaco reexportado del modelo interno. Solo se expone el
*tipo* (no la clase mutable): anota con él una variable que contenga el
`.graph` de un constructor o el resultado de `parse()`, pero no construyas ni
inspecciones sus campos directamente; usa el constructor, `getLayout` o
`getDrawOps` para volver a leer el estado. [Referencia](/reference/).

## `@knowvah/dot-engine/render`

Salida en varios formatos y acceso a las operaciones de dibujo en bruto: la
capa para renderizar un grafo ya analizado con `parse` o construido con el
constructor.

### `render`

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  RenderOptions,
): string;
```

Calcula el diseño de un grafo y lo renderiza a la cadena del formato
solicitado.

- **`format`**: `OutputFormat`: `'svg' | 'dot' | 'xdot' | 'json' | 'plain' |
  'plain-ext' | 'imap' | 'cmapx'`.
- **`opts.engine`**: motor de diseño (por defecto `'dot'`).
- **`opts.inlineImages`**: consulta [más abajo](#inlineimages).
- **Lanza** `RenderError` ante un fallo de diseño o renderizado;
  `InternalError` ante un error de dot-engine; `TypeError` con un `code` ante
  argumentos no válidos (incluido un motor o formato no registrado). Consulta
  [Errores y excepciones](/es/guide/errors).

`opts.engine` refleja el parámetro `engine` de `renderSvg`; `format` es el eje
que `renderSvg` no expone (`renderSvg` está fijado a `'svg'`). Consulta
[Renderizar a otros formatos](/es/guide/render-formats) y la
[Referencia](/reference/) para ver la unión `OutputFormat` completa y la forma
de `RenderOptions`.

#### `inlineImages`

`RenderOptions.inlineImages` (por defecto `false`) incrusta las imágenes
externas como URI `data:` en lugar del `xlink:href="src"` tal cual. No tiene
efecto a menos que se haya registrado un resolutor con `setImageResolver`
(arriba), ni sobre los formatos que no son SVG. Sin establecer, la salida es
idéntica byte a byte a la anterior a la existencia de esta opción.

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

Consulta [Trabajar con imágenes](/es/guide/images) para ver la guía completa,
incluida la resolución desde `fetch` en el navegador y desde el sistema de
archivos en Node.

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

Contraparte asíncrona de `render`: mismos formatos y opciones
`engine`/`inlineImages`, más hooks de imagen asíncronos por llamada y
precarga de fuentes. Cada hook de imagen se ejecuta como máximo una vez por
cada `src` distinto; una excepción o un rechazo cuenta como un fallo. La salida
es marcado sin sanitizar para los formatos de marcado; consulta la sección
«Security» del README.

### `getDrawOps` / `DEFAULT_DRAW_ENGINE`

```ts
const DEFAULT_DRAW_ENGINE: EngineName; // 'dot'

function getDrawOps(g: Graph, opts?: { engine?: EngineName }): XdotOp[];
```

Calcula el diseño de `g`, renderiza a xdot y devuelve un array plano y tipado de
operaciones de dibujo (formas de nodo, tramos de texto, colores y fuentes como
valores de una unión discriminada; se estrechan por `op.kind` en un `switch`)
para alimentar un renderizador propio de canvas/WebGL/PDF sin tocar SVG ni la
codificación en cadena de xdot. `opts.engine` toma por defecto
`DEFAULT_DRAW_ENGINE` (`'dot'`).

- **Lanza** `ParseError` si la salida xdot intermedia no se puede volver a
  analizar (un error de dot-engine; no se espera en la práctica); `RenderError`
  ante un fallo de diseño o renderizado; `InternalError` ante cualquier otro
  error de dot-engine; `TypeError` con un `code` ante argumentos no válidos.
  Consulta [Errores y excepciones](/es/guide/errors).

Consulta [Renderizado propio con xdot](/es/guide/xdot-drawops) para ver la
lista de tipos de operación y un ejemplo práctico con canvas, y
[Tipos](/es/guide/types) / [Referencia](/reference/) para la unión `XdotOp`
completa y las formas `Xdot`/`XdotColor`.
