---
sourceHash: 545227fb3a0a91494ed7a2c299e5a9ca93a594d68d99e0596f743e7597dfbae9
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Errores y excepciones

dot-engine lanza dos tipos de error. El tipo que captures te indica quién debe
cambiar algo.

## Dos familias, una regla

| Familia | Cómo reconocerla | Significado | Quién actúa |
|--------|---------------------|---------|----------|
| Fallo de dot-engine | `err instanceof DotEngineError` | dot-engine ha fallado con esta entrada: DOT incorrecto, un error fatal que el propio Graphviz también notificaría, una función de Graphviz no admitida o un error de dot-engine | Quien escribe el DOT, o un informe de error |
| Error de uso | `TypeError` / `RangeError` / `Error` estándar con un `err.code` que empieza por `ERR_` | La llamada era incorrecta: tipo de argumento erróneo, nombre de motor o formato desconocido, orden de llamadas equivocado | El código que llama |

Bifurca según `.code`, no según el texto del mensaje. Los mensajes pueden
cambiar entre versiones; los códigos son estables.

Los errores de uso no son `DotEngineError` y no implementan `GvError`. Su
`name` sigue siendo `TypeError`, `RangeError` o `Error`, como en Node.js.

## Referencia de clases

Las cuatro clases siguientes extienden `DotEngineError` e implementan la forma
`GvError` (`type`, `code`, `message`, `friendlyMessage` y, opcionalmente,
`location` y `expected`).

### `DotEngineError` (abstracta)

La base común. `instanceof DotEngineError` es verdadero para todos los errores
que dot-engine genera sobre su entrada. No se puede construir directamente.
`type`, `code` y `friendlyMessage` los definen las subclases.

### `ParseError`

| Elemento | Valor |
|------|-------|
| Se lanza cuando | El código DOT no es válido, o usa el operador de arista equivocado para el tipo de grafo |
| `type` | `syntax` |
| Códigos | `SYNTAX_ERROR`, `SYNTAX_UNEXPECTED_EOF`, `EDGE_OP_DIRECTED_IN_UNDIRECTED`, `EDGE_OP_UNDIRECTED_IN_DIRECTED`, `GENERIC_ERROR` |
| Campos | `location` (`{ line, column, offset? }`), `expected` (expectativas del analizador; solo `SYNTAX_*`), accesores `line` y `column` |
| Acción de quien llama | Corregir el código DOT. Mostrar `location` y `friendlyMessage` a quien lo escribe |

`GENERIC_ERROR` en un `ParseError` significa que el código está tan anidado que
el analizador se quedó sin pila.

### `HtmlParseError`

| Elemento | Valor |
|------|-------|
| Se lanza cuando | Hoy nunca llega a quien llama (véase más abajo) |
| `type` | `semantic` |
| Códigos | `HTML_PARSE_ERROR` |
| Campos | `tag` (el token problemático). Sin `location` ni `expected` |
| Acción de quien llama | Ninguna. Para encontrar una etiqueta incorrecta, compara la salida renderizada con lo que esperabas |

El analizador de etiquetas de tipo HTML lanza `HtmlParseError` ante un elemento
desconocido, un atributo mal formado o un `<TABLE>`, `<HR>` o `<VR>` mal
colocado. La etapa de diseño lo captura y deja la etiqueta sin contenido, como
hace Graphviz: el grafo se renderiza igualmente, con una etiqueta vacía.
Ninguna función pública lo propaga.

`HtmlParseError` no se exporta desde la raíz del paquete. Si alguna vez te
llega uno, `err instanceof DotEngineError && err.code === 'HTML_PARSE_ERROR'`
lo identifica.

### `RenderError`

