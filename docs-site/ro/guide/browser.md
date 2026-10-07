---
sourceHash: 96b80725180c7f6708fcc435c4ad98ed934b7e558b1db664f454212b152ed64d
---
# Utilizare în browser

@knowvah/dot-engine nu folosește API-uri exclusiv Node și poate fi inclus în siguranță în pachete pentru browser. Această
pagină tratează cele două lucruri de știut atunci când rulați pe partea de client.

## Includerea în pachet

Biblioteca este formată din module ES simple. Orice bundler modern (Vite, esbuild, Rollup,
webpack) o poate include. Nu există dependențe la rulare de exclus și nici
artefacte WASM de găzduit.

```ts
import { renderSvg } from '@knowvah/dot-engine';

const svg = renderSvg('digraph { a -> b }', 'dot');
document.querySelector('#out')!.innerHTML = svg;
```

[Zona de testare](/ro/playground) a acestui site face exact asta — importă
motorul și apelează `renderSvg` în browser, fără nicio comunicare cu un server.

## Măsurarea textului

Graphviz are nevoie de dimensiunile textului pentru a dimensiona etichetele. @knowvah/dot-engine se ocupă
de asta automat:

- **În browser** (când există `document`), măsoară textul cu contextul 2D
  nativ `<canvas>` — fidel gazdei, deoarece este același font cu care
  browserul randează SVG-ul.
- **În Node**, folosește implicit măsurătorul **Estimate** încorporat — un model
  determinist, sigur în mediu fără interfață grafică, care reproduce
  `estimate_textspan_size` din Graphviz. Nu este nevoie de instalarea `canvas` și nici de fișiere de font pentru a
  obține o aranjare corectă în Node; un măsurător cu tabel de căutare (LUT) cu hinting este de asemenea
  disponibil opțional, pentru o dimensionare mai apropiată de gazdă, fără o dependență
  nativă de canvas. Vedeți [Măsurarea textului](/ro/guide/text-measurement) pentru modul
  de a selecta explicit un măsurător.

În niciun caz nu sunt necesare fișiere de font pentru aranjare.

## Fonturi web: de ce contează preîncărcarea

Dimensiunile etichetelor provin din măsurarea textului cu un font. Dacă un set de caractere este declarat cu
`@font-face`, dar nu s-a terminat de încărcat, browserul măsoară în schimb cu fontul
**de rezervă**, iar aranjarea este greșită odată ce sosește fontul real.
Măsurat în Chromium cu JetBrains Mono: o casetă de etichetă avea lățimea de **70.68 pt** când
era măsurată înainte de încărcarea fontului (rezervă) și de **124.8 pt** după încărcare.

Punctele de intrare asincrone (`renderSvgAsync`, `renderAsync`, `renderSvgInto`) evită
acest lucru: colectează fonturile pe care le va solicita graful, le încarcă prin
`document.fonts` și abia apoi rulează aranjarea. `renderSvgAsync` a produs aceeași
valoare de 124.8 pt ca măsurarea după încărcare.

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg, fontIssues } = await renderSvgAsync(
  'digraph { node [fontname="JetBrains Mono"]; a -> b }',
  'dot',
  { fontTimeoutMs: 5000 },
);
```

- **`fontTimeoutMs`** (implicit `3000`) este un singur termen limită comun tuturor fonturilor, nu
  câte unul pentru fiecare.
- **`fontIssues`** este o listă de `{ face, reason }`. `reason: 'failed'` înseamnă că
  fontul a generat o eroare (de exemplu 404) sau că încărcarea lui a fost respinsă; `reason: 'timeout'`
  înseamnă că nu s-a încărcat în `fontTimeoutMs`. În ambele cazuri aranjarea continuă
  cu un font de rezervă. Fiecare problemă este de asemenea afișată cu `console.warn`. Problemele de font nu
  resping niciodată promisiunea.
- **Limitare:** pot fi raportate doar familiile declarate cu `@font-face`.
  Un font de sistem sau un nume de familie necunoscut este considerat „încărcat” (nu există nimic
  de așteptat), deci un `fontname` scris greșit nu apare niciodată în `fontIssues`.
- **Node și Workers** nu au `document.fonts`, deci preîncărcarea fonturilor este omisă, iar
  `fontIssues` este `[]`. Hook-urile pentru imagini funcționează în continuare. Puteți transmite un `fontSet`
  (orice are `load(font)`) pentru a-l furniza pe al dumneavoastră.

## Randarea într-o pagină: `renderSvgInto`

```ts
import { renderSvgInto } from '@knowvah/dot-engine';

