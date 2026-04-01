# プッシュ通知システム

## 概要

AikiNote ネイティブアプリ（iOS / Android）向けのプッシュ通知。**Expo Push Service** を使用し、FCM（Android）/ APNs（iOS）を抽象化して配信する。

## アーキテクチャ

```
[ソーシャルアクション（お気に入り/返信）]
  ↓
[Hono Backend ルートハンドラ]
  ↓ 並行処理
  ├── Notification テーブルに INSERT（アプリ内通知）
  └── sendPushToUser() / sendPushToUsers()
        ↓
        UserPushToken テーブルから受信者のトークン取得
        ↓
        Expo Push API (https://exp.host/--/api/v2/push/send) に POST
        ↓
        ├── FCM → Android デバイス
        └── APNs → iOS デバイス
```

## DB スキーマ

### UserPushToken テーブル

| カラム | 型 | 説明 |
|---|---|---|
| id | UUID (PK) | 自動生成 |
| user_id | UUID (FK→User) | ユーザー ID |
| expo_push_token | TEXT | Expo Push Token（`ExponentPushToken[xxx]` 形式） |
| platform | TEXT | `ios` または `android` |
| created_at | TIMESTAMPTZ | 作成日時 |
| updated_at | TIMESTAMPTZ | 更新日時 |

- `UNIQUE(user_id, expo_push_token)` で重複登録を防止
- `ON DELETE CASCADE` でユーザー削除時にトークンも削除
- RLS 有効（認証済みユーザーは自分のトークンのみ操作可能）

マイグレーション: `backend/src/migrations/016_create_user_push_token.sql`

## 通知タイプ一覧

| type | トリガー | 受信者 | プッシュメッセージ |
|---|---|---|---|
| `favorite` | 投稿をお気に入り登録 | 投稿者 | "[username] があなたの投稿をお気に入り登録しました" |
| `favorite_reply` | 返信をお気に入り登録 | 返信者 | "[username] があなたの返信をお気に入り登録しました" |
| `reply` | 投稿に返信 | 投稿者 | "[username] があなたの投稿に返信しました" |
| `reply_to_thread` | スレッドに返信 | 他の返信者全員 | "[username] がスレッドに返信しました" |

## API エンドポイント

### トークン登録

```
POST /api/push-tokens
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "expo_push_token": "ExponentPushToken[xxx]",
  "platform": "ios"  // "ios" | "android"
}
```

UPSERT 動作: 同一 `(user_id, expo_push_token)` が存在すれば `updated_at` を更新。

### トークン削除

```
DELETE /api/push-tokens
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "expo_push_token": "ExponentPushToken[xxx]"
}
```

ログアウト時にネイティブアプリから呼び出す。

### Next.js プロキシ

ネイティブアプリの WebView からは Next.js API route（`/api/push-tokens`）経由で Hono Backend にプロキシ。認証 Cookie → JWT 変換を Next.js 側で行う。

- `frontend/src/app/api/push-tokens/route.ts`

## プッシュ送信の仕組み

### 送信関数

| 関数 | 用途 | ファイル |
|---|---|---|
| `sendPushToUser()` | 単一ユーザーへ送信 | `backend/src/lib/push-notification.ts` |
| `sendPushToUsers()` | 複数ユーザーへ一括送信 | 同上 |

### 呼び出し箇所

| アクション | ルート | プッシュ送信関数 |
|---|---|---|
| 投稿お気に入り | `social-favorites/index.ts` | `sendPushToUser()` |
| 返信お気に入り | `social-favorites/index.ts` | `sendPushToUser()` |
| 投稿への返信 | `social-posts/index.ts` | `sendPushToUser()` |
| スレッド返信 | `social-posts/index.ts` | `sendPushToUsers()` |

### Expo Push API

- エンドポイント: `https://exp.host/--/api/v2/push/send`
- 認証: 不要（Expo Push Token がアクセス制御を兼ねる）
- レート制限: 600 リクエスト/分
- バッチ送信: 1リクエストで複数メッセージ送信可能
- [公式ドキュメント](https://docs.expo.dev/push-notifications/sending-notifications/)

### エラーハンドリング

- プッシュ送信はすべて **Fire-and-Forget**（`await` しない）
- エラーは `console.error` でログ出力のみ
- プッシュ送信失敗が本体処理（通知レコード作成、お気に入り/返信の処理）を止めることはない

## ネイティブアプリ側の実装

### トークン取得フロー

1. アプリ起動 → WebView が Web 版を読み込み
2. `USER_INFO` メッセージで `userId` を取得
3. `expo-notifications` で許可リクエスト → Expo Push Token 取得
4. WebView 内 fetch で `POST /api/push-tokens` を呼び出し

### 通知タップ → 画面遷移

通知の `data.postId` を使い、`/social/posts/[postId]` に WebView を遷移。

- コールドスタート: `Notifications.getLastNotificationResponseAsync()`
- ウォームスタート: `Notifications.addNotificationResponseReceivedListener()`

### ログアウト時

WebView の URL 変更監視で `/login` `/logout` への遷移を検知 → `USER_LOGGED_OUT` メッセージ → `DELETE /api/push-tokens`

### 関連ファイル

- `aikinote-native-app/lib/push-notifications.ts` — トークン取得・登録・削除
- `aikinote-native-app/app/_layout.tsx` — 通知ハンドラ設定、通知チャンネル設定
- `aikinote-native-app/app/index.tsx` — トークン登録タイミング、ログアウトハンドラ
- `aikinote-native-app/components/webview/aikinote-webview.tsx` — ログアウト検知

---

## 新しいプッシュ通知タイプを追加する手順

### チェックリスト

1. **DB**: `Notification` テーブルの `type` CHECK 制約に新タイプを追加
   ```sql
   ALTER TABLE "Notification" DROP CONSTRAINT "Notification_type_check";
   ALTER TABLE "Notification" ADD CONSTRAINT "Notification_type_check"
     CHECK (type IN ('favorite', 'reply', 'reply_to_thread', 'favorite_reply', '新タイプ'));
   ```

2. **Backend**: 通知を作成するルートハンドラで `createNotification()` + `sendPushToUser()` を呼び出す

3. **プッシュメッセージ**: `backend/src/lib/push-notification.ts` の `buildPushBody()` に新タイプの case を追加

4. **ネイティブ**: 通知タップ時の遷移先が投稿以外の場合は `_layout.tsx` のタップハンドラを更新

5. **テスト**: 新タイプのアクションを実行 → プッシュ通知が届くことを確認

---

## トラブルシューティング

### プッシュ通知が届かない

1. **シミュレーターでは動作しない**: 実機でテストする
2. **トークン未登録**: Supabase の `UserPushToken` テーブルを確認
3. **Expo Push API エラー**: Backend のログで `[Push]` プレフィックスのエラーを確認
4. **通知許可が未取得**: iOS の設定 → AikiNote → 通知 で許可状態を確認

### トークンが消えない（ログアウト後もプッシュが届く）

- WebView の URL 変更監視がログアウトを検知できていない可能性
- `USER_LOGGED_OUT` メッセージが送信されているかデバッグログで確認

### Expo Push Tool でテスト送信

[Expo Push Tool](https://expo.dev/notifications) で個別トークンにテスト送信可能。
