import { createClient } from "@supabase/supabase-js";

const EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send";

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

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  channelId: string;
  sound: "default";
}

/**
 * reminder_time の HH:MM を5分枠に丸めた値と、
 * 現在時刻を5分枠に丸めた値を比較する。
 */
function roundToFiveMinSlot(minutes: number): number {
  return Math.floor(minutes / 5) * 5;
}

/**
 * 指定タイムゾーンでの現在時刻（時・分・曜日）を取得する。
 */
function getNowInTimezone(timezone: string): {
  hours: number;
  minutes: number;
  dayOfWeek: number;
} {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const timeParts = formatter.formatToParts(now);
  const hours = Number(timeParts.find((p) => p.type === "hour")?.value ?? "0");
  const minutes = Number(
    timeParts.find((p) => p.type === "minute")?.value ?? "0",
  );

  const dayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  });
  const dayString = dayFormatter.format(now);
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = dayMap[dayString] ?? 0;

  return { hours, minutes, dayOfWeek };
}

/**
 * リマインダーの時刻が現在の5分枠にマッチするか判定する。
 */
function isReminderTimeMatching(
  reminderTime: string,
  currentHours: number,
  currentMinutes: number,
): boolean {
  // reminder_time は "HH:MM:SS" または "HH:MM" 形式
  const parts = reminderTime.split(":");
  const reminderHours = Number(parts[0]);
  const reminderMinutes = Number(parts[1]);

  return (
    reminderHours === currentHours &&
    roundToFiveMinSlot(reminderMinutes) === roundToFiveMinSlot(currentMinutes)
  );
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
    // 1. reminder_enabled = true のユーザーIDを取得
    const { data: enabledPrefs, error: prefError } = await supabase
      .from("UserNotificationPreference")
      .select("user_id")
      .eq("reminder_enabled", true);

    if (prefError) {
      console.error("[Reminder] 通知設定の取得エラー:", prefError);
      return;
    }
    if (!enabledPrefs || enabledPrefs.length === 0) {
      return;
    }

    const enabledUserIds = enabledPrefs.map((p) => p.user_id);

    // 2. 該当ユーザーの UserPracticeReminder レコードを取得
    const { data: reminders, error: reminderError } = await supabase
      .from("UserPracticeReminder")
      .select("id, user_id, reminder_time, reminder_days, timezone")
      .in("user_id", enabledUserIds);

    if (reminderError) {
      console.error("[Reminder] リマインダー取得エラー:", reminderError);
      return;
    }
    if (!reminders || reminders.length === 0) {
      return;
    }

    // 3-5. 各リマインダーの条件をチェックし、送信対象ユーザーを収集（重複排除）
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

        // 時刻マッチング（5分枠）
        if (!isReminderTimeMatching(reminder.reminder_time, hours, minutes)) {
          continue;
        }

        // 条件に合致 → 送信対象に追加
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

    // 6. 送信対象ユーザーのプッシュトークンを取得
    const { data: tokens, error: tokenError } = await supabase
      .from("UserPushToken")
      .select("user_id, expo_push_token")
      .in("user_id", Array.from(targetUserIds));

    if (tokenError) {
      console.error("[Reminder] プッシュトークン取得エラー:", tokenError);
      return;
    }
    if (!tokens || tokens.length === 0) {
      return;
    }

    // 7. Expo Push API に送信
    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.expo_push_token,
      title: "AikiNote",
      body: "本日の稽古記録は済みましたか？",
      channelId: "default",
      sound: "default" as const,
    }));

    const response = await fetch(EXPO_PUSH_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      console.error(
        "[Reminder] Expo Push API エラー:",
        response.status,
        await response.text(),
      );
    } else {
      console.log(
        `[Reminder] ${targetUserIds.size} ユーザー、${messages.length} デバイスに送信完了`,
      );
    }
  } catch (err) {
    console.error("[Reminder] リマインダー処理全体エラー:", err);
  }
}
