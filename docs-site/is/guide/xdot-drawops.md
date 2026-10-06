---
sourceHash: 36e363726bb2859530f8554c85ec42838f384f647f46aa432bea2437e024d140
---

# Eigin teiknun með xdot-teikniaðgerðum

`getDrawOps` raðar grafi upp, teiknar það á xdot-sniði og skilar flötu fylki af
tegundarmerktum teikniaðgerðum. Notaðu það til að knýja eigin teiknivél
(canvas, WebGL, PDF, innbyggt notendaviðmót) án þess að þátta SVG.

## Undirskrift

```ts
function getDrawOps(g: Graph, opts?: { engine?: string }): XdotOp[];
```

## Grunnnotkun

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

## Tegundir aðgerða

`XdotOp`-sambandið greinir á milli eftir `op.kind`:

| `kind` | Gagnasvið | Lýsing |
|---|---|---|
| `'filled_ellipse'` | `op.ellipse: XdotRect` | Fylla sporbaug |
| `'unfilled_ellipse'` | `op.ellipse: XdotRect` | Draga útlínu sporbaugs |
| `'filled_polygon'` | `op.polygon: XdotPolyline` | Fylla lokaðan marghyrning |
| `'unfilled_polygon'` | `op.polygon: XdotPolyline` | Draga útlínu lokaðs marghyrnings |
| `'filled_bezier'` | `op.bezier: XdotPolyline` | Fylla lokaðan bezier-feril |
| `'unfilled_bezier'` | `op.bezier: XdotPolyline` | Draga opinn bezier-feril |
| `'polyline'` | `op.polyline: XdotPolyline` | Teikna línuferil |
| `'text'` | `op.text: XdotText` | Teikna textamerkimiða |
| `'fill_color'` | `op.color: string` | Setja núverandi fyllilit |
| `'pen_color'` | `op.color: string` | Setja núverandi línulit |
| `'grad_fill_color'` | `op.gradColor: XdotColor` | Setja litstigul sem fyllingu |
| `'grad_pen_color'` | `op.gradColor: XdotColor` | Setja litstigul sem línu |
| `'font'` | `op.font: XdotFont` | Setja núverandi letur |
| `'style'` | `op.style: string` | Setja núverandi teiknistíl |
| `'image'` | `op.image: XdotImage` | Teikna innfellda mynd |
| `'fontchar'` | `op.fontchar: number` | Setja bitamaska leturstafs |

### Lykiltegundir

```ts
interface XdotRect     { x: number; y: number; w: number; h: number }
interface XdotPolyline { pts: XdotPoint[] }
interface XdotPoint    { x: number; y: number; z: number }
interface XdotText     { x: number; y: number; align: 'left'|'center'|'right'; width: number; text: string }
interface XdotFont     { size: number; name: string }
```

## Hnit

xdot-hnit eru í **punktum**, í upprunalega y-upp-hnitakerfi graphviz (upphafspunktur
neðst til vinstri). Snúðu y-hnitum við áður en teiknað er á flöt þar sem y vex niður:

```ts
// In y-down canvas rendering, where canvasHeight is bounds.height from getLayout:
const screenY = canvasHeight - op.ellipse.y;
```

Aðgerðir berast í teikniröð: fyrst bakgrunnur grafsins, síðan hnútar, síðan leggir.

## Umfang

`getDrawOps` skilar allri aðgerðarunu grafsins í teikniröð, þar á meðal:
- Aðgerðir fyrir lögun hnúta (`filled_ellipse`, `filled_polygon`, `unfilled_polygon` o.s.frv.)
- Texta- og merkimiðaaðgerðir (`text`)
- Leturaðgerðir (`font`)
- Litastillingaraðgerðir (`fill_color`, `pen_color`), þar á meðal sérsniðin
  `color`/`fillcolor`-eigindi hnúta
- Teikniaðgerðir leggja (`unfilled_bezier` fyrir splínuna, auk `pen_color` /
  `fill_color` / `filled_polygon` fyrir örvarhausinn)

Fyrir `digraph { a [color=red]; a -> b }` samsvara `_draw_`/`_hdraw_`-rúmfræðin
og litagildin nákvæmlega úttaki upprunalega `dot -Txdot` (sporbaugur hnúts,
splína leggs, marghyrningur örvarhauss og `color=red` sem var beitt). Kallaðu
beint á `getDrawOps(g)` á nýju grafi (sem hefur ekki enn verið teiknað) — að kalla
á `render(g, ...)` og `getDrawOps(g)` á *sama* grafhlutinn keyrir uppsetningu
tvisvar og er ekki studd aðferð; notaðu annað hvort fyrir hvert graf.

## Canvas-dæmi (aðeins merkimiðar hnúta)

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
