-- 029_create_trending_hashtags_rpc.sql
-- トレンドハッシュタグ集計をクライアント JS から DB に移管:
--   従来は直近 30 日分の SocialPostHashtag を全件 Cloudflare Workers にロードして
--   JS の Map で集計していた。投稿が増えるほど線形に重くなるため、
--   GROUP BY + DENSE_RANK で DB 側に集計させる。
--
-- 既存実装との互換性:
--   top_n 位までを返すが、同率タイは全件含めて返す（既存 cutoffCount ロジックの再現）。
--   例: top_n = 10、10 位の count = 3 と同じ件数のハッシュタグが他に 4 件あれば、合計 14 件返す。

CREATE OR REPLACE FUNCTION get_trending_hashtags(
  days_back INT,
  top_n INT
)
RETURNS TABLE(name TEXT, count BIGINT)
LANGUAGE SQL
STABLE
AS $$
  WITH ranked AS (
    SELECT
      h.name AS name,
      COUNT(*) AS count,
      DENSE_RANK() OVER (ORDER BY COUNT(*) DESC) AS rnk
    FROM "SocialPostHashtag" sph
    JOIN "Hashtag" h ON sph.hashtag_id = h.id
    JOIN "SocialPost" sp ON sph.post_id = sp.id
    WHERE sp.is_deleted = false
      AND sph.created_at >= NOW() - (days_back || ' days')::INTERVAL
    GROUP BY h.name
  )
  SELECT name, count
  FROM ranked
  WHERE rnk <= top_n
  ORDER BY count DESC, name ASC;
$$;
