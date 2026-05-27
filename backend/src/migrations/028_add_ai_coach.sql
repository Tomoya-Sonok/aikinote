-- 028_add_ai_coach.sql
-- #281 AIコーチ（RAG）:
--   蓄積した稽古記録をソースに質問へ回答する AIコーチのチャット機能。
--   会話スレッドを複数持てるように AiChatConversation / AiChatMessage を新設し、
--   利用回数の分析・Free ゲーティング用に User へ ai_chat_usage_count を追加する。

-- 1. User に生涯メッセージ送信数を追加（Free/Premium 問わず加算。分析 + Free 制限の参照に使う）
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS ai_chat_usage_count INTEGER NOT NULL DEFAULT 0;

-- 2. AiChatConversation: 会話スレッド（ChatGPT風に複数保持）
CREATE TABLE IF NOT EXISTS "AiChatConversation" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. AiChatMessage: 会話内のメッセージ（user / assistant）
CREATE TABLE IF NOT EXISTS "AiChatMessage" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES "AiChatConversation"(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ai_chat_message_role_check CHECK (role IN ('user', 'assistant'))
);

-- 4. RLS有効化
ALTER TABLE "AiChatConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiChatMessage" ENABLE ROW LEVEL SECURITY;

-- AiChatConversation: 所有者のみ
CREATE POLICY "Users can view own conversations"
  ON "AiChatConversation"
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own conversations"
  ON "AiChatConversation"
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own conversations"
  ON "AiChatConversation"
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own conversations"
  ON "AiChatConversation"
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access on AiChatConversation"
  ON "AiChatConversation"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- AiChatMessage: 親会話の所有者のみ
CREATE POLICY "Users can view own messages"
  ON "AiChatMessage"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "AiChatConversation" c
      WHERE c.id = "AiChatMessage".conversation_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own messages"
  ON "AiChatMessage"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "AiChatConversation" c
      WHERE c.id = "AiChatMessage".conversation_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own messages"
  ON "AiChatMessage"
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "AiChatConversation" c
      WHERE c.id = "AiChatMessage".conversation_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on AiChatMessage"
  ON "AiChatMessage"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. インデックス
CREATE INDEX IF NOT EXISTS idx_ai_chat_conversation_user_id
  ON "AiChatConversation" (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_chat_message_conversation_id
  ON "AiChatMessage" (conversation_id, created_at);
-- Premium の日次カウント（当日の user メッセージ数）集計用
CREATE INDEX IF NOT EXISTS idx_ai_chat_message_created_at
  ON "AiChatMessage" (role, created_at);
