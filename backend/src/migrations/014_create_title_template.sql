-- タイトルテンプレートテーブル
-- ユーザーが稽古記録のタイトルを素早く入力するための保存済みテンプレート
CREATE TABLE IF NOT EXISTS "TitleTemplate" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  template_text TEXT NOT NULL,
  date_format TEXT DEFAULT NULL,
  sort_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_title_template_user_id ON "TitleTemplate"(user_id);

ALTER TABLE "TitleTemplate" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "title_template_select_own" ON "TitleTemplate"
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "title_template_insert_own" ON "TitleTemplate"
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "title_template_delete_own" ON "TitleTemplate"
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
