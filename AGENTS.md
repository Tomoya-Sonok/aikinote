# AGENTS.md

AikiNote モノレポの開発をスムーズに進めるためのエージェント用ガイドラインです。  
フロントエンド・バックエンド・インフラ・運用規約を統一的に整理しています。

---

## 1. プロジェクト構成

.
├── frontend/         # Next.js (App Router) クライアント
│   ├── app/          # ルーティングとページ
│   ├── components/   # atoms / molecules / organisms
│   ├── lib/          # 共通ロジック
│   ├── stores/       # Zustand 状態管理
│   ├── public/       # 静的アセット
│   └── test-utils/   # テストヘルパー
│
├── backend/          # Hono (TypeScript) API
│   ├── src/routes/   # ドメインごとのエンドポイント
│   ├── src/lib/      # 共通ユーティリティ
│   ├── src/middleware
│   ├── src/types
│   └── src/test/     # テスト補助
│
├── infra/            # IaC (Terraform 等)
├── scripts/          # CLI・自動化スクリプト
├── docker-compose.yml
├── pnpm-workspace.yaml
└── package.json

- **テストは実装隣接配置**  
  例: `lib/foo.test.ts`, `routes/bar.integration.test.ts`
- **モックやユーティリティ** → 近接配置か `test-utils/`

---

## 2. 開発コマンド

- 依存関係:
  
  ```bash
  pnpm install
  ```

（必ず monorepo root で実行、npm/yarn 混用禁止）

- 開発サーバー:
  
- ```bash
  pnpm --filter frontend dev
  pnpm --filter backend dev
  ```

- 本番ビルド:
  
  ```bash
  pnpm --filter frontend build
  pnpm --filter backend build
  ```

- ローカルサーバー全起動:
  
  ```bash
  docker-compose up -d
  ```

- テスト:
  
  ```bash
  pnpm test
  pnpm --filter frontend test:ci
  pnpm --filter backend test:ci
  ```

- Storybook:
  
  ```bash
  pnpm --filter frontend sb
  ```

## 3. コーディング規約

- Biome で自動整形
  
  ```bash
  pnpm --filter <pkg> check:fix
  ```

  - インデント: 2スペース
	- ダブルクォート
	- 末尾カンマ必須
	- インポート順序を整列

- 命名規則
	- React コンポーネント: PascalCase
	- Hooks: useXxx
	- Zustand ストア: <Name>Store
	- Backend ハンドラ: create<Name>Handler
	- 共通ユーティリティ: 名前付きエクスポート推奨

## 4. テスト指針

	- ツール:
  	- Frontend → Vitest + Happy DOM
  	- Backend → Vitest (Node)
	- 命名規約:
  	- 単体: *.test.ts(x)
  	- 結合: *.integration.test.ts(x)
	- セットアップ共通化:
  	- frontend → test-utils/
  	- backend → src/test/
	- 運用フロー:
  	- 開発中: pnpm --filter frontend test
  	- プッシュ前: pnpm --filter backend test:ci

テストコードを書くときは、以下の3つのポイントを厳守すること。テスト名（テストタイトル）は必ず日本語で。

- Arange-Act-Assert（AAA）パターンを使用する
    - 上から下に読みやすい構造にする
        - 下から上を読み返さない
    - 自然言語を意識して記述する
        - テスト実行後の出力メッセージが読みやすくなる
- DRY原則や、制御文（if/whileなど）を避け、愚直に書く
    - シンプルで直感的なテストコードを好む
        - ハードコードした変数も良い
    - 1つのテストファイルで内容を確認できるようにする
        - 例えば、データファイルを別ファイルに分割しない
- 1つのテストケースには1つの検証を行う
    - 異なる目的の検証は、テストケースを分ける

## 5. コミット & PR

  - コミットメッセージ:
    ```
    feat: 新機能追加
    fix: バグ修正
    chore: 雑多な変更
    ```
    
    - 必要なら日英併記可
	  - 関連チケット: (#123)
	  - WIPは squash して整理

  - Pull Request には必須情報を記載:
  	- 変更概要 & 影響範囲
  	- 関連 Issue
  	- 検証コマンド
  	- UI変更がある場合はスクショ/動画

	- レビュー依頼前に必ず:
    ```bash
    pnpm check
    pnpm --filter <pkg> build
    pnpm --filter <pkg> test
    ```

## 6. 環境変数 & 設定

- .env.local.example を参考に .env.local を作成
- 機密情報は 絶対にコミット禁止
- Supabase / AWS 認証情報はメンテナと連携して更新

## 7. AIエージェント利用Tips
	•	Context最優先: AikiNoteの要件（合気道ユーザー層、国際化、日本語・英語切替、モバイルWeb優先）を常に考慮
	•	認証: Supabase + 独自Userテーブル
	•	UI配慮: 高齢ユーザー向け → 文字サイズ変更・和風デザイン
	•	目標: 正確で再現性のあるコード生成と自動化の効率化

