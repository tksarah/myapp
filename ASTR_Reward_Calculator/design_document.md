# ASTR Reward Tax Calculator 設計書

## 1. プロジェクト概要

- プロジェクト名: ASTR Reward Tax Calculator
- 目的: Astar Network の dApp Staking リワードを記録し、税務整理向けに集計・可視化する
- 実行環境: ブラウザのみ
- バージョン: 1.5.0
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

## 3. 現在の機能要件

### 3.1 入力機能

- 日付入力
- 日付入力後の参考レート取得ボタン
- Claim 量（ASTR）入力
- 為替レート（JPY/USD）入力
- ASTR レート（USD/ASTR）入力
- トランザクション Fee（ASTR）入力

### 3.2 データ管理機能

- 新規追加
- 編集
- 個別削除
- 全件削除（確認ダイアログ付き）
- LocalStorage への自動保存
- JSON インポート時の重複 ID スキップ

### 3.3 表示機能

- 集計サマリー表示
- Claim 履歴テーブル表示
- テーブルソート
- 1ページ 5 件のページング
- 月別合計リワード額（JPY）の棒グラフ

### 3.4 出力機能

- CSV エクスポート
- JSON エクスポート
- PDF エクスポート
- 印刷用レポート出力

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
6. 印刷向け HTML を新しいタブに生成
7. ブラウザの印刷機能から PDF 保存できる状態にする

### 7.6 PDF エクスポート

1. 保存済みデータの有無を確認
2. 補足情報入力モーダルを表示
3. レポート内容を画面外 DOM として組み立てる
4. html2canvas でレポート全体を画像化する
5. jsPDF で A4 縦向きの PDF に分割配置する
6. PDF ファイルを直接ダウンロードする

### 7.7 テーマ切替

1. `data-theme` を更新
2. ボタン文言を更新
3. テーマを保存
4. チャートを破棄して再描画

## 8. 既知の設計上の特徴

- `app.js` は単一ファイル構成で、規模拡大時は責務分割の余地がある
- Chart.js の再描画安定性のため、テーマ切替時にチャートインスタンスを作り直す
- CSV は一覧と集計の両方を含むエクスポート形式を採用している
- レポート出力はブラウザ印刷を前提に A4 縦向けレイアウトを採用している
- 直近のレポート補足情報は LocalStorage に保持し、次回のレポート出力時に初期値として再利用する
- PDF エクスポートは html2canvas と jsPDF を使い、ブラウザ印刷に依存せずに保存できる

## 9. 今後の拡張候補

- 期間フィルタ
- 年別集計
- 追加統計の表示
- 設定画面の分離
- レート取得元や取得時刻の保存
