-- 007_add_page_is_public.sql
-- 稽古記録の公開機能: TrainingPage に is_public カラム追加

ALTER TABLE "TrainingPage"
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

-- 公開ページ検索用の部分インデックス
CREATE INDEX IF NOT EXISTS idx_training_page_is_public
  ON "TrainingPage"(user_id, is_public)
  WHERE is_public = TRUE;
