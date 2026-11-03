---
sourceHash: 5adedf304ed3717b602b9f4cc54a10f403c3ab37a8306bc067767eac53a013c5
---
# Immagini

Un nodo con `image="logo.png"` (o una cella `<IMG SRC="logo.png">` di un'etichetta
in stile HTML) per impostazione predefinita non ha i propri pixel incorporati. @knowvah/dot-engine emette
la sorgente **così com'è**:

```html
<image xlink:href="logo.png" width="64px" height="64px" .../>
```

Qualunque cosa mostri l'SVG — un `<img>`/`<svg>` inline del browser, una shell
Electron, una build di sito statico — risolve da sé quell'`href`. Questa pagina spiega
come quell'href viene dimensionato durante il layout, tre modi per far comparire davvero i pixel
e le implicazioni sulla CSP di ciascuno.

## Come scorrono le immagini

1. Il grafo dichiara `image="logo.png"` su un nodo, oppure un'etichetta in stile HTML
   contiene una cella `<IMG>`.
2. Per una cella `<IMG>` in stile HTML, Graphviz ha bisogno della **larghezza/altezza
   intrinseche** dell'immagine per dimensionare la cella prima di poter disporre qualsiasi altra cosa — la
   libreria non tocca mai il filesystem né la rete per scoprirlo, quindi
   registri un sizer (`setImageSizer`, trattato in
   [Uso nel browser](/it/guide/browser) e di nuovo più sotto per Node). L'attributo `image=` di un nodo viene dimensionato dallo stesso sizer e disegnato all'interno del nodo, come una cella `<IMG>`; `imagescale` e `imagepos` si applicano alle immagini dei nodi, mentre `<IMG>` usa il proprio attributo `SCALE` ed è centrata. L'unità restituita dal sizer è descritta in [`setImageSizer`](/it/guide/api#setimagesizer-setimageresolver).
3. Il layout viene eseguito usando le dimensioni restituite dal tuo sizer per ogni `<IMG>`.
4. L'emettitore SVG (`usershape()` in `src/render/svg.ts`) scrive
   `<image xlink:href="...">` con il riquadro calcolato al passo 3. Per impostazione predefinita
   l'`href` è la stringa `src` grezza, con l'escape XML, nient'altro.
5. Facoltativamente — se hai chiamato `setImageResolver` e hai renderizzato con
   `{ inlineImages: true }` — l'emettitore scrive invece
   `xlink:href="data:<mime>;base64,<bytes>"`, un URI `data:` autonomo.
   È un'aggiunta; non è qualcosa che fa il Graphviz nativo.

Dimensionamento e inlining sono due punti di estensione indipendenti, registrati separatamente: puoi
dimensionare le immagini senza incorporarle (il caso comune — ospiti il file), oppure fare
entrambe le cose (SVG autonomo).

## Dimensionamento in Node e nel browser

`setImageSizer` accetta `(src: string) => { w: number; h: number } | null` e
viene consultato una volta per ogni sorgente distinta di `image=`/`<IMG>` durante il layout. È una
registrazione globale al processo, con lo stesso schema di `setImageResolver` più sotto — chiamala
una volta prima di `render()`/`renderSvg()`.

**Browser** — misura l'immagine reale, dato che hai già `Image` e
`decode()`:

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

`setImageSizer` è una callback sincrona — al suo interno non c'è alcun `await` —
quindi nel browser le dimensioni vanno risolte in anticipo (tramite `decode()`) in una cache
prima dell'esecuzione del layout, per poi leggere quella cache in modo sincrono.

**Node** — non esiste un `Image` del DOM, e la libreria non leggerà il
filesystem per te. Puoi scrivere a mano le dimensioni note, oppure leggerle tu stesso
(ad es. da un manifest, o da un parser leggero di intestazioni PNG/JPEG che fornisci) e
passare il risultato nello stesso modo:

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

Se i tuoi grafi non fanno mai riferimento a immagini esterne, salta del tutto questo passaggio.

## Sizer e resolver asincroni (per rendering)

`setImageSizer` / `setImageResolver` sono registrazioni sincrone e globali al
processo, quindi il pattern per il browser descritto sopra deve precaricare una cache. I punti di ingresso
asincroni accettano gli hook **a ogni chiamata** e li attendono per te:

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

- Ogni hook viene chiamato **al massimo una volta per ogni `src` distinto**, in parallelo, prima
  dell'avvio del layout. Il motore esegue poi il normale layout sincrono sui
  risultati raccolti.
