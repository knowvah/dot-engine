---
sourceHash: 9c653332a94ce7180323ec7cd584987db329e4217af01dd06692e410c0c22a8c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# 適合性：「一致」の意味 {#conformance-what-match-means}

@knowvah/dot-engine は、正規の C 版 Graphviz バイナリをオラクルとして検証されています。
このプロジェクトが、あるグラフが C と**一致**する — パリティ判定名 `conformant` — と述べるとき、
それが意味するのは、機械的に検査される特定の性質であり、SVG テキストの**バイト単位での完全一致ではありません**。

> **定義。** あるポートのレンダリング結果がオラクルのレンダリング結果に**適合**する
> (conformant) とは、両方の SVG を正規化された要素ツリーにパースしたうえで、次の条件を満たすことをいいます。
>
> 1. すべての**数値**（座標、パスデータ、`points`、`viewBox`、
>    `transform` のパラメーター）がオラクルと、固定の**許容誤差**の範囲内で一致する。かつ
> 2. すべての**非数値**（タグ名、色、テキスト内容、属性キー、
>    列挙型の属性値）が**完全に等しい**。
>
> いずれかの数値が許容誤差を超えるか、いずれかの非数値が異なる場合、
> そのレンダリングは適合**していません**。

## なぜバイト単位の一致ではないのか {#why-not-literal-bytes}

SVG は浮動小数点の座標を 10 進テキストとして直列化します。数学的には等価な 2 つのレンダリング結果でも、
IEEE-754 の丸め、浮動小数点演算の順序、そして CPU や JS エンジンによって異なるプラットフォーム依存の
`libm`/FMA の挙動により、最後に出力される桁が異なることがあります。したがって、バイト単位の一致を基準にすると、
厳しすぎるというだけでなく、このライブラリが対象とするランタイム（ブラウザー、Node、さまざまな CPU）をまたいで
**検証不可能**になります。適合性は、本当に重要な性質 — 見る人に見えるジオメトリと内容 — を、
知覚できないほど小さな範囲に固定します。

## 正確な許容誤差 {#the-exact-tolerance}

