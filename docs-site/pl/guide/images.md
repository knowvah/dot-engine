---
sourceHash: 724c941cdb4449b62d97fc99fbcfbbd209d304f41b096bc7948b89c1c51b222b
---
# Obrazy

Węzeł z `image="logo.png"` (albo komórka `<IMG SRC="logo.png">` w etykiecie w stylu
HTML) domyślnie nie ma osadzonych pikseli. @knowvah/dot-engine emituje źródło
**dosłownie**:

```html
<image xlink:href="logo.png" width="64px" height="64px" .../>
```

Cokolwiek wyświetla SVG — `<img>`/inline `<svg>` w przeglądarce, powłoka Electron,
build strony statycznej — samo rozwiązuje ten `href`. Ta strona opisuje, jak ustala
się rozmiar tego href podczas układu, trzy sposoby, by piksele faktycznie się
pojawiły, oraz konsekwencje każdego z nich dla CSP.

## Jak obrazy przepływają

1. Graf deklaruje `image="logo.png"` na węźle albo etykieta w stylu HTML zawiera
   komórkę `<IMG>`.
2. Dla komórki `<IMG>` w etykiecie w stylu HTML Graphviz potrzebuje **własnej
   szerokości/wysokości** obrazu, by ustalić rozmiar komórki, zanim zdoła rozłożyć
   cokolwiek innego — biblioteka nigdy nie sięga do systemu plików ani sieci, żeby to
   sprawdzić, więc rejestrujesz miernik (`setImageSizer`, omówiony w
   [Użycie w przeglądarce](/pl/guide/browser) i jeszcze raz poniżej dla Node). Atrybut
   `image=` węzła **nie** jest mierzony przez miernik: tak jak w natywnym Graphviz
   bez interfejsu, węzeł zachowuje swoje zwykłe pudełko, a obraz jest w nim rysowany.
3. Układ jest liczony z wymiarami, które Twój miernik zwrócił dla każdego `<IMG>`.
4. Emiter SVG (`usershape()` z `src/render/svg.ts`) zapisuje
   `<image xlink:href="...">` z pudełkiem obliczonym w kroku 3. Domyślnie
   `href` to surowy ciąg `src`, z ucieczką XML, nic więcej.
5. Opcjonalnie — jeśli wywołano `setImageResolver` i renderowano z
   `{ inlineImages: true }` — emiter zamiast tego zapisuje
   `xlink:href="data:<mime>;base64,<bytes>"`, samodzielny URI `data:`.
   Jest to dodatek; natywny Graphviz tego nie robi.

Mierzenie i osadzanie inline to dwa niezależne, osobno rejestrowane punkty
rozszerzeń: możesz mierzyć obrazy bez osadzania ich (typowy przypadek — plik hostujesz),
albo robić jedno i drugie (samodzielny SVG).

## Mierzenie w Node a w przeglądarce

`setImageSizer` przyjmuje `(src: string) => { w: number; h: number } | null` i jest
wywoływany raz dla każdego odrębnego źródła `image=`/`<IMG>` podczas układu. Jest to
rejestracja globalna dla procesu, ten sam wzorzec co `setImageResolver` poniżej —
wywołaj go raz przed `render()`/`renderSvg()`.

**Przeglądarka** — zmierz prawdziwy obraz, skoro masz już `Image` i
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

`setImageSizer` jest synchronicznym callbackiem — nie ma w nim `await` — więc
w przeglądarce wymiary są rozwiązywane z wyprzedzeniem (przez `decode()`) do pamięci
podręcznej przed uruchomieniem układu, a potem odczytywane z niej synchronicznie.

**Node** — nie ma DOM-owego `Image`, a biblioteka nie przeczyta za Ciebie systemu
plików. Albo wpisz na stałe znane wymiary, albo odczytaj je sam
(np. z manifestu albo z lekkiego parsera nagłówków PNG/JPEG, który dostarczysz)
i przekaż wynik w ten sam sposób:

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

Jeśli Twoje grafy nigdy nie odwołują się do obrazów zewnętrznych, pomiń to w całości.

## Asynchroniczny miernik i resolver (dla pojedynczego renderowania)

