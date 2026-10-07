---
sourceHash: caef116c0b8959819373d82660fc2c5014f4b538fd6e44c6110d42251eff3955
---
# Imagini

Un nod cu `image="logo.png"` (sau o celulă `<IMG SRC="logo.png">` dintr-o etichetă de tip HTML)
nu are pixelii încorporați în mod implicit. @knowvah/dot-engine emite sursa
**ca atare**:

```html
<image xlink:href="logo.png" width="64px" height="64px" .../>
```

Orice afișează SVG-ul — un `<img>`/`<svg>` inline din browser, un shell
Electron, un build de site static — rezolvă singur acel `href`. Această pagină tratează
modul în care acel href este dimensionat în timpul aranjării, trei moduri de a face ca pixelii să
apară efectiv și implicațiile CSP ale fiecăruia.

## Cum circulă imaginile

1. Graful declară `image="logo.png"` pe un nod, sau o etichetă de tip HTML
   conține o celulă `<IMG>`.
2. Pentru o celulă HTML `<IMG>`, Graphviz are nevoie de **lățimea/înălțimea
   intrinsecă** a imaginii pentru a dimensiona celula înainte de a putea aranja orice altceva —
   biblioteca nu atinge niciodată sistemul de fișiere sau rețeaua pentru a afla aceasta, deci
   înregistrați un măsurător de dimensiuni (`setImageSizer`, tratat în
   [Utilizare în browser](/ro/guide/browser) și din nou mai jos pentru Node). Atributul `image=`
   al unui nod **nu** este dimensionat de acest măsurător: ca în Graphviz nativ fără interfață grafică,
   nodul își păstrează caseta normală, iar imaginea este desenată în ea.
3. Aranjarea rulează folosind dimensiunile returnate de măsurătorul dumneavoastră pentru fiecare `<IMG>`.
4. Emițătorul SVG (`usershape()` din `src/render/svg.ts`) scrie
   `<image xlink:href="...">` cu caseta calculată la pasul 3. Implicit,
   `href` este șirul `src` brut, cu caractere XML escapate, nimic altceva.
5. Opțional — dacă ați apelat `setImageResolver` și ați randat cu
   `{ inlineImages: true }` — emițătorul scrie în schimb
   `xlink:href="data:<mime>;base64,<bytes>"`, un URI `data:` autonom.
   Aceasta este o adăugire; nu este ceva ce face Graphviz nativ.

Dimensionarea și încorporarea sunt două puncte de extensie independente, înregistrate separat: puteți
dimensiona imaginile fără a le încorpora (cazul obișnuit — găzduiți fișierul), sau le puteți face
pe amândouă (SVG autonom).

## Dimensionarea în Node față de browser

`setImageSizer` primește `(src: string) => { w: number; h: number } | null` și
este consultat o singură dată pentru fiecare sursă distinctă `image=`/`<IMG>` în timpul aranjării. Este o
înregistrare globală la nivel de proces, același tipar ca `setImageResolver` de mai jos — apelați-o
o singură dată înainte de `render()`/`renderSvg()`.

**Browser** — măsurați imaginea reală, deoarece aveți deja `Image` și
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

`setImageSizer` este un callback sincron — nu există niciun `await` în el —
deci în browser dimensiunile se rezolvă în prealabil (prin `decode()`) într-un cache
înainte de rularea aranjării, apoi cache-ul este citit sincron.

**Node** — nu există `Image` din DOM, iar biblioteca nu va citi
sistemul de fișiere pentru dumneavoastră. Fie codificați dimensiunile cunoscute în cod, fie citiți-le singur
(de ex. dintr-un manifest sau cu un analizor de antete PNG/JPEG ușor, pe care îl furnizați) și
transmiteți rezultatul în același mod:

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

Dacă grafurile dumneavoastră nu fac niciodată referire la imagini externe, omiteți complet acest pas.

## Măsurător și rezolvator asincron (la fiecare randare)

`setImageSizer` / `setImageResolver` sunt înregistrări sincrone, globale la nivel de proces,
deci tiparul din browser de mai sus trebuie să preîncălzească un cache. Punctele de intrare asincrone
primesc hook-urile **la fiecare apel** și le așteaptă pentru dumneavoastră:

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

- Fiecare hook este apelat **cel mult o dată pentru fiecare `src` distinct**, în paralel, înainte ca
  aranjarea să înceapă. Apoi motorul rulează aranjarea sa sincronă obișnuită pe rezultatele
  colectate.
- Un hook care **aruncă o excepție sau este respins** este tratat ca o ratare (`null`), exact ca un
  hook sincron care returnează `null`: dimensiune zero pentru măsurător, `src` brut transmis mai departe
  pentru rezolvator.
- Când este dat un hook asincron, o ratare **nu** revine la
  `setImageSizer` / `setImageResolver` globale. Când nu este dat, se aplică cele globale,
  ca în `renderSvg`.
- Hook-urile se aplică doar acelei randări; nu se înregistrează nimic global.
- `imageResolver` este consultat doar când `inlineImages` este `true`.
- `renderSvgInto` acceptă aceleași opțiuni.

## Cum apare imaginea

Dimensionarea face aranjarea corectă; nu face ca pixelii să apară oriunde ajunge
SVG-ul afișat. Alegeți una dintre cele trei abordări.

### 1. Găzduiți fișierul

Serviți imaginea la un URL (sau la o cale relativă la locul în care este afișat
SVG-ul) pe care browserul/consumatorul îl poate prelua. Aceasta este cea mai simplă opțiune și
nu cere nicio muncă suplimentară la momentul randării — dar contextul de afișare trebuie să poată
ajunge la acea origine, iar dacă SVG-ul este afișat undeva cu un CSP `img-src` strict,
acea origine trebuie să fie pusă pe lista de permisiuni și acolo (vedeți mai jos).

