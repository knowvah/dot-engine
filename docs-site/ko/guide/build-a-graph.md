---
sourceHash: e65b96269cc394feac60d63c38c8f4ced8058d06a593f90fd14ed9606f9a6efa
---
# 코드로 그래프 만들기

`createGraph`는 DOT 소스를 작성하지 않고 메모리 상에 그래프를 구성합니다. 그래프 구조가 정적인
DOT 문자열이 아니라 애플리케이션의 데이터 모델에서 나올 때 사용하세요.

## 기본 사용법 {#basic-usage}

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });

const a = b.addNode('a', { shape: 'box', label: 'Start' });
const c = b.addNode('c', { label: 'End' });

b.addEdge(a, c, { label: 'goes to' });
// Nodes can also be referenced by name string:
b.addEdge('a', 'c', { style: 'dashed' });

const svg = render(b.graph, 'svg');
```

`createGraph`는 `GvGraphBuilder`를 반환합니다. 그 `.graph` 속성은 `render`, `getLayout`,
`getDrawOps`가 받는 불투명한 `Graph` 객체입니다.

## 옵션 {#options}

```ts
createGraph(opts?: {
  directed?: boolean;  // default true
  strict?:   boolean;  // default false — strict graph forbids multi-edges
  name?:     string;   // graph name, default ''
}): GvGraphBuilder
```

## 빌더 메서드 {#builder-methods}

| 메서드 | 설명 |
|---|---|
| `addNode(name, attrs?)` | 노드를 추가하고 `GvNode` 핸들을 반환합니다 |
| `addEdge(tail, head, attrs?)` | 에지를 추가합니다. `tail`/`head`에는 `GvNode` 핸들이나 이름 문자열을 쓸 수 있습니다 |
| `addSubgraph(name, attrs?)` | 이름이 있는 서브그래프를 추가하고 중첩된 `GvGraphBuilder`를 반환합니다 |
| `setAttr(k, v)` | 그래프 수준 속성을 설정합니다 |
| `getAttr(k)` | 그래프 수준 속성을 읽습니다 |
| `.graph` | 내부의 `Graph`(레이아웃/렌더링을 위한 불투명 핸들) |

## 속성 {#attributes}

DOT 속성의 키/값 쌍을 평범한 객체로 전달하세요:

```ts
b.addNode('server', { shape: 'cylinder', fillcolor: '#d0e8ff', style: 'filled' });
b.setAttr('rankdir', 'LR');
```

유효한 DOT 속성은 무엇이든 받아들여지며, @knowvah/dot-engine은 이를 변경 없이 레이아웃
엔진에 그대로 전달합니다.

## 서브그래프 {#subgraphs}

`addSubgraph`는 서브그래프로 범위가 한정된 빌더를 반환합니다. 서브그래프에 추가한 노드는
루트 그래프의 구성원이기도 합니다:

```ts
const b = createGraph({ directed: true, name: 'pipeline' });

const cluster = b.addSubgraph('cluster_build', { label: 'CI', style: 'filled' });
cluster.addNode('compile');
cluster.addNode('test');
cluster.addEdge('compile', 'test');

b.addNode('deploy');
b.addEdge('test', 'deploy');

const svg = render(b.graph, 'svg');
```

## `parse`와의 비교 {#compared-with-parse}

```ts
// DOT string — convenient for static graphs
import { parse, render } from '@knowvah/dot-engine';
const g = parse('digraph { a -> b }');
const svg = render(g, 'svg');

// Builder — convenient when graph structure comes from code
import { createGraph, render } from '@knowvah/dot-engine';
const b = createGraph();
b.addEdge('a', 'b');
const svg2 = render(b.graph, 'svg');
```

`parse`와 `createGraph`는 모두 `Graph`를 만들며, 이를 `render`, `getLayout`, `getDrawOps`에
똑같이 전달할 수 있습니다.
