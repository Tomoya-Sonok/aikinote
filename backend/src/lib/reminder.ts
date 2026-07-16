import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { batchIn } from "./batch-query.js";
import {
  buildTimeSlot,
  getNowInTimezone,
  roundToFiveMinSlot,
} from "./cron-time.js";
import {
  type ExpoPushMessage,
  sendExpoPushMessages,
} from "./push-notification.js";
import { processRetentionNotifications } from "./retention.js";

interface ReminderEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

interface PracticeReminder {
  id: string;
  user_id: string;
  reminder_time: string; // "HH:MM:SS" (TIME型)
  reminder_days: number[]; // 0=日, 1=月, ..., 6=土
  timezone: string;
}

/**
 * 稽古リマインダーの Cron 処理。
 * 5分ごとに実行され、条件に合致するユーザーにプッシュ通知を送信する。
 */
export async function processReminders(env: ReminderEnv): Promise<void> {
  const supabaseUrl = env.SUPABASE_URL ?? "";
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "[Reminder] SUPABASE_URL または SUPABASE_SERVICE_ROLE_KEY が未設定です",
    );
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // 1. Asia/Tokyo の現在時刻から5分枠を計算し、DB側で時刻フィルタリング
    const nowTokyo = getNowInTimezone("Asia/Tokyo");
    const { slotStart, slotEnd } = buildTimeSlot(
      nowTokyo.hours,
      nowTokyo.minutes,
    );

    const { data: reminders, error: reminderError } = await supabase
      .from("UserPracticeReminder")
      .select("id, user_id, reminder_time, reminder_days, timezone")
      .gte("reminder_time", slotStart)
      .lt("reminder_time", slotEnd);

    if (reminderError) {
      console.error("[Reminder] リマインダー取得エラー:", reminderError);
      return;
    }
    if (!reminders || reminders.length === 0) {
      return;
    }

    // 2. 曜日マッチング + タイムゾーン再検証で送信対象ユーザーを特定
    const targetUserIds = new Set<string>();

    for (const reminder of reminders as PracticeReminder[]) {
      try {
        const { hours, minutes, dayOfWeek } = getNowInTimezone(
          reminder.timezone,
        );

        // 曜日チェック
        if (
          !reminder.reminder_days ||
          reminder.reminder_days.length === 0 ||
          !reminder.reminder_days.includes(dayOfWeek)
        ) {
          continue;
        }

        // 非 Asia/Tokyo ユーザーの場合、そのタイムゾーンで時刻を再検証
        if (reminder.timezone !== "Asia/Tokyo") {
          const parts = reminder.reminder_time.split(":");
          const reminderHours = Number(parts[0]);
          const reminderMinutes = Number(parts[1]);
          if (
            reminderHours !== hours ||
            roundToFiveMinSlot(reminderMinutes) !== roundToFiveMinSlot(minutes)
          ) {
            continue;
          }
        }

        targetUserIds.add(reminder.user_id);
      } catch (err) {
        console.error(
          `[Reminder] リマインダー ${reminder.id} の処理エラー:`,
          err,
        );
      }
    }

    if (targetUserIds.size === 0) {
      return;
    }

    // 3. reminder_enabled = true のユーザーのみに絞り込み（バッチ対応）
    const candidateIds = Array.from(targetUserIds);
    const enabledUsers = await batchIn(async (ids) => {
      const { data } = await supabase
        .from("UserNotificationPreference")
        .select("user_id")
        .eq("reminder_enabled", true)
        .in("user_id", ids);
      return data ?? [];
    }, candidateIds);

    const enabledUserIds = new Set(enabledUsers.map((u) => u.user_id));
    const finalUserIds = candidateIds.filter((id) => enabledUserIds.has(id));

    if (finalUserIds.length === 0) {
      return;
    }

    // 4. 送信対象ユーザーのプッシュトークンを取得（バッチ対応）
    const tokens = await batchIn(async (ids) => {
      const { data, error } = await supabase
        .from("UserPushToken")
        .select("user_id, expo_push_token")
        .in("user_id", ids);
      if (error) {
        console.error("[Reminder] プッシュトークン取得エラー:", error);
        return [];
      }
      return data ?? [];
    }, finalUserIds);

    if (tokens.length === 0) {
      return;
    }

    // 5. Expo Push API に送信
    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.expo_push_token,
      title: "AikiNote",
      body: "本日の稽古記録は済みましたか？",
      channelId: "default",
      sound: "default" as const,
    }));

    const success = await sendExpoPushMessages(messages);
    if (success) {
      console.log(
        `[Reminder] ${finalUserIds.length} ユーザー、${messages.length} デバイスに送信完了`,
      );
    }
  } catch (err) {
    console.error("[Reminder] リマインダー処理全体エラー:", err);
  }

  // ストリーク途切れ通知（毎週土曜 18:00 JST に1回実行）
  try {
    await processStreakNotifications(supabase);
  } catch (err) {
    console.error("[Streak] ストリーク処理エラー:", err);
  }

  // リテンション通知（毎日 20:00 JST に1回実行、7日以上未利用のユーザーが対象）
  try {
    await processRetentionNotifications(supabase);
  } catch (err) {
    console.error("[Retention] リテンション通知処理エラー:", err);
  }
}

