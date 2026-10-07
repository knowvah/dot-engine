---
sourceHash: 66af4fa5a29e8468c7ecdd9bd541c9d7572b0a87dc81ab412cb63c543106fde8
---
# Glossário

Uma definição por termo, em ordem alfabética do termo em inglês (a ordem dos
títulos é mantida como no original). Cada uma aponta para a página do guia (ou
para o código-fonte) que trata do assunto em profundidade.

## Cluster

Um subgrafo cujo nome começa com `cluster` (por exemplo, `subgraph cluster_build`)
— o Graphviz o renderiza como uma caixa distinta que agrupa seus nós membros.
Internamente, o snapshot de geometria do @knowvah/dot-engine renomeia cada
subgrafo de cluster com um nome posicional como `cluster6` (`ClusterGeometry.name`),
e não com o nome do código-fonte DOT; por isso, um consumidor que precisa do nome
original monta um mapa `idByName` antes do layout e reatribui as chaves de
`snapshot.clusters` depois. Veja [Receitas](/pt-br/guide/recipes) para o padrão de
reatribuição e [Construir um grafo em código](/pt-br/guide/build-a-graph) para criar
clusters via `addSubgraph`.

## Conformidade

A propriedade verificada mecanicamente por trás da afirmação de que uma
renderização do @knowvah/dot-engine "corresponde" ao oráculo em C. Depois que
ambos os SVGs são interpretados em árvores de elementos normalizadas, todo valor
numérico (coordenadas, dados de caminho, `points`) deve coincidir dentro de uma
tolerância fixa — **±0,01pt** nos mecanismos determinísticos (`dot`, `circo`,
`twopi`, `osage`, `patchwork`) e **±0,5pt** nos mecanismos iterativos dirigidos
por forças (`neato`, `fdp`, `sfdp`) — e todo valor não numérico (tags, cores,
texto) deve ser exatamente igual. Não é uma afirmação de saída SVG idêntica byte a
byte. Veja [Conformidade](/pt-br/conformance).

## Sistema de coordenadas / eixo y

O sistema de coordenadas nativo do Graphviz tem **y para cima**, com origem no
canto inferior esquerdo; navegadores e telas têm **y para baixo**, com origem no
canto superior esquerdo. `getLayout` usa `yAxis: 'down'` por padrão (inverte todos
os y e normaliza `bounds` para `(0, 0)`) e aceita `yAxis: 'up'` para devolver as
coordenadas nativas do Graphviz sem alteração. As operações de desenho xdot (de
`getDrawOps`) ficam sempre no sistema nativo com y para cima. Veja
[Ler a geometria calculada](/pt-br/guide/geometry).

## Divergência

Uma diferença entre uma renderização do @knowvah/dot-engine e o oráculo que foi
investigada, teve a causa-raiz identificada e foi catalogada — em vez de ser
tolerada silenciosamente. As divergências catalogadas se enquadram em uma de três
classes: diferenças aceitas (deliberadamente não tornadas conformes, por exemplo,
o não determinismo de ponto flutuante entre plataformas), uma cauda longa
acompanhada que ainda está sendo fechada e não objetivos explícitos. Uma diferença
não listada é tratada como defeito, não como comportamento aceito. Veja
[Divergências conhecidas](/pt-br/divergences).

## DOT

A linguagem de descrição de grafos — `digraph { ... }` / `graph { ... }` com
instruções de nó, aresta e atributo — que o @knowvah/dot-engine interpreta antes
de entregar o resultado a um mecanismo de layout. Veja [Primeiros passos](/pt-br/guide/getting-started).

## Medidor de imagens / resolvedor de imagens

Os dois pontos de extensão injetáveis para imagens externas (nós usershape e
células `<IMG>` de rótulos HTML). Um `ImageSizer` informa a largura/altura
natural de uma imagem para que o dimensionamento dos nós e o layout dos rótulos
possam prosseguir sem carregar os dados de pixel; um `ImageResolver` fornece os
bytes reais da imagem para incorporação no momento da renderização. Veja
[Imagens](/pt-br/guide/images).

## Mecanismo de layout

Um dos oito algoritmos de layout que o @knowvah/dot-engine registra, selecionado
pelo nome (`renderSvg(dot, engine)`): `dot` (hierárquico/em camadas), `neato`
(modelo de molas, Kamada–Kawai), `fdp` (dirigido por forças), `sfdp` (dirigido
por forças multiescala, para grafos grandes), `circo` (circular), `twopi`
(radial), `osage` (em clusters) e `patchwork` (treemap quadrado). Veja
[Mecanismos de layout](/pt-br/guide/engines).

## Oráculo

O binário `dot` nativo do Graphviz em C, compilado a partir do código-fonte C
canônico, contra o qual toda renderização do @knowvah/dot-engine é validada. O
@knowvah/dot-engine executa esse binário diretamente (nunca uma build WASM) para
evitar a deriva de ABI entre a referência e o port. Veja
[Conformidade](/pt-br/conformance) e [Paridade](/parity) para saber como as
comparações com o oráculo são executadas e relatadas.

## Rank / rankdir

No layout hierárquico do `dot`, um **rank** é uma camada de nós posicionados na
mesma profundidade no desenho. `rankdir` define a direção em que os ranks fluem —
o padrão `TB` (de cima para baixo), ou `LR`, `BT`, `RL` — definido como atributo
do grafo (`b.setAttr('rankdir', 'LR')`). Veja [Construir um grafo em código](/pt-br/guide/build-a-graph).

## Spline / roteamento de arestas

O caminho curvo (de Bézier) ao longo do qual uma aresta é desenhada, calculado
pelo código de roteamento que contorna obstáculos de nós e clusters. O
@knowvah/dot-engine expõe os pontos de controle roteados como `EdgeGeometry.points`
— um array ordenado de pontos `{x, y}`, em pontos — a partir de `getLayout`. Veja
[Ler a geometria calculada](/pt-br/guide/geometry).

## Medidor de texto

O ponto de extensão injetável (`TextMeasurer`) que informa a largura/altura dos
rótulos para que o dimensionamento de nós e rótulos de arestas possa prosseguir
antes do layout. O @knowvah/dot-engine resolve um automaticamente a cada
renderização — primeiro um `setTextMeasurer` explícito, depois o `<canvas>` do
navegador, se disponível, e então o `EstimateTextMeasurer` determinístico
embutido no Node — ou aceita uma implementação personalizada. Veja
[Medição de texto](/pt-br/guide/text-measurement).

## Usershape

O termo do Graphviz para um nó cuja forma é uma imagem fornecida externamente
(por meio do atributo `image`) em vez de um polígono ou elipse desenhado. O
@knowvah/dot-engine resolve usershapes por meio do ponto de extensão injetável de
medidor/resolvedor de imagens, em vez de ler arquivos diretamente, mantendo a
biblioteca segura para o navegador. Veja [Imagens](/pt-br/guide/images).

## xdot

O formato estendido de operações de desenho do DOT: um fluxo estruturado de
operações (definir cor de preenchimento/traço, definir fonte, preencher/traçar
uma elipse ou polígono, desenhar uma curva de Bézier, desenhar texto) que
descreve exatamente como um grafo renderizado deve ser pintado, na ordem de
pintura. `getDrawOps` retorna esse fluxo como valores `XdotOp` tipados, para
controlar um renderizador próprio (canvas, WebGL, PDF) sem interpretar SVG. Veja
[Renderização própria com operações de desenho xdot](/pt-br/guide/xdot-drawops).
