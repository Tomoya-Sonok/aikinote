-- 031_add_core_indexes.sql
-- パフォーマンス改善: コアテーブルの頻出クエリに対応するインデックスを追加する。
--
-- 背景:
--   コアテーブル（TrainingPage / TrainingPageTag / UserTag / PageAttachment）は
--   Supabase 上で直接作成されており、リポジトリ内に CREATE TABLE やインデックス定義が無い。
--   PostgreSQL は外部キー列に自動でインデックスを張らないため、
--   一覧取得・タグ絞り込み・タグ結合・添付一括取得の各クエリが
--   レコード数の増加に伴い順次スキャンで遅くなる恐れがある。
--   既に同名インデックスが存在する場合に備え、すべて IF NOT EXISTS で冪等にしている。
--
-- 適用方法:
--   Supabase ダッシュボード → SQL Editor で本ファイルの内容をそのまま実行する。
--   適用後の確認クエリは末尾のコメントを参照。

-- 1. 稽古ページ一覧の主クエリ（WHERE user_id = ? ORDER BY created_at DESC LIMIT ?）
--    既存の idx_training_page_is_public (user_id, is_public) はソートを担えないため、
--    created_at を含む複合インデックスを追加する
CREATE INDEX IF NOT EXISTS idx_training_page_user_created
  ON "TrainingPage"(user_id, created_at DESC);

-- 2. 一覧のタグ結合（TrainingPageTag.training_page_id IN (...) で UserTag を JOIN）
CREATE INDEX IF NOT EXISTS idx_training_page_tag_page_id
  ON "TrainingPageTag"(training_page_id);

-- 3. タグ絞り込み検索（TrainingPageTag.user_tag_id IN (...)）
CREATE INDEX IF NOT EXISTS idx_training_page_tag_tag_id
  ON "TrainingPageTag"(user_tag_id);

-- 4. タグの存在確認・ユーザーのタグ一覧（WHERE user_id = ? AND name IN (...) 等）
CREATE INDEX IF NOT EXISTS idx_user_tag_user_category_name
  ON "UserTag"(user_id, category, name);

-- 5. ページ添付の一括取得（WHERE page_id IN (...)）
CREATE INDEX IF NOT EXISTS idx_page_attachment_page_id
  ON "PageAttachment"(page_id);

-- 確認クエリ（適用後に実行して 5 行返ることを確認する）:
-- SELECT indexname, tablename FROM pg_indexes
--  WHERE indexname IN (
--    'idx_training_page_user_created',
--    'idx_training_page_tag_page_id',
--    'idx_training_page_tag_tag_id',
--    'idx_user_tag_user_category_name',
--    'idx_page_attachment_page_id'
--  );

-- 補足:
-- - TrainingDate は upsert の onConflict (user_id, training_date) が依存する
--   ユニーク制約（= インデックス）が既に存在するため対象外。
-- - TrainingPageMemo / TrainingPageMemoTag は 027 でインデックス作成済み。
-- - 現在の規模ではロック時間は瞬時のため CONCURRENTLY は使用しない
--   （SQL Editor はトランザクション内実行のため CONCURRENTLY が使えない。
--     将来レコード数が大きく増えた場合は psql 直結での
--     CREATE INDEX CONCURRENTLY を検討する）。
