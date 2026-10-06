---
sourceHash: 96b80725180c7f6708fcc435c4ad98ed934b7e558b1db664f454212b152ed64d
---
# Uso en el navegador

@knowvah/dot-engine no usa APIs exclusivas de Node y se puede empaquetar sin riesgo para el navegador. Esta
página cubre las dos cosas que conviene saber al ejecutarlo en el cliente.

## Empaquetado

La biblioteca son módulos ES simples. Cualquier empaquetador moderno (Vite, esbuild, Rollup,
webpack) puede incluirla. No hay dependencias en tiempo de ejecución que externalizar ni
artefactos WASM que alojar.

```ts
import { renderSvg } from '@knowvah/dot-engine';

const svg = renderSvg('digraph { a -> b }', 'dot');
document.querySelector('#out')!.innerHTML = svg;
```

La [zona de pruebas](/es/playground) de este mismo sitio hace exactamente eso: importa el
motor y llama a `renderSvg` en el navegador, sin ida y vuelta a un servidor.

## Medición de texto

Graphviz necesita las dimensiones del texto para dimensionar las etiquetas. @knowvah/dot-engine se encarga de ello
automáticamente:

- **En el navegador** (cuando existe `document`), mide el texto con el
  contexto 2D nativo de `<canvas>` — fiel al anfitrión, ya que es la misma fuente con la que el
  navegador renderiza el SVG.
- **En Node**, usa por defecto el medidor integrado **Estimate** — un modelo
  determinista y seguro sin interfaz gráfica que refleja la propia
  `estimate_textspan_size` de Graphviz. No hace falta instalar `canvas` ni disponer de archivos de fuentes para
  obtener un diseño correcto en Node; también hay disponible, como opción, un medidor de tabla de consulta
  (LUT) con hinting para un dimensionado más fiel al anfitrión sin
  depender de un canvas nativo. Consulta [Medición de texto](/es/guide/text-measurement) para saber cómo
  seleccionar un medidor de forma explícita.

En ningún caso se necesitan archivos de fuentes para el diseño.

## Fuentes web: por qué importa precargarlas

Los tamaños de las etiquetas salen de medir texto con una fuente. Si un tipo de letra se declara con
`@font-face` pero aún no ha terminado de cargarse, el navegador mide con la fuente
**de reserva** y el diseño queda mal cuando llega la fuente real.
Medido en Chromium con JetBrains Mono: el recuadro de una etiqueta tenía **70,68 pt** de ancho cuando
se midió antes de cargar el tipo de letra (fuente de reserva) y **124,8 pt** después de cargarlo.

Los puntos de entrada asíncronos (`renderSvgAsync`, `renderAsync`, `renderSvgInto`) evitan
esto: recopilan las fuentes que pedirá el grafo, las cargan a través de
`document.fonts` y solo entonces ejecutan el diseño. `renderSvgAsync` produjo
los mismos 124,8 pt que medir después de la carga.

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg, fontIssues } = await renderSvgAsync(
  'digraph { node [fontname="JetBrains Mono"]; a -> b }',
  'dot',
  { fontTimeoutMs: 5000 },
);
```

- **`fontTimeoutMs`** (por defecto `3000`) es un único plazo compartido por todos los tipos de letra, no
  uno por cada tipo.
- **`fontIssues`** es una lista de `{ face, reason }`. `reason: 'failed'` significa que el
  tipo de letra dio error (por ejemplo un 404) o que su carga fue rechazada; `reason: 'timeout'`
  significa que no se había cargado dentro de `fontTimeoutMs`. En ambos casos el diseño continúa
  con una fuente de reserva. Cada incidencia también se muestra con `console.warn`. Los problemas de fuentes nunca
  rechazan la promesa.
- **Limitación:** solo se pueden notificar las familias declaradas con `@font-face`.
  Una fuente del sistema o un nombre de familia desconocido se resuelve como «cargado» (no hay nada
  que esperar), por lo que un `fontname` mal escrito nunca aparece en `fontIssues`.
- **Node y Workers** no tienen `document.fonts`, así que se omite la precarga de fuentes y
  `fontIssues` es `[]`. Los ganchos de imágenes siguen funcionando. Puedes pasar un `fontSet`
  (cualquier objeto con `load(font)`) para proporcionar el tuyo.

## Renderizar dentro de una página: `renderSvgInto`

```ts
import { renderSvgInto } from '@knowvah/dot-engine';

