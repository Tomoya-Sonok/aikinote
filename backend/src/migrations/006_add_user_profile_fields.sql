-- 006_add_user_profile_fields.sql
-- ユーザープロフィール拡張: full_name, age_range, gender カラム追加

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(50) DEFAULT NULL;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS age_range VARCHAR(10) DEFAULT NULL;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT NULL;

-- age_range: 'lt20', '20s', '30s', '40s', '50s', 'gt60'
-- gender: 'male', 'female', 'other', 'not_specified'
-- いずれも NULL 許可（未入力可）
-- バリデーションはアプリ層（Zod）で実施
