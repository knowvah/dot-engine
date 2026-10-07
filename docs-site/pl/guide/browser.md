---
sourceHash: 96b80725180c7f6708fcc435c4ad98ed934b7e558b1db664f454212b152ed64d
---
# Użycie w przeglądarce

@knowvah/dot-engine nie używa API dostępnych tylko w Node i można go bezpiecznie
spakować dla przeglądarki. Ta strona omawia dwie rzeczy, które warto wiedzieć,
uruchamiając bibliotekę po stronie klienta.

## Pakowanie

Biblioteka to zwykłe moduły ES. Dowolny nowoczesny bundler (Vite, esbuild, Rollup,
webpack) może ją dołączyć. Nie ma zależności uruchomieniowych do wyłączenia z paczki
ani artefaktów WASM do hostowania.

```ts
import { renderSvg } from '@knowvah/dot-engine';

const svg = renderSvg('digraph { a -> b }', 'dot');
document.querySelector('#out')!.innerHTML = svg;
```

[Plac zabaw](/pl/playground) na tej właśnie stronie robi dokładnie to — importuje
silnik i wywołuje `renderSvg` w przeglądarce, bez zapytań do serwera.

## Pomiar tekstu

Graphviz potrzebuje wymiarów tekstu, aby ustalić rozmiary etykiet. @knowvah/dot-engine
radzi sobie z tym automatycznie:

- **W przeglądarce** (gdy istnieje `document`) mierzy tekst za pomocą natywnego
  kontekstu 2D `<canvas>` — wiernie środowisku, bo to ta sama czcionka, którą
  przeglądarka renderuje SVG.
- **W Node** domyślnie używa wbudowanego miernika **Estimate** — deterministycznego
  modelu bezpiecznego dla środowisk bez interfejsu, który odwzorowuje własną funkcję
  Graphviz `estimate_textspan_size`. Aby uzyskać poprawny układ w Node, nie trzeba
  instalować `canvas` ani plików czcionek; dostępny jest też, jako opcja, miernik
  oparty na tabeli wyszukiwania z hintingiem (LUT), który zapewnia rozmiary bliższe
  wiernym środowisku bez natywnej zależności od canvas. Jak jawnie wybrać miernik,
  opisuje [Pomiar tekstu](/pl/guide/text-measurement).

W żadnym przypadku do układu nie są potrzebne pliki czcionek.

## Czcionki webowe: dlaczego ważne jest ich wcześniejsze pobranie

Rozmiary etykiet pochodzą z pomiaru tekstu daną czcionką. Jeśli krój jest zadeklarowany
przez `@font-face`, ale nie skończył się jeszcze ładować, przeglądarka mierzy tekst
czcionką **zastępczą**, a układ okazuje się błędny, gdy prawdziwa czcionka dotrze.
Zmierzone w Chromium z JetBrains Mono: pudełko etykiety miało **70,68 pt** szerokości,
gdy mierzono je przed załadowaniem kroju (czcionka zastępcza), i **124,8 pt** po jego
załadowaniu.

Asynchroniczne punkty wejścia (`renderSvgAsync`, `renderAsync`, `renderSvgInto`)
tego unikają: zbierają czcionki, których zażąda graf, ładują je przez
`document.fonts` i dopiero potem uruchamiają układ. `renderSvgAsync` dał te same
124,8 pt co pomiar po załadowaniu.

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg, fontIssues } = await renderSvgAsync(
  'digraph { node [fontname="JetBrains Mono"]; a -> b }',
  'dot',
  { fontTimeoutMs: 5000 },
);
```

- **`fontTimeoutMs`** (domyślnie `3000`) to jeden termin wspólny dla wszystkich
  krojów, a nie osobny dla każdego.
- **`fontIssues`** to lista `{ face, reason }`. `reason: 'failed'` oznacza, że krój
  zakończył się błędem (na przykład 404) lub jego ładowanie zostało odrzucone;
  `reason: 'timeout'` oznacza, że nie załadował się w czasie `fontTimeoutMs`.
  W obu przypadkach układ jest liczony z czcionką zastępczą. Każdy problem jest
  też zgłaszany przez `console.warn`. Problemy z czcionkami nigdy nie odrzucają
  obietnicy.
- **Ograniczenie:** zgłaszane mogą być tylko rodziny zadeklarowane przez `@font-face`.
  Czcionka systemowa lub nieznana nazwa rodziny jest rozwiązywana jako „załadowana”
  (nie ma na co czekać), więc błędnie zapisane `fontname` nigdy nie trafia do
  `fontIssues`.
- **Node i Workery** nie mają `document.fonts`, więc pobieranie czcionek jest
  pomijane, a `fontIssues` to `[]`. Haki obrazów nadal działają. Możesz przekazać
  `fontSet` (cokolwiek z metodą `load(font)`), aby dostarczyć własny.

## Renderowanie do strony: `renderSvgInto`

```ts
import { renderSvgInto } from '@knowvah/dot-engine';

