---
sourceHash: 292491e2ebc9280dc60b10bc0e3f5bd75e3bf355f8e732d90f86b8fa35a07f40
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Divergências conhecidas em relação ao Graphviz em C {#known-divergences-from-c-graphviz}

O @knowvah/dot-engine busca a maior fidelidade possível à implementação canônica
em C. O código-fonte em C é a especificação; uma diferença não listada é
tratada como defeito, não como comportamento aceito.

> **O que “corresponder” significa aqui.** O veredito de paridade do corpus
> chamado `conformant` é uma **tolerância determinística estreita**, *não* a
> igualdade literal, byte a byte, do SVG: as coordenadas numéricas e os caminhos devem
> concordar dentro de **±0.01**, e todo o conteúdo não numérico (tags, cores,
> texto) deve ser exatamente igual
> (`compareSvg(…, 'deterministic')`). Ao longo deste documento, “corresponder” e
> “conformante” referem-se a esse veredito de tolerância. Definição completa:
> [Conformidade](./conformance.md).

Quando a saída *de fato* difere, ela se enquadra em exatamente uma de três classes:

1. **Deltas aceitos** — diferenças que investigamos, entendemos até a causa
   raiz e **escolhemos deliberadamente não tornar conformantes**. Cada uma é limitada,
   caracterizada e justificada abaixo. Elas não são bugs e não serão
   “corrigidas” sem um motivo específico, definido separadamente.
2. **Cauda longa rastreada** — lacunas conhecidas que *serão* fechadas, cada uma com uma
   correção fixada no oráculo. Elas ficam, com contagens atuais, em
   [`test/corpus/PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md).
3. **Não objetivos** — limites de escopo intencionais (formatos e mecânicas que nunca
   nos propusemos a reproduzir).

Os registros autoritativos, atualizados continuamente, são
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
(painel de paridade por entrada em relação ao `dot` nativo) e
[`plans/port-catalog/README.md`](https://github.com/knowvah/dot-engine/blob/main/plans/port-catalog/README.md)
(inventário do status do port em nível de algoritmo).

A fonte da verdade **legível por máquina** sobre quais grafos são *aceitos* (classe 1
abaixo) é
[`test/corpus/accepted-divergences.json`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/accepted-divergences.json).
As ferramentas o cruzam no momento do relatório: o `PARITY-dot.md` separa os **deltas aceitos**
do backlog **rastreado**, e o portão de regras obtém sua lista de permissões a partir dele. As
seções em prosa abaixo explicam cada entrada (A1 e A3 estão ativas; A2 está encerrada e
mantida como histórico); um teste de CI (`accepted-divergences.test.ts`) garante que
todo grafo aceito ainda diverge, de modo que esta lista não pode apodrecer em silêncio.

---

## Deltas aceitos (deliberadamente não os tornamos conformantes) {#accepted-deltas-we-deliberately-do-not-make-conformant}

Aceitamos um delta — em vez de perseguir a paridade byte a byte — somente quando **todas** as
condições a seguir são atendidas:

- A causa raiz é uma **restrição de portabilidade** (algo que o ambiente de execução
  JavaScript/navegador não consegue reproduzir exatamente), não um erro de lógica no port.
- A diferença é **imperceptível** e comprovadamente **limitada**.
- Uma correção teria **custo e raio de impacto desproporcionais** em relação à
  recompensa (tipicamente: tocaria uma primitiva compartilhada usada por centenas de
  grafos já conformantes, arriscando regressões por um ganho de uma fração de pixel).

Quando aceitamos um delta, nós o caracterizamos aqui para que quem consome nunca seja surpreendido.
Os grafos afetados por um delta aceito são validados contra um critério **estrutural /
de tolerância** em vez de um critério de bytes.

### A1. Determinismo de ponto flutuante (mecanismos baseados em forças) {#a1-floating-point-determinism-force-directed-engines}

**Afetados:** `neato`, `fdp`, `sfdp`, `circo`, `twopi`, `osage` (os mecanismos iterativos,
de modelo de molas). O *layout* do mecanismo `dot` **não** é afetado por esse
determinismo de modelo iterativo; um delta de ponto flutuante separado e estritamente
limitado no roteamento de splines do `dot` é tratado em **A3** abaixo.

> **Escopo, historicamente uma ressalva não medida — agora parcialmente medida.** A
> **pesquisa SVG principal do mecanismo dot** (`test/corpus/survey.ts`) ainda é
> **somente dot**: o oráculo nativo roda sob `GVBINDIR=/tmp/ghl`, que cria
> links simbólicos **apenas** para os plugins `core` + `dot_layout`
> (`test/corpus/gen-headless-gvbindir.sh` percorre exatamente `core dot_layout`
> — nenhum plugin de layout `neato`/`fdp`/`circo`/`twopi`/`osage`/`sfdp` está presente),
> e tanto o oráculo quanto o port são invocados com o mecanismo `dot`. Assim, ids do corpus
> como `*_neato` / `*_circo` / `root_twopi` são *nomes de arquivo* dispostos com
> `dot` nessa pesquisa, não com o seu mecanismo nativo, e A1 corresponde a **zero**
> grafos ali — não porque os mecanismos tenham se mostrado conformantes, mas porque
> aquela pesquisa em particular nunca os exercita.
>
> **Mas os seis mecanismos de A1 agora têm sua própria pesquisa com o mecanismo nativo**, via
> `test/corpus/engine-walk.ts` + `parity-report.ts` (independente de `GVBINDIR` —
> cada um executa `dot -K <engine> -Txdot` diretamente), em dois níveis diferentes de
> rigor documentados separadamente abaixo: `circo`/`twopi`/`osage` rodam com a mesma
> tolerância **determinística de ±0.01** da pesquisa do dot, com triagem de causa raiz por id
> (“Aceitação na trilha de mecanismo” abaixo); `neato`/`fdp`/`sfdp` rodam com uma
> tolerância de **caracterização de ±0.5** mais frouxa, ainda sem triagem por id
> (“Caracterização dos mecanismos iterativos” abaixo). Números atuais entre mecanismos:
> [`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md).

**Caracterização.** Esses mecanismos executam layouts numéricos iterativos cujos resultados
dependem do arredondamento de ponto flutuante — especificamente multiplicação-adição fundida (FMA) e
`Math.pow`, que podem diferir entre mecanismos JavaScript e arquiteturas de CPU. O
port acompanha a ordem das operações do C sempre que possível (`src/common/fma.ts`,
`src/common/arm-pow.ts`) — por exemplo, o `sfdp` se fixa em ~6 dígitos significativos em relação ao
oráculo nativo, com um PRNG equivalente e `fma` — mas a reprodução exata, com coordenadas
idênticas, **não é garantida entre plataformas**. A topologia é preservada; a
divergência potencial está nas coordenadas finas dos nós.

**Por que aceito.** Esta é uma restrição rígida de executar em JS, não uma escolha de projeto
— da mesma família que a sensibilidade ao `hypot` da Apple em A3. Não há como garantir
resultados transcendentes/FMA idênticos bit a bit em todos os ambientes de execução visados, de modo que um critério
de bytes seria impossível de testar, e não apenas caro. **Avaliar A1** (em vez de
apenas ressalvá-lo) exigiu uma trilha de paridade separada com o mecanismo nativo — construída
em 2026-07-11 como `test/corpus/engine-walk.ts` + `parity-report.ts`, examinando cada
entrada sob o seu próprio mecanismo em vez de `dot`. O teto honesto desse trabalho é
**estreitar** A1 para “nenhuma divergência ativa na plataforma de referência”, nunca
eliminar a ressalva entre plataformas; os resultados até agora (abaixo) respeitam esse
teto: `circo`/`twopi`/`osage` fizeram emergir e tiveram a causa raiz identificada em um punhado
de instâncias genuínas de A1/A9, e `neato`/`fdp`/`sfdp` agora estão em 90.8/77.5/68.0%
dentro de 0.5pt do nativo no universo de 910 itens, o que significa que a aritmética
portada (`fma.ts`, `arm-pow.ts`, PRNG equivalente) se sustenta na maioria dos grafos —
e todo id divergente restante é atribuído individualmente por injeção (deriva do solver
vs. defeito do port) em vez de ser deixado como deriva sem triagem; veja a
caracterização dos mecanismos iterativos abaixo.

**Aceitação na trilha de mecanismo: família de setas do twopi.** <a id="a1-twopi-arrows-family"></a>
O bloco de citação acima descreve a pesquisa SVG do mecanismo dot, na qual A1 corresponde a zero
grafos; a **trilha xdot de mecanismo** separada do `twopi` (`parity-twopi.json`, oráculo nativo
`dot -K twopi -Txdot`, `test/corpus/engine-walk.ts`) *de fato* roda sob o seu
mecanismo nativo e faz emergir uma instância concreta e verificada de A1 em 9 ids do corpus:
`graphs-arrows`, `graphs-newarrows`, `graphs-arrowsize`, `linux.x86-arrows_dot`,
`macosx-arrows_dot`, `nshare-arrows_dot`, `share-newarrows`, `windows-newarrows`
e (adicionado em 2026-07-28, novo no universo de 905 itens) o irmão de directed/
`tree-graphs-directed-oldarrows` — cada um divergindo em uma única aresta dominante
(`Z->I` ou `i->Z`; 12–64 diferenças de operações de desenho). A injeção A/B (diário de decisões, 2026-07-10, entrada “injection A/B verdicts:
twopi arrows family EXONERATED...”) provou o mecanismo diretamente:
despejar o `ND_pos` de entrada do `spline_edges` nativo e injetá-lo no
`splineEdgesShifted` do port produz uma saída **totalmente conformante** em
`graphs-arrows` (`Z->I` torna-se idêntica byte a byte à do oráculo, mesma
spline de 7/14 pontos) — portanto a divergência é 100% deriva de posição de nós
pré-roteamento vinda do solver de remoção de sobreposição PRISM do `twopi`, e o
roteamento/emissão de splines do port está exonerado. O sintoma visível em 6 dos 8 ids
é uma inversão da contagem de pontos da bézier (`unfilled_bezier[ptCount]: 8 vs 14`): a
contagem de peças ajustadas do `Proutespline` é sensível a de que lado do limite de
um obstáculo a posição de nó deslocada cai, de modo que uma diferença de posição
abaixo de 1 ULP, a jusante da solução iterativa do PRISM, inverte a contagem de segmentos da spline ajustada (os outros 2 ids,
`graphs-arrowsize`/`nshare-arrows_dot`, mostram a mesma deriva como um delta menor
apenas de posição, sem inversão da contagem de peças). Aceito no nível da
trilha de mecanismo via `test/corpus/accepted-divergences-engines.json`, cruzado com
`PARITY-twopi.md` pelo `parity-report.ts` — o mesmo cruzamento que o `accepted.ts` faz
para o `PARITY-dot.md` da trilha dot.

A análise de causa raiz de `oldarrows` (2026-07-28) identificou o ponto exato da inversão
do sintoma de contagem de pontos da família. Seu leque `i`–`Z`–`I` é colinear em um diâmetro do anel, e
o `intersect()` do `directVis` do pathplan bloqueia uma linha de visada quando um vértice de obstáculo
está “sobre” o segmento — onde a tolerância de colinearidade de 1e-4 do `wind()`
faz até um nó a 270pt do segmento contar como colinear, e o
`inBetween()` (que presume colinearidade) então degenera para testar apenas a
**projeção em x**: o vértice bloqueia se e somente se o seu x cair estritamente dentro do
intervalo de largura de 1 ULP entre as coordenadas x das duas extremidades. Qual das duas
arestas radiais espelhadas se curva depende, portanto, da ordenação no último ULP de
três valores x nominalmente iguais vindos da solução do PRISM — o C curva `Z->I`
(o vértice de eixo do nó `i` cai dentro do seu intervalo), o port curva `i->Z`
(o vértice do nó `I` cai dentro do seu próprio). Replicar o `directVis` offline no
conjunto de obstáculos despejado de cada lado reproduz exatamente a decisão de cada lado,
e injetar o `ND_pos` pré-roteamento do oráculo no port resulta em 0 diferenças
(`attribution-twopi.json`) — roteamento e emissão são fiéis byte a byte.

`1855` é a variante **espelhada** radial/estrela do mesmo mecanismo de ponto flutuante do PRISM
pré-roteamento (aceita em 2026-07-11): suas 31 folhas são exatamente cocirculares, de modo que o
layout em estrela é simétrico por reflexão e a remoção de sobreposição do PRISM repousa em um
equilíbrio instável por simetria; uma diferença de 1 ULP entre o `cos`/`sin` do V8 e o da libm em 5
ângulos de folhas no `setAbsolutePos` do `circleLayout` seleciona a bacia espelhada oposta,
e todo o layout radial termina como o espelho exato, no eixo x, do
do oráculo (deslocamento máximo de nó de 6.04pt, bb preservada). A injeção A/B provou
as duas direções: alimentar o PRISM do port com as posições exatas do `circleLayout` do C reproduz o oráculo nó a nó (3e-14), e restaurar apenas as 5
posições de folhas divergentes em 1 ULP inverte todo o layout de volta para o espelho
do port. Análise de causa raiz completa: `.agent-notes/twopi-radial-drift-rca.md` (diário de decisões
2026-07-11).

**Caracterização dos mecanismos iterativos: neato/fdp/sfdp.** <a id="a1-iterative-characterization"></a>
Diferentemente das trilhas de mecanismo `circo`/`twopi`/`osage` acima, `neato`/`fdp`/`sfdp`
**ainda não** passaram por triagem por id — o `engine-walk.ts` registra um campo `tolerance: 0.5`
para esses três e o `parity-report.ts` os apresenta em uma seção separada,
“Iterative engines (±0.5 characterization)”, do
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md),
explicitamente **não** comparável às taxas de aprovação determinísticas de ±0.01 em outras partes
deste documento. Contagens atuais (universo de 910 itens; a % de aprovação deixa de fora
entradas que o oráculo C não consegue renderizar, conforme [Conformidade](./conformance.md)):