`setImageSizer` / `setImageResolver` to synchroniczne, globalne dla procesu
rejestracje, więc wzorzec przeglądarkowy powyżej musi z wyprzedzeniem wypełniać
pamięć podręczną. Asynchroniczne punkty wejścia przyjmują haki **przy każdym wywołaniu**
i same na nie czekają:

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

- Każdy hak jest wywoływany **co najwyżej raz dla każdego odrębnego `src`**, równolegle,
  przed rozpoczęciem układu. Silnik uruchamia potem zwykły synchroniczny układ na
  zebranych wynikach.
- Hak, który **rzuca wyjątek lub zostaje odrzucony**, jest traktowany jak pudło (`null`),
  dokładnie jak hak synchroniczny zwracający `null`: zerowy rozmiar dla miernika,
  przepuszczenie surowego `src` dla resolvera.
- Gdy podano hak asynchroniczny, pudło **nie** wraca do globalnych
  `setImageSizer` / `setImageResolver`. Gdy go nie podano, obowiązują globalne,
  jak w `renderSvg`.
- Haki dotyczą tylko tego jednego renderowania; nic globalnego nie jest rejestrowane.
- `imageResolver` jest wywoływany tylko wtedy, gdy `inlineImages` ma wartość `true`.
- `renderSvgInto` przyjmuje te same opcje.

## Sprawienie, by obraz się pojawił

Mierzenie sprawia, że układ jest poprawny; nie sprawia, że piksele pokażą się wszędzie,
gdzie SVG zostanie wyświetlony. Wybierz jedno z trzech podejść.

### 1. Hostowanie pliku {#1-host-the-file}

Udostępnij obraz pod adresem URL (albo ścieżką względną do miejsca, w którym
wyświetlany jest SVG), który przeglądarka/odbiorca może pobrać. To najprostsza opcja
i nie wymaga dodatkowej pracy w czasie renderowania — ale kontekst wyświetlania musi
mieć dostęp do tego źródła, a jeśli SVG jest pokazywany gdzieś ze ścisłym `img-src`
w CSP, to źródło musi tam również być dopuszczone (zobacz niżej).

### 2. Osadzenie inline jako URI `data:` {#2-inline-as-a-data-uri}

Użyj API osadzania z T1, by uzyskać jeden samodzielny ciąg SVG bez żadnego
zewnętrznego pobierania: `setImageResolver` dostarcza surowe bajty,
a `render(g, 'svg', { inlineImages: true })` je osadza.

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

`ImageResolver` może też zwrócić `{ bytes: Uint8Array; mime?: string }`, gdy
chcesz jawnie podać typ MIME (w przeciwnym razie emiter wnioskuje go z rozszerzenia
pliku źródła — `.png` → `image/png`, `.svg` →
`image/svg+xml` itd., a dla nieznanych rozszerzeń wraca do `application/octet-stream`).
Wywołaj `setImageResolver(null)`, aby wyczyścić rejestrację.

::: tip
Wybieraj osadzanie inline, gdy SVG trafia tam, gdzie w momencie wyświetlania nie da się
pobrać zasobów zewnętrznych — klienty poczty, dokumentacja offline, osadzenie
ze ścisłym CSP albo wszędzie tam, gdzie chcesz jednego samodzielnego ciągu bez
dodatkowego żądania sieciowego. Wadą jest rozmiar wyniku: base64 powiększa obraz
o ~33%, a obraz jest duplikowany w każdym SVG, który się do niego odwołuje (bez
ponownego użycia pamięci podręcznej przeglądarki między renderowaniami).
:::

`inlineImages` domyślnie ma wartość `false`; gdy nie jest ustawione, wynik jest
bajt w bajt identyczny z dawnym przepuszczaniem sprzed osadzania inline. Dotyczy tylko
formatu `svg` — nie ma wpływu na `json`/`xdot`/`dot`/inne formaty tekstowe. Pudło
(nie zarejestrowano resolvera albo resolver zwraca `null` dla danego `src`) powoduje
automatyczny powrót do przepuszczenia surowego `src` — osadzanie inline degraduje się
łagodnie, nigdy nie rzuca wyjątku.

