---
sourceHash: 66af4fa5a29e8468c7ecdd9bd541c9d7572b0a87dc81ab412cb63c543106fde8
---
# Glossario

Una definizione per termine, in ordine alfabetico secondo il termine inglese (l'ordine dei
titoli resta quello dell'originale inglese). Ognuna rimanda alla pagina della guida (o al
sorgente) che lo tratta in modo approfondito.

## Cluster

Un sottografo il cui nome inizia con `cluster` (ad es. `subgraph cluster_build`) —
Graphviz lo renderizza come un riquadro distinto che raggruppa i nodi che ne fanno parte. Internamente,
l'istantanea della geometria di @knowvah/dot-engine rinomina ogni sottografo cluster con un nome
posizionale come `cluster6` (`ClusterGeometry.name`) anziché con il nome presente nel
sorgente DOT, quindi un consumatore che ha bisogno del nome originale costruisce una mappa
`idByName` prima del layout e riassegna le chiavi di `snapshot.clusters` dopo. Vedi
[Ricette](/it/guide/recipes) per il pattern di riassegnazione e
[Costruire un grafo nel codice](/it/guide/build-a-graph) per creare cluster tramite `addSubgraph`.

## Conformità

La proprietà verificata meccanicamente alla base dell'affermazione che un rendering di @knowvah/dot-engine
«corrisponde» all'oracolo in C. Dopo aver trasformato entrambi gli SVG in alberi di elementi
normalizzati, ogni valore numerico (coordinate, dati dei percorsi, `points`) deve coincidere
entro una tolleranza fissa — **±0,01 pt** per i motori deterministici
(`dot`, `circo`, `twopi`, `osage`, `patchwork`) e **±0,5 pt** per i motori
iterativi a forze dirette (`neato`, `fdp`, `sfdp`) — e ogni valore non numerico (tag, colori, testo)
deve essere esattamente uguale. Non equivale a dichiarare un output SVG identico byte per byte. Vedi [Conformità](/it/conformance).

## Sistema di coordinate / asse y

Il sistema di coordinate nativo di Graphviz ha la **y verso l'alto**, con l'origine nell'angolo
in basso a sinistra; browser e schermi hanno la **y verso il basso**, con l'origine in alto a sinistra.
`getLayout` usa per impostazione predefinita `yAxis: 'down'` (inverte ogni y e normalizza
`bounds` a `(0, 0)`) e accetta `yAxis: 'up'` per restituire invariate le coordinate native
di Graphviz. Le operazioni di disegno xdot (da `getDrawOps`) sono sempre nel
sistema nativo con y verso l'alto. Vedi [Leggere la geometria calcolata](/it/guide/geometry).

## Divergenza

Una differenza tra un rendering di @knowvah/dot-engine e l'oracolo che è stata
analizzata, ricondotta alla sua causa e catalogata — anziché tollerata
in silenzio. Le divergenze catalogate rientrano in una di tre classi: delta
accettati (deliberatamente non resi conformi, ad es. il non determinismo della virgola mobile
tra piattaforme), una lunga coda tracciata ancora in via di chiusura e
non-obiettivi espliciti. Una differenza non elencata è trattata come un difetto, non come comportamento
accettato. Vedi [Divergenze note](/it/divergences).

## DOT

Il linguaggio di descrizione dei grafi — `digraph { ... }` / `graph { ... }` con istruzioni
di nodi, archi e attributi — di cui @knowvah/dot-engine esegue il parsing prima di
passare il risultato a un motore di layout. Vedi [Primi passi](/it/guide/getting-started).

## Image sizer / resolver

I due punti di estensione iniettabili per le immagini esterne (nodi usershape e celle
`<IMG>` nelle etichette HTML). Un `ImageSizer` riporta la larghezza/altezza naturale di
un'immagine, così il dimensionamento dei nodi e il layout delle etichette possono procedere senza
caricare i dati dei pixel; un `ImageResolver` fornisce i byte effettivi dell'immagine da
incorporare al momento del rendering. Vedi [Immagini](/it/guide/images).

## Motore di layout

Uno degli otto algoritmi di layout registrati da @knowvah/dot-engine, selezionati per nome
(`renderSvg(dot, engine)`): `dot` (gerarchico/a livelli), `neato`
(modello a molle, Kamada–Kawai), `fdp` (a forze dirette), `sfdp` (a forze dirette
multiscala, per grafi grandi), `circo` (circolare), `twopi` (radiale),
`osage` (a cluster) e `patchwork` (treemap squarified). Vedi
[Motori di layout](/it/guide/engines).

## Oracolo

Il binario nativo C `dot` di Graphviz, compilato dal sorgente C canonico, con cui
viene validato ogni rendering di @knowvah/dot-engine. @knowvah/dot-engine avvia questo
binario direttamente (mai una build WASM) per evitare derive di ABI tra
riferimento e porting. Vedi [Conformità](/it/conformance) e
[Parità](/parity) per come vengono eseguiti e riportati i confronti con l'oracolo.

## Rank / rankdir

Nel layout gerarchico di `dot`, un **rank** è un livello di nodi collocati alla
stessa profondità nel disegno. `rankdir` imposta la direzione in cui scorrono i rank — il
valore predefinito `TB` (dall'alto verso il basso), oppure `LR`, `BT`, `RL` — impostato come attributo del grafo
(`b.setAttr('rankdir', 'LR')`). Vedi [Costruire un grafo nel codice](/it/guide/build-a-graph).

## Spline / instradamento degli archi

Il percorso curvo (di Bézier) lungo cui viene disegnato un arco, calcolato dal codice di
instradamento che aggira gli ostacoli rappresentati da nodi e cluster. @knowvah/dot-engine espone i
punti di controllo instradati come `EdgeGeometry.points` — un array ordinato di
punti `{x, y}`, in punti — tramite `getLayout`. Vedi
[Leggere la geometria calcolata](/it/guide/geometry).

## Misuratore del testo

Il punto di estensione iniettabile (`TextMeasurer`) che riporta larghezza/altezza delle etichette, così il
dimensionamento di nodi ed etichette degli archi può procedere prima del layout. @knowvah/dot-engine ne risolve uno
automaticamente a ogni rendering — prima un `setTextMeasurer` esplicito, poi il
`<canvas>` del browser se disponibile, quindi in Node l'`EstimateTextMeasurer` deterministico
integrato — oppure accetta un'implementazione personalizzata. Vedi
[Misurazione del testo](/it/guide/text-measurement).

## Usershape

Il termine di Graphviz per un nodo la cui forma è un'immagine fornita dall'esterno
(tramite l'attributo `image`) anziché un poligono o un'ellisse disegnati.
@knowvah/dot-engine risolve gli usershape tramite il punto di estensione iniettabile image sizer/resolver
anziché leggere direttamente i file, mantenendo la libreria sicura per il browser.
Vedi [Immagini](/it/guide/images).

## xdot

Il formato esteso di operazioni di disegno DOT: un flusso strutturato di operazioni (imposta
colore di riempimento/tratto, imposta il font, riempi/traccia un'ellisse o un poligono, disegna una
curva di Bézier, disegna testo) che descrive esattamente come va dipinto un grafo renderizzato,
in ordine di pittura. `getDrawOps` restituisce questo flusso come valori `XdotOp` tipizzati
per pilotare un renderer personalizzato (canvas, WebGL, PDF) senza fare il parsing
dell'SVG. Vedi [Rendering personalizzato con le operazioni di disegno xdot](/it/guide/xdot-drawops).
