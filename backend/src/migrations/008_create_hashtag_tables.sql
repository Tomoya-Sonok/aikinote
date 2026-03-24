-- ============================================
-- 008: ハッシュタグテーブル作成
-- ============================================
-- 投稿にハッシュタグ（#合気道 等）を付与する機能のための
-- テーブル・インデックス・RLSポリシーを追加する。
-- 既存テーブルへの変更はなく、後方互換性を維持する。

-- ============================================
-- 1. Hashtag マスタテーブル
-- ============================================
CREATE TABLE "Hashtag" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,  -- '#' を含まない正規化済み名称
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hashtag_name ON "Hashtag"(name);

-- ============================================
-- 2. SocialPost ↔ Hashtag M:N 中間テーブル
-- ============================================
CREATE TABLE "SocialPostHashtag" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES "SocialPost"(id) ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES "Hashtag"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, hashtag_id)
);

CREATE INDEX idx_social_post_hashtag_post_id ON "SocialPostHashtag"(post_id);
CREATE INDEX idx_social_post_hashtag_hashtag_id ON "SocialPostHashtag"(hashtag_id);
CREATE INDEX idx_social_post_hashtag_created_at ON "SocialPostHashtag"(created_at DESC);

-- ============================================
-- 3. RLS 有効化
-- ============================================
ALTER TABLE "Hashtag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SocialPostHashtag" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. Hashtag RLS ポリシー
-- ============================================
-- SELECT: 全認証ユーザーが読み取り可（トレンド表示・検索用）
CREATE POLICY "hashtag_select" ON "Hashtag"
  FOR SELECT TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE は SERVICE_ROLE_KEY 経由（バックエンド）のみ

-- ============================================
-- 5. SocialPostHashtag RLS ポリシー
-- ============================================
-- SELECT: 投稿が閲覧可能ならハッシュタグも閲覧可
CREATE POLICY "social_post_hashtag_select" ON "SocialPostHashtag"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "SocialPost"
      WHERE "SocialPost".id = post_id
        AND "SocialPost".is_deleted = false
        AND (
          "SocialPost".user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM "User"
            WHERE "User".id = "SocialPost".user_id
              AND "User".publicity_setting = 'public'
          )
        )
    )
  );

-- INSERT: 自分の投稿にのみハッシュタグ追加可
CREATE POLICY "social_post_hashtag_insert" ON "SocialPostHashtag"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "SocialPost"
      WHERE "SocialPost".id = post_id
        AND "SocialPost".user_id = auth.uid()
    )
  );

-- DELETE: 自分の投稿のハッシュタグのみ削除可
CREATE POLICY "social_post_hashtag_delete" ON "SocialPostHashtag"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "SocialPost"
      WHERE "SocialPost".id = post_id
        AND "SocialPost".user_id = auth.uid()
    )
  );
