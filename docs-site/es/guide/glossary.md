---
sourceHash: 66af4fa5a29e8468c7ecdd9bd541c9d7572b0a87dc81ab412cb63c543106fde8
---
# Glosario

Una definición por término, en orden alfabético según el término en inglés. Cada una enlaza con la
página de la guía (o el código fuente) que lo trata en profundidad.

## Clúster

Un subgrafo cuyo nombre empieza por `cluster` (p. ej. `subgraph cluster_build`) —
Graphviz lo renderiza como un recuadro propio que agrupa los nodos que lo componen. Internamente,
la instantánea de geometría de @knowvah/dot-engine reasigna a cada subgrafo clúster un
nombre posicional como `cluster6` (`ClusterGeometry.name`), no el nombre del código
fuente DOT, de modo que quien necesite el nombre original construye un mapa `idByName`
antes del diseño y reasigna después las claves de `snapshot.clusters`. Consulta
[Recetas](/es/guide/recipes) para el patrón de reasignación y
[Construir un grafo en código](/es/guide/build-a-graph) para crear clústeres mediante `addSubgraph`.

## Conformidad

La propiedad comprobada mecánicamente que respalda la afirmación de que un renderizado de @knowvah/dot-engine
«coincide» con el oráculo en C. Una vez analizados ambos SVG hasta obtener árboles de
elementos normalizados, todo valor numérico (coordenadas, datos de trazado, `points`) debe coincidir
dentro de una tolerancia fija — **±0,01pt** para los motores deterministas
(`dot`, `circo`, `twopi`, `osage`, `patchwork`) y **±0,5pt** para los
motores iterativos dirigidos por fuerzas (`neato`, `fdp`, `sfdp`) — y todo valor
no numérico (etiquetas, colores, texto) debe ser exactamente igual. No equivale a
afirmar que la salida SVG sea idéntica byte a byte. Consulta [Conformidad](/es/conformance).

## Sistema de coordenadas / eje y

El sistema de coordenadas nativo de Graphviz tiene el **eje y hacia arriba** y el origen en la esquina
inferior izquierda; los navegadores y las pantallas tienen el **eje y hacia abajo** y el origen en la esquina superior izquierda.
`getLayout` usa por defecto `yAxis: 'down'` (invierte cada y y normaliza
`bounds` a `(0, 0)`) y acepta `yAxis: 'up'` para devolver sin cambios las
coordenadas nativas de graphviz. Las operaciones de dibujo xdot (de `getDrawOps`) están siempre en el
sistema nativo con el eje y hacia arriba. Consulta [Leer la geometría calculada](/es/guide/geometry).

## Divergencia

Una diferencia entre un renderizado de @knowvah/dot-engine y el oráculo que se ha
investigado, de la que se ha hallado la causa raíz y que se ha catalogado —en lugar de
tolerarse en silencio—. Las divergencias catalogadas pertenecen a una de tres clases: deltas
aceptados (que deliberadamente no se hacen conformes, p. ej. el
no determinismo de la coma flotante entre plataformas), una cola larga registrada que aún se está cerrando y
objetivos explícitamente descartados. Una diferencia que no figura en la lista se trata como un defecto, no como
comportamiento aceptado. Consulta [Divergencias conocidas](/es/divergences).

## DOT

El lenguaje de descripción de grafos — `digraph { ... }` / `graph { ... }` con
sentencias de nodos, aristas y atributos — que @knowvah/dot-engine analiza antes de
pasar el resultado a un motor de diseño. Consulta [Primeros pasos](/es/guide/getting-started).

## Dimensionador / resolvedor de imágenes

Los dos puntos de extensión inyectables para imágenes externas (nodos usershape y celdas `<IMG>`
de las etiquetas HTML). Un `ImageSizer` informa del ancho/alto natural de una imagen para que
el dimensionado de los nodos y el diseño de las etiquetas puedan continuar sin cargar los datos de píxeles; un
`ImageResolver` proporciona los bytes reales de la imagen para incrustarla al renderizar.
Consulta [Imágenes](/es/guide/images).

## Motor de diseño

Uno de los ocho algoritmos de diseño que registra @knowvah/dot-engine, seleccionado por nombre
(`renderSvg(dot, engine)`): `dot` (jerárquico/por capas), `neato`
(modelo de muelles, Kamada–Kawai), `fdp` (dirigido por fuerzas), `sfdp` (dirigido
por fuerzas multiescala, para grafos grandes), `circo` (circular), `twopi` (radial),
`osage` (por clústeres) y `patchwork` (treemap cuadrado, «squarified»). Consulta
[Motores de diseño](/es/guide/engines).

## Oráculo

El binario nativo `dot` de Graphviz en C, compilado a partir del código fuente canónico en C, con el que se
valida cada renderizado de @knowvah/dot-engine. @knowvah/dot-engine lanza este
binario directamente (nunca una compilación a WASM) para evitar la deriva de ABI entre la
referencia y la adaptación. Consulta [Conformidad](/es/conformance) y
[Paridad](/parity) para saber cómo se ejecutan y se informan las comparaciones con el oráculo.

## Rango / rankdir

En el diseño jerárquico de `dot`, un **rango** (*rank*) es una capa de nodos situados a la
misma profundidad en el dibujo. `rankdir` fija la dirección en que fluyen los rangos — por
defecto `TB` (de arriba abajo), o bien `LR`, `BT`, `RL` — y se define como atributo del grafo
(`b.setAttr('rankdir', 'LR')`). Consulta [Construir un grafo en código](/es/guide/build-a-graph).

## Spline / enrutamiento de aristas

El trazado curvo (de Bézier) a lo largo del cual se dibuja una arista, calculado por un código de
enrutamiento que rodea los obstáculos de nodos y clústeres. @knowvah/dot-engine expone los
puntos de control enrutados como `EdgeGeometry.points` — una matriz ordenada de
puntos `{x, y}`, en puntos — desde `getLayout`. Consulta
[Leer la geometría calculada](/es/guide/geometry).

## Medidor de texto

El punto de extensión inyectable (`TextMeasurer`) que informa del ancho/alto de las etiquetas para que el dimensionado
de nodos y etiquetas de aristas pueda continuar antes del diseño. @knowvah/dot-engine resuelve uno
automáticamente en cada renderizado — primero un `setTextMeasurer` explícito, luego el
`<canvas>` del navegador si está disponible y, por último, el `EstimateTextMeasurer` determinista integrado
en Node — o acepta una implementación propia. Consulta
[Medición de texto](/es/guide/text-measurement).

## Usershape

El término de Graphviz para un nodo cuya forma es una imagen suministrada externamente
(mediante el atributo `image`) en lugar de un polígono o una elipse dibujados.
@knowvah/dot-engine resuelve las usershapes a través del punto de extensión inyectable de
dimensionador/resolvedor de imágenes en lugar de leer archivos directamente, lo que mantiene la biblioteca apta para el navegador.
Consulta [Imágenes](/es/guide/images).

## xdot

El formato extendido de operaciones de dibujo de DOT: un flujo estructurado de operaciones (fijar
color de relleno/trazo, fijar fuente, rellenar/trazar una elipse o un polígono, dibujar una
curva de Bézier, dibujar texto) que describe exactamente cómo debe pintarse un grafo renderizado,
en orden de pintado. `getDrawOps` devuelve este flujo como valores `XdotOp` tipados
para controlar un renderizador propio (canvas, WebGL, PDF) sin analizar
SVG. Consulta [Renderizado propio con operaciones de dibujo xdot](/es/guide/xdot-drawops).
