---
sourceHash: caef116c0b8959819373d82660fc2c5014f4b538fd6e44c6110d42251eff3955
---
# Imagens

Um nó com `image="logo.png"` (ou uma célula `<IMG SRC="logo.png">` de um rótulo
no estilo HTML) não tem seus pixels incorporados por padrão. O
@knowvah/dot-engine emite a origem **literalmente**:

```html
<image xlink:href="logo.png" width="64px" height="64px" .../>
```

O que quer que exiba o SVG — um `<img>`/`<svg>` inline do navegador, um shell
Electron, uma build de site estático — resolve esse `href` por conta própria.
Esta página cobre como esse href é dimensionado durante o layout, três maneiras de
fazer os pixels realmente aparecerem e as implicações de CSP de cada uma.

## Como as imagens fluem

1. O grafo declara `image="logo.png"` em um nó, ou um rótulo no estilo HTML
   contém uma célula `<IMG>`.
2. Para uma célula `<IMG>` de rótulo HTML, o Graphviz precisa da **largura/altura
   intrínseca** da imagem para dimensionar a célula antes de poder dispor
   qualquer outra coisa — a biblioteca nunca toca o sistema de arquivos nem a rede
   para descobrir isso, então você registra um medidor (`setImageSizer`, tratado em
   [Uso no navegador](/pt-br/guide/browser) e novamente abaixo para o Node). O
   atributo `image=` de um nó **não** é dimensionado pelo medidor: como no
   Graphviz nativo sem interface, o nó mantém sua caixa normal e a imagem é
   desenhada dentro dela.
3. O layout roda usando as dimensões que seu medidor retornou para cada `<IMG>`.
4. O emissor de SVG (`usershape()` em `src/render/svg.ts`) escreve
   `<image xlink:href="...">` com a caixa calculada no passo 3. Por padrão, o
   `href` é a string `src` bruta, com escape de XML, e nada mais.
5. Opcionalmente — se você chamou `setImageResolver` e renderizou com
   `{ inlineImages: true }` — o emissor escreve, em vez disso,
   `xlink:href="data:<mime>;base64,<bytes>"`, um URI `data:` autocontido. Isso é
   um acréscimo; não é algo que o Graphviz nativo faça.

Dimensionar e incorporar são dois pontos de extensão independentes, registrados
separadamente: você pode dimensionar imagens sem incorporá-las (o caso comum —
hospedar o arquivo) ou fazer as duas coisas (SVG autocontido).

## Dimensionamento no Node vs. no navegador

`setImageSizer` recebe `(src: string) => { w: number; h: number } | null` e é
consultado uma vez por origem distinta de `image=`/`<IMG>` durante o layout. É um
registro global do processo, o mesmo padrão de `setImageResolver` abaixo — chame-o
uma vez antes de `render()`/`renderSvg()`.

**Navegador** — meça a imagem real, já que você tem `Image` e `decode()`:

```ts
import { setImageSizer } from '@knowvah/dot-engine';

const cache = new Map<string, { w: number; h: number }>();

async function warmImageSizes(sources: string[]): Promise<void> {
  for (const src of sources) {
    const img = new Image();
    img.src = src;
    await img.decode();
    cache.set(src, { w: img.naturalWidth, h: img.naturalHeight });
  }
}

// setImageSizer itself must be synchronous, so pre-warm the cache first
// (e.g. await warmImageSizes([...]) before calling render/renderSvg).
setImageSizer((src) => cache.get(src) ?? null);
```

`setImageSizer` é um callback síncrono — não há `await` dentro dele — então o
caminho do navegador resolve as dimensões antecipadamente (via `decode()`) para um
cache antes de o layout rodar e depois lê esse cache de forma síncrona.

**Node** — não há `Image` do DOM, e a biblioteca não lerá o sistema de arquivos
por você. Ou fixe dimensões conhecidas, ou leia-as você mesmo (por exemplo, de um
manifesto ou de um analisador leve de cabeçalhos PNG/JPEG que você fornece) e
entregue o resultado da mesma forma:

