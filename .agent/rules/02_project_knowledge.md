---
trigger: always_on
---

# AikiNote プロジェクト仕様書
AikiNote（合気道学習アプリ）の技術仕様および開発ルールです。
## 1. プロジェクト概要 & ドメイン要件
- **プロダクト**: AikiNote (合気道ノート)
- **主要ユーザー**: 合気道実践者（若年層〜高齢者まで幅広い）
- **UI/UX指針**:
  - **Mobile First**: 想定される利用デバイスの90%はSP。幅375〜450pxを基準に設計。
  - **Accessibility**: 高齢ユーザーを意識し、文字サイズ変更への対応や和風で見やすいデザインを優先。
  - **PC表示**: 最大幅 `max-width: 580px` を原則とし、中央揃えで崩れないようにする（frontend/src/styles/globals.css 等で制御）。
## 2. 技術スタック & 構成
### ディレクトリ構造 (Monorepo)
.
├── frontend/             # Next.js 16 (App Router) / React 19
│   ├── src/
│   │   ├── app/          # App Router Pages & API Routes
│   │   ├── components/   # atoms, molecules, organisms
│   │   ├── lib/          # Hooks, Util, Supabase Client, tRPC Client
│   │   ├── server/       # tRPC routers & Hono app (App Route経由)
│   │   ├── styles/       # Global CSS
│   │   ├── types/        # 型定義
│   │   └── ...
│   ├── public/           # 静的ファイル
│   └── vitest.config.mjs # Frontend特定の設定
├── backend/              # Hono API (Cloudflare Workers / Node)
│   ├── src/              # API ロジック (Routes, Middleware)
│   ├── wrangler.toml     # Cloudflare Workers 設定
│   └── vitest.config.ts  # Backend特定の設定
├── scripts/              # 開発用スクリプト (dev.mjs 等)
├── .agent/rules/         # AI エージェント用ルール
└── package.json          # Monorepo root scripts
### 開発環境
- **Package Manager**: `pnpm` (npm/yarn使用禁止)
- **Runtime**: Node.js (Local), Cloudflare Workers (Backend Prod), Vercel/Node (Frontend Prod)
- **Framework**:
  - Frontend: Next.js 16, Hono (API), tRPC
    - **Middleware**: 必ず `src/proxy.ts` (src root) とする。 `middleware.ts` は Deprecated (Next.js 16+).
  - Backend: Hono
- **Formatter/Linter**: `Biome`
- **Testing**: `Vitest`
- **Database**: Supabase + 独自Userテーブル
## 3. 開発コマンド集
| 目的 | コマンド (Root実行) | 備考 |
|---|---|---|
| 依存インストール | `pnpm install` | |
| 開発サーバー起動 | `pnpm dev` | `scripts/dev.mjs` が起動し、Frontend/Backend/Proxy を管理 |
| 開発サーバー停止 | `pnpm dev:stop` | |
| テスト実行 | `pnpm test` | モノレポ全体テスト |
| 整形・チェック | `pnpm check` | Biome check |
| 整形・修正 | `pnpm check:fix` | **コミット前必須** (Biome write) |
| Wrangler Secret | `pnpm wrangler:secret:update` | `.env.local` から Secret を更新 |
## 4. コーディング規約 (Strict)
### 命名規則
- **React Component**: `PascalCase` (例: `HeaderMenu.tsx`)
- **Hooks**: `useXxx`
- **Files**:
  - Component: `PascalCase.tsx`
  - Logic/Util: camelCase.ts
- **Types**: PascalCase (interface / type alias)
### コンポーネント実装
- **配置**: `frontend/src/components/{atoms|molecules|organisms}` 配下。
- **構成**: `frontend/src/app` はルーティング定義に徹し、ロジックやUI実装は `components` や `lib/hooks` に分離する。
- **アイコン**: すべてのアイコンは `@phosphor-icons/react` からインポートして使用すること。他のアイコンライブラリや独自SVGの使用は禁止。
### テスト実装 (Vitest)
- **AAAパターン厳守**: Arrange（準備）, Act（実行）, Assert（検証）を視覚的に分ける。
- **記述方針**: DRY原則よりも「読んでわかる」を優先。
- **Frontend**: `vitest.setup.ts` で `happy-dom` 環境やモックをロード。
- **Backend**: ロジックの単体テストを中心に記述。

### CSS / スタイリング規約 (Strict)

#### カラーパレット
- **すべての色指定は `frontend/src/styles/variables.css` のCSS変数を使うこと（絶対厳守）**。
- ハードコードの色コード（例: `#838383`、`#fff`）を直接CSSに書くことは**禁止**。
- 変数に存在しない色が必要な場合は、まず `variables.css` に変数を追加してから使用する。
- フォールバック値 `var(--xxx, #yyy)` はレガシーコードの互換性維持に限り許可。新規コードへの使用は禁止。

**主要なカラー変数の対応表（代表例）：**
| ハードコード | 使うべき変数 |
|---|---|
| `#838383`, `#fff` | `var(--primary-color)`, `var(--aikinote-white)` |
| `#6d6d6d` | `var(--primary-dark)` |
| `#2c2c2c`, `#000`, `#1f2937` | `var(--aikinote-black)` |
| `#8b8178`, `#888`, `#6b7280` | `var(--aikinote-text-light)` |
| `#b5afa6` | `var(--aikinote-light-gray)` |
| `#e8e4df`, `#f0f0f0`, `#ddd` | `var(--border-color)` |
| `#f5f3ef`, `#f9f9f9` | `var(--background-light)` |
| `#f12b2b` | `var(--error-color)` |
| `#2e7d32` | `var(--success-color)` |

