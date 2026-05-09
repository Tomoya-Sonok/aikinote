-- ============================================
-- 024_filter_blocked_users_in_feed.sql
-- get_social_feed 関数を双方向のブロック除外付きに更新
-- Apple App Review Guideline 1.2 (UGC) 対応
--
-- 015 で更新された関数定義をベースに、WHERE 句に「viewer → 投稿主」「投稿主 → viewer」
-- 双方向の UserBlock 除外を追加。スコアリングロジック等は 015 から変更なし。
-- ============================================
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
      -- 鮮度ボーナス（なだらかな4段階）
      + CASE
          WHEN sp.created_at > now() - INTERVAL '6 hours'  THEN 60
          WHEN sp.created_at > now() - INTERVAL '24 hours' THEN 45
          WHEN sp.created_at > now() - INTERVAL '72 hours' THEN 25
          WHEN sp.created_at > now() - INTERVAL '7 days'   THEN 10
          ELSE 0
        END
      -- 新規ユーザーブースト
      + CASE
          WHEN u.created_at > now() - INTERVAL '14 days' THEN 30
          WHEN u.created_at > now() - INTERVAL '30 days' THEN 15
          ELSE 0
        END
      -- ランダムジッター（表示順の多様性確保）
      + (random() * 15)
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
    -- ブロック関係の除外（双方向）: viewer がブロックした相手 / viewer をブロックした相手の投稿は表示しない
    AND NOT EXISTS (
      SELECT 1 FROM "UserBlock" ub1
      WHERE ub1.blocker_user_id = viewer_user_id
        AND ub1.blocked_user_id = sp.user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM "UserBlock" ub2
      WHERE ub2.blocker_user_id = sp.user_id
        AND ub2.blocked_user_id = viewer_user_id
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
