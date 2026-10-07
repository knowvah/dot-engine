---
sourceHash: 36e363726bb2859530f8554c85ec42838f384f647f46aa432bea2437e024d140
---

# xdot çizim işlemleriyle özel işleme

`getDrawOps`, bir grafı yerleştirir, xdot biçiminde işler ve türlendirilmiş
çizim işlemlerinden oluşan düz bir dizi döndürür. SVG ayrıştırmadan özel bir
işleyiciyi (canvas, WebGL, PDF, yerel arayüz) sürmek için kullanın.

## İmza

```ts
function getDrawOps(g: Graph, opts?: { engine?: string }): XdotOp[];
```

## Temel kullanım

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

## İşlem türleri

`XdotOp` birleşim türü, `op.kind` alanı üzerinden ayrışır:

| `kind` | Yük alanı | Açıklama |
|---|---|---|
| `'filled_ellipse'` | `op.ellipse: XdotRect` | Bir elipsi doldurur |
| `'unfilled_ellipse'` | `op.ellipse: XdotRect` | Bir elipsin çevresini çizer |
| `'filled_polygon'` | `op.polygon: XdotPolyline` | Kapalı bir çokgeni doldurur |
| `'unfilled_polygon'` | `op.polygon: XdotPolyline` | Kapalı bir çokgenin çevresini çizer |
| `'filled_bezier'` | `op.bezier: XdotPolyline` | Kapalı bir bezier eğrisini doldurur |
| `'unfilled_bezier'` | `op.bezier: XdotPolyline` | Açık bir bezier eğrisini çizer |
| `'polyline'` | `op.polyline: XdotPolyline` | Bir çoklu çizgi çizer |
| `'text'` | `op.text: XdotText` | Bir metin etiketi çizer |
| `'fill_color'` | `op.color: string` | Geçerli dolgu rengini ayarlar |
| `'pen_color'` | `op.color: string` | Geçerli çizgi rengini ayarlar |
| `'grad_fill_color'` | `op.gradColor: XdotColor` | Degrade dolguyu ayarlar |
| `'grad_pen_color'` | `op.gradColor: XdotColor` | Degrade çizgiyi ayarlar |
| `'font'` | `op.font: XdotFont` | Geçerli yazı tipini ayarlar |
| `'style'` | `op.style: string` | Geçerli çizim stilini ayarlar |
| `'image'` | `op.image: XdotImage` | Gömülü bir görsel çizer |
| `'fontchar'` | `op.fontchar: number` | Yazı tipi karakter bit maskesini ayarlar |

### Anahtar türler

```ts
interface XdotRect     { x: number; y: number; w: number; h: number }
interface XdotPolyline { pts: XdotPoint[] }
interface XdotPoint    { x: number; y: number; z: number }
interface XdotText     { x: number; y: number; align: 'left'|'center'|'right'; width: number; text: string }
interface XdotFont     { size: number; name: string }
```

## Koordinatlar

xdot koordinatları **punto** cinsindendir ve graphviz'in yerel, y ekseni yukarı
doğru olan çerçevesindedir (orijin sol alt köşedir). y ekseni aşağı doğru olan
bir yüzeye çizmeden önce y koordinatlarını çevirin:

```ts
// In y-down canvas rendering, where canvasHeight is bounds.height from getLayout:
const screenY = canvasHeight - op.ellipse.y;
```

İşlemler boyama sırasıyla gelir: önce graf arka planı, sonra düğümler, sonra
kenarlar.

## Kapsam

`getDrawOps`, bir graf için boyama sırasındaki işlem akışının tamamını sunar.
Buna şunlar dahildir:
- Düğüm şekli işlemleri (`filled_ellipse`, `filled_polygon`, `unfilled_polygon` vb.)
- Metin ve etiket işlemleri (`text`)
- Yazı tipi işlemleri (`font`)
- Renk ayarlama işlemleri (`fill_color`, `pen_color`); özel düğüm
  `color`/`fillcolor` öznitelikleri de buna dahildir
- Kenar çizim işlemleri (spline için `unfilled_bezier`, ok ucu için ayrıca
  `pen_color` / `fill_color` / `filled_polygon`)

`digraph { a [color=red]; a -> b }` için `_draw_`/`_hdraw_` geometrisi ve renk
değerleri, yerel `dot -Txdot` çıktısıyla tamamen eşleşir (düğüm elipsi, kenar
spline'ı, ok ucu çokgeni ve uygulanan `color=red`). `getDrawOps(g)` işlevini
doğrudan, henüz işlenmemiş yeni bir graf üzerinde çağırın — `render(g, ...)` ve
`getDrawOps(g)` işlevlerini *aynı* graf nesnesi üzerinde çağırmak yerleşimi iki
kez çalıştırır ve desteklenen bir kullanım biçimi değildir; her graf için
birini veya diğerini kullanın.

## Canvas örneği (yalnızca düğüm etiketleri)

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
