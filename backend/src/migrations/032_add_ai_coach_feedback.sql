-- 032_add_ai_coach_feedback.sql
-- AIコーチのフィードバック収集:
--   チャット（会話）単位でユーザーから「役に立つ！ / 何とも言えない / イマイチ...」の
--   フィードバックを1回だけ回収する。回収後は同じ会話では二度と表示しない。
--
-- カラム:
--   feedback            : フィードバック結果（'good' | 'neutral' | 'bad'、未回答は NULL）
--   is_feedback_visible : フィードバック UI の表示有無（回答時に false へ更新）
--
-- 適用方法:
--   Supabase ダッシュボード → SQL Editor で本ファイルの内容をそのまま実行する。

ALTER TABLE "AiChatConversation"
  ADD COLUMN IF NOT EXISTS feedback TEXT,
  ADD COLUMN IF NOT EXISTS is_feedback_visible BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "AiChatConversation"
  DROP CONSTRAINT IF EXISTS ai_chat_conversation_feedback_check;
ALTER TABLE "AiChatConversation"
  ADD CONSTRAINT ai_chat_conversation_feedback_check
  CHECK (feedback IS NULL OR feedback IN ('good', 'neutral', 'bad'));

-- RLS は 028 で定義済みの所有者ポリシー（SELECT / UPDATE とも user_id = auth.uid()）が
-- 本カラムにもそのまま適用されるため、追加のポリシーは不要。

-- 確認クエリ（適用後に実行して 2 行返ることを確認する）:
-- SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--  WHERE table_name = 'AiChatConversation'
--    AND column_name IN ('feedback', 'is_feedback_visible');
