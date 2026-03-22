# ASTR Reward Tax Calculator 設計書

## 1. プロジェクト概要

- プロジェクト名: ASTR Reward Tax Calculator
- 目的: Astar Network の Claim リワードを税務整理向けに記録、換算、集計、可視化する
- 実行環境: モダンブラウザ
- 派生構成: src4win 配下に Windows ネイティブアプリ向け画面資産を保持
- バージョン: 1.8.1
- ビルダー: tksarah

## 2. 技術構成

### 2.1 採用技術

- HTML5
- CSS3
- Vanilla JavaScript
- Bootstrap 5
- Chart.js
- html2canvas
- jsPDF
- LocalStorage API

### 2.2 実装方針

- サーバーレスなクライアントサイドアプリとして構築
- 状態管理、計算、描画、入出力は ASTRRewardCalculator クラスへ集約
- データ更新後は render() で集計カード、履歴、グラフを再描画
- テーマ変更時は Chart.js インスタンスを再生成
- Web 版と src4win 版は基本仕様を揃え、必要差分のみ分岐させる

## 3. 画面構成

### 3.1 左カラム

- リワード情報入力カード
- データ操作ボタン群

入力カードの項目:

- 日付
- Claim 量（ASTR）
- カテゴリー
- 為替レート（JPY/USD）
- ASTR レート（USD/ASTR）
- トランザクションFee（ASTR）
- メモ

入力ルール:

- Fee は初期値 0
- Fee 未入力時も 0 扱い
- メモは最大 15 文字
- カテゴリーは 取引所 / その他 / dAppStaking の固定選択

左カラムのアクション:

- CSV エクスポート
- JSON エクスポート
- PDF エクスポート
- レポート出力
- JSON インポート
- データ削除（確認あり）

src4win 差分:

- レポート出力ボタンを表示しない

### 3.2 右カラム

- 集計結果カード
- 月別集計グラフカード
- Claim 履歴カード

### 3.3 フッター

- Builder 表示
- Version 表示
- 免責事項表示

### 3.4 モーダル

- レポート補足情報モーダル

入力項目:

- ウォレットアドレス
- ウォレット名
- メモ

## 4. 機能要件

### 4.1 入力機能

- 新規追加
- 編集時のフォーム復元
- Fee の 0 補完
- メモのトリムと 15 文字制限
- カテゴリーの正規化
- 日付単位の参考レート取得

### 4.2 データ管理機能

- 個別削除
- 全件削除
- LocalStorage 自動保存
- JSON インポート
- 重複 ID スキップ
- 古いデータの後方互換補正

後方互換補正内容:

- category が無い場合は dAppStaking
- fee が無い場合は 0
- memo が無い場合は空文字

### 4.3 集計機能

- Claim回数
- 合計ASTR量
- 合計Fee（ASTR / JPY）
- 合計リワード（USD / JPY）
- 加重平均取得ASTR単価（USD / JPY）
- カテゴリー別 合計リワード（JPY）
- 最終損益額（JPY）

カテゴリー別集計キー:

- 取引所
- その他
- dAppStaking

### 4.4 Claim 履歴機能

- 台帳型 1 レコード 1 行表示
- カテゴリーバッジ表示
- メモの補助テキスト表示
- ASTR量の K / M 省略表示
- 日付、カテゴリー、ASTR量、USD、JPY ソート
- 1 ページ 5 件のページング
- 編集、削除
- 簡易表示、詳細表示 切替

表示モード仕様:

- 初期状態は簡易表示
- 簡易表示では レート 列と USD 列を非表示
- 詳細表示では レート 列と USD 列を表示
- 簡易表示へ戻る際、rewardUSD ソート中なら rewardJPY 降順へ戻す

ASTR量の省略表示仕様:

- 1,000 以上は K 表記
- 1,000,000 以上は M 表記
- 1 桁の小数を許容して丸める
- Claim 履歴上のみ適用し、集計値やレポートには適用しない

### 4.5 グラフ機能

- 月別合計リワード額（JPY）の棒グラフ
- データ更新時の再描画
- テーマ追従

### 4.6 出力機能

- CSV エクスポート
- JSON エクスポート
- PDF エクスポート
- 印刷用レポート出力

CSV:

- 一覧データと集計データを同時出力
- カテゴリー列を含む
- UTF-8 BOM 付き

JSON:

- exportDate
- appVersion
- entries
- totals

PDF:

- html2canvas でレンダリング
- jsPDF で A4 縦に分割配置
- レポート補足情報を含められる

印刷用レポート:

- 新規タブに印刷向け HTML を生成
- ブラウザ印刷から PDF 保存可能

