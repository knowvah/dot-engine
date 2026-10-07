---
sourceHash: 5733693facb69db8bab3b6997342fc5a9281465757bc64ca4fea3ebec54ebeeb
---

# Migrarea de la alte biblioteci JS pentru Graphviz

viz.js / `@viz-js/viz`, `@hpcc-js/wasm` (`@hpcc-js/wasm-graphviz`) și
`d3-graphviz` oferă toate acces JavaScript la Graphviz prin compilarea
Graphviz-ului C real în **WebAssembly** și apelarea lui. @knowvah/dot-engine
este o **portare TypeScript** scrisă de la zero — motoarele de aranjare,
analizorul sintactic și emițătorul SVG sunt cod sursă TypeScript, nu un binar
compilat.

Diferența aceasta este esența, nu o notă de subsol:

| | Învelișuri WASM (viz.js / `@hpcc-js/wasm` / d3-graphviz) | @knowvah/dot-engine |
|---|---|---|
| Implementare | Graphviz C real, compilat într-un binar `.wasm` | Portare TypeScript pură, fără artefact compilat |
| Inițializarea modulului | Asincronă — instanțiați/așteptați modulul WASM înainte de prima utilizare | Niciuna — `import` și apelați sincron |
| Pachet | Livrați un fișier `.wasm` (sute de KB — câțiva MB) alături de JS | Doar JS, compatibil cu tree-shaking |
| Depanare | Parcurgeți pas cu pas un blob WASM (sau sursa C, dacă o aveți) | Parcurgeți pas cu pas TypeScript-ul real, cu source maps |
| Model de execuție | Unele variante rulează aranjarea într-un Web Worker | Rulează pe firul apelant, ca orice funcție TS |
| Formate de ieșire | Cele cu care a fost compilată varianta C — de obicei setul complet Graphviz, inclusiv raster/PDF | SVG + formatele text DOT/json/xdot/plain/imagemap — vedeți mai jos |