許容誤差は**エンジンクラスごと**に、
[`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts)
で定義されています。

| クラス | 許容誤差 (pt) | エンジン |
|---|---:|---|
| `deterministic` | **±0.01** | `dot`, `circo`, `twopi`, `osage`, `patchwork` |
| `iterative` | **±0.5** | `neato`, `fdp`, `sfdp` |

決定的エンジンは C の整数／出力座標をほぼ正確に再現するため、±0.01 は 10 進表記のノイズを吸収するだけです。
反復型（力指向）エンジンは、最下位ビットの結果がプラットフォーム間で再現できない超越関数に依存するため、
より緩い境界を持ち、加えて**構造**の一致（同じ要素ツリーであること）も検査されます。

**plain/plain-ext** 出力についての注意点が 1 つあります。plain は座標をインチ単位、有効数字 5 桁
(`%.5g`) で出力するため、大きさが 100 以上では出力の量子 (0.01) が ±0.01 の許容誤差と等しくなります。
非常に大きなグラフでは、5 桁目の丸め境界をまたいでしまうサブ ULP のレイアウト差が 0.01 の完全な 1 ステップとして
出力され、フラグが立てられます。下層のジオメトリは約 1e-11 pt の範囲で同一であるにもかかわらずです
（circo の `2108` の受け入れ、ジャーナル 2026-07-28 を参照）。ポイント単位で出力する xdot/json 出力が、
この領域における権威あるジオメトリ比較です。

**コーパスのパリティ調査**は、エンジンにかかわらずすべてのグラフを `deterministic` モード
(±0.01) で評価します。
[`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
（`diffVerdict` → `compareSvg(port, oracle, 'deterministic')`）を参照してください。

## コードを読む {#read-the-code}

上記の定義は、理想を述べた文章ではありません。比較コードが実際に行っていることそのものです。
自分で確かめるには、次を参照してください。

- [`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts)
  — `TOLERANCES`（±0.01 / ±0.5 の表）と `compareSvg`。後者は 2 つの正規化済みツリーをたどり、
  規則 (1) の数値は許容誤差内、規則 (2) の非数値は完全一致を、属性ごとに適用します。
- [`test/golden/normalize.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/normalize.ts)
  — 生の SVG を比較可能な要素ツリーにパースする方法。
- [`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
  — 後述の判定のいずれかを割り当てる `diffVerdict`。`survey.ts` がカバーするのは
  `dot` の SVG トラックのみです。
- [`test/corpus/engine-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/engine-walk.ts)
  — エンジン別の **xdot** 調査 (`npx tsx test/corpus/engine-walk.ts <engine>`)。
  上の表と同じクラス分け（`neato`/`fdp`/`sfdp` は `TOLERANCE = 0.5`、それ以外のすべてのエンジンは `0.01`）を適用し、
  SVG ではなく意味的な描画オペレーションのストリーム (`compareXdot`) を比較します。
  `circo`/`twopi`/`osage`/`patchwork`/`neato`/`fdp`/`sfdp` のトラックはこのように測定されます。
  `dot` 自身の xdot トラックは、姉妹ファイルの
  [`xdot-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/xdot-walk.ts) を使います。

## 判定 {#the-verdicts}

調査は各グラフにちょうど 1 つの判定を割り当てます。トラックごとの最新の件数は次を参照してください。
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)
は、エンジン × 出力のすべてのトラック（決定的・反復型を問わず）を集計します。
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
は `dot` の SVG ダッシュボードで、ほかの各エンジンにも `test/corpus/` 内にその隣に
専用の `PARITY-<engine>.md` ダッシュボードがあります。

| 判定 | 意味 |
|---|---|
| **`conformant`** | 上記の定義に従ってオラクルと一致する（数値は許容誤差内、非数値は完全一致）。 |
| **`structural-match`** | 要素ツリーは同じだが、1 つ以上の数値が許容誤差を超える。 |
| **`diverged`** | 要素ツリーが異なる（要素の欠落／余分、または非数値の不一致）。 |
| **`errored` / `timeout`** | ポートが入力のレンダリングに失敗した（`errored`。エンジン別トラックでは `port-error`）、または時間予算を超過した（`timeout`）。失敗として採点され、合格率の分母に含まれ、合格として数えられることはありません。 |
| **`oracle-error`** | C のオラクルが入力のレンダリングに失敗したため、比較対象となる基準がない。対象外であり、合格率の分母から除外されます。 |

すべてのダッシュボードの**合格率**は `conformant / (surveyed − oracle-error)` です。

「Conformant」が基準です。「structural-match」は意味のある進捗（形は正しく、座標がまだずれている）です。
「diverged」、「errored」、「timeout」は本物のギャップです。
これらのいずれも、バイト単位で一致した出力であるという主張ではありません。

あるエンジンでは、**判定がまったくない**グラフもあります。後述の*エンジン除外*を参照してください。

### エンジン除外 {#engine-exclusions}

除外された `(graph, engine)` の組はウォークされないため、適合でも差異でもありません — そこでは単に測定されないだけです。
これは、比較が*実際に行われ*、差異が文書化された原因とともに許容される「受け入れ済みの差異」とは異なります。

基準は意図的に高く設定されています。未検査のグラフは既知のコストではなくカバレッジの穴だからです。
エントリーには次の 3 つすべてが必要です。エンジンのアルゴリズムが入力に対して作動しえないことが証明されていること、
スキップによって実際に時間が節約されること、そして同じ挙動がより安価なトラックで検証されていること。
*遅い*ことは明示的に十分条件ではありません — ポートとオラクルの比が悪いことは、まさに本物の性能欠陥の
現れ方であり、それを理由に除外すれば、コーパスが存在する目的そのものを隠してしまいます。

すべての除外は、そのメカニズムとともに
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md#engine-exclusions)
に列挙されています。レジストリは `test/corpus/engine-exclusions.json` です。きっかけとなった事例は
`2222` で、28,303 個のノードを宣言しながらエッジがありません。関連づける対象がないため、
すべての力指向エンジンと放射状エンジンは共有のコンポーネントパッカーに処理を委譲し、
それぞれ独自のアルゴリズムは何も実行されません — これは、それらのオラクル出力がバイト単位で同一であることで確認されています。
`dot` は別の経路をたどり、6 秒でこれを適合のままカバーします。