### 2. Încorporați ca URI `data:`

Folosiți API-ul de încorporare pentru a produce un singur șir SVG autonom, fără
nicio preluare externă: `setImageResolver` furnizează octeții bruți, iar
`render(g, 'svg', { inlineImages: true })` îi încorporează.

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

`ImageResolver` poate returna și `{ bytes: Uint8Array; mime?: string }` atunci când
doriți să specificați explicit un tip MIME (altfel emițătorul îl deduce
din extensia fișierului sursă — `.png` → `image/png`, `.svg` →
`image/svg+xml` și așa mai departe, revenind la `application/octet-stream` pentru
extensii necunoscute). Setați `setImageResolver(null)` pentru a șterge înregistrarea.

::: tip
Preferați încorporarea atunci când SVG-ul ajunge undeva unde nu poate prelua resurse externe
la momentul afișării — clienți de e-mail, documentație offline, o încorporare cu CSP strict,
sau oriunde doriți un singur șir autonom, fără nicio cerere de rețea ulterioară. Compromisul
este dimensiunea ieșirii: base64 umflă imaginea cu ~33%, iar
aceasta este duplicată în fiecare SVG care o referă (fără reutilizarea cache-ului browserului
între randări).
:::

`inlineImages` este implicit `false`; când nu este setat, ieșirea este identică octet cu octet cu
transmiterea directă de dinainte de încorporare. Afectează doar formatul `svg` — nu are efect
asupra formatelor text `json`/`xdot`/`dot`/altele. O ratare (niciun rezolvator înregistrat, sau
rezolvatorul returnează `null` pentru acel `src`) revine automat la
transmiterea `src` brut — încorporarea se degradează grațios, nu aruncă niciodată excepții.

### 3. Directoare de bază în stilul `imagepath`

Atributul de graf `imagepath` al Graphviz nativ indică binarului C un director de
căutare în stilul sistemului de fișiere/`GDFONTPATH` față de care se rezolvă valorile relative `image=`.
@knowvah/dot-engine nu implementează `imagepath` — portul nu citește niciodată el însuși datele imaginii de pe disc,
deci nu există nicio cale față de care să se rezolve
(vedeți [Divergențe cunoscute](/ro/divergences) pentru limita completă a domeniului). Dacă
grafurile dumneavoastră folosesc căi relative `image=`, rezolvați-le față de propriul
director/URL de bază, în oricare strat construiește sursa DOT sau în
callback-urile `setImageSizer`/`ImageResolver` — ambele primesc șirul `src` brut
exact așa cum este scris în graf, deci prefixarea lui cu o cale de bază
înainte de căutare este un tipar normal, acceptat.

## Ghid CSP

Dacă grafurile dumneavoastră sunt furnizate de utilizator (o zonă de testare, o încorporare care randează
DOT arbitrar), gândiți-vă din start la politica `img-src` a paginii.

**Imaginile încorporate (URI-uri `data:`)** au nevoie doar de:

```
img-src 'self' data:
```

Ca antet de răspuns HTTP:

```
Content-Security-Policy: img-src 'self' data:
```

Sau ca etichetă meta în pagina care găzduiește SVG-ul:

```html
<meta http-equiv="Content-Security-Policy" content="img-src 'self' data:">
```

Este o politică strictă — nicio gazdă externă de imagini nu este contactată vreodată, deoarece octeții
sunt deja încorporați în șirul SVG.

**Imaginile găzduite (opțiunea 1 de mai sus)**, în schimb, cer ca contextul de afișare să
preia de oriunde se află efectiv imaginile. Dacă un graf furnizat de utilizator poate
face referire la un URL `image=` arbitrar, includerea pe lista de permisiuni a fiecărei gazde posibile
este adesea impracticabilă, deci o pagină de zonă de testare/încorporare poate necesita ceva permisiv:

```
Content-Security-Policy: img-src 'self' data: https:
```

::: warning
Nu faceți niciodată `img-src *` (sau orice `img-src` la fel de permisiv) valoarea implicită **la nivel de site**.
Limitați-l la pagina specifică de zonă de testare/încorporare care trebuie să randeze
grafuri arbitrare furnizate de utilizator, tratați-l ca pe o relaxare deliberată, documentată,
doar pentru acea pagină, și păstrați strict CSP-ul fiecărei alte pagini. Un
`img-src` permisiv permite unui graf rău intenționat să exfiltreze date prin canale
laterale ale URL-urilor de imagine (de ex. codificând date în parametrii de interogare către o gazdă
controlată de atacator) sau să încarce conținut la distanță nedorit. Dacă controlați
setul de imagini, preferați încorporarea (`data:`) și păstrați `img-src 'self'
data:` peste tot.
:::

## Imagini lipsă

Dacă `setImageSizer` returnează `null` (sau nu este înregistrat niciun măsurător) pentru o
sursă referită, @knowvah/dot-engine urmează aceeași cale fidelă codului C ca
ratarea `gvusershape` din Graphviz nativ: avertizează și tratează imaginea ca având
**dimensiune zero**, ceea ce afectează aranjarea casetei nodului calculată în jurul ei. Dacă
`setImageResolver`/`inlineImages` este în joc și rezolvatorul dă greș, emițătorul
revine la transmiterea `src` brut în loc să încorporeze — `href` este
scris în continuare, doar că nu se va rezolva decât dacă altceva din pagină îl poate prelua. Vedeți [Divergențe cunoscute](/ro/divergences) pentru ce este în
domeniu și în afara lui în privința imaginilor/rasterelor în general.
