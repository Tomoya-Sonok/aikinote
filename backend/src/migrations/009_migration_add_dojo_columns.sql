-- ============================================================
-- DojoStyleMaster テーブル拡張マイグレーション
--
-- 合気会HPから取得した道場データのフィールドを格納するため、
-- 既存テーブルにカラムを追加する。
-- 既存レコード（合気会本部道場、養神館本部道場など手動登録分）には
-- 影響しない（すべて NULL 許容）。
-- ============================================================
 
ALTER TABLE "DojoStyleMaster"
  ADD COLUMN IF NOT EXISTS prefecture    text,          -- 都道府県（例: 東京都）
  ADD COLUMN IF NOT EXISTS city          text,          -- 市区町村（例: 新宿区）
  ADD COLUMN IF NOT EXISTS address       text,          -- 住所詳細（例: 若松町17-18）
  ADD COLUMN IF NOT EXISTS zip           text,          -- 郵便番号（例: 162-0056）
  ADD COLUMN IF NOT EXISTS latitude      double precision, -- 緯度
  ADD COLUMN IF NOT EXISTS longitude     double precision, -- 経度
  ADD COLUMN IF NOT EXISTS representative text,         -- 道場責任者
  ADD COLUMN IF NOT EXISTS website_url   text,          -- 公式サイトURL
  ADD COLUMN IF NOT EXISTS organization  text,          -- 所属団体（aikikai, yoshinkan 等）
  ADD COLUMN IF NOT EXISTS source        text,          -- データ取得元（aikikai_hp, user_submitted 等）
  ADD COLUMN IF NOT EXISTS source_id     text;          -- 取得元でのID
 
-- region カラムが既にあるが中身は NULL → prefecture と役割が被るので、
-- 既存データの region は残しつつ、今後は prefecture を正として使う。
-- 既存の region に値が入っているレコードがあれば prefecture にコピー:
UPDATE "DojoStyleMaster"
  SET prefecture = region
  WHERE region IS NOT NULL AND prefecture IS NULL;
 
-- インクリメンタルサーチ高速化用のインデックス
-- （dojo_name は既に検索対象だが、prefecture での絞り込みも想定）
CREATE INDEX IF NOT EXISTS idx_dojo_style_master_prefecture
  ON "DojoStyleMaster" (prefecture);
 
CREATE INDEX IF NOT EXISTS idx_dojo_style_master_organization
  ON "DojoStyleMaster" (organization);
 
