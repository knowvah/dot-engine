---
sourceHash: 724c941cdb4449b62d97fc99fbcfbbd209d304f41b096bc7948b89c1c51b222b
---
# Bilder

Bei einem Knoten mit `image="logo.png"` (oder einer `<IMG SRC="logo.png">`-Zelle eines
HTML-artigen Labels) werden die Pixel standardmäßig nicht eingebettet. @knowvah/dot-engine
gibt die Quelle **unverändert** aus:

```html
<image xlink:href="logo.png" width="64px" height="64px" .../>
```

Was auch immer das SVG anzeigt — ein Browser-`<img>`/Inline-`<svg>`, eine Electron-Shell,
ein Static-Site-Build —, löst dieses `href` selbst auf. Diese Seite behandelt, wie dieses
href beim Layout dimensioniert wird, drei Wege, die Pixel tatsächlich sichtbar zu machen,
und die CSP-Auswirkungen jedes Weges.

## Wie Bilder durchlaufen

1. Der Graph deklariert `image="logo.png"` an einem Knoten, oder ein HTML-artiges Label
   enthält eine `<IMG>`-Zelle.
2. Bei einer HTML-artigen `<IMG>`-Zelle benötigt Graphviz die **intrinsische
   Breite/Höhe** des Bildes, um die Zelle zu dimensionieren, bevor irgendetwas anderes
   angeordnet werden kann — die Bibliothek greift dafür nie auf Dateisystem oder Netzwerk
   zu, daher registrieren Sie einen Sizer (`setImageSizer`, behandelt unter
   [Im Browser verwenden](/de/guide/browser) und unten nochmals für Node). Das Attribut
   `image=` eines Knotens wird vom Sizer **nicht** vermessen: Wie im headless nativen
   Graphviz behält der Knoten seinen normalen Kasten, und das Bild wird hineingezeichnet.
3. Das Layout läuft mit den Abmessungen, die Ihr Sizer für jedes `<IMG>` zurückgab.
4. Der SVG-Emitter (`usershape()` in `src/render/svg.ts`) schreibt
   `<image xlink:href="...">` mit dem in Schritt 3 berechneten Kasten. Standardmäßig ist
   das `href` der rohe `src`-String, XML-maskiert, sonst nichts.
5. Optional — wenn Sie `setImageResolver` aufgerufen und mit `{ inlineImages: true }`
   gerendert haben — schreibt der Emitter stattdessen
   `xlink:href="data:<mime>;base64,<bytes>"`, eine in sich geschlossene `data:`-URI. Das
   ist eine Ergänzung; das native Graphviz tut das nicht.

Dimensionieren und Inlining sind zwei unabhängige, getrennt registrierte Nahtstellen: Sie
können Bilder dimensionieren, ohne sie zu inlinen (der Normalfall — die Datei hosten), oder
beides tun (in sich geschlossenes SVG).

## Dimensionieren in Node vs. Browser

`setImageSizer` nimmt `(src: string) => { w: number; h: number } | null` und wird beim
Layout einmal pro eindeutiger `image=`-/`<IMG>`-Quelle befragt. Es ist eine prozessglobale
Registrierung, im selben Muster wie `setImageResolver` unten — rufen Sie es einmal vor
`render()`/`renderSvg()` auf.

**Browser** — vermessen Sie das echte Bild, da Sie `Image` und `decode()` bereits haben:

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

`setImageSizer` ist ein synchroner Callback — darin gibt es kein `await` —, daher löst der
Browser-Weg die Abmessungen (über `decode()`) vor dem Layout in einen Cache auf und liest
diesen Cache dann synchron.

**Node** — es gibt kein DOM-`Image`, und die Bibliothek liest das Dateisystem nicht für
Sie. Entweder legen Sie bekannte Abmessungen fest im Code ab, oder Sie lesen sie selbst
(z. B. aus einem Manifest oder einem leichtgewichtigen PNG/JPEG-Header-Parser, den Sie
bereitstellen) und übergeben das Ergebnis auf dieselbe Weise:

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

Wenn Ihre Graphen nie auf externe Bilder verweisen, überspringen Sie das vollständig.

## Asynchroner Sizer und Resolver (pro Rendering)

