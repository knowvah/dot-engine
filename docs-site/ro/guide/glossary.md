---
sourceHash: 66af4fa5a29e8468c7ecdd9bd541c9d7572b0a87dc81ab412cb63c543106fde8
---
# Glosar

O definiție pentru fiecare termen, în ordine alfabetică după termenul englez (secțiunile păstrează
ordinea din versiunea în engleză). Fiecare trimite la pagina de ghid (sau la sursă)
care îl tratează în detaliu.

## Cluster

Un subgraf al cărui nume începe cu `cluster` (de ex. `subgraph cluster_build`) —
Graphviz îl randează ca o casetă distinctă care grupează nodurile membre. Intern,
instantaneul de geometrie al @knowvah/dot-engine atribuie fiecărui subgraf de tip cluster
un nume pozițional precum `cluster6` (`ClusterGeometry.name`), nu numele din
sursa DOT, așa că un consumator care are nevoie de numele original construiește o hartă
`idByName` înainte de aranjare și reatribuie cheile `snapshot.clusters` ulterior. Vedeți
[Rețete](/ro/guide/recipes) pentru tiparul de reatribuire și
[Construirea unui graf în cod](/ro/guide/build-a-graph) pentru crearea clusterelor prin `addSubgraph`.

## Conformitate

Proprietatea verificată mecanic din spatele afirmației că o randare @knowvah/dot-engine
„se potrivește” cu oracolul în C. După ce ambele SVG-uri sunt analizate în arbori de
elemente normalizați, fiecare valoare numerică (coordonate, date de cale, `points`) trebuie să
coincidă într-o toleranță fixă — **±0.01pt** pentru motoarele deterministe
(`dot`, `circo`, `twopi`, `osage`, `patchwork`) și **±0.5pt** pentru motoarele
iterative orientate pe forțe (`neato`, `fdp`, `sfdp`) — iar fiecare
valoare nenumerică (etichete, culori, text) trebuie să fie exact egală. Nu este
o pretenție de ieșire SVG identică octet cu octet. Vedeți [Conformitate](/ro/conformance).

## Sistem de coordonate / axa y

Sistemul de coordonate nativ al Graphviz are **y în sus**, originea în colțul din
stânga jos; browserele și ecranele au **y în jos**, originea în colțul din stânga sus.
`getLayout` folosește implicit `yAxis: 'down'` (inversând fiecare y și normalizând
`bounds` la `(0, 0)`) și acceptă `yAxis: 'up'` pentru a returna coordonatele native graphviz
neschimbate. Operațiile de desenare xdot (din `getDrawOps`) sunt întotdeauna în
sistemul nativ cu y în sus. Vedeți [Citirea geometriei calculate](/ro/guide/geometry).

## Divergență

O diferență dintre o randare @knowvah/dot-engine și oracol care a fost
investigată, a cărei cauză a fost identificată și care a fost catalogată — spre deosebire de
una tolerată în tăcere. Divergențele catalogate se încadrează în una dintre trei clase:
diferențe acceptate (neaducerea deliberată la conformitate, de ex. nedeterminismul
virgulei mobile între platforme), o coadă lungă urmărită, încă în curs de închidere, și
non-obiective explicite. O diferență necatalogată este tratată ca defect, nu ca
comportament acceptat. Vedeți [Divergențe cunoscute](/ro/divergences).

## DOT

Limbajul de descriere a grafurilor — `digraph { ... }` / `graph { ... }` cu
instrucțiuni de nod, muchie și atribut — pe care @knowvah/dot-engine îl analizează înainte de a
transmite rezultatul unui motor de aranjare. Vedeți [Primii pași](/ro/guide/getting-started).

## Măsurător / rezolvator de imagini

