---
sourceHash: 3d15763baac8b6d86c1f835e1c633c2b13aba787da3d897db25cb3038b8e2d78
---

# 레시피

빌드 → 레이아웃 → 지오메트리 읽기 경로 중에서 API 참고 자료만으로는 명확하지 않은
부분을 위한 작업 중심 스니펫입니다. 각 레시피는 공개 `@knowvah/dot-engine` /
`@knowvah/dot-engine/api` / `@knowvah/dot-engine/render` 인터페이스만 사용하는 최소한의
실행 가능한 예제이며 내부 모델 클래스는 사용하지 않습니다. 이 스니펫들이 사용하는
진입점 전체 목록은 `/guide/api`를 참조하세요.

## 1. 코드로 그래프를 만들고 렌더링하기

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client', { shape: 'box' });
b.addNode('server', { shape: 'box' });
b.addEdge('client', 'server', { label: 'HTTP GET' });

const svg = render(b.graph, 'svg');
```

**이유:** 그래프 구조가 정적인 DOT 문자열이 아니라 애플리케이션 데이터에서 올 때
`createGraph`가 빌더를 제공합니다. `render`는 한 번의 호출로 그래프를 레이아웃하고
직렬화합니다. 빌더 API 전체(서브그래프, 속성, `parse`와의 비교)는
`/guide/build-a-graph`에 있습니다.

## 2. 렌더링하지 않고 레이아웃한 다음 지오메트리 읽기

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

**이유:** `getLayout`은 이미 계산된 지오메트리를 읽기만 하는 함수로, 레이아웃을
직접 실행하지 않습니다. 어떤 레이아웃 호출도 실행되기 전에 호출하면 오래되었거나
0으로 채워진 좌표를 돌려주는 대신 `code`가 `ERR_INVALID_STATE`인 `Error`
("getLayout requires a laid-out graph". [오류와 예외](/ko/guide/errors) 참조)를
던집니다. 지오메트리만 필요하고 렌더링된 문자열은 필요 없다면 `render`의 반환값을
버리세요. 실제로 치르는 비용은 레이아웃이라는 부수 효과입니다.

## 3. 렌더러에 맞는 y축 선택하기

```ts
import { getLayout } from '@knowvah/dot-engine';

// Screen/canvas/SVG convention: origin top-left, y increases downward.
const screenLayout = getLayout(g);

