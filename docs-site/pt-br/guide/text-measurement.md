---
sourceHash: f2d27a0dea4a09fb6e47ae89ce6cf6d748d7547124a24e8c36d6237d9bad9954
---
# Medição de texto

O layout do dot precisa da largura e da altura de cada rótulo para dimensionar os
nós e posicionar as arestas. O @knowvah/dot-engine mede o texto por meio de um
único ponto de extensão plugável, o `TextMeasurer`, e resolve automaticamente
qual usar — ou você pode definir o seu.

## O contrato

Há dois objetivos distintos, e eles pedem medidores diferentes:

| Objetivo | Medidor | Determinístico? | Kerning / modelagem (shaping) |
|------|----------|----------------|-------------------|
| **Layout reproduzível** (mesma saída em qualquer lugar) | modelo de métricas embutido | sim | não |
| **Layout fiel ao host** (corresponde à fonte de renderização) | o canvas da plataforma | não (depende da fonte) | sim |

O próprio Graphviz nativo é fiel ao host — sua saída depende das fontes
instaladas na máquina que o executa. O @knowvah/dot-engine deixa você escolher:
determinístico por padrão, fiel ao host quando você opta por isso.

## Resolução automática

Quando você não define um medidor, o @knowvah/dot-engine escolhe um a cada
renderização:

1. um medidor explícito definido via `setTextMeasurer` (prevalece, se presente);
2. **navegador** (`document` disponível) → o `<canvas>` da página — fiel ao host,
   medindo com a mesma fonte com que o navegador renderizará o texto do SVG;
3. **Node** → o modelo de métricas determinístico embutido.

A biblioteca tem **zero dependências em tempo de execução** e nunca importa uma
biblioteca de fontes nem o próprio `canvas`; assim o bundle do navegador continua
pequeno e o padrão do Node nunca lê o sistema de arquivos.

## Medição fiel ao host no Node

Para uma saída no Node cujas caixas se ajustem a uma fonte específica (kerning e
shaping reais), instale a peer opcional `canvas` e conecte-a uma vez na
inicialização:

```ts
import { setTextMeasurer, CanvasTextMeasurer, renderSvg } from '@knowvah/dot-engine';
import { createCanvas } from 'canvas'; // optional peer dependency: `npm i canvas`

setTextMeasurer(new CanvasTextMeasurer(createCanvas(0, 0).getContext('2d')));

const svg = renderSvg('digraph { A -> B }', 'dot');
```

`canvas` é declarado como **dependência peer opcional** — não é instalado a menos
que você peça. Quando o Node recorre ao modelo embutido em um terminal
interativo, o @knowvah/dot-engine imprime este aviso uma única vez; silencie-o
com `GV_FONT_QUIET=1`.

## Medidores personalizados

`setTextMeasurer` aceita qualquer coisa que implemente `TextMeasurer`:

```ts
import { setTextMeasurer, type TextMeasurer } from '@knowvah/dot-engine';

const myMeasurer: TextMeasurer = {
  measure: (text, fontname, fontsize) => ({ w: text.length * fontsize * 0.6, h: fontsize }),
};
setTextMeasurer(myMeasurer);
setTextMeasurer(undefined); // restore automatic resolution
```

As implementações embutidas são exportadas para reutilização: `CanvasTextMeasurer`
(envolve qualquer contexto 2D), `EstimateTextMeasurer` (a referência determinística
sem hinting que corresponde ao `estimate_textspan_size` do Graphviz sem interface
— **este é o padrão do Node**) e `LutTextMeasurer` (uma tabela de consulta por
família de fonte, com hinting, disponível como opção para um dimensionamento mais
próximo sem uma dependência nativa de `canvas`).

## Por que essa divisão

Kerning, ligaduras e larguras de glifos não ASCII dependem das tabelas de shaping
da fonte real — uma tabela de largura por caractere não consegue representá-los, e
os valores corretos variam de fonte para fonte (uma fonte monoespaçada renderiza
`<=` como duas células; uma fonte proporcional aproxima `VA` por kerning). Por
isso, o layout reproduzível usa um modelo de métricas fixo; corresponder a uma
fonte de renderização real exige medir com essa fonte, que é o que o medidor
baseado em canvas faz.
