---
sourceHash: 616f97a2fa8ffcabcf858e44e35372f1ed973566855990ca52be0169f39c9cb1
---
# Motores de diseño

Los ocho motores de diseño de Graphviz están registrados. Pasa el nombre del motor como
segundo argumento a `renderSvg`:

```ts
renderSvg(dot, 'neato');
```

| Motor de diseño | Estilo de diseño                              |
|--------------|-----------------------------------------------|
| `dot`        | Grafos dirigidos jerárquicos / por capas      |
| `neato`      | Modelo de muelles (Kamada–Kawai)              |
| `fdp`        | Dirigido por fuerzas                          |
| `sfdp`       | Dirigido por fuerzas multiescala (grafos grandes) |
| `circo`      | Circular                                      |
| `twopi`      | Radial                                        |
| `osage`      | Por clústeres                                 |
| `patchwork`  | Treemap cuadrado (squarified)                 |

## Nota sobre la fidelidad

Los motores se dividen en dos clases de conformidad (consulta [Conformidad](/es/conformance)
para la definición exacta y el código de comparación):

- **Deterministas** — `dot`, `circo`, `twopi`, `osage`, `patchwork`. Sujetos al
  mismo listón de **±0,01**: las coordenadas numéricas y los trazados coinciden con el
  binario nativo en C dentro de ±0,01pt, y todo el contenido no numérico (etiquetas, colores, texto) es
  exactamente igual en el corpus golden.
- **Iterativos** — `neato`, `fdp`, `sfdp`. Resolutores dirigidos por fuerzas/multiescala
  que dependen del orden de redondeo de la coma flotante, por lo que se comprueban con un
  límite más laxo de **±0,5**pt y por coincidencia estructural (el mismo árbol de elementos)
  en lugar de igualdad numérica estricta.

Ninguno de los dos listones supone afirmar que la salida SVG sea idéntica byte a byte. Para ver los
recuentos de aprobados actuales y las divergencias aceptadas por motor, consulta [Paridad](/parity) (con
páginas de detalle por motor) y [Divergencias conocidas](/es/divergences).

## Prueba distintos motores

Cambia el motor en el desplegable «Motor de diseño» para comparar diseños del mismo grafo:

<Playground
  height="380px"
  :initial="`graph {\n  a -- b; a -- c; a -- d;\n  b -- c; c -- d; d -- b;\n  b -- e; c -- f;\n}`"
  engine="neato"
/>
