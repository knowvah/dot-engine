---
sourceHash: f2d27a0dea4a09fb6e47ae89ce6cf6d748d7547124a24e8c36d6237d9bad9954
---
# Medición de texto

El diseño de dot necesita el ancho y el alto de cada etiqueta para dimensionar los nodos y colocar
las aristas. @knowvah/dot-engine mide el texto a través de un único punto de extensión conectable, el
`TextMeasurer`, y resuelve automáticamente cuál usar — o puedes establecer el
tuyo.

## El contrato

Hay dos objetivos distintos, y cada uno pide un medidor diferente:

| Objetivo | Medidor | ¿Determinista? | Kerning / modelado de glifos |
|------|----------|----------------|-------------------|
| **Diseño reproducible** (la misma salida en todas partes) | modelo de métricas integrado | sí | no |
| **Diseño fiel al anfitrión** (coincide con la fuente de renderizado) | el canvas de la plataforma | no (depende de la fuente) | sí |

El propio graphviz nativo es fiel al anfitrión: su salida depende de las fuentes
instaladas en la máquina que lo ejecuta. @knowvah/dot-engine te deja elegir: determinista
por defecto, fiel al anfitrión cuando lo activas.

## Resolución automática

Cuando no estableces un medidor, @knowvah/dot-engine elige uno en cada renderizado:

1. un medidor explícito establecido mediante `setTextMeasurer` (gana si existe);
2. **navegador** (`document` disponible) → el `<canvas>` de la página — fiel al anfitrión,
   mide con la misma fuente con la que el navegador renderizará el texto del SVG;
3. **Node** → el modelo de métricas determinista integrado.

La biblioteca tiene **cero dependencias en tiempo de ejecución** y nunca importa una biblioteca de fuentes ni
`canvas` por sí misma, así que el paquete para el navegador sigue siendo pequeño y el valor por defecto de Node nunca
lee el sistema de archivos.

## Medición fiel al anfitrión en Node

Para una salida en Node cuyos recuadros se ajusten a una fuente concreta (kerning y modelado de glifos reales),
instala la dependencia par opcional `canvas` y conéctala una vez al arrancar:

```ts
import { setTextMeasurer, CanvasTextMeasurer, renderSvg } from '@knowvah/dot-engine';
import { createCanvas } from 'canvas'; // optional peer dependency: `npm i canvas`

setTextMeasurer(new CanvasTextMeasurer(createCanvas(0, 0).getContext('2d')));

const svg = renderSvg('digraph { A -> B }', 'dot');
```

`canvas` se declara como **dependencia par opcional**: no se instala
a menos que lo pidas. Cuando Node recurre al modelo integrado en una terminal
interactiva, @knowvah/dot-engine imprime este aviso una sola vez; silénciala con
`GV_FONT_QUIET=1`.

## Medidores personalizados

`setTextMeasurer` acepta cualquier cosa que implemente `TextMeasurer`:

```ts
import { setTextMeasurer, type TextMeasurer } from '@knowvah/dot-engine';

const myMeasurer: TextMeasurer = {
  measure: (text, fontname, fontsize) => ({ w: text.length * fontsize * 0.6, h: fontsize }),
};
setTextMeasurer(myMeasurer);
setTextMeasurer(undefined); // restore automatic resolution
```

Las implementaciones integradas se exportan para reutilizarlas: `CanvasTextMeasurer` (envuelve cualquier
contexto 2D), `EstimateTextMeasurer` (la referencia determinista, sin hinting, que
coincide con la `estimate_textspan_size` de graphviz sin interfaz gráfica — **este es el valor por defecto
de Node**) y `LutTextMeasurer` (una tabla de consulta con hinting por familia de fuente,
disponible como opción para un dimensionado más fiel sin depender de un `canvas` nativo).

## Por qué esta separación

El kerning, las ligaduras y los anchos de los glifos no ASCII dependen de las tablas de modelado
de la fuente real: una tabla de anchos por carácter no puede representarlos, y los valores correctos
difieren según la fuente (una fuente monoespaciada renderiza `<=` como dos celdas; una fuente proporcional
aplica kerning a `VA` y lo acerca). Por eso el diseño reproducible usa un modelo de métricas fijo;
coincidir con una fuente de renderizado real exige medir con esa fuente, que es lo que hace
el medidor respaldado por canvas.
