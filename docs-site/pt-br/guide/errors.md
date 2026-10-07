---
sourceHash: 545227fb3a0a91494ed7a2c299e5a9ca93a594d68d99e0596f743e7597dfbae9
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Erros e exceções

O dot-engine lança dois tipos de erro. O tipo que você captura indica quem
precisa mudar alguma coisa.

## Duas famílias, uma regra

| Família | Como reconhecê-la | Significado | Quem age |
|--------|---------------------|---------|----------|
| Falha do dot-engine | `err instanceof DotEngineError` | O dot-engine falhou com esta entrada: DOT inválido, um erro fatal que o próprio Graphviz reportaria, um recurso do Graphviz sem suporte ou um bug do dot-engine | Quem escreveu o DOT, ou um relato de bug |
| Erro de uso | `TypeError` / `RangeError` / `Error` padrão com `err.code` começando por `ERR_` | A chamada estava errada: tipo de argumento inválido, nome de mecanismo ou de formato desconhecido, ordem de chamadas incorreta | O código chamador |

Ramifique por `.code`, não pelo texto da mensagem. As mensagens podem mudar
entre versões; os códigos são estáveis.

Erros de uso não são `DotEngineError`s e não implementam `GvError`. O `name`
deles continua sendo `TypeError`, `RangeError` ou `Error`, como no Node.js.

## Referência das classes

Todas as quatro classes abaixo estendem `DotEngineError` e implementam o formato
`GvError` (`type`, `code`, `message`, `friendlyMessage`, e `location` e
`expected` opcionais).

### `DotEngineError` (abstrata)

A base comum. `instanceof DotEngineError` é verdadeiro para todo erro que o
dot-engine levanta sobre a sua entrada. Ela não pode ser construída
diretamente. `type`, `code` e `friendlyMessage` são definidos pelas subclasses.

### `ParseError`

| Item | Valor |
|------|-------|
| Lançado quando | O código-fonte DOT não é válido ou usa o operador de aresta errado para o tipo de grafo |
| `type` | `syntax` |
| Códigos | `SYNTAX_ERROR`, `SYNTAX_UNEXPECTED_EOF`, `EDGE_OP_DIRECTED_IN_UNDIRECTED`, `EDGE_OP_UNDIRECTED_IN_DIRECTED`, `GENERIC_ERROR` |
| Campos | `location` (`{ line, column, offset? }`), `expected` (expectativas do parser; somente `SYNTAX_*`), getters `line` e `column` |
| Ação do chamador | Corrija o código-fonte DOT. Mostre `location` e `friendlyMessage` a quem o escreveu |

`GENERIC_ERROR` em um `ParseError` significa que o código-fonte tem um
aninhamento tão profundo que o parser ficou sem pilha.

### `HtmlParseError`

| Item | Valor |
|------|-------|
| Lançado quando | Nunca chega a um chamador hoje (veja abaixo) |
| `type` | `semantic` |
| Códigos | `HTML_PARSE_ERROR` |
| Campos | `tag` (o token problemático). Sem `location` nem `expected` |
| Ação do chamador | Nenhuma. Para encontrar um rótulo defeituoso, compare a saída renderizada com o que você esperava |

O parser de rótulos de tipo HTML levanta `HtmlParseError` para um elemento
desconhecido, um atributo malformado ou um `<TABLE>`, `<HR>` ou `<VR>` fora de
lugar. A etapa de layout o captura e deixa o rótulo sem conteúdo, como o
Graphviz faz: o grafo ainda é renderizado, com um rótulo vazio. Nenhuma função
pública o propaga.

`HtmlParseError` não é exportado pela raiz do pacote. Se algum dia um chegar até
você, `err instanceof DotEngineError && err.code === 'HTML_PARSE_ERROR'` o
identifica.

### `RenderError`

