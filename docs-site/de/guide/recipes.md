---
sourceHash: 3d15763baac8b6d86c1f835e1c633c2b13aba787da3d897db25cb3038b8e2d78
---

# Rezepte

Aufgabenorientierte Schnipsel für die Teile des Wegs Aufbauen → Layout →
Geometrie auslesen, die sich allein aus der API-Referenz nicht erschließen.
Jedes Rezept ist ein minimales, lauffähiges Beispiel, das ausschließlich die
öffentliche Oberfläche `@knowvah/dot-engine` / `@knowvah/dot-engine/api` /
`@knowvah/dot-engine/render` verwendet — keine internen Modellklassen.
Die vollständige Liste der Einstiegspunkte, aus denen diese Schnipsel schöpfen,
finden Sie unter `/guide/api`.

## 1. Einen Graphen im Code aufbauen und rendern

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client', { shape: 'box' });
b.addNode('server', { shape: 'box' });
b.addEdge('client', 'server', { label: 'HTTP GET' });

const svg = render(b.graph, 'svg');
```

**Warum:** `createGraph` liefert Ihnen einen Builder, wenn die Struktur Ihres
Graphen aus Anwendungsdaten stammt statt aus einer statischen DOT-Zeichenkette;
`render` legt den Graphen aus und serialisiert ihn in einem Aufruf. Die
vollständige Builder-API (Teilgraphen, Attribute, Vergleich mit `parse`) steht
unter `/guide/build-a-graph`.

## 2. Ohne Rendern auslegen, dann die Geometrie auslesen

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

// render() triggers layout as a side effect and leaves the computed
// geometry on the graph. Call it (or the lower-level ctx.layout) BEFORE
// getLayout(), even if you don't need render()'s return value.
render(b.graph, 'svg');

const layout = getLayout(b.graph);
for (const n of layout.nodes) {
  console.log(n.name, n.x, n.y, n.width, n.height);
}
```

**Warum:** `getLayout` ist ein reiner Leser über bereits berechnete Geometrie —
die Funktion führt selbst kein Layout aus. Rufen Sie sie auf, bevor ein
Layoutaufruf gelaufen ist, wirft sie einen `Error` mit `code`
`ERR_INVALID_STATE` („getLayout requires a laid-out graph“; siehe
[Fehler und Ausnahmen](/de/guide/errors)), statt veraltete oder auf null
gesetzte Koordinaten zurückzugeben. Wenn Sie nur die Geometrie brauchen und die
gerenderte Zeichenkette nie benötigen, verwerfen Sie den Rückgabewert von
`render` — der Layout-Seiteneffekt ist das, wofür Sie tatsächlich bezahlen.

## 3. Die y-Achse für Ihren Renderer wählen

```ts
import { getLayout } from '@knowvah/dot-engine';

// Screen/canvas/SVG convention: origin top-left, y increases downward.
const screenLayout = getLayout(g);

// Native graphviz convention: origin bottom-left, y increases upward.
const nativeLayout = getLayout(g, { yAxis: 'up' });
```

**Warum:** Graphviz berechnet das Layout in einem Koordinatensystem mit nach
oben zeigender y-Achse; die meisten Verbraucher (Canvas, DOM, SVG im Browser)
wollen nach unten zeigendes y. `getLayout` verwendet standardmäßig `'down'`,
sodass die meisten Aufrufer die Option nie brauchen. Die genaue
Spiegelungsformel und den Unterschied bei `bounds` zwischen den beiden Modi
beschreibt `/guide/geometry`.

## 4. Den SVG-Rahmen von `render()` mit dem Rahmen von `getLayout()` abgleichen

`render(g, 'svg')` und `getLayout(g)` beschreiben *denselben* ausgelegten
Graphen, aber in unterschiedlichen Koordinatenrahmen, und der Unterschied ist
nicht nur die Spiegelung der y-Achse: Der SVG-Emitter von `render` negiert vor
dem Schreiben eines Formprimitivs jede y-Koordinate und umhüllt dann die
gesamte Zeichnung mit einem einzigen `<g transform="scale(..)
rotate(..) translate(tx,ty)">`, in das Graphvizs Seitenrand, Außenabstand und
jede Skalierung bzw. Drehung über `size=`/`rotate=` einfließen. `getLayout`
überspringt all das — die Funktion liefert Modellkoordinaten, auf den Ursprung
`(0, 0)` normalisiert und ganz ohne Seitengeometrie.

