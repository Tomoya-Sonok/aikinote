import { type NextRequest, NextResponse } from "next/server";
import {
  type AiChatFeedbackValue,
  assertConversationOwned,
  saveConversationFeedback,
} from "@/lib/server/aiCoach";
import { getServerSupabase } from "@/lib/supabase/server";

const FEEDBACK_VALUES: readonly AiChatFeedbackValue[] = [
  "good",
  "neutral",
  "bad",
];

const isFeedbackValue = (value: unknown): value is AiChatFeedbackValue =>
  typeof value === "string" &&
  FEEDBACK_VALUES.includes(value as AiChatFeedbackValue);

// 会話へのフィードバック登録（1会話につき1回。回答後は同じ会話で二度と表示しない）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    feedback?: unknown;
  } | null;
  if (!body || !isFeedbackValue(body.feedback)) {
    return NextResponse.json(
      { error: "フィードバック値が不正です" },
      { status: 400 },
    );
  }

  const owned = await assertConversationOwned(supabase, id, user.id);
  if (!owned) {
    return NextResponse.json(
      { error: "会話が見つかりません" },
      { status: 404 },
    );
  }

  try {
    await saveConversationFeedback(supabase, user.id, id, body.feedback);
  } catch (saveError) {
    console.error("[ai-coach] フィードバック保存エラー:", saveError);
    return NextResponse.json(
      { error: "フィードバックの保存に失敗しました" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
