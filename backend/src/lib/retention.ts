import type { SupabaseClient } from "@supabase/supabase-js";
import { batchIn } from "./batch-query.js";
import { getNowInTimezone, roundToFiveMinSlot } from "./cron-time.js";
import {
  type ExpoPushMessage,
  sendExpoPushMessages,
} from "./push-notification.js";

// リテンション通知:
// 最終利用（UserPushToken.updated_at ＝ アプリ起動時の UPSERT で更新される）から
// 7日以上経過したユーザーに、毎日 20:00 JST の Cron 実行で再訪を促すプッシュ通知を送る。
// UserRetentionNotification に送信記録を持ち、1離脱期間につき1回のみ送信する
// （再訪して updated_at が送信記録より新しくなると再度対象になる）。
// なお、ログアウト中・未ログインのユーザーはトークンが無いため対象外。

const RETENTION_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

interface PushTokenRow {
  user_id: string;
  expo_push_token: string;
  updated_at: string;
}

export interface RetentionTarget {
  userId: string;
  tokens: string[];
}

/**
 * リテンション通知の送信対象ユーザーを選定する純関数。
 * - activeUserIds に含まれるユーザー（7日以内に利用あり）は除外
 * - この離脱期間に送信済み（notified_at が最終利用日時以降）のユーザーは除外
 *
 * タイムスタンプは "Z" 形式と "+00:00" 形式が混在し得るため、
 * 文字列比較ではなく Date.parse で数値比較する。
 */
export function selectRetentionTargets(
  staleTokens: PushTokenRow[],
  activeUserIds: Set<string>,
  notifiedAtByUserId: Map<string, string>,
): RetentionTarget[] {
  const byUser = new Map<string, { tokens: string[]; lastActiveAt: number }>();

  for (const token of staleTokens) {
    if (activeUserIds.has(token.user_id)) continue;

    const updatedAt = Date.parse(token.updated_at);
    const entry = byUser.get(token.user_id);
    if (entry) {
      entry.tokens.push(token.expo_push_token);
      entry.lastActiveAt = Math.max(entry.lastActiveAt, updatedAt);
    } else {
      byUser.set(token.user_id, {
        tokens: [token.expo_push_token],
        lastActiveAt: updatedAt,
      });
    }
  }

  const targets: RetentionTarget[] = [];
  for (const [userId, entry] of byUser) {
    const notifiedAt = notifiedAtByUserId.get(userId);
    if (notifiedAt && Date.parse(notifiedAt) >= entry.lastActiveAt) continue;
    targets.push({ userId, tokens: entry.tokens });
  }
  return targets;
}

/**
 * リテンション通知の Cron 処理。
 * 毎日 20:00 JST の5分枠（20:00〜20:05）でのみ実行される。
 */
export async function processRetentionNotifications(
  supabase: SupabaseClient,
): Promise<void> {
  const { hours, minutes } = getNowInTimezone("Asia/Tokyo");
  if (hours !== 20 || roundToFiveMinSlot(minutes) !== 0) {
    return;
  }

  console.log("[Retention] リテンション通知チェック開始");

  const cutoff = new Date(Date.now() - RETENTION_DAYS * DAY_MS).toISOString();

  // 1. 7日以内に利用のあるユーザー（除外対象）を取得
  const { data: activeTokens, error: activeError } = await supabase
    .from("UserPushToken")
    .select("user_id")
    .gt("updated_at", cutoff);

  if (activeError) {
    console.error("[Retention] アクティブトークン取得エラー:", activeError);
    return;
  }

  // 2. 最終更新が7日以上前のトークン（送信候補）を取得
  const { data: staleTokens, error: staleError } = await supabase
    .from("UserPushToken")
    .select("user_id, expo_push_token, updated_at")
    .lte("updated_at", cutoff);

  if (staleError) {
    console.error("[Retention] トークン取得エラー:", staleError);
    return;
  }
  if (!staleTokens || staleTokens.length === 0) {
    return;
  }

  const activeUserIds = new Set((activeTokens ?? []).map((t) => t.user_id));
  const candidateIds = Array.from(
    new Set(staleTokens.map((t) => t.user_id)),
  ).filter((id) => !activeUserIds.has(id));

  if (candidateIds.length === 0) {
    return;
  }

  // 3. 送信記録を取得（バッチ対応）。
  // 取得に失敗した場合、送信済みユーザーへ再送してしまう恐れがあるため処理全体を中断する。
  let notifiedFetchFailed = false;
  const notifiedRows = await batchIn(async (ids) => {
    const { data, error } = await supabase
      .from("UserRetentionNotification")
      .select("user_id, notified_at")
      .in("user_id", ids);
    if (error) {
      notifiedFetchFailed = true;
      return [];
    }
    return data ?? [];
  }, candidateIds);

  if (notifiedFetchFailed) {
    console.error("[Retention] 送信記録取得エラーのため処理を中断します");
    return;
  }

  const notifiedAtByUserId = new Map<string, string>(
    notifiedRows.map((r) => [r.user_id, r.notified_at]),
  );

  // 4. 送信対象を選定
  const targets = selectRetentionTargets(
    staleTokens,
    activeUserIds,
    notifiedAtByUserId,
  );
  if (targets.length === 0) {
    return;
  }

  // 5. Expo Push API に送信
  const messages: ExpoPushMessage[] = targets.flatMap((target) =>
    target.tokens.map((token) => ({
      to: token,
      title: "AikiNote",
      body: "他の合気道家の学びをチェックして、あなたも稽古記録・投稿してみませんか？",
      data: { url: "/social/posts" },
      channelId: "default",
      sound: "default" as const,
    })),
  );

  const success = await sendExpoPushMessages(messages);

  // 6. 送信記録を更新。
  // 送信の成否に関わらず記録し「最大1回」を保証する（失敗時の再送より通知の重複回避を優先）。
  const nowIso = new Date().toISOString();
  const { error: upsertError } = await supabase
    .from("UserRetentionNotification")
    .upsert(
      targets.map((t) => ({ user_id: t.userId, notified_at: nowIso })),
      { onConflict: "user_id" },
    );
  if (upsertError) {
    console.error("[Retention] 送信記録更新エラー:", upsertError);
  }

  if (success) {
    console.log(
      `[Retention] ${targets.length} ユーザー、${messages.length} デバイスに送信完了`,
    );
  }
}
