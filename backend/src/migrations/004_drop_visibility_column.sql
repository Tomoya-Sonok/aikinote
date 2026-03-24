-- ============================================
-- Phase 1.1: visibility カラム廃止
-- User.publicity_setting を常にJOINして公開範囲を判定する方式に変更
-- ============================================

-- ============================================
-- 1. visibility を参照している RLS ポリシーを削除
-- ============================================
DROP POLICY IF EXISTS "social_post_select" ON "SocialPost";
DROP POLICY IF EXISTS "social_post_attachment_select" ON "SocialPostAttachment";
DROP POLICY IF EXISTS "social_post_tag_select" ON "SocialPostTag";
DROP POLICY IF EXISTS "social_reply_select" ON "SocialReply";

-- ============================================
-- 2. visibility カラムを削除
-- ============================================
ALTER TABLE "SocialPost" DROP COLUMN IF EXISTS visibility;

-- ============================================
-- 3. 旧インデックス削除 → 新インデックス作成
-- ============================================
DROP INDEX IF EXISTS idx_social_post_feed;
CREATE INDEX idx_social_post_feed ON "SocialPost"(created_at DESC) WHERE is_deleted = false;

-- ============================================
-- 4. RLS ポリシーを User.publicity_setting ベースで再作成
-- ============================================

-- SocialPost SELECT: 投稿者の publicity_setting が public、または自分の投稿
CREATE POLICY "social_post_select" ON "SocialPost"
  FOR SELECT TO authenticated
  USING (
    is_deleted = false
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM "User"
        WHERE "User".id = user_id
          AND "User".publicity_setting = 'public'
      )
    )
  );

-- SocialPostAttachment SELECT: 投稿が閲覧可能なら添付も閲覧可
CREATE POLICY "social_post_attachment_select" ON "SocialPostAttachment"
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

-- SocialPostTag SELECT: 投稿が閲覧可能ならタグも閲覧可
CREATE POLICY "social_post_tag_select" ON "SocialPostTag"
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

-- SocialReply SELECT: 投稿が閲覧可能なら返信も閲覧可
CREATE POLICY "social_reply_select" ON "SocialReply"
  FOR SELECT TO authenticated
  USING (
    is_deleted = false
    AND EXISTS (
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

-- ============================================
-- 5. get_social_feed() 関数を再定義（User.publicity_setting JOIN方式）
--    戻り値の型が変わるため DROP してから再作成
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
      OR (u.publicity_setting = 'closed' AND sp.author_dojo_style_id = viewer_dojo_style_id)
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