Cele două puncte de extensie injectabile pentru imagini externe (noduri usershape și celule
`<IMG>` din etichetele HTML). Un `ImageSizer` raportează lățimea/înălțimea naturală a unei imagini, astfel
încât dimensionarea nodurilor și aranjarea etichetelor să poată continua fără încărcarea datelor de pixeli; un
`ImageResolver` furnizează octeții efectivi ai imaginii pentru încorporare la momentul randării.
Vedeți [Imagini](/ro/guide/images).

## Motor de aranjare

Unul dintre cei opt algoritmi de aranjare pe care @knowvah/dot-engine îi înregistrează, selectat după nume
(`renderSvg(dot, engine)`): `dot` (ierarhic/pe straturi), `neato`
(model cu arcuri, Kamada–Kawai), `fdp` (orientat pe forțe), `sfdp` (orientat pe forțe
multiscală, pentru grafuri mari), `circo` (circular), `twopi` (radial),
`osage` (pe clustere) și `patchwork` (treemap pătratic). Vedeți
[Motoare de aranjare](/ro/guide/engines).

## Oracol

Binarul `dot` nativ Graphviz în C, compilat din sursa canonică în C, față de care
este validată fiecare randare @knowvah/dot-engine. @knowvah/dot-engine lansează acest
binar direct (niciodată o variantă WASM) pentru a evita deriva ABI între
referință și port. Vedeți [Conformitate](/ro/conformance) și
[Paritate](/parity) pentru modul în care se rulează și se raportează comparațiile cu oracolul.

## Rang / rankdir

În aranjarea ierarhică a lui `dot`, un **rang** (rank) este un strat de noduri plasate la
aceeași adâncime în desen. `rankdir` stabilește direcția în care curg rangurile — implicit
`TB` (de sus în jos), sau `LR`, `BT`, `RL` — setat ca atribut de graf
(`b.setAttr('rankdir', 'LR')`). Vedeți [Construirea unui graf în cod](/ro/guide/build-a-graph).

## Spline / rutarea muchiilor

Calea curbă (Bézier) de-a lungul căreia este desenată o muchie, calculată de codul de rutare
care ocolește obstacolele reprezentate de noduri și clustere. @knowvah/dot-engine expune
punctele de control rutate ca `EdgeGeometry.points` — un tablou ordonat de
puncte `{x, y}`, în puncte — prin `getLayout`. Vedeți
[Citirea geometriei calculate](/ro/guide/geometry).

## Măsurător de text

Punctul de extensie injectabil (`TextMeasurer`) care raportează lățimea/înălțimea etichetelor, astfel încât
dimensionarea nodurilor și a etichetelor de muchii să poată continua înainte de aranjare. @knowvah/dot-engine
alege automat unul la fiecare randare — mai întâi un `setTextMeasurer` explicit, apoi
`<canvas>` al browserului, dacă există, apoi `EstimateTextMeasurer` determinist
încorporat în Node — sau acceptă o implementare proprie. Vedeți
[Măsurarea textului](/ro/guide/text-measurement).

## Usershape

Termenul Graphviz pentru un nod a cărui formă este o imagine furnizată extern
(prin atributul `image`), nu un poligon sau o elipsă desenată.
@knowvah/dot-engine rezolvă usershape-urile prin punctul de extensie injectabil pentru măsurătorul/rezolvatorul de imagini,
în loc să citească direct fișiere, păstrând biblioteca sigură pentru browser.
Vedeți [Imagini](/ro/guide/images).

## xdot

Formatul extins DOT de operații de desenare: un flux structurat de operații (setarea
culorii de umplere/contur, setarea fontului, umplerea/conturarea unei elipse sau a unui poligon, desenarea unei
curbe Bézier, desenarea textului) care descrie exact cum trebuie
pictat un graf randat, în ordinea de pictare. `getDrawOps` returnează acest flux sub formă de
valori `XdotOp` tipizate, pentru a controla un randor propriu (canvas, WebGL, PDF) fără a analiza
SVG. Vedeți [Randare proprie cu xdot](/ro/guide/xdot-drawops).
