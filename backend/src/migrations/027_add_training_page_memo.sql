-- 027_add_training_page_memo.sql
-- #280 タグごとの稽古記録:
--   稽古記録ページに「タグごとにメモ入力」モードを追加するための
--   入力モード列 + タグメモ用テーブル（TrainingPageMemo / TrainingPageMemoTag）の新設。
--   既存の「自由入力」は TrainingPage.content をそのまま使う。
--   tag_based モードのページでは content には空文字を保存し、メモ本文は TrainingPageMemo に持つ。

-- 1. TrainingPage に入力モード列を追加（'free' = 自由入力 / 'tag_based' = タグごとのメモ）
ALTER TABLE "TrainingPage"
  ADD COLUMN IF NOT EXISTS content_mode TEXT NOT NULL DEFAULT 'free';

ALTER TABLE "TrainingPage"
  DROP CONSTRAINT IF EXISTS training_page_content_mode_check;
ALTER TABLE "TrainingPage"
  ADD CONSTRAINT training_page_content_mode_check
  CHECK (content_mode IN ('free', 'tag_based'));

-- 2. TrainingPageMemo: タグごとのメモ本体（1ページに複数件、最大件数はアプリ側で制御）
CREATE TABLE IF NOT EXISTS "TrainingPageMemo" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_page_id uuid NOT NULL REFERENCES "TrainingPage"(id) ON DELETE CASCADE,
  content text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT memo_content_length CHECK (char_length(content) BETWEEN 1 AND 500)
);

-- 3. TrainingPageMemoTag: メモ ↔ タグ（1メモにつき1〜3タグ、上限はアプリ側で制御）
CREATE TABLE IF NOT EXISTS "TrainingPageMemoTag" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_page_memo_id uuid NOT NULL REFERENCES "TrainingPageMemo"(id) ON DELETE CASCADE,
  user_tag_id uuid NOT NULL REFERENCES "UserTag"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT unique_memo_tag UNIQUE (training_page_memo_id, user_tag_id)
);

-- 4. RLS有効化
ALTER TABLE "TrainingPageMemo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TrainingPageMemoTag" ENABLE ROW LEVEL SECURITY;

-- TrainingPageMemo: 親 TrainingPage の所有者のみ操作可能
CREATE POLICY "Users can view own page memos"
  ON "TrainingPageMemo"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "TrainingPage" tp
      WHERE tp.id = "TrainingPageMemo".training_page_id
        AND tp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own page memos"
  ON "TrainingPageMemo"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "TrainingPage" tp
      WHERE tp.id = "TrainingPageMemo".training_page_id
        AND tp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own page memos"
  ON "TrainingPageMemo"
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "TrainingPage" tp
      WHERE tp.id = "TrainingPageMemo".training_page_id
        AND tp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "TrainingPage" tp
      WHERE tp.id = "TrainingPageMemo".training_page_id
        AND tp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own page memos"
  ON "TrainingPageMemo"
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "TrainingPage" tp
      WHERE tp.id = "TrainingPageMemo".training_page_id
        AND tp.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on TrainingPageMemo"
  ON "TrainingPageMemo"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- TrainingPageMemoTag: メモ → 親 TrainingPage の所有者のみ操作可能
CREATE POLICY "Users can view own memo tags"
  ON "TrainingPageMemoTag"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "TrainingPageMemo" m
      JOIN "TrainingPage" tp ON tp.id = m.training_page_id
      WHERE m.id = "TrainingPageMemoTag".training_page_memo_id
        AND tp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own memo tags"
  ON "TrainingPageMemoTag"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "TrainingPageMemo" m
      JOIN "TrainingPage" tp ON tp.id = m.training_page_id
      WHERE m.id = "TrainingPageMemoTag".training_page_memo_id
        AND tp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own memo tags"
  ON "TrainingPageMemoTag"
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "TrainingPageMemo" m
      JOIN "TrainingPage" tp ON tp.id = m.training_page_id
      WHERE m.id = "TrainingPageMemoTag".training_page_memo_id
        AND tp.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on TrainingPageMemoTag"
  ON "TrainingPageMemoTag"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. インデックス
CREATE INDEX IF NOT EXISTS idx_training_page_memo_page_id
  ON "TrainingPageMemo"(training_page_id);
CREATE INDEX IF NOT EXISTS idx_training_page_memo_tag_memo_id
  ON "TrainingPageMemoTag"(training_page_memo_id);
CREATE INDEX IF NOT EXISTS idx_training_page_memo_tag_tag_id
  ON "TrainingPageMemoTag"(user_tag_id);