`setImageSizer` / `setImageResolver` sind synchrone, prozessglobale Registrierungen, daher
muss das Browser-Muster oben einen Cache vorwärmen. Die asynchronen Einstiegspunkte nehmen
die Hooks **pro Aufruf** entgegen und warten für Sie darauf:

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

- Jeder Hook wird **höchstens einmal pro eindeutigem `src`** aufgerufen, parallel, bevor das
  Layout startet. Die Engine führt dann ihr normales synchrones Layout gegen die gesammelten
  Ergebnisse aus.
- Ein Hook, der **wirft oder ablehnt**, gilt als Fehlschlag (`null`), genau wie ein
  synchroner Hook, der `null` zurückgibt: Größe null beim Sizer, Durchreichen des rohen
  `src` beim Resolver.
- Wenn ein asynchroner Hook übergeben wurde, fällt ein Fehlschlag **nicht** auf das globale
  `setImageSizer` / `setImageResolver` zurück. Wird keiner übergeben, gelten die globalen
  wie bei `renderSvg`.
- Die Hooks gelten nur für dieses eine Rendering; nichts Globales wird registriert.
- `imageResolver` wird nur befragt, wenn `inlineImages` `true` ist.
- `renderSvgInto` akzeptiert dieselben Optionen.

## Das Bild sichtbar machen

Das Dimensionieren bringt das Layout in Ordnung; es macht die Pixel nicht dort sichtbar,
wo das SVG am Ende angezeigt wird. Wählen Sie einen von drei Ansätzen.

### 1. Die Datei hosten

Stellen Sie das Bild unter einer URL bereit (oder einem Pfad relativ zu dem Ort, an dem das
SVG angezeigt wird), die der Browser bzw. Verbraucher abrufen kann. Das ist die einfachste
Option und erfordert keinen zusätzlichen Aufwand beim Rendern — aber der Anzeigekontext
muss diesen Origin erreichen können, und wenn das SVG irgendwo mit strenger `img-src`-CSP
angezeigt wird, muss dieser Origin dort ebenfalls freigegeben sein (siehe unten).

### 2. Als `data:`-URI inlinen

Verwenden Sie die Inlining-API aus T1, um einen einzigen, in sich geschlossenen SVG-String
ganz ohne externen Abruf zu erzeugen: `setImageResolver` liefert die rohen Bytes, und
`render(g, 'svg', { inlineImages: true })` bettet sie ein.

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

`ImageResolver` darf auch `{ bytes: Uint8Array; mime?: string }` zurückgeben, wenn Sie einen
MIME-Typ ausdrücklich angeben möchten (der Emitter leitet andernfalls einen aus der
Dateiendung der Quelle ab — `.png` → `image/png`, `.svg` → `image/svg+xml` usw. — und fällt
bei unbekannten Endungen auf `application/octet-stream` zurück). Mit
`setImageResolver(null)` löschen Sie die Registrierung.

::: tip
Bevorzugen Sie Inlining, wenn das SVG dorthin wandert, wo zur Anzeigezeit keine externen
Ressourcen abgerufen werden können — E-Mail-Clients, Offline-Dokumentation, eine Einbettung
mit strenger CSP oder überall dort, wo Sie einen in sich geschlossenen String ohne
Folgeanfrage im Netzwerk wünschen. Der Preis ist die Ausgabegröße: Base64 bläht das Bild um
etwa 33 % auf, und es wird in jedes SVG dupliziert, das darauf verweist (keine
Wiederverwendung des Browser-Caches über Renderings hinweg).
:::

`inlineImages` ist standardmäßig `false`; ungesetzt ist die Ausgabe byte-identisch zum
früheren Durchreichen ohne Inlining. Es wirkt nur auf das Format `svg` — auf `json`/`xdot`/
`dot`/andere Textformate hat es keine Wirkung. Ein Fehlschlag (kein Resolver registriert,
oder der Resolver gibt für dieses `src` `null` zurück) fällt automatisch auf das Durchreichen
des rohen `src` zurück — Inlining degradiert sanft und wirft nie.

### 3. Basisverzeichnisse im Stil von `imagepath`