Für jeden einzelnen `render()`-Aufruf unterscheiden sich die beiden Rahmen um
eine konstante Verschiebung. Statt die Seitenlayout-Formel von GVC neu
herzuleiten, ermitteln Sie den Versatz empirisch an einem Knoten, dessen
Position Sie in beiden Rahmen kennen:

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('start');
b.addNode('end');
b.addEdge('start', 'end');

const svg = render(b.graph, 'svg');
const layout = getLayout(b.graph);

/** Bounding-box center of a `<g id="nodeN" class="node">` block's own
 *  `<polygon points="...">`, keyed by the node name in its `<title>`. */
function svgNodeCenter(svg: string, name: string): { x: number; y: number } | undefined {
  const block = new RegExp(
    `<g id="node\\d+" class="node">\\s*<title>${name}</title>([\\s\\S]*?)</g>`,
  ).exec(svg)?.[1];
  const pts = block !== undefined ? /points="([^"]+)"/.exec(block)?.[1] : undefined;
  if (pts === undefined) return undefined;
  const xs: number[] = [];
  const ys: number[] = [];
  for (const pair of pts.trim().split(/\s+/)) {
    const [x, y] = pair.split(',').map(Number);
    xs.push(x ?? 0);
    ys.push(y ?? 0);
  }
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}

const anchor = layout.nodes[0]!;
const rendered = svgNodeCenter(svg, anchor.name)!;
const offset = { dx: rendered.x - anchor.x, dy: rendered.y - anchor.y };

// offset is a pure translation for this render() call. Apply it to any
// other coordinate you scrape out of the same svg string to convert it
// into getLayout()'s frame:
// { x: scrapedX - offset.dx, y: scrapedY - offset.dy }
```

**Warum:** Ein einziger Treffer bestimmt den Versatz vollständig, weil es sich
um eine reine Verschiebung handelt, nicht um eine Skalierung oder Drehung
(bei Standardwerten für `size=`/`rotate=`). Sie brauchen das nur, wenn Sie
etwas aus dem rohen SVG auslesen, das `getLayout` nicht bereitstellt — Rezept 5
behandelt den einen verbreiteten Fall, in dem das derzeit unvermeidlich ist.

## 5. Positionen von Kantenbeschriftungen ermitteln

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client');
b.addNode('server');
b.addEdge('client', 'server', { label: 'HTTP GET' });

render(b.graph, 'svg');
const layout = getLayout(b.graph);

for (const e of layout.edges) {
  if (e.label !== undefined) {
    console.log(`${e.tail} -> ${e.head} label center: (${e.label.x}, ${e.label.y})`);
  }
}
```

**Warum:** `EdgeGeometry.label` ist nur bei einer Kante vorhanden, für deren
Attribut `label` Graphviz tatsächlich eine zentrierte Beschriftung platziert
hat; Kanten ohne Beschriftung lassen das Feld einfach weg. `getLayout` liefert
nur die berechnete *Position* — nicht die Beschriftungszeichenkette oder deren
gemessenes Rechteck. Wenn Ihr Renderer die Beschriftung selbst zeichnen muss,
kombinieren Sie diese Position mit der Größe, die Sie für diesen Beschriftungstext
ohnehin auf Ihrer Seite gemessen haben (etwa indem Sie Ihre eigene Zuordnung
der Beschriftungsgrößen pro Kante zurückspielen, geschlüsselt über dasselbe
Paar aus Tail und Head, mit dem Sie die Kante angelegt haben).

Die Port-Beschriftungen `taillabel` und `headlabel` kommen auf dieselbe Weise
zurück, nämlich in `tailLabel` und `headLabel`:

```ts
b.addEdge('client', 'server', { taillabel: '1', headlabel: '*' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.tailLabel) console.log(`${e.tail} end: (${e.tailLabel.x}, ${e.tailLabel.y})`);
  if (e.headLabel) console.log(`${e.head} end: (${e.headLabel.x}, ${e.headLabel.y})`);
}
```

Jede ist nur vorhanden, sobald das Layout sie platziert hat — unter derselben
Bedingung, unter der `render()` das `<text>` der Beschriftung ausgibt —, sodass
Sie das gerenderte SVG nicht durchsuchen müssen, um diese Positionen zu
ermitteln.