#### `!important` 禁止（重要）

- **`!important` の使用は原則禁止**。スタイルが意図通りに当たらない場合は、`!important` で強引に上書きせず、**詳細度の問題を正しく解決すること**。
- `!important` を使いたくなったときは、以下の代替手段を検討する。

**CSS Modules の詳細度競合（外部コンポーネントの className を上書きできない場合）：**

| 状況 | 解決策 |
|---|---|
| 共有コンポーネントの単一プロパティを上書きしたい | `style` prop（インライン）を使う。詳細度が最も高いため確実に適用される |
| レスポンシブ対応が必要でインラインスタイルではメディアクエリが書けない | JS（`window.matchMedia`）でブレークポイントを判定し、`style` prop に条件分岐した値を渡す |
| 自分が管理するコンポーネント同士の競合 | 詳細度が同じ（詳細度 `0,1,0`）なので、CSS の**読み込み順**を整理するか、複合セレクタで詳細度を上げる |

> **実例（`LogoutToast`）**: `Toast.module.css` の `.toast` と `LogoutToast.module.css` の `.logoutToast` は詳細度が同じ。CSS Modules では別ファイル間の読み込み順に依存して不安定になるため、`Toast` に `style` prop を追加して JS 側で制御する方法に修正済み。


#### z-index 管理（重要）

> **背景**: `position: sticky` や `position: fixed` の要素は独立したスタッキングコンテキストを形成する。
> z-index が連続した整数値（1, 2, 3...）だと、ローカルコンテキストとグローバルコンテキストの混在により
> 意図しない重なり順が発生する（例: モーダルがヘッダーに負ける）。

**ルール（絶対厳守）：**

1. **新規の `z-index` 指定は必ず `variables.css` の変数を使うこと**。ハードコードは禁止。
2. **`calc(var(--z-xxx) + 1)` のような計算式は禁止**。専用変数を新設すること。
   - 悪い例: `z-index: calc(var(--z-header) + 1);`
   - 良い例: `z-index: var(--z-header-dropdown);`（変数を `variables.css` に追加する）
3. **コンポーネント内部のローカルな重なり（例: カード内の削除ボタン）は低い整数値（1〜9）を使ってよい**が、その場合はコメントで意図を明示すること。
   - 例: `z-index: 2; /* カード内ローカル：メディア上に削除ボタンを重ねる */`

**現在の z-index レイヤー一覧（`variables.css` 参照）：**
| 変数 | 値 | 対象コンポーネント |
|---|---|---|
| `--z-fab` | 10 | FloatingActionButton, ScrollIndicator |
| `--z-tab` | 10 | TabNavigation |
| `--z-header` | 20 | DefaultHeader, LP Header |
| `--z-header-dropdown` | 30 | ヘッダー内ツールチップ・ドロップダウン |
| `--z-drawer` | 30 | NavigationDrawer オーバーレイ |
| `--z-drawer-panel` | 31 | NavigationDrawer パネル本体 |
| `--z-modal` | 40 | PageModal, DatePicker, TagFilter, Loader |
| `--z-confirm` | 40 | ConfirmDialog |
| `--z-toast` | 50 | Toast 通知 |

## 5. Git & コミット運用
- prefix 以外は日本語でメッセージを書く。
- **Commit Message Format**:
  ```text
  feat: 新機能
  fix: バグ修正
  chore: 設定変更・リファクタリング
  test: テスト関連
  docs: ドキュメント更新
  ```

- **PR要件**:
  - 変更概要と影響範囲を明記。
  - レビュー依頼前に pnpm check, build, test をパスしていること。

## 6. モダンな状態管理と非同期処理 (React 19 / Next.js 16)

AikiNote では、React 19 および Next.js 16 で導入された最新機能を積極的に活用し、ユーザー体験とコードの宣言的な記述を両立させます。

### 非同期状態管理 (`useActionState`)
- **用途**: フォーム送信やデータ更新を行う Server Actions の状態（`pending`, `data`, `error`）を自動的に管理します。
- **指針**: 従来の `useState` による手動のローディング・エラー管理を置き換え、UIの状態とアクションの結果をシンプルに紐付けます。

### 楽観的更新 (`useOptimistic`)
- **用途**: サーバーからの応答を待たずにUIを即座に更新し、アプリのレスポンス性を極限まで高めます。
- **指針**:
  - データの追加、削除、フラグのトグルなど、成功の蓋然性が高い操作に適用します。
  - **AikiNote の現状**: 現在一部のフック（`useTrainingPagesData` 等）では `prev => prev.filter(...)` による手動の楽観的更新を行っていますが、今後は標準機能である `useOptimistic` への移行を検討してください。

### Server Actions
- **用途**: クライアントから直接サーバーサイドの関数を呼び出し、データのミューテーションを行います。
- **指針**: tRPC を使用しない単純なフォーム送信や、特定のサーバーサイドロジックを実行する場合に活用します。