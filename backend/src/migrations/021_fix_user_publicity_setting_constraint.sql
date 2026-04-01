-- ============================================
-- 021: User.publicity_setting の制約を修正
-- 'closed'（部分的に公開）を許可値に追加
-- ============================================
-- User テーブルはコードベース外（Supabase）で作成されたため、
-- 制約名が不明。information_schema から動的に検出して更新する。

-- ============================================
-- 1. CHECK 制約の検出と更新
-- ============================================
DO $$
DECLARE
  cname TEXT;
BEGIN
  SELECT cc.constraint_name INTO cname
  FROM information_schema.constraint_column_usage ccu
  JOIN information_schema.check_constraints cc
    ON cc.constraint_name = ccu.constraint_name
    AND cc.constraint_schema = ccu.constraint_schema
  WHERE ccu.table_name = 'User'
    AND ccu.column_name = 'publicity_setting'
    AND ccu.constraint_schema = 'public'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE "User" DROP CONSTRAINT %I', cname);
    RAISE NOTICE 'Dropped CHECK constraint: %', cname;
  ELSE
    RAISE NOTICE 'No CHECK constraint found on User.publicity_setting';
  END IF;
END $$;

ALTER TABLE "User"
  ADD CONSTRAINT "User_publicity_setting_check"
    CHECK (publicity_setting IN ('public', 'closed', 'private'));

-- ============================================
-- 2. ENUM 型の場合の対応
--    publicity_setting がカスタム ENUM 型で定義されている場合、
--    'closed' を ENUM に追加する
-- ============================================
DO $$
DECLARE
  type_name TEXT;
BEGIN
  SELECT t.typname INTO type_name
  FROM pg_attribute a
  JOIN pg_type t ON a.atttypid = t.oid
  JOIN pg_class c ON a.attrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE c.relname = 'User'
    AND a.attname = 'publicity_setting'
    AND n.nspname = 'public'
    AND t.typtype = 'e';

  IF type_name IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = type_name AND e.enumlabel = 'closed'
    ) THEN
      EXECUTE format('ALTER TYPE %I ADD VALUE ''closed''', type_name);
      RAISE NOTICE 'Added ''closed'' to ENUM type: %', type_name;
    ELSE
      RAISE NOTICE '''closed'' already exists in ENUM type: %', type_name;
    END IF;
  ELSE
    RAISE NOTICE 'publicity_setting is not an ENUM type (no action needed)';
  END IF;
END $$;