- Un hook che **solleva un'eccezione o viene rifiutato** è trattato come un mancato riscontro (`null`), esattamente come un
  hook sincrono che restituisce `null`: dimensione zero per il sizer, passaggio del `src`
  grezzo per il resolver.
- Quando viene fornito un hook asincrono, un mancato riscontro **non** ricade su
  `setImageSizer` / `setImageResolver` globali. Quando non viene fornito, si applicano i globali
  come in `renderSvg`.
- Gli hook valgono solo per quel singolo rendering; non viene registrato nulla di globale.
- `imageResolver` viene consultato solo quando `inlineImages` è `true`.
- `renderSvgInto` accetta le stesse opzioni.

## Far comparire l'immagine

Il dimensionamento rende corretto il layout; non fa comparire i pixel ovunque
l'SVG venga visualizzato. Scegli uno dei tre approcci.

### 1. Ospitare il file

Servi l'immagine a un URL (o a un percorso relativo al luogo in cui l'SVG viene
visualizzato) che il browser/consumatore possa recuperare. È l'opzione più semplice e
non richiede lavoro aggiuntivo al momento del rendering — ma il contesto di visualizzazione deve poter
raggiungere quell'origine, e se l'SVG viene mostrato in un luogo con una CSP `img-src`
restrittiva, anche quell'origine deve essere inserita nell'elenco consentito lì (vedi sotto).

### 2. Incorporare come URI `data:`

Usa l'API di inlining per produrre un'unica stringa SVG autonoma, senza
alcun recupero esterno: `setImageResolver` fornisce i byte grezzi e
`render(g, 'svg', { inlineImages: true })` li incorpora.

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

`ImageResolver` può anche restituire `{ bytes: Uint8Array; mime?: string }` quando
vuoi specificare esplicitamente un tipo MIME (altrimenti l'emettitore ne deduce uno
dall'estensione del file della sorgente — `.png` → `image/png`, `.svg` →
`image/svg+xml`, e così via, ripiegando su `application/octet-stream` per le
estensioni sconosciute). Imposta `setImageResolver(null)` per cancellare la registrazione.

