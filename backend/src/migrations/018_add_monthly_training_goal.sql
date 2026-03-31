-- User テーブルに月間稽古目標カラムを追加
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS monthly_training_goal INTEGER DEFAULT NULL;