// <div id="graph"></div>
const { element, fontIssues } = await renderSvgInto('graph', dot, 'dot');
if (fontIssues.length > 0) {
  console.warn('fallback fonts used for', fontIssues.map((i) => i.face));
}
```

Înlocuiește copiii elementului cu id-ul dat prin
`<svg>`-ul randat (returnat ca `element`), folosind `DOMParser` și `importNode`, niciodată
`innerHTML`. Un id lipsă respinge cu `ERR_INVALID_ARG_VALUE`. SVG-ul este
curățat implicit; transmiteți `sanitize` pentru a folosi propriul curățător sau `trusted: true`
pentru a omite curățarea. Vedeți secțiunea „Security” din README pentru ce elimină și ce păstrează
curățătorul și păstrați o Content-Security-Policy activă.

## Imagini externe: `setImageSizer`

Când o etichetă de tip HTML conține o imagine externă
(`<IMG SRC="logo.png"/>`), Graphviz are nevoie de dimensiunile intrinseci ale imaginii pentru a
dimensiona celula. (Atributul `image=` al unui nod nu este dimensionat: nodul își păstrează
caseta normală, ca în Graphviz nativ fără interfață grafică.) Deoarece biblioteca nu poate
citi sistemul de fișiere, furnizați dumneavoastră un măsurător de dimensiuni:

```ts
import { setImageSizer } from '@knowvah/dot-engine';

setImageSizer((src) => {
  // Return the intrinsic { w, h } for this image source, or null if unknown.
  return { w: 64, h: 64 };
});
```

Dacă grafurile dumneavoastră nu fac niciodată referire la imagini externe, nu este nevoie să apelați aceasta.
Pentru a dimensiona imaginile asincron (de exemplu încărcându-le), transmiteți în schimb un
`imageSizer` asincron către `renderSvgAsync`; vedeți [Imagini](/ro/guide/images).

## Web Workers

Aranjarea rulează sincron, deci un graf mare blochează firul pe care rulează. Rulați-o
într-un Worker pentru ca pagina să rămână receptivă. Într-un Worker nu există
`document`, deci biblioteca măsoară textul cu un `OffscreenCanvas`, iar
API-ul asincron încarcă fonturile prin setul de fonturi propriu al Worker-ului (`self.fonts`).

Fonturile dintr-un Worker sunt separate de cele ale paginii: înregistrați-le în Worker
cu API-ul `FontFace` (regulile CSS `@font-face` nu ajung în Workers).

```ts
// graph-worker.ts (module worker)
import { renderSvgAsync } from '@knowvah/dot-engine';

self.fonts.add(new FontFace('Inter', 'url(/fonts/Inter.woff2)'));

self.onmessage = async (e: MessageEvent<string>) => {
  const { svg, fontIssues } = await renderSvgAsync(e.data, 'dot');
  self.postMessage({ svg, fontIssues });
};
```

Randați cu `renderSvgAsync` (sau `renderAsync`) într-un Worker, nu cu `renderSvg`,
cel puțin până când fiecare font web s-a încărcat. Chromium continuă să măsoare un șir de font
cu fontul de rezervă dacă acel șir exact a fost măsurat în Worker înainte ca
fontul să se încarce, chiar și după încărcare; API-ul asincron încarcă fonturile înainte de
a măsura, deci nu întâlnește niciodată această problemă.

## La ce să nu vă așteptați

Biblioteca țintește **SVG** (plus formatele text `json` / `xdot` / `dot` / hartă de imagine).
Ieșirea raster (PNG/JPG), PostScript/PDF și backend-urile interactive/GUI
sunt în afara domeniului — convertiți SVG-ul ulterior dacă aveți nevoie de alt format. Vedeți
[Divergențe cunoscute](/ro/divergences) pentru limita completă a domeniului.

## Grafuri mari: pre-randați în SVG

Grafurile foarte mari — aproximativ **>10k noduri sau câțiva MB de sursă DOT** — sunt
impracticabil de aranjat la rulare în browser. Aranjarea (mincross, atribuirea rangurilor, rutarea
spline-urilor) este supraliniară, deci aceasta este o **limită de scară comună cu
Graphviz original, nu o limitare specifică acestui motor**: pe astfel de intrări
`dot` nativ, variantele WASM (`@hpcc-js/wasm-graphviz`) și acest motor expiră
sau rămân fără memorie în egală măsură. (Acest motor **nu** are scurgeri de memorie — heap-ul
per randare rămâne constant; limita este strict dimensiunea grafului. Vedeți
[panoul de performanță](/perf) pentru comparația măsurată.)

Pentru grafurile la această scară, **randați o singură dată la momentul compilării și servați
fișierul `.svg` rezultat**, în loc să faceți aranjarea în browser la fiecare vizualizare — același tipar
pe care l-ați folosi chiar și cu `dot` nativ, deoarece este prea lent pentru a rula la fiecare cerere.

Adaptoarele de site la momentul compilării din
[knowvah/dot-plugins](https://github.com/knowvah/dot-plugins) (publicate pe NPM)
fac exact asta:

- `@knowvah/vitepress-plugin-dot` — VitePress (markdown-it), la momentul compilării
- `@knowvah/eleventy-plugin-dot` — Eleventy (markdown-it), la momentul compilării
- `@knowvah/docusaurus-plugin-dot` — Docusaurus (MDX/remark), la momentul compilării
- `@knowvah/dot-markdown-it` — integrare markdown-it independentă de framework

Pentru grafuri dinamice, furnizate de utilizator, unde randarea la momentul compilării nu este o opțiune,
limitați randarea interactivă la grafuri de dimensiuni rezonabile și păstrați în cache SVG-ul emis.