Das Graphattribut `imagepath` des nativen Graphviz teilt dem C-Binary ein Suchverzeichnis im
Stil von Dateisystem/`GDFONTPATH` mit, gegen das relative `image=`-Werte aufgelöst werden.
@knowvah/dot-engine implementiert `imagepath` nicht — die Portierung liest Bilddaten nie
selbst von der Festplatte, sodass es keinen Pfad zum Auflösen gibt (die vollständige
Umfangsgrenze finden Sie unter [Bekannte Abweichungen](/de/divergences)). Wenn Ihre Graphen
relative `image=`-Pfade verwenden, lösen Sie sie gegen Ihr eigenes Basisverzeichnis bzw. Ihre
eigene Basis-URL auf — in der Schicht, die den DOT-Quelltext erzeugt, oder in Ihren
`setImageSizer`-/`ImageResolver`-Callbacks: Beide erhalten den rohen `src`-String genau so,
wie er im Graphen steht, sodass das Voranstellen eines Basispfads vor dem Nachschlagen ein
normales, vorgesehenes Muster ist.

## CSP-Hinweise

Wenn Ihre Graphen vom Benutzer geliefert werden (eine Spielwiese, eine Einbettung, die
beliebiges DOT rendert), überlegen Sie sich die `img-src`-Richtlinie der Seite von Anfang an.

**Eingebettete Bilder (`data:`-URIs)** benötigen nur:

```
img-src 'self' data:
```

Als HTTP-Antwort-Header:

```
Content-Security-Policy: img-src 'self' data:
```

Oder als Meta-Tag in der Seite, die das SVG hostet:

```html
<meta http-equiv="Content-Security-Policy" content="img-src 'self' data:">
```

Das ist streng — es wird nie ein externer Bild-Host kontaktiert, weil die Bytes bereits im
SVG-String eingebettet sind.

**Gehostete Bilder (Option 1 oben)** hingegen erfordern, dass der Anzeigekontext von dort
abruft, wo diese Bilder tatsächlich liegen. Wenn ein vom Benutzer gelieferter Graph auf eine
beliebige `image=`-URL verweisen kann, ist es oft unpraktikabel, jeden möglichen Host
freizugeben, sodass eine Spielwiese bzw. Einbettungsseite womöglich etwas Großzügiges
braucht:

```
Content-Security-Policy: img-src 'self' data: https:
```

::: warning
Machen Sie `img-src *` (oder ein ebenso großzügiges `img-src`) niemals zu Ihrem
**seitenweiten** Standard. Beschränken Sie es auf die konkrete Spielwiesen-/Einbettungsseite,
die beliebige vom Benutzer gelieferte Graphen rendern muss, behandeln Sie es als bewusste,
dokumentierte Lockerung nur für diese Seite und halten Sie die CSP jeder anderen Seite
streng. Ein großzügiges `img-src` lässt einen bösartigen Graphen Daten über
Bild-URL-Seitenkanäle abfließen (z. B. durch Kodieren von Daten in Query-Parametern gegen
einen vom Angreifer kontrollierten Host) oder unerwünschte Remote-Inhalte laden. Wenn Sie
die Bildmenge kontrollieren, bevorzugen Sie stattdessen Inlining (`data:`) und behalten Sie
überall `img-src 'self'
data:` bei.
:::

## Fehlende Bilder

Wenn `setImageSizer` für eine referenzierte Quelle `null` zurückgibt (oder kein Sizer
registriert ist), folgt @knowvah/dot-engine demselben C-getreuen Pfad wie ein Fehlschlag
von `gvusershape` im nativen Graphviz: Es gibt eine Warnung aus und behandelt das Bild als
**Größe null**, was sich auf das um es herum berechnete Kastenlayout des Knotens auswirkt.
Wenn `setImageResolver`/`inlineImages` im Spiel ist und der Resolver nichts findet, fällt
der Emitter auf das Durchreichen des rohen `src` zurück, statt zu inlinen — das `href` wird
trotzdem geschrieben, löst aber nur auf, wenn etwas anderes auf der Seite es abrufen kann.
Was beim Umgang mit Bildern/Rastergrafiken allgemein im und außerhalb des Umfangs liegt,
steht unter [Bekannte Abweichungen](/de/divergences).
