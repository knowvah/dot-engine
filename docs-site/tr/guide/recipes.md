---
sourceHash: 3d15763baac8b6d86c1f835e1c633c2b13aba787da3d897db25cb3038b8e2d78
---

# Tarifler

Oluştur → yerleştir → geometriyi oku yolunun, yalnızca API referansından
anlaşılması kolay olmayan kısımları için göreve yönelik kod parçacıkları. Her
tarif, yalnızca herkese açık `@knowvah/dot-engine` /
`@knowvah/dot-engine/api` / `@knowvah/dot-engine/render` yüzeyini kullanan,
asgari ve çalıştırılabilir bir örnektir — dahili model sınıfları yoktur. Bu
parçacıkların dayandığı giriş noktalarının tam listesi için `/guide/api`
sayfasına bakın.

## 1. Kodla bir graf oluşturma ve işleme

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client', { shape: 'box' });
b.addNode('server', { shape: 'box' });
b.addEdge('client', 'server', { label: 'HTTP GET' });

const svg = render(b.graph, 'svg');
```

**Neden:** Graf yapınız statik bir DOT dizesinden değil uygulama verisinden
geldiğinde `createGraph` size bir oluşturucu verir; `render` grafı yerleştirir
ve tek çağrıda serileştirir. Oluşturucu API'sinin tamamı (alt grafler,
öznitelikler, `parse` karşılaştırması) `/guide/build-a-graph` sayfasındadır.

## 2. İşlemeden yerleştirme, ardından geometriyi okuma

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

**Neden:** `getLayout`, önceden hesaplanmış geometri üzerinde salt okuyucudur —
yerleşimi kendisi çalıştırmaz. Herhangi bir yerleşim çağrısı çalışmadan önce
çağrılırsa eski veya sıfırlanmış koordinatlar döndürmek yerine `code` değeri
`ERR_INVALID_STATE` olan bir `Error` fırlatır ("getLayout requires a laid-out
graph"; bkz. [Hatalar ve istisnalar](/tr/guide/errors)). Yalnızca geometriye
ihtiyacınız varsa ve işlenmiş dizeye hiç gerek duymuyorsanız `render`'ın dönüş
değerini atın — gerçekte bedelini ödediğiniz şey yerleşim yan etkisidir.

## 3. İşleyiciniz için y eksenini seçme

```ts
import { getLayout } from '@knowvah/dot-engine';

// Screen/canvas/SVG convention: origin top-left, y increases downward.
const screenLayout = getLayout(g);

