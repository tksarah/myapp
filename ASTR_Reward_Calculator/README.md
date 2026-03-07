# ASTR Reward Tax Calculator

ASTR Reward Tax Calculator は、Astar Network の dApp Staking で獲得したリワードを記録し、円換算・集計・バックアップをブラウザだけで完結できるツールです。

## 概要

- ブラウザのみで動作し、サーバーにデータを送信しません
- LocalStorage にデータとテーマ設定を自動保存します
- リワードの USD / JPY 換算、Fee の JPY 換算、最終損益額を自動計算します
- 月別の合計リワード額（JPY）を棒グラフで確認できます

## 現在の仕様

- バージョン: 1.0.0
- ビルダー: tksarah
- 実装方式: HTML / CSS / Vanilla JavaScript
- UI: Bootstrap 5
- グラフ: Chart.js

## 主な機能

- リワード記録の追加・編集・削除
- 全データ削除（確認ダイアログ付き）
- 日付 / ASTR量 / USD / JPY の列ソート
- 1ページ 5 件のページング表示
- 日付入力後の参考レート自動取得
- CSV エクスポート
- JSON エクスポート
- JSON インポート
- ダークモード / ライトモード切り替え
- 月別合計リワード額（JPY）の棒グラフ表示
- Builder / Version を含むフッター表示
- 画面右上通知による操作結果フィードバック

## 起動方法

### Python で起動

```bash
cd c:\Users\sarah\Documents\myapp\ASTR_Reward_Calculator
python -m http.server 8000
```

ブラウザまたは VS Code のブラウザで以下を開きます。

```text
http://localhost:8000
```

### Node.js の http-server を使う場合

```bash
npm install -g http-server
cd c:\Users\sarah\Documents\myapp\ASTR_Reward_Calculator
http-server -p 8000
```

## 使い方

### 1. リワード情報を入力

- 日付
- Claim 量（ASTR）
- 為替レート（JPY/USD）
- ASTR レート（USD/ASTR）
- トランザクション Fee（ASTR）

日付の下には「その日の参考レートを取得」ボタンがあります。
押すと参考値として ASTR/USD と USD/JPY を取得し、入力欄へ自動反映します。
取得後も手入力で自由に上書きできます。

入力後に 追加 を押すと、1 件のエントリが保存されます。

### 2. 集計結果を確認

右側の集計カードに以下が表示されます。

- Claim回数
- 合計ASTR量
- 合計Fee（ASTR）
- 合計Fee（JPY）
- 合計リワード（USD）
- 合計リワード（JPY）
- 最終損益額（JPY）

最終損益額（JPY）は、次の式で計算されます。

```text
総リワード（JPY） - 総Fee（JPY）
```

### 3. 月別グラフを確認

- 月別の合計リワード額（JPY）を棒グラフで表示します
- データ追加・削除・インポート後に自動更新されます
- テーマ切り替え時にも配色が追従します

### 4. Claim 履歴を管理

- 編集: 既存データをフォームへ戻して更新
- 削除: 対象データを 1 件削除
- ソート: テーブルヘッダーをクリック
- ページング: 6 件以上で自動表示

### 5. データを入出力

- CSV エクスポート: 一覧と集計値を CSV として保存
- JSON エクスポート: バックアップ用 JSON を保存
- JSON インポート: エクスポート済み JSON を取り込み
- 全データ削除: 確認ダイアログの後に LocalStorage を含めてクリア

JSON インポートは、次の 2 形式に対応しています。

- エントリ配列そのもの
- `entries` 配列を持つオブジェクト

重複 ID のデータはスキップされます。

### 6. フッター表示

- Builder: tksarah
- Version: 1.0.0
- 免責事項を常時表示

### 7. テーマ切り替え

- 右上のボタンでライト / ダークを切り替え
- 選択したテーマはブラウザに保存されます

## 参考レート取得

- ASTR/USD: CoinGecko の日次ヒストリカル価格を参照
- USD/JPY: Frankfurter の日次為替レートを参照
- 取得失敗時は手入力へ戻れるため、既存フローは維持されます
- 取得値は参考値なので、必要に応じてユーザーが修正可能です

## 計算ロジック

各エントリでは以下を計算します。

```text
rewardUSD = astrAmount × astrPrice
rewardJPY = rewardUSD × exchangeRate
feeUSD    = fee × astrPrice
feeJPY    = feeUSD × exchangeRate
profitUSD = (astrAmount - fee) × astrPrice
profitJPY = profitUSD × exchangeRate
```

## データ保存

- リワードデータ: LocalStorage の `astr_reward_data`
- テーマ設定: LocalStorage の `astr_theme`

ブラウザのストレージを削除するとデータは失われます。必要に応じて JSON エクスポートでバックアップしてください。

## 操作時の表示

- 追加 / 更新 / 削除 / インポート / エクスポート時に通知を表示
- エラー時は警告メッセージを表示

## 対応ブラウザ

- Chrome
- Edge
- Firefox
- Safari

いずれも比較的新しいバージョンを想定しています。

## ファイル構成

```text
ASTR_Reward_Calculator/
├─ index.html
├─ css/
│  └─ style.css
├─ js/
│  └─ app.js
├─ README.md
├─ design_document.md
└─ test_data_35.json
```

## 免責事項

このツールは参考情報です。確定申告や税務判断の前に、必ず税理士または税務署へ確認してください。
