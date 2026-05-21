# 勤怠管理デモ

Webブラウザで動作する勤怠打刻画面のデモアプリです。画面は実店舗のUIを再現しました。

公開URL:

https://kintai-demo-sawayaka.vercel.app

管理者画面:

https://kintai-demo-sawayaka.vercel.app/admin

## 概要

従業員が7桁の従業員コードを入力し、出勤、外出、外出戻り、退勤を記録する勤怠打刻アプリです。PC、タブレット、スマートフォンのブラウザで操作できるレスポンシブUIとして実装しています。

打刻データ、従業員情報、店舗情報はSupabase Postgresに保存します。従業員コード入力後はDBから従業員情報と当日の打刻状況を取得するため、別端末で打刻した内容も、同じ従業員コードで入り直すと反映されます。

## 使用技術

| 分類 | 技術 |
| --- | --- |
| 言語 | TypeScript |
| フレームワーク | Next.js 16 App Router |
| UI | React 19 |
| スタイリング | Tailwind CSS 4 |
| 状態管理 | React `useReducer` |
| DB | Supabase Postgres |
| 認証 | Supabase Auth |
| API | Next.js Route Handlers |
| バリデーション | Zod |
| Supabase SDK | `@supabase/supabase-js`, `@supabase/ssr` |
| デプロイ | Vercel |
| パッケージ管理 | npm |
| 実行環境 | WSL2 Ubuntu |

## 主な機能

- 従業員コード7桁入力
- テンキーによる入力操作
- DB登録済み従業員の氏名表示
- DBからの当日打刻状況復元
- 出勤、外出、外出戻り、退勤の打刻
- 外出3回までの状態管理
- 打刻完了ポップアップ
- 当日打刻表の表示
- 退勤済み状態の表示
- 管理者ログイン
- 事前登録済み店舗マスタからの所属店舗選択
- 従業員追加、編集、有効/無効切り替え
- PC、タブレット、スマートフォン向けレスポンシブ表示

## 画面構成

### 従業員コード入力画面

初期表示画面です。

- 店舗名
- 日付、時刻
- 従業員コード入力欄
- テンキー

7桁入力後に `次` を押すと、DBから従業員情報と当日打刻状況を取得します。従業員コードが未登録、または無効な場合は打刻画面へ進めません。

### 打刻画面

従業員コード確認後の画面です。

- 日付、時刻
- 従業員コード欄に従業員名を表示
- 氏名欄に従業員名を表示
- 状態に応じた打刻ボタン
- 確認、当日打刻確認、クリア
- 当日打刻表

退勤済みの従業員コードを再入力した場合は、右側ボタン群の上に `※本日の打刻は終了しています。` を表示します。

### 管理者画面

`/admin` を直接開いて利用します。打刻画面からのリンクは置いていません。

- Supabase Authによる管理者ログイン
- 事前登録済み店舗からの所属店舗選択
- 従業員追加
- 従業員編集
- 従業員の有効/無効切り替え

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

画面上の外出ボタンは常に `外　出` と表示します。内部データでは `outing_index` により外出1から外出3を区別します。

## データ保存

現在はlocalStorageを使用していません。保存と復元はSupabase Postgresで行います。

主なテーブル:

- `stores`: 店舗。`store_code` に3桁店舗コードを保持
- `employees`: 従業員
- `attendance_records`: 1日単位の勤怠レコード
- `attendance_outings`: 外出、外出戻り
- `attendance_events`: 打刻イベント履歴
- `admin_profiles`: 管理者プロフィール
- `audit_logs`: 監査ログ用

主なAPI:

- `GET /api/attendance`: 従業員情報と当日打刻状況を取得
- `POST /api/attendance`: 出勤、外出、外出戻り、退勤を記録
- `GET /api/admin/stores`: 店舗一覧
- `GET /api/admin/employees`: 従業員一覧
- `POST /api/admin/employees`: 従業員追加
- `PATCH /api/admin/employees`: 従業員更新

## ディレクトリ構成

```text
app/
  admin/
    page.tsx                         管理者画面
  api/
    admin/
      employees/route.ts             従業員管理API
      stores/route.ts                店舗管理API
    attendance/route.ts              打刻取得、打刻保存API
  globals.css                        共通CSS、フォント、ベーススタイル
  layout.tsx                         Next.jsメタデータとルートレイアウト
  page.tsx                           打刻画面全体の組み立て

components/
  ActionButtons.tsx                  出勤、外出、退勤、確認、クリアの操作ボタン群
  ClockPanel.tsx                     日付、時刻パネル
  Keypad.tsx                         従業員コード入力用テンキー
  MonthlyAttendanceModal.tsx         月次打刻実績ポップアップ
  StampModal.tsx                     打刻完了ポップアップ
  TodayTable.tsx                     当日打刻表

features/
  attendance/
    constants.ts                     店舗名などの定数
    date.ts                          日付、時刻表示、労働時間計算
    reducer.ts                       勤怠状態遷移、画面状態管理
    types.ts                         勤怠レコード、状態、Actionなどの型

lib/
  admin-auth.ts                      管理者API用の認証確認
  attendance-api.ts                  フロントエンドから打刻APIを呼ぶ処理
  attendance-repository.ts           Supabase Postgresへの勤怠保存、取得
  supabase/
    auth-server.ts                   CookieベースのSupabase Authサーバークライアント
    client.ts                        ブラウザ用Supabaseクライアント
    server.ts                        service role用Supabaseクライアント

supabase/
  migrations/
    001_initial_schema.sql           初期テーブル作成、店舗マスタ投入
    002_grant_service_role.sql       service_role権限付与
    003_store_master_codes.sql       既存DB向け店舗コード追加、店舗マスタ投入
  seed/
    001_test_employee.sql            テスト従業員登録
```

## 環境変数

ローカルではプロジェクトルートに `.env.local` を配置します。

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

Vercelにも同じ環境変数を設定します。

`SUPABASE_SECRET_KEY` はサーバー側APIでのみ使用します。ブラウザへ露出させないでください。

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

## Supabaseセットアップ

Supabase SQL Editorで以下を実行します。

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_grant_service_role.sql
supabase/seed/001_test_employee.sql
```

管理者画面を使うには、Supabase Authenticationで管理者ユーザーを作成します。

## デプロイ

Vercelで本番デプロイしています。

通常はGitHub連携により、`main` 更新後にVercel側で自動デプロイされます。

本番URL:

```text
https://kintai-demo-sawayaka.vercel.app
```

## ブランチ運用

- `main`: 公開URLに反映する安定版
- `develop`: 通常の細かい機能修正
- `docs/readme`: README更新専用
- 大きな変更: 必要に応じて個別のfeatureブランチを作成

READMEを編集する場合は、原則として `docs/readme` ブランチで作業し、コミット後に `main` へマージします。

## 現時点の制約

- 店舗マスタは管理者画面から追加せず、migrationで事前投入
- 打刻修正申請は未対応
- 監査ログの画面表示は未対応
- 店舗端末制限は未対応
- 本番向けの厳密な改ざん防止は未対応

未対応項目はGitHub Issuesで管理します。
