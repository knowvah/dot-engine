---
sourceHash: 36e363726bb2859530f8554c85ec42838f384f647f46aa432bea2437e024d140
---

# Egen rendering med xdot-tegneoperasjoner

`getDrawOps` legger ut en graf, rendrer den til xdot-format og gir tilbake en
flat tabell med typede tegneoperasjoner. Bruk den til å drive en egen renderer
(canvas, WebGL, PDF, innebygd brukergrensesnitt) uten å tolke SVG.

## Signatur

```ts
function getDrawOps(g: Graph, opts?: { engine?: string }): XdotOp[];
```

## Grunnleggende bruk

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

## Operasjonstyper

Unionen `XdotOp` skiller på `op.kind`:

| `kind` | Nyttelastfelt | Beskrivelse |
|---|---|---|
| `'filled_ellipse'` | `op.ellipse: XdotRect` | Fyll en ellipse |
| `'unfilled_ellipse'` | `op.ellipse: XdotRect` | Strek en ellipse |
| `'filled_polygon'` | `op.polygon: XdotPolyline` | Fyll en lukket polygon |
| `'unfilled_polygon'` | `op.polygon: XdotPolyline` | Strek en lukket polygon |
| `'filled_bezier'` | `op.bezier: XdotPolyline` | Fyll en lukket bézierkurve |
| `'unfilled_bezier'` | `op.bezier: XdotPolyline` | Strek en åpen bézierkurve |
| `'polyline'` | `op.polyline: XdotPolyline` | Tegn en polylinje |
| `'text'` | `op.text: XdotText` | Tegn en tekstetikett |
| `'fill_color'` | `op.color: string` | Sett gjeldende fyllfarge |
| `'pen_color'` | `op.color: string` | Sett gjeldende strekfarge |
| `'grad_fill_color'` | `op.gradColor: XdotColor` | Sett gradientfyll |
| `'grad_pen_color'` | `op.gradColor: XdotColor` | Sett gradientstrek |
| `'font'` | `op.font: XdotFont` | Sett gjeldende skrift |
| `'style'` | `op.style: string` | Sett gjeldende tegnestil |
| `'image'` | `op.image: XdotImage` | Tegn et innebygd bilde |
| `'fontchar'` | `op.fontchar: number` | Sett bitmaske for skrifttegn |

### Sentrale typer

```ts
interface XdotRect     { x: number; y: number; w: number; h: number }
interface XdotPolyline { pts: XdotPoint[] }
interface XdotPoint    { x: number; y: number; z: number }
interface XdotText     { x: number; y: number; align: 'left'|'center'|'right'; width: number; text: string }
interface XdotFont     { size: number; name: string }
```

## Koordinater

xdot-koordinater er i **punkter**, i graphvizs opprinnelige koordinatsystem med
y oppover (origo nede til venstre). Snu y-koordinatene før du tegner på en flate
med y nedover:

```ts
// In y-down canvas rendering, where canvasHeight is bounds.height from getLayout:
const screenY = canvasHeight - op.ellipse.y;
```

Operasjonene kommer i tegnerekkefølge: først grafbakgrunnen, deretter nodene og
til slutt kantene.

## Dekning

`getDrawOps` gir hele operasjonsstrømmen i tegnerekkefølge for en graf,
inkludert:
- Nodeformoperasjoner (`filled_ellipse`, `filled_polygon`, `unfilled_polygon`
  osv.)
- Tekst- og etikettoperasjoner (`text`)
- Skriftoperasjoner (`font`)
- Fargesettende operasjoner (`fill_color`, `pen_color`), inkludert egendefinerte
  nodeattributter som `color`/`fillcolor`
- Kanttegneoperasjoner (`unfilled_bezier` for splinen, pluss `pen_color` /
  `fill_color` / `filled_polygon` for pilspissen)

For `digraph { a [color=red]; a -> b }` samsvarer geometrien i
`_draw_`/`_hdraw_` og fargeverdiene nøyaktig med innebygd `dot -Txdot`
(nodeellipsen, kantsplinen, pilspisspolygonet og den anvendte `color=red`). Kall
`getDrawOps(g)` direkte på en fersk graf som ikke er rendret ennå — å kalle
`render(g, ...)` og `getDrawOps(g)` på *samme* grafobjekt kjører layouten to
ganger og er ikke et støttet mønster; bruk ett av dem per graf.

## Canvas-eksempel (kun nodeetiketter)

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