// Native graphviz convention: origin bottom-left, y increases upward.
const nativeLayout = getLayout(g, { yAxis: 'up' });
```

**이유:** graphviz는 y축이 위쪽인 좌표계에서 레이아웃을 계산하지만, 대부분의
소비자(캔버스, DOM, 브라우저의 SVG)는 y축이 아래쪽인 좌표를 원합니다. `getLayout`의
기본값이 `'down'`이라서 대부분의 호출자는 이 옵션이 필요 없습니다. 정확한 뒤집기
공식과 두 모드에서 `bounds`가 어떻게 다른지는 `/guide/geometry`를 참조하세요.

## 4. `render()`의 SVG 좌표계와 `getLayout()`의 좌표계 맞추기

`render(g, 'svg')`와 `getLayout(g)`는 *같은* 레이아웃된 그래프를 서로 다른 좌표계로
기술하며, 그 차이는 y축 뒤집기만이 아닙니다. `render`의 SVG 출력기는 도형 프리미티브를
쓰기 전에 모든 y 좌표의 부호를 바꾸고, graphviz의 페이지 패딩, 여백, `size=`/회전
스케일링을 모두 반영하는 하나의 `<g transform="scale(..) rotate(..) translate(tx,ty)">`로
전체 그림을 감쌉니다. `getLayout`은 이 모든 것을 건너뜁니다. 페이지 지오메트리가
전혀 없이 `(0, 0)` 원점으로 정규화된 모델 좌표를 반환합니다.

`render()` 호출 하나에 대해 두 좌표계는 하나의 상수 평행 이동만큼 차이가 납니다.
GVC의 페이지 레이아웃 공식을 다시 유도하는 대신, 두 좌표계에서 모두 위치를 알고 있는
노드 하나로 오프셋을 경험적으로 구하세요.

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

**이유:** 오프셋이 스케일이나 회전이 아닌 순수한 평행 이동이므로(기본 `size=`/`rotate=`
가정) 일치하는 항목 하나로 오프셋이 완전히 결정됩니다. 원시 SVG에서 `getLayout`이
노출하지 않는 무언가를 읽어 낼 때만 필요합니다. 현재로서는 그것이 불가피한 흔한
경우는 레시피 5를 참조하세요.

## 5. 에지 레이블 위치 복원하기

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

**이유:** `EdgeGeometry.label`은 graphviz가 `label` 속성에 대해 실제로 가운데 정렬된
레이블을 배치한 에지에만 존재하며, 그렇지 않은 에지는 이 필드를 생략합니다.
`getLayout`은 계산된 *위치*만 반환하고 레이블 문자열이나 측정된 상자는 반환하지
않습니다. 따라서 렌더러가 레이블을 직접 그려야 한다면, 이 위치를 레이블 텍스트에 대해
이미 직접 측정해 둔 크기와 짝지으세요(예를 들어 에지를 만들 때 사용한 것과 같은
tail/head 쌍을 키로 하는 에지별 레이블 크기 맵을 그대로 되돌려 사용합니다).

`taillabel`과 `headlabel` 포트 레이블도 같은 방식으로 `tailLabel`과 `headLabel`에
담겨 돌아옵니다.

```ts
b.addEdge('client', 'server', { taillabel: '1', headlabel: '*' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.tailLabel) console.log(`${e.tail} end: (${e.tailLabel.x}, ${e.tailLabel.y})`);
  if (e.headLabel) console.log(`${e.head} end: (${e.headLabel.x}, ${e.headLabel.y})`);
}
```

각각은 레이아웃이 위치를 배정한 뒤에만 존재합니다. 이는 `render()`가 레이블의
`<text>`를 출력하는 조건과 같으므로, 이 위치를 복원하려고 렌더링된 SVG를 긁어낼
필요가 없습니다.

`xlabel`은 같은 "배정된 경우에만" 조건으로 `xlabel`에 담겨 돌아옵니다. 근사하기보다
읽어 오는 편이 낫습니다. graphviz는 외부 레이블을 스플라인 중간점을 기준으로 오프셋하는
것이 아니라 후보 슬롯에 대한 힘 탐색으로 배치하므로, `label`이나 `points`에 어떤
산술을 적용해도 이를 재현할 수 없습니다.

```ts
b.addEdge('a', 'b', { xlabel: 'X' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.xlabel) console.log(`xlabel at (${e.xlabel.x}, ${e.xlabel.y})`);
}
```

## 5b. 직접 화살촉 그리기

```ts
for (const e of getLayout(b.graph).edges) {
  const last = e.points[e.points.length - 1];
  if (e.ep) drawArrow(last, e.ep);   // tip at ep, base at the spline's end
  if (e.sp) drawArrow(e.points[0], e.sp);
}
```

**이유:** 한쪽 끝에 화살표가 있으면 레이아웃은 화살표를 위한 공간을 남기도록 스플라인을
짧게 만들고 화살표가 닿아야 할 위치를 기록합니다. 머리 쪽은 `ep`, 꼬리 쪽은 `sp`입니다.
해당 끝에 화살표가 없으면 둘 다 없으므로, 위의 검사는 "이 끝에 화살표가 필요한가"를
판단하는 역할도 겸합니다. 스플라인의 마지막 방향에서 끝점을 외삽하면 방향은 맞지만
깊이는 추측하게 됩니다. 이 값들은 graphviz 자신이 계산한 값입니다.

이 점들은 노드 경계의 부착점입니다. Graphviz 자체 렌더러는 그리는 다각형을 펜 두께에
따라 달라지는 양만큼 이 점에서 안쪽으로 들여 그리므로, `ep`가 렌더링된 화살표의
끝점과 같을 것이라고 기대하지 말고 `ep`*까지* 그리세요.

## 6. @knowvah/dot-engine 클러스터 이름을 내 이름에 대응시키기

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

**이유:** `ClusterGeometry.name`은 `addSubgraph`에 준 이름을 정확히 그대로 돌려줍니다.
@knowvah/dot-engine은 이름을 만들어 내거나 다시 번호를 매기거나 달리 변형하지
않습니다. 도메인 모델이 클러스터를 자체 id(graphviz가 받아들일 이름이 아님)로
구분한다면, 그래프를 만드는 동안 id와 이름의 대응을 직접 유지하고 레이아웃 뒤에
`clusters` 스냅샷의 키를 다시 매기세요. graphviz 자체의 이름에서 의미를 복원하려
하지 마세요.

## 6b. 직접 클러스터 제목 블록 그리기

```ts
for (const c of getLayout(b.graph).clusters) {
  if (!c.label) continue;                     // cluster declared no title
  drawBox(c.x, c.y, c.width, c.height);
  drawTextCentred(c.label.x, c.label.y, c.label.width, c.label.height);
}
```

**이유:** 레이아웃은 클러스터 상자 안에 클러스터 제목을 위한 공간을 확보한 다음,
`labelloc`, `labeljust`, `rankdir`, 그리고 레이블 자체의 측정된 크기를 반영해 제목이
놓일 위치를 결정합니다. `ClusterGeometry.label`은 이렇게 결정된 배치를 공개하므로,
자체 제목 블록을 그리는 소비자는 텍스트를 다시 측정하고 엔진의 결과와 일치해야 하는
오프셋을 다시 유도하는 대신 이 값을 읽습니다.

`label.x`/`label.y`는 모서리인 상자의 `x`/`y`와 달리 레이블 공간의 **중심**입니다.
`render()`가 출력하는 `<text>`는 대신 중심보다 아래에 있는 *기준선*을 가지므로,
렌더링된 출력과 맞춰 볼 때는 출력된 `y`가 아니라 중심끼리 비교하세요.

## 7. 많은 에지를 안전하게 추가하기

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

**이유:** 빌더의 `addEdge`는 `tail`/`head`를 이름으로 해석하고, 노드가 아직 없으면
처음 사용할 때 만듭니다. 데이터 기반 에지 목록을 연결하기 전에 노드를 미리 선언할
필요가 전혀 없습니다. `strict` 그래프에서는 같은 `(tail, head)` 쌍을 반복하면 병렬
에지를 추가하는 대신 기존 에지를 반환하며, 이는 cgraph의 `agedge` 중복 제거 규약을
그대로 따릅니다.

`createGraph()`가 아니라 `parse()`가 만든 그래프에 에지를 추가한다면, 이미 가지고 있는
`Node` 참조에 대해 `@knowvah/dot-engine`의 하위 수준 `addEdge(g, tail, head, name?)`를
직접 사용하세요.

```ts
import { parse, addEdge } from '@knowvah/dot-engine';

const g = parse('digraph { a; b; }');
const a = g.nodes.get('a')!;
const c = g.nodes.get('b')!;
addEdge(g, a, c);
```

`addEdge`의 전체 시그니처와 strict 그래프 중복 제거 동작은 `/reference`를
참조하세요.

## 8. 종합하기

작은 도메인 그래프를 받아 레이아웃하고 위치가 지정된 노드와 에지를 반환하는 간결한
함수입니다.

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

대부분의 소비자가 `getLayout` 위에 결국 만들게 되는 모양입니다. 자신의 노드/에지
타입을 받아 자신의 좌표 관례로 위치가 지정된 지오메트리를 반환하는 하나의 교체
지점입니다.