Dacă cazul dumneavoastră de utilizare este „apelez o funcție, primesc SVG,
fără ceremonial asincron, fără un fișier WASM de găzduit” — pentru asta există
@knowvah/dot-engine. Dacă cazul dumneavoastră depinde de ieșire raster sau
PDF, consultați mai jos [Când rămâneți la WASM](#when-to-stay-on-wasm).

## Diferențe de API

Cele trei biblioteci au forme diferite; tabelul de mai jos reprezintă cazul
comun de migrare (aproximativ — verificați în documentația fiecărei
biblioteci; vedeți citările de sub fiecare rând).

| Bibliotecă | Apel tipic | Echivalentul din @knowvah/dot-engine |
|---|---|---|
| `@viz-js/viz` (succesorul viz.js) | `Viz.instance().then(viz => viz.renderSVGElement(dot))` — asincron, `Viz.instance()` returnează o Promise | `renderSvg(dot, 'dot')` — sincron, fără pas de instanțiere/inițializare |
| viz.js 2.x (vechi, `new Viz()`) | `new Viz().renderString(dot)` — returnează un `Promise<string>` | `renderSvg(dot, 'dot')` — sincron |
| `@hpcc-js/wasm-graphviz` | `await Graphviz.load()` o dată, apoi `graphviz.dot(dot)` (sincron după încărcare) | `renderSvg(dot, engine)` — fără niciun pas de încărcare/încălzire |
| `d3-graphviz` | `d3.select(sel).graphviz().renderDot(dot)` — leagă ieșirea de DOM, animează tranzițiile | `renderSvg(dot, engine)` returnează un **șir** SVG; îl inserați singur în DOM (de exemplu `el.innerHTML = svg`) |

Fiecare apel @knowvah/dot-engine din coloana din dreapta este **sincron** — nu
există un modul de așteptat, deoarece nu există un binar WASM de instanțiat.
Eliminați orice `await`/`.then()` care învelește un apel @knowvah/dot-engine;
nu a fost niciodată necesar.

- `Viz.instance()` → Promise al lui `@viz-js/viz` și metoda `renderSVGElement()`
  sunt documentate la viz-js.com; confirmat prin exemplul de utilizare publicat
  al proiectului, la momentul redactării.
- `new Viz().renderString(dot)` din viz.js 2.x este API-ul documentat pentru
  acea linie de versiuni (acum înlocuită); dacă aveți o instalare curentă,
  verificați dacă nu cumva folosiți de fapt `@viz-js/viz`.
- Perechea `Graphviz.load()` / `graphviz.dot()` din `@hpcc-js/wasm-graphviz`
  este confirmată prin exemplul de utilizare publicat al pachetului, la
  momentul redactării. Pachetul separat, mai vechi, `@hpcc-js/wasm` expunea în
  plus, în versiuni anterioare, un apel `graphviz.layout(dot, format, engine)`
  — verificați documentația versiunii instalate înainte de a vă baza pe
  semnătura exactă.
- Lanțul `.graphviz().renderDot(dot)` din `d3-graphviz`, precum și faptul că
  este construit intern pe `@hpcc-js/wasm`, sunt confirmate prin README-ul
  publicat al proiectului, la momentul redactării.

### Legarea la DOM a lui `renderDot` nu face obiectul acestei pagini

`d3-graphviz` face mai mult decât să randeze SVG: leagă rezultatul într-o
selecție D3, compară randările succesive și animează tranzițiile dintre
aranjări. @knowvah/dot-engine nu are nicio opinie despre DOM —
`renderSvg`/`render` returnează un simplu șir. Dacă doriți tranziții animate
în stilul d3-graphviz între două aranjări, aceea este logică pe care ați
construi-o peste două apeluri `renderSvg` și propria comparare a DOM-ului (sau
puteți continua să folosiți d3-graphviz pentru această funcționalitate
anume — vedeți mai jos).

## Obținerea datelor de aranjare fără analizarea unui format text

Tuturor celor trei biblioteci WASM li se pot cere formatele JSON sau text
simplu proprii Graphviz, apoi analizați singur șirul respectiv pentru a obține
coordonatele nodurilor/muchiilor. @knowvah/dot-engine elimină ocolul prin
text: apelați `getLayout(g)` (după `render`) pentru o instantanee tipizată,
serializabilă în JSON, direct — fără un șir `-Tjson`/`-Tplain` de analizat.

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

render(b.graph, 'svg');
const layout = getLayout(b.graph);
// layout.nodes  → [{ name: 'a', x, y, width, height }, ...]
// layout.edges  → [{ tail: 'a', head: 'b', points: [...] }]
// layout.bounds → { x, y, width, height }
```

Consultați [Citirea geometriei calculate](/ro/guide/geometry) pentru forma
completă a instantaneei, unități și opțiunea `yAxis`.

## Când rămâneți la WASM {#when-to-stay-on-wasm}

Fiți sinceri cu dumneavoastră în privința domeniului: @knowvah/dot-engine
vizează SVG plus formatele text `dot`/`xdot`/`json`/`plain`/`plain-ext`/`imap`/
`cmapx`. **Nu** emite formate raster (PNG/JPEG/GIF/...) sau
PostScript/PDF/EPS — acestea sunt o limită de domeniu deliberată, nu o lacună
încă nefinalizată. Lista exactă a neobiectivelor o găsiți la
[Divergențe cunoscute](/ro/divergences).

Dacă aplicația dumneavoastră are nevoie de ieșire `-Tpng` sau `-Tpdf` direct
din motorul de aranjare, bibliotecile bazate pe WASM de mai sus acoperă în
continuare acest caz — deoarece rulează Graphviz C real, acceptă orice
formate de ieșire cu care a fost compilată varianta respectivă. În acest
scenariu, fie continuați să folosiți biblioteca WASM pentru acea singură
porțiune de cod, fie randați în `'svg'` cu @knowvah/dot-engine și convertiți
SVG-ul într-un raster/PDF ulterior, cu un instrument separat.

## Vedeți și

- [Motoare de aranjare](/ro/guide/engines)
- [Randare în alte formate](/ro/guide/render-formats)
- [Citirea geometriei calculate](/ro/guide/geometry)
- [Divergențe cunoscute](/ro/divergences)
- [Primii pași](/ro/guide/getting-started)
