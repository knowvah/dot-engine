---
sourceHash: 9c653332a94ce7180323ec7cd584987db329e4217af01dd06692e410c0c22a8c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Conformidad: qué significa «coincidir» {#conformance-what-match-means}

@knowvah/dot-engine se valida frente al binario canónico de Graphviz en C, usado como oráculo.
Cuando este proyecto dice que un grafo **coincide** con C —el veredicto de paridad
llamado `conformant`—, se refiere a una propiedad concreta, comprobada de forma mecánica,
**no** a una igualdad literal, byte a byte, del texto del SVG.

> **Definición.** Un renderizado del port es **conforme** con el renderizado del oráculo cuando,
> tras analizar ambos SVG y convertirlos en un árbol de elementos normalizado:
>
> 1. todo valor **numérico** (coordenadas, datos de trazado, `points`, `viewBox`,
>    parámetros de `transform`) coincide con el del oráculo dentro de una
>    **tolerancia** fija, y
> 2. todo valor **no numérico** (nombres de etiqueta, colores, contenido de texto, claves
>    de atributo, valores enumerados de atributo) es **exactamente igual**.
>
> Si algún valor numérico supera la tolerancia, o algún valor no numérico difiere,
> el renderizado **no** es conforme.

## ¿Por qué no bytes literales? {#why-not-literal-bytes}

SVG serializa las coordenadas en coma flotante como texto decimal. Dos renderizados
matemáticamente equivalentes pueden diferir aun así en el último dígito impreso por el
redondeo de IEEE-754, el orden de las operaciones en coma flotante y el comportamiento de
`libm`/FMA según la plataforma, que varía con la CPU y el motor de JS. Por tanto, un
listón de bytes literales no sería simplemente estricto, sino **imposible de probar** en los
entornos de ejecución a los que se dirige esta biblioteca (navegadores, Node, distintas
CPU). La conformidad fija la propiedad que de verdad importa —la geometría y el contenido
que ve quien mira— en una cota lo bastante pequeña como para ser imperceptible.

## La tolerancia exacta {#the-exact-tolerance}

La tolerancia es **por clase de motor** y está definida en
[`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts):

| Clase | Tolerancia (pt) | Motores |
|---|---:|---|
| `deterministic` | **±0.01** | `dot`, `circo`, `twopi`, `osage`, `patchwork` |
| `iterative` | **±0.5** | `neato`, `fdp`, `sfdp` |

Los motores deterministas reproducen las coordenadas enteras/impresas de C prácticamente
al dígito, de modo que ±0.01 solo absorbe el ruido del formato decimal. Los motores
iterativos (dirigidos por fuerzas) dependen de funciones trascendentes cuyos resultados en
el último bit no son reproducibles entre plataformas, por lo que llevan una cota más
holgada y se comprueban además en cuanto a igualdad **estructural** (el mismo árbol de
elementos).

Una salvedad para la superficie **plain/plain-ext**: plain imprime las coordenadas en
pulgadas con 5 cifras significativas (`%.5g`), así que con magnitudes ≥ 100 el cuanto de
impresión (0.01) equivale a la tolerancia de ±0.01. En grafos muy grandes, una diferencia
de diseño inferior a un ULP que justo cruza un límite de redondeo de la 5.ª cifra se
imprime como un salto completo de 0.01 y se marca, aunque la geometría subyacente sea
idéntica hasta ~1e-11 pt (véase la aceptación de circo `2108`, diario 2026-07-28). Las
superficies xdot/json, que imprimen en puntos, son la comparación de geometría
autorizada en ese régimen.

El **sondeo de paridad del corpus** evalúa cada grafo en el modo `deterministic`
(±0.01) sea cual sea el motor; véase
[`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
(`diffVerdict` → `compareSvg(port, oracle, 'deterministic')`).

## Lee el código {#read-the-code}

La definición anterior no es una aspiración en prosa: es exactamente lo que hace el código
de comparación. Para comprobarlo tú mismo:

- [`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts)
  — `TOLERANCES` (la tabla ±0.01 / ±0.5) y `compareSvg`, que recorre los dos árboles
  normalizados y aplica, atributo por atributo, la regla (1) numérico-dentro-de-la-tolerancia
  y la regla (2) no-numérico-exacto.
- [`test/golden/normalize.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/normalize.ts)
  — cómo se analiza el SVG en bruto para obtener el árbol de elementos comparable.
- [`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
  — `diffVerdict`, que asigna uno de los veredictos siguientes. `survey.ts` cubre
  únicamente la pista SVG de `dot`.
- [`test/corpus/engine-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/engine-walk.ts)
  — el sondeo **xdot** por motor (`npx tsx test/corpus/engine-walk.ts <engine>`), que
  aplica la misma división de clases que la tabla anterior
  (`TOLERANCE = 0.5` para `neato`/`fdp`/`sfdp`, `0.01` para el resto de motores)
  y compara flujos semánticos de operaciones de dibujo (`compareXdot`) en lugar de SVG. Así
  se miden las pistas `circo`/`twopi`/`osage`/`patchwork`/`neato`/`fdp`/`sfdp`; la
  pista xdot propia de `dot` usa la herramienta hermana
  [`xdot-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/xdot-walk.ts).

## Los veredictos {#the-verdicts}

El sondeo asigna a cada grafo exactamente un veredicto. Recuentos en vivo por pista:
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)
resume todas las pistas motor × superficie (deterministas e iterativas por igual);
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
es el panel SVG de `dot`, y cada uno de los demás motores tiene su propio panel
`PARITY-<engine>.md` junto a él, en `test/corpus/`:

| Veredicto | Significado |
|---|---|
| **`conformant`** | Coincide con el oráculo según la definición anterior (numérico dentro de la tolerancia, no numérico exacto). |
| **`structural-match`** | Mismo árbol de elementos, pero uno o más valores numéricos superan la tolerancia. |
| **`diverged`** | Los árboles de elementos difieren (un elemento que falta o sobra, o una discrepancia no numérica). |
| **`errored` / `timeout`** | El port no pudo renderizar la entrada (`errored`; `port-error` en las pistas por motor) o superó su presupuesto de tiempo (`timeout`). Se puntúa como fallo: cuenta en el denominador del porcentaje de aciertos, nunca como acierto. |
| **`oracle-error`** | El oráculo en C no pudo renderizar la entrada, así que no hay referencia con la que comparar. Fuera de alcance: se excluye del denominador del porcentaje de aciertos. |

El **porcentaje de aciertos** de cada panel es `conformant / (surveyed − oracle-error)`.

«Conformant» es el listón; «structural-match» es un progreso significativo (forma correcta,
coordenadas que aún derivan); «diverged», «errored» y «timeout» son carencias reales.
Ninguno de ellos afirma una salida idéntica byte a byte.

Algunos grafos **no tienen ningún veredicto** con un motor determinado: véanse las
*exclusiones de motor* más abajo.

### Exclusiones de motor {#engine-exclusions}

Un par (grafo, motor) excluido no se recorre, así que no es ni conforme ni divergente:
sencillamente no se mide ahí. Esto es distinto de una divergencia aceptada, en la que la
comparación *sí* se hizo y la diferencia se perdona con una causa documentada.

El listón es deliberadamente alto, porque un grafo sin examinar es un hueco de cobertura y
no un coste conocido. Una entrada exige las tres condiciones: el algoritmo del motor no
puede, demostrablemente, entrar en juego con esa entrada; omitirla ahorra tiempo real; y el
mismo comportamiento está verificado en una pista más barata. Ser *lento* no basta en
absoluto: una mala proporción port/oráculo es justo el aspecto que tiene un defecto de
rendimiento genuino, y excluir por ella ocultaría exactamente aquello para lo que sirve el
corpus.

Cada exclusión figura con su mecanismo en
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md#engine-exclusions);
el registro es `test/corpus/engine-exclusions.json`. El caso que lo motivó es
`2222`, que declara 28 303 nodos y ninguna arista: al no haber nada que relacionar, todos
los motores dirigidos por fuerzas y radiales delegan en el empaquetador de componentes
compartido y ninguno de sus propios algoritmos se ejecuta, lo que se confirma porque sus
salidas del oráculo son idénticas byte a byte. `dot` sigue otro camino y lo cubre de forma
conforme en seis segundos.