// Native graphviz convention: origin bottom-left, y increases upward.
const nativeLayout = getLayout(g, { yAxis: 'up' });
```

**Neden:** graphviz yerleşimi y ekseni yukarı doğru olan bir koordinat
sisteminde hesaplar; çoğu tüketici (canvas, DOM, tarayıcıdaki SVG) y ekseninin
aşağı doğru olmasını ister. `getLayout` varsayılan olarak `'down'` değerini
kullanır; böylece çoğu çağıranın bu seçeneğe ihtiyacı olmaz. Tam çevirme
formülü ve `bounds` değerinin iki mod arasında nasıl farklılaştığı için
`/guide/geometry` sayfasına bakın.

## 4. `render()` SVG çerçevesini `getLayout()` çerçevesiyle uzlaştırma

`render(g, 'svg')` ve `getLayout(g)` *aynı* yerleştirilmiş grafı farklı
koordinat çerçevelerinde betimler ve fark yalnızca y ekseninin çevrilmesi
değildir: `render`'ın SVG yayıcısı, bir şekil ilkelini yazmadan önce her
y koordinatının işaretini değiştirir, ardından tüm çizimi graphviz'in sayfa
dolgusunu, kenar boşluğunu ve her türlü `size=`/döndürme ölçeklemesini içine
katan tek bir `<g transform="scale(..) rotate(..) translate(tx,ty)">` içine
sarar. `getLayout` bunların hepsini atlar — sayfa geometrisi hiç içermeyen,
`(0, 0)` başlangıç noktasına normalleştirilmiş model koordinatları döndürür.

Herhangi bir `render()` çağrısı için iki çerçeve tek bir sabit öteleme kadar
farklıdır. GVC'nin sayfa yerleşimi formülünü yeniden türetmek yerine, ofseti
her iki çerçevede de konumunu bildiğiniz tek bir düğümden deneysel olarak
türetin:

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

**Neden:** Tek bir eşleşme ofseti tamamen belirler; çünkü bu bir ölçekleme ya
da döndürme değil, saf bir ötelemedir (varsayılan `size=`/`rotate=`
varsayımıyla). Buna yalnızca ham SVG'den `getLayout`'un sunmadığı bir şeyi
okurken ihtiyaç duyarsınız — bugün bunun kaçınılmaz olduğu yaygın durum için 5.
tarife bakın.

## 5. Kenar etiketi konumlarını kurtarma

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

**Neden:** `EdgeGeometry.label`, yalnızca graphviz'in `label` özniteliği için
gerçekten ortalanmış bir etiket yerleştirdiği kenarlarda bulunur; etiketi
olmayan kenarlar alanı yalnızca dışarıda bırakır. `getLayout` yalnızca
hesaplanan *konumu* döndürür — etiket dizesini veya ölçülmüş kutusunu değil —
bu yüzden işleyiciniz etiketi kendisi çizecekse bu konumu, o etiket metni için
kendi tarafınızda zaten ölçtüğünüz boyutla eşleştirin (ör. kenarı oluştururken
kullandığınız aynı kuyruk/baş çiftiyle anahtarlanmış, kendi kenar başına
etiket boyutu haritanızı geri yansıtarak).

`taillabel` ve `headlabel` port etiketleri aynı şekilde, `tailLabel` ve
`headLabel` üzerinde döner:

```ts
b.addEdge('client', 'server', { taillabel: '1', headlabel: '*' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.tailLabel) console.log(`${e.tail} end: (${e.tailLabel.x}, ${e.tailLabel.y})`);
  if (e.headLabel) console.log(`${e.head} end: (${e.headLabel.x}, ${e.headLabel.y})`);
}
```

Her biri yalnızca yerleşim onu yerleştirdiğinde bulunur — `render()` etiketin
`<text>` öğesini yayımladığı koşulun aynısı — dolayısıyla bu konumları geri
almak için işlenmiş SVG'yi kazımanıza gerek yoktur.

Bir `xlabel`, aynı yalnızca-yerleştirilmişse kapısı altında `xlabel` üzerinde
döner. Yaklaşık hesaplamak yerine okumaya değer: graphviz bir dış etiketi,
spline orta noktasını öteleyerek değil, aday konumlar üzerinde bir kuvvet
araması ile konumlandırır; dolayısıyla `label` veya `points` üzerinde yapılan
hiçbir aritmetik bunu yeniden üretmez.

```ts
b.addEdge('a', 'b', { xlabel: 'X' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.xlabel) console.log(`xlabel at (${e.xlabel.x}, ${e.xlabel.y})`);
}
```

## 5b. Kendi ok uçlarınızı çizme

```ts
for (const e of getLayout(b.graph).edges) {
  const last = e.points[e.points.length - 1];
  if (e.ep) drawArrow(last, e.ep);   // tip at ep, base at the spline's end
  if (e.sp) drawArrow(e.points[0], e.sp);
}
```

**Neden:** Bir uçta ok bulunduğunda yerleşim, ok için yer bırakmak üzere
spline'ı kısaltır ve okun nereye ulaşması gerektiğini kaydeder — baş uçta `ep`,
kuyruk uçta `sp`. O uçta ok yoksa ikisi de bulunmaz; dolayısıyla yukarıdaki
denetimler aynı zamanda "bu uçta hiç ok gerekiyor mu" sorusunun yanıtıdır.
Spline'ın son yönünden bir uç noktası tahmin etmek yönü doğru verir ama
derinliği tahmin eder; bunlar ise graphviz'in kendisinin hesapladığı
değerlerdir.

Bunların düğüm sınırındaki bağlanma noktaları olduğunu unutmayın. Graphviz'in
kendi işleyicisi, çizdiği çokgeni bunlardan çizgi kalınlığına bağlı bir miktar
içeri alır; bu yüzden işlenmiş bir okun ucuna eşit olmalarını beklemek yerine
`ep` noktasına *doğru* çizin.

## 6. @knowvah/dot-engine küme adlarını kendi adlarınıza geri eşleme

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

**Neden:** `ClusterGeometry.name`, `addSubgraph`'a verdiğiniz adı birebir geri
yansıtır — @knowvah/dot-engine onu uydurmaz, yeniden numaralandırmaz veya
başka şekilde dönüştürmez. Alan modeliniz kümeleri kendi kimliğiyle
anahtarlıyorsa (graphviz'in kabul edeceği bir ad değilse), kimlik-ad eşlemesini
grafı oluştururken kendiniz tutun ve yerleşimden sonra `clusters` anlık
görüntüsünü yeniden anahtarlayın; anlamı graphviz'in kendi adından geri
çıkarmaya çalışmayın.

## 6b. Kendi küme başlık bloğunuzu çizme

```ts
for (const c of getLayout(b.graph).clusters) {
  if (!c.label) continue;                     // cluster declared no title
  drawBox(c.x, c.y, c.width, c.height);
  drawTextCentred(c.label.x, c.label.y, c.label.width, c.label.height);
}
```

**Neden:** Yerleşim, küme kutusunun içinde küme başlığına yer ayırır ve ardından
nereye gideceğini çözer — `labelloc`, `labeljust`, `rankdir` ve etiketin kendi
ölçülen boyutunu dikkate alarak. `ClusterGeometry.label` bu çözülmüş
yerleşimi yayımlar; böylece kendi başlık bloğunu çizen bir tüketici, metni
yeniden ölçmek ve motorunkiyle uyuşması gereken bir ofseti yeniden türetmek
yerine bunu okur.

`label.x`/`label.y`, etiket alanının **merkezidir**; kutunun bir köşe olan
`x`/`y` değerlerinden farklıdır. `render()`'ın yaydığı `<text>` ise merkezin
altında kalan *taban çizgisini* taşır — bu yüzden işlenmiş çıktıyla
eşleştiriyorsanız merkezleri yayılan `y` ile değil, merkezlerle karşılaştırın.

## 7. Çok sayıda kenarı güvenle ekleme

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

**Neden:** Oluşturucunun `addEdge` işlevi `tail`/`head` değerlerini ada göre
çözer ve düğüm henüz yoksa ilk kullanımda oluşturur — veriye dayalı bir kenar
listesini bağlamadan önce düğümleri önceden bildirmeniz gerekmez. `strict`
bir grafta aynı `(tail, head)` çiftini yinelemek, paralel bir kenar eklemek
yerine var olan kenarı döndürür; bu, cgraph'ın `agedge` yinelenenleri eleme
sözleşmesini yansıtır.

Kenarları `createGraph()` yerine `parse()` ile üretilmiş bir grafa
ekliyorsanız, elinizde zaten bulunan `Node` referansları üzerinde doğrudan
`@knowvah/dot-engine` içindeki alt düzey `addEdge(g, tail, head, name?)`
işlevini kullanın:

```ts
import { parse, addEdge } from '@knowvah/dot-engine';

const g = parse('digraph { a; b; }');
const a = g.nodes.get('a')!;
const c = g.nodes.get('b')!;
addEdge(g, a, c);
```

`addEdge` imzasının tamamı ve strict graf yinelenenleri eleme davranışı için
`/reference` sayfasına bakın.

## 8. Hepsini bir araya getirme

Küçük bir alan grafını alan, yerleştiren ve konumlandırılmış düğümleri ile
kenarları döndüren kompakt bir işlev:

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

Bu, çoğu tüketicinin `getLayout` üzerine inşa etmeye vardığı biçimdir: kendi
düğüm/kenar türlerinizi girdi olarak alan ve konumlandırılmış geometriyi kendi
koordinat geleneğinizde çıktı olarak döndüren tek bir genişletme noktası.
