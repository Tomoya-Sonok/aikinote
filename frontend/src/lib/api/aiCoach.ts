import type { AiCoachLimitReason, AiCoachTier } from "@/lib/aiCoach/usageLimit";

export type AiCoachConversation = {
  id: string;
  title: string;
  updated_at: string;
};

export type AiCoachStoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type AiCoachUsage = {
  allowed: boolean;
  reason: AiCoachLimitReason | null;
  tier: AiCoachTier;
};

export async function fetchConversations(): Promise<AiCoachConversation[]> {
  const res = await fetch("/api/ai-coach/conversations");
  if (!res.ok) throw new Error("会話一覧の取得に失敗しました");
  const json = (await res.json()) as { conversations: AiCoachConversation[] };
  return json.conversations;
}

export async function createConversation(
  title = "",
): Promise<AiCoachConversation> {
  const res = await fetch("/api/ai-coach/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error("会話の作成に失敗しました");
  const json = (await res.json()) as { conversation: AiCoachConversation };
  return json.conversation;
}

export async function fetchConversationMessages(
  conversationId: string,
): Promise<AiCoachStoredMessage[]> {
  const res = await fetch(`/api/ai-coach/conversations/${conversationId}`);
  if (!res.ok) throw new Error("メッセージの取得に失敗しました");
  const json = (await res.json()) as { messages: AiCoachStoredMessage[] };
  return json.messages;
}

export async function deleteConversation(
  conversationId: string,
): Promise<void> {
  const res = await fetch(`/api/ai-coach/conversations/${conversationId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("会話の削除に失敗しました");
}

export async function fetchAiCoachUsage(): Promise<AiCoachUsage> {
  const res = await fetch("/api/ai-coach/usage");
  if (!res.ok) throw new Error("利用状況の取得に失敗しました");
  return (await res.json()) as AiCoachUsage;
}

// 初回応答完了後にタイトルを Gemini で要約生成する（fire-and-forget 想定）。
export async function generateConversationTitle(
  conversationId: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `/api/ai-coach/conversations/${conversationId}/title`,
      { method: "POST" },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { title?: string };
    return json.title ?? null;
  } catch {
    return null;
  }
}
