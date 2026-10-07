---
sourceHash: 292491e2ebc9280dc60b10bc0e3f5bd75e3bf355f8e732d90f86b8fa35a07f40
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Divergencias conocidas respecto a C Graphviz {#known-divergences-from-c-graphviz}

@knowvah/dot-engine aspira a la mayor fidelidad posible con la implementación canónica
en C. El código fuente en C es la especificación; una diferencia que no figura en la lista
se trata como un defecto, no como un comportamiento aceptado.

> **Qué significa «coincidir» aquí.** El veredicto de paridad del corpus llamado
> `conformant` es una **tolerancia determinista estricta**, *no* una igualdad literal,
> byte a byte, del SVG: las coordenadas numéricas y los trazados deben coincidir dentro
> de **±0.01** y todo el contenido no numérico (etiquetas, colores, texto) debe ser
> exactamente igual (`compareSvg(…, 'deterministic')`). En este documento, «coincidir» y
> «conforme» se refieren a ese veredicto de tolerancia. Definición completa:
> [Conformidad](./conformance.md).

Cuando la salida *sí* difiere, encaja exactamente en una de tres clases:

1. **Deltas aceptados**: diferencias que hemos investigado, entendemos hasta la causa
   raíz y hemos **decidido deliberadamente no hacer conformes**. Cada una está acotada,
   caracterizada y justificada más abajo. No son errores y no se «arreglarán» sin un
   motivo específico y de alcance separado.
2. **Cola larga con seguimiento**: carencias conocidas que *se* cerrarán, cada una con
   una corrección fijada por el oráculo. Viven, con recuentos en vivo, en
   [`test/corpus/PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md).
3. **No objetivos**: límites de alcance intencionados (formatos y mecanismos que nunca
   nos propusimos reproducir).

Los registros autorizados y actualizados de forma continua son
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
(panel de paridad por entrada frente a `dot` nativo) y
[`plans/port-catalog/README.md`](https://github.com/knowvah/dot-engine/blob/main/plans/port-catalog/README.md)
(inventario del estado del port a nivel de algoritmo).

La fuente de verdad **legible por máquina** sobre qué grafos están *aceptados* (la clase 1
de arriba) es
[`test/corpus/accepted-divergences.json`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/accepted-divergences.json).
Las herramientas lo combinan en el momento de generar el informe: `PARITY-dot.md` separa los
**deltas aceptados** del *backlog* con seguimiento, y la puerta de reglas obtiene de él su
lista de permitidos. Las secciones en prosa de abajo explican cada entrada (A1 y A3 están
vigentes; A2 está cerrada y se conserva como historia); una prueba de CI
(`accepted-divergences.test.ts`) exige que todo grafo aceptado siga divergiendo, de modo que
esta lista no pueda pudrirse en silencio.

---

## Deltas aceptados (deliberadamente no los hacemos conformes) {#accepted-deltas-we-deliberately-do-not-make-conformant}

Aceptamos un delta, en lugar de perseguir la paridad byte a byte, solo cuando se cumplen
**todas** las condiciones siguientes:

- La causa raíz es una **restricción de portabilidad** (algo que el entorno de ejecución
  JavaScript/navegador no puede reproducir con exactitud), no un error lógico del port.
- La diferencia es **subperceptible** y demostrablemente **acotada**.
- Corregirla tendría un **coste y un radio de impacto desproporcionados** frente a la
  recompensa (por lo general: tocaría una primitiva compartida que usan cientos de grafos
  ya conformes, con riesgo de regresiones a cambio de una ganancia de una fracción de
  píxel).

Cuando aceptamos un delta lo caracterizamos aquí para que los consumidores nunca se lleven
una sorpresa. Los grafos afectados por un delta aceptado se validan con un listón
**estructural / de tolerancia** en lugar de un listón de bytes.

### A1. Determinismo en coma flotante (motores dirigidos por fuerzas) {#a1-floating-point-determinism-force-directed-engines}

**Afectados:** `neato`, `fdp`, `sfdp`, `circo`, `twopi`, `osage` (los motores iterativos de
modelo de muelles). El *diseño* del motor `dot` **no** se ve afectado por este
determinismo del modelo iterativo; un delta de coma flotante, estrechamente acotado, en el
enrutamiento de splines de `dot` se trata aparte en **A3**, más abajo.

> **Alcance: históricamente una salvedad sin medir, ahora medida en parte.** El
> **sondeo SVG principal del motor dot** (`test/corpus/survey.ts`) sigue siendo
> **solo de dot**: el oráculo nativo se ejecuta con `GVBINDIR=/tmp/ghl`, que enlaza
> simbólicamente **solo** los complementos `core` + `dot_layout`
> (`test/corpus/gen-headless-gvbindir.sh` recorre exactamente `core dot_layout`:
> no hay ningún complemento de diseño `neato`/`fdp`/`circo`/`twopi`/`osage`/`sfdp`), y
> tanto el oráculo como el port se invocan con el motor `dot`. Así, los ids del corpus como
> `*_neato` / `*_circo` / `root_twopi` son *nombres de archivo* dispuestos con
> `dot` en ese sondeo, no con su motor nativo, y A1 no coincide con **ningún**
> grafo allí: no porque los motores estén demostrados conformes, sino porque
> ese sondeo en concreto nunca los ejercita.
>
> **Pero los seis motores de A1 tienen ya su propio sondeo con el motor nativo**, mediante
> `test/corpus/engine-walk.ts` + `parity-report.ts` (independiente de `GVBINDIR`:
> cada uno lanza directamente `dot -K <engine> -Txdot`), con dos niveles de rigor
> distintos documentados por separado más abajo: `circo`/`twopi`/`osage` se ejecutan con la
> misma tolerancia **determinista de ±0.01** que el sondeo de dot, con triaje de causa raíz
> por id («Aceptación en la pista del motor», más abajo); `neato`/`fdp`/`sfdp` se ejecutan con
> una tolerancia de **caracterización de ±0.5** más laxa, todavía sin triaje por id
> («Caracterización de los motores iterativos», más abajo). Cifras actuales entre motores:
> [`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md).

**Caracterización.** Estos motores ejecutan diseños numéricos iterativos cuyos resultados
dependen del redondeo en coma flotante, en concreto de la multiplicación-suma fusionada
(FMA) y de `Math.pow`, que pueden diferir entre motores de JavaScript y arquitecturas de
CPU. El port reproduce el orden de operaciones de C donde puede (`src/common/fma.ts`,
`src/common/arm-pow.ts`); p. ej., `sfdp` se ajusta a ~6 cifras significativas frente al
oráculo nativo con un PRNG equivalente y `fma`; pero la reproducción exacta, con
coordenadas idénticas, **no está garantizada entre plataformas**. La topología se conserva;
la posible divergencia está en las coordenadas finas de los nodos.

**Por qué se acepta.** Es una restricción dura de ejecutar en JS, no una decisión de
diseño: de la misma familia que la sensibilidad a `hypot` de Apple en A3. No hay manera de
garantizar resultados trascendentes/FMA idénticos al bit en todos los entornos de ejecución
de destino, así que un listón de bytes sería imposible de probar y no solo costoso.
**Evaluar A1** (en lugar de limitarse a advertir de ella) exigió una pista de paridad con el
motor nativo, construida el 2026-07-11 como `test/corpus/engine-walk.ts` + `parity-report.ts`,
que sondea cada entrada con su propio motor en lugar de `dot`. El techo honesto de ese
trabajo es **acotar** A1 a «ninguna divergencia activa en la plataforma de referencia»,
nunca eliminar la salvedad entre plataformas; los resultados hasta ahora (más abajo) se
mantienen dentro de ese techo: `circo`/`twopi`/`osage` han hecho aflorar y han
causa-raizado cada uno un puñado de casos genuinos de A1/A9, y `neato`/`fdp`/`sfdp` están
ahora en 90.8/77.5/68.0% dentro de 0.5pt del nativo sobre el universo de 910 elementos, lo
que significa que la aritmética portada (`fma.ts`, `arm-pow.ts`, PRNG equivalente) se
sostiene en la mayoría de los grafos, y cada id divergente restante se atribuye
individualmente por inyección (deriva del solucionador frente a defecto del port) en lugar
de quedar como deriva sin triar; véase la caracterización de los motores iterativos más
abajo.

**Aceptación en la pista del motor: la familia de flechas de twopi.** <a id="a1-twopi-arrows-family"></a>
El bloque de cita de arriba describe el sondeo SVG del motor dot, en el que A1 no coincide
con ningún grafo; la **pista xdot de motor** independiente de `twopi` (`parity-twopi.json`,
oráculo nativo `dot -K twopi -Txdot`, `test/corpus/engine-walk.ts`) *sí* se ejecuta con su
motor nativo y hace aflorar una instancia concreta y verificada de A1 en 9 ids del corpus:
`graphs-arrows`, `graphs-newarrows`, `graphs-arrowsize`, `linux.x86-arrows_dot`,
`macosx-arrows_dot`, `nshare-arrows_dot`, `share-newarrows`, `windows-newarrows` y
(añadido el 2026-07-28, nuevo en el universo de 905 elementos) el hermano de directed/
`tree-graphs-directed-oldarrows`, cada uno divergiendo en una única arista dominante
(`Z->I` o `i->Z`; 12–64 diferencias de operaciones de dibujo). El A/B por inyección (diario
de decisiones, 2026-07-10, entrada «injection A/B verdicts:
twopi arrows family EXONERATED...») demostró el mecanismo directamente:
volcar el `ND_pos` de entrada de `spline_edges` nativo e inyectarlo en el
`splineEdgesShifted` del port produce una salida **totalmente conforme** en
`graphs-arrows` (`Z->I` pasa a ser idéntica byte a byte a la del oráculo, con el mismo
spline de 7/14 puntos); por tanto, la divergencia es al 100% una deriva de la posición de
los nodos previa al enrutamiento procedente del solucionador de eliminación de solapamientos
PRISM de `twopi`, y el enrutamiento/emisión de splines del port queda exonerado. El síntoma
visible en 6 de los 8 ids es un cambio en el número de puntos de la bézier
(`unfilled_bezier[ptCount]: 8 vs 14`): el número de piezas ajustado por `Proutespline` es
sensible al lado de un límite de obstáculo en el que cae la posición derivada del nodo, así
que una diferencia de posición inferior a un ULP aguas abajo de la resolución iterativa de
PRISM cambia el número de segmentos del spline ajustado (los otros 2 ids,
`graphs-arrowsize`/`nshare-arrows_dot`, muestran la misma deriva como un delta menor solo
de posición, sin cambio en el número de piezas). Aceptado a nivel de pista del motor
mediante `test/corpus/accepted-divergences-engines.json`, que `parity-report.ts` combina en
`PARITY-twopi.md`: la misma combinación que `accepted.ts` hace para el
`PARITY-dot.md` de la pista dot.

El análisis de causa raíz de `oldarrows` (2026-07-28) fijó el punto exacto del cambio que
provoca el síntoma del número de puntos de la familia. Su abanico `i`–`Z`–`I` es colineal
sobre un diámetro del anillo, y el `intersect()` de `directVis` de pathplan bloquea una
línea de visión cuando un vértice de obstáculo está «sobre» el segmento, donde la
tolerancia de colinealidad de 1e-4 de `wind()` hace que incluso un nodo a 270pt del segmento
cuente como colineal, y `inBetween()` (que da por supuesta la colinealidad) degenera
entonces en comprobar solo la **proyección x**: el vértice bloquea si y solo si su x cae
estrictamente dentro del intervalo, ancho de un ULP, entre las coordenadas x de los dos
extremos. Cuál de las dos aristas radiales espejadas se dobla depende, pues, del orden en
el último ULP de tres valores x nominalmente iguales salidos de la resolución de PRISM: C
dobla `Z->I` (el vértice del eje del nodo `i` cae dentro de su intervalo), el port dobla
`i->Z` (el vértice del nodo `I` cae dentro del suyo). Replicar `directVis` fuera de línea
sobre el conjunto de obstáculos volcado de cada lado reproduce exactamente la decisión de
cada uno, e inyectar en el port el `ND_pos` previo al enrutamiento del oráculo da 0
diferencias (`attribution-twopi.json`): el enrutamiento y la emisión son fieles al byte.

`1855` es la variante **espejo** radial/estrella del mismo mecanismo de coma flotante de
PRISM previo al enrutamiento (aceptada el 2026-07-11): sus 31 hojas son exactamente
cocirculares, así que el diseño en estrella es simétrico por reflexión y la eliminación de
solapamientos de PRISM se asienta en un equilibrio inestable por simetría; una diferencia de
1 ULP entre el `cos`/`sin` de V8 y el de libm en 5 ángulos de hoja en el `setAbsolutePos`
de `circleLayout` selecciona la cuenca de espejo opuesta, y todo el diseño radial queda
como el espejo exacto en el eje x del del oráculo (desplazamiento máximo de nodo 6.04pt,
bb conservado). El A/B por inyección demostró ambas direcciones: alimentar el PRISM del
port con las posiciones exactas de `circleLayout` de C reproduce el oráculo nodo a nodo
(3e-14), y restaurar solo las 5 posiciones de hoja que divergen en un ULP devuelve todo el
diseño al espejo del port. Análisis de causa raíz completo:
`.agent-notes/twopi-radial-drift-rca.md` (diario de decisiones 2026-07-11).

**Caracterización de los motores iterativos: neato/fdp/sfdp.** <a id="a1-iterative-characterization"></a>
A diferencia de las pistas de motor `circo`/`twopi`/`osage` de arriba, `neato`/`fdp`/`sfdp`
**todavía no** están triados por id: `engine-walk.ts` registra un campo `tolerance: 0.5`
para estos tres y `parity-report.ts` los muestra en una sección aparte,
«Iterative engines (±0.5 characterization)», de
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md),
explícitamente **no** comparable con los porcentajes de acierto deterministas de ±0.01 del
resto de este documento. Recuentos actuales (universo de 910 elementos; el % de aciertos
deja fuera las entradas que el oráculo en C no puede renderizar, según
[Conformidad](./conformance.md)):