## 5. データモデル

### 5.1 Entry

```json
{
  "id": "id_1710000000000_xxxxx",
  "date": "2025-03-08",
  "category": "dAppStaking",
  "astrAmount": 50.12345678,
  "exchangeRate": 150.5,
  "astrPrice": 0.1234,
  "fee": 0.5,
  "memo": "定期分",
  "createdAt": "2025-03-08T00:00:00.000Z",
  "updatedAt": "2025-03-08T00:00:00.000Z"
}
```

### 5.2 LocalStorage キー

- astr_reward_data
- astr_theme
- astr_report_metadata

### 5.3 レポート補足情報

```json
{
  "walletAddress": "0x...",
  "walletName": "Main Wallet",
  "memo": "申告用補足"
}
```

## 6. 計算仕様

### 6.1 エントリ単位

```text
rewardUSD = astrAmount × astrPrice
rewardJPY = rewardUSD × exchangeRate
feeUSD    = fee × astrPrice
feeJPY    = feeUSD × exchangeRate
profitUSD = (astrAmount - fee) × astrPrice
profitJPY = profitUSD × exchangeRate
```

### 6.2 全体集計

```text
totalCount     = エントリ件数
totalAstr      = Σ astrAmount
totalFee       = Σ fee
totalFeeJPY    = Σ feeJPY
totalRewardUSD = Σ rewardUSD
totalRewardJPY = Σ rewardJPY
avgAstrUsd     = totalRewardUSD ÷ totalAstr
avgAstrJpy     = totalRewardJPY ÷ totalAstr
netProfitJPY   = totalRewardJPY - totalFeeJPY
```

### 6.3 カテゴリー別集計

```text
categoryRewardJPYTotals[取引所]      = Σ rewardJPY
categoryRewardJPYTotals[その他]      = Σ rewardJPY
categoryRewardJPYTotals[dAppStaking] = Σ rewardJPY
```

### 6.4 月別集計

- キーは YYYY-MM
- 月別に totalRewardJPY と totalFeeJPY を累積
- グラフ表示には totalRewardJPY を使用

## 7. イベントフロー

### 7.1 初期表示

1. LocalStorage からデータを読み込む
2. エントリを normalizeEntry で正規化する
3. 当日日付をフォームへ設定する
4. イベントリスナーを登録する
5. ツールチップを初期化する
6. ソート状態を初期化する
7. テーマを読み込む
8. render() を実行する

### 7.2 追加 / 更新

1. フォーム値を取得する
2. 必須項目と数値範囲を検証する
3. memo を正規化する
4. editingId の有無で追加 / 更新を分岐する
5. LocalStorage に保存する
6. フォームを初期化する
7. 集計、履歴、グラフを再描画する
8. 通知を表示する

### 7.3 参考レート取得

1. 日付入力を確認する
2. ボタンをローディング状態にする
3. CoinGecko へ ASTR/USD を問い合わせる
4. Frankfurter へ USD/JPY を問い合わせる
5. 成功した項目だけ入力欄へ反映する
6. 完全成功、部分成功、失敗を通知する
7. ボタン状態を戻す

### 7.4 Claim 履歴表示切替

1. 詳細表示トグルを押す
2. historyDetailMode を反転する
3. 必要に応じてソート列を補正する
4. テーブルを再描画する

### 7.5 JSON インポート

1. JSON ファイルを読み込む
2. 配列または entries 配列を抽出する
3. normalizeEntry で後方互換補正する
4. 既存 ID と重複しないデータのみ追加する
5. 保存と再描画を行う
6. 結果を通知する

### 7.6 レポート出力

1. データ有無を確認する
2. 補足情報モーダルを表示する
3. レポート用データを組み立てる
4. 月別グラフを画像化する
5. 表紙と詳細ページを含む印刷用 HTML を生成する
6. 新規タブを開く

### 7.7 PDF エクスポート

1. データ有無を確認する
2. 補足情報モーダルを表示する
3. 画面外コンテナへレポート DOM を組み立てる
4. html2canvas でキャプチャする
5. jsPDF で A4 ページへ分割配置する
6. PDF を保存する
7. 一時 DOM を破棄する

### 7.8 テーマ切替

1. data-theme を切り替える
2. トグルボタン文言を更新する
3. テーマを保存する
4. チャートを破棄して再描画する

## 8. UI / UX 方針

- Claim 履歴はカード風の台帳レイアウト
- 情報密度を高めつつ、簡易表示を既定にして横スクロールを抑制
- カテゴリーはバッジで識別しやすくする
- メモは主情報を邪魔しない補助テキストとして表示する
- 集計結果カードでは最終損益額を最も強い視覚階層に置く
- ダークモードでは数値と入力欄の視認性を優先する

