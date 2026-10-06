---
sourceHash: 133104b64763457635328188088e909f4552d8353f4a7468655c540706263625
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# proc3d — la divergencia canónica A2 de métricas de fuente (histórica) {#proc3d-—-the-canonical-a2-font-metric-divergence-historical}

::: tip Estado: resuelto — proc3d ya es conforme
Desde el cambio a `EstimateTextMeasurer` (`239c51b`, 2026-06-25), tanto el port como el
oráculo en C sin interfaz gráfica miden el texto con el mismo modelo
`estimate_textspan_size`.
Volver a ejecutar la reproducción de más abajo contra el árbol actual devuelve **0 diferencias,
maxDelta 0** para `tests/graphs/proc3d.gv`: la diferencia documentada en esta página
ya no se reproduce. La clase A2 en su conjunto ha **colapsado** para las instancias de
proc3d del corpus; consulta [Divergencias conocidas §A2](/es/divergences#a2-text-measurement-font-metrics-label-driven-layout)
y [Paridad](/parity) para ver recuentos actuales, no congelados. Esta página se conserva
como el análisis histórico de la causa raíz: el mecanismo que se describe abajo es real e
instructivo, solo que ya no produce una diferencia observable en este grafo.
:::

`proc3d` (`graphs-proc3d` / `share-proc3d` / `windows-proc3d`) era el caso de manual de
[métricas de fuente A2](/es/divergences#a2-text-measurement-font-metrics-label-driven-layout):
una diferencia subpíxel en la medición del texto desplazaba las posiciones x de los nodos
unos pocos puntos y dejaba el grafo en **structural-match**. Esta página es el análisis
independiente al que remite la lista de divergencias y describe *por qué* ocurría, antes de
que se unificaran los medidores.

## Entrada {#input}

| | |
|---|---|
| **Motor** | `dot` |
| **Origen** | `tests/graphs/proc3d.gv` (del corpus de pruebas upstream de [Graphviz](https://gitlab.com/graphviz/graphviz/-/blob/main/tests/graphs/proc3d.gv)) — 443 líneas |
| **Atributos clave** | `fontname=Courier`, `orientation=land`, `size="10,7.5"`, `ranksep=1.0` |

## Por qué divergía (causa raíz, en su momento) {#why-it-diverged-root-cause-at-the-time}

El diseño de simplex de red en x era fiel; la única diferencia era que el medidor de
fuentes del port de aquella época daba a algunas **etiquetas anchas** una fracción de
punto más de anchura que la medición del oráculo nativo, basada en FreeType. Las etiquetas
más anchas de proc3d son los óvalos con rutas de archivo, p. ej.
`/home/ek/work/src/lefty/lefty.c`, la cadena exacta que
[`known-divergences.md` §A2](/es/divergences#a2-text-measurement-font-metrics-label-driven-layout) midió con **+0.75 pt (+0.43%)**. Una
etiqueta más ancha daba un nodo algo más ancho, cuya media anchura alimentaba las
restricciones de separación de izquierda a derecha redondeadas con `ROUND()`; el simplex
de red elegía entonces una asignación entera de x ligeramente distinta (igual de óptima).
El resultado era un desplazamiento en x casi uniforme de **≤ 3.55 pt** sobre un dibujo de
~2620 pt, con rango, orden, topología y coordenadas y idénticos. La solución no fue un
parche específico de proc3d: el cambio a `EstimateTextMeasurer` puso a ambos lados sobre el
mismo modelo de medición sin interfaz gráfica, lo que eliminó la sobremedición de las
etiquetas anchas que provocaba este desplazamiento.

## El delta — golden frente a ours, superpuestos {#the-delta-—-golden-vs-ours-overlaid}

Golden (**verde**) y ours (**rojo**) superpuestos en el mismo encuadre. A escala completa
se mezclan en marrón: el desplazamiento es imperceptible (de ahí
*structural-match*).

![Superposición golden frente a ours de proc3d, dibujo completo: verde = C, rojo = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Ampliado, el borde verde/rojo aparece **casi por completo en las largas etiquetas ovaladas
con rutas de archivo**, justo las cadenas anchas que el medidor sobremide. Los nodos de
código/caja siguen coincidiendo:

![Superposición de proc3d ampliada sobre los óvalos anchos con rutas: verde = C, rojo = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

## Dibujos completos — primero golden, después ours {#full-drawings-—-golden-first-ours-second}

| Golden — `dot` nativo | Ours — @knowvah/dot-engine |
|---|---|
| ![proc3d renderizado por C Graphviz](/img/proc3d-golden.svg) | ![proc3d renderizado por @knowvah/dot-engine](/img/proc3d-ours.svg) |

## Números (cuando se escribió esta página) {#numbers-at-the-time-this-page-was-written}

| Métrica | Valor |
|---|---|
| Veredicto | structural-match |
| maxDelta (port frente a nativo) | 3.55 pt |
| Etiquetas desplazadas en x | 73 / 73 (casi uniforme) |
| Extensión x del dibujo | ~2620 pt → el desplazamiento es el 0.13% |
| Rango / orden / topología / y | idénticos a C |

**Números actuales** (reverificados contra el árbol vivo): veredicto
**conformant**, 0 diferencias, maxDelta 0; consulta la nota de estado al principio de esta
página. Las imágenes de superposición de arriba se conservan como instantánea del
mecanismo, no como comparación en vivo.

## Reproducir {#reproduce}

El oráculo nativo se ejecuta con el `GVBINDIR` sin interfaz gráfica (`/tmp/ghl`, generado por
`test/corpus/gen-headless-gvbindir.sh`), de modo que ambos lados usan el mismo medidor
`estimate_textspan_size`; véase
[§A2 «Isolating the algorithm from the font backend»](/es/divergences#a2-text-measurement-font-metrics-label-driven-layout).

```sh
# port
GV_TEXT_MEASURER=estimate \
  npx tsx test/corpus/render-one.ts ~/git/graphviz/tests/graphs/proc3d.gv dot

# native C oracle (headless, estimate measurer)
GVBINDIR=/tmp/ghl \
  ~/git/graphviz/build/cmd/dot/dot -Tsvg ~/git/graphviz/tests/graphs/proc3d.gv
```

Ejecutarlo hoy produce SVG coincidentes (0 diferencias con la tolerancia `deterministic`
de ±0.01) en lugar del delta de 3.55pt descrito arriba.
