---
sourceHash: 545227fb3a0a91494ed7a2c299e5a9ca93a594d68d99e0596f743e7597dfbae9
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# 錯誤與例外

dot-engine 會擲出兩種錯誤。您捕捉到哪一種，就能知道誰需要做出改變。

## 兩個家族，一條規則

| 家族 | 如何辨識 | 意義 | 誰該處理 |
|--------|---------------------|---------|----------|
| dot-engine 失敗 | `err instanceof DotEngineError` | dot-engine 在這個輸入上失敗了：DOT 有誤、Graphviz 本身也會回報的致命錯誤、不支援的 Graphviz 功能，或 dot-engine 本身的錯誤 | DOT 作者，或是提交錯誤回報 |
| 使用錯誤 | 標準的 `TypeError` / `RangeError` / `Error`，且 `err.code` 以 `ERR_` 開頭 | 呼叫有誤：引數型別錯誤、未知的引擎或格式名稱、呼叫順序錯誤 | 呼叫端的程式碼 |

請依 `.code` 分支，不要依訊息文字分支。訊息在不同版本之間可能改變；代碼則是穩定的。

使用錯誤不是 `DotEngineError`，也不實作 `GvError`。它們的 `name` 維持為 `TypeError`、`RangeError` 或 `Error`，與 Node.js 相同。

## 類別參考

下列四個類別都繼承自 `DotEngineError`，並實作 `GvError` 形式（`type`、`code`、`message`、`friendlyMessage`，以及選用的 `location` 與 `expected`）。

### `DotEngineError`（抽象）

共同的基底類別。dot-engine 針對其輸入所引發的每個錯誤，`instanceof DotEngineError` 都為 true。它無法直接建構。`type`、`code` 與 `friendlyMessage` 由子類別定義。

### `ParseError`

| 項目 | 值 |
|------|-------|
| 擲出時機 | DOT 原始碼無效，或使用了與圖種類不符的邊運算子 |
| `type` | `syntax` |
| 代碼 | `SYNTAX_ERROR`、`SYNTAX_UNEXPECTED_EOF`、`EDGE_OP_DIRECTED_IN_UNDIRECTED`、`EDGE_OP_UNDIRECTED_IN_DIRECTED`、`GENERIC_ERROR` |
| 欄位 | `location`（`{ line, column, offset? }`）、`expected`（剖析器預期的內容；僅限 `SYNTAX_*`）、`line` 與 `column` getter |
| 呼叫者的處理 | 修正 DOT 原始碼。將 `location` 與 `friendlyMessage` 顯示給作者 |

`ParseError` 上的 `GENERIC_ERROR` 表示原始碼巢狀過深，使剖析器的堆疊耗盡。

### `HtmlParseError`

| 項目 | 值 |
|------|-------|
| 擲出時機 | 目前不會到達呼叫者（見下文） |
| `type` | `semantic` |
| 代碼 | `HTML_PARSE_ERROR` |
| 欄位 | `tag`（有問題的權杖）。沒有 `location` 或 `expected` |
| 呼叫者的處理 | 無。若要找出有問題的標籤，請將轉譯輸出與您預期的結果比對 |

HTML 類標籤剖析器遇到未知元素、格式錯誤的屬性，或位置不當的 `<TABLE>`、`<HR>` 或 `<VR>` 時，會引發 `HtmlParseError`。版面配置階段會捕捉它，並讓該標籤沒有內容，這與 Graphviz 相同：圖仍會轉譯，只是標籤為空。沒有任何公開函式會將它向外傳遞。

`HtmlParseError` 不會從套件根匯出。如果真的有一個傳到您手上，`err instanceof DotEngineError && err.code === 'HTML_PARSE_ERROR'` 可以辨識它。

### `RenderError`

