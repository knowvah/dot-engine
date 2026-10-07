---
sourceHash: 133104b64763457635328188088e909f4552d8353f4a7468655c540706263625
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# proc3d — a divergência canônica de métricas de fonte A2 (histórica) {#proc3d-—-the-canonical-a2-font-metric-divergence-historical}

::: tip Status: resolvido — o proc3d agora é conformante
Desde a troca para o `EstimateTextMeasurer` (`239c51b`, 2026-06-25), tanto o
port quanto o oráculo C headless medem o texto com o mesmo modelo
`estimate_textspan_size`.
Reexecutar a reprodução abaixo contra a árvore atual retorna **0 diferenças,
maxDelta 0** para `tests/graphs/proc3d.gv` — o delta documentado nesta página
não se reproduz mais. A classe A2 como um todo **colapsou** para as instâncias
proc3d do corpus; veja [Divergências conhecidas §A2](/pt-br/divergences#a2-text-measurement-font-metrics-label-driven-layout)
e [Paridade](/parity) para contagens atuais, não congeladas. Esta página é mantida como
a análise histórica da causa raiz — o mecanismo abaixo é real e instrutivo, ele
apenas não produz mais um delta observável neste grafo.
:::

O `proc3d` (`graphs-proc3d` / `share-proc3d` / `windows-proc3d`) era o caso
clássico de [métricas de fonte A2](/pt-br/divergences#a2-text-measurement-font-metrics-label-driven-layout):
uma diferença subpixel na medição de texto deslocava as posições x dos nós em
alguns pontos, deixando o grafo em **structural-match**. Esta página é a
análise independente referenciada pela lista de divergências, descrevendo *por que*
isso acontecia antes de os medidores serem unificados.

## Entrada {#input}

| | |
|---|---|
| **Mecanismo** | `dot` |
| **Fonte** | `tests/graphs/proc3d.gv` (do corpus de testes upstream do [Graphviz](https://gitlab.com/graphviz/graphviz/-/blob/main/tests/graphs/proc3d.gv)) — 443 linhas |
| **Atributos principais** | `fontname=Courier`, `orientation=land`, `size="10,7.5"`, `ranksep=1.0` |

## Por que divergia (causa raiz, na época) {#why-it-diverged-root-cause-at-the-time}

O layout de simplex de rede em x era fiel; a única diferença era que o
medidor de fontes do port daquela época reportava alguns **rótulos largos**
uma fração de ponto mais largos do que a medição do oráculo nativo, baseada em
FreeType. Os rótulos mais largos do proc3d são os ovais de caminhos de arquivo — por exemplo `/home/ek/work/src/lefty/lefty.c`,
exatamente a string que [`known-divergences.md` §A2](/pt-br/divergences#a2-text-measurement-font-metrics-label-driven-layout)
mediu em **+0.75 pt (+0.43%)**. Um rótulo mais largo gerava um nó um pouco mais largo,
cuja meia-largura alimentava as restrições de separação da esquerda para a direita arredondadas com `ROUND()`; o
simplex de rede então escolhia uma atribuição inteira de x ligeiramente diferente
(igualmente ótima). O resultado era um deslocamento em x quase uniforme de **≤ 3.55 pt** em um
desenho de ~2620 pt — ranque, ordem, topologia e coordenadas y idênticos. A correção
não foi um patch específico do proc3d: a troca para o `EstimateTextMeasurer` colocou os dois
lados no mesmo modelo de medição headless, o que eliminou a
diferença de superestimação de rótulos largos que causava esse deslocamento.

## O delta — golden vs. nosso, sobrepostos {#the-delta-—-golden-vs-ours-overlaid}

O golden (**verde**) e o nosso (**vermelho**) sobrepostos no mesmo quadro. Em escala
total eles se misturam em marrom — o deslocamento é imperceptível (daí
*structural-match*).

![Sobreposição golden vs. nosso do proc3d, desenho completo: verde = C, vermelho = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Ampliada, a franja verde/vermelha aparece **quase inteiramente nos longos rótulos ovais de
caminhos de arquivo** — exatamente as strings largas que o medidor superestima. Os
nós de código/caixa permanecem coincidentes:

![Sobreposição do proc3d ampliada nos ovais largos de rótulos de caminho: verde = C, vermelho = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

## Desenhos completos — golden primeiro, o nosso depois {#full-drawings-—-golden-first-ours-second}

| Golden — `dot` nativo | Nosso — @knowvah/dot-engine |
|---|---|
| ![proc3d renderizado pelo Graphviz em C](/img/proc3d-golden.svg) | ![proc3d renderizado pelo @knowvah/dot-engine](/img/proc3d-ours.svg) |

## Números (na época em que esta página foi escrita) {#numbers-at-the-time-this-page-was-written}

| métrica | valor |
|---|---|
| veredito | structural-match |
| maxDelta (port vs. nativo) | 3.55 pt |
| rótulos deslocados em x | 73 / 73 (quase uniforme) |
| extensão x do desenho | ~2620 pt → o deslocamento é 0.13% |
| ranque / ordem / topologia / y | idêntico ao C |

**Números atuais** (reverificados contra a árvore ativa): veredito
**conformant**, 0 diferenças, maxDelta 0 — veja a nota de status no topo desta
página. As imagens de sobreposição acima são mantidas como um instantâneo do mecanismo, não
como uma comparação ao vivo.

## Reproduzir {#reproduce}

O oráculo nativo roda sob o `GVBINDIR` headless (`/tmp/ghl`, de
`test/corpus/gen-headless-gvbindir.sh`) para que os dois lados usem o mesmo
medidor `estimate_textspan_size` — veja
[§A2 “Isolating the algorithm from the font backend”](/pt-br/divergences#a2-text-measurement-font-metrics-label-driven-layout).

```sh
# port
GV_TEXT_MEASURER=estimate \
  npx tsx test/corpus/render-one.ts ~/git/graphviz/tests/graphs/proc3d.gv dot

# native C oracle (headless, estimate measurer)
GVBINDIR=/tmp/ghl \
  ~/git/graphviz/build/cmd/dot/dot -Tsvg ~/git/graphviz/tests/graphs/proc3d.gv
```

Executar isto hoje produz SVGs correspondentes (0 diferenças na tolerância
`deterministic` de ±0.01) em vez do delta de 3.55pt descrito acima.