| motor | sondeados | dentro de ±0.5pt | no conformes (todos atribuidos, aceptados) | error del port / timeout | error del oráculo |
|---|---:|---:|---:|---:|---:|
| `neato` | 910 | 826 (90.8%) | 83 | 1 | 0 |
| `fdp`   | 910 | 703 (77.5%) | 204 | 0 | 3 |
| `sfdp`  | 910 | 619 (68.0%) | 290 | 1 | 0 |

(El primer barrido, el 2026-07-11 con 762 elementos, midió 263/311/260 dentro de
±0.5pt; el salto a las tasas actuales vino de correcciones por id aplicadas desde entonces,
principalmente el manejo de `user_pos`/`P_SET` de neato que no estaba portado, la
consolidación de la inicialización de motores y la corrección de `setEdgeType` entre macro y
función.)

A diferencia del primer barrido, ahora cada fila divergente está atribuida
individualmente: el arnés de inyección (`test/corpus/attribute-divergence.ts`) alimenta el
`ND_pos` previo al enrutamiento del oráculo nativo al port y vuelve a comparar, y
cada id divergente actual es o bien `drift-exonerated` (el enrutamiento
y la emisión del port reproducen exactamente el oráculo una vez eliminada la deriva del
solucionador) o bien uno de los pocos residuos por id aceptados por separado (el empate del
incírculo de CDT de `241_0` en los tres motores, `2239` de neato, `42`/`2556` de sfdp).
La aceptación de clase de abajo formaliza el conjunto exonerado; recuentos en vivo en
los paneles de cada motor
([`PARITY-neato.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-neato.md),
[`PARITY-fdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-fdp.md),
[`PARITY-sfdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-sfdp.md)).

**Aceptación de la clase A1-drift (motores iterativos, pertenencia calculada).**
<a id="a1-drift-iterative-engines"></a> `test/corpus/accepted-divergences-engines.json`
lleva una entrada de **clase** `"A1-drift"` por cada motor iterativo (`neato`,
`fdp`, `sfdp`) — `{ class: true, attributionFile, ref }` —, distinta de las
entradas por id que usan las pistas `circo`/`twopi`/`osage` de arriba (D2,
`plans/iterative-parity-campaign/decisions.md`). A diferencia de una entrada por id, la
pertenencia a la clase nunca se enumera a mano en el registro: `parity-report.ts`
la calcula en el momento del informe a partir del `attribution-<engine>.json` correspondiente
(el arnés de atribución por inyección de T1, `test/corpus/attribute-divergence.ts`):
todo id divergente cuyo `ND_pos` nativo previo al enrutamiento se inyectó en el
port y, al volver a comparar, es conforme a ±0.5 recibe `verdict: 'drift-exonerated'` en
ese archivo, lo que significa que los solucionadores iterativos de ambos motores convergieron a
diseños numéricamente distintos pero cada uno internamente coherente (una diferencia de
acumulación en coma flotante según la caracterización de A1 de arriba, no un error de
enrutamiento ni de emisión del port). La evidencia por id (forma del cubo, recuento de
diferencias base frente a inyectado, detección de traslación uniforme/espejo) vive en el
propio artefacto de atribución, sin duplicarse en este documento ni en el registro (D2). Un id
que más adelante pase a acertar sin más, o cuya reatribución cambie de veredicto,
sale de la clase automáticamente en la siguiente regeneración del informe: no hace falta
editar una aceptación obsoleta ni falla ninguna prueba de guarda. Los motores cuyo
`attribution-<engine>.json` aún no se ha generado muestran la clase como
«attribution pending» con cero miembros, igual que si no tuvieran ninguna aceptación:
la entrada de clase puede preceder a sus datos (véase
`test/corpus/accepted-divergences-engines.test.ts`).

### A2. Medición de texto (métricas de fuente) → diseño dirigido por etiquetas — CERRADA <a id="a2-text-measurement-font-metrics-→-label-driven-layout-—-closed"></a> {#a2-text-measurement-font-metrics-label-driven-layout}

**Estado (2026-07-01): cerrada.** Ningún id del corpus está aceptado ya bajo esta clase;
la sección se conserva como documentación histórica del mecanismo y del punto de
extensión inyectable `TextMeasurer` que lo neutralizó.
Las sucesivas correcciones de medición de texto (el cambio a `EstimateTextMeasurer`,
las métricas verticales sensibles a la fuente, la corrección de bytes UTF-8 no ASCII)
resolvieron casi todas las divergencias de diseño dirigidas por etiquetas que antes vivían
aquí. **`proc3d`**, el antiguo ejemplo canónico de A2, es plenamente **`conformant`** en los
tres directorios del corpus (`graphs-`/`share-`/`windows-proc3d`): bbox coincidente, cero
diferencias en los datos de trazado, cero diferencias en los anclajes de etiqueta.

**Los últimos miembros retirados (2026-07-01).** La **familia `NaN`**
(`graphs-NaN` / `share-NaN` / `windows-NaN`) se arrastró aquí mucho después de que la
geometría de sus nodos ya coincidiera exactamente con C (76/76 puntos de referencia). Su
verdadero residuo —8 extremos de aristas rectas en cuatro pares de 2-ciclos opuestos
(`Target↔TThread`, `Interp↔InterpF`, `Event↔Target`,
`AtomProperties↔NRAtom`) desplazados 6–14 pt— se rediagnosticó y resultó no ser
**en absoluto un efecto de métricas de fuente**, sino dos defectos del port en el
enrutamiento de multiaristas de dot (misión `plans/fix-nan-a2-retire/`,
`.agent-notes/nan-edge-endpoint-diagnosis.md`):

1. **Orden de carriles en pares opuestos.** El port reordenaba cada grupo de aristas
   paralelas por su seq de creación original antes de asignar los desplazamientos de
   carril de Multisep; C asigna los carriles en el orden recogido por edgecmp (primero el
   representante directo de MAINGRAPH, después el miembro invertido de AUXGRAPH:
   `dotsplines.c:419`, `make_regular_edge:1885-1907`). Un 2-ciclo cuyo miembro invertido se
   declaraba primero dibujaba cada arista en el corredor de 18 pt de la otra.
2. **Adyacencia plana espuria en aristas fusionadas entre rangos.** `markAdjacent`
   marcaba entradas de `ND_other` sin la guarda de mismo rango de C
   (`flat.c:272-276`), lo que dejaba que el cortocircuito de adyacencia plana de
   `groupSize` se tragara los cortes de grupo de portcmp.

Con ambos arreglados fielmente, la familia es **`conformant`** en los tres
directorios (por elemento: 0 nodos y 0 aristas distintos), y el mismo mecanismo
cerró `42`, `clust2`, `ngk10_4` (structural-match → conformant) y movió
`b124` de diverged a structural-match, todos ellos sobre pares de 2-ciclos/paralelos.

**Ambos lados del sondeo ejecutan el mismo estimador: la medición queda neutralizada.**
El oráculo `dot` nativo se ejecuta con un `GVBINDIR` sin interfaz gráfica
(`test/corpus/gen-headless-gvbindir.sh` → `/tmp/ghl`) que enlaza simbólicamente solo los
complementos `core` y `dot_layout`: ningún complemento de maquetación de texto
`gd`/`pango`/`quartz`.
Con esa ranura vacía, graphviz recurre a su `estimate_textspan_size` incorporado.
El `EstimateTextMeasurer` del port en TypeScript
(`src/common/textmeasure.ts`) es un port fiel de la misma rutina y es
el predeterminado en Node, resuelto por `createMeasurer()`
(`src/common/textmeasure-factory.ts`). **Por tanto, ambos lados de cada comparación de
paridad miden el texto con el mismo estimador**: los avances de glifo reales de
FreeType/pango nunca entran en la comparación. Por eso una regresión de veredicto aquí
apunta al código de diseño y no a una fuente, y por eso corregir los propios errores del
estimador (recuento de bytes UTF-8, sensibilidad a la fuente de las métricas verticales)
cerró casi toda esta clase de golpe en lugar de limitarse a estrechar una brecha de
métricas de fuente.

**El punto de extensión inyectable `TextMeasurer`.** Esta neutralización solo es posible
porque la medición de texto es un punto de extensión deliberado, no algo cableado en
ninguno de los dos motores. `TextMeasurer` es una interfaz de un solo método (`measure(text, font, size,
flags) → {w, h, …}`) inyectada como dependencia en cada punto de dimensionado de
etiquetas —`polyInit`, `recordInit`, `initEdgeLabels` y `buildNodeLabel` reciben el
medidor como parámetro—; nada mide texto a través de un global. Se fija para pruebas/CI
mediante `setTextMeasurer(...)` o `GV_TEXT_MEASURER=estimate`.
Este punto de extensión también permite *demostrar* que un residuo es solo de medición:
dar al port los anchos exactos que midió C (capturados del oráculo) y comprobar si el
diseño reproduce entonces C exactamente. Ese experimento fue lo que originalmente
justificó el veredicto A2 para `proc3d` (véase el apéndice histórico más abajo); la técnica
sigue siendo válida. Su inverso retiró la clase: como la medición estaba
demostrablemente neutralizada en ambos lados del sondeo, el residuo de aristas de `NaN` no
podía ser un efecto de métricas de fuente, lo que forzó el rediagnóstico que encontró los
dos defectos de enrutamiento de arriba.

::: details Análisis histórico (superado el 2026-06-30) — se conserva como registro
El material siguiente describe un estado anterior de esta clase, antes de que el
cambio a `EstimateTextMeasurer`, las métricas verticales sensibles a la fuente y la
corrección de bytes UTF-8 no ASCII cerraran la mayor parte de ella. Ya no describe el
comportamiento actual: se conserva solo para no perder el razonamiento que condujo hasta
aquí. En particular: (1) las cifras de anchura de «C nativo» de la tabla de medición de
abajo son valores de **FreeType** de una ruta de renderizado con fuente real; el sondeo de
paridad nunca ejercita esa ruta (ambos lados ejecutan `estimate_textspan_size`; véase
arriba), de modo que la tabla no refleja cómo se mide la paridad actualmente; (2)
las figuras de superposición y los renderizados golden/ours de abajo muestran un `proc3d`
**ajeno al corpus** (`graphs/directed/proc3d.gv`, ~2620 pt) que no forma parte del
sondeo de paridad; las variantes de `proc3d` del corpus son ahora conformes con cero
diferencias, así que no hay superposición que mostrar para ellas; (3) la narrativa del
desplazamiento x de nodos de `NaN`/`ratio=compress` de abajo está superada: la medición
actual muestra que los 76 puntos de nodo coinciden exactamente, así que la cadena error de
anchura → desplazamiento de nodo que describe ya no se sostiene para `NaN`.

**`NaN` con `ratio=compress` (histórico).** La familia
`NaN.gv` (`orientation=landscape; ratio=compress; size="16,10"`) era un caso de
A2 cuyo veredicto de entonces caía en *diverged* y no en
*structural-match*. La ruta de simplex de red en x de compress era fiel: todas las
entradas de restricciones coincidían con C (valor de la restricción de anchura, minlens de
`containNodes`, recuento de aristas auxiliares 471/peso 1612, `lrBalance` y órdenes de
rango, todo idéntico)
*salvo* las medias anchuras de 9 nodos, que el medidor daba 0.5–1.03 pt
más anchas que C. El empaquetado de peso 1000 de `ratio=compress` hacía **vinculantes** las
restricciones de separación de izquierda a derecha, normalmente holgadas, de modo que ese
error subpíxel de anchura —invisible sin compress— afloraba como un desplazamiento x
interior de −3..−5 pt. Ese desplazamiento empujaba el spline recto `Target<->TThread` 0.55 pt
más allá de la pared de la caja de un nodo, así que el enrutador lo doblaba en una pieza
bézier extra (7
puntos frente a los 4 de C): un delta *estructural*, de ahí *diverged*. Forzar los 9 anchos
a los valores de C reproducía C exactamente (x de nodos 53/76→0/76 desviados; spline 7→4 puntos),
lo que confirmaba que el residuo era al 100% de métricas de fuente aguas arriba, y no del
código de compress ni de splines, **para esa antigua divergencia**. Evidencia completa (con un
lado a lado visual golden frente a ours + la superposición del delta de spline de 4 frente a 7 puntos):
`plans/fix-compress-xcoord/comparisons/nan-compress-xcoord.html` (texto en prosa:
`…/nan-compress-xcoord.md`).

**Ejemplo de medición de métricas de fuente (histórico: FreeType frente a estimate).**
Graphviz nativo, ejecutado con un complemento real de maquetación de texto (no el oráculo
sin interfaz gráfica que usa el sondeo de paridad), mide el texto con los avances de
glifo de FreeType/libgd. El `EstimateTextMeasurer` del port no replica un rasterizador de
glifos. Para la mayoría de las cadenas ambos coinciden exactamente; para algunas, difieren
en una fracción de punto. Ejemplo medido: Times-Roman 14 pt, la cadena
`"/home/ek/work/src/lefty/lefty.c"` (31 caracteres):

| | anchura |
|---|---|
| C nativo (FreeType) | 176.00 pt |
| @knowvah/dot-engine (estimate) | 176.75 pt |
| delta | **+0.75 pt (+0.43%)** |

La otra línea de etiqueta del mismo nodo, `"93736-32246"`, se midió **idéntica**
(96.00 pt en ambos): el error depende de la cadena y se acumula por glifo, no es un
factor de escala uniforme. Esta brecha FreeType frente a estimate es real pero
**no** es lo que mide el sondeo de paridad (ambos lados ejecutan `estimate`); solo
importaría si la salida de @knowvah/dot-engine se comparara con un renderizado en C con
fuente real fuera de este sondeo.

**Efecto aguas abajo en la antigua divergencia de `proc3d` (histórico).** La anchura de la
etiqueta alimenta el tamaño del nodo, que alimenta el diseño:

1. Una etiqueta más ancha → una caja de nodo algo más ancha (en un nodo *elipse*, la
   anchura se escala además por √2, así que +0.75 pt de texto → +0.53 pt de media anchura).
2. Las medias anchuras de los nodos fijan las restricciones de separación de izquierda a
   derecha del simplex de red de coordenadas x; esas restricciones se redondean con
   `ROUND()` a enteros, de modo que un cambio subpíxel de anchura puede hacer pasar una
   restricción de *N* a *N+1*.
3. El simplex de red selecciona entonces una asignación entera de x distinta, pero igual
   de óptima, desplazando algunas posiciones x de nodos 1–2 unidades.

Para el `proc3d.gv` ajeno al corpus (`graphs/directed/proc3d.gv`, ~2620 pt, que no es
miembro del sondeo de paridad), eso produjo una diferencia de **≤ 3.55 pt** en la extensión
x (**0.13%**), superpuesta abajo: **verde = `dot` nativo de C (golden), rojo =
@knowvah/dot-engine (ours)**:

![Superposición golden frente a ours de proc3d: verde = C, rojo = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Ampliado, el borde aparecía casi por completo en las largas etiquetas ovaladas con rutas
de archivo:

![Superposición de proc3d, ampliada sobre los óvalos anchos con rutas: verde = C, rojo = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

| Golden — `dot` nativo | Ours — @knowvah/dot-engine |
|---|---|
| ![proc3d renderizado por C Graphviz](/img/proc3d-golden.svg) | ![proc3d renderizado por @knowvah/dot-engine](/img/proc3d-ours.svg) |

El análisis independiente (causa raíz, números por métrica, comando de reproducción)
está en su propia página:
[**proc3d — la divergencia canónica A2 de métricas de fuente (histórica)**](/es/divergences-proc3d-a2).
Esa página describe una divergencia resuelta en una entrada ajena al corpus; las
variantes actuales de `proc3d` del corpus son conformes.

**Por qué se aceptó en su momento.** Igualar al byte los avances por glifo de FreeType en
todas las fuentes y cadenas habría exigido replicar sus tablas de métricas, el *hinting* y
el redondeo: algo grande, frágil y aun así sin garantía de exactitud. El medidor de texto
es una primitiva compartida: toda etiqueta del corpus pasa por él, así que una corrección
dirigida a una cadena arriesgaba regresiones en otras a cambio de una recompensa
subperceptible.
:::

### A3. Desempate de `hypot` en el enrutamiento de splines (`dot`) {#a3-hypot-tie-break-in-spline-routing-dot}

**Afectados:** grafos `dot` con un canal de enrutamiento de aristas **geométricamente
simétrico**, típicamente un arco corto y simétrico de aristas planas. Ejemplo observado:
`2368`, que se queda en *structural-match* (maxΔ ≈ 10.2 pt en **una** arista, `376->76`).
El mismo desempate aflora también en una arista **larga** (de varios rangos) hacia un
concentrador de alta entrada cuando el corredor es exactamente simétrico por espejo:
`graphs-b100` / `graphs-b104` (mismo código fuente) divergen con maxΔ 20 (exactamente una
fila de rango) en el único nudo de `Node23730->Node23729`: todas las posiciones de nodos y
toda la estructura de cajas/polígonos/trazado tenso aguas arriba es idéntica byte a byte a
C; solo difiere la elección, en torno a 1 ULP, de `findMaxDev` sobre cuál de los puntos
interiores simétricos por espejo se convierte en el nudo de la bézier. La forma de arista
plana corta aflora también como `241_1` (structural-match,
maxΔ ≈ 2.4 pt), el hermano divergente de `241_0`, fijado por el oráculo, cuyo
ruido de C, en cambio, se queda con el primero. El mismo desempate produce la división del
corredor-ranura de una arista de retroceso etiquetada de un 2-ciclo en `2413_1`
(structural-match, maxΔ 67.65) y `2413_2` (maxΔ ≤99.55 una vez aplicada la corrección
swapBezier-reverse de T11; hasta entonces el maxΔ 1922.26 informado del archivo está
dominado por un defecto ajeno, con seguimiento aparte), y una única arista etiquetada
intra-clúster en `graphs-decorate`
(maxΔ 43.54); en cada caso, las dos esquinas candidatas de división empatan con una
diferencia de 5.7e-13 (familia 2413) / 3e-14 (decorate) antes de que el
ruido de `hypot` de Apple, dependiente de la posición, elija un ganador. `2371`
(structural-match, maxΔ 16.8) muestra la misma huella en dos aristas no relacionadas
(`g[9263]` `r6837mid--r9687mid`, `g[23859]` `r38mid--r8699mid`): el port emite el espejo
exacto, en cuanto a secuencia de puntos de control, del oráculo en ambas,
con la y del nudo invertida por un Δ16.8 idéntico (fracciones de división superior/inferior
intercambiadas).
Su origen se califica con confianza **MEDIA** y no con la confianza CONFIRMADA
de los demás miembros: `2371` empaqueta ~199 componentes, lo que
desacopla las coordenadas locales de pathplan de las coordenadas de página, así que el
empate no pudo correlacionarse en vivo con `route.ts:209` en tres
intentos de instrumentación; no se excluye por completo un origen en la segmentación en
modo recto o en `recover_slack` posterior al recorte. Diagnóstico completo:
`plans/residual-cleanup/analysis/2371-mirror.md`. La mayoría de las aristas enrutadas no se
ven afectadas.

::: details Definición del grafo (`2368.dot`)
```dot
digraph G {
  compound=true;
  concentrate=true;
  node[shape=box,fontsize="8",color="#909090",height="0.1"];
  edge[style="dashed",fontsize="8",color="#808080",arrowsize="0.5"];
  line7[label="#7"];
  {rank=same; line7;136;}
  line7 -> 136[style=invis];
  line11[label="#11"];
  line7 -> line11[weight=100,style=invis];
  {rank=same; line11;16;}
  line11 -> 16[style=invis];
  line16[label="#16"];
  line11 -> line16[weight=100,style=invis];
  {rank=same; line16;76;376;256;196;436;316;}
  line16 -> 316[style=invis];
  316 -> 76[style=invis];
  76 -> 376[style=invis];
  376 -> 256[style=invis];
  256 -> 196[style=invis];
  196 -> 436[style=invis];
  76 -> 376[label="from1"];
  376 -> 76[label="to1"];
  16 -> 76[label="ignore"];
  196 -> 376[label="from2"];
  376 -> 196[label="to2"];
  136 -> 196[label="ignore"];
  256 -> 436[label="to2"];
  256 -> 376[label="to1"];
  256 -> 316[label="as"];
  436 -> 256[label="from2"];
  376 -> 256[label="from1"];
}
```
:::

**Caracterización.** El ajustador de splines (`Proutespline` → `findMaxDev`,
`src/pathplan/route.ts`) divide una bézier ajustada en el punto de ruta interior de
máxima desviación. Cuando el canal es simétrico, los dos puntos de división candidatos
son un **empate matemático exacto**, y el ganador lo decide entonces el ruido de cancelación
en coma flotante, de ~1e-14, en una evaluación de bézier en coordenadas absolutas
cuyo **signo depende de la posición absoluta**.

La distancia de desviación de C es `hypot` de libm, y el `hypot` de Apple de macOS que
generó el oráculo es una implementación propietaria que no coincide al bit con **ningún**
`hypot` portable (medido frente a él en el régimen de coordenadas de graphviz, tasas
idénticas al bit: `Math.hypot` de V8 ≈ 63%, un `hypot` correctamente redondeado / estilo Arm
≈ 84%, `hypot` de fdlibm ≈ 90%, `sqrt(dx²+dy²)` ≈ 94%). Debido a ese ruido de ULP,
**C mismo no es coherente**: divide dos arcos *congruentes por traslación* hacia
esquinas **opuestas**. Dentro de `2368`, el arco `376->76` es la imagen especular del
arco `256->436`, geométricamente idéntico:

```
C    376->76 : M273.31,-4.56 C268.33,-3.14 263.11,-1.9  258.11,-1.15 250.49,0     242.34,-0.98 234.83,-2.8
port 376->76 : M277.29,-4.51 C268.27,-1.69 257.65,0.32  247.89,-1.15 244.92,-1.59 241.88,-2.21 238.85,-2.94
```

El delta completo, superpuesto (zoom de 12× sobre el arco `376->76` / `to1`): **verde = C
Graphviz, rojo = @knowvah/dot-engine**. Ambos son el mismo arco descendente poco profundo
entre los mismos límites de nodo; difieren en ~1–2 pt en el vientre (el punto de control
central de la bézier), donde el desempate de C se resolvió hacia la esquina opuesta:

![Arco 376->76 de 2368: verde = C, rojo = @knowvah/dot-engine](/img/2368-376to76-overlay.png)

Todo lo demás coincide dentro de la tolerancia: mismo cuadro delimitador (608×148),
posiciones de nodos, etiquetas, puntas de flecha y todas las demás aristas. Los renderizados
completos son visualmente indistinguibles:

| C Graphviz | @knowvah/dot-engine |
|---|---|
| ![2368 renderizado por C Graphviz](/img/2368-c.png) | ![2368 renderizado por @knowvah/dot-engine](/img/2368-port.png) |

El port usa un desempate **equivariante por traslación** (un empate verdadero se resuelve
siempre en el primer índice), de modo que dibuja *todos* esos arcos del mismo modo
con independencia de la posición: es autocoherente, y coincide con C en los arcos en los que
el ruido de C también se queda con el primero (p. ej. `256->436` y `241_0 5:ne->8:nw`),
divergiendo solo donde el ruido de C se inclina hacia el otro lado (`376->76`). Los extremos,
el destino de la punta de flecha, las demás aristas, todos los nodos, las etiquetas y el
cuadro delimitador coinciden dentro de la tolerancia; solo se mueven los puntos de control
interiores de un arco (~1–2 pt en el vientre).

**Por qué se acepta.** El `hypot` de Apple no es más reproducible entre motores de JS y
CPU que la FMA/`pow` de **A1**: es la misma restricción de portabilidad, solo que en
el enrutador de splines de `dot`. Igualar la elección *dependiente de la posición* de C
supondría adoptar el desempate estricto de C, que vive en una **primitiva compartida** por la que pasa cada
arista enrutada: hacerlo cambia la coincidencia de `376->76` por *nuevas* discrepancias en
los arcos en los que C cae del otro lado (regresa `241_0` y un caso de oráculo de aristas
planas con `cnt=3`), un empate neto que además sacrifica la
equivarianza por traslación del port. Así que mantenemos el enrutador coherente
(equivariante). Es un delta de `dot` acotado y subperceptible, no un error abierto. Investigación
completa: `.agent-notes/2368-residual-flat-label-ranksep.md`.

### A4. Oráculo en un estado reconocidamente roto (la familia init_rank / pathplan) {#a4-oracle-in-an-acknowledged-broken-state-the-init-rank-pathplan-family}

**Afectados:** `2796` (structural-match, maxΔ 49), `2471` (structural-match,
maxΔ ~9063), `1435` (structural-match, maxΔ 503), `1581` (diverged, maxΔ 465). Los
miembros de la familia `1939` y `2825` son **conformes** y no llevan entrada, y `2470`
y `graphs-structs` se les unieron el 2026-07-11 (ambos pasaron a conformes
tras aplicarse las correcciones de adyacencia-derrame/chancmpid de ortho, de `polylineMidpoint` con fmadd
y de redondeo de empates a par: el port reproduce ahora exactamente la salida de recuperación
del oráculo, incluidas las mismas aristas perdidas); sus
entradas de aceptación están retiradas.

`1581` y `2825` eran casos de recuperación ante fallos (misión fix-element-count-bucket):
entradas de fuzzer/degeneradas en las que las pruebas upstream afirman **solo**
que dot no se cuelgue (`test_1581`: sin violación de ASan; `test_2825`: sin
cuelgue cuando `rebuild_vlists` devuelve -1). C choca con un `Error:` interno
(`install_in_rank` / `rebuild_vlists: lead is null`) y su recuperación
descarta contenido del diseño; el port llega a las **mismas decisiones de
eliminación de rankset** (paridad de advertencias verificada: los mismos nombres de nodo/grafo
en las advertencias «already in a rankset» de `mark_clusters`, cluster.c:317-320).

`2825` está ahora totalmente cerrada. La misión fix-2825-rebuild-vlists (posterior a 1581)
cerró primero la brecha una capa: el port llega al estado de error interno *exacto* de C
(stderr idéntico byte a byte, incluido el orden de los mensajes
(`Error: rebuild_vlists: lead is null for rank 1` y luego la continuación sin prefijo de
`agerr(AGPREV, ...)`, `concentrate=true may not work
correctly.`), con `dotLayoutPipeline` propagando correctamente
el fallo de `dot_position` para omitir `dot_splines`/`dotneato_postprocess`,
igual que el `dotLayout` de C (`if (r != 0) return r;` tras `dot_position`,
dotinit.c:322-325). Un seguimiento (parte 2) cerró después la brecha restante de la
capa de renderizado: el `emit_node` de C condiciona cada nodo a `node_in_box(n,
job->clip)` (emit.c:1806-1809), y en esta ruta de aborto `job->clip` es
degenerado porque `GD_bb` nunca se fijó con `set_aspect` (dentro de la cola omitida de
`dot_position`), así que C emite *cero* nodos, solo los marcos de clúster (también
degenerados). El port portó esa misma guarda `node_in_box`
(`src/gvc/device.ts:renderNode`, usando `job.bb`/`job.pad` como equivalente de página
única de `job->clip`) y dejó de recalcular un bbox
plausible a partir de las posiciones vivas de los nodos cuando `g.info.bb` no está definido
(`src/gvc/device.ts:render`, `job.bb = g.info.bb` literalmente, reflejando el
`gvc->bb = GD_bb(g)` de `init_gvc`, emit.c:3272): todo motor de diseño
fija ya `g.info.bb` por sí mismo antes de que se ejecute `render()` en cualquier ruta que
no sea de aborto, de modo que esto es idéntico al byte en grafos sanos y solo cambia la salida
en esta ruta de aborto. `2825` es ahora `conformant` (salida de 4 elementos,
idéntica al byte a la del oráculo). Véase
`.agent-notes/2825-rebuild-vlists-abort.md` para el rastro completo del mecanismo
de ambas partes. `1581` nunca llega al estado inconsistente (un
error *distinto* de ventana de clúster upstream, no `rebuild_vlists`), así que
dispone en su totalidad el grafo que sobrevive: esa brecha sigue abierta. La salida del
oráculo en `1581` son escombros de recuperación sin semántica definida upstream. Evidencia:
[`1581`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1581.md). En
todas estas entradas es el **oráculo en C** el que está roto, según la propia
cuenta de graphviz: `2471`, `1939` y `1435` son
[`xfail(strict=True)`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/tests/test_regression.py)
upstream (incidencias
[#2471](https://gitlab.com/graphviz/graphviz/-/issues/2471),
[#1939](https://gitlab.com/graphviz/graphviz/-/issues/1939),
[#1435](https://gitlab.com/graphviz/graphviz/-/issues/1435), cf.
[#2796](https://gitlab.com/graphviz/graphviz/-/issues/2796)); el único intento
de arreglo, el [MR en borrador !4849](https://gitlab.com/graphviz/graphviz/-/merge_requests/4849),
sigue siendo un borrador sin fusionar (última edición 2026-03-20). `graphs-structs` es la
antigua clase de pérdida de enrutamiento de registros (#102/#242/#274/#1323) que la versión
estable graphviz 15.0.0 renderiza correctamente: una regresión del oráculo de la compilación de desarrollo.

**Qué hace C.** En los miembros de `init_rank` (`2796`, `2471`, `1939`),
el grafo auxiliar de coordenadas x de dot nativo cierra un ciclo dirigido a través de
aristas de restricción de pared de clúster; su
[`init_rank`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/ns.c#L146)
no puede recorrer todos los nodos, imprime `Error: trouble in init_rank`, y el
diseño continúa desde ese estado de recuperación: en `2471`/`2796` acaba
en escombros de triangulación de `Pshortestpath` y aristas perdidas. En `1435` y
`graphs-structs` la etapa rota es la propia pathplan (callejones sin salida de la
triangulación por recorte de orejas; una arista de puerto de registro perdida).

**Entradas verificadas y luego hechas fieles (esta es la parte sustancial).**
La misión `verify-oracle-bug-family`
([resumen](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/README.md))
volcó, línea a línea, el grafo de restricciones que ambos lados dan al simplex de red,
para cada miembro de la familia, y descubrió que el comportamiento «limpio» anterior del port en
esta familia procedía de **cuatro defectos genuinos del port**, todos corregidos:

1. `flatEdges` omitía la llamada a
   [`rec_reset_vlists`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/flat.c#L333)
   de C, dejando obsoletas las ventanas de rango de clúster tras la inserción de vnodos de
   etiquetas planas (solo esto hacía que el port perdiera **9** aristas en `2471` donde C
   pierde 6).
2. La penalización de arista del mismo `group` se disparaba en bucles propios en vez de en
   extremos del mismo grupo no vacío
   ([`dot_init_edge`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/dotinit.c#L66)).
3. `CL_CROSS` usaba el valor 100 de `_WIN32` de C; la plataforma del oráculo usa 1000
   ([`const.h`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/const.h#L141)).
4. Un callejón sin salida de triangulación abortaba `Pshortestpath` en lugar del
   avisar-y-continuar de C + retroceso a línea recta
   ([`shortest.c:333`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/pathplan/shortest.c#L333)).

Tras las correcciones, los volcados de restricciones de NS de la familia son **idénticos línea a línea**
a los de C (253 llamadas a rank2 en `2471`; todas las llamadas en `1939`/`1435`/`graphs-structs`),
y el port sigue a C a lo largo de la recuperación reconocidamente rota: las mismas
aristas perdidas (`3->16` en 2796; las mismas 6 en 2471), los mismos árboles de elementos.
`1939` pasó a ser totalmente conforme. Los deltas numéricos residuales (y los escombros
de pathplan distintos de 1435) son comportamiento *dentro* del estado de recuperación, que
la política del proyecto deliberadamente no persigue.

**`2723` (fallo de segmentación; fijada, no perseguida).** `dot` nativo falla por segmentación (salida 139)
con `tests/2723.dot` (no dirigido, grupos `rank=same`, aristas etiquetadas), así que C no
tiene salida con la que coincidir. La
[incidencia #2723](https://gitlab.com/graphviz/graphviz/-/issues/2723) upstream está abierta y
`tests/test_regression.py:test_2723` es `xfail`. El port lanza
`InternalError` (`INTERNAL_ERROR`, con una causa `TypeError` de
`src/layout/dot/flat.ts:flatLabelYpos`, donde `rank[r-1]` es undefined). Sin
un oráculo correcto, el fallo honesto se mantiene y el port no se cambia;
`src/layout/dot/flat-2723.test.ts` lo fija. Actualiza esa prueba si upstream corrige
la incidencia.

**Nota de política.** La postura anterior de A4 («el port cumple las expectativas de la
incidencia; no replicar») se basaba en la creencia de que el grafo auxiliar acíclico del port
procedía de una variante local benigna. No era así: procedía
del defecto (1), que demostrablemente extravió `2471`. La fidelidad al código fuente de
C se impuso: el port reproduce ahora los resultados reconocidamente rotos de C a partir de
entradas verificadas como idénticas, y cada entrada de aquí debe **volver a medirse
cuando upstream corrija la incidencia correspondiente** (la salida del oráculo
cambiará; cabe esperar que estos ids se enciendan como regresiones en esa actualización: eso
es por diseño, no podredumbre).

**Evidencia.** Páginas de comparación por id (renderizados lado a lado + registros de
evidencia):
[`2471`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2471.md),
[`1939`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1939.md),
[`1435`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1435.md),
[`graphs-structs`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/graphs-structs.md),
[`2796 post-fix addendum`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2796-post.md)
(línea base previa a la corrección conservada en
[`2796-cluster-ranking.md`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-2796-cluster-ranking/comparisons/2796-cluster-ranking.md)).
Artefactos de diagnóstico: `.agent-notes/2471-stale-cluster-windows-missing-reset.md`,
`.agent-notes/1939-group-penalty-clcross-misports.md`.

### A5. Bytes de entrada no válidos (representación de la codificación) {#a5-invalid-input-bytes-encoding-representation}

**Afectados:** `1367` (diverged, maxΔ 0: exactamente una diferencia estructural).

**Qué difiere.** El archivo de entrada contiene un byte de continuación UTF-8 desnudo (`0x80`)
dentro de un nombre de nodo. C trata los bytes de continuación desnudos 0x80–0xBF como
«caracteres válidos que se representan a sí mismos» (`lib/common/utils.c:1200-1207`, sin
advertencia), y el texto `<title>` del nombre de nodo se salta por completo la conversión de
juego de caracteres (los bytes de `agnameof` fluyen directamente a `gvputs_xml`). Por tanto,
el SVG del oráculo contiene el byte en bruto y **no es UTF-8 válido** pese a su
codificación declarada. El port decodifica la entrada con UTF-8 no válido mediante el
retroceso a latin1
(`0x80 → U+0080`) y emite UTF-8 bien formado (`\xc2\x80`).

**Por qué se acepta.** La frontera de E/S del port son cadenas de JS (biblioteca para el
navegador). Un byte no válido en bruto no puede viajar de ida y vuelta por el valor de
retorno de cadena de `renderSvg`; igualar a C byte a byte supondría corromper la
codificación de la salida para todos los consumidores. El retroceso a latin1 refleja la
propia semántica de recuperación de C, «tratado como Latin-1» (`utils.c:1249`). Esta es una
restricción por debajo del código —la capa de representación—, no un comportamiento portable
que nos negáramos a portar.
Todo lo demás en 1367 es conforme: los recuentos de elementos (23 polyline /
103 text / 44 polygon / 24 path) y todas las coordenadas coinciden tras la
corrección de decorate (T6).

**Evidencia.**
Página de comparación de
[`1367`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1367.md)
(renderizado lado a lado + registro de evidencia).

---

### A6. Desbordamiento del lienzo con `unsigned int` ante entrada degenerada {#a6-unsigned-int-canvas-overflow-on-degenerate-input}

**Afectados:** `1314`: una entrada derivada de un fuzzer (`fontsize="991836031967s8"`)
cuyo absurdo tamaño de fuente hincha el dibujo hasta ~2.75e11 pt.

**Qué ocurre.** C almacena `job->width` / `job->height` como **`unsigned int`**
(`gvcjob.h:327-328`). El `ROUND(...)` del enorme tamaño en puntos (`emit.c:1249-1250`)
desborda 32 bits y da la vuelta módulo 2³², y el backend SVG lo emite con un `%d`
**con signo** (`gvrender_core_svg.c:258-259`), así que C imprime
`height="-425618343"`. El port conserva el valor matemáticamente coherente (sin vuelta).
Todos los demás valores —`cx/cy/rx/ry` de la elipse del nodo, el `translate` raíz, el
polígono, el `font-size` del texto— son idénticos byte a byte; solo difieren el ancho/alto
del `<svg>` de nivel superior.

**Por qué no lo perseguimos.** Replicar el desbordamiento de enteros de 32 bits de C no es un
comportamiento de diseño que valga la pena portar, y la entrada es degenerada. Se revisará si upstream
corrige el desbordamiento (p. ej. ensanchando el campo o acotando el tamaño).

<a id="a6b-degenerate-nan-layout"></a>

#### A6b. Diseño degenerado con NaN (`sfdp`, `repulsiveforce` patológico) {#a6b-degenerate-nan-layout-sfdp-pathological-repulsiveforce}

**Afectados:** `2556`: `repulsiveforce=100` (⇒ la fuerza repulsiva usa
`pow(dist, 101)`), lo que lleva al solucionador de muelles-electrostático a **NaN en ambos
motores**. El propio oráculo nativo emite todas las posiciones de nodos y aristas como `nan` y un
cuadro delimitador degenerado.

**Qué ocurre.** Con todas las coordenadas en NaN, las dos implementaciones serializan
la basura de forma distinta: (1) el bb del grafo / polígono de fondo: C redondea `NaN`
a `int`, lo que en arm64 da basura de escala `INT_MIN` (`bb="0,0,-4.295e+09,
-4.295e+09"`); el port conserva `0`. (2) Operaciones de dibujo de aristas: el pase de emisión
nativo suprime los `_draw_`/`_hdraw_` de un spline NaN (emitiendo solo la `pos`),
mientras que el port los emite con puntos de control NaN. Los dibujos de nodos coinciden (ambos
los suprimen). No existe un diseño real en ninguno de los dos lados.

**Por qué no lo perseguimos.** El port ya reproduce la *misma* explosión a NaN que el
nativo: la corrección que lo logró es genuina (véase abajo); lo que queda es solo
cómo serializa cada uno la basura NaN. Replicar el comportamiento indefinido de `(int)NaN`
de C y su supresión de dibujo de splines NaN no es fidelidad de diseño significativa en una entrada
cuyo diseño es degenerado en ambos motores. Se revisará si upstream acota
`repulsiveforce` o sanea las posiciones NaN.

**Correcciones del port que hicieron esto alcanzable (no descartadas: errores reales).** Antes de
ellas, el port ni siquiera podía llegar al estado degenerado: (1) `armPow`
(`src/common/arm-pow.ts`) lanzaba una excepción ante cualquier argumento que no fuera de ruta rápida; ahora porta la rama completa de casos especiales de `pow.c` de ARM, de modo que
`pow(NaN, y) = NaN` como en libm. (2)
`bezierClip` (`src/common/splines-geom.ts`) entraba en un bucle infinito con puntos de control NaN
porque su prueba de convergencia era la negación ingenua del `while (ABS > .5)` de C
(equivalente para valores finitos, no para NaN); ahora refleja a C exactamente y
termina con NaN. Ambas son fieles a C y afectan solo a entradas NaN.

---

### A7. Límite de redondeo de la pared de caja con `round()` (`dot`) {#a7-round-box-wall-rounding-boundary-dot}

**Afectados:** `graphs-honda-tokoro` y (añadido el 2026-07-28, nuevo en el universo de 905
elementos) su hermano de `graphs/directed/` `tree-graphs-directed-honda-tokoro`
(ambos structural-match, maxΔ ≈ 1 pt en la única arista `n012->n011`). El
hermano difiere solo por los atributos `samearrowhead`, que no tocan el enrutamiento de este par:
su geometría de `n012->n011` es idéntica byte a byte a la del id aceptado
tanto en el port como en el oráculo, así que el mecanismo de abajo se transfiere tal cual.

**Qué difiere.** La pared de la caja del corredor de cabeza de `maximal_bbox` cae en
x=90 interna en C frente a x=89 en el port, para el puerto `samehead` compartido de las dos
paralelas `n012->n011`. La construcción de puerto compartido (`buildSharedPort`) y la
agrupación de paralelas son ambas conformes byte a byte con C; la brecha de 1 px es puramente un
artefacto del límite de redondeo de `round()`: ~1e-14 de ruido de coma flotante aguas arriba
empuja un valor situado exactamente sobre un límite `.5` al entero vecino. La
fórmula de `maximal_bbox` del port ya refleja exactamente la de C.

**Por qué no lo perseguimos.** `round()` es una primitiva por la que pasa cada arista enrutada del
corpus; empujar su comportamiento en el límite para igualar este único caso es un
riesgo de regresión en todo el corpus por 1 px en 2 aristas: la misma restricción de primitiva compartida
que el redondeo del casco de control señalado en
`bbox-class-control-hull-vs-curve`. Diagnóstico completo:
`.agent-notes/honda-samehead-shared-port.md`.

---

### A8. Redondeo `fp-contract`/FMA frente a IEEE estricto (`dot`) {#a8-fp-contract-fma-rounding-vs-strict-ieee-dot}

**Clase.** clang arm64 compila el binario del oráculo con `-ffp-contract=on`,
fusionando ciertas secuencias de multiplicación-suma en instrucciones FMA únicas;
el port se ejecuta en V8, que aplica el redondeo estricto de IEEE-754 y no puede emitir
`fma`. Con entradas idénticas al bit, ambos discrepan en 1-2 ULP en la
expresión que el compilador eligió contraer. El lado del port es siempre el resultado
IEEE-754 estricto; el lado del oráculo es siempre el resultado contraído con FMA. Es una
restricción de portabilidad de compilador/entorno de ejecución por debajo de la semántica del código fuente
de C, no un defecto lógico del port: irreducible sin
emular en software las elecciones concretas de contracción de clang. Se conocen dos instancias,
en dos sitios distintos, con dos mecanismos de amplificación distintos:

- **2646**: el ULP surge dentro de la resolución cúbica `points2coeff`/`solve3` de
  `Proutespline` y cambia directamente el recuento de raíces del ajustador de splines.
- **2620**: el ULP surge en el bucle de extensión de vértices del polígono de `poly_init`
  (dimensionado de nodos) y lo amplifica aguas abajo la truncación entera fiel por relajación de `ortho`
  hasta producir un cambio de empate de corredor de laberinto de igual coste.

**Afectados:** `2646` (structural-match, maxΔ 42.09 en 3 de 21 216 aristas:
`edge2575` `g[4639]`, `edge3905` `g[7777]`, `edge15467` `g[30201]`, todas rutas largas
de arista en modo smode con puerto de registro `:c->:nb_part`). Hermana de **A3**: ambas
clases son empates de portabilidad de coma flotante irreducibles dentro de
`Proutespline`, pero el mecanismo es distinto: un artefacto de `fp-contract` del compilador,
no el `hypot` de libm.

**Qué difiere.** En las tres aristas, solo diverge la última llamada a `routesplines` (un
tramo recto hacia el puerto de cabeza). Su extremo yace exactamente al bit sobre la pared inferior del polígono
de barrera con su tangente paralela a esa pared
(`evs[1]=(1,-1.22e-16)`), de modo que todo candidato de `splinefits` es tangente a la
barrera en `t=1`: una raíz casi doble de la cúbica de intersección.
`points2coeff` calcula esa cúbica con una cancelación catastrófica (términos
de en torno a ~7446 que se reducen a ~0.099). El oráculo (clang/arm64,
`-ffp-contract=on`) contrae `v3 + 3*v1 - (v0 + 3*v2)` en multiplicaciones-sumas
fusionadas, mientras que V8 aplica redondeo IEEE estricto: ambos discrepan en
~9.1e-13 con **entradas idénticas al bit**, y ese ruido invierte el signo del
discriminante de `solve3`: C encuentra 1 raíz (866.7, dentro del segmento); el port
encuentra 3 raíces con una raíz compañera espuria en `t=0.9999975 < 1-EPSILON2`. La
raíz espuria provoca una iteración extra de reducción a la mitad de `a`, lo que invierte la
magnitud de la tangente de la pieza final en un factor de 2 (en cualquier sentido en
las 3 aristas), produciendo el maxΔ 42.09 tras el recorte (26 diferencias de SVG).

**Por qué se acepta (irreducibilidad demostrada con un experimento controlado).** Se volcaron las seis
llamadas a `routesplines` en ambos lados: caja, polígono, `PL`, inicio,
fin y `evs` son idénticos byte a byte, igual que la spline de salida de la
llamada anterior (no final); la única divergencia está dentro del `solve3` de la llamada final. Un
arnés de C prístino independiente aisló la única variable: compilar con
`-ffp-contract=off` reproduce exactamente al bit el **port** en las 3 aristas; la contracción
predeterminada (`on`) reproduce exactamente al bit el **oráculo** en las 3
aristas. Por tanto, el port ya coincide con C con IEEE-754 estricto; la
divergencia es enteramente la elección de contracción FMA del compilador del oráculo, por debajo de la
semántica del código fuente de C: no hay infidelidad a nivel de código fuente que corregir. Se probó y
se refutó una corrección dirigida (emular a mano la contracción en `points2coeff`):
corrige 2 de las 3 aristas pero no la tercera, cuyo cambio
se origina dentro de la propia contracción interna de `solve3`. Una corrección completa
exigiría emulación FMA por software en todo el ajustador de splines: un coste de bucle caliente
con radio de impacto de redondeo en todo el corpus a cambio de una recompensa subpíxel de 3 aristas.
Diagnóstico completo: `plans/residual-cleanup/analysis/2646-fp-contract.md`.

**Afectados (histórico):** `2620` (era structural-match, maxΔ 585; 423 diferencias
en 24 trazados de aristas + 22 puntas de flecha). **Pasó a conforme el 2026-07-11**:
el port fiel del desbordamiento del búfer de adyacencia de `sgraph` + la contención bidireccional de
`chancmpid` (véase `.agent-notes/ortho-maze-circo-rca.md`) eliminó la
divergencia; la entrada de aceptación está retirada y esta sección se conserva como
documentación de la clase A8.

**Qué difiere.** La tubería de `ortho` (`splines=ortho`) es conforme byte a byte
con C dadas entradas idénticas, como se demostró inyectando la entrada exacta del laberinto
de C (coordenadas, `xsize`/`ysize`) en la etapa ortho del port: 378/378 segmentos enrutados
salen idénticos byte a byte, así que nada en `src/ortho` tiene la culpa.
La divergencia real son 1-2 ULP en la *entrada* del laberinto: el `ysize` del nodo (y, por
acumulación dentro del rango, `ND_coord.y`) calculado en el bucle de extensión de vértices del polígono de
`poly_init` de C (`shapes.c`), que con
`-ffp-contract=on` fusiona `R.x += sidelength*cosx` en una FMA que es ~1
ULP mayor que la aritmética IEEE estricta del port (ambos lados implementan la
expresión aritméticamente idéntica). `2620` tiene 173 nodos poligonales de anchura
fraccionaria; todos muestran C ≥ port en 1-2 ULP. Ese ULP lo amplifica —no lo
introduce— la relajación de Dijkstra de `ortho`, que trunca fielmente su
distancia acumulada en cada paso (`sgraph.c:165`, reflejado en el port como
`Math.trunc`) sobre pesos derivados de las extensiones de celda en bruto
(`maze.c:257`). La geometría desplazada un ULP invierte un empate de corredor de igual coste
en 4 aristas enrutadas (trazados + sus puntas de flecha); las diferencias restantes son
renumeración de ±1 pista como efecto en cadena de esos 4 cambios.

**Por qué se acepta (irreducibilidad demostrada con un experimento controlado).** Un
arnés de C independiente que variaba solo `-ffp-contract` reprodujo ambos lados en
el vértice hexagonal divergente: `-ffp-contract=on` → `310.29250168188713`
(coincide con el oráculo), `-ffp-contract=off` → `310.29250168188707` (coincide con
el port), con la operación divergente aislada en el vértice `i=3`
(`R.x=-0.50000000000000011` fusionado frente a `-0.5` sin fusionar). Un segundo
experimento de inyección de entrada (única variable: los valores de entrada de ortho) confirmó
el amplificador: dar al propio `orthoEdges` del port los `coord`/`xsize`/`ysize` exactos de C
reduce a 0 las 4 divergencias de corredor: el
código de ortho no tiene ningún defecto, simplemente es sensible (como lo es el propio
enrutamiento por coste de laberinto de C) a un desplazamiento de 1-2 ULP en su entrada. Igualarlo supondría emular
la contracción FMA concreta de clang de un árbol de expresión compilado en
`poly_init`: perseguir un artefacto compilado, no portar semántica del código fuente.
Diagnóstico completo: `plans/ortho-2620-residual/analysis/2620-ortho-route.md`.

**Excepción emulada (no aceptada): `triang.c:ccw`.** Un sitio de contracción
SÍ se reproduce bit a bit en lugar de aceptarse: el `ccw` de pathplan
se compila a `fnmul`+`fmadd` (primer producto exacto − segundo redondeado), de modo que un
punto de consulta igual al bit a un extremo de segmento da ISCW/ISCCW en lugar de
ISON. `shortest.c:pointintri` rechaza entonces los extremos en vértices del polígono
(«destination point not in any triangle») y `makeMultiSpline` recurre
al enrutamiento simple para cada 2-ciclo fusionado: un comportamiento discreto, grande y
que afecta a todo el corpus, con el que el port debe coincidir. A diferencia de los sitios `solve3`/`poly_init`
de arriba (en lo profundo de árboles de expresión compilados, corrección refutada), `ccw` es
una única función compilada independiente con semántica limpia, así que
`src/pathplan/triang.ts` la emula: una ruta rápida en doble simple con una cota
de error conservadora donde los signos simple y fusionado coinciden demostrablemente, y
una ruta exacta con producto de Dekker + BigInt diádico para los casos cercanos a cero.

---

### A9. Trigonometría de libm con 1 ULP → cambio de empate cocircular de CDT (multispline de `circo`/`twopi`) {#a9-libm-trig-1-ulp-→-cdt-cocircular-tie-flip-circo-twopi-multispline}

**Clase.** `Math.sin`/`Math.cos` de V8 no son idénticos al bit a `sin`/`cos` de la libm de Apple
(demostrado: discrepancia de 1 ULP en `2π·4.5/8`, uno de los ocho ángulos de esquina del
obstáculo elíptico). Las esquinas del octógono circunscrito de `makeObstacle`
heredan ese ULP, de modo que las coordenadas de entrada del enrutador de triángulos difieren de
las del oráculo en ≤6e-14. Los diseños simétricos (nodos del mismo tamaño en un rango/anillo) hacen
que los cuadriláteros del enrutador sean **exactamente cocirculares** en aritmética real, de modo que el
predicado exacto del incírculo queda en el filo de la navaja: el ULP de entrada invierte su signo,
la diagonal de Delaunay restringida cambia, y el polígono de corredor que falla en
`Pshortestpath` en el oráculo («destination point not in any triangle» →
retroceso a spline simple) tiene éxito en el port (o viceversa). Las splines resultantes
difieren en ~0.2–0.5pt. Hermana de **A3**/**A8**: una restricción irreducible de portabilidad de
coma flotante por debajo de la semántica del código fuente de C: igualarla
exigiría reproducir en JS el redondeo exacto de `sin`/`cos` de la libm de Apple.

**Afectados:** `241_0` (circo Δ≈0.2 / lienzo de twopi Δ≈9 por el cambio de corredor
en la arista `5:ne->8:nw`); `2343`, `2239`, `share-b29`, `windows-b29` (twopi,
1–2 diferencias de posición de etiqueta de arista cada uno: el ULP de libm surge en
la trigonometría de vértices unitarios de `poly_init` (`hypot`/`atan2`/`sin`), pone la
altura calculada de un nodo un ULP más allá del mínimo que el oráculo alcanza
exactamente, y se propaga a través de `floor()` en la carga del R-tree de xlabel hasta un
único cambio de etiqueta candidata. Se probó y REFUTÓ una corrección con `hypot` correctamente redondeado:
arregló `2343` pero hizo regresar `2168_3`, cuyo dimensionado de octógono
pasa por la misma llamada en la que el valor del oráculo NO es el correctamente
redondeado: ninguna política determinista de `hypot` coincide con el oráculo en ambos).
`2168_1` estaba originalmente en esta clase pero pasó a ser
conforme cuando el port emuló el `ccw` con fp-contract del oráculo
(`triang.ts` de pathplan): su fallo de corredor lo gobierna el rechazo de extremos en vértice de
`pointintri` con FMA, que el port reproduce ahora
bit a bit, así que el empate de ULP de la diagonal de CDT ya no aflora ahí.

**Por qué se acepta (irreducibilidad demostrada con un experimento controlado).** La
propia CDT queda exonerada: el `mkSurface` del port es un port fiel de la inserción
incremental de GTS 0.7.6 (`cdt.c`: división 1→3 + `swap_if_in_circle` recursivo,
aristas de restricción creadas de antemano e inintercambiables,
imposición de restricciones con `remove_intersected_*` + `triangulate_polygon`), y
un arnés de C independiente que enlaza la **biblioteca GTS real** y recibe las entradas
exactas al bit del enrutador del port reproduce la triangulación del port cara por cara
(2168_1: 22/22; 241_0: 185/185). La evaluación exacta en racionales del determinante del incírculo
sobre los dos conjuntos de entrada confirma el cambio de signo (+1 con las entradas del
port, −1 con las del oráculo). La variable residual, la diferencia de 1 ULP en
trigonometría, se aisló comparando directamente los patrones de bits de `Math.sin`/`sin`.

**Aceptación en la pista de motor (`accepted-divergences-engines.json`).**
<a id="a9-engine-track-twopi-circo"></a> Las **pistas xdot de motor** de twopi/circo
(`parity-twopi.json` / `parity-circo.json`, oráculo nativo `dot -K <engine>
-Txdot`, `test/corpus/engine-walk.ts`, comparación semántica de operaciones de dibujo a
±0.01; véase `test/golden/compare-xdot.ts`) hacen aflorar este mismo mecanismo
con independencia del sondeo SVG del motor dot citado arriba: twopi `2239` (1
diferencia de operación de dibujo: el cambio de posición del texto de etiqueta de arista `_ldraw_`, el mismo
ULP de trigonometría de vértices unitarios de `poly_init` propagándose por la cadena de R-tree de
xlabel con `floor()`; `2343`, `share-b29` y `windows-b29`, aceptados originalmente
bajo esta entrada, se *corrigieron* el 2026-07-11 con la contracción fmadd fiel en
`polylineMidpoint`; véase el párrafo de la familia b29 más abajo) y circo `241_0` (41
diferencias de operaciones de dibujo, Δ≈0.2pt en la bézier enrutada de la arista `1->2`: el mismo
cambio de corredor por diagonal de CDT; diario de decisiones, entrada de 2026-07-10 «CDT rewritten as
faithful GTS port; 2168_3 outline-ring obstacle; 56/osage bb clobber; A9
filed»). Aceptado a nivel de pista de motor mediante
`test/corpus/accepted-divergences-engines.json`, combinado en
`PARITY-twopi.md`/`PARITY-circo.md` por `parity-report.ts`: la misma combinación
que `accepted.ts` hace para el `PARITY-dot.md` de la pista dot.

**circo `2475_2`: empate de `hypot` cocircular en closestNode.** En un componente de 28 nodos
de este grafo de 10762 nodos, el `getRotation` de circo
(`circpos.c:73-92`) elige el nodo del bloque más cercano al origen del diseño mediante
`hypot` para decidir la rotación del subbloque. Dos nodos cocirculares son
prácticamente equidistantes; el `Math.hypot` correctamente redondeado de V8 y el `hypot` de la libm de Apple
redondean esa distancia con 2 ULP de diferencia, lo que invierte el `<` estricto,
selecciona otro nodo y rota/refleja el subbloque ~20° (se mueven 18 nodos,
máx. 296.7pt; los otros 10744 nodos son idénticos al bit, igual que el
árbol de bloques, el orden circular y cada `centerAngle`). La política de hypot correctamente redondeado
ya se había refutado para esta clase (2026-07-10). Reproducción independiente:
`.agent-notes/circo-2475-590-repro.dot`; análisis de causa raíz completo:
`.agent-notes/circo-b81-2475-rca.md` (aceptado el 2026-07-11).

**twopi `2470`: ULP de coordenada radial amplificado por el R-tree de xlabel.**
2470 es un grafo de 140 aristas cuyas etiquetas de arista HTML `<table>` se agrupan en
anclajes radiales casi coincidentes. En la familia neato, las etiquetas de arista se colocan
como etiquetas externas con el colocador voraz de xlabel (`label/xlabels.c`),
que elige la esquina candidata con menos solapamiento mediante un R-tree ordenado por Hilbert.
Las splines y las coordenadas de nodos del port coinciden con el oráculo con la precisión de
emisión (cero diferencias de spline/nodo/bbox incluso a 1e-7), pero la `ND_coord.y` radial de un nodo
difiere en ~2 ULP (`sin`/`cos` de la libm de Apple frente a `Math` de V8), muy
por debajo del listón de conformidad, aunque cae a horcajadas sobre el límite de
`floor(pos.y − sz.y/2)` exactamente en 0 en `objplpmks`, invirtiendo el rectángulo de R-tree de ese objeto
en una unidad. El cambio del orden de Hilbert/agrupación del árbol hace que `RTreeSearch` pode
una rama distinta, así que ~140 etiquetas saltan cada una a la esquina candidata vecina
(cada diferencia es un paso fijo de (+anchura, −altura de línea)). El colocador, el orden de objetos,
el redondeo de rectángulos, `CombineRect` (que refleja fielmente la rareza de mín-mín de C)
y la clave de Hilbert de int32 se verificaron fieles cada uno; la
divergencia es el ULP de trigonometría radial aguas arriba, irreducible por la misma razón
que twopi `1855`. Aceptado el 2026-07-11; análisis de causa raíz completo:
`.agent-notes/twopi-2470-rca.md` (que documenta además que el «acierto» matinal
del id fue un artefacto de un binario de oráculo obsoleto, no una regresión
del port).

**osage `1855`: borrón de fp-contract en los vértices de obstáculo.** Distinto de la entrada de espejo
radial de twopi `1855` de arriba: con osage, los centros de nodos son exactos al bit
respecto al oráculo, y las 110 diferencias de operaciones de dibujo son tres aristas enrutadas
por obstáculos colocadas en el lado espejo de una fila de nodos (X exacta al bit, Y espejada). Los
vértices del octógono de obstáculo obtenidos de
`circumscribed_polygon_corner_about_ellipse` (`neatosplines.c:301`) difieren
de C en 3–4 ULP porque el `-ffp-contract=on` de clang fusiona las cadenas `a·b±c`
de `ellipse_tangent_slope`/`line_intersection` en FMA de un solo redondeo,
mientras que V8 redondea cada operación: el redondeo fusionado de C colapsa una columna de canal
de valores x de esquina en un único doble idéntico al bit (exactamente colineal),
mientras que el del port la divide en dos valores separados 1 ULP. Eso invierte la prueba de
tangencia `clear()` de visibilidad —el canal ya no está bloqueado—, añadiendo ~20
aristas de visibilidad, y Dijkstra resuelve el empate de homotopía arriba/abajo hacia el
lado espejo. Experimento controlado: inyectar las coordenadas exactas de obstáculos de C
en el port, por lo demás intacto, da **cero** aristas divergentes,
exonerando por completo la cadena de disposición legal, visibilidad, Dijkstra y splines;
inyectar solo el `cos`/`sin` de libm de C no tiene efecto. Aceptado el
2026-07-11; análisis de causa raíz completo: `.agent-notes/osage-spline-family-rca.md`.

**Familia b29 (twopi).** Las cuatro variantes b29 comparten un único filo de navaja: la
etiqueta de arista `EqmtTyp` (`Node14732->Node14731`) cae en un empate exacto de selección de lado
de placeLabels cuyo resultado depende de la deriva de 1 ULP del diseño de twopi en los
objetos circundantes. Con la contracción fmadd fiel en
`polylineMidpoint` (corrección de la familia states, 2026-07-11), el anclaje de etiqueta del port
es idéntico al bit al del oráculo, pero el empate aún se resuelve al revés en
dos de las cuatro variantes (`graphs-b29`, `linux.i386-b29`) mientras que las otras
dos (`share-b29`, `windows-b29`) ya son conformes, y la diferencia de etiqueta A9 aceptada de
`2343` desapareció por completo. Cota: 1 operación de dibujo, Δ12pt en la y de la etiqueta. Irreducible
sin eliminar la deriva aguas arriba. Análisis de causa raíz completo:
`.agent-notes/twopi-states-rca.md`.

El mismo filo de navaja de placeLabels aflora en la pista de **osage** (aceptado
el 2026-07-11, análisis de causa raíz completo: `.agent-notes/osage-small-tail-rca.md`):
`linux.i386-b29` y `share-b29` (2 diferencias de operaciones de dibujo cada uno: el
anclaje x de una etiqueta de arista cae en 878.28 frente a 841.06, colocada simétricamente respecto al
punto medio de la spline, idéntico al bit, 859.67, es decir, ±la mitad del ancho de la etiqueta; las dos
variantes son espejo una de otra) y `1652` (2 diferencias de operaciones de dibujo: dos aristas invierten cada una
un anclaje de etiqueta respecto a un punto medio idéntico, una en x y otra en y,
con splines y puntas de flecha idénticas al bit; el oráculo renderiza por completo,
así que esto no es la conocida intermitencia de timeout nativo). En todos los casos la geometría de las aristas
es exacta al bit y solo el empate de selección de lado de la etiqueta se resuelve
al revés con el entorno desplazado 1 ULP.

La pista de osage lleva el triple `polypoly` (`graphs-polypoly`,
`share-polypoly`, `windows-polypoly`; aceptado el 2026-07-11, análisis de causa raíz completo en
`.agent-notes/patchwork-tail-rca.md`): la única operación divergente es el
`cos(π+θ)` trascendente desnudo en un vértice de cuadrilátero distorsionado con orientación 180:
el `Math.cos` de V8 está correctamente redondeado mientras que el `cos` de la libm de Apple conlleva un
error de ±1 ULP dependiente del argumento (así que solo con libm se cumple `|cos(π+θ)| ≠
|cos(θ)|`); el delta de 1 ULP en el tamaño del nodo alimenta el `GRID`/`ceil` de pack, rompe un
empate de perímetro, y qsort coloca dos componentes en las celdas de empaquetado del otro:
un intercambio rígido de nodos enteros sin error de forma ni de enrutamiento. Ninguna
reescritura determinista puede reproducir una función trascendente de libm no correctamente
redondeada: la forma de manual de A9.

El mismo mecanismo se confirmó el 2026-07-28 en el hermano mayor
`tree-graphs-directed-polypoly` (`graphs/directed/polypoly.gv`, nuevo en el
universo de 905 elementos; 112 diferencias de operaciones de dibujo, solo osage). La operación divergente
es el mismo sitio de 1 ULP de `cos(π+θ)` del nodo `9004` (los valores `bb.x` de C y del port
coinciden con el análisis de causa raíz original byte a byte), pero en esta entrada de 76 nodos la
propagación pasa por `arrayRects` de osage: `acmpf` ordena las celdas de empaquetado
por la suma en bruto `width+height`, y la anchura un ULP mayor de libm hace que
`9004` se ordene estrictamente antes que sus hermanos rotados `9000/9002/9006`, mientras
que el valor correctamente redondeado de V8 deja un empate exacto a 4 bandas que el
qsort inestable ordena de otro modo: celdas distintas en orden de filas, un intercambio
`9002`/`9006` y una cascada de `fmax` de anchura de columna que desplaza 8 vecinos en x.
Dar al propio `arrayRects` del port los tamaños de nodo de C frente a los tamaños de nodo del port
reproduce los 10 nodos movidos del barrido con deltas de x coincidentes al byte,
cerrando la cadena causal.

Se rastrearon hasta su causa raíz y se aceptaron otras dos instancias de pista de motor el 2026-07-11
(análisis de causa raíz completo: `.agent-notes/circo-edge-tail-rca.md`): twopi `241_0` (6 diferencias de operaciones de dibujo:
el hermano de la entrada de circo de arriba: el mismo empate cocircular de incírculo de CDT,
invertido por 1 ULP de `sin`/`cos` de libm, hace que el corredor de multispline del port
tenga éxito con una spline de 14 puntos donde la compilación nativa
recurre al enrutamiento simple de 8 puntos; deltas de puntos < 0.07pt) y circo
`windows-tree` (10 diferencias de operaciones de dibujo en una arista de abanico: la trigonometría de colocación de circo
deja `node2.y` un único ULP por encima de `node8.y` en torno al
valor exactamente simétrico 18.0, y la selección de puerto de cabeza dyna de `closestSide` cambia TOP/BOTTOM en
ese empate exacto; las posiciones y cajas de nodos son por lo demás idénticas al bit a las del
oráculo).

**Pista de motor sfdp: empates de coma flotante en aristas (`42`, `241_0`).**
<a id="a9-sfdp-fp-ties"></a> La pista xdot de motor de sfdp (`parity-sfdp.json`,
`dot -Ksfdp -Txdot` nativo, ±0.5) hace aflorar el empate cocircular de incírculo de CDT una vez que
se inyectan las posiciones nativas exactas previas al enrutamiento (así que la divergencia NO es
deriva iterativa —véase la clase A1-drift— sino un empate de predicado discreto):

- `42` y `241_0`: empate cocircular de incírculo de CDT (el corredor de multispline).
  Con posiciones inyectadas, el residuo es un **cambio de recuento de segmentos**: `42`
  `opCount 5 vs 9` (arista 0->3) / `ptCount 32 vs 26` (3->7); `241_0` `ptCount 14
  vs 8` (arista 3->2): la diagonal de Delaunay restringida del port cambia respecto al
  oráculo, de modo que el corredor de multispline tiene éxito con una spline de N puntos donde la
  compilación nativa recurre a una ruta simple más corta (o viceversa), exactamente igual que
  la entrada `241_0` de twopi/circo de arriba. El port ya emula la contracción `fmadd` de arm64
  en el predicado de incírculo/`ccw` (`src/pathplan/triang.ts`,
  `src/common/fma.ts`) y usa Delaunay con incírculo robusto; el residuo es el
  1 ULP de `sin`/`hypot` de V8 frente a la libm de Apple en la entrada del predicado, que ningún código
  portable reproduce.

> **`2095` reclasificada de A9 a A1-drift (2026-07-22).** Antes figuraba
> aquí como «el hermano de hypot» (deriva inferior a 0.7pt en las aristas de un
> nodo de nombre vacío `""->"4"`). Ese residuo era un **artefacto del arnés**: la expresión regular
> `GVTS_POS` del inyector de atribución exigía ≥1 carácter de nombre, así que el nodo de nombre `""` nunca
> se inyectaba y arrastraba sus dos aristas incidentes. Con el inyector corregido para aceptar
> nombres vacíos (`(.+)`→`(.*)`, `src/layout/neato/splines.ts`), `2095` de sfdp
> se inyecta con **0 residuo**: pura deriva de fuerzas, cubierta por la clase A1-drift
> calculada, no un empate de coma flotante en el enrutamiento. Su aceptación por id se eliminó de
> `accepted-divergences-engines.json`. (Mismo hallazgo que `2095` de fdp, abajo.)

**Nuevo experimento controlado (2026-07-21).** Una sonda de `hypot` nativo frente a V8
(`plans/sfdp-tracked-divergences/batch-2/hypot-ulp-probe.txt`): compilar el
`hypot` de C del sistema y compararlo con `Math.hypot` de Node en entradas representativas
de desviación de arista plana muestra una discrepancia de 1 ULP en 2 de 6 (Δ 7.1e-15 y
5.7e-14): el filo de navaja del umbral de división que cambia el recuento de subdivisiones.
Irreducible: ningún `hypot` portable reproduce la libm de Apple (el precedente de
`arm-pow.ts` para el mismo límite). Aceptado a nivel de pista de motor mediante
`accepted-divergences-engines.json` (`sfdp.42`, `sfdp.241_0`).

La pista xdot de motor de **fdp** (`parity-fdp.json`, `dot -Kfdp -Txdot` nativo,
±0.5) hace aflorar el MISMO empate cocircular de CDT en el mismo grafo, `241_0`: con las
posiciones exactas previas al enrutamiento del oráculo inyectadas, el residuo son 11 diferencias numéricas de
`unfilled_bezier` confinadas a una arista (`0->1#0`, maxΔ 3.39pt). Como
las posiciones de nodos están inyectadas idénticas, la divergencia está aguas abajo en el
corredor de multispline de pathplan: el mismo empate de incírculo de 1 ULP de libm que en
`241_0` de twopi/circo/sfdp (incírculo en racionales exactos 185/185 más arriba). Las palancas ya
están aplicadas (`src/pathplan/triang.ts` fmadd, `src/pathplan/route.ts:198`
`Math.hypot`); el empate es irreducible. Aceptado mediante `accepted-divergences-engines.json`
`fdp.241_0`. `2095` de fdp, en cambio, es **A1-drift, no A9**: inyectar el
único nodo de nombre vacío (tras corregir el inyector de atribución para aceptar
nodos de nombre `""`) reduce su residuo a cero: la anterior «cola A9» era el
nodo vacío sin inyectar arrastrando sus aristas incidentes. La aceptación de `2095` de sfdp fue
el mismo punto ciego: una nueva regeneración de la atribución de sfdp (2026-07-22) con el
inyector corregido confirmó que también se inyecta a 0, y su aceptación se eliminó (véase la
nota `2095 reclassified` de arriba).

---

## Cola larga con seguimiento (atributos y casos límite de `dot`) {#tracked-long-tail-dot-attribute-edge-case}

Con los **valores predeterminados**, el motor `dot` coincide con el binario de C dentro de una
tolerancia determinista estricta en el corpus golden (el veredicto `conformant`; véase la nota
del principio). Las diferencias restantes son la **cola larga de atributos y
casos límite**, la parte históricamente difícil de cualquier port de Graphviz. A diferencia de los
deltas aceptados de arriba, estas *se* cerrarán; se siguen en vivo, con
recuentos, en
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md):

| Categoría | Qué difiere |
|---|---|
| **path-structure** | Enrutamiento de splines de aristas en configuraciones concretas (p. ej. algunos casos de aristas planas y de corredores densos). |
| **element-count** | Una característica que emite más o menos elementos SVG que C en ciertos grafos. |
| **color-stroke** | Diferencias de emisión de trazo/relleno para atributos de estilo concretos. |
| **parser-gap** | Un pequeño número de entradas DOT que el analizador aún no acepta del todo. |

Si tu grafo usa solo atributos comunes y el motor `dot`, casi con seguridad estás en la ruta de
coincidencia por tolerancia determinista. Si un diseño parece incorrecto, consulta `PARITY-dot.md` para
esa clase de entrada: es probable que sea un elemento con seguimiento y una misión de corrección fijada por el oráculo,
no una incógnita.

> **Nota sobre los casos dirigidos por etiquetas.** La clase de medición de texto (A2) está cerrada:
> ningún grafo `dot` está aceptado ya bajo ella. Un grafo que hoy se queda en
> structural-match es una carencia con seguimiento, no un delta de métricas de fuente.

### Puntas de flecha de aristas opuestas con `concentrate=true` {#concentrate-true-opposing-edge-arrowheads}

Cuando `concentrate=true` fusiona un par antiparalelo (`A->B; B->A`) en una sola
arista superviviente, esa arista debe dibujar una punta de flecha en **ambos** extremos. Esto está ahora
portado (la rama `conc_opp_flag` de `arrow_flags`; véase
`src/common/splines-clip.ts:arrowFlags`), de modo que `graphs-b135`, `167` y `2087`
coinciden (la divergencia `element-count` de punta de flecha ausente y su efecto secundario de `@d`
de spline sin recortar han desaparecido).

Algunos grafos con concentrate **conservan un residuo aparte, preexistente**, que la
corrección de la punta de flecha **no** resuelve: es un delta de posición de **coordenada x**
de nodos (simplex de red en x / puertos de brújula), no un defecto de punta de flecha:

- **`graphs-b15`, `graphs-b69`**: los grandes grafos de registros/clústeres «tipo ascensor».
  Concentrate se activa y fusiona correctamente; el residuo es un delta de ~1pt en la x de los nodos
  que se amplifica hasta una diferencia de `element-count`/`@d` de spline. La emisión de la
  punta de flecha en sí es ahora correcta (b69 recupera sus polígonos de punta de flecha ausentes). Véase
  la nota de agente `b69-concentrate-undermerge` para la causa raíz de la coordenada x.
- **`1453`**: sigue divergiendo por una causa de `element-count` de nivel superior sin relación
  con la punta de flecha de conc_opp_flag.
- **`2825`**: en el momento de esta corrección de la punta de flecha, divergía por una causa de
  `element-count` de nivel superior sin relación con conc_opp_flag (allí no se dispara
  ninguna fusión de pares opuestos); desde entonces se cerró con la misión fix-2825-rebuild-vlists,
  véase A4 arriba.

Estos son elementos de coordenada x / estructurales con seguimiento, **no** errores de puntas de flecha.

### Carencias de fidelidad de diseño de la misión de fidelidad 2.0 (neato, sfdp, fdp, twopi, circo) {#layout-fidelity-gaps-from-the-2-0-fidelity-mission-neato-sfdp-fdp-twopi-circo}

La misión de fidelidad 2.0 hizo que los valores de atributo no portados fallaran de forma ruidosa (véase la
tabla de `UNSUPPORTED_FEATURE` en
[Errores y excepciones](https://github.com/knowvah/dot-engine/blob/main/docs-site/guide/errors.md)).
Dejó lo siguiente, registrado en `plans/v2-fidelity/decision-journal.md`.

**Ruidoso, no portado.** `overlap=voronoi` con nodos solapados sigue lanzando
`UNSUPPORTED_FEATURE` en neato, twopi, circo y sfdp: el propio ajustador de Voronoi
(el algoritmo de `vAdjust`) no está portado. La prueba de solapamiento que decide
si se lanza el error es la propia de C (`countOverlap` sobre los polígonos de nodos de `poly.c`).

**Carencias conocidas, aún silenciosas.** El port renderiza estos casos sin error y
difiere de Graphviz nativo. Descubiertas por la misión `v2-silent-gaps`
(`plans/v2-silent-gaps/decision-journal.md`); no son deltas aceptados.

- **No se emite la advertencia «Unrecognized overlap value» de `getAdjustMode`.**
- **Los vértices de polígonos rotados pueden diferir del nativo en los últimos bits
  (irreducible: biblioteca matemática del host).** `poly_init` orienta cada vértice con
  `atan2`, `hypot`, `sin` y `cos`. Con entradas idénticas al bit, la libm de macOS y
  V8 devuelven últimos bits distintos (p. ej. `atan2(0x3fd6a09e667f3bce,
  0xbfd6a09e667f3bca)`: libm `…21d1`, V8 `…21d2`; `hypot` en el vértice siguiente:
  libm `…fffd`, V8 `…fffe`), así que una caja con `orientation=20` obtiene la y de vértice
  `-18` en el port y `-17.999999999999996` en nativo. El propio Graphviz nativo
  varía con la libm de la plataforma, y un navegador no puede llamarla. La aritmética propia del port
  coincide con la de C (orden de `RADIANS` fijado; 776 de 1664 coordenadas de vértice
  muestreadas son idénticas al bit, el resto difieren solo por libm). Efecto:
  los veredictos de `polyOverlap` de contacto exacto pueden cambiar; con vértices nativos todos los
  veredictos coinciden.
- **sfdp puede diferir del nativo en macOS (irreducible: `pow` de libm del host).**
  Diagnosticado con un sfdp nativo instrumentado: las posiciones se mantienen idénticas al bit
  hasta que un término de fuerza repulsiva, `pow(dist, 1 - p)` (`spring_electrical.c`,
  `p = -1`, así que `pow(x, 2)`), devuelve 1 ulp menos que `x*x` desde la libm de macOS
  (`pow(1.4116727416983157, 2)`: libm `1.9928199296540394`, correctamente redondeado
  `…396`; en macOS `pow(v, 2) != v*v` para 20 de 16201 `v` muestreados). Eso cambia
  el `Fnorm` de la iteración en el último bit; el enfriamiento adaptativo de sfdp lo amplifica
  hasta un diseño distinto (a menudo espejado). El `armPow` del port es el `pow` de las
  optimized-routines de ARM (glibc ≥ 2.28), es decir, lo que calcula Graphviz en Linux;
  el oráculo de macOS es el valor atípico. Descartado: la semilla (los valores explícitos de `start=`
  coinciden), `pcp_rotate` (la misma entrada da la misma salida), las posiciones y el
  término atractivo (idénticos al bit). Ejemplo: un triángulo solitario `a--b; a--c; b--c`
  con la semilla predeterminada.
- **fdp puede diferir del nativo por el `cos`/`sin` de libm del host.** fdp sigue a
  Graphviz posterior a 15.0.0 (repulsión por distancia hypot, `Mlimit`), con el `hypot` de la
  libm del host reproducido bit a bit (`src/common/libm-hypot.ts`, 0
  discrepancias en 400k muestras). 251 de las 252 entradas golden renderizables con fdp
  coinciden exactamente con la compilación nativa; la que queda
  (`parallel-cluster-ldbxtried`) coloca los nodos de puerto de clúster con
  `T_Wd * cos(alpha)`, y el `cos(-2.3840764867756761)` de la libm de macOS está a 1 ulp del
  `Math.cos` de V8; el bucle de fuerzas de fdp lo amplifica hasta unas 3 pulgadas. El `cos`
  de Apple no es reproducible con un modelo corto como sí lo es `hypot`.
- **Cuelgues nativos que el port define.** Graphviz nativo sale con 139 en neato
  con `mode=KK` y `model=mds` y una arista con `len` (`mds_model` indexa `GD_dist`
  con un número de secuencia basado en 1: desbordamiento de montón), y con `model=circuit` con un
  grafo desconectado. El port descarta las celdas fuera de rango en el primer caso y
  recurre a caminos más cortos en el segundo; no hay salida nativa con la que
  comparar.

---

## Deliberadamente no portado (no objetivos) {#intentionally-not-ported-non-goals}

Son límites de alcance deliberados, no errores. La biblioteca apunta a **SVG**
(más los formatos de texto intermedios `json` / `xdot` / `dot` / mapa de imagen).

- **Otros formatos de salida.** Los formatos ráster (PNG/JPG/GIF/WebP/BMP), PostScript/PDF/EPS
  y los backends gráficos/interactivos quedan fuera de alcance. Usa la salida SVG y convierte
  después si necesitas un ráster.
- **Paginación con `page=` para SVG.** El `dot` nativo tampoco pagina SVG (el
  dispositivo SVG no activa ningún indicador de paginación), así que `page=` no hace nada en esta ruta en ambas
  implementaciones; se documenta aquí solo porque es un punto habitual de
  confusión.
- **Salida de texto `-Tplain`.** Aplazada (un formato de texto fiel), no excluida.
- **`gvpr`** (el lenguaje de scripting para procesar grafos): fuera de alcance.
- **Envoltorios de conveniencia para C++** (`cgraph++`, `gvc++`): primero se porta la API de C;
  una capa de conveniencia idiomática en TypeScript, si se quisiera, sería un
  paquete aparte.
- **`fontnames=svg|ps` en la medición de texto del navegador.** En un navegador, el
  medidor de canvas construye su fuente a partir de la lista de familias `fontnames=native`
  del alias de PostScript (`Times-Roman` → `Times, serif`), la misma
  tipografía que el emisor de SVG renderiza por defecto. `TextMeasurer` no lleva
  contexto de grafo, así que los grafos que fijan `fontnames=svg` o `fontnames=ps` se miden
  con la lista nativa mientras que el SVG nombra la familia svg/ps. Los pesos de alias
  que CSS no define (`book`, `demi`, `light`, `medium`, `roman`)
  se emiten literalmente, como en C; los navegadores los ignoran y renderizan en
  peso normal, y el medidor mide en peso normal para coincidir. La salida de Node
  no se ve afectada (nunca usa el medidor de canvas).
- **Mecanismos solo nativos** sustituidos por equivalentes seguros para el navegador: la carga dinámica de
  complementos (`dlopen`) se sustituye por el registro estático de motores/renderizadores;
  las lecturas del sistema de archivos (fuentes, imágenes, configuración) se sustituyen por
  callbacks aportados por quien llama (p. ej. `setImageSizer`). El comportamiento se conserva; el mecanismo difiere.

---

## Informar de una divergencia {#reporting-a-divergence}

Si encuentras una salida que difiere de C y **no** es un delta aceptado de los de arriba,
no figura en `PARITY-dot.md` y no es un no objetivo, es un error que merece un informe: el código
fuente de C es la especificación, y las divergencias no listadas se tratan como defectos, no como
comportamiento aceptado.
