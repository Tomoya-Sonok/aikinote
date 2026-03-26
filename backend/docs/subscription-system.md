# サブスクリプション・決済システム仕様

## 概要

AikiNote Premium サブスクリプション（月額380円/年額3,800円）の決済・管理システム。
Web 版は Stripe Checkout（リダイレクト方式）、Native 版は RevenueCat（IAP）でそれぞれ課金し、DB を SSOT として状態を一元管理する。

## アーキテクチャ

```
[Web ブラウザ]
  → POST /api/subscription/checkout → Stripe Checkout Session 作成
  → Stripe ホスト決済ページにリダイレクト
  → 決済完了 → /settings/subscription?success=1 に戻る
  → Stripe Webhook (customer.subscription.created) → DB 更新

[Native アプリ (iOS/Android)]
  → WebView postMessage: INITIATE_IAP
  → RevenueCat Paywall (react-native-purchases-ui)
  → RevenueCat Webhook → DB 更新

[DB (Supabase)]
  → UserSubscription テーブル (SSOT)
  → User.subscription_tier キャッシュカラム（トリガーで自動同期）
```

## DB スキーマ

### UserSubscription テーブル

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID PK | |
| user_id | UUID UNIQUE FK | User.id への参照 |
| tier | TEXT | `free` / `premium` |
| revenuecat_customer_id | TEXT | RevenueCat or Stripe Customer ID |
| platform | TEXT | `web` / `ios` / `android` |
| entitlement_id | TEXT | RevenueCat Entitlement ID |
| product_id | TEXT | Stripe Price ID or IAP Product ID |
| current_period_start | TIMESTAMPTZ | 現在の課金期間の開始日 |
| current_period_end | TIMESTAMPTZ | 現在の課金期間の終了日 |
| cancel_at_period_end | BOOLEAN | 期間終了時にキャンセル予定か |
| status | TEXT | `active` / `canceled` / `expired` / `billing_issue` / `inactive` |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | トリガーで自動更新 |

### User テーブル（追加カラム）

| カラム | 型 | 説明 |
|--------|-----|------|
| subscription_tier | TEXT | `free` / `premium`。UserSubscription 変更時にトリガーで自動同期 |

### DB トリガー

- `trigger_update_user_subscription_updated_at` — UserSubscription の updated_at を自動更新
- `trigger_sync_user_subscription_tier` — UserSubscription.tier 変更時に User.subscription_tier を同期

### RLS

- `subscription_select_own` — authenticated ユーザーは自分の UserSubscription のみ SELECT 可能

## API エンドポイント

### サブスクリプション管理（JWT 認証必須）

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/subscription/status` | 現在のサブスクリプション状態を取得 |
| POST | `/api/subscription/checkout` | Stripe Checkout Session を作成して URL を返す。二重課金防止チェックあり |
| POST | `/api/subscription/portal` | Stripe Customer Portal セッションを作成して URL を返す |
| POST | `/api/subscription/sync` | Stripe の実際の状態と DB を同期 |

### Webhook（認証スキップ、署名検証のみ）

| メソッド | パス | 送信元 | 説明 |
|---------|------|--------|------|
| POST | `/api/webhooks/stripe` | Stripe | `customer.subscription.created/updated/deleted` を処理 |
| POST | `/api/webhooks/revenuecat` | RevenueCat | IAP イベントを処理 |

## Stripe 連携

### 環境変数

| 変数名 | 配置先 | 説明 |
|--------|--------|------|
| `STRIPE_SECRET_KEY` | .env.local, CF Workers | Stripe Secret Key |
| `STRIPE_WEBHOOK_SECRET` | .env.local, CF Workers | Stripe Webhook 署名検証用 |
| `NEXT_PUBLIC_STRIPE_PRICE_MONTHLY` | .env.local, Vercel | 月額 Stripe Price ID |
| `NEXT_PUBLIC_STRIPE_PRICE_YEARLY` | .env.local, Vercel | 年額 Stripe Price ID |

### Stripe Webhook で処理するイベント

| イベント | 処理内容 |
|---------|---------|
| `customer.subscription.created` | UserSubscription を upsert、tier を `premium` に |
| `customer.subscription.updated` | 期間情報・キャンセル状態を更新 |
| `customer.subscription.deleted` | tier を `free`、status を `expired` に |
| `checkout.session.completed` | ログ出力のみ（実際の更新は subscription イベントで行う） |

### Checkout Session 作成時の動作

1. JWT から user_id を取得
2. `isPremiumUser()` で二重課金防止チェック（既に Premium なら 409）
3. User テーブルから email を取得
4. Stripe Customer を email で検索、なければ作成（metadata に `supabase_user_id` を付与）
5. Checkout Session を作成（`subscription_data.metadata` にも `supabase_user_id`）
6. Session URL を返却 → フロントエンドがリダイレクト

### Webhook での user_id 特定

1. `subscription.metadata.supabase_user_id` を確認
2. なければ `customer.metadata.supabase_user_id` を確認
3. どちらもなければ警告ログを出力してスキップ

## RevenueCat 連携

### 環境変数

| 変数名 | 配置先 | 説明 |
|--------|--------|------|
| `REVENUECAT_WEBHOOK_TOKEN` | .env.local, CF Workers | Webhook 認証トークン |
| `NEXT_PUBLIC_REVENUECAT_API_KEY` | .env.local, Vercel | Web SDK 用 Public Key |
| `REVENUECAT_API_KEY` | .env.local, CF Workers | Server API Key |

### RevenueCat 設定

| 項目 | 値 |
|------|-----|
| Entitlement ID | `AikiNote Premium` |
| Offering ID | `default` |
| Customer ID | Supabase `user.id`（UUID） |
| Webhook URL | `https://api.aikinote.com/api/webhooks/revenuecat` |