| 項目 | 值 |
|------|-------|
| 擲出時機 | 版面配置或轉譯以 Graphviz 本身也會回報的方式失敗、圖指定了無法使用的版面配置引擎，或圖使用了 dot-engine 尚未移植的 Graphviz 功能 |
| `type` | `RENDER_ERROR` 為 `render`；`UNKNOWN_LAYOUT` 與 `UNSUPPORTED_FEATURE` 為 `semantic` |
| 代碼 | `RENDER_ERROR`、`UNKNOWN_LAYOUT`、`UNSUPPORTED_FEATURE` |
| 欄位 | 當失敗包裝了另一個錯誤時有 `cause`。沒有 `location` |
| 呼叫者的處理 | `RENDER_ERROR`：修改圖。`UNKNOWN_LAYOUT`：修正 `layout=` 屬性。`UNSUPPORTED_FEATURE`：避免使用該功能（例如 sfdp 搭配 `rotation=45`；請見[表格](#unsupported-feature-reference)） |

### `InternalError`

| 項目 | 值 |
|------|-------|
| 擲出時機 | dot-engine 內部的斷言或不變式失敗，或有非 dot-engine 的錯誤逸出版面配置或轉譯管線 |
| `type` | `render` |
| 代碼 | `INTERNAL_ERROR` |
| 欄位 | `cause`（有包裝時為原始錯誤） |
| 呼叫者的處理 | 回報錯誤，並附上觸發它的 DOT 原始碼 |

DOT 作者能做的任何修改，都無法可靠地避開 `InternalError`。

## 代碼參考

### `GvErrorCode`

| 代碼 | 類別 | `type` | 意義 | 典型原因 | 呼叫者的處理 | 由何者引發 |
|------|-------|--------|---------|---------------|---------------|-----------|
| `SYNTAX_ERROR` | `ParseError` | `syntax` | 未預期的權杖 | 拼字錯誤、缺少 `;` 或 `}` | 修正 `location` 處的 DOT | `parse`、`renderSvg` |
| `SYNTAX_UNEXPECTED_EOF` | `ParseError` | `syntax` | 原始碼在陳述式中途結束 | 未關閉的 `{`、`[` 或字串 | 修正 `location` 處的 DOT | `parse`、`renderSvg` |
| `EDGE_OP_DIRECTED_IN_UNDIRECTED` | `ParseError` | `syntax` | 無向圖中使用 `->` | `graph { a -> b }` | 改用 `--` | `parse`、`renderSvg` |
| `EDGE_OP_UNDIRECTED_IN_DIRECTED` | `ParseError` | `syntax` | 有向圖中使用 `--` | `digraph { a -- b }` | 改用 `->` | `parse`、`renderSvg` |
| `GENERIC_ERROR` | `ParseError` | `syntax` | 原始碼巢狀過深而無法剖析 | 病態巢狀的子圖 | 將 DOT 攤平 | `parse`、`renderSvg` |
| `HTML_PARSE_ERROR` | `HtmlParseError` | `semantic` | 格式錯誤的 HTML 類標籤 | 未知元素、錯誤的屬性 | 無：標籤會以空白轉譯 | 無（內部已捕捉） |
| `RENDER_ERROR` | `RenderError` | `render` | Graphviz 也會回報的致命版面配置或轉譯錯誤 | 某個版面配置階段的輸入格式不正確 | 修改圖 | `renderSvg`、`render`、`getDrawOps`、`GvcContext.layout` |
| `UNKNOWN_LAYOUT` | `RenderError` | `semantic` | 圖的 `layout=` 屬性所指名的引擎未註冊 | `layout="foo"` | 修正該屬性 | `renderSvg`、`render`、`getDrawOps`、`GvcContext.layout` |
| `UNSUPPORTED_FEATURE` | `RenderError` | `semantic` | 圖要求了 dot-engine 尚未移植的 Graphviz 功能 | sfdp 搭配 `rotation=45` | 避免使用該功能 | `renderSvg`、`render`、`getDrawOps`、`GvcContext.layout` |
| `INTERNAL_ERROR` | `InternalError` | `render` | dot-engine 本身的錯誤 | 斷言失敗、外來的擲出 | 回報錯誤 | `renderSvg`、`render`、`getDrawOps`、建構器方法、`GvcContext.layout`（未包裝） |

### `UsageErrorCode`

| 代碼 | 類別 | 意義 | 典型原因 | 呼叫者的處理 | 由何者引發 |
|------|-------|---------|---------------|---------------|-----------|
| `ERR_INVALID_ARG_TYPE` | `TypeError` | 型別錯誤、`null`，或缺少必要引數 | `renderSvg(undefined, 'dot')`、`getLayout(null)` | 修正呼叫 | 每個接受引數的公開函式 |
| `ERR_INVALID_ARG_VALUE` | `TypeError` | 型別正確，但值未知 | 未註冊的引擎或格式名稱；`getLayout(g, { yAxis: 'other' })` | 使用已註冊的名稱或允許的值 | `renderSvg`、`tryRenderSvg`、`render`、`getDrawOps`、`getLayout`、`GvcContext.layout`、`freeLayout`、`bestRenderer`、`renderWithContext` |
| `ERR_OUT_OF_RANGE` | `RangeError` | 數值引數超出範圍 | 保留 | 修正呼叫 | 目前沒有公開函式會引發它 |
| `ERR_INVALID_STATE` | `Error` | 在錯誤的狀態下呼叫 | 版面配置之前就呼叫 `getLayout` | 先進行版面配置（`render(g, ...)` 或 `ctx.layout`） | `getLayout` |

即使 DOT 原始碼設定了有效的 `layout=` 屬性，未註冊的引擎引數仍會被拒絕。引數會先被檢查。

## `UNSUPPORTED_FEATURE` 參考 {#unsupported-feature-reference}

下列每個屬性值，都會使版面配置擲出代碼為 `UNSUPPORTED_FEATURE` 的 `RenderError`，因為原生 Graphviz 在這些情況下會執行 dot-engine 尚未移植的演算法。否則的替代做法，是在不告知的情況下轉譯出與 Graphviz 不同的版面配置。只有在「觸發條件」欄的條件成立時，才會觸發檢查；同一個屬性出現在其他情況下，則會正常轉譯。若要避免此錯誤，請移除該屬性，或將它改為受支援的值。

| 引擎 | 屬性與值 | 觸發條件 | 所需的 Graphviz 功能 |
|--------|--------------------|------------|-------------------------|
| neato | `mode=hier` | 一律觸發（在圖有 2 個以上節點，且 `maxiter` 不為負值之後） | 階層式應力最佳化（`stress_majorization_with_hierarchy`） |
| neato | `mode=ipsep` | 僅在 Graphviz 會建立約束時：`diredgeconstraints` 為 true 或為 `hier*`、`overlap=ipsep`，或圖有頂層叢集。沒有約束時，它會如同 Graphviz 一樣以應力最佳化方式執行 | 受約束的最佳化（`stress_majorization_cola`） |
| neato | `start=self` | `mode` 為 `major`（預設值）或 `ipsep` | 智慧初始化（`smart_ini`）。在 `mode=KK` 或 `mode=sgd` 下，每次轉譯會記錄一次 `start=0 not supported with mode=self - ignored`，與 Graphviz 相同 |
| neato | `model=subset` | `mode` 為 `major` 或 `KK` | subset 距離模型 |
| neato | `model=circuit` | `mode` 為 `major`，或在連通圖上為 `KK`。在未連通的圖上、且沒有 `pack` 或 `packmode` 的 `KK`，會記錄警告並使用最短路徑，與 Graphviz 相同 | circuit 距離模型（`circuit_model`） |
| neato、twopi、circo、sfdp | `overlap=voronoi`（不分大小寫） | 圖（twopi 為一個元件；sfdp 為整個圖或一個元件）有 2 個以上節點，且 Graphviz 自己的重疊計數（`countOverlap`，測試節點多邊形）大於 0。僅以邊界框相接的節點不會觸發。circo 只有在單一元件的圖才會走到這裡（在多個元件時，Graphviz 也會忽略 `overlap`）。sfdp 只有在 `overlap` 不是 prism 模式時才會走到這裡 | Voronoi 重疊移除（`vAdjust`） |
| fdp | `overlap=` 為 `voronoi`、`oscale`、`vpsc`、`ipsep`、`ortho`、`ortho_yx`、`orthoxy`、`orthoyx`、`portho`、`portho_yx`、`porthoxy`、`porthoyx` 之一 | 在 `N:` 力導向迭代嘗試之後才走到該模式，也就是這些嘗試未能移除所有重疊時（或 `N` 為 0 或未指定）。允許使用 `N:` 前綴，例如 `3:voronoi` | 對應的 `removeOverlapWith` 調整演算法 |
| fdp | `splines=compound` | 一律觸發，無論有無叢集 | 避開叢集的邊繞線（`compoundEdges`） |
| sfdp | `smoothing=` 除 `none` 或 `0` 以外的任何值 | 一律觸發 | `post_process_smoothing` |
| sfdp | `rotation=` 任何非零數字 | 一律觸發 | 重疊移除之前的 `rotate()` |
| sfdp | `label_scheme=1` 到 `4` | 存在名為 `|edgelabel|...` 的節點、`overlap` 解析為 `prism` 模式，且該 scheme 為 3 或 4，或該 scheme 為 1 或 2 且 prism 嘗試次數大於 0（`overlap=prism` 帶有計數，而不是預設的 `prism0`）。大於 4 的值視為 0。一般的邊標籤絕不會觸發它 | 邊標籤節點處理（`edge_labeling_scheme`） |
| sfdp | `quadtree=none`（也包括 `0`、`false`） | 任何至少有一個節點的圖。訊息會指出解析後的 scheme | `spring_electrical_embedding_slow` |
| sfdp | `quadtree=fast`（也包括 `2`） | 任何至少有一個節點的圖。訊息會指出解析後的 scheme | `spring_electrical_embedding_fast` |
| 所有引擎 | 由尚未移植的特殊 `round_corners` 情況所繪製的節點形狀 | 節點使用該形狀。訊息：`special shape N not yet ported` | 該形狀的 `round_corners` 繪製分支。這是針對沒有對應繪製情況的形狀編號的內部防護；目前不知道有任何具名形狀會走到這裡 |

多數訊息的形式為 `<attribute>=<value>: <what> is not supported yet`。例外是 `smoothing` 與 `rotation`（它們會指出缺少的常式）、fdp 各列，以及形狀那一列，它們使用上述的措辭。請依 `err.code === 'UNSUPPORTED_FEATURE'` 分支，不要依文字分支。

選擇預設值的值（例如 `quadtree=normal`、`true`、`yes`、`1`），以及 Graphviz 接受且已移植的值（例如 `start=regular`、`start=random`、`model=mds`、`mode=KK`、`mode=sgd`、`overlap=prism`、`scale` 系列，以及在 neato、twopi、circo 和 sfdp 上的 `overlap=oscale`、`vpsc` 與 `ortho*` / `portho*` 模式），都會正常轉譯。

## 各函式參考

「使用」指的是帶有 `ERR_INVALID_ARG_TYPE` 的 `TypeError`，除非該列指明了其他代碼。

| 函式 | 可能擲出 |
|----------|-----------|
| `renderSvg(dotSource, engine)` | 使用（`dotSource` 或 `engine` 不是字串）；`TypeError` `ERR_INVALID_ARG_VALUE`（引擎未註冊）；`ParseError`；`RenderError`；`InternalError` |
| `tryRenderSvg(dotSource, engine)` | 使用（`dotSource` 或 `engine` 不是字串）；`TypeError` `ERR_INVALID_ARG_VALUE`（引擎未註冊）。其他都不會：每個 DOT 輸入造成的失敗都會在 `errors` 中回傳 |
| `parse(dotSource)` | `TypeError` `ERR_INVALID_ARG_TYPE`（`dotSource` 不是字串）；`ParseError` |
| `render(g, format, opts?)` | 使用（`g`、`format` 或 `opts` 型別錯誤）；`TypeError` `ERR_INVALID_ARG_VALUE`（引擎或格式未註冊）；`RenderError`；`InternalError` |
| `getDrawOps(g, opts?)` | 使用（`g` 或 `opts` 型別錯誤）；`TypeError` `ERR_INVALID_ARG_VALUE`（`opts.engine` 未註冊）；`RenderError`；`ParseError`（中間產生的 xdot 無法重新剖析：dot-engine 本身的錯誤）；`InternalError` |
| `createGraph(opts?)` 與建構器方法（`addNode`、`addEdge`、`addSubgraph`、`setAttr`...） | 使用（引數型別錯誤，包括不是字串的屬性值）；`InternalError`（圖模型無法建立節點或子圖） |
| `addEdge(g, tail, head, name?)`（來自 `/api`） | 使用（`g`、`tail` 或 `head` 不是物件；`name` 不是字串） |
| `getLayout(g, opts?)` | 使用（`g` 或 `opts` 不是物件）；`TypeError` `ERR_INVALID_ARG_VALUE`（`opts.yAxis` 不是 `'up'` 或 `'down'`）；`Error` `ERR_INVALID_STATE`（圖尚未完成版面配置） |
| `new GvcContext(measurer, options?)` | 使用（`measurer` 沒有 `measure` 函式；`options` 不是物件） |
| `ctx.register(plugin)` | 使用（不是轉譯器外掛或版面配置引擎） |
| `ctx.layout(g, engine)` | 使用（`g` 不是物件、`engine` 不是字串）；`TypeError` `ERR_INVALID_ARG_VALUE`（引擎未註冊）；`RenderError` `UNKNOWN_LAYOUT`。引擎的失敗會原樣向外傳遞（未包裝） |
| `ctx.freeLayout(g, engine)` | 使用；`TypeError` `ERR_INVALID_ARG_VALUE`（引擎未註冊）。引擎的失敗會原樣向外傳遞（未包裝） |
| `ctx.bestRenderer(format)` | 使用（`format` 不是字串）；`TypeError` `ERR_INVALID_ARG_VALUE`（`format` 沒有轉譯器） |
| `renderWithContext(ctx, g, format, inlineImages?)` | 使用（`ctx` 不是 `GvcContext`、`g` 不是物件、`format` 不是字串）；`TypeError` `ERR_INVALID_ARG_VALUE`（`format` 沒有轉譯器）。轉譯的失敗會原樣向外傳遞（未包裝） |
| `setImageSizer(sizer)` | 使用（不是函式也不是 `null`） |
| `setImageResolver(fn)` | 使用（不是函式也不是 `null`） |
| `setTextMeasurer(measurer)` | 使用（不是 `TextMeasurer` 也不是 `undefined`） |

### 哪些函式會包裝外來的擲出

| 函式 | 遇到非預期（非 dot-engine）擲出時的行為 |
|-----------|---------------------------------------------------|
| `renderSvg`、`tryRenderSvg`、`render`、`getDrawOps` | 包裝為 `InternalError`；`cause` 為原始錯誤 |
| `renderWithContext` 與每個 `GvcContext` 方法 | **不會包裝。**引擎的錯誤會以引擎擲出的任何形式傳到呼叫者，例如沒有 `code` 的單純 `TypeError` |

如果您直接使用 `GvcContext`，請將既不是 `DotEngineError`、也不是使用錯誤的錯誤，視為 dot-engine 本身的錯誤。

## `tryRenderSvg` 或 `renderSvg`

| | `renderSvg` | `tryRenderSvg` |
|---|-------------|----------------|
| 錯誤的 DOT 或版面配置失敗 | 擲出 `DotEngineError` | 回傳 `{ errors: [one] }` |
| 錯誤的引數 | 擲出使用錯誤 | 擲出使用錯誤 |
| 錯誤值 | 帶有堆疊與 `cause` 的 `Error` | 純資料：`type`、`code`、`message`、`friendlyMessage`，以及存在時的 `location` / `expected` |
| 使用時機 | 失敗時應中止呼叫者 | 您依 `code` 分支，或要將錯誤跨 `postMessage` 傳送或寫入記錄 |

`tryRenderSvg` 對任何 DOT 輸入都不會擲出。它只有在引數本身無效時才會擲出，那是呼叫端程式碼的錯誤。它回傳的錯誤物件沒有 `cause`，也沒有堆疊追蹤。

## 被包裝的失敗與 `cause`

當 `renderSvg`、`render` 或 `getDrawOps` 捕捉到並非由 dot-engine 引發的錯誤時，會擲出一個 `InternalError`，其 `cause` 為原始錯誤。`message` 則是原始訊息。

`cause` 是不可列舉的，因此 `JSON.stringify(err)` 會略過它。記錄時請明確地走訪這條鏈（見下方最後一個範例）。

## 跨套件檢查

`instanceof DotEngineError` 只在同一份函式庫副本內有效。如果可能載入兩份副本（重複的套件、外掛宿主），請使用 `isGvError(e)`。它會檢查是否有字串型的 `type` 與 `code`，並可跨副本運作。它也接受 `tryRenderSvg` 回傳的純物件。

## 範例

區分這兩個家族：

```ts
import { renderSvg, DotEngineError, ParseError } from '@knowvah/dot-engine';

function renderOrExplain(dot: string): string {
  try {
    return renderSvg(dot, 'dot');
  } catch (err: unknown) {
    if (err instanceof ParseError) {
      const { line, column } = err.location;
      return `DOT error at ${line}:${column}: ${err.friendlyMessage}`;
    }
    if (err instanceof DotEngineError) {
      return `${err.code}: ${err.friendlyMessage}`;
    }
    // A usage error: the call was wrong. Do not swallow it.
    throw err;
  }
}
```

處理 `tryRenderSvg` 的結果：

```ts
import { tryRenderSvg } from '@knowvah/dot-engine';

const result = tryRenderSvg('digraph { a ->', 'dot');
if (result.svg !== undefined) {
  console.log(result.svg.length);
} else {
  const [first] = result.errors ?? [];
  console.error(first?.code, first?.location);
}
```

連同其 cause 一起記錄 `InternalError`：

```ts
import { InternalError } from '@knowvah/dot-engine';

function describeChain(err: unknown): string[] {
  const lines: string[] = [];
  let current: unknown = err;
  while (current instanceof Error) {
    lines.push(`${current.name}: ${current.message}`);
    current = current.cause;
  }
  return lines;
}

export function logFailure(err: unknown): void {
  if (err instanceof InternalError) {
    // Report this: it is a dot-engine bug. `cause` is the original error.
    console.error(describeChain(err).join(' <- '));
  }
}
```

## 另請參閱

- [API 參考（精選）](/zh-tw/guide/api)，了解每個函式的簽章。
- [型別](/zh-tw/guide/types)，了解 `GvError` 與 `RenderResult` 的形式。
- [產生的 API（TypeDoc）](/reference/)，了解完整的 `GvErrorCode` 與 `UsageErrorCode` 聯集。
