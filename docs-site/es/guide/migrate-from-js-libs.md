---
sourceHash: 5733693facb69db8bab3b6997342fc5a9281465757bc64ca4fea3ebec54ebeeb
---

# Migrar desde otras bibliotecas JS de Graphviz

viz.js / `@viz-js/viz`, `@hpcc-js/wasm` (`@hpcc-js/wasm-graphviz`) y
`d3-graphviz` dan acceso a Graphviz desde JavaScript compilando el Graphviz real
en C a **WebAssembly** y llamándolo. @knowvah/dot-engine es un **port a
TypeScript** hecho desde cero: los motores de diseño, el analizador sintáctico
y el emisor SVG son código fuente TypeScript, no un binario compilado.

Esa diferencia es el titular, no una nota al pie:

| | Envoltorios WASM (viz.js / `@hpcc-js/wasm` / d3-graphviz) | @knowvah/dot-engine |
|---|---|---|
| Implementación | Graphviz real en C, compilado a un binario `.wasm` | Port puro a TypeScript, sin artefacto compilado |
| Inicialización del módulo | Asíncrona: hay que instanciar/esperar el módulo WASM antes del primer uso | Ninguna: haces `import` y llamas de forma síncrona |
| Paquete | Hay que distribuir un recurso `.wasm` (de cientos de KB a pocos MB) junto al JS | Solo JS, compatible con tree-shaking |
| Depuración | Recorrer paso a paso un blob WASM (o el código C, si lo tienes) | Recorrer paso a paso el TypeScript real con mapas de código fuente |
| Modelo de hilos | Algunas compilaciones ejecutan el diseño en un Web Worker | Se ejecuta en el hilo que llama, como cualquier función de TS |
| Formatos de salida | Los que tenga la compilación de C subyacente: normalmente el conjunto completo de Graphviz, incluidos ráster y PDF | SVG + los formatos de texto DOT/json/xdot/plain/imagemap; véase más abajo |

