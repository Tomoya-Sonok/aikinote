import type { AiCoachConversation } from "@/lib/api/aiCoach";

export type ConversationGroupKey =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "older";

export type ConversationGroup = {
  key: ConversationGroupKey;
  conversations: AiCoachConversation[];
};

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// JST 基準の「その日 0:00（UTC ベース）」を返す
const jstStartOfDayUtcMs = (d: Date): number => {
  const jst = new Date(d.getTime() + JST_OFFSET_MS);
  const midnightAsUtc = Date.UTC(
    jst.getUTCFullYear(),
    jst.getUTCMonth(),
    jst.getUTCDate(),
  );
  return midnightAsUtc - JST_OFFSET_MS;
};

// 会話を updated_at(JST) で「今日 / 昨日 / 過去7日 / 過去30日 / それ以前」に分類する。
// - 入力は updated_at DESC 想定（API 既定）
// - 空グループは結果から除外
export function groupConversationsByDate(
  conversations: AiCoachConversation[],
  now: Date = new Date(),
): ConversationGroup[] {
  const todayStart = jstStartOfDayUtcMs(now);
  const yesterdayStart = todayStart - DAY_MS;
  const last7Start = todayStart - 7 * DAY_MS;
  const last30Start = todayStart - 30 * DAY_MS;

  const buckets: Record<ConversationGroupKey, AiCoachConversation[]> = {
    today: [],
    yesterday: [],
    last7: [],
    last30: [],
    older: [],
  };

  for (const c of conversations) {
    const t = new Date(c.updated_at).getTime();
    if (t >= todayStart) {
      buckets.today.push(c);
    } else if (t >= yesterdayStart) {
      buckets.yesterday.push(c);
    } else if (t >= last7Start) {
      buckets.last7.push(c);
    } else if (t >= last30Start) {
      buckets.last30.push(c);
    } else {
      buckets.older.push(c);
    }
  }

  const order: ConversationGroupKey[] = [
    "today",
    "yesterday",
    "last7",
    "last30",
    "older",
  ];
  return order
    .map((key) => ({ key, conversations: buckets[key] }))
    .filter((g) => g.conversations.length > 0);
}
