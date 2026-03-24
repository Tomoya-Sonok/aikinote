-- DojoStyleMaster テーブル作成（道場名のみ管理）
CREATE TABLE "DojoStyleMaster" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dojo_name TEXT NOT NULL UNIQUE,
  dojo_name_kana TEXT,
  region TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_by_user_id UUID REFERENCES "User"(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX idx_dojo_style_approved_dojo
  ON "DojoStyleMaster"(dojo_name, dojo_name_kana)
  WHERE is_approved = true;

-- User テーブル拡張
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS dojo_style_id UUID REFERENCES "DojoStyleMaster"(id);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS aikido_rank TEXT;
ALTER TABLE "User" ALTER COLUMN publicity_setting SET DEFAULT 'public';

-- 既存データ移行
INSERT INTO "DojoStyleMaster" (dojo_name, is_approved)
SELECT DISTINCT dojo_style_name, true
FROM "User"
WHERE dojo_style_name IS NOT NULL AND dojo_style_name != ''
ON CONFLICT (dojo_name) DO NOTHING;

UPDATE "User" u
SET dojo_style_id = d.id
FROM "DojoStyleMaster" d
WHERE u.dojo_style_name = d.dojo_name
  AND u.dojo_style_name IS NOT NULL;

-- SEED データ（主要道場）
INSERT INTO "DojoStyleMaster" (dojo_name, dojo_name_kana, is_approved) VALUES
  ('合気会本部道場', 'あいきかいほんぶどうじょう', true),
  ('養神館本部道場', 'ようしんかんほんぶどうじょう', true),
  ('心身統一合氣道会本部', 'しんしんとういつあいきどうかいほんぶ', true),
  ('合気道SA本部', 'あいきどうえすえーほんぶ', true),
  ('岩間神信合氣修練会', 'いわましんしんあいきしゅうれんかい', true),
  ('合気万生道本部', 'あいきばんせいどうほんぶ', true),
  ('覇天会本部道場', 'はてんかいほんぶどうじょう', true),
  ('実心館本部道場', 'じっしんかんほんぶどうじょう', true)
ON CONFLICT (dojo_name) DO NOTHING;