### RevenueCat Webhook で処理するイベント

| イベント | tier | status |
|---------|------|--------|
| `INITIAL_PURCHASE`, `RENEWAL`, `UNCANCELLATION` | premium | active |
| `CANCELLATION` | premium | canceled |
| `EXPIRATION` | free | expired |
| `BILLING_ISSUE` | premium | billing_issue |
| `TEST` | — | スキップ（200 を返す） |

## フロントエンド

### Premium ゲーティング

| コンポーネント | 場所 | 動作 |
|--------------|------|------|
| `SubscriptionGate` | 統計データページ等 | Free ユーザーにはアップグレード誘導を表示 |
| `PremiumUpgradeModal` | SNS フィード等 | Native なら `showNativePaywall()`、Web なら `/settings/subscription` に遷移 |
| 2秒プレビューロック | `SocialPostsFeed.tsx` | Free ユーザーは2秒後にロックオーバーレイ表示 |

### サーバーサイド制限

| API | 制限内容 |
|-----|---------|
| `GET /api/stats` | Free ユーザーは 403 (`PREMIUM_REQUIRED`) |
| `GET /api/social/posts` | Free ユーザーは最新5件のみ返却、`is_preview: true` |
| `POST /api/social/posts` | Free ユーザーは 403 |
| `POST /api/social/posts/:id/replies` | Free ユーザーは 403 |

### useSubscription フック

- ページ読み込み時に `syncSubscription()` → `getSubscriptionStatus()` を順に実行
- Stripe Portal から戻った場合でも最新状態が DB に反映される

### 導線

- NavigationDrawer: 「サブスクリプション」メニュー項目
- マイページ: SettingsMenu の最上部に「サブスクリプション」

## サブスクリプションのライフサイクル

```
Free ユーザー
  ↓ /settings/subscription でプラン選択
  ↓ Stripe Checkout で決済
  ↓ Webhook: customer.subscription.created
Premium（active）
  ↓ Stripe Portal で「Cancel subscription」
  ↓ Webhook: customer.subscription.updated (cancel_at_period_end: true)
Premium（active, cancel_at_period_end: true）
  → 期間終了まで Premium 機能は利用可能
  → /settings/subscription に「解約済み — ○月○日 まで Premium 機能をご利用いただけます」と表示
  ↓ 期間終了
  ↓ Webhook: customer.subscription.deleted
Free（expired）
  → 再度 /settings/subscription からプラン選択可能
```

## 注意事項

- Stripe API バージョン `2026-02-25.clover` では `current_period_start`/`current_period_end` のフィールド構造が異なる場合がある。Webhook と sync の両方で複数パスからの取得を試みるように実装済み
- Webhook が届かなかった場合のフォールバックとして、`useSubscription` フックが毎回 `sync` API を呼んで Stripe と DB を同期する
- UserSubscription レコードは物理削除しない。解約時は tier/status を更新し、再購入時に upsert で上書き
- Native アプリ（WebView 内）では Stripe Checkout を表示しない（Apple 審査 Guidelines 3.1.1 対策）。`window.__AIKINOTE_NATIVE_APP__` フラグで分岐