// <div id="graph"></div>
const { element, fontIssues } = await renderSvgInto('graph', dot, 'dot');
if (fontIssues.length > 0) {
  console.warn('fallback fonts used for', fontIssues.map((i) => i.face));
}
```

Zastępuje dzieci elementu o podanym id wyrenderowanym `<svg>` (zwracanym jako
`element`), używając `DOMParser` i `importNode`, nigdy `innerHTML`. Brakujące id
powoduje odrzucenie z `ERR_INVALID_ARG_VALUE`. SVG jest domyślnie oczyszczany;
przekaż `sanitize`, aby użyć własnego sanitizera, lub `trusted: true`, aby pominąć
oczyszczanie. Co usuwa i co zachowuje oczyszczacz, opisuje sekcja „Security” w README;
utrzymuj też obowiązującą Content-Security-Policy.

## Obrazy zewnętrzne: `setImageSizer`

Gdy etykieta w stylu HTML zawiera obraz zewnętrzny
(`<IMG SRC="logo.png"/>`), Graphviz potrzebuje jego wymiarów własnych, aby
ustalić rozmiar komórki. (Atrybut `image=` węzła nie jest mierzony: węzeł zachowuje
swoje zwykłe pudełko, tak jak w natywnym Graphviz bez interfejsu.) Ponieważ biblioteka
nie może czytać systemu plików, to Ty dostarczasz miernik:

```ts
import { setImageSizer } from '@knowvah/dot-engine';

setImageSizer((src) => {
  // Return the intrinsic { w, h } for this image source, or null if unknown.
  return { w: 64, h: 64 };
});
```

Jeśli Twoje grafy nigdy nie odwołują się do obrazów zewnętrznych, nie musisz tego
wywoływać. Aby mierzyć obrazy asynchronicznie (na przykład ładując je), przekaż
zamiast tego asynchroniczny `imageSizer` do `renderSvgAsync`; zobacz [Obrazy](/pl/guide/images).

## Web Workery

Układ jest liczony synchronicznie, więc duży graf blokuje wątek, na którym działa.
Uruchom go w Workerze, aby strona pozostała responsywna. Wewnątrz Workera nie ma
`document`, więc biblioteka mierzy tekst za pomocą `OffscreenCanvas`, a asynchroniczne
API ładuje czcionki przez własny zestaw czcionek Workera (`self.fonts`).

Czcionki w Workerze są oddzielone od czcionek strony: zarejestruj je w Workerze
za pomocą API `FontFace` (reguły CSS `@font-face` nie docierają do Workerów).

```ts
// graph-worker.ts (module worker)
import { renderSvgAsync } from '@knowvah/dot-engine';

self.fonts.add(new FontFace('Inter', 'url(/fonts/Inter.woff2)'));

self.onmessage = async (e: MessageEvent<string>) => {
  const { svg, fontIssues } = await renderSvgAsync(e.data, 'dot');
  self.postMessage({ svg, fontIssues });
};
```

Renderuj w Workerze za pomocą `renderSvgAsync` (lub `renderAsync`), a nie `renderSvg`,
przynajmniej dopóki każda czcionka webowa się nie załaduje. Chromium nadal mierzy
ciąg czcionki za pomocą kroju zastępczego, jeśli ten dokładny ciąg został zmierzony
w Workerze, zanim krój się załadował, nawet po jego załadowaniu; asynchroniczne API
ładuje czcionki przed pomiarem, więc nigdy na to nie trafia.

## Czego nie oczekiwać

Biblioteka celuje w **SVG** (oraz tekstowe formaty `json` / `xdot` / `dot` / mapa obrazu).
Wyjście rastrowe (PNG/JPG), PostScript/PDF oraz interaktywne/graficzne backendy są
poza zakresem — jeśli potrzebujesz innego formatu, skonwertuj SVG w dalszej części
potoku. Pełną granicę zakresu znajdziesz w [Znane rozbieżności](/pl/divergences).

## Duże grafy: wstępne renderowanie do SVG

Bardzo duże grafy — z grubsza **ponad 10 tys. węzłów lub kilka MB źródła DOT** — nie
nadają się do liczenia układu w czasie działania w przeglądarce. Układ (mincross,
rankowanie, prowadzenie splajnów) jest superliniowy, więc to **sufit skali wspólny
z oryginalnym Graphviz, a nie ograniczenie specyficzne dla tego silnika**: przy takich
danych natywny `dot`, buildy WASM (`@hpcc-js/wasm-graphviz`) i ten silnik jednakowo
przekraczają limit czasu albo kończy im się pamięć. (Ten silnik **nie** przecieka —
sterta na jedno renderowanie jest płaska; limitem jest wyłącznie rozmiar grafu. Zmierzone
porównanie znajdziesz w [panelu wydajności](/perf).)

Dla grafów tej skali **wyrenderuj raz w czasie budowania i serwuj powstały
plik `.svg`**, zamiast liczyć układ w przeglądarce przy każdym wyświetleniu — to ten sam
wzorzec, którego użyłbyś nawet z natywnym `dot`, bo jest zbyt wolny, by uruchamiać go
przy każdym żądaniu.

Adaptery stron działające w czasie budowania z
[knowvah/dot-plugins](https://github.com/knowvah/dot-plugins) (opublikowane w NPM)
robią dokładnie to:

- `@knowvah/vitepress-plugin-dot` — VitePress (markdown-it), w czasie budowania
- `@knowvah/eleventy-plugin-dot` — Eleventy (markdown-it), w czasie budowania
- `@knowvah/docusaurus-plugin-dot` — Docusaurus (MDX/remark), w czasie budowania
- `@knowvah/dot-markdown-it` — integracja markdown-it niezależna od frameworka

Dla dynamicznych grafów dostarczanych przez użytkownika, gdy renderowanie w czasie
budowania nie wchodzi w grę, ogranicz interaktywne renderowanie do grafów rozsądnej
wielkości i buforuj wygenerowany SVG.
