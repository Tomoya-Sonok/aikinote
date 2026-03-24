-- 012: TrainingPage から未使用の comment カラムを削除
ALTER TABLE "TrainingPage" DROP COLUMN IF EXISTS comment;