// <div id="graph"></div>
const { element, fontIssues } = await renderSvgInto('graph', dot, 'dot');
if (fontIssues.length > 0) {
  console.warn('fallback fonts used for', fontIssues.map((i) => i.face));
}
```

Sustituye los hijos del elemento con el id indicado por el `<svg>` renderizado
(devuelto como `element`), usando `DOMParser` e `importNode`, nunca
`innerHTML`. Un id inexistente rechaza con `ERR_INVALID_ARG_VALUE`. El SVG se
depura por defecto; pasa `sanitize` para usar tu propio depurador o `trusted: true`
para omitir la depuración. Consulta la sección «Security» del README para saber qué
elimina y qué conserva el depurador, y mantén una Content-Security-Policy activa.

## Imágenes externas: `setImageSizer`

Cuando una etiqueta de tipo HTML contiene una imagen externa
(`<IMG SRC="logo.png"/>`), Graphviz necesita las dimensiones intrínsecas de esa imagen para
dimensionar la celda. (El atributo `image=` de un nodo no se dimensiona: el nodo conserva su
recuadro normal, igual que en Graphviz nativo sin interfaz gráfica.) Como la biblioteca no puede
leer el sistema de archivos, tú proporcionas un dimensionador:

```ts
import { setImageSizer } from '@knowvah/dot-engine';

setImageSizer((src) => {
  // Return the intrinsic { w, h } for this image source, or null if unknown.
  return { w: 64, h: 64 };
});
```

Si tus grafos nunca hacen referencia a imágenes externas, no necesitas llamar a esto.
Para dimensionar imágenes de forma asíncrona (por ejemplo cargándolas), pasa en su lugar un
`imageSizer` asíncrono a `renderSvgAsync`; consulta [Imágenes](/es/guide/images).

## Web Workers

El diseño se ejecuta de forma síncrona, así que un grafo grande bloquea el hilo en el que se ejecuta. Ejecútalo
en un Worker para que la página siga respondiendo. Dentro de un Worker no hay
`document`, por lo que la biblioteca mide el texto con un `OffscreenCanvas` y la
API asíncrona carga las fuentes a través del propio conjunto de fuentes del Worker (`self.fonts`).

Las fuentes de un Worker son independientes de las de la página: regístralas en el Worker
con la API `FontFace` (las reglas CSS `@font-face` no llegan a los Workers).

```ts
// graph-worker.ts (module worker)
import { renderSvgAsync } from '@knowvah/dot-engine';

self.fonts.add(new FontFace('Inter', 'url(/fonts/Inter.woff2)'));

self.onmessage = async (e: MessageEvent<string>) => {
  const { svg, fontIssues } = await renderSvgAsync(e.data, 'dot');
  self.postMessage({ svg, fontIssues });
};
```

Renderiza con `renderSvgAsync` (o `renderAsync`) en un Worker, no con `renderSvg`,
al menos hasta que cada fuente web se haya cargado. Chromium sigue midiendo una cadena de fuente
con el tipo de letra de reserva si esa misma cadena se midió en el Worker antes de que
se cargara el tipo de letra, incluso después de que este se cargue; la API asíncrona carga las fuentes antes de
medir, así que nunca se topa con esto.

## Qué no esperar

La biblioteca apunta a **SVG** (además de los formatos de texto `json` / `xdot` / `dot` / mapa de imagen).
La salida ráster (PNG/JPG), PostScript/PDF y los backends interactivos/GUI
quedan fuera del alcance — convierte el SVG a posteriori si necesitas otro formato. Consulta
[Divergencias conocidas](/es/divergences) para ver el límite completo del alcance.

## Grafos grandes: prerrenderizar a SVG

Los grafos muy grandes — aproximadamente **más de 10 000 nodos o unos pocos MB de código fuente DOT** — no son
prácticos de diseñar en tiempo de ejecución en el navegador. El diseño (mincross, asignación de rangos,
enrutamiento de splines) es superlineal, así que este es un **techo de escala compartido con
el Graphviz original, no una limitación específica de este motor**: con esas entradas
el `dot` nativo, las compilaciones a WASM (`@hpcc-js/wasm-graphviz`) y este motor agotan igualmente
el tiempo o la memoria. (Este motor **no** pierde memoria: su montón por renderizado es
constante; el límite es estrictamente el tamaño del grafo. Consulta el
[panel de rendimiento](/perf) para ver la comparación medida.)

Para grafos de esa escala, **renderiza una vez en tiempo de compilación y sirve el
`.svg` resultante** en lugar de calcular el diseño en el navegador en cada visita — el mismo patrón
que usarías incluso con el `dot` nativo, ya que es demasiado lento para ejecutarlo en cada petición.

Los adaptadores de sitio en tiempo de compilación de
[knowvah/dot-plugins](https://github.com/knowvah/dot-plugins) (publicados en NPM)
hacen exactamente esto:

- `@knowvah/vitepress-plugin-dot` — VitePress (markdown-it), en tiempo de compilación
- `@knowvah/eleventy-plugin-dot` — Eleventy (markdown-it), en tiempo de compilación
- `@knowvah/docusaurus-plugin-dot` — Docusaurus (MDX/remark), en tiempo de compilación
- `@knowvah/dot-markdown-it` — integración de markdown-it independiente del framework

Para grafos dinámicos aportados por el usuario en los que renderizar en tiempo de compilación no es una opción,
limita el renderizado interactivo a grafos de tamaño razonable y almacena en caché el SVG emitido.
