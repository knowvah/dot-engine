---
sourceHash: 9c653332a94ce7180323ec7cd584987db329e4217af01dd06692e410c0c22a8c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Conformidade: o que “corresponder” significa {#conformance-what-match-means}

O @knowvah/dot-engine é validado contra o binário C canônico do Graphviz, usado como oráculo.
Quando este projeto diz que um grafo **corresponde** ao C — o veredito de paridade
chamado `conformant` —, isso significa uma propriedade específica, verificada mecanicamente,
**não** a igualdade literal, byte a byte, do texto do SVG.

> **Definição.** Uma renderização do port é **conformante** com a renderização do oráculo
> quando, depois que os dois SVGs são analisados em uma árvore de elementos normalizada:
>
> 1. todo valor **numérico** (coordenadas, dados de caminho, `points`, `viewBox`,
>    parâmetros de `transform`) concorda com o oráculo dentro de uma **tolerância**
>    fixa, e
> 2. todo valor **não numérico** (nomes de tags, cores, conteúdo de texto, chaves de
>    atributos, valores enumerados de atributos) é **exatamente igual**.
>
> Se qualquer valor numérico exceder a tolerância, ou qualquer valor não numérico
> for diferente, a renderização **não** é conformante.

## Por que não bytes literais? {#why-not-literal-bytes}

O SVG serializa coordenadas de ponto flutuante como texto decimal. Duas renderizações
matematicamente equivalentes ainda podem diferir no último dígito impresso por causa do
arredondamento IEEE-754, da ordem das operações de ponto flutuante e do comportamento de
`libm`/FMA dependente da plataforma, que varia conforme a CPU e o mecanismo JS. Um critério
de bytes literais seria, portanto, **impossível de testar** nos ambientes de execução que
esta biblioteca visa (navegadores, Node, CPUs diferentes), e não apenas rigoroso. A
conformidade fixa a propriedade que realmente importa — a geometria e o conteúdo que quem
olha vê — em um limite pequeno o bastante para ser imperceptível.

## A tolerância exata {#the-exact-tolerance}

A tolerância é **por classe de mecanismo** e está definida em
[`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts):

| Classe | Tolerância (pt) | Mecanismos |
|---|---:|---|
| `deterministic` | **±0.01** | `dot`, `circo`, `twopi`, `osage`, `patchwork` |
| `iterative` | **±0.5** | `neato`, `fdp`, `sfdp` |

Os mecanismos determinísticos reproduzem as coordenadas inteiras/impressas do C
essencialmente de forma exata, de modo que ±0.01 absorve apenas ruído de formatação
decimal. Os mecanismos iterativos (baseados em forças) dependem de funções transcendentes
cujos resultados no último bit não são reproduzíveis entre plataformas; por isso, têm um
limite mais frouxo e são verificados adicionalmente quanto à igualdade **estrutural**
(mesma árvore de elementos).

Uma ressalva para a superfície **plain/plain-ext**: o plain imprime coordenadas em
polegadas com 5 dígitos significativos (`%.5g`), de modo que, em magnitudes ≥ 100, o quantum
de impressão (0.01) é igual à tolerância de ±0.01. Em grafos muito grandes, uma diferença de
layout abaixo de 1 ULP que por acaso cruza um limite de arredondamento do 5º dígito é
impressa como um passo completo de 0.01 e é sinalizada, embora a geometria subjacente seja
idêntica até ~1e-11 pt (veja a aceitação do circo `2108`, diário de 2026-07-28). As
superfícies xdot/json, que imprimem em pontos, são a comparação de geometria autoritativa
nesse regime.

A **pesquisa de paridade do corpus** avalia todo grafo no modo `deterministic`
(±0.01), independentemente do mecanismo — veja
[`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
(`diffVerdict` → `compareSvg(port, oracle, 'deterministic')`).

## Leia o código {#read-the-code}

A definição acima não é uma aspiração em prosa — é exatamente o que o código de
comparação faz. Para verificar você mesmo:

- [`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts)
  — `TOLERANCES` (a tabela ±0.01 / ±0.5) e `compareSvg`, que percorre as duas árvores
  normalizadas e aplica a regra (1), numérico dentro da tolerância, e a regra (2),
  não numérico exato, atributo por atributo.
- [`test/golden/normalize.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/normalize.ts)
  — como o SVG bruto é analisado na árvore de elementos comparável.
- [`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
  — `diffVerdict`, que atribui um dos vereditos abaixo. O `survey.ts` cobre apenas
  a trilha SVG do `dot`.
- [`test/corpus/engine-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/engine-walk.ts)
  — a pesquisa **xdot** por mecanismo (`npx tsx test/corpus/engine-walk.ts <engine>`), que
  aplica a mesma divisão de classes da tabela acima
  (`TOLERANCE = 0.5` para `neato`/`fdp`/`sfdp`, `0.01` para todos os outros mecanismos)
  e compara fluxos semânticos de operações de desenho (`compareXdot`) em vez de SVG. É
  assim que as trilhas `circo`/`twopi`/`osage`/`patchwork`/`neato`/`fdp`/`sfdp` são
  medidas; a trilha xdot própria do `dot` usa o programa irmão
  [`xdot-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/xdot-walk.ts).

## Os vereditos {#the-verdicts}

A pesquisa atribui a cada grafo exatamente um veredito. Contagens atuais por trilha:
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)
consolida todas as trilhas de mecanismo × superfície (determinísticas e iterativas);
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
é o painel SVG do `dot`, e cada um dos outros mecanismos tem seu próprio painel
`PARITY-<engine>.md` ao lado, em `test/corpus/`:

| Veredito | Significado |
|---|---|
| **`conformant`** | Corresponde ao oráculo conforme a definição acima (numérico dentro da tolerância, não numérico exato). |
| **`structural-match`** | Mesma árvore de elementos, mas um ou mais valores numéricos excedem a tolerância. |
| **`diverged`** | As árvores de elementos diferem (um elemento faltando/extra ou uma divergência não numérica). |
| **`errored` / `timeout`** | O port não conseguiu renderizar a entrada (`errored`; `port-error` nas trilhas por mecanismo) ou excedeu o orçamento de tempo (`timeout`). Contado como falha: entra no denominador da porcentagem de aprovação, nunca como aprovação. |
| **`oracle-error`** | O oráculo em C não conseguiu renderizar a entrada, portanto não há referência para comparar. Fora do escopo: excluído do denominador da porcentagem de aprovação. |

A **porcentagem de aprovação** em todo painel é `conformant / (surveyed − oracle-error)`.

“Conformant” é o critério; “structural-match” é um progresso significativo (forma certa,
coordenadas ainda se afastando); “diverged”, “errored” e “timeout” são lacunas reais.
Nada disso é uma afirmação de saída idêntica byte a byte.

Alguns grafos não têm **nenhum veredito** em um determinado mecanismo: veja
*exclusões de mecanismo* abaixo.

### Exclusões de mecanismo {#engine-exclusions}

Um par (grafo, mecanismo) excluído não é percorrido, portanto não é nem conformante nem
divergente — simplesmente não é medido ali. Isso é diferente de uma divergência aceita, em
que a comparação *aconteceu* e a diferença é perdoada com uma causa documentada.

O critério é deliberadamente alto, porque um grafo não examinado é uma lacuna de cobertura,
e não um custo conhecido. Uma entrada exige as três condições: o algoritmo do mecanismo
comprovadamente não consegue atuar sobre a entrada, pular a entrada economiza tempo real, e
o mesmo comportamento é verificado em uma trilha mais barata. Ser *lento* explicitamente não
basta — uma proporção ruim entre port e oráculo é justamente a aparência de um defeito real
de desempenho, e excluir por causa dela esconderia exatamente aquilo para que o corpus
existe.

Toda exclusão é listada com seu mecanismo em
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md#engine-exclusions);
o registro é `test/corpus/engine-exclusions.json`. O caso motivador é o
`2222`, que declara 28.303 nós e nenhuma aresta: sem nada para relacionar, todo mecanismo
baseado em forças e radial delega ao empacotador de componentes compartilhado e nenhum dos
seus próprios algoritmos é executado — confirmado pelo fato de que as saídas do oráculo
deles são idênticas byte a byte. O `dot` toma um caminho diferente e o cobre de forma
conformante em seis segundos.
