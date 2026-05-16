-- マイグレーション 025: ネイティブアプリ SQLite 同期に必要な updated_at カラムを追加
--
-- 背景:
--   ネイティブアプリ版 AikiNote の SQLite × Supabase 同期エンジン
--   (aikinote-native-app/lib/sync/pull.ts) は LWW (Last-Write-Wins)
--   競合解決のために各テーブルから updated_at を SELECT する。しかし
--   UserCategory / UserTag / TrainingPageTag / TrainingDate には
--   現状 updated_at カラムが存在せず、初回 full pull で
--   "column UserCategory.updated_at does not exist" のような
--   PostgREST エラーが発生して同期が一切進まなくなっていた。
--   TrainingPageTag は created_at も存在しないため両方追加する。
--
-- 方針:
--   ADD COLUMN (DEFAULT now()) で非破壊的に追加し、既存行は
--   created_at の値で埋め戻す (TrainingPageTag は DEFAULT のまま)。
--   BEFORE UPDATE トリガーで自動更新する。

-- updated_at 自動更新ヘルパー関数 (共通化)。
-- 013 の update_user_subscription_updated_at と内容は同等だが、
-- 用途を明確にするため新名で定義する。
CREATE OR REPLACE FUNCTION set_updated_at_to_now()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- UserCategory
-- ============================================================
ALTER TABLE "UserCategory"
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE "UserCategory"
SET updated_at = created_at
WHERE updated_at IS DISTINCT FROM created_at;

DROP TRIGGER IF EXISTS trigger_user_category_updated_at ON "UserCategory";
CREATE TRIGGER trigger_user_category_updated_at
  BEFORE UPDATE ON "UserCategory"
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_to_now();

-- ============================================================
-- UserTag
-- ============================================================
ALTER TABLE "UserTag"
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE "UserTag"
SET updated_at = created_at
WHERE updated_at IS DISTINCT FROM created_at;

DROP TRIGGER IF EXISTS trigger_user_tag_updated_at ON "UserTag";
CREATE TRIGGER trigger_user_tag_updated_at
  BEFORE UPDATE ON "UserTag"
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_to_now();

-- ============================================================
-- TrainingPageTag (created_at も updated_at もない)
-- ============================================================
ALTER TABLE "TrainingPageTag"
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE "TrainingPageTag"
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trigger_training_page_tag_updated_at ON "TrainingPageTag";
CREATE TRIGGER trigger_training_page_tag_updated_at
  BEFORE UPDATE ON "TrainingPageTag"
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_to_now();

-- ============================================================
-- TrainingDate
-- ============================================================
ALTER TABLE "TrainingDate"
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE "TrainingDate"
SET updated_at = created_at
WHERE updated_at IS DISTINCT FROM created_at;

DROP TRIGGER IF EXISTS trigger_training_date_updated_at ON "TrainingDate";
CREATE TRIGGER trigger_training_date_updated_at
  BEFORE UPDATE ON "TrainingDate"
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_to_now();