Ein `xlabel` kommt in `xlabel` zurück, mit derselben Nur-wenn-platziert-Regel.
Es lohnt sich, den Wert auszulesen, statt ihn zu nähern: Graphviz positioniert
ein externes Label über eine Kräftesuche über Kandidatenplätze und nicht durch
Versatz vom Mittelpunkt des Splines, sodass keine Rechnung mit `label` oder
`points` es reproduziert.

```ts
b.addEdge('a', 'b', { xlabel: 'X' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.xlabel) console.log(`xlabel at (${e.xlabel.x}, ${e.xlabel.y})`);
}
```

## 5b. Eigene Pfeilspitzen zeichnen

```ts
for (const e of getLayout(b.graph).edges) {
  const last = e.points[e.points.length - 1];
  if (e.ep) drawArrow(last, e.ep);   // tip at ep, base at the spline's end
  if (e.sp) drawArrow(e.points[0], e.sp);
}
```

**Warum:** Trägt ein Ende einen Pfeil, kürzt das Layout den Spline, um Platz
dafür zu lassen, und vermerkt, wohin der Pfeil reichen soll — `ep` am Head-Ende,
`sp` am Tail. Beide fehlen, wenn dieses Ende keinen Pfeil hat; die obigen
Prüfungen beantworten daher zugleich die Frage, ob dieses Ende überhaupt einen
Pfeil braucht. Eine Spitze aus der Endrichtung des Splines zu extrapolieren,
trifft zwar die Richtung, rät aber die Tiefe; die Werte hier hat Graphviz selbst
berechnet.

Beachten Sie, dass es sich um Ansatzpunkte auf dem Knotenrand handelt.
Graphvizs eigener Renderer rückt das Polygon, das er daraus zeichnet, um einen
von der Strichstärke abhängigen Betrag nach innen; zeichnen Sie also *bis* `ep`,
statt zu erwarten, dass der Wert der Spitze eines gerenderten Pfeils entspricht.

## 6. Cluster-Namen von @knowvah/dot-engine auf Ihre eigenen abbilden

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });

// graphviz only treats a subgraph as a cluster when its name starts with
// the literal prefix "cluster". Generate one synthetic name per caller
// cluster id and remember the reverse mapping before layout runs.
const idByName = new Map<string, string>();
function addCluster(id: string, label: string) {
  const name = `cluster${idByName.size}`;
  idByName.set(name, id);
  return b.addSubgraph(name, { label });
}

const web = addCluster('web-tier', 'Web');
web.addNode('lb');
web.addNode('app1');
web.addEdge('lb', 'app1');

b.addNode('db');
b.addEdge('app1', 'db');

render(b.graph, 'svg');
const layout = getLayout(b.graph);

const clustersByCallerId = new Map(
  layout.clusters.map((c) => [idByName.get(c.name) ?? c.name, c]),
);
// clustersByCallerId.get('web-tier') -> { name, x, y, width, height }
```

**Warum:** `ClusterGeometry.name` gibt genau den Namen zurück, den Sie
`addSubgraph` übergeben haben — @knowvah/dot-engine erfindet, nummeriert oder
verändert ihn in keiner Weise. Wenn Ihr Domänenmodell Cluster über eine eigene
ID führt (und nicht über einen Namen, den Graphviz akzeptieren würde), pflegen
Sie die Zuordnung ID → Name selbst, während Sie den Graphen aufbauen, und
schlüsseln den Snapshot `clusters` nach dem Layout neu; versuchen Sie nicht,
aus Graphvizs eigenem Namen eine Bedeutung abzuleiten.

## 6b. Eigenen Cluster-Titelblock zeichnen

```ts
for (const c of getLayout(b.graph).clusters) {
  if (!c.label) continue;                     // cluster declared no title
  drawBox(c.x, c.y, c.width, c.height);
  drawTextCentred(c.label.x, c.label.y, c.label.width, c.label.height);
}
```

**Warum:** Das Layout reserviert innerhalb des Cluster-Rahmens Platz für einen
Cluster-Titel und bestimmt dann, wohin er gehört — unter Beachtung von
`labelloc`, `labeljust`, `rankdir` und der gemessenen Größe der Beschriftung
selbst. `ClusterGeometry.label` veröffentlicht diese aufgelöste Platzierung;
ein Verbraucher, der einen eigenen Titelblock zeichnet, liest sie also aus,
statt den Text erneut zu messen und einen Versatz neu herzuleiten, der mit dem
der Engine übereinstimmen muss.

`label.x`/`label.y` sind der **Mittelpunkt** des Beschriftungsraums, anders als
`x`/`y` des Rahmens, das eine Ecke bezeichnet. Das `<text>`, das `render()`
ausgibt, trägt stattdessen die *Grundlinie*, die unterhalb des Mittelpunkts
liegt — wenn Sie also gegen gerenderte Ausgabe abgleichen, vergleichen Sie
Mittelpunkte mit Mittelpunkten und nicht mit dem ausgegebenen `y`.

## 7. Viele Kanten sicher hinzufügen

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true, strict: true });

const dependencies: Array<[string, string]> = [
  ['build', 'test'],
  ['test', 'deploy'],
  ['build', 'lint'],
  ['lint', 'test'],
  ['build', 'test'], // duplicate -- collapsed on a strict graph, not doubled
];

for (const [from, to] of dependencies) {
  b.addEdge(from, to);
}

const svg = render(b.graph, 'svg');
```

