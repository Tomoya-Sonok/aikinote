import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { type NextRequest, NextResponse } from "next/server";
import {
  AI_COACH_SYSTEM_PROMPT,
  buildRecordsContext,
} from "@/lib/aiCoach/buildContext";
import { AI_COACH_MODEL } from "@/lib/aiCoach/constants";
import { checkAiCoachUsageAllowed } from "@/lib/aiCoach/usageLimit";
import {
  assertConversationOwned,
  countTodayUserMessages,
  fetchUserTrainingRecords,
  getUserTierAndUsage,
  incrementUserUsage,
  persistChatMessages,
} from "@/lib/server/aiCoach";
import { getServerSupabase } from "@/lib/supabase/server";

// UIMessage からテキスト本文を取り出す
const extractText = (message: UIMessage | undefined): string => {
  if (!message) return "";
  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text",
    )
    .map((part) => part.text)
    .join("")
    .trim();
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = (await request.json()) as {
      messages?: UIMessage[];
      conversationId?: string;
    };
    const messages = body.messages ?? [];
    const conversationId = body.conversationId;

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId が必要です" },
        { status: 400 },
      );
    }

    const owned = await assertConversationOwned(
      supabase,
      conversationId,
      user.id,
    );
    if (!owned) {
      return NextResponse.json(
        { error: "会話が見つかりません" },
        { status: 404 },
      );
    }

    // 利用制限チェック（サーバー側の最終防衛線）
    const { tier, lifetimeCount } = await getUserTierAndUsage(
      supabase,
      user.id,
    );
    const todayCount = await countTodayUserMessages(supabase);
    const usage = checkAiCoachUsageAllowed({ tier, lifetimeCount, todayCount });
    if (!usage.allowed) {
      return NextResponse.json(
        { error: "limit_reached", reason: usage.reason },
        { status: 402 },
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "AIコーチが未設定です" },
        { status: 503 },
      );
    }

    // RAG: 全稽古記録をコンテキスト化（新しい順、予算内で打ち切り）
    const records = await fetchUserTrainingRecords(supabase, user.id);
    const context = buildRecordsContext(records);

    // 安定したプレフィックス（システム指示 + 記録コーパス）→ 会話履歴 の順で、
    // Gemini の暗黙的キャッシュ割引が効きやすい構成にする。
    const system = `${AI_COACH_SYSTEM_PROMPT}\n\n${context.text}`;
    const userText = extractText(
      [...messages].reverse().find((m) => m.role === "user"),
    );

    const googleProvider = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const modelMessages = await convertToModelMessages(messages);
    const result = streamText({
      model: googleProvider(AI_COACH_MODEL),
      system,
      messages: modelMessages,
      onFinish: async ({ text }) => {
        // 応答完了時に user/assistant を保存し、生涯カウントを加算（Free/Premium 問わず）
        try {
          await persistChatMessages(supabase, conversationId, [
            ...(userText ? [{ role: "user" as const, content: userText }] : []),
            { role: "assistant" as const, content: text },
          ]);
          await incrementUserUsage(supabase, user.id, lifetimeCount);
        } catch (e) {
          console.error("AIコーチ: 保存/カウント更新に失敗", e);
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("AIコーチ chat エラー:", error);
    return NextResponse.json({ error: "サーバー内部エラー" }, { status: 500 });
  }
}
