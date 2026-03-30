-- プッシュ通知用デバイストークン管理テーブル
CREATE TABLE "UserPushToken" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, expo_push_token)
);

ALTER TABLE "UserPushToken" ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー: 認証済みユーザーは自分のトークンのみ操作可能
CREATE POLICY "Users can manage their own push tokens"
  ON "UserPushToken"
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_user_push_token_user_id ON "UserPushToken"(user_id);