## 9. ファイル構成

```text
ASTR_Reward_Calculator/
├─ index.html
├─ css/style.css
├─ img/
├─ js/app.js
├─ README.md
├─ design_document.md
├─ test_data_35.json
├─ sample_data_categories_v1_8_1.json
├─ sample_data_memo_2025_48.json
├─ sample_data_memo_mixed_2025_48.json
└─ src4win/
   ├─ index.html
   ├─ css/style.css
   ├─ img/
   └─ js/app.js
```

## 10. 既知の設計上の特徴

- app.js は単一ファイル構成であり、責務分割余地がある
- CoinGecko はレート制限の影響を受けうる
- CSV は互換性重視で BOM 付き出力を採用している
- Web 版と src4win 版は同期維持のコストがある
- Claim 履歴の K / M 表示は一覧性優先のため、精密表示ではない

## 11. 今後の拡張候補

- 期間フィルタ
- カテゴリー別フィルタ
- 年別 / 月別の詳細集計
- 追加統計の導入
- レート取得元の切替設定
- 設定画面の独立# ASTR Reward Tax Calculator 設計書

## 1. プロジェクト概要

- プロジェクト名: ASTR Reward Tax Calculator
- 目的: Astar Network の dApp Staking リワードを記録し、税務整理向けに集計・可視化する
- 実行環境: ブラウザ
- 派生ソース: Windows ネイティブアプリ向け画面資産を src4win 配下に保持
- バージョン: 1.8.1
- ビルダー: tksarah

## 2. 実装アーキテクチャ

### 2.1 採用技術

- HTML5
- CSS3
- Vanilla JavaScript（クラスベース）
- Bootstrap 5
- Chart.js
- LocalStorage API

### 2.2 実装方針

- サーバーレスで完結するクライアントサイドアプリ
- 1 クラス `ASTRRewardCalculator` に状態管理・計算・描画を集約
- データ更新後は `render()` で集計・表・グラフを再描画
- テーマ変更時はチャートを再生成して表示崩れを回避
- Windows ネイティブアプリ向け画面資産は Web 版をベースにしつつ、レポート出力導線を除いた派生構成とする

## 3. 現在の機能要件

### 3.1 入力機能

- 日付入力
- 日付入力後の参考レート取得ボタン
- Claim 量（ASTR）入力
- 為替レート（JPY/USD）入力
- ASTR レート（USD/ASTR）入力
- トランザクション Fee（ASTR）入力
- メモ入力（全角15文字まで）

トランザクション Fee（ASTR）は初期値 0、未入力時も 0 として扱う。

### 3.2 データ管理機能

- 新規追加
- 編集
- 個別削除
- 全件削除（確認ダイアログ付き）
- LocalStorage への自動保存
- JSON インポート時の重複 ID スキップ

### 3.3 表示機能

- 集計サマリー表示
- 加重平均取得ASTR単価（USD / JPY）表示
- Claim 履歴テーブル表示
- テーブルソート
- 1ページ 5 件のページング
- 月別合計リワード額（JPY）の棒グラフ

### 3.4 出力機能

- CSV エクスポート
- JSON エクスポート
- PDF エクスポート
- 印刷用レポート出力

### 3.6 Windows ネイティブアプリ向け派生仕様

- src4win 配下に Windows ネイティブアプリ向けの画面資産を配置
- ベースは Web 版と同一 UI / UX
- レポート出力ボタンと印刷用レポート導線は除外
- それ以外の入力、集計、CSV / JSON / PDF、インポート、テーマ切り替え、参考レート取得を継承

### 3.5 UI 機能

- ライトモード / ダークモード切り替え
- テーマ設定の保存
- Bootstrap アラートによる通知表示
- レスポンシブレイアウト
- フッターへの Builder / Version / 免責事項表示
- 参考レート取得中のボタン無効化と状態表示

## 4. 画面構成

### 4.1 左カラム

- リワード入力フォーム
- CSV / JSON / PDF / レポート出力ボタン
- JSON インポートボタン
- 全データ削除ボタン

※ src4win では「レポート出力」ボタンを表示しない。

### 4.2 右カラム

- 集計結果カード
- 月別集計グラフカード
- Claim 履歴テーブル
- ページング

### 4.3 フッター

- Builder 表示
- Version 表示
- 免責事項表示

### 4.4 通知表示

- 画面右上にアラートを表示
- 成功 / 警告 / エラー / 情報の各種メッセージに対応

## 5. データ構造

### 5.1 Entry

