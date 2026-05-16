-- マイグレーション 026: PageAttachment テーブルに updated_at カラムを追加
--
-- 背景:
--   ネイティブアプリ版 AikiNote の SQLite × Supabase 同期エンジンで
--   pullAttachments を追加する。LWW (Last-Write-Wins) 競合解決のため
--   PageAttachment から updated_at を SELECT する必要があるが、
--   現状の Supabase スキーマには updated_at カラムが無いため、
--   migration 025 と同じパターンで追加する。
--
-- 方針:
--   ADD COLUMN IF NOT EXISTS で非破壊的に追加し、既存行は
--   created_at の値で埋め戻す。BEFORE UPDATE トリガーで自動更新。
--   set_updated_at_to_now() は migration 025 で定義済み。

ALTER TABLE "PageAttachment"
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE "PageAttachment"
SET updated_at = created_at
WHERE updated_at IS DISTINCT FROM created_at;

DROP TRIGGER IF EXISTS trigger_page_attachment_updated_at ON "PageAttachment";
CREATE TRIGGER trigger_page_attachment_updated_at
  BEFORE UPDATE ON "PageAttachment"
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_to_now();