| Elemento | Valor |
|------|-------|
| Se lanza cuando | El diseño o el renderizado fallan de un modo que el propio Graphviz también notificaría, el grafo nombra un motor de diseño no disponible, o el grafo usa una función de Graphviz que dot-engine no ha portado |
| `type` | `render` para `RENDER_ERROR`; `semantic` para `UNKNOWN_LAYOUT` y `UNSUPPORTED_FEATURE` |
| Códigos | `RENDER_ERROR`, `UNKNOWN_LAYOUT`, `UNSUPPORTED_FEATURE` |
| Campos | `cause` cuando el fallo envolvió otro error. Sin `location` |
| Acción de quien llama | `RENDER_ERROR`: cambiar el grafo. `UNKNOWN_LAYOUT`: corregir el atributo `layout=`. `UNSUPPORTED_FEATURE`: evitar la función (por ejemplo, sfdp con `rotation=45`; consulta la [tabla](#referencia-unsupported-feature)) |

### `InternalError`

| Elemento | Valor |
|------|-------|
| Se lanza cuando | Falla una aserción o invariante dentro de dot-engine, o un error ajeno a dot-engine escapa de la canalización de diseño o renderizado |
| `type` | `render` |
| Códigos | `INTERNAL_ERROR` |
| Campos | `cause` (el error original, cuando se envolvió uno) |
| Acción de quien llama | Informar de un error con el código DOT que lo provocó |

Nada de lo que pueda cambiar quien escribe el DOT evitará de forma fiable un
`InternalError`.

## Referencia de códigos

### `GvErrorCode`

| Código | Clase | `type` | Significado | Causa típica | Acción de quien llama | Lo lanzan |
|------|-------|--------|---------|---------------|---------------|-----------|
| `SYNTAX_ERROR` | `ParseError` | `syntax` | Token inesperado | Errata, falta un `;` o un `}` | Corregir el DOT en `location` | `parse`, `renderSvg` |
| `SYNTAX_UNEXPECTED_EOF` | `ParseError` | `syntax` | El código terminó a mitad de una sentencia | `{`, `[` o cadena sin cerrar | Corregir el DOT en `location` | `parse`, `renderSvg` |
| `EDGE_OP_DIRECTED_IN_UNDIRECTED` | `ParseError` | `syntax` | `->` en un grafo no dirigido | `graph { a -> b }` | Usar `--` | `parse`, `renderSvg` |
| `EDGE_OP_UNDIRECTED_IN_DIRECTED` | `ParseError` | `syntax` | `--` en un digrafo | `digraph { a -- b }` | Usar `->` | `parse`, `renderSvg` |
| `GENERIC_ERROR` | `ParseError` | `syntax` | Código demasiado anidado para analizarlo | Subgrafos anidados de forma patológica | Aplanar el DOT | `parse`, `renderSvg` |
| `HTML_PARSE_ERROR` | `HtmlParseError` | `semantic` | Etiqueta de tipo HTML mal formada | Elemento desconocido, atributo incorrecto | Ninguna: la etiqueta se renderiza vacía | Ninguna (se captura internamente) |
| `RENDER_ERROR` | `RenderError` | `render` | Un error fatal de diseño o renderizado que Graphviz también notificaría | Entrada mal formada para una etapa de diseño | Cambiar el grafo | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNKNOWN_LAYOUT` | `RenderError` | `semantic` | El atributo `layout=` del grafo nombra un motor no registrado | `layout="foo"` | Corregir el atributo | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNSUPPORTED_FEATURE` | `RenderError` | `semantic` | El grafo pide una función de Graphviz que dot-engine no ha portado | sfdp con `rotation=45` | Evitar la función | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `INTERNAL_ERROR` | `InternalError` | `render` | Error de dot-engine | Aserción fallida, excepción ajena | Informar de un error | `renderSvg`, `render`, `getDrawOps`, métodos del constructor, `GvcContext.layout` (sin envolver) |

### `UsageErrorCode`

| Código | Clase | Significado | Causa típica | Acción de quien llama | Lo lanzan |
|------|-------|---------|---------------|---------------|-----------|
| `ERR_INVALID_ARG_TYPE` | `TypeError` | Tipo erróneo, `null` o falta un argumento obligatorio | `renderSvg(undefined, 'dot')`, `getLayout(null)` | Corregir la llamada | Toda función pública que recibe argumentos |
| `ERR_INVALID_ARG_VALUE` | `TypeError` | Tipo correcto, valor desconocido | Nombre de motor o formato no registrado; `getLayout(g, { yAxis: 'other' })` | Usar un nombre registrado o un valor permitido | `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps`, `getLayout`, `GvcContext.layout`, `freeLayout`, `bestRenderer`, `renderWithContext` |
| `ERR_OUT_OF_RANGE` | `RangeError` | Argumento numérico fuera de su rango | Reservado | Corregir la llamada | Hoy ninguna función pública lo lanza |
| `ERR_INVALID_STATE` | `Error` | Llamada hecha en el estado equivocado | `getLayout` antes del diseño | Calcular primero el diseño (`render(g, ...)` o `ctx.layout`) | `getLayout` |

Un argumento de motor no registrado se rechaza incluso cuando el código DOT
establece un atributo `layout=` válido. El argumento se comprueba primero.

## Referencia de `UNSUPPORTED_FEATURE` {#referencia-unsupported-feature}

Cada valor de atributo de abajo hace que el diseño lance un `RenderError` con
el código `UNSUPPORTED_FEATURE` allí donde el Graphviz nativo ejecutaría un
algoritmo que dot-engine no ha portado. La alternativa era renderizar un diseño
distinto del de Graphviz sin avisar. La comprobación se activa solo cuando se
cumple la condición de la columna «Se activa cuando»; el mismo atributo en otro
contexto se renderiza con normalidad. Para evitar el error, elimina el atributo
o cámbialo por un valor admitido.

| Motor | Atributo y valor | Se activa cuando | Función de Graphviz necesaria |
|--------|--------------------|------------|-------------------------|
| neato | `mode=hier` | Siempre (una vez que el grafo tiene 2 o más nodos y `maxiter` no es negativo) | Mayorización de estrés jerárquica (`stress_majorization_with_hierarchy`) |
| neato | `mode=ipsep` | Solo cuando Graphviz construiría restricciones: `diredgeconstraints` es verdadero o `hier*`, `overlap=ipsep`, o el grafo tiene un clúster de nivel superior. Sin restricciones se ejecuta como mayorización de estrés, como en Graphviz | Mayorización con restricciones (`stress_majorization_cola`) |
| neato | `start=self` | `mode` es `major` (el valor predeterminado) o `ipsep` | Inicialización inteligente (`smart_ini`). Con `mode=KK` o `mode=sgd` registra `start=0 not supported with mode=self - ignored` una vez por renderizado, como hace Graphviz |
| neato | `model=subset` | `mode` es `major` o `KK` | El modelo de distancia por subconjunto |
| neato | `model=circuit` | `mode` es `major`, o `KK` en un grafo conexo. `KK` en un grafo no conexo sin `pack` ni `packmode` registra una advertencia y usa caminos más cortos, como hace Graphviz | El modelo de distancia de circuito (`circuit_model`) |
| neato, twopi, circo, sfdp | `overlap=voronoi` (sin distinguir mayúsculas) | El grafo (para twopi, una componente; para sfdp, el grafo completo o una componente) tiene 2 o más nodos y el propio recuento de solapamientos de Graphviz (`countOverlap`, que comprueba los polígonos de los nodos) es mayor que 0. Los nodos que solo se tocan por su caja delimitadora no lo activan. circo solo llega a él con un grafo de una sola componente (con varias componentes Graphviz también ignora `overlap`). sfdp solo llega a él cuando `overlap` no es un modo prism | Eliminación de solapamientos de Voronoi (`vAdjust`) |
| fdp | `overlap=` uno de `voronoi`, `oscale`, `vpsc`, `ipsep`, `ortho`, `ortho_yx`, `orthoxy`, `orthoyx`, `portho`, `portho_yx`, `porthoxy`, `porthoyx` | El modo se alcanza tras los intentos de iteración de fuerzas `N:`, que es cuando esos intentos no eliminan todos los solapamientos (o `N` es 0 o está ausente). Se permite el prefijo `N:`, por ejemplo `3:voronoi` | El algoritmo de ajuste `removeOverlapWith` correspondiente |
| fdp | `splines=compound` | Siempre, con o sin clústeres | Enrutamiento de aristas que evita clústeres (`compoundEdges`) |
| sfdp | `smoothing=` cualquier valor salvo `none` o `0` | Siempre | `post_process_smoothing` |
| sfdp | `rotation=` cualquier número distinto de cero | Siempre | `rotate()` antes de eliminar solapamientos |
| sfdp | `label_scheme=1` a `4` | Existe un nodo llamado `|edgelabel|...`, `overlap` se resuelve al modo `prism` y, o bien el esquema es 3 o 4, o bien el esquema es 1 o 2 y los intentos prism son mayores que 0 (`overlap=prism` con un número, no el `prism0` predeterminado). Los valores superiores a 4 cuentan como 0. Las etiquetas de arista normales nunca lo activan | Gestión de nodos de etiqueta de arista (`edge_labeling_scheme`) |
| sfdp | `quadtree=none` (también `0`, `false`) | Cualquier grafo con al menos un nodo. El mensaje nombra el esquema resuelto | `spring_electrical_embedding_slow` |
| sfdp | `quadtree=fast` (también `2`) | Cualquier grafo con al menos un nodo. El mensaje nombra el esquema resuelto | `spring_electrical_embedding_fast` |
| todos los motores | Una forma de nodo dibujada por un caso especial de `round_corners` que no está portado | El nodo usa esa forma. Mensaje: `special shape N not yet ported` | La rama de dibujo de `round_corners` de esa forma. Es una protección interna frente a un número de forma sin caso de dibujo; no se conoce ninguna forma con nombre que llegue a ella |

La mayoría de los mensajes tienen la forma
`<attribute>=<value>: <what> is not supported yet`. Las excepciones son
`smoothing` y `rotation` (que nombran la rutina que falta), las filas de fdp y
la fila de la forma, que usan las redacciones indicadas arriba. Bifurca según
`err.code === 'UNSUPPORTED_FEATURE'`, no según el texto.

Los valores que seleccionan el predeterminado (por ejemplo `quadtree=normal`,
`true`, `yes`, `1`) y los valores aceptados por Graphviz que sí están portados
(por ejemplo `start=regular`, `start=random`, `model=mds`, `mode=KK`,
`mode=sgd`, `overlap=prism`, la familia `scale` y, en neato, twopi, circo y
sfdp, `overlap=oscale`, `vpsc` y los modos `ortho*` / `portho*`) se renderizan
con normalidad.

## Referencia por función

«Uso» significa `TypeError` con `ERR_INVALID_ARG_TYPE`, salvo que una fila
nombre otro código.

| Función | Puede lanzar |
|----------|-----------|
| `renderSvg(dotSource, engine)` | Uso (`dotSource` o `engine` no son una cadena); `TypeError` `ERR_INVALID_ARG_VALUE` (motor no registrado); `ParseError`; `RenderError`; `InternalError` |
| `tryRenderSvg(dotSource, engine)` | Uso (`dotSource` o `engine` no son una cadena); `TypeError` `ERR_INVALID_ARG_VALUE` (motor no registrado). Nada más: todo fallo de la entrada DOT se devuelve en `errors` |
| `parse(dotSource)` | `TypeError` `ERR_INVALID_ARG_TYPE` (`dotSource` no es una cadena); `ParseError` |
| `render(g, format, opts?)` | Uso (`g`, `format` u `opts` de tipo erróneo); `TypeError` `ERR_INVALID_ARG_VALUE` (motor o formato no registrado); `RenderError`; `InternalError` |
| `getDrawOps(g, opts?)` | Uso (`g` u `opts` de tipo erróneo); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.engine` no registrado); `RenderError`; `ParseError` (el xdot intermedio no se pudo volver a analizar: un error de dot-engine); `InternalError` |
| `createGraph(opts?)` y métodos del constructor (`addNode`, `addEdge`, `addSubgraph`, `setAttr`, ...) | Uso (tipos de argumento erróneos, incluidos valores de atributo que no son cadenas); `InternalError` (el modelo de grafo no pudo crear un nodo o subgrafo) |
| `addEdge(g, tail, head, name?)` (de `/api`) | Uso (`g`, `tail` o `head` que no son objetos; `name` que no es una cadena) |
| `getLayout(g, opts?)` | Uso (`g` u `opts` que no son un objeto); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.yAxis` distinto de `'up'` o `'down'`); `Error` `ERR_INVALID_STATE` (grafo sin diseño calculado) |
| `new GvcContext(measurer, options?)` | Uso (`measurer` no tiene una función `measure`; `options` no es un objeto) |
| `ctx.register(plugin)` | Uso (no es un complemento de renderizador ni un motor de diseño) |
| `ctx.layout(g, engine)` | Uso (`g` no es un objeto, `engine` no es una cadena); `TypeError` `ERR_INVALID_ARG_VALUE` (motor no registrado); `RenderError` `UNKNOWN_LAYOUT`. Los fallos del motor se propagan sin envolver |
| `ctx.freeLayout(g, engine)` | Uso; `TypeError` `ERR_INVALID_ARG_VALUE` (motor no registrado). Los fallos del motor se propagan sin envolver |
| `ctx.bestRenderer(format)` | Uso (`format` no es una cadena); `TypeError` `ERR_INVALID_ARG_VALUE` (no hay renderizador para `format`) |
| `renderWithContext(ctx, g, format, inlineImages?)` | Uso (`ctx` no es un `GvcContext`, `g` no es un objeto, `format` no es una cadena); `TypeError` `ERR_INVALID_ARG_VALUE` (no hay renderizador para `format`). Los fallos de renderizado se propagan sin envolver |
| `setImageSizer(sizer)` | Uso (no es una función ni `null`) |
| `setImageResolver(fn)` | Uso (no es una función ni `null`) |
| `setTextMeasurer(measurer)` | Uso (no es un `TextMeasurer` ni `undefined`) |

### Qué funciones envuelven las excepciones ajenas

| Funciones | Comportamiento ante una excepción inesperada (ajena a dot-engine) |
|-----------|---------------------------------------------------|
| `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps` | Se envuelve como `InternalError`; `cause` es el error original |
| `renderWithContext` y todos los métodos de `GvcContext` | **No se envuelve.** Un error del motor llega a quien llama tal como lo lanzó el motor, por ejemplo un `TypeError` simple sin `code` |

Si usas `GvcContext` directamente, trata un error que no sea ni un
`DotEngineError` ni un error de uso como un error de dot-engine.

## `tryRenderSvg` o `renderSvg`

| | `renderSvg` | `tryRenderSvg` |
|---|-------------|----------------|
| DOT incorrecto o fallo de diseño | Lanza un `DotEngineError` | Devuelve `{ errors: [one] }` |
| Argumentos incorrectos | Lanza un error de uso | Lanza un error de uso |
| Valor del error | Un `Error` con traza de pila y `cause` | Datos simples: `type`, `code`, `message`, `friendlyMessage` y, cuando existen, `location` / `expected` |
| Úsalo cuando | El fallo deba abortar a quien llama | Bifurcas según `code`, o envías el error a través de `postMessage` o a un registro |

`tryRenderSvg` nunca lanza para ninguna entrada DOT. Solo lanza cuando los
propios argumentos no son válidos, lo cual es un error en el código que llama.
Los objetos de error que devuelve no llevan `cause` ni traza de pila.

## Fallos envueltos y `cause`

Cuando `renderSvg`, `render` o `getDrawOps` capturan un error que dot-engine no
generó, lanzan un `InternalError` cuyo `cause` es el error original. El
`message` es el mensaje original.

`cause` no es enumerable, por lo que `JSON.stringify(err)` lo omite. Recorre la
cadena de forma explícita cuando registres (consulta el último ejemplo de
abajo).

## Comprobaciones entre paquetes

`instanceof DotEngineError` funciona dentro de una misma copia de la
biblioteca. Si se pueden cargar dos copias (paquetes duplicados, un host de
complementos), usa `isGvError(e)`. Comprueba que existan `type` y `code` de
tipo cadena y funciona entre copias. También acepta los objetos simples que
devuelve `tryRenderSvg`.

## Ejemplos

Separar las dos familias:

```ts
import { renderSvg, DotEngineError, ParseError } from '@knowvah/dot-engine';

function renderOrExplain(dot: string): string {
  try {
    return renderSvg(dot, 'dot');
  } catch (err: unknown) {
    if (err instanceof ParseError) {
      const { line, column } = err.location;
      return `DOT error at ${line}:${column}: ${err.friendlyMessage}`;
    }
    if (err instanceof DotEngineError) {
      return `${err.code}: ${err.friendlyMessage}`;
    }
    // A usage error: the call was wrong. Do not swallow it.
    throw err;
  }
}
```

Gestionar un resultado de `tryRenderSvg`:

```ts
import { tryRenderSvg } from '@knowvah/dot-engine';

const result = tryRenderSvg('digraph { a ->', 'dot');
if (result.svg !== undefined) {
  console.log(result.svg.length);
} else {
  const [first] = result.errors ?? [];
  console.error(first?.code, first?.location);
}
```

Registrar un `InternalError` con su causa:

```ts
import { InternalError } from '@knowvah/dot-engine';

function describeChain(err: unknown): string[] {
  const lines: string[] = [];
  let current: unknown = err;
  while (current instanceof Error) {
    lines.push(`${current.name}: ${current.message}`);
    current = current.cause;
  }
  return lines;
}

export function logFailure(err: unknown): void {
  if (err instanceof InternalError) {
    // Report this: it is a dot-engine bug. `cause` is the original error.
    console.error(describeChain(err).join(' <- '));
  }
}
```

## Véase también

- [Referencia de la API (seleccionada)](/es/guide/api) para la firma de cada función.
- [Tipos](/es/guide/types) para las formas `GvError` y `RenderResult`.
- [API generada (TypeDoc)](/reference/) para las uniones completas `GvErrorCode` y `UsageErrorCode`.