**Warum:** `addEdge` des Builders löst `tail`/`head` über den Namen auf und
legt den Knoten bei der ersten Verwendung an, falls er noch nicht existiert —
Sie müssen Knoten nie vorab deklarieren, bevor Sie eine datengetriebene
Kantenliste verdrahten. Bei einem `strict`-Graphen liefert die Wiederholung
desselben Paars `(tail, head)` die vorhandene Kante zurück, statt eine parallele
hinzuzufügen; das entspricht dem Deduplizierungsvertrag von `agedge` in cgraph.

Wenn Sie Kanten zu einem Graphen hinzufügen, den `parse()` statt
`createGraph()` erzeugt hat, verwenden Sie das untergeordnete
`addEdge(g, tail, head, name?)` aus `@knowvah/dot-engine` direkt mit
`Node`-Referenzen, die Sie bereits halten:

```ts
import { parse, addEdge } from '@knowvah/dot-engine';

const g = parse('digraph { a; b; }');
const a = g.nodes.get('a')!;
const c = g.nodes.get('b')!;
addEdge(g, a, c);
```

Die vollständige Signatur von `addEdge` und ihr Verhalten bei der
Deduplizierung in strikten Graphen finden Sie unter `/reference`.

## 8. Alles zusammengesetzt

Eine kompakte Funktion, die einen kleinen Domänengraphen entgegennimmt, auslegt
und positionierte Knoten und Kanten zurückgibt:

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';
import type { LayoutSnapshot } from '@knowvah/dot-engine';

interface DomainNode {
  id: string;
  label: string;
}

interface DomainEdge {
  from: string;
  to: string;
  label?: string;
}

interface PositionedGraph {
  nodes: Array<{ id: string; x: number; y: number; width: number; height: number }>;
  edges: Array<{
    from: string;
    to: string;
    points: { x: number; y: number }[];
    label?: { x: number; y: number };
  }>;
  width: number;
  height: number;
}

function layoutDomainGraph(nodes: DomainNode[], edges: DomainEdge[]): PositionedGraph {
  const b = createGraph({ directed: true });
  for (const n of nodes) b.addNode(n.id, { label: n.label });
  for (const e of edges) {
    b.addEdge(e.from, e.to, e.label !== undefined ? { label: e.label } : {});
  }

  // render() triggers layout; getLayout() reads the geometry it left behind.
  render(b.graph, 'svg');
  const snap: LayoutSnapshot = getLayout(b.graph);

  return {
    nodes: snap.nodes.map((n) => ({
      id: n.name,
      // graphviz reports the node CENTER; convert to top-left if your
      // renderer expects that instead.
      x: n.x - n.width / 2,
      y: n.y - n.height / 2,
      width: n.width,
      height: n.height,
    })),
    edges: snap.edges.map((e) => ({
      from: e.tail,
      to: e.head,
      points: e.points,
      ...(e.label !== undefined ? { label: e.label } : {}),
    })),
    width: snap.bounds.width,
    height: snap.bounds.height,
  };
}
```

Das ist die Form, die die meisten Verbraucher auf `getLayout` aufbauen: eine
einzige Nahtstelle, die Ihre eigenen Knoten- und Kantentypen entgegennimmt und
positionierte Geometrie in Ihrer eigenen Koordinatenkonvention zurückgibt.
