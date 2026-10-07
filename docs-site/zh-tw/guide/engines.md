---
sourceHash: 616f97a2fa8ffcabcf858e44e35372f1ed973566855990ca52be0169f39c9cb1
---
# 版面配置引擎

Graphviz 的八種版面配置引擎全部已註冊。請將引擎名稱作為第二個引數傳給
`renderSvg`：

```ts
renderSvg(dot, 'neato');
```

| 引擎       | 版面配置風格                                  |
|--------------|-----------------------------------------------|
| `dot`        | 階層式／分層的有向圖        |
| `neato`      | 彈簧模型（Kamada–Kawai）                   |
| `fdp`        | 力導向                                |
| `sfdp`       | 多尺度力導向（大型圖）      |
| `circo`      | 環狀                                       |
| `twopi`      | 放射狀                                        |
| `osage`      | 叢集式                                    |
| `patchwork`  | 方形化樹狀圖（squarified treemap）                            |

## 擬真度說明 {#fidelity-note}

引擎分為兩個一致性類別（精確定義與比對程式碼請參閱[一致性](/zh-tw/conformance)）：

- **確定性**——`dot`、`circo`、`twopi`、`osage`、`patchwork`。皆須達到
  同一個 **±0.01** 的標準：在黃金語料庫上，數值座標與路徑與原生
  C 二進位檔的差異在 ±0.01pt 之內，且所有非數值內容（標籤、顏色、文字）
  完全相同。
- **迭代式**——`neato`、`fdp`、`sfdp`。這些力導向／多尺度求解器
  取決於浮點數的捨入順序，因此以較寬鬆的 **±0.5**pt 界限檢查，
  並檢查結構（元素樹相同）是否一致，
  而不要求嚴格的數值相等。

這兩個標準都不是在宣稱 SVG 輸出逐位元組相同。各引擎目前的通過
數量與已接受的差異，請參閱[對齊度](/parity)（附有各引擎的
詳細頁面）與[已知差異](/zh-tw/divergences)。

## 試試不同的引擎 {#try-different-engines}

在「版面配置引擎」下拉式選單中切換，即可比較同一張圖的不同版面配置：

<Playground
  height="380px"
  :initial="`graph {\n  a -- b; a -- c; a -- d;\n  b -- c; c -- d; d -- b;\n  b -- e; c -- f;\n}`"
  engine="neato"
/>
