# 通報インシデント対応運用フロー

このドキュメントは、AikiNote のソーシャル機能における **ユーザー通報 (User-Generated Content reports)** を運営側で対応する手順を定義する。Apple App Review Guideline 1.2 に準拠した「24 時間以内対応」の運用根拠として、再申請時に Reviewer Notes から参照する。

## 概要

AikiNote では、投稿または返信に対する通報が発生したとき、以下の自動・手動オペレーションが連携して動く:

```
ユーザーが投稿/返信を通報
   ↓
Hono Backend (POST /api/social/reports/posts/:id または /replies/:id)
   ↓ 並列
   ├── Supabase の PostReport テーブルに行を INSERT (status='pending')
   └── Resend 経由で運営アドレス (support@aikinote.com) に通知メール送信
        ↓ メール本文に対象 URL / 通報理由 / 通報者 username / 対象ユーザー username / 本文抜粋を記載
        ↓
   運営担当者がメール内のリンクから対象を確認
        ↓
   不適切と判断したら Supabase Studio で対応 (24 時間以内)
        ↓
   ユーザーに通知 (任意)
```

## SLA: 24 時間以内対応

通報を受領してから **24 時間以内** に運営担当者は内容を確認し、必要に応じて対象コンテンツの削除または利用者の制限を行うことを目標とする。これは Apple App Review Guideline 1.2 (UGC) で求められる「act on objectionable content reports within 24 hours」要件に対応する。

## 運営側の対応手順

### 1. 通報メールを受信

- 受信先: `support@aikinote.com`
- 件名形式: `[AikiNote 通報] 投稿通報 - inappropriate` のように種別 + 理由が含まれる
- 本文には以下が含まれる:
  - 通報 ID (PostReport.id)
  - 通報理由 (spam / harassment / inappropriate / impersonation / other)
  - 通報者の追加詳細 (任意の自由記述、最大 500 字)
  - 通報者 username
  - 対象ユーザー username
  - 対象投稿/返信の URL
  - 本文抜粋 (200 字まで)

### 2. 対象コンテンツを確認

メール内のリンクから AikiNote 上で対象投稿/返信を実際に開き、コンテンツとコンテキストを確認する。

### 3. 判断と対応

#### 不適切と判断した場合

Supabase Studio で対応:

**投稿の場合:**
```sql
UPDATE "SocialPost"
SET is_deleted = true, updated_at = now()
WHERE id = '<対象投稿ID>';

UPDATE "PostReport"
SET status = 'resolved', updated_at = now()
WHERE id = '<通報ID>';
```

**返信の場合:**
```sql
UPDATE "SocialReply"
SET is_deleted = true, updated_at = now()
WHERE id = '<対象返信ID>';

UPDATE "PostReport"
SET status = 'resolved', updated_at = now()
WHERE id = '<通報ID>';
```

繰り返し違反する利用者に対しては、対象アカウントの状態 (`User.publicity_setting` 等) も確認し、必要に応じてアカウント自体に制限を加える。

#### 不適切でないと判断した場合

```sql
UPDATE "PostReport"
SET status = 'reviewed', updated_at = now()
WHERE id = '<通報ID>';
```

`reviewed` は「通報内容を確認したが、削除には至らなかった」状態。後の追加通報でガイドライン違反パターンが見えた場合の判断材料として残す。

### 4. 対応完了の記録

`PostReport.status` の状態遷移:
- `pending`: 通報受領直後（デフォルト）
- `reviewed`: 運営が確認したが削除不要と判断
- `resolved`: 運営が確認し、対象コンテンツを削除済み

24 時間以内にいずれかの状態に必ず遷移させる。

## 環境変数

通知メールの送信に必要な環境変数 (Cloudflare Workers secret として設定済み):

| 変数 | 説明 |
|---|---|
| `RESEND_API_KEY` | Resend API キー（既存メール認証フローと共有） |
| `RESEND_FROM_EMAIL` | 送信元アドレス（例: `noreply@aikinote.com`） |

通知先アドレス `support@aikinote.com` は `backend/src/lib/report-notification.ts` 内に定数として固定されている。変更時はソース修正が必要。

## Reviewer Notes 用の英文 (Apple 再申請時)

```
24-hour response commitment

Operations team receives a real-time email notification (sent via Resend to
support@aikinote.com) on every user report. The notification contains the
report ID, reason, optional detail, reporter username, target username, the
URL of the reported content, and a content excerpt.

Upon receiving a notification, the operations team reviews the reported
content within 24 hours and, if it violates our guidelines, marks the post
or reply as deleted (`is_deleted = true`) and updates the report status to
`resolved` in the PostReport table via Supabase Studio.

This procedure satisfies the "act on objectionable content reports within
24 hours" requirement of App Review Guideline 1.2.
```
