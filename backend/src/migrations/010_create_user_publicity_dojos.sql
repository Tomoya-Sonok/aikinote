-- ============================================
-- 1. UserPublicityDojo テーブル作成
--    "closed" ユーザーが公開対象に選んだ道場の多対多リレーション
-- ============================================
CREATE TABLE IF NOT EXISTS "UserPublicityDojo" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  dojo_style_id UUID NOT NULL REFERENCES "DojoStyleMaster"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, dojo_style_id)
);

CREATE INDEX IF NOT EXISTS idx_user_publicity_dojo_user_id ON "UserPublicityDojo"(user_id);

-- ============================================
-- 2. RLS ポリシー
-- ============================================
ALTER TABLE "UserPublicityDojo" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_publicity_dojo_select" ON "UserPublicityDojo"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_publicity_dojo_insert" ON "UserPublicityDojo"
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_publicity_dojo_delete" ON "UserPublicityDojo"
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================
-- 3. 既存データ移行
--    publicity_setting = 'closed' かつ dojo_style_id が登録済みの
--    ユーザーの所属道場を UserPublicityDojo に INSERT（後方互換性）
-- ============================================
INSERT INTO "UserPublicityDojo" (user_id, dojo_style_id)
SELECT id, dojo_style_id FROM "User"
WHERE publicity_setting = 'closed' AND dojo_style_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. get_social_feed() RPC関数を更新
--    "closed" の判定を UserPublicityDojo 経由に変更
-- ============================================
DROP FUNCTION IF EXISTS get_social_feed(UUID, UUID, TEXT, INT, INT);
CREATE OR REPLACE FUNCTION get_social_feed(
  viewer_user_id UUID,
  viewer_dojo_style_id UUID,
  tab_filter TEXT,
  feed_limit INT,
  feed_offset INT
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  content TEXT,
  post_type TEXT,
  author_dojo_style_id UUID,
  author_dojo_name TEXT,
  favorite_count INT,
  reply_count INT,
  source_page_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  feed_score DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id,
    sp.user_id,
    sp.content,
    sp.post_type,
    sp.author_dojo_style_id,
    sp.author_dojo_name,
    sp.favorite_count,
    sp.reply_count,
    sp.source_page_id,
    sp.created_at,
    sp.updated_at,
    (
      EXTRACT(EPOCH FROM sp.created_at) / 3600.0
      + sp.favorite_count * 2
      + sp.reply_count * 3
      + CASE
          WHEN sp.created_at > now() - INTERVAL '24 hours' THEN 50
          WHEN sp.created_at > now() - INTERVAL '72 hours' THEN 20
          ELSE 0
        END
    )::DOUBLE PRECISION AS feed_score
  FROM "SocialPost" sp
  JOIN "User" u ON u.id = sp.user_id
  LEFT JOIN "SocialFavorite" sf
    ON sf.post_id = sp.id AND sf.user_id = viewer_user_id
  WHERE sp.is_deleted = false
    AND (
      u.publicity_setting = 'public'
      OR (
        u.publicity_setting = 'closed'
        AND viewer_dojo_style_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM "UserPublicityDojo" upd
          WHERE upd.user_id = sp.user_id
            AND upd.dojo_style_id = viewer_dojo_style_id
        )
      )
      OR sp.user_id = viewer_user_id
    )
    AND (
      tab_filter = 'all'
      OR (tab_filter = 'training' AND sp.post_type = 'training_record')
      OR (tab_filter = 'favorites' AND sf.id IS NOT NULL)
    )
  ORDER BY feed_score DESC
  LIMIT feed_limit
  OFFSET feed_offset;
END;
$$ LANGUAGE plpgsql;