| mecanismo | examinados | dentro de ±0.5pt | não conformantes (todos atribuídos, aceitos) | erro do port / timeout | erro do oráculo |
|---|---:|---:|---:|---:|---:|
| `neato` | 910 | 826 (90.8%) | 83 | 1 | 0 |
| `fdp`   | 910 | 703 (77.5%) | 204 | 0 | 3 |
| `sfdp`  | 910 | 619 (68.0%) | 290 | 1 | 0 |

(A primeira varredura, em 2026-07-11 com 762 itens, mediu 263/311/260 dentro de
±0.5pt — o salto para as taxas atuais veio de correções por id feitas desde então,
principalmente o tratamento não portado de `user_pos`/`P_SET` do neato, a consolidação da
inicialização de mecanismos e a correção de macro vs. função em `setEdgeType`.)

Diferentemente da primeira varredura, toda linha divergente agora é atribuída individualmente:
o harness de injeção (`test/corpus/attribute-divergence.ts`) alimenta o
`ND_pos` pré-roteamento do oráculo nativo no port e compara de novo, e
todo id divergente atual é `drift-exonerated` (o roteamento e a emissão do port
reproduzem exatamente o oráculo assim que a deriva do solver é removida)
ou um dos poucos resíduos por id aceitos separadamente (o empate de incírculo do CDT de `241_0`
nos três mecanismos, `2239` do neato, `42`/`2556` do sfdp).
A aceitação de classe abaixo formaliza o conjunto exonerado; contagens atuais nos
painéis de cada mecanismo
([`PARITY-neato.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-neato.md),
[`PARITY-fdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-fdp.md),
[`PARITY-sfdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-sfdp.md)).

**Aceitação da classe A1-drift (mecanismos iterativos, pertinência calculada).**
<a id="a1-drift-iterative-engines"></a> `test/corpus/accepted-divergences-engines.json`
traz uma entrada de **classe** `"A1-drift"` por mecanismo iterativo (`neato`,
`fdp`, `sfdp`) — `{ class: true, attributionFile, ref }` — distinta das
entradas por id usadas pelas trilhas `circo`/`twopi`/`osage` acima (D2,
`plans/iterative-parity-campaign/decisions.md`). Diferentemente de uma entrada por id, a pertinência
à classe nunca é enumerada à mão no registro: o `parity-report.ts`
a calcula no momento do relatório a partir do `attribution-<engine>.json` correspondente
(o harness de atribuição por injeção de T1, `test/corpus/attribute-divergence.ts`)
— todo id divergente cujo `ND_pos` pré-roteamento nativo foi injetado no
port e comparado de novo, passando a conformar em ±0.5, recebe `verdict: 'drift-exonerated'` nesse
arquivo, o que significa que os solvers iterativos dos dois mecanismos convergiram para
layouts numericamente diferentes, mas cada um internamente consistente (uma diferença de acúmulo de
ponto flutuante conforme a caracterização de A1 acima, não um bug de roteamento
ou emissão do port). A evidência por id — formato do bucket, contagem de diferenças base vs. injetada,
detecção de translação uniforme/espelhamento — fica no próprio
artefato de atribuição, não duplicada neste documento nem no registro (D2). Um id
que depois passe a ser aprovado de vez, ou cuja nova atribuição mude o veredito,
sai da classe automaticamente na próxima regeneração do relatório — nenhuma edição de aceitação
obsoleta é necessária, e nenhuma falha de teste de guarda. Mecanismos cujo
`attribution-<engine>.json` ainda não foi gerado exibem a classe como
“attribution pending” com zero membros, idêntico a não ter nenhuma aceitação —
a entrada de classe pode preceder seus dados (veja
`test/corpus/accepted-divergences-engines.test.ts`).

### A2. Medição de texto (métricas de fonte) → layout dependente de rótulos — ENCERRADA <a id="a2-text-measurement-font-metrics-→-label-driven-layout-—-closed"></a> {#a2-text-measurement-font-metrics-label-driven-layout}

**Status (2026-07-01): encerrada.** Nenhum id do corpus é aceito sob esta classe
atualmente; a seção é mantida como documentação histórica do
mecanismo e do ponto de extensão `TextMeasurer` injetável que o neutralizou.
Correções sucessivas na medição de texto (a troca para o `EstimateTextMeasurer`,
métricas verticais sensíveis à fonte, a correção dos bytes UTF-8 não ASCII) resolveram quase
todas as divergências de layout dependentes de rótulos que costumavam viver aqui. O **`proc3d`** —
o antigo exemplo canônico de A2 — é totalmente **`conformant`** nos três
diretórios do corpus (`graphs-`/`share-`/`windows-proc3d`): bbox correspondente, zero
diferenças em dados de caminho, zero diferenças em âncoras de rótulo.

**Os últimos membros foram aposentados (2026-07-01).** A **família `NaN`**
(`graphs-NaN` / `share-NaN` / `windows-NaN`) foi mantida aqui muito depois de a sua
geometria de nós já corresponder exatamente ao C (76/76 pontos de referência). Seu
resíduo real — 8 extremidades de arestas retas em quatro pares opostos de ciclos de 2
(`Target↔TThread`, `Interp↔InterpF`, `Event↔Target`,
`AtomProperties↔NRAtom`) deslocadas 6–14 pt — foi rediagnosticado e revelou-se
**nenhum efeito de métrica de fonte**, mas dois defeitos do port no
roteamento de múltiplas arestas do dot (missão `plans/fix-nan-a2-retire/`,
`.agent-notes/nan-edge-endpoint-diagnosis.md`):

1. **Ordem das pistas de pares opostos.** O port reordenava cada grupo de
   arestas paralelas pela sequência original de criação antes de atribuir os deslocamentos de pista do Multisep; o C
   atribui as pistas na ordem coletada pelo edgecmp (representante direto de MAINGRAPH
   primeiro, membro invertido de AUXGRAPH em segundo — `dotsplines.c:419`,
   `make_regular_edge:1885-1907`). Um ciclo de 2 cujo membro invertido foi declarado primeiro
   desenhava cada aresta no corredor de 18 pt da outra.
2. **Adjacência plana espúria em arestas mescladas entre ranques.** O `markAdjacent`
   marcava entradas de `ND_other` sem a guarda de mesmo ranque do C
   (`flat.c:272-276`), deixando o curto-circuito de adjacência plana do `groupSize`
   engolir as quebras de grupo do portcmp.

Com os dois corrigidos fielmente, a família é **`conformant`** nos três
diretórios (por elemento: 0 nós, 0 arestas diferentes), e o mesmo mecanismo
fechou `42`, `clust2`, `ngk10_4` (structural-match → conformant) e moveu
`b124` de diverged para structural-match — todos em pares de ciclos de 2/paralelos.

**Os dois lados da pesquisa executam o mesmo estimador — a medição está neutralizada.**
O oráculo `dot` nativo roda sob um `GVBINDIR` headless
(`test/corpus/gen-headless-gvbindir.sh` → `/tmp/ghl`) que cria links simbólicos apenas para os
plugins `core` e `dot_layout` — nenhum plugin de layout de texto `gd`/`pango`/`quartz`.
Com esse espaço vazio, o graphviz recorre ao seu
`estimate_textspan_size` embutido. O `EstimateTextMeasurer` do port em TypeScript
(`src/common/textmeasure.ts`) é um port fiel da mesma rotina e é
o padrão no Node, resolvido por `createMeasurer()`
(`src/common/textmeasure-factory.ts`). **Os dois lados de toda comparação de
paridade, portanto, medem o texto com o estimador idêntico** — os avanços reais de glifos
do FreeType/pango nunca entram na comparação. É por isso que uma regressão de veredito aqui
aponta para o código de layout, e não para uma fonte, e é por isso que
corrigir os próprios bugs do estimador (contagem de bytes UTF-8, sensibilidade à fonte
das métricas verticais) fechou a maior parte desta classe de uma vez, em vez de apenas
estreitar uma lacuna de métricas de fonte.

**O ponto de extensão `TextMeasurer` injetável.** Essa neutralização só é possível
porque a medição de texto é um ponto de extensão deliberado, não fixada em nenhum dos
mecanismos. O `TextMeasurer` é uma interface de um único método (`measure(text, font, size,
flags) → {w, h, …}`) injetada por dependência em todo ponto de chamada que dimensiona rótulos —
`polyInit`, `recordInit`, `initEdgeLabels` e `buildNodeLabel` recebem cada um o
medidor como parâmetro; nada mede texto por meio de um global. Ele é
fixado para testes/CI via `setTextMeasurer(...)` ou `GV_TEXT_MEASURER=estimate`.
O ponto de extensão também permite *provar* que um resíduo é apenas de medição: alimentar o port com as
larguras exatas que o C mediu (capturadas do oráculo) e verificar se o layout
então reproduz o C exatamente. Esse experimento foi o que originalmente licenciou o
veredito A2 para o `proc3d` (veja o apêndice histórico abaixo) — a técnica
continua válida. Seu inverso aposentou a classe: como a medição estava
comprovadamente neutralizada nos dois lados da pesquisa, o resíduo de arestas do `NaN` não podia
ser um efeito de métrica de fonte, o que forçou o rediagnóstico que encontrou os dois
defeitos de roteamento acima.

::: details Análise histórica (substituída em 2026-06-30) — mantida para registro
O material abaixo descreve um estado anterior desta classe, antes de a troca para o
`EstimateTextMeasurer`, as métricas verticais sensíveis à fonte e a
correção dos bytes UTF-8 não ASCII terem fechado a maior parte dela. Ele não descreve mais o comportamento
atual — é mantido apenas para que o raciocínio que levou até aqui não se perca. Em
particular: (1) os números de largura do “C nativo” na tabela de medição abaixo
são valores do **FreeType**, de um caminho de renderização com fontes reais; a pesquisa de paridade
nunca exercita esse caminho — os dois lados executam `estimate_textspan_size` (veja
acima) — portanto a tabela não reflete como a paridade é medida atualmente; (2)
as figuras de sobreposição e as renderizações golden/nosso abaixo retratam um `proc3d` **fora do corpus**
(`graphs/directed/proc3d.gv`, ~2620 pt) que não faz parte da
pesquisa de paridade; as variantes `proc3d` do corpus agora são conformantes com zero
diferenças, portanto não há sobreposição a mostrar para elas; (3) a narrativa de
x dos nós de `NaN`/`ratio=compress` abaixo está superada — a medição atual mostra que todos os 76 pontos de nós
correspondem exatamente, de modo que a cadeia erro de largura → deslocamento de nó que ela descreve não
vale mais para `NaN`.

**`NaN` sob `ratio=compress` (histórico).** A
família `NaN.gv` (`orientation=landscape; ratio=compress; size="16,10"`) era um
caso A2 cujo veredito na época caía em *diverged* em vez de
*structural-match*. O caminho do simplex de rede em x com compress era fiel — toda
entrada de restrição correspondia ao C (valor da restrição de largura, minlens de `containNodes`,
contagens de arestas auxiliares 471/peso 1612, `lrBalance` e todas as ordens de ranque idênticos)
*exceto* as meias-larguras de 9 nós, que o medidor reportava 0.5–1.03 pt
mais largas que no C. O empacotamento de peso 1000 do `ratio=compress` tornou as restrições de separação da esquerda para a direita,
normalmente folgadas, **ativas**, de modo que esse erro de largura subpixel — invisível sem compress — emergiu como um
deslocamento interno em x de −3..−5 pt. Esse deslocamento empurrou a spline reta `Target<->TThread` 0.55 pt
além de uma parede de caixa de nó, de modo que o roteador a dobrou em uma peça bézier extra (7
pts contra 4 do C) — um delta *estrutural*, daí *diverged*. Forçar as 9 larguras
para os valores do C reproduziu o C exatamente (x dos nós 53/76→0/76 fora; spline 7→4 pts),
confirmando que o resíduo era 100% métricas de fonte a montante, não o código de compress nem o de
splines, **para aquela divergência anterior**. Evidência completa (com uma comparação visual lado a lado
golden-vs-nosso + a sobreposição do delta de spline de 4 vs. 7 pontos):
`plans/fix-compress-xcoord/comparisons/nan-compress-xcoord.html` (texto
em prosa: `…/nan-compress-xcoord.md`).

**Exemplo de medição de métricas de fonte (histórico — FreeType vs. estimativa).**
O Graphviz nativo, quando executado com um plugin real de layout de texto (não o oráculo
headless usado pela pesquisa de paridade), mede o texto com avanços de glifos do FreeType/libgd.
O `EstimateTextMeasurer` do port não replica um rasterizador de glifos. Para a maioria das strings os dois concordam exatamente; para algumas, diferem por
uma fração de ponto. Exemplo medido — Times-Roman 14 pt, a string
`"/home/ek/work/src/lefty/lefty.c"` (31 caracteres):

| | largura |
|---|---|
| C nativo (FreeType) | 176.00 pt |
| @knowvah/dot-engine (estimativa) | 176.75 pt |
| delta | **+0.75 pt (+0.43%)** |

A outra linha de rótulo do mesmo nó, `"93736-32246"`, foi medida de forma **idêntica**
(96.00 pt nos dois) — o erro depende da string e se acumula por glifo,
não é um fator de escala uniforme. Essa diferença entre FreeType e estimativa é real, mas
**não** é o que a pesquisa de paridade mede (os dois lados executam `estimate`); só
importaria se a saída do @knowvah/dot-engine fosse comparada com uma renderização em C com fontes
reais fora desta pesquisa.

**Efeito a jusante na antiga divergência do `proc3d` (histórico).** A largura
do rótulo alimenta o tamanho do nó, que alimenta o layout:

1. Um rótulo mais largo → uma caixa de nó um pouco mais larga (para um nó *elipse*, a largura é
   ainda multiplicada por √2, de modo que +0.75 pt de texto → +0.53 pt de meia-largura).
2. As meias-larguras dos nós definem as restrições de separação da esquerda para a direita do
   simplex de rede de coordenadas x; essas restrições são arredondadas com `ROUND()` para
   inteiros, de modo que uma mudança subpixel de largura pode fazer uma restrição passar de *N* para
   *N+1*.
3. O simplex de rede então seleciona uma atribuição inteira de x diferente — mas igualmente ótima —,
   deslocando algumas posições x de nós em 1–2 unidades.

Para o `proc3d.gv` fora do corpus (`graphs/directed/proc3d.gv`, ~2620 pt, não membro da
pesquisa de paridade), isso produziu uma diferença de **≤ 3.55 pt** na extensão x
(**0.13%**), sobreposta abaixo — **verde = `dot` nativo em C (golden), vermelho =
@knowvah/dot-engine (nosso)**:

![Sobreposição golden vs. nosso do proc3d: verde = C, vermelho = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Ampliada, a franja aparecia quase inteiramente nos longos rótulos ovais de
caminhos de arquivo:

![Sobreposição do proc3d, ampliada nos ovais largos de rótulos de caminho: verde = C, vermelho = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

| Golden — `dot` nativo | Nosso — @knowvah/dot-engine |
|---|---|
| ![proc3d renderizado pelo Graphviz em C](/img/proc3d-golden.svg) | ![proc3d renderizado pelo @knowvah/dot-engine](/img/proc3d-ours.svg) |

A análise independente (causa raiz, números por métrica, comando de reprodução)
está em uma página própria:
[**proc3d — a divergência canônica de métricas de fonte A2 (histórica)**](/pt-br/divergences-proc3d-a2).
Essa página descreve uma divergência resolvida em uma entrada fora do corpus; as variantes
`proc3d` atuais do corpus são conformantes.

**Por que isto foi aceito na época.** Igualar byte a byte os avanços por glifo do FreeType
em toda fonte e string exigiria replicar suas tabelas de métricas, hinting e arredondamento — algo grande, frágil e ainda
sem garantia de exatidão. O medidor de texto é uma primitiva compartilhada: todo rótulo do
corpus passa por ele, de modo que uma correção voltada a uma string arriscava causar regressão em
outras por uma recompensa imperceptível.
:::

### A3. Desempate de `hypot` no roteamento de splines (`dot`) {#a3-hypot-tie-break-in-spline-routing-dot}

**Afetados:** grafos `dot` com um canal de roteamento de arestas **geometricamente
simétrico** — tipicamente um arco curto e simétrico de aresta plana. Exemplo observado: `2368`,
que permanece em *structural-match* (maxΔ ≈ 10.2 pt em **uma** aresta, `376->76`).
O mesmo desempate também aparece em uma aresta **longa** (de vários ranques) que chega a um
hub de alto fan-in quando o corredor é exatamente simétrico em espelho: `graphs-b100` /
`graphs-b104` (fonte idêntica) divergem em maxΔ 20 (exatamente uma linha de ranque) no
único nó de controle de `Node23730->Node23729` — todas as posições de nós e toda a estrutura a montante de
caixas/polígonos/caminho esticado são idênticas byte a byte às do C; apenas a escolha, com ~1 ULP, do `findMaxDev`
sobre qual ponto interior simétrico em espelho vira o nó da bézier
difere. A forma de aresta plana curta também aparece como `241_1` (structural-match,
maxΔ ≈ 2.4 pt) — o irmão divergente do `241_0`, fixado no oráculo, que o ruído do C
mantém, em vez disso, no primeiro. O mesmo desempate produz uma divisão de corredor estreito de aresta de retorno de
ciclo de 2 com rótulo em `2413_1` (structural-match, maxΔ 67.65) e
`2413_2` (maxΔ ≤99.55 quando a correção swapBezier-reverse do T11 entrar — até lá
o maxΔ 1922.26 relatado para o arquivo é dominado por um defeito não relacionado, rastreado
separadamente), e uma única aresta rotulada dentro de um cluster em `graphs-decorate`
(maxΔ 43.54); em cada caso os dois cantos candidatos de divisão empatam dentro de
5.7e-13 (família 2413) / 3e-14 (decorate) entre si antes de o ruído do
`hypot` da Apple, dependente da posição, escolher um vencedor. O `2371`
(structural-match, maxΔ 16.8) mostra a mesma assinatura em duas arestas não relacionadas
(`g[9263]` `r6837mid--r9687mid`, `g[23859]` `r38mid--r8699mid`): o port
emite o espelho exato da sequência de pontos de controle do oráculo nas duas,
com o y do nó invertido por um Δ16.8 idêntico (frações de divisão superior/inferior trocadas).
Sua origem é qualificada com confiança **MEDIUM**, e não com a confiança
CONFIRMED dos outros membros: o `2371` empacota ~199 componentes, o que
desacopla as coordenadas locais do pathplan das coordenadas da página, de modo que o empate não
pôde ser correlacionado ao vivo com `route.ts:209` em três tentativas de
instrumentação; uma origem na segmentação em modo reto ou no `recover_slack` pós-recorte não está
totalmente excluída. Diagnóstico completo:
`plans/residual-cleanup/analysis/2371-mirror.md`. A maioria das arestas roteadas
não é afetada.

::: details Definição do grafo (`2368.dot`)
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

**Caracterização.** O ajustador de splines (`Proutespline` → `findMaxDev`,
`src/pathplan/route.ts`) divide uma bézier ajustada no ponto interior da rota de
desvio máximo. Quando o canal é simétrico, os dois pontos candidatos de divisão
são um **empate matemático exato**, e o vencedor é então decidido por um ruído de
cancelamento de ponto flutuante de ~1e-14 em uma avaliação de bézier em coordenadas absolutas
cujo **sinal depende da posição absoluta**.

A distância de desvio do C é o `hypot` da libm, e o `hypot` da Apple no macOS que
gerou o oráculo é uma implementação proprietária que não corresponde bit a bit a **nenhum**
`hypot` portátil (medido contra ele no regime de coordenadas do graphviz, taxas
de identidade bit a bit: `Math.hypot` do V8 ≈ 63%, um `hypot` corretamente arredondado / estilo Arm
≈ 84%, `hypot` da fdlibm ≈ 90%, `sqrt(dx²+dy²)` ≈ 94%). Por causa desse ruído de ULP,
**o próprio C não é consistente**: ele divide dois arcos *congruentes por translação* em direção a
cantos **opostos**. Dentro do `2368`, o arco `376->76` é a imagem espelhada do
arco geometricamente idêntico `256->436`:

```
C    376->76 : M273.31,-4.56 C268.33,-3.14 263.11,-1.9  258.11,-1.15 250.49,0     242.34,-0.98 234.83,-2.8
port 376->76 : M277.29,-4.51 C268.27,-1.69 257.65,0.32  247.89,-1.15 244.92,-1.59 241.88,-2.21 238.85,-2.94
```

O delta inteiro, sobreposto (zoom de 12× no arco `376->76` / `to1`) — **verde = Graphviz
em C, vermelho = @knowvah/dot-engine**. Ambos são o mesmo arco raso para baixo entre as
mesmas bordas de nós; eles diferem em ~1–2 pt na barriga (o ponto de controle
central da bézier), onde o desempate do C pendeu para o canto oposto:

![Arco 376->76 do 2368: verde = C, vermelho = @knowvah/dot-engine](/img/2368-376to76-overlay.png)

Todo o resto corresponde dentro da tolerância — mesma caixa delimitadora (608×148), posições de nós,
rótulos, pontas de seta e todas as outras arestas. As renderizações completas são visualmente
indistinguíveis:

| Graphviz em C | @knowvah/dot-engine |
|---|---|
| ![2368 renderizado pelo Graphviz em C](/img/2368-c.png) | ![2368 renderizado pelo @knowvah/dot-engine](/img/2368-port.png) |

O port usa um desempate **equivariante por translação** (um empate verdadeiro sempre resolve
para o primeiro índice), de modo que desenha *todo* arco desse tipo da mesma maneira, independentemente da
posição — ele é autoconsistente e corresponde ao C nos arcos em que o ruído do C também
mantém o primeiro (por exemplo, `256->436` e `241_0 5:ne->8:nw`), divergindo apenas onde o ruído
do C pende para o outro lado (`376->76`). Extremidades, alvo da ponta de seta, as outras
arestas, todos os nós, rótulos e a caixa delimitadora correspondem dentro da tolerância; apenas os
pontos de controle internos do único arco se movem (~1–2 pt na barriga).

**Por que aceito.** O `hypot` da Apple não é mais reproduzível entre mecanismos JS e
CPUs do que o FMA/`pow` de **A1** — é a mesma restrição de portabilidade, apenas
no roteador de splines do `dot`. Igualar a escolha *dependente da posição* do C significaria
adotar o desempate estrito do C, que vive em uma **primitiva compartilhada** pela qual toda aresta
roteada passa: fazer isso troca a correspondência de `376->76` por *novas* divergências nos
arcos em que o C cai para o outro lado (regride o `241_0` e um caso de oráculo de aresta plana
com `cnt=3`), um saldo nulo que também sacrifica a
equivariância por translação do port. Por isso mantemos o roteador consistente (equivariante). Este é
um delta do `dot` limitado e imperceptível — não um bug em aberto. Investigação completa:
`.agent-notes/2368-residual-flat-label-ranksep.md`.

### A4. Oráculo em um estado reconhecidamente quebrado (a família init_rank / pathplan) {#a4-oracle-in-an-acknowledged-broken-state-the-init-rank-pathplan-family}

**Afetados:** `2796` (structural-match, maxΔ 49), `2471` (structural-match,
maxΔ ~9063), `1435` (structural-match, maxΔ 503), `1581` (diverged, maxΔ 465). Os membros da família
`1939` e `2825` são **conformantes** e não têm entrada, e `2470`
e `graphs-structs` juntaram-se a eles em 2026-07-11 (ambos passaram a conformantes
depois que as correções de adjacency-spill/chancmpid do ortho, do `polylineMidpoint` com fmadd e
de arredondamento half-even em empates foram integradas — o port agora reproduz exatamente
a saída de recuperação do oráculo, inclusive as mesmas arestas perdidas); suas
entradas de aceitação foram aposentadas.

`1581` e `2825` eram casos de recuperação de falhas (missão fix-element-count-bucket):
entradas de fuzzer/degeneradas em que os testes upstream afirmam **apenas**
que o dot não trava (`test_1581`: nenhuma violação do ASan; `test_2825`: nenhuma
falha quando `rebuild_vlists` retorna -1). O C encontra um `Error:` interno
(`install_in_rank` / `rebuild_vlists: lead is null`) e sua recuperação
descarta conteúdo do layout; o port chega às **mesmas decisões de exclusão
de ranksets** (paridade de avisos verificada: os mesmos nomes de nós/grafos nos avisos
“already in a rankset” do `mark_clusters`, cluster.c:317-320).

O `2825` agora está totalmente fechado. A missão fix-2825-rebuild-vlists (posterior ao 1581)
primeiro fechou a lacuna em uma camada: o port chega ao estado de erro interno
*exato* do C — stderr idêntico byte a byte, inclusive a ordem das mensagens
(`Error: rebuild_vlists: lead is null for rank 1` e depois a continuação
`agerr(AGPREV, ...)` sem prefixo `concentrate=true may not work
correctly.`) — com o `dotLayoutPipeline` propagando corretamente
a falha de `dot_position` para pular `dot_splines`/`dotneato_postprocess`,
igualando o `dotLayout` do C (`if (r != 0) return r;` depois de `dot_position`,
dotinit.c:322-325). Um acompanhamento (parte 2) então fechou a lacuna restante
na camada de renderização: o `emit_node` do C condiciona todo nó a `node_in_box(n,
job->clip)` (emit.c:1806-1809), e neste caminho de aborto `job->clip` é
degenerado porque `GD_bb` nunca foi definido por `set_aspect` (dentro da
cauda ignorada de `dot_position`) — assim, o C emite *zero* nós, apenas os quadros
de cluster (também degenerados). O port portou essa mesma condição `node_in_box`
(`src/gvc/device.ts:renderNode`, usando `job.bb`/`job.pad` como o
equivalente de página única de `job->clip`) e parou de recalcular uma
bbox plausível a partir das posições vivas dos nós quando `g.info.bb` não está definido
(`src/gvc/device.ts:render`, `job.bb = g.info.bb` literalmente, espelhando
`gvc->bb = GD_bb(g)` do `init_gvc`, emit.c:3272) — todo mecanismo de layout
já define `g.info.bb` por conta própria antes de `render()` rodar em todo
caminho sem aborto, então isso é idêntico byte a byte em grafos saudáveis e só altera a saída
neste caminho de aborto. O `2825` agora é `conformant` (saída de 4 elementos,
idêntica byte a byte à do oráculo). Veja
`.agent-notes/2825-rebuild-vlists-abort.md` para o rastreamento completo do mecanismo
das duas partes. O `1581` nunca chega ao estado inconsistente (um
bug *diferente* da janela de clusters upstream, não `rebuild_vlists`), então
dispõe seu grafo remanescente por inteiro — essa lacuna continua aberta. A saída do oráculo
em `1581` é entulho de recuperação, sem semântica definida upstream. Evidência:
[`1581`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1581.md). Em
todas essas entradas é o **oráculo em C** que está quebrado, segundo o
próprio graphviz: `2471`, `1939` e `1435` são
[`xfail(strict=True)`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/tests/test_regression.py)
upstream (issues
[#2471](https://gitlab.com/graphviz/graphviz/-/issues/2471),
[#1939](https://gitlab.com/graphviz/graphviz/-/issues/1939),
[#1435](https://gitlab.com/graphviz/graphviz/-/issues/1435), cf.
[#2796](https://gitlab.com/graphviz/graphviz/-/issues/2796)); a única tentativa de
correção, o [MR rascunho !4849](https://gitlab.com/graphviz/graphviz/-/merge_requests/4849),
continua um rascunho não integrado (última edição em 2026-03-20). O `graphs-structs` é a
antiga classe de perda de roteamento de registros (#102/#242/#274/#1323) que o
graphviz estável 15.0.0 renderiza corretamente — uma regressão do oráculo em build de desenvolvimento.

**O que o C faz.** Nos membros de `init_rank` (`2796`, `2471`, `1939`),
o grafo auxiliar de coordenadas x do dot nativo fecha um ciclo dirigido por meio de arestas
de restrição de parede de cluster; seu
[`init_rank`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/ns.c#L146)
não consegue percorrer todos os nós, imprime `Error: trouble in init_rank` e o
layout prossegue a partir desse estado de recuperação — em `2471`/`2796` terminando em
entulho de triangulação do `Pshortestpath` e arestas perdidas. Em `1435` e
`graphs-structs`, a etapa quebrada é o próprio pathplan (becos sem saída da triangulação por
ear-clip; uma aresta de porta de registro perdida).

**Entradas verificadas e depois tornadas fiéis (esta é a parte essencial).**
A missão `verify-oracle-bug-family`
([resumo](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/README.md))
despejou, linha a linha, o grafo de restrições que os dois lados alimentam no simplex de rede,
para cada membro da família — e descobriu que o comportamento “limpo” anterior do port nesta
família vinha de **quatro defeitos genuínos do port**, todos corrigidos:

1. O `flatEdges` pulava a chamada de
   [`rec_reset_vlists`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/flat.c#L333)
   do C, deixando janelas de ranque de clusters desatualizadas após a inserção de vnós
   de rótulos planos (só isso fazia o port perder **9** arestas em `2471`, onde o C
   perde 6).
2. A penalidade de aresta de mesmo `group` disparava em laços próprios em vez de
   extremidades do mesmo grupo não vazio
   ([`dot_init_edge`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/dotinit.c#L66)).
3. `CL_CROSS` usava o valor `_WIN32` do C, 100; a plataforma do oráculo usa 1000
   ([`const.h`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/const.h#L141)).
4. Um beco sem saída da triangulação abortava o `Pshortestpath` em vez do
   avisar-e-continuar do C + recurso de linha reta
   ([`shortest.c:333`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/pathplan/shortest.c#L333)).

Após as correções, os despejos de restrições do NS da família são **idênticos linha a linha**
aos do C (253 chamadas de rank2 em `2471`; todas as chamadas em `1939`/`1435`/`graphs-structs`),
e o port acompanha o C pela recuperação reconhecidamente quebrada: as mesmas
arestas perdidas (`3->16` em 2796; as mesmas 6 em 2471), as mesmas árvores de elementos.
O `1939` tornou-se totalmente conformante. Os deltas numéricos residuais (e o
entulho de pathplan diferente do 1435) são comportamento *dentro* do estado de recuperação, que a
política do projeto deliberadamente não persegue.

**`2723` (falha de segmentação; fixado, não perseguido).** O `dot` nativo sofre falha de segmentação (saída 139)
em `tests/2723.dot` (não dirigido, grupos `rank=same`, arestas rotuladas), de modo que o C não
tem saída para igualar. A
[issue #2723](https://gitlab.com/graphviz/graphviz/-/issues/2723) upstream está aberta e
`tests/test_regression.py:test_2723` é `xfail`. O port lança
`InternalError` (`INTERNAL_ERROR`, com uma causa `TypeError` vinda de
`src/layout/dot/flat.ts:flatLabelYpos`, onde `rank[r-1]` é indefinido). Sem
um oráculo correto, a falha honesta permanece e o port não é alterado;
`src/layout/dot/flat-2723.test.ts` a fixa. Atualize esse teste se o upstream corrigir
a issue.

**Nota de política.** A postura anterior sobre A4 (“o port atende às expectativas da issue;
não replicar”) baseava-se na crença de que o grafo auxiliar acíclico do port vinha
de uma variante local benigna. Não vinha — vinha do
defeito (1), que comprovadamente extraviou o `2471`. A fidelidade ao código-fonte
em C venceu: o port agora reproduz os resultados reconhecidamente quebrados do C a partir de
entradas verificadas como idênticas, e toda entrada aqui deve ser **remedida
quando o upstream corrigir a issue correspondente** (a saída do oráculo
mudará; espere que esses ids acendam como regressões nessa atualização — isso
é proposital, não apodrecimento).

**Evidência.** Páginas de comparação por id (renderizações lado a lado + registros
de evidência):
[`2471`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2471.md),
[`1939`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1939.md),
[`1435`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1435.md),
[`graphs-structs`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/graphs-structs.md),
[`adendo pós-correção do 2796`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2796-post.md)
(linha de base pré-correção preservada em
[`2796-cluster-ranking.md`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-2796-cluster-ranking/comparisons/2796-cluster-ranking.md)).
Artefatos de diagnóstico: `.agent-notes/2471-stale-cluster-windows-missing-reset.md`,
`.agent-notes/1939-group-penalty-clcross-misports.md`.

### A5. Bytes de entrada inválidos (representação de codificação) {#a5-invalid-input-bytes-encoding-representation}

**Afetados:** `1367` (diverged, maxΔ 0 — exatamente uma diferença estrutural).

**O que difere.** O arquivo de entrada contém um byte de continuação UTF-8 isolado (`0x80`)
dentro de um nome de nó. O C trata bytes de continuação isolados 0x80–0xBF como “caracteres
válidos que representam a si mesmos” (`lib/common/utils.c:1200-1207`, sem
aviso), e o texto de `<title>` do nome do nó ignora completamente a conversão de charset
(os bytes de `agnameof` seguem direto para `gvputs_xml`). O SVG do oráculo, portanto,
contém o byte bruto e **não é UTF-8 válido**, apesar da codificação
declarada. O port decodifica entrada com UTF-8 inválido usando o recurso latin1
(`0x80 → U+0080`) e emite UTF-8 bem formado (`\xc2\x80`).

**Por que aceito.** A fronteira de E/S do port são strings JS (biblioteca para navegador).
Um byte bruto inválido não consegue fazer o percurso de ida e volta pelo valor de retorno
em string de `renderSvg`; igualar o C byte a byte significaria corromper a codificação da saída para todo
consumidor. O recurso latin1 espelha a própria semântica de recuperação do C, “tratado como Latin-1”
(`utils.c:1249`). Esta é uma restrição abaixo do código — a camada de
representação —, não um comportamento portátil que nos recusamos a portar.
Todo o resto do 1367 é conformante: contagens de elementos (23 polyline /
103 text / 44 polygon / 24 path) e todas as coordenadas correspondem após a
correção de decorate (T6).

**Evidência.**
página de comparação do
[`1367`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1367.md)
(renderização lado a lado + registro de evidência).

---

### A6. Estouro de canvas em `unsigned int` com entrada degenerada {#a6-unsigned-int-canvas-overflow-on-degenerate-input}

**Afetados:** `1314` — uma entrada derivada de fuzzer (`fontsize="991836031967s8"`)
cujo tamanho de fonte absurdo infla o desenho para ~2.75e11 pt.

**O que acontece.** O C armazena `job->width` / `job->height` como **`unsigned int`**
(`gvcjob.h:327-328`). O `ROUND(...)` do enorme tamanho em pontos (`emit.c:1249-1250`)
estoura 32 bits e dá a volta módulo 2³², e o backend SVG o emite por meio de um
`%d` **com sinal** (`gvrender_core_svg.c:258-259`) — assim, o C imprime
`height="-425618343"`. O port mantém o valor matematicamente consistente (sem dar a volta).
Todos os outros valores — `cx/cy/rx/ry` da elipse do nó, o `translate` da raiz, o
polígono, o `font-size` do texto — são idênticos byte a byte; apenas a
largura/altura do `<svg>` de nível superior diferem.

**Por que não o perseguimos.** Replicar o estouro de inteiro de 32 bits do C não é um
comportamento de layout que valha a pena portar, e a entrada é degenerada. Reveja se o upstream
corrigir o estouro (por exemplo, ampliando o campo ou limitando o tamanho).

<a id="a6b-degenerate-nan-layout"></a>

#### A6b. Layout NaN degenerado (`sfdp`, `repulsiveforce` patológico) {#a6b-degenerate-nan-layout-sfdp-pathological-repulsiveforce}

**Afetados:** `2556` — `repulsiveforce=100` (⇒ a força repulsiva usa
`pow(dist, 101)`), o que leva o solver de molas-elétricas a **NaN nos dois
mecanismos**. O próprio oráculo nativo emite todas as posições de nós/arestas como `nan` e uma
caixa delimitadora degenerada.

**O que acontece.** Com todas as coordenadas NaN, as duas implementações serializam
o lixo de maneiras diferentes: (1) a bb do grafo / polígono de fundo — o C arredonda `NaN`
para `int`, o que em arm64 produz lixo na escala de `INT_MIN` (`bb="0,0,-4.295e+09,
-4.295e+09"`); o port mantém `0`. (2) Operações de desenho de aresta — o passo de emissão
nativo suprime o `_draw_`/`_hdraw_` de uma spline NaN (emitindo apenas o `pos`),
enquanto o port as emite com pontos de controle NaN. Os desenhos de nós correspondem (ambos
os suprimem). Não existe layout real em nenhum dos lados.

**Por que não o perseguimos.** O port já reproduz o *mesmo* colapso em NaN que o
nativo — a correção que o levou até lá é genuína (veja abaixo); o que resta é apenas
como cada um serializa o lixo NaN. Replicar o comportamento indefinido de `(int)NaN` do C
e sua supressão de desenho de spline NaN não é fidelidade de layout significativa em uma entrada
cujo layout é degenerado nos dois mecanismos. Reveja se o upstream limitar
`repulsiveforce` ou sanear posições NaN.

**Correções do port que tornaram isto alcançável (não afastadas por perseguição — bugs reais).** Antes
delas, o port nem sequer conseguia chegar ao estado degenerado: (1) `armPow`
(`src/common/arm-pow.ts`) lançava exceção em qualquer argumento fora do caminho rápido; agora ele porta o
ramo completo de casos especiais do `pow.c` da ARM, de modo que `pow(NaN, y) = NaN` como na libm. (2)
`bezierClip` (`src/common/splines-geom.ts`) entrava em laço infinito com pontos de controle NaN
porque seu teste de convergência era a negação ingênua do `while (ABS > .5)` do C
(equivalente para valores finitos, não para NaN); agora ele espelha o C exatamente e
termina com NaN. Ambas são fiéis ao C e afetam apenas entradas NaN.

---

### A7. Fronteira de arredondamento da parede de caixa por `round()` (`dot`) {#a7-round-box-wall-rounding-boundary-dot}

**Afetados:** `graphs-honda-tokoro` e (adicionado em 2026-07-28, novo no universo de
905 itens) seu irmão em `graphs/directed/`, `tree-graphs-directed-honda-tokoro`
(ambos structural-match, maxΔ ≈ 1 pt na única aresta `n012->n011`). O
irmão difere apenas por atributos `samearrowhead`, que não afetam o roteamento deste par
— sua geometria de `n012->n011` é idêntica byte a byte à do id aceito
tanto no lado do port quanto no do oráculo, de modo que o mecanismo abaixo se aplica literalmente.

**O que difere.** A parede de caixa do corredor de cabeça do `maximal_bbox` cai em
x=90 interno no C contra x=89 no port, para a porta `samehead` compartilhada dos dois
paralelos `n012->n011`. A construção de porta compartilhada (`buildSharedPort`) e o
agrupamento de paralelos são ambos conformantes byte a byte com o C; a lacuna de 1 px é puramente um
artefato de fronteira de arredondamento de `round()` — ~1e-14 de ruído de ponto flutuante a montante
empurra um valor que está exatamente sobre uma fronteira `.5` para o inteiro vizinho. A
fórmula de `maximal_bbox` do port já espelha exatamente a do C.

**Por que não o perseguimos.** `round()` é uma primitiva pela qual toda aresta roteada do
corpus passa; mexer no comportamento de sua fronteira para igualar este único caso é um
risco de regressão em todo o corpus por 1 px em 2 arestas — a mesma restrição de primitiva compartilhada
do arredondamento do casco de controle registrado em
`bbox-class-control-hull-vs-curve`. Diagnóstico completo:
`.agent-notes/honda-samehead-shared-port.md`.

---

### A8. Arredondamento `fp-contract`/FMA vs. IEEE estrito (`dot`) {#a8-fp-contract-fma-rounding-vs-strict-ieee-dot}

**Classe.** O clang arm64 compila o binário do oráculo com `-ffp-contract=on`,
fundindo sequências selecionadas de multiplicação-adição em instruções FMA únicas;
o port roda no V8, que realiza arredondamento IEEE-754 estrito e não consegue emitir
`fma`. Com entradas idênticas bit a bit, os dois discordam em 1-2 ULP em qualquer
expressão que o compilador tenha escolhido contrair. O lado do port é sempre o resultado
IEEE-754 estrito; o lado do oráculo é sempre o resultado contraído com FMA. Esta é uma
restrição de portabilidade de compilador/ambiente de execução abaixo da semântica do código-fonte em
C, não um defeito lógico do port — irredutível sem
emular em software as escolhas específicas de contração do clang. Duas instâncias
são conhecidas, em dois pontos diferentes, com dois mecanismos de amplificação
diferentes:

- **2646** — o ULP surge dentro da resolução cúbica `points2coeff`/`solve3` do
  `Proutespline` e inverte diretamente a contagem de raízes do ajustador de splines.
- **2620** — o ULP surge no laço de extensão de vértices do polígono de `poly_init`
  (dimensionamento de nós) e é amplificado a jusante pela truncagem inteira fiel a cada relaxamento do `ortho`
  em uma inversão de empate de corredor de labirinto de custo igual.

**Afetados:** `2646` (structural-match, maxΔ 42.09 em 3 de 21.216 arestas:
`edge2575` `g[4639]`, `edge3905` `g[7777]`, `edge15467` `g[30201]` — todas rotas longas
de aresta com smode de porta de registro `:c->:nb_part`). Irmão de **A3**: ambas as
classes são empates irredutíveis de portabilidade de ponto flutuante dentro do
`Proutespline`, mas o mecanismo é distinto — um artefato de `fp-contract`
do compilador, não o `hypot` da libm.

**O que difere.** Nas três arestas, apenas a chamada final de `routesplines` (um
trecho reto até a porta de cabeça) diverge. Sua extremidade fica, bit a bit exatamente, sobre
a parede inferior do polígono de barreira, com sua tangente paralela a essa parede
(`evs[1]=(1,-1.22e-16)`), de modo que todo candidato de `splinefits` é tangente à
barreira em `t=1` — uma raiz quase dupla da cúbica de interseção.
O `points2coeff` calcula essa cúbica por meio de cancelamento catastrófico (termos
em torno de ~7446 colapsando para ~0.099). O oráculo (clang/arm64,
`-ffp-contract=on`) contrai `v3 + 3*v1 - (v0 + 3*v2)` em multiplicações-adições
fundidas, enquanto o V8 realiza arredondamento IEEE estrito — os dois discordam em
~9.1e-13 em **entradas idênticas bit a bit**, e esse ruído inverte o sinal do
discriminante de `solve3`: o C encontra 1 raiz (866.7, dentro do segmento); o port
encontra 3 raízes, com uma raiz parceira espúria em `t=0.9999975 < 1-EPSILON2`. A
raiz espúria dispara uma iteração extra de divisão de `a` pela metade, que inverte a
magnitude da tangente da última peça por um fator de 2 (em qualquer das direções nas
3 arestas), produzindo o maxΔ 42.09 pós-recorte (26 diferenças de SVG).

**Por que aceito (irredutibilidade comprovada por um experimento controlado).** As seis
chamadas de `routesplines` foram despejadas nos dois lados — caixa, polígono, `PL`, início,
fim e `evs` são idênticos byte a byte, assim como a spline de saída da chamada anterior (não final); a única divergência está dentro do `solve3` da chamada final. Um
harness autônomo em C puro isolou a única variável: compilar com
`-ffp-contract=off` reproduz o **port** bit a bit exatamente nas 3 arestas; a
contração padrão (`on`) reproduz o **oráculo** bit a bit exatamente nas 3
arestas. O port, portanto, já concorda com o C com IEEE-754 estrito; a
divergência é inteiramente a escolha de contração FMA do compilador do oráculo, abaixo da
semântica do código-fonte em C — não há infidelidade em nível de código-fonte a corrigir. Uma
correção direcionada (emular à mão a contração em `points2coeff`) foi tentada e
refutada: ela corrige 2 das 3 arestas, mas não a terceira, cuja inversão
se origina dentro da própria contração interna de `solve3`. Uma correção completa exigiria
emulação de FMA em software em todo o ajustador de splines — um custo de laço crítico
com raio de impacto de arredondamento em todo o corpus por uma recompensa subpixel de 3 arestas.
Diagnóstico completo: `plans/residual-cleanup/analysis/2646-fp-contract.md`.

**Afetados (histórico):** `2620` (era structural-match, maxΔ 585; 423 diferenças
em 24 caminhos de arestas + 22 pontas de seta). **Passou a conformante em 2026-07-11**:
o port fiel do transbordo do buffer de adjacência do `sgraph` + contenção bidirecional do `chancmpid`
(veja `.agent-notes/ortho-maze-circo-rca.md`) removeu a
divergência; a entrada de aceitação foi aposentada e esta seção é mantida como
documentação da classe A8.

**O que difere.** O pipeline `ortho` (`splines=ortho`) é conformante byte a byte
com o C dadas entradas idênticas — comprovado injetando a entrada exata do labirinto do C
(coordenadas, `xsize`/`ysize`) no estágio ortho do port: 378/378 segmentos roteados
saem idênticos byte a byte, de modo que nada em `src/ortho` está em falta.
A divergência real é de 1-2 ULP na *entrada* do labirinto: o `ysize` do nó (e, por
acúmulo dentro do ranque, `ND_coord.y`) calculado no laço de extensão de vértices do polígono de `poly_init`
do C (`shapes.c`), que sob
`-ffp-contract=on` funde `R.x += sidelength*cosx` em um FMA que é ~1
ULP maior que a aritmética IEEE estrita do port (ambos os lados implementam a
expressão aritmeticamente idêntica). O `2620` tem 173 nós de polígono de largura fracionária;
todos mostram C ≥ port por 1-2 ULP. Esse ULP é amplificado — não
introduzido — pelo relaxamento de Dijkstra do `ortho`, que trunca fielmente sua
distância acumulada a cada passo (`sgraph.c:165`, espelhado pelo port como
`Math.trunc`) sobre pesos derivados de extensões brutas de células
(`maze.c:257`). A geometria deslocada em ULP inverte um empate de corredor de custo igual
em 4 arestas roteadas (caminhos + suas pontas de seta); as demais diferenças são
efeito cascata de renumeração de ±1 trilha vindo dessas 4 inversões.

**Por que aceito (irredutibilidade comprovada por um experimento controlado).** Um
harness autônomo em C variando apenas `-ffp-contract` reproduziu os dois lados
no vértice divergente do hexágono: `-ffp-contract=on` → `310.29250168188713`
(corresponde ao oráculo), `-ffp-contract=off` → `310.29250168188707` (corresponde ao
port), com a operação divergente isolada no vértice `i=3`
(`R.x=-0.50000000000000011` fundido vs. `-0.5` não fundido). Um segundo
experimento de injeção de entrada (única variável: valores de entrada do ortho) confirmou
o amplificador: alimentar o `orthoEdges` do próprio port com o `coord`/`xsize`/`ysize` exato do C
reduz as 4 divergências de corredor a 0 — o
código do ortho não tem defeito, é apenas sensível (como o próprio roteamento de custo de labirinto do C)
a um deslocamento de 1-2 ULP em sua entrada. Igualar significaria emular
a contração FMA específica do clang de uma árvore de expressão compilada em
`poly_init` — perseguir um artefato compilado, não portar a semântica do código-fonte.
Diagnóstico completo: `plans/ortho-2620-residual/analysis/2620-ortho-route.md`.

**Exceção emulada (não aceita): `triang.c:ccw`.** Um ponto de contração
É reproduzido bit a bit em vez de aceito: o `ccw` do pathplan
compila para `fnmul`+`fmadd` (primeiro produto exato − segundo arredondado), de modo que um
ponto de consulta igual bit a bit a uma extremidade de segmento testa ISCW/ISCCW em vez de
ISON. O `shortest.c:pointintri` então rejeita extremidades que são vértices de polígono
(“destination point not in any triangle”) e o `makeMultiSpline` recorre ao
roteamento simples para todo ciclo de 2 coalescido — um comportamento grande, discreto e
válido em todo o corpus que o port precisa igualar. Diferentemente dos pontos `solve3`/`poly_init`
acima (no fundo de árvores de expressão compiladas, correção refutada), o `ccw` é
uma única função compilada autônoma com semântica limpa, portanto
`src/pathplan/triang.ts` a emula: caminho rápido em double simples com um limite de erro
conservador onde os sinais simples e fundido comprovadamente concordam, e
um caminho exato com produto de Dekker + BigInt diádico para os casos próximos de zero.

---

### A9. Trigonometria da libm com 1 ULP → inversão de empate cocircular da CDT (multispline de `circo`/`twopi`) {#a9-libm-trig-1-ulp-→-cdt-cocircular-tie-flip-circo-twopi-multispline}

**Classe.** O `Math.sin`/`Math.cos` do V8 não são idênticos bit a bit ao `sin`/`cos` da libm da Apple
(comprovado: discordância de 1 ULP em `2π·4.5/8`, um dos oito
ângulos de canto do obstáculo elipse). Os cantos do octógono circunscrito de `makeObstacle`
herdam esse ULP, de modo que as coordenadas de entrada do roteador de triângulos diferem das
do oráculo em ≤6e-14. Layouts simétricos (nós de mesmo tamanho em um ranque/anel) tornam
os quadriláteros do roteador **exatamente cocirculares** em aritmética real, de modo que o
predicado exato de incírculo fica em um fio de navalha: o ULP de entrada inverte seu sinal, a
diagonal da triangulação de Delaunay restrita se inverte, e o polígono de corredor que falha em
`Pshortestpath` no oráculo (“destination point not in any triangle” →
recurso de spline simples) tem sucesso no port (ou vice-versa). As splines resultantes
diferem em ~0.2–0.5pt. Irmão de **A3**/**A8**: uma restrição irredutível de
portabilidade de ponto flutuante abaixo da semântica do código-fonte em C — igualar
exigiria reproduzir em JS o arredondamento exato de `sin`/`cos` da libm da Apple.

**Afetados:** `241_0` (circo Δ≈0.2 / canvas do twopi Δ≈9 via a inversão de corredor
na aresta `5:ne->8:nw`); `2343`, `2239`, `share-b29`, `windows-b29` (twopi,
1–2 diferenças de posição de rótulo de aresta cada — o ULP da libm surge na
trigonometria de vértice unitário de `poly_init` (`hypot`/`atan2`/`sin`), coloca a altura calculada
de um nó um ULP além do piso de tamanho mínimo em que o oráculo cai
exatamente, e se propaga por `floor()` no carregamento da R-tree de xlabels até uma
única inversão de candidato de rótulo. Uma correção com hypot corretamente arredondado foi tentada e
REFUTADA: ela corrigiu o `2343`, mas causou regressão no `2168_3`, cujo dimensionamento de octógono
passa pela mesma chamada em que o valor do oráculo NÃO é o corretamente
arredondado — nenhuma política determinística de hypot iguala o oráculo nos dois).
O `2168_1` originalmente estava nesta classe, mas passou a
conformante quando o port emulou o `ccw` com fp-contract do oráculo
(pathplan `triang.ts`): sua falha de corredor é governada pela rejeição de extremidade de vértice
do `pointintri` com FMA, que o port agora reproduz
bit a bit, de modo que o empate de ULP da diagonal da CDT não aparece mais ali.

**Por que aceito (irredutibilidade comprovada por um experimento controlado).** A
própria CDT está exonerada: o `mkSurface` do port é um port fiel da inserção incremental
do GTS 0.7.6 (`cdt.c`: divisão 1→3 + `swap_if_in_circle` recursivo, arestas de restrição
pré-criadas e não trocáveis, imposição de restrições por
`remove_intersected_*` + `triangulate_polygon`), e
um harness autônomo em C vinculado à **biblioteca GTS real** e alimentado com as entradas do roteador, idênticas bit a bit às do port,
reproduz a triangulação do port face a face
(2168_1: 22/22; 241_0: 185/185). A avaliação racional exata do determinante de incírculo
nos dois conjuntos de entrada confirma a inversão de sinal (+1 com as entradas do
port, −1 com as do oráculo). A variável residual — a diferença de 1 ULP na
trigonometria — foi isolada comparando diretamente os padrões de bits de `Math.sin`/`sin`.

**Aceitação na trilha de mecanismo (`accepted-divergences-engines.json`).**
<a id="a9-engine-track-twopi-circo"></a> As **trilhas xdot de mecanismo** do twopi/circo
(`parity-twopi.json` / `parity-circo.json`, oráculo nativo `dot -K <engine>
-Txdot`, `test/corpus/engine-walk.ts`, comparação semântica de operações de desenho com
±0.01 — veja `test/golden/compare-xdot.ts`) fazem emergir esse mesmo mecanismo
independentemente da pesquisa SVG do mecanismo dot citada acima: twopi `2239` (1
diferença de operação de desenho — a inversão de posição do texto de rótulo de aresta `_ldraw_`, o mesmo
ULP de trigonometria de vértice unitário de `poly_init` propagando-se pela cadeia
de `floor()` da R-tree de xlabels; `2343`, `share-b29` e `windows-b29`, originalmente aceitos
sob esta entrada, foram *corrigidos* em 2026-07-11 pela contração fmadd fiel
em `polylineMidpoint` — veja o parágrafo da família b29 abaixo) e circo `241_0` (41
diferenças de operações de desenho, Δ≈0.2pt na bézier roteada da aresta `1->2` — a mesma
inversão de corredor por diagonal da CDT; diário de decisões, 2026-07-10, entrada “CDT rewritten as
faithful GTS port; 2168_3 outline-ring obstacle; 56/osage bb clobber; A9
filed”). Aceito no nível da trilha de mecanismo via
`test/corpus/accepted-divergences-engines.json`, cruzado com
`PARITY-twopi.md`/`PARITY-circo.md` pelo `parity-report.ts` — o mesmo cruzamento que o
`accepted.ts` faz para o `PARITY-dot.md` da trilha dot.

**circo `2475_2` — empate de hypot do closestNode cocircular.** Em um componente de 28 nós
deste grafo de 10762 nós, o `getRotation` do circo
(`circpos.c:73-92`) escolhe o nó de bloco mais próximo da origem do layout via
`hypot` para decidir a rotação do sub-bloco. Dois nós cocirculares são
efetivamente equidistantes; o `Math.hypot` corretamente arredondado do V8 e o `hypot` da libm
da Apple arredondam essa distância com 2 ULP de diferença, o que inverte o `<` estrito,
seleciona um nó diferente e gira/reflete o sub-bloco em ~20° (18 nós
se movem, máx. 296.7pt; os outros 10744 nós são idênticos bit a bit, assim como
a árvore de blocos, a ordem do círculo e todo `centerAngle`). A política de CR-hypot já
havia sido refutada para esta classe (2026-07-10). Reprodução autônoma:
`.agent-notes/circo-2475-590-repro.dot`; análise de causa raiz completa:
`.agent-notes/circo-b81-2475-rca.md` (aceito em 2026-07-11).

**twopi `2470` — ULP de coordenada radial amplificado pela R-tree de xlabels.**
O 2470 é um grafo de 140 arestas cujos rótulos de aresta HTML `<table>` se agrupam em
âncoras radiais quase coincidentes. Na família neato, os rótulos de aresta são posicionados
como rótulos externos pelo posicionador guloso de xlabels (`label/xlabels.c`), que
escolhe o canto candidato de menor sobreposição por meio de uma R-tree ordenada por Hilbert.
As splines e as coordenadas de nós do port correspondem ao oráculo na
precisão de emissão (zero diferenças de spline/nó/bbox, mesmo a 1e-7), mas o `ND_coord.y` radial de um nó
difere em ~2 ULP (`sin`/`cos` da libm da Apple vs. `Math` do V8) — muito
abaixo do critério de conformidade, porém ele cruza a fronteira de `floor(pos.y − sz.y/2)`
exatamente em 0 em `objplpmks`, invertendo o retângulo da R-tree desse objeto em
uma unidade. A mudança na ordem de Hilbert/agrupamento da árvore faz o `RTreeSearch` podar
um ramo diferente, de modo que ~140 rótulos pulam cada um para o canto candidato vizinho
(cada diferença é um passo fixo de (+largura, −altura de linha)). O posicionador, a ordem de objetos,
o arredondamento de retângulos, o `CombineRect` (que espelha fielmente a peculiaridade de min-min do C)
e a chave de Hilbert int32 foram verificados um a um como fiéis; a
divergência é o ULP de trigonometria radial a montante, irredutível pelo mesmo motivo
que o `1855` do twopi. Aceito em 2026-07-11; análise de causa raiz completa:
`.agent-notes/twopi-2470-rca.md` (que também documenta que a “aprovação” matinal do id
foi um artefato de um binário de oráculo desatualizado, não uma regressão do port).

**osage `1855` — borrão de fp-contract em vértices de obstáculo.** Distinto da entrada de espelho radial
do `1855` do twopi acima: no osage, os centros dos nós são exatos bit a bit em relação
ao oráculo, e as 110 diferenças de operações de desenho são três arestas roteadas por obstáculos
colocadas no lado espelhado de uma linha de nós (X exato bit a bit, Y espelhado). Os
vértices do obstáculo octógono vindos de
`circumscribed_polygon_corner_about_ellipse` (`neatosplines.c:301`) diferem
do C em 3–4 ULP porque o `-ffp-contract=on` do clang funde as cadeias `a·b±c`
em `ellipse_tangent_slope`/`line_intersection` em FMAs de arredondamento único,
enquanto o V8 arredonda cada operação: o arredondamento fundido do C colapsa uma coluna de calha
de valores x de cantos em um único double idêntico bit a bit (exatamente colinear),
e o do port a divide em dois valores com 1 ULP de diferença. Isso inverte o teste de tangência
`clear()` de visibilidade — a calha deixa de ser bloqueada —, adicionando ~20
arestas de visibilidade, e o Dijkstra resolve o empate de homotopia cima/baixo para o
lado espelhado. Experimento controlado: injetar as coordenadas exatas de obstáculo do C
no port, de resto intocado, produz **zero** arestas divergentes,
exonerando por completo a cadeia de arranjo legal, visibilidade, Dijkstra e spline; injetar apenas `cos`/`sin` da libm do C
não tem efeito. Aceito
em 2026-07-11; análise de causa raiz completa: `.agent-notes/osage-spline-family-rca.md`.

**Família b29 (twopi).** As quatro variantes b29 compartilham um mesmo fio de navalha: o
rótulo de aresta `EqmtTyp` (`Node14732->Node14731`) fica em um empate exato de seleção de lado do placeLabels
cujo resultado depende de deriva de 1 ULP do layout do twopi nos
objetos ao redor. Com a contração fmadd fiel em
`polylineMidpoint` (correção da família states, 2026-07-11), a âncora do rótulo do port
é idêntica bit a bit à do oráculo, e ainda assim o empate continua resolvendo de modo oposto em
duas das quatro variantes (`graphs-b29`, `linux.i386-b29`), enquanto as outras
duas (`share-b29`, `windows-b29`) agora conformam — e a diferença de rótulo A9 aceita do `2343`
foi totalmente eliminada. Limite: 1 operação de desenho, Δ12pt em y do rótulo. Irredutível
sem eliminar a deriva a montante. Análise de causa raiz completa:
`.agent-notes/twopi-states-rca.md`.

O mesmo fio de navalha do placeLabels aparece na trilha do **osage** (aceito
em 2026-07-11, análise de causa raiz completa: `.agent-notes/osage-small-tail-rca.md`):
`linux.i386-b29` e `share-b29` (2 diferenças de operações de desenho cada — a âncora x de um rótulo de aresta
cai em 878.28 contra 841.06, posicionada simetricamente em torno do ponto médio de spline
idêntico bit a bit, 859.67, isto é, ±metade da largura do rótulo; as duas
variantes espelham uma à outra) e `1652` (2 diferenças de operações de desenho — duas arestas, cada uma
inverte uma âncora de rótulo em torno de um ponto médio idêntico, uma em x e uma em y,
com splines e pontas de seta idênticas bit a bit; o oráculo renderiza por completo,
portanto não se trata do instável timeout nativo já conhecido). Em todos os casos a geometria
da aresta é exata bit a bit e apenas o empate de seleção de lado do rótulo resolve
de modo oposto em entornos com deriva de 1 ULP.

A trilha do osage traz o trio `polypoly` (`graphs-polypoly`,
`share-polypoly`, `windows-polypoly`; aceito em 2026-07-11, análise de causa raiz completa em
`.agent-notes/patchwork-tail-rca.md`): a única operação divergente é o
transcendental puro `cos(π+θ)` em um vértice de quadrilátero distorcido com orientação 180 —
o `Math.cos` do V8 é corretamente arredondado, enquanto o `cos` da libm da Apple carrega um
erro de ±1 ULP dependente do argumento (de modo que só sob a libm `|cos(π+θ)| ≠
|cos(θ)|`); o delta de 1 ULP no tamanho do nó alimenta o `GRID`/`ceil` do pack, desfaz um
empate de perímetro, e o qsort coloca dois componentes nas células de empacotamento um do outro —
uma troca rígida de nós inteiros, sem erro de forma ou de roteamento. Nenhuma reescrita
determinística consegue reproduzir um transcendental de libm que não é corretamente arredondado,
a forma clássica de A9.

O mesmo mecanismo foi confirmado em 2026-07-28 no irmão maior
`tree-graphs-directed-polypoly` (`graphs/directed/polypoly.gv`, novo no
universo de 905 itens; 112 diferenças de operações de desenho, somente osage). A operação divergente
é o mesmo ponto de 1 ULP em `cos(π+θ)` do nó `9004` — os valores de `bb.x` do C e do port
correspondem à análise de causa raiz original byte a byte —, mas nesta entrada de 76 nós a
propagação passa pelo `arrayRects` do osage: o `acmpf` ordena as células de pack
pela soma bruta `width+height`, e a largura 1 ULP maior da libm faz com que
`9004` seja ordenado estritamente antes de seus irmãos rotacionados `9000/9002/9006`, enquanto
o valor corretamente arredondado do V8 deixa um empate exato de 4 vias para o
qsort instável ordenar de outra forma — células diferentes em ordem de linhas, uma troca
`9002`/`9006` e uma cascata de `fmax` de largura de coluna deslocando 8 vizinhos em x.
Alimentar o `arrayRects` do próprio port com os tamanhos de nós do C versus os tamanhos de nós do port
reproduz os 10 nós movidos da varredura com deltas em x idênticos byte a byte,
fechando a cadeia causal.

Duas outras instâncias de trilha de mecanismo tiveram a causa raiz identificada e foram aceitas em 2026-07-11
(análise de causa raiz completa: `.agent-notes/circo-edge-tail-rca.md`): twopi `241_0` (6 diferenças
de operações de desenho — o irmão da entrada do circo acima: o mesmo empate de incírculo cocircular da CDT,
invertido pelo `sin`/`cos` da libm com 1 ULP, faz o corredor multispline
do port ter sucesso com uma spline de 14 pt onde o build nativo
recorre ao roteamento simples de 8 pt; deltas de pontos < 0.07pt) e circo
`windows-tree` (10 diferenças de operações de desenho em uma aresta de leque — a trigonometria de posicionamento do circo
coloca `node2.y` um único ULP acima de `node8.y` em torno do valor exatamente simétrico 18.0, e a seleção de porta de cabeça dinâmica do `closestSide`
inverte TOP/BOTTOM
nesse empate exato; as posições dos nós e as caixas são, de resto, idênticas bit a bit às do
oráculo).

**Trilha de mecanismo do sfdp — empates de PF em arestas (`42`, `241_0`).**
<a id="a9-sfdp-fp-ties"></a> A trilha xdot de mecanismo do sfdp (`parity-sfdp.json`,
`dot -Ksfdp -Txdot` nativo, ±0.5) faz emergir o empate de incírculo cocircular da CDT assim que
posições pré-roteamento nativas exatas são injetadas (portanto a divergência NÃO é
deriva iterativa — veja a classe A1-drift — mas um empate de predicado discreto):

- `42` e `241_0` — empate de incírculo cocircular da CDT (o corredor multispline).
  Com posições injetadas, o resíduo é uma **inversão de contagem de segmentos**: `42`
  `opCount 5 vs 9` (aresta 0->3) / `ptCount 32 vs 26` (3->7); `241_0` `ptCount 14
  vs 8` (aresta 3->2) — a diagonal da triangulação de Delaunay restrita do port se inverte em relação ao
  oráculo, de modo que o corredor multispline tem sucesso com uma spline de N pts onde o
  build nativo recorre a uma rota simples mais curta (ou vice-versa), exatamente como na
  entrada de `241_0` do twopi/circo acima. O port já emula a contração `fmadd` do arm64
  no predicado incircle/`ccw` (`src/pathplan/triang.ts`,
  `src/common/fma.ts`) e usa Delaunay com incírculo robusto; o resíduo é o
  1 ULP de `sin`/`hypot` do V8 vs. libm da Apple na entrada do predicado, que nenhum código
  portátil reproduz.

> **`2095` reclassificado de A9 → A1-drift (2026-07-22).** Ele estava listado anteriormente
> aqui como “o irmão do hypot” (deriva abaixo de 0.7pt nas arestas de um nó de
> nome vazio `""->"4"`). Esse resíduo era um **artefato do harness**: a regex `GVTS_POS` do
> injetor de atribuição exigia ≥1 caractere de nome, de modo que o nó de nome `""` nunca
> era injetado e arrastava suas duas arestas incidentes. Com o injetor corrigido para casar
> nomes vazios (`(.+)`→`(.*)`, `src/layout/neato/splines.ts`), o `2095` do sfdp
> é injetado com **0 de resíduo** — pura deriva de forças, coberta pela classe
> A1-drift calculada, não um empate de PF de roteamento. Sua aceitação por id foi removida de
> `accepted-divergences-engines.json`. (Mesma constatação do `2095` do fdp abaixo.)

**Experimento controlado recente (2026-07-21).** Uma sonda de `hypot` nativo vs. V8
(`plans/sfdp-tracked-divergences/batch-2/hypot-ulp-probe.txt`): compilar o
`hypot` do C do sistema e comparar com o `Math.hypot` do Node em entradas representativas de desvio de
aresta plana mostra uma discordância de 1 ULP em 2 de 6 (Δ 7.1e-15 e
5.7e-14) — o fio de navalha do limiar de divisão que inverte a contagem de subdivisões.
Irredutível: nenhum hypot portátil reproduz a libm da Apple (o precedente do `arm-pow.ts`
para a mesma fronteira). Aceito no nível da trilha de mecanismo via
`accepted-divergences-engines.json` (`sfdp.42`, `sfdp.241_0`).

A trilha xdot de mecanismo do **fdp** (`parity-fdp.json`, `dot -Kfdp -Txdot` nativo,
±0.5) faz emergir o MESMO empate cocircular da CDT no mesmo grafo, `241_0`: com as
posições pré-roteamento exatas do oráculo injetadas, o resíduo são 11 diferenças numéricas de
`unfilled_bezier` confinadas a uma aresta (`0->1#0`, maxΔ 3.39pt). Como
as posições dos nós são idênticas após a injeção, a divergência está a jusante, no
corredor multispline do pathplan — o mesmo empate de incírculo por 1 ULP da libm que o `241_0` do
twopi/circo/sfdp (incírculo racional exato 185/185 acima). As alavancas já
foram aplicadas (`src/pathplan/triang.ts` fmadd, `src/pathplan/route.ts:198`
`Math.hypot`); o empate é irredutível. Aceito via `accepted-divergences-engines.json`
`fdp.241_0`. O `2095` do fdp, por outro lado, é **A1-drift, não A9**: injetar o
único nó de nome vazio (depois que o injetor de atribuição foi corrigido para casar
nós de nome `""`) reduz seu resíduo a zero — a “cauda A9” anterior era o
nó vazio não injetado arrastando suas arestas incidentes. A aceitação do `2095` do sfdp foi
o mesmo ponto cego — uma nova regeneração da atribuição do sfdp (2026-07-22) com o injetor
corrigido confirmou que ele também é injetado com 0, e sua aceitação foi removida (veja a
nota `2095 reclassificado` acima).

---

## Cauda longa rastreada (atributos e casos de borda do `dot`) {#tracked-long-tail-dot-attribute-edge-case}

Nos **padrões**, o mecanismo `dot` corresponde ao binário C com uma tolerância
determinística estreita no corpus golden (o veredito `conformant`; veja a nota no
início). As diferenças restantes são a **cauda longa de atributos e
casos de borda** — a parte historicamente difícil de qualquer port do Graphviz. Diferentemente dos
deltas aceitos acima, estas *serão* fechadas; elas são rastreadas ao vivo, com
contagens, em
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md):

| Categoria | O que difere |
|---|---|
| **path-structure** | Roteamento de splines de arestas em configurações específicas (por exemplo, alguns casos de arestas planas e de corredores densos). |
| **element-count** | Um recurso que emite mais/menos elementos SVG que o C em certos grafos. |
| **color-stroke** | Diferenças na emissão de traço/preenchimento para atributos de estilo específicos. |
| **parser-gap** | Um pequeno número de entradas DOT que o parser ainda não aceita por completo. |

Se o seu grafo usa apenas atributos comuns e o mecanismo `dot`, você quase
certamente está no caminho de correspondência com tolerância determinística. Se um layout parecer errado, consulte o `PARITY-dot.md` para
essa classe de entrada — provavelmente é um item rastreado com uma missão de correção fixada no oráculo,
não uma incógnita.

> **Nota sobre os casos dependentes de rótulos.** A classe de medição de texto (A2) está encerrada —
> nenhum grafo `dot` é aceito sob ela atualmente. Um grafo que hoje está em
> structural-match é uma lacuna rastreada, não um delta de métricas de fonte.

### Pontas de seta de arestas opostas com `concentrate=true` {#concentrate-true-opposing-edge-arrowheads}

Quando `concentrate=true` mescla um par antiparalelo (`A->B; B->A`) em uma única
aresta sobrevivente, essa aresta deve desenhar uma ponta de seta em **ambas** as extremidades. Isso agora está
portado (o ramo `conc_opp_flag` de `arrow_flags`; veja
`src/common/splines-clip.ts:arrowFlags`), de modo que `graphs-b135`, `167` e `2087`
correspondem (a divergência de `element-count` por ponta de seta ausente e seu efeito colateral de `@d`
de spline sem recorte desapareceram).

Alguns grafos com concentrate **mantêm um resíduo separado, preexistente**, que a
correção da ponta de seta **não** resolve — é um delta de posição de **coordenada x** de nó
(simplex de rede de x / porta de bússola), não um defeito de ponta de seta:

- **`graphs-b15`, `graphs-b69`** — os grandes grafos “elevador” de registros/clusters.
  O concentrate é ativado e mescla corretamente; o resíduo é um delta de ~1pt em x de nó
  que se amplifica em uma diferença de `element-count`/`@d` de spline. A emissão da
  ponta de seta em si agora está correta (o b69 ganha seus polígonos de ponta de seta ausentes). Veja
  a nota de agente `b69-concentrate-undermerge` para a causa raiz da coordenada x.
- **`1453`** — ainda diverge por uma causa de `element-count` de nível superior sem relação
  com a ponta de seta do conc_opp_flag.
- **`2825`** — na época desta correção de ponta de seta, divergia por uma causa de
  `element-count` de nível superior sem relação com o conc_opp_flag (nenhuma mesclagem de par oposto
  é disparada ali); desde então fechado pela missão fix-2825-rebuild-vlists,
  veja A4 acima.

Esses são itens rastreados de coordenada x / estruturais, **não** bugs de ponta de seta.

### Lacunas de fidelidade de layout da missão de fidelidade 2.0 (neato, sfdp, fdp, twopi, circo) {#layout-fidelity-gaps-from-the-2-0-fidelity-mission-neato-sfdp-fdp-twopi-circo}

A missão de fidelidade 2.0 fez com que valores de atributos não portados falhassem de forma explícita (veja a
tabela `UNSUPPORTED_FEATURE` em
[Erros e exceções](https://github.com/knowvah/dot-engine/blob/main/docs-site/guide/errors.md)).
Ela deixou o seguinte, registrado em `plans/v2-fidelity/decision-journal.md`.

**Explícito, não portado.** `overlap=voronoi` com nós sobrepostos ainda lança
`UNSUPPORTED_FEATURE` em neato, twopi, circo e sfdp: o ajustador de Voronoi
em si (o algoritmo de `vAdjust`) não está portado. O teste de sobreposição que decide
se deve lançar é o próprio do C (`countOverlap` sobre os polígonos de nós de `poly.c`).

**Lacunas conhecidas, ainda silenciosas.** O port renderiza estas sem erro e
difere do Graphviz nativo. Encontradas pela missão `v2-silent-gaps`
(`plans/v2-silent-gaps/decision-journal.md`); não são deltas aceitos.

- **O aviso “Unrecognized overlap value” de `getAdjustMode` não é emitido.**
- **Vértices de polígonos rotacionados podem diferir do nativo nos últimos bits
  (irredutível: biblioteca matemática do host).** O `poly_init` orienta cada vértice com
  `atan2`, `hypot`, `sin` e `cos`. Com entradas idênticas bit a bit, a libm do macOS e
  o V8 retornam últimos bits diferentes (por exemplo, `atan2(0x3fd6a09e667f3bce,
  0xbfd6a09e667f3bca)`: libm `…21d1`, V8 `…21d2`; `hypot` no vértice seguinte:
  libm `…fffd`, V8 `…fffe`), de modo que uma caixa com `orientation=20` tem y do vértice
  `-18` no port e `-17.999999999999996` no nativo. O próprio Graphviz nativo
  varia com a libm da plataforma, e um navegador não consegue chamá-la. A aritmética própria do port
  corresponde à do C (ordem de `RADIANS` corrigida; 776 de 1664 coordenadas de
  vértices amostradas são idênticas bit a bit, as demais diferem apenas pela libm). Efeito:
  veredictos de `polyOverlap` de toque exato podem se inverter; com vértices nativos, todo
  veredito corresponde.
- **O sfdp pode diferir do nativo no macOS (irredutível: `pow` da libm do host).**
  Diagnosticado com um sfdp nativo instrumentado: as posições permanecem idênticas bit a bit
  até que um termo de força repulsiva, `pow(dist, 1 - p)` (`spring_electrical.c`,
  `p = -1`, portanto `pow(x, 2)`), retorna 1 ulp a menos que `x*x` na libm do macOS
  (`pow(1.4116727416983157, 2)`: libm `1.9928199296540394`, corretamente arredondado
  `…396`; no macOS `pow(v, 2) != v*v` para 20 de 16201 `v` amostrados). Isso altera
  o `Fnorm` da iteração no último bit; o resfriamento adaptativo do sfdp o amplifica
  em um layout diferente (frequentemente espelhado). O `armPow` do port é o `pow` das
  optimized-routines da ARM (glibc ≥ 2.28), isto é, o que o Graphviz no Linux calcula;
  o oráculo no macOS é o ponto fora da curva. Descartados: semeadura (valores explícitos de `start=`
  correspondem), `pcp_rotate` (a mesma entrada dá a mesma saída), posições e o
  termo atrativo (idênticos bit a bit). Exemplo: um triângulo isolado `a--b; a--c; b--c`
  com a semente padrão.
- **O fdp pode diferir do nativo por causa de `cos`/`sin` da libm do host.** O fdp segue o
  Graphviz após a 15.0.0 (repulsão por distância hypot, `Mlimit`), com o `hypot` da libm
  do host reproduzido bit a bit (`src/common/libm-hypot.ts`, 0
  divergências em 400k amostras). 251 das 252 entradas golden renderizáveis pelo fdp
  correspondem exatamente ao build nativo; a restante
  (`parallel-cluster-ldbxtried`) posiciona nós de porta de cluster com
  `T_Wd * cos(alpha)`, e o `cos(-2.3840764867756761)` da libm do macOS está a 1 ulp
  do `Math.cos` do V8; o laço de forças do fdp amplifica isso para cerca de 3 pol. O `cos`
  da Apple não é reproduzível a partir de um modelo curto como o `hypot` é.
- **Falhas do nativo que o port define.** O Graphviz nativo sai com 139 em neato
  `mode=KK` com `model=mds` e um `len` de aresta (`mds_model` indexa `GD_dist`
  por um número de sequência com base 1: estouro de heap), e em `model=circuit` com um
  grafo desconexo. O port descarta células fora do intervalo no primeiro caso e
  recorre a caminhos mais curtos no segundo; não há saída nativa para
  comparar.

---

## Intencionalmente não portado (não objetivos) {#intentionally-not-ported-non-goals}

Estes são limites de escopo deliberados, não bugs. A biblioteca visa **SVG**
(mais os formatos de texto intermediários `json` / `xdot` / `dot` / imagemap).

- **Outros formatos de saída.** Raster (PNG/JPG/GIF/WebP/BMP), PostScript/PDF/EPS
  e backends de GUI/interativos estão fora do escopo. Use a saída SVG e converta
  depois se precisar de um raster.
- **Paginação por `page=` para SVG.** O `dot` nativo também não pagina SVG (o
  dispositivo SVG não define nenhum sinalizador de paginação), de modo que `page=` é uma operação nula neste caminho nas duas
  implementações — documentado aqui apenas por ser um ponto comum de
  confusão.
- **Saída de texto `-Tplain`.** Adiada (um formato de texto fiel), não excluída.
- **`gvpr`** (a linguagem de script de processamento de grafos) — fora do escopo.
- **Wrappers de conveniência em C++** (`cgraph++`, `gvc++`) — a API em C é portada
  primeiro; uma camada de conveniência idiomática em TypeScript, se desejada, seria um
  pacote separado.
- **`fontnames=svg|ps` na medição de texto no navegador.** No navegador, o
  medidor de canvas constrói sua fonte a partir da lista de famílias `fontnames=native` do alias PostScript
  (`Times-Roman` → `Times, serif`), a mesma
  face que o emissor SVG renderiza por padrão. O `TextMeasurer` não carrega nenhum contexto
  de grafo, de modo que grafos que definem `fontnames=svg` ou `fontnames=ps` são medidos
  contra a lista nativa enquanto o SVG nomeia a família svg/ps. Pesos de alias
  que o CSS não define (`book`, `demi`, `light`, `medium`, `roman`)
  são emitidos literalmente, como no C; os navegadores os ignoram e renderizam peso
  normal, e o medidor mede o peso normal para corresponder. A saída no Node
  não é afetada (ele nunca usa o medidor de canvas).
- **Mecânicas exclusivas do nativo** substituídas por equivalentes seguros para o navegador: o carregamento dinâmico de
  plugins (`dlopen`) é substituído pelo registro estático de mecanismos/renderizadores;
  leituras do sistema de arquivos (fontes, imagens, configuração) são substituídas por
  callbacks fornecidos por quem chama (por exemplo, `setImageSizer`). O comportamento é preservado; o mecanismo difere.

---

## Relatar uma divergência {#reporting-a-divergence}

Se você encontrar uma saída que difere da do C e que **não** seja um delta aceito acima,
não esteja no `PARITY-dot.md` e não seja um não objetivo, isso é um bug que vale a pena relatar — o código-fonte
em C é a especificação, e divergências não listadas são tratadas como defeitos, não como
comportamento aceito.
