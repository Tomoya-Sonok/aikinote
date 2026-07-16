-- リテンション通知（7日以上アプリ未利用のユーザーへの再訪促し通知）の送信記録テーブル
-- 1離脱期間（最終利用 → 再訪まで）につき1回だけ送信するための状態を保持する。
-- 判定はバックエンドの Cron（reminder.ts → retention.ts）が
-- UserPushToken.updated_at（最終利用日時の代用）と notified_at を比較して行う。
CREATE TABLE "UserRetentionNotification" (
  user_id UUID PRIMARY KEY REFERENCES "User"(id) ON DELETE CASCADE,
  notified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "UserRetentionNotification" ENABLE ROW LEVEL SECURITY;

-- 書き込みはバックエンド（SERVICE_ROLE_KEY、RLSバイパス）のみが行う。
-- ANON_KEY 経由の直接アクセスへの防御層として、認証済みユーザーには自分の行の参照のみ許可する。
CREATE POLICY "Users can view their own retention notification"
  ON "UserRetentionNotification"
  FOR SELECT
  USING (auth.uid() = user_id);
