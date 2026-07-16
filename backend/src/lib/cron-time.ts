// Cron 処理（reminder.ts / retention.ts）で共用する時刻ユーティリティ。
// Cron は5分間隔で実行されるため、時刻判定はすべて「5分枠」単位で行う。

/**
 * 分を5分枠に丸める（例: 23 → 20）。
 */
export function roundToFiveMinSlot(minutes: number): number {
  return Math.floor(minutes / 5) * 5;
}

/**
 * 指定タイムゾーンでの現在時刻（時・分・曜日）を取得する。
 */
export function getNowInTimezone(timezone: string): {
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
 * 5分枠の開始・終了時刻文字列を生成する。
 */
export function buildTimeSlot(
  hours: number,
  minutes: number,
): {
  slotStart: string;
  slotEnd: string;
} {
  const roundedMin = roundToFiveMinSlot(minutes);
  const slotStart = `${String(hours).padStart(2, "0")}:${String(roundedMin).padStart(2, "0")}:00`;

  let endHours = hours;
  let endMin = roundedMin + 5;
  if (endMin >= 60) {
    endMin = 0;
    endHours = (endHours + 1) % 24;
  }
  const slotEnd = `${String(endHours).padStart(2, "0")}:${String(endMin).padStart(2, "0")}:00`;

  return { slotStart, slotEnd };
}