Si tu caso de uso es «llamar a una función, recibir SVG, sin ceremonia asíncrona
y sin ningún recurso WASM que alojar», para eso está @knowvah/dot-engine. Si tu
caso de uso depende de salida ráster o PDF, consulta
[Cuándo quedarse con WASM](#cuando-quedarse-con-wasm) más abajo.

## Diferencias de API

Las tres bibliotecas tienen formas distintas; la tabla siguiente muestra el
caso de migración más común (aproximado: verifícalo con la documentación de
cada biblioteca; consulta las citas bajo cada fila).

| Biblioteca | Llamada típica | Equivalente en @knowvah/dot-engine |
|---|---|---|
| `@viz-js/viz` (sucesor de viz.js) | `Viz.instance().then(viz => viz.renderSVGElement(dot))`: asíncrono, `Viz.instance()` resuelve una Promise | `renderSvg(dot, 'dot')`: síncrono, sin paso de instancia ni inicialización |
| viz.js 2.x (heredado, `new Viz()`) | `new Viz().renderString(dot)`: devuelve una `Promise<string>` | `renderSvg(dot, 'dot')`: síncrono |
| `@hpcc-js/wasm-graphviz` | `await Graphviz.load()` una vez y luego `graphviz.dot(dot)` (síncrono tras la carga) | `renderSvg(dot, engine)`: sin ningún paso de carga ni de calentamiento |
| `d3-graphviz` | `d3.select(sel).graphviz().renderDot(dot)`: vincula la salida al DOM y anima las transiciones | `renderSvg(dot, engine)` devuelve una **cadena** SVG; la insertas tú en el DOM (por ejemplo, `el.innerHTML = svg`) |

Toda llamada a @knowvah/dot-engine de la columna derecha es **síncrona**: no hay
ningún módulo que esperar, porque no hay ningún binario WASM que instanciar.
Elimina cualquier `await`/`.then()` que envuelva una llamada a
@knowvah/dot-engine; nunca hizo falta.

- La `Promise` de `Viz.instance()` de `@viz-js/viz` y el método
  `renderSVGElement()` están documentados en viz-js.com; confirmado con el
  ejemplo de uso publicado del proyecto en el momento de escribir esto.
- El `new Viz().renderString(dot)` de viz.js 2.x es la API documentada para esa
  línea de versiones (ya superada); si tienes una instalación actual,
  comprueba si en realidad estás en `@viz-js/viz`.
- El par `Graphviz.load()` / `graphviz.dot()` de `@hpcc-js/wasm-graphviz` está
  confirmado con el ejemplo de uso publicado del paquete en el momento de
  escribir esto. El paquete anterior y distinto `@hpcc-js/wasm` exponía además,
  en versiones pasadas, una llamada `graphviz.layout(dot, format, engine)`;
  consulta la documentación de la versión que tengas instalada antes de
  depender de la firma exacta.
- La cadena `.graphviz().renderDot(dot)` de `d3-graphviz`, y el hecho de que
  internamente se basa en `@hpcc-js/wasm`, está confirmada con el README
  publicado del proyecto en el momento de escribir esto.

### El enlace al DOM de `renderDot` queda fuera del alcance aquí

`d3-graphviz` hace más que renderizar SVG: vincula el resultado a una selección
de D3, calcula las diferencias entre renderizados sucesivos y anima las
transiciones entre diseños. @knowvah/dot-engine no tiene ninguna opinión sobre
el DOM: `renderSvg`/`render` devuelven una cadena simple. Si quieres
transiciones animadas entre dos diseños al estilo de d3-graphviz, esa lógica
tendrías que construirla sobre dos llamadas a `renderSvg` y tu propia
comparación del DOM (o seguir usando d3-graphviz para esa función concreta;
véase más abajo).

## Obtener datos de diseño sin analizar un formato de cadena

A las tres bibliotecas WASM se les pueden pedir los formatos JSON o de texto
plano propios de Graphviz, y luego tienes que analizar esa cadena tú mismo para
obtener las coordenadas de nodos y aristas. @knowvah/dot-engine se ahorra ese
rodeo por texto: llama a `getLayout(g)` (después de `render`) para obtener
directamente una instantánea tipada y serializable a JSON, sin ninguna cadena
`-Tjson`/`-Tplain` que analizar.

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

render(b.graph, 'svg');
const layout = getLayout(b.graph);
// layout.nodes  → [{ name: 'a', x, y, width, height }, ...]
// layout.edges  → [{ tail: 'a', head: 'b', points: [...] }]
// layout.bounds → { x, y, width, height }
```

Consulta [Leer la geometría calculada](/es/guide/geometry) para ver la forma
completa de la instantánea, las unidades y la opción `yAxis`.

## Cuándo quedarse con WASM

Sé sincero contigo mismo sobre el alcance: @knowvah/dot-engine cubre SVG más los
formatos de texto `dot`/`xdot`/`json`/`plain`/`plain-ext`/`imap`/`cmapx`.
**No** emite formatos ráster (PNG/JPEG/GIF/...) ni PostScript/PDF/EPS: es un
límite de alcance intencionado, no una carencia que simplemente esté sin
terminar. Consulta [Divergencias conocidas](/es/divergences) para ver la lista
exacta de lo que no es un objetivo.

Si tu aplicación necesita salida `-Tpng` o `-Tpdf` directamente del motor de
diseño, las bibliotecas basadas en WASM de arriba siguen cubriendo ese caso:
como ejecutan el Graphviz real en C, admiten los formatos de salida con los que
se compiló esa versión. En ese escenario, o bien sigues usando la biblioteca
WASM para ese único recorrido de código, o bien renderizas a `'svg'` con
@knowvah/dot-engine y conviertes el SVG a ráster/PDF después con una
herramienta aparte.

## Véase también

- [Motores de diseño](/es/guide/engines)
- [Renderizar a otros formatos](/es/guide/render-formats)
- [Leer la geometría calculada](/es/guide/geometry)
- [Divergencias conocidas](/es/divergences)
- [Primeros pasos](/es/guide/getting-started)
