import type { SupabaseClient } from "@supabase/supabase-js";

const EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send";

interface PushPayload {
  type: string;
  actorUserId: string;
  postId?: string | null;
}

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  channelId?: string;
  sound: "default";
}

/**
 * Expo Push API にメッセージをバッチ送信する共通関数。
 * Expo 推奨のバッチサイズ（100件）で分割して送信する。
 */
export async function sendExpoPushMessages(
  messages: ExpoPushMessage[],
): Promise<boolean> {
  if (messages.length === 0) return true;

  const EXPO_BATCH = 100;
  let allSuccess = true;

  for (let i = 0; i < messages.length; i += EXPO_BATCH) {
    const batch = messages.slice(i, i + EXPO_BATCH);
    try {
      const response = await fetch(EXPO_PUSH_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      });
      if (!response.ok) {
        console.error(
          "[Push] Expo Push API エラー:",
          response.status,
          await response.text(),
        );
        allSuccess = false;
      }
    } catch (err) {
      console.error("[Push] Expo Push API ネットワークエラー:", err);
      allSuccess = false;
    }
  }

  return allSuccess;
}

function buildPushBody(type: string, actorUsername: string): string {
  switch (type) {
    case "favorite":
      return `${actorUsername} があなたの投稿をお気に入り登録しました`;
    case "favorite_reply":
      return `${actorUsername} があなたの返信をお気に入り登録しました`;
    case "reply":
      return `${actorUsername} があなたの投稿に返信しました`;
    case "reply_to_thread":
      return `${actorUsername} がスレッドに返信しました`;
    default:
      return `${actorUsername} から通知があります`;
  }
}

async function getUsername(
  supabaseClient: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data } = await supabaseClient
    .from("User")
    .select("username")
    .eq("id", userId)
    .single();
  return data?.username ?? "ユーザー";
}

/**
 * 指定ユーザーの全デバイスにプッシュ通知を送信する。
 * エラーが発生しても例外は投げない（本体処理を止めない）。
 */
export async function sendPushToUser(
  supabaseClient: SupabaseClient,
  recipientUserId: string,
  payload: PushPayload,
): Promise<void> {
  try {
    // 自分自身へのプッシュはスキップ
    if (recipientUserId === payload.actorUserId) return;

    // 通知設定を確認
    const { data: pref } = await supabaseClient
      .from("UserNotificationPreference")
      .select("notify_favorite, notify_reply, notify_reply_to_thread")
      .eq("user_id", recipientUserId)
      .maybeSingle();

    // 設定レコードがある場合、対応する通知タイプが OFF ならスキップ
    if (pref) {
      if (
        (payload.type === "favorite" || payload.type === "favorite_reply") &&
        !pref.notify_favorite
      )
        return;
      if (payload.type === "reply" && !pref.notify_reply) return;
      if (payload.type === "reply_to_thread" && !pref.notify_reply_to_thread)
        return;
    }
    // 設定レコードがない場合はデフォルト（全て ON）として動作

    // 受信者のプッシュトークン一覧を取得
    const { data: tokens, error } = await supabaseClient
      .from("UserPushToken")
      .select("expo_push_token")
      .eq("user_id", recipientUserId);

    if (error) {
      console.error("[Push] トークン取得エラー:", error);
      return;
    }
    if (!tokens || tokens.length === 0) {
      return;
    }

    const actorUsername = await getUsername(
      supabaseClient,
      payload.actorUserId,
    );
    const body = buildPushBody(payload.type, actorUsername);

    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.expo_push_token,
      title: "AikiNote",
      body,
      sound: "default" as const,
      ...(payload.postId ? { data: { postId: payload.postId } } : {}),
    }));

    await sendExpoPushMessages(messages);
  } catch (err) {
    console.error("[Push] プッシュ送信エラー:", err);
  }
}

/**
 * 複数ユーザーにプッシュ通知を一括送信する（スレッド通知用）。
 */
export async function sendPushToUsers(
  supabaseClient: SupabaseClient,
  recipientUserIds: string[],
  payload: PushPayload,
): Promise<void> {
  // 自分自身を除外
  const filteredIds = recipientUserIds.filter(
    (id) => id !== payload.actorUserId,
  );
  if (filteredIds.length === 0) return;

  try {
    const { data: tokens, error } = await supabaseClient
      .from("UserPushToken")
      .select("expo_push_token")
      .in("user_id", filteredIds);

    if (error || !tokens || tokens.length === 0) {
      return;
    }

    const actorUsername = await getUsername(
      supabaseClient,
      payload.actorUserId,
    );
    const body = buildPushBody(payload.type, actorUsername);

    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.expo_push_token,
      title: "AikiNote",
      body,
      sound: "default" as const,
      ...(payload.postId ? { data: { postId: payload.postId } } : {}),
    }));

    await sendExpoPushMessages(messages);
  } catch (err) {
    console.error("[Push] プッシュ一括送信エラー:", err);
  }
}
