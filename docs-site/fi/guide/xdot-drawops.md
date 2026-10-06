---
sourceHash: 36e363726bb2859530f8554c85ec42838f384f647f46aa432bea2437e024d140
---

# Oma renderöinti xdotin piirto-operaatioilla

`getDrawOps` asettelee graafin, renderöi sen xdot-muotoon ja palauttaa
tasaisen taulukon tyypitettyjä piirto-operaatioita. Sen avulla voit ohjata omaa
renderöijää (canvas, WebGL, PDF, natiivi käyttöliittymä) ilman SVG:n jäsentämistä.

## Allekirjoitus

```ts
function getDrawOps(g: Graph, opts?: { engine?: string }): XdotOp[];
```

## Peruskäyttö

```ts
import { createGraph, getDrawOps } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a', { shape: 'ellipse', label: 'Start' });
b.addNode('b', { shape: 'box',     label: 'End'   });
b.addEdge('a', 'b');

const ops = getDrawOps(b.graph);

for (const op of ops) {
  switch (op.kind) {
    case 'fill_color':
      // set fill color before drawing a filled shape
      setFillColor(op.color);
      break;
    case 'pen_color':
      setStrokeColor(op.color);
      break;
    case 'font':
      setFont(op.font.name, op.font.size);
      break;
    case 'filled_ellipse':
      fillEllipse(op.ellipse.x, op.ellipse.y, op.ellipse.w, op.ellipse.h);
      break;
    case 'unfilled_ellipse':
      strokeEllipse(op.ellipse.x, op.ellipse.y, op.ellipse.w, op.ellipse.h);
      break;
    case 'filled_polygon':
      fillPolygon(op.polygon.pts);
      break;
    case 'unfilled_polygon':
      strokePolygon(op.polygon.pts);
      break;
    case 'text':
      drawText(op.text.x, op.text.y, op.text.text, op.text.align);
      break;
  }
}
```

## Operaatiotyypit

`XdotOp`-unioni erotetaan `op.kind`-kentän perusteella:

| `kind` | Hyötykuorman kenttä | Kuvaus |
|---|---|---|
| `'filled_ellipse'` | `op.ellipse: XdotRect` | Täytä ellipsi |
| `'unfilled_ellipse'` | `op.ellipse: XdotRect` | Piirrä ellipsin ääriviiva |
| `'filled_polygon'` | `op.polygon: XdotPolyline` | Täytä suljettu monikulmio |
| `'unfilled_polygon'` | `op.polygon: XdotPolyline` | Piirrä suljetun monikulmion ääriviiva |
| `'filled_bezier'` | `op.bezier: XdotPolyline` | Täytä suljettu Bézier-käyrä |
| `'unfilled_bezier'` | `op.bezier: XdotPolyline` | Piirrä avoimen Bézier-käyrän viiva |
| `'polyline'` | `op.polyline: XdotPolyline` | Piirrä murtoviiva |
| `'text'` | `op.text: XdotText` | Piirrä tekstiselite |
| `'fill_color'` | `op.color: string` | Aseta nykyinen täyttöväri |
| `'pen_color'` | `op.color: string` | Aseta nykyinen viivaväri |
| `'grad_fill_color'` | `op.gradColor: XdotColor` | Aseta liukuväritäyttö |
| `'grad_pen_color'` | `op.gradColor: XdotColor` | Aseta liukuväriviiva |
| `'font'` | `op.font: XdotFont` | Aseta nykyinen fontti |
| `'style'` | `op.style: string` | Aseta nykyinen piirtotyyli |
| `'image'` | `op.image: XdotImage` | Piirrä upotettu kuva |
| `'fontchar'` | `op.fontchar: number` | Aseta fontin merkkibittimaski |

### Keskeiset tyypit

```ts
interface XdotRect     { x: number; y: number; w: number; h: number }
interface XdotPolyline { pts: XdotPoint[] }
interface XdotPoint    { x: number; y: number; z: number }
interface XdotText     { x: number; y: number; align: 'left'|'center'|'right'; width: number; text: string }
interface XdotFont     { size: number; name: string }
```

## Koordinaatit

xdot-koordinaatit ovat **pisteinä** (points) graphvizin natiivissa y-ylös-
koordinaatistossa (origo vasemmassa alakulmassa). Käännä y-koordinaatit ennen
piirtämistä y-alas-pinnalle:

```ts
// In y-down canvas rendering, where canvasHeight is bounds.height from getLayout:
const screenY = canvasHeight - op.ellipse.y;
```

Operaatiot saapuvat piirtojärjestyksessä: ensin graafin tausta, sitten solmut,
sitten kaaret.

## Kattavuus

`getDrawOps` tuo esiin graafin koko piirtojärjestyksessä olevan operaatiovirran,
mukaan lukien:
- solmun muotojen operaatiot (`filled_ellipse`, `filled_polygon`,
  `unfilled_polygon` jne.)
- teksti- ja selite-operaatiot (`text`)
- fonttioperaatiot (`font`)
- värinasetusoperaatiot (`fill_color`, `pen_color`), myös solmun omat
  `color`-/`fillcolor`-attribuutit
- kaarten piirto-operaatiot (`unfilled_bezier` splinelle sekä `pen_color` /
  `fill_color` / `filled_polygon` nuolenkärjelle)

Graafille `digraph { a [color=red]; a -> b }` `_draw_`-/`_hdraw_`-geometria ja
värien arvot vastaavat täsmälleen natiivia `dot -Txdot` -komentoa (solmun
ellipsi, kaaren splini, nuolenkärjen monikulmio ja käytetty `color=red`). Kutsu
`getDrawOps(g)` suoraan tuoreelle (vielä renderöimättömälle) graafille —
`render(g, ...)`- ja `getDrawOps(g)`-kutsujen tekeminen *samalle* graafiolille
ajaa asettelun kahdesti, eikä se ole tuettu tapa; käytä graafia kohden vain
jompaakumpaa.

## Canvas-esimerkki (vain solmujen selitteet)

```ts
import { parse, getDrawOps } from '@knowvah/dot-engine';

const g = parse(`digraph { a [label="A"]; b [label="B"]; a -> b }`);
const ops = getDrawOps(g);

// Draw on an HTML canvas
const canvas = document.querySelector('canvas')!;
const ctx = canvas.getContext('2d')!;

let font = '14px sans-serif';
for (const op of ops) {
  if (op.kind === 'font') {
    font = `${op.font.size}px ${op.font.name}`;
  } else if (op.kind === 'text') {
    ctx.font = font;
    ctx.fillText(op.text.text, op.text.x, canvas.height - op.text.y);
  } else if (op.kind === 'filled_ellipse') {
    ctx.beginPath();
    ctx.ellipse(
      op.ellipse.x, canvas.height - op.ellipse.y,
      op.ellipse.w / 2, op.ellipse.h / 2,
      0, 0, 2 * Math.PI,
    );
    ctx.fill();
  }
}
```