::: tip
Preferisci l'inlining quando l'SVG viaggia verso un luogo che non può recuperare risorse
esterne al momento della visualizzazione — client di posta, documentazione offline, un incorporamento con CSP
restrittiva, o ovunque tu voglia un'unica stringa autonoma senza successive richieste
di rete. Il compromesso è la dimensione dell'output: il base64 gonfia l'immagine di circa il 33%, e
viene duplicata in ogni SVG che vi fa riferimento (nessun riuso della cache del browser
tra un rendering e l'altro).
:::

`inlineImages` vale `false` per impostazione predefinita; se non impostato, l'output è identico byte per byte
al passaggio diretto precedente all'inlining. Riguarda solo il formato `svg` — non ha effetto
su `json`/`xdot`/`dot`/altri formati di testo. Un mancato riscontro (nessun resolver registrato, oppure
il resolver restituisce `null` per quel `src`) ripiega automaticamente sul passaggio del
`src` grezzo — l'inlining degrada con grazia, non solleva mai eccezioni.

### 3. Directory di base in stile `imagepath`

L'attributo di grafo `imagepath` di Graphviz nativo è un elenco di directory separate da due punti in cui si cercano i nomi relativi di `image=` e `shapefile=`. Il port non legge mai da sé i file immagine, quindi non le scorre mai e non chiede mai `dir/name` all'host: `setImageSizer` e `ImageResolver` ricevono sempre il nome grezzo, esattamente come scritto. Il port usa `imagepath` solo per decidere quale avviso stampare quando l'host non fornisce un nome relativo:

- Con `imagepath` impostato, un nome relativo di `image=`/`shapefile=` che l'host non fornisce emette `Warning: Filename "<name>" is unsafe` e poi `Warning: No or improper image="<name>" for node "<node>"` (oppure, per lo `shapefile=` di una forma personalizzata, `Warning: No or improper shapefile="<name>" for node "<node>"`), come fa il nativo quando nessun `<dir>/<name>` è leggibile.
- Un nome che l'host fornisce tramite gli hook `setImageSizer` o `ImageResolver` del contesto che esegue il layout (o quelli globali) non stampa nessuna di queste righe. Per una forma personalizzata il nodo viene dimensionato in base all'immagine fornita.
- Un nome assoluto, oppure un `imagepath` assente o vuoto, mantiene la riga `Warning: No such file or directory while opening <name>`.

`GV_FILE_PATH` e `SERVER_NAME` non sono rispettate (sono variabili d'ambiente e un browser non ne ha). Per risolvere i percorsi relativi rispetto alla propria directory o URL di base, anteponete il prefisso al nome nel livello che costruisce il sorgente DOT o nei vostri callback `setImageSizer`/`ImageResolver`.

**Tipo di immagine.** Come nel nativo, il tipo è ricavato dai byte restituiti dal resolver tramite riconoscimento dei magic number: png, gif, jpeg, bmp, pdf, ps, eps, ico, riff/webp, e svg solo quando i byte iniziano con una dichiarazione `<?xml` seguita da `<svg`. Qualsiasi cosa più corta di 20 byte non è riconosciuta. Con byte non riconosciuti non viene disegnato nulla e l'immagine non viene dimensionata al rendering. Come il nativo, il port avvisa anche con `Warning: "<name>" was not found as a file or as a shape library member`, seguita dalla riga `No or improper image=`.

`-Tjson` avvisa con `Warning: No loadimage plugin for "png:json"` (il tipo varia) una volta per ogni immagine disegnata, come il nativo, che non ha un loader di immagini json. `svg`, `xdot`, `dot`, `plain` e `cmapx` non stampano nulla per un tipo riconosciuto. Un'immagine nota solo tramite il sizer non ha tipo e quindi non stampa alcun avviso loadimage (vedi [Divergenze note](/it/divergences)).

## Indicazioni sulla CSP

Se i tuoi grafi sono forniti dall'utente (un'area di prova, un incorporamento che renderizza
DOT arbitrario), pensa fin dall'inizio alla policy `img-src` della pagina.

**Le immagini incorporate (URI `data:`)** richiedono solo:

```
img-src 'self' data:
```

Come intestazione di risposta HTTP:

```
Content-Security-Policy: img-src 'self' data:
```

Oppure come meta tag nella pagina che ospita l'SVG:

```html
<meta http-equiv="Content-Security-Policy" content="img-src 'self' data:">
```

È una policy stretta — non viene mai contattato alcun host di immagini esterno, perché i byte
sono già incorporati nella stringa SVG.

**Le immagini ospitate (opzione 1 sopra)**, al contrario, richiedono che il contesto di visualizzazione
recuperi i file dai luoghi in cui le immagini si trovano davvero. Se un grafo fornito dall'utente può
fare riferimento a un URL arbitrario in `image=`, inserire nell'elenco consentito ogni possibile host è
spesso impraticabile, quindi una pagina di area di prova/incorporamento può richiedere qualcosa di permissivo:

```
Content-Security-Policy: img-src 'self' data: https:
```

::: warning
Non rendere mai `img-src *` (o qualsiasi `img-src` altrettanto permissivo) il tuo
valore predefinito **a livello di sito**. Limitalo alla specifica pagina di area di prova/incorporamento che deve renderizzare
grafi arbitrari forniti dall'utente, trattalo come un allentamento deliberato e documentato
per quella sola pagina, e mantieni restrittiva la CSP di ogni altra pagina. Un
`img-src` permissivo consente a un grafo malevolo di esfiltrare dati tramite canali laterali negli URL delle immagini
(ad es. codificando dati nei parametri di query verso un host controllato
dall'attaccante) o di caricare contenuti remoti indesiderati. Se controlli
l'insieme di immagini, preferisci l'inlining (`data:`) e mantieni `img-src 'self'
data:` ovunque.
:::

## Immagini mancanti

Se `setImageSizer` restituisce `null` (o non è registrato alcun sizer) per una
sorgente a cui si fa riferimento, @knowvah/dot-engine segue lo stesso percorso fedele al C del
mancato riscontro di `gvusershape` nel Graphviz nativo: emette un avviso e tratta l'immagine come di **dimensione
zero**, il che influisce sul layout del riquadro del nodo calcolato attorno ad essa. Se
`setImageResolver`/`inlineImages` è in uso e il resolver non trova nulla, l'emettitore
ripiega sul passaggio del `src` grezzo anziché incorporare — l'`href`
viene comunque scritto, ma non si risolverà a meno che qualcos'altro nella
pagina possa recuperarlo. Vedi [Divergenze note](/it/divergences) per cosa rientra e cosa no
nell'ambito della gestione di immagini/raster in generale.