| Item | Valor |
|------|-------|
| Lançado quando | O layout ou a renderização falha de um modo que o próprio Graphviz reportaria, o grafo nomeia um mecanismo de layout indisponível ou o grafo usa um recurso do Graphviz que o dot-engine não portou |
| `type` | `render` para `RENDER_ERROR`; `semantic` para `UNKNOWN_LAYOUT` e `UNSUPPORTED_FEATURE` |
| Códigos | `RENDER_ERROR`, `UNKNOWN_LAYOUT`, `UNSUPPORTED_FEATURE` |
| Campos | `cause` quando a falha encapsulou outro erro. Sem `location` |
| Ação do chamador | `RENDER_ERROR`: altere o grafo. `UNKNOWN_LAYOUT`: corrija o atributo `layout=`. `UNSUPPORTED_FEATURE`: evite o recurso (por exemplo, sfdp com `rotation=45`; veja a [tabela](#unsupported-feature-reference)) |

### `InternalError`

| Item | Valor |
|------|-------|
| Lançado quando | Uma asserção ou invariante dentro do dot-engine falha, ou um erro que não é do dot-engine escapa do pipeline de layout ou de renderização |
| `type` | `render` |
| Códigos | `INTERNAL_ERROR` |
| Campos | `cause` (o erro original, quando um foi encapsulado) |
| Ação do chamador | Relate um bug junto com o código-fonte DOT que o provocou |

Nada que quem escreve o DOT possa mudar evitará um `InternalError` de forma
confiável.

## Referência dos códigos

### `GvErrorCode`

| Código | Classe | `type` | Significado | Causa típica | Ação do chamador | Levantado por |
|------|-------|--------|---------|---------------|---------------|-----------|
| `SYNTAX_ERROR` | `ParseError` | `syntax` | Token inesperado | Erro de digitação, `;` ou `}` ausente | Corrigir o DOT em `location` | `parse`, `renderSvg` |
| `SYNTAX_UNEXPECTED_EOF` | `ParseError` | `syntax` | O código terminou no meio de uma instrução | `{`, `[` ou string não fechada | Corrigir o DOT em `location` | `parse`, `renderSvg` |
| `EDGE_OP_DIRECTED_IN_UNDIRECTED` | `ParseError` | `syntax` | `->` em um grafo não direcionado | `graph { a -> b }` | Usar `--` | `parse`, `renderSvg` |
| `EDGE_OP_UNDIRECTED_IN_DIRECTED` | `ParseError` | `syntax` | `--` em um digraph | `digraph { a -- b }` | Usar `->` | `parse`, `renderSvg` |
| `GENERIC_ERROR` | `ParseError` | `syntax` | Código aninhado fundo demais para ser analisado | Subgrafos aninhados de forma patológica | Achatar o DOT | `parse`, `renderSvg` |
| `HTML_PARSE_ERROR` | `HtmlParseError` | `semantic` | Rótulo de tipo HTML malformado | Elemento desconhecido, atributo inválido | Nenhuma: o rótulo é renderizado vazio | Nenhum (capturado internamente) |
| `RENDER_ERROR` | `RenderError` | `render` | Um erro fatal de layout ou de renderização que o Graphviz também reportaria | Entrada malformada para uma etapa de layout | Alterar o grafo | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNKNOWN_LAYOUT` | `RenderError` | `semantic` | O atributo `layout=` do grafo nomeia um mecanismo não registrado | `layout="foo"` | Corrigir o atributo | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNSUPPORTED_FEATURE` | `RenderError` | `semantic` | O grafo solicita um recurso do Graphviz que o dot-engine não portou | sfdp com `rotation=45` | Evitar o recurso | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `INTERNAL_ERROR` | `InternalError` | `render` | Bug do dot-engine | Asserção falha, throw externo | Relatar um bug | `renderSvg`, `render`, `getDrawOps`, métodos do construtor, `GvcContext.layout` (sem encapsulamento) |

### `UsageErrorCode`

| Código | Classe | Significado | Causa típica | Ação do chamador | Levantado por |
|------|-------|---------|---------------|---------------|-----------|
| `ERR_INVALID_ARG_TYPE` | `TypeError` | Tipo errado, `null` ou argumento obrigatório ausente | `renderSvg(undefined, 'dot')`, `getLayout(null)` | Corrigir a chamada | Toda função pública que recebe argumentos |
| `ERR_INVALID_ARG_VALUE` | `TypeError` | Tipo certo, valor desconhecido | Nome de mecanismo ou de formato não registrado; `getLayout(g, { yAxis: 'other' })` | Usar um nome registrado ou um valor permitido | `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps`, `getLayout`, `GvcContext.layout`, `freeLayout`, `bestRenderer`, `renderWithContext` |
| `ERR_OUT_OF_RANGE` | `RangeError` | Argumento numérico fora do seu intervalo | Reservado | Corrigir a chamada | Nenhuma função pública o levanta hoje |
| `ERR_INVALID_STATE` | `Error` | Chamada feita no estado errado | `getLayout` antes do layout | Calcular o layout primeiro (`render(g, ...)` ou `ctx.layout`) | `getLayout` |

Um argumento de mecanismo não registrado é rejeitado mesmo quando o código-fonte
DOT define um atributo `layout=` válido. O argumento é verificado primeiro.

## Referência de `UNSUPPORTED_FEATURE` {#unsupported-feature-reference}

Cada valor de atributo abaixo faz o layout lançar um `RenderError` com o código
`UNSUPPORTED_FEATURE` onde o Graphviz nativo executaria um algoritmo que o
dot-engine não portou. A alternativa era renderizar um layout diferente do do
Graphviz sem avisar. A verificação só dispara quando a condição da coluna
"Dispara quando" é satisfeita; o mesmo atributo em outras situações é
renderizado normalmente. Para evitar o erro, remova o atributo ou mude-o para um
valor suportado.

| Mecanismo | Atributo e valor | Dispara quando | Recurso do Graphviz necessário |
|--------|--------------------|------------|-------------------------|
| neato | `mode=hier` | Sempre (depois que o grafo tem 2+ nós e `maxiter` não é negativo) | Majorização de stress hierárquica (`stress_majorization_with_hierarchy`) |
| neato | `mode=ipsep` | Somente quando o Graphviz construiria restrições: `diredgeconstraints` é verdadeiro ou `hier*`, `overlap=ipsep`, ou o grafo tem um cluster de nível superior. Sem restrições, ele roda como majorização de stress, como no Graphviz | Majorização com restrições (`stress_majorization_cola`) |
| neato | `start=self` | `mode` é `major` (o padrão) ou `ipsep` | Inicialização inteligente (`smart_ini`). Com `mode=KK` ou `mode=sgd`, registra `start=0 not supported with mode=self - ignored` uma vez por renderização, como o Graphviz faz |
| neato | `model=subset` | `mode` é `major` ou `KK` | O modelo de distância por subconjunto |
| neato | `model=circuit` | `mode` é `major`, ou `KK` em um grafo conexo. `KK` em um grafo desconexo sem `pack` nem `packmode` registra um aviso e usa caminhos mais curtos, como o Graphviz faz | O modelo de distância de circuito (`circuit_model`) |
| neato, twopi, circo, sfdp | `overlap=voronoi` (sem distinção entre maiúsculas e minúsculas) | O grafo (para twopi, um componente; para sfdp, o grafo inteiro ou um componente) tem 2+ nós e a própria contagem de sobreposição do Graphviz (`countOverlap`, que testa polígonos de nós) é maior que 0. Nós que apenas se tocam pela caixa delimitadora não a disparam. O circo só chega a ela para um grafo de um único componente (com vários componentes, o Graphviz também ignora `overlap`). O sfdp só chega a ela quando `overlap` não é um modo prism | Remoção de sobreposição por Voronoi (`vAdjust`) |
| fdp | `overlap=` um entre `voronoi`, `oscale`, `vpsc`, `ipsep`, `ortho`, `ortho_yx`, `orthoxy`, `orthoyx`, `portho`, `portho_yx`, `porthoxy`, `porthoyx` | O modo é alcançado depois das tentativas de iteração de forças `N:`, ou seja, quando essas tentativas não removem toda sobreposição (ou `N` é 0 ou está ausente). O prefixo `N:` é permitido, por exemplo `3:voronoi` | O algoritmo de ajuste `removeOverlapWith` correspondente |
| fdp | `splines=compound` | Sempre, com ou sem clusters | Roteamento de arestas que evita clusters (`compoundEdges`) |
| sfdp | `smoothing=` qualquer valor exceto `none` ou `0` | Sempre | `post_process_smoothing` |
| sfdp | `rotation=` qualquer número diferente de zero | Sempre | `rotate()` antes da remoção de sobreposição |
| sfdp | `label_scheme=1` a `4` | Existe um nó chamado `|edgelabel|...`, `overlap` resolve para o modo `prism`, e o esquema é 3 ou 4, ou o esquema é 1 ou 2 e as tentativas de prism são maiores que 0 (`overlap=prism` com uma contagem, não o `prism0` padrão). Valores acima de 4 contam como 0. Rótulos de aresta comuns nunca o disparam | Tratamento de nós de rótulo de aresta (`edge_labeling_scheme`) |
| sfdp | `quadtree=none` (também `0`, `false`) | Qualquer grafo com pelo menos um nó. A mensagem nomeia o esquema resolvido | `spring_electrical_embedding_slow` |
| sfdp | `quadtree=fast` (também `2`) | Qualquer grafo com pelo menos um nó. A mensagem nomeia o esquema resolvido | `spring_electrical_embedding_fast` |
| todos os mecanismos | Uma forma de nó desenhada por um caso especial de `round_corners` que não foi portado | O nó usa essa forma. Mensagem: `special shape N not yet ported` | O ramo de desenho de `round_corners` da forma. É uma proteção interna contra um número de forma sem caso de desenho; nenhuma forma nomeada é conhecida por chegar a ela |

A maioria das mensagens tem a forma `<attribute>=<value>: <what> is not supported yet`.
As exceções são `smoothing` e `rotation` (que nomeiam a rotina ausente), as
linhas do fdp e a linha de forma, que usam as redações acima. Ramifique por
`err.code === 'UNSUPPORTED_FEATURE'`, não pelo texto.

Valores que selecionam o padrão (por exemplo `quadtree=normal`, `true`, `yes`,
`1`) e os valores aceitos pelo Graphviz que foram portados (por exemplo
`start=regular`, `start=random`, `model=mds`, `mode=KK`, `mode=sgd`,
`overlap=prism`, a família `scale` e, em neato, twopi, circo e sfdp,
`overlap=oscale`, `vpsc` e os modos `ortho*` / `portho*`) são renderizados
normalmente.

## Referência por função

"Uso" significa `TypeError` com `ERR_INVALID_ARG_TYPE`, a menos que uma linha
nomeie outro código.

| Função | Pode lançar |
|----------|-----------|
| `renderSvg(dotSource, engine)` | Uso (`dotSource` ou `engine` não é uma string); `TypeError` `ERR_INVALID_ARG_VALUE` (mecanismo não registrado); `ParseError`; `RenderError`; `InternalError` |
| `tryRenderSvg(dotSource, engine)` | Uso (`dotSource` ou `engine` não é uma string); `TypeError` `ERR_INVALID_ARG_VALUE` (mecanismo não registrado). Mais nada: toda falha de entrada DOT é devolvida em `errors` |
| `parse(dotSource)` | `TypeError` `ERR_INVALID_ARG_TYPE` (`dotSource` não é uma string); `ParseError` |
| `render(g, format, opts?)` | Uso (`g`, `format` ou `opts` de tipo errado); `TypeError` `ERR_INVALID_ARG_VALUE` (mecanismo ou formato não registrado); `RenderError`; `InternalError` |
| `getDrawOps(g, opts?)` | Uso (`g` ou `opts` de tipo errado); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.engine` não registrado); `RenderError`; `ParseError` (o xdot intermediário não pôde ser reanalisado: um bug do dot-engine); `InternalError` |
| `createGraph(opts?)` e métodos do construtor (`addNode`, `addEdge`, `addSubgraph`, `setAttr`, ...) | Uso (tipos de argumento errados, inclusive valores de atributo que não são strings); `InternalError` (o modelo de grafo falhou ao criar um nó ou subgrafo) |
| `addEdge(g, tail, head, name?)` (de `/api`) | Uso (`g`, `tail` ou `head` que não sejam objetos; `name` que não seja string) |
| `getLayout(g, opts?)` | Uso (`g` ou `opts` não é um objeto); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.yAxis` diferente de `'up'` ou `'down'`); `Error` `ERR_INVALID_STATE` (layout do grafo não calculado) |
| `new GvcContext(measurer, options?)` | Uso (`measurer` não tem função `measure`; `options` não é um objeto) |
| `ctx.register(plugin)` | Uso (não é um plugin de renderizador nem um mecanismo de layout) |
| `ctx.layout(g, engine)` | Uso (`g` não é um objeto, `engine` não é uma string); `TypeError` `ERR_INVALID_ARG_VALUE` (mecanismo não registrado); `RenderError` `UNKNOWN_LAYOUT`. Falhas do mecanismo se propagam sem encapsulamento |
| `ctx.freeLayout(g, engine)` | Uso; `TypeError` `ERR_INVALID_ARG_VALUE` (mecanismo não registrado). Falhas do mecanismo se propagam sem encapsulamento |
| `ctx.bestRenderer(format)` | Uso (`format` não é uma string); `TypeError` `ERR_INVALID_ARG_VALUE` (nenhum renderizador para `format`) |
| `renderWithContext(ctx, g, format, inlineImages?)` | Uso (`ctx` não é um `GvcContext`, `g` não é um objeto, `format` não é uma string); `TypeError` `ERR_INVALID_ARG_VALUE` (nenhum renderizador para `format`). Falhas de renderização se propagam sem encapsulamento |
| `setImageSizer(sizer)` | Uso (não é uma função nem `null`) |
| `setImageResolver(fn)` | Uso (não é uma função nem `null`) |
| `setTextMeasurer(measurer)` | Uso (não é um `TextMeasurer` nem `undefined`) |

### Quais funções encapsulam throws externos

| Funções | Comportamento diante de um throw inesperado (que não é do dot-engine) |
|-----------|---------------------------------------------------|
| `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps` | Encapsulado como `InternalError`; `cause` é o erro original |
| `renderWithContext` e todo método de `GvcContext` | **Não encapsulado.** Um bug do mecanismo chega ao chamador como o que quer que o mecanismo tenha lançado, por exemplo um `TypeError` simples sem `code` |

Se você usa `GvcContext` diretamente, trate um erro que não seja nem um
`DotEngineError` nem um erro de uso como um bug do dot-engine.

## `tryRenderSvg` ou `renderSvg`

| | `renderSvg` | `tryRenderSvg` |
|---|-------------|----------------|
| DOT inválido ou falha de layout | Lança um `DotEngineError` | Devolve `{ errors: [one] }` |
| Argumentos inválidos | Lança um erro de uso | Lança um erro de uso |
| Valor do erro | Um `Error` com stack e `cause` | Dado simples: `type`, `code`, `message`, `friendlyMessage`, mais `location` / `expected` quando presentes |
| Use quando | A falha deve abortar o chamador | Você ramifica por `code`, ou envia o erro por `postMessage` ou para um log |

`tryRenderSvg` nunca lança para qualquer entrada DOT. Ela só lança quando os
próprios argumentos são inválidos, o que é um bug no código chamador. Os objetos
de erro que ela devolve não carregam `cause` nem stack trace.

## Falhas encapsuladas e `cause`

Quando `renderSvg`, `render` ou `getDrawOps` captura um erro que o dot-engine
não levantou, ela lança um `InternalError` cuja `cause` é o erro original. A
`message` é a mensagem original.

`cause` não é enumerável, então `JSON.stringify(err)` a omite. Percorra a cadeia
explicitamente ao registrar logs (veja o último exemplo abaixo).

## Verificações entre bundles

`instanceof DotEngineError` funciona dentro de uma única cópia da biblioteca. Se
duas cópias puderem ser carregadas (bundles duplicados, um host de plugins), use
`isGvError(e)`. Ele verifica a presença de `type` e `code` como strings e funciona
entre cópias. Também aceita os objetos simples que `tryRenderSvg` devolve.

## Exemplos

Separe as duas famílias:

```ts
import { renderSvg, DotEngineError, ParseError } from '@knowvah/dot-engine';

function renderOrExplain(dot: string): string {
  try {
    return renderSvg(dot, 'dot');
  } catch (err: unknown) {
    if (err instanceof ParseError) {
      const { line, column } = err.location;
      return `DOT error at ${line}:${column}: ${err.friendlyMessage}`;
    }
    if (err instanceof DotEngineError) {
      return `${err.code}: ${err.friendlyMessage}`;
    }
    // A usage error: the call was wrong. Do not swallow it.
    throw err;
  }
}
```

Trate um resultado de `tryRenderSvg`:

```ts
import { tryRenderSvg } from '@knowvah/dot-engine';

const result = tryRenderSvg('digraph { a ->', 'dot');
if (result.svg !== undefined) {
  console.log(result.svg.length);
} else {
  const [first] = result.errors ?? [];
  console.error(first?.code, first?.location);
}
```

Registre um `InternalError` com sua causa:

```ts
import { InternalError } from '@knowvah/dot-engine';

function describeChain(err: unknown): string[] {
  const lines: string[] = [];
  let current: unknown = err;
  while (current instanceof Error) {
    lines.push(`${current.name}: ${current.message}`);
    current = current.cause;
  }
  return lines;
}

export function logFailure(err: unknown): void {
  if (err instanceof InternalError) {
    // Report this: it is a dot-engine bug. `cause` is the original error.
    console.error(describeChain(err).join(' <- '));
  }
}
```

## Veja também

- [Referência da API (seleção)](/pt-br/guide/api) para a assinatura de cada função.
- [Tipos](/pt-br/guide/types) para os formatos `GvError` e `RenderResult`.
- [API gerada (TypeDoc)](/reference/) para as uniões completas `GvErrorCode` e `UsageErrorCode`.