```json
{
  "id": "id_1710000000000_xxxxx",
  "date": "2026-03-07",
  "astrAmount": 50.12345678,
  "exchangeRate": 150.5,
  "astrPrice": 0.1234,
  "fee": 0.5,
  "createdAt": "2026-03-07T00:00:00.000Z",
  "updatedAt": "2026-03-07T00:00:00.000Z"
}
```

### 5.2 LocalStorage キー

- `astr_reward_data`
- `astr_theme`

## 6. 計算仕様

### 6.1 エントリ単位

```text
rewardUSD = astrAmount × astrPrice
rewardJPY = rewardUSD × exchangeRate
feeUSD    = fee × astrPrice
feeJPY    = feeUSD × exchangeRate
profitUSD = (astrAmount - fee) × astrPrice
profitJPY = profitUSD × exchangeRate
```

### 6.2 全体集計

```text
totalCount     = エントリ件数
totalAstr      = Σ astrAmount
totalFee       = Σ fee
totalFeeJPY    = Σ feeJPY
totalRewardUSD = Σ rewardUSD
totalRewardJPY = Σ rewardJPY
weightedAverageAstrPriceUsd = totalRewardUSD ÷ totalAstr
weightedAverageAstrPriceJpy = totalRewardJPY ÷ totalAstr
netProfitJPY   = totalRewardJPY - totalFeeJPY
```

### 6.3 月別集計

- キーは `YYYY-MM`
- 月別に `totalRewardJPY` と `totalFeeJPY` を累積
- グラフは `totalRewardJPY` を棒グラフで表示

## 7. イベントフロー

### 7.1 初期表示

1. LocalStorage からデータ読込
2. 当日の日付をフォームへ設定
3. イベントリスナー登録
4. ソート状態初期化
5. テーマ読込
6. 集計・表・グラフ描画

### 7.2 追加・編集

1. フォーム検証
2. データ追加または更新
3. LocalStorage 保存
4. UI 再描画
5. 通知表示

### 7.3 参考レート取得導線

1. 日付入力を確認
2. 参考レート取得ボタンを押下
3. CoinGecko から ASTR/USD を取得
4. Frankfurter から USD/JPY を取得
5. 取得成功した入力欄を自動更新
6. 成功 / 部分成功 / 失敗を通知表示

### 7.4 全件削除

1. 削除確認ダイアログを表示
2. データ配列を空にする
3. LocalStorage 保存
4. 集計・表・グラフを再描画
5. 情報通知を表示

### 7.5 レポート出力

1. 保存済みデータの有無を確認
2. 補足情報入力モーダルを表示
3. ウォレットアドレス、ウォレット名、メモを任意で受け取る
4. 集計結果、月別データ、全 Claim 履歴を組み立て
5. 現在の月別グラフを画像化して埋め込む
6. 1 ページ目を表紙、2 ページ目以降をグラフと履歴の構成で印刷向け HTML を生成
7. ブラウザの印刷機能から PDF 保存できる状態にする

### 7.6 PDF エクスポート

1. 保存済みデータの有無を確認
2. 補足情報入力モーダルを表示
3. レポート内容を画面外 DOM として組み立てる
4. html2canvas でレポート全体を画像化する
5. jsPDF で A4 縦向きの PDF に分割配置し、1 ページ目を表紙、2 ページ目以降へグラフと履歴を載せる
6. PDF ファイルを直接ダウンロードする

### 7.7 テーマ切替

1. `data-theme` を更新
2. ボタン文言を更新
3. テーマを保存
4. チャートを破棄して再描画

## 8. 既知の設計上の特徴

- `app.js` は単一ファイル構成で、規模拡大時は責務分割の余地がある
- Chart.js の再描画安定性のため、テーマ切替時にチャートインスタンスを作り直す
- CSV は一覧と集計の両方を含むエクスポート形式を採用しており、UTF-8 BOM 付きで出力する
- レポート出力はブラウザ印刷を前提に A4 縦向けレイアウトを採用している
- 直近のレポート補足情報は LocalStorage に保持し、次回のレポート出力時に初期値として再利用する
- PDF エクスポートは html2canvas と jsPDF を使い、ブラウザ印刷に依存せずに保存できる
- 月別集計一覧はレポートに含めず、月別集計グラフと Claim 履歴一覧を 2 ページ目以降へ配置する
- src4win は Windows ネイティブアプリ組み込み用の画面資産で、Web 版の派生物として管理する

## 9. 今後の拡張候補

- 期間フィルタ
- 年別集計
- 追加統計の表示
- 設定画面の分離
- レート取得元や取得時刻の保存
