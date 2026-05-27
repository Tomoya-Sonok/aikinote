import type { SupabaseClient } from "@supabase/supabase-js";
import type { TrainingRecordForContext } from "@/lib/aiCoach/buildContext";
import type { AiCoachTier } from "@/lib/aiCoach/usageLimit";

// ユーザーのプラン種別と生涯メッセージ数を取得
export async function getUserTierAndUsage(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ tier: AiCoachTier; lifetimeCount: number }> {
  const { data } = await supabase
    .from("User")
    .select("subscription_tier, ai_chat_usage_count")
    .eq("id", userId)
    .single();

  const tier: AiCoachTier =
    data?.subscription_tier === "premium" ? "premium" : "free";
  const lifetimeCount = Number(data?.ai_chat_usage_count ?? 0);
  return { tier, lifetimeCount };
}

// JST の本日0時を UTC ISO で返す
const jstTodayStartIso = (): string => {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const midnightUtc = Date.UTC(
    jst.getUTCFullYear(),
    jst.getUTCMonth(),
    jst.getUTCDate(),
  );
  return new Date(midnightUtc - 9 * 60 * 60 * 1000).toISOString();
};

// 当日（JST）のユーザー送信メッセージ数（RLS で自分の会話に限定される）
export async function countTodayUserMessages(
  supabase: SupabaseClient,
): Promise<number> {
  const { count } = await supabase
    .from("AiChatMessage")
    .select("id", { count: "exact", head: true })
    .eq("role", "user")
    .gte("created_at", jstTodayStartIso());
  return count ?? 0;
}

// 生涯メッセージ数をインクリメント（ソフトリミット用、read-modify-write）
export async function incrementUserUsage(
  supabase: SupabaseClient,
  userId: string,
  current: number,
): Promise<void> {
  await supabase
    .from("User")
    .update({ ai_chat_usage_count: current + 1 })
    .eq("id", userId);
}

// RAG コンテキスト用に、ユーザーの稽古記録（新しい順）とタグを取得
export async function fetchUserTrainingRecords(
  supabase: SupabaseClient,
  userId: string,
  limit = 500,
): Promise<TrainingRecordForContext[]> {
  const { data: pages } = await supabase
    .from("TrainingPage")
    .select("id, title, content, content_mode, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!pages || pages.length === 0) return [];

  const pageIds = pages.map((p: { id: string }) => p.id);
  const tagsByPage = new Map<string, string[]>();

  const { data: pageTags } = await supabase
    .from("TrainingPageTag")
    .select("training_page_id, UserTag(name)")
    .in("training_page_id", pageIds);

  for (const row of (pageTags ?? []) as {
    training_page_id: string;
    UserTag: { name: string } | { name: string }[] | null;
  }[]) {
    const tag = Array.isArray(row.UserTag) ? row.UserTag[0] : row.UserTag;
    if (!tag?.name) continue;
    const list = tagsByPage.get(row.training_page_id) ?? [];
    list.push(tag.name);
    tagsByPage.set(row.training_page_id, list);
  }

  // tag_based のページは TrainingPage.content が空のため、メモ本文を連結して
  // RAG コンテキストに含める（sort_order 昇順、空行区切り）
  const tagBasedIds = pages
    .filter((p: { content_mode?: string }) => p.content_mode === "tag_based")
    .map((p: { id: string }) => p.id);
  const memoContentByPage = new Map<string, string>();
  if (tagBasedIds.length > 0) {
    const { data: memoRows } = await supabase
      .from("TrainingPageMemo")
      .select("training_page_id, content, sort_order")
      .in("training_page_id", tagBasedIds)
      .order("sort_order", { ascending: true });

    for (const m of (memoRows ?? []) as {
      training_page_id: string;
      content: string;
    }[]) {
      const piece = m.content?.trim();
      if (!piece) continue;
      const prev = memoContentByPage.get(m.training_page_id);
      memoContentByPage.set(
        m.training_page_id,
        prev ? `${prev}\n\n${piece}` : piece,
      );
    }
  }

  return pages.map(
    (p: {
      id: string;
      title: string;
      content: string;
      content_mode?: string;
      created_at: string;
    }) => ({
      title: p.title,
      content:
        p.content_mode === "tag_based"
          ? (memoContentByPage.get(p.id) ?? "")
          : p.content,
      date: p.created_at,
      tags: tagsByPage.get(p.id) ?? [],
    }),
  );
}

export type AiChatRole = "user" | "assistant";

// 会話の所有チェック（RLS 前提だが念のため user_id も確認）
export async function assertConversationOwned(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("AiChatConversation")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

// メッセージを保存し、会話の updated_at とタイトル（空なら先頭発話から）を更新
export async function persistChatMessages(
  supabase: SupabaseClient,
  conversationId: string,
  messages: { role: AiChatRole; content: string }[],
): Promise<void> {
  if (messages.length === 0) return;
  await supabase.from("AiChatMessage").insert(
    messages.map((m) => ({
      conversation_id: conversationId,
      role: m.role,
      content: m.content,
    })),
  );
  await supabase
    .from("AiChatConversation")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}

export type ConversationSummary = {
  id: string;
  title: string;
  updated_at: string;
};

export async function listConversations(
  supabase: SupabaseClient,
  userId: string,
): Promise<ConversationSummary[]> {
  const { data } = await supabase
    .from("AiChatConversation")
    .select("id, title, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  return (data ?? []) as ConversationSummary[];
}

export async function createConversation(
  supabase: SupabaseClient,
  userId: string,
  title: string,
): Promise<ConversationSummary | null> {
  const { data } = await supabase
    .from("AiChatConversation")
    .insert({ user_id: userId, title })
    .select("id, title, updated_at")
    .single();
  return (data as ConversationSummary) ?? null;
}

export async function deleteConversation(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
): Promise<void> {
  await supabase
    .from("AiChatConversation")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", userId);
}

export type StoredMessage = {
  id: string;
  role: AiChatRole;
  content: string;
  created_at: string;
};

export async function getConversationMessages(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<StoredMessage[]> {
  const { data } = await supabase
    .from("AiChatMessage")
    .select("id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return (data ?? []) as StoredMessage[];
}