/**
 * ストリーク途切れ通知。
 * 毎週土曜 18:00 JST に、その週（月〜土）の稽古参加が0日のユーザーに通知。
 * notify_streak = true のユーザーのみ対象。
 */
async function processStreakNotifications(
  supabase: SupabaseClient,
): Promise<void> {
  // 土曜 18:00 JST の5分枠（17:55〜18:00）でのみ実行
  const { hours, minutes, dayOfWeek } = getNowInTimezone("Asia/Tokyo");
  if (dayOfWeek !== 6 || hours !== 18 || roundToFiveMinSlot(minutes) !== 0) {
    return;
  }

  console.log("[Streak] ストリーク途切れチェック開始");

  // 1. notify_streak = true のユーザーを取得
  const { data: streakPrefs, error: prefError } = await supabase
    .from("UserNotificationPreference")
    .select("user_id")
    .eq("notify_streak", true);

  if (prefError || !streakPrefs || streakPrefs.length === 0) {
    return;
  }

  const userIds = streakPrefs.map((p) => p.user_id);

  // 2. 今週の月曜〜今日（土曜）の日付範囲を計算
  const now = new Date();
  const jstFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayStr = jstFormatter.format(now); // "YYYY-MM-DD"

  // 今日（土曜）から5日前が月曜
  const monday = new Date(now);
  monday.setDate(monday.getDate() - 5);
  const mondayStr = jstFormatter.format(monday);

  // 3. 今週に稽古参加があるユーザーを取得（バッチ対応）
  const attendedRecords = await batchIn(async (ids) => {
    const { data, error } = await supabase
      .from("TrainingDate")
      .select("user_id")
      .in("user_id", ids)
      .eq("is_attended", true)
      .gte("training_date", mondayStr)
      .lte("training_date", todayStr);
    if (error) {
      console.error("[Streak] 稽古参加データ取得エラー:", error);
      return [];
    }
    return data ?? [];
  }, userIds);

  // 今週参加済みのユーザーIDセット
  const attendedUserIds = new Set(attendedRecords.map((r) => r.user_id));

  // 4. 今週参加がないユーザーを特定
  const targetUserIds = userIds.filter((id) => !attendedUserIds.has(id));
  if (targetUserIds.length === 0) {
    return;
  }

  // 5. プッシュトークンを取得して送信（バッチ対応）
  const tokens = await batchIn(async (ids) => {
    const { data, error } = await supabase
      .from("UserPushToken")
      .select("expo_push_token")
      .in("user_id", ids);
    if (error) return [];
    return data ?? [];
  }, targetUserIds);

  if (tokens.length === 0) {
    return;
  }

  const messages: ExpoPushMessage[] = tokens.map((t) => ({
    to: t.expo_push_token,
    title: "AikiNote",
    body: "今週まだ稽古記録がありません",
    channelId: "default",
    sound: "default" as const,
  }));

  const success = await sendExpoPushMessages(messages);
  if (success) {
    console.log(
      `[Streak] ${targetUserIds.length} ユーザーにストリーク途切れ通知を送信`,
    );
  }
}
