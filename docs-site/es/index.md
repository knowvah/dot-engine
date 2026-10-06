---
sourceHash: 33fa90104a012c6ce9d15de21f32270498520e3d281601ddae71c0a48280eee4
layout: home
hero:
  name: "@knowvah/dot-engine"
  text: Graphviz, en TypeScript puro
  tagline: DOT entra, SVG sale — sin C. Sin binario nativo de Graphviz, sin WASM. TypeScript puro, se ejecuta en el navegador.
  actions:
    - theme: brand
      text: Primeros pasos
      link: /es/guide/getting-started
    - theme: alt
      text: Abrir la zona de pruebas
      link: /es/playground
    - theme: alt
      text: Ver en GitHub
      link: https://github.com/knowvah/dot-engine
features:
  - title: Fiel al Graphviz en C
    details: Una adaptación línea a línea de la implementación canónica en C. El motor dot coincide con el binario nativo dentro de una tolerancia determinista estrecha (±0,01 en las coordenadas, contenido no numérico exactamente igual) en el corpus golden.
  - title: Nativo del navegador, sin dependencias en tiempo de ejecución
    details: Sin C — sin binario nativo de Graphviz, sin adaptación a WASM, sin servidor de renderizado. El propio motor de diseño es TypeScript — empaquétalo y publícalo.
  - title: Los ocho motores de diseño
    details: dot, neato, fdp, sfdp, circo, twopi, osage y patchwork — renderizados a SVG.
  - title: Diseño y geometría programáticos
    details: No solo renderiza — lee de vuelta las posiciones calculadas de los nodos, los splines de las aristas y los límites de los clústeres como una instantánea simple y serializable a JSON mediante getLayout(), sin necesidad de analizar -Tplain.
---

## Pruébalo

El editor de abajo ejecuta la biblioteca real, en tu navegador. Edita el DOT de
la izquierda; el SVG se actualiza en vivo.

<Playground height="360px" />

## Elige tu camino

¿Eres nuevo por aquí? Elige la puerta que se ajuste a lo que estás haciendo:

| Quiero… | Empieza aquí |
| --- | --- |
| Entender cómo encajan las piezas | [Visión general — el modelo mental](/es/guide/overview) |
| Instalar y renderizar mi primer grafo | [Primeros pasos](/es/guide/getting-started) |
| Resolver una tarea concreta | [Recetario](/es/guide/recipes) |
| Consultar una función o un tipo | [Referencia de la API](/es/guide/api) · [Tipos](/es/guide/types) |
| Experimentar sin instalar nada | [Zona de pruebas](/es/playground) |

¿Vienes de otra herramienta? Consulta [Desde la CLI `dot` de C](/es/guide/migrate-from-c-cli)
o [Desde bibliotecas JS de Graphviz](/es/guide/migrate-from-js-libs).

Para firmas exhaustivas generadas automáticamente, consulta la
[referencia de la API generada](/reference/). ¿Quieres incrustar grafos renderizados en una página?
Lee [Trabajar con imágenes](/es/guide/images) para la inserción de imágenes en línea y las pautas de CSP.