```ts
import { setImageSizer } from '@knowvah/dot-engine';
import { readFileSync } from 'node:fs';

// Simplest: fixed dimensions known ahead of time.
setImageSizer((src) => (src === 'logo.png' ? { w: 64, h: 64 } : null));

// Or: derive dimensions in your app layer (disk, S3 head request, a
// manifest file you maintain) and hand back the result synchronously.
const manifest = new Map(
  Object.entries(JSON.parse(readFileSync('image-manifest.json', 'utf8'))),
);
setImageSizer((src) => (manifest.get(src) as { w: number; h: number }) ?? null);
```

Se seus grafos nunca referenciam imagens externas, pule isto por completo.

## Medidor e resolvedor assíncronos (por renderização)

`setImageSizer` / `setImageResolver` são registros síncronos e globais do
processo, então o padrão do navegador acima precisa pré-aquecer um cache. Os
pontos de entrada assíncronos recebem os ganchos **a cada chamada** e os aguardam
para você:

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg } = await renderSvgAsync(
  'digraph { a [label=<<TABLE><TR><TD><IMG SRC="logo.png"/></TD></TR></TABLE>>] }',
  'dot',
  {
    imageSizer: async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      return { w: img.naturalWidth, h: img.naturalHeight };
    },
    inlineImages: true,
    imageResolver: async (src) => {
      const res = await fetch(src);
      return { bytes: new Uint8Array(await res.arrayBuffer()), mime: res.headers.get('content-type') ?? undefined };
    },
  },
);
```

- Cada gancho é chamado **no máximo uma vez por `src` distinto**, em paralelo,
  antes de o layout começar. O mecanismo então executa seu layout síncrono normal
  sobre os resultados coletados.
- Um gancho que **lança exceção ou rejeita** é tratado como uma falha (`null`),
  exatamente como um gancho síncrono que retorna `null`: tamanho zero para o
  medidor, repasse do `src` bruto para o resolvedor.
- Quando um gancho assíncrono é fornecido, uma falha **não** recorre ao
  `setImageSizer` / `setImageResolver` global. Quando ele não é fornecido, os
  globais se aplicam como em `renderSvg`.
- Os ganchos valem apenas para aquela renderização; nada global é registrado.
- `imageResolver` só é consultado quando `inlineImages` é `true`.
- `renderSvgInto` aceita as mesmas opções.

## Fazer a imagem aparecer

O dimensionamento acerta o layout; ele não faz os pixels aparecerem onde quer que
o SVG acabe sendo exibido. Escolha uma de três abordagens.

### 1. Hospedar o arquivo

Sirva a imagem em uma URL (ou em um caminho relativo ao local onde o SVG é
exibido) que o navegador/consumidor consiga buscar. É a opção mais simples e não
exige trabalho extra na renderização — mas o contexto de exibição precisa
conseguir alcançar essa origem e, se o SVG for exibido em um lugar com uma CSP
`img-src` estrita, essa origem também precisa estar na lista de permissões ali
(veja abaixo).

### 2. Incorporar como URI `data:`

Use a API de incorporação para produzir uma única string SVG autocontida,
sem nenhuma busca externa: `setImageResolver` fornece os bytes brutos e
`render(g, 'svg', { inlineImages: true })` os incorpora.

```ts
import { render, setImageResolver } from '@knowvah/dot-engine';
import type { ImageResolver } from '@knowvah/dot-engine';

const images = new Map<string, Uint8Array>([
  ['logo.png', /* Uint8Array of the PNG bytes, e.g. fetched or bundled */ new Uint8Array()],
]);

const resolver: ImageResolver = (src) => images.get(src) ?? null;

setImageResolver(resolver);

