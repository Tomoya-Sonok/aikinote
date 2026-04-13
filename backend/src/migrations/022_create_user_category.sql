-- 022_create_user_category.sql
-- カスタムカテゴリ機能: UserCategoryテーブルの新設

-- 1. UserCategoryテーブル作成
CREATE TABLE IF NOT EXISTS "UserCategory" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT unique_user_category_name UNIQUE (user_id, name),
  CONSTRAINT unique_user_category_slug UNIQUE (user_id, slug),
  CONSTRAINT category_name_length CHECK (char_length(name) BETWEEN 1 AND 10),
  CONSTRAINT category_slug_length CHECK (char_length(slug) BETWEEN 1 AND 20)
);

-- 2. RLS有効化
ALTER TABLE "UserCategory" ENABLE ROW LEVEL SECURITY;

-- authenticatedロール用ポリシー
CREATE POLICY "Users can view own categories"
  ON "UserCategory"
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own categories"
  ON "UserCategory"
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own categories"
  ON "UserCategory"
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own categories"
  ON "UserCategory"
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- service_roleフルアクセス
CREATE POLICY "Service role full access on UserCategory"
  ON "UserCategory"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. インデックス
CREATE INDEX idx_user_category_user_id ON "UserCategory" (user_id);
CREATE INDEX idx_user_category_sort_order ON "UserCategory" (user_id, sort_order);

-- 4. 既存ユーザーデータマイグレーション
-- UserTagテーブルに存在するuser_idごとにデフォルト3カテゴリを作成
INSERT INTO "UserCategory" (user_id, name, slug, sort_order, is_default)
SELECT DISTINCT
  ut.user_id,
  v.name,
  v.slug,
  v.sort_order,
  true
FROM "UserTag" ut
CROSS JOIN (
  VALUES
    ('取り'::text, 'tori'::text, 1),
    ('受け'::text, 'uke'::text, 2),
    ('技'::text, 'waza'::text, 3)
) AS v(name, slug, sort_order)
ON CONFLICT (user_id, name) DO NOTHING;
