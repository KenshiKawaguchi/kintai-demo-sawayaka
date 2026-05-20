# 勤怠管理デモ

Webブラウザで動作する勤怠打刻画面のデモアプリです。実店舗の勤怠端末を参考にしつつ、PC、タブレット、スマートフォンで操作できるレスポンシブUIとして実装しています。

公開URL:

https://kintai-demo-sawayaka.vercel.app

## 使用技術

| 分類 | 技術 |
| --- | --- |
| 言語 | TypeScript |
| フレームワーク | Next.js 16 App Router |
| UI | React 19 |
| スタイリング | Tailwind CSS 4 |
| 状態管理 | React `useReducer` |
| 保存方式 | `localStorage` |
| デプロイ | Vercel |
| パッケージ管理 | npm |
| 実行環境 | WSL2 Ubuntu |

## アプリ概要

このアプリは、本番運用向けの勤怠システムではなく、画面構成、ボタン配置、打刻状態遷移、保存方式を検証するためのデモです。

現在は認証、従業員マスタ、データベース保存を持っていません。従業員コードは任意の7桁数字を受け付け、従業員名は仮表示として `未登録` を表示します。

## 主な機能

- 従業員コード7桁入力
- テンキーによる入力操作
- 出勤、外出、戻り、退勤の打刻
- 外出3回までの状態管理
- 打刻完了ポップアップ
- 当日打刻表の表示
- 月次確認画面の表示
- 前月、次月の勤怠確認
- ブラウザ再読み込み後のlocalStorage復元
- PC、タブレット、スマートフォン向けレスポンシブ表示

## 状態遷移

打刻状態は `AttendanceStatus` として管理しています。

```text
before
  -> workingBeforeOuting1
  -> away1
  -> workingBeforeOuting2
  -> away2
  -> workingBeforeOuting3
  -> away3
  -> workingAfterOuting3
  -> finished
```

画面上の外出ボタンは常に `外出` と表示します。内部データでは `outings[0]`, `outings[1]`, `outings[2]` として外出1から外出3を区別します。

## データ構造

勤怠データは `AttendanceRecord` として扱います。

```ts
type AttendanceRecord = {
  id: string;
  employeeCode: string;
  employeeName: string;
  date: string;
  clockIn?: string;
  outings: {
    out?: string;
    back?: string;
  }[];
  clockOut?: string;
};
```

保存先はブラウザの `localStorage` です。

```ts
const STORAGE_KEY = "attendance-clock-v1-records";
```

## 画面構成

### 従業員コード入力画面

初期表示画面です。

- 店舗名
- 日付、時刻
- 従業員コード入力欄
- テンキー

7桁入力後に `次` を押すと打刻画面へ進みます。`C` は入力中のコードを全削除します。

### 打刻画面

従業員コード送信後の画面です。

- 日付、時刻
- 従業員コード欄の仮表示
- 氏名欄の仮表示
- 打刻ボタン
- 確認、当日打刻確認、クリア
- 当日打刻表

退勤済みの従業員コードを再入力した場合は、右側ボタン群の上に `※本日の打刻は終了しています。` を表示します。

### 当日打刻表

現在選択中の従業員コードについて、当日分のみを表示します。

表示項目:

- 出勤日
- 出勤
- 外出1
- 戻り1
- 外出2
- 戻り2
- 外出3
- 戻り3
- 退勤
- 時間

### 月次確認画面

`確認` ボタンから表示する月次確認画面です。

選択中の従業員コードについて、対象月の勤怠履歴と月合計時間を表示します。`前月` と `次月` で表示月を変更できます。

## ディレクトリ構成

```text
app/
  globals.css                    共通CSS、フォント、ベーススタイル
  layout.tsx                     Next.jsメタデータとルートレイアウト
  page.tsx                       画面全体の組み立て、hooks、画面切り替え

components/
  ActionButtons.tsx              出勤、外出、退勤、確認、クリアの操作ボタン群
  ClockPanel.tsx                 日付、時刻パネル
  Keypad.tsx                     従業員コード入力用テンキー
  StampModal.tsx                 打刻完了ポップアップ
  TodayTable.tsx                 当日打刻表

features/
  attendance/
    constants.ts                 店舗名、仮従業員名などの定数
    date.ts                      日付、時刻表示、労働時間計算
    reducer.ts                   勤怠状態遷移、打刻処理、画面状態管理
    types.ts                     勤怠レコード、状態、Actionなどの型

lib/
  attendance-storage.ts          localStorageの読み書き処理

package.json                     npm scriptsと依存関係
```

`app/page.tsx` は、現在の状態、画面切り替え、各コンポーネントの配置を担当します。勤怠の状態遷移や保存処理は `features/attendance/` と `lib/` に分離しています。

DB導入時は、まず `lib/attendance-storage.ts` の責務をDB向けrepositoryへ置き換える想定です。候補名は `lib/attendance-repository.ts` です。

```text
現在:
  page.tsx
    -> lib/attendance-storage.ts
      -> localStorage

DB導入後:
  page.tsx または app/api/*
    -> lib/attendance-repository.ts
      -> Database
```

## 開発コマンド

```bash
npm install
npm run dev
npm run build
npm run lint
```

開発サーバー:

```bash
npm run dev
```

ビルド確認:

```bash
npm run build
```

## デプロイ

Vercelで本番デプロイしています。

```bash
npx vercel deploy --prod --yes
npx vercel alias set <deployment-url> kintai-demo-sawayaka.vercel.app
```

通常はGitHub連携により、`main` 更新後にVercel側でデプロイされます。手動デプロイする場合は上記コマンドを使用します。

## ブランチ運用

- `main`: 公開URLに反映する安定版
- `develop`: 通常の細かい機能修正
- `docs/readme`: README更新専用
- 大きな変更: 必要に応じて個別のfeatureブランチを作成

READMEを編集する場合は、原則として `docs/readme` ブランチで作業し、コミット後に `main` へマージします。

## 現時点の制約

- 従業員マスタは未実装
- 管理者画面は未実装
- データベース保存は未実装
- 打刻修正申請は未実装
- 監査ログは未実装
- 店舗端末制限は未実装
- 本番向けの改ざん防止は未実装

未対応項目はGitHub Issuesで管理します。
