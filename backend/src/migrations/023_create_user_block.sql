-- 023_create_user_block.sql
-- ユーザーブロック機能: UserBlockテーブルの新設
-- Apple App Review Guideline 1.2 (UGC) 対応

-- 1. UserBlockテーブル作成
CREATE TABLE IF NOT EXISTS "UserBlock" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT unique_user_block UNIQUE (blocker_user_id, blocked_user_id),
  CONSTRAINT cannot_self_block CHECK (blocker_user_id <> blocked_user_id)
);

-- 2. RLS有効化
ALTER TABLE "UserBlock" ENABLE ROW LEVEL SECURITY;

-- authenticatedロール用ポリシー
-- 自分のブロックリストのみ閲覧可能（被ブロック側は自分がブロックされている事実を認識できない）
CREATE POLICY "Users can view own blocks"
  ON "UserBlock"
  FOR SELECT
  TO authenticated
  USING (blocker_user_id = auth.uid());

CREATE POLICY "Users can insert own blocks"
  ON "UserBlock"
  FOR INSERT
  TO authenticated
  WITH CHECK (blocker_user_id = auth.uid());

CREATE POLICY "Users can delete own blocks"
  ON "UserBlock"
  FOR DELETE
  TO authenticated
  USING (blocker_user_id = auth.uid());

-- service_roleフルアクセス（Hono backend が SERVICE_ROLE_KEY で双方向ブロック判定を行うため必須）
CREATE POLICY "Service role full access on UserBlock"
  ON "UserBlock"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. インデックス（双方向ルックアップ用）
CREATE INDEX idx_user_block_blocker_id ON "UserBlock" (blocker_user_id);
CREATE INDEX idx_user_block_blocked_id ON "UserBlock" (blocked_user_id);
