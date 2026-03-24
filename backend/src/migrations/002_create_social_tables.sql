-- ============================================
-- Phase 1: ソーシャル投稿機能テーブル群
-- ============================================

-- 1. SocialPost — 投稿本体
CREATE TABLE "SocialPost" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES "User"(id),
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  post_type TEXT NOT NULL CHECK (post_type IN ('post', 'training_record')),
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'closed', 'private')),
  author_dojo_style_id UUID REFERENCES "DojoStyleMaster"(id),
  author_dojo_name TEXT,
  favorite_count INTEGER NOT NULL DEFAULT 0,
  reply_count INTEGER NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  source_page_id UUID REFERENCES "TrainingPage"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_social_post_user_id ON "SocialPost"(user_id);
CREATE INDEX idx_social_post_feed ON "SocialPost"(visibility, created_at DESC) WHERE is_deleted = false;
CREATE INDEX idx_social_post_source_page ON "SocialPost"(source_page_id) WHERE source_page_id IS NOT NULL;

-- 2. SocialPostAttachment — 投稿添付ファイル
CREATE TABLE "SocialPostAttachment" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES "SocialPost"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES "User"(id),
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'youtube')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  original_filename TEXT,
  file_size_bytes BIGINT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_social_post_attachment_post_id ON "SocialPostAttachment"(post_id);

-- 3. SocialPostTag — 投稿タグ M:N結合
CREATE TABLE "SocialPostTag" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES "SocialPost"(id) ON DELETE CASCADE,
  user_tag_id UUID NOT NULL REFERENCES "UserTag"(id),
  UNIQUE(post_id, user_tag_id)
);

CREATE INDEX idx_social_post_tag_post_id ON "SocialPostTag"(post_id);

-- 4. SocialReply — 返信
CREATE TABLE "SocialReply" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES "SocialPost"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES "User"(id),
  content TEXT NOT NULL CHECK (char_length(content) <= 1000),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_social_reply_post_id ON "SocialReply"(post_id, created_at) WHERE is_deleted = false;

-- 5. SocialFavorite — お気に入り
CREATE TABLE "SocialFavorite" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES "SocialPost"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES "User"(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX idx_social_favorite_post_id ON "SocialFavorite"(post_id);
CREATE INDEX idx_social_favorite_user_id ON "SocialFavorite"(user_id);

-- 6. Notification — 通知
CREATE TABLE "Notification" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('favorite', 'reply', 'reply_to_thread')),
  recipient_user_id UUID NOT NULL REFERENCES "User"(id),
  actor_user_id UUID NOT NULL REFERENCES "User"(id),
  post_id UUID REFERENCES "SocialPost"(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES "SocialReply"(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_recipient ON "Notification"(recipient_user_id, is_read, created_at DESC);

-- 7. PostReport — 通報
CREATE TABLE "PostReport" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_user_id UUID NOT NULL REFERENCES "User"(id),
  post_id UUID REFERENCES "SocialPost"(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES "SocialReply"(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'other')),
  detail TEXT CHECK (detail IS NULL OR char_length(detail) <= 500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (post_id IS NOT NULL AND reply_id IS NULL)
    OR (post_id IS NULL AND reply_id IS NOT NULL)
  )
);

-- 8. NgWord — NGワードマスタ
CREATE TABLE "NgWord" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NGワード SEED データ
INSERT INTO "NgWord" (word) VALUES
  ('死ね'),
  ('殺す'),
  ('殺してやる'),
  ('消えろ'),
  ('きもい'),
  ('うざい'),
  ('ばか'),
  ('あほ'),
  ('くたばれ'),
  ('ゴミ'),
  ('カス'),
  ('クズ'),
  ('ブス'),
  ('デブ'),
  ('ハゲ'),
  ('fuck'),
  ('shit'),
  ('damn'),
  ('bitch'),
  ('asshole'),
  ('bastard'),
  ('nigger'),
  ('faggot'),
  ('retard'),
  ('cunt')
ON CONFLICT (word) DO NOTHING;

-- ============================================
-- PostgreSQL関数 & トリガー
-- ============================================

-- favorite_count 自動更新関数
CREATE OR REPLACE FUNCTION update_favorite_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE "SocialPost"
    SET favorite_count = favorite_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE "SocialPost"
    SET favorite_count = GREATEST(favorite_count - 1, 0)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_favorite_count
AFTER INSERT OR DELETE ON "SocialFavorite"
FOR EACH ROW EXECUTE FUNCTION update_favorite_count();

-- reply_count 自動更新関数
CREATE OR REPLACE FUNCTION update_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_deleted = false THEN
      UPDATE "SocialPost"
      SET reply_count = reply_count + 1
      WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.is_deleted = false THEN
      UPDATE "SocialPost"
      SET reply_count = GREATEST(reply_count - 1, 0)
      WHERE id = OLD.post_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
      UPDATE "SocialPost"
      SET reply_count = GREATEST(reply_count - 1, 0)
      WHERE id = NEW.post_id;
    ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
      UPDATE "SocialPost"
      SET reply_count = reply_count + 1
      WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reply_count
AFTER INSERT OR DELETE OR UPDATE OF is_deleted ON "SocialReply"
FOR EACH ROW EXECUTE FUNCTION update_reply_count();

-- ============================================
-- フィードスコア関数
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
  visibility TEXT,
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
    sp.visibility,
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
  LEFT JOIN "SocialFavorite" sf
    ON sf.post_id = sp.id AND sf.user_id = viewer_user_id
  WHERE sp.is_deleted = false
    AND (
      sp.visibility = 'public'
      OR (sp.visibility = 'closed' AND sp.author_dojo_style_id = viewer_dojo_style_id)
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
