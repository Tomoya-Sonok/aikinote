-- ============================================
-- Phase 1 補足: ソーシャルテーブル RLS 有効化
-- ============================================
-- バックエンドは SERVICE_ROLE_KEY（RLSバイパス）で動作するため、
-- これらのポリシーはフロントエンドの ANON_KEY 経由での
-- 直接アクセスに対する防御層として機能する。

-- ============================================
-- 1. RLS 有効化
-- ============================================
ALTER TABLE "SocialPost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SocialPostAttachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SocialPostTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SocialReply" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SocialFavorite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PostReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NgWord" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. SocialPost ポリシー
-- ============================================
-- SELECT: 投稿者の publicity_setting が public、または自分の投稿
-- ※ visibility カラムは 004 で廃止済み。User.publicity_setting で判定する。
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

-- INSERT: 自分の投稿のみ作成可
CREATE POLICY "social_post_insert" ON "SocialPost"
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: 自分の投稿のみ更新可
CREATE POLICY "social_post_update" ON "SocialPost"
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: 自分の投稿のみ削除可
CREATE POLICY "social_post_delete" ON "SocialPost"
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- 3. SocialPostAttachment ポリシー
-- ============================================
-- SELECT: 投稿が閲覧可能なら添付も閲覧可
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

-- INSERT: 自分の添付のみ作成可
CREATE POLICY "social_post_attachment_insert" ON "SocialPostAttachment"
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- DELETE: 自分の添付のみ削除可
CREATE POLICY "social_post_attachment_delete" ON "SocialPostAttachment"
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- 4. SocialPostTag ポリシー
-- ============================================
-- SELECT: 投稿が閲覧可能ならタグも閲覧可
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

-- INSERT: 自分の投稿にのみタグ追加可
CREATE POLICY "social_post_tag_insert" ON "SocialPostTag"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "SocialPost"
      WHERE "SocialPost".id = post_id
        AND "SocialPost".user_id = auth.uid()
    )
  );

-- DELETE: 自分の投稿のタグのみ削除可
CREATE POLICY "social_post_tag_delete" ON "SocialPostTag"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "SocialPost"
      WHERE "SocialPost".id = post_id
        AND "SocialPost".user_id = auth.uid()
    )
  );

-- ============================================
-- 5. SocialReply ポリシー
-- ============================================
-- SELECT: 削除されていない返信は閲覧可（投稿の公開範囲に依存）
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

-- INSERT: 認証ユーザーは自分として返信可
CREATE POLICY "social_reply_insert" ON "SocialReply"
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: 自分の返信のみ更新可
CREATE POLICY "social_reply_update" ON "SocialReply"
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- 6. SocialFavorite ポリシー
-- ============================================
-- SELECT: 自分のお気に入りのみ閲覧可
CREATE POLICY "social_favorite_select" ON "SocialFavorite"
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- INSERT: 自分としてのみお気に入り可
CREATE POLICY "social_favorite_insert" ON "SocialFavorite"
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- DELETE: 自分のお気に入りのみ解除可
CREATE POLICY "social_favorite_delete" ON "SocialFavorite"
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- 7. Notification ポリシー
-- ============================================
-- SELECT: 自分宛の通知のみ閲覧可
CREATE POLICY "notification_select" ON "Notification"
  FOR SELECT TO authenticated
  USING (recipient_user_id = auth.uid());

-- INSERT: 認証ユーザーは通知を作成可（actor として）
CREATE POLICY "notification_insert" ON "Notification"
  FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = auth.uid());

-- UPDATE: 自分宛の通知のみ既読化可
CREATE POLICY "notification_update" ON "Notification"
  FOR UPDATE TO authenticated
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

-- DELETE: 自分が作成した通知のみ削除可（お気に入り解除時）
CREATE POLICY "notification_delete" ON "Notification"
  FOR DELETE TO authenticated
  USING (actor_user_id = auth.uid());

-- ============================================
-- 8. PostReport ポリシー
-- ============================================
-- SELECT: 自分の通報のみ閲覧可
CREATE POLICY "post_report_select" ON "PostReport"
  FOR SELECT TO authenticated
  USING (reporter_user_id = auth.uid());

-- INSERT: 自分としてのみ通報可
CREATE POLICY "post_report_insert" ON "PostReport"
  FOR INSERT TO authenticated
  WITH CHECK (reporter_user_id = auth.uid());

-- ============================================
-- 9. NgWord ポリシー
-- ============================================
-- SELECT: 認証ユーザーは読み取り可（NGワードチェック用）
CREATE POLICY "ng_word_select" ON "NgWord"
  FOR SELECT TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE は不可（管理者のみ SERVICE_ROLE_KEY 経由で操作）