const svg = render(g, 'svg', { inlineImages: true });
```

`ImageResolver` também pode retornar `{ bytes: Uint8Array; mime?: string }` quando
você quiser especificar um tipo MIME explicitamente (caso contrário, o emissor
infere um a partir da extensão do arquivo de origem — `.png` → `image/png`, `.svg`
→ `image/svg+xml` e assim por diante, recorrendo a `application/octet-stream`
para extensões desconhecidas). Use `setImageResolver(null)` para limpar o
registro.

::: tip
Prefira a incorporação quando o SVG viaja para um lugar que não consegue buscar
recursos externos no momento da exibição — clientes de e-mail, documentação
offline, uma incorporação com CSP estrita ou qualquer lugar em que você queira
uma única string autocontida, sem nenhuma requisição de rede posterior. A
contrapartida é o tamanho da saída: o base64 infla a imagem em cerca de 33% e ela é
duplicada em cada SVG que a referencia (sem reaproveitamento do cache do
navegador entre renderizações).
:::

`inlineImages` tem como padrão `false`; sem ele, a saída é idêntica byte a byte
ao repasse anterior à incorporação. Ele afeta apenas o formato `svg` — não tem
efeito em `json`/`xdot`/`dot`/outros formatos de texto. Uma falha (nenhum
resolvedor registrado, ou o resolvedor retorna `null` para aquele `src`) recorre
automaticamente ao repasse do `src` bruto — a incorporação degrada com elegância,
nunca lança exceção.

### 3. Diretórios base no estilo `imagepath`

O atributo de grafo `imagepath` do Graphviz nativo informa ao binário em C um
diretório de busca no estilo de sistema de arquivos/`GDFONTPATH` em relação ao
qual resolver os valores relativos de `image=`. O @knowvah/dot-engine não
implementa `imagepath` — o port nunca lê dados de imagem do disco por conta
própria, então não há caminho contra o qual resolver (veja
[Divergências conhecidas](/pt-br/divergences) para o limite completo do escopo).
Se seus grafos usam caminhos relativos em `image=`, resolva-os em relação ao seu
próprio diretório/URL base na camada que constrói o código-fonte DOT ou nos seus
callbacks `setImageSizer`/`ImageResolver` — ambos recebem a string `src` bruta
exatamente como escrita no grafo, então prefixá-la com um caminho base antes da
consulta é um padrão normal e sancionado.

## Orientações de CSP

Se seus grafos são fornecidos pelo usuário (uma área de testes, uma incorporação
que renderiza DOT arbitrário), pense na política `img-src` da página desde o
início.

**Imagens incorporadas (URIs `data:`)** precisam apenas de:

```
img-src 'self' data:
```

Como cabeçalho de resposta HTTP:

```
Content-Security-Policy: img-src 'self' data:
```

Ou como uma tag meta na página que hospeda o SVG:

```html
<meta http-equiv="Content-Security-Policy" content="img-src 'self' data:">
```

Isso é restritivo — nenhum host de imagem externo é jamais contatado, porque os
bytes já estão incorporados na string SVG.

**Imagens hospedadas (opção 1 acima)**, por outro lado, exigem que o contexto de
exibição busque de onde quer que essas imagens realmente estejam. Se um grafo
fornecido pelo usuário puder referenciar uma URL arbitrária em `image=`, colocar
todos os hosts possíveis na lista de permissões costuma ser impraticável, então
uma página de área de testes/incorporação pode precisar de algo permissivo:

```
Content-Security-Policy: img-src 'self' data: https:
```

::: warning
Nunca faça de `img-src *` (ou de qualquer `img-src` igualmente permissivo) o seu
padrão para **todo o site**. Restrinja-o à página específica de área de
testes/incorporação que precisa renderizar grafos arbitrários fornecidos pelo
usuário, trate-o como um relaxamento deliberado e documentado apenas para essa
página e mantenha rígida a CSP de todas as outras páginas. Um `img-src`
permissivo permite que um grafo malicioso exfiltre dados por canais laterais de
URL de imagem (por exemplo, codificando dados em parâmetros de consulta contra um
host controlado pelo atacante) ou carregue conteúdo remoto indesejável. Se você
controla o conjunto de imagens, prefira a incorporação (`data:`) e mantenha
`img-src 'self' data:` em todo lugar.
:::

## Imagens ausentes

Se `setImageSizer` retorna `null` (ou nenhum medidor está registrado) para uma
origem referenciada, o @knowvah/dot-engine segue o mesmo caminho fiel ao C da
falha de `gvusershape` do Graphviz nativo: emite um aviso e trata a imagem como de
**tamanho zero**, o que afeta o layout da caixa do nó calculada ao redor dela. Se
`setImageResolver`/`inlineImages` estiver em uso e o resolvedor falhar, o emissor
recorre ao repasse do `src` bruto em vez de incorporar — o `href` ainda é
escrito, mas só será resolvido se algo mais na página puder buscá-lo. Veja
[Divergências conhecidas](/pt-br/divergences) para o que está dentro e fora do
escopo do tratamento de imagens/raster em geral.
