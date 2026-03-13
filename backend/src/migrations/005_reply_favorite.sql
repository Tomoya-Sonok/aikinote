-- 005_reply_favorite.sql
-- 返信（SocialReply）へのお気に入り機能追加

-- 1. SocialReply に favorite_count カラムを追加
ALTER TABLE "SocialReply"
  ADD COLUMN IF NOT EXISTS favorite_count INTEGER NOT NULL DEFAULT 0;

-- 2. SocialFavorite に reply_id カラムを追加
ALTER TABLE "SocialFavorite"
  ADD COLUMN IF NOT EXISTS reply_id UUID REFERENCES "SocialReply"(id) ON DELETE CASCADE;

-- 3. SocialFavorite.post_id の NOT NULL 制約を外す
ALTER TABLE "SocialFavorite"
  ALTER COLUMN post_id DROP NOT NULL;

-- 4. 既存の UNIQUE 制約を DROP（post_id, user_id）
ALTER TABLE "SocialFavorite"
  DROP CONSTRAINT IF EXISTS "SocialFavorite_post_id_user_id_key";

-- 5. 部分ユニークインデックスを作成
CREATE UNIQUE INDEX IF NOT EXISTS uq_favorite_post
  ON "SocialFavorite"(post_id, user_id) WHERE post_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_favorite_reply
  ON "SocialFavorite"(reply_id, user_id) WHERE reply_id IS NOT NULL;

-- 6. CHECK 制約追加: post_id / reply_id の排他保証
ALTER TABLE "SocialFavorite"
  ADD CONSTRAINT chk_favorite_target CHECK (
    (post_id IS NOT NULL AND reply_id IS NULL) OR
    (post_id IS NULL AND reply_id IS NOT NULL)
  );

-- 7. reply_id 用インデックス追加
CREATE INDEX IF NOT EXISTS idx_social_favorite_reply_id
  ON "SocialFavorite"(reply_id) WHERE reply_id IS NOT NULL;

-- 8. update_favorite_count() 関数を更新 — reply_id 分岐を追加
CREATE OR REPLACE FUNCTION update_favorite_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.post_id IS NOT NULL THEN
      UPDATE "SocialPost"
        SET favorite_count = favorite_count + 1
        WHERE id = NEW.post_id;
    ELSIF NEW.reply_id IS NOT NULL THEN
      UPDATE "SocialReply"
        SET favorite_count = favorite_count + 1
        WHERE id = NEW.reply_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.post_id IS NOT NULL THEN
      UPDATE "SocialPost"
        SET favorite_count = GREATEST(favorite_count - 1, 0)
        WHERE id = OLD.post_id;
    ELSIF OLD.reply_id IS NOT NULL THEN
      UPDATE "SocialReply"
        SET favorite_count = GREATEST(favorite_count - 1, 0)
        WHERE id = OLD.reply_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 既存トリガー trigger_update_favorite_count はそのまま動く

-- 9. Notification の type CHECK 制約を更新（'favorite_reply' を追加）
ALTER TABLE "Notification"
  DROP CONSTRAINT IF EXISTS notification_type_check;

ALTER TABLE "Notification"
  ADD CONSTRAINT notification_type_check CHECK (
    type IN ('favorite', 'reply', 'reply_to_thread', 'favorite_reply')
  );

-- 10. RLS: SocialFavorite の既存ポリシーは post_id / user_id ベースだが、
-- reply_id でも同じパターンで動作する（auth.uid() = user_id）
-- 追加ポリシーは不要（既存ポリシーでカバー済み）
