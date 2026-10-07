---
sourceHash: 66af4fa5a29e8468c7ecdd9bd541c9d7572b0a87dc81ab412cb63c543106fde8
---
# 詞彙表

每個術語一則定義，依英文術語的字母順序排列（各條目的標題順序與英文版相同）。
每則定義都連結到深入說明它的指南頁面（或原始碼）。

## 叢集（Cluster） {#cluster}

名稱以 `cluster` 開頭的子圖（例如 `subgraph cluster_build`）——
Graphviz 會把它轉譯成一個獨立的方框，將其成員節點歸為一組。在內部，
@knowvah/dot-engine 的幾何快照會把每個叢集子圖重新以位置式名稱作為鍵，例如
`cluster6`（`ClusterGeometry.name`），而不是 DOT 原始碼中的名稱，
因此需要原始名稱的使用端，會在版面配置前先建立一個 `idByName` 對應表，
並在之後重新設定 `snapshot.clusters` 的鍵。重新設定鍵的做法請見
[實作範例](/zh-tw/guide/recipes)，透過 `addSubgraph` 建立叢集則請見
[以程式碼建構圖](/zh-tw/guide/build-a-graph)。

## 一致性（Conformance） {#conformance}

這是以機械方式檢查的性質，支撐「@knowvah/dot-engine 的轉譯結果與
C 參照程式『相符』」這項說法。兩份 SVG 都解析為正規化的元素樹之後，
每個數值（座標、路徑資料、`points`）都必須在固定的容許誤差內一致——
確定性引擎（`dot`、`circo`、`twopi`、`osage`、`patchwork`）為 **±0.01pt**，
迭代式的力導向引擎（`neato`、`fdp`、`sfdp`）為 **±0.5pt**——
而每個非數值內容（標籤、顏色、文字）都必須完全相同。這並不是在宣稱
SVG 輸出逐位元組相同。請參閱[一致性](/zh-tw/conformance)。

## 座標系統／y 軸（Coordinate frame / y-axis） {#coordinate-frame-y-axis}

Graphviz 原生的座標系統是 **y 軸向上**，原點在左下角；
瀏覽器與螢幕則是 **y 軸向下**，原點在左上角。
`getLayout` 預設為 `yAxis: 'down'`（翻轉每個 y 值，並將
`bounds` 正規化到 `(0, 0)`），也接受 `yAxis: 'up'`，以原封不動地回傳 Graphviz 原生
座標。xdot 繪製操作（來自 `getDrawOps`）一律採用原生的
y 軸向上座標系。請參閱[讀取計算出的幾何資訊](/zh-tw/guide/geometry)。

## 差異（Divergence） {#divergence}

@knowvah/dot-engine 的轉譯結果與參照程式之間的某項不同，
且已經過調查、找出根本原因並建立目錄——而不是被默默容忍。
列入目錄的差異分屬三類之一：已接受的差值（刻意不使其一致，例如跨平台的
浮點數非確定性）、仍在持續收斂的追蹤中長尾問題，以及
明確的非目標。未列入的不同之處會被視為缺陷，而不是
可接受的行為。請參閱[已知差異](/zh-tw/divergences)。

## DOT {#dot}

圖形描述語言——`digraph { ... }` / `graph { ... }`，內含
節點、邊與屬性陳述式——@knowvah/dot-engine 會先解析它，再將結果
交給版面配置引擎。請參閱[快速入門](/zh-tw/guide/getting-started)。

## 圖片尺寸取得器／解析器（Image sizer / resolver） {#image-sizer-resolver}

用於外部圖片（usershape 節點與 `<IMG>`
HTML 標籤儲存格）的兩個可注入替換點。`ImageSizer` 回報圖片的原始寬度／高度，
讓節點尺寸與標籤版面配置不必載入像素資料即可進行；
`ImageResolver` 則在轉譯時提供實際的圖片位元組以供
內嵌。請參閱[圖片](/zh-tw/guide/images)。

## 版面配置引擎（Layout engine） {#layout-engine}

@knowvah/dot-engine 註冊的八種版面配置演算法之一，以名稱選用
（`renderSvg(dot, engine)`）：`dot`（階層式／分層）、`neato`
（彈簧模型，Kamada–Kawai）、`fdp`（力導向）、`sfdp`（多尺度
力導向，適用於大型圖）、`circo`（環狀）、`twopi`（放射狀）、
`osage`（叢集式）與 `patchwork`（方形化樹狀圖）。請參閱
[版面配置引擎](/zh-tw/guide/engines)。

## 參照程式（Oracle） {#oracle}

原生 C 版 Graphviz 的 `dot` 二進位檔，由標準 C 原始碼建置而成，
@knowvah/dot-engine 的每一次轉譯結果都以它為準進行驗證。@knowvah/dot-engine 直接啟動這個
二進位檔（絕不使用 WASM 建置版），以避免參照程式與移植版之間的
ABI 漂移。參照程式的比對如何執行與回報，請參閱[一致性](/zh-tw/conformance)與
[對齊度](/parity)。

## 階層／rankdir（Rank / rankdir） {#rank-rankdir}

在 `dot` 的階層式版面配置中，**階層（rank）** 是在繪圖中置於
相同深度的一層節點。`rankdir` 設定階層延伸的方向——
預設為 `TB`（由上到下），或 `LR`、`BT`、`RL`——以圖屬性方式設定
（`b.setAttr('rankdir', 'LR')`）。請參閱[以程式碼建構圖](/zh-tw/guide/build-a-graph)。

## 樣條／邊繞線（Spline / edge routing） {#spline-edge-routing}

邊所沿著繪製的曲線（Bézier）路徑，由會繞開節點與叢集障礙物的
繞線程式碼計算而得。@knowvah/dot-engine 透過 `getLayout` 以
`EdgeGeometry.points` 提供繞線後的控制點——這是由 `{x, y}` 點組成的
有序陣列，單位為點（points）。請參閱
[讀取計算出的幾何資訊](/zh-tw/guide/geometry)。

## 文字量測器（Text measurer） {#text-measurer}

可注入的替換點（`TextMeasurer`），負責回報標籤的寬度／高度，
讓節點與邊標籤的尺寸能在版面配置前先行確定。
@knowvah/dot-engine 在每次轉譯時會自動決定一個量測器——先看是否有明確指定的
`setTextMeasurer`，其次是瀏覽器的 `<canvas>`（若可用），再其次是在 Node 中
內建的確定性 `EstimateTextMeasurer`——或接受自訂的實作。請參閱
[文字量測](/zh-tw/guide/text-measurement)。

## Usershape {#usershape}

Graphviz 用來稱呼這種節點的術語：其形狀是外部提供的圖片
（透過 `image` 屬性），而不是繪製出來的多邊形或橢圓。
@knowvah/dot-engine 透過可注入的圖片尺寸取得器／解析器替換點來處理 usershape，
而不是直接讀取檔案，以維持函式庫可在瀏覽器中安全執行。
請參閱[圖片](/zh-tw/guide/images)。

## xdot {#xdot}

延伸版 DOT 的繪製操作格式：一串結構化的操作（設定
填滿／筆畫顏色、設定字型、填滿／描繪橢圓或多邊形、繪製
Bézier 曲線、繪製文字），依繪製順序精確描述轉譯後的圖該如何
繪製。`getDrawOps` 會把這串操作以具型別的 `XdotOp`
值回傳，讓您不必解析 SVG 就能驅動自訂的轉譯器（canvas、WebGL、PDF）。
請參閱[以 xdot 繪製操作自訂轉譯](/zh-tw/guide/xdot-drawops)。