### 3. Katalogi bazowe w stylu `imagepath` {#3-imagepath-style-base-directories}

Atrybut grafu `imagepath` w natywnym Graphviz wskazuje binarce w C katalog
wyszukiwania w stylu systemu plików/`GDFONTPATH`, względem którego rozwiązywane są
względne wartości `image=`. @knowvah/dot-engine nie implementuje `imagepath` — port
nigdy sam nie czyta danych obrazów z dysku, więc nie ma ścieżki, względem której
można by rozwiązywać (pełną granicę zakresu opisuje
[Znane rozbieżności](/pl/divergences)). Jeśli Twoje grafy używają względnych ścieżek
`image=`, rozwiązuj je względem własnego katalogu/adresu URL bazowego w tej warstwie,
która tworzy źródło DOT, albo w swoich callbackach `setImageSizer`/`ImageResolver` —
oba dostają surowy ciąg `src` dokładnie tak, jak zapisano go w grafie, więc
poprzedzenie go prefiksem ścieżki bazowej przed wyszukaniem to normalny,
usankcjonowany wzorzec.

## Wskazówki dotyczące CSP

Jeśli Twoje grafy są dostarczane przez użytkowników (plac zabaw, osadzenie renderujące
dowolny DOT), przemyśl politykę `img-src` strony od początku.

**Obrazy osadzone inline (URI `data:`)** wymagają tylko:

```
img-src 'self' data:
```

Jako nagłówek odpowiedzi HTTP:

```
Content-Security-Policy: img-src 'self' data:
```

Albo jako znacznik meta na stronie, która hostuje SVG:

```html
<meta http-equiv="Content-Security-Policy" content="img-src 'self' data:">
```

To ścisłe ustawienie — nigdy nie jest kontaktowany żaden zewnętrzny host obrazów,
bo bajty są już osadzone w ciągu SVG.

**Obrazy hostowane (opcja 1 powyżej)** natomiast wymagają, by kontekst wyświetlania
pobierał je stamtąd, gdzie faktycznie leżą. Jeśli graf dostarczony przez użytkownika
może odwoływać się do dowolnego adresu URL w `image=`, dopuszczenie każdego możliwego
hosta jest często niepraktyczne, więc strona z placem zabaw/osadzeniem może wymagać
czegoś liberalnego:

```
Content-Security-Policy: img-src 'self' data: https:
```

::: warning
Nigdy nie ustawiaj `img-src *` (ani równie liberalnego `img-src`) jako **domyślnego
dla całej witryny**. Ogranicz je do konkretnej strony z placem zabaw/osadzeniem,
która musi renderować dowolne grafy dostarczone przez użytkowników, traktuj to jako
świadome, udokumentowane poluzowanie tylko dla tej strony i utrzymuj ścisłe CSP
wszystkich pozostałych stron. Liberalny `img-src` pozwala złośliwemu grafowi
wyprowadzać dane kanałami bocznymi przez adresy URL obrazów (np. kodując dane
w parametrach zapytania do hosta kontrolowanego przez atakującego) albo ładować
niepożądane treści zdalne. Jeśli kontrolujesz zestaw obrazów, wybierz osadzanie
inline (`data:`) i wszędzie utrzymuj `img-src 'self'
data:`.
:::

## Brakujące obrazy

Jeśli `setImageSizer` zwraca `null` (albo nie zarejestrowano miernika) dla
wskazanego źródła, @knowvah/dot-engine idzie tą samą ścieżką wierną C co pudło
`gvusershape` w natywnym Graphviz: ostrzega i traktuje obraz jako **zerowy
rozmiar**, co wpływa na układ pudełka węzła obliczony wokół niego. Jeśli w grze są
`setImageResolver`/`inlineImages` i resolver chybia, emiter wraca do przepuszczenia
surowego `src` zamiast osadzać inline — `href` nadal jest zapisywany, tylko nie
zostanie rozwiązany, jeśli nic innego na stronie nie potrafi go pobrać. Co jest,
a co nie jest w zakresie obsługi obrazów/rastrów w ogóle, opisuje
[Znane rozbieżności](/pl/divergences).
