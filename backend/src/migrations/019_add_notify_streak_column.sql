-- UserNotificationPreference テーブルに notify_streak カラムを追加
ALTER TABLE "UserNotificationPreference"
  ADD COLUMN IF NOT EXISTS notify_streak BOOLEAN NOT NULL DEFAULT true;
