-- テーブル 1: UserNotificationPreference
CREATE TABLE "UserNotificationPreference" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE UNIQUE,
  notify_favorite BOOLEAN NOT NULL DEFAULT true,
  notify_reply BOOLEAN NOT NULL DEFAULT true,
  notify_reply_to_thread BOOLEAN NOT NULL DEFAULT true,
  reminder_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "UserNotificationPreference" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notification preferences"
  ON "UserNotificationPreference"
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_user_notification_pref_user_id ON "UserNotificationPreference"(user_id);

-- テーブル 2: UserPracticeReminder（1ユーザー最大5件）
CREATE TABLE "UserPracticeReminder" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  reminder_time TIME NOT NULL DEFAULT '21:00',
  reminder_days INTEGER[] NOT NULL DEFAULT '{}',
  timezone TEXT NOT NULL DEFAULT 'Asia/Tokyo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "UserPracticeReminder" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own practice reminders"
  ON "UserPracticeReminder"
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_user_practice_reminder_user_id ON "UserPracticeReminder"(user_id);
CREATE INDEX idx_user_practice_reminder_active ON "UserPracticeReminder"(reminder_time);
